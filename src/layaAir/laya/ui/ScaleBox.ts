import { Box } from "./Box"
import { ILaya } from "../../ILaya";
import { TransformKind } from "../display/SpriteConst";

/**
 * @en The `ScaleBox` is a container that automatically scales its content to fit the stage size while maintaining the original aspect ratio.
 * @zh `ScaleBox` 是一个自适应缩放容器，容器设置大小后，容器大小始终保持舞台大小，子内容按照原始最小宽高比缩放。
 */
export class ScaleBox extends Box {
    private _oldW: number = 0;
    private _oldH: number = 0;

    private onResize(): void {
        if (this.width > 0 && this.height > 0) {
            let stage = ILaya.stage;
            let scale = Math.min(stage.width / this._oldW, stage.height / this._oldH);
            super.width = stage.width;
            super.height = stage.height;
            this.scale(scale, scale);
        }
    }

    /**
     * @ignore
     * @en Called when the container is enabled. Adds a resize event listener to the stage.
     * @zh 容器启用时调用。为舞台添加调整大小事件监听器。
     */
    onEnable(): void {
        ILaya.stage.on("resize", this, this.onResize);
        this.onResize();
    }

    /**
     * @ignore
     * @en Called when the container is disabled. Removes the resize event listener from the stage.
     * @zh 容器禁用时调用。从舞台移除调整大小事件监听器。
     */
    onDisable(): void {
        ILaya.stage.off("resize", this, this.onResize);
    }

    /**
     * @ignore
     */
    protected _transChanged(kind: TransformKind) {
        super._transChanged(kind);

        this._oldW = this._width;
        this._oldH = this._height;
    }
}