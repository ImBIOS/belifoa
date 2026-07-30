# Belifoa Benchmark Results: Objective Agent Efficiency Analysis

This report compares context token consumption and payload size between the **Official Linear MCP (Raw GraphQL JSON)** and **Belifoa (Agent-Optimized Markdown & Compact JSON)** formats.

## Key Takeaways
- **Up to 88% Token Savings**: Converting raw Linear GraphQL issue search responses to Markdown tables reduces context tokens dramatically.
- **Improved Signal-to-Noise**: Eliminates GraphQL typing metadata (`__typename`), nested node wrappers, hex colors, and avatar URLs.
- **Zero Schema Confusion**: High-level Markdown cards provide LLMs with direct, natural language readability without requiring deep JSON path parsing.

---

## 📊 Benchmark Summary Table

| Scenario | Paradigm / Interface | Size (Bytes) | Est. Tokens | Token Reduction (%) |
|---|---|---|---|---|
| **Scenario 1: Issue Search** | Official Raw Linear MCP (JSON) | 6437 | ~1694 | **0% (Baseline)** |
| | Belifoa Compact JSON | 562 | ~147 | **91%** |
| | **Belifoa Markdown Table** | **764** | **~200** | **88%** |
| **Scenario 2: Issue Detail** | Official Raw Linear MCP (JSON) | 3369 | ~887 | **0% (Baseline)** |
| | Belifoa Compact JSON | 1317 | ~347 | **61%** |
| | **Belifoa Markdown Card** | **1279** | **~337** | **62%** |

---

## 🔍 Sample Comparison Outputs

### Scenario 1 Output Samples

#### A. Official Raw Linear MCP (JSON)
```json
{
  "data": {
    "issueSearch": {
      "nodes": [
        {
          "__typename": "Issue",
          "id": "e8b2b2b1-1234-4567-8901-abcdef123456",
          "identifier": "ENG-101",
          "title": "Fix authentication token refresh race condition under high concurrency",
          "description": "When multiple requests are executed simultaneously after token expiration, the token refresh logic triggers multiple parallel OAuth refresh token... [Truncated 5987 bytes]
```

#### B. Belifoa Markdown Table (Saved 88% Tokens)
```markdown
Found 3 issue(s):

| ID | Title | Status | Priority | Assignee | Labels |
|---|---|---|---|---|---|
| [ENG-101](https://linear.app/myorg/issue/ENG-101/fix-authentication-token-refresh-race-condition) | Fix authentication token refresh race condition under high concurrency | **In Progress** | Urgent 🔴 | @ImBIOS | `bug,security,high-priority` |
| [ENG-102](https://linear.app/myorg/issue/ENG-102/optimize-linear-mcp-output-payloads) | Optimize Linear MCP output payloads for AI Agent context efficiency | **Todo** | High 🟠 | @ImBIOS | `feature,ai-agent` |
| [ENG-103](https://linear.app/myorg/issue/ENG-103/add-support-for-long-lived-personal-api-key) | Add support for long-lived Personal API Key authentication | **Done** | Urgent 🔴 | @ImBIOS | `auth` |
```

---

### Scenario 2 Output Samples

#### A. Official Raw Linear MCP (JSON)
```json
{
  "data": {
    "issue": {
      "__typename": "Issue",
      "id": "f9c3c3c2-2345-5678-9012-bcdefa234567",
      "identifier": "ENG-102",
      "title": "Optimize Linear MCP output payloads for AI Agent context efficiency",
      "description": "### Context\nOfficial Linear MCP returns the raw GraphQL JSON response containing extensive metadata, schema typing (__typename), node arrays, and nested structures.\n\n### Problem\n1. High token cost ... [Truncated 2919 bytes]
```

#### B. Belifoa Markdown Card (Saved 62% Tokens)
```markdown
# [ENG-102] Optimize Linear MCP output payloads for AI Agent context efficiency

- **Status**: Todo
- **Priority**: High 🟠
- **Assignee**: @ImBIOS
- **Team**: ENG
- **Project**: Belifoa Development
- **Labels**: feature, ai-agent
- **URL**: https://linear.app/myorg/issue/ENG-102/optimize-linear-mcp-output-payloads

## Description

### Context
Official Linear MCP returns the raw GraphQL JSON response containing extensive metadata, schema typing (__typename), node arrays, and nested structures.

### Problem
1. High token cost per agent call (over 1,500 tokens for a basic issue query).
2. Cluttered context windows making it harder for LLMs to extract actionable info.
3. Excessive turns required when using separate fine-grained tools for search, detail, comment, and update.

### Proposed Solution
Create Belifoa with:
- Markdown card / table formatters
- Minimal JSON formatters
- Consolidated 'manage_issue' tool
- Benchmarking suite to measure token savings objectively.

## Comments (2)

> **@ImBIOS** (2026-07-30T08:00:00.000Z):
> Benchmarking initial test case shows ~75% token reduction when converting raw JSON to Markdown tables.

> **@Lead Dev** (2026-07-30T08:30:00.000Z):
> Great! Let's ensure Bun and pnpm support are included in the build scripts as well.

```

---

## 🎯 Paradigm & Architecture Recommendations

1. **Belifoa Skill (CLI Mode)**: Best for terminal-focused agents executing commands directly (`bunx github:ImBIOS/belifoa`). Avoids MCP server RPC overhead.
2. **Belifoa MCP Server**: Ideal for IDEs & MCP clients requiring stdio tools, configured to output **Markdown**.
3. **Consolidated Tools (`linear_manage_issue`)**: Reduces multi-step turn-taking by allowing creation, update, and commenting in a single invocation.
