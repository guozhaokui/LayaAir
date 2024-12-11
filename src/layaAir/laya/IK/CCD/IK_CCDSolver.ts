import { Quaternion } from "../../maths/Quaternion";
import { Vector3 } from "../../maths/Vector3";
import { IK_Chain } from "../IK_Chain";
import { IK_ISolver } from "../IK_ISolver";
import { IK_Joint } from "../IK_Joint";
import { IK_Target } from "../IK_Pose1";
import {rotationTo} from "../IK_Utils"

export class IK_CCDSolver implements IK_ISolver {
    maxIterations: number;
    epsilon: number;

    constructor(maxIterations: number = 10, epsilon: number = 0.001) {
        this.maxIterations = maxIterations;
        this.epsilon = epsilon;
    }


    solve(chain: IK_Chain, target: IK_Target): void {
        const endEffector = chain.end_effector;
        let iteration = 0;

        const toEndEffector = new Vector3();
        const toTarget = new Vector3();
        while (iteration < this.maxIterations) {
            //从末端开始
            for (let i = chain.joints.length - 1; i >= 0; i--) {
                const joint = chain.joints[i];

                endEffector.position.vsub(joint.position, toEndEffector);
                if(toEndEffector.length()<1e-5) 
                    //endeffector和joint重合的情况
                    continue;

                toEndEffector.normalize();

                target.pos.vsub(joint.position,toTarget);
                toTarget.normalize();

                let rotation = new Quaternion();
                rotationTo(toEndEffector, toTarget, rotation);
                // Apply angle limits TODO
                rotation = this.applyAngleLimits(joint,rotation);
                //更新朝向
                chain.rotateJoint(i,rotation);
            }

            if (Vector3.distanceSquared(endEffector.position, target.pos) < this.epsilon * this.epsilon) {
                break;
            }

            iteration++;
        }
    }

    /**
     * 根据joint来限制rot，返回被限制后的rot
     * @param joint 
     * @param rot 
     * @returns 
     */
    private applyAngleLimits(joint: IK_Joint, rot:Quaternion) {
        const euler = new Vector3();
        if(joint.angleLimit){
            let min = joint.angleLimit.min;
            let max = joint.angleLimit.max;
            //注意laya引擎这里得到的euler对应的是x:yaw,y:pitch,z:roll,所以相当于x和y是交换的
            rot.getYawPitchRoll(euler)
    
            euler.x = Math.max(Math.min(euler.x, max.y), min.y);
            euler.y = Math.max(Math.min(euler.y, max.x), min.x);
            euler.z = Math.max(Math.min(euler.z, max.z), min.z);
    
            Quaternion.createFromYawPitchRoll(euler.x, euler.y, euler.z, rot);
        }
        return rot;
    }
}