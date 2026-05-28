"""
Flood risk scoring engine.

Converts terrain indices (HAND / HALM) and IFD rainfall depths into
the three Fathom output metrics:
  - relative_risk  : 0–1,000,000  (AAL proxy for $1M insured value)
  - risk_category  : 0–100        (0 = outside 1000-yr plain; 6–100 = risk band)
  - delta_risk     : signed int   (scenario relative_risk − current relative_risk)
"""

import numpy as np
from typing import Dict, Tuple

from .config import RETURN_PERIODS, PERCENTILES

# ──────────────────────────────────────────────────────────────────────────────
# Flood-height model
# H(T) = H_base × (T / T_ref)^α  where T is the return period in years.
# Calibrated to typical NSW river flood behaviour (Hawkesbury-Nepean reach data).
# ──────────────────────────────────────────────────────────────────────────────
_H_BASE  = 2.8   # metres above bank at the 2-yr ARI event
_T_REF   = 2.0   # reference return period (approx. mean annual flood)
_ALPHA   = 0.34  # power-law exponent (log-Pearson III fit, NSW rivers)
_REF_IFD = 65.0  # 1-hr 100-yr design rainfall for Hawkesbury (mm) — normaliser

# Simplified residential depth-damage curve (fraction of insured value lost)
# Source: NSW Floodplain Management guidelines, Table 3.1
_DMG_DEPTHS  = [0.0, 0.1, 0.3, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0]
_DMG_FACTORS = [0.0, 0.04, 0.10, 0.18, 0.35, 0.50, 0.65, 0.80, 0.93, 1.00]

INSURED_VALUE = 1_000_000   # per Fathom methodology ($1M uniform exposure)

# Percentile uncertainty multipliers derived from NARCliM2.0 10-model ensemble spread
_PCTILE_FACTORS: Dict[int, float] = {17: 0.72, 50: 1.00, 83: 1.38}


def _flood_height(T: int, ifd_mm: float) -> float:
    """
    Estimate maximum flood height (m above bank) for return period T years.
    Uses a simplified power-law scaled by the IFD rainfall intensity ratio.
    The rainfall→discharge→stage relationship follows Manning's law (Q ∝ i, H ∝ Q^0.6).
    """
    rain_factor = (ifd_mm / _REF_IFD) ** 0.6
    return _H_BASE * (T / _T_REF) ** _ALPHA * rain_factor


def _depth_damage(depth_m: float) -> float:
    """Interpolate damage fraction from the depth-damage curve."""
    if depth_m <= 0.0:
        return 0.0
    return float(np.interp(depth_m, _DMG_DEPTHS, _DMG_FACTORS))


def _aal(hand: float, ifd: Dict[int, float]) -> float:
    """
    Annual Average Loss for a single cell using trapezoidal AEP integration.

    AAL = ∫ Loss(p) dp  ≈  Σ ΔP_i × avg_loss(T_i, T_{i+1})
    """
    T_sorted = sorted(RETURN_PERIODS)
    aep = [1.0 / T for T in T_sorted]
    depths = [max(0.0, _flood_height(T, ifd[T]) - hand) for T in T_sorted]

    aal = 0.0
    for i in range(len(T_sorted) - 1):
        d_aep = aep[i] - aep[i + 1]
        avg_dmg = (_depth_damage(depths[i]) + _depth_damage(depths[i + 1])) / 2.0
        aal += d_aep * avg_dmg * INSURED_VALUE

    # Tail contribution: AEP of 1/1000 down to 0
    aal += aep[-1] * _depth_damage(depths[-1]) * INSURED_VALUE * 0.5
    return aal


def _aal_to_relative_risk(aal: float) -> int:
    """
    Map AAL → 0–1,000,000 using a log10 transform so the full scale is used.
    Maximum AAL is bounded by INSURED_VALUE; log10(1M+1) ≈ 6.
    """
    if aal <= 0.0:
        return 0
    log_val = np.log10(aal + 1.0)
    log_max = np.log10(INSURED_VALUE + 1.0)
    return min(1_000_000, int(round(log_val / log_max * 1_000_000)))


def _risk_category(hand: float, relative_risk: int, ifd: Dict[int, float]) -> int:
    """
    0   = not proximate to 1000-year floodplain
    1–5 = outside but within 2 m of the 1000-yr flood level
    6–100 = linearly mapped from relative_risk within the floodplain
    """
    h_1000 = _flood_height(1000, ifd[1000])
    buffer = 2.0   # metres beyond floodplain edge

    if hand > h_1000 + buffer:
        return 0

    if hand > h_1000:
        proximity = (h_1000 + buffer - hand) / buffer   # 0→1 as hand approaches h_1000
        return max(1, min(5, int(round(proximity * 5))))

    # Inside 1000-yr floodplain
    if relative_risk <= 0:
        return 6
    return max(6, min(100, int(round(6 + (relative_risk / 1_000_000) * 94))))


def compute_risk_batch(
    terrain_index: np.ndarray,
    ifd: Dict[int, float],
    percentile: int = 50,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute relative_risk and risk_category for a batch of cells.

    terrain_index : HAND (fluvial) or HALM (pluvial), metres
    ifd           : {return_period: rainfall_mm}
    percentile    : 17 / 50 / 83

    Returns (relative_risk int32, risk_category int32), both shape (N,).
    """
    pct_factor = _PCTILE_FACTORS.get(percentile, 1.0)
    n = len(terrain_index)
    rr_out = np.empty(n, dtype=np.int32)
    rc_out = np.empty(n, dtype=np.int32)

    for i, h in enumerate(terrain_index):
        aal = _aal(float(h), ifd)
        rr  = min(1_000_000, int(round(_aal_to_relative_risk(aal) * pct_factor)))
        rc  = _risk_category(float(h), rr, ifd)
        rr_out[i] = rr
        rc_out[i] = rc

    return rr_out, rc_out
