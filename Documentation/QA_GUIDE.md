<!--
  Author: Subhadip Das
  Email: subhadip.das@cricbuzz.com
  GitHub: https://github.com/subhadip-unn
  Created: 2025-06-11
  Description: QA Guide for CBZ API Delta
-->

# 🚀 CBZ API Delta: QA Guide for Beginners

Welcome to CBZ API Delta! This guide will help you get started with comparing API responses between different environments (like Production and Staging) in just a few simple steps.

## 🌟 What Can You Do With This Tool?

- Compare API responses between different environments
- Test across multiple platforms (iOS, Android, Mobile Web, Desktop Web)
- Check API behavior in different countries (IN, US, CA, AE)
- See exactly what changed between API versions
- Share test results with your team

## 🏁 Let's Get Started!

### 📥 Step 1: Get the Code

1. **Download the code** (ask your team lead for access):
   - Click the green "Code" button on [GitHub](https://github.com/subhadip-unn/CBZ-API-Delta)
   - Click "Download ZIP"
   - Extract the ZIP file to a folder on your computer

   OR if you're comfortable with Git:
   ```bash
   git clone https://github.com/subhadip-unn/CBZ-API-Delta.git
   cd CBZ-API-Delta
   ```

### ⚙️ Step 2: Install Required Software

1. **Install Node.js** (if you don't have it):
   - Go to [Node.js website](https://nodejs.org/)
   - Download and install the LTS (Long Term Support) version
   - Open a new terminal/command prompt and type `node -v` to verify

2. **Install Docker** (for sharing reports with your team):
   - Go to [Docker's website](https://www.docker.com/products/docker-desktop)
   - Download and install Docker Desktop
   - Start Docker Desktop (you'll see the Docker icon in your system tray/menu bar)

### 🚀 Step 3: Run Your First Test

1. **Open a terminal/command prompt** in the project folder

2. **Install the required tools** (only needed once):
   ```bash
   npm install
   ```

3. **Run a test comparison**:
   ```bash
   npm run compare
   ```
   - This will compare the APIs defined in `config/comparison.yaml`
   - You'll see progress in the terminal
   - When complete, it will say "Comparison complete!"

4. **View the results**:
   ```bash
   npm run serve
   ```
   - Open your web browser to: http://localhost:3000
   - Click on the latest report to see the differences

### 📊 Understanding the Report

1. **Tabs at the top** let you switch between different platforms (iOS, Android, etc.)
2. **Search box** helps you find specific endpoints
3. **Color-coded results**:
   - 🔴 Red: Critical issues (like missing fields)
   - 🟠 Orange: Warning (like changed values)
   - 🟢 Green: No differences found

4. **Click any row** to see detailed differences between the API responses

### 🛠️ Customizing Your API Tests

You can customize which APIs to test by editing these files:

1. **Test Different APIs** (`config/endpoints.yaml`)
   ```yaml
   - key: "matches-live"
     platform: "i"  # i=iOS, a=Android, m=Mobile Web, w=Desktop Web
     path: "matches/v1/live"
     idCategory: "matchId"  # Uses IDs from ids.json
   ```

2. **Change Test Data** (`config/ids.json`)
   ```json
   {
     "matchId": [12345, 23456],
     "teamId": [101, 202]
   }
   ```

3. **Compare Different Environments** (`config/comparison.yaml`)
   ```yaml
   jobs:
     - name: "Production vs Staging"
       platform: "i"
       baseA: "https://api.production.com"  # Production
       baseB: "https://api.staging.com"     # Staging
       endpointsToRun: ["matches-live"]
   ```

### 🤝 Sharing Reports with Your Team

1. **Start the shared server** (in a terminal):
   ```bash
   docker-compose up -d --build
   ```

2. **Set a password** (first time only):
   ```bash
   ./create-password.sh yourusername yourpassword
   docker-compose restart nginx
   ```

3. **Share your computer's IP address** with your team
   - On Windows: Open Command Prompt and type `ipconfig`
   - On Mac/Linux: Open Terminal and type `ifconfig`

4. **Team members can access** at: `http://YOUR-IP-ADDRESS`
   - They'll need the username and password you set

### 🛑 When You're Done

To stop the server:
```bash
docker-compose down
```

## 📚 Next Steps

- **Add your own API endpoints** by editing `config/endpoints.yaml`
- **Change test data** in `config/ids.json`
- **Compare different environments** by updating `config/comparison.yaml`

## 🔍 Troubleshooting Common Issues

### ❌ "Cannot find module 'express'"
**Solution:** Install dependencies:
```bash
npm install
```

### 🐢 Tests are running very slow
**Try these solutions:**
1. Run in quick mode (tests fewer IDs):
   ```bash
   QUICK_MODE=true npm run compare
   ```
2. Reduce the number of IDs in `config/ids.json`
3. Check your internet connection

### 🖥️ Can't access the report viewer
1. Make sure the server is running:
   ```bash
   npm run serve
   ```
2. Try a different browser
3. Clear your browser cache (Ctrl+Shift+R)

### 🔑 Authentication issues when sharing reports
1. Make sure Docker is running
2. Recreate the password file:
   ```bash
   ./create-password.sh yourusername yournewpassword
   docker-compose restart nginx
   ```

## 📋 Quick Reference

### Essential Commands
```bash
# Run API comparison
npm run compare

# View reports locally
npm run serve

# Share with team (requires Docker)
docker-compose up -d --build

# Stop everything
docker-compose down
```

### Important Files
- `config/endpoints.yaml` - Define which APIs to test
- `config/ids.json` - Set test data (IDs, etc.)
- `config/comparison.yaml` - Configure test jobs

## ❓ Need More Help?

- Ask your team lead
- Check the full documentation in `PROJECT_ARCHITECTURE.md`
- Contact the development team for technical support

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
```yaml
- key: "matches-live-v1"
  platform: "i"
  path: "matches/v1/live"
  idCategory: null
- key: "matches-live-v2"
  platform: "i"
  path: "matches/v2/live"
  idCategory: null
```

### Editing comparison.yaml

You can now compare any two endpoints, of any version or environment, by configuring either:
- `endpointPairs` (recommended): Explicitly pairs any two endpoints (e.g., prod v1 vs stg v2, stg v1 vs prod v2, etc.)
- `endpointsToRun` (legacy): Compares the same endpoint (by key) on both sides

#### Example: Compare prod v1 vs stg v2
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

#### Example: Compare prod v1 vs stg v1 (legacy)
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

- You can mix and match environments (prod/stg), versions (v1/v2), and platforms (i/a/m/w) as needed.
- For each job, set `baseA` and `baseB` to the desired environments, and configure the endpoint keys accordingly.

## Running Comparisons

1. Edit `endpoints.yaml` and `comparison.yaml` as needed for your test scenario.
2. Run the comparison:
   ```bash
   npm run compare
[#########--------------] 45% | 6/14 | ETA: 00:00:08 | Quick Test
```

- Shows percentage complete
- Current tasks completed / total tasks 
- Estimated time remaining
- Current job name

### What Happens During Comparison

1. The tool loads all configuration files
2. **Runs each test job** from your `comparison.yaml` file
3. **Tests every combination** of:
   - API endpoints
   - Test data IDs
   - Geographic locations
4. **Saves detailed results** in a timestamped folder like:
   ```
   reports/2025-06-11_14-45-30/
   ├── diff_data.json
   └── index.html
   ```

### ⏹️ Stopping a Comparison Run

If a test is taking too long:

1. **Press `Ctrl+C` in the terminal**
2. **Wait a few seconds** for it to stop
3. **Note**: Partial results won't be saved

💡 **Tip**: For large tests, use `QUICK_MODE=true` to test fewer IDs first.

## 📊 Viewing Reports

### 🚀 Starting the Report Server

1. Open a terminal in the project folder
2. Run this command:
   ```bash
   npm run serve
   ```
3. You'll see a message like:
   ```
   Report server running on http://localhost:3000
   ```

### 🌐 Accessing Reports

1. Open your web browser
2. Go to: http://localhost:3000
3. You'll see a list of reports sorted by date (newest first)
4. Click on any report to open it

🔍 **Trouble?** Make sure the server is running (look for the terminal message)

## 🖥️ Understanding the Report Interface

### 🔍 Navigation Bar
- **Platform Tabs**: Switch between different platforms (iOS, Android, etc.)
- **Search Box**: Find specific endpoints or IDs quickly
- **Filter Buttons**: 
  - `All` - Show all test results
  - `Errors` - Show only failed tests
  - `Warnings` - Show tests with non-critical issues
  - `Success` - Show only passed tests

### 📋 Test Results Table
Each row shows an API test result with:
- **Status Icon**: 
  - ✅ Passed - No differences found
  - ⚠️ Warning - Non-critical differences found
  - ❌ Failed - Critical differences found
- **Endpoint**: The API path that was tested
- **ID**: The test data ID used
- **Geo**: Location code (IN, US, etc.)
- **Time**: How long the test took

### 🔍 Understanding Differences

Click any row to see detailed differences, organized by importance:

#### 1. ⚠️ Critical Issues (Red)
- Missing required fields
- Changed data types
- Potentially breaking changes

#### 2. 🔄 Structural Changes (Yellow)
- Added/removed fields
- Array length changes
- Object structure changes

#### 3. 🔢 Data Changes (Blue)
- Numeric value changes
- Text updates
- Non-breaking data differences

💡 **Pro Tip**: Click the `▶` button to expand/collapse sections and focus on what matters most.

## 🔍 Understanding Complex Paths

When you see a long path like this in the report:
```
typeMatches[3].seriesMatches[2].matches[1].matchInfo.currBatTeamId
```

### 🖱️ Interactive Path Exploration

1. **Hover over any path** to see a popup that shows:
   - The full path in a tree view
   - Array positions (like `[3]` for the 4th item in an array)
   - The actual value that was changed

2. **Understand what changed**:
   - 🔴 **Red text**: Removed content
   - 🟢 **Green text**: Added content
   - 🔄 **Blue text**: Changed values

### 📝 Understanding Change Descriptions

When a field was removed, you'll see exactly what was there before:
```
Removed: wickets = "2"
```

For complex objects:
```
Removed object with keys: id, name, type
```

For array items:
```
Removed array element containing: {type: 'adDetail', id: '123'}
```

💡 **Quick Tip**: The path shows you exactly where in the API response the change occurred, making it easier to find and fix issues.

## 🧩 Understanding API Changes

Our tool automatically sorts API differences by importance, so you know what needs immediate attention.

### 🚨 Critical Issues (Red)
These could break your app - check these first!
- ❌ **Missing fields** - Required data is gone
- 🔄 **Type changes** - A number became text, or an object became an array
- 🧱 **Structure changes** - The API layout changed significantly

### ⚠️ Important Changes (Yellow)
Might affect functionality:
- ➕ New fields added
- 🔄 Changed field order
- 🔢 Array items added/removed

### ℹ️ Minor Changes (Blue)
Likely safe to ignore initially:
- 🔢 Number updates (scores, counts)
- 🔤 Text changes
- 🔄 Minor formatting differences

## 🏆 Smart Testing Tips

### 1. First Things First
- Start with ❌ **Critical Issues** - these need immediate attention
- Then check ⚠️ **Important Changes** - understand what's new or different
- Review ℹ️ **Minor Changes** last - often just data updates

### 2. Understanding the Impact
- **For App Developers**: Focus on structural changes first
- **For Data Analysts**: Check value changes in metrics
- **For QA**: Verify all changes match expected behavior

### 3. Using the Interface
- Click `▶` to expand/collapse sections
- Use the search to find specific fields
- Hover over paths to see where changes happened
- Compare raw JSON when you need full context

### 4. Common Scenarios

#### When a field is missing:
1. Check if it was renamed (search for similar names)
2. Verify if it's moved to a different location
3. Confirm if it was intentionally removed

#### When values are different:
1. Check if it's a time/date difference
2. Look for patterns (e.g., all numbers increased by 1)
3. Verify if it's within expected variance

💡 **Pro Tip**: Use the "Hide Unchanged" toggle to focus only on what's different!

## 🛑 Stopping the Report Server

### Method 1: Using the Terminal
1. Go to the terminal where the server is running
2. Press `Ctrl+C`
3. Wait for it to shut down (you'll see a message)

### Method 2: Using Commands (if you can't access the terminal)
```bash
# This stops the server by finding and stopping the process
pkill -f "node src/server.js"
```

### Method 3: Using Task Manager (Windows) or Activity Monitor (Mac)
1. Open Task Manager (Windows) or Activity Monitor (Mac)
2. Look for "Node.js" or "node" processes
3. Select and end the process

🔍 **Troubleshooting**: If you see "Address already in use" when restarting, try:
```bash
# Find the process using port 3000
lsof -i :3000

# Then kill it (replace PID with the number from above)
kill -9 PID
```

💡 **Pro Tip**: Always stop the server properly to avoid port conflicts when restarting.

## 🛠️ Common Tasks

### ➕ Adding a New API to Test

#### 1. Add the API Endpoint
Edit `config/endpoints.yaml`:
```yaml
- key: "match-details"           # Unique name for this endpoint
  platform: "i"                 # i=iOS, a=Android, m=Mobile Web, w=Desktop Web
  path: "/cricket-match/v1/{matchId}/live"  # API path with {variables}
  idCategory: "matchId"         # Matches the variable in the path
```

#### 2. Add Test Data
Edit `config/ids.json`:
```json
{
  "matchId": [12345, 67890],  # Add test match IDs here
  "teamId": [100, 200]        # Other ID types you might need
}
```

#### 3. Include in a Test Job
Edit `config/comparison.yaml`:
```yaml
jobs:
  - name: "Production vs Staging"
    platform: "i"
    baseA: "https://api.production.com"
    baseB: "https://api.staging.com"
    endpointsToRun:
      - "existing-endpoint"
      - "match-details"  # Add your new endpoint here
    ignorePaths:
      - "meta.timestamp"  # Ignore timestamps in comparison
```

### 🌍 Adding a New Location

1. Edit `config/headers.json`:
```json
{
  "i": {
    "accept": "application/json",
    "cb-loc": ["IN", "US", "CA", "AE", "UK"],  # Add your new country code
    "platform": "ios"
  }
}
```

### ⚡ Speeding Up Tests

#### Option 1: Quick Mode (Fewer Tests)
```bash
QUICK_MODE=true npm run compare
```

#### Option 2: Increase Parallel Tests
Edit `src/comparator.js`:
```javascript
// Change this number (higher = faster but uses more resources)
const limit = pLimit(10);  // Default is 5
```

### 🔄 Creating a New Test Job

1. Copy an existing job in `config/comparison.yaml`
2. Update these key parts:
   ```yaml
   - name: "My New Test Job"
     platform: "a"  # a=Android, i=iOS, m=Mobile Web, w=Desktop Web
     baseA: "https://api.production.com"
     baseB: "https://api.staging.com"
     endpointsToRun:
       - "matches-live"
       - "match-details"
     quickMode: true  # Optional: Test with fewer IDs first
   ```

### 📊 Ignoring Unimportant Changes

Edit `config/comparison.yaml` to ignore fields that change often:
```yaml
jobs:
  - name: "My Test Job"
    # ... other settings ...
    ignorePaths:
      - "meta.timestamp"
      - "responseTime"
      - "cache.updatedAt"
```

💡 **Pro Tip**: After making changes, test with a single endpoint first to verify everything works!

## 🚨 Troubleshooting Guide

### 🔍 Common Issues and Fixes

#### 1. "No reports found" Error
**Symptom**: You see "No reports found. Run `npm run compare` first"

**Quick Fix**:
```bash
# Step 1: Generate a test report
npm run compare

# Step 2: Start the server
npm run serve
```

#### 2. Missing Module Error
**Symptom**: `Error: Cannot find module 'module-name'`

**Solution**:
```bash
# Reinstall all dependencies
npm install
```

#### 3. Tests Are Too Slow 🐢
**Try these speed boosts**:

**Option 1**: Enable Quick Mode
```yaml
# In config/comparison.yaml
jobs:
  - name: "Quick Test"
    quickMode: true  # Tests fewer IDs
    # ... rest of config ...
```

**Option 2**: Reduce Test Scope
- Edit `config/ids.json` to test fewer IDs
- Reduce locations in `config/headers.json`

**Option 3**: Increase Parallel Tests
```javascript
// In src/comparator.js
const limit = pLimit(10);  // Default is 5
```

#### 4. Out of Memory Crash 💥
**Symptom**: `JavaScript heap out of memory`

**Solution**:
```bash
# Give Node.js more memory (4GB)
export NODE_OPTIONS="--max-old-space-size=4096"
npm run compare
```

#### 5. Stale Results 🔄
**Symptom**: Not seeing latest API changes

**Fix**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Stop and restart the server
4. Delete old reports: `rm -rf reports/2025-*`
5. Run a new comparison

#### 6. Blank Report Page ⚠️
**If you see a blank page or errors**:

1. **Check for JavaScript errors** (F12 → Console)
2. **Verify report data exists**:
   ```bash
   ls -la reports/latest/diff_data.json
   ```
3. **Clear browser cache** (Ctrl+Shift+R)
4. **Check server logs** for errors

### 🛠️ Advanced Troubleshooting

#### Checking Server Logs
```bash
# For local server
npm run serve  # View logs in terminal

# For Docker
docker-compose logs -f
```

#### Debugging API Calls
1. Add this to your test configuration:
   ```yaml
   debug: true  # Shows detailed request/response info
   ```
2. Check the terminal for detailed logs

#### Network Issues
If you see timeouts or connection errors:
1. Check your internet connection
2. Verify API endpoints are accessible:
   ```bash
   curl -I https://your-api-endpoint.com
   ```
3. Check for VPN/firewall restrictions

💡 **Still stuck?** Try these steps:
1. Restart your computer
2. Update Node.js to the latest LTS version
3. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

---

## 🚀 Common Commands Cheat Sheet

### 🔄 Running Tests
```bash
# Run all API comparisons
npm run compare

# Quick test (fewer IDs, faster)
QUICK_MODE=true npm run compare

# Test with specific concurrency (default: 5)
CONCURRENCY_LIMIT=10 npm run compare
```

### 🖥️ Server Management
```bash
# Start the report server
npm run serve

# Stop the server (choose one)
pkill -f "node src/server.js"  # Simple method
# OR
kill $(lsof -t -i:3000)  # If you need to be specific
```

### 🧹 Cleanup
```bash
# Delete all reports from current year
rm -rf reports/2025-*

# Remove all node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### 🐳 Docker Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Rebuild containers
docker-compose up -d --build
```

### 🔍 Debugging
```bash
# Check running Node processes
ps aux | grep node

# Check what's using port 3000
lsof -i :3000

# Test API endpoint
curl -I http://localhost:3000
```

### 💾 Memory Management
```bash
# Run with more memory (4GB)
export NODE_OPTIONS="--max-old-space-size=4096"

# Check Node.js memory usage
node -e 'console.log(process.memoryUsage())'
```

💡 **Pro Tip**: Create aliases for frequently used commands in your shell profile (`.bashrc` or `.zshrc`):
```bash
alias cbz-compare="cd /path/to/CBZ-API-Delta && npm run compare"
alias cbz-serve="cd /path/to/CBZ-API-Delta && npm run serve"
```

---

# 🌐 Team Collaboration Guide

Share API test results with your team using our Docker setup. This creates a secure web server that your team can access through the office network.

## 🚀 Quick Start

### 1. Set Up Authentication

```bash
# In your project folder
./create-password.sh yourusername yoursecurepassword
```

### 2. Start the Server

```bash
docker-compose up -d
```

### 3. Access Reports
- **You**: http://localhost
- **Team**: http://YOUR_IP_ADDRESS (share this with your team)
- **Login**: Use the username/password you created

## 📱 What Your Team Sees

### Main Dashboard (`/reports`)
- Latest test results
- Status overview
- Direct links to detailed reports

### Archive Section (`/archive`)
- Historical test results
- Organized by date
- Quick access to past comparisons

## 🛠️ Management

### Adding Team Members
1. Create their login:
   ```bash
   ./create-password.sh newuser theirpassword
   ```
2. Restart Nginx:
   ```bash
   docker-compose restart nginx
   ```

### Updating the Server
```bash
# Get latest changes
git pull

# Rebuild containers
docker-compose up -d --build
```

### Stopping the Server
```bash
docker-compose down
```

## 🔒 Security Notes

- Always use strong passwords
- Share access details securely (use a password manager)
- Regularly update passwords
- Only expose necessary ports (80/443)

## 📊 Report Management

### Adding New Reports
1. Run your tests as usual:
   ```bash
   npm run compare
   ```
2. Reports appear automatically in the web interface

### Archiving Old Reports
1. Move reports to the archive:
   ```bash
   mv reports/2025-06-* old_reports/
   ```
2. They'll appear in the `/archive` section

## 🚨 Troubleshooting

### Can't Access from Another Computer?
1. Check your computer's local IP:
   ```bash
   # On Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # On Windows
   ipconfig
   ```
2. Ensure both computers are on the same network
3. Try accessing with `http://YOUR_IP` (not localhost)

### Server Not Starting?
Check the logs:
```bash
docker-compose logs -f
```

## 📱 Mobile Access
Your team can view reports on phones/tablets:
1. Connect to office WiFi/VPN
2. Open browser
3. Go to `http://YOUR_IP`

💡 **Pro Tip**: For remote teams, set this up on a cloud server (like AWS EC2) for 24/7 access!

## Additional Resources

For more detailed information:

- **PROJECT_ARCHITECTURE.md**: Technical architecture details
- **README.md**: General project overview
- **src/comparator.js**: Core comparison logic
- **src/server.js**: Web server implementation

---

For any further questions, please consult the project team.
