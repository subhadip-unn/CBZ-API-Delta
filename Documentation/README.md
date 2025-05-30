# STGroutes Project Structure and Workflow

## Overview

STGroutes is a Python-based API comparison tool designed for robust, automated, and business-focused API diffing between any two endpoints (e.g., prod vs stg, v1 vs v2, or any two environments).

## Key Features
- **Critical header comparison**: Only compares headers that matter (e.g., 'content-type'), avoiding noise from non-critical headers.
- **Status code and JSON body diffing**: Highlights meaningful differences.
- **Side-by-side HTML reports**: Expandable, manager-friendly reports with pretty-printed JSON and clickable details.
- **Timestamped reports**: Each test run generates a uniquely named report, preserving history.
- **Supports multiple endpoints/IDs**: Easily test across different series, geos, or API versions.
- **Extensible**: Add schema validation, fuzzy diffs, or more endpoints as needed.

## How to Use
1. Prepare your cURL templates with placeholders (e.g., `<SERIES_ID>`).
2. Add your test IDs (and optionally, metadata) in `test_ids.json`.
3. Run the script:
   ```bash
   python3 compare_endpoints.py --prod-file curl_templates/ios_prod_pointstable.curl --stg-file curl_templates/ios_stg_pointstable.curl --ids-file test_ids.json
   ```
4. Open the generated HTML report (e.g., `test_report_YYYYMMDD_HHMMSS.html`) for a detailed, side-by-side comparison.

## Best Practices
- Use placeholders for all dynamic parts in your cURL templates.
- Store series/tournament-specific info (like referer, slug) in `test_ids.json` if needed.
- Review the HTML report for both summary and detailed diffs.
- Extend the tool for schema validation or fuzzy diffs as your needs evolve.

## Extensibility
- **Schema validation**: Integrate `jsonschema` to enforce response structure.
- **Fuzzy diffs**: Use `deepdiff` or custom logic to ignore or tolerate certain fields.
- **Web UI**: Build a Flask/FastAPI frontend for non-technical users.

## Structure

```
STGroutes/
│
├── README.md                  # This file
├── README_ADVANCED.md         # Advanced documentation
├── PROJECT_FLOW_DRAWING.md    # Project flow diagram
│
├── curl_templates/            # Paste SSR cURLs and cURL templates here
│   ├── msite_stg_pointstable.curl
│   ├── prod/
│   │   ├── android_pointstable.curl
│   │   ├── ios_pointstable.curl
│   │   ├── msite_pointstable.curl
│   │   ├── website_pointstable.curl
│   │   └── ...
│   ├── stg/
│   │   ├── android_pointstable.curl
│   │   ├── ios_pointstable.curl
│   │   ├── msite_pointstable.curl
│   │   ├── website_pointstable.curl
│   │   └── ...
│
├── generated_curls/           # Auto-generated API cURLs (output of script)
│   └── ...
│
├── scripts/                   # Automation/helper scripts
│   └── rewrite_curl.py        # Converts SSR cURL to real API cURL
│
├── test_ids.json              # Config for series IDs, etc.
│
├── compare_endpoints.py       # Main test/compare script
├── body_compare.py
├── curl_parser.py
├── geo_utils.py
└── ...
```

## Reporting: Past, Present, Future

### Past
- Manual cURL editing and ad-hoc comparisons.
- Diffs and results were printed to the console or written in basic Markdown, with no unified summary or interactive view.

### Present
- **Unified report builder** (`report_builder.py`) generates both HTML and Markdown reports.
- **HTML reports** feature an interactive, property-level JSON diff viewer (powered by `jsondiffpatch`), with collapsible/expandable UI and clickable summaries.
- **Markdown reports** use the same summary logic as HTML, so both are consistent and easy to read.
- All summary and diff logic is centralized, making maintenance and customization easy.

### Future
- Possible web dashboard for browsing historical reports.
- PDF export, email notifications, and trend analysis.
- Further customization of diff viewers and summary panels.

