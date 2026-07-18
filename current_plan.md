# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Immediate Slice

1. Prove the "complete all settings" state:
   - keep Settings -> Codex Engine backed by the bundled Codex JSON schema
   - verify every bundled Codex schema setting keyPath is searchable and visible in All config
   - keep relay providers in Settings -> Relay and secrets out of Codex config writes
   - keep Appearance theme mode/plugin settings, Layout settings, Session settings, Plugins, Pet Dock, and Privacy groups available from the Settings drawer
   - keep main composer image input aligned with Codex image handling, including drag-and-drop attachments and size-based browser guards rather than a 5-image count cap
2. Finish the sidechat slice before claiming the broader UI goal is complete:
   - wire the top-right sidechat control into the desktop and mobile layouts
   - keep multiple sidechat tabs open at the same time, with each tab holding its own draft, visible transcript, and Codex `threadId`
   - allow a turn in one sidechat tab to continue while another tab is selected and used
   - keep sidechat notifications from stealing the main chat's selected thread
   - pass slash commands and their arguments unchanged as Codex text input; do not implement a fragile UI-only allow-list
   - explicitly test `/goal` and at least one additional command-shaped input, while documenting that Codex TUI-only commands may require an app-server mapping
   - match the sidechat reference tab bar, close affordances, composer proportions, and right-panel surfaces
3. Verify with commands and screenshots:
   - `pnpm --filter @codex-ui/web typecheck`
   - `pnpm --filter @codex-ui/web build`
   - `pnpm check:codex-config-schema`
   - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "exposes every bundled Codex schema setting"`
   - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "supports drag and drop image attachments"`
   - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "sidechat"`
   - `pnpm test:e2e`
   - inspect `/root/projects/snapshot/07-right-companion-sidebar.png`
   - inspect `/root/projects/snapshot/08-settings-appearance-theme-cards.png`
   - inspect `/root/projects/snapshot/09-settings-relay-model-channels.png`
   - inspect `/root/projects/snapshot/10-settings-relay-saved-channels.png`
4. Capture and inspect a sidechat screenshot under `/root/projects/snapshot`, comparing it to `snapshot/sidechat/屏幕截图 2026-07-18 153125.png` and the other reference images in that folder.
5. Update `tasks.md`, `progress.md`, and `current_plan.md` after each verified feature slice.
6. Commit and push after verification. The sidechat commit must not be made until typecheck, build, focused sidechat E2E, full E2E, and screenshot inspection are all complete.

## Engineering Rules

- Browser talks only to the local Node service, never directly to Codex app-server.
- Local service binds to `127.0.0.1` and protects non-session APIs with a session token.
- Dangerous bypass mode is available but must require explicit confirmation and must not become a remembered default.
- Do not write API keys to Codex config; use keyring when available and process-memory env vars as fallback.
- Resolve provider model aliases before writing Codex config or starting turns, including short chained aliases such as `codex -> gpt-5.5 -> grok-4.5`.
- Generated Codex protocol files should be regenerated from the local Codex binary, not edited by hand.

## Next Commit Target

The next commit target is the completed sidechat slice:

- independent multi-tab sidechat behavior is wired to Codex threads
- main-chat focus remains stable while sidechat notifications stream
- slash-command input is preserved and tested
- desktop/mobile layout behavior is verified
- sidechat screenshots are saved under `/root/projects/snapshot`
- existing settings/theme/tooling/image tests remain green
- `tasks.md`, `progress.md`, and `current_plan.md` describe the verified state
- the commit is pushed through the authenticated SSH remote URL

## Latest Verification

- `pnpm check:codex-config-schema`
- `pnpm --filter @codex-ui/web typecheck`
- `pnpm --filter @codex-ui/web build`
- `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "exposes every bundled Codex schema setting"`
- `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "supports drag and drop image attachments"`
- `pnpm test:e2e` (14/14 Chromium tests)

These are the latest recorded broad checks, not proof that the current sidechat slice is complete. The sidechat-specific checks and screenshot comparison are still pending.

## Detailed Remaining Work

1. Source review and implementation audit:
   - inspect the current `App.tsx` sidechat state and ensure every render path uses the active sidechat tab
   - remove incomplete helpers or stale references introduced during the interrupted implementation
   - confirm the sidechat panel is actually mounted behind the top-right control on desktop and on the mobile stacked layout
   - confirm each tab starts at most one thread and subsequent prompts reuse that tab's thread
2. Concurrency behavior:
   - extend the mocked WebSocket to return unique thread IDs
   - emit `thread/started`, `turn/started`, item delta, and `turn/completed` notifications for separate sidechat threads
   - send from tab A, switch to tab B, send from tab B, then verify both request payloads and both transcripts remain isolated
3. Slash commands:
   - keep `/goal`, `/plan`, `/review`, `/status`, and unknown/custom command-shaped input as raw text in the request payload
   - avoid claiming that the browser can execute every TUI-only command unless an app-server RPC exists for it
   - document any commands that require an explicit app-server mapping instead of silently pretending they work
4. Visual verification:
   - run the dev/preview server as required by the existing Playwright harness
   - capture desktop and mobile sidechat screenshots
   - inspect for tab overflow, close-button hit areas, composer clipping, panel resize behavior, and theme contrast
5. Release hygiene:
   - update all three tracking documents after the feature is actually verified
   - run the full test/build gate
   - commit with a focused message and push to `origin/main`
