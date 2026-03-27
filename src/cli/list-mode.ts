export type ListMode = "local" | "cloud";

export type ListFlags = {
	local?: boolean;
	cloud?: boolean;
};

/**
 * Resolve which list mode to use based on CLI flags.
 * If no flag is set, prompts the user interactively.
 */
export async function resolveListMode(
	_flags: ListFlags,
	_promptFn: (question: string) => Promise<string>,
): Promise<ListMode> {
	throw new Error("Not implemented");
}

/**
 * Parse the --push flag's session selection input.
 * Returns selected indices (0-based), or "all", or null for quit.
 */
export function parseSessionSelection(_input: string, _totalSessions: number): number[] | "all" | null {
	throw new Error("Not implemented");
}
