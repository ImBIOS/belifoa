---
name: linear-agent
description: Better Linear for Agent (Belifoa) - Efficiently query, manage, and create Linear issues with minimal token consumption and persistent authentication.
---

# Linear Agent (Belifoa Skill)

Belifoa provides a high-performance, agent-friendly interface for Linear.

## Core Capabilities
- **Persistent Auth**: Uses `LINEAR_API_KEY` (Personal API Key) or `~/.config/belifoa/config.json`.
- **70%+ Token Footprint Savings**: Formatted Markdown tables/cards instead of massive, raw GraphQL API JSON objects.
- **Smart Zero-Config Repo, Team & Submodule Resolution**: Auto-detects matching workspace profile and team key from Git remote URL, `.belifoarc.json`, or `.mcp.json` traversing parent and submodule directory trees.
- **MCP Tool Namespacing for Monorepos**: Prefixes MCP tools with workspace profile name (e.g. `belifoa_myrehat_create_issue` or `belifoa_myrehat_list_issues`) to prevent tool collisions when multiple MCP servers run concurrently.
- **Explicit Active Profile Banner**: Prints a 1-line context header (`[belifoa] Active Profile: myrehat (Workspace: MyRehat, Default Team: MYR)`) on CLI & MCP outputs for immediate visual confirmation.
- **Standardized CLI Flags**: Consistent `-p/--profile`, `-w/--workspace`, and `-t/--team` across all CLI subcommands (`list`, `issue list`, `my-issues`, `search`, `create`, `update`, `close`).
- **Git Branch Helper**: Generate and checkout standard Linear branch names (`belifoa branch ENG-123 -b` or `--checkout`).
- **Idempotency & Duplicate Prevention**: Avoid duplicate issues with `--check-existing` / `--idempotent` in creation & import commands or `checkExisting` parameter in MCP tools.
- **Hierarchy & Relations**: Support for `parentId`, `blockedBy`, and `blocks` dependencies in issue CRUD and MCP tools.
- **Batch Issue Operations**: Create multiple issues in a single API roundtrip via `linear_bulk_create_issues` or `linear_manage_issue({ action: "bulk_create", issues: [...] })`.
- **Self-Correcting LLM Errors**: Structured JSON errors returning valid `availableTeams`, `availableStates`, `availableUsers`, and `availableProfiles` on invalid inputs so agents self-correct in 1 turn.

## Usage Modes

### 1. Direct CLI Execution (Zero MCP Overhead)
Agents can execute CLI commands directly in terminal using `bun x github:ImBIOS/belifoa#canary`:

```bash
# List my assigned issues
bun x github:ImBIOS/belifoa#canary my-issues

# Search issues
bun x github:ImBIOS/belifoa#canary search "login bug" --team ENG

# Get detailed issue view
bun x github:ImBIOS/belifoa#canary issue ENG-123

# Get git branch name slug or checkout branch
bun x github:ImBIOS/belifoa#canary branch ENG-123 -b

# Create an issue (with hierarchy, relations, and duplicate prevention)
bun x github:ImBIOS/belifoa#canary create --team ENG --title "Fix race condition in auth" --priority 1 --parent ENG-100 --blocked-by ENG-99 --check-existing

# Update an existing issue
bun x github:ImBIOS/belifoa#canary update ENG-123 --state "In Progress" --assignee me -c "Started working on fix"

# Close or resolve an issue
bun x github:ImBIOS/belifoa#canary close ENG-123 -c "Fixed in PR #42"

# List workspace labels
bun x github:ImBIOS/belifoa#canary labels
```

### 2. Streamlined MCP Tools
When MCP is connected via `bun x github:ImBIOS/belifoa#canary mcp`, use these consolidated tools:
- `linear_get_issue({ id: "ENG-123", format: "markdown" })`
- `linear_search_issues({ query: "auth bug", teamKey: "ENG" })`
- `linear_get_my_issues()`
- `linear_manage_issue({ action: "create", title: "Subtask fix", parentId: "ENG-100", blockedBy: ["ENG-99"] })`
- `linear_manage_issue({ action: "update", issueId: "ENG-123", state: "In Progress" })`
- `linear_manage_issue({ action: "close", issueId: "ENG-123", commentBody: "Fixed in PR #42" })`
- `linear_manage_issue({ action: "bulk_create", issues: [{ title: "Task 1" }, { title: "Task 2" }] })`
- `linear_bulk_create_issues({ issues: [{ title: "Feature A", parentId: "ENG-100" }] })`
- `linear_get_teams_and_projects()`
- `linear_get_labels()`
