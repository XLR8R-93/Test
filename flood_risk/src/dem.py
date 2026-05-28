"""
DEM acquisition and sampling.

Primary source: CGIAR SRTM 90m tiles (free, no auth required).
Falls back to a physically plausible synthetic DEM if network is unavailable.
For production, swap in the 1m NSW LiDAR data from ELVIS (elevation.fsdf.org.au).
"""

import io
import os
import zipfile

import numpy as np
import requests
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import calculate_default_transform, reproject
from typing import List, Tuple

from .config import BBox, DATA_DIR

SRTM_TIMEOUT = 60  # seconds


def _srtm_tile_id(bbox: BBox) -> Tuple[int, int]:
    """Calculate the CGIAR SRTM 5°×5° tile index for the bbox centre."""
    cx = (bbox.west + bbox.east) / 2
    cy = (bbox.south + bbox.north) / 2
    col = int((cx + 180) / 5) + 1
    row = int((60 - cy) / 5) + 1
    return col, row


def _download_srtm(bbox: BBox, out_path: str) -> bool:
    """Attempt to download CGIAR SRTM tile and clip to bbox. Returns True on success."""
    col, row = _srtm_tile_id(bbox)
    url = (
        f"https://srtm.csi.cgiar.org/wp-content/uploads/files/srtm_5x5/TIFF/"
        f"srtm_{col:02d}_{row:02d}.zip"
    )
    print(f"  Downloading SRTM tile ({col:02d},{row:02d}) from CGIAR…")
    try:
        resp = requests.get(url, timeout=SRTM_TIMEOUT)
        resp.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            tifs = [n for n in zf.namelist() if n.lower().endswith(".tif")]
            if not tifs:
                return False
            raw_path = os.path.join(DATA_DIR, "srtm_raw.tif")
            zf.extract(tifs[0], DATA_DIR)
            extracted = os.path.join(DATA_DIR, tifs[0])
            os.rename(extracted, raw_path)

        # Clip to bbox
        _clip_raster(raw_path, bbox, out_path)
        os.remove(raw_path)
        return True
    except Exception as exc:
        print(f"  SRTM download failed: {exc}")
        return False


def _clip_raster(src_path: str, bbox: BBox, out_path: str):
    """Clip a raster to the bounding box and write to out_path."""
    from rasterio.mask import mask as rio_mask
    from shapely.geometry import box, mapping

    clip_geom = [mapping(box(bbox.west, bbox.south, bbox.east, bbox.north))]
    with rasterio.open(src_path) as src:
        out_image, out_transform = rio_mask(src, clip_geom, crop=True)
        out_meta = src.meta.copy()
        out_meta.update({
            "height": out_image.shape[1],
            "width":  out_image.shape[2],
            "transform": out_transform,
        })
    with rasterio.open(out_path, "w", **out_meta) as dst:
        dst.write(out_image)


def _create_synthetic_dem(bbox: BBox, out_path: str):
    """
    Generate a physically plausible synthetic DEM for the Hawkesbury-Nepean region.
    The surface mimics a meandering river valley with flood plains and ridge lines —
    representative of the actual terrain northwest of Sydney.
    """
    print("  Building synthetic DEM (real SRTM unavailable)…")
    nrows, ncols = 600, 600
    transform = from_bounds(bbox.west, bbox.south, bbox.east, bbox.north, ncols, nrows)

    x = np.linspace(0.0, 1.0, ncols)
    y = np.linspace(0.0, 1.0, nrows)
    XX, YY = np.meshgrid(x, y)

    # Main river meanders west→east across the middle of the domain
    river_centre_y = 0.5 + 0.08 * np.sin(XX * 5 * np.pi)

    # Secondary tributary from south-west
    trib_y = 0.25 + 0.06 * np.sin(XX * 3 * np.pi)
    dist_main = np.abs(YY - river_centre_y)
    dist_trib = np.abs(YY - trib_y)
    dist_combined = np.minimum(dist_main, dist_trib)

    # Elevation: flat flood plain close to channels, rising to ridges
    rng = np.random.RandomState(42)
    base_elev = 8.0 + 280.0 * (dist_combined ** 1.4)
    noise = rng.normal(0, 4, (nrows, ncols))
    elev = np.clip(base_elev + noise, 3.0, 500.0).astype(np.float32)

    with rasterio.open(
        out_path, "w", driver="GTiff",
        height=nrows, width=ncols, count=1,
        dtype=elev.dtype,
        crs="EPSG:4326",
        transform=transform,
        nodata=-9999.0,
    ) as dst:
        dst.write(elev, 1)
    print(f"  Synthetic DEM written to {out_path}")


def get_dem(bbox: BBox) -> str:
    """Return path to a DEM GeoTIFF for the bbox, downloading if necessary."""
    os.makedirs(DATA_DIR, exist_ok=True)
    out_path = os.path.join(DATA_DIR, "dem.tif")

    if os.path.exists(out_path):
        print(f"  Using cached DEM: {out_path}")
        return out_path

    success = _download_srtm(bbox, out_path)
    if not success:
        _create_synthetic_dem(bbox, out_path)

    return out_path


def sample_elevations(dem_path: str, coords: List[Tuple[float, float]]) -> np.ndarray:
    """
    Sample elevation values at (lat, lng) pairs.
    Returns a float32 array; nodata and out-of-range values become 0.
    """
    elevations = np.zeros(len(coords), dtype=np.float32)
    with rasterio.open(dem_path) as src:
        data = src.read(1)
        nodata = src.nodata
        for i, (lat, lng) in enumerate(coords):
            try:
                row, col = src.index(lng, lat)
                row = int(np.clip(row, 0, src.height - 1))
                col = int(np.clip(col, 0, src.width - 1))
                val = float(data[row, col])
                if nodata is not None and val == nodata:
                    val = 0.0
                elevations[i] = max(val, 0.0)
            except Exception:
                elevations[i] = 0.0
    return elevations
