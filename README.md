# ⚡ Belifoa (Better Linear for Agent)

> **Belifoa** is an agent-first Linear toolkit designed to solve short authentication expirations, heavy JSON payload context bloat, and tool clutter when AI agents interact with Linear.

---

## 🌟 Why Belifoa?

Standard Linear MCP integrations suffer from:
1. **Short-Lived Auth**: Frustrating OAuth session expirations interrupting autonomous agent loops.
2. **Heavy Payload Overhead**: Raw GraphQL API JSON responses return thousands of tokens of unnecessary metadata (`__typename`, node arrays, hex colors, avatar URLs).
3. **Tool Sprawl**: 30+ fine-grained tools causing LLM tool selection confusion and multi-turn delays.

**Belifoa solves this with:**
- **Persistent Auth**: Linear Personal API Keys (`lin_api_...`) that never expire unless revoked.
- **70–80% Context Token Savings**: Beautiful, compact Markdown tables & cards or minified JSON.
- **Unified Interfaces**: Available as a **CLI** (`bun x github:ImBIOS/belifoa#main`), **MCP Server** (`bun x github:ImBIOS/belifoa#main mcp`), **Antigravity Skill**, **Plugin**, and **Git Hook**.
- **Objective Benchmarking Suite**: Automated tests verifying token footprint reduction.

---

## 🚀 Quick Start & CLI Usage

### 1. Direct Usage (Without publishing to npm)

Execute Belifoa directly from GitHub using `bun x` or `npx`:

```bash
# Set long-lived Linear API key
bun x github:ImBIOS/belifoa#main auth set <lin_api_...>

# Check auth status
bun x github:ImBIOS/belifoa#main auth status

# List my assigned issues
bun x github:ImBIOS/belifoa#main my-issues

# Search issues
bun x github:ImBIOS/belifoa#main search "auth bug" --team ENG

# Get detailed issue view
bun x github:ImBIOS/belifoa#main issue ENG-123

# Create issue with full fields (assignee, project, estimate, due-date, labels, state)
bun x github:ImBIOS/belifoa#main create --team ENG \
  --title "Implement Auth Cache" \
  --description "Detailed task scope" \
  --priority 1 \
  --assignee "jane@example.com" \
  --project "Security Q3" \
  --estimate 5 \
  --due-date "2026-08-15" \
  --labels "backend,security" \
  --state "In Progress"

# Bulk import issues from JSON
bun x github:ImBIOS/belifoa#main import --file tasks.json --team ENG
```

### 2. Global Binary Linking (CLI everywhere in PATH)

To make `belifoa` globally accessible anywhere in your system terminal:

```bash
# Clone or link in repository root:
bun link
# or
pnpm link --global

# Test global execution:
belifoa --version
belifoa my-issues
```

---

## 🛠️ Interface Options

### A. MCP Server Setup
Add Belifoa to your MCP client configuration (e.g. `opencode.jsonc`, `mcp_config.json`, or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "belifoa": {
      "command": "bun",
      "args": ["x", "github:ImBIOS/belifoa#main", "mcp"],
      "env": {
        "LINEAR_API_KEY": "lin_api_your_key_here"
      }
    }
  }
}
```

### B. Antigravity Skill
Include [`skills/linear-agent/SKILL.md`](skills/linear-agent/SKILL.md) in your skills directory.

---

## 📊 Objective Benchmarking Results

Run the built-in benchmark runner anytime:

```bash
pnpm run benchmark
# or
bun run benchmark/runner.ts
```

### Measured Benchmark Savings:

| Scenario | Paradigm / Format | Payload Size | Est. Tokens | Savings (%) |
|---|---|---|---|---|
| **Issue Search** | Official Raw Linear MCP (JSON) | 6,437 B | ~1,694 | **0% (Baseline)** |
| | Belifoa Compact JSON | 562 B | ~147 | **91%** |
| | **Belifoa Markdown Table** | **764 B** | **~200** | **88%** |
| **Issue Detail** | Official Raw Linear MCP (JSON) | 3,369 B | ~887 | **0% (Baseline)** |
| | Belifoa Compact JSON | 1,317 B | ~347 | **61%** |
| | **Belifoa Markdown Card** | **1,279 B** | **~337** | **62%** |

---

## 📄 License
MIT © [ImBIOS](https://github.com/ImBIOS)
