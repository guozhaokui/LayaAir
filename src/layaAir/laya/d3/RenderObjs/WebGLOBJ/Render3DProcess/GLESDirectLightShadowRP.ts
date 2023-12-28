import { RenderClearFlag } from "../../../../RenderEngine/RenderEnum/RenderClearFlag";
import { IRenderElement } from "../../../../RenderEngine/RenderInterface/RenderPipelineInterface/IRenderElement";
import { ShaderData } from "../../../../RenderEngine/RenderShader/ShaderData";
import { Color } from "../../../../maths/Color";
import { MathUtils3D } from "../../../../maths/MathUtils3D";
import { Matrix4x4 } from "../../../../maths/Matrix4x4";
import { Vector3 } from "../../../../maths/Vector3";
import { Vector4 } from "../../../../maths/Vector4";
import { RenderTexture } from "../../../../resource/RenderTexture";
import { SingletonList } from "../../../../utils/SingletonList";
import { IDirectLightShadowRP } from "../../../RenderDriverLayer/Render3DProcess/IDirectLightShadowRP";
import { BaseCamera } from "../../../core/BaseCamera";
import { Camera } from "../../../core/Camera";
import { Sprite3D } from "../../../core/Sprite3D";
import { DirectionLightCom } from "../../../core/light/DirectionLightCom";
import { ShadowCascadesMode } from "../../../core/light/ShadowCascadesMode";
import { ShadowMode } from "../../../core/light/ShadowMode";
import { ShadowMapFormat, ShadowUtils } from "../../../core/light/ShadowUtils";
import { CommandBuffer } from "../../../core/render/command/CommandBuffer";
import { Scene3DShaderDeclaration } from "../../../core/scene/Scene3DShaderDeclaration";
import { BoundSphere } from "../../../math/BoundSphere";
import { Plane } from "../../../math/Plane";
import { Viewport } from "../../../math/Viewport";
import { ShadowCasterPass } from "../../../shadowMap/ShadowCasterPass";
import { ShadowSliceData } from "../../../shadowMap/ShadowSliceData";
import { GLESRenderContext3D } from "../GLESRenderContext3D";
import { GLESBaseRenderNode } from "../Render3DNode/GLESBaseRenderNode";
import { GLESCullUtil } from "./GLESRenderUtil.ts/GLESCullUtil";
import { GLESRenderQueueList } from "./GLESRenderUtil.ts/GLESRenderListQueue";

export class ShadowCullInfo {
    position: Vector3;
    cullPlanes: Plane[];
    cullSphere: BoundSphere;
    cullPlaneCount: number;
    direction: Vector3;
}

export class GLESDirectLightShadowCastRP implements IDirectLightShadowRP {
    /** @internal 最大cascade*/
    private static _maxCascades: number = 4;

    /**@internal */
    shadowCastMode: ShadowCascadesMode;
    /**@internal */
    camera: Camera;
    /**@internal */
    destTarget: RenderTexture;
    /**@internal */
    shadowCasterCommanBuffer: CommandBuffer[];

    /**light */
    /**@internal */
    private _light: DirectionLightCom;
    /**@internal */
    private _lightup: Vector3;
    /**@internal */
    private _lightSide: Vector3;
    /**@internal */
    private _lightForward: Vector3;
    /**@internal */
    private _atlasResolution: number;
    /**@internal */
    private _shadowDistance: number;
    /**@internal */
    private _shadowTwoCascadeSplits: number;
    /**@internal */
    private _shadowFourCascadeSplits: Vector3;
    /**@internal */
    private _shadowStrength: number;
    /**@internal */
    private _shadowDepthBias: number;
    /**@internal */
    private _shadowNormalBias: number;
    /**@internal */
    private _shadowMode: ShadowMode;

