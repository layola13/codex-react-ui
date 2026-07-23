# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Active Slice (2026-07-23)

Shared Web + TUI history completeness and admin-unfiltered list on port **43110**:

1. **History no provider filter** - done  
   - Client + server force `thread/list` with `modelProviders: []` and full `sourceKinds`.  
   - Admin: never membership-filter history. Members: temporarily unfiltered for shared-host acceptance.  
   - Target session `019f8c99-3e99-7f50-bf39-a6f46ba88371` (`code_launch` CLI) verified visible via admin WS.

2. **Transcript rendering** - done  
   - User messages via content blocks when `text` is null.  
   - Resume soft-fail on missing provider; `thread/read` still loads full turns.

3. **Realtime sync** - partial  
   - Shared daemon default + subscription holds landed.  
   - Dual-client live soak / full bidirectional stability acceptance still open.

4. **Docs** - done this turn  
   - `tasks.md` / `progress.md` / `current_plan.md` updated for unfilter slice.

## Verification

- Admin WS `thread/list` (with and without client `modelProviders`): 12/12, target present.
- `thread/read` target: 17 turns.
- `bun` typecheck (shared/server/web) + web build: passed.
- Server: `http://127.0.0.1:43110/` daemon mode.

## Next

1. Hard-refresh browser acceptance: confirm left history shows `codex-ui-5.6` and open full transcript.
2. Dual-client Web/TUI realtime soak until stable.
3. When multi-tenant isolation is needed again: restore member-only list filter while keeping **admin always unfiltered** and **always `modelProviders: []`**.

## Deferred

- Token-accurate billing, multi-engine chat, Arena, Docker isolation.
- Re-enable strict member history isolation (post-acceptance).
