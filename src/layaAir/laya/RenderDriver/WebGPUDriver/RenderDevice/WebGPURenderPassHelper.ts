import { RenderClearFlag } from "../../../RenderEngine/RenderEnum/RenderClearFlag";
import { Color } from "../../../maths/Color";
import { WebGPUInternalRT } from "./WebGPUInternalRT";
import { WebGPUInternalTex } from "./WebGPUInternalTex";

export class WebGPURenderPassHelper {
    static getDescriptor(rt: WebGPUInternalRT, clearflag: RenderClearFlag,
        clearColor: Color = null, clearDepthValue: number = 1, clearStencilValue = 0): GPURenderPassDescriptor {
        this.setColorAttachments(rt._renderPassDescriptor, rt._textures, !!(clearflag & RenderClearFlag.Color), clearColor);
        this.setDepthAttachments(rt._renderPassDescriptor, rt._depthTexture, !!(clearflag & RenderClearFlag.Depth), clearDepthValue, clearStencilValue);
        return rt._renderPassDescriptor;
    }

    static setColorAttachments(desc: GPURenderPassDescriptor, textures: WebGPUInternalTex[], clear: boolean, clearColor: Color = Color.BLACK) {
        //TODO mutisampled
        desc.colorAttachments = [];
        const colorArray = desc.colorAttachments as GPURenderPassColorAttachment[];
        colorArray.length = textures.length;
        for (let i = 0, n = textures.length; i < n; i++) {
            let attachment = colorArray[i];
            if (!attachment)
                attachment = colorArray[i] = { view: textures[i].getTextureView(), loadOp: "clear", storeOp: "store" };
            if (clear) {
                attachment.loadOp = "clear";
                attachment.clearValue = { r: clearColor.r, g: clearColor.g, b: clearColor.b, a: clearColor.a };
            } else attachment.loadOp = "load";
        }
    }

    static setDepthAttachments(desc: GPURenderPassDescriptor, depthTex: WebGPUInternalTex, clear: boolean, clearDepthValue: number = 1, clearStencilValue = 0) {
        if (depthTex) {
            const hasStencil = depthTex._webGPUFormat.indexOf("stencil8") !== -1;
            const depthStencil: GPURenderPassDepthStencilAttachment
                = desc.depthStencilAttachment = { view: depthTex.getTextureView() };
            if (clear) {
                depthStencil.depthClearValue = clearDepthValue;
                depthStencil.depthLoadOp = "clear";
                depthStencil.depthStoreOp = "store";
                if (hasStencil) {
                    depthStencil.stencilClearValue = clearStencilValue;
                    depthStencil.stencilLoadOp = "clear";
                    depthStencil.stencilStoreOp = "store";
                } else {
                    delete depthStencil.stencilClearValue;
                    delete depthStencil.stencilLoadOp;
                    delete depthStencil.stencilStoreOp;
                }
            } else {
                depthStencil.depthClearValue = clearDepthValue;
                depthStencil.depthLoadOp = "load";
                depthStencil.depthStoreOp = "store";
                if (hasStencil) {
                    depthStencil.stencilClearValue = clearStencilValue;
                    depthStencil.stencilLoadOp = "load";
                    depthStencil.stencilStoreOp = "store";
                } else {
                    delete depthStencil.stencilClearValue;
                    delete depthStencil.stencilLoadOp;
                    delete depthStencil.stencilStoreOp;
                }
            }
        } else delete desc.depthStencilAttachment;
    }
}