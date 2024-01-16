import { TBPNode } from "../../datas/types/BlueprintTypes";
import { BlueprintConst } from "../../core/BlueprintConst";
import { BlueprintNode } from "../../core/BlueprintNode";
import { INodeManger } from "../../core/interface/INodeManger";
import { IRunAble } from "../interface/IRunAble";
import { BlueprintStaticFun } from "../BlueprintStaticFun";
import { BlueprintRuntimeBaseNode } from "./BlueprintRuntimeBaseNode";
import { BlueprintUtil } from "../../core/BlueprintUtil";
import { IBPRutime } from "../interface/IBPRutime";

export class BlueprintGetVarNode extends BlueprintRuntimeBaseNode {
    private _varKey: string;
    constructor() {
        super();
    }

    protected onParseLinkData(node: TBPNode, manger: INodeManger<BlueprintRuntimeBaseNode>) {
        let cfg = manger.dataMap[node.dataId];
        this._varKey = cfg ? cfg.name : BlueprintUtil.constAllVars[node.dataId].name;
    }

    step(context: IRunAble, fromExcute: boolean, runner: IBPRutime, enableDebugPause: boolean, runId: number): number {
        let _parmsArray: any[] = context.getDataById(this.nid).getParamsArray(runId);

        _parmsArray.length = 0;
        const varPin = this.outPutParmPins[0];
        context.parmFromCustom(_parmsArray, this._varKey, '"' + this._varKey + '"');
        context.parmFromCustom(_parmsArray, context, "context");

        if (this.nativeFun) {
            let result = context.excuteFun(this.nativeFun, this.outPutParmPins, BlueprintStaticFun, _parmsArray,runId);
            if (result == undefined) {
                context.setPinData(this.outPutParmPins[0], result, runId);
            }
        }
        return BlueprintConst.MAX_CODELINE;
    }

}