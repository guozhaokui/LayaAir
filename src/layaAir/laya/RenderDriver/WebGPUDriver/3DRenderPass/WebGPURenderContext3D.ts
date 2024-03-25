import { RenderClearFlag } from "../../../RenderEngine/RenderEnum/RenderClearFlag";
import { Viewport } from "../../../d3/math/Viewport";
import { Color } from "../../../maths/Color";
import { Vector4 } from "../../../maths/Vector4";
import { SingletonList } from "../../../utils/SingletonList";
import { IRenderContext3D, PipelineMode } from "../../DriverDesign/3DRenderPass/I3DRenderPass";
import { IRenderCMD } from "../../DriverDesign/3DRenderPass/IRendderCMD";
import { WebCameraNodeData, WebSceneNodeData } from "../../RenderModuleData/WebModuleData/3D/WebModuleData";
import { WebDefineDatas } from "../../RenderModuleData/WebModuleData/WebDefineDatas";
import { WebGPURenderBundleManager } from "../RenderDevice/WebGPUBundle/WebGPURenderBundleManager";
import { WebGPUInternalRT } from "../RenderDevice/WebGPUInternalRT";
import { WebGPURenderCommandEncoder } from "../RenderDevice/WebGPURenderCommandEncoder";
import { WebGPURenderEngine } from "../RenderDevice/WebGPURenderEngine";
import { WebGPURenderPassHelper } from "../RenderDevice/WebGPURenderPassHelper";
import { WebGPUShaderData } from "../RenderDevice/WebGPUShaderData";
import { WebGPUGlobal } from "../RenderDevice/WebGPUStatis/WebGPUGlobal";
import { WebGPUStatis } from "../RenderDevice/WebGPUStatis/WebGPUStatis";
import { WebGPUContext } from "./WebGPUContext";
import { WebGPURenderElement3D } from "./WebGPURenderElement3D";

/**
 * WebGPU渲染上下文
 */
export class WebGPURenderContext3D implements IRenderContext3D {
    globalConfigShaderData: WebDefineDatas;
    /**@internal */
    private _globalShaderData: WebGPUShaderData;
    /**@internal */
    private _sceneData: WebGPUShaderData;
    /**@internal */
    private _sceneModuleData: WebSceneNodeData;
    /**@internal */
    private _cameraModuleData: WebCameraNodeData;
    /**@internal */
    private _cameraData: WebGPUShaderData;
    /**@internal */
    private _viewPort: Viewport;
    /**@internal */
    private _scissor: Vector4;
    /**@internal */
    private _sceneUpdataMask: number = 0;
    /**@internal */
    private _cameraUpdateMask: number = 0;
    /**@internal */
    private _pipelineMode: PipelineMode;
    /**@internal */
    private _invertY: boolean;
    /**@internal */
    private _clearFlag: number;
    /**@internal */
    private _clearColor: Color = Color.BLACK;
    /**@internal */
    private _clearDepth: number;
    /**@internal */
    private _clearStencil: number;
    /**@internal */
    private _needStart: boolean = true;

    device: GPUDevice; //GPU设备
    bundleManager: WebGPURenderBundleManager = new WebGPURenderBundleManager(); //绘图指令缓存管理器
    elementsToBundleStatic: WebGPURenderElement3D[] = []; //需要创建绘图指令缓存的渲染节点（静态节点）
    elementsToBundleDynamic: WebGPURenderElement3D[] = []; //需要创建绘图指令缓存的渲染节点（动态节点）
    needRemoveBundle: number[] = []; //需要清除绘图指令缓存的渲染节点

    destRT: WebGPUInternalRT; //渲染目标
    renderCommand: WebGPURenderCommandEncoder = new WebGPURenderCommandEncoder(); //渲染命令编码器

    globalId: number;
    objectName: string = 'WebGPURenderContext3D';

    constructor() {
        this.globalId = WebGPUGlobal.getId(this);
        WebGPURenderEngine._instance.gpuBufferMgr.setRenderContext(this);
    }

    get sceneData(): WebGPUShaderData {
        return this._sceneData;
    }

    set sceneData(value: WebGPUShaderData) {
        this._sceneData = value;
    }

    get cameraData(): WebGPUShaderData {
        return this._cameraData;
    }

    set cameraData(value: WebGPUShaderData) {
        this._cameraData = value;
    }

