# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Immediate Slice

The sidechat slice is complete and verified.

1. Settings/image/tooling regression scope stayed green:
   - Settings -> Codex Engine remains backed by the bundled Codex JSON schema.
   - Relay providers remain in Settings -> Relay and secrets remain out of Codex config writes.
   - Main composer image input still uses Codex image data URLs with size-based browser guards.
2. Sidechat behavior is implemented:
   - top-right toolbar control opens the sidechat panel and hides the inspector to match the reference side-by-side layout
   - desktop uses a resizable right-side panel; mobile uses a stacked sidechat panel
   - multiple sidechat tabs/windows can stay open at once
   - each sidechat tab owns its own draft, local transcript, in-flight state, and Codex `threadId`
   - sidechat threads are filtered out of the main task tabs/history and main `ChatPanel`
   - sidechat websocket notifications do not steal the selected main conversation
   - `/goal ...`, `/status ...`, and other slash-command-shaped inputs are sent as exact Codex text input with no UI allow-list or rewrite
   - TUI-only slash commands are documented as requiring app-server support for TUI-specific behavior
3. Verification is complete:
   - `pnpm typecheck`
   - `pnpm --filter @codex-ui/web build`
   - `pnpm check:codex-config-schema`
   - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "sidechat"`
   - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "exposes every bundled Codex schema setting|supports drag and drop image attachments|sidechat"`
   - `pnpm test:e2e` (16/16 Chromium tests)
4. Screenshot evidence is complete:
   - captured `snapshot/sidechat-workbench.png`
   - inspected it against `snapshot/sidechat/屏幕截图 2026-07-18 153125.png` and the other sidechat reference images for the right panel, tab strip, fixed `+`, close controls, and bottom composer
5. Release hygiene:
   - `README.md`, `tasks.md`, `progress.md`, and `current_plan.md` describe the verified sidechat state
   - the sidechat slice is ready to commit and push through the authenticated SSH remote

## Engineering Rules

- Browser talks only to the local Node service, never directly to Codex app-server.
- Local service binds to `127.0.0.1` and protects non-session APIs with a session token.
- Dangerous bypass mode is available but must require explicit confirmation and must not become a remembered default.
- Do not write API keys to Codex config; use keyring when available and process-memory env vars as fallback.
- Resolve provider model aliases before writing Codex config or starting turns, including short chained aliases such as `codex -> gpt-5.5 -> grok-4.5`.
- Generated Codex protocol files should be regenerated from the local Codex binary, not edited by hand.

## Next Commit Target

The next commit target is the verified sidechat slice:

- independent multi-tab sidechat behavior is wired to Codex threads
- main-chat focus remains stable while sidechat notifications stream
- slash-command input is preserved and tested
- desktop/mobile layout behavior is verified
- sidechat screenshots are saved under `/root/projects/snapshot`
- existing settings/theme/tooling/image tests remain green
- `tasks.md`, `progress.md`, and `current_plan.md` describe the verified state
- the commit is pushed through the authenticated SSH remote URL

## Latest Verification

- `pnpm typecheck`
- `pnpm check:codex-config-schema`
- `pnpm --filter @codex-ui/web typecheck`
- `pnpm --filter @codex-ui/web build`
- `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "sidechat"`
- `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "exposes every bundled Codex schema setting|supports drag and drop image attachments|sidechat"`
- `pnpm test:e2e` (16/16 Chromium tests)

The sidechat-specific checks and screenshot comparison are now complete.

## Detailed Remaining Work

1. Commit the verified sidechat slice.
2. Push `main` to `origin/main`.
