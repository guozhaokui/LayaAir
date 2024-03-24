import { CullMode, FrontFace } from "../../../RenderEngine/RenderEnum/CullMode";
import { Shader3D } from "../../../RenderEngine/RenderShader/Shader3D";
import { ShaderPass } from "../../../RenderEngine/RenderShader/ShaderPass";
import { SubShader } from "../../../RenderEngine/RenderShader/SubShader";
import { Transform3D } from "../../../d3/core/Transform3D";
import { IRenderElement3D } from "../../DriverDesign/3DRenderPass/I3DRenderPass";
import { RenderState } from "../../RenderModuleData/Design/RenderState";
import { WebBaseRenderNode } from "../../RenderModuleData/WebModuleData/3D/WebBaseRenderNode";
import { WebDefineDatas } from "../../RenderModuleData/WebModuleData/WebDefineDatas";
import { WebGPURenderBundle } from "../RenderDevice/WebGPUBundle/WebGPURenderBundle";
import { WebGPUInternalRT } from "../RenderDevice/WebGPUInternalRT";
import { WebGPURenderCommandEncoder } from "../RenderDevice/WebGPURenderCommandEncoder";
import { WebGPURenderGeometry } from "../RenderDevice/WebGPURenderGeometry";
import {
    IRenderPipelineInfo,
    WebGPUBlendState,
    WebGPUBlendStateCache,
    WebGPUDepthStencilState,
    WebGPUDepthStencilStateCache,
    WebGPUPrimitiveState,
    WebGPURenderPipeline
} from "../RenderDevice/WebGPURenderPipelineHelper";
import { WebGPUShaderData } from "../RenderDevice/WebGPUShaderData";
import { WebGPUShaderInstance } from "../RenderDevice/WebGPUShaderInstance";
import { WebGPUGlobal } from "../RenderDevice/WebGPUStatis/WebGPUGlobal";
import { WebGPURenderContext3D } from "./WebGPURenderContext3D";

export class WebGPURenderElement3D implements IRenderElement3D, IRenderPipelineInfo {
    static _compileDefine: WebDefineDatas = new WebDefineDatas();

    private _sceneData: WebGPUShaderData;
    private _cameraData: WebGPUShaderData;
    renderShaderData: WebGPUShaderData;
    materialShaderData: WebGPUShaderData;
    materialRenderQueue: number;
    transform: Transform3D;
    canDynamicBatch: boolean;
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

    private _stateKey: string[] = []; //用于判断渲染状态是否改变
    private _stateKeyCounter: number = 0; //用于控制stateKey计算频率
    private _shaderInstances: WebGPUShaderInstance[] = [];
    private _pipelineCache: GPURenderPipeline[] = [];

    //是否启用GPU资源缓存机制
    useCache: boolean = WebGPUGlobal.useCache;

    //着色器数据状态，如果状态改变了，说明需要重建资源，否则直接使用缓存
    private _shaderDataState: number[] = [];

    bundleId: number; //用于bundle管理（被bundle管理器识别）
    needClearBundle: boolean = false; //是否需要清除bundle（bindGroup，pipeline等改变都需要清除指令缓存）
    static bundleIdCounter: number = 0;
    
    globalId: number;
    objectName: string = 'WebGPURenderElement3D';

    constructor() {
        //this.globalId = WebGPUGlobal.getId(this);
        this.bundleId = WebGPURenderElement3D.bundleIdCounter++;
    }

    protected _getInvertFront(): boolean {
        const transform = this.owner?.transform;
        return transform ? transform._isFrontFaceInvert : false;
    }

