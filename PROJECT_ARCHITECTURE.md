# CBZ API Delta: Project Architecture

## 1. Overview

CBZ API Delta is a specialized API comparison tool designed to detect differences between production and staging environments across multiple platforms and geographic locations. It systematically calls API endpoints, compares the responses, and generates comprehensive reports with visualized differences.

## 2. Core Features

1. **Multi-Platform Support**: Compares APIs across iOS, Android, Mobile Web, and Desktop Web platforms
2. **Multi-Geo Testing**: Automatically tests each endpoint across multiple geographic locations (IN, US, CA, AE)
3. **Limited Concurrency**: Uses p-limit to cap request concurrency for performance optimization
4. **Rich Metadata**: Captures response times, timestamps, headers, and other contextual data
5. **Visual Diff Rendering**: Provides visual JSON diffs using jsondiffpatch
6. **Quick Test Mode**: Supports running minimal tests for rapid verification
7. **Interactive UI**: Provides filtering, search, and expandable sections for easy analysis

## 3. Project Structure

```
CBZ-API-Delta/
├── config/                  # Configuration Files
│   ├── headers.json         # Platform-specific HTTP headers with cb-loc arrays
│   ├── ids.json             # Test IDs for endpoint substitution
│   ├── endpoints.yaml       # API endpoint definitions by platform
│   └── comparison.yaml      # Job definitions with environment URLs and retry policies
│
├── src/                     # Source Code
│   ├── utils.js             # Helper utilities (URL building, fetch, diff processing)
│   ├── comparator.js        # Core comparison engine with concurrency control
│   ├── reportGenerator.js   # Job runner and report file generation
│   ├── server.js            # Express server for report viewing
│   └── public/              # Frontend assets
│       ├── main.css         # UI styling
│       ├── main.js          # UI interaction and rendering logic
│       └── jsondiffpatch.umd.js  # Third-party diff visualization library
│
├── reports/                 # Generated Reports (timestamped folders)
│   └── YYYY-MM-DD_HH-MM-SS/ # Report instance
│       ├── diff_data.json   # Combined job results with all comparison data
│       └── static/          # Copied UI assets for rendering reports
│
├── package.json             # Dependencies and NPM scripts
├── README.md                # General project documentation
├── PROJECT_ARCHITECTURE.md  # This file - detailed technical documentation
└── QA_GUIDE.md              # Step-by-step guide for QA engineers
```

## 4. Technical Architecture

### 4.1. Configuration Layer

The configuration layer consists of multiple config files that define what to compare and how:

1. **headers.json**: Platform-specific HTTP headers
   ```json
   {
     "i": { "accept": "application/json", "cb-loc": ["IN", "US", "CA", "AE"] },
     "a": { "accept": "application/json", "cb-loc": ["IN", "US", "CA", "AE"] },
     ...
   }
   ```
2. **endpoints.yaml**: Defines all API endpoints by key, platform, and path. Keys can represent different versions (e.g., `matches-live-v1`, `matches-live-v2`).
   ```yaml
   - key: "matches-live-v1"
     platform: "i"
     path: "matches/v1/live"
     idCategory: null
   - key: "matches-live-v2"
     platform: "i"
     path: "matches/v2/live"
     idCategory: null
   # ...
   ```
3. **comparison.yaml**: Defines comparison jobs. Each job can use either:
   - `endpointPairs`: Explicitly pair any two endpoints (e.g., v1 vs v2, stg vs prod, etc.)
   - `endpointsToRun`: (Legacy) Compare the same endpoint on both sides.
   
   Example (explicit pairs):
   ```yaml
   jobs:
     - name: "iOS: Stg v2 vs Prod v1"
       platform: "i"
       baseA: "https://apiserver.cricbuzz.com"
       baseB: "http://api.cricbuzz.stg"
       endpointPairs:
         - endpointA: "matches-live-v1"
           endpointB: "matches-live-v2"
         # ...
   ```
   Example (legacy, same endpoint both sides):
   ```yaml
   jobs:
     - name: "iOS: Prod v1 vs Stg v1"
       platform: "i"
       baseA: "https://apiserver.cricbuzz.com"
       baseB: "http://api.cricbuzz.stg"
       endpointsToRun:
         - matches-live-v1
         - matches-recent-v1
   ```

### 4.2. Comparison Logic

- The backend reads `comparison.yaml` and determines for each job:
  - If `endpointPairs` is present, it compares each pair (A vs B, can be any version or environment).
  - If only `endpointsToRun` is present, it compares the same endpoint on both sides.
- The engine builds URLs using `baseA` and `baseB` with endpoint paths and substitutions.
- For each pair, it fetches responses, compares, and records diffs, timings, and metadata.

### 4.3. Flexible Architecture

- **Any-to-any comparison:** You can compare prod v1 vs stg v2, prod v2 vs stg v1, stg v1 vs stg v2, etc., by configuring `endpointPairs` and base URLs.
- **No code changes needed:** All behavior is config-driven. Add or change pairs in YAML to suit any release/test scenario.
- **Backward compatible:** Legacy jobs using `endpointsToRun` still work for same-key comparisons.

### 4.4. Example Workflow

1. Edit `endpoints.yaml` to define all endpoints and versions for each platform.
2. Edit `comparison.yaml` to define jobs and explicit endpoint pairs to compare.
3. Run the tool (`npm run compare`).
4. Review generated reports for diffs, timings, and QA sign-off.


2. **ids.json**: Test IDs for substitution in endpoint paths
   ```json
   {
     "venueId": [31, 80, 11, 154, 50, 380],
     "teamId": [101, 202, 303, 404],
     ...
   }
   ```

