# PC Chat Waterfall Redesign Plan

## 1. Goal

Redesign the main chat waterfall in `codex-react-ui` as a first-class PC desktop
chat surface, not as a lightly styled message stack.

The target experience should combine:

- LiveAgent-style real-time agent chat stability.
- cc-sessions-viewer-style transcript search, jump, and tool audit clarity.
- Existing `codex-react-ui` strengths: MUI desktop workbench, slash commands,
  sidechat isolation, theme plugins, goal bar, review/diff/compact actions, and
  Codex app-server integration.

The end state should feel like a modern desktop Agent workbench:

- Comfortable for long natural-language conversations.
- Wide and readable for code, diffs, tool output, and command execution.
- Stable while Codex streams reasoning and responses.
- Searchable and navigable when a session grows large.
- Friendly to PC mouse/keyboard workflows.

## 2. Current State

The current main chat implementation lives primarily in:

- `apps/web/src/components/ChatPanel.tsx`
- `apps/web/src/components/MarkdownMessage.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/state/codexClient.ts`

Important current behavior:

- `ChatPanel` receives `WorkbenchTurn[]` and flattens them into display items.
- `conversationItemsForTurns()` attaches accumulated reasoning to the next
  `agentMessage`.
- Active reasoning renders as a three-line preview.
- Completed reasoning is opened through a Thinking dialog.
- Main waterfall is currently rendered as:
  - scrollable `Box`
  - centered `Stack`
  - nested `Stack data-testid="conversation-waterfall"`
  - one `Box` per item
- No virtual scrolling is used in the main chat.
- Every rendered item is card-like, including assistant text.
- Tool-like items stretch full width, but are still visually generic.
- The sticky goal surface is outside the scroll body.
- Composer is a separate bottom row owned by `App.tsx`.
- Sidechat has its own simpler transcript and should remain isolated.

Current strengths to preserve:

- Markdown renderer already has language headers, copy, download, wrap toggle,
  line numbers, diff coloring, and collapse behavior.
- Goal, slash notice, stats, request monitor, and parallel agent rail are already
  integrated into the chat panel.
- Theme plugin tuning already controls background and surface opacity.
- App-level command routing is mature and should not be disturbed.

Current gaps:

- Long sessions render all mounted rows, which will degrade with large histories.
- No first-class row model separates user, assistant, reasoning, tool call,
  file change, command output, status, checkpoint, and notices.
- Assistant responses look too card-like for a modern chat surface.
- Tool output lacks the audit grouping depth seen in cc-sessions-viewer.
- There is no floor rail, prompt map, or data-driven chat search.
- Bottom-follow behavior is basic and not designed around streaming row growth.
- Wide PC layouts do not adapt between prose reading and engineering output.

## 3. Design Direction

Use a two-mode width strategy.

### Default Conversation Mode

Best for live chat and normal prose.

- Center column target: `820px` to `920px` on desktop.
- User messages: right-aligned compact bubbles.
- Assistant prose: left-aligned open text or very light surface, not heavy cards.
- Reasoning: inline preview while active, collapsed control after completion.
- Status surfaces: small inline rows, not large cards unless action is required.
- Goal bar: remain sticky above transcript.
- Composer: remain bottom-owned by `App.tsx`, but chat scroll must account for
  its height and not hide the final message.

### Engineering Reading Mode

Best for code, diffs, tool output, review, and command logs.

- Column expands up to `min(86vw, 1600px)`.
- Code blocks, file changes, and command output can use wide rows.
- Tool call plus tool result should be visually grouped.
- File changes should be shown as an audit unit:
  `Tool call -> File change -> status/time/actions`.
- User/assistant prose should not become overly wide; only engineering blocks
  should use the larger width.

The UI can start with automatic per-row width rules before adding a visible mode
toggle.

## 4. Target Architecture

Introduce a dedicated chat waterfall architecture instead of continuing to grow
`ChatPanel.tsx`.

Recommended files:

