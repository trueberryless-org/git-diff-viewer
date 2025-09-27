import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";

export const prerender = false;

const token = import.meta.env.GITHUB_TOKEN;
const headers: Record<string, string> = token
  ? { Authorization: `token ${token}` }
  : {};

// Cache configuration
const CACHE_DIR = path.join(process.cwd(), ".cache", "api-diffs");
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

// Function to ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create cache directory:", error);
  }
}

// Function to get cache file path
function getCacheFilePath(repo: string, file: string, since: string): string {
  const safeRepo = repo.replace(/[\/\\:*?"<>|]/g, "_");
  const safeFile = file.replace(/[\/\\:*?"<>|]/g, "_");
  const safeSince = since.replace(/[\/\\:*?"<>|]/g, "_");
  return path.join(CACHE_DIR, `${safeRepo}_${safeFile}_${safeSince}.json`);
}

// Function to check if cache is valid
async function isCacheValid(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return Date.now() - stats.mtime.getTime() < CACHE_TTL;
  } catch {
    return false;
  }
}

// Function to read from cache
async function readFromCache(filePath: string): Promise<string | null> {
  try {
    if (await isCacheValid(filePath)) {
      const cachedData = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(cachedData);
      return parsed.diff || null;
    }
  } catch (error) {
    console.log("Cache read error:", error);
  }
  return null;
}

// Function to write to cache
async function writeToCache(filePath: string, diff: string): Promise<void> {
  try {
    await ensureCacheDir();
    await fs.writeFile(filePath, JSON.stringify({ 
      diff, 
      timestamp: Date.now() 
    }));
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

export const GET: APIRoute = async ({ url }) => {
  const repo = url.searchParams.get("repo") || "";
  const file = url.searchParams.get("file") || "";
  const since = url.searchParams.get("since") || "";

  if (!repo || !file || !since) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
    });
  }

  // Try to get from cache first
  const cacheFilePath = getCacheFilePath(repo, file, since);
  const cachedDiff = await readFromCache(cacheFilePath);
  
  if (cachedDiff) {
    console.log("Cache hit for:", `${repo}/${file} since ${since}`);
    return new Response(JSON.stringify({ diff: cachedDiff }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("Cache miss, fetching from GitHub API...");

  try {
    // 1. Get all commits affecting this file since date
    const commitsApiCall = `https://api.github.com/repos/${repo}/commits?path=${file}&since=${since}T00:00:00Z&per_page=100`;
    const commitsRes = await fetch(commitsApiCall, { headers });
    console.log(commitsApiCall);
    
    const commits = await commitsRes.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      const noDiffMessage = "No changes since given date.";
      await writeToCache(cacheFilePath, noDiffMessage);
      return new Response(
        JSON.stringify({ diff: noDiffMessage }),
        { status: 200 }
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

    // Cache the result
    await writeToCache(cacheFilePath, diffText);

    return new Response(JSON.stringify({ diff: diffText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Error fetching diff", details: err.message }),
      { status: 500 }
    );
  }
};