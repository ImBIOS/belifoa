# 🤖 Belifoa AGENTS.md — Development & Architecture Guidelines

This document contains mandatory guidelines, architectural principles, and workflow standards for all AI agents working on the Belifoa codebase.

---

## 📌 Core Principles

### 1. Atomic Changes & Always Push
- **Atomic Commits**: Make small, focused, single-purpose code changes per commit. Never mix unrelated refactors, features, or formatting changes in one commit.
- **Always Commit & Push**: After making an atomic change and verifying tests/build (`pnpm test && pnpm run build`), immediately commit with a clear conventional commit message (`feat: ...`, `fix: ...`, `docs: ...`, `style: ...`) and push to GitHub (`git push origin canary`).
- **RELEASE EVERY SHIPPED CHANGE — MANDATORY**: Every bug fix or feature merged to `canary` MUST be released the same session, no exceptions. There is no "not releasing for a small fix" — `bun x github:ImBIOS/belifoa#canary` pulls the latest tag, so an unreleased fix is an unreachable fix. Complete release checklist in order:
  1. **Bump version** (patch for fixes, minor for features) in `package.json` AND `src/cli/index.ts` (`.version("x.y.z")` — both must match)
  2. **Verify**: `pnpm test && pnpm run build` (rebuilds `dist/`)
  3. Commit as `chore(release): bump version to x.y.z` and `git push origin canary`
  4. **Create annotated tag**: `git tag -a vx.y.z -m "release vx.y.z: <summary>" && git push origin vx.y.z`
  5. **Create GitHub Release**: `gh release create vx.y.z --title "vx.y.z" --notes "..."` (group changes under `## Features` / `## Fixes` / `## Tests` headings)
  6. **Post-Release Sanity Check**: `bun x github:ImBIOS/belifoa#vx.y.z --version` must print `x.y.z` from a clean temp dir. If it prints an older version, the committed `dist/` was stale — rebuild and re-release.
  7. **Never** skip the GitHub Release — a tag without a release means the tarball CDN cache for `bun x` is never busted and users keep getting the old build. Any release note placeholder is fine; only the release itself is non-negotiable.
- **Stale `bun x` cache = old build served (verified empirically, v0.7.2)**: If `bun x github:ImBIOS/belifoa#canary` (a moving ref) keeps resolving to an older commit than the remote `canary`/tag, bun is serving a stale build from cached artifacts. Clear ALL of these before re-running: `~/.bun/install/cache/@GH@ImBIOS-belifoa-*`, `~/.bun/install/cache/belifoa`, AND the persistent staging dirs `/tmp/bunx-*belifoa*` (the staging dirs are the one that actually bites — bun reuses them per URL+ref without re-resolving the branch). Explicit tags/commit SHAs (`#v0.7.2`, `#<sha>`) always resolve fresh, so a moving-ref sanity check is the one that needs the cache wipe.
- **`dist/` is the shipped artifact (verified empirically)**: `bun x github:ImBIOS/belifoa#<ref>` installs dependencies but does **NOT** run the repo's `prepare`/lifecycle scripts (bun 1.3.14, verified with a marker probe). Consumers execute the committed `dist/` verbatim, so a src edit without a `pnpm run build` + dist commit is an unreleased edit. Every release MUST rebuild `dist/` (step 2) and commit it (step 3).
- **Git Tags & GitHub Releases**: The rule above supersedes any doubt: version bump → tag → push → GitHub Release for every fix/feature.
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
