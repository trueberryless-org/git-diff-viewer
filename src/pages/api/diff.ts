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
    // 1. Get all commits affecting this file since date
    const commitsApiCall = `https://api.github.com/repos/${repo}/commits?path=${file}&since=${since}T00:00:00Z&per_page=100`;
    const commitsRes = await fetch(commitsApiCall, { headers });
    console.log(commitsApiCall);
    
    const commits = await commitsRes.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      const noDiffMessage = "No changes since given date.";
      return new Response(
        JSON.stringify({ diff: noDiffMessage }),
        { 
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            // Cache for 1 week (604800 seconds)
            "Cache-Control": "public, max-age=604800, s-maxage=604800",
            // Add ETag for better cache validation
            "ETag": `"${Buffer.from(`${repo}|${file}|${since}|no-changes`).toString('base64')}"`,
            // Vary header to ensure proper caching per query params
            "Vary": "Accept-Encoding"
          }
        }
      );
    }

    let diffText = "";

    // 2. Fetch each commit detail and extract file-level patch
    for (const commit of commits.reverse()) {
      const commitApiCall = `https://api.github.com/repos/${repo}/commits/${commit.sha}`;
      const commitRes = await fetch(commitApiCall, { headers });
      console.log(commitApiCall);
      
      const commitJson = await commitRes.json();
      const fileEntry = commitJson.files?.find((f: any) => f.filename === file);
      
      if (!fileEntry?.patch) continue;
      
      diffText += `\ndiff --git a/${file} b/${file}\n`;
      diffText += `index ${commitJson.files[0].sha}..${commitJson.files[0].sha} 100644\n`;
      diffText += `--- a/${file}\n`;
      diffText += `+++ b/${file}\n`;
      diffText += fileEntry.patch + "\n";
    }

    if (!diffText) {
      diffText = "No diff available for this file.";
    }

    // Create a unique ETag based on the request parameters and first/last commit SHAs
    const firstCommitSha = commits[0]?.sha || '';
    const lastCommitSha = commits[commits.length - 1]?.sha || '';
    const etag = `"${Buffer.from(`${repo}|${file}|${since}|${firstCommitSha}|${lastCommitSha}`).toString('base64')}"`;

    return new Response(JSON.stringify({ diff: diffText }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        // Cache for 1 week (604800 seconds)
        // public: Can be cached by CDNs and browsers
        // max-age: How long browsers should cache
        // s-maxage: How long CDNs/proxies should cache (takes precedence over max-age for shared caches)
        "Cache-Control": "public, max-age=604800, s-maxage=604800",
        // ETag for cache validation - if content hasn't changed, return 304
        "ETag": etag,
        // Vary header to ensure proper caching per query params
        "Vary": "Accept-Encoding",
        // Additional headers for better caching
        "Last-Modified": new Date(commits[0]?.commit?.committer?.date || Date.now()).toUTCString()
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Error fetching diff", details: err.message }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          // Don't cache errors
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      }
    );
  }
};