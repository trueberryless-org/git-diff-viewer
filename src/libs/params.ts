const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const LEADING_SLASHES_RE = /^\/+/;
const REPO_RE = /^(?!\.+\/)[\w.-]+\/(?!\.+$)[\w.-]+$/;

export function parseDiffParams(
  searchParams: URLSearchParams
): DiffParamsResult {
  const values = getDiffFormValues(searchParams);
  const { file, repo, since } = values;

  if (!repo && !file && !since) return { success: false, values };
  if (!REPO_RE.test(repo)) {
    return {
      success: false,
      values,
      error:
        "The repository must be in the owner/name format, e.g. withastro/docs.",
    };
  }
  if (!file)
    return { success: false, values, error: "A file path is required." };

  const sinceTimestamp = parseSinceTimestamp(since);
  if (!sinceTimestamp) {
    return {
      success: false,
      values,
      error: "The date must be in the YYYY-MM-DD format, e.g. 2025-01-31.",
    };
  }

  return {
    success: true,
    params: {
      file,
      repo,
      since,
      sideBySide: parseSideBySide(searchParams.get("sideBySide")),
      sinceTimestamp,
    },
  };
}

export function getDiffFormValues(
  searchParams: URLSearchParams
): DiffFormValues {
  return {
    file: (searchParams.get("file") ?? "")
      .trim()
      .replace(LEADING_SLASHES_RE, ""),
    repo: (searchParams.get("repo") ?? "").trim(),
    since: (searchParams.get("since") ?? "").trim(),
  };
}

export function parseSinceTimestamp(since: string): string | undefined {
  if (DATE_ONLY_RE.test(since)) {
    return isCalendarDate(since) ? `${since}T00:00:00Z` : undefined;
  }

  if (!ISO_DATE_TIME_RE.test(since) || !isCalendarDate(since.slice(0, 10))) {
    return;
  }

  const timestamp = Date.parse(since);

  return Number.isNaN(timestamp)
    ? undefined
    : new Date(timestamp).toISOString();
}

function parseSideBySide(value: string | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function isCalendarDate(date: string) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(timestamp) &&
    new Date(timestamp).toISOString().startsWith(date)
  );
}

export type DiffParamsResult =
  | { success: true; params: DiffParams }
  | { success: false; values: DiffFormValues; error?: string };

export interface DiffFormValues {
  file: string;
  repo: string;
  since: string;
}

export interface DiffParams extends DiffFormValues {
  sideBySide: boolean | undefined;
  sinceTimestamp: string;
}
