import { Vector3 } from "../maths/Vector3";
import { IK_CCDSolver } from "./CCD/IK_CCDSolver";
import { IK_Chain } from "./IK_Chain";
import { IK_Joint } from "./IK_Joint";
import { IK_System } from "./IK_System";
import { IK_Pose1, IK_Target } from "./IK_Pose1";
import { Quaternion } from "../maths/Quaternion";

// 使用示例
const ccdSolver = new IK_CCDSolver();
const ikSystem = new IK_System(new Vector3(), new Quaternion(), ccdSolver);

let chain1 = new IK_Chain();
chain1.addJoint(new IK_Joint(1));
chain1.addJoint(new IK_Joint(1));

// 设置末端执行器
chain1.setEndEffector(new Vector3(0, 2, 0));

// 求解IK
ikSystem.solve( new IK_Target(new Vector3(1, 1, 1),null));