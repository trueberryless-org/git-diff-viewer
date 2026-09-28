<script setup lang="ts">
import { DiffModeEnum, DiffView } from "@git-diff-view/vue";
import "@git-diff-view/vue/styles/diff-view.css";
import { computed, ref, watch } from "vue";

import { useClipboard } from "../composables/clipboard";
import type { ColorScheme } from "../composables/color-scheme";
import { useFileDiff } from "../composables/file-diff";
import type { ViewMode } from "../composables/preferences";

const { colorScheme, file, newContent, oldContent, viewMode, wrap } =
  defineProps<{
    colorScheme: ColorScheme;
    file: string;
    newContent: string;
    oldContent: string;
    viewMode: ViewMode;
    wrap: boolean;
  }>();

const { diffFile, hasChanges, patch } = useFileDiff(() => ({
  file,
  newContent,
  oldContent,
}));
const { copy, getCopyLabel } = useClipboard();

const isExpanded = ref(false);
const canExpand = computed(() => diffFile.value.hasSomeLineCollapsed);
const diffViewMode = computed(() =>
  viewMode === "split" ? DiffModeEnum.Split : DiffModeEnum.Unified
);

watch(diffFile, () => (isExpanded.value = false));

function toggleExpandedLines() {
  for (const mode of ["split", "unified"] as const) {
    if (isExpanded.value) {
      diffFile.value.onAllCollapse(mode);
    } else {
      diffFile.value.onAllExpand(mode);
    }
  }

  isExpanded.value = !isExpanded.value;
}
</script>

<template>
  <div class="file-diff">
    <div class="file-diff-header">
      <span class="stats">
        <span class="additions">+{{ diffFile.additionLength }}</span>
        <span class="deletions">−{{ diffFile.deletionLength }}</span>
      </span>
      <div class="actions">
        <button v-if="canExpand" type="button" @click="toggleExpandedLines">
          {{ isExpanded ? "Collapse unchanged" : "Expand all" }}
        </button>
        <button
          type="button"
          title="Copy the changes as a unified diff"
          @click="copy('patch', patch)"
        >
          {{ getCopyLabel("patch", "Copy patch") }}
        </button>
        <button
          type="button"
          title="Copy the full content of the newer version"
          @click="copy('file', newContent)"
        >
          {{ getCopyLabel("file", "Copy file") }}
        </button>
      </div>
    </div>
    <DiffView
      v-if="hasChanges"
      :diff-file="diffFile"
      :diff-view-mode="diffViewMode"
      :diff-view-theme="colorScheme"
      :diff-view-wrap="wrap"
      :diff-view-highlight="true"
      :diff-view-font-size="13"
    />
    <p v-else class="empty">The content of this file did not change.</p>
  </div>
</template>

<style scoped>
.file-diff {
  border: 1px solid var(--gdv-border);
  border-radius: 0.375rem;
  overflow: hidden;
}

.file-diff-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  border-block-end: 1px solid var(--gdv-border);
  background: var(--gdv-surface);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.stats {
  display: inline-flex;
  gap: 0.5rem;
  font-family: var(--gdv-font-mono);
  font-variant-numeric: tabular-nums;
}

.additions {
  color: var(--gdv-add);
}

.deletions {
  color: var(--gdv-del);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-inline-start: auto;
}

.empty {
  margin: 0;
  padding: 1rem 0.75rem;
  color: var(--gdv-muted);
}
</style>
