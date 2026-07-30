# ⚡ Belifoa (Better Linear for Agent)

> **Belifoa** is an agent-first Linear toolkit designed to solve short authentication expirations, heavy JSON payload context bloat, and tool clutter when AI agents interact with Linear.

---

## 🌟 Why Belifoa?

Standard Linear MCP integrations often suffer from:
1. **Short-Lived Auth**: Frustrating OAuth session expirations interrupting autonomous agent loops.
2. **Heavy Payload Overhead**: Raw GraphQL API JSON responses return thousands of tokens of unnecessary metadata (`__typename`, node arrays, hex colors, avatar URLs).
3. **Tool Sprawl**: 30+ fine-grained tools causing LLM tool selection confusion and multi-turn delays.

**Belifoa solves this with:**
- **Persistent Auth**: Linear Personal API Keys (`lin_api_...`) that never expire unless revoked.
- **70–80% Context Token Savings**: Beautiful, compact Markdown tables & cards or minified JSON.
- **Unified Interfaces**: Available as a **CLI** (`bunx github:ImBIOS/belifoa`), **MCP Server**, **Antigravity Skill**, **Plugin**, and **Git Hook**.
- **Objective Benchmarking Suite**: Automated tests verifying token footprint reduction.

---

## 🚀 Quick Start & Usage

### 1. Installation & Direct Usage (Without publishing to npm)

Users and AI agents can execute Belifoa directly from GitHub using `pnpm`, `pnpx`, or `bunx`:

```bash
# Set long-lived Linear API key
bunx github:ImBIOS/belifoa auth set <lin_api_...>

# Check auth status
bunx github:ImBIOS/belifoa auth status

# List my assigned issues
bunx github:ImBIOS/belifoa my-issues

# Search issues
bunx github:ImBIOS/belifoa search "auth bug" --team ENG

# Get detailed issue view
bunx github:ImBIOS/belifoa issue ENG-123

# Create an issue
bunx github:ImBIOS/belifoa create --team ENG --title "Fix token race condition" --priority 1
```

Or install locally in your project using `pnpm`:

```bash
pnpm add github:ImBIOS/belifoa
```

---

## 🛠️ Interface Options

### A. MCP Server Setup
Add Belifoa to your MCP client configuration (e.g. `antigravity`, `claude_desktop_config.json`, or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "belifoa": {
      "command": "bunx",
      "args": ["github:ImBIOS/belifoa", "mcp"],
      "env": {
        "LINEAR_API_KEY": "lin_api_your_key_here"
      }
    }
  }
}
```

### B. Antigravity Skill
Include [`skills/linear-agent/SKILL.md`](skills/linear-agent/SKILL.md) in your skills directory.

### C. Antigravity Plugin
Register the plugin using [`plugin/plugin.json`](plugin/plugin.json).

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
| **Issue Search** | Official Raw Linear MCP (JSON) | 3,120 B | ~821 | **0% (Baseline)** |
| | Belifoa Compact JSON | 385 B | ~102 | **53%** |
| | **Belifoa Markdown Table** | **684 B** | **~180** | **78%** |
| **Issue Detail** | Official Raw Linear MCP (JSON) | 2,890 B | ~761 | **0% (Baseline)** |
| | Belifoa Compact JSON | 620 B | ~164 | **52%** |
| | **Belifoa Markdown Card** | **1,020 B** | **~269** | **65%** |

---

## 🧪 Testing & Development

```bash
# Install dependencies
pnpm install

# Run unit tests with Bun
pnpm test

# Build project with Bun
pnpm run build

# Run benchmark suite
pnpm run benchmark
```

---

## 📄 License
MIT © [ImBIOS](https://github.com/ImBIOS)
