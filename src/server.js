// src/server.js

const express = require("express");
const fs = require("fs");
const path = require("path");
const auth = require('basic-auth');

const app = express();
const PORT = 8081; // Temporarily changed to avoid port conflicts

// Disable ETag generation to prevent 304 Not Modified responses
app.disable("etag");

// Add Basic Authentication
const USERNAME = 'cbzqa';
const PASSWORD = 'cbz2025';

// Authentication middleware
const authenticate = (req, res, next) => {
  const credentials = auth(req);
  
  // Check credentials
  if (!credentials || credentials.name !== USERNAME || credentials.pass !== PASSWORD) {
    res.setHeader('WWW-Authenticate', 'Basic realm="CBZ API Delta Reports"');
    return res.status(401).send('Authentication required.');
  }
  
  // Proceed to the next middleware if authentication successful
  next();
};

// Apply authentication to all routes
app.use(authenticate);

/**
 * getAllReportFolders()
 *   Returns an array of folder names under /reports that are directories.
 */
function getAllReportFolders() {
  if (!fs.existsSync("reports")) return [];
  return fs.readdirSync("reports").filter(name =>
    fs.statSync(path.join("reports", name)).isDirectory()
  ).sort();
}

/**
 * getAllArchivedFolders()
 *   Returns an array of folder names under /old_reports that are directories.
 *   Sorts in reverse chronological order (newest first).
 */
function getAllArchivedFolders() {
  if (!fs.existsSync("old_reports")) return [];
  return fs.readdirSync("old_reports")
    .filter(name => fs.statSync(path.join("old_reports", name)).isDirectory())
    .sort()
    .reverse(); // Reverse to get newest first
}

/**
 * serveReportList(req, res)
 *   Renders a simple HTML page listing all available report folders as links.
 */
app.get("/reports", (req, res) => {
  const folders = getAllReportFolders();
  const archivedFolders = getAllArchivedFolders();
  
  let html = `
    <html>
    <head>
      <title>CBZ API Delta Reports</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h2 { color: #333; margin-top: 20px; }
        ul { list-style-type: none; padding: 0; }
        li { margin: 8px 0; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .archived-link { margin-top: 20px; display: block; }
      </style>
    </head>
    <body>
  `;
  
  if (folders.length === 0) {
    html += `<h2>No latest reports found. Run 'npm run compare' first.</h2>`;
  } else {
    html += `<h2>Latest Reports</h2><ul>`;
    folders.forEach(folder => {
      html += `<li><a href="/view/${folder}">${folder}</a></li>`;
    });
    html += `</ul>`;
  }
  
  if (archivedFolders.length > 0) {
    html += `<h2>Archived Reports</h2>`;
    
    // Group folders by year
    const foldersByYear = {};
    archivedFolders.forEach(folder => {
      const dateMatch = folder.match(/^(\d{4})-/);
      if (dateMatch) {
        const year = dateMatch[1];
        if (!foldersByYear[year]) {
          foldersByYear[year] = [];
        }
        foldersByYear[year].push(folder);
      } else {
        // For folders that don't match the expected format
        if (!foldersByYear['Other']) {
          foldersByYear['Other'] = [];
        }
        foldersByYear['Other'].push(folder);
      }
    });

    // Display reports grouped by year, with newest first in each group
    // Get the years and sort them in descending order
    const sortedYears = Object.keys(foldersByYear).sort().reverse();
    
    sortedYears.forEach(year => {
      html += `<h3>${year}</h3><ul>`;
      
      // Folders in each year are already sorted newest first by getAllArchivedFolders
      foldersByYear[year].forEach(folder => {
        // Format the display date
        let displayDate = folder;
        const dateMatch = folder.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})/);
        if (dateMatch) {
          const [_, year, month, day, hour, minute] = dateMatch;
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          displayDate = `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year} at ${hour}:${minute}`;
        }
        
        html += `<li><a href="/archived-view/${folder}">${displayDate}</a></li>`;
      });
      
      html += `</ul>`;
    });
  }
  
  html += `
    </body>
    </html>
  `;
  
  res.send(html);
});

/**
 * Redirect root "/" to "/reports"
 */
app.get("/", (req, res) => {
  res.redirect("/reports");
});

/**
 * viewArchivedReport(req, res)
 *   For /archived-view/:folderName, serves the HTML shell for archived reports
 */
