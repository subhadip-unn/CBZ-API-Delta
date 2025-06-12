/**
 * CBZ API Delta - Frontend Main JS
 * Author: Subhadip Das (QA, Cricbuzz Platforms Limited)
 * Email: subhadip.das@cricbuzz.com
 * GitHub: https://github.com/subhadip-unn
 * Created: 2025-06-11
 * Copyright (c) 2025 Cricbuzz Platforms Limited
 */
// main.js
// Adds formatted diff display using jsondiffpatch and includes error handling

/**
 * On DOMContentLoaded:
 * 1. Fetch /diff_data.json?folder=<REPORT_FOLDER> (an array of jobResults)
 * 2. Render a tab bar for each job
 * 3. Render summary & metadata for the selected job
 * 4. Render search box + filter buttons + legend
 * 5. Render endpoint cards for the selected job
 */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Make sure jsondiffpatch is available
    console.log('jsondiffpatch available:', !!window.jsondiffpatch);
    if (window.jsondiffpatch && window.jsondiffpatch.formatters) {
      console.log('formatters available:', Object.keys(window.jsondiffpatch.formatters));
    }

    const folder = window.REPORT_FOLDER;
    if (!folder) {
      document.body.innerHTML = "<h2>No report folder specified.</h2>";
      return;
    }

    // Add basic styles to document
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin: 0;
        padding: 0;
        color: #333;
        background-color: #f9f9f9;
      }
      h1 {
        background: linear-gradient(135deg, #2c3e50, #3498db);
        color: white;
        margin: 0;
        padding: 20px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      #jobTabs {
        position: sticky;
        top: 0;
        background: #fff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        display: flex;
        flex-wrap: wrap;
        padding: 10px;
        z-index: 100;
        border-bottom: 1px solid #ddd;
      }
      #jobTabs button {
        background: #f0f0f0;
        border: none;
        padding: 8px 15px;
        margin-right: 5px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      #jobTabs button.active {
        background: #3498db;
        color: white;
      }
      #jobTabs button:hover:not(.active) {
        background: #e0e0e0;
      }
      #job-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 15px;
      }
      .card {
        border-radius: 6px;
        border: 1px solid #ddd;
        margin-bottom: 15px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
      .card-header {
        padding: 10px 15px;
        background-color: #f6f6f6;
        border-bottom: 1px solid #ddd;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .card-header.success {
        background-color: #e7f5ea;
      }
      .card-header.warning {
        background-color: #fff8e6;
      }
      .card-header.error {
        background-color: #fdedee;
      }
      .diff-item {
        border-left: 3px solid #ddd;
        margin-bottom: 8px;
        padding-left: 10px;
      }
      .diff-item.high {
        border-left-color: #e74c3c;
      }
      .diff-item.medium {
        border-left-color: #f39c12;
      }
      .diff-item.low {
        border-left-color: #3498db;
      }
    `;
    document.head.appendChild(styleEl);

    // 1) Fetch all jobs
    const resp = await fetch(`/diff_data.json?folder=${folder}`);
    const allJobs = await resp.json(); // array of jobResult
    console.log('Jobs data loaded:', allJobs.length, 'jobs found');

    // 2) Build tab bar
    const tabsDiv = document.createElement("div");
    tabsDiv.id = "jobTabs";
    allJobs.forEach((job, idx) => {
      const btn = document.createElement("button");
      btn.textContent = job.jobName;
      btn.dataset.idx = idx;
      if (idx === 0) btn.classList.add("active");
      btn.addEventListener("click", () => showJob(idx));
      tabsDiv.appendChild(btn);
    });
    document.getElementById("summary").insertAdjacentElement("beforebegin", tabsDiv);

  // 3) Create container for job sections
  const jobContainer = document.getElementById("job-container");
  allJobs.forEach((job, idx) => {
    const section = document.createElement("div");
    section.id = `job-${idx}`;
    section.className = "jobSection";
    if (idx !== 0) section.style.display = "none";
    try {
      renderJobSection(job, section);
    } catch (err) {
      console.error(`Error rendering job ${idx}:`, err);
      section.innerHTML = `<h3>Error rendering job ${job.jobName || idx}</h3><pre>${err.message}</pre>`;
    }
    jobContainer.appendChild(section);
  });
  } catch (err) {
    console.error('Top-level error:', err);
    document.body.innerHTML = `<h2>Error loading report</h2><pre>${err.message}</pre>`;
  }

  // Show only the selected job section
  function showJob(selectedIdx) {
    console.log('Switching to job index:', selectedIdx);
    document.querySelectorAll("#jobTabs button").forEach((btn, idx) => {
      if (idx === selectedIdx) btn.classList.add("active");
      else btn.classList.remove("active");
    });
    document.querySelectorAll(".jobSection").forEach((section, idx) => {
      if (idx === selectedIdx) section.style.display = "block";
      else section.style.display = "none";
    });
  }
});

/**
 * renderJobSection(job, container)
 *   Renders summary, search/filter, and all endpoint cards for one job.
 */
function renderJobSection(job, container) {
  console.log('Rendering job:', job.jobName);
  // Clear container
  container.innerHTML = "";

  // 1) Schema Notice - improved styling with icon
  const schemaNotice = `
    <div class="schema-notice" style="background:#fff9e6; padding:12px; border-left:4px solid #f1c40f; border-radius:4px; margin-bottom:1rem; display:flex; align-items:center;">
      <div style="margin-right:10px; font-size:18px; color:#f1c40f;">⚠️</div>
      <div>
        <strong>Note:</strong> This report does <em>not</em> perform JSON‐schema validation. 
        It only compares raw structures. To add schema‐based checks, integrate a JSON Schema validator.
      </div>
    </div>
  `;
  container.insertAdjacentHTML("beforeend", schemaNotice);

  // 2) QA Metadata & summary
  const ts = new Date(job.timestamp).toLocaleString();
  const s = job.summary;
  const meta = job.meta;
  const qa = job.testEngineer;
  
  // Enhanced summary section with modern card layout
  const summaryCard = document.createElement('div');
  summaryCard.className = 'summary-card';
  summaryCard.style.cssText = 'background:#fff; border-radius:8px; padding:15px; margin-bottom:20px; box-shadow:0 2px 5px rgba(0,0,0,0.06);';
  
  // Add job title with environment badges
  const titleSection = document.createElement('div');
  titleSection.innerHTML = `
    <div style="display:flex; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:15px;">
      <h2 style="margin:0; flex:1; font-size:22px;">
        ${job.jobName}
      </h2>
      <div>
        <span style="background:#3498db; color:white; padding:4px 8px; border-radius:4px; margin-right:5px; font-size:12px;">PROD</span>
        <span style="background:#2ecc71; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">STAGING</span>
      </div>
    </div>
  `;
  summaryCard.appendChild(titleSection);

  // Test metadata in a clean two-column layout
  const metadataSection = document.createElement('div');
  metadataSection.style.cssText = 'display:flex; flex-wrap:wrap; margin-bottom:15px;';
  
  // Left column - test details
  const leftCol = document.createElement('div');
  leftCol.style.cssText = 'flex:1; min-width:300px; padding-right:15px;';
  leftCol.innerHTML = `
    <div style="margin-bottom:15px;">
      <div style="font-size:16px; font-weight:600; color:#444; margin-bottom:5px; border-bottom:1px dashed #eee; padding-bottom:3px;">
        Test Information
      </div>
      <div style="display:grid; grid-template-columns:140px 1fr; row-gap:5px; font-size:14px;">
        <div style="color:#666;">Test Engineer:</div>
        <div style="font-weight:500;">${qa}</div>
        
        <div style="color:#666;">Generated On:</div>
        <div style="font-weight:500;">${ts}</div>
        
        <div style="color:#666;">Endpoints Tested:</div>
        <div style="font-weight:500;">${meta.endpointsRun.join(", ")}</div>
        
        <div style="color:#666;">IDs Used:</div>
        <div style="font-weight:500;">${meta.idsUsed.join(", ")}</div>
        
        <div style="color:#666;">Geo Locations:</div>
        <div style="font-weight:500;">${meta.geoUsed.join(", ")}</div>
      </div>
    </div>
  `;
  metadataSection.appendChild(leftCol);
  
  // Right column - test results
  const rightCol = document.createElement('div');
  rightCol.style.cssText = 'flex:1; min-width:300px;';
  rightCol.innerHTML = `
    <div>
      <div style="font-size:16px; font-weight:600; color:#444; margin-bottom:5px; border-bottom:1px dashed #eee; padding-bottom:3px;">
        Test Results
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px; margin-bottom:15px;">
        <div style="background:#f8f9fa; padding:10px; border-radius:6px; text-align:center;">
          <div style="font-size:24px; font-weight:600;">${s.totalComparisons}</div>
          <div style="font-size:12px; color:#666; margin-top:5px;">Total Tests</div>
        </div>
        <div style="background:#e7f5ea; padding:10px; border-radius:6px; text-align:center;">
          <div style="font-size:24px; font-weight:600; color:#27ae60;">${s.successful}</div>
          <div style="font-size:12px; color:#2ecc71; margin-top:5px;">Successful</div>
        </div>
        <div style="background:#fdedee; padding:10px; border-radius:6px; text-align:center;">
          <div style="font-size:24px; font-weight:600; color:#e74c3c;">${s.failures}</div>
          <div style="font-size:12px; color:#c0392b; margin-top:5px;">Failures</div>
        </div>
        <div style="background:#fff8e6; padding:10px; border-radius:6px; text-align:center;">
          <div style="font-size:24px; font-weight:600; color:#f39c12;">${s.endpointsWithDiffs}</div>
          <div style="font-size:12px; color:#d35400; margin-top:5px;">With Diffs</div>
        </div>
      </div>
      
      <div class="legend" style="margin-top:10px; display:flex; font-size:13px; gap:10px;">
        <div style="display:flex; align-items:center;">
          <span style="width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; background:#e7f5ea; border-radius:3px; color:#27ae60; font-size:11px; margin-right:3px;">✅</span>
          <span>OK</span>
        </div>
        <div style="display:flex; align-items:center;">
          <span style="width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; background:#fff8e6; border-radius:3px; color:#f39c12; font-size:11px; margin-right:3px;">⚠️</span>
          <span>Warning</span>
        </div>
        <div style="display:flex; align-items:center;">
          <span style="width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; background:#fdedee; border-radius:3px; color:#e74c3c; font-size:11px; margin-right:3px;">❌</span>
          <span>Error</span>
        </div>
      </div>
    </div>
  `;
  metadataSection.appendChild(rightCol);
  summaryCard.appendChild(metadataSection);
  
  // Headers section with collapsible behavior
  let headersSection;
  
  if (job.headersUsed) {
    headersSection = document.createElement('div');
    headersSection.className = 'headers-section';
    headersSection.style.cssText = 'margin-top:15px; border-top:1px solid #eee; padding-top:15px;';
    
    const headersTitle = document.createElement('div');
    headersTitle.style.cssText = 'font-size:16px; font-weight:600; color:#444; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;';
    headersTitle.innerHTML = `
      <div>Headers Used (template for this job)</div>
      <div class="toggle-btn" style="font-size:22px; color:#999; transform:rotate(0deg); transition:transform 0.3s;">▾</div>
    `;
    
    const headersContent = document.createElement('div');
    headersContent.className = 'headers-content';
    headersContent.style.cssText = 'height:120px; overflow:hidden; transition:height 0.3s ease;';
    headersContent.innerHTML = `
      <pre style="font-size:0.85rem; color:#333; background:#f9f9f9; padding:0.75rem; border-radius:6px; margin-top:0; max-height:none; overflow-y:auto;">
${JSON.stringify(job.headersUsed, null, 2)}
      </pre>
    `;
    
    headersTitle.addEventListener('click', () => {
      const isCollapsed = headersContent.style.height === '120px';
      headersContent.style.height = isCollapsed ? '250px' : '120px';
      headersTitle.querySelector('.toggle-btn').style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    });
    
    headersSection.appendChild(headersTitle);
    headersSection.appendChild(headersContent);
    summaryCard.appendChild(headersSection);
  } else {
    headersSection = document.createElement('div');
    headersSection.style.cssText = 'margin-top:15px; font-size:14px; color:#666; font-style:italic;';
    headersSection.textContent = 'Headers information not available in this report version';
    summaryCard.appendChild(headersSection);
  }
  
  container.appendChild(summaryCard);
  
  // Add horizontal rule after summary
  const hr = document.createElement('hr');
  hr.style.cssText = 'border:0; height:1px; background-color:#eee; margin:20px 0;';
  container.appendChild(hr);

  // 3) Search box + filter buttons
  const searchFilterHTML = `
    <div class="search-filter-container">
      <input type="text" id="endpointSearch" placeholder="Search by key or JSON path…" />
      <div>
        <button id="showAll" class="filter-btn filter-active">All</button>
        <button id="showErrors" class="filter-btn">Errors</button>
        <button id="showWarnings" class="filter-btn">Warnings</button>
        <button id="showFail" class="filter-btn">Failures</button>
      </div>
    </div>
  `;
  container.insertAdjacentHTML("beforeend", searchFilterHTML);

  // 4) Container for cards
  const cardsContainer = document.createElement("div");
  cardsContainer.id = `cards-${job.jobName.replace(/\s+/g, "_")}`;
  container.appendChild(cardsContainer);

  // Render each endpoint record as a card
  job.endpoints.forEach((rec, idx) => {
    const card = document.createElement("div");
    card.className = "endpoint-card";

    // Determine overall severity
    let overallSeverity = "ok";
    if (rec.error) overallSeverity = "failure";
    else if (rec.diffs.some(d => d.severity === "Error")) overallSeverity = "error";
    else if (rec.diffs.some(d => d.severity === "Warning")) overallSeverity = "warning";
    
    // Set data attribute for search and filtering
    card.dataset.severity = overallSeverity;

    // Choose icon
    let icon = "✅";
    if (overallSeverity === "error" || overallSeverity === "failure") icon = "❌";
    else if (overallSeverity === "warning") icon = "⚠️";

    // Status badge color
    function statusBadge(status) {
      if (status >= 500) return `<span style='background:#e74c3c;color:white;padding:2px 7px;border-radius:4px;font-size:12px;'>${status}</span>`;
      if (status >= 400) return `<span style='background:#f39c12;color:white;padding:2px 7px;border-radius:4px;font-size:12px;'>${status}</span>`;
      if (status >= 200 && status < 300) return `<span style='background:#27ae60;color:white;padding:2px 7px;border-radius:4px;font-size:12px;'>${status}</span>`;
      return `<span style='background:#bbb;color:white;padding:2px 7px;border-radius:4px;font-size:12px;'>${status}</span>`;
    }
    // Geo badge
    function geoBadge(geo) {
      return `<span style='background:#2980b9;color:white;padding:2px 7px;border-radius:4px;font-size:12px;'>${geo}</span>`;
    }

    // Header: visually distinct with colored top bar
    const headerHTML = `
      <div style="border-radius:6px 6px 0 0; border-top:5px solid ${overallSeverity==='error'||overallSeverity==='failure'?'#e74c3c':overallSeverity==='warning'?'#f39c12':'#27ae60'}; background:#fff; display:flex; align-items:center; gap:10px; padding:10px 18px; font-size:1rem;">
        <span style="font-size:1.5rem;">${icon}</span>
        <span style="font-weight:600; font-size:1.1rem;">${rec.key}</span>
        <span style="margin-left:10px; color:#888;">Params:</span> <span style="font-family:monospace;">${JSON.stringify(rec.params)}</span>
        <span style="margin-left:10px;">${geoBadge(rec.cbLoc)}</span>
        <span style="margin-left:auto;">Prod: ${statusBadge(rec.statusA)}</span>
        <span>Stg: ${statusBadge(rec.statusB)}</span>
      </div>
    `;
    card.insertAdjacentHTML("beforeend", headerHTML);

    // If error, show error message
    if (rec.error) {
      const errHTML = `<div class="error-msg">Error: ${rec.error}</div>`;
      card.insertAdjacentHTML("beforeend", errHTML);
    }

    // Enhanced request details with grid, badges, and clear labels
    const fasterResp = rec.responseTimeA < rec.responseTimeB ? 'A' : (rec.responseTimeA > rec.responseTimeB ? 'B' : null);
    const timeA = new Date(rec.timestampA).toLocaleTimeString();
    const timeB = new Date(rec.timestampB).toLocaleTimeString();

    const requestDetailsHTML = `
      <div style="background:#f8fafd; border:1px solid #dde6f1; border-radius:0 0 8px 8px; margin-bottom:10px; padding:14px 18px 10px 18px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; align-items:center;">
          <div>
            <div style="font-size:13px; color:#888; margin-bottom:5px;">Prod (A)</div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:15px; color:#3498db; font-weight:bold;">${rec.responseTimeA} ms</span>
              <span style="color:#888; font-size:12px;">at ${timeA}</span>
              ${fasterResp === 'A' ? '<span style="background:#27ae60;color:white;padding:2px 7px;border-radius:4px;font-size:12px; margin-left:5px;">🚀 Faster</span>' : ''}
            </div>
            <div style="font-size:12px; margin-top:3px; color:#666;">
              <span style="font-weight:bold;">URL:</span> <span style="word-break:break-all;">${rec.urlA}</span>
            </div>
          </div>
          <div>
            <div style="font-size:13px; color:#888; margin-bottom:5px;">Staging (B)</div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:15px; color:#2ecc71; font-weight:bold;">${rec.responseTimeB} ms</span>
              <span style="color:#888; font-size:12px;">at ${timeB}</span>
              ${fasterResp === 'B' ? '<span style="background:#27ae60;color:white;padding:2px 7px;border-radius:4px;font-size:12px; margin-left:5px;">🚀 Faster</span>' : ''}
            </div>
            <div style="font-size:12px; margin-top:3px; color:#666;">
              <span style="font-weight:bold;">URL:</span> <span style="word-break:break-all;">${rec.urlB}</span>
            </div>
          </div>
        </div>
        <div style="margin-top:8px; font-size:12px; color:#888;">
          <span style="background:#2980b9;color:white;padding:2px 7px;border-radius:4px;font-size:12px;">Geo: ${rec.cbLoc}</span>
        </div>
      </div>
    `;
    card.insertAdjacentHTML("beforeend", requestDetailsHTML);

    // --- Organized and collapsible diff display ---
    if (rec.diffs && rec.diffs.length > 0) {
      // Group diffs by change type and sort by priority (highest to lowest)
      const structuralDiffs = rec.diffs
        .filter(diff => diff.changeType === 'structural')
        .sort((a, b) => (b.priority || 1) - (a.priority || 1)); // Sort by priority, highest first
      
      const valueDiffs = rec.diffs
        .filter(diff => diff.changeType === 'value')
        .sort((a, b) => (b.priority || 1) - (a.priority || 1)); // Sort by priority, highest first
      
      const diffContainer = document.createElement('div');
      diffContainer.className = 'diff-container';
      diffContainer.style.cssText = 'margin-top:15px;';
      
      // Extract critical changes (missing fields, etc.) - priority >= 8
      const criticalDiffs = structuralDiffs.filter(d => d.priority >= 8);
      
      // Helper function to create a readable path tooltip
      const createReadablePathTooltip = (path, diff) => {
        if (!path || !Array.isArray(path) || path.length === 0) return '';
        
        // Create a readable description of the path
        let parts = [];
        let currentPath = [];
        let isArrayIndex = false;
        
        for (let i = 0; i < path.length; i++) {
          const part = path[i];
          currentPath.push(part);
          
          if (typeof part === 'number') {
            // This is an array index - get its parent array name
            const arrayName = path[i-1];
            parts.push(`${arrayName}[${part}]`);
            isArrayIndex = true;
          } else if (isArrayIndex) {
            // This is a property after an array index
            parts.push(`└─ ${part}`);
            isArrayIndex = false;
          } else {
            // Regular property
            parts.push(part);
          }
        }
        
        // Add value information if available
        let valueInfo = '';
        if (diff.kind === 'D' && diff.lhs !== undefined) {
          // For deletions, show the value that was deleted
          if (typeof diff.lhs === 'object') {
            valueInfo = '\n\nDeleted value: ' + JSON.stringify(diff.lhs, null, 2);
          } else {
            valueInfo = '\n\nDeleted value: ' + diff.lhs;
          }
        } else if (diff.kind === 'E') {
          // For edits, show before and after
          valueInfo = '\n\nBefore: ' + diff.lhs + '\nAfter: ' + diff.rhs;
        }
        
        return parts.join('\n') + valueInfo;
      };
      
      // Helper function to format a diff message
      const formatDiffMessage = (diff) => {
        // Determine severity color and icon
        let sevColor = diff.severity === 'Error' ? '#e74c3c' : diff.severity === 'Warning' ? '#f39c12' : '#3498db';
        let icon = diff.severity === 'Error' ? '❌' : diff.severity === 'Warning' ? '⚠️' : 'ℹ️';
        let pathStr = diff.stringPath || (Array.isArray(diff.path) ? diff.path.join('.') : diff.path);
        
        // Create a tooltip to help read the path
        const tooltip = createReadablePathTooltip(diff.path, diff);
        
        // Check if this is a critical change (priority >= 8)
        const isCritical = diff.priority >= 8;
        
        // Create the message differently based on change type
        let msg = '';
        let pathElement = '';
        
        // Common path element with tooltip
        if (tooltip) {
          pathElement = `<span style='color:${sevColor}; font-weight:600; text-decoration:underline dotted; cursor:help;' title="${tooltip}">${pathStr}</span>`;
        } else {
          pathElement = `<span style='color:${sevColor}; font-weight:600;'>${pathStr}</span>`;
        }
        
        if (diff.kind === 'D') {
          // Field deletion - add more context about what was removed
          let fieldDescription = '';
          
          // Check if we can extract the field name and value
          if (diff.path && diff.path.length > 0) {
            // Get the last part of the path (the actual field name)
            const fieldName = diff.path[diff.path.length - 1];
            
            // Add value if available
            if (diff.lhs !== undefined) {
              if (typeof diff.lhs === 'object') {
                // For objects, show type or first few keys
                if (Array.isArray(diff.lhs)) {
                  fieldDescription = ` (array with ${diff.lhs.length} elements)`;
                } else {
                  const keys = Object.keys(diff.lhs);
                  if (keys.length > 0) {
                    fieldDescription = ` (object with keys: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''})`;
                  } else {
                    fieldDescription = ` (empty object)`;
                  }
                }
              } else {
                // For primitives, show the value
                fieldDescription = ` = "${diff.lhs}"`;
              }
            }
          }
          
          msg = `${icon} ${pathElement}${fieldDescription} was <b>removed</b> from <b>Staging</b>.`;
        } else if (diff.kind === 'N') {
          // Field addition
          msg = `${icon} ${pathElement} was <b>added</b> in <b>Staging</b>.`;
        } else if (diff.kind === 'E') {
          // Value change
          msg = `${icon} ${pathElement} changed: <span style='color:#b30000;'>${JSON.stringify(diff.lhs)}</span> → <span style='color:#006b21;'>${JSON.stringify(diff.rhs)}</span>`;
        } else if (diff.kind === 'A') {
          // Array change
          if (diff.item && diff.item.kind === 'D') {
            // Check if there's detailed info about what was removed
            let removedContent = '';
            
            if (diff.item.lhs && typeof diff.item.lhs === 'object') {
              // Try to identify the key objects in the removed element
              const keys = Object.keys(diff.item.lhs);
              if (keys.length > 0) {
                if (keys.includes('adDetail')) {
                  // Special handling for adDetail which is particularly important
                  removedContent = ` containing <b>adDetail</b> object`;
                  diff.priority = 10; // Elevate priority for adDetail removal
                } else {
                  // Show first key as identifier of what was removed
                  removedContent = ` containing <b>${keys[0]}</b>`;
                }
              }
            }
            
            msg = `${icon} ${pathElement} array element${removedContent} was <b>removed</b>.`;
          } else if (diff.item && diff.item.kind === 'N') {
            // Similar enhanced reporting for added elements
            let addedContent = '';
            
            if (diff.item.rhs && typeof diff.item.rhs === 'object') {
              const keys = Object.keys(diff.item.rhs);
              if (keys.length > 0) {
                if (keys.includes('adDetail')) {
                  addedContent = ` containing <b>adDetail</b> object`;
                } else {
                  addedContent = ` containing <b>${keys[0]}</b>`;
                }
              }
            }
            
            msg = `${icon} ${pathElement} array element${addedContent} was <b>added</b>.`;
          } else {
            msg = `${icon} ${pathElement} array changed.`;
          }
        } else {
          // Other change
          msg = `${icon} <span style='color:${sevColor}; font-weight:600;'>${pathStr}</span> changed.`;
        }
        
        // Add special highlighting for critical changes
        if (isCritical) {
          return `<div style="background-color:rgba(231,76,60,0.08); padding:5px 8px; border-left:3px solid #e74c3c; margin-left:-10px;">
            ${msg}
          </div>`;
        }
        
        return msg;
      };
      
      // Helper function to create collapsible section
      const createCollapsibleSection = (title, diffs, isExpanded, importance) => {
        const section = document.createElement('div');
        section.className = 'diff-section';
        section.style.cssText = 'margin-bottom:15px; border:1px solid #e1e4e8; border-radius:6px; overflow:hidden;';
        
        // Header with count badge and toggle button
        const header = document.createElement('div');
        header.className = 'diff-section-header';
        header.style.cssText = `
          display:flex; 
          justify-content:space-between; 
          align-items:center; 
          padding:10px 15px; 
          background:${importance === 'high' ? '#fef5f5' : '#f6f8fa'}; 
          border-bottom:1px solid #e1e4e8; 
          cursor:pointer;
        `;
        
        const badge = `<span style="background:${importance === 'high' ? '#e74c3c' : '#3498db'}; color:white; padding:2px 8px; border-radius:10px; font-size:12px; margin-left:10px;">${diffs.length}</span>`;
        header.innerHTML = `
          <div style="font-weight:600; font-size:15px; display:flex; align-items:center;">
            ${title} ${badge}
          </div>
          <div class="toggle-icon" style="font-size:18px; transition:transform 0.3s;">${isExpanded ? '▾' : '▸'}</div>
        `;
        
        // Content container
        const content = document.createElement('div');
        content.className = 'diff-section-content';
        content.style.cssText = `
          height:${isExpanded ? 'auto' : '0px'}; 
          overflow:hidden; 
          transition:height 0.3s ease;
        `;
        
        // Diff list
        if (diffs.length > 0) {
          const list = document.createElement('ul');
          list.style.cssText = 'list-style:disc inside; margin:0; padding:15px 15px 15px 28px; font-size:14px; color:#222;';
          
          diffs.forEach(diff => {
            const item = document.createElement('li');
            item.style.cssText = 'margin-bottom:6px; line-height:1.4;';
            item.innerHTML = formatDiffMessage(diff);
            list.appendChild(item);
          });
          
          content.appendChild(list);
        } else {
          content.innerHTML = '<div style="padding:15px; color:#666; font-style:italic;">No changes detected</div>';
        }
        
        // Toggle functionality
        header.addEventListener('click', () => {
          const isCurrentlyExpanded = content.style.height !== '0px';
          content.style.height = isCurrentlyExpanded ? '0px' : 'auto';
          header.querySelector('.toggle-icon').textContent = isCurrentlyExpanded ? '▸' : '▾';
        });
        
        section.appendChild(header);
        section.appendChild(content);
        return section;
      };
      
      // If we have critical changes (priority >= 8), create special section for them
      if (criticalDiffs.length > 0) {
        const criticalSection = createCollapsibleSection(
          '⚠️ Critical Changes (Missing Fields)', 
          criticalDiffs, 
          true, // Always expanded by default
          'critical' // Critical styling
        );
        criticalSection.style.cssText = 'margin-bottom:15px; border:2px solid #e74c3c; border-radius:6px; overflow:hidden; box-shadow: 0 0 5px rgba(231, 76, 60, 0.3);';
        diffContainer.appendChild(criticalSection);
      }
      
      // Create the structural changes section (collapsed by default)
      const structuralSection = createCollapsibleSection(
        '🔍 Structural Changes (Keys Added/Removed)', 
        criticalDiffs.length > 0 ? structuralDiffs.filter(d => d.priority < 8) : structuralDiffs, 
        false, // Collapsed by default
        'high' // High importance styling
      );
      diffContainer.appendChild(structuralSection);
      
      // Create the value changes section (collapsed by default)
      const valueSection = createCollapsibleSection(
        '📊 Value Changes', 
        valueDiffs, 
        false, // Collapsed by default
        'normal'
      );
      diffContainer.appendChild(valueSection);
      
      // Add a summary banner if there are many diffs
      if (rec.diffs.length > 10) {
        const summaryBanner = document.createElement('div');
        summaryBanner.style.cssText = 'margin:0 0 15px 0; padding:10px 15px; background:#f0f7fb; border-left:5px solid #3498db; font-size:14px; color:#2c3e50;';
        summaryBanner.innerHTML = `
          <strong>Large comparison:</strong> ${rec.diffs.length} differences found 
          (${structuralDiffs.length} structural, ${valueDiffs.length} value changes).
          <span style="font-style:italic; color:#666; margin-left:5px;">Click sections to expand/collapse.</span>
        `;
        diffContainer.insertBefore(summaryBanner, diffContainer.firstChild);
      }
      
      card.appendChild(diffContainer);
    }

    // Headers are now displayed in the job summary section, so we don't need individual header buttons

    // Show side-by-side JSON A vs B toggle
    if (rec.rawJsonA && rec.rawJsonB) {
      // 1) Toggle button
      const toggleBtn = document.createElement("button");
      toggleBtn.textContent = "Show JSON A vs B";
      toggleBtn.className = "show-json-btn";
      toggleBtn.style.cssText = `
        background-color: #3498db; 
        color: white; 
        border: none; 
        padding: 8px 16px; 
        border-radius: 4px; 
        cursor: pointer; 
        font-weight: 600; 
        margin: 10px 0;
        display: inline-flex;
        align-items: center;
        transition: background-color 0.2s;
      `;
      toggleBtn.innerHTML = '<span style="margin-right:8px;">🔍</span> Show JSON A vs B';
      toggleBtn.onmouseover = () => toggleBtn.style.backgroundColor = '#2980b9';
      toggleBtn.onmouseout = () => toggleBtn.style.backgroundColor = '#3498db';

      // 2) Hidden side-by-side container
      const sideBySideDiv = document.createElement("div");
      sideBySideDiv.className = "json-side-by-side";
      sideBySideDiv.style.cssText = `
        display: none;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin: 16px 0;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      `;

      // 3) Pane A
      const paneA = document.createElement("div");
      paneA.className = "json-pane";
      paneA.style.cssText = `
        background: #f8f9fa; 
        padding: 16px; 
        border-radius: 4px; 
        max-height: 500px; 
        overflow-y: auto;
        border-left: 4px solid #3498db;
        font-family: monospace;
        white-space: pre-wrap;
      `;
      
      // Plain text for copying (hidden)
      const rawTextA = document.createElement('pre');
      rawTextA.style.cssText = 'display: none;';
      rawTextA.textContent = JSON.stringify(rec.rawJsonA, null, 2);
      
      // For display: plain JSON only
      const headerA = document.createElement('div');
      headerA.style.cssText = 'font-weight:600; margin-bottom:10px; color:#3498db; display:flex; justify-content:space-between;';
      headerA.innerHTML = `
        <span>Production (A)</span>
        <button class="copy-json-btn" style="background:none;border:none;color:#3498db;cursor:pointer;font-size:12px;">
          📋 Copy JSON
        </button>
      `;
      paneA.appendChild(headerA);
      
      const contentA = document.createElement('pre');
      contentA.style.cssText = 'background: #f8f9fa; padding: 0; margin: 0; border: none; font-family: monospace; font-size: 13px; color: #222;';
      contentA.textContent = rawTextA.textContent;
      paneA.appendChild(contentA);
      paneA.appendChild(rawTextA);
      
      // Add copy functionality
      const copyBtnA = headerA.querySelector('.copy-json-btn');
      copyBtnA.addEventListener('click', () => {
        navigator.clipboard.writeText(rawTextA.textContent)
          .then(() => {
            copyBtnA.textContent = '✓ Copied!';
            setTimeout(() => copyBtnA.innerHTML = '📋 Copy JSON', 2000);
          })
          .catch(err => console.error('Failed to copy:', err));
      });

      // 4) Pane B
      const paneB = document.createElement("div");
      paneB.className = "json-pane";
      paneB.style.cssText = `
        background: #f8f9fa; 
        padding: 16px; 
        border-radius: 4px; 
        max-height: 500px; 
        overflow-y: auto;
        border-left: 4px solid #2ecc71;
        font-family: monospace;
        white-space: pre-wrap;
      `;
      
      // Plain text for copying (hidden)
      const rawTextB = document.createElement('pre');
      rawTextB.style.cssText = 'display: none;';
      rawTextB.textContent = JSON.stringify(rec.rawJsonB, null, 2);
      
      // For display: plain JSON only
      const headerB = document.createElement('div');
      headerB.style.cssText = 'font-weight:600; margin-bottom:10px; color:#2ecc71; display:flex; justify-content:space-between;';
      headerB.innerHTML = `
        <span>Staging (B)</span>
        <button class="copy-json-btn" style="background:none;border:none;color:#2ecc71;cursor:pointer;font-size:12px;">
          📋 Copy JSON
        </button>
      `;
      paneB.appendChild(headerB);
      
      const contentB = document.createElement('pre');
      contentB.style.cssText = 'background: #f8f9fa; padding: 0; margin: 0; border: none; font-family: monospace; font-size: 13px; color: #222;';
      contentB.textContent = rawTextB.textContent;
      paneB.appendChild(contentB);
      paneB.appendChild(rawTextB);
      
      // Add copy functionality
      const copyBtnB = headerB.querySelector('.copy-json-btn');
      copyBtnB.addEventListener('click', () => {
        navigator.clipboard.writeText(rawTextB.textContent)
          .then(() => {
            copyBtnB.textContent = '✓ Copied!';
            setTimeout(() => copyBtnB.innerHTML = '📋 Copy JSON', 2000);
          })
          .catch(err => console.error('Failed to copy:', err));
      });

      sideBySideDiv.appendChild(paneA);
      sideBySideDiv.appendChild(paneB);

      // 5) Toggle logic: show/hide with slide effect
      toggleBtn.addEventListener("click", () => {
        const isExpanded = sideBySideDiv.style.display !== "none";
        if (isExpanded) {
          sideBySideDiv.style.display = "none";
          toggleBtn.innerHTML = '<span style="margin-right:8px;">🔍</span> Show JSON A vs B';
        } else {
          sideBySideDiv.style.display = "grid";
          toggleBtn.innerHTML = '<span style="margin-right:8px;">🔼</span> Hide JSON A vs B';
        }
      });

      // 6) Monaco Diff Viewer Button
      const monacoDiffBtn = document.createElement("button");
      monacoDiffBtn.className = "monaco-diff-btn";
      monacoDiffBtn.style.cssText = `
        background-color: #9b59b6; 
        color: white; 
        border: none; 
        padding: 8px 16px; 
        border-radius: 4px; 
        cursor: pointer; 
        font-weight: 600; 
        margin: 10px 0 10px 10px;
        display: inline-flex;
        align-items: center;
        transition: background-color 0.2s;
      `;
      monacoDiffBtn.innerHTML = '<span style="margin-right:8px;">🔄</span> Monaco Diff Viewer';
      monacoDiffBtn.onmouseover = () => monacoDiffBtn.style.backgroundColor = '#8e44ad';
      monacoDiffBtn.onmouseout = () => monacoDiffBtn.style.backgroundColor = '#9b59b6';
      
      // Handle click to open Monaco diff viewer
      monacoDiffBtn.addEventListener("click", () => {
        // Generate record ID if not available
        const recordId = rec.id || `${rec.endpoint}-${Date.now()}`;
        
        // Open Monaco diff viewer in a new tab/window with explicit port (8080)
        const baseUrl = window.location.protocol + '//' + window.location.hostname + ':8080';
        const monacoUrl = `${baseUrl}/monaco-diff?recordId=${encodeURIComponent(recordId)}&folder=${encodeURIComponent(window.REPORT_FOLDER)}`;
        window.open(monacoUrl, '_blank');
      });

      // Add buttons and content to card
      const btnContainer = document.createElement("div");
      btnContainer.style.display = "flex";
      btnContainer.appendChild(toggleBtn);
      btnContainer.appendChild(monacoDiffBtn);

      card.appendChild(btnContainer);
      card.appendChild(sideBySideDiv);
    }

    // Show Diffs button + diff content
    if (rec.diffs && rec.diffs.length > 0) {
      const btn = document.createElement("button");
      btn.className = "toggle-btn";
      btn.style.cssText = `
        background-color: #9b59b6; 
        color: white; 
        border: none; 
        padding: 8px 16px; 
        border-radius: 4px; 
        cursor: pointer; 
        font-weight: 600; 
        margin: 10px 5px 10px 0;
        display: inline-flex;
        align-items: center;
        transition: background-color 0.2s;
      `;
      btn.innerHTML = '<span style="margin-right:8px;">📐</span> Show Differences';
      btn.onmouseover = () => btn.style.backgroundColor = '#8e44ad';
      btn.onmouseout = () => btn.style.backgroundColor = '#9b59b6';

      const diffContainer = document.createElement("div");
      diffContainer.className = "diff-content";
      diffContainer.style.cssText = `
        display: none;
        padding: 16px;
        margin: 16px 0;
        background: #fff;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border-left: 4px solid #9b59b6;
      `;

      rec.diffs.forEach((d) => {
        // Get the kind of change and display it in a human-readable format
        let changeType = "Unknown";
        let changeColor = "#888";
        let changeIcon = "";
        
        switch(d.kind) {
          case "E": 
            changeType = "Edit (Value Changed)"; 
            changeColor = "#3498db"; // Blue
            changeIcon = "🔄";
            break;
          case "N": 
            changeType = "New (Value Added)"; 
            changeColor = "#2ecc71"; // Green
            changeIcon = "➕";
            break;
          case "D": 
            changeType = "Delete (Value Removed)"; 
            changeColor = "#e74c3c"; // Red
            changeIcon = "➖";
            break;
          case "A": 
            changeType = "Array (Item Changed)"; 
            changeColor = "#9b59b6"; // Purple
            changeIcon = "📝";
            break;
        }
        
        // Get severity color
        let severityColor = d.severity === 'Error' ? '#e74c3c' : d.severity === 'Warning' ? '#f39c12' : '#3498db';
        let severityIcon = d.severity === 'Error' ? '❌' : d.severity === 'Warning' ? '⚠️' : 'ℹ️';
        
        // Format before/after values nicely with syntax highlighting for objects
        const formatValue = (val) => {
          if (val === undefined) return "<em style='color:#888;'>undefined</em>";
          if (val === null) return "<em style='color:#888;'>null</em>";
          if (typeof val === "object") {
            // Pretty print objects with syntax highlighting
            const formatted = JSON.stringify(val, null, 2)
              .replace(/\"([^\"]+)\"\s*:/g, '<span style="color:#e67e22;">"$1"</span>:') // keys in orange
              .replace(/(true|false)/g, '<span style="color:#8e44ad;">$1</span>') // booleans in purple
              .replace(/(\d+)/g, '<span style="color:#16a085;">$1</span>'); // numbers in teal
            return `<pre style="background:#f8f9fa; padding:8px; border-radius:4px; border-left:4px solid #ddd;">${formatted}</pre>`;
          }
          if (typeof val === "string") return `<span style="color:#c0392b;">"${val}"</span>`; // strings in red
          return String(val);
        };
        
        // Try to use the jsondiffpatch formatter for visualization if available
        let diffHtml = "";
        try {
          diffHtml = jsondiffpatch.formatters.html.format(d.rawDiff);
        } catch (err) {
          console.warn("Failed to format diff with jsondiffpatch:", err);
          // Fallback to simple display
        }
        
        // Get path display with better formatting
        const pathDisplay = Array.isArray(d.path) ? 
          d.path.map(segment => `<span style="font-family:monospace; background:#f1f1f1; padding:2px 5px; margin:0 2px; border-radius:3px;">${segment}</span>`).join('.') : 
          `<span style="font-family:monospace; background:#f1f1f1; padding:2px 5px; margin:0 2px; border-radius:3px;">${d.path}</span>`;
        
        // Create card-style diff with improved visual hierarchy
        const wrapper = document.createElement("div");
        wrapper.className = "single-diff";
        wrapper.style.cssText = "background-color:#fff; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.1); margin-bottom:16px; padding:16px; border-left:5px solid " + severityColor;
        
        wrapper.innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; align-items:center;">
              <span style="font-size:16px; margin-right:5px;">${severityIcon}</span>
              <span style="font-weight:600; color:${severityColor};">${d.severity}</span>
            </div>
            <div style="display:flex; align-items:center;">
              <span style="font-size:16px; margin-right:5px;">${changeIcon}</span>
              <span style="font-weight:500; color:${changeColor};">${changeType}</span>
            </div>
          </div>
          
          <div style="margin-bottom:12px;">
            <div style="font-weight:600; margin-bottom:5px; color:#555;">Path:</div>
            <div style="font-size:14px;">${pathDisplay}</div>
          </div>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
            <div style="padding:12px; background:#f8f9fa; border-radius:4px; border-left:4px solid #e74c3c;">
              <div style="font-weight:600; color:#e74c3c; margin-bottom:8px;">Before:</div>
              ${formatValue(d.lhs)}
            </div>
            <div style="padding:12px; background:#f8f9fa; border-radius:4px; border-left:4px solid #2ecc71;">
              <div style="font-weight:600; color:#2ecc71; margin-bottom:8px;">After:</div>
              ${formatValue(d.rhs)}
            </div>
          </div>
          
          ${diffHtml ? `
          <div style="margin-top:16px; border-top:1px solid #eee; padding-top:16px;">
            <div style="font-weight:600; margin-bottom:10px; color:#555;">Visual Diff:</div>
            <div class="delta-view" style="background:#fff; border:1px solid #e0e0e0; border-radius:4px; padding:12px;">${diffHtml}</div>
          </div>` : ''}
        `;
        diffContainer.appendChild(wrapper);
      });

      btn.addEventListener("click", () => {
        if (diffContainer.style.display === "none") {
          diffContainer.style.display = "block";
          btn.innerHTML = '<span style="margin-right:8px;">🔽</span> Hide Differences';
        } else {
          diffContainer.style.display = "none";
          btn.innerHTML = '<span style="margin-right:8px;">📐</span> Show Differences';
        }
      });

      card.appendChild(btn);
      card.appendChild(diffContainer);
    }

    container.appendChild(card);
  });

  // 5) Hook up search/filter functionality
  const searchInput = container.querySelector("#endpointSearch");
  searchInput.addEventListener("keyup", () => {
    const query = searchInput.value.toLowerCase();
    
    // Clear previous highlights first
    container.querySelectorAll('.search-highlight').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
    
    container.querySelectorAll(".endpoint-card").forEach(card => {
      // If query is empty, show all cards
      if (!query.trim()) {
        card.style.display = "block";
        return;
      }
      
      // Otherwise, show only cards that match the query
      const text = card.innerText.toLowerCase();
      if (text.includes(query)) {
        card.style.display = "block";
        // Highlight matches
        highlightText(card, new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
      } else {
        card.style.display = "none";
      }
    });
  });
  
  // Helper function to highlight matched text
  function highlightText(element, regex) {
    if (!element) return;
    
    if (element.nodeType === 3) { // Text node
      const matches = element.nodeValue.match(regex);
      if (matches) {
        const frag = document.createDocumentFragment();
        const parts = element.nodeValue.split(regex);
        
        for (let i = 0; i < parts.length; i++) {
          frag.appendChild(document.createTextNode(parts[i]));
          
          if (i < parts.length - 1) {
            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'search-highlight';
            highlightSpan.style.backgroundColor = '#ffeb3b';
            highlightSpan.style.color = '#000';
            highlightSpan.appendChild(document.createTextNode(matches[i]));
            frag.appendChild(highlightSpan);
          }
        }
        
        element.parentNode.replaceChild(frag, element);
        return true;
      }
    } else if (element.nodeType === 1) { // Element node
      // Skip already highlighted elements or style/script tags
      if (element.tagName === 'STYLE' || 
          element.tagName === 'SCRIPT' || 
          element.classList.contains('search-highlight')) {
        return false;
      }
      
      // Process child nodes
      Array.from(element.childNodes).forEach(child => {
        highlightText(child, regex);
      });
    }
    return false;
  }

  const showAllBtn = container.querySelector("#showAll");
  const showErrorsBtn = container.querySelector("#showErrors");
  const showWarningsBtn = container.querySelector("#showWarnings");
  const showFailBtn = container.querySelector("#showFail");

  function clearFilterActive() {
    [showAllBtn, showErrorsBtn, showWarningsBtn, showFailBtn].forEach(b => b.classList.remove("filter-active"));
  }

  showAllBtn.addEventListener("click", () => {
    clearFilterActive();
    showAllBtn.classList.add("filter-active");
    container.querySelectorAll(".endpoint-card").forEach(card => card.style.display = "block");
  });

  showErrorsBtn.addEventListener("click", () => {
    clearFilterActive();
    showErrorsBtn.classList.add("filter-active");
    container.querySelectorAll(".endpoint-card").forEach(card => {
      if (card.dataset.severity === "error" || card.dataset.severity === "failure") {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  });

  showWarningsBtn.addEventListener("click", () => {
    clearFilterActive();
    showWarningsBtn.classList.add("filter-active");
    container.querySelectorAll(".endpoint-card").forEach(card => {
      if (card.dataset.severity === "warning") {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  });

  showFailBtn.addEventListener("click", () => {
    clearFilterActive();
    showFailBtn.classList.add("filter-active");
    container.querySelectorAll(".endpoint-card").forEach(card => {
      if (card.dataset.severity === "failure") {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  });
}
