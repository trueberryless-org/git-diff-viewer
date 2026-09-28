import { DiffFile } from "@git-diff-view/vue";
import { type MaybeRefOrGetter, computed, toValue } from "vue";

import {
  createFilePatch,
  getAddedText,
  getFileLang,
  getFileLines,
} from "../libs/diff";

export function useFileDiff(source: MaybeRefOrGetter<FileVersions>) {
  const patch = computed(() => {
    const { file, newContent, oldContent } = toValue(source);
    return createFilePatch(file, oldContent, newContent);
  });

  const diffFile = computed(() => {
    const { file, newContent, oldContent } = toValue(source);
    return createDiffFile(file, oldContent, newContent, patch.value);
  });

  const hasChanges = computed(
    () => diffFile.value.additionLength + diffFile.value.deletionLength > 0
  );

  const addedText = computed(() => {
    const { newContent, oldContent } = toValue(source);
    return getAddedText(oldContent, newContent);
  });

  const fileLines = computed(() => {
    const { newContent, oldContent } = toValue(source);
    return getFileLines(oldContent, newContent);
  });

  return { addedText, diffFile, fileLines, hasChanges, patch };
}

function createDiffFile(
  file: string,
  oldContent: string,
  newContent: string,
  patch: string
) {
  const fileLang = getFileLang(file);
  const diffFile = DiffFile.createInstance({
    hunks: [patch],
    newFile: { content: newContent, fileLang, fileName: file },
    oldFile: { content: oldContent, fileLang, fileName: file },
  });

  diffFile.init();
  diffFile.buildSplitDiffLines();
  diffFile.buildUnifiedDiffLines();

  return diffFile;
}

export interface FileVersions {
  file: string;
  newContent: string;
  oldContent: string;
}
