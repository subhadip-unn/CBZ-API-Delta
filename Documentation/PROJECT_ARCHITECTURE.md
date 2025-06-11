<!--
  Author: Subhadip Das
  Email: subhadip.das@cricbuzz.com
  GitHub: https://github.com/subhadip-unn
  Created: 2025-06-11
  Description: Project Architecture Documentation for CBZ API Delta
-->

# CBZ API Delta: Project Architecture

## 1. Overview

CBZ API Delta is an enterprise-grade API comparison and regression testing tool designed to detect differences between production and staging environments across multiple platforms and geographic locations. The system systematically calls API endpoints, compares the responses, and generates comprehensive reports with visualized differences to support QA teams, developers, and stakeholders in ensuring API reliability and consistency.

## 2. Core Features & Capabilities

### 2.1 Platform & Environment Support

1. **Multi-Platform Support**: Executes API comparisons across iOS, Android, Mobile Web, and Desktop Web platforms with environment-specific headers and authentication
2. **Multi-Geo Testing**: Automatically tests each endpoint across multiple geographic locations (IN, US, CA, AE) to detect region-specific differences
3. **Environment Agnostic**: Can compare any two environments (production vs staging, v1 vs v2, etc.) with flexible configuration

### 2.2 Performance & Reliability

4. **Controlled Concurrency**: Implements request throttling via p-limit to prevent API overload while optimizing test execution time
5. **Fault Tolerance**: Sophisticated retry mechanism with exponential backoff for handling intermittent network issues
6. **Response Caching**: Intelligent caching strategy to prevent duplicate API calls within test runs
7. **Quick Test Mode**: Supports running minimal test sets for rapid verification during development cycles

### 2.3 Reporting & Visualization

8. **Rich Metadata Capture**: Detailed recording of response times, timestamps, headers, status codes, and contextual data
9. **Visual Diff Rendering**: Interactive JSON difference visualization using jsondiffpatch with expandable/collapsible sections
10. **Interactive UI**: Advanced filtering, search capabilities, and expandable sections for efficient analysis
11. **Historical Reports**: Archive system for maintaining historical test runs with immutable results
12. **No-Cache Controls**: Strict cache control headers to ensure fresh data when viewing reports

## 3. System Architecture & Project Structure

### 3.1 High-Level Architecture

CBZ API Delta implements a microservice architecture with three distinct containerized services:

1. **Main API Delta Service**: Handles current report generation and serving
2. **Archive Service**: Manages historical report access and preservation
3. **Nginx Reverse Proxy**: Provides unified access point with authentication and routing

This separation ensures scalability, reliability, and proper resource isolation between current and historical data.

### 3.2 Directory Structure

```
CBZ-API-Delta/
├── config/                  # Configuration Files
│   ├── headers.json         # Platform-specific HTTP headers with cb-loc arrays
│   ├── ids.json             # Test IDs for endpoint substitution
│   ├── endpoints.yaml       # API endpoint definitions by platform
│   └── comparison.yaml      # Job definitions with environment URLs and retry policies
│
├── src/                     # Application Source Code
│   ├── utils.js             # Helper utilities (URL building, fetch, diff processing)
│   ├── comparator.js        # Core comparison engine with concurrency control
│   ├── reportGenerator.js   # Job runner and report file generation
│   ├── server.js            # Express server for report viewing and API
│   └── public/              # Frontend assets
│       ├── main.css         # UI styling with responsive design
│       ├── main.js          # UI interaction and rendering logic
│       └── jsondiffpatch.umd.js  # Third-party diff visualization library
│
├── reports/                 # Generated Current Reports
│   └── YYYY-MM-DD_HH-MM-SS/ # Report instance with timestamp
│       ├── diff_data.json   # Combined job results with all comparison data
│       └── static/          # Copied UI assets for rendering reports
│
├── old_reports/             # Archived Historical Reports
│   └── YYYY-MM-DD_HH-MM-SS/ # Archived report instance
│       ├── diff_data.json   # Immutable historical comparison data
│       └── static/          # Point-in-time UI assets for consistent rendering
│
├── nginx/                   # Nginx Configuration
│   ├── conf/                # Nginx server configuration
│   │   └── default.conf     # Reverse proxy, auth, and routing rules
│   └── html/                # Static content served by Nginx
│       └── index.html       # Landing page with links to report sections
│
├── docker-compose.yml       # Container orchestration configuration
├── Dockerfile               # Node.js application container definition
├── package.json             # Dependencies and NPM scripts
├── README.md                # General project documentation
├── PROJECT_ARCHITECTURE.md  # This document - detailed technical documentation
└── QA_GUIDE.md              # Step-by-step guide for QA engineers
```