3. **endpoints.yaml**: Endpoint definitions by platform
   ```yaml
   - key: "venue-info"
     platform: "i"
     path: "/venues/v1/{venueId}"
     idCategory: "venueId"
   ```

4. **comparison.yaml**: Job definitions that combine all the above
   ```yaml
   jobs:
     - name: "Quick Test: iOS Prod vs Stg"
       platform: "i"
       baseA: "https://apiserver.cricbuzz.com"
       baseB: "https://api.cricbuzz.stg"
       quickMode: true
       ...
   ```

### 4.2. Core Logic Layer

The core comparison logic is distributed across these files:

1. **utils.js**: Contains utility functions for URL building, HTTP fetching with retry logic, and diff processing
   - `buildUrl(base, platform, path, substitutions)`
   - `retryFetch(url, headers, retries, delayMs)`
   - `filterDiffs(diffs, ignorePaths)`
   - `classifyDiffs(diff)` → categorizes differences as "Error" or "Warning"

2. **comparator.js**: Performs the actual API comparisons with progress tracking
   - Uses a per-job response cache to avoid duplicate calls
   - Implements a `cli-progress` progress bar for real-time feedback
   - Builds comprehensive records with rich metadata
   - Limits concurrency using `p-limit`

3. **reportGenerator.js**: Coordinates running all jobs and saving results
   - Prompts for QA/Test Engineer name
   - Creates timestamped report folders
   - Copies static assets to the report folder
   - Writes combined diff_data.json with results from all jobs

### 4.3. UI Layer

The UI layer consists of:

1. **server.js**: Express server providing:
   - Report listing at `/reports`
   - Report viewing at `/view/:folderName`
   - Static file serving with cache-busting
   - JSON data endpoint at `/diff_data.json?folder={folderName}`

2. **main.js**: Client-side JavaScript for:
   - Fetching and processing diff_data.json
   - Rendering platform tabs
   - Implementing search and filtering
   - Visualizing JSON diffs with jsondiffpatch
   - Expandable card UI with endpoint details

3. **main.css**: UI styling for:
   - Tab navigation
   - Card components
   - Diff visualization
   - Responsive layout

## 5. Key Workflows

### 5.1. Comparison Workflow

1. **Configuration Loading**: Read all config files
2. **Job Processing**: For each job:
   - Filter endpoints by platform
   - For each endpoint → ID substitution → geo location:
     - Build URLs for both environments
     - Make HTTP requests with appropriate headers
     - Compute differences using deep-diff
     - Classify differences
     - Record comprehensive metadata
3. **Report Generation**: Write all results to timestamped folder

### 5.2. Progress Reporting

1. **CLI Progress Bar**: Shows completion percentage and ETA
2. **Task Counting**: Tracks completed/total tasks
3. **Per-Job Caching**: Avoids duplicate requests within a single job run

### 5.3. Report Viewing Workflow

1. **Report Selection**: User views available reports at `/reports`
2. **Report Loading**: UI loads the diff_data.json via AJAX
3. **Tab Rendering**: UI creates platform tabs
4. **Interactive Exploration**: User can:
   - Switch between platforms
   - Filter by severity (All/Errors/Warnings/Failures)
   - Search across endpoints
   - Expand/collapse individual cards
   - View full request details and JSON diffs

## 6. Technology Stack

1. **Backend**:
   - Node.js runtime
   - Express.js for web server
   - p-limit for concurrency control
   - deep-diff for JSON diffing
   - js-yaml for YAML parsing
   - cli-progress for terminal feedback
   - axios for HTTP requests with timeout/retry

2. **Frontend**:
   - Vanilla JavaScript (no framework)
   - CSS3 for styling
   - jsondiffpatch for visual diff rendering
   - Browser fetch API for data loading

3. **Development**:
   - npm for package management
   - git for version control

## 7. Performance Considerations

1. **Limited Concurrency**: Default 5 concurrent requests prevents overwhelming APIs
2. **Response Caching**: Per-job response cache avoids duplicate requests
3. **Quick Mode**: Tests with minimal IDs and locations for rapid verification
4. **Progress Tracking**: Real-time feedback during long-running comparisons
5. **Cache Busting**: Prevents stale data in browser with:
   - URL query timestamps
   - Cache-Control headers
   - ETags disabled

## 8. Extension Points

1. **Add New Platforms**: Update headers.json and endpoints.yaml
2. **Add New Endpoints**: Update endpoints.yaml with new endpoint definitions
3. **Custom Diff Logic**: Extend utils.js with specialized diff handling
4. **New Visualizations**: Add to main.js and main.css
5. **Automated Running**: Create CI/CD pipelines for scheduled testing

## 9. Known Limitations

1. **Memory Usage**: Large API responses can consume significant memory
2. **UI Performance**: Very large diffs may slow down the browser
3. **Authentication**: Currently limited to header-based authentication
4. **Error Handling**: Timeout handling could be more sophisticated

## 10. Future Improvements

1. **Schema Validation**: Add JSON Schema validation for API responses
2. **Response Time Analysis**: Add statistical analysis of response times
3. **Report Export**: Add PDF/CSV export options
4. **CI Integration**: Add GitHub Actions workflow
5. **Real-time Results**: Add WebSocket for live results during comparison
6. **Advanced Filtering**: Add path-specific filtering

---

This document provides a comprehensive view of the CBZ API Delta project architecture. For user guide, please refer to the QA_GUIDE.md file.
