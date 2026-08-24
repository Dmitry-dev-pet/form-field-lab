export const MAX_ORBIT_PITCH = Math.PI * 0.46;

const EPSILON = 1e-10;
const clampUnit = value => Math.max(-1, Math.min(1, value));

export function latentPhaseDepth(radius, phase, depthScale = 1) {
  return radius * Math.sin(phase) * depthScale;
}

// Kept for reading old yaw/pitch snapshots and third-party imports.
export function clampOrbitPitch(pitch) {
  return Math.max(-MAX_ORBIT_PITCH, Math.min(MAX_ORBIT_PITCH, pitch));
}

export function orbitPitchDelta(pixelDelta, radiansPerPixel, inverted = false) {
  const direction = inverted ? -1 : 1;
  return pixelDelta * radiansPerPixel * direction;
}

export function identityQuaternion(target = {}) {
  target.x = 0;
  target.y = 0;
  target.z = 0;
  target.w = 1;
  return target;
}

export function normalizeQuaternion(source = {}, target = {}) {
  const x = Number(source.x) || 0;
  const y = Number(source.y) || 0;
  const z = Number(source.z) || 0;
  const w = Number.isFinite(Number(source.w)) ? Number(source.w) : 1;
  const length = Math.hypot(x, y, z, w);
  if (length < EPSILON) return identityQuaternion(target);
  target.x = x / length;
  target.y = y / length;
  target.z = z / length;
  target.w = w / length;
  return target;
}

// The product rotates by right first and left second.
export function multiplyQuaternions(left, right, target = {}) {
  const ax = left.x;
  const ay = left.y;
  const az = left.z;
  const aw = left.w;
  const bx = right.x;
  const by = right.y;
  const bz = right.z;
  const bw = right.w;
  target.x = aw * bx + ax * bw + ay * bz - az * by;
  target.y = aw * by - ax * bz + ay * bw + az * bx;
  target.z = aw * bz + ax * by - ay * bx + az * bw;
  target.w = aw * bw - ax * bx - ay * by - az * bz;
  return target;
}

export function quaternionFromAxisAngle(axisX, axisY, axisZ, angle, target = {}) {
  const length = Math.hypot(axisX, axisY, axisZ);
  if (length < EPSILON || Math.abs(angle) < EPSILON) return identityQuaternion(target);
  const halfAngle = angle / 2;
  const scale = Math.sin(halfAngle) / length;
  target.x = axisX * scale;
  target.y = axisY * scale;
  target.z = axisZ * scale;
  target.w = Math.cos(halfAngle);
  return target;
}

// Legacy angles are composed as Rz(roll) * Rx(pitch) * Ry(yaw).
export function createOrbitRotation(yaw = 0, pitch = 0, roll = 0) {
  const yawRotation = quaternionFromAxisAngle(0, 1, 0, yaw);
  const pitchRotation = quaternionFromAxisAngle(1, 0, 0, pitch);
  const rollRotation = quaternionFromAxisAngle(0, 0, 1, roll);
  const pitchedYaw = multiplyQuaternions(pitchRotation, yawRotation);
  return normalizeQuaternion(multiplyQuaternions(rollRotation, pitchedYaw));
}

export function quaternionToRotationMatrix(rotation, target = {}) {
  const quaternion = normalizeQuaternion(rotation);
  const { x, y, z, w } = quaternion;
  const xx = x * x;
  const yy = y * y;
  const zz = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;

  target.m00 = 1 - 2 * (yy + zz);
  target.m01 = 2 * (xy - wz);
  target.m02 = 2 * (xz + wy);
  target.m10 = 2 * (xy + wz);
  target.m11 = 1 - 2 * (xx + zz);
  target.m12 = 2 * (yz - wx);
  target.m20 = 2 * (xz - wy);
  target.m21 = 2 * (yz + wx);
  target.m22 = 1 - 2 * (xx + yy);
  return target;
}

export function quaternionToEuler(rotation, target = {}) {
  const matrix = quaternionToRotationMatrix(rotation);
  const pitch = Math.asin(clampUnit(matrix.m21));
  const nearPole = Math.abs(Math.cos(pitch)) < 1e-7;
  target.yaw = nearPole ? Math.atan2(matrix.m02, matrix.m00) : Math.atan2(-matrix.m20, matrix.m22);
  target.pitch = pitch;
  target.roll = nearPole ? 0 : Math.atan2(-matrix.m01, matrix.m11);
  return target;
}

