#!/usr/bin/env bun
import { Command } from "commander";
import { BelifoaClient } from "../core/client.js";
import { saveConfig, loadConfig } from "../core/config.js";
import {
  formatIssueList,
  formatIssueDetail,
  formatTeams,
  formatProjects,
  cleanRawIssue,
} from "../core/formatters.js";
import type { OutputFormat } from "../core/types.js";
import { readFileSync } from "node:fs";

const program = new Command();

program
  .name("belifoa")
  .description("Better Linear for Agent - Compact, Fast, Persistent Auth Linear CLI")
  .version("0.1.0");

// Auth command
const authCmd = program.command("auth").description("Manage Linear authentication");

authCmd
  .command("set <key>")
  .description("Set long-lived Linear Personal API Key")
  .action((key: string) => {
    saveConfig({ apiKey: key });
    console.log("✅ Linear API key saved to ~/.config/belifoa/config.json");
  });

authCmd
  .command("status")
  .description("Check current Linear auth status")
  .action(async () => {
    const config = loadConfig();
    if (!config.apiKey) {
      console.log("❌ No API key configured. Run `belifoa auth set <lin_api_...>` or set LINEAR_API_KEY env.");
      process.exit(1);
    }
    try {
      const client = new BelifoaClient();
      const me = await client.getMe();
      console.log(`✅ Authenticated as: ${me.name} (${me.email})`);
    } catch (err: any) {
      console.error(`❌ Authentication failed: ${err.message}`);
      process.exit(1);
    }
  });

// My Issues command
program
  .command("my-issues")
  .description("List issues assigned to you")
  .option("-f, --format <format>", "Output format (markdown|compact_json|raw_json)", "markdown")
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
  .option("-f, --format <format>", "Output format (markdown|compact_json|raw_json)", "markdown")
  .option("-l, --limit <number>", "Limit results", "15")
  .action(async (query: string, options) => {
    try {
      const client = new BelifoaClient();
      const issues = await client.searchIssues(query, {
        teamKey: options.team,
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
  .option("-f, --format <format>", "Output format (markdown|compact_json|raw_json)", "markdown")
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
  .requiredOption("-t, --team <team>", "Team ID or Key (e.g. ENG)")
  .requiredOption("--title <title>", "Issue title")
  .option("-d, --description <description>", "Issue description")
  .option("-p, --priority <priority>", "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)", "0")
  .option("-f, --format <format>", "Output format", "markdown")
  .action(async (options) => {
    try {
      const client = new BelifoaClient();
      const issue = await client.createIssue({
        teamIdOrKey: options.team,
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
  .option("-f, --format <format>", "Output format", "markdown")
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
  .option("-f, --format <format>", "Output format", "markdown")
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
