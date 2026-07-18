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
2. Verify with commands and screenshots:
   - `pnpm --filter @codex-ui/web typecheck`
   - `pnpm --filter @codex-ui/web build`
   - `pnpm check:codex-config-schema`
   - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "exposes every bundled Codex schema setting"`
   - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "supports drag and drop image attachments"`
   - `pnpm test:e2e`
   - inspect `/root/projects/snapshot/07-right-companion-sidebar.png`
   - inspect `/root/projects/snapshot/08-settings-appearance-theme-cards.png`
   - inspect `/root/projects/snapshot/09-settings-relay-model-channels.png`
   - inspect `/root/projects/snapshot/10-settings-relay-saved-channels.png`
3. Update `tasks.md`, `progress.md`, and `current_plan.md` after the completed feature slice.
4. Commit and push after verification.

## Engineering Rules

- Browser talks only to the local Node service, never directly to Codex app-server.
- Local service binds to `127.0.0.1` and protects non-session APIs with a session token.
- Dangerous bypass mode is available but must require explicit confirmation and must not become a remembered default.
- Do not write API keys to Codex config; use keyring when available and process-memory env vars as fallback.
- Resolve provider model aliases before writing Codex config or starting turns, including short chained aliases such as `codex -> gpt-5.5 -> grok-4.5`.
- Generated Codex protocol files should be regenerated from the local Codex binary, not edited by hand.

## Next Commit Target

All Settings coverage audit and regression test are verified, committed locally, and pushed to GitHub through the authenticated SSH remote URL.

## Latest Verification

- `pnpm check:codex-config-schema`
- `pnpm --filter @codex-ui/web typecheck`
- `pnpm --filter @codex-ui/web build`
- `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "exposes every bundled Codex schema setting"`
- `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "supports drag and drop image attachments"`
- `pnpm test:e2e` (14/14 Chromium tests)
