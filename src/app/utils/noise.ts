/**
 * Seeded noise and smoothing functions for coherent jitter effects.
 * Replaces Math.random() for visual instability to prevent "teleporting" artifacts.
 */

// Simple LCG seeded random generator
class LCG {
    seed: number;
    constructor(seed: number) {
        this.seed = seed;
    }
    
    // Returns 0..1
    next(): number {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }
}

const generators = new Map<number, LCG>();

export const getSeededRandom = (id: number): number => {
    if (!generators.has(id)) {
        generators.set(id, new LCG(id));
    }
    return generators.get(id)!.next();
};

// Linear interpolation
export const lerp = (start: number, end: number, t: number): number => {
    return start * (1 - t) + end * t;
};

// 1D Perlin-like noise (simplified for jitter)
// We retain a "target" offset for each ID and lerp towards it.
// When close, we pick a new target.
const jitterState = new Map<number, { current: number; target: number }>();

export const getSmoothedJitter = (id: number, amplitude: number, speed: number = 0.1): number => {
    if (!jitterState.has(id)) {
        jitterState.set(id, { current: 0, target: (Math.random() - 0.5) * 2 * amplitude });
    }

    const state = jitterState.get(id)!;
    
    // Lerp towards target
    state.current = lerp(state.current, state.target, speed);
    
    // If close to target, pick new target
    if (Math.abs(state.current - state.target) < 0.1 * (amplitude || 1)) {
        state.target = (Math.random() - 0.5) * 2 * amplitude;
    }

    return state.current;
};

// Helper for X/Y jitter
export const getSmoothedVec2 = (id: number, amplitude: number, speed: number = 0.1): { x: number, y: number } => {
    // Use prime multipliers for IDs to avoid correlation between X and Y
    const x = getSmoothedJitter(id * 73856093, amplitude, speed);
    const y = getSmoothedJitter(id * 19349663, amplitude, speed);
    return { x, y };
};
