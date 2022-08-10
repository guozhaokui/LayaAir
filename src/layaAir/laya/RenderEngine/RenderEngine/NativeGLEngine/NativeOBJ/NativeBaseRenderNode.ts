import { BaseRender } from "../../../../d3/core/render/BaseRender";
import { RenderBounds } from "../../../../d3/core/RenderBounds";
import { Transform3D } from "../../../../d3/core/Transform3D";
import { IBaseRenderNode } from "../../../RenderInterface/RenderPipelineInterface/IBaseRenderNode";

export class NativeBaseRenderNode implements IBaseRenderNode {

    private _nativeObj: any;

    constructor() {
        this._nativeObj = new (window as any).conchRenderNode();
    }

    get renderId(): number {
        return this._nativeObj.renderId;
    }
    set renderId(value: number) {
        this._nativeObj.renderId = value;
    }

    get receiveShadow(): boolean {
        return this._nativeObj.receiveShadow;
    }
    set receiveShadow(value: boolean) {
        this._nativeObj.receiveShadow = value;
    }

    get castShadow(): boolean {
        return this._nativeObj.castShadow;
    }
    set castShadow(value: boolean) {
        this._nativeObj.castShadow = value;
    }

    get bounds(): RenderBounds {
        return null;
    }
    set bounds(value: RenderBounds) {
        this._nativeObj.bounds = value ? (value as any)._nativeObj : null;
    }

    sortingFudge: number;

    get distanceForSort(): number {
        return this._nativeObj.distanceForSort;
    }
    set distanceForSort(value: number) {
        this._nativeObj.distanceForSort = value;
    }

    get transform(): Transform3D {
        return null;
    }
    set transform(value: Transform3D) {
        this._nativeObj.transform = value ? (value as any)._nativeObj : null;
    }
    
    get owner(): BaseRender | null {
        return this._nativeObj.owner;
    }
    set owner(value: BaseRender | null) {
        this._nativeObj.owner = value;
    }

    get geometryBounds(): RenderBounds | null {
        return null;
    }

    set geometryBounds(value: RenderBounds | null) {
        this._nativeObj.geometryBounds = value ? (value as any)._nativeObj : null;
    }
}