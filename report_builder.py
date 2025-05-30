import datetime
import json

def summarize_unified_diff(diff_lines, max_items=7):
    """
    Summarize a unified diff (list of lines) as a short list of changed/added/removed fields or lines.
    For JSON, this will typically be top-level or key-path changes.
    Returns a list of summary strings (bullets).
    """
    summary = []
    for line in diff_lines:
        if line.startswith('@@') or line.startswith('---') or line.startswith('+++'):
            continue  # skip metadata
        if line.startswith('-'):
            summary.append(f"Removed: {line[1:].strip()}")
        elif line.startswith('+'):
            summary.append(f"Added: {line[1:].strip()}")
        elif line.startswith(' '):
            continue  # unchanged
        # else: skip
        if len(summary) >= max_items:
            break
    if not summary:
        # fallback: show first few lines if nothing found
        summary = [line.strip() for line in diff_lines[:max_items] if line.strip()]
    return summary

def write_html_report(report, html_path):
    """Generate an HTML report with interactive JSON diff viewer and side-by-side comparison."""
    label_a = report.get('label_a', 'A')
    label_b = report.get('label_b', 'B')
    
    # For debugging - print length of results
    print(f"[DEBUG] Number of results to write: {len(report.get('results', []))}")
    if report.get('results'):
        print(f"[DEBUG] First test: {report['results'][0]['geo']} - {report['results'][0]['combo']}")
    
    with open(html_path, 'w', encoding='utf-8') as html:
        # Write HTML header
        html.write("""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Test Report</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jsondiffpatch/public/formatters-styles/html.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <style>
        :root {
            --primary-color: #2d5aa6;
            --success-color: #28a745;
            --danger-color: #dc3545;
            --warning-color: #ffc107;
            --light-gray: #f8f9fa;
            --dark-gray: #343a40;
            --border-radius: 4px;
        }
        
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background-color: var(--primary-color);
            color: white;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        header h1 {
            margin: 0;
            font-size: 28px;
        }
        
        header .meta-info {
            margin-top: 10px;
            font-size: 14px;
            opacity: 0.9;
        }
        
        .summary-box {
            background-color: white;
            border-radius: var(--border-radius);
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .test-pass { 
            background-color: #eafbe7; 
            border-left: 5px solid var(--success-color); 
            padding: 15px; 
            margin-bottom: 20px; 
            border-radius: var(--border-radius);
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        
        .test-fail { 
            background-color: #ffeaea; 
            border-left: 5px solid var(--danger-color); 
            padding: 15px; 
            margin-bottom: 20px; 
            border-radius: var(--border-radius);
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        
        .error-detail { 
            color: var(--danger-color); 
            font-weight: bold; 
        }
        
        .error-icon { 
            color: var(--danger-color); 
            font-size: 1.2em; 
            vertical-align: middle; 
            margin-right: 0.2em; 
        }
        
        .test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .test-title {
            font-size: 18px;
            font-weight: bold;
        }
        
        .test-result {
            font-weight: bold;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 14px;
        }
        
        .test-pass .test-result {
            background-color: var(--success-color);
            color: white;
        }
        
        .test-fail .test-result {
            background-color: var(--danger-color);
            color: white;
        }
        
        pre { 
            background: #272822; 
            color: #f8f8f2; 
            padding: 12px; 
            overflow-x: auto; 
            border-radius: var(--border-radius); 
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
        }
        
        .details-section {
            margin-top: 15px;
        }
        
        .side-by-side {
            display: flex;
            gap: 20px;
            margin-top: 15px;
        }
        
        .side-by-side > div {
            flex: 1;
            background-color: white;
            border-radius: var(--border-radius);
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            padding: 15px;
        }
        
        .side-by-side h3 {
            margin-top: 0;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
            color: var(--primary-color);
        }
        
        details {
            margin: 10px 0;
            border-radius: var(--border-radius);
            background-color: white;
        }
        
        details summary {
            padding: 10px 15px;
            cursor: pointer;
            font-weight: bold;
            background-color: var(--light-gray);
            border-radius: var(--border-radius);
        }
        
        details[open] summary {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            background-color: #e9ecef;
        }
        
        .details-content {
            padding: 15px;
            border: 1px solid #eee;
            border-top: none;
            border-bottom-left-radius: var(--border-radius);
            border-bottom-right-radius: var(--border-radius);
        }
        
        .json-diff-viewer {
            margin: 15px 0;
            border: 1px solid #eee;
            border-radius: var(--border-radius);
            padding: 15px;
            background-color: white;
        }
        
        .diff-summary {
            font-size: 14px;
            margin-bottom: 10px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: var(--border-radius);
        }
        
        .diff-summary ul {
            margin: 5px 0;
            padding-left: 20px;
        }
        
        .diff-highlight {
            padding: 2px 5px;
            margin: 0 2px;
            border-radius: 3px;
            font-family: monospace;
        }
        
        .diff-removed {
            background-color: #ffdddd;
            color: #b71c1c;
        }
        
        .diff-added {
            background-color: #ddffdd;
            color: #1b5e20;
        }
        
        .url-box {
            padding: 8px 12px;
            background: #f0f4f8;
            border-radius: var(--border-radius);
            font-family: monospace;
            font-size: 14px;
            overflow-x: auto;
            margin: 5px 0;
        }
        
        .test-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .test-info-item {
            background-color: white;
            border-radius: var(--border-radius);
            padding: 10px 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .test-info-item h4 {
            margin: 0 0 5px 0;
            color: var(--dark-gray);
            font-size: 14px;
        }
        
        .test-info-item p {
            margin: 0;
            font-size: 14px;
        }
        
        .failures-summary {
            background-color: white;
            border-radius: var(--border-radius);
            padding: 20px;
            margin-top: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        
        .failures-summary h2 {
            color: var(--danger-color);
            margin-top: 0;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .failures-summary ul {
            padding-left: 20px;
        }
        
        .failures-summary li {
            margin-bottom: 8px;
        }
        
        /* Added styles for side-by-side JSON display */
        .json-container {
            display: flex;
            gap: 10px;
            width: 100%;
            overflow-x: auto;
        }
        
        .json-side {
            flex: 1;
            min-width: 0; /* Important for preventing flex items from overflowing */
            border: 1px solid #eee;
            border-radius: var(--border-radius);
            background-color: #f8f9fa;
            width: 50%;
        }
        
        .json-header {
            background-color: #e9ecef;
            padding: 8px 12px;
            font-weight: bold;
            border-top-left-radius: var(--border-radius);
            border-top-right-radius: var(--border-radius);
            border-bottom: 1px solid #ddd;
        }
        
        .json-content {
            padding: 10px;
            overflow-x: auto;
            max-height: 500px;
            overflow-y: auto;
        }
        
        .json-content pre {
            white-space: pre-wrap;
            word-break: break-all;
            max-width: 100%;
            font-size: 12px;
        }
        
        /* Improve diff display */
        .jsondiffpatch-delta {
            font-size: 12px;
            line-height: 1.3;
            max-width: 100%;
            overflow-x: auto;
        }
        
        /* JSON Diff styles to match jsondiff.com */
        .jsondiff-tool {
            font-family: monospace;
            font-size: 13px;
            line-height: 1.4;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 30px;
            display: flex;
            position: relative;
        }
        
        .jsondiff-header {
            background-color: #f0f0f0;
            padding: 10px 15px;
            font-weight: bold;
            font-size: 16px;
            border-bottom: 1px solid #ddd;
            text-align: center;
        }
        
        .jsondiff-main {
            display: flex;
            width: 100%;
            position: relative;
        }
        
        .jsondiff-found {
            background-color: #f0f0f0;
            padding: 8px;
            font-weight: bold;
            border-bottom: 1px solid #ddd;
        }
        
        .jsondiff-left, .jsondiff-right {
            flex: 1;
            min-width: 0;
            overflow-x: auto;
            position: relative;
            border-right: 1px solid #ddd;
        }
        
        .jsondiff-sidebar {
            width: 300px;
            background-color: #f8f8f8;
            padding: 0;
            overflow-y: auto;
            font-size: 12px;
            border-left: 1px solid #ddd;
        }
        
        .jsondiff-content {
            display: flex;
        }
        
        .jsondiff-line-numbers {
            padding: 5px 8px;
            text-align: right;
            background-color: #f8f8f8;
            color: #999;
            user-select: none;
            border-right: 1px solid #eee;
            min-width: 40px;
        }
        
        .jsondiff-code {
            padding: 5px 10px;
            white-space: pre;
            flex: 1;
        }
        
        .jsondiff-line {
            display: flex;
        }
        
        .jsondiff-line-number {
            width: 30px;
            text-align: right;
            color: #999;
            padding-right: 5px;
            user-select: none;
        }
        
        .jsondiff-line-content {
            flex: 1;
        }
        
        .jsondiff-added {
            background-color: #e8f5e9;
        }
        
        .jsondiff-removed {
            background-color: #ffebee;
        }
        
        .jsondiff-unchanged {
            background-color: transparent;
        }
        
        .jsondiff-highlight-left {
            background-color: #bbdefb;
        }
        
        .jsondiff-highlight-right {
            background-color: #ffccbc;
        }
        
        .missing-property-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            background-color: #f8f8f8;
        }
        
        .missing-property-item strong {
            display: block;
            margin-bottom: 3px;
        }
        
        .missing-property-item code {
            background-color: #e0e0e0;
            padding: 2px 4px;
            border-radius: 3px;
        }
        
        .missing-property-from {
            color: #555;
        }
        
        .diff-pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 10px;
            background-color: #f0f0f0;
            border-bottom: 1px solid #ddd;
        }
        
        .diff-counter {
            background-color: #e0e0e0;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
        }
        
        .diff-property {
            padding: 3px 8px;
            margin: 2px 0;
            border-radius: 2px;
        }
        
        .diff-missing {
            background-color: #ffebee;
            color: #b71c1c;
        }
        
        .diff-added {
            background-color: #e8f5e9;
            color: #1b5e20;
        }
        
        .diff-changed {
            background-color: #fff8e1;
            color: #f57f17;
        }
        
        .property-indicator {
            margin-top: 5px;
            display: flex;
            align-items: center;
            padding: 3px 8px;
            background-color: #f1f8e9;
            border-radius: 3px;
            font-size: 12px;
        }
        
        .property-indicator .icon {
            margin-right: 5px;
            color: #4caf50;
        }
        
        .missing-property {
            background-color: #ffebee;
            border-left: 3px solid #f44336;
            margin: 5px 0;
            padding: 8px 10px;
            font-size: 12px;
        }
        
        .diff-counter {
            font-size: 12px;
            padding: 3px 8px;
            background-color: #e9ecef;
            border-radius: 12px;
            margin-left: auto;
        }
        
        /* Location badges */
        .location-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            background-color: #e9ecef;
            margin: 3px;
            font-size: 14px;
            font-weight: bold;
        }
        
        /* Styles for property diff highlighting */
        .property-diff {
            margin: 8px 0;
            border-radius: var(--border-radius);
            padding: 8px;
            font-family: monospace;
            font-size: 13px;
            background-color: #f8f9fa;
        }
        
        .property-missing {
            background-color: #ffebee;
            border-left: 4px solid #f44336;
        }
        
        .property-added {
            background-color: #e8f5e9;
            border-left: 4px solid #4caf50;
        }
        
        .property-changed {
            background-color: #fff8e1;
            border-left: 4px solid #ffc107;
        }
        
        .diff-pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            color: white;
            margin-right: 5px;
        }
        
        .diff-removed-pill {
            background-color: #f44336;
        }
        
        .diff-added-pill {
            background-color: #4caf50;
        }
        
        .diff-changed-pill {
            background-color: #ff9800;
        }
        
        .diff-count {
            margin-top: 10px;
            display: flex;
            gap: 10px;
        }
        
        footer {
            margin-top: 40px;
            text-align: center;
            font-size: 14px;
            color: #666;
            padding: 20px;
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>API Comparison Test Report</h1>
            <div class="meta-info">
                <p>Generated on: <strong>""" + report['datetime'] + """</strong> | Tester: <strong>QA Subhadip Das</strong></p>
            </div>
        </div>
    </header>
    <div class="container">
""")

        # Summary box with test overview
        html.write('<div class="summary-box">\n')
        html.write(f'<h3>Test Overview</h3>\n')
        
        # Check if we have actual URLs to display
        sample_url_a = None
        sample_url_b = None
        sample_headers_a = None
        sample_headers_b = None
        combos = set()
        
        # Extract sample URLs and headers from the first result
        if report.get('results'):
            first_result = report['results'][0]
            sample_url_a = first_result.get('url_a')
            sample_url_b = first_result.get('url_b')
            sample_headers_a = first_result.get('headers_a')
            sample_headers_b = first_result.get('headers_b')
            
            # Collect all unique combos
            for result in report.get('results', []):
                if result.get('combo'):
                    combos.add(tuple(sorted(result.get('combo').items())))
        
        # Display API endpoints
        html.write(f'<div class="test-info">\n')
        html.write(f'<div class="test-info-item">\n')
        html.write(f'<h4>{label_a} API Endpoint:</h4>\n')
        if sample_url_a:
            html.write(f'<p><code>{sample_url_a}</code></p>\n')
        else:
            html.write(f'<p><code>{report["file_a"]}</code></p>\n')
        html.write('</div>\n')
        
        if report.get('file_b'):
            html.write(f'<div class="test-info-item">\n')
            html.write(f'<h4>{label_b} API Endpoint:</h4>\n')
            if sample_url_b:
                html.write(f'<p><code>{sample_url_b}</code></p>\n')
            else:
                html.write(f'<p><code>{report["file_b"]}</code></p>\n')
            html.write('</div>\n')
        html.write('</div>\n')
        
        # Display IDs used in testing
        html.write(f'<h4>Test IDs Used:</h4>\n')
        html.write('<div class="id-combinations">\n')
        if combos:
            for combo in combos:
                combo_dict = dict(combo)
                html.write('<div class="id-combo">\n')
                for k, v in combo_dict.items():
                    html.write(f'<span class="id-pair"><strong>{k}:</strong> {v}</span>\n')
                html.write('</div>\n')
        else:
            html.write(f'<p>Source: <code>{report["ids_file"]}</code></p>\n')
        html.write('</div>\n')
        
        # Display Headers
        if sample_headers_a or sample_headers_b:
            html.write('<div class="headers-section">\n')
            html.write('<h4>Headers Used:</h4>\n')
            html.write('<div class="test-info">\n')
            
            if sample_headers_a:
                html.write('<div class="test-info-item">\n')
                html.write(f'<h5>{label_a} Headers:</h5>\n')
                html.write('<ul class="header-list">\n')
                for header, value in sample_headers_a.items():
                    if header.lower() not in ['authorization', 'authentication']:
                        html.write(f'<li><strong>{header}:</strong> {value}</li>\n')
                    else:
                        # Mask sensitive headers
                        html.write(f'<li><strong>{header}:</strong> [MASKED]</li>\n')
                html.write('</ul>\n')
                html.write('</div>\n')
            
            if sample_headers_b:
                html.write('<div class="test-info-item">\n')
                html.write(f'<h5>{label_b} Headers:</h5>\n')
                html.write('<ul class="header-list">\n')
                for header, value in sample_headers_b.items():
                    if header.lower() not in ['authorization', 'authentication']:
                        html.write(f'<li><strong>{header}:</strong> {value}</li>\n')
                    else:
                        # Mask sensitive headers
                        html.write(f'<li><strong>{header}:</strong> [MASKED]</li>\n')
                html.write('</ul>\n')
                html.write('</div>\n')
            
            html.write('</div>\n')
            html.write('</div>\n')
        
        # Tests Run Stats
        html.write(f'<div class="test-stats">\n')
        html.write(f'<h4>Tests Run:</h4>\n')
        total_tests = len(report.get('results', []))
        passed_tests = sum(1 for r in report.get('results', []) if r.get('passed', False))
        html.write(f'<p><strong>{passed_tests}</strong> passed / <strong>{total_tests}</strong> total</p>\n')
        html.write('</div>\n')
        
        # Show all-failed message if applicable
        if report.get('all_failed'):
            html.write('<div class="test-fail" style="margin-top:15px;">\n')
            html.write('<i class="fas fa-exclamation-circle error-icon"></i> ')
            html.write('<b>No successful comparisons. All requests failed or timed out.</b>\n')
            html.write('</div>\n')
            
        html.write('</div>\n')
        
        # Add locations/geos summary section
        html.write('<div class="summary-box">\n')
        html.write('<h3><i class="fas fa-globe-americas"></i> Geo Locations Tested</h3>\n')
        html.write('<div style="margin-top: 10px;">\n')
        
        # Get unique geos from the results
        geos = set()
        for res in report.get('results', []):
            if 'geo' in res:
                geos.add(res['geo'])
        
        # Display geo badges
        for geo in sorted(geos):
            html.write(f'<span class="location-badge">{geo}</span>\n')
        
        html.write('</div>\n')
        html.write('<p style="margin-top: 15px; font-size: 14px; color: #666;">The above locations are tested for API differences across environments.</p>\n')
        html.write('</div>\n')

        # Always process test results, even if all failed
        results = report.get('results', [])
        for idx, res in enumerate(results):
            combo_str = ', '.join(f"{k}={v}" for k, v in res.get('combo', {}).items()) if res.get('combo') else 'No ID'
            div_class = 'test-pass' if res.get('passed', False) else 'test-fail'
            
            # Test container
            html.write(f"<div class='{div_class}'>\n")
            
            # Test header with result badge
            html.write(f"<div class='test-header'>\n")
            html.write(f"<div class='test-title'>Test {idx+1}: {combo_str} | Geo: {res.get('geo', 'Unknown')}</div>\n")
            html.write(f"<div class='test-result'>{'✅ Passed' if res.get('passed', False) else '❌ Failed'}</div>\n")
            html.write(f"</div>\n")
            
            # URLs in boxes
            html.write(f"<div class='url-box'>\n")
            html.write(f"<strong>{label_a}:</strong> {res.get('url_a', 'N/A')}\n")
            html.write(f"</div>\n")
            
            if res.get('url_b'):
                html.write(f"<div class='url-box'>\n")
                html.write(f"<strong>{label_b}:</strong> {res.get('url_b', 'N/A')}\n")
                html.write(f"</div>\n")
            
            # Status codes
            html.write(f"<div class='test-info' style='margin-top:10px;'>\n")
            html.write(f"<div class='test-info-item'>\n")
            html.write(f"<h4>{label_a} Status:</h4>\n")
            html.write(f"<p>{res.get('status_a', 'ERR')}</p>\n")
            html.write(f"</div>\n")
            
            if res.get('status_b'):
                html.write(f"<div class='test-info-item'>\n")
                html.write(f"<h4>{label_b} Status:</h4>\n")
                html.write(f"<p>{res.get('status_b', 'ERR')}</p>\n")
                html.write(f"</div>\n")
            html.write(f"</div>\n")
            
            # Show failure details
            if not res.get('passed', False):
                html.write("<details class='details-section'>\n")
                html.write("<summary>Failure Details</summary>\n")
                html.write("<div class='details-content'>\n")
                html.write("<ul>\n")
                for fail in res.get('failures', []):
                    html.write(f"<li><i class='fas fa-exclamation-triangle error-icon'></i><span class='error-detail'>{fail}</span></li>\n")
                if res.get('error_a'):
                    html.write(f"<li><span class='error-detail'>{label_a} error: {res.get('error_a')}</span></li>\n")
                if res.get('error_b'):
                    html.write(f"<li><span class='error-detail'>{label_b} error: {res.get('error_b')}</span></li>\n")
                html.write("</ul>\n")
                
                # Show diff summary
                if res.get('diff'):
                    html.write("<div class='diff-summary'>\n")
                    html.write("<strong>Differences Summary:</strong>\n")
                    html.write("<ul>\n")
                    for item in summarize_unified_diff(res.get('diff', '').splitlines() if isinstance(res.get('diff', ''), str) else res.get('diff', []), max_items=7):
                        if item.startswith('Removed:'):
                            html.write(f"<li><span class='diff-pill diff-removed-pill'>-</span> {item[8:]}</li>\n")
                        elif item.startswith('Added:'):
                            html.write(f"<li><span class='diff-pill diff-added-pill'>+</span> {item[6:]}</li>\n")
                        else:
                            html.write(f"<li>{item}</li>\n")
                    html.write("</ul>\n")
                    html.write("</div>\n")
                html.write("</div>\n")
                html.write("</details>\n")
            
            # Side-by-side JSON comparison
            html.write("<details class='details-section'>\n")
            html.write("<summary>Side-by-Side JSON Comparison</summary>\n")
            html.write("<div class='details-content'>\n")
            
            # Extract JSON bodies
            body_a = res.get('body_a', '')
            body_b = res.get('body_b', '')
            
            html.write("<div class='json-container'>\n")
            # Left side (A)
            html.write("<div class='json-side'>\n")
            html.write(f"<div class='json-header'>{label_a} Response</div>\n")
            html.write("<div class='json-content'>\n")
            html.write(f"<pre>{body_a}</pre>\n")
            html.write("</div>\n")
            html.write("</div>\n")
            
            # Right side (B)
            html.write("<div class='json-side'>\n")
            html.write(f"<div class='json-header'>{label_b} Response</div>\n")
            html.write("<div class='json-content'>\n")
            html.write(f"<pre>{body_b}</pre>\n")
            html.write("</div>\n")
            html.write("</div>\n")
            html.write("</div>\n")
            
            # jsondiff.com style diff viewer
            html.write("<h3 style='margin-top:20px;'>JSON Diff</h3>\n")
            html.write("<div class='jsondiff-tool'>\n")
            
            # If test failed, generate a semantic diff display like jsondiff.com
            if not res.get('passed', False):
                try:
                    # Try to parse both bodies as JSON
                    import json
                    try:
                        body_a_json = json.loads(body_a or '{}')
                    except:
                        body_a_json = {}
                    
                    try:
                        body_b_json = json.loads(body_b or '{}')
                    except:
                        body_b_json = {}
                    
                    # Find keys that exist in A but not in B
                    missing_in_b = [k for k in body_a_json.keys() if k not in body_b_json]
                    # Find keys that exist in B but not in A
                    missing_in_a = [k for k in body_b_json.keys() if k not in body_a_json]
                    # Find keys that exist in both but have different values
                    changed_keys = [k for k in body_a_json.keys() if k in body_b_json and body_a_json[k] != body_b_json[k]]
                    
                    diff_count = len(missing_in_a) + len(missing_in_b) + len(changed_keys)
                    
                    # Header section - similar to jsondiff.com
                    html.write("<div style='width:100%;'>\n")
                    html.write("<div class='jsondiff-header'>The semantic JSON compare tool</div>\n")
                    html.write(f"<div class='jsondiff-found'>Found {diff_count} differences</div>\n")
                    
                    # Main content section with left, right, and sidebar
                    html.write("<div class='jsondiff-main'>\n")
                    
                    # Left side panel
                    html.write("<div class='jsondiff-left'>\n")
                    
                    # Format body_a as JSON with line numbers
                    lines_a = body_a.split('\n')
                    html.write("<div class='jsondiff-content'>\n")
                    html.write("<div class='jsondiff-line-numbers'>\n")
                    for i in range(1, min(len(lines_a) + 1, 51)):  # Limit to 50 lines
                        html.write(f"{i}<br>\n")
                    html.write("</div>\n")
                    
                    html.write("<div class='jsondiff-code'>\n")
                    # Add syntax highlighting for JSON
                    highlighted_lines = []
                    for i, line in enumerate(lines_a[:50]):  # Limit to 50 lines
                        line_class = 'jsondiff-unchanged'
                        for key in missing_in_b:
                            if f'"{key}"' in line:
                                line_class = 'jsondiff-highlight-left'
                                
                        highlighted_lines.append(f"<div class='{line_class}'>{line}</div>")
                    
                    html.write('\n'.join(highlighted_lines))
                    if len(lines_a) > 50:
                        html.write("<div>...</div>\n")
                    html.write("</div>\n")
                    html.write("</div>\n")
                    html.write("</div>\n")
                    
                    # Right side panel
                    html.write("<div class='jsondiff-right'>\n")
                    
                    # Format body_b as JSON with line numbers
                    lines_b = body_b.split('\n')
                    html.write("<div class='jsondiff-content'>\n")
                    html.write("<div class='jsondiff-line-numbers'>\n")
                    for i in range(1, min(len(lines_b) + 1, 51)):  # Limit to 50 lines
                        html.write(f"{i}<br>\n")
                    html.write("</div>\n")
                    
                    html.write("<div class='jsondiff-code'>\n")
                    # Add syntax highlighting for JSON
                    highlighted_lines = []
                    for i, line in enumerate(lines_b[:50]):  # Limit to 50 lines
                        line_class = 'jsondiff-unchanged'
                        for key in missing_in_a:
                            if f'"{key}"' in line:
                                line_class = 'jsondiff-highlight-right'
                                
                        highlighted_lines.append(f"<div class='{line_class}'>{line}</div>")
                    
                    html.write('\n'.join(highlighted_lines))
                    if len(lines_b) > 50:
                        html.write("<div>...</div>\n")
                    html.write("</div>\n")
                    html.write("</div>\n")
                    html.write("</div>\n")
                    
                    # Sidebar with missing properties
                    html.write("<div class='jsondiff-sidebar'>\n")
                    
                    # Display pagination controls like in jsondiff.com
                    html.write("<div class='diff-pagination'>\n")
                    html.write(f"<div>1 of {diff_count}</div>\n")
                    html.write("<div><span>&lt;</span> <span>&gt;</span></div>\n")
                    html.write("</div>\n")
                    
                    # Display missing properties sidebar
                    if missing_in_a:
                        for prop in missing_in_a:
                            html.write(f"<div class='missing-property-item'>\n")
                            html.write(f"<strong>Missing property</strong>\n")
                            html.write(f"<code>{prop}</code>\n")
                            html.write(f"<div class='missing-property-from'>from the object on the left side</div>\n")
                            html.write(f"</div>\n")
                    
                    if missing_in_b:
                        for prop in missing_in_b:
                            html.write(f"<div class='missing-property-item'>\n")
                            html.write(f"<strong>Missing property</strong>\n")
                            html.write(f"<code>{prop}</code>\n")
                            html.write(f"<div class='missing-property-from'>from the object on the right side</div>\n")
                            html.write(f"</div>\n")
                    
                    html.write("</div>\n")
                    html.write("</div>\n")
                    html.write("</div>\n")
                    
                except Exception as e:
                    # Fallback to original jsondiffpatch view if parsing fails
                    html.write(f"<div style='padding:15px;'><i class='fas fa-exclamation-triangle'></i> Unable to generate jsondiff.com style diff: {str(e)}</div>\n")
                    html.write(f"<div id='json-diff-viewer-{idx}' class='json-diff-viewer'></div>\n")
            else:
                # If test passed, just show the standard diff viewer
                html.write(f"<div style='padding:15px;'>No differences found between responses.</div>\n")
            
            html.write("</div>\n")
            
            html.write("</div>\n")
            html.write("</details>\n")
            
            # End of test container
            html.write("</div>\n<hr>\n")

        # Failed combos/geos summary
        failed = [res for res in results if not res.get('passed', False)]
        if failed:
            html.write('<div class="failures-summary">')
            html.write('<h2><i class="fas fa-exclamation-circle"></i> Failed Tests Summary</h2>')
            html.write('<div class="diff-count">')
            html.write(f'<div><span class="diff-pill diff-removed-pill">{len(failed)}</span> Failed Tests</div>')
            html.write('</div>')
            html.write('<ul>')
            for res in failed:
                combo_str = ', '.join(f"{k}={v}" for k, v in res.get('combo', {}).items()) if res.get('combo') else 'No ID'
                reasons = ', '.join(res.get('failures', ['Unknown reason']))
                html.write(f'<li><i class="fas fa-times-circle error-icon"></i> <b>Combo:</b> {combo_str} | <b>Geo:</b> {res.get("geo", "Unknown")} | <span class="error-detail">Reason(s): {reasons}</span></li>')
            html.write('</ul>')
            html.write('</div>')

        # Add a professional footer
        html.write('''
        <footer>
            <p>API Test Report | Generated with Smart API Testing Framework</p>
            <p>Designed for comparing API responses across environments</p>
        </footer>
    </div> <!-- Close container -->
        
        <!-- JavaScript for interactive diff viewer -->
        <script src="https://cdn.jsdelivr.net/npm/jsondiffpatch/dist/jsondiffpatch.umd.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/jsondiffpatch/public/build/jsondiffpatch-formatters.min.js"></script>
        <script>
        function safeParse(json) {
            try { return JSON.parse(json); } catch (e) { return {}; }
        }
        ''')
        
        # Add JavaScript for each test result
        for idx, res in enumerate(results):
            body_a = res.get('body_a', '') or '{}'
            body_b = res.get('body_b', '') or '{}'
            
            # Replace problematic characters in JSON strings
            body_a = body_a.replace('`', '\\`').replace('\\', '\\\\')
            body_b = body_b.replace('`', '\\`').replace('\\', '\\\\')
            
            html.write(f"var a_{idx} = safeParse(`{body_a}`);\n")  # Use backticks for multiline strings
            html.write(f"var b_{idx} = safeParse(`{body_b}`);\n")
            html.write(f"var delta_{idx} = jsondiffpatch.diff(a_{idx}, b_{idx});\n")
            html.write(f"if (delta_{idx}) {{\n")
            html.write(f"  var html_{idx} = jsondiffpatch.formatters.html.format(delta_{idx}, a_{idx});\n")
            html.write(f"  document.getElementById('json-diff-viewer-{idx}').innerHTML = html_{idx};\n")
            html.write(f"}} else {{\n")
            html.write(f"  document.getElementById('json-diff-viewer-{idx}').innerHTML = '<i>No differences</i>';\n")
            html.write(f"}}\n")
        
        html.write("</script>\n")
        html.write("</body>\n</html>\n")
    
    print(f"\033[94mHTML test report saved to {html_path}\033[0m\n")


