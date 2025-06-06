// src/comparator.js

const fs = require("fs");
const path = require("path");
const YAML = require("js-yaml");
const DeepDiff = require("deep-diff").diff;
const pLimit = require("p-limit");
const cliProgress = require("cli-progress");
const { buildUrl, retryFetch, filterDiffs, classifyDiffs } = require("./utils");

/**
 * runAllJobs()
 *   Loads configs from /config, runs each job in parallel (but each job runs its endpoints in parallel-limited).
 *   Returns an array of jobResult objects.
 */
async function runAllJobs() {
  const compCfg = YAML.load(fs.readFileSync("config/comparison.yaml", "utf8"));
  const headersAll = JSON.parse(fs.readFileSync("config/headers.json", "utf8"));
  const idsAll = JSON.parse(fs.readFileSync("config/ids.json", "utf8"));
  const endpointsDef = YAML.load(fs.readFileSync("config/endpoints.yaml", "utf8"));

  const allJobPromises = compCfg.jobs.map(jobConfig =>
    runJob(jobConfig, headersAll, idsAll, endpointsDef)
  );
  const allJobResults = await Promise.all(allJobPromises);
  return allJobResults;
}

/**
 * runJob(jobConfig, headersAll, idsAll, endpointsDef)
 *   Runs one job: filters endpoints by platform, substitutes IDs, loops over geos,
 *   fetches both sides with limited concurrency, and returns a jobResult.
 */
