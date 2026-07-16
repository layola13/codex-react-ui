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

## Known Gaps

- API keys are process-memory only and must be re-entered after restarting the UI service.
- MCP, Skills, Plugins, Monaco editor, and terminal surfaces still need full implementation.
- Provider alias metadata is stored but not yet used to rewrite selected models.
- No automated browser screenshot regression has been added yet.
