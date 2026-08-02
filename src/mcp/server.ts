#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BelifoaClient } from "../core/client.js";
import {
  authStatusToolSchema,
  authListToolSchema,
  authSwitchToolSchema,
  setApiKeyToolSchema,
  getIssueToolSchema,
  searchIssuesToolSchema,
  getMyIssuesToolSchema,
  manageIssueToolSchema,
  bulkCreateIssuesToolSchema,
  getTeamsAndProjectsToolSchema,
  getLabelsToolSchema,
  handleToolCall,
} from "./tools.js";

export async function startMcpServer() {
  const server = new Server(
    {
      name: "belifoa",
      version: "0.3.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const client = new BelifoaClient();

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        authStatusToolSchema,
        authListToolSchema,
        authSwitchToolSchema,
        setApiKeyToolSchema,
        getIssueToolSchema,
        searchIssuesToolSchema,
        getMyIssuesToolSchema,
        manageIssueToolSchema,
        bulkCreateIssuesToolSchema,
        getTeamsAndProjectsToolSchema,
        getLabelsToolSchema,
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      return await handleToolCall(name, args || {}, client);
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Error executing ${name}: ${err.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.main) {
  startMcpServer().catch((err) => {
    console.error("Belifoa MCP Server Error:", err);
    process.exit(1);
  });
}
