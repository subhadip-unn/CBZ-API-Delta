# Project Flow Drawing

## High-Level Flow

1. **Load cURL Templates**
   - Read prod and stg (or v1/v2) cURL files with placeholders.
2. **Load Test IDs and Metadata**
   - Read `test_ids.json` (can include series IDs, slugs, referers, etc.).
3. **Substitute Placeholders**
   - Replace all placeholders in URLs and headers with ID/metadata values.
4. **Execute Requests**
   - Send requests to both endpoints for each ID/geo.
5. **Compare Responses**
   - Check status codes, critical headers, and JSON bodies.
   - Log and store differences.
6. **Generate Reports**
   - Write timestamped HTML and Markdown reports with summary, details, and side-by-side diffs.
7. **Extensibility Points**
   - Add schema validation, fuzzy diffs, or a web UI as needed.

## Diagram

```
[Templates + IDs] --> [Substitution] --> [Request] --> [Comparison] --> [Report]
```

## Project Automation Flow — Visual Diagram

This diagram shows the full, detailed flow for the API Endpoint Comparison Framework, including ID management, cURL file preparation, geo looping, and result comparison.

```mermaid
graph TD;
    A[Tester: Copy/Write cURL File] --> B[Tester: Insert Placeholders <SERIES_ID>, <MATCH_ID>, etc.]
    B --> C[Tester: Update test_ids.json with all IDs]
    C --> D[Tester: Run compare_endpoints.py]
    D --> E{Script: Detect Placeholders?}
    E -- Yes --> F[Script: Generate all ID Combinations]
    F --> G[Script: Substitute IDs in cURL]
    G --> H[Script: Parse cURL & Extract Method, URL, Headers, etc.]
    H --> I[Script: For Each Geo in geo_utils.py]
    I --> J[Script: Apply Geo Headers]
    J --> K[Script: Make Requests (prod/stg)]
    K --> L[Script: Compare Status, Headers, Body]
    L --> M[Script: Print/Log Results]
    M --> N[Next ID/Geo Combination]
    E -- No --> I
    N --> O[Done]
```

---

## Summary
- **Each endpoint/test = one cURL file**
- **All IDs managed in one place**
- **No code changes needed for new endpoints**
- **Script is fully automated and geo-aware**