app.get("/archived-view/:folderName", (req, res) => {
  const folder = req.params.folderName;
  const fullPath = path.join("old_reports", folder);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send("Archived report not found");
  }
  const timestamp = Date.now();
  // Use the current version of main.js and main.css from /public instead of the archived versions
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>CBZ API Delta Report (Archived): ${folder}</title>
        <link rel="stylesheet" href="/public/main.css?v=${timestamp}" />
        <!-- Add jsondiffpatch CSS styles needed for formatter -->
        <style>
          /* jsondiffpatch formatter styles */
          .jsondiffpatch-delta {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            margin: 0;
            padding: 0 0 0 12px;
            display: inline-block;
          }
          .jsondiffpatch-delta pre {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            margin: 0;
            padding: 0;
            display: inline-block;
          }
          ul.jsondiffpatch-delta {
            list-style-type: none;
            padding: 0 0 0 20px;
            margin: 0;
          }
          .jsondiffpatch-delta ul {
            list-style-type: none;
            padding: 0 0 0 20px;
            margin: 0;
          }
          .jsondiffpatch-added .jsondiffpatch-property-name,
          .jsondiffpatch-added .jsondiffpatch-value pre,
          .jsondiffpatch-modified .jsondiffpatch-right-value pre,
          .jsondiffpatch-textdiff-added {
            background: #bbffbb;
          }
          .jsondiffpatch-deleted .jsondiffpatch-property-name,
          .jsondiffpatch-deleted pre,
          .jsondiffpatch-modified .jsondiffpatch-left-value pre,
          .jsondiffpatch-textdiff-deleted {
            background: #ffbbbb;
            text-decoration: line-through;
          }
          .jsondiffpatch-unchanged,
          .jsondiffpatch-movedestination {
            color: gray;
          }
          .jsondiffpatch-unchanged,
          .jsondiffpatch-movedestination > .jsondiffpatch-value {
            transition: all 0.5s;
            -webkit-transition: all 0.5s;
            overflow-y: hidden;
          }
          .jsondiffpatch-unchanged-showing .jsondiffpatch-unchanged,
          .jsondiffpatch-unchanged-showing .jsondiffpatch-movedestination > .jsondiffpatch-value {
            max-height: 100px;
          }
          .jsondiffpatch-unchanged-hidden .jsondiffpatch-unchanged,
          .jsondiffpatch-unchanged-hidden .jsondiffpatch-movedestination > .jsondiffpatch-value {
            max-height: 0;
          }
          .jsondiffpatch-arrow {
            display: inline-block;
            position: relative;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            vertical-align: middle;
            margin: 2px;
          }
          .jsondiffpatch-arrow-down { border-top: 5px solid black; }
          .jsondiffpatch-arrow-right { border-left: 5px solid black; }
          /* Add any additional styles needed for the archived view */
          .archived-banner {
            background-color: #ffeb3b; 
            padding: 10px; 
            text-align: center; 
            margin-bottom: 10px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="archived-banner">
          <strong>ARCHIVED REPORT</strong> - This is a historical snapshot from ${folder}
          <a href="/reports" style="margin-left: 20px;">Back to Reports List</a>
        </div>
        <div id="summary"></div>
        <div id="job-container"></div>
        <!-- Pre-define window.REPORT_FOLDER for the static JS -->
        <script>
          window.REPORT_FOLDER = "${folder}";
          window.IS_ARCHIVED = true;
          // Add a function to modify XMLHttpRequest URLs to include archived=true
          (function() {
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
              if (url && (url === '/diff_data.json' || url.startsWith('/diff_data.json?'))) {
                url = url.includes('?') ? url + '&archived=true' : url + '?archived=true';
              }
              originalOpen.apply(this, [method, url]);
            };
          })();
        </script>
        <!-- Load jsondiffpatch before main.js -->
        <script src="/public/jsondiffpatch.umd.js?v=${timestamp}"></script>
        <!-- Load the latest JS that renders the report -->
        <script src="/public/main.js?v=${timestamp}"></script>
      </body>
    </html>
  `;
  res.send(html);
});

/**
 * viewReport(req, res)
 *   For /view/:folderName, serves the HTML shell that loads the static assets
 *   and sets window.REPORT_FOLDER to the chosen folder.
 */
app.get("/view/:folderName", (req, res) => {
  const folder = req.params.folderName;
  const fullPath = path.join("reports", folder);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send("Report not found");
  }
  const timestamp = Date.now();
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>CBZ API Delta Report: ${folder}</title>
        <link rel="stylesheet" href="/static/${folder}/main.css?v=${timestamp}" />
        <!-- Add jsondiffpatch CSS styles needed for formatter -->
        <style>
          /* jsondiffpatch formatter styles */
          .jsondiffpatch-delta {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            margin: 0;
            padding: 0 0 0 12px;
            display: inline-block;
          }
          .jsondiffpatch-delta pre {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            margin: 0;
            padding: 0;
            display: inline-block;
          }
          ul.jsondiffpatch-delta {
            list-style-type: none;
            padding: 0 0 0 20px;
            margin: 0;
          }
          .jsondiffpatch-delta ul {
            list-style-type: none;
            padding: 0 0 0 20px;
            margin: 0;
          }
          .jsondiffpatch-added .jsondiffpatch-property-name,
          .jsondiffpatch-added .jsondiffpatch-value pre,
          .jsondiffpatch-modified .jsondiffpatch-right-value pre,
          .jsondiffpatch-textdiff-added {
            background: #bbffbb;
          }
          .jsondiffpatch-deleted .jsondiffpatch-property-name,
          .jsondiffpatch-deleted .jsondiffpatch-value pre,
          .jsondiffpatch-modified .jsondiffpatch-left-value pre,
          .jsondiffpatch-textdiff-deleted {
            background: #ffbbbb;
            text-decoration: line-through;
          }
          .jsondiffpatch-unchanged,
          .jsondiffpatch-movedestination {
            color: gray;
          }
          .jsondiffpatch-unchanged,
          .jsondiffpatch-movedestination > .jsondiffpatch-value {
            transition: all 0.5s;
            -webkit-transition: all 0.5s;
            overflow-y: hidden;
          }
          .jsondiffpatch-unchanged-showing .jsondiffpatch-unchanged,
          .jsondiffpatch-unchanged-showing .jsondiffpatch-movedestination > .jsondiffpatch-value {
            max-height: 100px;
          }
          .jsondiffpatch-unchanged-hidden .jsondiffpatch-unchanged,
          .jsondiffpatch-unchanged-hidden .jsondiffpatch-movedestination > .jsondiffpatch-value {
            max-height: 0;
          }
          .jsondiffpatch-arrow {
            display: inline-block;
            position: relative;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            vertical-align: middle;
            margin: 2px;
          }
          .jsondiffpatch-arrow-down { border-top: 5px solid black; }
          .jsondiffpatch-arrow-right { border-left: 5px solid black; }
        </style>
      </head>
      <body>
        <h1>CBZ API Delta: ${folder}</h1>
        <div id="summary"></div>
        <div id="job-container"></div>

        <script>window.REPORT_FOLDER="${folder}";</script>
        <script src="/static/${folder}/jsondiffpatch.umd.js?v=${timestamp}"></script>
        <script src="/static/${folder}/main.js?v=${timestamp}"></script>
      </body>
    </html>
  `;
  res.send(html);
});

