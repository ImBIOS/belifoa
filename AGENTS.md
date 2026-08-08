# 🤖 Belifoa AGENTS.md — Development & Architecture Guidelines

This document contains mandatory guidelines, architectural principles, and workflow standards for all AI agents working on the Belifoa codebase.

---

## 📌 Core Principles

### 1. Atomic Changes & Always Push
- **Atomic Commits**: Make small, focused, single-purpose code changes per commit. Never mix unrelated refactors, features, or formatting changes in one commit.
- **Always Commit & Push**: After making an atomic change and verifying tests/build (`pnpm test && pnpm run build`), immediately commit with a clear conventional commit message (`feat: ...`, `fix: ...`, `docs: ...`, `style: ...`) and push to GitHub (`git push origin canary`).
- **Git Tags & GitHub Releases**: When releasing feature updates or bug fixes, bump version in `package.json` & `src/cli/index.ts`, rebuild `dist/`, create a lightweight git tag (e.g. `git tag -a v0.5.1 -m "release" && git push origin v0.5.1`), push tags (`git push origin --tags`), AND create a GitHub Release using `gh release create v0.5.1 --title "v0.5.1" --notes "..."` so that releases exist on GitHub and bust tarball CDN caches for `bun x` execution.
- **Keep Agent Skills & Documentation Up-To-Date**: Whenever adding or modifying CLI commands, MCP tools, flags, or configuration behavior, ALWAYS update `skills/linear-agent/SKILL.md` (and `.agents/skills/linear-agent/SKILL.md` if present) and `README.md` so that LLM agents reading the skill instructions always have accurate and complete capability context.

### 2. Runtime & Tooling
- **Package Manager**: `pnpm` (pnpm 11+)
- **Runtime**: `bun` (bun 1.3+)
- **Distribution**: Direct GitHub installation (`github:ImBIOS/belifoa`). Do NOT publish to npm registry.

---

## 🛡️ Profile Resolution & Parallel Agent Isolation

Belifoa must support concurrent execution across multiple AI agents in different projects without profile conflicts or state leakage. When resolving workspace profile and team, always adhere to this **strict precedence hierarchy**:

1. **Explicit Parameter**: `--profile <name>` (CLI flag) or `profileName` (MCP tool parameter)
2. **Environment Variable**: `BELIFOA_PROFILE` (e.g. set in `.mcp.json` / `opencode.jsonc` `env` object)
3. **Project-Local Config**: `.belifoarc.json` or `.belifoa` file in current working directory tree (`process.cwd()`)
4. **Global Fallback**: `activeProfile` in `~/.config/belifoa/config.json`

---

## 🎨 Formatting Standards

- **CLI Commands**: Must default to `cli_table` (ANSI formatted, aligned terminal output with bold headers, status highlights, and zero raw Markdown pipe clutter).
- **MCP Tools**: Must default to `markdown` or `compact_json` for LLM agent token context efficiency.

---

## 🧪 Testing Standards

- **Isolated Test Config**: Unit tests in `tests/` MUST set `process.env.BELIFOA_CONFIG_DIR = "/tmp/..."` before running tests so that `pnpm test` NEVER overwrites or corrupts real user API keys in `~/.config/belifoa/config.json`.
- **Pre-Push Verification**: Always run `pnpm test && pnpm run build` before committing or tagging a release.


## 📋 Task Tracking & Linear Management with Belifoa

All tasks, bugs, features, and refactoring efforts must be tracked as Linear issues using **Belifoa** (`github:ImBIOS/belifoa#canary`).

### How to Use Belifoa (CLI & Skill)

Agents can query, create, search, and update Linear issues directly in the terminal or via MCP tools:

```bash
# Check auth status and active workspace profile
bun x github:ImBIOS/belifoa#canary auth status

# List my assigned issues
bun x github:ImBIOS/belifoa#canary my-issues

# Search issues for a specific topic or team
bun x github:ImBIOS/belifoa#canary search "<query>"

# Get detailed view of an issue
bun x github:ImBIOS/belifoa#canary issue <ISSUE-ID>

# Create a new issue
bun x github:ImBIOS/belifoa#canary create --title "<Title>" --description "<Details>" --priority 1
```

### Belifoa Skill Location
The Linear Agent skill instructions are available in `.agents/skills/linear-agent/SKILL.md` or `skills/linear-agent/SKILL.md`.
