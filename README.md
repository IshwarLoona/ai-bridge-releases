# Loona Plugin

Loona Plugin connects Roblox Studio to a local MCP-capable AI client for inspection, protected edits, tests, checkpoints and animation workflows.

**Beta:** this release has automated engineering and package checks. The refreshed Studio UI still needs native installation/visual verification. It is not a claim of commercial readiness or Creator Store approval.

## Downloads

- [Loona Plugin companion 0.33.2-store.1](https://github.com/IshwarLoona/ai-bridge-releases/releases/tag/v0.33.2-store.1)
- [Previous verified companion 0.33.1-store.1](https://github.com/IshwarLoona/ai-bridge-releases/releases/tag/v0.33.1-store.1)
- [Support](https://github.com/IshwarLoona/ai-bridge-releases/issues)

The free companion contains the local broker, MCP adapter and required standalone ScenePlayer runtime. It does **not** include the complete Studio plugin, plugin builder or local installer. Obtain the plugin separately from the publisher's verified listing; a verified Creator Store URL is not yet recorded here. The Roblox publisher account is **Misterloona**.

Use matching plugin and companion versions. The companion needs Node.js and a separate AI client; it does not include an AI model or Eclipse Animator. Setup instructions and known limits are inside the download. Animation handoff creates public animation copies for manual opening; it does not promise lossless Eclipse private-project fidelity.

## Official signatures

Use the [trusted verifier](verification/verify-publisher.mjs), its [module](verification/release-authenticity.mjs), and the [publisher public key](verification/LOONA-PUBLISHER-v1.pem) from this exact account. Pin them through a channel you trust before using a download from elsewhere. A key or verifier beside an unknown ZIP cannot establish its own authenticity.

Publisher key v1, SHA-256 of SPKI DER:

```text
6866e9875a2bfc9a1caacfee154300ed6384c47dd962371ea178c76b92ad16cf
```

Download all six assets from the versioned release, then run:

```powershell
node verify-publisher.mjs --key LOONA-PUBLISHER-v1.pem --manifest RELEASE.json --signature RELEASE.sig --directory . --product "Loona Plugin" --version 0.33.2-store.1 --file loona-plugin-companion-0.33.2-store.1.zip --file release-authenticity.mjs --file verify-publisher.mjs
```

Require `verified: true` before extracting or running the companion. Next, run `node scripts/verify-store-package.mjs` in the extracted directory, then follow SETUP.md. Signatures identify exact official files; they do not hide local code or guarantee security. Proprietary licensing remains separate from inspectability, and third-party licenses remain intact.

The legacy repository URL and technical `AIBridge` identifiers are retained for compatibility. The visible product name is **Loona Plugin**. Send reproducible reports without tokens, credential files or private project content.
