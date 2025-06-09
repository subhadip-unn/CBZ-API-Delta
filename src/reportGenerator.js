// src/reportGenerator.js

// Intercept and filter TLS certificate warnings
// This must be added before any other requires
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  // Suppress TLS certificate verification warnings
  if (warning && typeof warning === 'string' && (
    warning.includes('NODE_TLS_REJECT_UNAUTHORIZED') || 
    warning.includes('TLS certificate') || 
    warning.includes('certificate verification')
  )) {
    return; // Suppress the warning
  }
  // For all other warnings, use the original behavior
  return originalEmitWarning.call(this, warning, ...args);
};


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

  // --- BEGIN ARCHIVING LOGIC ---
  const reportsBaseDir = "reports";
  const archiveBaseDir = "old_reports";

  try {
    if (fs.existsSync(reportsBaseDir)) {
      console.log(`\n▶ Archiving existing reports from '${reportsBaseDir}'...`);
      if (!fs.existsSync(archiveBaseDir)) {
        fs.mkdirSync(archiveBaseDir, { recursive: true });
        console.log(`  Created archive directory: '${archiveBaseDir}'`);
      }

      const existingItems = fs.readdirSync(reportsBaseDir);
      let archivedCount = 0;
      for (const item of existingItems) {
        const sourcePath = path.join(reportsBaseDir, item);
        if (fs.statSync(sourcePath).isDirectory()) { // Ensure we are only moving directories
          const destinationPath = path.join(archiveBaseDir, item);
          // Note: fs.renameSync might error if destinationPath (a folder with the same name) already exists in old_reports.
          // Assuming timestamped folder names are unique enough to avoid collisions.
          fs.renameSync(sourcePath, destinationPath);
          console.log(`  Moved '${sourcePath}' to '${destinationPath}'`);
          archivedCount++;
        }
      }
      if (archivedCount > 0) {
        console.log(`  Successfully archived ${archivedCount} report folder(s).`);
      } else {
        console.log(`  No report folders found in '${reportsBaseDir}' to archive.`);
      }
    } else {
      console.log(`\n▶ No existing '${reportsBaseDir}' directory found. Skipping archiving.`);
    }
  } catch (error) {
    console.error("\n⚠️ Error during report archiving:", error);
    console.log("  Proceeding with new report generation despite archiving error.");
  }
  // --- END ARCHIVING LOGIC ---

  // 2) Run all jobs
  console.log(`\n▶ Running tests as QA ${qaName}\n`);
  
  // Get timestamps in Indian Standard Time (IST)
  const { folderTs, humanTs } = getIndianTimestamp();
  
  // Run all jobs with QA name and IST timestamp
  const allJobResults = await runAllJobsWithQA(qaName, humanTs);

  // 3) Write to a single timestamped folder with IST timestamp
  // Ensure the 'reports' base directory exists before creating the timestamped subfolder
  // 'reportsBaseDir' is already defined earlier in the function.
  if (!fs.existsSync(reportsBaseDir)) {
      fs.mkdirSync(reportsBaseDir, { recursive: true });
  }
  const outDir = path.join(reportsBaseDir, folderTs);
  fs.mkdirSync(outDir, { recursive: true }); // This creates the specific timestamped folder in 'reports/'

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
 *   Filters jobs based on QUICK_MODE environment variable.
 */
async function runAllJobsWithQA(qaName, timestamp) {
  const compCfg = YAML.load(fs.readFileSync("config/comparison.yaml", "utf8"));
  const headersAll = JSON.parse(fs.readFileSync("config/headers.json", "utf8"));
  const idsAll = JSON.parse(fs.readFileSync("config/ids.json", "utf8"));
  const endpointsDef = YAML.load(fs.readFileSync("config/endpoints.yaml", "utf8"));
  
  // Check if QUICK_MODE is enabled
  const isQuickMode = process.env.QUICK_MODE === 'true';
  console.log(`\n${isQuickMode ? '⚡ Running in QUICK MODE' : '🔍 Running in FULL TEST MODE'}\n`);
  
  // Filter jobs based on QUICK_MODE:
  // - If QUICK_MODE=true, only run jobs with quickMode:true
  // - If not in QUICK_MODE, exclude jobs with quickMode:true
  const filteredJobs = compCfg.jobs.filter(job => {
    if (isQuickMode) {
      return job.quickMode === true;
    } else {
      return job.quickMode !== true;
    }
  });
  
  if (filteredJobs.length === 0) {
    console.log(`⚠️ Warning: No jobs match the current mode criteria. Check your comparison.yaml configuration.`);
  }
  
  const jobResults = [];
  for (const jobConfig of filteredJobs) {
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
