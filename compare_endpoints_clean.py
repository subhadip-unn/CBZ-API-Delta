import os
import argparse
import requests
import logging
import json
import re
import itertools
from curl_parser import parse_curl_file, CurlParseError
from geo_utils import get_geos, apply_geo_headers
from body_compare import compare_json_bodies, compare_text_bodies
from report_builder import write_html_report

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def fetch_response(method, url, headers, cookies, data=None):
    try:
        resp = requests.request(method, url, headers=headers, cookies=cookies, data=data, timeout=15)
        return resp
    except requests.RequestException as e:
        logging.error(f"Request failed: {e}")
        return None

def compare_and_report(resp1, resp2):
    """
    Compare two API responses (resp1, resp2) and log/report differences.

    - Checks if both responses are present.
    - Compares status codes and logs a warning if they differ.
    - Only compares critical headers (currently: 'content-type') and ignores all others.
    - Logs any mismatches in critical headers.
    - Compares JSON bodies using compare_json_bodies and prints a unified diff if differences exist.
    This function is used to ensure meaningful, actionable comparisons between two API responses, focusing on what matters for clients and tests.
    """
    if resp1 is None or resp2 is None:
        logging.error("One or both responses are missing, skipping comparison.")
        return
    # Status code
    if resp1.status_code != resp2.status_code:
        logging.warning(f"Status code differs: {resp1.status_code} vs {resp2.status_code}")
    # Headers: Only enforce that critical headers from prod are present and equal in stg.
    # All other headers (diagnostic, security, proxy, etc.) are ignored.
    critical_headers = ['content-type']
    mismatches = []
    for h in critical_headers:
        v1 = resp1.headers.get(h)
        v2 = resp2.headers.get(h)
        if v1 != v2:
            mismatches.append((h, v1, v2))
    if mismatches:
        for k, v_prod, v_stg in mismatches:
            logging.warning(f"Header '{k}' differs: Prod='{v_prod}' vs Stg='{v_stg}'")
    # Body comparison
    diff = compare_json_bodies(resp1, resp2)
    if diff is not None and diff:
        print("\nJSON body diff:")
        for line in diff:
            print(line)
    elif diff is None:
        # Not JSON, compare as text
        diff = compare_text_bodies(resp1, resp2)
        if diff:
            print("\nText body diff:")
            for line in diff:
                print(line)
    else:
        print("Bodies match.")

def substitute_placeholders(curl_path, id_dict, combo):
    """Substitute all placeholders in the cURL file with values from combo dict."""
    with open(curl_path) as f:
        curl_str = f.read()
    for placeholder, value in combo.items():
        curl_str = curl_str.replace(f"<{placeholder}>", str(value))
    return curl_str

def get_placeholders(curl_path):
    with open(curl_path, 'r', encoding='utf-8') as f:
        curl_str = f.read()
    detected = re.findall(r"<([^>]+)>", curl_str)
    return detected

import datetime

def main():
    parser = argparse.ArgumentParser(description="Compare API responses for two environments/versions (A vs B), using cURL templates with placeholders.")
    parser.add_argument('--file-a', help='[DEPRECATED] Flat cURL file path. Use --dir-a and --endpoint for new structure.')
    parser.add_argument('--file-b', help='[DEPRECATED] Flat cURL file path. Use --dir-b and --endpoint for new structure.')
    parser.add_argument('--dir-a', help='Directory for side A cURL templates (e.g. curl_templates/prod)')
    parser.add_argument('--dir-b', help='Directory for side B cURL templates (e.g. curl_templates/stg)')
    parser.add_argument('--endpoint', help='Endpoint cURL filename (e.g. ios_pointstable.curl)')
    parser.add_argument('--label-a', default=None, help='Label for side A (default: auto-detect or "A")')
    parser.add_argument('--label-b', default=None, help='Label for side B (default: auto-detect or "B")')
    parser.add_argument('--ids-file', default='test_ids.json', help='Path to test_ids.json (contains all IDs for placeholder substitution)')
    args = parser.parse_args()

    # Only support new directory-based structure
    if args.dir_a is None or args.dir_b is None or args.endpoint is None:
        parser.error("You must specify both --dir-a/--endpoint and --dir-b/--endpoint.")

    file_a = os.path.join(args.dir_a, args.endpoint)
    file_b = os.path.join(args.dir_b, args.endpoint)

    def extract_env_and_version(url_or_path):
        env = None
        version = None
        # Environment detection
        env_map = [
            (r'(prod|production|\.com)', 'PROD'),
            (r'(stg|stage|staging)', 'STG'),
            (r'(dev)', 'DEV'),
            (r'(qa)', 'QA'),
        ]
        for patt, label in env_map:
            if re.search(patt, url_or_path, re.IGNORECASE):
                env = label
                break
        # Version detection
        v_match = re.search(r'v(\d+)', url_or_path, re.IGNORECASE)
        if v_match:
            version = f"V{v_match.group(1)}"
        return env, version

    def smart_label(url_or_path, fallback):
        env, version = extract_env_and_version(url_or_path)
        if env and version:
            return f"{env} {version}"
        elif env:
            return env
        elif version:
            return version
        return fallback

    # ... rest of your main logic ...

if __name__ == "__main__":
    main()
