# API Stability and Breaking Change Detection Implementation

This document outlines the implementation for enhanced API stability tracking and breaking change detection in the CBZ API Delta project.

## Overview

The implementation consists of two main features:
1. Always showing API stability indicators for debugging purposes
2. Detecting and flagging breaking API changes that could cause frontend failures

## Implementation Details

### 1. Always Show Stability Indicators

#### Changes to `renderStabilityIndicator` in `main.js`:

- Modified to use default parameter `alwaysShow = true` instead of `false`
- Changed the conditional check to only filter out null stability data rather than stable endpoints
- Added support for "stable" class and message display for stable endpoints
- Enhanced the tooltip to always show metrics data even for stable endpoints

```javascript
function renderStabilityIndicator(endpointKey, container, alwaysShow = true) {
  const stability = getEndpointStability(endpointKey);
  // If no stability data, return
  if (!stability) return null;
  // Always show indicators for debugging
  
  // Rest of function remains similar with improvements for displaying stable endpoints
}
```

### 2. Breaking Change Detection

#### New Functions in `comparator.js`:

##### `detectBreakingChanges(oldResponse, newResponse)`
- Compares previous and current API responses
- Returns an array of potential breaking changes with severity and descriptions
- Detects multiple types of breaking changes:
  - Missing responses (`response_missing`)
  - Status code changes (`status_change` or `status_error`)
  - Empty responses (`empty_response`)
  - Structure changes (`structure_change`)
  - Missing critical fields (`field_missing`)
  - Type changes in fields (`type_change`)
  - Empty arrays where previously populated (`empty_array`)

##### `detectCriticalFields(response)`
- Identifies likely critical fields in an API response based on common naming patterns
- Handles nested objects and arrays using recursion
- Returns paths to critical fields in dot notation

##### `getNestedValue(obj, path)`
- Helper to safely access nested values in objects using dot notation
- Handles array indexing and undefined values

#### Integration into `runJob` function:
```javascript
// Detect potential breaking changes between responses
const breakingChanges = detectBreakingChanges(
  { body: respA.data, status: respA.status }, 
  { body: respB.data, status: respB.status }
);

// Add breaking changes data to record object
const rec = {
  // ...existing fields
  breakingChanges: breakingChanges,
  hasBreakingChanges: breakingChanges.length > 0,
};
```

### 3. Frontend Breaking Change Indicator

#### `renderBreakingChangeIndicator` in `main.js`:
- Creates visual indicator for detected breaking changes
- Provides detailed tooltip with severity levels and explanations
- Uses purple badge with appropriate icon based on severity

#### Update to Card Rendering:
- Added breaking change indicators to endpoint cards
- Implemented tooltips that show on hover with detailed information
- Added event listeners to show/hide tooltips

```javascript
// Create breaking change indicator with hover details
breakingChangeIndicator = `
  <div class="breaking-change-container" style="position: relative; margin-left: 10px;">
    <span class="breaking-change-indicator" style="background-color:#9b59b6; color:white; padding:3px 8px; border-radius:4px; font-size:12px; cursor:help;">
      ${highestSeverity === 'high' ? '🚨 Breaking Change' : '⚠️ Potential Breaking Change'}
    </span>
    <!-- Tooltip content -->
  </div>
`;
```

## Detection Heuristics

The breaking change detection uses the following heuristics:

1. **Status Code Changes**: If status code changes from 2xx to 4xx/5xx
2. **Response Structure Changes**: If response changes from array to object or vice versa
3. **Required Field Removals**: If fields that were present in previous responses are missing
4. **Type Changes**: If a field changes data type (e.g., string to object)
5. **Empty Arrays**: If arrays that previously had content are now empty
6. **Missing Responses**: If API responses that previously existed are now missing

## Future Improvements

1. Add a summary count of breaking changes in the report header
2. Add filter options to easily show only endpoints with breaking changes
3. Allow configurable thresholds for breaking change severity
4. Add ability to ignore specific types of breaking changes
5. Improve critical field detection with more context-aware heuristics
6. Add support for custom-defined critical fields per endpoint

## Testing

To test the implementation:
1. Run a comparison job
2. Verify all endpoints show stability indicators (stable, warning, or unstable)
3. Check that endpoints with breaking changes show the purple breaking change indicator
4. Hover over these indicators to view detailed information