def write_markdown_report(report, md_path):
    """Generate a Markdown report with concise diff summaries."""
    label_a = report.get('label_a', 'A')
    label_b = report.get('label_b', 'B')
    with open(md_path, 'w', encoding='utf-8') as md:
        md.write(f"# CBZ API Delta\n\n")
        md.write(f"### API Test Report\n\n")
        md.write(f"**Tested by:** QA Subhadip Das  \n")
        md.write(f"**Date/Time:** {report['datetime']}\n\n")
        md.write(f"**{label_a} cURL File:** `{report['file_a']}`  \n")
        if report.get('file_b'):
            md.write(f"**{label_b} cURL File:** `{report['file_b']}`  \n")
        md.write(f"**IDs File:** `{report['ids_file']}`  \n")
        md.write(f"**Routes Tested:** {len(report['results'])}\n\n")
        rep.write(f"**Routes Tested:** {len(report['results'])}\n\n")

        if report.get('all_failed'):
            rep.write('> **❌ No successful comparisons. All requests failed or timed out.**\n\n')
        else:
            for idx, res in enumerate(report['results']):
                combo_str = ', '.join(f"{k}={v}" for k, v in res['combo'].items()) if res['combo'] else 'No ID'
                rep.write(f"---\n\n## Test {idx+1}\n")
                rep.write(f"**Test:** {combo_str} | **Geo:** {res['geo']}\n\n")
                rep.write(f"**{label_a} URL:** `{res['url_a']}`\n\n")
                if res['url_b']:
                    rep.write(f"**{label_b} URL:** `{res['url_b']}`\n\n")
                rep.write(f"**{label_a} Status:** {res['status_a']}\n\n")
                if res['status_b']:
                    rep.write(f"**{label_b} Status:** {res['status_b']}\n\n")
                rep.write(f"**Result:** {'✅ Passed' if res['passed'] else '❌ Failed'}\n\n")
                if not res['passed']:
                    rep.write(f"### Failure Details\n")
                    for fail in res['failures']:
                        rep.write(f"- {fail}\n")
                    if res.get('error_a'):
                        rep.write(f"- A error: {res['error_a']}\n")
                    if res.get('error_b'):
                        rep.write(f"- B error: {res['error_b']}\n")
                    if res['diff']:
                        rep.write(f"- **Diff summary:**\n")
                        for item in summarize_unified_diff(res['diff'].splitlines() if isinstance(res['diff'], str) else res['diff'], max_items=7):
                            rep.write(f"    - {item}\n")
                rep.write("\n")

            # Failed combos/geos summary
            failed = [res for res in report['results'] if not res['passed']]
            if failed:
                rep.write('---\n\n### Failed Combos/Geos Summary\n')
                for res in failed:
                    combo_str = ', '.join(f"{k}={v}" for k, v in res['combo'].items()) if res['combo'] else 'No ID'
                    rep.write(f'- ❌ **Combo:** {combo_str} | **Geo:** {res["geo"]} | Reason(s): {", ".join(res["failures"])}\n')
    print(f"\033[94mMarkdown test report saved to {md_path}\033[0m\n")
