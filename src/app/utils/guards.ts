/**
 * Numeric guardrails for simulation state.
 * Ensures values stay within valid ranges (0-100 for percentages) and prevents NaN/Infinity.
 */

export const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min; // Default to min on error
  return Math.min(Math.max(value, min), max);
};

export const clamp01 = (value: number): number => clamp(value, 0, 1);

export const clamp0_100 = (value: number): number => clamp(value, 0, 100);

export const isFiniteNumber = (value: any): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value);
};

export const safeBudget = (value: number): number => clamp0_100(value);

export const safeTrust = (value: number): number => clamp0_100(value);

/**
 * Returns a lock reason string if the formation is gated, or null if allowed.
 * Single source of truth for formation gating logic.
 */
export const getFormationLockReason = (
  formation: 'idle' | 'search' | 'shield' | 'strike',
  trust: number,
  budgets: { latency: number; bandwidth: number; energy: number; attention: number }
): string | null => {
  if (formation === 'strike') {
    if (trust < 70) return "Insufficient Trust (<70%) for Kill Web";
    if (budgets.energy < 25) return "Insufficient Energy (<25%) for Kill Web";
    if (budgets.attention < 30) return "Insufficient Attention (<30%) for Kill Web";
  }
  if (formation === 'shield') {
    if (trust < 50) return "Insufficient Trust (<50%) for A2AD Wall";
    if (budgets.energy < 20) return "Insufficient Energy (<20%) for A2AD Wall";
  }
  if (formation === 'search') {
    if (budgets.bandwidth < 20) return "Insufficient Bandwidth (<20%) for Sensing Grid";
  }
  return null;
};
