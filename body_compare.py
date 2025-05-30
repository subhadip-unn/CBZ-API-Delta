import json
from difflib import unified_diff

def normalize_payload(obj, mask_keys=None):
    """
    Recursively mask/remove dynamic fields from a dict/list.
    mask_keys: set of keys to mask (e.g., {'timestamp', 'id'})
    """
    if mask_keys is None:
        mask_keys = {'timestamp', 'id'}
    if isinstance(obj, dict):
        return {
            k: (None if k in mask_keys else normalize_payload(v, mask_keys))
            for k, v in obj.items()
        }
    elif isinstance(obj, list):
        return [normalize_payload(i, mask_keys) for i in obj]
    else:
        return obj

def compare_json_bodies(r1, r2, mask_keys=None):
    """
    Compare r1 and r2 as JSON, with normalization. Returns diff lines or None if not JSON.
    """
    try:
        j1, j2 = r1.json(), r2.json()
    except Exception:
        return None  # not JSON
    j1n = normalize_payload(j1, mask_keys)
    j2n = normalize_payload(j2, mask_keys)
    s1 = json.dumps(j1n, sort_keys=True, indent=2)
    s2 = json.dumps(j2n, sort_keys=True, indent=2)
    diff = list(unified_diff(s1.splitlines(), s2.splitlines(), fromfile='resp1.json', tofile='resp2.json', lineterm=''))
    return diff

def compare_text_bodies(r1, r2):
    """
    Compare r1.text and r2.text as plain text. Returns diff lines.
    """
    s1 = r1.text.strip().splitlines()
    s2 = r2.text.strip().splitlines()
    diff = list(unified_diff(s1, s2, fromfile='resp1.txt', tofile='resp2.txt', lineterm=''))
    return diff
