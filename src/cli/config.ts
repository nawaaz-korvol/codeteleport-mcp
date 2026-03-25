import fs from "node:fs";
import path from "node:path";
import { CONFIG_DIR } from "../shared/constants";
import type { Config } from "../shared/types";

export function readConfig(configDir: string = CONFIG_DIR): Config {
	const configFile = path.join(configDir, "config.json");
	if (!fs.existsSync(configFile)) {
		throw new Error("Not logged in. Run `codeteleport auth login` first.");
	}
	return JSON.parse(fs.readFileSync(configFile, "utf-8"));
}

export function writeConfig(config: Config, configDir: string = CONFIG_DIR): void {
	fs.mkdirSync(configDir, { recursive: true });
	const configFile = path.join(configDir, "config.json");
	fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
	fs.chmodSync(configFile, 0o600);
}

export function configExists(configDir: string = CONFIG_DIR): boolean {
	return fs.existsSync(path.join(configDir, "config.json"));
}
