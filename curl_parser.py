import shlex

class CurlParseError(Exception):
    pass

def parse_curl_file(filepath):
    """
    Parses a curl file and returns method, url, headers, cookies, and body (if any).
    Supports -X/--request, -d/--data, -H, -b.
    Raises CurlParseError if malformed.
    """
    with open(filepath, 'r') as f:
        curl_cmd = f.read().replace('\\\n', ' ').replace('\\n', ' ')
    tokens = shlex.split(curl_cmd)
    url = None
    headers = {}
    cookies = {}
    method = 'GET'
    body = None
    i = 0
    # Patch: Try to extract the URL from the first argument after 'curl', supporting both single and double quotes
    url = None
    for idx, t in enumerate(tokens):
        if t == 'curl' and idx+1 < len(tokens):
            next_token = tokens[idx+1]
            # Remove single/double quotes if present
            if (next_token.startswith("'") and next_token.endswith("'")) or (next_token.startswith('"') and next_token.endswith('"')):
                url = next_token[1:-1]
            elif next_token.startswith('http'):
                url = next_token
            break
    # Fallback to legacy loop if not found
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t == 'curl':
            i += 1
            continue
        if t.startswith('http'):
            url = t
        elif t in ('-H', '--header'):
            # Collect all tokens after -H/--header until next flag (starting with -), join as header string
            header_tokens = []
            j = i + 1
            while j < len(tokens) and not (tokens[j].startswith('-') and len(tokens[j]) > 1):
                header_tokens.append(tokens[j])
                j += 1
            header_str = ' '.join(header_tokens)
            if ':' in header_str:
                key, value = header_str.split(':', 1)
                headers[key.strip()] = value.strip()
            i = j - 1  # Move index to last header token
        elif t == '-b':
            cookie_str = tokens[i+1]
            for pair in cookie_str.split(';'):
                if '=' in pair:
                    k, v = pair.strip().split('=', 1)
                    cookies[k.strip()] = v.strip()
            i += 1
        elif t in ('-X', '--request'):
            method = tokens[i+1].upper()
            i += 1
        elif t in ('-d', '--data', '--data-raw'):
            body = tokens[i+1]
            headers.setdefault('Content-Type', 'application/json')
            i += 1
        i += 1
    if not url:
        raise CurlParseError(f"No URL found in {filepath}. Is this a valid curl file?")
    return method, url, headers, cookies, body

