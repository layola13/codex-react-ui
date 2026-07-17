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
- [x] Add plugin detail, remote skill preview, and composer mention insertion UI.
- [x] Add MCP OAuth login and resource read UI.
- [x] Add Playwright E2E harness for workbench/tooling smoke checks.
- [x] Persist provider API keys through a system keyring with memory fallback.
- [x] Apply chained model aliases in provider activation and turn-start paths.
- [x] Validate configured hubproxy relay envs without exposing API keys.

## Next

- [x] Add MCP direct tool-call forms with argument JSON editing.
- [x] Add Skills extra roots and local skill markdown preview.
- [x] Add plugin installed-only mention picker and richer plugin app/auth handling.
- [x] Add Monaco-backed file explorer/editor using app-server filesystem APIs.
- [x] Add terminal/process controls for command execution and PTY interaction.
- [x] Add Playwright screenshot regression checks for desktop and mobile workbench layouts.

## Later

- [x] Package a one-command launcher.
- [x] Add import/export for UI profiles.
- [x] Add stronger audit logging for dangerous permission sessions.
