"""
GeoJSON output writer.

Each H3 hexagon becomes a GeoJSON Feature whose geometry is the hexagonal polygon
and whose properties exactly mirror the Fathom schema:
  geoid, do_date, climate_scenario, time_horizon, type_of_flood,
  percentile, relative_risk, delta_risk, risk_category
"""

import json
import os
from typing import Any, Dict, List, Optional

from .config import OUTPUT_DIR


def write_geojson(features: List[Dict[str, Any]], filename: str) -> str:
    """Write a GeoJSON FeatureCollection to OUTPUT_DIR/<filename>."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    collection = {"type": "FeatureCollection", "features": features}
    with open(path, "w") as fh:
        json.dump(collection, fh, separators=(",", ":"))
    size_mb = os.path.getsize(path) / 1_048_576
    print(f"  Wrote {len(features):,} features → {path}  ({size_mb:.1f} MB)")
    return path


def make_feature(
    geoid: str,
    boundary_coords: List[List[float]],
    do_date: str,
    climate_scenario: str,
    time_horizon: str,
    type_of_flood: str,
    percentile: int,
    relative_risk: int,
    delta_risk: Optional[int],
    risk_category: int,
) -> Dict[str, Any]:
    """Build a single GeoJSON Feature matching the Fathom schema."""
    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [boundary_coords],
        },
        "properties": {
            "geoid":            geoid,
            "do_date":          do_date,
            "climate_scenario": climate_scenario,
            "time_horizon":     time_horizon,
            "type_of_flood":    type_of_flood,
            "percentile":       percentile,
            "relative_risk":    relative_risk,
            "delta_risk":       delta_risk,
            "risk_category":    risk_category,
        },
    }
