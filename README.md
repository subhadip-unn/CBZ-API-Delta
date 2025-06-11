<!--
  Author: Subhadip Das
  Email: subhadip.das@cricbuzz.com
  GitHub: https://github.com/subhadip-unn
  Created: 2025-06-11
  Description: Main project README for CBZ API Delta
-->

# CBZ API Delta

A powerful API comparison tool for testing endpoints across multiple geolocations and platforms, with concurrent API calls and visual diff display.

## Features

---

### 💡 Advanced JSON Colorization (Optional Improvement)

If you want even better colorization (like VSCode or Postman):

You can use a library like **Prism.js** or **highlight.js** to do syntax highlighting for JSON. These libraries:

- Parse the JSON
- Output HTML with CSS classes for color
- Are more robust and look more like editors

**To enable this:**
- Integrate Prism.js or highlight.js in the frontend
- Replace the plain <pre> JSON block with a highlighted block using the library

**Options:**
- Integrate Prism.js or highlight.js for even prettier JSON
- Or keep the default plain JSON display for simplicity and copy-paste reliability

If you want this feature, let your developer know!

---

1. **Multi-Geo Support**: `cb-loc` headers are processed as JSON arrays, testing API responses across multiple geographic locations (IN, US, CA, AE)
2. **Limited Concurrency**: Uses `p-limit` (max 5 concurrent requests) to drastically speed up HTTP calls while preventing server overload
3. **All-Jobs Dashboard**: Combines all platform jobs into a single `diff_data.json` with tabbed UI for switching between iOS, Android, Mobile-Web, and Desktop-Web
4. **Rich Metadata**: Each API comparison includes `cbLoc`, `responseTimeA/B`, `timestampA/B`, and `headersUsedA/B`
5. **Advanced Diff Classification**: Intelligently categorizes changes as structural (API contract) or value (data only), with priority ranking (1-10)
6. **Three-Tier Diff Display**: Separates changes into Critical Changes, Structural Changes, and Value Changes with collapsible sections
7. **Interactive Path Tooltips**: Hover over complex JSON paths to see a readable breakdown with actual values
8. **Visual Verification**: Clean UI showing correct totals (e.g., 6 venue IDs × 4 geos = 24 comparisons), with filters for errors/warnings

## Setup Instructions

1. Clone this repository:

```bash
git clone <repository-url>
cd CBZ-API-Delta
```

2. Install dependencies:

```bash
npm install
```

3. Configure your comparison jobs:

- Edit `config/endpoints.yaml` to define all endpoints (by key, platform, and version)
- Edit `config/comparison.yaml` to define jobs using either:
  - `endpointPairs`: Explicitly pair any two endpoints (recommended)
  - `endpointsToRun`: Compare the same endpoint on both sides (legacy)

### Example: Compare prod v1 vs stg v2
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

### Example: Compare prod v1 vs stg v1 (legacy)
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

4. Run API comparison:

```bash
npm run compare
```
This will:
- Prompt for QA/Test Engineer name
- Execute API calls against all configured endpoints, locations, and IDs
- Generate a timestamped report in `/reports/<timestamp>/diff_data.json`
- Copy all UI assets to the report folder

4. Serve the report UI:

```bash
npm run serve
```
Then browse to http://localhost:3000 and select your report to view.

## Command References

```bash
# Start the comparison tool
npm run compare

# Start the web server
npm run serve

# Stop the web server
pkill -f "node src/server.js"

# Find the server process
ps aux | grep "node src/server.js"

# Kill server with specific process ID
kill <PID>

# Run in quick test mode
QUICK_MODE=true npm run compare

# Set API call concurrency limit
CONCURRENCY_LIMIT=4 npm run compare

# Delete all report folders
rm -rf reports/2025-*
```

## Docker Deployment (For Teams)

You can deploy the CBZ API Delta tool using Docker and Nginx to make reports accessible to your entire team over VPN or office network. This setup offers:

- Multiple concurrent reports (current and archived)
- Authentication to restrict access
- Persistent access even when your laptop is shut down (if deployed to a server)

### Quick Start with Docker

```bash
# 1. Create password for authentication (replace with your desired credentials)
./create-password.sh cbzqa cbz2025

# 2. Start the containers
docker-compose up -d

# 3. Access the reports
# Local: http://localhost:80
# VPN/Office Network: http://<your-vpn-ip>:80
# Login with credentials from step 1
```

### Docker Commands

```bash
# Start all containers
docker-compose up -d

# View container logs
docker-compose logs -f

# Stop all containers
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

### Accessing Reports

- **Current Reports**: http://<your-ip>/reports/
- **Archived Reports**: http://<your-ip>/archive/

## Docker and Nginx Deployment

For team-wide access and persistent availability, CBZ API Delta can be deployed using Docker and Nginx:

### Quick Start

```bash
# Set up authentication (first time only)
./create-password.sh cbzqa cbz2025  # Or choose your own credentials

# Build and start containers
sudo docker-compose up -d

# Generate new reports
npm run compare