### 3.3 Container Architecture

The application is containerized using Docker with the following services:

* **cbz-api-delta**: Serves current reports on port 3000
* **cbz-api-delta-archive**: Serves archived reports on port 3001
* **cbz-api-delta-nginx**: Nginx reverse proxy on ports 80/443

Each container has dedicated responsibilities and resource allocations. Container volumes ensure data persistence across deployments:

* `./reports:/app/reports` - Current reports volume mount
* `./old_reports:/app/old_reports` - Archive reports volume mount
* `./nginx/conf:/etc/nginx/conf.d` - Nginx configuration

## 4. Technical Architecture

### 4.1 Configuration System

The system uses a multi-layered configuration approach with strong separation of concerns, enabling non-developers to define new tests without code changes:

#### 4.1.1 Headers Configuration (`headers.json`)

Defines platform-specific HTTP headers for API authentication and geographic targeting:

```json
{
  "i": { 
    "accept": "application/json", 
    "cb-platform": "ios",
    "cb-loc": ["IN", "US", "CA", "AE"] 
  },
  "a": { 
    "accept": "application/json", 
    "cb-platform": "android",
    "cb-loc": ["IN", "US", "CA", "AE"] 
  },
  "mw": { 
    "accept": "application/json", 
    "cb-platform": "mweb",
    "cb-loc": ["IN", "US", "CA", "AE"] 
  },
  "dw": { 
    "accept": "application/json", 
    "cb-platform": "dweb",
    "cb-loc": ["IN", "US", "CA", "AE"] 
  }
}
```

> **Design Principles**: Headers configuration supports array values for running the same requests with multiple geo variations, enabling location-specific testing without code duplication.

#### 4.1.2 Test ID Configuration (`ids.json`)

Provides test data for dynamic parameter substitution in endpoint paths:

```json
{
  "venueId": [31, 80, 11, 154, 50, 380],
  "teamId": [101, 202, 303, 404],
  "matchId": [12345, 23456, 34567],
  "playerId": [8473, 1947, 8723, 4328]
}
```

> **Design Principles**: The application can iterate through these IDs to test multiple scenarios, with sampling logic in quick mode to reduce test execution time while maintaining coverage.

#### 4.1.3 Endpoint Configuration (`endpoints.yaml`)

Defines available endpoints across all platforms with versioning and parameter substitution:

```yaml
- key: "matches-live-v1"
  platform: "i"
  path: "matches/v1/live"
  idCategory: null
- key: "matches-live-v2"
  platform: "i"
  path: "matches/v2/live"
  idCategory: null
- key: "venue-info-v1"
  platform: "i"
  path: "venues/v1/{venueId}"
  idCategory: "venueId"
- key: "team-info-v1"
  platform: "a"
  path: "teams/v1/{teamId}"
  idCategory: "teamId"
```

> **Design Principles**: This decoupled approach allows endpoints to be versioned and maintained separately from the test jobs. The `idCategory` field links to the appropriate test IDs for dynamic path generation.

#### 4.1.4 Job Configuration (`comparison.yaml`)

Defines test suites that combine endpoints, environments, and execution parameters:

```yaml
jobs:
  - name: "iOS: Production v2 vs Staging v2"
    platform: "i"
    baseA: "https://apiserver.cricbuzz.com"
    baseB: "https://api.cricbuzz.stg"
    retryCount: 3
    retryDelayMs: 1000
    concurrencyLimit: 5
    quickMode: false
    endpointPairs:
      - endpointA: "matches-live-v2"
        endpointB: "matches-live-v2"
      - endpointA: "venue-info-v1"
        endpointB: "venue-info-v1"
  
  - name: "iOS: v1 vs v2 API Comparison"
    platform: "i"
    baseA: "https://apiserver.cricbuzz.com"
    baseB: "https://apiserver.cricbuzz.com"
    quickMode: true
    endpointPairs:
      - endpointA: "matches-live-v1"
        endpointB: "matches-live-v2"
```

