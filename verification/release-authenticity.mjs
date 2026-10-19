// Offline publisher signatures. This module reads artifacts as bytes, never as code.
import {constants} from 'node:fs';
import {lstat,open,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash,createPrivateKey,createPublicKey,KeyObject,sign,verify} from 'node:crypto';

export const PUBLISHER_FORMAT='loona-publisher-release/v1';
export const PUBLISHER_LIMITS=Object.freeze({manifestBytes:65536,keyBytes:8192,files:128,fileBytes:128*1024*1024,totalBytes:512*1024*1024});
const fields=(object,keys)=>object!==null&&typeof object==='object'&&!Array.isArray(object)&&Object.keys(object).sort().join('\0')===[...keys].sort().join('\0');
const equalNames=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function fail(message){throw Object.assign(new Error(message),{code:'publisher_release_invalid'});}
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const compare=(a,b)=>a<b?-1:a>b?1:0;

function validateProduct(product){if(typeof product!=='string'||!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,79}$/.test(product)||product.trim()!==product)fail('Invalid publisher product');return product;}
function validateVersion(version){if(typeof version!=='string'||version.length>80||!/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*)?$/.test(version))fail('Invalid publisher version');return version;}
function validateName(name){
 if(typeof name!=='string'||name.length>240||!name.length)fail('Invalid artifact path');
 for(const part of name.split('/'))if(!/^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,127}$/.test(part)||part.endsWith('.')||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))fail('Invalid portable artifact path');
 return name;
}
function names(list){
 if(!Array.isArray(list)||list.length===0||list.length>PUBLISHER_LIMITS.files)fail('Require 1-128 explicit artifact names');
 const sorted=list.map(validateName).sort(compare),aliases=new Set();
 for(const name of sorted){const alias=name.toLowerCase();if(aliases.has(alias))fail('Duplicate artifact path or case alias');aliases.add(alias);}
 // A file cannot simultaneously be an ancestor directory of another artifact.
 for(const name of sorted){const parts=name.toLowerCase().split('/');while(parts.length>1){parts.pop();if(aliases.has(parts.join('/')))fail('Artifact file/directory alias');}}
 return sorted;
}
function canonical(manifest){return Buffer.from(JSON.stringify(manifest,null,2)+'\n','utf8');}
function validateManifest(manifest){
 if(!fields(manifest,['format','algorithm','product','version','files'])||manifest.format!==PUBLISHER_FORMAT||manifest.algorithm!=='Ed25519')fail('Invalid publisher manifest fields or format');
 validateProduct(manifest.product);validateVersion(manifest.version);
 if(!Array.isArray(manifest.files))fail('Invalid publisher file inventory');
 const sortedNames=names(manifest.files.map(file=>file?.path));let total=0;
 for(const file of manifest.files){
  if(!fields(file,['path','bytes','sha256'])||!Number.isSafeInteger(file.bytes)||file.bytes<1||file.bytes>PUBLISHER_LIMITS.fileBytes||typeof file.sha256!=='string'||!/^[a-f0-9]{64}$/.test(file.sha256))fail('Invalid publisher artifact metadata');
  total+=file.bytes;if(total>PUBLISHER_LIMITS.totalBytes)fail('Publisher artifact total exceeds its bound');
 }
 if(!equalNames(sortedNames,manifest.files.map(file=>file.path)))fail('Publisher artifact paths must be sorted');
 return manifest;
}
function parseManifest(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>PUBLISHER_LIMITS.manifestBytes)fail('Publisher manifest exceeds its size bound or is empty');
 let manifest;try{manifest=JSON.parse(bytes.toString('utf8'));}catch{fail('Publisher manifest is not valid JSON');}
 validateManifest(manifest);
 // Exact encoding eliminates ambiguous duplicate keys, alternate encodings and trailing objects.
 if(!canonical(manifest).equals(bytes))fail('Publisher manifest must use canonical UTF-8 JSON without duplicate keys');
 return manifest;
}
function key(input,type){
 let result;
 try{
  if(input instanceof KeyObject){result=input;}
  else{
   if(typeof input!=='string'&&!Buffer.isBuffer(input))fail('Invalid publisher key input');
   const bytes=Buffer.isBuffer(input)?input:Buffer.from(input);
   if(bytes.length===0||bytes.length>PUBLISHER_LIMITS.keyBytes)fail('Publisher key exceeds its bound');
   const label=type==='public'?'PUBLIC KEY':'PRIVATE KEY';
   if(!new RegExp(`^-----BEGIN ${label}-----[\\s\\S]+-----END ${label}-----\\s*$`).test(bytes.toString('ascii')))fail(`Expected a ${type} PEM key`);
   result=type==='public'?createPublicKey(bytes):createPrivateKey(bytes);
  }
 }catch{fail(`Invalid Ed25519 ${type} key`);}
 if(result.type!==type||result.asymmetricKeyType!=='ed25519')fail(`Expected an Ed25519 ${type} key`);
 return result;
}
export function publisherKeyFingerprint(publicKey){return sha256(key(publicKey,'public').export({type:'spki',format:'der'}));}
function sameIdentity(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs&&a.nlink===b.nlink;}
function regular(stat){return stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1n;}
const pathKey=value=>process.platform==='win32'?value.toLowerCase():value;

