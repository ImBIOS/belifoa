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
} from "../core/config.js";
import {
  formatIssueList,
  formatIssueDetail,
  formatTeams,
  formatProjects,
  formatProfiles,
  cleanRawIssue,
} from "../core/formatters.js";
import type { OutputFormat } from "../core/types.js";
import { readFileSync } from "node:fs";

const program = new Command();

program
  .name("belifoa")
  .description("Better Linear for Agent - Compact, Multi-Auth, Workspace & Team Switching Linear CLI")
  .version("0.2.0");

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
  .action(async () => {
    const active = getActiveProfile();
    if (!active) {
      console.log("❌ No active API profile configured. Run `belifoa auth add <profile> <key>` or set LINEAR_API_KEY.");
      process.exit(1);
    }
    try {
      const client = new BelifoaClient();
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
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (options) => {
    try {
      const client = new BelifoaClient();
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
  .action((teamKey: string) => {
    try {
      const updated = switchDefaultTeam(teamKey);
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
  .option("-f, --format <format>", "Output format", "cli_table")
  .option("-l, --limit <number>", "Number of issues", "20")
  .action(async (options) => {
    try {
      const client = new BelifoaClient();
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
  .option("-t, --team <key>", "Filter by team key (e.g., ENG)")
  .option("-f, --format <format>", "Output format", "cli_table")
  .option("-l, --limit <number>", "Limit results", "15")
  .action(async (query: string, options) => {
    try {
      const active = getActiveProfile();
      const client = new BelifoaClient();
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
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (id: string, options) => {
    try {
      const client = new BelifoaClient();
      const issue = await client.getIssue(id);
      console.log(formatIssueDetail(issue, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Create issue command
program
  .command("create")
  .description("Create a new Linear issue")
  .option("-t, --team <team>", "Team ID or Key (e.g. ENG)")
  .requiredOption("--title <title>", "Issue title")
  .option("-d, --description <description>", "Issue description")
  .option("-p, --priority <priority>", "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)", "0")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (options) => {
    try {
      const active = getActiveProfile();
      const team = options.team || active?.defaultTeam;
      if (!team) {
        console.error("❌ Error: Team key is required (--team <key> or set default team via `belifoa team switch <key>`)");
        process.exit(1);
      }
      const client = new BelifoaClient();
      const issue = await client.createIssue({
        teamIdOrKey: team,
        title: options.title,
        description: options.description,
        priority: parseInt(options.priority),
      });
      console.log(formatIssueDetail(issue, options.format as OutputFormat));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// Teams command
program
  .command("teams")
  .description("List all Linear teams")
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (options) => {
    try {
      const client = new BelifoaClient();
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
  .option("-f, --format <format>", "Output format", "cli_table")
  .action(async (options) => {
    try {
      const client = new BelifoaClient();
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

program.parse(process.argv);
