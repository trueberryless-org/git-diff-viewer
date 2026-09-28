import { throwGitHubError } from "./error";
import { getRawFileUrl } from "./url";

export async function fetchRawFile(repo: string, ref: string, file: string) {
  const response = await fetch(getRawFileUrl(repo, ref, file));

  if (response.status === 404) return "";
  if (!response.ok) {
    throwGitHubError(
      `The content of ${file} at ${ref} could not be loaded (${response.status}).`,
      502
    );
  }

  return response.text();
}