    //caculate data
    /**@internal 分割distance*/
    private _cascadesSplitDistance: number[] = new Array(GLESDirectLightShadowCastRP._maxCascades + 1);
    /** @internal */
    private _frustumPlanes: Plane[] = new Array();
    /** @internal */
    private _shadowMatrices: Float32Array = new Float32Array(16 * (GLESDirectLightShadowCastRP._maxCascades));
    /**@internal */
    private _splitBoundSpheres: Float32Array = new Float32Array(GLESDirectLightShadowCastRP._maxCascades * 4);
    /** @internal */
    private _shadowSliceDatas: ShadowSliceData[] = [new ShadowSliceData(), new ShadowSliceData(), new ShadowSliceData(), new ShadowSliceData()];
    /** @internal */
    private _shadowMapSize: Vector4 = new Vector4();
    /** @internal */
    private _shadowParams: Vector4 = new Vector4();
    /** @internal */
    private _shadowBias: Vector4 = new Vector4();
    /** @internal */
    private _cascadeCount: number = 0;
    /** @internal */
    private _shadowMapWidth: number = 0;
    /** @internal */
    private _shadowMapHeight: number = 0;
    /** @internal */
    private _shadowTileResolution: number = 0;
    /** @internal */
    private _shadowCullInfo: ShadowCullInfo;

    /**@internal */
    private _renderQueue: GLESRenderQueueList;
    /**@internal */
    set light(value: DirectionLightCom) {
        this._light = value;
        var lightWorld: Matrix4x4 = Matrix4x4.TEMPMatrix0;
        var lightWorldE: Float32Array = lightWorld.elements;
        var lightUp: Vector3 = this._lightup;
        var lightSide: Vector3 = this._lightSide;
        var lightForward: Vector3 = this._lightForward;
        Matrix4x4.createFromQuaternion((this._light.owner as Sprite3D)._transform.rotation, lightWorld);
        lightSide.setValue(lightWorldE[0], lightWorldE[1], lightWorldE[2]);
        lightUp.setValue(lightWorldE[4], lightWorldE[5], lightWorldE[6]);
        lightForward.setValue(-lightWorldE[8], -lightWorldE[9], -lightWorldE[10]);
        //设置分辨率
        this._atlasResolution = this._light._shadowResolution;
        var cascadesMode = this.shadowCastMode = this._light._shadowCascadesMode;
        var shadowTileResolution: number;

        if (cascadesMode == ShadowCascadesMode.NoCascades) {
            this._cascadeCount = 1;
            this._shadowTileResolution = this._atlasResolution;
            this._shadowMapWidth = this._atlasResolution;
            this._shadowMapHeight = this._atlasResolution;
        }
        else {
            this._cascadeCount = cascadesMode == ShadowCascadesMode.TwoCascades ? 2 : 4;
            this._shadowTileResolution = ShadowUtils.getMaxTileResolutionInAtlas(this._atlasResolution, this._atlasResolution, this._cascadeCount);
            this._shadowMapWidth = shadowTileResolution * 2;
            this._shadowMapHeight = cascadesMode == ShadowCascadesMode.TwoCascades ? shadowTileResolution : shadowTileResolution * 2;
        }
        this._shadowTwoCascadeSplits = this._light._shadowTwoCascadeSplits;
        this._shadowFourCascadeSplits = this._light._shadowFourCascadeSplits;
        this.destTarget && RenderTexture.recoverToPool(this.destTarget);// TODO 优化
        this.destTarget = ShadowUtils.getTemporaryShadowTexture(this._shadowMapWidth, this._shadowMapHeight, ShadowMapFormat.bit16);
    }

    get light() {
        return this._light;
    }

    constructor() {
        this._lightup = new Vector3();
        this._lightSide = new Vector3();
        this._lightForward = new Vector3();
        this._cascadesSplitDistance = new Array(GLESDirectLightShadowCastRP._maxCascades + 1);
        this._renderQueue = new GLESRenderQueueList(false);
    }

