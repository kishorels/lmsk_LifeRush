import { FINALRUN_GATE } from './engine.js';
export const CAMPUS_SPACING=32,CAMPUS_SLOTS=10,CAMPUS_START=64;
// A slot moves continuously until its whole section is behind the camera.
export function campusAnchor(slot,distance) {
 const first=CAMPUS_START+slot*CAMPUS_SPACING,span=CAMPUS_SLOTS*CAMPUS_SPACING;
 return first+Math.max(0,Math.ceil((distance-40-first)/span))*span;
}
export function campusKind(anchor){return Math.floor((anchor-CAMPUS_START)/CAMPUS_SPACING)%6;}

// Smooth Kodaikanal-style S-curves and gentle mountain slopes on the College map.
export function roadCurveX(distance, map = 'school', isFinalRun = false) {
 if (map === 'grandfather') return 4.6*Math.sin(distance/43) + 3.1*Math.sin(distance/71);
 if (map === 'finalrun') {
   const entry=smootherstep((distance-45)/70), exit=smootherstep((FINALRUN_GATE-140-distance)/110);
   return entry*exit*(13*Math.sin(distance/51)+6*Math.sin(distance/29));
 }
 if (map !== 'college') return 0;
 const ramp = Math.max(0, Math.min(1, (distance - 22) / 55));
 const ease = ramp * ramp * (3 - 2 * ramp);
 const exit = isFinalRun ? smootherstep((FINALRUN_GATE - 140 - distance) / 110) : 1;
 return ease * exit * (6.8 * Math.sin(distance * 0.0095) + 2.6 * Math.sin(distance * 0.021));
}

export function roadCurveY(distance, map = 'school', isFinalRun = false) {
 if (map === 'grandfather') return .82*Math.sin(distance/39) + .48*Math.sin(distance/67);
 if (map !== 'college') return 0;
 const ramp = Math.max(0, Math.min(1, (distance - 25) / 60));
 const ease = ramp * ramp * (3 - 2 * ramp);
 const exit = isFinalRun ? smootherstep((FINALRUN_GATE - 140 - distance) / 110) : 1;
 return ease * exit * (0.65 * Math.sin(distance * 0.013));
}

function smootherstep(t) {
 const c = Math.max(0, Math.min(1, t));
 return c * c * c * (c * (6 * c - 15) + 10);
}

// Sweeping C2-continuous "curly bend" S-curve for Glass Sea-Bridge & Railway Cave entry/exit transitions.
// Value & slope smoothly vanish at branchStart and branchEnd so straight city road joins seamlessly!
export function branchCurveX(worldZ, state) {
 const b = state?.activeBranch;
 if (b !== 'skybridge' && b !== 'underpass') return 0;
 const start = Number.isFinite(state.branchStart) ? state.branchStart : 220;
 const end = Number.isFinite(state.branchEnd) ? state.branchEnd : start + 1000;
 if (worldZ <= start || worldZ >= end) return 0;
 const len = Math.max(1, end - start);
 const u = (worldZ - start) / len;
 const env = smootherstep((worldZ - start) / 145) * smootherstep((end - worldZ) / 155);
 if (b === 'skybridge') {
  return env * (-11.5 * Math.sin(u * Math.PI) - 6.8 * Math.sin(u * Math.PI * 3));
 }
 return env * (9.2 * Math.sin(u * Math.PI) + 5.0 * Math.sin(u * Math.PI * 3));
}

export function branchCurveY(worldZ, state) {
 const b = state?.activeBranch;
 if (b !== 'skybridge' && b !== 'underpass') return 0;
 const start = Number.isFinite(state.branchStart) ? state.branchStart : 220;
 const end = Number.isFinite(state.branchEnd) ? state.branchEnd : start + 1000;
 if (worldZ <= start || worldZ >= end) return 0;
 const len = Math.max(1, end - start);
 const u = (worldZ - start) / len;
 const env = smootherstep((worldZ - start) / 145) * smootherstep((end - worldZ) / 155);
 if (b === 'skybridge') {
  return env * (1.85 * Math.sin(u * Math.PI) + 0.45 * Math.sin(u * Math.PI * 3));
 }
 return env * (-0.45 * Math.sin(u * Math.PI));
}

export function roadCurveSlope(distance, map = 'school', isFinalRun = false) {
 if (map !== 'college' && map !== 'finalrun' && map !== 'grandfather') return 0;
 const dx = 0.25;
 return (roadCurveX(distance + dx, map, isFinalRun) - roadCurveX(distance - dx, map, isFinalRun)) / (2 * dx);
}

export function curveSlopeAt(worldZ, state) {
 if (state?.activeBranch === 'skybridge' || state?.activeBranch === 'underpass') {
  const dx = 0.5;
  return (branchCurveX(worldZ + dx, state) - branchCurveX(worldZ - dx, state)) / (2 * dx);
 }
 return roadCurveSlope(worldZ, state?.map || 'school', Boolean(state?.isFinalRun));
}

export function curveRelX(worldZ, state) {
 if (!state) return 0;
 if (state.activeBranch === 'skybridge' || state.activeBranch === 'underpass') {
  return branchCurveX(worldZ, state) - branchCurveX(state.distance || 0, state);
 }
 const fin = Boolean(state.isFinalRun);
 return roadCurveX(worldZ, state.map, fin) - roadCurveX(state.distance || 0, state.map, fin);
}

export function curveRelY(worldZ, state) {
 if (!state) return 0;
 if (state.activeBranch === 'skybridge' || state.activeBranch === 'underpass') {
  return branchCurveY(worldZ, state) - branchCurveY(state.distance || 0, state);
 }
 if (state.map !== 'college' && state.map !== 'grandfather') return 0;
 const fin = Boolean(state.isFinalRun);
 return roadCurveY(worldZ, state.map, fin) - roadCurveY(state.distance || 0, state.map, fin);
}
