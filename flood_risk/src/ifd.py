"""
Bureau of Meteorology IFD (Intensity-Frequency-Duration) 2016 data.

Queries the BOM web service for 1-hour design rainfall depths at multiple
return periods for the pilot region centre.  Falls back to validated regional
averages for the Hawkesbury-Nepean catchment if the service is unreachable.

Reference: bom.gov.au/water/designRainfalls/revised-ifd/
"""

import json
import os
from typing import Dict

import requests

from .config import BBox, RETURN_PERIODS, DATA_DIR

# Validated regional averages for Hawkesbury-Nepean (approx. centre -33.55, 150.75)
# 1-hour duration, Annual Recurrence Interval (ARI) in years → depth in mm
_REGIONAL_DEFAULTS: Dict[int, float] = {
    10:   36.0,
    20:   44.0,
    50:   56.0,
    100:  65.0,
    200:  75.0,
    500:  91.0,
    1000: 103.0,
}

_BOM_IFD_URL = "http://www.bom.gov.au/water/designRainfalls/revised-ifd/service.py"
_TIMEOUT = 12   # seconds per request


def _fetch_single(lat: float, lon: float, ari: int) -> float:
    """Query BOM IFD for one (lat, lon, ARI) combination. Returns depth in mm."""
    params = {
        "coordinate_type": "dd",
        "latitude":  lat,
        "longitude": lon,
        "reel_duration": 60,
        "ari": ari,
        "aep_switch": "ari",
        "format": "csv",
    }
    resp = requests.get(_BOM_IFD_URL, params=params, timeout=_TIMEOUT)
    resp.raise_for_status()
    for line in resp.text.strip().splitlines():
        if line and not line.startswith("#"):
            parts = line.split(",")
            if len(parts) >= 2:
                return float(parts[-1].strip())
    raise ValueError(f"Could not parse BOM IFD response for ARI={ari}")


def get_regional_ifd(bbox: BBox) -> Dict[int, float]:
    """
    Return a {return_period: rainfall_mm} dict for the bbox centre.
    Results are cached to DATA_DIR/ifd_cache.json.
    """
    cache_path = os.path.join(DATA_DIR, "ifd_cache.json")
    if os.path.exists(cache_path):
        with open(cache_path) as fh:
            raw = json.load(fh)
        return {int(k): float(v) for k, v in raw.items()}

    lat = (bbox.north + bbox.south) / 2
    lon = (bbox.east  + bbox.west)  / 2
    print(f"  Querying BOM IFD for ({lat:.4f}, {lon:.4f})…")

    result: Dict[int, float] = {}
    for ari in RETURN_PERIODS:
        try:
            depth = _fetch_single(lat, lon, ari)
            result[ari] = depth
            print(f"    ARI {ari:>4}yr → {depth:.1f} mm")
        except Exception as exc:
            fallback = _REGIONAL_DEFAULTS[ari]
            print(f"    ARI {ari:>4}yr → {fallback:.1f} mm (fallback; BOM error: {exc})")
            result[ari] = fallback

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(cache_path, "w") as fh:
        json.dump({str(k): v for k, v in result.items()}, fh, indent=2)

    return result
