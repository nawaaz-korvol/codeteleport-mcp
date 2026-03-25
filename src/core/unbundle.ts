import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";
import type { UnbundleOptions, UnbundleResult } from "../shared/types";
import { encodePath, rewritePaths } from "./paths";

export async function unbundleSession(options: UnbundleOptions): Promise<UnbundleResult> {
	const { bundlePath } = options;
	const targetUserDir = options.targetUserDir ?? os.homedir();
	const targetClaudeDir = options.claudeDir ?? path.join(targetUserDir, ".claude");

	const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "codeteleport-unpack-"));

	try {
		await tar.extract({ file: bundlePath, cwd: stagingDir });

		// Read meta.json
		const metaPath = path.join(stagingDir, "meta.json");
		if (!fs.existsSync(metaPath)) {
			throw new Error("meta.json not found in bundle — is this a valid CodeTeleport bundle?");
		}
		const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
		const { sessionId, sourceCwd, sourceUserDir } = meta;

		// Calculate target paths
		const targetCwd = sourceCwd.replace(sourceUserDir, targetUserDir);
		const targetCwdEncoded = encodePath(targetCwd);
		const targetProjDir = path.join(targetClaudeDir, "projects", targetCwdEncoded);

		fs.mkdirSync(targetProjDir, { recursive: true });

		// 1. Install session JSONL with path rewriting
		const jsonlContent = fs.readFileSync(path.join(stagingDir, "session.jsonl"), "utf-8");
		const rewrittenJsonl = rewritePaths(jsonlContent, sourceUserDir, targetUserDir);
		fs.writeFileSync(path.join(targetProjDir, `${sessionId}.jsonl`), rewrittenJsonl);

		// 2. Install session subdirectory with path rewriting in JSONL files
		const sessionSubdir = path.join(stagingDir, "session-subdir");
		if (fs.existsSync(sessionSubdir)) {
			const targetSubdir = path.join(targetProjDir, sessionId);
			fs.cpSync(sessionSubdir, targetSubdir, { recursive: true });
			rewriteJsonlFilesInDir(targetSubdir, sourceUserDir, targetUserDir);
		}

		// 3. Install file-history
		const fileHistoryDir = path.join(stagingDir, "file-history");
		if (fs.existsSync(fileHistoryDir)) {
			const targetFH = path.join(targetClaudeDir, "file-history", sessionId);
			fs.mkdirSync(path.dirname(targetFH), { recursive: true });
			fs.cpSync(fileHistoryDir, targetFH, { recursive: true });
		}

		// 4. Install session-env
		const sessionEnvDir = path.join(stagingDir, "session-env");
		if (fs.existsSync(sessionEnvDir)) {
			const targetSE = path.join(targetClaudeDir, "session-env", sessionId);
			fs.mkdirSync(path.dirname(targetSE), { recursive: true });
			fs.cpSync(sessionEnvDir, targetSE, { recursive: true });
		}

		// 5. Install paste-cache files
		const pasteCacheDir = path.join(stagingDir, "paste-cache");
		if (fs.existsSync(pasteCacheDir)) {
			const targetPC = path.join(targetClaudeDir, "paste-cache");
			fs.mkdirSync(targetPC, { recursive: true });
			for (const fname of fs.readdirSync(pasteCacheDir)) {
				fs.copyFileSync(path.join(pasteCacheDir, fname), path.join(targetPC, fname));
			}
		}

		// 6. Install shell-snapshots
		const shellDir = path.join(stagingDir, "shell-snapshots");
		if (fs.existsSync(shellDir)) {
			const targetSS = path.join(targetClaudeDir, "shell-snapshots");
			fs.mkdirSync(targetSS, { recursive: true });
			for (const fname of fs.readdirSync(shellDir)) {
				fs.copyFileSync(path.join(shellDir, fname), path.join(targetSS, fname));
			}
		}

		return {
			sessionId,
			installedTo: targetProjDir,
			resumeCommand: `claude --resume ${sessionId}`,
		};
	} finally {
		fs.rmSync(stagingDir, { recursive: true, force: true });
	}
}

function rewriteJsonlFilesInDir(dir: string, sourceUserDir: string, targetUserDir: string): void {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			rewriteJsonlFilesInDir(fullPath, sourceUserDir, targetUserDir);
		} else if (entry.name.endsWith(".jsonl")) {
			const content = fs.readFileSync(fullPath, "utf-8");
			const rewritten = rewritePaths(content, sourceUserDir, targetUserDir);
			fs.writeFileSync(fullPath, rewritten);
		}
	}
}
