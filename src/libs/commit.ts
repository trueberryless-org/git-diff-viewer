const SHORT_SHA_LENGTH = 7;

export function getCommitTitle(commit: Commit) {
  return commit.message.split("\n", 1)[0] ?? "";
}

export function getShortSha(sha: string) {
  return sha.slice(0, SHORT_SHA_LENGTH);
}

export interface Commit {
  author: string;
  authorUrl?: string;
  date: string;
  message: string;
  parentSha: string | undefined;
  sha: string;
  url: string;
}
