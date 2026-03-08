import { applyPatch, createPatch, parsePatch } from "diff";

/**
 * Fixes the diff format to ensure all lines within hunks have proper prefixes
 * Empty lines in added/removed sections need +/- prefixes for diff2html
 */
function fixDiffFormat(diffText: string): string {
  const lines = diffText.split("\n");
  const result: string[] = [];
  let inHunk = false;
  let lastOperation: "+" | "-" | " " | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we're entering a hunk
    if (line.startsWith("@@")) {
      inHunk = true;
      lastOperation = null;
      result.push(line);
      continue;
    }

    // Check if we're leaving a hunk (next diff header or end)
    if (
      line.startsWith("diff ") ||
      line.startsWith("---") ||
      line.startsWith("+++") ||
      line.startsWith("index ")
    ) {
      inHunk = false;
      lastOperation = null;
      result.push(line);
      continue;
    }

    if (!inHunk) {
      result.push(line);
      continue;
    }

    // We're in a hunk
    if (line === " ") {
      // Empty line - needs a prefix based on context
      // Look ahead to determine if we're in an addition or removal block
      let nextOp: string | null = null;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].length > 0 && !lines[j].startsWith("@@")) {
          nextOp = lines[j][0];
          break;
        }
      }

      // Use last operation or next operation to determine prefix
      const prefix: "+" | "-" | " " | null =
        lastOperation === "+" || nextOp === "+"
          ? "+"
          : lastOperation === "-" || nextOp === "-"
            ? "-"
            : " ";
      result.push(prefix);
      lastOperation = prefix;
    } else {
      const op = line[0];
      if (op === "+" || op === "-" || op === " ") {
        lastOperation = op;
        result.push(line);
      } else {
        // Line without prefix in a hunk - shouldn't happen, but handle it
        result.push(line);
      }
    }
  }

  return result.join("\n");
}

/**
 * Combines multiple unified diffs into a single diff using the 'diff' npm package
 *
 * Install with: npm install diff
 * Install types with: npm install --save-dev @types/diff
 */
