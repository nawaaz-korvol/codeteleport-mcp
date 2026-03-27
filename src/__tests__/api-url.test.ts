import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "../cli/api-url";

describe("resolveApiUrl", () => {
	it("returns default API URL when no flag provided", () => {
		expect(resolveApiUrl()).toBe("https://api.codeteleport.com/v1");
	});

	it("returns default when flag is undefined", () => {
		expect(resolveApiUrl(undefined)).toBe("https://api.codeteleport.com/v1");
	});

	it("uses flag value when provided", () => {
		expect(resolveApiUrl("http://localhost:8787/v1")).toBe("http://localhost:8787/v1");
	});

	it("strips trailing slash from flag value", () => {
		expect(resolveApiUrl("http://localhost:8787/v1/")).toBe("http://localhost:8787/v1");
	});

	it("appends /v1 if missing from flag value", () => {
		expect(resolveApiUrl("http://localhost:8787")).toBe("http://localhost:8787/v1");
	});

	it("appends /v1 and strips trailing slash", () => {
		expect(resolveApiUrl("http://localhost:8787/")).toBe("http://localhost:8787/v1");
	});

	it("does not double /v1", () => {
		expect(resolveApiUrl("http://localhost:8787/v1")).toBe("http://localhost:8787/v1");
	});
});
