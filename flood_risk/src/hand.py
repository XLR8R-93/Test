"""
Terrain indices used as flood hazard proxies.

FLUV  → HAND (Height Above Nearest Drainage)
         Cells close to and low relative to rivers have high fluvial risk.

PLUV  → HALM (Height Above Local Minimum)
         Cells in topographic depressions accumulate surface runoff.
"""

import numpy as np
from scipy.spatial import cKDTree
from typing import List, Tuple

from .dem import sample_elevations


def _latlon_to_xy(lats: np.ndarray, lons: np.ndarray) -> np.ndarray:
    """Equirectangular projection to approximate metres (valid for small regions)."""
    lat_ref = np.radians(np.mean(lats))
    x = lons * np.cos(lat_ref) * 111_320.0
    y = lats * 111_320.0
    return np.column_stack([x, y])


def compute_hand(
    centroids: np.ndarray,
    waterway_points: np.ndarray,
    dem_path: str,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Height Above Nearest Drainage for each cell centroid.

    Parameters
    ----------
    centroids        : (N, 2) array of (lat, lng)
    waterway_points  : (M, 2) array of (lat, lng) — densified waterway samples
    dem_path         : path to the DEM GeoTIFF

    Returns
    -------
    hand             : (N,) float32 — metres above nearest drainage
    cell_elevations  : (N,) float32
    dist_to_water_m  : (N,) float32 — planar distance in metres
    """
    print("  Sampling DEM at cell centroids…")
    cell_elev = sample_elevations(dem_path, [(r[0], r[1]) for r in centroids])

    print(f"  Sampling DEM at {len(waterway_points):,} waterway points…")
    water_elev = sample_elevations(dem_path, [(r[0], r[1]) for r in waterway_points])

    cell_xy = _latlon_to_xy(centroids[:, 0], centroids[:, 1])
    water_xy = _latlon_to_xy(waterway_points[:, 0], waterway_points[:, 1])

    print("  Building KD-tree and querying nearest drainage…")
    tree = cKDTree(water_xy)
    dist_m, idx = tree.query(cell_xy, k=1, workers=-1)

    nearest_elev = water_elev[idx]
    hand = (cell_elev - nearest_elev).astype(np.float32)
    hand = np.clip(hand, -10.0, None)   # floor at -10m (active channel bed)

    print(f"  HAND  min={hand.min():.1f}m  max={hand.max():.1f}m  mean={hand.mean():.1f}m")
    return hand, cell_elev.astype(np.float32), dist_m.astype(np.float32)


def compute_halm(
    centroids: np.ndarray,
    cell_elevations: np.ndarray,
    window_m: float = 600.0,
) -> np.ndarray:
    """
    Height Above Local Minimum — proxy for surface-water ponding (pluvial risk).

    For each cell, HALM = elevation - min(elevation of cells within window_m).
    Low HALM → cell sits in a topographic depression → high pluvial risk.
    """
    print("  Computing HALM (pluvial terrain index)…")
    xy = _latlon_to_xy(centroids[:, 0], centroids[:, 1])
    tree = cKDTree(xy)

    halm = np.zeros(len(cell_elevations), dtype=np.float32)
    for i, (pt, elev) in enumerate(zip(xy, cell_elevations)):
        neighbours = tree.query_ball_point(pt, r=window_m)
        local_min = float(cell_elevations[neighbours].min())
        halm[i] = max(0.0, float(elev) - local_min)

    print(f"  HALM  min={halm.min():.1f}m  max={halm.max():.1f}m  mean={halm.mean():.1f}m")
    return halm
