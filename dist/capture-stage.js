import {Box3,Vector3} from './vendor/three.module.js';
// Keep the actual road, sky and campus; remove only vehicles in the acting shot.
export function createCaptureStage(scene){const saved=new Map(),bounds=new Box3(),corridor=new Box3();return {
 restore(){for(const [o,visible]of saved)o.visible=visible;saved.clear();},
 show(actors,camera){scene.updateMatrixWorld(true);const points=[camera.position,...actors.map(a=>a.getWorldPosition(new Vector3()))];corridor.setFromPoints(points).expandByVector(new Vector3(1.45,3,1.4));
 scene.traverse(o=>{if(!o.userData.captureObstacle||!o.visible)return;bounds.setFromObject(o);if(bounds.intersectsBox(corridor)){saved.set(o,o.visible);o.visible=false;}});
 }};
}
