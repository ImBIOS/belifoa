import { execSync } from "node:child_process";
import { BelifoaClient } from "../core/client.js";
import { formatIssueDetail } from "../core/formatters.js";

export function extractIssueIdentifier(str: string): string | null {
  const match = str.match(/\b([A-Z]{2,10}-\d+)\b/i);
  return match ? match[1].toUpperCase() : null;
}

export async function syncGitContextWithLinear(): Promise<string | null> {
  try {
    const branchName = execSync("git rev-parse --abbrev-ref HEAD 2>/dev/null", { encoding: "utf-8" }).trim();
    const issueId = extractIssueIdentifier(branchName);

    if (!issueId) {
      return null;
    }

    const client = new BelifoaClient();
    const issue = await client.getIssue(issueId);
    return formatIssueDetail(issue, "markdown");
  } catch {
    return null;
  }
}

if (import.meta.main) {
  syncGitContextWithLinear().then((output) => {
    if (textOutput(output)) {
      console.log("📌 Related Linear Issue Context:");
      console.log(output);
    }
  });
}

function textOutput(val: any): val is string {
  return typeof val === "string" && val.length > 0;
}