    get sceneModuleData(): WebSceneNodeData {
        return this._sceneModuleData;
    }

    set sceneModuleData(value: WebSceneNodeData) {
        this._sceneModuleData = value;
    }

    get cameraModuleData(): WebCameraNodeData {
        return this._cameraModuleData;
    }

    set cameraModuleData(value: WebCameraNodeData) {
        this._cameraModuleData = value;
    }

    get globalShaderData(): WebGPUShaderData {
        return this._globalShaderData;
    }

    set globalShaderData(value: WebGPUShaderData) {
        this._globalShaderData = value;
    }

    get sceneUpdataMask(): number {
        return this._sceneUpdataMask;
    }

    set sceneUpdataMask(value: number) {
        this._sceneUpdataMask = value;
    }

    get cameraUpdateMask(): number {
        return this._cameraUpdateMask;
    }

    set cameraUpdateMask(value: number) {
        this._cameraUpdateMask = value;
    }

    get pipelineMode(): PipelineMode {
        return this._pipelineMode;
    }

    set pipelineMode(value: PipelineMode) {
        this._pipelineMode = value;
    }

    get invertY(): boolean {
        return this._invertY;
    }

    set invertY(value: boolean) {
        this._invertY = value;
    }

    setRenderTarget(rt: WebGPUInternalRT, clearFlag: RenderClearFlag): void {
        this._clearFlag = clearFlag;
        if (rt !== this.destRT) {
            this.destRT = rt;
            this._needStart = true;
        }
    }

    setViewPort(value: Viewport): void {
        this._viewPort = value;
    }

    setScissor(value: Vector4): void {
        this._scissor = value;
    }

    setClearData(flag: number, color: Color, depth: number, stencil: number): number {
        this._clearFlag = flag;
        this._clearDepth = depth;
        this._clearStencil = stencil;
        color.cloneTo(this._clearColor);
        return 0;
    }

    /**
     * 得到GPUBuffer改变的通知
     */
    notifyGPUBufferChange() {
        if (this.bundleManager)
            this.bundleManager.clearBundle();
    }

    /**
     * 渲染一组节点
     * @param list 
     */
    drawRenderElementList(list: SingletonList<WebGPURenderElement3D>): number {
        const len = list.length;
        if (len === 0) return 0; //没有需要渲染的对象
        this._setScreenRT(); //如果没有渲染目标，则将屏幕作为渲染目标
        if (this._needStart) {
            this._start(); //为录制渲染命令做准备
            this._needStart = false;
        }

        //如果使用全局上下文，先清除上下文缓存
        if (WebGPUGlobal.useGlobalContext)
            WebGPUContext.startRender();

        let compile = false;
        let canCreateBundle = true;
        const elements = list.elements;
        for (let i = 0; i < len; i++) {
            compile = elements[i]._preUpdatePre(this); //渲染前准备，如有必要，编译着色器
            if (WebGPUGlobal.useBundle) //如果着色器重新编译，则清除相应的绘图指令缓存
                if (compile || elements[i].staticChange) {
                    elements[i].staticChange = false;
                    this.bundleManager.removeBundleByElement(elements[i].bundleId);
                }
        }

        if (WebGPUGlobal.useBundle) { //启用绘图指令缓存模式
            let element: WebGPURenderElement3D;
            const needRemoveBundle = this.needRemoveBundle;
            for (let i = 0, n = needRemoveBundle.length; i < n; i++) //如果有需要清除的绘图指令缓存，先清除
                this.bundleManager.removeBundleByElement(needRemoveBundle[i]);
            needRemoveBundle.length = 0;
            this.bundleManager.removeLowShotBundle(); //清除低命中率的绘图指令缓存
            this.bundleManager.clearShot();
            for (let i = 0; i < len; i++) {
                element = elements[i];
                if (!this.bundleManager.has(element.bundleId)) { //如果该渲染节点没有在绘图指令缓存中
                    if (canCreateBundle) { //本帧是否允许创建绘图指令缓存（每帧只允许创建一个指令缓存，避免卡顿）
                        if (element.isStatic) {
                            if (this.elementsToBundleStatic.indexOf(element) === -1)
                                this.elementsToBundleStatic.push(element); //放入创建绘图指令缓存队列
                            if (this.elementsToBundleStatic.length >= this.bundleManager.elementsMaxPerBundleStatic) {
                                this.bundleManager.createBundle(this, this.elementsToBundleStatic, 0.7); //如果队列中的数量达到最大值，则创建批量绘图指令缓存
                                this.elementsToBundleStatic.length = 0;
                                canCreateBundle = false;
                            }
                        } else {
                            if (this.elementsToBundleDynamic.indexOf(element) === -1)
                                this.elementsToBundleDynamic.push(element); //放入创建绘图指令缓存队列
                            if (this.elementsToBundleDynamic.length >= this.bundleManager.elementsMaxPerBundleDynamic) {
                                this.bundleManager.createBundle(this, this.elementsToBundleDynamic, 1); //如果队列中的数量达到最大值，则创建批量绘图指令缓存
                                this.elementsToBundleDynamic.length = 0;
                                canCreateBundle = false;
                            }
                        }
                    }
                    element._render(this, this.renderCommand, null); //因为还没有在绘图指令缓存中，先直接渲染
                } else element._render(this, null, null); //将该节点的shaderData数据上传到GPU
            }
            this.bundleManager.renderBundles(this.renderCommand._encoder); //渲染所有绘图指令缓存
        } else { //不启用绘图指令缓存模式，直接绘制
            for (let i = 0; i < len; i++)
                elements[i]._render(this, this.renderCommand, null);
        }
        this._submit(); //提交渲染命令
        WebGPUStatis.addRenderElement(list.length); //统计渲染节点数量
        return 0;
    }

