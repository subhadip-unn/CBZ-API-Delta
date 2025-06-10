// src/utils.js

// Disable TLS certificate verification for staging environments
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const axios = require("axios");
const https = require("https");

// Create an axios instance that ignores certificate errors
const axiosInsecure = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 5000,
  validateStatus: null
});

/**
 * buildUrl(base, platform, rawPath, sub)
 *   Substitute placeholders (e.g. {teamId}) in rawPath and return `${base}/${platform}/${filledPath}`
 */
function buildUrl(base, platform, rawPath, sub) {
  let filled = rawPath;
  if (sub && Object.keys(sub).length) {
    for (const [key, val] of Object.entries(sub)) {
      filled = filled.replace(`{${key}}`, encodeURIComponent(val));
    }
  }
  return `${base}/${platform}/${filled}`;
}

/**
 * retryFetch(url, headers, retries, delayMs)
 *   Attempts to GET url with given headers. Retries on network errors or non-2xx status up to `retries` times.
 *   Returns { success, data, status, error }.
 */
async function retryFetch(url, headers, retries, delayMs) {
  let attempt = 0;
  while (true) {
    const start = Date.now();
    try {
      // Use axiosInsecure to bypass certificate errors
      const resp = await axiosInsecure.get(url, {
        headers,
        timeout: 5000,
        validateStatus: null
      });
      const elapsed = Date.now() - start;
      if (resp.status >= 200 && resp.status < 300) {
        return { success: true, data: resp.data, status: resp.status, error: null, responseTimeMs: elapsed };
      } else {
        const errMsg = `Status ${resp.status}`;
        if (attempt >= retries) {
          return { success: false, data: null, status: resp.status, error: errMsg, responseTimeMs: elapsed };
        }
        attempt++;
        await new Promise(r => setTimeout(r, delayMs));
      }
    } catch (e) {
      const elapsed = Date.now() - start;
      if (attempt >= retries) {
        const status = e.response ? e.response.status : null;
        return { success: false, data: null, status, error: e.message, responseTimeMs: elapsed };
      }
      attempt++;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

/**
 * filterDiffs(diffArray, ignorePaths)
 *   Remove any diff whose path (joined with ".") starts with any ignorePath.
 */
function filterDiffs(diffArray, ignorePaths) {
  if (!Array.isArray(diffArray)) return diffArray;
  return diffArray.filter(d => {
    if (!d.path) return true;
    const dotPath = d.path.join(".");
    return !ignorePaths.some(ip => dotPath.startsWith(ip));
  });
}

/**
 * classifyDiffs(diffObj)
 *   Given one deep-diff object { kind, path, lhs, rhs, ... }, assigns:
 *   1. severity:
 *      - "Error" for New (N), Delete (D), Array (A), or non-numeric Edit
 *      - "Warning" for numeric Edit (kind "E")
 *   2. changeType:
 *      - "structural" for New (N), Delete (D) changes that affect the structure
 *      - "structural" for Array (A) changes that add/remove elements
 *      - "value" for Edit (E) changes, and Array (A) changes that only modify values
 *   3. priority: Numerical value to help rank/sort changes by importance
 */
function classifyDiffs(d) {
  // Set severity (as before)
  let severity = "Error";
  if (d.kind === "E") {
    const lhsType = typeof d.lhs;
    const rhsType = typeof d.rhs;
    if (lhsType === "number" && rhsType === "number") {
      severity = "Warning";
    }
  }
  
  // Improved categorization for change type
  let changeType = "value";
  // Priority ranking (higher = more important)
  let priority = 1;
  
  // Property deletions - highest priority structural changes (missing fields)
  if (d.kind === "D") {
    changeType = "structural";
    priority = 10; // Highest priority - these need to be extremely visible
  }
  // Property additions - high priority structural changes (new fields)
  else if (d.kind === "N") {
    changeType = "structural";
    priority = 8;
  }
  // Array changes - need deeper analysis
  else if (d.kind === "A") {
    if (d.item.kind === "N" || d.item.kind === "D") {
      changeType = "structural";
      priority = d.item.kind === "D" ? 7 : 6; // Prioritize deletions
    } else if (d.item.kind === "E") {
      // Check if this is changing object structure or just values
      const itemLhsType = typeof d.item.lhs;
      const itemRhsType = typeof d.item.rhs;
      
      if ((itemLhsType === 'object' && itemRhsType !== 'object') || 
          (itemLhsType !== 'object' && itemRhsType === 'object')) {
        // Changing between object and non-object is structural
        changeType = "structural";
        priority = 5;
      } else {
        // Simple value changes within arrays
        changeType = "value";
        priority = 2;
      }
    }
  }
  // Value edits - default
  else if (d.kind === "E") {
    // Special case: if changing between different types, it's more important
    const lhsType = typeof d.lhs;
    const rhsType = typeof d.rhs;
    
    if (lhsType !== rhsType) {
      priority = 4; // Type changes are relatively important
      // If changing between object and primitive, it's structural
      if ((lhsType === 'object' && rhsType !== 'object') || 
          (lhsType !== 'object' && rhsType === 'object')) {
        changeType = "structural";
        priority = 5;
      }
    } else {
      // Simple value changes (same type)
      changeType = "value";
      priority = lhsType === 'number' ? 1 : 2; // Numeric changes lower priority
    }
  }
  
  // Add properties to the original diff object
  d.severity = severity;
  d.changeType = changeType;
  d.priority = priority;
  d.stringPath = d.path ? d.path.join(".") : ""; // Add string path for easier display
  
  return d; // Return the modified original diff object
}

module.exports = { buildUrl, retryFetch, filterDiffs, classifyDiffs };
