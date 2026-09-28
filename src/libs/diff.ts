import { createTwoFilesPatch, structuredPatch } from "diff";

const ADDED_BLOCKS_SEPARATOR = "\n\n";
const FILE_LANG_ALIASES = new Map([
  ["astro", "html"],
  ["mdx", "markdown"],
  ["svelte", "html"],
]);
const LINE_BREAK_RE = /\r?\n/;
const WHITESPACE_ONLY_RE = /^\s*$/;

export function createFilePatch(
  file: string,
  oldContent: string,
  newContent: string
) {
  return createTwoFilesPatch(`a/${file}`, `b/${file}`, oldContent, newContent);
}

export function getAddedText(oldContent: string, newContent: string) {
  const { hunks } = structuredPatch("", "", oldContent, newContent, "", "", {
    context: 0,
  });

  return hunks
    .map(({ lines }) =>
      lines
        .filter((line) => line.startsWith("+"))
        .map((line) => line.slice(1))
        .join("\n")
    )
    .filter((block) => !WHITESPACE_ONLY_RE.test(block))
    .join(ADDED_BLOCKS_SEPARATOR);
}

export function getFileLines(
  oldContent: string,
  newContent: string
): FileLines {
  return {
    new: newContent.split(LINE_BREAK_RE),
    old: oldContent.split(LINE_BREAK_RE),
  };
}

export function getFileLang(file: string) {
  const extension =
    file.split("/").at(-1)?.split(".").at(-1)?.toLowerCase() ?? "";

  return FILE_LANG_ALIASES.get(extension) ?? extension;
}

export type DiffSide = "new" | "old";

export type FileLines = Record<DiffSide, string[]>;
