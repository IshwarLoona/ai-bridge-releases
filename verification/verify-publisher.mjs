#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {PUBLISHER_LIMITS,readPublisherInputFile,verifyPublisherRelease} from './release-authenticity.mjs';

export const VERIFY_PUBLISHER_USAGE='node verify-publisher.mjs --key PINNED_PUBLIC.pem --manifest RELEASE.json --signature RELEASE.sig --directory ARTIFACT_DIRECTORY --product "Loona Plugin" --version VERSION --file EXACT_ARTIFACT_NAME [--file ANOTHER_NAME]';
export async function verifyPublisherCli(args){
 const {values,tokens}=parseArgs({args,tokens:true,strict:true,allowPositionals:false,options:{key:{type:'string'},manifest:{type:'string'},signature:{type:'string'},directory:{type:'string'},product:{type:'string'},version:{type:'string'},file:{type:'string',multiple:true},help:{type:'boolean'}}});
 const seen=new Set();for(const token of tokens){if(token.kind!=='option'||token.name==='file')continue;if(seen.has(token.name))throw Error('Duplicate --'+token.name);seen.add(token.name);}
 if(values.help)return {usage:VERIFY_PUBLISHER_USAGE,trust:'Obtain the verifier and pinned public key through a trusted channel. A key beside an untrusted download is not an independent trust anchor.'};
 for(const field of ['key','manifest','signature','directory','product','version'])if(!values[field])throw Error('Missing --'+field+'; '+VERIFY_PUBLISHER_USAGE);
 // Read only; never import, install or execute anything from the target directory.
 return verifyPublisherRelease({directory:values.directory,publicKey:await readPublisherInputFile(values.key,PUBLISHER_LIMITS.keyBytes),manifestBytes:await readPublisherInputFile(values.manifest,PUBLISHER_LIMITS.manifestBytes),signatureBytes:await readPublisherInputFile(values.signature,64),expectedVersion:values.version,expectedProduct:values.product,expectedFiles:values.file});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await verifyPublisherCli(process.argv.slice(2)),null,2));}
 catch(error){console.error('Publisher verification failed: '+error.message);process.exitCode=1;}
}
