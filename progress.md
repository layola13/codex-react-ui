# Progress

## 2026-07-16

- Created an independent monorepo at `/root/projects/codex-react-ui`.
- Added packages:
  - `packages/shared` for JSON-RPC, permission, provider, and UI state contracts.
  - `packages/codex-protocol` with generated Codex app-server TypeScript protocol and JSON schema.
  - `apps/server` for the localhost-only Fastify/WebSocket bridge.
  - `apps/web` for the React + MUI workbench.
- Implemented Codex bridge startup over `codex app-server --stdio`.
- Added token-protected local HTTP/WebSocket API.
- Added account/model/thread bootstrap RPC calls.
- Added permission presets, including explicit high-risk bypass confirmation.
- Added provider save/activate flow for official and third-party Responses-compatible providers.
- Added history loading through `thread/read(includeTurns=true)`.
- Added composer image attachment support using Codex `UserInput` image blocks.
- Verified `pnpm typecheck` after the history/image implementation.
- Initialized Git repository on branch `main`.
- Added right-side MCP tooling backed by `mcpServerStatus/list` and `config/mcpServer/reload`.
- Added right-side Skills tooling backed by `skills/list`, `skills/config/write`, and `skills/changed` refresh handling.
- Added right-side Plugins tooling backed by `plugin/list`, `plugin/install`, and `plugin/uninstall` across local, workspace, and remote marketplace kinds.
- Preserved pending approval handling at the top of the Tools panel while adding MCP, Skills, and Plugins sub-tabs.

## Known Gaps

- API keys are process-memory only and must be re-entered after restarting the UI service.
- MCP OAuth login/resource calls, skill previews/extra roots, plugin detail views/mentions, Monaco editor, and terminal surfaces still need full implementation.
- Provider alias metadata is stored but not yet used to rewrite selected models.
- No automated browser screenshot regression has been added yet.
