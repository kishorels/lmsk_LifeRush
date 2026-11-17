export const CAMPUS_SPACING=32,CAMPUS_SLOTS=9,CAMPUS_START=64;
// A slot moves continuously until its whole section is behind the camera.
export function campusAnchor(slot,distance) {
 const first=CAMPUS_START+slot*CAMPUS_SPACING,span=CAMPUS_SLOTS*CAMPUS_SPACING;
 return first+Math.max(0,Math.ceil((distance-40-first)/span))*span;
}
export function campusKind(anchor){return Math.floor((anchor-CAMPUS_START)/CAMPUS_SPACING)%4;}
