# AI Bridge companion

**Beta · version 0.33.1-store.1**

AI Bridge connects a local MCP-capable AI client to Roblox Studio for inspection, previewed edits, retained test results, checkpoints and supported animation-copy workflows.

This repository distributes the **free local companion only**. The matching paid AI Bridge Studio plugin will be distributed separately through Creator Store. It has not yet been uploaded, and no listing URL is available. Downloading this companion does not purchase or install the plugin.

The companion is available as a public beta. The Studio plugin upload and Store installation checks remain pending; the companion alone cannot connect to Studio. The pre-publication status in the immutable ZIP describes its packaging-time status; this release page is the current publication record.

## Download

- [Download companion 0.33.1-store.1](https://github.com/IshwarLoona/ai-bridge-releases/releases/download/v0.33.1-store.1/ai-bridge-companion-0.33.1-store.1.zip)
- [Versioned release page](https://github.com/IshwarLoona/ai-bridge-releases/releases/tag/v0.33.1-store.1)
- [Download checksum file](https://github.com/IshwarLoona/ai-bridge-releases/releases/download/v0.33.1-store.1/PUBLIC-SHA256SUMS.txt)

Archive: `ai-bridge-companion-0.33.1-store.1.zip` · **506,888 bytes**

SHA-256:

```text
9b352e370f6f0249775b1cf8ee8cd88a70d7c8489de65ca795de0bd30ec0424c
```

The ZIP contains 125 payload files plus `STORE-MANIFEST.json`. It includes the broker, stdio MCP adapter, Windows profile scripts, setup checker, documentation and standalone ScenePlayer runtime. It excludes the paid Studio plugin source, bundle, builder and local plugin installer. `plugin/src/lib/ScenePlayer.lua` is an export runtime, not an installable Studio plugin.

## Set up

Use Node.js 24 LTS, Roblox Studio, the matching separately acquired plugin and a client supporting local stdio MCP servers. The companion supplies no AI model, subscription or Eclipse license. Your chosen AI application's account and usage terms still apply.

1. Download the ZIP and compare its SHA-256 with the value above. In PowerShell:

   ```powershell
   Get-FileHash -Algorithm SHA256 .\ai-bridge-companion-0.33.1-store.1.zip
   ```

2. Extract it to a stable local folder. Open a terminal in that folder and run:

   ```powershell
   node --version
   node scripts/verify-store-package.mjs
   npm ci
   npm run check:setup
   ```

3. Open **`docs/SETUP.md` inside the extracted folder**. It contains the complete Windows-profile and manual setup routes, explicit permissions, plugin pairing steps, and Codex/Claude Code registration examples. Choose one connection route. Keep the broker running separately from the stdio adapter.
4. Require `versionMatches:true`, `nodeSupported:true`, `scenePlayer.available:true` and all four dependency statuses `available:true` from the setup checker. Those results do not establish a Studio connection. Follow the guide to select the intended Studio session and verify a small disposable edit before using a real project.

No development build or test suite is needed to use this companion. Do not try to rebuild or install the paid plugin from this archive. The checksum inventory checks supplied file identities; it is not a publisher signature or connection test.

## Boundaries to understand

- Save your place normally and inspect previews. An uncertain write may already have applied; inspect the **same operation ID** and actual Studio state instead of retrying under a new ID.
- Automated Model-by-ID insertion is unavailable in this Store build. The existing Mesh import path remains subject to supported types, Roblox permissions and asset availability.
- The Eclipse handoff creates a separate public `KeyframeSequence` for manual opening in Eclipse. It does not preserve Eclipse's private layers or curves, automate its UI, or promise a lossless round trip.
- Historical 0.33 testing retained one tested pose correction after Eclipse save/reopen, but the editor baked the frame grid and moved duplicate markers from 0.5 to approximately 0.508333325 seconds. Inspect gameplay event timing after editor saves. This Store candidate has no new installed-plugin or Eclipse UI verification.

Read **`docs/KNOWN-LIMITS.md`** and, for exported playback, **`docs/SCENE-PLAYBACK.md`** in the extracted package.

## Verification and support

The release candidate's source-bound engineering run reported **2,440 passing tests, zero failures and one optional skip**. These include unit, integration and controlled VM tests; they are not all Studio tests. A fresh extraction passed nine companion checks, including locked dependency installation, authenticated loopback broker/SDK stdio operation and ScenePlayer export generation. This does not establish that a particular Codex/Claude installation or the eventual Store-installed plugin has connected.

Report reproducible problems through the [issue tracker](https://github.com/IshwarLoona/ai-bridge-releases/issues). Include the version, fixed error code and failing setup step. Do not attach tokens, credential files, private paths or project contents. No support response time is promised.

The archive includes `LICENSE.txt`, `THIRD-PARTY-NOTICES.txt` and `THIRD-PARTY-MANIFEST.json`. Read those terms before use. The proprietary license permits local use with a legitimately obtained plugin, including commercial Roblox development, backups and local modifications for your own use; it does not grant competing-product redistribution or resale rights. Third-party components keep their own licenses. Eclipse is separate software and is not included or affiliated with this package.
