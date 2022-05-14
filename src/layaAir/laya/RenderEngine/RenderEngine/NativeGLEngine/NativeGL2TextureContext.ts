import { NativeGLTextureContext } from "./NativeGLTextureContext";
import { NativeWebGLEngine } from "./NativeWebGLEngine";
import { TextureDimension } from "../../RenderEnum/TextureDimension";
import { HDRTextureInfo } from "../../HDRTextureInfo";
import { FilterMode } from "../../RenderEnum/FilterMode";
import { RenderTargetFormat } from "../../RenderEnum/RenderTargetFormat";
import { TextureCompareMode } from "../../RenderEnum/TextureCompareMode";
import { TextureFormat } from "../../RenderEnum/TextureFormat";
import { KTXTextureInfo } from "../../KTXTextureInfo";
import { InternalTexture } from "../../RenderInterface/InternalTexture";
import { InternalRenderTarget } from "../../RenderInterface/InternalRenderTarget";

/**
 * 将继承修改为类似 WebGLRenderingContextBase, WebGLRenderingContextOverloads 多继承 ?
 */
export class NativeGL2TextureContext extends NativeGLTextureContext {

    constructor(engine: NativeWebGLEngine, native: any) {
        super(engine, native);
    }

    setTextureImageData(texture: InternalTexture, source: HTMLImageElement | HTMLCanvasElement | ImageBitmap, premultiplyAlpha: boolean, invertY: boolean) {
        this._native.setTextureImageData(texture, (source as any)._nativeObj.conchImgId , premultiplyAlpha, invertY);
    }

    setTexturePixelsData(texture: InternalTexture, source: ArrayBufferView, premultiplyAlpha: boolean, invertY: boolean) {
        this._native.setTexturePixelsData(texture, source , premultiplyAlpha, invertY);
    }
    setTextureSubPixelsData(texture: InternalTexture, source: ArrayBufferView, mipmapLevel: number, generateMipmap: boolean, xOffset: number, yOffset: number, width: number, height: number, premultiplyAlpha: boolean, invertY: boolean): void {
        this._native.setTextureSubPixelsData(texture, source, mipmapLevel, generateMipmap, xOffset, yOffset, width, height, premultiplyAlpha, invertY);
    }

    setTextureHDRData(texture: InternalTexture, hdrInfo: HDRTextureInfo): void {
        let sourceData = hdrInfo.readScanLine();

        this.setTexturePixelsData(texture, sourceData, false, false);
    }

    setTextureKTXData(texture: InternalTexture, ktxInfo: KTXTextureInfo) {

    }

    setCubeImageData(texture: InternalTexture, sources: HTMLImageElement[] | HTMLCanvasElement[] | ImageBitmap[], premultiplyAlpha: boolean, invertY: boolean): void {
        //this._native.setTextureImageData((texture as any).id, (source as any)._nativeObj.conchImgId , premultiplyAlpha, invertY);
    }

    setCubePixelsData(texture: InternalTexture, source: ArrayBufferView[], premultiplyAlpha: boolean, invertY: boolean): void {
        //this._native.setCubePixelsData((texture as any).id, source , premultiplyAlpha, invertY);
    }

    setCubeKTXData(texture: InternalTexture, ktxInfo: KTXTextureInfo): void {
       
    }

    setTextureCompareMode(texture: InternalTexture, compareMode: TextureCompareMode): TextureCompareMode {
        return this._native.bindRenderTarget(texture, compareMode);
    }

    createRenderTextureInternal(dimension: TextureDimension, width: number, height: number, format: RenderTargetFormat, gengerateMipmap: boolean, sRGB: boolean): InternalTexture {
        alert("createRenderTextureInternal");
        return null;
    }

    createRenderTargetInternal(width: number, height: number, colorFormat: RenderTargetFormat, depthStencilFormat: RenderTargetFormat, generateMipmap: boolean, sRGB: boolean, multiSamples: number): InternalRenderTarget {
        return this._native.createRenderTargetInternal(width, height, colorFormat, depthStencilFormat, generateMipmap, sRGB, multiSamples);
    }

    createRenderTargetCubeInternal(size: number, colorFormat: RenderTargetFormat, depthStencilFormat: RenderTargetFormat, generateMipmap: boolean, sRGB: boolean, multiSamples: number): InternalRenderTarget {
        alert("createRenderTargetCubeInternal");
        return null;
    }

    createRenderTextureCubeInternal(dimension: TextureDimension, size: number, format: RenderTargetFormat, generateMipmap: boolean, sRGB: boolean): InternalTexture {
        alert("createRenderTextureCubeInternal");
        return null;
    }

    bindRenderTarget(renderTarget: InternalRenderTarget): void {
        this._native.bindRenderTarget(renderTarget);
    }

    unbindRenderTarget(renderTarget: InternalRenderTarget): void {
        this._native.unbindRenderTarget(renderTarget);
    }

}