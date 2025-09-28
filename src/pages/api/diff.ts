import type { APIRoute } from "astro";

export const prerender = false;

const token = import.meta.env.GITHUB_TOKEN;
const headers: Record<string, string> = token
  ? { Authorization: `token ${token}` }
  : {};

export const GET: APIRoute = async ({ url }) => {
  const repo = url.searchParams.get("repo") || "";
  const file = url.searchParams.get("file") || "";
  const since = url.searchParams.get("since") || "";

  if (!repo || !file || !since) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("Fetching diff for:", `${repo}/${file} since ${since}`);

  try {
    const commitsApiCall = `https://api.github.com/repos/${repo}/commits?path=${file}&since=${since}T00:00:00Z&per_page=100`;
    const commitsRes = await fetch(commitsApiCall, { headers });
    console.log(commitsApiCall);

    const commits = await commitsRes.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      const noDiffMessage = "No changes since given date.";
      return new Response(
        JSON.stringify({ commits: [], message: noDiffMessage }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=604800, s-maxage=604800",
            ETag: `"${Buffer.from(`${repo}|${file}|${since}|no-changes`).toString("base64")}"`,
            Vary: "Accept-Encoding",
          },
        }
      );
    }

    const commitDetails: {
      sha: string;
      message: string;
      date: string;
      url: string;
      author: string;
      authorUrl?: string;
      diff: string;
    }[] = [];

    for (const commit of commits.reverse()) {
      const commitApiCall = `https://api.github.com/repos/${repo}/commits/${commit.sha}`;
      const commitRes = await fetch(commitApiCall, { headers });
      console.log(commitApiCall);

      const commitJson = await commitRes.json();
      const fileEntry = commitJson.files?.find((f: any) => f.filename === file);

      if (!fileEntry?.patch) continue;

      let diffText = "";
      diffText += `diff --git a/${file} b/${file}\n`;
      diffText += `index ${fileEntry.sha || "0000000"}..${fileEntry.sha || "0000000"} 100644\n`;
      diffText += `--- a/${file}\n`;
      diffText += `+++ b/${file}\n`;
      diffText += fileEntry.patch + "\n";

      let authorName = "Unknown";
      let authorUrl: string | undefined = undefined;

      if (commitJson.commit?.author?.name) {
        authorName = commitJson.commit.author.name;
      }

      if (commitJson.author?.html_url) {
        authorUrl = commitJson.author.html_url;
      }

      commitDetails.push({
        sha: commit.sha,
        message: commitJson.commit?.message || "",
        date: commitJson.commit?.committer?.date || "",
        url: `https://github.com/${repo}/commit/${commit.sha}`,
        author: authorName,
        authorUrl,
        diff: diffText,
      });
    }

    if (commitDetails.length === 0) {
      return new Response(
        JSON.stringify({
          commits: [],
          message: "No diff available for this file.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=604800, s-maxage=604800",
            Vary: "Accept-Encoding",
          },
        }
      );
    }

    const firstCommitSha = commits[0]?.sha || "";
    const lastCommitSha = commits[commits.length - 1]?.sha || "";
    const etag = `"${Buffer.from(`${repo}|${file}|${since}|${firstCommitSha}|${lastCommitSha}`).toString("base64")}"`;

    return new Response(JSON.stringify({ commits: commitDetails }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=604800, s-maxage=604800",
        ETag: etag,
        Vary: "Accept-Encoding",
        "Last-Modified": new Date(
          commits[0]?.commit?.committer?.date || Date.now()
        ).toUTCString(),
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Error fetching diff", details: err.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
};
