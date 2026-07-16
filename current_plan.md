# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Immediate Slice

1. Keep the repository under Git from this point forward.
2. Commit completed feature slices after typecheck/build verification.
3. Finish the core user loop:
   - select or create a thread
   - load history
   - compose text/image input
   - select model/provider
   - choose permissions
   - send a turn
   - render messages, tool calls, command output, diffs, approvals
4. Expand right-side configuration:
   - provider/key management
   - MCP servers
   - Skills
   - Plugins
   - file and terminal tools

## Engineering Rules

- Browser talks only to the local Node service, never directly to Codex app-server.
- Local service binds to `127.0.0.1` and protects non-session APIs with a session token.
- Dangerous bypass mode is available but must require explicit confirmation and must not become a remembered default.
- Do not write API keys to Codex config; prefer keyring, with process-memory env vars as the temporary fallback.
- Generated Codex protocol files should be regenerated from the local Codex binary, not edited by hand.

## Next Commit Target

Complete and verify the history loading plus text/image composer slice, then commit it with the repository initialization and tracking docs.