    /**
     * 编译着色器
     * @param context 
     */
    protected _compileShader(context: WebGPURenderContext3D) {
        const passes = this.subShader._passes;

        const comDef = WebGPURenderElement3D._compileDefine;
        //将场景或全局配置的定义一次性准备好
        if (context.sceneData) {
            context.sceneData._defineDatas.cloneTo(comDef);
        } else context.globalConfigShaderData.cloneTo(comDef);

        //添加相机数据定义
        if (context.cameraData)
            comDef.addDefineDatas(context.cameraData._defineDatas);

        this._shaderInstances.length = 0;
        for (let i = 0, m = passes.length; i < m; i++) {
            const pass = passes[i];
            if (pass.pipelineMode !== context.pipelineMode) continue;

            if (this.renderShaderData)
                comDef.addDefineDatas(this.renderShaderData.getDefineData());
            comDef.addDefineDatas(this.materialShaderData._defineDatas);
            pass.nodeCommonMap = this.owner ? this.owner._commonUniformMap : null;

            //获取shaderInstance，会先查找缓存，如果没有则创建
            const shaderInstance = pass.withCompile(comDef) as WebGPUShaderInstance;
            this._shaderInstances[i] = shaderInstance;

            context.sceneData?.createUniformBuffer(shaderInstance.uniformInfo[0], true);
            context.cameraData?.createUniformBuffer(shaderInstance.uniformInfo[1], true);
            this.renderShaderData?.createUniformBuffer(shaderInstance.uniformInfo[2]);
            this.materialShaderData.createUniformBuffer(shaderInstance.uniformInfo[3]);
        }

        //重编译着色器后，清理绑定组缓存
        if (this.renderShaderData)
            this.renderShaderData.clearBindGroup();
        if (this.materialShaderData)
            this.materialShaderData.clearBindGroup();

        //强制stateKey重新计算
        this._stateKeyCounter = 0;
    }

    private _calcStateKey(shaderInstance: WebGPUShaderInstance, dest: WebGPUInternalRT, context: WebGPURenderContext3D) {
        this._getBlendState(shaderInstance);
        this._getDepthStencilState(shaderInstance, dest);
        this._getCullFrontMode(this.materialShaderData, shaderInstance, this._invertFrontFace, context.invertY);
        const primitiveState = WebGPUPrimitiveState.getGPUPrimitiveState(this.geometry.mode, this.frontFace, this.cullMode);
        const bufferState = this.geometry.bufferState;
        const depthStencilId = this.depthStencilState ? this.depthStencilState.id : -1;
        return `${shaderInstance._id}_${primitiveState.key}_${this.blendState.key}_${depthStencilId}_${dest.formatId}_${bufferState.id}_${bufferState.updateBufferLayoutFlag}`;
    }

    private _getWebGPURenderPipeline(shaderInstance: WebGPUShaderInstance,
        dest: WebGPUInternalRT, context: WebGPURenderContext3D, entries: any): GPURenderPipeline {
        this._getBlendState(shaderInstance);
        this._getDepthStencilState(shaderInstance, dest);
        this._getCullFrontMode(this.materialShaderData, shaderInstance, this._invertFrontFace, context.invertY);
        return WebGPURenderPipeline.getRenderPipeline(this, shaderInstance, dest, entries);
    }

    private _getBlendState(shader: WebGPUShaderInstance) {
        if ((shader._shaderPass as ShaderPass).statefirst)
            this.blendState = this._getRenderStateBlendByShader(this.materialShaderData, shader);
        else this.blendState = this._getRenderStateBlendByMaterial(this.materialShaderData);
    }

