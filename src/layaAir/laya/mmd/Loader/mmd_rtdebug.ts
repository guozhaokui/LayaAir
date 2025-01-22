import { ClsInst } from "../../IK/IK_Utils";
import { Quaternion } from "../../maths/Quaternion";
import { Vector3 } from "../../maths/Vector3";
import { MMDSprite } from "./mmdToLaya";

export class mmd_rtdebug{
    static clsid = '26319334-be53-4bcb-887d-8f1eb92bb085'
    constructor(
        public mmdsp:MMDSprite
    ) {
        ClsInst.addInst(this);
    }    

    onProtoChange(){
        debugger;
        let q1 = new Quaternion();
        Quaternion.createFromAxisAngle( new Vector3(1,0,0), Math.PI/2,q1)
        console.log('k11',this.mmdsp)
        for(let s of this.mmdsp.skeleton.sprites){
            console.log(`${s.name},${s.parent?.name}`)
        }
    }
}