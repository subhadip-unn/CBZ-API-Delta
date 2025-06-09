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
5. **Visual Verification**: Clean UI showing correct totals (e.g., 6 venue IDs × 4 geos = 24 comparisons), with filters for errors/warnings

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

3. Run API comparison:

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

ISC