# Access reports at:
# - http://localhost/            # From host machine
# - http://<your-ip>/          # From office network or VPN
```

### Key Features

- **Authentication**: Basic auth protects reports from unauthorized access
- **Current/Archive Reports**: View both current and archived reports via separate URLs
- **Network Access**: Share with team over LAN or VPN using your machine's IP
- **Persistent Availability**: Reports remain accessible as long as Docker containers are running

### Access URLs

- **Current Reports**: http://<your-ip>/reports/
- **Archived Reports**: http://<your-ip>/archive/
- **Note**: Archive view listing works but may show "Report not found" when viewing individual archived reports (see Troubleshooting)

## Troubleshooting

### Blank Report or "formatChanges is not a function" Error

If your report shows a blank page or you see a JavaScript error mentioning "formatChanges is not a function":

1. Ensure your `src/public/main.js` uses the correct jsondiffpatch formatter method:
   ```javascript
   // CORRECT:
   const html = jsondiffpatch.formatters.html.format(d.rawDiff);
   
   // INCORRECT - will cause error:
   // const html = jsondiffpatch.formatters.html.formatChanges(d.rawDiff);
   ```

2. Add jsondiffpatch CSS styles to your HTML template in `src/server.js`

3. Perform a clean install:
   ```bash
   rm -rf reports/2025-*
   npm run compare
   ```

4. Hard-refresh your browser (Ctrl+Shift+R) to clear cache

### Alternative Diff Visualization

Currently, the tool uses jsondiffpatch's HTML formatter for displaying differences (as seen in screenshot 1). To implement a side-by-side comparison similar to jsondiff.com (screenshot 2):

1. The second screenshot shows a more compact, line-by-line view from jsondiff.com with:
   - Line numbers for reference
   - Side-by-side equal-width panels
   - Syntax highlighting
   - Blue highlighting for changes
   - Navigation buttons (1 of 1) and "both sides should be equal" indicator

2. To implement this style, you would need to:
   - Use the jsondiffpatch JSON formatter instead of HTML formatter
   - Implement a custom renderer using a code editor like Monaco or CodeMirror
   - Add line numbering and syntax highlighting
   - Create a custom diff highlighting system
   - Add navigation controls for differences

3. Example implementation approach:
   ```javascript
   // Using Monaco Editor with custom diff viewer
   import * as monaco from 'monaco-editor';
   
   // Set up side-by-side editors
   const leftEditor = monaco.editor.create(leftContainer, {
     value: JSON.stringify(leftObj, null, 2),
     language: 'json',
     readOnly: true
   });
   
   const rightEditor = monaco.editor.create(rightContainer, {
     value: JSON.stringify(rightObj, null, 2),
     language: 'json',
     readOnly: true
   });
   
   // Use Monaco's built-in diff editor functionality
   const diffEditor = monaco.editor.createDiffEditor(diffContainer);
   diffEditor.setModel({
     original: leftEditor.getModel(),
     modified: rightEditor.getModel()
   });
   ```

## Configuration

Modify these configuration files to customize your testing:

- `config/headers.json`: Platform-specific headers, including geo locations
- `config/ids.json`: Test IDs for all endpoint categories
- `config/endpoints.yaml`: API endpoints for all platforms
- `config/comparison.yaml`: Job definitions, base URLs, and retry policies

## Project Structure

```
CBZ-API-Delta/
├── config/
│   ├── headers.json       # Headers by platform (i/a/m/w), including cb-loc arrays
│   ├── ids.json           # IDs for substitution in endpoint URLs
│   ├── endpoints.yaml     # Endpoint definitions by platform
│   └── comparison.yaml    # Job definitions (what to compare)
│
├── reports/
│   └── (auto-generated timestamped folders)
│       ├── diff_data.json   # Combined results from all jobs
│       └── static/          # Copied UI assets
│
├── src/
│   ├── utils.js             # Helper functions
│   ├── comparator.js        # Core comparison logic
│   ├── reportGenerator.js   # Report creation
│   ├── server.js            # Express server for viewing reports
│   └── public/              # UI assets for report viewing
│
├── package.json
└── README.md
```

## Future Improvements

1. **Schema Validation**: Integrate JSON Schema validation to verify API response structures beyond simple diff comparison
2. **Advanced Filtering**: Add more sophisticated filtering options (by endpoint path, ID, specific diff path)
3. **Performance Metrics**: Add graphs for response time trends across endpoints and geos
4. **CI Integration**: Add GitHub Actions workflow for automated comparison on schedule or PR
5. **Auth Support**: Add OAuth/API key support for authenticated endpoints
6. **Custom Comparison Logic**: Allow custom JS functions to validate specific endpoints beyond structural equality
7. **Report Export**: Add PDF export option for sharing reports with stakeholders
8. **Email Notifications**: Send alerts when critical endpoints have differences
9. **Response Time Analysis**: Add statistical analysis of response times across geos
10. **Customizable Thresholds**: Allow configuring warning/error thresholds for different endpoints

## License

**Proprietary & Confidential**

- © 2025 Cricbuzz Platforms Limited - All Rights Reserved
- QA Author: Subhadip Das (<subhadip.das@cricbuzz.com>)

This is an internal tool for Cricbuzz use only. See the [LICENSE](./LICENSE) file for details.