    update(context: GLESRenderContext3D): void {
        var splitDistance: number[] = this._cascadesSplitDistance;
        var frustumPlanes: Plane[] = this._frustumPlanes;
        var cameraNear: number = this.camera.nearPlane;
        var shadowFar: number = Math.min(this.camera.farPlane, this._shadowDistance);
        var shadowMatrices: Float32Array = this._shadowMatrices;
        var boundSpheres: Float32Array = this._splitBoundSpheres;
        ShadowUtils.getCascadesSplitDistance(this._shadowTwoCascadeSplits, this._shadowFourCascadeSplits, cameraNear, shadowFar, this.camera.fieldOfView * MathUtils3D.Deg2Rad, this.camera.aspectRatio, this.shadowCastMode, splitDistance);
        ShadowUtils.getCameraFrustumPlanes(this.camera.projectionViewMatrix, frustumPlanes);
        var forward: Vector3 = Vector3._tempVector3;
        this.camera._transform.getForward(forward);
        Vector3.normalize(forward, forward);
        for (var i: number = 0; i < this._cascadeCount; i++) {
            var sliceData: ShadowSliceData = this._shadowSliceDatas[i];
            sliceData.sphereCenterZ = ShadowUtils.getBoundSphereByFrustum(splitDistance[i], splitDistance[i + 1], this.camera.fieldOfView * MathUtils3D.Deg2Rad, this.camera.aspectRatio, this.camera._transform.position, forward, sliceData.splitBoundSphere);
            ShadowUtils.getDirectionLightShadowCullPlanes(frustumPlanes, i, splitDistance, cameraNear, this._lightForward, sliceData);
            ShadowUtils.getDirectionalLightMatrices(this._lightup, this._lightSide, this._lightForward, i, this._light._shadowNearPlane, this._shadowTileResolution, sliceData, shadowMatrices);
            if (this._cascadeCount > 1)
                ShadowUtils.applySliceTransform(sliceData, this._shadowMapWidth, this._shadowMapHeight, i, shadowMatrices);
        }
        ShadowUtils.prepareShadowReceiverShaderValues(this._shadowStrength, this._shadowMapWidth, this._shadowMapHeight, this._shadowSliceDatas, this._cascadeCount, this._shadowMapSize, this._shadowParams, shadowMatrices, boundSpheres);
    }

    render(context: GLESRenderContext3D, list: GLESBaseRenderNode[], count: number): void {
        var shaderValues: ShaderData = context.sceneData;
        context.pipelineMode = "ShadowCaster";
        var shadowMap = this.destTarget
        context.setRenderTarget(shadowMap);
        //需要把shadowmap clear Depth;
        for (var i: number = 0, n: number = this._cascadeCount; i < n; i++) {
            var sliceData: ShadowSliceData = this._shadowSliceDatas[i];
            this.getShadowBias(sliceData.projectionMatrix, sliceData.resolution, this._shadowBias);
            this._setupShadowCasterShaderValues(shaderValues, sliceData, this._lightForward, this._shadowBias);
            var shadowCullInfo: ShadowCullInfo = this._shadowCullInfo;
            shadowCullInfo.position = sliceData.position;
            shadowCullInfo.cullPlanes = sliceData.cullPlanes;
            shadowCullInfo.cullPlaneCount = sliceData.cullPlaneCount;
            shadowCullInfo.cullSphere = sliceData.splitBoundSphere;
            shadowCullInfo.direction = this._lightForward;
            //cull
            GLESCullUtil.culldirectLightShadow(shadowCullInfo, list, count, this._renderQueue);

            context.cameraData = sliceData.cameraShaderValue;
            Camera._updateMark++;
            context.cameraUpdateMask = Camera._updateMark;

            var resolution: number = sliceData.resolution;
            var offsetX: number = sliceData.offsetX;
            var offsetY: number = sliceData.offsetY;


            if (this._renderQueue._elements.length > 0) {// if one cascade have anything to render.
                Viewport._tempViewport.set(offsetX, offsetY, resolution, resolution);
                Vector4.tempVec4.setValue(offsetX + 1, offsetY + 1, resolution - 2, resolution - 2);
                context.setViewPort(Viewport._tempViewport);
                context.setScissor(Vector4.tempVec4);
            }
            else {
                Viewport._tempViewport.set(offsetX, offsetY, resolution, resolution);
                context.setViewPort(Viewport._tempViewport);
                Vector4.tempVec4.setValue(offsetX, offsetY, resolution, resolution);
                context.setScissor(Vector4.tempVec4);
            }
            context.setClearData(RenderClearFlag.Depth, Color.BLACK, 1, 0);
            this._renderQueue.renderQueue(context);
            this._applyCasterPassCommandBuffer(context);
        }
        this._applyRenderData(context.sceneData, context.cameraData);
    }