    /**
     * 渲染一个节点
     * @param node 
     */
    drawRenderElementOne(node: WebGPURenderElement3D): number {
        this._setScreenRT();
        if (this._needStart) {
            this._start();
            this._needStart = false;
        }

        if (WebGPUGlobal.useGlobalContext)
            WebGPUContext.startRender();

        node._preUpdatePre(this);
        node._render(this, this.renderCommand, null);
        this._submit();
        WebGPUStatis.addRenderElement(1);
        return 0;
    }

    runCMDList(cmds: IRenderCMD[]): void {
        cmds.forEach(cmd => cmd.apply(this));
    }

    runOneCMD(cmd: IRenderCMD): void {
        cmd.apply(this);
    }

    /**
     * 设置屏幕渲染目标
     */
    private _setScreenRT() {
        if (!this.destRT) { //如果渲染目标为空，设置成屏幕渲染目标，绘制到画布上
            const context = WebGPURenderEngine._instance._context;
            WebGPURenderEngine._instance._screenRT._textures[0].resource = context.getCurrentTexture();
            WebGPURenderEngine._instance._screenRT._textures[0].multiSamplers = 1;
            this.setRenderTarget(WebGPURenderEngine._instance._screenRT, RenderClearFlag.Color | RenderClearFlag.Depth);
        }
    }

    /**
     * 准备录制渲染命令
     */
    private _start() {
        this.device = WebGPURenderEngine._instance.getDevice();
        const renderPassDesc: GPURenderPassDescriptor
            = WebGPURenderPassHelper.getDescriptor(this.destRT, this._clearFlag, this._clearColor, this._clearDepth, this._clearStencil);
        this.renderCommand.startRender(renderPassDesc);
        this._viewPort.y = 0; //不设零会报错
        this._scissor.y = 0;
        this.renderCommand.setViewport(this._viewPort.x, this._viewPort.y, this._viewPort.width, this._viewPort.height, 0, 1);
        this.renderCommand.setScissorRect(this._scissor.x, this._scissor.y, this._scissor.z, this._scissor.w);
    }

    /**
     * 提交渲染命令
     */
    private _submit() {
        this.renderCommand.end();
        if (WebGPUGlobal.useBigBuffer)
            WebGPURenderEngine._instance.upload(); //上传所有Uniform数据
        this.device.queue.submit([this.renderCommand.finish()]);
        this._needStart = true;
        WebGPUStatis.addSubmit(); //统计提交次数
    }

    /**
     * 销毁
     */
    destroy() {
        WebGPUGlobal.releaseId(this);
        this.bundleManager.destroy();
        this.elementsToBundleStatic.length = 0;
        this.elementsToBundleDynamic.length = 0;
        this.needRemoveBundle.length = 0;
        this.destRT = null;
        this.renderCommand.destroy();
    }
}