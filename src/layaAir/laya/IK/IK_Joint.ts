import { Sprite3D } from "../d3/core/Sprite3D";
import { Quaternion } from "../maths/Quaternion";
import { Vector3 } from "../maths/Vector3";

// 定义关节接口
export interface IK_IJoint {
    position: Vector3;
    rotationQuat:Quaternion;
    //rotationEuler: Vector3;
    length: number;
    angleLimit: IK_AngleLimit;
    type: "revolute" | "prismatic";    //旋转，平移

    updatePosition(): void;
    rotate(axis: Vector3, angle: number): void;
}

export class IK_AngleLimit {
    constructor(
        public min: Vector3,
        public max: Vector3
    ) { }
}

export class IK_JointUserData{
    bone:Sprite3D;
    rotOff:Quaternion;
    //调试用的球
    dbgSphere:Sprite3D;
}

// 实现基本关节类
export class IK_Joint implements IK_IJoint {
    // 内部存储使用四元数
    private _rotationQuat = new Quaternion();
    angleLimit: IK_AngleLimit = null;  //null就是不限制，-PI到PI
    type: "revolute" | "prismatic";
    //世界空间的(system空间的)
    position: Vector3;
    length = 1;
    userData = new IK_JointUserData();

    constructor(bone?:Sprite3D) {
        if(bone){
            this.userData.bone = bone;
            this.userData.rotOff = new Quaternion();
        }
    }

    updatePosition(): void {
        // 根据旋转更新位置
    }

    rotate(axis: Vector3, angle: number): void {
        // 实现旋转逻辑，考虑角度限制
    }

    // 设置旋转（四元数接口）世界空间
    set rotationQuat(q: Quaternion) {
        q.normalize(this._rotationQuat);
    }

    get rotationQuat() {
        return this._rotationQuat;
    }

    setAngleLimit(min: Vector3, max: Vector3): void {
        if (!this.angleLimit) {
            this.angleLimit = new IK_AngleLimit(min, max);
        } else {
            this.angleLimit.min.setValue(min.x, min.y, min.z);
            this.angleLimit.max.setValue(max.x, max.y, max.z);
        }
    }
}