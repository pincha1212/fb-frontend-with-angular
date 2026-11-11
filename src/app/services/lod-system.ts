/**
 * Level of Detail (LOD) & Update Throttling System
 * Provides distance-based geometric complexity and animation/physics update frequency
 * reduction for space stations and background entities in Three.js scenes.
 */

export enum LodLevel {
  HIGH = 0,    // Full detailed procedural geometry & 60Hz updates
  MEDIUM = 1,  // Streamlined geometry & 30Hz updates (every 2nd frame)
  LOW = 2,     // Ultra-light proxy / beacon silhouette & 15Hz updates (every 4th frame)
  CULLED = 3   // Outside active simulation envelope (update skipped)
}

export type LodProfile = 'balanced' | 'performance' | 'ultra' | 'off';

export interface LodThresholds {
  medium: number; // Transition distance from HIGH to MEDIUM
  low: number;    // Transition distance from MEDIUM to LOW
  cull: number;   // Transition distance to CULLED
}

export interface LodConfig {
  enabled: boolean;
  profile: LodProfile;
  thresholds: LodThresholds;
}

export interface LodMetrics {
  totalEntities: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  culledCount: number;
  estimatedComplexitySavingsPercent: number;
}

export const LOD_PROFILES: Record<LodProfile, LodThresholds> = {
  performance: {
    medium: 38,
    low: 85,
    cull: 300
  },
  balanced: {
    medium: 55,
    low: 130,
    cull: 360
  },
  ultra: {
    medium: 85,
    low: 185,
    cull: 420
  },
  off: {
    medium: Infinity,
    low: Infinity,
    cull: Infinity
  }
};

/**
 * Returns default thresholds for a given LOD profile
 */
export function getLodThresholds(profile: LodProfile): LodThresholds {
  return { ...LOD_PROFILES[profile] };
}

/**
 * Euclidean 3D distance between two points
 */
export function calculateDistance(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Squared 3D distance between two points (faster for comparisons)
 */
export function calculateDistanceSq(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Determines the LOD level based on distance and thresholds
 */
export function determineLodLevel(
  distance: number,
  thresholds: LodThresholds,
  enabled = true
): LodLevel {
  if (!enabled) return LodLevel.HIGH;
  if (distance >= thresholds.cull) return LodLevel.CULLED;
  if (distance >= thresholds.low) return LodLevel.LOW;
  if (distance >= thresholds.medium) return LodLevel.MEDIUM;
  return LodLevel.HIGH;
}

/**
 * Checks whether an entity should run its animation/physics update on the current frame
 * based on its LOD level and an optional entity offset to interleave execution across frames.
 */
export function shouldUpdateEntity(
  lodLevel: LodLevel,
  frameIndex: number,
  enabled = true,
  entityOffset = 0
): boolean {
  if (!enabled) return true;

  switch (lodLevel) {
    case LodLevel.HIGH:
      // High detail updates every single frame (60Hz)
      return true;

    case LodLevel.MEDIUM:
      // Medium detail updates every 2nd frame (30Hz), interleaved by offset
      return (frameIndex + entityOffset) % 2 === 0;

    case LodLevel.LOW:
      // Low detail updates every 4th frame (15Hz), interleaved by offset
      return (frameIndex + entityOffset) % 4 === 0;

    case LodLevel.CULLED:
      // Culled entities do not update
      return false;

    default:
      return true;
  }
}

/**
 * Delta multiplier so that throttled animations maintain their apparent physical velocity
 * rather than playing at 1/2 or 1/4 speed.
 */
export function getUpdateDeltaMultiplier(lodLevel: LodLevel, enabled = true): number {
  if (!enabled) return 1.0;

  switch (lodLevel) {
    case LodLevel.HIGH:
      return 1.0;
    case LodLevel.MEDIUM:
      return 2.0;
    case LodLevel.LOW:
      return 4.0;
    case LodLevel.CULLED:
      return 0.0;
    default:
      return 1.0;
  }
}

/**
 * Aggregates LOD metrics for a collection of entity distances
 */
export function calculateLODMetrics(
  distances: number[],
  thresholds: LodThresholds,
  enabled = true
): LodMetrics {
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let culledCount = 0;

  for (const dist of distances) {
    const level = determineLodLevel(dist, thresholds, enabled);
    switch (level) {
      case LodLevel.HIGH:
        highCount++;
        break;
      case LodLevel.MEDIUM:
        mediumCount++;
        break;
      case LodLevel.LOW:
        lowCount++;
        break;
      case LodLevel.CULLED:
        culledCount++;
        break;
    }
  }

  const totalEntities = distances.length;
  // Estimated geometry/compute complexity relative weights:
  // HIGH: 1.0 (100%), MEDIUM: 0.35 (35%), LOW: 0.12 (12%), CULLED: 0 (0%)
  const baselineComplexity = totalEntities * 1.0;
  const currentComplexity =
    highCount * 1.0 + mediumCount * 0.35 + lowCount * 0.12 + culledCount * 0.0;

  const savings = baselineComplexity > 0
    ? Math.max(0, Math.round(((baselineComplexity - currentComplexity) / baselineComplexity) * 100))
    : 0;

  return {
    totalEntities,
    highCount,
    mediumCount,
    lowCount,
    culledCount,
    estimatedComplexitySavingsPercent: savings
  };
}