async function runJob(jobConfig, headersAll, idsAll, endpointsDef) {
  const platform = jobConfig.platform;            // "i" | "a" | "m" | "w"
  const headersTempl = headersAll[platform];      // e.g. { accept:"application/json", "cb-loc":["IN","US"], ... }
  const ignorePaths = jobConfig.ignorePaths || [];
  const retries = jobConfig.retryPolicy.retries;
  const delayMs = jobConfig.retryPolicy.delayMs;
  
  // Allow configurable concurrency limit (default 5)
  const concurrencyLimit = process.env.CONCURRENCY_LIMIT ? parseInt(process.env.CONCURRENCY_LIMIT) : 5;
  const limit = pLimit(concurrencyLimit);        // max N parallel comparisons

  // 1) Filter endpoints for this platform
  let platformEndpoints = endpointsDef.filter(e => e.platform === platform);
  if (Array.isArray(jobConfig.endpointsToRun) && jobConfig.endpointsToRun.length > 0) {
    platformEndpoints = platformEndpoints.filter(e =>
      jobConfig.endpointsToRun.includes(e.key)
    );
  }

  // Check if we're in quick mode
  const isQuick = jobConfig.quickMode === true || process.env.QUICK_MODE === "true";
  
  // 2) Determine list of geos - in quick mode, only use first geo
  const geoList = Array.isArray(headersTempl["cb-loc"])
    ? (isQuick ? [headersTempl["cb-loc"][0]] : headersTempl["cb-loc"])
    : [headersTempl["cb-loc"]];

  // Create a fresh response cache for this job only - scoped to prevent memory leaks
  const responseCache = new Map();
  
  // Helper function to cache API responses
  async function cachedFetch(url, headers, retries, delayMs) {
    const cacheKey = `${url}|${JSON.stringify(headers)}`;
    if (responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey);
      return { 
        success: true, 
        data: cached.data, 
        status: cached.status, 
        error: null, 
        responseTimeMs: 0 
      };
    }
    
    const result = await retryFetch(url, headers, retries, delayMs);
    if (result.success) {
      responseCache.set(cacheKey, { data: result.data, status: result.status });
    }
    return result;
  }
  
  const allRecords = [];
  const tasks = [];
  
  // Calculate total number of tasks for progress bar
  let totalTasks = 0;
  for (const ep of platformEndpoints) {
    const idCategory = ep.idCategory;
    const subsCount = idCategory ? (isQuick ? 1 : (idsAll[idCategory] || []).length) : 1;
    const geosCount = isQuick ? 1 : geoList.length;
    totalTasks += subsCount * geosCount;
  }
  let completedTasks = 0;
  
  // Initialize progress bar
  const progressBar = new cliProgress.SingleBar({
    format: '[{bar}] {percentage}% | {value}/{total} | ETA: {eta_formatted}s | {jobName}',
    barCompleteChar: '#',
    barIncompleteChar: '-',
    hideCursor: true
  }, cliProgress.Presets.shades_classic);
  
  // Show total task count for this job
  console.log(`→ Total comparisons: ${totalTasks}`);
  progressBar.start(totalTasks, 0, { jobName: jobConfig.name });


  // 3) Loop endpoints → substitutions → geos
  for (const ep of platformEndpoints) {
    const key = ep.key;
    const rawPath = ep.path;
    const idCategory = ep.idCategory; // e.g. "teamId" or null

    // 3.a) Build substitutions
    let substitutions = [{}];
    if (idCategory) {
      const idList = idsAll[idCategory] || [];
      // In quick mode, only use the first ID
      const listToUse = isQuick ? idList.slice(0, 1) : idList;
      substitutions = listToUse.map(v => ({ [idCategory]: v }));
    }

    // 3.b) Schedule a task for each (sub, geo)
    for (const sub of substitutions) {
      for (const loc of geoList) {
        tasks.push(limit(async () => {
          // Build URLs
          const urlA = buildUrl(jobConfig.baseA, platform, rawPath, sub);
          const urlB = buildUrl(jobConfig.baseB, platform, rawPath, sub);

          // Build per-request headers
          const hdrs = { ...headersTempl, "cb-loc": loc };

          // Fetch A
          const startA = Date.now();
          const respA = await cachedFetch(urlA, hdrs, retries, delayMs);
          const elapsedA = Date.now() - startA;

          // Fetch B
          const startB = Date.now();
          const respB = await cachedFetch(urlB, hdrs, retries, delayMs);
          const elapsedB = Date.now() - startB;

          // Build record
          const rec = {
            key,
            params: sub,
            cbLoc: loc,
            urlA,
            urlB,
            statusA: respA.status,
            statusB: respB.status,
            responseTimeA: elapsedA,
            responseTimeB: elapsedB,
            timestampA: new Date().toISOString(),
            timestampB: new Date().toISOString(),
            headersUsedA: hdrs,
            headersUsedB: hdrs,
            rawJsonA: respA.success ? respA.data : null,
            rawJsonB: respB.success ? respB.data : null,
            diffs: [],
            error: null
          };

          // If either side failed, record error
          if (!respA.success || !respB.success) {
            rec.error = !respA.success
              ? `A failed (loc=${loc}): ${respA.error}`
              : `B failed (loc=${loc}): ${respB.error}`;
            allRecords.push(rec);
          completedTasks++;
          progressBar.update(completedTasks);
            return;
          }

          // Both succeeded → deep diff
          let rawDiff = DeepDiff(respA.data, respB.data) || [];
          rawDiff = filterDiffs(rawDiff, ignorePaths);
          if (rawDiff.length > 0) {
            rec.diffs = rawDiff.map(d => classifyDiffs(d));
          }
          allRecords.push(rec);
          completedTasks++;
          progressBar.update(completedTasks);
        }));
      }
    }
  }

  // 4) Await all tasks
  await Promise.all(tasks);
  
  // Stop the progress bar
  progressBar.stop();

  // 5) Summarize
  const totalCount = allRecords.length;
  const failures = allRecords.filter(r => r.error).length;
  const withDiffs = allRecords.filter(r => r.diffs.length > 0).length;
  const diffsFound = allRecords.reduce((sum, rec) => sum + rec.diffs.length, 0);
  const successful = totalCount - failures;

  // 6) Meta: unique endpoints, IDs, geos
  const endpointsRun = [...new Set(allRecords.map(r => r.key))];
  const idsUsed = [...new Set(allRecords.flatMap(r => Object.values(r.params).map(x => x.toString())))];
  const geoUsed = [...new Set(allRecords.map(r => r.cbLoc))];

  return {
    jobName: jobConfig.name,
    platform,
    timestamp: new Date().toISOString(),
    testEngineer: jobConfig.testEngineer,
    // Add totalTasks to the returned object for the completion message
    totalTasks,
    failures,
    diffsFound,
    summary: {
      totalComparisons: totalCount,
      failures,
      endpointsWithDiffs: withDiffs,
      totalDiffs: diffsFound,
      successful
    },
    meta: {
      endpointsRun,
      idsUsed,
      geoUsed
    },
    endpoints: allRecords
  };
}

module.exports = { runAllJobs, runJob };
