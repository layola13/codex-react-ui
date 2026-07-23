# Coze / Dify Workflow Compiler Plan

## Background

Dify and Coze Studio already provide mature agent, workflow, plugin, knowledge-base,
and deployment capabilities. Rebuilding those platforms inside Codex React UI would
create heavy overlap and poor leverage.

The real gap is earlier in the workflow lifecycle: turning a product idea, PRD,
API document, or business process description into a runnable workflow. Today this
usually requires a user to manually drag nodes, connect edges, configure variables,
copy prompts, and debug field mappings inside Dify or Coze.

This project can provide value by compiling natural-language plans into workflow
artifacts that Dify and Coze can import, edit, and deploy.

## Pain Points

- Complex workflows are slow to create by hand.
- Manual node wiring is error-prone when the flow has branches, retries, or tools.
- Variable mapping across nodes is tedious and easy to break.
- Prompts, conditions, HTTP calls, and output schemas are scattered across many UI
  panels in target platforms.
- Teams often start from natural-language requirements, but Dify and Coze mainly
  expose visual builders rather than a reliable requirement-to-workflow compiler.
- Reviewers need a readable flow diagram before importing into a platform.
- Platform-specific formats make it hard to reuse the same process design across
  Dify, Coze, and future workflow systems.

## Why Build This

The goal is not to replace Dify or Coze. The goal is to make Codex React UI a local
workflow design and compilation console.

Codex React UI is strong at local-first development workflows: reading documents,
editing files, running commands, using MCP tools, preserving history, and iterating
with the user. Those strengths fit the workflow design stage well.

Dify and Coze are strong at hosting, visual editing, deployment, knowledge-base
integration, and production runtime. The best product boundary is therefore:

```text
Codex React UI: plan, generate, validate, preview, export
Dify / Coze: import, edit, run, observe, deploy
```

This creates a complementary integration instead of a duplicate platform.

## Product Goal

Allow a user to describe a business process in natural language and receive:

- a human-readable workflow diagram,
- a structured intermediate representation,
- a validation report,
- a Dify export artifact,
- a Coze export artifact,
- optionally a direct deployment action through platform APIs.

Example input:

```text
Build a customer-service QA workflow:
1. Input a support conversation.
2. Classify the customer issue type.
3. Detect whether the agent made prohibited promises.
4. Generate a score, risks, and coaching advice.
5. If score is below 70, send a webhook notification.
```

Expected outputs:

- Mermaid preview for review.
- Node table with prompts, inputs, outputs, and variable names.
- Dify workflow draft/export.
- Coze workflow draft/export.
- Missing-info questions for webhook URL, model choice, output schema, etc.

## Non-Goals

- Do not rebuild a full Dify or Coze visual editor.
- Do not replace Dify or Coze runtime execution.
- Do not initially implement full bidirectional sync.
- Do not support every platform-specific node in the first version.
- Do not put Dify API keys or Coze PATs in browser local storage.

## Architecture

Use a neutral workflow intermediate representation first, then export to target
platform formats.

```text
Natural language / PRD / API docs
  -> Workflow planner
  -> Workflow IR
  -> Validator
  -> Mermaid exporter
  -> Dify exporter
  -> Coze exporter
  -> Optional deploy adapter
```

### Workflow IR

The IR should model the common subset of Dify and Coze first.

```ts
type WorkflowIR = {
  version: string;
  name: string;
  description?: string;
  inputs: WorkflowInput[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  outputs: WorkflowOutput[];
};
```

Initial node types:

```ts
type NodeType =
  | "start"
  | "end"
  | "llm"
  | "condition"
  | "http"
  | "code"
  | "knowledge"
  | "template"
  | "variable";
```

### Exporters

```text
WorkflowIR -> MermaidExporter -> .md / .mmd / SVG preview
WorkflowIR -> DifyExporter    -> Dify import artifact
WorkflowIR -> CozeExporter    -> Coze import artifact
```

Each exporter should return both the generated artifact and a compatibility report.
If a node cannot be represented exactly on a platform, the exporter should either
map it to a supported equivalent or emit a clear warning.

### Plugin Form

Implement this as a plugin package or local MCP-backed plugin rather than hardcoding
Dify and Coze logic into the main UI.

Proposed package shape:

```text
codex-plugin-workflow-compiler/
  manifest.json
  README.md
  skills/
    workflow-planner.md
    dify-exporter.md
    coze-exporter.md
  mcp/
    server.ts
  schemas/
    workflow-ir.schema.json
  exporters/
    mermaid.ts
    dify.ts
    coze.ts
  validators/
    workflow-ir.ts
```

Potential tools:

