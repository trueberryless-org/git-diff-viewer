<script setup lang="ts">
import type { ViewMode } from "../composables/preferences";

const viewMode = defineModel<ViewMode>("viewMode", { required: true });
const wrap = defineModel<boolean>("wrap", { required: true });

const VIEW_MODES = [
  { label: "Unified", value: "unified" },
  { label: "Split", value: "split" },
] as const satisfies { label: string; value: ViewMode }[];
</script>

<template>
  <div class="toolbar">
    <div class="segmented" role="group" aria-label="Diff layout">
      <button
        v-for="mode in VIEW_MODES"
        :key="mode.value"
        type="button"
        :aria-pressed="viewMode === mode.value"
        @click="viewMode = mode.value"
      >
        {{ mode.label }}
      </button>
    </div>
    <label class="checkbox">
      <input v-model="wrap" type="checkbox" />
      Wrap lines
    </label>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}

.segmented {
  display: inline-flex;
  border: 1px solid var(--gdv-border);
  border-radius: 0.375rem;
  padding: 0.125rem;
}

.segmented button {
  border: 0;
  border-radius: 0.25rem;
  background: transparent;
  padding: 0.25rem 0.75rem;
  color: var(--gdv-muted);
}

.segmented button:hover {
  color: var(--gdv-fg);
}

.segmented button[aria-pressed="true"] {
  background: var(--gdv-surface-strong);
  color: var(--gdv-fg);
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  color: var(--gdv-muted);
}

.checkbox input {
  accent-color: var(--gdv-accent);
  margin: 0;
}
</style>