- `apps/web/src/components/chat-waterfall/ChatWaterfall.tsx`
- `apps/web/src/components/chat-waterfall/chatRows.ts`
- `apps/web/src/components/chat-waterfall/ChatRow.tsx`
- `apps/web/src/components/chat-waterfall/ChatFloorRail.tsx`
- `apps/web/src/components/chat-waterfall/ChatSearchOverlay.tsx`
- `apps/web/src/components/chat-waterfall/chatScroll.ts`
- `apps/web/src/components/chat-waterfall/chatRowEstimates.ts`
- `apps/web/src/components/chat-waterfall/types.ts`

Keep `ChatPanel.tsx` as the container for high-level workbench surfaces:

- parallel agent rail
- sticky goal bar
- errors
- slash notice
- stats panel
- request monitor entry
- empty state
- selected agent header

Move the actual message waterfall into `ChatWaterfall`.

## 5. Row Model

Create a normalized `ChatWaterfallRow` type. This is the key redesign step.

Suggested row kinds:

```ts
type ChatWaterfallRow =
  | UserMessageRow
  | AssistantMessageRow
  | ReasoningPreviewRow
  | ToolCallRow
  | ToolResultRow
  | FileChangeRow
  | CommandExecutionRow
  | StatusRow
  | ErrorRow
  | CheckpointRow
  | NoticeRow;
```

Each row should include:

- `key`: stable unique key.
- `turnId`: source turn id.
- `threadId`: source thread id.
- `itemIds`: all source item ids represented by this row.
- `kind`: row kind.
- `role`: `user | assistant | tool | system` where applicable.
- `text`: primary text.
- `title`: compact row label.
- `status`: optional status.
- `payload`: original payload for specialized renderers.
- `searchText`: flattened searchable text.
- `floor`: optional floor metadata for user prompts.
- `width`: `prose | wide | full`.
- `isLive`: whether this row belongs to an in-progress turn.

Initial mapping rules:

- `userMessage` -> `UserMessageRow`.
- `agentMessage` -> `AssistantMessageRow`, with attached completed reasoning.
- active trailing `reasoning` in unfinished turn -> `ReasoningPreviewRow`.
- `commandExecution` -> `CommandExecutionRow`.
- `fileChange` -> `FileChangeRow`.
- `mcpToolCall` -> `ToolCallRow`.
- unknown non-chat item -> `StatusRow` or generic `ToolResultRow`.

Later mapping improvements:

- Group related tool call/result/file change items by payload ids when available.
- Hide duplicate result-only rows once grouped.
- Expose raw payload in a collapsed details section for debugging.

## 6. Virtual Scrolling

Add `@tanstack/react-virtual` to `apps/web/package.json`.

Use virtual scrolling for the main transcript once row normalization is in place.

Recommended behavior:

- Scroll element is owned by `ChatWaterfall`.
- Use dynamic row measurement with `measureElement`.
- Use stable `getItemKey(row.key)`.
- Use estimates based on row kind.
- Overscan around `6-10` rows initially.
- Force-mount the active live row and any active reasoning row so streaming does
  not unmount mid-generation.
- Keep the viewport attached to the bottom while the user is near the bottom.
- If the user scrolls up, stop auto-follow and show a compact `Jump to latest`
  button.
- Preserve scroll position when older history is prepended or when tool blocks
  expand/collapse.

Suggested estimate strategy:

- User row: 80 to 140 px, adjusted by text length and attachments.
- Assistant prose: 180 to 320 px, adjusted by markdown/code indicators.
- Reasoning preview: 88 px.
- Command execution: 160 to 360 px.
- File change/diff: 260 to 520 px.
- Status/notice row: 48 to 80 px.

Do not start with perfect estimates. Start with stable behavior and refine after
real screenshots.

## 7. Visual System

### User Messages

- Right aligned.
- Max width around `72%` in default mode.
- Subtle primary-tinted bubble.
- No role header unless metadata is useful.
- Inline attachments below text.
- Actions on hover: copy, branch/resend if later supported.

### Assistant Messages

- Left aligned.
- Prose should feel open, not boxed heavily.
- Use a small avatar or role marker only if it helps scanning.
- Markdown content should be the main visual object.
- Completed reasoning should appear as a compact `Thinking` button or collapsible
  chip above the answer, not as a modal-only experience.

### Reasoning

Active:

- Three-line preview directly in the flow.
- Muted surface, subtle animated activity indicator.
- Never steals width from the final answer.

Completed:

