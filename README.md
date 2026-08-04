# ⚡ Belifoa — High-Performance Linear MCP Server & Agent Toolkit

<p align="center">
  <a href="https://github.com/ImBIOS/belifoa/releases"><img src="https://img.shields.io/github/v/release/ImBIOS/belifoa?style=flat-square&color=6366f1" alt="Version"></a>
  <a href="https://github.com/ImBIOS/belifoa/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ImBIOS/belifoa?style=flat-square&color=22c55e" alt="License"></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/bun-%3E%3D1.3-000000?style=flat-square&logo=bun" alt="Bun"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-8b5cf6?style=flat-square" alt="MCP Compatible"></a>
  <a href="BENCHMARK_RESULTS.md"><img src="https://img.shields.io/badge/Context%20Savings-70--80%25-emerald?style=flat-square" alt="Token Savings"></a>
</p>

> **Belifoa** ("Better Linear for Agent") is an agent-first Linear client and Model Context Protocol (MCP) server engineered to solve short authentication expirations, heavy GraphQL payload token bloat, and tool selection sprawl when AI agents interact with Linear.

---

## 📌 Table of Contents

- [🌟 Why Belifoa?](#-why-belifoa)
- [✨ Key Features](#-key-features)
- [📊 Objective Benchmarking Results](#-objective-benchmarking-results)
- [🚀 Quick Start & CLI Usage](#-quick-start--cli-usage)
- [🛠️ MCP Server Integration](#️-mcp-server-integration)
- [🛡️ Profile Resolution & Agent Isolation](#️-profile-resolution--agent-isolation)
- [🧩 Skills, Plugins & Git Hooks](#-skills-plugins--git-hooks)
- [🧪 Testing & Benchmarks](#-testing--benchmarks)
- [📄 License](#-license)

---

## 🌟 Why Belifoa?

Standard Linear integrations for LLM agents suffer from three major inefficiencies:

1. **Short-Lived Auth Sessions**: Standard OAuth integrations expire frequently, breaking long-running autonomous AI agent loops.
2. **Heavy Payload Token Bloat**: Raw Linear GraphQL API responses contain thousands of tokens of unnecessary metadata (`__typename`, nested node arrays, hex colors, avatar URLs) that consume agent context windows.
3. **Tool Sprawl & Multi-Turn Overhead**: 30+ fine-grained tools confuse LLM tool-calling logic and increase multi-turn latency.

**Belifoa eliminates these bottlenecks:**
- **Persistent Personal API Key Auth**: Uses Linear Personal API Keys (`lin_api_...`) that stay valid continuously unless revoked.
- **70–80% Prompt Token Reduction**: Formats Linear data into clean, compact CLI tables, Markdown cards, or minified JSON optimized for token efficiency.
- **Unified Multimodal Access**: One core tool usable via **CLI**, **MCP Server**, **Antigravity Skill**, **Plugin**, and **Git Hooks**.

---

## ✨ Key Features

- **⚡ Token-Efficient Context Formatting**: CLI defaults to ANSI-styled `cli_table`, while MCP tools default to lightweight `markdown` and `compact_json` to maximize token budget.
- **🔐 Multi-Profile & Workspace Isolation**: Manage multiple Linear accounts and team profiles seamlessly without cross-project state leakage.
- **📂 Smart Repository & Directory Auto-Detection**: Auto-detects workspace profile and team key from Git remote origin URL and directory name when `--team` is omitted.
- **🔗 First-Class Hierarchy & Relations**: Easily link `parentId`, `blockedBy`, and `blocks` dependencies in issue CRUD and MCP tool calls.
- **🌿 Git Branch Helper Output**: Get ready-to-use Linear git branch slugs (`belifoa branch ENG-123`) and checkout branches directly (`--checkout`).
- **📦 MCP Bulk Issue Creation**: Batch create multiple backlog items in a single API roundtrip via `linear_bulk_create_issues` or `linear_manage_issue({ action: "bulk_create" })`.
- **🔄 Self-Correcting Error Payloads for LLMs**: Returns structured JSON errors with valid suggestions (`availableTeams`, `availableStates`, `availableUsers`, `availableProfiles`) on invalid parameters so AI agents self-correct in 1 turn.
- **🚀 Zero-Installation Direct Execution**: Run instantly using `bun x github:ImBIOS/belifoa#canary` or `pnpm add github:ImBIOS/belifoa`.

---

## 📊 Objective Benchmarking Results

Belifoa includes an automated benchmarking suite to measure payload optimization performance:

| Scenario | Paradigm / Format | Payload Size | Est. Tokens | Context Savings (%) |
|---|---|---|---|---|
| **Issue Search** | Official Raw Linear MCP (JSON) | 6,437 B | ~1,694 | **0% (Baseline)** |
| | Belifoa Compact JSON | 562 B | ~147 | **91%** |
| | **Belifoa Markdown Table** | **764 B** | **~200** | **88%** |
| **Issue Detail** | Official Raw Linear MCP (JSON) | 3,369 B | ~887 | **0% (Baseline)** |
| | Belifoa Compact JSON | 1,317 B | ~347 | **61%** |
| | **Belifoa Markdown Card** | **1,279 B** | **~337** | **62%** |

*(For full benchmark methodology, see [`BENCHMARK_RESULTS.md`](BENCHMARK_RESULTS.md))*

---

## 🚀 Quick Start & CLI Usage

### 1. Direct Execution via GitHub

You can execute Belifoa directly from GitHub without publishing to npm:

```bash
# Set long-lived Linear API key
bun x github:ImBIOS/belifoa#canary auth set <lin_api_...>

# Check authentication status
bun x github:ImBIOS/belifoa#canary auth status

# List issues assigned to you
bun x github:ImBIOS/belifoa#canary my-issues

# Search issues by query and team
bun x github:ImBIOS/belifoa#canary search "auth bug" --team ENG

# Inspect issue details
bun x github:ImBIOS/belifoa#canary issue ENG-123

# Create issue with full metadata fields
bun x github:ImBIOS/belifoa#canary create --team ENG \
  --title "Implement Token Cache" \
  --description "Optimize context payload retention" \
  --priority 1 \
  --assignee "jane@example.com" \
  --project "Q3 Security" \
  --estimate 5 \
  --due-date "2026-08-15" \
  --labels "backend,security" \
  --state "In Progress"

# Update an existing issue and add a comment
bun x github:ImBIOS/belifoa#canary update ENG-123 --state "In Progress" --assignee me -c "Started working on fix"

# Close or resolve an issue
bun x github:ImBIOS/belifoa#canary close ENG-123 -c "Fixed in PR #42"

# List active team labels
bun x github:ImBIOS/belifoa#canary labels

# Bulk import issues from JSON file
bun x github:ImBIOS/belifoa#canary import --file tasks.json --team ENG
```

### 2. Global Terminal Linking

To make `belifoa` available globally in your PATH:

```bash
# Clone repository and link globally:
pnpm link --global # or bun link

# Verify global binary:
belifoa --version
belifoa my-issues
```

---

## 🛠️ MCP Server Integration

Belifoa runs natively as a Model Context Protocol (MCP) server for AI code editors and autonomous agent frameworks like **Cursor**, **Antigravity**, **OpenCode**, and **Claude Desktop**.

### MCP Server Configuration (`mcp_config.json` / `opencode.jsonc` / `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "belifoa": {
      "command": "bun",
      "args": ["x", "github:ImBIOS/belifoa#canary", "mcp"],
      "env": {
        "LINEAR_API_KEY": "lin_api_your_key_here"
      }
    }
  }
}
```

---

## 🛡️ Profile Resolution & Agent Isolation

To support concurrent AI agents operating across multiple projects and teams without profile conflicts, Belifoa enforces a strict precedence hierarchy when resolving workspace credentials:

1. **CLI / MCP Parameter**: `--profile <name>` flag or `profileName` tool argument.
2. **Environment Variable**: `BELIFOA_PROFILE` environment variable.
3. **Project-Local Config**: `.belifoarc.json` or `.belifoa` file in current working directory tree (`process.cwd()`).
4. **Global Config Fallback**: `activeProfile` defined in `~/.config/belifoa/config.json`.

---

## 🧩 Skills, Plugins & Git Hooks

- **Antigravity Skill**: Integrate [`skills/linear-agent/SKILL.md`](skills/linear-agent/SKILL.md) directly into your AI agent's skill directory for autonomous issue lookup and updates.
- **Git Commit Hooks**: Automate issue linking and status sync on git commits and branch pushes.

---

## 🧪 Testing & Benchmarks

Run unit tests and verification builds locally:

```bash
# Run unit tests
pnpm test

# Run build verification
pnpm run build

# Run benchmark suite
pnpm run benchmark
```

---

## 🏷️ Keywords & Search Tags

`linear` • `linear-api` • `mcp` • `mcp-server` • `model-context-protocol` • `ai-agent` • `agentic-ai` • `antigravity` • `token-optimization` • `context-window` • `cli` • `bun` • `typescript` • `linear-agent` • `developer-tools`

---

## 📄 License

MIT © [ImBIOS](https://github.com/ImBIOS)
