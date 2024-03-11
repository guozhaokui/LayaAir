import { CullMode, FrontFace } from "../../../RenderEngine/RenderEnum/CullMode";
import { Shader3D } from "../../../RenderEngine/RenderShader/Shader3D";
import { ShaderPass } from "../../../RenderEngine/RenderShader/ShaderPass";
import { SubShader } from "../../../RenderEngine/RenderShader/SubShader";
import { Transform3D } from "../../../d3/core/Transform3D";
import { SingletonList } from "../../../utils/SingletonList";
import { IRenderElement3D } from "../../DriverDesign/3DRenderPass/I3DRenderPass";
import { RenderState } from "../../RenderModuleData/Design/RenderState";
import { WebBaseRenderNode } from "../../RenderModuleData/WebModuleData/3D/WebBaseRenderNode";
import { WebDefineDatas } from "../../RenderModuleData/WebModuleData/WebDefineDatas";
import { WebGPUInternalRT } from "../RenderDevice/WebGPUInternalRT";
import { WebGPURenderGeometry } from "../RenderDevice/WebGPURenderGeometry";
import { IRenderPipelineInfo, WebGPUBlendState, WebGPUBlendStateCache, WebGPUDepthStencilState, WebGPUDepthStencilStateCache, WebGPURenderPipeline } from "../RenderDevice/WebGPURenderPipelineHelper";
import { WebGPUShaderData } from "../RenderDevice/WebGPUShaderData";
import { WebGPUShaderInstance } from "../RenderDevice/WebGPUShaderInstance";
import { WebGPURenderContext3D } from "./WebGPURenderContext3D";

export class WebGPURenderElement3D implements IRenderElement3D, IRenderPipelineInfo {
    /** @internal */
    static _compileDefine: WebDefineDatas = new WebDefineDatas();

    materialShaderData: WebGPUShaderData;
    materialRenderQueue: number;
    renderShaderData: WebGPUShaderData;
    transform: Transform3D;
    isRender: boolean;
    owner: WebBaseRenderNode;
    subShader: SubShader;
    materialId: number;
    geometry: WebGPURenderGeometry;
    blendState: WebGPUBlendStateCache;
    depthStencilState: WebGPUDepthStencilStateCache;
    cullMode: CullMode;
    frontFace: FrontFace;
    private _invertFrontFace: boolean;
    protected _shaderInstances: SingletonList<WebGPUShaderInstance> = new SingletonList<WebGPUShaderInstance>();

    protected _getInvertFront(): boolean {
        const transform = this.owner?.transform;
        return transform ? transform._isFrontFaceInvert : false;
    }

    protected _compileShader(context: WebGPURenderContext3D) {
        const passes: ShaderPass[] = this.subShader._passes;
        this._clearShaderInstance();

        for (let i = 0, m = passes.length; i < m; i++) {
            const pass: ShaderPass = passes[i];
            //NOTE: this will cause maybe a shader not render but do prepare before，
            //but the developer can avoide this manual, for example: shaderCaster = false.
            if (pass.pipelineMode !== context.pipelineMode)
                continue;

            const comDef = WebGPURenderElement3D._compileDefine;
            if (context.sceneData)
                context.sceneData._defineDatas.cloneTo(comDef);
            else context.globalConfigShaderData.cloneTo(comDef);

            context.cameraData && comDef.addDefineDatas(context.cameraData._defineDatas);
            if (this.renderShaderData && this.owner) {
                comDef.addDefineDatas(this.renderShaderData.getDefineData());
                pass.nodeCommonMap = this.owner._commonUniformMap;
            } else pass.nodeCommonMap = null;
            comDef.addDefineDatas(this.materialShaderData._defineDatas);

            const shaderInstance = pass.withCompile(comDef) as WebGPUShaderInstance;
            this.materialShaderData.setUniformBuffers(shaderInstance.uniformBuffers);
            this._addShaderInstance(shaderInstance);
        }
    }

    private _addShaderInstance(shader: WebGPUShaderInstance) {
        this._shaderInstances.add(shader);
    }

    private _clearShaderInstance() {
        this._shaderInstances.length = 0;
    }

    private _getWebGPURenderPipeline(shaderInstance: WebGPUShaderInstance, dest: WebGPUInternalRT, context: WebGPURenderContext3D): GPURenderPipeline {
        this._getBlendState(shaderInstance);
        this._getDepthStencilState(shaderInstance, dest);
        this._getCullFrontMode(this.materialShaderData, shaderInstance, this._invertFrontFace, context.invertY);
        return WebGPURenderPipeline.getRenderPipeline(this, shaderInstance, dest);
    }