export async function assertPublisherDirectory(directory){
 if(typeof directory!=='string'||!directory)fail('An artifact directory is required');
 const root=path.resolve(directory),parsed=path.parse(root);let current=parsed.root;
 for(const part of root.slice(parsed.root.length).split(path.sep).filter(Boolean)){
  current=path.join(current,part);const stat=await lstat(current);
  if(stat.isSymbolicLink()||!stat.isDirectory())fail('Publisher directory must not contain linked or non-directory ancestors');
 }
 if(pathKey(await realpath(root))!==pathKey(root))fail('Publisher directory resolves through an alias');
 return root;
}
async function inspectFile(filename,maxBytes,collect){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1)fail('Invalid file size bound');
 const full=path.resolve(filename),directory=await assertPublisherDirectory(path.dirname(full));
 const before=await lstat(full,{bigint:true});
 if(!regular(before))fail('Publisher input must be a regular file without links');
 if(before.size<1n||before.size>BigInt(maxBytes))fail('Publisher input is empty or exceeds its size bound');
 let handle;try{
  handle=await open(full,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  const opened=await handle.stat({bigint:true});
  if(!regular(opened)||!sameIdentity(before,opened))fail('Publisher input changed before reading');
  const hash=createHash('sha256'),chunks=[];let count=0;const buffer=Buffer.alloc(Math.min(maxBytes+1,1024*1024));
  while(true){const {bytesRead}=await handle.read(buffer,0,Math.min(buffer.length,maxBytes-count+1),null);if(bytesRead===0)break;count+=bytesRead;if(count>maxBytes)fail('Publisher input grew beyond its size bound');const chunk=buffer.subarray(0,bytesRead);hash.update(chunk);if(collect)chunks.push(Buffer.from(chunk));}
  if(BigInt(count)!==before.size||!sameIdentity(before,await handle.stat({bigint:true}))||!sameIdentity(before,await lstat(full,{bigint:true})))fail('Publisher input changed during reading');
  await assertPublisherDirectory(directory);
  return {bytes:count,sha256:hash.digest('hex'),...(collect?{data:Buffer.concat(chunks,count)}:{})};
 }finally{await handle?.close();}
}
export async function readPublisherInputFile(filename,maxBytes){return (await inspectFile(filename,maxBytes,true)).data;}
async function inventory(directory,filenames){
 const root=await assertPublisherDirectory(directory),entries=[];let total=0;
 for(const name of names(filenames)){
  const {bytes,sha256}=await inspectFile(path.join(root,...name.split('/')),PUBLISHER_LIMITS.fileBytes,false);
  total+=bytes;if(total>PUBLISHER_LIMITS.totalBytes)fail('Publisher artifact total exceeds its bound');entries.push({path:name,bytes,sha256});
 }
 return entries;
}

/** Explicit selected artifacts only. Keep the private key outside any distribution tree. */
export async function signPublisherRelease({directory,files,product,version,privateKey}){
 validateProduct(product);validateVersion(version);const signingKey=key(privateKey,'private');
 const manifest=validateManifest({format:PUBLISHER_FORMAT,algorithm:'Ed25519',product,version,files:await inventory(directory,files)});
 const manifestBytes=canonical(manifest);if(manifestBytes.length>PUBLISHER_LIMITS.manifestBytes)fail('Publisher manifest exceeds its size bound');
 const signatureBytes=sign(null,manifestBytes,signingKey);
 return {manifest,manifestBytes,signatureBytes,keyFingerprint:publisherKeyFingerprint(createPublicKey(signingKey))};
}

/** Supply a separately pinned key and expectations, never keys learned from the target manifest. */
export async function verifyPublisherRelease({directory,manifestBytes,signatureBytes,publicKey,expectedVersion,expectedProduct,expectedFiles}){
 validateVersion(expectedVersion);validateProduct(expectedProduct);const expectedNames=names(expectedFiles),verifyingKey=key(publicKey,'public');
 if(!Buffer.isBuffer(signatureBytes)||signatureBytes.length!==64)fail('Invalid detached Ed25519 signature length');
 const manifest=parseManifest(manifestBytes);
 if(!verify(null,manifestBytes,verifyingKey,signatureBytes))fail('Publisher signature verification failed');
 if(manifest.version!==expectedVersion)fail('Unexpected publisher release version');
 if(manifest.product!==expectedProduct)fail('Unexpected publisher product');
 if(!equalNames(manifest.files.map(file=>file.path),expectedNames))fail('Missing or extra artifact names in publisher manifest');
 const actual=await inventory(directory,expectedNames);
 for(let i=0;i<actual.length;i++)if(actual[i].bytes!==manifest.files[i].bytes||actual[i].sha256!==manifest.files[i].sha256)fail('Publisher artifact checksum mismatch: '+actual[i].path);
 return {verified:true,scope:'explicit-release-artifacts',product:manifest.product,version:manifest.version,files:actual,keyFingerprint:publisherKeyFingerprint(verifyingKey),manifestSha256:sha256(manifestBytes),meaning:'Signature and exact named artifact bytes verified against the supplied pinned key. Other directory files, runtime safety, ownership rights and marketplace approval are not verified.'};
}
