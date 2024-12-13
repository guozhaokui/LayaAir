import { Matrix4x4 } from "../maths/Matrix4x4";
import { Quaternion } from "../maths/Quaternion";
import { Vector3 } from "../maths/Vector3";
import { IK_EndEffector } from "./IK_EndEffector";
import { IK_Joint } from "./IK_Joint";
import { IK_Pose1 } from "./IK_Pose1";
import { rotationTo } from "./IK_Utils";

let Z = new Vector3(0, 0, 1);
let dpos = new Vector3();

/**
 * 从IK_pose1可以方便的绑定到某个骨骼上，随着动画动
 */
export class IK_Chain extends IK_Pose1 {
    name=''
    //顺序是从根到末端
    joints: IK_Joint[];
    //先只支持单个末端执行器
    end_effector: IK_EndEffector;
    //构造的时候的位置，以后的位置都是相对这个做偏移
    private _lastPos = new Vector3();
    //设置世界矩阵或者修改某个joint的时候更新。0表示需要全部更新
    //private _dirtyIndex = 0;
    userData:any=null;

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
            this._lastPos = pos.clone();
            joint.rotationQuat = new Quaternion();  //第一个固定为单位旋转
            pos.cloneTo(joint.position);
        } else {
            if (isWorldPos) {
                pos.cloneTo(joint.position);
                //先转成本地空间
                let localPos = new Vector3();
                //与上一个joint的世界空间对比。这时候上一个joint的position已经计算了。
                pos.vsub(lastJoint.position, localPos);
                pos = localPos;
            } else {
                //累加
                lastJoint.position.vadd(pos, joint.position);
            }
            lastJoint.length = pos.length();
            //计算朝向
            pos.normalize();
            let quat = lastJoint.rotationQuat;
            rotationTo(Z, pos, quat);
            lastJoint.rotationQuat = quat;
        }
        this.joints.push(joint);
        //为了简化，末端就是最后一个joint
        if (isEnd) {
            this.setEndEffector(this.joints.length - 1);
        }
    }

    //给一个相对空间的，如果都是null则使用最后一个joint作为end effector
    //chain只是允许设置相对空间的，如果要设置世界空间，需要在system中设置，那里能得到世界信息
    setEndEffector(index=-1) {
        let joints = this.joints;
        if(index<0){
            index = joints.length-1;
        }
        this.end_effector = new IK_EndEffector(joints[index]);
    }

    //附加一个末端。
    appendEndEffector(pos: Vector3, isWorldSpace = false) {
        this.addJoint(new IK_Joint(), pos, isWorldSpace);
        this.setEndEffector();
    }

    enable(b: boolean) {
    }

    /**
     * 设置根节点的位置
     * @param pos 
     */
    setWorldPos(pos: Vector3) {
        pos.vsub(this._lastPos,dpos);
        //更新所有节点的位置
        for(let joint of this.joints){
            joint.position.vadd(dpos,joint.position);
        }
        //为了避免误差，第一个直接设置。这样后续的即使有误差，也会被solve的过程中修正（长度固定）
        this.joints[0].position.setValue(pos.x, pos.y,pos.z);
        this._lastPos.setValue(pos.x, pos.y, pos.z);
    }

    //从某个joint开始旋转，会调整每个joint的位置
    rotateJoint(jointId: number, deltaQuat: Quaternion) {
        let joints = this.joints;
        for (let i = jointId; i < joints.length - 1; i++) {
            const current = joints[i];

            //先更新自己的朝向
            const curQuat = current.rotationQuat;
            Quaternion.multiply(deltaQuat, curQuat, curQuat);
            curQuat.normalize(curQuat);
            current.rotationQuat = curQuat;

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