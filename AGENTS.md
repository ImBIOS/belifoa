# 🤖 Belifoa AGENTS.md — Development & Architecture Guidelines

This document contains mandatory guidelines, architectural principles, and workflow standards for all AI agents working on the Belifoa codebase.

---

## 📌 Core Principles

### 1. Atomic Changes & Always Push
- **Atomic Commits**: Make small, focused, single-purpose code changes per commit. Never mix unrelated refactors, features, or formatting changes in one commit.
- **Always Commit & Push**: After making an atomic change and verifying tests/build (`pnpm test && pnpm run build`), immediately commit with a clear conventional commit message (`feat: ...`, `fix: ...`, `docs: ...`, `style: ...`) and push to GitHub (`git push origin canary`).
- **Git Tags for Release**: When releasing feature updates or bug fixes, bump version in `package.json` & `src/cli/index.ts`, rebuild `dist/`, create a lightweight git tag (e.g. `git tag -a v0.2.3 -m "release" && git push origin v0.2.3`), and push tags. This busts GitHub tarball CDN caches for `bun x` execution.

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
