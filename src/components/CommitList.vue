<script setup lang="ts">
import type { ColorScheme } from "../composables/color-scheme";
import type { ViewMode } from "../composables/preferences";
import type { Commit } from "../libs/commit";
import CommitItem from "./CommitItem.vue";

const { colorScheme, commits, file, hasMoreCommits, repo, viewMode, wrap } =
  defineProps<{
    colorScheme: ColorScheme;
    commits: Commit[];
    file: string;
    hasMoreCommits: boolean;
    repo: string;
    viewMode: ViewMode;
    wrap: boolean;
  }>();
</script>

<template>
  <section class="commits" aria-labelledby="commits-heading">
    <h2 id="commits-heading">Commits</h2>
    <p v-if="hasMoreCommits" class="note">
      Only the latest {{ commits.length }} commits are listed.
    </p>
    <ol>
      <CommitItem
        v-for="commit in commits"
        :key="commit.sha"
        :color-scheme="colorScheme"
        :commit="commit"
        :file="file"
        :repo="repo"
        :view-mode="viewMode"
        :wrap="wrap"
      />
    </ol>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.note {
  margin: 0 0 0.75rem;
  color: var(--gdv-muted);
  font-size: 0.875rem;
}

ol {
  margin: 0;
  border: 1px solid var(--gdv-border);
  border-radius: 0.375rem;
  padding: 0;
  list-style: none;
}
</style>