/**
 * Static file serving for current reports
 *   For /static/:folderName/*, serves static assets from /reports/:folderName/
 *   With no-cache headers to prevent stale assets
 */
app.use("/static/:folderName", (req, res, next) => {
  // Disable caching for all static assets
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  const folderName = req.params.folderName;
  const filePath = req.path.replace(/^\/+/, ""); //remove leading slash
  const fullPath = path.join("reports", folderName, filePath);
  
  // First check if file exists at standard path
  if (fs.existsSync(fullPath)) {
    return res.sendFile(path.resolve(fullPath), { maxAge: 0 });
  }
  
  // Check if it's a request for static/* subdirectory
  const staticPath = path.join("reports", folderName, "static", filePath);
  if (fs.existsSync(staticPath)) {
    return res.sendFile(path.resolve(staticPath), { maxAge: 0 });
  }
  
  // Not found
  next();
});

/**
 * Archived Static file serving 
 *   For /archived-static/:folderName/*, serves static assets from /old_reports/:folderName/
 */
app.use("/archived-static/:folderName", (req, res, next) => {
  // Disable caching for all static assets
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  
  const folderName = req.params.folderName;
  const filePath = req.path.replace(/^\/+/, ""); // remove leading slash
  const fullPath = path.join("old_reports", folderName, filePath);
  
  // First check if file exists at standard path
  if (fs.existsSync(fullPath)) {
    return res.sendFile(path.resolve(fullPath), { maxAge: 0 });
  }
  
  // Check if it's a request for static/* subdirectory
  const staticPath = path.join("old_reports", folderName, "static", filePath);
  if (fs.existsSync(staticPath)) {
    return res.sendFile(path.resolve(staticPath), { maxAge: 0 });
  }
  
  // Not found
  next();
});

