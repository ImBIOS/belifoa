import type { LinearIssue, LinearTeam, LinearProject, OutputFormat, AuthProfile } from "./types.js";

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

function pad(str: string, length: number): string {
  return (str + " ".repeat(length)).substring(0, length);
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
    estimate: node.estimate ?? undefined,
    dueDate: node.dueDate ?? undefined,
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
 * Format a list of issues into compact agent or clean CLI terminal output
 */
export function formatIssueList(issues: LinearIssue[], format: OutputFormat = "cli_table"): string {
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

  if (issues.length === 0) {
    return "No issues found.";
  }

  if (format === "markdown") {
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

  // CLI Terminal Table Format
  const rows = issues.map((i) => ({
    id: i.identifier,
    title: i.title.length > 55 ? i.title.substring(0, 52) + "..." : i.title,
    status: i.status,
    priority: i.priorityLabel || "None",
    assignee: i.assignee ? `@${i.assignee}` : "-",
    labels: i.labels && i.labels.length > 0 ? i.labels.join(",") : "-",
  }));

  const maxId = Math.max(7, ...rows.map((r) => r.id.length));
  const maxTitle = Math.max(25, ...rows.map((r) => r.title.length));
  const maxStatus = Math.max(10, ...rows.map((r) => r.status.length));
  const maxPriority = Math.max(10, ...rows.map((r) => r.priority.length));
  const maxAssignee = Math.max(10, ...rows.map((r) => r.assignee.length));

  const header = `  ${pad("ID", maxId)}  ${pad("TITLE", maxTitle)}  ${pad("STATUS", maxStatus)}  ${pad("PRIORITY", maxPriority)}  ${pad("ASSIGNEE", maxAssignee)}`;
  const divider = `  ${"─".repeat(maxId)}  ${"─".repeat(maxTitle)}  ${"─".repeat(maxStatus)}  ${"─".repeat(maxPriority)}  ${"─".repeat(maxAssignee)}`;

  const body = rows.map(
    (r) => `  \x1b[1m\x1b[36m${pad(r.id, maxId)}\x1b[0m  ${pad(r.title, maxTitle)}  \x1b[32m${pad(r.status, maxStatus)}\x1b[0m  ${pad(r.priority, maxPriority)}  ${pad(r.assignee, maxAssignee)}`
  );

  return [
    `\x1b[1mFound ${issues.length} issue(s):\x1b[0m`,
    "",
    `\x1b[1m${header}\x1b[0m`,
    `\x1b[2m${divider}\x1b[0m`,
    ...body,
  ].join("\n");
}

/**
 * Format a detailed single issue view
 */
export function formatIssueDetail(issue: LinearIssue, format: OutputFormat = "cli_table"): string {
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
      estimate: issue.estimate,
      dueDate: issue.dueDate,
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
    Object.keys(clean).forEach((key) => clean[key] === undefined && delete clean[key]);
    return JSON.stringify(clean);
  }

  if (format === "markdown") {
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
    if (issue.estimate !== undefined) lines.push(`- **Estimate**: ${issue.estimate} pts`);
    if (issue.dueDate) lines.push(`- **Due Date**: ${issue.dueDate}`);
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

  // CLI Terminal Card View
  const lines: string[] = [
    `\x1b[1m\x1b[36m[${issue.identifier}]\x1b[0m \x1b[1m${issue.title}\x1b[0m`,
    `\x1b[2m${"─".repeat(60)}\x1b[0m`,
    `  \x1b[1mStatus\x1b[0m:    \x1b[32m${issue.status}\x1b[0m`,
    `  \x1b[1mPriority\x1b[0m:  ${issue.priorityLabel}`,
    `  \x1b[1mAssignee\x1b[0m:  ${issue.assignee ? `@${issue.assignee}` : "Unassigned"}`,
    `  \x1b[1mTeam\x1b[0m:      ${issue.teamKey || "N/A"}`,
  ];

  if (issue.project) lines.push(`  \x1b[1mProject\x1b[0m:   ${issue.project}`);
  if (issue.labels && issue.labels.length > 0) lines.push(`  \x1b[1mLabels\x1b[0m:    ${issue.labels.join(", ")}`);
  if (issue.estimate !== undefined) lines.push(`  \x1b[1mEstimate\x1b[0m:  ${issue.estimate} pts`);
  if (issue.dueDate) lines.push(`  \x1b[1mDue Date\x1b[0m:  ${issue.dueDate}`);
  if (issue.url) lines.push(`  \x1b[1mURL\x1b[0m:       \x1b[4m${issue.url}\x1b[0m`);

  if (issue.description) {
    lines.push("", `\x1b[1mDescription:\x1b[0m`, issue.description);
  }

  if (issue.comments && issue.comments.length > 0) {
    lines.push("", `\x1b[1mComments (${issue.comments.length}):\x1b[0m`);
    issue.comments.forEach((c) => {
      const authorStr = c.user?.name ? `@${c.user.name}` : "User";
      lines.push(`  💬 \x1b[1m${authorStr}\x1b[0m \x1b[2m(${c.createdAt})\x1b[0m`, `     ${c.body.replace(/\n/g, "\n     ")}`);
    });
  }

  return lines.join("\n");
}

/**
 * Format teams list
 */
export function formatTeams(teams: LinearTeam[], format: OutputFormat = "cli_table"): string {
  if (format === "raw_json") return JSON.stringify(teams, null, 2);
  if (format === "compact_json") return JSON.stringify(teams.map((t) => ({ key: t.key, name: t.name, id: t.id })));
  if (teams.length === 0) return "No teams found.";

  if (format === "markdown") {
    const rows = teams.map((t) => `| **${t.key}** | ${t.name} | \`${t.id}\` |`);
    return ["### Teams:", "", "| Key | Name | ID |", "|---|---|---|", ...rows].join("\n");
  }

  // CLI Terminal Table Format
  const maxKey = Math.max(6, ...teams.map((t) => t.key.length));
  const maxName = Math.max(20, ...teams.map((t) => t.name.length));
  const maxId = Math.max(10, ...teams.map((t) => t.id.length));

  const header = `  ${pad("KEY", maxKey)}  ${pad("NAME", maxName)}  ${pad("ID", maxId)}`;
  const divider = `  ${"─".repeat(maxKey)}  ${"─".repeat(maxName)}  ${"─".repeat(maxId)}`;

  const body = teams.map((t) => `  \x1b[1m\x1b[36m${pad(t.key, maxKey)}\x1b[0m  ${pad(t.name, maxName)}  \x1b[2m${pad(t.id, maxId)}\x1b[0m`);

  return [
    `\x1b[1m👥 Linear Teams:\x1b[0m`,
    "",
    `\x1b[1m${header}\x1b[0m`,
    `\x1b[2m${divider}\x1b[0m`,
    ...body,
  ].join("\n");
}

/**
 * Format projects list
 */
export function formatProjects(projects: LinearProject[], format: OutputFormat = "cli_table"): string {
  if (format === "raw_json") return JSON.stringify(projects, null, 2);
  if (format === "compact_json")
    return JSON.stringify(
      projects.map((p) => ({ name: p.name, state: p.state, progress: p.progress ? `${Math.round(p.progress * 100)}%` : undefined }))
    );

  if (projects.length === 0) return "No projects found.";

  if (format === "markdown") {
    const rows = projects.map((p) => {
      const progStr = p.progress !== undefined ? `${Math.round(p.progress * 100)}%` : "N/A";
      return `| ${p.name} | ${p.state || "Active"} | ${progStr} |`;
    });
    return ["### Projects:", "", "| Name | State | Progress |", "|---|---|---|", ...rows].join("\n");
  }

  // CLI Terminal Table Format
  const rows = projects.map((p) => ({
    name: p.name,
    state: p.state || "Active",
    progress: p.progress !== undefined ? `${Math.round(p.progress * 100)}%` : "N/A",
  }));

  const maxName = Math.max(25, ...rows.map((r) => r.name.length));
  const maxState = Math.max(10, ...rows.map((r) => r.state.length));
  const maxProg = Math.max(10, ...rows.map((r) => r.progress.length));

  const header = `  ${pad("PROJECT NAME", maxName)}  ${pad("STATE", maxState)}  ${pad("PROGRESS", maxProg)}`;
  const divider = `  ${"─".repeat(maxName)}  ${"─".repeat(maxState)}  ${"─".repeat(maxProg)}`;

  const body = rows.map((r) => `  \x1b[1m${pad(r.name, maxName)}\x1b[0m  \x1b[32m${pad(r.state, maxState)}\x1b[0m  ${pad(r.progress, maxProg)}`);

  return [
    `\x1b[1m📁 Linear Projects:\x1b[0m`,
    "",
    `\x1b[1m${header}\x1b[0m`,
    `\x1b[2m${divider}\x1b[0m`,
    ...body,
  ].join("\n");
}

/**
 * Format list of saved authentication profiles & workspaces
 */
export function formatProfiles(
  profiles: Array<{ profile: AuthProfile; isActive: boolean }>,
  format: OutputFormat = "cli_table"
): string {
  if (format === "raw_json") return JSON.stringify(profiles, null, 2);
  if (format === "compact_json") {
    return JSON.stringify(
      profiles.map(({ profile, isActive }) => ({
        profile: profile.name,
        org: profile.organization?.name || "N/A",
        active: isActive,
        teams: profile.teams?.map((t) => t.key) || ["ALL"],
        defaultTeam: profile.defaultTeam || "N/A",
      }))
    );
  }

  if (profiles.length === 0) return "❌ No authentication profiles saved.";

  if (format === "markdown") {
    const rows = profiles.map(({ profile, isActive }) => {
      const activeMarker = isActive ? "✅ **Active**" : "-";
      const orgStr = profile.organization?.name ? `${profile.organization.name} (\`${profile.organization.urlKey}\`)` : "N/A";
      const teamsStr = profile.teams && profile.teams.length > 0 ? profile.teams.map((t) => `\`${t.key}\``).join(", ") : "All Teams";
      const keyMasked = profile.apiKey ? `${profile.apiKey.substring(0, 11)}...` : "N/A";
      return `| **${profile.name}** | ${orgStr} | ${teamsStr} | \`${profile.defaultTeam || "None"}\` | \`${keyMasked}\` | ${activeMarker} |`;
    });

    return [
      "### 🔐 Saved Linear Authentication Profiles (Workspaces):",
      "",
      "| Profile | Workspace / Org | Accessible Teams | Default Team | API Key | Status |",
      "|---|---|---|---|---|---|",
      ...rows,
    ].join("\n");
  }

  // CLI Terminal Table Format
  const rows = profiles.map(({ profile, isActive }) => {
    const status = isActive ? "✅ Active" : "   -   ";
    const name = profile.name;
    const org = profile.organization?.name ? `${profile.organization.name} (${profile.organization.urlKey})` : "N/A";
    const teamsStr = profile.teams && profile.teams.length > 0 ? profile.teams.map((t) => t.key).join(", ") : "All Teams";
    const team = profile.defaultTeam || "None";
    const key = profile.apiKey ? `${profile.apiKey.substring(0, 11)}...` : "N/A";
    return { status, name, org, teamsStr, team, key, isActive };
  });

  const maxStatus = Math.max(8, ...rows.map((r) => r.status.length));
  const maxName = Math.max(10, ...rows.map((r) => r.name.length));
  const maxOrg = Math.max(22, ...rows.map((r) => r.org.length));
  const maxTeams = Math.max(18, ...rows.map((r) => r.teamsStr.length));
  const maxTeam = Math.max(12, ...rows.map((r) => r.team.length));
  const maxKey = Math.max(13, ...rows.map((r) => r.key.length));

  const header = `  ${pad("STATUS", maxStatus)}  ${pad("PROFILE", maxName)}  ${pad("WORKSPACE / ORGANIZATION", maxOrg)}  ${pad("ACCESSIBLE TEAMS", maxTeams)}  ${pad("DEFAULT TEAM", maxTeam)}  ${pad("API KEY", maxKey)}`;
  const divider = `  ${"─".repeat(maxStatus)}  ${"─".repeat(maxName)}  ${"─".repeat(maxOrg)}  ${"─".repeat(maxTeams)}  ${"─".repeat(maxTeam)}  ${"─".repeat(maxKey)}`;

  const body = rows.map((r) => {
    const rowStr = `  ${pad(r.status, maxStatus)}  ${pad(r.name, maxName)}  ${pad(r.org, maxOrg)}  ${pad(r.teamsStr, maxTeams)}  ${pad(r.team, maxTeam)}  ${pad(r.key, maxKey)}`;
    return r.isActive ? `\x1b[1m\x1b[32m${rowStr}\x1b[0m` : rowStr;
  });

  return [
    "\x1b[1m\x1b[36m🔐 Saved Linear Authentication Profiles (Workspaces):\x1b[0m",
    "",
    `\x1b[1m${header}\x1b[0m`,
    `\x1b[2m${divider}\x1b[0m`,
    ...body,
    "",
  ].join("\n");
}
