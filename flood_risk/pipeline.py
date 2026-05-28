#!/usr/bin/env python3
"""
NSW Flood Risk Score Pipeline
==============================
Replicates the Fathom Flood Risk Scores (H3 Resolution) schema using
publicly available open data.

Data sources
------------
DEM          : CGIAR SRTM 90m (Geoscience Australia SRTM; ELVIS for 1m LiDAR)
Waterways    : OpenStreetMap via osmnx
Rainfall IFD : Bureau of Meteorology IFD 2016 web service
Climate      : NARCliM2.0 precipitation deltas (NSW Government, 2024–2025)

Output
------
output/
  nsw_flood_risk_<scenario>_<horizon>_p<pct>.geojson   — per-slice files
  nsw_flood_risk_combined.geojson                       — all features merged
  pipeline_stats.json                                   — run metadata
"""

import json
import os
import sys
import time
from typing import Dict, List, Optional

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from src.config import (
    CLIMATE_SCENARIOS, DATA_DIR, DO_DATE, FLOOD_TYPES,
    H3_RESOLUTION, OUTPUT_DIR, PERCENTILES, PILOT_BBOX,
    RETURN_PERIODS, TIME_HORIZONS,
)
from src.climate import delta_risk as calc_delta, scale_ifd
from src.dem import get_dem
from src.grid import bbox_to_h3_cells, cell_boundary_coords, cell_centroids_array
from src.hand import compute_halm, compute_hand
from src.ifd import get_regional_ifd
from src.output import make_feature, write_geojson
from src.risk_engine import compute_risk_batch
from src.waterways import fetch_waterways, waterways_to_points


def run() -> None:
    t0 = time.time()
    print("=" * 64)
    print("NSW Flood Risk Score Pipeline")
    print(f"Region      : {PILOT_BBOX}")
    print(f"H3 res      : {H3_RESOLUTION}")
    print(f"Scenarios   : {CLIMATE_SCENARIOS}")
    print(f"Horizons    : {TIME_HORIZONS}")
    print(f"Flood types : {FLOOD_TYPES}")
    print(f"Percentiles : {PERCENTILES}")
    print("=" * 64)

    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── 1. H3 grid ────────────────────────────────────────────────
    print("\n[1/7] Generating H3 grid…")
    cells = bbox_to_h3_cells(PILOT_BBOX, H3_RESOLUTION)
    print(f"  {len(cells):,} cells at H3 resolution {H3_RESOLUTION}")
    centroids = cell_centroids_array(cells)   # (N, 2) lat/lng

    # Pre-build geometry for every cell (avoids repeated h3 calls)
    boundaries = {c: cell_boundary_coords(c) for c in cells}

    # ── 2. DEM ────────────────────────────────────────────────────
    print("\n[2/7] Acquiring DEM…")
    dem_path = get_dem(PILOT_BBOX)

    # ── 3. Waterways ──────────────────────────────────────────────
    print("\n[3/7] Fetching waterway network…")
    waterways_gdf = fetch_waterways(PILOT_BBOX)
    waterway_pts  = waterways_to_points(waterways_gdf)
    print(f"  {len(waterway_pts):,} waterway sample points")

    # ── 4. Terrain indices ────────────────────────────────────────
    print("\n[4/7] Computing terrain indices…")
    hand, cell_elevs, dist_m = compute_hand(centroids, waterway_pts, dem_path)
    halm = compute_halm(centroids, cell_elevs, window_m=600.0)

    terrain = {"FLUV": hand, "PLUV": halm}

    # ── 5. IFD ────────────────────────────────────────────────────
    print("\n[5/7] Acquiring BOM IFD data…")
    base_ifd = get_regional_ifd(PILOT_BBOX)

    # ── 6. Risk scoring ───────────────────────────────────────────
    print("\n[6/7] Computing risk scores…")

    # Pass 1: current-scenario baseline (needed for delta_risk)
    current_rr: Dict[tuple, int] = {}
    for ft in FLOOD_TYPES:
        for pct in PERCENTILES:
            ifd = scale_ifd(base_ifd, "current", "2020", pct)
            rr_arr, _ = compute_risk_batch(terrain[ft], ifd, pct)
            for i, rr in enumerate(rr_arr):
                current_rr[(i, ft, pct)] = int(rr)

    # Pass 2: all combinations → features
    all_features: List[dict] = []
    slice_features: Dict[str, List[dict]] = {}

    for scenario in CLIMATE_SCENARIOS:
        for horizon in TIME_HORIZONS:
            for ft in FLOOD_TYPES:
                for pct in PERCENTILES:
                    label = f"{scenario}_{horizon}_{ft}_p{pct}"
                    print(f"  {label}")

                    ifd = scale_ifd(base_ifd, scenario, horizon, pct)
                    rr_arr, rc_arr = compute_risk_batch(terrain[ft], ifd, pct)

                    slice_feats: List[dict] = []
                    for i, cell in enumerate(cells):
                        rr = int(rr_arr[i])
                        rc = int(rc_arr[i])
                        dr: Optional[int] = (
                            None if scenario == "current"
                            else calc_delta(rr, current_rr[(i, ft, pct)])
                        )
                        feat = make_feature(
                            geoid=cell,
                            boundary_coords=boundaries[cell],
                            do_date=DO_DATE,
                            climate_scenario=scenario,
                            time_horizon=horizon,
                            type_of_flood=ft,
                            percentile=pct,
                            relative_risk=rr,
                            delta_risk=dr,
                            risk_category=rc,
                        )
                        slice_feats.append(feat)

                    slice_key = f"{scenario.replace('.','_')}_{horizon}_{ft}_p{pct}"
                    slice_features[slice_key] = slice_feats
                    all_features.extend(slice_feats)

    # ── 7. Write output ───────────────────────────────────────────
    print("\n[7/7] Writing GeoJSON output…")

    # Per-slice files (manageable size for GIS tools)
    for key, feats in slice_features.items():
        write_geojson(feats, f"nsw_flood_risk_{key}.geojson")

    # Combined file
    write_geojson(all_features, "nsw_flood_risk_combined.geojson")

    # Summary statistics
    _write_stats(cells, hand, halm, current_rr, slice_features, t0)

    elapsed = time.time() - t0
    print(f"\n{'=' * 64}")
    print(f"Pipeline complete in {elapsed:.1f}s")
    print(f"  {len(cells):,} cells × {len(CLIMATE_SCENARIOS)} scenarios × "
          f"{len(TIME_HORIZONS)} horizons × {len(FLOOD_TYPES)} flood types × "
          f"{len(PERCENTILES)} percentiles")
    print(f"  Total features : {len(all_features):,}")
    print(f"  Output dir     : {os.path.abspath(OUTPUT_DIR)}/")
    print("=" * 64)


