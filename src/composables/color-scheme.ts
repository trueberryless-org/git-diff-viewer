import { onScopeDispose, ref } from "vue";

const DARK_COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function useColorScheme() {
  const mediaQuery = matchMedia(DARK_COLOR_SCHEME_QUERY);
  const colorScheme = ref(getColorScheme(mediaQuery.matches));

  function updateColorScheme(event: MediaQueryListEvent) {
    colorScheme.value = getColorScheme(event.matches);
  }

  mediaQuery.addEventListener("change", updateColorScheme);
  onScopeDispose(() =>
    mediaQuery.removeEventListener("change", updateColorScheme)
  );

  return colorScheme;
}

function getColorScheme(isDark: boolean): ColorScheme {
  return isDark ? "dark" : "light";
}

export type ColorScheme = "dark" | "light";