> **Design Principles**: Jobs support both version comparison (v1 vs v2 on same environment) and environment comparison (production vs staging with same version). Legacy mode supports `endpointsToRun` for backward compatibility.

### 4.2 Core Engine Architecture

The application core consists of several key components working together to provide the complete API delta functionality:

#### 4.2.1 Comparison Engine (`comparator.js`)

The heart of the system, implementing:

- **Request Builder**: Constructs URLs with appropriate path parameters
- **Parameter Iteration**: For each endpoint, iterates through all required test IDs and geo locations
- **Concurrency Control**: Uses `p-limit` to prevent API throttling while optimizing test throughput
- **Response Comparison**: Deep comparison of JSON responses to identify structural and value differences
- **Diff Classification**: Categorizes differences as errors, warnings, or informational based on rules
- **Telemetry Collection**: Captures performance metrics including response times, status codes, and sizes

#### 4.2.2 Report Generation Engine (`reportGenerator.js`)

- **Job Orchestration**: Coordinates execution of all jobs defined in configuration
- **Report Structure**: Creates timestamp-based directory structure for persistent reports
- **Asset Bundling**: Copies required UI assets to each report directory for independent viewing
- **Metadata Enrichment**: Adds contextual information such as tester name, date, and execution parameters

#### 4.2.3 Web Server (`server.js`)

- **Express Application**: Provides HTTP endpoints for viewing reports
- **Multi-Report Support**: Serves both current (`/reports`) and archived (`/archive`) reports
- **Static Asset Serving**: Dynamic paths for report-specific assets with cache control
- **JSON Data API**: Serves structured diff data via `/diff_data.json` endpoint with archive support
- **Cache Control**: Implements strict no-cache policies to prevent stale report viewing

#### 4.2.4 Client-Side Application (`main.js`)

- **Dynamic Report Loading**: Fetches and renders report data on demand
- **Tab Navigation**: Platform-based navigation between different API test groups
- **Interactive UI**: Collapsible sections, search, and filtering capabilities
- **Visual Differencing**: Integration with jsondiffpatch for visual JSON comparison

### 4.3 Containerization Architecture

The application uses Docker to create a robust, scalable deployment architecture:

#### 4.3.1 Container Services

- **API Delta Container**: Executes API comparisons and serves current reports
  - Built from Node.js 16 base image
  - Exposes port 3000 for HTTP access
  - Mounts `./reports` volume for persistent report storage

- **Archive Container**: Serves historical reports with read-only access
  - Shares the same image as the main container but with different configuration
  - Exposes port 3001 for HTTP access
  - Mounts `./old_reports` volume for archived report access

- **Nginx Container**: Provides authentication, SSL termination, and reverse proxy
  - Built from nginx:alpine for minimal footprint
  - Exposes ports 80 and 443 for HTTP/HTTPS access
  - Implements HTTP Basic Authentication
  - Routes traffic to appropriate backend containers
  - Handles URL rewriting and path normalization

#### 4.3.2 Network Architecture

- All containers operate on an isolated `api-delta-network` bridge network
- Internal container communication uses Docker DNS for service discovery
- External access is exclusively through the Nginx container on standard ports

### 4.4 Request Flow & Processing Pipeline

1. **Configuration Loading**: System loads all config files at startup
2. **Job Processing**: For each configured job:
   - Filter endpoints by platform and configuration
   - For each endpoint pair:
     - Generate all test permutations (IDs × locations)
     - Execute requests with controlled concurrency
     - Compare responses and generate diff objects
     - Classify and annotate differences
   - Aggregate results into job-level summary
3. **Report Generation**: Create structured report with:
   - Metadata and execution parameters
   - Full result set with expandable details
   - Static assets for visualization
4. **Report Access**:
   - Current reports available via main container
   - Historical reports available via archive container
   - All access authenticated and served through Nginx


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
   - Route for viewing all reports (`/`)
   - Route for viewing specific reports (`/view/:folderName`)
   - Route for viewing archived reports (`/archive`, `/view-archive/:folderName`)
   - Route for serving diff data (`/diff_data.json`)
   - Route for serving static assets (`/static/:folderName/*`, `/static-archive/:folderName/*`)
   - Strict cache control to prevent stale report viewing

