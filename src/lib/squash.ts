type FileContentMap = Record<string, string[]>;

/**
 * Apply a unified diff to a file content map
 */
function applyUnifiedDiff(
  diff: string,
  baseFiles: FileContentMap
): FileContentMap {
  const files = { ...baseFiles };
  const lines = diff.split("\n");

  let currentFile = "";
  let oldLineNum = 0;
  let newLineNum = 0;
  let inHunk = false;

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6).trim();
      if (!files[currentFile]) files[currentFile] = []; // initialize if missing
    } else if (line.startsWith("@@")) {
      inHunk = true;
      const match = /@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/.exec(line);
      if (!match) throw new Error("Invalid hunk header: " + line);
      oldLineNum = parseInt(match[1], 10) - 1;
      newLineNum = parseInt(match[3], 10) - 1;
    } else if (inHunk && currentFile) {
      const fileLines = files[currentFile];
      if (line.startsWith("+")) {
        fileLines.splice(newLineNum, 0, line.slice(1));
        newLineNum++;
      } else if (line.startsWith("-")) {
        fileLines.splice(newLineNum, 1);
      } else if (line.startsWith(" ")) {
        newLineNum++;
      }
    }
  }

  return files;
}

/**
 * Generate a simple unified diff between two arrays of strings
 */
function generateUnifiedDiff(
  fileName: string,
  original: string[],
  modified: string[]
): string {
  const diffLines: string[] = [];
  diffLines.push(`diff --git a/${fileName} b/${fileName}`);
  diffLines.push(`--- a/${fileName}`);
  diffLines.push(`+++ b/${fileName}`);

  let i = 0;
  while (i < Math.max(original.length, modified.length)) {
    const oLine = original[i] ?? "";
    const mLine = modified[i] ?? "";
    if (oLine !== mLine) {
      const hunkStart = i + 1;
      const hunkOld: string[] = [];
      const hunkNew: string[] = [];

      while (
        i < Math.max(original.length, modified.length) &&
        (original[i] ?? "") !== (modified[i] ?? "")
      ) {
        if (original[i] !== undefined) hunkOld.push("-" + original[i]);
        if (modified[i] !== undefined) hunkNew.push("+" + modified[i]);
        i++;
      }

      diffLines.push(
        `@@ -${hunkStart},${hunkOld.length} +${hunkStart},${hunkNew.length} @@`
      );
      diffLines.push(...hunkOld, ...hunkNew);
    } else {
      i++;
    }
  }

  return diffLines.join("\n");
}

/**
 * Main squash function
 */
export function squashDiffs(
  diffs: string[],
  originalFiles: FileContentMap
): Record<string, string> {
  let files: FileContentMap = { ...originalFiles };

  for (const diff of diffs) {
    files = applyUnifiedDiff(diff, files);
  }

  const result: Record<string, string> = {};
  for (const fileName in files) {
    const original = originalFiles[fileName] ?? []; // fallback to empty array
    const modified = files[fileName];
    result[fileName] = generateUnifiedDiff(fileName, original, modified);
  }

  return result;
}
