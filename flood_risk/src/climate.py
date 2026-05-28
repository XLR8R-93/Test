"""
Climate scenario scaling using NARCliM2.0 precipitation change factors.

NARCliM2.0 is the NSW Government's regional climate modelling project —
4 km resolution over SE Australia, driven by 5 CMIP6 GCMs and 2 RCMs.
Published scenarios: SSP1-2.6 (2024), SSP2-4.5 (2025), SSP3-7.0 (2024).
We map SSP3-7.0 values to SSP5-8.5 as the high-end warming scenario,
consistent with the Fathom dataset's scenario labelling.

Source: NSW Government AdaptNSW / NARCliM2.0 technical reports (2024–2025).
Values represent fractional change in extreme (95th-percentile) hourly
rainfall intensity relative to the 1986–2005 baseline for eastern NSW.
"""

from typing import Dict

from .config import RETURN_PERIODS

# Fractional change in extreme rainfall intensity vs baseline
# Central estimate (50th percentile of the 10-model ensemble)
_PRECIP_DELTA: Dict[str, Dict[str, float]] = {
    "current": {"2020": 0.00, "2050": 0.00, "2080": 0.00},
    "SSP1-2.6": {"2020": 0.02, "2050": 0.06, "2080": 0.07},
    "SSP2-4.5": {"2020": 0.02, "2050": 0.10, "2080": 0.15},
    "SSP5-8.5": {"2020": 0.03, "2050": 0.18, "2080": 0.30},
}

# Spread of the NARCliM2.0 ensemble (fractional of the central change)
# 17th percentile = drier/lower tail; 83rd = wetter/upper tail
_ENSEMBLE_SPREAD: Dict[int, float] = {17: -0.32, 50: 0.00, 83: +0.42}


def _ifd_scale_factor(scenario: str, time_horizon: str, percentile: int) -> float:
    """Multiplicative factor applied to current-scenario IFD depths."""
    if scenario == "current":
        return 1.0
    base_delta = _PRECIP_DELTA.get(scenario, {}).get(time_horizon, 0.0)
    spread = _ENSEMBLE_SPREAD.get(percentile, 0.0)
    # Spread modulates the magnitude of the change, not the baseline
    adjusted_delta = base_delta * (1.0 + spread)
    return 1.0 + adjusted_delta


def scale_ifd(
    base_ifd: Dict[int, float],
    scenario: str,
    time_horizon: str,
    percentile: int = 50,
) -> Dict[int, float]:
    """Return IFD values scaled for a given climate scenario / time horizon / percentile."""
    factor = _ifd_scale_factor(scenario, time_horizon, percentile)
    return {T: v * factor for T, v in base_ifd.items()}


def delta_risk(scenario_rr: int, current_rr: int) -> int:
    """Signed difference between scenario and current relative_risk."""
    return int(scenario_rr) - int(current_rr)