/**
 * Public static file serving
 *   For /public/* serves the latest static assets from src/public directory
 */
app.use("/public", (req, res, next) => {
  // Disable caching for all static assets
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
}, express.static(path.join(__dirname, "public")));

/**
 * Serve diff_data.json for a given folderName
 *   GET /diff_data.json?folder=<folderName>
 *   With no-cache headers to prevent stale data
 */
app.get("/diff_data.json", (req, res) => {
  // Disable caching for JSON data
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  
  const folder = req.query.folder;
  if (!folder) {
    return res.status(400).send("Missing folder parameter");
  }

  // Check if this is an archived folder request (from old_reports)
  const isArchived = req.query.archived === 'true';
  const baseDir = isArchived ? "old_reports" : "reports";
  const filePath = path.join(baseDir, folder, "diff_data.json");

  // If archived parameter not provided, try both locations
  if (!isArchived && !fs.existsSync(filePath)) {
    const archivedPath = path.join("old_reports", folder, "diff_data.json");
    if (fs.existsSync(archivedPath)) {
      return res.sendFile(path.resolve(archivedPath), { maxAge: 0 });
    }
  }
  
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath), { maxAge: 0 });
  } else {
    res.status(404).send(`Diff data not found in ${baseDir}/${folder}`);
  }
});

/**
 * API endpoint for Monaco JSON diff viewer
 * GET /api/json-diff?recordId=<recordId>&folder=<folderName>
 * Returns the raw JSON before and after for diffing
 */
