import { Laya } from "../../Laya";
import { Component } from "../components/Component";
import { Sprite3D } from "../d3/core/Sprite3D";
import { Vector3 } from "../maths/Vector3";
import { ClassUtils } from "../utils/ClassUtils";
import { IK_Target } from "./IK_Pose1";
import { IK_System } from "./IK_System";

export class IK_Comp extends Component{
    private _ik_sys = new IK_System();

    constructor(){
        super();

    }
    protected _onEnable(): void {
    }
    protected _onDestroy() {
    }

    protected _onAdded(): void {
        let ik = this._ik_sys;
        ik.setRoot(this.owner as Sprite3D);
        let chain = ik.addChainByBoneName('Bone.004',5,true);
        chain.name='ttt';
        ik.setTarget('ttt', new IK_Target(new Vector3(10,10,10)));
    }

    protected _onAwake(): void {
    }    

    _parse(data: any, interactMap: any = null): void {
        //override it.
    }

    onUpdate(){
        let ik = this._ik_sys;
        const time = Laya.timer.currTimer * 0.001;
        let vec3 = new Vector3(
            Math.sin(time) * 6,
            6 ,
            Math.cos(time * 0.5) * 6
        );

        ik.setTarget('ttt', new IK_Target(vec3))
        //应用ik结果
        this._ik_sys.onUpdate();
    }

    //添加chain
    //添加末端

}

ClassUtils.regClass("IK_Comp",IK_Comp)