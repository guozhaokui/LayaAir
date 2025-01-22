import { Quaternion } from "../maths/Quaternion";
import { Vector3 } from "../maths/Vector3";

var invQ = new Quaternion();
var dpos = new Vector3();
var v1 = new Vector3();
export class IK_Space{
    public pos:Vector3;
    public rot:Quaternion;

    constructor(
        pos?:Vector3,
        rot?:Quaternion,
    ){
        if(pos) this.pos = pos.clone();
        else this.pos = new Vector3();
        if(rot) this.rot  = rot.clone();
        else this.rot = new Quaternion();
    }
    
    toLocal(space:IK_Space, outSpace?:IK_Space){
        if(!outSpace){
            outSpace = new IK_Space();
        }
        space.pos.vsub(this.pos,dpos);
        Quaternion.invert(this.rot,invQ);
        Vector3.transformQuat(dpos,invQ,outSpace.pos);
        Quaternion.multiply(space.rot,invQ,outSpace.rot)
        return outSpace;
    }

    toLocalPos(pos:Vector3,outPos?:Vector3){
        if(!outPos){
            outPos = new Vector3();
        }
        pos.vsub(this.pos,dpos);
        Quaternion.invert(this.rot,invQ);
        Vector3.transformQuat(dpos,invQ,outPos);
        return outPos;
    }

    toLocalRot(rot:Quaternion,outQ?:Quaternion){
        if(!outQ){
            outQ = new Quaternion();
        }
        Quaternion.invert(this.rot,invQ);
        Quaternion.multiply(rot,invQ,outQ)
        return outQ;
    }

    toWorldPos(pos:Vector3,outV?:Vector3){
        if(!outV){
            outV = new Vector3();
        }
        Vector3.transformQuat(pos,this.rot,outV);
        outV.vadd(this.pos, outV);
        return outV;
    }

    //不加pos
    toWorldDir(dir:Vector3,outDir?:Vector3){
        if(!outDir){
            outDir = new Vector3();
        }
        Vector3.transformQuat(dir,this.rot,outDir);
        return outDir;
    }

    toWorldRot(rot:Quaternion,outQ?:Quaternion){
        if(!outQ){
            outQ = new Quaternion();
        }
        Quaternion.multiply(rot,this.rot,outQ)
        return outQ;
    }

    toWorld(space:IK_Space, outSpace?:IK_Space){
        if(!outSpace){
            outSpace = new IK_Space();
        }
        this.toWorldPos(space.pos,outSpace.pos);
        this.toWorldRot(space.rot,outSpace.rot);
        return outSpace;
    }
}