    private _getBlendState(shader: WebGPUShaderInstance): void {
        if ((shader._shaderPass as ShaderPass).statefirst)
            this.blendState = this._getRenderStateBlendByShader(this.materialShaderData, shader);
        else this.blendState = this._getRenderStateBlendByMaterial(this.materialShaderData, shader);
    }

    private _getRenderStateBlendByShader(shaderData: WebGPUShaderData, shader: WebGPUShaderInstance) {
        const datas: any = shaderData.getData();
        const renderState = (shader._shaderPass as ShaderPass).renderState;
        const blend: any = (renderState.blend ?? datas[Shader3D.BLEND]) ?? RenderState.Default.blend;
        let blendState: any;
        switch (blend) {
            case RenderState.BLEND_DISABLE:
                blendState = WebGPUBlendState.getBlendState(blend,
                    RenderState.BLENDEQUATION_ADD,
                    RenderState.BLENDPARAM_ONE,
                    RenderState.BLENDPARAM_ZERO,
                    RenderState.BLENDEQUATION_ADD,
                    RenderState.BLENDPARAM_ONE,
                    RenderState.BLENDPARAM_ZERO,
                );
                break;
            case RenderState.BLEND_ENABLE_ALL:
                const blendEquation = (renderState.blendEquation ?? datas[Shader3D.BLEND_EQUATION]) ?? RenderState.Default.blendEquation;
                const srcBlend = (renderState.srcBlend ?? datas[Shader3D.BLEND_SRC]) ?? RenderState.Default.srcBlend;
                const dstBlend = (renderState.dstBlend ?? datas[Shader3D.BLEND_DST]) ?? RenderState.Default.dstBlend;
                blendState = WebGPUBlendState.getBlendState(blend, blendEquation, srcBlend, dstBlend, blendEquation, srcBlend, dstBlend);
                break;
            case RenderState.BLEND_ENABLE_SEPERATE:
                const blendEquationRGB = (renderState.blendEquationRGB ?? datas[Shader3D.BLEND_EQUATION_RGB]) ?? RenderState.Default.blendEquationRGB;
                const blendEquationAlpha = (renderState.blendEquationAlpha ?? datas[Shader3D.BLEND_EQUATION_ALPHA]) ?? RenderState.Default.blendEquationAlpha;
                const srcRGB = (renderState.srcBlendRGB ?? datas[Shader3D.BLEND_SRC_RGB]) ?? RenderState.Default.srcBlendRGB;
                const dstRGB = (renderState.dstBlendRGB ?? datas[Shader3D.BLEND_DST_RGB]) ?? RenderState.Default.dstBlendRGB;
                const srcAlpha = (renderState.srcBlendAlpha ?? datas[Shader3D.BLEND_SRC_ALPHA]) ?? RenderState.Default.srcBlendAlpha;
                const dstAlpha = (renderState.dstBlendAlpha ?? datas[Shader3D.BLEND_DST_ALPHA]) ?? RenderState.Default.dstBlendAlpha;
                blendState = WebGPUBlendState.getBlendState(blend, blendEquationRGB, srcRGB, dstRGB, blendEquationAlpha, srcAlpha, dstAlpha);
                break;
            default:
                throw "blendState set error";
        }
        return blendState;
    }

