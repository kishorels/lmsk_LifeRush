export const CAMPUS_SPACING=32,CAMPUS_SLOTS=9,CAMPUS_START=64;
// A slot moves continuously until its whole section is behind the camera.
export function campusAnchor(slot,distance) {
 const first=CAMPUS_START+slot*CAMPUS_SPACING,span=CAMPUS_SLOTS*CAMPUS_SPACING;
 return first+Math.max(0,Math.ceil((distance-40-first)/span))*span;
}
export function campusKind(anchor){return Math.floor((anchor-CAMPUS_START)/CAMPUS_SPACING)%6;}

// Smooth Kodaikanal-style S-curves and gentle mountain slopes on the College map.
export function roadCurveX(distance, map = 'school') {
 if (map !== 'college') return 0;
 const ramp = Math.max(0, Math.min(1, (distance - 22) / 55));
 const ease = ramp * ramp * (3 - 2 * ramp);
 return ease * (6.8 * Math.sin(distance * 0.0095) + 2.6 * Math.sin(distance * 0.021));
}

export function roadCurveY(distance, map = 'school') {
 if (map !== 'college') return 0;
 const ramp = Math.max(0, Math.min(1, (distance - 25) / 60));
 const ease = ramp * ramp * (3 - 2 * ramp);
 return ease * (0.65 * Math.sin(distance * 0.013));
}

export function roadCurveSlope(distance, map = 'school') {
 if (map !== 'college') return 0;
 const dx = 0.25;
 return (roadCurveX(distance + dx, map) - roadCurveX(distance - dx, map)) / (2 * dx);
}

export function curveRelX(worldZ, state) {
 if (!state || state.map !== 'college') return 0;
 return roadCurveX(worldZ, 'college') - roadCurveX(state.distance || 0, 'college');
}

export function curveRelY(worldZ, state) {
 if (!state || state.map !== 'college') return 0;
 return roadCurveY(worldZ, 'college') - roadCurveY(state.distance || 0, 'college');
}
