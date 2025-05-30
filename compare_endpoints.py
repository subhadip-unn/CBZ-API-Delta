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
from report_builder import write_html_report, write_markdown_report

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def fetch_response(method, url, headers, cookies, data=None, max_retries=2):
    last_exception = None
    for attempt in range(max_retries + 1):
        try:
            resp = requests.request(method, url, headers=headers, cookies=cookies, data=data, timeout=15)
            return resp, None
        except requests.Timeout as e:
            last_exception = e
            logging.error(f"Request timed out (attempt {attempt+1}): {e}")
        except requests.ConnectionError as e:
            last_exception = e
            logging.error(f"Connection error (attempt {attempt+1}): {e}")
        except requests.RequestException as e:
            last_exception = e
            logging.error(f"Request failed (attempt {attempt+1}): {e}")
    return None, str(last_exception) if last_exception else 'Unknown error'

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
    critical_headers = ["content-type"]
    prod_headers = {k.lower(): v for k, v in resp1.headers.items()}
    stg_headers = {k.lower(): v for k, v in resp2.headers.items()}
    mismatches = []
    for k in critical_headers:
        v_prod = prod_headers.get(k)
        v_stg = stg_headers.get(k)
        if v_prod != v_stg:
            mismatches.append((k, v_prod, v_stg))
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
    print(f"\nDEBUG: Reading {curl_path}")
    print("CONTENT SNIPPET:", repr(curl_str[:200]))
    detected = re.findall(r"<([^>]+)>", curl_str)
    print("PLACEHOLDERS DETECTED:", detected)
    return detected

import datetime