    private _getRenderStateBlendByMaterial(shaderData: WebGPUShaderData, shader: WebGPUShaderInstance) {
        //这个可以缓存ID TODO 优化
        const datas: any = shaderData.getData();
        let blend: any = datas[Shader3D.BLEND];
        let blendState: any;
        blend = blend ?? RenderState.Default.blend;
        switch (blend) {
            case RenderState.BLEND_DISABLE:
                blendState = WebGPUBlendState.getBlendState(blend,
                    RenderState.BLENDEQUATION_ADD,
                    RenderState.BLENDPARAM_ONE,
                    RenderState.BLENDPARAM_ZERO,
                    RenderState.BLENDEQUATION_ADD,
                    RenderState.BLENDPARAM_ONE,
                    RenderState.BLENDPARAM_ZERO,
                );
                break;
            case RenderState.BLEND_ENABLE_ALL:
                let blendEquation: any = datas[Shader3D.BLEND_EQUATION];
                blendEquation = blendEquation ?? RenderState.Default.blendEquation;

                let srcBlend: any = datas[Shader3D.BLEND_SRC];
                srcBlend = srcBlend ?? RenderState.Default.srcBlend;

                let dstBlend: any = datas[Shader3D.BLEND_DST];
                dstBlend = dstBlend ?? RenderState.Default.dstBlend;

                blendState = WebGPUBlendState.getBlendState(blend, blendEquation, srcBlend, dstBlend, blendEquation, srcBlend, dstBlend);
                break;
            case RenderState.BLEND_ENABLE_SEPERATE:
                let blendEquationRGB: any = datas[Shader3D.BLEND_EQUATION_RGB];
                blendEquationRGB = blendEquationRGB ?? RenderState.Default.blendEquationRGB;

                let blendEquationAlpha: any = datas[Shader3D.BLEND_EQUATION_ALPHA];
                blendEquationAlpha = blendEquationAlpha ?? RenderState.Default.blendEquationAlpha;

                let srcRGB: any = datas[Shader3D.BLEND_SRC_RGB];
                srcRGB = srcRGB ?? RenderState.Default.srcBlendRGB;

                let dstRGB: any = datas[Shader3D.BLEND_DST_RGB];
                dstRGB = dstRGB ?? RenderState.Default.dstBlendRGB;

                let srcAlpha: any = datas[Shader3D.BLEND_SRC_ALPHA];
                srcAlpha = srcAlpha ?? RenderState.Default.srcBlendAlpha;

                let dstAlpha: any = datas[Shader3D.BLEND_DST_ALPHA];
                dstAlpha = dstAlpha ?? RenderState.Default.dstBlendAlpha;

                blendState = WebGPUBlendState.getBlendState(blend, blendEquationRGB, srcRGB, dstRGB, blendEquationAlpha, srcAlpha, dstAlpha);
                break;
            default:
                throw "blendState set error";
        }
        return blendState;
    }

    private _getDepthStencilState(shader: WebGPUShaderInstance, dest: WebGPUInternalRT): void {
        if ((shader._shaderPass as ShaderPass).statefirst)
            this.depthStencilState = this._getRenderStateDepthByShader(this.materialShaderData, shader, dest);
        else this.depthStencilState = this._getRenderStateDepthByMaterial(this.materialShaderData, dest);
    }

    private _getRenderStateDepthByShader(shaderData: WebGPUShaderData, shader: WebGPUShaderInstance, dest: WebGPUInternalRT) {
        const datas: any = shaderData.getData();
        const renderState: RenderState = (<ShaderPass>shader._shaderPass).renderState;
        const depthWrite: any = (renderState.depthWrite ?? datas[Shader3D.DEPTH_WRITE]) ?? RenderState.Default.depthWrite;
        const depthTest: any = (renderState.depthTest ?? datas[Shader3D.DEPTH_TEST]) ?? RenderState.Default.depthTest;
        return WebGPUDepthStencilState.getDepthStencilState(dest.depthStencilFormat, depthWrite, depthTest);
        //Stencil
        // var stencilWrite: any = (renderState.stencilWrite ?? datas[Shader3D.STENCIL_WRITE]) ?? RenderState.Default.stencilWrite;
        // var stencilWrite: any = (renderState.stencilWrite ?? datas[Shader3D.STENCIL_WRITE]) ?? RenderState.Default.stencilWrite;
        // var stencilTest: any = (renderState.stencilTest ?? datas[Shader3D.STENCIL_TEST]) ?? RenderState.Default.stencilTest;
        // RenderStateContext.setStencilMask(stencilWrite);
        // if (stencilWrite) {
        // 	var stencilOp: any = (renderState.stencilOp ?? datas[Shader3D.STENCIL_Op]) ?? RenderState.Default.stencilOp;
        // 	RenderStateContext.setstencilOp(stencilOp.x, stencilOp.y, stencilOp.z);
        // }
        // if (stencilTest == RenderState.STENCILTEST_OFF) {
        // 	RenderStateContext.setStencilTest(false);
        // } else {
        // 	var stencilRef: any = (renderState.stencilRef ?? datas[Shader3D.STENCIL_Ref]) ?? RenderState.Default.stencilRef;
        // 	RenderStateContext.setStencilTest(true);
        // 	RenderStateContext.setStencilFunc(stencilTest, stencilRef);
        // }
    }