def _write_stats(cells, hand, halm, current_rr, slice_features, t0):
    """Write pipeline_stats.json to OUTPUT_DIR."""
    from src.config import PILOT_BBOX

    # Collect mean relative_risk per slice for summary
    slice_summary = {}
    for key, feats in slice_features.items():
        rrs = [f["properties"]["relative_risk"] for f in feats]
        cats = [f["properties"]["risk_category"] for f in feats]
        slice_summary[key] = {
            "mean_relative_risk": round(float(np.mean(rrs)), 1),
            "pct_in_floodplain": round(float(np.mean(np.array(cats) >= 6)) * 100, 1),
            "pct_high_risk": round(float(np.mean(np.array(cats) >= 50)) * 100, 1),
        }

    stats = {
        "run_date":       DO_DATE,
        "elapsed_s":      round(time.time() - t0, 1),
        "region":         {"south": PILOT_BBOX.south, "west": PILOT_BBOX.west,
                           "north": PILOT_BBOX.north, "east": PILOT_BBOX.east},
        "h3_resolution":  H3_RESOLUTION,
        "n_cells":        len(cells),
        "hand_stats":     {
            "min_m":  round(float(hand.min()), 2),
            "max_m":  round(float(hand.max()), 2),
            "mean_m": round(float(hand.mean()), 2),
            "pct_below_0": round(float(np.mean(hand < 0)) * 100, 1),
        },
        "halm_stats":     {
            "min_m":  round(float(halm.min()), 2),
            "max_m":  round(float(halm.max()), 2),
            "mean_m": round(float(halm.mean()), 2),
            "pct_below_1m": round(float(np.mean(halm < 1)) * 100, 1),
        },
        "slice_summary":  slice_summary,
    }

    path = os.path.join(OUTPUT_DIR, "pipeline_stats.json")
    with open(path, "w") as fh:
        json.dump(stats, fh, indent=2)
    print(f"  Stats → {path}")


if __name__ == "__main__":
    run()
