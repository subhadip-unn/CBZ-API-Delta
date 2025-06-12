# Using ChatGPT to Configure API Testing

This guide explains how to use ChatGPT to quickly and accurately update your API comparison configuration files.

## Table of Contents
- [Overview](#overview)
- [Preparing Your Request](#preparing-your-request)
- [Example Prompts](#example-prompts)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The CBZ API Delta tool uses two main YAML configuration files:

1. `endpoints.yaml`: Defines API endpoints for different platforms
2. `comparison.yaml`: Defines comparison jobs (which endpoints to compare)

ChatGPT can help you modify these files efficiently when you need to test new API endpoints or adjust existing ones.

## Preparing Your Request

Before asking ChatGPT to modify your YAML files, prepare the following information:

1. **API Information**:
   - Base URLs for both environments (staging, production)
   - Specific API paths you want to compare
   - Any ID parameters that need to be inserted

2. **Platform Information**:
   - Which platforms need to be tested (iOS, Android, Mobile Web, Desktop Web)
   - Platform codes used in your configuration (`i`, `a`, `m`, `w`)

3. **File Structure Knowledge**:
   - Current structure of your endpoints.yaml and comparison.yaml files
   - Naming conventions used in your project

## Example Prompts

### 1. Adding New Endpoints to Test

```
I need to test these venue API endpoints across all platforms (i, a, m, w):

Production:
- Venue details: https://apiserver.cricbuzz.com/{platform}/venues/v1/50
- Venue matches: https://apiserver.cricbuzz.com/{platform}/venues/v1/31/matches

Staging:
- Venue details: http://api.cricbuzz.stg/{platform}/venues/v1/31
- Venue matches: http://api.cricbuzz.stg/{platform}/venues/v1/31/matches

Please update my endpoints.yaml and comparison.yaml files to configure these comparisons with appropriate naming conventions.
```

### 2. Switching Test Focus

```
I want to switch my API testing from match endpoints to team endpoints. 

Current focus:
- matches/v1/live
- matches/v1/recent

New focus:
- teams/v1/12345
- teams/v1/12345/schedule

Please update both endpoints.yaml and comparison.yaml files to make this change while keeping all platforms (i, a, m, w) and appropriate job structures.
```

### 3. Modifying Specific Parameters

```
For my current venue endpoint testing, I need to change the venueId from 31 to 80 in both production and staging API paths. Please update endpoints.yaml with this change.
```

## Best Practices

1. **Be Explicit**: Always specify exact API paths, IDs, and which files need modification.

2. **Platform Codes**: Remember platform codes in our system:
   - `i`: iOS
   - `a`: Android
   - `m`: Mobile Web
   - `w`: Desktop Web (not "d" - this is a common mistake)

3. **Verify Header Configurations**: Make sure your headers.json has matching platform codes.

4. **Naming Conventions**: When creating endpoint keys:
   - Production: Use `{feature}-{subfeature}-v1` format
   - Staging: Use `{feature}-{subfeature}-stg` format

5. **ID Categories**: Only specify idCategory if you're using placeholder parameters like `{venueId}`. For hardcoded IDs, set idCategory to null.

## Troubleshooting

### Common Errors

1. **"Cannot read properties of undefined (reading 'cb-loc')"**:
   - Check that platform codes in your YAML files match those in headers.json
   - Desktop Web uses "w" not "d"

2. **Endpoint Not Found**:
   - Verify endpoint keys exactly match between endpoints.yaml and comparison.yaml
   - Check for typos in keys or paths

3. **Empty Response**:
   - Ensure the API paths are correct and the IDs exist
   - Verify that baseA and baseB URLs in comparison.yaml are accurate

### Validating Your Config

After ChatGPT updates your configuration files, always:

1. Check for syntax errors in the YAML
2. Verify all platform codes are consistent
3. Run a quick test with one platform before full comparison
4. Examine console output for warnings/errors

---

By following this guide, you can effectively use ChatGPT to maintain and update your API testing configuration files with minimal effort and maximum accuracy.
