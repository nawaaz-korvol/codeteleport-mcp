import type { SessionListItem } from "../client/api";

export interface PickedCloudSession {
	sessionId: string;
	sourceCwd: string;
	sourceMachine: string | null;
}

/**
 * Given a list of cloud sessions, resolve which one to pull.
 * - 0 sessions: returns null
 * - 1 session: returns it directly (no prompt)
 * - multiple: displays list and prompts the user to pick one (default: 1, most recent)
 * - "q" to cancel
 */
export async function pickCloudSession(
	_sessions: SessionListItem[],
	_promptFn: (question: string) => Promise<string>,
	_logFn?: (...args: unknown[]) => void,
): Promise<PickedCloudSession | null> {
	throw new Error("Not implemented");
}

/**
 * Format a cloud session for display in the picker list.
 */
export function formatCloudSessionRow(_index: number, _session: SessionListItem): string {
	throw new Error("Not implemented");
}
