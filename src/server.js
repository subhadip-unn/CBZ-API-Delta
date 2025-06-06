// src/server.js

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Disable ETag generation to prevent 304 Not Modified responses
app.disable("etag");

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

app.listen(PORT, () => {
  console.log(`CBZ API Delta UI running at http://localhost:${PORT}`);
  console.log(`Browse http://localhost:${PORT}/reports to select a report`);
});
