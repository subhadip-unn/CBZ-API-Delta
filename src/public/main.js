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

  // 1) Schema Notice
  const schemaNotice = `
    <div style="background:#fff3cd; padding:0.75rem; border:1px solid #ffeeba; border-radius:4px; margin-bottom:1rem;">
      <strong>Note:</strong> This report does <em>not</em> perform JSON‐schema validation. 
      It only compares raw structures. To add schema‐based checks, integrate a JSON Schema validator.
    </div>
  `;
  container.insertAdjacentHTML("beforeend", schemaNotice);

  // 2) QA Metadata & summary
  const ts = new Date(job.timestamp).toLocaleString();
  const s = job.summary;
  const meta = job.meta;
  const qa = job.testEngineer;

  const summaryHTML = `
    <div>
      <div><strong>Test Engineer:</strong> ${qa}</div>
      <div><strong>Report Generated On:</strong> ${ts}</div>
      <div style="margin-top:0.5rem; font-size:0.9rem; color:#555;">
        <div><strong>Endpoints Tested:</strong> ${meta.endpointsRun.join(", ")}</div>
        <div><strong>IDs Used:</strong> ${meta.idsUsed.join(", ")}</div>
        <div><strong>Geo Locations:</strong> ${meta.geoUsed.join(", ")}</div>
      </div>
      <div style="margin-top:0.75rem;">
        <h2>Job: ${job.jobName}</h2>
        <ul style="font-size:0.9rem; color:#333;">
          <li>Total comparisons: ${s.totalComparisons}</li>
          <li>Successful: ${s.successful}</li>
          <li>Failures: ${s.failures}</li>
          <li>Endpoints with diffs: ${s.endpointsWithDiffs}</li>
        </ul>
      </div>
      <div class="legend">
        <span>Legend:</span>
        <span style="margin-left:1rem; color:green;">✅ OK</span>
        <span style="margin-left:1rem; color:orange;">⚠️ Warning</span>
        <span style="margin-left:1rem; color:red;">❌ Error/Failure</span>
      </div>
    </div>
    <hr />
  `;
  container.insertAdjacentHTML("beforeend", summaryHTML);

  // Add headers block in job summary section
  if (job.headersUsed) { // Check if job.headersUsed (template headers) exists
    const headersBlock = `
      <div style="background:#f1f1f1; padding:0.5rem; 
                  border:1px solid #ccc; border-radius:4px; margin-bottom:1rem;">
        <strong>Headers Used (template for this job):</strong>
        <pre style="font-size:0.85rem; color:#333;">
${JSON.stringify(job.headersUsed, null, 2)}
        </pre>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", headersBlock);
  } else {
    // Fallback or message if job.headersUsed is not available for some reason
    const noHeadersBlock = `
      <div style="background:#f1f1f1; padding:0.5rem; 
                  border:1px solid #ccc; border-radius:4px; margin-bottom:1rem;">
        <strong>Headers Used (template for this job):</strong>
        <pre style="font-size:0.85rem; color:#333;">
Not available in this report version.
        </pre>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", noHeadersBlock);
  }

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

    // Header
    const headerClass = overallSeverity === "ok"
      ? "card-header ok"
      : overallSeverity === "warning"
      ? "card-header warning"
      : "card-header error";

    const headerHTML = `
      <div class="${headerClass}">
        <span>${icon}</span>
        <span><strong>${rec.key}</strong></span>
        <span>| Params: ${JSON.stringify(rec.params)}</span>
        <span>| Status A: ${rec.statusA}</span>
        <span>| Status B: ${rec.statusB}</span>
      </div>
    `;
    card.insertAdjacentHTML("beforeend", headerHTML);

    // If error, show error message
    if (rec.error) {
      const errHTML = `<div class="error-msg">Error: ${rec.error}</div>`;
      card.insertAdjacentHTML("beforeend", errHTML);
    }

    // Timing & Geo info
    const timingHTML = `
      <div class="info-line">
        <strong>Geo:</strong> ${rec.cbLoc} |
        <strong>A took:</strong> ${rec.responseTimeA} ms (at ${new Date(rec.timestampA).toLocaleTimeString()}) |
        <strong>B took:</strong> ${rec.responseTimeB} ms (at ${new Date(rec.timestampB).toLocaleTimeString()})
      </div>
    `;
    card.insertAdjacentHTML("beforeend", timingHTML);

    // URLs
    const urlHTML = `
      <div class="info-line" style="word-break:break-word; margin-top:0.3rem;">
        <strong>URL A:</strong> ${rec.urlA}<br/>
        <strong>URL B:</strong> ${rec.urlB}
      </div>
    `;
    card.insertAdjacentHTML("beforeend", urlHTML);

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
