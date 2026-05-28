"""
Waterway network acquisition.

Primary: OpenStreetMap via osmnx (real river/stream geometries).
Fallback: synthetic network representative of the Hawkesbury-Nepean catchment.
"""

import os

import numpy as np
import geopandas as gpd
from pyproj import Transformer
from shapely.geometry import LineString

from .config import BBox, DATA_DIR

# NSW metric CRS (GDA2020 / MGA Zone 56 — covers Sydney basin)
METRIC_CRS = "EPSG:7856"


def fetch_waterways(bbox: BBox) -> gpd.GeoDataFrame:
    """Return a GeoDataFrame of waterway linestrings from OSM or synthetic fallback."""
    cache = os.path.join(DATA_DIR, "waterways.gpkg")
    if os.path.exists(cache):
        print(f"  Loading cached waterways: {cache}")
        return gpd.read_file(cache)

    try:
        import osmnx as ox
        print("  Fetching waterways from OpenStreetMap…")
        tags = {"waterway": ["river", "stream", "canal", "drain", "creek"]}
        gdf = ox.features_from_bbox(
            bbox=(bbox.south, bbox.west, bbox.north, bbox.east), tags=tags
        )
        gdf = gdf[gdf.geometry.geom_type.isin(["LineString", "MultiLineString"])].copy()
        gdf = gdf[["waterway", "geometry"]].to_crs("EPSG:4326")
        print(f"  Fetched {len(gdf):,} waterway features")
    except Exception as exc:
        print(f"  OSM fetch failed ({exc}) — using synthetic network")
        gdf = _synthetic_waterways(bbox)

    os.makedirs(DATA_DIR, exist_ok=True)
    gdf.to_file(cache, driver="GPKG")
    return gdf


def _synthetic_waterways(bbox: BBox) -> gpd.GeoDataFrame:
    """Simulate a river + tributary network for the Hawkesbury-Nepean region."""
    t = np.linspace(0.0, 1.0, 80)
    lons_main = bbox.west + t * (bbox.east - bbox.west)
    lats_main = ((bbox.south + bbox.north) / 2) + 0.06 * np.sin(t * 4.5 * np.pi)
    main = LineString(zip(lons_main, lats_main))

    tribs = []
    for k in range(6):
        frac = 0.15 + k * 0.13
        tlon = np.linspace(bbox.west + frac * (bbox.east - bbox.west),
                           bbox.west + (frac + 0.12) * (bbox.east - bbox.west), 30)
        tlat = np.linspace(bbox.south + 0.04 + k * 0.04,
                           lats_main[int(frac * len(t))], 30)
        tribs.append(LineString(zip(tlon, tlat)))

    gdf = gpd.GeoDataFrame(
        {"waterway": ["river"] + ["stream"] * len(tribs),
         "geometry": [main] + tribs},
        crs="EPSG:4326",
    )
    print(f"  Synthetic network: {len(gdf)} features")
    return gdf


def waterways_to_points(gdf: gpd.GeoDataFrame, spacing_m: float = 150.0) -> np.ndarray:
    """
    Densify waterway lines into (lat, lng) sample points at ~spacing_m metre intervals.
    Returns an (M, 2) float32 array.
    """
    gdf_m = gdf.to_crs(METRIC_CRS)
    to_wgs84 = Transformer.from_crs(METRIC_CRS, "EPSG:4326", always_xy=True)

    xs, ys = [], []
    for geom in gdf_m.geometry:
        if geom is None or geom.is_empty:
            continue
        lines = list(geom.geoms) if geom.geom_type == "MultiLineString" else [geom]
        for line in lines:
            n = max(2, int(line.length / spacing_m) + 1)
            for i in range(n + 1):
                pt = line.interpolate(i * line.length / n)
                xs.append(pt.x)
                ys.append(pt.y)

    if not xs:
        return np.zeros((0, 2), dtype=np.float32)

    lons, lats = to_wgs84.transform(xs, ys)
    return np.column_stack([lats, lons]).astype(np.float32)