# ... (rest of the code above remains the same)

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
    
    # We're enforcing directory mode
    dir_mode = True

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

    # User-supplied labels take precedence, else auto-label from dir if in dir mode
    if dir_mode:
        label_a = args.label_a or os.path.basename(os.path.normpath(args.dir_a)).upper() if args.dir_a else 'A'
        label_b = args.label_b or os.path.basename(os.path.normpath(args.dir_b)).upper() if args.dir_b else 'B'
    else:
        label_a = args.label_a or smart_label(file_a or '', 'A')
        label_b = args.label_b or smart_label(file_b or '', 'B')

    # For reporting
    report = {
        'tester': 'QA Subhadip Das',
        'datetime': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'file_a': file_a,
        'file_b': file_b,
        'label_a': label_a,
        'label_b': label_b,
        'ids_file': args.ids_file,
        'routes': set(),
        'geos': [],
        'results': []
    }

    # NOTE: This script expects cURL templates with placeholders (e.g., <SERIES_ID>) in curl_templates/.
    # IDs for substitution are managed in test_ids.json. No rewrite or generated_curls/ logic is used anymore.
    # Just update your cURL templates and test_ids.json as needed.

    # Load IDs from test_ids.json
    with open(args.ids_file) as f:
        id_data = json.load(f)

    # Detect placeholders in the cURL template
    placeholders = get_placeholders(file_a)
    placeholder_lists = []
    placeholder_keys = []
    missing_placeholders = []
    for ph in placeholders:
        # try lowercase+s first, then uppercase+s (to match your JSON)
        key1 = ph.lower() + 's'
        key2 = ph + 's'
        if key1 in id_data:
            placeholder_lists.append(id_data[key1])
            placeholder_keys.append(ph)
        elif key2 in id_data:
            placeholder_lists.append(id_data[key2])
            placeholder_keys.append(ph)
        else:
            missing_placeholders.append(ph)
            logging.warning(f"No values for <{ph}> in {args.ids_file} (tried '{key1}' and '{key2}').")
    if missing_placeholders:
        logging.warning(f"Some placeholders in the cURL template(s) do not have corresponding lists in {args.ids_file}: {missing_placeholders}")

    # Cartesian product of all IDs (or just [{}] if none)
    combos = [dict(zip(placeholder_keys, vals)) for vals in itertools.product(*placeholder_lists)] if placeholder_lists else [{}]

    # Print summary at start
    print("\n========= API Endpoint Comparison =========")
    print(f"{report['label_a']} cURL template: {file_a}")
    if file_b:
        print(f"{report['label_b']} cURL template: {file_b}")
    print(f"IDs file: {args.ids_file}")
    print(f"Placeholders detected: {placeholders}")
    print(f"Number of ID combinations: {len(combos)}")
    print(f"Geos to test: {[g[0] for g in get_geos()]}")
    print("==========================================\n")

    for combo in combos:
        combo_str = ', '.join(f"{k}={v}" for k, v in combo.items()) if combo else 'No ID'
        print(f"\n=== Testing for: {combo_str} ===")
        # Substitute in prod and stg cURLs
        import tempfile
        curl_str_a = substitute_placeholders(file_a, id_data, combo)
        with tempfile.NamedTemporaryFile('w+', delete=False, suffix='.curl') as tmp_a:
            tmp_a.write(curl_str_a)
            tmp_a_path = tmp_a.name
        try:
            method_a, url_a, headers_a, cookies_a, body_a = parse_curl_file(tmp_a_path)
        except CurlParseError as e:
            logging.error(str(e))
            os.unlink(tmp_a_path)
            continue
        if file_b:
            curl_str_b = substitute_placeholders(file_b, id_data, combo)
            with tempfile.NamedTemporaryFile('w+', delete=False, suffix='.curl') as tmp_b:
                tmp_b.write(curl_str_b)
                tmp_b_path = tmp_b.name
            try:
                method_b, url_b, headers_b, cookies_b, body_b = parse_curl_file(tmp_b_path)
            except CurlParseError as e:
                logging.error(str(e))
                os.unlink(tmp_a_path)
                os.unlink(tmp_b_path)
                continue
        else:
            method_b = url_b = headers_b = cookies_b = body_b = None
        # Clean up temp files after use
        os.unlink(tmp_a_path)
        if file_b:
            os.unlink(tmp_b_path)

        for geo_name, geo_headers in get_geos():
            logging.info(f"\n--- Geo: {geo_name} ---")
            req_headers_a = apply_geo_headers(headers_a, geo_headers)
            resp_a, err_a = fetch_response(method_a, url_a, req_headers_a, cookies_a, body_a)
            test_result = {
                'geo': geo_name,
                'combo': combo.copy(),
                'url_a': url_a,
                'headers_a': req_headers_a.copy(),
                'status_a': resp_a.status_code if resp_a else 'ERR',
                'url_b': None,
                'headers_b': None,
                'status_b': None,
                'passed': True,
                'failures': [],
                'diff': None,
                'body_a': resp_a.text if resp_a else '',
                'body_b': '',
                'error_a': err_a,
                'error_b': None,
            }
            report['routes'].add(url_a)
            if url_b:
                report['routes'].add(url_b)
            if geo_name not in report['geos']:
                report['geos'].append(geo_name)
            if file_b:
                req_headers_b = apply_geo_headers(headers_b, geo_headers)
                resp_b, err_b = fetch_response(method_b, url_b, req_headers_b, cookies_b, body_b)
                test_result['url_b'] = url_b
                test_result['headers_b'] = req_headers_b.copy()
                test_result['status_b'] = resp_b.status_code if resp_b else 'ERR'
                test_result['body_b'] = resp_b.text if resp_b else ''
                test_result['error_b'] = err_b
                # Status code
                if resp_a is None or resp_b is None:
                    test_result['passed'] = False
                    if resp_a is None:
                        test_result['failures'].append(f"A request failed: {err_a}")
                    if resp_b is None:
                        test_result['failures'].append(f"B request failed: {err_b}")
                else:
                    if resp_a.status_code != resp_b.status_code:
                        test_result['passed'] = False
                        test_result['failures'].append(f"Status code differs: {resp_a.status_code} vs {resp_b.status_code}")
                    # Only compare critical headers
                    critical_headers = ['content-type']
                    for hdr in critical_headers:
                        p = resp_a.headers.get(hdr)
                        s = resp_b.headers.get(hdr)
                        if p != s:
                            test_result['passed'] = False
                            test_result['failures'].append(f"Header '{hdr}' differs: {report['label_a']}={p} vs {report['label_b']}={s}")
                            test_result['diff'] = f"Header '{hdr}' differs: {report['label_a']}={p} vs {report['label_b']}={s}"
                    # Body comparison
                    diff = compare_json_bodies(resp_a, resp_b)
                    if diff is not None and diff:
                        test_result['passed'] = False
                        test_result['failures'].append('JSON body differs')
                        test_result['diff'] = '\n'.join(diff)
                    elif diff is None:
                        # Not JSON, compare as text
                        diff = compare_text_bodies(resp_a, resp_b)
                        if diff:
                            test_result['passed'] = False
                            test_result['failures'].append('Text body differs')
                            test_result['diff'] = '\n'.join(diff)
                report['results'].append(test_result)
            else:
                # Only A, no comparison
                if resp_a is None:
                    test_result['passed'] = False
                    test_result['failures'].append(f"A request failed: {err_a}")
                report['results'].append(test_result)
                print(f"{report['label_a']} Status: {resp_a.status_code if resp_a else 'ERR'}")
                print(f"Headers: {dict(resp_a.headers) if resp_a else 'ERR'}")
                print(f"Body (first 500 chars): {resp_a.text[:500] if resp_a else 'ERR'}")
                if resp_a is None:
                    print(f"Error: {err_a}")
                print("-"*40)

    # After all tests, determine if all failed
    total_tests = len(report['results'])
    successful_tests = sum(1 for r in report['results'] if r['passed'])
    report['all_failed'] = successful_tests == 0

    # DEBUG PATCH: If no results, add a dummy failure so report is never blank
    if not report['results']:
        report['results'].append({
            'geo': 'DEBUG',
            'combo': {'DEBUG': 'NO_RESULTS'},
            'url_a': 'N/A',
            'headers_a': {},
            'status_a': 'ERR',
            'url_b': 'N/A',
            'headers_b': {},
            'status_b': 'ERR',
            'passed': False,
            'failures': ['NO TEST RESULTS COLLECTED'],
            'diff': 'No test logic executed',
            'body_a': '',
            'body_b': '',
            'error_a': 'NO RESULTS',
            'error_b': 'NO RESULTS',
        })

    # Write HTML report with timestamp in filename
    dt_str = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    html_path = f'test_report_{dt_str}.html'
    write_html_report(report, html_path)
    # Also write Markdown report
    md_path = f'test_report_{dt_str}.md'
    write_markdown_report(report, md_path)

    # Print overall summary
    if report['all_failed']:
        print("\033[91mNo successful comparisons. All requests failed or timed out.\033[0m")
    else:
        print(f"\033[92m{successful_tests}/{total_tests} tests passed.\033[0m")

    # Print failed combos/geos summary
    for res in report['results']:
        if not res['passed']:
            combo_str = ', '.join(f"{k}={v}" for k, v in res['combo'].items()) if res['combo'] else 'No ID'
            print(f"\033[91mFAILED: Combo: {combo_str} | Geo: {res['geo']} | Reason(s): {res['failures']}\033[0m")

    # Write Markdown report with timestamp in filename
    with open(md_path, 'w') as rep:
        rep.write(f"# API Test Report\n\n")
        rep.write(f"**Tested by:** QA Subhadip Das  ")
        rep.write(f"**Date/Time:** {report['datetime']}\n\n")
        rep.write(f"**{report['label_a']} cURL File:** `{report['file_a']}`  ")
        if report['file_b']:
            rep.write(f"**{report['label_b']} cURL File:** `{report['file_b']}`  ")
        rep.write(f"**IDs File:** `{report['ids_file']}`  \n")
        rep.write(f"**Routes Tested:**\n")
        for r in report['routes']:
            rep.write(f"- `{r}`\n")
        rep.write(f"\n**Geos Tested:** {', '.join(report['geos'])}\n\n")
        rep.write(f"---\n\n")
        for res in report['results']:
            combo_str = ', '.join(f"{k}={v}" for k, v in res['combo'].items()) if res['combo'] else 'No ID'
            rep.write(f"## Test: {combo_str} | Geo: {res['geo']}\n")
            rep.write(f"- **Prod URL:** `{res['url_a']}`\n")
            if res.get('url_b'):
                rep.write(f"- **Stg URL:** `{res['url_b']}`\n")
            rep.write(f"- **Prod Headers:** {res['headers_a']}\n")
            if res.get('headers_b'):
                rep.write(f"- **Stg Headers:** {res['headers_b']}\n")
            rep.write(f"- **Prod Status:** {res['status_a']}\n")
            if res.get('status_b'):
                rep.write(f"- **Stg Status:** {res['status_b']}\n")
            if res['passed']:
                rep.write(f"- **Result:** ✅ Passed\n\n")
            else:
                rep.write(f"- **Result:** ❌ Failed\n")
                for fail in res['failures']:
                    rep.write(f"    - {fail}\n")
                if res['diff']:
                    rep.write(f"    - **Diff:**\n\n```diff\n{res['diff']}\n```\n\n")
            rep.write(f"---\n\n")
    print(f"\n\033[92mTest report saved to {md_path}\033[0m\n")

    # Note: HTML report is now generated by write_html_report in report_builder.py
    # Timestamp is already added in the report paths above

if __name__ == "__main__":
    main()
