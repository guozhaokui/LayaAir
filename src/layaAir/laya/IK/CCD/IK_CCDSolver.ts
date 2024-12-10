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
                toEndEffector.normalize();

                target.pos.vsub(joint.position,toTarget);
                toTarget.normalize();

                const rotation = new Quaternion();
                rotationTo(toEndEffector, toTarget, rotation);

                this.updateChainDir(chain, i, rotation);
                // Apply angle limits TODO
                this.applyAngleLimits(joint);
            }

            if (Vector3.distanceSquared(endEffector.position, target.pos) < this.epsilon * this.epsilon) {
                break;
            }

            iteration++;
        }
    }

    private applyAngleLimits(joint: IK_Joint): void {
        // const euler = new Vector3();
        // joint.rotation.getYawPitchRoll(euler);

        // euler.x = Math.max(Math.min(euler.x, joint.angleLimit.max.x), joint.angleLimit.min.x);
        // euler.y = Math.max(Math.min(euler.y, joint.angleLimit.max.y), joint.angleLimit.min.y);
        // euler.z = Math.max(Math.min(euler.z, joint.angleLimit.max.z), joint.angleLimit.min.z);

        // Quaternion.createFromYawPitchRoll(euler.x, euler.y, euler.z, joint.rotation);
    }

    //更新朝向
    private updateChainDir(chain: IK_Chain, startIndex: number, deltaQuat:Quaternion){        
        chain.updateDir(startIndex,deltaQuat);
    }
}