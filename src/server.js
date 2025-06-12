// src/server.js

const express = require("express");
const fs = require("fs");
const path = require("path");
const auth = require('basic-auth');

const app = express();
const PORT = 8080; // Temporarily changed to avoid port conflicts

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
 * serveReportList(req, res)
 *   Renders a simple HTML page listing all available report folders as links.
 */
app.get("/reports", (req, res) => {
  const folders = getAllReportFolders();
  if (folders.length === 0) {
    return res.send("<h2>No reports found. Run `npm run compare` first.</h2>");
  }
  let html = `
    <h2>Available Reports</h2>
    <ul>
  `;
  folders.forEach(folder => {
    html += `<li><a href="/view/${folder}">${folder}</a></li>`;
  });
  html += `
    </ul>
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
 * Serve static files under /static/:folderName/*
 *   Maps to reports/:folderName/static/*
 *   With no-cache headers to prevent stale assets
 */
app.use("/static/:folderName", (req, res, next) => {
  // Disable caching for all static assets
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  
  const folderName = req.params.folderName;
  const filePath = req.path.replace(/^\/+/, ""); // remove leading slash
  const fullPath = path.join("reports", folderName, "static", filePath);
  if (fs.existsSync(fullPath)) {
    res.sendFile(path.resolve(fullPath), { maxAge: 0 });
  } else {
    res.status(404).send("Not found");
  }
});

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
  const filePath = path.join("reports", folder, "diff_data.json");
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath), { maxAge: 0 });
  } else {
    res.status(404).send("Diff data not found");
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
  
  const recordId = req.query.recordId;
  const folderName = req.query.folder;
  
  console.log(`Got request for diff data: recordId=${recordId}, folder=${folderName}`);
  
  if (!recordId || !folderName) {
    return res.status(400).json({ error: "Missing recordId or folder parameter" });
  }
  
  // Use absolute path to reports directory (try both old_reports and reports)
  let filePath = path.join(__dirname, "../old_reports", folderName, "diff_data.json");
  
  // If not found in old_reports, try the reports directory
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, "../reports", folderName, "diff_data.json");
    if (!fs.existsSync(filePath)) {
      console.log(`File not found in either reports or old_reports: ${folderName}/diff_data.json`);
      return res.status(404).json({ error: "Diff data file not found" });
    }
  }
  
  try {
    console.log(`Reading diff data from: ${filePath}`);
    // Read and parse the diff_data.json file
    const diffData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    
    // Extract desired record data (rawJsonA and rawJsonB)
    let original = "{}";
    let modified = "{}";
    
    // FIXED: The actual structure is different from what we expected
    // The diff_data.json has endpoints array with rawJsonA and rawJsonB directly
    if (Array.isArray(diffData) && diffData.length > 0) {
      const job = diffData[0]; // First job in the array
      
      // If a specific record ID was provided, try to find that record
      // Otherwise use the first endpoint's data
      if (recordId !== 'all-test' && job.endpoints && Array.isArray(job.endpoints)) {
        for (const endpoint of job.endpoints) {
          // For exact record matches
          if (endpoint.key === recordId || endpoint.id === recordId) {
            console.log(`Found endpoint with ID/key ${recordId}`);
            original = endpoint.rawJsonA || "{}";
            modified = endpoint.rawJsonB || "{}";
            break;
          }
        }
      }
      
      // If we didn't find a match by ID or using 'all-test', use the first endpoint
      if ((original === "{}" && modified === "{}") || recordId === 'all-test') {
        console.log("Using the first available endpoint for testing");
        if (job.endpoints && job.endpoints.length > 0) {
          const firstEndpoint = job.endpoints[0];
          original = firstEndpoint.rawJsonA || "{}";
          modified = firstEndpoint.rawJsonB || "{}";
          
          console.log(`Using endpoint: ${firstEndpoint.key || 'unknown'} with status A: ${firstEndpoint.statusA}, B: ${firstEndpoint.statusB}`);
          console.log(`Raw JSON A length: ${original.length}, Raw JSON B length: ${modified.length}`);
        }
      }
    }
    
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
      modified: ensureString(modified)
    });
    
    console.log(`Sent data - Original length: ${ensureString(original).length}, Modified length: ${ensureString(modified).length}`);
    
  } catch (err) {
    console.error("Error reading or parsing diff data:", err);
    res.status(500).json({ error: "Error reading diff data: " + err.message });
  }
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

// Serve the main Monaco app path
app.use("/monaco-diff", express.static(path.join(__dirname, "frontend/dist"), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
}));

// Serve index.html for any path under /monaco-diff
app.get("/monaco-diff/*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/dist/index.html"));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CBZ API Delta UI running at http://0.0.0.0:${PORT}`);
  console.log(`VPN access: http://172.16.253.6:${PORT}/reports`);
  console.log(`Browse http://localhost:${PORT}/reports to select a report`);
  console.log(`Monaco Diff Viewer available at http://localhost:${PORT}/monaco-diff`);
});
