<script setup lang="ts">
import { computed, ref } from "vue";

import type { ColorScheme } from "../composables/color-scheme";
import type { ViewMode } from "../composables/preferences";
import { type Commit, getCommitTitle, getShortSha } from "../libs/commit";
import { fetchRawFile } from "../libs/content";
import { getErrorMessage } from "../libs/error";
import FileDiff from "./FileDiff.vue";

const { colorScheme, commit, file, repo, viewMode, wrap } = defineProps<{
  colorScheme: ColorScheme;
  commit: Commit;
  file: string;
  repo: string;
  viewMode: ViewMode;
  wrap: boolean;
}>();

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

const isOpen = ref(false);
const versions = ref<{ newContent: string; oldContent: string }>();
const error = ref<string>();

const title = computed(() => getCommitTitle(commit));
const date = computed(() =>
  commit.date ? DATE_FORMAT.format(new Date(commit.date)) : ""
);
const diffId = computed(() => `commit-${commit.sha}`);

async function toggleCommitDiff() {
  isOpen.value = !isOpen.value;
  if (!isOpen.value || versions.value) return;

  error.value = undefined;

  try {
    const [oldContent, newContent] = await Promise.all([
      commit.parentSha ? fetchRawFile(repo, commit.parentSha, file) : "",
      fetchRawFile(repo, commit.sha, file),
    ]);
    versions.value = { newContent, oldContent };
  } catch (e) {
    error.value = getErrorMessage(e);
  }
}
</script>

<template>
  <li class="commit">
    <div class="commit-row">
      <button
        type="button"
        class="toggle"
        :aria-expanded="isOpen"
        :aria-controls="diffId"
        :title="commit.message"
        @click="toggleCommitDiff"
      >
        <svg
          class="chevron"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          aria-hidden="true"
        >
          <path
            d="M6 3l5 5-5 5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
        <span class="title">{{ title }}</span>
      </button>
      <span class="meta">
        <a v-if="commit.authorUrl" :href="commit.authorUrl">{{
          commit.author
        }}</a>
        <span v-else>{{ commit.author }}</span>
        <time v-if="date" :datetime="commit.date">{{ date }}</time>
        <a class="sha" :href="commit.url">{{ getShortSha(commit.sha) }}</a>
      </span>
    </div>
    <div v-if="isOpen" :id="diffId" class="commit-diff">
      <p v-if="error" class="message" role="alert">{{ error }}</p>
      <FileDiff
        v-else-if="versions"
        :color-scheme="colorScheme"
        :file="file"
        :new-content="versions.newContent"
        :old-content="versions.oldContent"
        :view-mode="viewMode"
        :wrap="wrap"
      />
      <p v-else class="message">Loading…</p>
    </div>
  </li>
</template>

<style scoped>
.commit + .commit {
  border-block-start: 1px solid var(--gdv-border);
}

.commit-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 1rem;
  padding: 0.5rem 0.75rem;
}

.toggle {
  display: inline-flex;
  flex: 1 1 20rem;
  align-items: center;
  gap: 0.5rem;
  border: 0;
  background: transparent;
  padding: 0;
  min-width: 0;
  color: var(--gdv-fg);
  text-align: start;
}

.toggle:hover .title {
  text-decoration: underline;
}

.chevron {
  flex-shrink: 0;
  transition: transform 0.15s;
  color: var(--gdv-muted);
}

.toggle[aria-expanded="true"] .chevron {
  transform: rotate(90deg);
}

.title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  color: var(--gdv-muted);
  font-size: 0.875rem;
}

.meta a {
  color: inherit;
}

.sha {
  font-family: var(--gdv-font-mono);
}

.commit-diff {
  padding: 0 0.75rem 0.75rem;
}

.message {
  margin: 0;
  color: var(--gdv-muted);
}

@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}
</style>
