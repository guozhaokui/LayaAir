import { Quaternion } from "../maths/Quaternion";
import { Vector3 } from "../maths/Vector3";

// 定义关节接口
export interface IK_IJoint {
    position: Vector3;
    rotation: Vector3;
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

// 实现基本关节类
export class IK_Joint implements IK_IJoint {
    // 内部存储使用四元数
    private _rotationQuat = new Quaternion();
    private _eulerDirty = false;
    angleLimit: IK_AngleLimit = null;  //null就是不限制，-PI到PI
    type: "revolute" | "prismatic";
    //世界空间的(system空间的)
    position: Vector3;
    rotation: Vector3;
    length = 1;

    constructor() {
    }

    updatePosition(): void {
        // 根据旋转更新位置
    }

    rotate(axis: Vector3, angle: number): void {
        // 实现旋转逻辑，考虑角度限制
    }

    // 设置旋转（四元数接口）
    setRotationQuat(q: Quaternion) {
        q.normalize(this._rotationQuat);
        this._eulerDirty = true;
    }

    getRotaionQuat() {
        return this._rotationQuat;
    }

    // 设置旋转（欧拉角接口）
    setEulerAngles(angels: Vector3) {
        Quaternion.createFromYawPitchRoll(angels.y, angels.x, angels.z, this._rotationQuat);
        angels.cloneTo(this.rotation)
        this._eulerDirty = false;
    }

    // 获取欧拉角（用于展示）
    getEulerAngles(ang: Vector3) {
        if (this._eulerDirty) {
            //TODO
            this._eulerDirty = false;
        }
        this.rotation.cloneTo(ang);
        return ang;
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