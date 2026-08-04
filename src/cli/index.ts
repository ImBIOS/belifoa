#!/usr/bin/env bun
import { Command } from "commander";
import { BelifoaClient } from "../core/client.js";
import {
  loadConfig,
  addProfile,
  switchProfile,
  listProfiles,
  removeProfile,
  getActiveProfile,
  switchDefaultTeam,
  saveProjectConfig,
} from "../core/config.js";
import {
  formatIssueList,
  formatIssueDetail,
  formatTeams,
  formatProjects,
  formatProfiles,
  formatLabels,
  cleanRawIssue,
  generateGitBranchName,
} from "../core/formatters.js";
import type { OutputFormat } from "../core/types.js";
import { readFileSync } from "node:fs";

const program = new Command();

program
  .name("belifoa")
  .description("Better Linear for Agent - Compact, Multi-Auth, Workspace & Team Switching Linear CLI")
  .version("0.4.0");

// Init command to create project-local config
program
  .command("init <profile>")
  .description("Initialize project-local .belifoarc.json bound to a specific workspace profile")
  .option("-t, --team <team>", "Default team key for this project")
  .option("-a, --assignee <user>", "Default assignee for issue creation (e.g. 'me')")
  .action((profileName: string, options) => {
    try {
      saveProjectConfig(process.cwd(), {
        profile: profileName,
        team: options.team?.toUpperCase(),
        defaultAssignee: options.assignee,
      });
      console.log(`✅ Created project-local .belifoarc.json bound to profile '${profileName}'`);
      if (options.team) console.log(`   Default Team: ${options.team.toUpperCase()}`);
      if (options.assignee) console.log(`   Default Assignee: ${options.assignee}`);
    } catch (err: any) {
      console.error(`❌ Error initializing project config: ${err.message}`);
      process.exit(1);
    }
  });

// Auth command group
const authCmd = program.command("auth").description("Manage multi-workspace Linear authentication profiles");

authCmd
  .command("add <profile> <key>")
  .description("Add or update a Linear authentication profile with API key")
  .option("-t, --team <team>", "Default team key for this profile (e.g. ENG)")
  .action(async (profileName: string, key: string, options) => {
    try {
      const client = new BelifoaClient(key);
      const org = await client.getOrganization();
      const me = await client.getMe();
      const teams = await client.getTeams().catch(() => []);

      const profile = addProfile(
        profileName,
        key,
        org,
        options.team,
        teams.map((t) => ({ key: t.key, name: t.name }))
      );
      console.log(`✅ Saved profile '${profile.name}' for workspace '${org.name}' (${org.urlKey})`);
      console.log(`   Authenticated as: ${me.name} (${me.email || me.id})`);
      if (teams.length > 0) {
        console.log(`   Accessible Teams (${teams.length}): ${teams.map((t) => `${t.name} [${t.key}]`).join(", ")}`);
      }
      if (options.team) console.log(`   Default Team set to: ${options.team.toUpperCase()}`);
    } catch (err: any) {
      console.error(`❌ Failed to verify & add key: ${err.message}`);
      process.exit(1);
    }
  });

authCmd
  .command("set <key>")
  .description("Set default profile Linear API Key")
  .action(async (key: string) => {
    try {
      const client = new BelifoaClient(key);
      const org = await client.getOrganization();
      addProfile("default", key, org);
      console.log(`✅ Default Linear API key saved for workspace '${org.name}'`);
    } catch (err: any) {
      console.error(`❌ Failed to verify key: ${err.message}`);
      process.exit(1);
    }
  });

authCmd
  .command("list")
  .description("List all saved authentication profiles and workspaces")
  .option("-f, --format <format>", "Output format (cli_table|markdown|compact_json|raw_json)", "cli_table")
  .action((options) => {
    const profiles = listProfiles();
    console.log(formatProfiles(profiles, options.format as OutputFormat));
  });