export function quaternionToAxisAngle(rotation, target = {}) {
  const quaternion = normalizeQuaternion(rotation);
  const direction = quaternion.w < 0 ? -1 : 1;
  const w = clampUnit(quaternion.w * direction);
  const scale = Math.sqrt(Math.max(0, 1 - w * w));
  target.angle = 2 * Math.acos(w);
  if (scale < 1e-7) {
    target.x = 1;
    target.y = 0;
    target.z = 0;
  } else {
    target.x = quaternion.x * direction / scale;
    target.y = quaternion.y * direction / scale;
    target.z = quaternion.z * direction / scale;
  }
  return target;
}

export function projectTrackballPoint(clientX, clientY, bounds, inverted = false, target = {}) {
  const width = Math.max(1, Number(bounds?.width) || 1);
  const height = Math.max(1, Number(bounds?.height) || 1);
  const centerX = (Number(bounds?.left) || 0) + width / 2;
  const centerY = (Number(bounds?.top) || 0) + height / 2;
  const scale = 2 / Math.min(width, height);
  let x = (clientX - centerX) * scale;
  let y = (clientY - centerY) * scale * (inverted ? 1 : -1);
  const distanceSquared = x * x + y * y;
  let z;
  if (distanceSquared > 1) {
    const inverseLength = 1 / Math.sqrt(distanceSquared);
    x *= inverseLength;
    y *= inverseLength;
    z = 0;
  } else {
    z = Math.sqrt(1 - distanceSquared);
  }
  target.x = x;
  target.y = y;
  target.z = z;
  return target;
}

export function quaternionBetweenVectors(from, to, target = {}) {
  const fromLength = Math.hypot(from.x, from.y, from.z);
  const toLength = Math.hypot(to.x, to.y, to.z);
  if (fromLength < EPSILON || toLength < EPSILON) return identityQuaternion(target);
  const ax = from.x / fromLength;
  const ay = from.y / fromLength;
  const az = from.z / fromLength;
  const bx = to.x / toLength;
  const by = to.y / toLength;
  const bz = to.z / toLength;
  const dot = clampUnit(ax * bx + ay * by + az * bz);

  if (dot < -1 + 1e-7) {
    const useX = Math.abs(ax) < Math.abs(ay) && Math.abs(ax) < Math.abs(az);
    const useY = !useX && Math.abs(ay) < Math.abs(az);
    const ox = useX ? 1 : 0;
    const oy = useY ? 1 : 0;
    const oz = useX || useY ? 0 : 1;
    return quaternionFromAxisAngle(
      ay * oz - az * oy,
      az * ox - ax * oz,
      ax * oy - ay * ox,
      Math.PI,
      target
    );
  }

  target.x = ay * bz - az * by;
  target.y = az * bx - ax * bz;
  target.z = ax * by - ay * bx;
  target.w = 1 + dot;
  return normalizeQuaternion(target, target);
}

export function rotateSpatialPoint(x, y, z, rotation, target = {}) {
  // Accept old pre-quaternion rotation objects in stored/imported state.
  if (rotation && Object.hasOwn(rotation, "cosYaw")) {
    const yawX = x * rotation.cosYaw + z * rotation.sinYaw;
    const yawZ = -x * rotation.sinYaw + z * rotation.cosYaw;
    target.x = yawX;
    target.y = y * rotation.cosPitch - yawZ * rotation.sinPitch;
    target.z = y * rotation.sinPitch + yawZ * rotation.cosPitch;
    return target;
  }

  const matrix = rotation && Object.hasOwn(rotation, "m00")
    ? rotation
    : quaternionToRotationMatrix(rotation);
  target.x = matrix.m00 * x + matrix.m01 * y + matrix.m02 * z;
  target.y = matrix.m10 * x + matrix.m11 * y + matrix.m12 * z;
  target.z = matrix.m20 * x + matrix.m21 * y + matrix.m22 * z;
  return target;
}
