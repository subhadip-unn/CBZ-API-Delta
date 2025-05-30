# geo_utils.py
# Utility for geo/country testing

def get_geos():
    """
    Returns a list of (geo_name, geo_headers) tuples.
    geo_headers is a dict of headers to apply for that region.
    """
    return [
        ("IN",  {"cb-loc": "IN",  "accept-language": "en-IN;q=1.0"}),
        ("US",  {"cb-loc": "US",  "accept-language": "en-US;q=1.0"}),
        ("CA",  {"cb-loc": "CA",  "accept-language": "en-CA;q=1.0"}),
        ("MENA",{"cb-loc": "AE",  "accept-language": "en-AE;q=1.0"}),
    ]

def apply_geo_headers(base_headers, geo_headers):
    """
    Returns a copy of base_headers with geo headers (cb-loc, accept-language) overridden.
    """
    headers = base_headers.copy()
    for k, v in geo_headers.items():
        headers[k] = v
    return headers