- Collapsed by default.
- Expand inline for local context.
- Optional full dialog remains useful for long reasoning.

### Tool Calls

- Render as compact audit cards, not regular assistant bubbles.
- Header includes icon, tool name, status, and concise target.
- Body is collapsed by default for noisy payloads.
- Tool result appears inside or immediately attached to the initiating tool row.

### File Changes

- Wide row.
- Strong visual grouping for modified file path, status, summary, and diff.
- Reuse `MarkdownMessage` code/diff rendering where possible.
- Add open/copy controls later if app-server support exists.

### Command Execution

- Wide row.
- Terminal-style mono output.
- Collapse long output by default.
- Keep copy control visible on hover.

### Notices and Status

- Use small inline rows.
- Avoid large `Paper` cards for transient status.
- Slash command result can stay prominent when user action/feedback matters.

## 8. Navigation

Add PC-first navigation inspired by LiveAgent and cc-sessions-viewer.

### Floor Rail

Add a right-side floor rail inside the chat viewport.

- Floors correspond primarily to user prompt rows.
- Collapsed state shows sampled markers.
- Hover expands to a list of prompts.
- Active floor follows the top visible user row.
- Clicking a floor scrolls to the user row and stabilizes for several frames.
- Support pinned/favorite floors later.
- Hide or simplify on narrow mobile widths.

### Jump To Prompt

Add a prompt list overlay or popover.

- Search/filter by prompt text.
- Show prompt sequence number and short preview.
- Click jumps to row and flashes it.
- This is complementary to the floor rail.

### Jump To Latest

- Appears when user is not near bottom and new rows arrive.
- Shows either `Jump to latest` or `N new`.
- Clears once user reaches bottom.

## 9. Search

Implement data-driven search, not DOM-only search.

Search should operate over normalized row data:

- user text
- assistant text
- reasoning summaries
- tool names
- tool input/output
- file paths
- command output
- status titles

Search UI:

- Keyboard shortcut: `Cmd/Ctrl+Shift+F` or project-standard shortcut.
- Overlay with input, count, prev/next buttons, and scope filter.
- Scopes: `All`, `User`, `Assistant`, `Tools`, `Files`, `Commands`.
- Results jump via virtualizer to target row.
- Visible row gets highlighted/flash effect.

Do not rely on walking the DOM for counting. DOM highlighting can be added only
for visible rows after the data-level result is selected.

## 10. Composer And Scroll Contract

The composer currently lives below `ChatPanel` in `App.tsx`.

Keep that ownership for now, but create a clear scroll contract:

- `ChatPanel`/`ChatWaterfall` owns transcript scrolling.
- `App.tsx` owns composer size and bottom row.
- Chat waterfall receives a CSS variable or prop for composer height if needed.
- Transcript bottom spacer ensures the latest row is never covered.
- `Jump to latest` button should sit above the composer line.

Potential later improvement:

- Add a `ResizeObserver` around `Composer` and pass height into `ChatPanel`.
- This helps when attachments or slash menus increase composer height.

## 11. Parallel Agents

Current parallel agent rail is valuable and should remain.

Changes needed:

- `ChatWaterfall` should accept rows for either main conversation or selected
  agent conversation.
- Floor rail should reset when selected agent changes.
- Search should search only the currently visible conversation by default.
- Agent thread selection/loading behavior should stay in `ChatPanel`.

Do not merge sidechat into this redesign. Sidechat is intentionally isolated and
can receive a smaller follow-up redesign later.

## 12. Implementation Phases

### Phase 1: Planning And Row Model

Deliverables:

- Add `chat-waterfall` folder.
- Extract row normalization from `ChatPanel.tsx` into `chatRows.ts`.
- Keep rendering non-virtual initially.
- Add unit-like tests or focused pure function checks for row normalization.
- Keep existing UI visually close to current behavior.

Validation:

- Existing messages still render.
- Reasoning still attaches to following assistant message.
- Active reasoning preview still appears.
- Parallel agent view still filters correctly.
- Typecheck passes.

### Phase 2: Visual Redesign Without Virtualization

Deliverables:

- Replace generic `WorkbenchItemView` with row-specific renderers.
- Assistant prose becomes lighter and less card-heavy.
- User bubble remains compact and right-aligned.
- Tool/file/command rows get dedicated wide audit styles.
- Add row width rules: prose, wide, full.
- Preserve `MarkdownMessage` and improve only where necessary.

