import type { APIRoute } from "astro";

import { GitHubError, getErrorMessage, getErrorStatus } from "../../libs/error";
import { getFileHistory } from "../../libs/github";
import { parseDiffParams } from "../../libs/params";

export const GET: APIRoute = async ({ cache, url }) => {
  const result = parseDiffParams(url.searchParams);

  if (!result.success) {
    return createErrorResponse(
      result.error ?? "The repo, file and since parameters are required.",
      400,
      cache
    );
  }

  try {
    const { baseCommit, commits, hasMoreCommits, newContent, oldContent } =
      await getFileHistory(result.params);
    return Response.json({
      baseCommit,
      commits,
      hasMoreCommits,
      newContent,
      oldContent,
    });
  } catch (error) {
    if (!(error instanceof GitHubError))
      console.error("[git-diff-viewer] Failed to load the diff.", error);
    return createErrorResponse(
      getErrorMessage(error),
      getErrorStatus(error),
      cache
    );
  }
};

function createErrorResponse(
  error: string,
  status: number,
  cache: Parameters<APIRoute>[0]["cache"]
) {
  if (cache.enabled) cache.set(false);

  return Response.json({ error }, { status });
}
