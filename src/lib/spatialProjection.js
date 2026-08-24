export const MAX_ORBIT_PITCH = Math.PI * 0.46;

export function latentPhaseDepth(radius, phase, depthScale = 1) {
  return radius * Math.sin(phase) * depthScale;
}

export function clampOrbitPitch(pitch) {
  return Math.max(-MAX_ORBIT_PITCH, Math.min(MAX_ORBIT_PITCH, pitch));
}

export function createOrbitRotation(yaw = 0, pitch = 0) {
  return {
    cosYaw: Math.cos(yaw),
    sinYaw: Math.sin(yaw),
    cosPitch: Math.cos(pitch),
    sinPitch: Math.sin(pitch)
  };
}

export function rotateSpatialPoint(x, y, z, rotation, target = {}) {
  const yawX = x * rotation.cosYaw + z * rotation.sinYaw;
  const yawZ = -x * rotation.sinYaw + z * rotation.cosYaw;

  target.x = yawX;
  target.y = y * rotation.cosPitch - yawZ * rotation.sinPitch;
  target.z = y * rotation.sinPitch + yawZ * rotation.cosPitch;
  return target;
}