## Workflow

1. **Paste SSR cURL**
   - Place your copied SSR (HTML) cURL into the appropriate file in `curl_templates/`.

2. **Generate Real API cURL**
   - Run the script to convert SSR cURL to the API cURL:
     ```
     python scripts/rewrite_curl.py curl_templates/msite_stg_pointstable.curl <SERIES_ID> > generated_curls/msite_stg_pointstable_api.curl
     ```
   - The script will:
     - Change the SSR URL to the real API endpoint
     - Preserve all headers/cookies
     - Optionally update the referer header

---

# Project Timeline: Past, Present, and Future

---

## ⚡️ cURL Template Organization & Usage (Best Practice)

### Directory-Based Structure (Recommended)
Organize your cURL templates by environment or version for clarity and scalability:

```
curl_templates/
  prod/
    ios_pointstable.curl
    android_pointstable.curl
  stg/
    ios_pointstable.curl
    android_pointstable.curl
  v1/
    ios_pointstable.curl
  v2/
    ios_pointstable.curl
```

### How to Run Comparisons

#### **Directory-Based (Best Practice):**
```bash
# Compare prod vs stg for ios_pointstable endpoint
python compare_endpoints.py --dir-a curl_templates/prod --dir-b curl_templates/stg --endpoint ios_pointstable.curl

# Compare v1 vs v2 for ios_pointstable endpoint
python compare_endpoints.py --dir-a curl_templates/v1 --dir-b curl_templates/v2 --endpoint ios_pointstable.curl
```

#### **Classic (Legacy) Mode:**
```bash
python compare_endpoints.py --file-a curl_templates/prod/ios_pointstable.curl --file-b curl_templates/stg/ios_pointstable.curl
```

### Labeling
- The tool auto-labels each side using the directory name (e.g., PROD, STG, V1, V2).
- You can override with `--label-a` and `--label-b`.

### Adding New Endpoints
- Simply add a new `.curl` file to the relevant directory.
- Example: `curl_templates/prod/user_profile.curl`, `curl_templates/stg/user_profile.curl`

### Why This Structure?
- **Scalable:** Easily manage many endpoints and environments.
- **Clear:** Instantly see what is available for each environment/version.
- **Automatable:** Script can auto-detect labels and endpoints for robust reporting.

---

## Past
- Manual editing of cURL files for each environment or series.
- Used scripts to rewrite SSR cURL files into API cURL files, generating new files for every change.
- Series IDs and variables were managed with basic substitution, but workflows were repetitive and error-prone.
- Reports and comparisons were mostly manual or ad-hoc.

## Present
- **Template-based workflow:** Use cURL templates with placeholders (like `<SERIES_ID>`, `<SERIES_SLUG>`, etc.) for all endpoints.
- **Automated substitution:** The script fills in all placeholders from `test_ids.json` (which can now include metadata like referer, slug, etc.).
- **Automated comparison:** Runs comparisons for all IDs, geos, and endpoints in one go.
- **Critical header comparison:** Only checks headers that matter (e.g., `content-type`), reducing noise.
- **Side-by-side HTML reports:** Manager-friendly, pretty-printed, expandable, with timestamped filenames for history.
- **No more manual cURL rewriting or file generation per series.**

## Future / Roadmap
- **Schema validation:** Enforce response structure using JSON Schema.
- **Fuzzy diffs:** Ignore or tolerate non-critical differences (like timestamps, IDs, etc.).
- **Web UI:** Build a website so anyone can paste two cURLs and get instant, visual diffs—no coding needed.
- **Per-ID metadata:** Store all series-specific info (referer, slug, cookies, etc.) in `test_ids.json` for maximum flexibility.
- **Advanced reporting:** Add PDF export, trend analysis, and notification features.

---

This structure helps you and your team remember where the project came from, how it works today, and where it’s headed. Update this as your workflow evolves!

