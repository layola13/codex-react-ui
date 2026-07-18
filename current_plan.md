# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Immediate Slice

1. Support all Codex user config settings in the Settings UI:
   - use `/root/projects/codex/codex-rs/core/config.schema.json` as the dynamic field source
   - preserve compact Quick settings for common engine fields
   - add searchable All config coverage for schema-derived fields and runtime keys returned by `config/read`
   - write scalar, nested, and JSON values through `config/batchWrite` with `reloadUserConfig`
2. Verify with commands and screenshots:
   - `pnpm --filter @codex-ui/web typecheck`
   - `pnpm --filter @codex-ui/web build`
   - `pnpm exec playwright install chromium`
   - `pnpm test:e2e`
   - inspect updated Settings screenshots for layout regressions and theme consistency
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

Dynamic schema-backed Codex config Settings UI is verified, committed locally, and pushed to GitHub through the authenticated SSH remote URL.

## Latest Verification

- `pnpm exec playwright install chromium`
- `pnpm --filter @codex-ui/web typecheck`
- `pnpm --filter @codex-ui/web build`
- `pnpm test:e2e` (13/13 Chromium tests)
