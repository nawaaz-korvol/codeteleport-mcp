/**
 * Encode a filesystem path the way Claude Code does for project directories.
 * e.g. "/Users/alice/myproject" → "-Users-alice-myproject"
 */
export function encodePath(fsPath: string): string {
	return fsPath.replace(/\//g, "-");
}

/**
 * Rewrite all occurrences of sourceUserDir to targetUserDir in a string.
 * This is the core path-rewriting logic that makes sessions portable.
 */
export function rewritePaths(content: string, sourceUserDir: string, targetUserDir: string): string {
	return content.split(sourceUserDir).join(targetUserDir);
}