```text
workflow.generate_ir
workflow.validate_ir
workflow.render_mermaid
workflow.export_dify
workflow.export_coze
workflow.deploy_dify
workflow.deploy_coze
```

## Compatibility Matrix

| IR Node | Dify | Coze | Notes |
| --- | --- | --- | --- |
| start | Supported | Supported | Basic entry node. |
| end | Supported | Supported | Output mapping differs. |
| llm | Supported | Supported | Prompt/model config differs. |
| condition | Supported | Supported | Condition expression DSL differs. |
| http | Supported | Supported | Auth and body mapping differ. |
| code | Supported | Supported/limited | Security constraints need confirmation. |
| knowledge | Supported | Supported | Knowledge binding differs. |
| template | Supported through prompt/text nodes | Supported through prompt/text nodes | May need lowering. |
| loop | Later | Later | Confirm platform support before MVP. |
| human-in-loop | Later | Later | Platform semantics may diverge. |

## Implementation Phases

### Phase 0: Format Research

- Collect Dify workflow export/import samples.
- Collect Coze workflow export/import samples.
- Identify required fields, node IDs, edge format, viewport metadata, variable
  references, and platform-specific defaults.
- Document what can be generated safely and what must be user-provided.

Deliverable:

- `workflow-ir.schema.json`
- Dify sample artifact
- Coze sample artifact
- compatibility notes

### Phase 1: IR and Mermaid MVP

- Generate a valid Workflow IR from a natural-language process description.
- Validate required structure: one start node, one or more end nodes, valid edges,
  unique node IDs, and resolvable variable references.
- Render a Mermaid preview.
- Ask clarification questions when required configuration is missing.

Deliverable:

- `workflow.generate_ir`
- `workflow.validate_ir`
- `workflow.render_mermaid`

### Phase 2: Dify Export

- Implement Dify exporter for the common node subset.
- Support start, end, LLM, condition, HTTP, code, and knowledge retrieval where
  the target format allows it.
- Produce a compatibility report for unsupported nodes.
- Validate generated artifacts against real Dify import behavior.

Deliverable:

- `workflow.export_dify`
- Dify import smoke test
- Dify-specific warnings and defaults

### Phase 3: Coze Export

- Implement Coze exporter for the common node subset.
- Map IR nodes to Coze workflow resources.
- Support Coze-specific bot/app/workflow metadata where needed.
- Validate generated artifacts against Coze Studio import or API behavior.

Deliverable:

- `workflow.export_coze`
- Coze import smoke test
- Coze-specific warnings and defaults

### Phase 4: Direct Deployment

- Add optional platform credentials stored server-side.
- Deploy generated workflows through Dify / Coze APIs where supported.
- Keep a local deployment record with target platform, artifact hash, remote ID,
  timestamp, and compatibility warnings.

Deliverable:

- `workflow.deploy_dify`
- `workflow.deploy_coze`
- deployment audit trail

### Phase 5: Reverse Import and Iteration

- Import an existing Dify or Coze workflow into Workflow IR.
- Render it as Mermaid and editable structured data.
- Allow natural-language edits such as "add a risk branch before webhook".
- Re-export to the same platform.

Deliverable:

- `workflow.import_dify`
- `workflow.import_coze`
- round-trip compatibility report

## Validation Requirements

Every generated workflow should pass these checks before export:

- Node IDs are unique.
- Every edge references existing nodes.
- Start and end nodes exist.
- Required node configs are present.
- Variable references resolve to upstream outputs or global inputs.
- Platform-specific unsupported features are reported.
- Secrets are represented as placeholders, not embedded values.
- Exported artifacts include deterministic IDs where possible for stable diffs.

## Security Requirements

- Store Dify API keys and Coze PATs server-side only.
- Never write secrets into generated Mermaid diagrams.
- Generated HTTP nodes should redact sensitive headers by default.
- Direct deploy actions should be admin-only initially.
- Maintain an audit log for platform deploys and credential changes.

## Open Questions

- What exact Dify import/export format should be targeted first?
- What exact Coze Studio import/export or API path supports workflow creation?
- Should the first UI be a chat-driven generator, a document-to-flow command, or a
  dedicated workflow compiler page?
- How much platform-specific metadata should be exposed to users in the MVP?
- Should generated workflows prefer portable common nodes or platform-optimized
  nodes when the two conflict?

## Recommendation

Proceed with a Workflow Compiler plugin, not a broad Dify/Coze runtime integration.

The first milestone should be:

```text
Natural-language process -> Workflow IR -> Mermaid preview -> Dify/Coze export draft
```

This directly solves the expensive manual node-drawing problem while keeping Dify
and Coze as the production workflow platforms.
