export class GitHubError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

export function throwGitHubError(message: string, status: number): never {
  throw new GitHubError(message, status);
}

export function getErrorStatus(error: unknown) {
  return error instanceof GitHubError ? error.status : 500;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof GitHubError) return error.message;

  return "Something went wrong while loading the diff. Please try again later.";
}
