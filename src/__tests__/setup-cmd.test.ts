import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectExistingConfig, resolveAgentChoice, resolveDeviceName } from "../cli/commands/setup";

describe("Setup command", () => {
	let tmpDir: string;
	let configDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "setup-test-"));
		configDir = path.join(tmpDir, ".codeteleport");
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("detectExistingConfig", () => {
		it("returns null when no config exists", () => {
			const result = detectExistingConfig(configDir);
			expect(result).toBeNull();
		});

		it("returns config when it exists", () => {
			fs.mkdirSync(configDir, { recursive: true });
			fs.writeFileSync(
				path.join(configDir, "config.json"),
				JSON.stringify({
					token: "ctk_live_abc",
					apiUrl: "https://api.codeteleport.com/v1",
					deviceName: "work-laptop",
					agent: "claude-code",
				}),
			);

			const result = detectExistingConfig(configDir);
			expect(result).not.toBeNull();
			expect(result?.deviceName).toBe("work-laptop");
			expect(result?.agent).toBe("claude-code");
		});

		it("returns config with default agent when field missing", () => {
			fs.mkdirSync(configDir, { recursive: true });
			fs.writeFileSync(
				path.join(configDir, "config.json"),
				JSON.stringify({
					token: "ctk_live_abc",
					apiUrl: "https://api.codeteleport.com/v1",
					deviceName: "work-laptop",
				}),
			);

			const result = detectExistingConfig(configDir);
			expect(result?.agent).toBe("claude-code");
		});
	});

	describe("resolveAgentChoice", () => {
		it("returns claude-code when user picks 1", async () => {
			const result = await resolveAgentChoice(async () => "1");
			expect(result).toBe("claude-code");
		});

		it("defaults to claude-code on empty input", async () => {
			const result = await resolveAgentChoice(async () => "");
			expect(result).toBe("claude-code");
		});
	});

	describe("resolveDeviceName", () => {
		it("uses user input when provided", async () => {
			const result = await resolveDeviceName("default-host", async () => "my-laptop");
			expect(result).toBe("my-laptop");
		});

		it("uses default when user presses enter", async () => {
			const result = await resolveDeviceName("default-host", async () => "");
			expect(result).toBe("default-host");
		});
	});
});