Validation:

- Browser screenshot of normal chat.
- Browser screenshot with code block/diff/command output.
- Browser screenshot with active reasoning.
- Browser screenshot with slash notice and sticky goal.

### Phase 3: Virtual Scroll And Live Follow

Deliverables:

- Add `@tanstack/react-virtual`.
- Implement `ChatWaterfall` virtual list.
- Add dynamic row measurement.
- Add bottom-follow behavior.
- Add `Jump to latest` button.
- Preserve expansion state for reasoning/tool/code rows across unmounts.

Validation:

- Long synthetic session with hundreds/thousands of rows remains responsive.
- Stream-like row growth stays pinned when near bottom.
- User scroll-up stops auto-follow.
- Expanding a tool/code block does not cause severe scroll jumps.

### Phase 4: Floor Rail And Prompt Map

Deliverables:

- Add floor metadata from user rows.
- Implement `ChatFloorRail`.
- Add active floor tracking.
- Add prompt jump popover.
- Add row flash highlight on jump.

Validation:

- Long session shows sampled floor rail markers.
- Hover rail expands on desktop.
- Clicking a prompt lands at the expected row.
- Prompt map filters and jumps correctly.

### Phase 5: Data-Driven Search

Deliverables:

- Add searchable row text construction.
- Add search overlay and scope filters.
- Add virtualized jump to result.
- Add visible-row highlight for selected result.

Validation:

- Search finds rows outside mounted viewport.
- Scope filters work for user/assistant/tools/files/commands.
- Prev/next wraps cleanly.
- Selected match flashes and remains visible.

### Phase 6: Polish And PC Ergonomics

Deliverables:

- Add responsive width tuning for desktop, laptop, and narrow mobile.
- Add keyboard shortcuts for search, prompt map, jump latest.
- Add hover actions for copy/collapse where useful.
- Tune theme opacity so custom backgrounds do not reduce readability.
- Add Playwright screenshots for desktop and mobile.

Validation:

- `bun run typecheck`
- `bun run build`
- focused Playwright screenshot checks
- full relevant e2e checks

## 13. Acceptance Criteria

The redesign is complete when:

- Main chat no longer renders the transcript as a plain MUI `Stack` of all rows.
- Large histories are virtualized and remain responsive.
- Live streaming remains stable near the bottom.
- User scroll position is respected when reading older content.
- Assistant prose looks like modern chat, not a stack of generic cards.
- Tool calls, file changes, and command output are visually distinct audit rows.
- PC wide screens are used for engineering content without making prose too wide.
- Prompt/floor navigation exists and works in long sessions.
- Search works across virtualized, unmounted rows.
- Existing slash command surfaces, goal bar, stats, request monitor, and parallel
  agent rail still work.
- Sidechat remains isolated and unaffected.

## 14. Non-Goals For This Redesign

Do not include these in the first implementation pass:

- Rewriting app-server protocol handling.
- Changing Codex `WorkbenchTurn` or `WorkbenchItem` wire types.
- Replacing MUI.
- Redesigning sidechat.
- Redesigning history management.
- Adding remote collaboration features.
- Moving composer ownership out of `App.tsx` unless required by measurement.

## 15. Suggested First Slice

Start with Phase 1 and Phase 2 together, but without virtualization.

Reason:

- The row model must be correct before virtual scrolling.
- Visual direction can be validated quickly with screenshots.
- The blast radius is limited to `ChatPanel` and new components.
- It creates stable seams for the harder scrolling/search/navigation work.

Concrete first PR/slice:

1. Create `chat-waterfall` component folder.
2. Extract `conversationItemsForTurns()` into `buildChatRows()`.
3. Add row kinds and width classes.
4. Replace `renderWorkbenchItem()` with `ChatRow` renderers.
5. Preserve all existing props and high-level `ChatPanel` behavior.
6. Capture before/after screenshots for:
   - empty state
   - normal user/assistant exchange
   - reasoning preview
   - code block
   - command/file/tool row
   - sticky goal plus slash notice

This gives the project a new foundation without committing immediately to the
hardest virtual scrolling changes.
