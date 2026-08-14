#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BelifoaClient } from "../core/client.js";
import { getMcpToolSchemas, handleToolCall } from "./tools.js";
import pkg from "../../package.json";

export async function startMcpServer(profileName?: string) {
  const server = new Server(
    {
      name: "belifoa",
      version: pkg.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const client = new BelifoaClient(undefined, profileName);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getMcpToolSchemas(),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      return await handleToolCall(name, args || {}, client);
    } catch (err: any) {
      if (err.suggestions) {
        return {
          content: [{ type: "text", text: JSON.stringify(err.suggestions, null, 2) }],
        };
      }
      return {
        content: [{ type: "text", text: `Error executing ${name}: ${err.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
