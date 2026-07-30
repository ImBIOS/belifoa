import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  RAW_LINEAR_SEARCH_RESPONSE,
  RAW_LINEAR_ISSUE_DETAIL_RESPONSE,
} from "./mock-data.js";
import {
  cleanRawIssue,
  formatIssueList,
  formatIssueDetail,
} from "../src/core/formatters.js";

interface Metric {
  bytes: number;
  tokens: number;
  reductionPercent: number;
}

function estimateTokens(text: string): number {
  // Rough token estimation: ~3.8 characters per token for JSON/Markdown text
  return Math.ceil(text.length / 3.8);
}

function calculateMetric(text: string, baselineTokens: number): Metric {
  const bytes = Buffer.byteLength(text, "utf-8");
  const tokens = estimateTokens(text);
  const reductionPercent = baselineTokens > 0
    ? Math.round(((baselineTokens - tokens) / baselineTokens) * 100)
    : 0;
  return { bytes, tokens, reductionPercent };
}

export function runBenchmark() {
  console.log("=================================================");
  console.log("🚀 BELIFOA OBJECTIVE BENCHMARKING SUITE");
  console.log("Testing Context & Token Efficiency across Paradigms");
  console.log("=================================================\n");

  // --- Scenario 1: Issue Search (3 Issues) ---
  const searchRawJson = JSON.stringify(RAW_LINEAR_SEARCH_RESPONSE, null, 2);
  const searchBaselineTokens = estimateTokens(searchRawJson);
  const searchBaselineMetric = calculateMetric(searchRawJson, searchBaselineTokens);

  const searchCleaned = RAW_LINEAR_SEARCH_RESPONSE.data.issueSearch.nodes.map(cleanRawIssue);
  const searchMarkdown = formatIssueList(searchCleaned, "markdown");
  const searchMarkdownMetric = calculateMetric(searchMarkdown, searchBaselineTokens);

  const searchCompactJson = formatIssueList(searchCleaned, "compact_json");
  const searchCompactJsonMetric = calculateMetric(searchCompactJson, searchBaselineTokens);

  // --- Scenario 2: Issue Detail with Comments (ENG-102) ---
  const detailRawJson = JSON.stringify(RAW_LINEAR_ISSUE_DETAIL_RESPONSE, null, 2);
  const detailBaselineTokens = estimateTokens(detailRawJson);
  const detailBaselineMetric = calculateMetric(detailRawJson, detailBaselineTokens);

  const detailCleaned = cleanRawIssue(RAW_LINEAR_ISSUE_DETAIL_RESPONSE.data.issue);
  const detailMarkdown = formatIssueDetail(detailCleaned, "markdown");
  const detailMarkdownMetric = calculateMetric(detailMarkdown, detailBaselineTokens);

  const detailCompactJson = formatIssueDetail(detailCleaned, "compact_json");
  const detailCompactJsonMetric = calculateMetric(detailCompactJson, detailBaselineTokens);

  // --- Report Generation ---
  console.log("📊 SCENARIO 1: ISSUE SEARCH RESULTS (3 Nodes)");
  console.log(`- Official Raw Linear MCP (JSON):    ${searchBaselineMetric.bytes} bytes | ~${searchBaselineMetric.tokens} tokens (Baseline)`);
  console.log(`- Belifoa Compact JSON:              ${searchCompactJsonMetric.bytes} bytes | ~${searchCompactJsonMetric.tokens} tokens (${searchCompactJsonMetric.reductionPercent}% saved)`);
  console.log(`- Belifoa Markdown Table:            ${searchMarkdownMetric.bytes} bytes | ~${searchMarkdownMetric.tokens} tokens (${searchMarkdownMetric.reductionPercent}% saved)`);
  console.log("");

  console.log("📊 SCENARIO 2: ISSUE DETAIL & COMMENTS (ENG-102)");
  console.log(`- Official Raw Linear MCP (JSON):    ${detailBaselineMetric.bytes} bytes | ~${detailBaselineMetric.tokens} tokens (Baseline)`);
  console.log(`- Belifoa Compact JSON:              ${detailCompactJsonMetric.bytes} bytes | ~${detailCompactJsonMetric.tokens} tokens (${detailCompactJsonMetric.reductionPercent}% saved)`);
  console.log(`- Belifoa Markdown Card:             ${detailMarkdownMetric.bytes} bytes | ~${detailMarkdownMetric.tokens} tokens (${detailMarkdownMetric.reductionPercent}% saved)`);
  console.log("");

  // Create Markdown Artifact
  const artifactContent = `# Belifoa Benchmark Results: Objective Agent Efficiency Analysis

This report compares context token consumption and payload size between the **Official Linear MCP (Raw GraphQL JSON)** and **Belifoa (Agent-Optimized Markdown & Compact JSON)** formats.

## Key Takeaways
- **Up to ${searchMarkdownMetric.reductionPercent}% Token Savings**: Converting raw Linear GraphQL issue search responses to Markdown tables reduces context tokens dramatically.
- **Improved Signal-to-Noise**: Eliminates GraphQL typing metadata (\`__typename\`), nested node wrappers, hex colors, and avatar URLs.
- **Zero Schema Confusion**: High-level Markdown cards provide LLMs with direct, natural language readability without requiring deep JSON path parsing.

---

## 📊 Benchmark Summary Table

| Scenario | Paradigm / Interface | Size (Bytes) | Est. Tokens | Token Reduction (%) |
|---|---|---|---|---|
| **Scenario 1: Issue Search** | Official Raw Linear MCP (JSON) | ${searchBaselineMetric.bytes} | ~${searchBaselineMetric.tokens} | **0% (Baseline)** |
| | Belifoa Compact JSON | ${searchCompactJsonMetric.bytes} | ~${searchCompactJsonMetric.tokens} | **${searchCompactJsonMetric.reductionPercent}%** |
| | **Belifoa Markdown Table** | **${searchMarkdownMetric.bytes}** | **~${searchMarkdownMetric.tokens}** | **${searchMarkdownMetric.reductionPercent}%** |
| **Scenario 2: Issue Detail** | Official Raw Linear MCP (JSON) | ${detailBaselineMetric.bytes} | ~${detailBaselineMetric.tokens} | **0% (Baseline)** |
| | Belifoa Compact JSON | ${detailCompactJsonMetric.bytes} | ~${detailCompactJsonMetric.tokens} | **${detailCompactJsonMetric.reductionPercent}%** |
| | **Belifoa Markdown Card** | **${detailMarkdownMetric.bytes}** | **~${detailMarkdownMetric.tokens}** | **${detailMarkdownMetric.reductionPercent}%** |

---

## 🔍 Sample Comparison Outputs

### Scenario 1 Output Samples

#### A. Official Raw Linear MCP (JSON)
\`\`\`json
${searchRawJson.substring(0, 450)}... [Truncated ${searchRawJson.length - 450} bytes]
\`\`\`

#### B. Belifoa Markdown Table (Saved ${searchMarkdownMetric.reductionPercent}% Tokens)
\`\`\`markdown
${searchMarkdown}
\`\`\`

---

### Scenario 2 Output Samples

#### A. Official Raw Linear MCP (JSON)
\`\`\`json
${detailRawJson.substring(0, 450)}... [Truncated ${detailRawJson.length - 450} bytes]
\`\`\`

#### B. Belifoa Markdown Card (Saved ${detailMarkdownMetric.reductionPercent}% Tokens)
\`\`\`markdown
${detailMarkdown}
\`\`\`

---

## 🎯 Paradigm & Architecture Recommendations

1. **Belifoa Skill (CLI Mode)**: Best for terminal-focused agents executing commands directly (\`bunx github:ImBIOS/belifoa\`). Avoids MCP server RPC overhead.
2. **Belifoa MCP Server**: Ideal for IDEs & MCP clients requiring stdio tools, configured to output **Markdown**.
3. **Consolidated Tools (\`linear_manage_issue\`)**: Reduces multi-step turn-taking by allowing creation, update, and commenting in a single invocation.
`;

  // Write artifact report
  const brainDir = "/home/imbios/.gemini/antigravity/brain/1ee22182-c096-4e0c-8f57-7ef1ccf9a5a8";
  if (existsSync(brainDir)) {
    const reportPath = join(brainDir, "benchmark_results.md");
    writeFileSync(reportPath, artifactContent, "utf-8");
    console.log(`✅ Saved benchmark report artifact to: ${reportPath}`);
  }

  // Also save local benchmark summary in repository
  const localReportPath = join(process.cwd(), "BENCHMARK_RESULTS.md");
  writeFileSync(localReportPath, artifactContent, "utf-8");
  console.log(`✅ Saved local benchmark report to: ${localReportPath}\n`);
}

if (import.meta.main) {
  runBenchmark();
}
