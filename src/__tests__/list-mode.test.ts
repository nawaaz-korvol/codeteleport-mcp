import { describe, expect, it } from "vitest";
import { parseSessionSelection, resolveListMode } from "../cli/list-mode";

describe("resolveListMode", () => {
	it("returns local when --local flag is set", async () => {
		expect(await resolveListMode({ local: true }, async () => "")).toBe("local");
	});

	it("returns cloud when --cloud flag is set", async () => {
		expect(await resolveListMode({ cloud: true }, async () => "")).toBe("cloud");
	});

	it("prompts and returns local when user picks 1", async () => {
		expect(await resolveListMode({}, async () => "1")).toBe("local");
	});

	it("prompts and returns cloud when user picks 2", async () => {
		expect(await resolveListMode({}, async () => "2")).toBe("cloud");
	});

	it("defaults to local for empty input", async () => {
		expect(await resolveListMode({}, async () => "")).toBe("local");
	});
});

describe("parseSessionSelection", () => {
	it("returns null for q", () => {
		expect(parseSessionSelection("q", 5)).toBeNull();
	});

	it("returns null for Q", () => {
		expect(parseSessionSelection("Q", 5)).toBeNull();
	});

	it("returns 'all' for 'all'", () => {
		expect(parseSessionSelection("all", 5)).toBe("all");
	});

	it("returns 'all' for 'ALL'", () => {
		expect(parseSessionSelection("ALL", 5)).toBe("all");
	});

	it("parses single number", () => {
		expect(parseSessionSelection("3", 5)).toEqual([2]);
	});

	it("parses comma-separated numbers", () => {
		expect(parseSessionSelection("1,3,5", 5)).toEqual([0, 2, 4]);
	});

	it("handles spaces around commas", () => {
		expect(parseSessionSelection("1, 3, 5", 5)).toEqual([0, 2, 4]);
	});

	it("ignores out-of-range numbers", () => {
		expect(parseSessionSelection("1,6,3", 5)).toEqual([0, 2]);
	});

	it("ignores zero and negatives", () => {
		expect(parseSessionSelection("0,-1,2", 5)).toEqual([1]);
	});

	it("deduplicates", () => {
		expect(parseSessionSelection("2,2,3", 5)).toEqual([1, 2]);
	});

	it("returns empty array for invalid input", () => {
		expect(parseSessionSelection("abc", 5)).toEqual([]);
	});
});
