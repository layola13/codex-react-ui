# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Immediate Slice

The Codex plugin Settings slice is implemented and under final full-suite verification.

1. Settings/image/tooling regression scope stayed green:
   - Settings -> Codex Engine remains backed by the bundled Codex JSON schema.
   - Relay providers remain in Settings -> Relay and secrets remain out of Codex config writes.
   - Main composer image input still uses Codex image data URLs with size-based browser guards.
2. Settings -> Codex Plugins is real, not placeholder:
   - marketplace plugins render from `plugin/list`
   - installed plugin mentions render from `plugin/installed`
   - plugin detail, install/uninstall, app auth, skill preview, and mention insertion use existing app-server RPCs
   - MCP inventory renders from `mcpServerStatus/list`
   - MCP reload, OAuth, resource read, and direct tool-call controls are available in Settings
   - theme plugin customization remains isolated in Appearance
3. Slash command entry points are implemented:
   - exact `/plugins` opens Settings -> Codex Plugins marketplace without sending `turn/start`
   - exact `/mcp` opens the MCP tab without sending `turn/start`
   - sidechat keeps its existing raw slash-command forwarding behavior
4. Verification so far:
   - `pnpm --filter @codex-ui/web typecheck`
   - `pnpm --filter @codex-ui/web build`
   - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "Codex plugins and MCP|uses installed-only plugin mentions|supports direct MCP tool calls"`
5. Remaining release hygiene:
   - run the full E2E suite after this slice
   - commit and push after verification is green if this slice is accepted for landing

## Engineering Rules

- Browser talks only to the local Node service, never directly to Codex app-server.
- Local service binds to `127.0.0.1` and protects non-session APIs with a session token.
- Dangerous bypass mode is available but must require explicit confirmation and must not become a remembered default.
- Do not write API keys to Codex config; use keyring when available and process-memory env vars as fallback.
- Resolve provider model aliases before writing Codex config or starting turns, including short chained aliases such as `codex -> gpt-5.5 -> grok-4.5`.
- Generated Codex protocol files should be regenerated from the local Codex binary, not edited by hand.

## Current Baseline

The verified sidechat slice remains the pushed baseline. The next landing target is the Codex plugin Settings slice:

- Settings -> Codex Plugins must contain no placeholder-only content
- plugin marketplace, installed plugins, apps/auth, and MCP inventory must be backed by real app-server data
- `/plugins` and `/mcp` must open Settings views and not start a Codex turn
- existing right-inspector plugin/MCP workflows must remain green

## Latest Verification

- `pnpm --filter @codex-ui/web typecheck`
- `pnpm --filter @codex-ui/web build`
- `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "Codex plugins and MCP|uses installed-only plugin mentions|supports direct MCP tool calls"`

Full-suite verification is pending for the Codex plugin Settings slice.

## Detailed Remaining Work

1. Run full E2E.
2. Commit and push the Codex plugin Settings slice if verification is green.
