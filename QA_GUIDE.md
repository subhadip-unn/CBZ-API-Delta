# CBZ API Delta: QA User Guide

This guide provides step-by-step instructions for QA engineers to use the CBZ API Delta tool for comparing API responses across environments, platforms, and geo-locations.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running Comparisons](#running-comparisons)
5. [Viewing Reports](#viewing-reports)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

## Getting Started

CBZ API Delta is a tool for comparing API responses between production and staging environments across multiple platforms (iOS, Android, Mobile Web, Desktop Web) and geographic locations (IN, US, CA, AE).

### Key Features

- **Multi-Geo Testing**: Tests APIs across multiple geographic locations using the `cb-loc` header
- **Limited Concurrency**: Caps concurrent HTTP requests to prevent overloading the API servers
- **Rich Reporting**: Generates detailed reports with timestamps, response times, and visual diffs
- **Interactive UI**: Filter, search, and explore differences in a user-friendly interface

## Installation

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd CBZ-API-Delta
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

   This will install all required dependencies:
   - axios (HTTP client)
   - express (Web server)
   - p-limit (Concurrency control)
   - deep-diff (JSON comparison)
   - js-yaml (YAML parsing)
   - cli-progress (Terminal progress bars)
   - readline-sync (CLI input)

3. **Verify Installation**

   ```bash
   # Verify all required files exist
   ls -la config/ src/
   ```

   You should see the following structure:
   ```
   config/
     ├── comparison.yaml
     ├── endpoints.yaml
     ├── headers.json
     └── ids.json
   src/
     ├── comparator.js
     ├── public/
     ├── reportGenerator.js
     ├── server.js
     └── utils.js
   ```

## Configuration

Before running comparisons, you may need to modify configuration files:

### 1. Testing IDs (config/ids.json)

Update the IDs used for testing:

```json
{
  "venueId": [31, 80, 11, 154, 50, 380],
  "teamId": [101, 202, 303, 404]
}
```

- Each category (`venueId`, `teamId`, etc.) contains an array of IDs
- IDs are substituted into API paths like `/venues/v1/{venueId}`

### 2. Headers (config/headers.json)

Customize HTTP headers per platform:

```json
{
  "i": {
    "accept": "application/json",
    "cb-loc": ["IN", "US", "CA", "AE"],
    "user-agent": "Cricket/14.1 CFNetwork/1120 Darwin/19.0.0"
  },
  "a": {
    "accept": "application/json",
    "cb-loc": ["IN", "US", "CA", "AE"],
    "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36"
  }
}
```

- Each platform has its own set of headers
- `cb-loc` is an array of locations to test
- You can add/modify headers as needed

### 3. Endpoints (config/endpoints.yaml)

Define the endpoints to test:

```yaml
- key: "venue-info"
  platform: "i"  # iOS
  path: "/venues/v1/{venueId}"
  idCategory: "venueId"

- key: "venue-matches"
  platform: "m"  # Mobile web
  path: "/venues/v1/{venueId}/matches"
  idCategory: "venueId"
```

- `key` is a unique identifier for the endpoint
- `platform` is one of: `i` (iOS), `a` (Android), `m` (Mobile Web), `w` (Desktop Web)
- `path` is the API path, with placeholders in `{curlyBraces}`
- `idCategory` references the ID category in ids.json

### 4. Jobs (config/comparison.yaml)

Define the comparison jobs:

```yaml
jobs:
  # Quick test with minimal IDs/geos
  - name: "Quick Test: iOS Prod vs Stg"
    platform: "i"
    baseA: "https://apiserver.cricbuzz.com"
    baseB: "https://api.cricbuzz.stg"
    quickMode: true
    endpointsToRun:
      - "venue-info"
    ignorePaths:
      - "meta.timestamp"
    retryPolicy:
      retries: 1
      delayMs: 1000

  # Full test for iOS
  - name: "iOS: Prod vs Stg (venue endpoints)"
    platform: "i"
    baseA: "https://apiserver.cricbuzz.com"
    baseB: "https://api.cricbuzz.stg"
    endpointsToRun:
      - "venue-info"
      - "venue-matches"
    ignorePaths:
      - "meta.timestamp"
      - "data.generatedId"
    retryPolicy:
      retries: 2
      delayMs: 2000
```

- `name` is a descriptive name for the job
- `platform` matches platforms in endpoints.yaml
- `baseA` and `baseB` are the API base URLs to compare
- `quickMode: true` limits to first ID and first geo-location (for faster testing)
- `endpointsToRun` limits which endpoints to test
- `ignorePaths` ignores specific JSON paths that always differ
- `retryPolicy` configures retry attempts and delay

## Running Comparisons

### Quick Test (Fast)

To run a quick smoke test (only first ID and first geo):

```bash
npm run compare
```

When prompted, enter your name as the QA Engineer. This will execute the comparison jobs, showing a progress bar in the terminal.

### Understanding the Progress Bar

```
▶ Running job: Quick Test: iOS Prod vs Stg
[#########--------------] 45% | 6/14 | ETA: 00:00:08 | Quick Test
```

- Shows percentage complete
- Current tasks completed / total tasks 
- Estimated time remaining
- Current job name

### What Happens During Comparison

1. The tool loads all configuration files
2. For each job defined in comparison.yaml:
   - It filters endpoints to the job's platform
   - For each endpoint → ID → geo-location combination:
     - Makes HTTP requests to both environments
     - Compares JSON responses using deep-diff
     - Records all metadata (times, headers, etc.)
3. Results are written to a timestamped report folder:
   ```
   reports/YYYY-MM-DD_HH-MM-SS/diff_data.json
   ```

### Stopping a Comparison Run

To stop a running comparison:

1. Press `Ctrl+C` to cancel the current process
2. The partial results won't be saved

## Viewing Reports

### Starting the Report Server

```bash
npm run serve
```

This starts an Express server on port 3000.

### Accessing Reports

1. Open your browser to http://localhost:3000
2. You'll see a list of available reports by timestamp
3. Click on a report to view it

### Report UI Features

- **Tabs**: Switch between platforms (iOS, Android, Mobile Web, Desktop Web)
- **Search**: Filter by endpoint path, ID, or any text in the response
- **Filter Buttons**: Show All/Errors/Warnings/Failures
- **Endpoint Cards**: Each card shows:
  - Endpoint path with ID
  - Status (✓ Success, ⚠️ Warning, ❌ Error)
  - Geo location and response times
  - Expandable sections for:
    - Full request URLs
    - Headers used
    - Raw JSON responses (prod/staging)
    - Visual diff

### Stopping the Report Server

To stop the report server:

```bash
# Press Ctrl+C in the terminal where the server is running
# OR
pkill -f "node src/server.js"
```

## Common Tasks

### Adding a New Endpoint

1. Edit `config/endpoints.yaml`:
   ```yaml
   - key: "new-endpoint-key"
     platform: "i"  # or a, m, w
     path: "/new/path/v1/{categoryId}"
     idCategory: "categoryId"
   ```

2. Ensure the `idCategory` exists in `config/ids.json`:
   ```json
   {
     "categoryId": [1, 2, 3]  # Add if not already present
   }
   ```

3. Add to a job in `config/comparison.yaml`:
   ```yaml
   jobs:
     - name: "Your Job"
       # ...existing config...
       endpointsToRun:
         - "existing-endpoint"
         - "new-endpoint-key"  # Add this line
   ```

### Adding a New Geo-Location

1. Edit `config/headers.json`:
   ```json
   {
     "i": {
       "accept": "application/json",
       "cb-loc": ["IN", "US", "CA", "AE", "UK"],  # Add "UK" here
       # ...other headers...
     },
     # Repeat for other platforms...
   }
   ```

### Creating a New Job

1. Edit `config/comparison.yaml`:
   ```yaml
   jobs:
     # Existing jobs...
     
     # New job:
     - name: "New Platform Test"
       platform: "a"  # For Android
       baseA: "https://apiserver.cricbuzz.com"
       baseB: "https://api.cricbuzz.stg"
       endpointsToRun:
         - "endpoint1"
         - "endpoint2"
       ignorePaths:
         - "meta.timestamp"
       retryPolicy:
         retries: 2
         delayMs: 2000
   ```

### Changing Concurrency Limit

1. Edit `src/comparator.js`:
   ```javascript
   // Find this line (around line 26-30):
   const limit = pLimit(5);  // max 5 parallel comparisons
   
   // Change to your desired limit:
   const limit = pLimit(10); // max 10 parallel comparisons
   ```

## Troubleshooting

### "No reports found"

**Problem**: You see "No reports found. Run `npm run compare` first" when accessing http://localhost:3000/reports

**Solution**: You need to generate reports first:
```bash
npm run compare  # Generate at least one report
npm run serve    # Then start the server
```

### "Cannot find module"

**Problem**: Error like `Cannot find module 'cli-progress'`

**Solution**: Reinstall dependencies:
```bash
npm install
```

### Slow Performance

**Problem**: Comparisons are taking too long

**Solutions**:
1. Use quick mode by adding `quickMode: true` to jobs in comparison.yaml
2. Reduce the number of IDs in ids.json
3. Increase concurrency (edit `const limit = pLimit(5)` in comparator.js)
4. Reduce geo locations in headers.json

### Memory Issues

**Problem**: Node.js crashes with "JavaScript heap out of memory"

**Solution**: Increase Node.js memory limit:
```bash
# For comparison
NODE_OPTIONS="--max-old-space-size=4096" npm run compare

# For server
NODE_OPTIONS="--max-old-space-size=4096" npm run serve
```

### Cached Results

**Problem**: You're seeing stale results despite updating the API

**Solution**:
1. Clear browser cache (Ctrl+Shift+R in most browsers)
2. Stop and restart the server
3. Delete reports folder and run comparison again

**Problem**: Report shows blank page or "formatChanges is not a function" error

**Solution**:
1. Check your `src/public/main.js` code to ensure it uses `format()` instead of `formatChanges()`:
   ```javascript
   // CORRECT:
   const html = jsondiffpatch.formatters.html.format(d.rawDiff);
   
   // INCORRECT - will cause error:
   // const html = jsondiffpatch.formatters.html.formatChanges(d.rawDiff);
   ```
2. Delete existing report folders: `rm -rf reports/2025-*` 
3. Run a new comparison: `npm run compare`
4. Clear browser cache with hard refresh (Ctrl+Shift+R)
5. Ensure jsondiffpatch CSS styles are included in the HTML template

---

## Common Commands

```bash
# Start the server
npm run serve

# Run API comparisons
npm run compare

# Stop the server
pkill -f "node src/server.js"
# OR 
ps aux | grep "node src/server.js"
# Then kill the specific process ID
kill <PID>

# Delete all report folders
rm -rf reports/2025-*

# Run test mode (using QUICK_MODE=true)
QUICK_MODE=true npm run compare

# Set concurrency limit
CONCURRENCY_LIMIT=4 npm run compare
```

---

## Additional Resources

For more detailed information:

- **PROJECT_ARCHITECTURE.md**: Technical architecture details
- **README.md**: General project overview
- **src/comparator.js**: Core comparison logic
- **src/server.js**: Web server implementation

---

For any further questions, please consult the project team.
