import { createTwoFilesPatch } from "diff";

const FILE_LANG_ALIASES = new Map([
  ["astro", "html"],
  ["mdx", "markdown"],
  ["svelte", "html"],
]);

export function createFilePatch(
  file: string,
  oldContent: string,
  newContent: string
) {
  return createTwoFilesPatch(`a/${file}`, `b/${file}`, oldContent, newContent);
}

export function getFileLang(file: string) {
  const extension =
    file.split("/").at(-1)?.split(".").at(-1)?.toLowerCase() ?? "";

  return FILE_LANG_ALIASES.get(extension) ?? extension;
}
