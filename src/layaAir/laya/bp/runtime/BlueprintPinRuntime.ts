import { BlueprintPin } from "../core/BlueprintPin";
import { IOutParm } from "../core/interface/IOutParm";
import { IBPRutime } from "./interface/IBPRutime";
import { IRunAble } from "./interface/IRunAble";
import { BlueprintRuntimeBaseNode } from "./node/BlueprintRuntimeBaseNode";

export class BlueprintPinRuntime extends BlueprintPin {
    /**
     * 所属节点
    */
    owner: BlueprintRuntimeBaseNode;

    step(context: IRunAble, runner: IBPRutime, runId: number) {
        this.owner.tryExcute(context, false, runner, false, runId, this);
        //(this.linkTo[0] as PinRuntime).owner.step(context);
    }

    excute(context: IRunAble, runner: IBPRutime) {
        debugger;
        (this.linkTo[0] as BlueprintPinRuntime)?.owner.step(context, true, runner, true, -1);
    }

    getValueCode(): any {
        return typeof this.value == "string" ? ('"' + this.value + '"') : this.value;
    }
}