import { BoundFrustum } from "../../d3/math/BoundFrustum";
import { Vector3 } from "../../d3/math/Vector3";
import { ICameraCullInfo } from "../RenderInterface/RenderPipelineInterface/ICameraCullInfo";

/**
 * camera裁剪数据
 */
 export class CameraCullInfo implements ICameraCullInfo{
	/**位置 */
	position: Vector3;
	/**是否遮挡剔除 */
	useOcclusionCulling: Boolean;
	/**锥体包围盒 */
	boundFrustum: BoundFrustum;
	/**遮挡标记 */
	cullingMask: number;
}