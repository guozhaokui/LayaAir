import { SingletonList } from "../../../../utils/SingletonList";
import { IRenderContext3D } from "../../../RenderDriverLayer/IRenderContext3D";
import { IBaseRenderNode } from "../../../RenderDriverLayer/Render3DNode/IBaseRenderNode";
import { IForwardAddRP } from "../../../RenderDriverLayer/Render3DProcess/IForwardAddRP";
import { IRender3DProcess } from "../../../RenderDriverLayer/Render3DProcess/IRender3DProcess";
import { GLESRenderContext3D } from "../GLESRenderContext3D";
import { GLESBaseRenderNode } from "../Render3DNode/GLESBaseRenderNode";
import { GLESForwardAddRP } from "./GLESForwardAddRP";

export class GLESRender3DProcess implements IRender3DProcess {
    renderFowarAddCameraPass(context: GLESRenderContext3D, renderpass: GLESForwardAddRP, list: GLESBaseRenderNode[], count: number): void {
        //先渲染ShadowTexture
        if (renderpass.shadowCastPass) {
            if (renderpass.enableDirectLightShadow) {
                renderpass.directLightShadowPass.update(context);
                renderpass.directLightShadowPass.render(context, list, count);
            }
            if (renderpass.enableSpotLightShadowPass) {
                renderpass.spotLightShadowPass.update(context);
                renderpass.spotLightShadowPass.render(context, list, count);
            }
        }
        renderpass.renderpass.render(context, list, count);
    }

}