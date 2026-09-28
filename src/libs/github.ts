import { GITHUB_TOKEN } from "astro:env/server";

import type { Commit } from "./commit";
import { fetchRawFile } from "./content";
import { throwGitHubError } from "./error";
import type { DiffParams } from "./params";
import { getCommitUrl } from "./url";

const GITHUB_API_URL = "https://api.github.com";
const MAX_COMMITS = 100;

export async function getFileHistory({
  file,
  repo,
  sinceTimestamp,
}: DiffParams): Promise<FileHistory> {
  const [baseCommits, commits] = await Promise.all([
    fetchCommits(repo, { path: file, per_page: "1", until: sinceTimestamp }),
    fetchCommits(repo, {
      path: file,
      per_page: String(MAX_COMMITS),
      since: sinceTimestamp,
    }),
  ]);

  const baseCommit = baseCommits[0];
  const headCommit = commits[0];

  if (!baseCommit && !headCommit) {
    throwGitHubError(
      `No commits touching ${file} were found in ${repo}. Check the file path.`,
      404
    );
  }

  const [oldContent, newContent] = await Promise.all([
    baseCommit ? fetchRawFile(repo, baseCommit.sha, file) : "",
    headCommit ? fetchRawFile(repo, headCommit.sha, file) : undefined,
  ]);

  return {
    baseCommit,
    commits,
    hasMoreCommits: commits.length === MAX_COMMITS,
    newContent: newContent ?? oldContent,
    oldContent,
  };
}

async function fetchCommits(repo: string, query: Record<string, string>) {
  const url = `${GITHUB_API_URL}/repos/${repo}/commits?${new URLSearchParams(query)}`;
  const response = await fetch(url, { headers: getGitHubHeaders() });

  if (!response.ok) throwGitHubResponseError(response, repo);

  const commits = (await response.json()) as GitHubCommit[];

  return commits.map((commit) => githubCommitToCommit(repo, commit));
}

function getGitHubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "git-diff-viewer",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;

  return headers;
}

function throwGitHubResponseError(response: Response, repo: string): never {
  if (response.status === 404) {
    throwGitHubError(
      `The repository ${repo} could not be found. Make sure it exists and is public.`,
      404
    );
  }

  if (isRateLimited(response)) {
    throwGitHubError(
      "The GitHub API rate limit has been reached. Please try again later.",
      429
    );
  }

  throwGitHubError(
    `The GitHub API responded with an unexpected error (${response.status} ${response.statusText}).`,
    502
  );
}

function isRateLimited(response: Response) {
  return (
    response.status === 429 ||
    (response.status === 403 &&
      response.headers.get("x-ratelimit-remaining") === "0")
  );
}

function githubCommitToCommit(
  repo: string,
  { author, commit, parents, sha }: GitHubCommit
): Commit {
  return {
    author: author?.login ?? commit.author?.name ?? "Unknown",
    date: commit.committer?.date ?? commit.author?.date ?? "",
    message: commit.message,
    parentSha: parents[0]?.sha,
    sha,
    url: getCommitUrl(repo, sha),
    ...(author?.html_url ? { authorUrl: author.html_url } : {}),
  };
}

export interface FileHistory {
  baseCommit: Commit | undefined;
  commits: Commit[];
  hasMoreCommits: boolean;
  newContent: string;
  oldContent: string;
}

interface GitHubCommit {
  author: { html_url?: string; login?: string } | null;
  commit: {
    author: { date?: string; name?: string } | null;
    committer: { date?: string } | null;
    message: string;
  };
  parents: { sha: string }[];
  sha: string;
}
