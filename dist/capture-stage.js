import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from './vendor/three.module.js';
// An uncluttered presentation space: the live route is restored every frame.
export function createCaptureStage(scene){const stage=new Group(),saved=new Map();stage.visible=false;scene.add(stage);
 const floor=new Mesh(new BoxGeometry(80,.12,80),new MeshStandardMaterial({color:0x819598,roughness:1}));floor.position.y=-.08;floor.receiveShadow=true;stage.add(floor);
 return {restore(){for(const [o,visible]of saved)o.visible=visible;saved.clear();stage.visible=false;},show(actors){for(const o of scene.children){if(o===stage||o.isLight||actors.includes(o))continue;saved.set(o,o.visible);o.visible=false;}stage.visible=true;}};
}
