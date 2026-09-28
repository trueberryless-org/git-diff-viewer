# Git Diff Viewer

[![Built with Astro](https://astro.badg.es/v2/built-with-astro/tiny.svg)](https://astro.build)
[![Netlify Status](https://api.netlify.com/api/v1/badges/902756b9-6076-47f8-9a37-c9ac21098016/deploy-status)](https://app.netlify.com/projects/git-diff-viewer/deploys)

View the diff of a file in a public GitHub repository since a specific date: [git-diff-viewer.netlify.app](https://git-diff-viewer.netlify.app)

The page shows the combined changes between the last version of the file before the date and its latest version, followed by every commit that changed the file since, each with its own diff.

## URL parameters

The diff page is linked to by the [Lunaria Diff Viewer](https://github.com/trueberryless-org/lunaria-diff-extension) browser extension, so these parameters must stay stable:

```
https://git-diff-viewer.netlify.app/diff?repo=withastro/docs&file=src/content/docs/en/getting-started.mdx&since=2025-01-01
```

| Parameter    | Description                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `repo`       | The repository in the `owner/name` format.                                                      |
| `file`       | The path of the file in the repository.                                                         |
| `since`      | The date in the `YYYY-MM-DD` format. Full ISO 8601 timestamps are also accepted.                |
| `sideBySide` | Optional. `true` shows a split diff and `false` a unified diff. Defaults to the last used view. |

The same parameters are accepted by the `/api/diff` endpoint, which returns the data as JSON.

## Development

```sh
pnpm install
pnpm dev
```

Set a `GITHUB_TOKEN` in a `.env` file to raise the GitHub API rate limit.
