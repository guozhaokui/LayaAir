import { IRenderElement } from "../../../../RenderEngine/RenderInterface/RenderPipelineInterface/IRenderElement";
import { ShaderData } from "../../../../RenderEngine/RenderShader/ShaderData";
import { Vector4 } from "../../../../maths/Vector4";
import { Material } from "../../../../resource/Material";
import { IBaseRenderNode } from "../../../RenderDriverLayer/Render3DNode/IBaseRenderNode";
import { Transform3D } from "../../../core/Transform3D";
import { IrradianceMode } from "../../../core/render/BaseRender";
import { BoundFrustum } from "../../../math/BoundFrustum";
import { Bounds } from "../../../math/Bounds";
import { RenderElementOBJ } from "../../RenderObj/RenderElementOBJ";
import { GLESRenderContext3D } from "../GLESRenderContext3D";
import { GLESLightmap } from "../RenderModuleData/GLESLightmap";
import { GLESReflectionProbe } from "../RenderModuleData/GLESReflectionProb";
import { GLESVolumetricGI } from "../RenderModuleData/GLESVolumetricGI";

export class GLESBaseRenderNode implements IBaseRenderNode {
    baseGeometryBounds: Bounds;
    boundsChange: boolean;

    transform: Transform3D;
    distanceForSort: number;

    sortingFudge: number;
    castShadow: boolean;
    enable: boolean;
    renderbitFlag: number;
    layer: number;
    _bounds: Bounds;
    customCull: boolean;//TODO
    customCullResoult: boolean;//TODO
    staticMask: number;
    shaderData: ShaderData;
    lightmapScaleOffset: Vector4 = new Vector4(1, 1, 0, 0);
    lightmapIndex: number;
    lightmap: GLESLightmap;
    probeReflection: GLESReflectionProbe;
    probeReflectionUpdateMark: number;
    reflectionMode: number;
    volumetricGI: GLESVolumetricGI;
    lightProbUpdateMark: number;
    irradientMode: IrradianceMode;
    //material 设置相关
    _renderelements: RenderElementOBJ[];
    setWorldParams(value: Vector4) {

    }

    setRenderelements(value: RenderElementOBJ[]): void {

    }

    setOneMaterial(index: number, mat: Material): void {
        if (!this._renderelements[index])
            return;
        this._renderelements[index]._materialShaderData = mat.shaderData;
        this._renderelements[index]._materialRenderQueue;
    }


    setLightmapScaleOffset(value: Vector4) {

    }

    setCommonUniformMap(value: string[]) {

    }

    preUpdateRenderData() {
        //update Sprite ShaderData
        //update geometry data(TODO)
    }

    /**
     * @internal
     */
    _renderUpdatePre(context: GLESRenderContext3D): void {

    }

    _needRender(boundFrustum: BoundFrustum): boolean {
        return true;
    }

    shadowCullPass(): boolean {
        return this.castShadow && this.enable && (this.renderbitFlag == 0);
    }

    addOneRenderElement() {

    }


    set bounds(value: Bounds) {
        this._bounds = value;
    }

    get bounds() {
        if (this.boundsChange) {
            this._calculateBoundingBox();
            this.boundsChange = false;
        }
        return this._bounds;
    }

    protected _calculateBoundingBox() {
        this.baseGeometryBounds._tranform(this.transform.worldMatrix, this.bounds)
    }


    /**
   * @internal
   * 全局贴图
   */
    _applyLightMapParams(): void {
        if (!this._scene) return;
        var lightMaps: Lightmap[] = this._scene.lightmaps;
        var shaderValues: ShaderData = this._shaderValues;
        var lightmapIndex: number = this._lightmapIndex;
        if (lightmapIndex >= 0 && lightmapIndex < lightMaps.length) {
            shaderValues.setVector(RenderableSprite3D.LIGHTMAPSCALEOFFSET, this._lightmapScaleOffset);
            var lightMap: Lightmap = lightMaps[lightmapIndex];
            shaderValues.setTexture(RenderableSprite3D.LIGHTMAP, lightMap.lightmapColor);
            shaderValues.setVector(RenderableSprite3D.LIGHTMAPSCALEOFFSET, this._);
            shaderValues.addDefine(RenderableSprite3D.SAHDERDEFINE_LIGHTMAP);
            if (lightMap.lightmapDirection) {
                shaderValues.setTexture(RenderableSprite3D.LIGHTMAP_DIRECTION, lightMap.lightmapDirection);
                shaderValues.addDefine(RenderableSprite3D.SHADERDEFINE_LIGHTMAP_DIRECTIONAL);
            }
            else {
                shaderValues.removeDefine(RenderableSprite3D.SHADERDEFINE_LIGHTMAP_DIRECTIONAL);
            }
        } else {
            shaderValues.removeDefine(RenderableSprite3D.SAHDERDEFINE_LIGHTMAP);
            shaderValues.removeDefine(RenderableSprite3D.SHADERDEFINE_LIGHTMAP_DIRECTIONAL);
        }
    }

    /**
    * apply lightProb
    * @returns 
    */
    _applyLightProb() {
        if (this.lightmapIndex >= 0 || !this._lightProb) return;
        if (this._lightProb._updateMark != this._lightProbUpdateMark) {
            this._lightProbUpdateMark = this._lightProb._updateMark;
            this._lightProb.applyVolumetricGI(this._shaderValues);
        }
    }

    /**
     * apply reflection
     * @returns 
     */
    _applyReflection() {
        if (!this._probReflection || this._baseRenderNode.reflectionMode == ReflectionProbeMode.off) return;
        if (this._probReflection._updateMark != this._probeReflectionUpdateMark) {
            this._probeReflectionUpdateMark = this._probReflection._updateMark;
            this._probReflection.applyReflectionShaderData(this._shaderValues);
        }
    }

    destroy(){
        
    }
    // /**
    // * @internal
    // */
    // _renderUpdate(context: RenderContext3D, transform: Transform3D): void {
    // }

    // /**
    //  * @internal
    //  */
    // _renderUpdateWithCamera(context: RenderContext3D, transform: Transform3D): void {
    // }

}