    private _getRenderStateBlendByShader(shaderData: WebGPUShaderData, shader: WebGPUShaderInstance) {
        const data = shaderData.getData();
        const renderState = (shader._shaderPass as ShaderPass).renderState;
        const blend = (renderState.blend ?? data[Shader3D.BLEND]) ?? RenderState.Default.blend;
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
                const blendEquation = (renderState.blendEquation ?? data[Shader3D.BLEND_EQUATION]) ?? RenderState.Default.blendEquation;
                const srcBlend = (renderState.srcBlend ?? data[Shader3D.BLEND_SRC]) ?? RenderState.Default.srcBlend;
                const dstBlend = (renderState.dstBlend ?? data[Shader3D.BLEND_DST]) ?? RenderState.Default.dstBlend;
                blendState = WebGPUBlendState.getBlendState(blend, blendEquation, srcBlend, dstBlend, blendEquation, srcBlend, dstBlend);
                break;
            case RenderState.BLEND_ENABLE_SEPERATE:
                const blendEquationRGB = (renderState.blendEquationRGB ?? data[Shader3D.BLEND_EQUATION_RGB]) ?? RenderState.Default.blendEquationRGB;
                const blendEquationAlpha = (renderState.blendEquationAlpha ?? data[Shader3D.BLEND_EQUATION_ALPHA]) ?? RenderState.Default.blendEquationAlpha;
                const srcRGB = (renderState.srcBlendRGB ?? data[Shader3D.BLEND_SRC_RGB]) ?? RenderState.Default.srcBlendRGB;
                const dstRGB = (renderState.dstBlendRGB ?? data[Shader3D.BLEND_DST_RGB]) ?? RenderState.Default.dstBlendRGB;
                const srcAlpha = (renderState.srcBlendAlpha ?? data[Shader3D.BLEND_SRC_ALPHA]) ?? RenderState.Default.srcBlendAlpha;
                const dstAlpha = (renderState.dstBlendAlpha ?? data[Shader3D.BLEND_DST_ALPHA]) ?? RenderState.Default.dstBlendAlpha;
                blendState = WebGPUBlendState.getBlendState(blend, blendEquationRGB, srcRGB, dstRGB, blendEquationAlpha, srcAlpha, dstAlpha);
                break;
            default:
                throw "blendState set error";
        }
        return blendState;
    }

    private _getRenderStateBlendByMaterial(shaderData: WebGPUShaderData) {
        const data = shaderData.getData();
        const blend = data[Shader3D.BLEND] ?? RenderState.Default.blend;
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
                let blendEquation: any = data[Shader3D.BLEND_EQUATION];
                blendEquation = blendEquation ?? RenderState.Default.blendEquation;

                let srcBlend: any = data[Shader3D.BLEND_SRC];
                srcBlend = srcBlend ?? RenderState.Default.srcBlend;

                let dstBlend: any = data[Shader3D.BLEND_DST];
                dstBlend = dstBlend ?? RenderState.Default.dstBlend;

                blendState = WebGPUBlendState.getBlendState(blend, blendEquation, srcBlend, dstBlend, blendEquation, srcBlend, dstBlend);
                break;
            case RenderState.BLEND_ENABLE_SEPERATE:
                let blendEquationRGB: any = data[Shader3D.BLEND_EQUATION_RGB];
                blendEquationRGB = blendEquationRGB ?? RenderState.Default.blendEquationRGB;

                let blendEquationAlpha: any = data[Shader3D.BLEND_EQUATION_ALPHA];
                blendEquationAlpha = blendEquationAlpha ?? RenderState.Default.blendEquationAlpha;

                let srcRGB: any = data[Shader3D.BLEND_SRC_RGB];
                srcRGB = srcRGB ?? RenderState.Default.srcBlendRGB;

                let dstRGB: any = data[Shader3D.BLEND_DST_RGB];
                dstRGB = dstRGB ?? RenderState.Default.dstBlendRGB;

                let srcAlpha: any = data[Shader3D.BLEND_SRC_ALPHA];
                srcAlpha = srcAlpha ?? RenderState.Default.srcBlendAlpha;

                let dstAlpha: any = data[Shader3D.BLEND_DST_ALPHA];
                dstAlpha = dstAlpha ?? RenderState.Default.dstBlendAlpha;

                blendState = WebGPUBlendState.getBlendState(blend, blendEquationRGB, srcRGB, dstRGB, blendEquationAlpha, srcAlpha, dstAlpha);
                break;
            default:
                throw "blendState set error";
        }
        return blendState;
    }

    private _getDepthStencilState(shader: WebGPUShaderInstance, dest: WebGPUInternalRT): void {
        if (dest._depthTexture) {
            if ((shader._shaderPass as ShaderPass).statefirst)
                this.depthStencilState = this._getRenderStateDepthByShader(this.materialShaderData, shader, dest);
            else this.depthStencilState = this._getRenderStateDepthByMaterial(this.materialShaderData, dest);
        } else this.depthStencilState = null;
    }

    private _getRenderStateDepthByShader(shaderData: WebGPUShaderData, shader: WebGPUShaderInstance, dest: WebGPUInternalRT) {
        const data = shaderData.getData();
        const renderState = (<ShaderPass>shader._shaderPass).renderState;
        const depthWrite = (renderState.depthWrite ?? data[Shader3D.DEPTH_WRITE]) ?? RenderState.Default.depthWrite;
        const depthTest = (renderState.depthTest ?? data[Shader3D.DEPTH_TEST]) ?? RenderState.Default.depthTest;
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
        const data = shaderData.getData();
        const depthWrite = data[Shader3D.DEPTH_WRITE] ?? RenderState.Default.depthWrite;
        const depthTest = data[Shader3D.DEPTH_TEST] ?? RenderState.Default.depthTest;
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
        // if (stencilTest === RenderState.STENCILTEST_OFF) {
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
        const renderState = (<ShaderPass>shader._shaderPass).renderState;
        const data = shaderData.getData();
        let cull = data[Shader3D.CULL];
        if ((<ShaderPass>shader._shaderPass).statefirst)
            cull = renderState.cull ?? cull;
        cull = cull ?? RenderState.Default.cull;
        switch (cull) {
            case RenderState.CULL_NONE:
                this.cullMode = CullMode.Off;
                if (isTarget !== invertFront)
                    this.frontFace = FrontFace.CCW;
                else this.frontFace = FrontFace.CW;
                break;
            case RenderState.CULL_FRONT:
                this.cullMode = CullMode.Front;
                if (isTarget === invertFront)
                    this.frontFace = FrontFace.CCW;
                else this.frontFace = FrontFace.CW;
                break;
            case RenderState.CULL_BACK:
            default:
                this.cullMode = CullMode.Back;
                if (isTarget !== invertFront)
                    this.frontFace = FrontFace.CCW;
                else this.frontFace = FrontFace.CW;
                break;
        }
    }

    /**
     * 渲染前更新
     * @param context 
     */
    _preUpdatePre(context: WebGPURenderContext3D) {
        let compile = false;
        this._sceneData = context.sceneData;
        this._cameraData = context.cameraData;
        if (!this.renderShaderData)
            this.renderShaderData = new WebGPUShaderData();
        if (this.transform?.owner?.isStatic)
            this.renderShaderData.isStatic = true;
        //只在数据发生变化的时候才重新编译
        if (this._isShaderDataChange(context)) {
            this._compileShader(context);
            compile = true;
        }
        this._invertFrontFace = this._getInvertFront();
        return compile;
    }

    /**
     * 着色器数据是否改变
     * @param context 
     */
    private _isShaderDataChange(context: WebGPURenderContext3D) {
        let change = false;
        if (this._sceneData) {
            if (this._shaderDataState[0] != this._sceneData.changeMark) {
                this._shaderDataState[0] = this._sceneData.changeMark;
                change = true;
            }
        }
        if (this._cameraData) {
            if (this._shaderDataState[1] != this._cameraData.changeMark) {
                this._shaderDataState[1] = this._cameraData.changeMark;
                change = true;
            }
        }
        if (this.renderShaderData) {
            if (this._shaderDataState[2] != this.renderShaderData.changeMark) {
                this._shaderDataState[2] = this.renderShaderData.changeMark;
                change = true;
            }
        }
        if (this.materialShaderData) {
            if (this._shaderDataState[3] != this.materialShaderData.changeMark) {
                this._shaderDataState[3] = this.materialShaderData.changeMark;
                change = true;
            }
        }
        return change;
    }

    /**
     * 用于创建渲染管线的函数
     * @param sn 
     * @param context 
     * @param shaderInstance 
     * @param command 
     * @param bundle 
     * @param stateKey 
     */
    _createPipeline(sn: number, context: WebGPURenderContext3D, shaderInstance: WebGPUShaderInstance,
        command: WebGPURenderCommandEncoder, bundle: WebGPURenderBundle, stateKey?: string) {
        let complete = true;
        let entries: GPUBindGroupLayoutEntry[];
        const bindGroupLayout = [];

        if (this._sceneData) {
            entries = this._sceneData.bindGroup(0, 'scene3D', shaderInstance.uniformSetMap[0], command, bundle);
            if (!entries)
                complete = false;
            else {
                this._sceneData.uploadUniform();
                bindGroupLayout.push(entries);
            }
            if (this._sceneData.bindGroupIsNew)
                this.needClearBundle = true;
        }
        if (this._cameraData) {
            entries = this._cameraData.bindGroup(1, 'camera', shaderInstance.uniformSetMap[1], command, bundle);
            if (!entries)
                complete = false;
            else {
                this._cameraData.uploadUniform();
                bindGroupLayout.push(entries);
            }
            if (this._cameraData.bindGroupIsNew)
                this.needClearBundle = true;
        }
        if (this.renderShaderData) {
            this.renderShaderData.isShare = false;
            entries = this.renderShaderData.bindGroup(2, 'sprite3D', shaderInstance.uniformSetMap[2], command, bundle);
            if (!entries)
                complete = false;
            else {
                this.renderShaderData.uploadUniform();
                bindGroupLayout.push(entries);
            }
            if (this.renderShaderData.bindGroupIsNew)
                this.needClearBundle = true;
        }
        if (this.materialShaderData) {
            this.materialShaderData.isShare = false;
            entries = this.materialShaderData.bindGroup(3, 'material', shaderInstance.uniformSetMap[3], command, bundle);
            if (!entries)
                complete = false;
            else {
                this.materialShaderData.uploadUniform();
                bindGroupLayout.push(entries);
            }
            if (this.materialShaderData.bindGroupIsNew)
                this.needClearBundle = true;
        }

        if (complete) {
            const pipeline = this._getWebGPURenderPipeline(shaderInstance, context.destRT, context, bindGroupLayout);
            if (command) {
                command.setPipeline(pipeline);
                command.applyGeometry(this.geometry);
                //console.log('applyCommandGeometry1');
            }
            if (bundle) {
                bundle.setPipeline(pipeline);
                bundle.applyGeometry(this.geometry);
                //console.log('applyBundleGeometry1');
            }
            if (this.useCache) {
                this._pipelineCache[sn] = pipeline;
                this._stateKey[sn] = stateKey;
            }
        }
    };

    /**
     * 渲染
     * @param context 
     * @param command 
     * @param bundle 
     */
    _render(context: WebGPURenderContext3D, command: WebGPURenderCommandEncoder, bundle: WebGPURenderBundle) {
        if (this.isRender) {
            let stateKey;
            for (let i = 0, len = this._shaderInstances.length; i < len; i++) {
                const shaderInstance = this._shaderInstances[i];
                if (shaderInstance.complete) {
                    if (this.useCache) { //启用缓存机制
                        if (this._stateKeyCounter % 10 == 0)
                            stateKey = this._calcStateKey(shaderInstance, context.destRT, context);
                        else stateKey = this._stateKey[i];
                        if (stateKey != this._stateKey[i] || !this._pipelineCache[i])
                            this._createPipeline(i, context, shaderInstance, command, bundle, stateKey); //新建渲染管线
                        else { //使用缓存
                            let complete = true;
                            if (this._sceneData) {
                                if (command || bundle) {
                                    if (!this._sceneData.bindGroup(0, 'scene3D', shaderInstance.uniformSetMap[0], command, bundle))
                                        complete = false;
                                    else this._sceneData.uploadUniform();
                                } else this._sceneData.uploadUniform();
                                if (this._sceneData.bindGroupIsNew)
                                    this.needClearBundle = true;
                            }
                            if (this._cameraData) {
                                if (command || bundle) {
                                    if (!this._cameraData.bindGroup(1, 'camera', shaderInstance.uniformSetMap[1], command, bundle))
                                        complete = false;
                                    else this._cameraData.uploadUniform();
                                } else this._cameraData.uploadUniform();
                                if (this._cameraData.bindGroupIsNew)
                                    this.needClearBundle = true;
                            }
                            if (this.renderShaderData) {
                                if (command || bundle) {
                                    if (!this.renderShaderData.bindGroup(2, 'sprite3D', shaderInstance.uniformSetMap[2], command, bundle))
                                        complete = false;
                                    else this.renderShaderData.uploadUniform();
                                } else this.renderShaderData.uploadUniform();
                                if (this.renderShaderData.bindGroupIsNew)
                                    this.needClearBundle = true;
                            }
                            if (this.materialShaderData) {
                                if (command || bundle) {
                                    if (!this.materialShaderData.bindGroup(3, 'material', shaderInstance.uniformSetMap[3], command, bundle))
                                        complete = false;
                                    else this.materialShaderData.uploadUniform();
                                } else this.materialShaderData.uploadUniform();
                                if (this.materialShaderData.bindGroupIsNew)
                                    this.needClearBundle = true;
                            }
                            if (complete) {
                                if (command) {
                                    command.setPipeline(this._pipelineCache[i]);
                                    command.applyGeometry(this.geometry);
                                    //console.log('applyCommandGeometry2');
                                }
                                if (bundle) {
                                    bundle.setPipeline(this._pipelineCache[i]);
                                    bundle.applyGeometry(this.geometry);
                                    //console.log('applyBundleGeometry2');
                                }
                            }
                        }
                    } else this._createPipeline(i, context, shaderInstance, command, bundle); //不启用缓存机制
                }
            }
            this._stateKeyCounter++;
        }
    }

    destroy(): void {
        WebGPUGlobal.releaseId(this);
        this._shaderInstances.length = 0;
        this._pipelineCache.length = 0;
        this._stateKey.length = 0;
    }
}