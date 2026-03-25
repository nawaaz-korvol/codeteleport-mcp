import fs from "node:fs";
import readline from "node:readline";
import type { ScannedAssets, SessionMetadata } from "../shared/types";

/**
 * Scan a session JSONL file for referenced assets and extract metadata.
 */
export async function scanSession(jsonlPath: string): Promise<{ assets: ScannedAssets; metadata: SessionMetadata }> {
	const pasteFiles = new Set<string>();
	const shellSnapshots = new Set<string>();
	const filesModified = new Set<string>();

	const pasteRegex = /paste-cache\/([a-zA-Z0-9]+\.txt)/g;
	const shellRegex = /snapshot-zsh-\d+-\w+\.sh/g;

	let messageCount = 0;
	let userMessageCount = 0;
	let assistantMessageCount = 0;
	let toolCallCount = 0;
	let firstTimestamp: string | undefined;
	let lastTimestamp: string | undefined;
	let claudeModel: string | undefined;
	let summary: string | undefined;

	const content = fs.readFileSync(jsonlPath, "utf-8").trim();
	if (!content) {
		return {
			assets: { pasteFiles: [], shellSnapshots: [] },
			metadata: { messageCount: 0 },
		};
	}

	const fileStream = fs.createReadStream(jsonlPath);
	const rl = readline.createInterface({ input: fileStream });

	for await (const line of rl) {
		if (!line.trim()) continue;

		let entry: Record<string, unknown>;
		try {
			entry = JSON.parse(line);
		} catch {
			continue;
		}

		const type = entry.type as string | undefined;
		if (!type || !["user", "assistant", "progress", "system"].includes(type)) continue;

		messageCount++;
		if (type === "user") userMessageCount++;
		if (type === "assistant") assistantMessageCount++;

		// Timestamps
		const timestamp = entry.timestamp as string | undefined;
		if (timestamp) {
			if (!firstTimestamp) firstTimestamp = timestamp;
			lastTimestamp = timestamp;
		}

		// Model
		if (!claudeModel && entry.model) {
			claudeModel = entry.model as string;
		}

		// Summary from first user message
		if (!summary && type === "user") {
			const msg = entry.message as Record<string, unknown> | undefined;
			if (msg?.content && typeof msg.content === "string") {
				summary = msg.content.slice(0, 200);
			}
		}

		// Tool calls
		const toolCalls = entry.toolCalls as Array<Record<string, unknown>> | undefined;
		if (toolCalls && Array.isArray(toolCalls)) {
			toolCallCount += toolCalls.length;

			for (const tc of toolCalls) {
				const name = tc.name as string | undefined;
				const input = tc.input as Record<string, unknown> | undefined;
				if (name && ["Edit", "Write"].includes(name) && input?.file_path) {
					filesModified.add(input.file_path as string);
				}
			}
		}

		// Asset scanning
		const text = JSON.stringify(entry);
		let match: RegExpExecArray | null;

		// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
		while ((match = pasteRegex.exec(text)) !== null) {
			pasteFiles.add(match[1]);
		}
		pasteRegex.lastIndex = 0;

		// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
		while ((match = shellRegex.exec(text)) !== null) {
			shellSnapshots.add(match[0]);
		}
		shellRegex.lastIndex = 0;
	}

	let durationSeconds: number | undefined;
	if (firstTimestamp && lastTimestamp) {
		durationSeconds = Math.round((new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime()) / 1000);
	}

	const sortedFiles = Array.from(filesModified).sort();

	return {
		assets: {
			pasteFiles: Array.from(pasteFiles).sort(),
			shellSnapshots: Array.from(shellSnapshots).sort(),
		},
		metadata: {
			messageCount,
			userMessageCount,
			assistantMessageCount,
			toolCallCount,
			sessionStartedAt: firstTimestamp,
			sessionEndedAt: lastTimestamp,
			durationSeconds,
			claudeModel,
			summary,
			filesModified: sortedFiles.length > 0 ? sortedFiles : undefined,
			filesModifiedCount: sortedFiles.length > 0 ? sortedFiles.length : undefined,
		},
	};
}
