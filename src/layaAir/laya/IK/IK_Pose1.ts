import { Sprite3D } from "../d3/core/Sprite3D";
import { Quaternion } from "../maths/Quaternion";
import { Vector3 } from "../maths/Vector3";
import { ClsInst } from "./IK_Utils";

export class IK_Pose1 {
    static clsid = '4bd7b3e8-f68c-4e1b-97cb-995bd40ef33d'
    protected _pos: Vector3;
    protected _dir: Quaternion;
    protected _targetSprite:Sprite3D;
    protected _poseChanged = true;
    constructor(pos?: Vector3 | Sprite3D| null, dir?: Quaternion | null) {
        if(pos instanceof Sprite3D){
            this._targetSprite = pos;
            this._pos = pos.transform.position.clone();
            this._dir = pos.transform.rotation.clone();
        }else{
            this._pos = pos ? pos.clone() : new Vector3();
            this._dir = dir ? dir.clone() : new Vector3();
        }
        ClsInst.addInst(this);
    }

    clone(t: IK_Pose1 | null) {
        let ret = t;
        if (t) {
            this._pos.cloneTo(t._pos);
            this._dir.cloneTo(t._dir);
        } else {
            ret = new IK_Pose1(this._pos, this._dir);
        }
        ret._targetSprite = this._targetSprite;
        return ret;
    }

    set pos(p: Vector3) {
        //TODO
        p.cloneTo(this._pos);
        this._poseChanged = true;
    }

    get pos(){
        if(this._targetSprite){
            this._targetSprite.transform.position.cloneTo(this._pos);
        }
        return this._pos;
    }

    set dir(d: Quaternion) {
        //TODO
        this._poseChanged = true;
    }

    onPoseChange() {

    }
}

export { IK_Pose1 as IK_Target };