app.get("/api/json-diff", (req, res) => {
  // Disable caching for API responses
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  let { recordId, folder, cbLoc } = req.query;
  let originalRecordId = recordId;
  
  if (!recordId || !folder) {
    return res.status(400).json({ error: "Missing recordId or folder parameters" });
  }
  
  // Check if recordId contains embedded region information
  if (recordId.includes('__REGION_')) {
    const parts = recordId.split('__REGION_');
    recordId = parts[0]; // Extract the actual endpoint key
    const embeddedRegion = parts[1];
    // Only override cbLoc if it wasn't explicitly provided
    if (!cbLoc) {
      cbLoc = embeddedRegion;
    }
  }
  
  console.log(`/api/json-diff request: recordId=${originalRecordId} (parsed to: ${recordId}), folder=${folder}, cbLoc=${cbLoc || 'not specified'}`);

  // Check if this is an archived report
  const isArchived = req.query.archived === 'true';
  
  // Determine which directories to check based on archived parameter
  let reportPaths = [];
  if (isArchived) {
    // If archived=true, only check old_reports
    reportPaths = [path.join(__dirname, "..", "old_reports", folder)];
    console.log(`Looking only in archived reports for folder: ${folder}`);
  } else if (req.query.archived === 'false') {
    // If archived=false, only check reports
    reportPaths = [path.join(__dirname, "..", "reports", folder)];
    console.log(`Looking only in current reports for folder: ${folder}`);
  } else {
    // If archived parameter not provided, check both
    reportPaths = [
      path.join(__dirname, "..", "reports", folder),
      path.join(__dirname, "..", "old_reports", folder),
    ];
    console.log(`Looking in both current and archived reports for folder: ${folder}`);
  }

  let diffData = null;
  let foundPath = null;

  // Try to find diff_data.json in the specified path(s)
  for (const reportPath of reportPaths) {
    try {
      const diffFilePath = path.join(reportPath, "diff_data.json");
      if (fs.existsSync(diffFilePath)) {
        diffData = JSON.parse(fs.readFileSync(diffFilePath, "utf8"));
        foundPath = diffFilePath;
        console.log(`Found diff_data.json at: ${diffFilePath}`);
        break;
      }
    } catch (error) {
      console.error(`Error reading diff_data.json from ${reportPath}:`, error);
    }
  }

  if (!diffData) {
    return res.status(404).json({ error: "Diff data not found for folder: " + folder });
  }

  console.log(`Found diff data at: ${foundPath}`);
  
  // Look through all jobs to find an endpoint with JSON diff data
  let foundEndpoint = null;
  let exactMatch = false;
  
  // Store all available endpoint keys for debugging
  const allAvailableEndpoints = [];
  const allRegions = [];
  
  // Debug: Log all available regions and endpoints in the diff data with more details
  console.log('\n===== DETAILED DIFF DATA ANALYSIS =====');
  diffData.forEach((job, index) => {
    const jobCbLoc = job.cbLoc || (job.params && job.params.cbLoc);
    if (jobCbLoc && !allRegions.includes(jobCbLoc)) {
      allRegions.push(jobCbLoc);
    }
    
    // Log detailed job information
    console.log(`\nJob #${index + 1} - Name: ${job.jobName || 'unnamed'}, Region: ${jobCbLoc || 'unknown'}`);
    
    if (job.endpoints && Array.isArray(job.endpoints)) {
      console.log(`  Endpoints (${job.endpoints.length}):`);  
      job.endpoints.forEach((ep, i) => {
        if (ep.key) {
          console.log(`    ${i+1}. Key: ${ep.key}, Has Data: ${!!(ep.rawJsonA && ep.rawJsonB)}`);
        }
      });
    }
  });
  console.log(`\nAvailable regions in diff data: ${allRegions.join(', ') || 'none found'}`);
  console.log(`Requested region: ${cbLoc || 'not specified'}`);
  console.log('===== END OF DATA ANALYSIS =====\n');
  
  // First pass - try to find an exact match by region and endpoint key
  for (const job of diffData) {
    if (!job.endpoints || !Array.isArray(job.endpoints)) {
      continue;
    }
    
    // Get region (cbLoc) for this job
    const jobCbLoc = job.cbLoc || (job.params && job.params.cbLoc);
    
    // Skip this job if cbLoc was specified and doesn't match
    if (cbLoc && jobCbLoc && jobCbLoc !== cbLoc) {
      continue;
    }
    
    // Log the job info
    console.log(`Checking job: ${job.jobName || 'unnamed'}, region: ${jobCbLoc || 'unknown'}`);
    
    // Log the job name and endpoints count
    const jobEndpointKeys = job.endpoints
      .map(endpoint => endpoint.key)
      .filter(Boolean);
    
    jobEndpointKeys.forEach(key => {
      if (key) {
        // Add region info to endpoint keys for debugging
        allAvailableEndpoints.push(`${key} (${jobCbLoc || 'unknown region'})`);
      }
    });
    
    // Try to find an exact match by endpoint key
    const endpoint = job.endpoints.find(ep => {
      return ep.key === recordId && ep.rawJsonA && ep.rawJsonB;
    });
    
    if (endpoint) {
      foundEndpoint = endpoint;
      exactMatch = true;
      console.log(`✓ Found exact match for endpoint key: ${recordId} in job: ${job.jobName}, region: ${jobCbLoc || 'unknown'}`);
      break;
    }
  }
  
  // If no exact match found, try partial match
  if (!foundEndpoint) {
    console.log(`× No exact match found for key: ${recordId}${cbLoc ? ` in region ${cbLoc}` : ''}`);
    console.log(`Available endpoint keys:`, allAvailableEndpoints.slice(0, 10), 
      allAvailableEndpoints.length > 10 ? `...and ${allAvailableEndpoints.length - 10} more` : '');
    
    // Try to find partial matches
    for (const job of diffData) {
      if (!job.endpoints || !Array.isArray(job.endpoints)) continue;
      
      // Get region for this job
      const jobCbLoc = job.cbLoc || (job.params && job.params.cbLoc);
      
      // Skip this job if cbLoc was specified and doesn't match
      if (cbLoc && jobCbLoc && jobCbLoc !== cbLoc) {
        continue; // Don't look in jobs from other regions if region was specified
      }
      
      // Look for partial matches (key contains the recordId or vice versa)
      const endpoint = job.endpoints.find(ep => {
        const epKey = ep.key || '';
        return (epKey.includes(recordId) || recordId.includes(epKey)) && 
               ep.rawJsonA && ep.rawJsonB;
      });
      
      if (endpoint) {
        foundEndpoint = endpoint;
        console.log(`✓ Found partial match in region ${jobCbLoc || 'unknown'} - endpoint key: ${endpoint.key} matches recordId: ${recordId}`);
        break;
      }
    }
    
    // If still no match, fall back to first endpoint with JSON data
    if (!foundEndpoint) {
      // First try to find an endpoint in the requested region
      if (cbLoc) {
        for (const job of diffData) {
          if (!job.endpoints || !Array.isArray(job.endpoints)) continue;
          
          // Only check jobs matching the requested region
          const jobCbLoc = job.cbLoc || (job.params && job.params.cbLoc);
          if (jobCbLoc !== cbLoc) continue;
          
          const endpoint = job.endpoints.find(ep => ep.rawJsonA && ep.rawJsonB);
          if (endpoint) {
            foundEndpoint = endpoint;
            console.log(`⚠ No exact/partial match found in region ${cbLoc}, using first endpoint with data in this region: ${endpoint.key || 'unknown'}`);
            break;
          }
        }
      }
      
      // If still no endpoint found, use any endpoint regardless of region
      if (!foundEndpoint) {
        for (const job of diffData) {
          if (!job.endpoints || !Array.isArray(job.endpoints)) continue;
          
          const jobCbLoc = job.cbLoc || (job.params && job.params.cbLoc);
          const endpoint = job.endpoints.find(ep => ep.rawJsonA && ep.rawJsonB);
          if (endpoint) {
            foundEndpoint = endpoint;
            console.log(`⚠ No match found in any region, last resort fallback to endpoint: ${endpoint.key || 'unknown'} in region ${jobCbLoc || 'unknown'}`);
            break;
          }
        }
      }
    }
  }
  
  if (!foundEndpoint) {
    return res.status(404).json({
      error: "No endpoint with diff data found",
      recordId
    });
  }
  
  // Get the raw JSON data from the found endpoint
  const original = foundEndpoint.rawJsonA || "{}";
  const modified = foundEndpoint.rawJsonB || "{}";
  
  // Ensure we're sending string data, not objects
  // Monaco editor expects string data for its models
  const ensureString = (jsonData) => {
    if (typeof jsonData === 'object') {
      return JSON.stringify(jsonData, null, 2);
    }
    return jsonData || '{}';
  };
  
  // Send the diff data as properly formatted strings
  res.json({
    original: ensureString(original),
    modified: ensureString(modified),
    endpoint: foundEndpoint.key || 'unknown'
  });
  
  console.log(`Sent diff data for endpoint: ${foundEndpoint.key || 'unknown'}`);
  console.log(`Data sizes - Original: ${ensureString(original).length}, Modified: ${ensureString(modified).length}`);
});

