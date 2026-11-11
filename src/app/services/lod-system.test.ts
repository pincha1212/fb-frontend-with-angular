import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LodLevel,
  getLodThresholds,
  calculateDistance,
  calculateDistanceSq,
  determineLodLevel,
  shouldUpdateEntity,
  getUpdateDeltaMultiplier,
  calculateLODMetrics,
  LOD_PROFILES
} from './lod-system';

test('LOD Profiles provide correct monotonic thresholds', () => {
  for (const profile of ['performance', 'balanced', 'ultra'] as const) {
    const t = getLodThresholds(profile);
    assert.ok(t.medium > 0, `${profile} medium threshold should be positive`);
    assert.ok(t.low > t.medium, `${profile} low threshold should be greater than medium`);
    assert.ok(t.cull > t.low, `${profile} cull threshold should be greater than low`);
  }

  const off = getLodThresholds('off');
  assert.equal(off.medium, Infinity);
  assert.equal(off.low, Infinity);
});

test('calculateDistance and calculateDistanceSq compute correct 3D Euclidean distances', () => {
  const p1 = { x: 0, y: 0, z: 0 };
  const p2 = { x: 3, y: 4, z: 0 };
  assert.equal(calculateDistance(p1, p2), 5);
  assert.equal(calculateDistanceSq(p1, p2), 25);

  const p3 = { x: 10, y: 20, z: 30 };
  const p4 = { x: 10, y: 20, z: 30 };
  assert.equal(calculateDistance(p3, p4), 0);
  assert.equal(calculateDistanceSq(p3, p4), 0);
});

test('determineLodLevel classifies distances accurately according to thresholds', () => {
  const thresholds = LOD_PROFILES.balanced; // medium: 55, low: 130, cull: 360

  // Near range
  assert.equal(determineLodLevel(0, thresholds), LodLevel.HIGH);
  assert.equal(determineLodLevel(30, thresholds), LodLevel.HIGH);
  assert.equal(determineLodLevel(54.9, thresholds), LodLevel.HIGH);

  // Medium range
  assert.equal(determineLodLevel(55, thresholds), LodLevel.MEDIUM);
  assert.equal(determineLodLevel(90, thresholds), LodLevel.MEDIUM);
  assert.equal(determineLodLevel(129.9, thresholds), LodLevel.MEDIUM);

  // Low range
  assert.equal(determineLodLevel(130, thresholds), LodLevel.LOW);
  assert.equal(determineLodLevel(250, thresholds), LodLevel.LOW);
  assert.equal(determineLodLevel(359.9, thresholds), LodLevel.LOW);

  // Culled range
  assert.equal(determineLodLevel(360, thresholds), LodLevel.CULLED);
  assert.equal(determineLodLevel(500, thresholds), LodLevel.CULLED);

  // When disabled, always returns HIGH
  assert.equal(determineLodLevel(300, thresholds, false), LodLevel.HIGH);
});

test('shouldUpdateEntity throttles update frequency predictably', () => {
  // HIGH level: updates on every frame (0, 1, 2, 3...)
  for (let frame = 0; frame < 10; frame++) {
    assert.equal(shouldUpdateEntity(LodLevel.HIGH, frame), true);
  }

  // MEDIUM level: updates every 2nd frame (even frames: 0, 2, 4...)
  assert.equal(shouldUpdateEntity(LodLevel.MEDIUM, 0), true);
  assert.equal(shouldUpdateEntity(LodLevel.MEDIUM, 1), false);
  assert.equal(shouldUpdateEntity(LodLevel.MEDIUM, 2), true);
  assert.equal(shouldUpdateEntity(LodLevel.MEDIUM, 3), false);

  // MEDIUM level with offset: interleaving
  assert.equal(shouldUpdateEntity(LodLevel.MEDIUM, 0, true, 1), false);
  assert.equal(shouldUpdateEntity(LodLevel.MEDIUM, 1, true, 1), true);

  // LOW level: updates every 4th frame (0, 4, 8...)
  assert.equal(shouldUpdateEntity(LodLevel.LOW, 0), true);
  assert.equal(shouldUpdateEntity(LodLevel.LOW, 1), false);
  assert.equal(shouldUpdateEntity(LodLevel.LOW, 2), false);
  assert.equal(shouldUpdateEntity(LodLevel.LOW, 3), false);
  assert.equal(shouldUpdateEntity(LodLevel.LOW, 4), true);

  // CULLED level: never updates
  assert.equal(shouldUpdateEntity(LodLevel.CULLED, 0), false);
  assert.equal(shouldUpdateEntity(LodLevel.CULLED, 1), false);

  // Disabled LOD: always updates regardless of level
  assert.equal(shouldUpdateEntity(LodLevel.LOW, 1, false), true);
  assert.equal(shouldUpdateEntity(LodLevel.CULLED, 0, false), true);
});

test('getUpdateDeltaMultiplier compensates for frame skipping', () => {
  assert.equal(getUpdateDeltaMultiplier(LodLevel.HIGH), 1.0);
  assert.equal(getUpdateDeltaMultiplier(LodLevel.MEDIUM), 2.0);
  assert.equal(getUpdateDeltaMultiplier(LodLevel.LOW), 4.0);
  assert.equal(getUpdateDeltaMultiplier(LodLevel.CULLED), 0.0);
  assert.equal(getUpdateDeltaMultiplier(LodLevel.LOW, false), 1.0);
});

test('calculateLODMetrics computes distributions and estimated savings', () => {
  const thresholds = LOD_PROFILES.balanced;
  // 1 high (20), 2 medium (70, 90), 2 low (150, 200)
  const distances = [20, 70, 90, 150, 200];
  const metrics = calculateLODMetrics(distances, thresholds, true);

  assert.equal(metrics.totalEntities, 5);
  assert.equal(metrics.highCount, 1);
  assert.equal(metrics.mediumCount, 2);
  assert.equal(metrics.lowCount, 2);
  assert.equal(metrics.culledCount, 0);
  assert.ok(metrics.estimatedComplexitySavingsPercent > 0);
  assert.ok(metrics.estimatedComplexitySavingsPercent <= 100);

  // When disabled
  const disabledMetrics = calculateLODMetrics(distances, thresholds, false);
  assert.equal(disabledMetrics.highCount, 5);
  assert.equal(disabledMetrics.mediumCount, 0);
  assert.equal(disabledMetrics.lowCount, 0);
  assert.equal(disabledMetrics.estimatedComplexitySavingsPercent, 0);
});