2. **main.js**: Client-side JavaScript providing:
   - Tab navigation between platform sections
   - Search and filtering capabilities
   - Collapsible diff sections  
   - Archive report support with dynamic URL handling
   - Visual JSON diff rendering using jsondiffpatch

3. **main.css**: Styles and responsive design for the report UI

## 5. Technology Stack

### 5.1 Backend Technologies

| Technology | Version | Purpose |
|-----------|---------|--------|
| Node.js | 16.x | Application runtime environment |
| Express.js | 4.17.x | HTTP server and API framework |
| deep-diff | 1.0.x | JSON comparison engine |
| p-limit | 3.1.x | Concurrency control for API calls |
| js-yaml | 4.1.x | YAML configuration parsing |
| axios | 0.27.x | HTTP client with retry capability |
| cli-progress | 3.11.x | Terminal progress bars |
| Docker | 20.10.x+ | Application containerization |
| Docker Compose | 2.x | Container orchestration |
| Nginx | 1.21.x | Reverse proxy and authentication |

### 5.2 Frontend Technologies

| Technology | Version | Purpose |
|-----------|---------|--------|
| HTML5 | - | Application UI markup |
| CSS3 | - | UI styling and responsiveness |
| JavaScript (ES6+) | - | Client-side logic and rendering |
| jsondiffpatch | 0.4.x | Visual JSON differencing |
| Bootstrap (CSS only) | 5.1.x | Responsive UI components |

### 5.3 Data Storage & Processing

| Technology | Purpose |
|-----------|--------|
| File System | Report storage using timestamped directories |
| JSON | Primary data exchange and storage format |
| YAML | Configuration format for improved readability |

## 6. Performance Considerations

### 6.1 API Request Optimization

- **Dynamic Concurrency Control**: Each job configuration can specify its own concurrency limit (`concurrencyLimit`) to balance between speed and API rate limits
- **Request Batching**: Similar requests are grouped and executed in controlled batches
- **Quick Mode**: Sampling algorithm reduces test dataset size while maintaining coverage when `quickMode: true`
- **Caching**: Repeated requests within the same job use response caching to minimize API load

### 6.2 Report Generation Optimization

- **Lazy Diff Computation**: Full JSON diffs are calculated only when needed, not at initial response time
- **Incremental Processing**: Job results are processed and saved incrementally to minimize memory usage
- **Selective Bundling**: Only necessary static assets are copied to each report folder

### 6.3 Report Viewing Optimization

- **On-Demand Loading**: Report data is loaded only when a specific report is requested
- **Lazy Rendering**: Report sections render only when expanded by the user
- **Compression**: HTTP responses use gzip compression where supported by clients
- **Cache Control**: Strict cache control improves report consistency across distributed teams

## 7. Extension Points & Future Improvements

### 7.1 Immediate Extension Points

- **Custom Authentication**: `headers.json` can be extended to include OAuth tokens or other auth mechanisms
- **New Platforms**: Add new platform keys to `headers.json` to expand beyond current platforms
- **Custom Diff Rules**: Extend the comparison engine to implement custom difference handling rules
- **Additional Metadata**: Expand report metadata fields to include custom project-specific information

### 7.2 Future Architectural Improvements

- **Database Integration**: Replace file-based storage with a database for improved query capabilities
- **Webhook Notifications**: Add notification system for report completion and critical differences
- **CI/CD Integration**: GitHub Actions or Jenkins pipeline support for automated regression tests
- **User Management**: Role-based access control beyond current HTTP Basic Authentication
- **API Query Builder**: Visual interface for constructing API comparison jobs
- **Performance Trending**: Track and graph API performance metrics over time across reports

### 7.3 Scalability Considerations

- **Horizontal Scaling**: Architecture supports multiple parallel test runners using shared storage
- **Test Distribution**: Endpoint pairs can be distributed across multiple worker processes
- **Geographic Distribution**: Test runners can be deployed in different regions for location-authentic testing
- **Report Archiving Strategy**: Current two-tier storage (current/archive) can evolve to multi-tier with cold storage
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
