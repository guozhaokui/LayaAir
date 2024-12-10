import { Quaternion } from "../maths/Quaternion";
import { Vector3 } from "../maths/Vector3";
import { IK_Chain } from "./IK_Chain";
import { IK_ISolver } from "./IK_ISolver";
import { IK_Pose1, IK_Target } from "./IK_Pose1";

//一个可以整体移动的系统，例如一个人身上的多个链
export class IK_System extends IK_Pose1 {
    private solver: IK_ISolver;
    private chains: IK_Chain[] = [];

    constructor(pos: Vector3, dir: Quaternion, solver: IK_ISolver) {
        super(pos, dir);
        this.solver = solver;
    }

    override onPoseChange(): void {
        //TODO 
    }

    /**
     * 可以包含多个chain
     * @param chain 
     */
    addChain(chain: IK_Chain) {

    }

    appendEndEffector(chainIndex: number, pos: Vector3, isWorldSpace = false) {
        if (chainIndex >= 0 && chainIndex < this.chains.length) {
            const chain = this.chains[chainIndex];
            if (isWorldSpace) {
                const localPos = this.worldToLocal(pos);
                //const localDir = this.worldToLocalRotation(dir);
                chain.setEndEffector(localPos);
            } else {
                chain.setEndEffector(pos);
            }
        }
    }

    private worldToLocal(worldPos: Vector3): Vector3 {
        // 实现世界坐标到局部坐标的转换
        return null;
    }

    private worldToLocalRotation(worldRot: Quaternion): Quaternion {
        // 实现世界旋转到局部旋转的转换
        return null;
    }

    solve(target: IK_Target, maxIterations = 100, tolerance = 0.01): void {
        this.solver.solve(this.chains[0], target)
    }

    upbdatePose(){

    }

    /**
     * 整体求解
     * 多个链
     */
    solve_whole_system() {

    }
}
