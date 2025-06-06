// src/public/main.js
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

    // --- Human-readable diff summary ---
    if (rec.diffs && rec.diffs.length > 0) {
      const summaryList = document.createElement('ul');
      summaryList.style.cssText = 'list-style:disc inside; margin:10px 0 0 0; padding:0 0 0 28px; font-size:14px; color:#222;';
      rec.diffs.forEach(diff => {
        let msg = '';
        let sevColor = diff.severity === 'Error' ? '#e74c3c' : diff.severity === 'Warning' ? '#f39c12' : '#3498db';
        let icon = diff.severity === 'Error' ? '❌' : diff.severity === 'Warning' ? '⚠️' : 'ℹ️';
        let pathStr = Array.isArray(diff.path) ? diff.path.join('.') : diff.path;
        if (diff.kind === 'D') {
          msg = `${icon} <span style='color:${sevColor}; font-weight:600;'>${pathStr}</span> was <b>removed</b> from <b>Staging</b>.`;
        } else if (diff.kind === 'N') {
          msg = `${icon} <span style='color:${sevColor}; font-weight:600;'>${pathStr}</span> was <b>added</b> in <b>Staging</b>.`;
        } else if (diff.kind === 'E') {
          msg = `${icon} <span style='color:${sevColor}; font-weight:600;'>${pathStr}</span> changed: <span style='color:#b30000;'>${JSON.stringify(diff.lhs)}</span> → <span style='color:#006b21;'>${JSON.stringify(diff.rhs)}</span>`;
        } else if (diff.kind === 'A') {
          msg = `${icon} <span style='color:${sevColor}; font-weight:600;'>${pathStr}</span> array changed.`;
        } else {
          msg = `${icon} <span style='color:${sevColor}; font-weight:600;'>${pathStr}</span> changed.`;
        }
        summaryList.innerHTML += `<li style='margin-bottom:4px;'>${msg}</li>`;
      });
      card.appendChild(summaryList);
    }

    // Headers are now displayed in the job summary section, so we don't need individual header buttons

    // Show side-by-side JSON A vs B toggle
    if (rec.rawJsonA && rec.rawJsonB) {
      // 1) Toggle button
      const toggleBtn = document.createElement("button");
      toggleBtn.textContent = "Show JSON A vs B";
      toggleBtn.className = "show-json-btn";

      // 2) Hidden side-by-side container
      const sideBySideDiv = document.createElement("div");
      sideBySideDiv.className = "json-side-by-side"; 
      // no ".expanded" class initially

      // 3) Pane A
      const paneA = document.createElement("div");
      paneA.className = "json-pane";
      paneA.textContent = JSON.stringify(rec.rawJsonA, null, 2);

      // 4) Pane B
      const paneB = document.createElement("div");
      paneB.className = "json-pane";
      paneB.textContent = JSON.stringify(rec.rawJsonB, null, 2);

      sideBySideDiv.appendChild(paneA);
      sideBySideDiv.appendChild(paneB);

      // 5) Toggle logic: add/remove "expanded"
      toggleBtn.addEventListener("click", () => {
        const expanded = sideBySideDiv.classList.toggle("expanded");
        toggleBtn.textContent = expanded
          ? "Hide JSON A vs B"
          : "Show JSON A vs B";
      });

      card.appendChild(toggleBtn);
      card.appendChild(sideBySideDiv);
    }

    // Show Diffs button + diff content
    if (rec.diffs && rec.diffs.length > 0) {
      const btn = document.createElement("button");
      btn.textContent = "Show Diffs";
      btn.className = "toggle-btn";

      const diffContainer = document.createElement("div");
      diffContainer.className = "diff-content";
      diffContainer.style.display = "none";

      rec.diffs.forEach((d) => {
        // Get the kind of change and display it in a human-readable format
        let changeType = "Unknown";
        switch(d.kind) {
          case "E": changeType = "Edit (Value Changed)"; break;
          case "N": changeType = "New (Value Added)"; break;
          case "D": changeType = "Delete (Value Removed)"; break;
          case "A": changeType = "Array (Item Changed)"; break;
        }
        
        // Format before/after values nicely
        const formatValue = (val) => {
          if (val === undefined) return "<em>undefined</em>";
          if (val === null) return "<em>null</em>";
          if (typeof val === "object") return `<pre>${JSON.stringify(val, null, 2)}</pre>`;
          if (typeof val === "string") return `"${val}"`;
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
        
        const wrapper = document.createElement("div");
        wrapper.className = "single-diff";
        wrapper.innerHTML = `
          <div><strong>Path:</strong> ${d.path}</div>
          <div><strong>Change Type:</strong> ${changeType}</div>
          <div><strong>Severity:</strong> ${d.severity}</div>
          <div style="margin-top: 8px;">
            <strong>Before:</strong> ${formatValue(d.lhs)}
          </div>
          <div style="margin-top: 4px;">
            <strong>After:</strong> ${formatValue(d.rhs)}
          </div>
          ${diffHtml ? `<div class="delta-view" style="margin-top: 8px;">${diffHtml}</div>` : ''}
          <hr />
        `;
        diffContainer.appendChild(wrapper);
      });

      btn.addEventListener("click", () => {
        if (diffContainer.style.display === "none") {
          diffContainer.style.display = "block";
          btn.textContent = "Hide Diffs";
        } else {
          diffContainer.style.display = "none";
          btn.textContent = "Show Diffs";
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
    container.querySelectorAll(".endpoint-card").forEach(card => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(query) ? "block" : "none";
    });
  });

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
