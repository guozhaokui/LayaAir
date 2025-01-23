import { IK_Joint } from "./IK_Joint";

export interface IK_IJointManager{
    getJoint(name:string):IK_Joint;
    addJoint(name:string,joint:IK_Joint):void;
}