/**
 * Serve the React Monaco Diff Viewer app and its assets
 */
// Directly serve the assets folder with proper MIME types
app.use("/assets", express.static(path.join(__dirname, "frontend/dist/assets"), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    // Set the correct MIME types for common file extensions
    res.type(path.extname(res.req.path));
  }
}));

// Serve the main Monaco app static assets
app.use("/monaco-diff/assets", express.static(path.join(__dirname, "frontend/dist/assets"), {
  setHeaders: function (res, path) {
    res.set("Content-Type", getMimeType(path));
    // Add strong no-cache headers for development
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  },
}));

// Static files at the root of frontend/dist
app.use("/monaco-diff", express.static(path.join(__dirname, "frontend/dist"), {
  index: false, // Don't serve index.html automatically
  setHeaders: function (res, path) {
    res.set("Content-Type", getMimeType(path));
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  },
}));

// Serve index.html for monaco-diff route and all subroutes
// This ensures all paths including root path and with query params work
app.get(["/monaco-diff", "/monaco-diff/*"], (req, res) => {
  console.log(`Serving Monaco Diff Viewer for: ${req.originalUrl}`);
  res.sendFile(path.join(__dirname, "frontend/dist/index.html"));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CBZ API Delta UI running at http://0.0.0.0:${PORT}`);
  console.log(`VPN access: http://172.16.253.6:${PORT}/reports`);
  console.log(`Browse http://localhost:${PORT}/reports to select a report`);
  console.log(`Monaco Diff Viewer available at http://localhost:${PORT}/monaco-diff`);
});
