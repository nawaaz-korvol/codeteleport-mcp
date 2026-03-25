#!/usr/bin/env node
import { registerTools } from "./tools";

async function main() {
	const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
	const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");

	const server = new McpServer({
		name: "codeteleport",
		version: "0.1.1",
	});

	registerTools(server);

	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main();
