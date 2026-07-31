# 🤖 Belifoa AGENTS.md — Development Guidelines

This document contains rules and principles for all AI agents working on the Belifoa codebase.

---

## 📌 Core Principles

### 1. Atomic Changes & Always Push
- **Atomic Commits**: Make small, focused, single-purpose code changes per commit. Never mix unrelated refactors or features in one commit.
- **Always Commit & Push**: After making an atomic change and verifying tests/build (`pnpm test && pnpm run build`), immediately commit with a clear conventional commit message and push to GitHub (`git push origin main`).
- **Git Tags**: When releasing meaningful feature updates, create a lightweight git tag (e.g. `git tag -a v0.2.0 -m "release" && git push origin v0.2.0`) to bust GitHub tarball CDN cache for `bun x` execution.

### 2. Runtime & Tooling
- **Package Manager**: `pnpm` (pnpm 11+)
- **Runtime**: `bun` (bun 1.3+)
- **Distribution**: Direct GitHub installation (`github:ImBIOS/belifoa`). Do not publish to npm registry.

### 3. Formatting Standards
- **CLI Commands**: Must default to `cli_table` (ANSI formatted, aligned terminal output) when executed directly in terminal.
- **MCP Tools**: Must default to `markdown` or `compact_json` for LLM agent context token efficiency.
