import { onScopeDispose, ref } from "vue";

const COPY_FEEDBACK_DURATION = 2000;

export function useClipboard() {
  const copyFeedback = ref<CopyFeedback>();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showCopyFeedback({ id, status: "copied" });
    } catch {
      showCopyFeedback({ id, status: "failed" });
    }
  }

  function getCopyLabel(id: string, label: string) {
    if (copyFeedback.value?.id !== id) return label;

    return copyFeedback.value.status === "copied" ? "Copied" : "Copy failed";
  }

  function showCopyFeedback(feedback: CopyFeedback) {
    copyFeedback.value = feedback;
    clearTimeout(timeout);
    timeout = setTimeout(
      () => (copyFeedback.value = undefined),
      COPY_FEEDBACK_DURATION
    );
  }

  onScopeDispose(() => clearTimeout(timeout));

  return { copy, getCopyLabel };
}

interface CopyFeedback {
  id: string;
  status: "copied" | "failed";
}
