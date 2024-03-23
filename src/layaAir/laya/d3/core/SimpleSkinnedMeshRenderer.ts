import { Event } from "../../events/Event";
import { SkinnedMeshRenderer } from "./SkinnedMeshRenderer";
import { SubMeshRenderElement } from "./render/SubMeshRenderElement";
import { SkinnedMeshSprite3DShaderDeclaration } from "./SkinnedMeshSprite3DShaderDeclaration";
import { Mesh } from "../resource/models/Mesh";
import { Texture2D } from "../../resource/Texture2D";
import { Vector2 } from "../../maths/Vector2";
import { Vector4 } from "../../maths/Vector4";
import { IRenderContext3D } from "../../RenderDriver/DriverDesign/3DRenderPass/I3DRenderPass";
import { BaseRenderType } from "../../RenderDriver/RenderModuleData/Design/3D/I3DRenderModuleData";
import { RenderContext3D } from "./render/RenderContext3D";
import { Sprite3D } from "./Sprite3D";
import { Matrix4x4 } from "../../maths/Matrix4x4";
import { MeshRenderer } from "./MeshRenderer";

export class SimpleSkinnedMeshRenderer extends SkinnedMeshRenderer {
    /**@internal 解决循环引用 */
    static SIMPLE_SIMPLEANIMATORTEXTURE: number;
    /**@internal 解决循环引用*/
    static SIMPLE_SIMPLEANIMATORPARAMS: number;
    /**@internal 解决循环引用*/
    static SIMPLE_SIMPLEANIMATORTEXTURESIZE: number;

    /**@internal */
    private _simpleAnimatorTexture: Texture2D;
    /**@internal */
    _simpleAnimatorParams: Vector4;
    /**@internal */
    private _simpleAnimatorTextureSize: number;
    /**@internal  x simpleAnimation offset,y simpleFrameOffset*/
    private _simpleAnimatorOffset: Vector2;
    /**@internal */
    _bonesNums: number;

    /**
     * @internal
     * 设置动画帧贴图
     */
    get simpleAnimatorTexture(): Texture2D {
        return this._simpleAnimatorTexture;
    }

    /**
     * @internal
     */
    set simpleAnimatorTexture(value: Texture2D) {
        this._simpleAnimatorTexture = value;
        this._simpleAnimatorTextureSize = value.width;
        this._baseRenderNode.shaderData.setTexture(SimpleSkinnedMeshRenderer.SIMPLE_SIMPLEANIMATORTEXTURE, value);
        value._addReference();
        this._baseRenderNode.shaderData.setNumber(SimpleSkinnedMeshRenderer.SIMPLE_SIMPLEANIMATORTEXTURESIZE, this._simpleAnimatorTextureSize);
    }

    /**
     * @internal
     * 设置动画帧数参数
     */
    get simpleAnimatorOffset(): Vector2 {
        return this._simpleAnimatorOffset;
    }

    /**
     * @internal
     */
    set simpleAnimatorOffset(value: Vector2) {
        value.cloneTo(this._simpleAnimatorOffset);
    }


    /**
     * 创建一个 <code>SkinnedMeshRender</code> 实例。
     */
    constructor() {
        super();
        this._simpleAnimatorParams = new Vector4();
        this._simpleAnimatorOffset = new Vector2();
        this._baseRenderNode.shaderData.addDefine(SkinnedMeshSprite3DShaderDeclaration.SHADERDEFINE_SIMPLEBONE);
        this._baseRenderNode.shaderData.addDefine(SkinnedMeshSprite3DShaderDeclaration.SHADERDEFINE_BONE);
        this._baseRenderNode.renderNodeType = BaseRenderType.SimpleSkinRender;
        this._baseRenderNode.shaderData.setVector(SimpleSkinnedMeshRenderer.SIMPLE_SIMPLEANIMATORPARAMS, new Vector4());
    }

    protected _getcommonUniformMap(): string[] {
        return ["Sprite3D", "SimpleSkinnedMesh"];
    }

    protected _computeSkinnedData(): void {
        this._computeAnimatorParamsData();
    }

    /**
     *@inheritDoc
     *@override
     *@internal
     */
    _createRenderElement() {
        let renderelement = new SubMeshRenderElement();
        return renderelement;
    }

    /**
     * @internal
     */
    _computeAnimatorParamsData(): void {
        if (this._cacheMesh) {
            this._simpleAnimatorParams.x = this._simpleAnimatorOffset.x;
            this._simpleAnimatorParams.y = Math.round(this._simpleAnimatorOffset.y) * this._bonesNums * 4;
            this._baseRenderNode.shaderData.setVector(SimpleSkinnedMeshRenderer.SIMPLE_SIMPLEANIMATORPARAMS, this._simpleAnimatorParams);
        }
    }

    /**
    *@inheritDoc
    *@override
    *@internal
    */
    _onMeshChange(value: Mesh): void {
        this._onSkinMeshChange(value);
        if (!value)
            return;
        this._cacheMesh = (<Mesh>value);
        this._setRenderElements();

    }
    /**
     * @inheritDoc
     * @override
     * @internal
     */
    _renderUpdate(context: IRenderContext3D): void {

        let shaderData = this._baseRenderNode.shaderData;

        let transform = this.rootBone ? this.rootBone.transform : this.owner.transform;
        let worldMat = transform.worldMatrix;
        let worldParams = this._worldParams;

        worldParams.x = this.owner.transform.getFrontFaceValue();
        shaderData.setMatrix4x4(Sprite3D.WORLDMATRIX, worldMat);
        shaderData.setVector(Sprite3D.WORLDINVERTFRONT, worldParams);

        this._baseRenderNode._applyLightProb();
        this._baseRenderNode._applyReflection();

        shaderData.setVector(SimpleSkinnedMeshRenderer.SIMPLE_SIMPLEANIMATORPARAMS, this._simpleAnimatorParams);
    }

    _cloneTo(dest: SimpleSkinnedMeshRenderer): void {
        dest.simpleAnimatorOffset = this.simpleAnimatorOffset;
        dest.simpleAnimatorTexture = this.simpleAnimatorTexture;
        dest._bonesNums = this._bonesNums;
        super._cloneTo(dest);
    }

    /**
     * 删除节点
     */
    protected _onDestroy() {
        if (this._cacheRootBone)
            (!this._cacheRootBone._destroyed) && (this._cacheRootBone.transform.off(Event.TRANSFORM_CHANGED, this, this._onWorldMatNeedChange));
        (this._simpleAnimatorTexture) && this._simpleAnimatorTexture._removeReference();
        this._simpleAnimatorTexture = null;
        super._onDestroy();
    }
}