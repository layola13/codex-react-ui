# Tasks

## Now

- [x] Initialize this project as an independent Git repository.
- [x] Keep generated build output, dependencies, logs, and local env files out of Git.
- [x] Build the Codex engine bridge with `codex app-server --stdio`.
- [x] Build the React + MUI three-column workbench.
- [x] Support official Codex account/model/history bootstrap through app-server RPCs.
- [x] Add user-selectable new-conversation permission presets, including `dangerously-bypass-approvals-and-sandbox` gated by `BYPASS`.
- [x] Add third-party relay/provider metadata save and provider activation.
- [x] Add history thread loading with `thread/read(includeTurns=true)`.
- [x] Add text + image mixed input in the composer.
- [x] Add MCP server inventory and reload UI.
- [x] Add Skills inventory and enable/disable UI.
- [x] Add plugin marketplace inventory with install/uninstall UI.

## Next

- [ ] Persist provider API keys through a system keyring instead of process memory.
- [ ] Apply model aliases in the model picker and turn-start path.
- [ ] Add MCP OAuth login and resource/tool detail actions.
- [ ] Add Skills extra roots and skill markdown preview.
- [ ] Add plugin detail/read, skill preview, and mention insertion.
- [ ] Add Monaco-backed file explorer/editor using app-server filesystem APIs.
- [ ] Add terminal/process controls for command execution and PTY interaction.
- [ ] Add visual regression checks for desktop and mobile workbench layouts.

## Later

- [ ] Package a one-command launcher.
- [ ] Add import/export for UI profiles.
- [ ] Add stronger audit logging for dangerous permission sessions.