authCmd
  .command("switch <profile>")
  .description("Switch active authentication profile / workspace")
  .action((profileName: string) => {
    try {
      const profile = switchProfile(profileName);
      console.log(`✅ Switched active workspace profile to: '${profile.name}' (${profile.organization?.name || "N/A"})`);
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
      process.exit(1);
    }
  });

authCmd
  .command("remove <profile>")
  .description("Remove a saved authentication profile")
  .action((profileName: string) => {
    try {
      removeProfile(profileName);
      console.log(`✅ Removed profile '${profileName}'.`);
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
      process.exit(1);
    }
  });

authCmd
  .command("status")
  .description("Check current active profile and workspace auth status")
  .option("-p, --profile <profile>", "Target workspace profile")
  .action(async (options) => {
    const active = getActiveProfile(options.profile);
    if (!active) {
      console.log("❌ No active API profile configured. Run `belifoa auth add <profile> <key>` or set LINEAR_API_KEY.");
      process.exit(1);
    }
    try {
      const client = new BelifoaClient(undefined, options.profile);
      const me = await client.getMe();
      const org = await client.getOrganization();
      console.log(`✅ Active Profile: '${active.name}'`);
      console.log(`   Workspace: ${org.name} (${org.urlKey})`);
      console.log(`   User: ${me.name} (${me.email || me.id})`);
      console.log(`   Default Team: ${active.defaultTeam || "None"}`);
    } catch (err: any) {
      console.error(`❌ Authentication status error: ${err.message}`);
      process.exit(1);
    }
  });

// Workspace command group (aliases for auth list/switch)
const workspaceCmd = program.command("workspace").description("Manage and switch between Linear workspaces");

workspaceCmd
  .command("list")
  .description("List available workspaces")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action((options) => {
    const profiles = listProfiles();
    console.log(formatProfiles(profiles, options.format as OutputFormat));
  });

workspaceCmd
  .command("switch <profile>")
  .description("Switch to workspace profile")
  .action((profileName: string) => {
    try {
      const profile = switchProfile(profileName);
      console.log(`✅ Active workspace switched to: '${profile.name}' (${profile.organization?.name || "N/A"})`);
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
      process.exit(1);
    }
  });

// Team command group
const teamCmd = program.command("team").description("Manage and switch between default teams in active workspace");