    /**
     * set shaderData after Render shadow
     * @param scene 
     * @param camera 
     */
    private _applyRenderData(scene: ShaderData, camera: ShaderData) {
        var light: DirectionLightCom = <DirectionLightCom>this._light;
        if (light.shadowCascadesMode !== ShadowCascadesMode.NoCascades)
            scene.addDefine(Scene3DShaderDeclaration.SHADERDEFINE_SHADOW_CASCADE);
        else
            scene.removeDefine(Scene3DShaderDeclaration.SHADERDEFINE_SHADOW_CASCADE);
        switch (light.shadowMode) {
            case ShadowMode.Hard:
                scene.removeDefine(Scene3DShaderDeclaration.SHADERDEFINE_SHADOW_SOFT_SHADOW_LOW);
                scene.removeDefine(Scene3DShaderDeclaration.SHADERDEFINE_SHADOW_SOFT_SHADOW_HIGH);
                break;
            case ShadowMode.SoftLow:
                scene.addDefine(Scene3DShaderDeclaration.SHADERDEFINE_SHADOW_SOFT_SHADOW_LOW);
                scene.removeDefine(Scene3DShaderDeclaration.SHADERDEFINE_SHADOW_SOFT_SHADOW_HIGH);
                break;
            case ShadowMode.SoftHigh:
                scene.addDefine(Scene3DShaderDeclaration.SHADERDEFINE_SHADOW_SOFT_SHADOW_HIGH);
                scene.removeDefine(Scene3DShaderDeclaration.SHADERDEFINE_SHADOW_SOFT_SHADOW_LOW);
                break;
        }
        scene.setTexture(ShadowCasterPass.SHADOW_MAP, this.destTarget);
        scene.setBuffer(ShadowCasterPass.SHADOW_MATRICES, this._shadowMatrices);
        scene.setVector(ShadowCasterPass.SHADOW_MAP_SIZE, this._shadowMapSize);
        scene.setVector(ShadowCasterPass.SHADOW_PARAMS, this._shadowParams);
        scene.setBuffer(ShadowCasterPass.SHADOW_SPLIT_SPHERES, this._splitBoundSpheres);
    }

    /**
     * apply shadowCast cmd array
     */
    private _applyCasterPassCommandBuffer(context: GLESRenderContext3D) {
        if (!this.shadowCasterCommanBuffer || this.shadowCasterCommanBuffer.length == 0)
            return;
        this.shadowCasterCommanBuffer.forEach(function (value) {
            //value._context = context;TODO
            value._apply();
        });
    }

    private getShadowBias(shadowProjectionMatrix: Matrix4x4, shadowResolution: number, out: Vector4) {
        var frustumSize: number;

        // Frustum size is guaranteed to be a cube as we wrap shadow frustum around a sphere
        // elements[0] = 2.0 / (right - left)
        frustumSize = 2.0 / shadowProjectionMatrix.elements[0];


        // depth and normal bias scale is in shadowmap texel size in world space
        var texelSize: number = frustumSize / shadowResolution;
        var depthBias: number = -this._shadowDepthBias * texelSize;
        var normalBias: number = -this._shadowNormalBias * texelSize;

        if (this._shadowMode == ShadowMode.SoftHigh) {
            // TODO: depth and normal bias assume sample is no more than 1 texel away from shadowmap
            // This is not true with PCF. Ideally we need to do either
            // cone base bias (based on distance to center sample)
            // or receiver place bias based on derivatives.
            // For now we scale it by the PCF kernel size (5x5)
            const kernelRadius: number = 2.5;
            depthBias *= kernelRadius;
            normalBias *= kernelRadius;
        }
        out.setValue(depthBias, normalBias, 0.0, 0.0);
    }

    /**
    * 设置阴影级联数据模式
    * @internal
    */
    private _setupShadowCasterShaderValues(shaderValues: ShaderData, shadowSliceData: ShadowSliceData, LightParam: Vector3, shadowBias: Vector4): void {
        shaderValues.setVector(ShadowCasterPass.SHADOW_BIAS, shadowBias);
        shaderValues.setVector3(ShadowCasterPass.SHADOW_LIGHT_DIRECTION, LightParam);
        var cameraSV: ShaderData = shadowSliceData.cameraShaderValue;//TODO:should optimization with shader upload.
        cameraSV.setMatrix4x4(BaseCamera.VIEWMATRIX, shadowSliceData.viewMatrix);
        cameraSV.setMatrix4x4(BaseCamera.PROJECTMATRIX, shadowSliceData.projectionMatrix);
        cameraSV.setMatrix4x4(BaseCamera.VIEWPROJECTMATRIX, shadowSliceData.viewProjectMatrix);
        shaderValues.setMatrix4x4(BaseCamera.VIEWPROJECTMATRIX, shadowSliceData.viewProjectMatrix);
    }
}