export function combineUnifiedDiffs(diffTexts: string[]): string {
  if (diffTexts.length === 0) {
    return "";
  }

  if (diffTexts.length === 1) {
    return diffTexts[0];
  }

  try {
    // Parse all diffs first
    const parsedDiffs = diffTexts.map((text) => {
      const parsed = parsePatch(text);
      if (!parsed || parsed.length === 0) {
        throw new Error("Failed to parse diff");
      }
      return parsed[0];
    });

    const fileName =
      parsedDiffs[0].oldFileName?.replace(/^a\//, "") ||
      parsedDiffs[0].newFileName?.replace(/^b\//, "") ||
      "file";

    // Build the complete original file from the first diff
    const originalLines: string[] = [];
    let currentLine = 1;

    for (const hunk of parsedDiffs[0].hunks) {
      // Fill in any gaps before this hunk with empty context
      while (currentLine < hunk.oldStart) {
        originalLines.push("");
        currentLine++;
      }

      // Process hunk lines
      for (const line of hunk.lines) {
        const content = line.substring(1); // Remove the leading +, -, or space

        if (line[0] === "-" || line[0] === " ") {
          // This line exists in the original
          originalLines.push(content);
          currentLine++;
        }
        // '+' lines don't exist in original, skip
      }
    }

    // Now apply each diff sequentially
    let currentContent = originalLines.join("\n");

    for (let i = 0; i < parsedDiffs.length; i++) {
      const patch = parsedDiffs[i];

      // Try to apply the patch
      const result = applyPatch(currentContent, patch, {
        fuzzFactor: 2, // Allow some fuzziness in matching
        compareLine: (lineNumber, line, operation, patchContent) => {
          // Custom comparison to be more lenient
          if (line === patchContent) return true;
          // Trim and compare
          return line.trim() === patchContent.trim();
        },
      });

      if (result === false) {
        // If direct application fails, try a more manual approach
        console.warn(
          `Direct patch application failed for diff ${i}, trying manual approach`
        );
        currentContent = applyPatchManually(currentContent, patch);
      } else {
        currentContent = result;
      }
    }

    // Create the combined diff
    const combined = createPatch(
      fileName,
      originalLines.join("\n"),
      currentContent,
      "",
      ""
    );

    return combined;

    // Fix empty lines in the diff - they need proper prefixes
    return fixDiffFormat(combined);
  } catch (error) {
    console.error("Error combining diffs:", error);
    throw error;
  }
}

/**
 * Manually applies a patch when automatic application fails
 */
function applyPatchManually(content: string, patch: any): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let lineIdx = 0;

  for (const hunk of patch.hunks) {
    // Copy lines before this hunk
    while (lineIdx < hunk.oldStart - 1) {
      result.push(lines[lineIdx]);
      lineIdx++;
    }

    // Apply hunk changes
    let hunkLineIdx = 0;
    const hunkLines = hunk.lines;

    while (hunkLineIdx < hunkLines.length) {
      const line = hunkLines[hunkLineIdx];
      const op = line[0];
      const content = line.substring(1);

      if (op === " ") {
        // Context line
        result.push(lineIdx < lines.length ? lines[lineIdx] : content);
        lineIdx++;
        hunkLineIdx++;
      } else if (op === "-") {
        // Deletion - skip the line in original
        lineIdx++;
        hunkLineIdx++;
      } else if (op === "+") {
        // Addition - add the new line
        result.push(content);
        hunkLineIdx++;
      } else {
        hunkLineIdx++;
      }
    }
  }

  // Copy remaining lines
  while (lineIdx < lines.length) {
    result.push(lines[lineIdx]);
    lineIdx++;
  }

  return result.join("\n");
}

/**
 * Normalize diffs so that any blank lines right after a hunk header
 * become proper context lines (" ") and all affected hunk headers
 * (this hunk and subsequent hunks in the same file) are adjusted.
 *
 * This fixes the "Unknown line X" errors caused by inserting lines
 * without updating the @@ -a,b +c,d @@ numbers.
 */
export function normalizeHunkHeadersAndCounts(diffText: string): string {
  const lines = diffText.split(/\r?\n/);
  const out: string[] = [];

  // shifts for subsequent hunks within the current file
  let oldShift = 0;
  let newShift = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect file boundary to reset shifts:
    // - "diff " is obvious file separator
    // - or "--- <file>" followed by "+++ <file>" indicates file header -> new file
    if (line.startsWith("diff ")) {
      oldShift = 0;
      newShift = 0;
      out.push(line);
      continue;
    }
    if (
      line.startsWith("--- ") &&
      i + 1 < lines.length &&
      lines[i + 1].startsWith("+++ ")
    ) {
      oldShift = 0;
      newShift = 0;
      out.push(line);
      continue;
    }

    // Match hunk header:
    // Example: @@ -13,7 +13,7 @@ optional tail text...
    const hunkMatch = line.match(
      /^@@\s*-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s*@@(.*)$/
    );
    if (hunkMatch) {
      const oldStart = Number(hunkMatch[1]);
      const oldCountRaw = hunkMatch[2] ? Number(hunkMatch[2]) : 1;
      const newStart = Number(hunkMatch[3]);
      const newCountRaw = hunkMatch[4] ? Number(hunkMatch[4]) : 1;
      const tail = hunkMatch[5] ?? "";

      // Adjust the start positions by previously inserted lines
      const adjOldStart = oldStart + oldShift;
      const adjNewStart = newStart + newShift;

      let adjOldCount = oldCountRaw;
      let adjNewCount = newCountRaw;

      // Count contiguous illegal blank lines directly after this header
      let j = i + 1;
      let blankCount = 0;
      while (j < lines.length && lines[j] === "") {
        blankCount++;
        j++;
      }

      if (blankCount > 0) {
        // Convert these blanks to context lines: they exist in both old/new -> increase counts
        adjOldCount += blankCount;
        adjNewCount += blankCount;

        // Any later hunk start positions must be shifted as well
        oldShift += blankCount;
        newShift += blankCount;
      }

      // Push adjusted header
      out.push(
        `@@ -${adjOldStart},${adjOldCount} +${adjNewStart},${adjNewCount} @@${tail}`
      );

      // If we had blank lines, emit proper context lines (" ") instead of raw ""
      if (blankCount > 0) {
        for (let k = 0; k < blankCount; k++) {
          out.push(" "); // valid context line
        }
        // advance i past the original blank lines we consumed
        i += blankCount;
      }

      continue;
    }

    // Non-hunk line: just copy
    out.push(line);
  }

  return out.join("\n");
}
