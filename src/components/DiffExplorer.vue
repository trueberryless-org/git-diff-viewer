<script setup lang="ts">
import { useColorScheme } from "../composables/color-scheme";
import { useDiffPreferences } from "../composables/preferences";
import type { Commit } from "../libs/commit";
import CommitList from "./CommitList.vue";
import DiffToolbar from "./DiffToolbar.vue";
import FileDiff from "./FileDiff.vue";

const {
  commits,
  file,
  hasMoreCommits,
  newContent,
  oldContent,
  repo,
  sideBySide,
} = defineProps<{
  commits: Commit[];
  file: string;
  hasMoreCommits: boolean;
  newContent: string;
  oldContent: string;
  repo: string;
  sideBySide: boolean | undefined;
}>();

const { viewMode, wrap } = useDiffPreferences(sideBySide);
const colorScheme = useColorScheme();
</script>

<template>
  <div class="explorer">
    <div class="toolbar">
      <DiffToolbar v-model:view-mode="viewMode" v-model:wrap="wrap" />
    </div>
    <FileDiff
      :color-scheme="colorScheme"
      :file="file"
      :new-content="newContent"
      :old-content="oldContent"
      :view-mode="viewMode"
      :wrap="wrap"
    />
    <CommitList
      :color-scheme="colorScheme"
      :commits="commits"
      :file="file"
      :has-more-commits="hasMoreCommits"
      :repo="repo"
      :view-mode="viewMode"
      :wrap="wrap"
    />
  </div>
</template>

<style scoped>
.explorer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  margin-block-end: -0.75rem;
  background: var(--gdv-bg);
  padding-block: 0.75rem;
}
</style>
