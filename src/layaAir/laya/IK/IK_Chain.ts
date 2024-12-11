import { Matrix4x4 } from "../maths/Matrix4x4";
import { Quaternion } from "../maths/Quaternion";
import { Vector3 } from "../maths/Vector3";
import { IK_EndEffector } from "./IK_EndEffector";
import { IK_Joint } from "./IK_Joint";
import { IK_Pose1 } from "./IK_Pose1";
import { rotationTo } from "./IK_Utils";

let Z = new Vector3(0, 0, 1);

/**
 * 从IK_pose1可以方便的绑定到某个骨骼上，随着动画动
 */
export class IK_Chain extends IK_Pose1 {
    joints: IK_Joint[];
    //先只支持单个末端执行器
    end_effector: IK_EndEffector;
    private _origin = new Vector3();
    //设置世界矩阵或者修改某个joint的时候更新。0表示需要全部更新
    //private _dirtyIndex = 0;

    constructor() {
        super();
        this.joints = [];
    }

    /**
     * 
     * @param joint 
     * @param pos 
     * @param isWorldPos 是否是世界空间，所谓的世界空间不一定真的是世界空间，如果是在system中，则是system空间
     */
    addJoint(joint: IK_Joint, pos: Vector3, isWorldPos = false, isEnd = false): void {
        if (this.end_effector) {
            throw '已经结束了'
        }
        //this.updateWorldPos();
        let lastJoint = this.joints[this.joints.length - 1];
        joint.position = new Vector3();
        if (!lastJoint) {
            this._origin = pos.clone();
            joint.setRotationQuat(new Quaternion());  //第一个固定为单位旋转
            pos.cloneTo(joint.position);
        } else {
            if (isWorldPos) {
                pos.cloneTo(joint.position);
                //先转成本地空间
                let localPos = new Vector3();
                pos.vsub(this._origin, localPos);
                pos = localPos;
            } else {
                //累加
                lastJoint.position.vadd(pos, joint.position);
            }
            let dpos = new Vector3();
            pos.vsub(lastJoint.position, dpos);
            lastJoint.length = dpos.length();
            //计算朝向
            dpos.normalize();
            let quat = lastJoint.getRotaionQuat();
            rotationTo(Z, dpos, quat);
            lastJoint.setRotationQuat(quat);
        }
        this.joints.push(joint);
        //为了简化，末端就是最后一个joint
        if (isEnd) {
            this.setEndEffector(this.joints.length - 1);
        }
    }

    //给一个相对空间的，如果都是null则使用最后一个joint作为end effector
    //chain只是允许设置相对空间的，如果要设置世界空间，需要在system中设置，那里能得到世界信息
    setEndEffector(index: number) {
        let joints = this.joints;
        this.end_effector = new IK_EndEffector(joints[index]);
    }

    enable(b: boolean) {

    }

    setWorldPos(pos: Vector3) {
        pos.cloneTo(this._origin);
        //this._dirtyIndex=0;
    }

    /**
     * 从某个index开始更新世界位置
     * @param index 
     */
    // private updateWorldPos(){
    //     let joints = this.joints;
    //     let base = this._origin;
    //     for (let i = this._dirtyIndex; i < joints.length - 1; i++) {
    //         const current = joints[i];
    //         current.position.setValue()
    //         current.length;
    //     }
    //     this._dirtyIndex=joints.length;
    // }

    rotateJoint(jointId: number, deltaQuat: Quaternion) {
        let joints = this.joints;
        for (let i = jointId; i < joints.length - 1; i++) {
            const current = joints[i];

            //先更新自己的朝向
            const curQuat = current.getRotaionQuat();
            Quaternion.multiply(deltaQuat, curQuat, curQuat);
            curQuat.normalize(curQuat);
            current.setRotationQuat(curQuat);

            const direction = new Vector3(0, 0, 1);
            Vector3.transformQuat(direction, curQuat, direction);
            direction.scale(current.length, direction);

            //再更新子关节的位置：从当前位置累加
            const next = joints[i + 1];
            next.position.setValue(
                current.position.x + direction.x,
                current.position.y + direction.y,
                current.position.z + direction.z
            );
        }
    }
}