    private _getRenderStateDepthByMaterial(shaderData: WebGPUShaderData, dest: WebGPUInternalRT) {
        const datas: any = shaderData.getData();
        let depthWrite = datas[Shader3D.DEPTH_WRITE];
        depthWrite = depthWrite ?? RenderState.Default.depthWrite;

        let depthTest = datas[Shader3D.DEPTH_TEST];
        depthTest = depthTest ?? RenderState.Default.depthTest;
        return WebGPUDepthStencilState.getDepthStencilState(dest.depthStencilFormat, depthWrite, depthTest);
        // if (depthTest === RenderState.DEPTHTEST_OFF) {
        // 	RenderStateContext.setDepthTest(false);
        // }
        // else {
        // 	RenderStateContext.setDepthTest(true);
        // 	RenderStateContext.setDepthFunc(depthTest);
        // }

        // //Stencil
        // var stencilWrite = datas[Shader3D.STENCIL_WRITE];
        // stencilWrite = stencilWrite ?? RenderState.Default.stencilWrite;
        // RenderStateContext.setStencilMask(stencilWrite);
        // if (stencilWrite) {
        // 	var stencilOp = datas[Shader3D.STENCIL_Op];
        // 	stencilOp = stencilOp ?? RenderState.Default.stencilOp;
        // 	RenderStateContext.setstencilOp(stencilOp.x, stencilOp.y, stencilOp.z);
        // }

        // var stencilTest = datas[Shader3D.STENCIL_TEST];
        // stencilTest = stencilTest ?? RenderState.Default.stencilTest;
        // if (stencilTest == RenderState.STENCILTEST_OFF) {
        // 	RenderStateContext.setStencilTest(false);
        // }
        // else {
        // 	var stencilRef = datas[Shader3D.STENCIL_Ref];
        // 	stencilRef = stencilRef ?? RenderState.Default.stencilRef;
        // 	RenderStateContext.setStencilTest(true);
        // 	RenderStateContext.setStencilFunc(stencilTest, stencilRef);
        // }
    }

    private _getCullFrontMode(shaderData: WebGPUShaderData, shader: WebGPUShaderInstance, isTarget: boolean, invertFront: boolean) {
        const renderState: RenderState = (<ShaderPass>shader._shaderPass).renderState;
        const datas: any = shaderData.getData();
        let cull: any = datas[Shader3D.CULL];
        if ((<ShaderPass>shader._shaderPass).statefirst)
            cull = renderState.cull ?? cull;
        cull = cull ?? RenderState.Default.cull;
        switch (cull) {
            case RenderState.CULL_NONE:
                this.cullMode = CullMode.Off;
                if (isTarget != invertFront)
                    this.frontFace = FrontFace.CCW;
                else this.frontFace = FrontFace.CW;
                break;
            case RenderState.CULL_FRONT:
                this.cullMode = CullMode.Front;
                if (isTarget == invertFront)
                    this.frontFace = FrontFace.CCW;
                else this.frontFace = FrontFace.CW;
                break;
            case RenderState.CULL_BACK:
            default:
                this.cullMode = CullMode.Back;
                if (isTarget != invertFront)
                    this.frontFace = FrontFace.CCW;
                else this.frontFace = FrontFace.CW;
                break;
        }
    }

    _preUpdatePre(context: WebGPURenderContext3D) {
        this._compileShader(context);
        this._invertFrontFace = this._getInvertFront();
    }

    _render(context: WebGPURenderContext3D) {
        const sceneShaderData = context.sceneData as WebGPUShaderData;
        const cameraShaderData = context.cameraData as WebGPUShaderData;
        if (!this.renderShaderData)
            this.renderShaderData = new WebGPUShaderData();
        if (this.isRender) {
            const passes: WebGPUShaderInstance[] = this._shaderInstances.elements;
            for (let i = 0, m = passes.length; i < m; i++) {
                const shaderIns = passes[i];
                if (shaderIns.complete) {
                    let complete = true;
                    const pipeline = this._getWebGPURenderPipeline(shaderIns, context.destRT, context);
                    context.renderCommand.setPipeline(pipeline);
                    //scene
                    if (sceneShaderData)
                        if (!sceneShaderData.uploadUniform(0, shaderIns.uniformSetMap[0], context.renderCommand))
                            complete = false;
                    //camera
                    if (cameraShaderData)
                        if (!cameraShaderData.uploadUniform(1, shaderIns.uniformSetMap[1], context.renderCommand))
                            complete = false;
                    //render
                    if (this.renderShaderData)
                        if (!this.renderShaderData.uploadUniform(2, shaderIns.uniformSetMap[2], context.renderCommand))
                            complete = false;
                    //material
                    if (this.materialShaderData)
                        if (!this.materialShaderData.uploadUniform(3, shaderIns.uniformSetMap[3], context.renderCommand))
                            complete = false;
                    //draw
                    if (complete)
                        context.renderCommand.applyGeometry(this.geometry);
                }
            }
        }
    }

    destroy(): void {
        throw new Error("Method not implemented.");
    }
}