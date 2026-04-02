import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatConfigDisplay, getSettableKeys, setConfigValue, validateConfigKey } from "../cli/commands/config";

describe("Config command", () => {
	let tmpDir: string;
	let configDir: string;
	let configFile: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "config-cmd-test-"));
		configDir = path.join(tmpDir, ".codeteleport");
		configFile = path.join(configDir, "config.json");
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(
			configFile,
			JSON.stringify({
				token: "ctk_live_abc123def456",
				apiUrl: "https://api.codeteleport.com/v1",
				deviceName: "work-laptop",
				agent: "claude-code",
			}),
		);
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("formatConfigDisplay", () => {
		it("redacts token showing only last 4 chars", () => {
			const output = formatConfigDisplay({
				token: "ctk_live_abc123def456",
				apiUrl: "https://api.codeteleport.com/v1",
				deviceName: "work-laptop",
				agent: "claude-code",
			});
			expect(output).toContain("ctk_live_...f456");
			expect(output).not.toContain("abc123");
		});

		it("shows all config fields", () => {
			const output = formatConfigDisplay({
				token: "ctk_live_abc123def456",
				apiUrl: "https://api.codeteleport.com/v1",
				deviceName: "work-laptop",
				agent: "claude-code",
			});
			expect(output).toContain("agent");
			expect(output).toContain("claude-code");
			expect(output).toContain("Claude Code");
			expect(output).toContain("work-laptop");
			expect(output).toContain("api.codeteleport.com");
			expect(output).toContain("(set)");
		});
	});

	describe("validateConfigKey", () => {
		it("accepts valid settable keys", () => {
			expect(validateConfigKey("agent")).toBe(true);
			expect(validateConfigKey("deviceName")).toBe(true);
			expect(validateConfigKey("apiUrl")).toBe(true);
		});

		it("rejects token (not settable)", () => {
			expect(validateConfigKey("token")).toBe(false);
		});

		it("rejects unknown keys", () => {
			expect(validateConfigKey("unknown")).toBe(false);
		});
	});

	describe("getSettableKeys", () => {
		it("returns agent, deviceName, apiUrl", () => {
			const keys = getSettableKeys();
			expect(keys).toContain("agent");
			expect(keys).toContain("deviceName");
			expect(keys).toContain("apiUrl");
			expect(keys).not.toContain("token");
		});
	});

	describe("setConfigValue", () => {
		it("sets deviceName", () => {
			setConfigValue("deviceName", "new-laptop", configDir);
			const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
			expect(config.deviceName).toBe("new-laptop");
		});

		it("sets apiUrl", () => {
			setConfigValue("apiUrl", "http://localhost:8787/v1", configDir);
			const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
			expect(config.apiUrl).toBe("http://localhost:8787/v1");
		});

		it("sets agent with valid agent ID", () => {
			setConfigValue("agent", "claude-code", configDir);
			const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
			expect(config.agent).toBe("claude-code");
		});

		it("throws for invalid agent ID", () => {
			expect(() => setConfigValue("agent", "invalid-agent", configDir)).toThrow("Unknown agent");
		});

		it("preserves other fields when setting one", () => {
			setConfigValue("deviceName", "new-laptop", configDir);
			const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
			expect(config.token).toBe("ctk_live_abc123def456");
			expect(config.apiUrl).toBe("https://api.codeteleport.com/v1");
			expect(config.agent).toBe("claude-code");
		});
	});
});
