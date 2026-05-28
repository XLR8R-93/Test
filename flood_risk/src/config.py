from dataclasses import dataclass


@dataclass
class BBox:
    south: float
    west: float
    north: float
    east: float


# Pilot region: Hawkesbury-Nepean flood plain (northwest of Sydney)
# One of the most flood-prone and best-studied catchments in Australia
PILOT_BBOX = BBox(south=-33.80, west=150.50, north=-33.30, east=151.00)

# H3 resolution 9 → ~174m edge length, ~0.1 km² per cell
# Upgradeable to resolution 11 (~24m) for production
H3_RESOLUTION = 9

# Return periods (years) used for AAL integration
RETURN_PERIODS = [10, 20, 50, 100, 200, 500, 1000]

# IPCC "likely" range (66%): 17th–83rd percentile from CMIP6 ensemble
PERCENTILES = [17, 50, 83]

# Climate scenarios matching Fathom / NARCliM2.0 naming
CLIMATE_SCENARIOS = ["current", "SSP1-2.6", "SSP2-4.5", "SSP5-8.5"]

# 21-year centred time horizons (matches Fathom methodology)
TIME_HORIZONS = ["2020", "2050", "2080"]

# Flood types in scope for this pilot
FLOOD_TYPES = ["FLUV", "PLUV"]

DO_DATE = "2024-01-01"

DATA_DIR = "data"
OUTPUT_DIR = "output"
