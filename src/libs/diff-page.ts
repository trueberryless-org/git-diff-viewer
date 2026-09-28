import { GitHubError, getErrorMessage, getErrorStatus } from "./error";
import { type FileHistory, getFileHistory } from "./github";
import {
  type DiffFormValues,
  type DiffParams,
  parseDiffParams,
} from "./params";
import { getCompareUrl, getFileUrl, getRepoUrl } from "./url";

export async function loadDiffPage(
  searchParams: URLSearchParams
): Promise<DiffPage> {
  const result = parseDiffParams(searchParams);

  if (!result.success) {
    return {
      error: result.error,
      status: result.error ? 400 : 200,
      type: "form",
      values: result.values,
    };
  }

  try {
    const history = await getFileHistory(result.params);
    return {
      history,
      links: getDiffLinks(result.params, history),
      params: result.params,
      type: "diff",
    };
  } catch (error) {
    if (!(error instanceof GitHubError))
      console.error("[git-diff-viewer] Failed to load the diff.", error);
    return {
      error: getErrorMessage(error),
      status: getErrorStatus(error),
      type: "form",
      values: result.params,
    };
  }
}

export function getDiffLinks(
  { file, repo }: DiffParams,
  { baseCommit, commits }: FileHistory
): DiffLinks {
  const headSha = commits[0]?.sha ?? baseCommit?.sha ?? "HEAD";

  return {
    compare:
      baseCommit && commits[0]
        ? getCompareUrl(repo, baseCommit.sha, commits[0].sha)
        : undefined,
    file: getFileUrl(repo, headSha, file),
    repo: getRepoUrl(repo),
  };
}

export type DiffPage =
  | { history: FileHistory; links: DiffLinks; params: DiffParams; type: "diff" }
  | {
      error: string | undefined;
      status: number;
      type: "form";
      values: DiffFormValues;
    };

interface DiffLinks {
  compare: string | undefined;
  file: string;
  repo: string;
}
