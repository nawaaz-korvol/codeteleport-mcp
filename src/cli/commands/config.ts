import { Command } from "commander";
import { getAgent } from "../../shared/agents";
import { CONFIG_DIR } from "../../shared/constants";
import type { Config } from "../../shared/types";
import { readConfig, writeConfig } from "../config";

export function formatConfigDisplay(config: Config): string {
	const agent = getAgent(config.agent);
	const tokenRedacted = config.token ? `ctk_live_...${config.token.slice(-4)} (set)` : "(not set)";

	return [
		"CodeTeleport Configuration",
		"",
		`  agent      : ${config.agent || "claude-code"} (${agent.name})`,
		`  deviceName : ${config.deviceName}`,
		`  apiUrl     : ${config.apiUrl}`,
		`  token      : ${tokenRedacted}`,
	].join("\n");
}

const SETTABLE_KEYS = ["agent", "deviceName", "apiUrl"];

export function validateConfigKey(key: string): boolean {
	return SETTABLE_KEYS.includes(key);
}

export function getSettableKeys(): string[] {
	return [...SETTABLE_KEYS];
}

export function setConfigValue(key: string, value: string, configDir: string = CONFIG_DIR): void {
	if (key === "agent") {
		getAgent(value);
	}

	const config = readConfig(configDir);
	(config as unknown as Record<string, unknown>)[key] = value;
	writeConfig(config, configDir);
}

export const configCommand = new Command("config")
	.description("View or update CodeTeleport configuration")
	.argument("[action]", "Action: 'set' to update a value")
	.argument("[key]", "Config key to set")
	.argument("[value]", "New value")
	.action((action?: string, key?: string, value?: string) => {
		try {
			if (!action) {
				const config = readConfig();
				console.log(formatConfigDisplay(config));
				return;
			}

			if (action === "set") {
				if (!key || !value) {
					console.error("Usage: codeteleport config set <key> <value>");
					console.error(`Settable keys: ${SETTABLE_KEYS.join(", ")}`);
					process.exit(1);
				}

				if (!validateConfigKey(key)) {
					if (key === "token") {
						console.error("Token is not settable via config. Use `codeteleport auth login` instead.");
					} else {
						console.error(`Unknown config key: ${key}`);
						console.error(`Settable keys: ${SETTABLE_KEYS.join(", ")}`);
					}
					process.exit(1);
				}

				setConfigValue(key, value);
				console.log(`Set ${key} = ${value}`);
			} else {
				console.error(`Unknown action: ${action}. Use 'set' to update a value.`);
				process.exit(1);
			}
		} catch (err) {
			console.error((err as Error).message);
			process.exit(1);
		}
	});
