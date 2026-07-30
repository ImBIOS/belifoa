import type { LinearIssue, LinearTeam, LinearProject, OutputFormat } from "./types.js";

const PRIORITY_LABELS: Record<number, string> = {
  0: "None",
  1: "Urgent 🔴",
  2: "High 🟠",
  3: "Normal 🟡",
  4: "Low 🔵",
};

export function getPriorityLabel(priority: number): string {
  return PRIORITY_LABELS[priority] || "None";
}

/**
 * Clean raw GraphQL issue object into a normalized LinearIssue
 */
export function cleanRawIssue(node: any): LinearIssue {
  const priority = node.priority ?? 0;
  return {
    id: node.id,
    identifier: node.identifier,
    title: node.title,
    description: node.description ?? undefined,
    priority,
    priorityLabel: getPriorityLabel(priority),
    status: node.state?.name || node.status || "Unknown",
    teamKey: node.team?.key,
    assignee: node.assignee?.name || node.assignee?.email,
    project: node.project?.name,
    labels: node.labels?.nodes ? node.labels.nodes.map((l: any) => l.name) : (node.labels || []),
    url: node.url,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    comments: node.comments?.nodes
      ? node.comments.nodes.map((c: any) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt,
          user: c.user ? { id: c.user.id, name: c.user.name, email: c.user.email } : undefined,
        }))
      : undefined,
  };
}

/**
 * Format a list of issues into compact agent-friendly output
 */
export function formatIssueList(issues: LinearIssue[], format: OutputFormat = "markdown"): string {
  if (format === "raw_json") {
    return JSON.stringify(issues, null, 2);
  }

  if (format === "compact_json") {
    return JSON.stringify(
      issues.map((i) => ({
        id: i.identifier,
        title: i.title,
        status: i.status,
        priority: i.priorityLabel,
        assignee: i.assignee || undefined,
        labels: i.labels?.length ? i.labels : undefined,
      }))
    );
  }

  // Markdown format (Table)
  if (issues.length === 0) {
    return "No issues found.";
  }

  const rows = issues.map((i) => {
    const assigneeStr = i.assignee ? `@${i.assignee}` : "-";
    const labelsStr = i.labels && i.labels.length > 0 ? `\`${i.labels.join(",")}\`` : "-";
    return `| [${i.identifier}](${i.url || ""}) | ${i.title.replace(/\|/g, "\\|")} | **${i.status}** | ${i.priorityLabel} | ${assigneeStr} | ${labelsStr} |`;
  });

  return [
    `Found ${issues.length} issue(s):`,
    "",
    "| ID | Title | Status | Priority | Assignee | Labels |",
    "|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

/**
 * Format a detailed single issue view
 */
export function formatIssueDetail(issue: LinearIssue, format: OutputFormat = "markdown"): string {
  if (format === "raw_json") {
    return JSON.stringify(issue, null, 2);
  }

  if (format === "compact_json") {
    const clean: Record<string, any> = {
      id: issue.identifier,
      title: issue.title,
      status: issue.status,
      priority: issue.priorityLabel,
      team: issue.teamKey,
      assignee: issue.assignee,
      project: issue.project,
      labels: issue.labels,
      url: issue.url,
      description: issue.description,
    };
    if (issue.comments && issue.comments.length > 0) {
      clean.comments = issue.comments.map((c) => ({
        author: c.user?.name,
        body: c.body,
        date: c.createdAt,
      }));
    }
    // Remove undefined properties
    Object.keys(clean).forEach((key) => clean[key] === undefined && delete clean[key]);
    return JSON.stringify(clean);
  }

  // Markdown format (Detailed Card)
  const lines: string[] = [
    `# [${issue.identifier}] ${issue.title}`,
    "",
    `- **Status**: ${issue.status}`,
    `- **Priority**: ${issue.priorityLabel}`,
    `- **Assignee**: ${issue.assignee ? `@${issue.assignee}` : "Unassigned"}`,
    `- **Team**: ${issue.teamKey || "N/A"}`,
  ];

  if (issue.project) lines.push(`- **Project**: ${issue.project}`);
  if (issue.labels && issue.labels.length > 0) lines.push(`- **Labels**: ${issue.labels.join(", ")}`);
  if (issue.url) lines.push(`- **URL**: ${issue.url}`);

  if (issue.description) {
    lines.push("", "## Description", "", issue.description);
  }

  if (issue.comments && issue.comments.length > 0) {
    lines.push("", `## Comments (${issue.comments.length})`, "");
    issue.comments.forEach((c) => {
      const authorStr = c.user?.name ? `@${c.user.name}` : "User";
      lines.push(`> **${authorStr}** (${c.createdAt}):`, `> ${c.body.replace(/\n/g, "\n> ")}`, "");
    });
  }

  return lines.join("\n");
}

/**
 * Format teams list
 */
export function formatTeams(teams: LinearTeam[], format: OutputFormat = "markdown"): string {
  if (format === "raw_json") return JSON.stringify(teams, null, 2);
  if (format === "compact_json") return JSON.stringify(teams.map((t) => ({ key: t.key, name: t.name, id: t.id })));

  if (teams.length === 0) return "No teams found.";

  const rows = teams.map((t) => `| **${t.key}** | ${t.name} | \`${t.id}\` |`);
  return ["### Teams:", "", "| Key | Name | ID |", "|---|---|---|", ...rows].join("\n");
}

/**
 * Format projects list
 */
export function formatProjects(projects: LinearProject[], format: OutputFormat = "markdown"): string {
  if (format === "raw_json") return JSON.stringify(projects, null, 2);
  if (format === "compact_json")
    return JSON.stringify(
      projects.map((p) => ({ name: p.name, state: p.state, progress: p.progress ? `${Math.round(p.progress * 100)}%` : undefined }))
    );

  if (projects.length === 0) return "No projects found.";

  const rows = projects.map((p) => {
    const progStr = p.progress !== undefined ? `${Math.round(p.progress * 100)}%` : "N/A";
    return `| ${p.name} | ${p.state || "Active"} | ${progStr} |`;
  });
  return ["### Projects:", "", "| Name | State | Progress |", "|---|---|---|", ...rows].join("\n");
}
