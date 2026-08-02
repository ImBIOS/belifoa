---
name: linear-agent
description: Better Linear for Agent (Belifoa) - Efficiently query, manage, and create Linear issues with minimal token consumption and persistent authentication.
---

# Linear Agent (Belifoa Skill)

Belifoa provides a high-performance, agent-friendly interface for Linear.

## Core Capabilities
- **Persistent Auth**: Uses `LINEAR_API_KEY` (Personal API Key) or `~/.config/belifoa/config.json`.
- **70%+ Token Footprint Savings**: Formatted Markdown tables/cards instead of massive, raw GraphQL API JSON objects.

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

# Create an issue
bun x github:ImBIOS/belifoa#canary create --team ENG --title "Fix race condition in auth" --priority 1

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
- `linear_manage_issue({ action: "update", issueId: "ENG-123", state: "In Progress" })`
- `linear_manage_issue({ action: "close", issueId: "ENG-123", commentBody: "Fixed in PR #42" })`
- `linear_manage_issue({ action: "comment", issueId: "ENG-123", commentBody: "Fixed in commit abc123" })`
- `linear_get_teams_and_projects()`
- `linear_get_labels()`
