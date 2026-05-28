import h3
import numpy as np
import geopandas as gpd
from shapely.geometry import Polygon
from typing import List, Tuple

from .config import BBox, H3_RESOLUTION


def bbox_to_h3_cells(bbox: BBox, resolution: int = H3_RESOLUTION) -> List[str]:
    """Fill a bounding box with H3 cells at the given resolution."""
    geojson_poly = {
        "type": "Polygon",
        "coordinates": [[
            [bbox.west,  bbox.south],
            [bbox.east,  bbox.south],
            [bbox.east,  bbox.north],
            [bbox.west,  bbox.north],
            [bbox.west,  bbox.south],
        ]]
    }
    return list(h3.geo_to_cells(geojson_poly, resolution))


def cell_to_polygon(cell: str) -> Polygon:
    """Convert an H3 cell to a closed Shapely polygon (lon, lat coordinates)."""
    boundary = h3.cell_to_boundary(cell)   # returns [(lat, lng), ...]
    coords = [(lng, lat) for lat, lng in boundary]
    coords.append(coords[0])
    return Polygon(coords)


def cell_boundary_coords(cell: str) -> List[List[float]]:
    """Return GeoJSON-ready [[lon, lat], ...] coordinates for an H3 cell."""
    boundary = h3.cell_to_boundary(cell)
    coords = [[lng, lat] for lat, lng in boundary]
    coords.append(coords[0])
    return coords


def cells_to_geodataframe(cells: List[str]) -> gpd.GeoDataFrame:
    """Build a GeoDataFrame with one row per H3 cell."""
    centroids = [h3.cell_to_latlng(c) for c in cells]
    geometries = [cell_to_polygon(c) for c in cells]

    return gpd.GeoDataFrame(
        {
            "geoid": cells,
            "lat":   [c[0] for c in centroids],
            "lng":   [c[1] for c in centroids],
            "geometry": geometries,
        },
        crs="EPSG:4326",
    )


def cell_centroids_array(cells: List[str]) -> np.ndarray:
    """Return (N, 2) array of (lat, lng) for the given cells."""
    return np.array([h3.cell_to_latlng(c) for c in cells])