teamCmd
  .command("list")
  .description("List teams in current active workspace")
  .option("-p, --profile <profile>", "Target workspace profile")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (options) => {
    try {
      const client = new BelifoaClient(undefined, options.profile);
      const teams = await client.getTeams();
      console.log(formatTeams(teams, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

teamCmd
  .command("switch <teamKey>")
  .description("Switch default team key for active profile (e.g. ENG)")
  .option("-p, --profile <profile>", "Target workspace profile")
  .action((teamKey: string, options) => {
    try {
      const updated = switchDefaultTeam(teamKey, options.profile);
      console.log(`✅ Default team for profile '${updated.name}' set to: '${updated.defaultTeam}'`);
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
      process.exit(1);
    }
  });

// My Issues command
program
  .command("my-issues")
  .description("List issues assigned to you")
  .option("-p, --profile <profile>", "Target workspace profile")
  .option("-f, --format <format>", "Output format", "cli_table")
  .option("-l, --limit <number>", "Number of issues", "20")
  .action(async (options) => {
    try {
      const client = new BelifoaClient(undefined, options.profile);
      const issues = await client.getMyIssues(parseInt(options.limit));
      console.log(formatIssueList(issues, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Search command
program
  .command("search <query>")
  .description("Search Linear issues")
  .option("-p, --profile <profile>", "Target workspace profile")
  .option("-t, --team <key>", "Filter by team key (e.g., ENG)")
  .option("-f, --format <format>", "Output format", "cli_table")
  .option("-l, --limit <number>", "Limit results", "15")
  .action(async (query: string, options) => {
    try {
      const active = getActiveProfile(options.profile);
      const client = new BelifoaClient(undefined, options.profile);
      const teamKey = options.team || active?.defaultTeam;
      const issues = await client.searchIssues(query, {
        teamKey,
        limit: parseInt(options.limit),
      });
      console.log(formatIssueList(issues, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Issue get/detail command
program
  .command("issue <id>")
  .description("Get details for a specific issue (e.g., ENG-123)")
  .option("-p, --profile <profile>", "Target workspace profile")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (id: string, options) => {
    try {
      const client = new BelifoaClient(undefined, options.profile);
      const issue = await client.getIssue(id);
      console.log(formatIssueDetail(issue, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Git branch helper command
program
  .command("branch <id>")
  .description("Get git branch name slug for a Linear issue (e.g. ENG-123)")
  .option("-p, --profile <profile>", "Target workspace profile")
  .option("-c, --checkout", "Execute git checkout -b with the generated branch name")
  .action(async (id: string, options) => {
    try {
      const client = new BelifoaClient(undefined, options.profile);
      const issue = await client.getIssue(id);
      const branchName = issue.gitBranchName || generateGitBranchName(issue);
      if (options.checkout) {
        const { execSync } = await import("node:child_process");
        console.log(`Checking out branch: ${branchName}`);
        execSync(`git checkout -b "${branchName}"`, { stdio: "inherit" });
      } else {
        console.log(branchName);
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Create issue command
program
  .command("create")
  .description("Create a new Linear issue")
  .option("--profile <profile>", "Target workspace profile")
  .option("-t, --team <team>", "Team ID or Key (e.g. ENG)")
  .requiredOption("--title <title>", "Issue title")
  .option("-d, --description <description>", "Issue description")
  .option("-p, --priority <priority>", "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)", "0")
  .option("-a, --assignee <assignee>", "Assignee user ID, email, or name ('me' to assign yourself)")
  .option("--assign-me", "Automatically assign created issue to yourself")
  .option("--project <project>", "Project name or ID")
  .option("-e, --estimate <points>", "Story points estimate (e.g., 1, 2, 3, 5, 8)")
  .option("--points <points>", "Story points estimate (alias for --estimate)")
  .option("--due-date <date>", "Due date (YYYY-MM-DD)")
  .option("-l, --labels <labels>", "Comma-separated issue labels")
  .option("-s, --state <state>", "Initial workflow state ID or name (e.g. 'Todo', 'In Progress')")
  .option("--parent <id>", "Parent issue ID or identifier (e.g. 'ENG-100')")
  .option("--blocked-by <ids>", "Comma-separated issue IDs or identifiers blocking this issue")
  .option("--blocks <ids>", "Comma-separated issue IDs or identifiers blocked by this issue")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (options) => {
    try {
      const active = getActiveProfile(options.profile);
      const team = options.team || active?.defaultTeam;
      if (!team) {
        console.error("❌ Error: Team key is required (--team <key> or set default team via `belifoa team switch <key>`)");
        process.exit(1);
      }
      const client = new BelifoaClient(undefined, options.profile);
      const assigneeStr = options.assignee || (options.assignMe ? "me" : undefined) || active?.defaultAssignee;
      const estimateVal = options.estimate !== undefined ? options.estimate : options.points;

      const issue = await client.createIssue({
        teamIdOrKey: team,
        title: options.title,
        description: options.description,
        priority: parseInt(options.priority),
        assignee: assigneeStr,
        project: options.project,
        estimate: estimateVal !== undefined ? parseInt(estimateVal) : undefined,
        dueDate: options.dueDate,
        labels: options.labels,
        state: options.state,
        parentId: options.parent,
        blockedBy: options.blockedBy,
        blocks: options.blocks,
      });
      console.log(formatIssueDetail(issue, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Update issue command
program
  .command("update <id>")
  .alias("edit")
  .description("Update an existing Linear issue (e.g., ENG-123)")
  .option("-p, --profile <profile>", "Target workspace profile")
  .option("--title <title>", "Updated issue title")
  .option("-d, --description <description>", "Updated issue description")
  .option("--priority <priority>", "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)")
  .option("-a, --assignee <assignee>", "Assignee user ID, email, or name ('me' to assign yourself)")
  .option("--assign-me", "Assign issue to yourself")
  .option("--project <project>", "Project name or ID")
  .option("-e, --estimate <points>", "Story points estimate")
  .option("--points <points>", "Story points estimate (alias for --estimate)")
  .option("--due-date <date>", "Due date (YYYY-MM-DD)")
  .option("-l, --labels <labels>", "Comma-separated issue labels")
  .option("-s, --state <state>", "Workflow state ID or name (e.g. 'In Progress', 'Done')")
  .option("--parent <id>", "Parent issue ID or identifier")
  .option("--blocked-by <ids>", "Comma-separated issue IDs or identifiers blocking this issue")
  .option("--blocks <ids>", "Comma-separated issue IDs or identifiers blocked by this issue")
  .option("-c, --comment <comment>", "Add a comment along with the update")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (id: string, options) => {
    try {
      const client = new BelifoaClient(undefined, options.profile);
      const assigneeStr = options.assignee || (options.assignMe ? "me" : undefined);
      const estimateVal = options.estimate !== undefined ? options.estimate : options.points;

      const updated = await client.updateIssue(id, {
        title: options.title,
        description: options.description,
        priority: options.priority !== undefined ? parseInt(options.priority) : undefined,
        assignee: assigneeStr,
        project: options.project,
        estimate: estimateVal !== undefined ? parseInt(estimateVal) : undefined,
        dueDate: options.dueDate,
        labels: options.labels,
        state: options.state,
        parentId: options.parent,
        blockedBy: options.blockedBy,
        blocks: options.blocks,
      });

      if (options.comment) {
        await client.addComment(id, options.comment);
        const refreshed = await client.getIssue(id).catch(() => updated);
        console.log(formatIssueDetail(refreshed, options.format as OutputFormat));
      } else {
        console.log(formatIssueDetail(updated, options.format as OutputFormat));
      }
    } catch (err: any) {
      console.error(`Error updating issue ${id}: ${err.message}`);
      process.exit(1);
    }
  });

// Close / Resolve issue command
program
  .command("close <id>")
  .alias("resolve")
  .alias("done")
  .description("Close or resolve an issue by transitioning state to Done / Completed")
  .option("-p, --profile <profile>", "Target workspace profile")
  .option("-c, --comment <comment>", "Add an optional closing comment")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (id: string, options) => {
    try {
      const client = new BelifoaClient(undefined, options.profile);
      const updated = await client.updateIssue(id, { state: "Done" });

      if (options.comment) {
        await client.addComment(id, options.comment);
      }

      const refreshed = options.comment ? await client.getIssue(id).catch(() => updated) : updated;
      console.log(formatIssueDetail(refreshed, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error closing issue ${id}: ${err.message}`);
      process.exit(1);
    }
  });

// Labels command
program
  .command("labels")
  .description("List all workspace issue labels")
  .option("-p, --profile <profile>", "Target workspace profile")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (options) => {
    try {
      const client = new BelifoaClient(undefined, options.profile);
      const labels = await client.getIssueLabels();
      console.log(formatLabels(labels, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Bulk create / Import command
program
  .command("import")
  .alias("create-bulk")
  .description("Bulk create Linear issues from a JSON file")
  .requiredOption("--file <path>", "Path to JSON file containing array of issues")
  .option("--profile <profile>", "Target workspace profile")
  .option("-t, --team <team>", "Default team key/ID if omitted in task items")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (options) => {
    try {
      const active = getActiveProfile(options.profile);
      const defaultTeam = options.team || active?.defaultTeam;

      const fileContent = readFileSync(options.file, "utf-8");
      let data = JSON.parse(fileContent);

      let issuesArray: any[] = [];
      if (Array.isArray(data)) {
        issuesArray = data;
      } else if (Array.isArray(data.issues)) {
        issuesArray = data.issues;
      } else if (Array.isArray(data.tasks)) {
        issuesArray = data.tasks;
      } else {
        console.error("❌ Error: JSON file must contain an array of issue objects or { issues: [...] }");
        process.exit(1);
      }

      console.log(`📦 Importing ${issuesArray.length} issue(s)...`);
      const client = new BelifoaClient(undefined, options.profile);
      const result = await client.createBulkIssues(issuesArray, defaultTeam);

      if (result.created.length > 0) {
        console.log(`\n✅ Successfully created ${result.created.length} issue(s):`);
        console.log(formatIssueList(result.created, options.format as OutputFormat));
      }

      if (result.errors.length > 0) {
        console.error(`\n⚠️ Failed to create ${result.errors.length} issue(s):`);
        result.errors.forEach((e) => {
          console.error(`  - Item #${e.index + 1} ("${e.title}"): ${e.error}`);
        });
      }
    } catch (err: any) {
      console.error(`❌ Import Error: ${err.message}`);
      process.exit(1);
    }
  });

// Teams command
program
  .command("teams")
  .description("List all Linear teams")
  .option("-p, --profile <profile>", "Target workspace profile")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (options) => {
    try {
      const client = new BelifoaClient(undefined, options.profile);
      const teams = await client.getTeams();
      console.log(formatTeams(teams, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Projects command
program
  .command("projects")
  .description("List all Linear projects")
  .option("-p, --profile <profile>", "Target workspace profile")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (options) => {
    try {
      const client = new BelifoaClient(undefined, options.profile);
      const projects = await client.getProjects();
      console.log(formatProjects(projects, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// MCP Server command
program
  .command("mcp")
  .description("Start the Stdio MCP Server for Belifoa")
  .action(async () => {
    const { startMcpServer } = await import("../mcp/server.js");
    await startMcpServer();
  });

// Utility command to format raw JSON files
program
  .command("format")
  .description("Format raw Linear GraphQL API JSON response into agent-compact output")
  .requiredOption("-i, --input <file>", "Input JSON file path")
  .option("-f, --format <format>", "Output format (markdown|compact_json)", "markdown")
  .action((options) => {
    try {
      const content = readFileSync(options.input, "utf-8");
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        const cleaned = data.map(cleanRawIssue);
        console.log(formatIssueList(cleaned, options.format as OutputFormat));
      } else if (data.data?.issueSearch?.nodes) {
        const cleaned = data.data.issueSearch.nodes.map(cleanRawIssue);
        console.log(formatIssueList(cleaned, options.format as OutputFormat));
      } else {
        const cleaned = cleanRawIssue(data.data?.issue || data);
        console.log(formatIssueDetail(cleaned, options.format as OutputFormat));
      }
    } catch (err: any) {
      console.error(`Format error: ${err.message}`);
      process.exit(1);
    }
  });

// Install standalone compiled binary command
program
  .command("install-bin")
  .description("Compile and install standalone belifoa binary executable to ~/.local/bin/belifoa")
  .action(async () => {
    try {
      const { execSync } = await import("node:child_process");
      const { homedir } = await import("node:os");
      const { mkdirSync, copyFileSync, chmodSync } = await import("node:fs");
      const { join } = await import("node:path");

      console.log("🔨 Compiling standalone Belifoa single-file binary with Bun...");
      execSync("bun build --compile --outfile=dist/belifoa src/cli/index.ts", {
        cwd: process.cwd(),
        stdio: "inherit",
      });

      const binDir = join(homedir(), ".local", "bin");
      mkdirSync(binDir, { recursive: true });
      const targetPath = join(binDir, "belifoa");
      copyFileSync(join(process.cwd(), "dist", "belifoa"), targetPath);
      chmodSync(targetPath, 0o755);

      console.log(`\n✅ Installed compiled Belifoa binary to: ${targetPath}`);
      console.log("👉 Make sure ~/.local/bin is in your PATH to run `belifoa` directly from any terminal.");
    } catch (err: any) {
      console.error(`❌ Binary installation failed: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
