import { ref, watch } from "vue";

const SIDE_BY_SIDE_PARAM = "sideBySide";
const STORAGE_KEY = "git-diff-viewer:preferences";

export function useDiffPreferences(sideBySide: boolean | undefined) {
  const storedPreferences = readStoredPreferences();

  const viewMode = ref<ViewMode>(
    resolveViewMode(sideBySide, storedPreferences.viewMode)
  );
  const wrap = ref(storedPreferences.wrap ?? true);

  watch([viewMode, wrap], () => {
    storePreferences({ viewMode: viewMode.value, wrap: wrap.value });
    updateSideBySideParam(viewMode.value);
  });

  return { viewMode, wrap };
}

function resolveViewMode(
  sideBySide: boolean | undefined,
  storedViewMode: ViewMode | undefined
): ViewMode {
  if (sideBySide !== undefined) return sideBySide ? "split" : "unified";

  return storedViewMode ?? "unified";
}

function readStoredPreferences(): Partial<Preferences> {
  try {
    const preferences: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}"
    );
    return isPreferences(preferences) ? preferences : {};
  } catch {
    return {};
  }
}

function isPreferences(value: unknown): value is Partial<Preferences> {
  return typeof value === "object" && value !== null;
}

function storePreferences(preferences: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    return;
  }
}

function updateSideBySideParam(viewMode: ViewMode) {
  const url = new URL(location.href);

  if (viewMode === "split") {
    url.searchParams.set(SIDE_BY_SIDE_PARAM, "true");
  } else {
    url.searchParams.delete(SIDE_BY_SIDE_PARAM);
  }

  history.replaceState(history.state, "", url);
}

export type ViewMode = "split" | "unified";

interface Preferences {
  viewMode: ViewMode;
  wrap: boolean;
}
