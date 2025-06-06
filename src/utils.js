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
 *   Given one deep-diff object { kind, path, lhs, rhs, ... }, assign severity:
 *     - "Error" for New (N), Delete (D), Array (A), or non-numeric Edit
 *     - "Warning" for numeric Edit (kind "E")
 */
function classifyDiffs(d) {
  let severity = "Error";
  if (d.kind === "E") {
    const lhsType = typeof d.lhs;
    const rhsType = typeof d.rhs;
    if (lhsType === "number" && rhsType === "number") {
      severity = "Warning";
    }
  }
  d.severity = severity; // Add severity to the original diff object
  // d.stringPath = d.path ? d.path.join(".") : ""; // Optionally add for other uses, but keep d.path as array
  return d; // Return the modified original diff object
}

module.exports = { buildUrl, retryFetch, filterDiffs, classifyDiffs };
