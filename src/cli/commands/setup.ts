import { execSync } from "node:child_process";
import os from "node:os";
import readline from "node:readline";
import { Command } from "commander";
import { getAgent, getSupportedAgents } from "../../shared/agents";
import { CONFIG_DIR } from "../../shared/constants";
import type { Config } from "../../shared/types";
import { resolveApiUrl } from "../api-url";
import { configExists, readConfig } from "../config";
import { resolveLoginMethod, startOAuthCallbackServer } from "../github-oauth";

function prompt(question: string): Promise<string> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

export function detectExistingConfig(configDir: string = CONFIG_DIR): Config | null {
	if (!configExists(configDir)) return null;
	try {
		return readConfig(configDir);
	} catch {
		return null;
	}
}

export async function resolveAgentChoice(promptFn: (question: string) => Promise<string>): Promise<string> {
	const agents = getSupportedAgents();

	const lines = ["Which coding agent do you use?\n"];
	for (let i = 0; i < agents.length; i++) {
		const rec = i === 0 ? "  (recommended)" : "";
		lines.push(`  ${i + 1}) ${agents[i].name}${rec}`);
	}
	lines.push("");

	const choice = await promptFn(`${lines.join("\n")}Select [1]: `);

	const index = choice === "" ? 0 : Number.parseInt(choice, 10) - 1;
	if (Number.isNaN(index) || index < 0 || index >= agents.length) return agents[0].id;
	return agents[index].id;
}

export async function resolveDeviceName(
	defaultName: string,
	promptFn: (question: string) => Promise<string>,
): Promise<string> {
	const input = await promptFn(`Device name [${defaultName}]: `);
	return input || defaultName;
}

export const setupCommand = new Command("setup").description("Set up CodeTeleport on this machine").action(async () => {
	try {
		console.log("\nWelcome to CodeTeleport — teleport your AI coding sessions across machines.\n");
		console.log("Let's get you set up. This takes about 30 seconds.\n");

		// Check for existing config
		const existing = detectExistingConfig();
		if (existing) {
			const agent = getAgent(existing.agent);
			console.log("Existing configuration found:");
			console.log(`  Agent   : ${agent.name}`);
			console.log(`  Device  : ${existing.deviceName}`);
			console.log(`  API     : ${existing.apiUrl}`);
			console.log("");

			const reconfigure = await prompt("Reconfigure? [y/N]: ");
			if (reconfigure.toLowerCase() !== "y") {
				console.log("Setup cancelled. Your existing configuration is unchanged.");
				return;
			}
			console.log("");
		}

		// Step 1 — Agent
		console.log("Step 1 of 4 — Agent\n");
		const agentId = await resolveAgentChoice(prompt);
		const agent = getAgent(agentId);
		console.log(`\n✓ Agent set to ${agent.name}\n`);

		// Step 2 — Authentication
		console.log("Step 2 of 4 — Authentication\n");

		const { createApiTokenAndSave } = await import("./auth");
		const method = await resolveLoginMethod({}, prompt);

		const apiUrl = resolveApiUrl();

		if (method === "github") {
			const { port, tokenPromise } = await startOAuthCallbackServer();
			const apiBase = apiUrl.replace(/\/v1$/, "");
			const authUrl = `${apiBase}/v1/auth/github?cli_port=${port}`;
			console.log("Opening browser for GitHub login...");
			console.log(`If the browser doesn't open, visit: ${authUrl}\n`);

			const open = await import("open");
			open.default(authUrl).catch(() => {});

			const jwt = await tokenPromise;
			const deviceDefault = os.hostname().replace(/\.local$/, "");

			// Step 3 — Device Name
			console.log("\nStep 3 of 4 — Device Name\n");
			const deviceName = await resolveDeviceName(deviceDefault, prompt);
			console.log(`\n✓ Device name set to ${deviceName}\n`);

			await createApiTokenAndSave(apiUrl, jwt, undefined);
		} else {
			const email = await prompt("Email: ");
			const password = await prompt("Password: ");

			const { CodeTeleportClient } = await import("../../client/api");
			const client = new CodeTeleportClient({ apiUrl, token: "" });

			let jwt: string;
			const registerChoice = await prompt("Create new account? [y/N]: ");
			if (registerChoice.toLowerCase() === "y") {
				const result = await client.register(email, password);
				jwt = result.token;
				console.log(`\nAccount created for ${email}`);
			} else {
				const result = await client.login(email, password);
				jwt = result.token;
			}

			// Step 3 — Device Name
			console.log("\nStep 3 of 4 — Device Name\n");
			const deviceDefault = os.hostname().replace(/\.local$/, "");
			const deviceName = await resolveDeviceName(deviceDefault, prompt);
			console.log(`\n✓ Device name set to ${deviceName}\n`);

			await createApiTokenAndSave(apiUrl, jwt, email);
		}

		// Step 4 — MCP Integration
		console.log("Step 4 of 4 — MCP Integration\n");
		if (agent.mcpAddCommand) {
			console.log(`Register CodeTeleport as an MCP server in ${agent.name}?`);
			console.log("This lets you push and pull sessions directly from conversations.\n");
			console.log(`  Run: ${agent.mcpAddCommand}\n`);

			const setupMcp = await prompt("Set up MCP now? [Y/n]: ");
			if (setupMcp.toLowerCase() !== "n") {
				try {
					console.log(`\nRunning: ${agent.mcpAddCommand}\n`);
					execSync(agent.mcpAddCommand, { stdio: "inherit" });
					console.log("\n✓ MCP server registered\n");
				} catch {
					console.log(`\n⚠ MCP setup failed. You can run it manually:\n  ${agent.mcpAddCommand}\n`);
				}
			} else {
				console.log(`\nSkipped. You can set it up later:\n  ${agent.mcpAddCommand}\n`);
			}
		}

		// Summary
		console.log("━".repeat(40));
		console.log("\nSetup complete!\n");
		console.log(`  Agent    : ${agent.name}`);
		console.log(`  Device   : ${os.hostname().replace(/\.local$/, "")}`);
		console.log(`  MCP      : ${agent.mcpAddCommand ? "Available" : "N/A"}`);
		console.log("");
		console.log("You're ready to teleport. Try these:\n");
		console.log(`  From ${agent.name}:  "Push this session to the cloud"`);
		console.log("  From terminal:     codeteleport push");
		console.log("");
		console.log("Docs:    https://docs.codeteleport.com");
		console.log("Support: https://discord.gg/c69JYPWS");
	} catch (err) {
		console.error(`\nSetup failed: ${(err as Error).message}`);
		process.exit(1);
	}
});
