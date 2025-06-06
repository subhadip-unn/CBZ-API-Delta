// src/reportGenerator.js

const fs = require("fs");
const path = require("path");
const readline = require("readline-sync");
const YAML = require("js-yaml");
const { runJob } = require("./comparator");

/**
 * getIndianTimestamp()
 *   Returns timestamps in Indian Standard Time (Asia/Kolkata, UTC+05:30)
 */
function getIndianTimestamp() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  let day, month, year, hour, minute, second;
  for (const p of parts) {
    if (p.type === "day") day = p.value;
    if (p.type === "month") month = p.value;
    if (p.type === "year") year = p.value;
    if (p.type === "hour") hour = p.value;
    if (p.type === "minute") minute = p.value;
    if (p.type === "second") second = p.value;
  }
  
  // Folder-name friendly: "YYYY-MM-DD_HH-MM-SS"
  const folderTs = `${year}-${month}-${day}_${hour}-${minute}-${second}`;
  // Human-readable: "YYYY-MM-DD HH:MM:SS"
  const humanTs = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  
  return { folderTs, humanTs };
}

/**
 * generateReports()
 *   Prompts for QA name, runs all jobs, then writes each jobResult into a single diff_data.json
 *   under a timestamped folder, copying the static frontend assets into that folder.
 */
async function generateReports() {
  // 1) Prompt for QA/Test Engineer name
  const qaName = readline.question("Enter QA/Test Engineer Name: ");

  // 2) Run all jobs
  console.log(`\n▶ Running tests as QA ${qaName}\n`);
  
  // Get timestamps in Indian Standard Time (IST)
  const { folderTs, humanTs } = getIndianTimestamp();
  
  // Run all jobs with QA name and IST timestamp
  const allJobResults = await runAllJobsWithQA(qaName, humanTs);

  // 3) Write to a single timestamped folder with IST timestamp
  const outDir = path.join("reports", folderTs);
  fs.mkdirSync(outDir, { recursive: true });

  // 4) Write diff_data.json
  const outPath = path.join(outDir, "diff_data.json");
  fs.writeFileSync(outPath, JSON.stringify(allJobResults, null, 2), "utf8");

  // 5) Copy static assets (main.css, main.js, jsondiffpatch.umd.js)
  const srcStatic = path.join(__dirname, "public");
  const destStatic = path.join(outDir, "static");
  copyFolderRecursiveSync(srcStatic, destStatic);

  console.log(`\n→ Wrote report to ${outDir}/\n`);
}

/**
 * runAllJobsWithQA(qaName, timestamp)
 *   Runs each job sequentially and injects testEngineer=qaName and IST timestamp into each jobResult.
 */
async function runAllJobsWithQA(qaName, timestamp) {
  const compCfg = YAML.load(fs.readFileSync("config/comparison.yaml", "utf8"));
  const headersAll = JSON.parse(fs.readFileSync("config/headers.json", "utf8"));
  const idsAll = JSON.parse(fs.readFileSync("config/ids.json", "utf8"));
  const endpointsDef = YAML.load(fs.readFileSync("config/endpoints.yaml", "utf8"));
  
  const jobResults = [];
  for (const jobConfig of compCfg.jobs) {
    console.log(`\n▶ Running job: ${jobConfig.name}`);
    const result = await runJob(jobConfig, headersAll, idsAll, endpointsDef);
    console.log(`✅ Finished job: ${jobConfig.name} → total=${result.totalTasks}, failures=${result.failures || 0}, diffs=${result.diffsFound || 0}`);
    
    jobResults.push({
      ...result,
      testEngineer: qaName,
      // Use the IST timestamp instead of UTC timestamp
      timestamp: timestamp
    });
  }
  return jobResults;
}

/**
 * copyFolderRecursiveSync(src, dest)
 *   Copies all files/folders from src into dest, recursively.
 */
function copyFolderRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// If run via `node src/reportGenerator.js`, execute generateReports()
if (require.main === module) {
  generateReports().catch(err => {
    console.error("Error generating reports:", err);
    process.exit(1);
  });
}

module.exports = { generateReports };
