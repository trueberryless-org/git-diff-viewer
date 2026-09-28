const GITHUB_HOSTNAMES = new Set(["github.com", "www.github.com"]);
const GITHUB_FILE_ROUTES = new Set(["blob", "commits", "edit", "raw"]);
const GITHUB_RAW_URL = "https://raw.githubusercontent.com";
const GITHUB_URL = "https://github.com";

export function getRepoUrl(repo: string) {
  return `${GITHUB_URL}/${repo}`;
}

export function getFileUrl(repo: string, ref: string, file: string) {
  return `${GITHUB_URL}/${repo}/blob/${ref}/${encodeFilePath(file)}`;
}

export function getCommitUrl(repo: string, sha: string) {
  return `${GITHUB_URL}/${repo}/commit/${sha}`;
}

export function getCompareUrl(repo: string, baseSha: string, headSha: string) {
  return `${GITHUB_URL}/${repo}/compare/${baseSha}...${headSha}`;
}

export function getRawFileUrl(repo: string, ref: string, file: string) {
  return `${GITHUB_RAW_URL}/${repo}/${ref}/${encodeFilePath(file)}`;
}

export function parseGitHubFileUrl(
  value: string
): GitHubFileLocation | undefined {
  const url = URL.parse(value.trim());
  if (!url || !GITHUB_HOSTNAMES.has(url.hostname)) return;

  const [owner, name, route, _ref, ...pathSegments] = url.pathname
    .split("/")
    .filter(Boolean);
  if (!owner || !name) return;

  const repo = `${owner}/${name}`;
  if (
    !route ||
    !GITHUB_FILE_ROUTES.has(route) ||
    !_ref ||
    pathSegments.length === 0
  )
    return { repo };

  const since = url.searchParams.get("since")?.split("T")[0];
  const file = pathSegments
    .map((segment) => decodeURIComponent(segment))
    .join("/");

  return since ? { file, repo, since } : { file, repo };
}

function encodeFilePath(file: string) {
  return file.split("/").map(encodeURIComponent).join("/");
}

export interface GitHubFileLocation {
  file?: string;
  repo: string;
  since?: string;
}
