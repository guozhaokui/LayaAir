import { BaseTexture } from "../../../resource/BaseTexture";
import { Vector4 } from "../../math/Vector4";
import { Shader3D } from "../../shader/Shader3D";
import { Scene3DShaderDeclaration } from "../scene/Scene3DShaderDeclaration";
import { BaseMaterial } from "./BaseMaterial";
import { RenderState } from "./RenderState";
import { ShaderDefine } from "../../shader/ShaderDefine";

/**
 * <code>PBRStandardMaterial</code> 类用于实现PBR(Standard)材质。
 */
export class PBRStandardMaterial extends BaseMaterial {

	/**光滑度数据源_金属度贴图的Alpha通道。*/
	static SmoothnessSource_MetallicGlossTexture_Alpha: number = 0;
	/**光滑度数据源_反射率贴图的Alpha通道。*/
	static SmoothnessSource_AlbedoTexture_Alpha: number = 1;

	/**渲染状态_不透明。*/
	static RENDERMODE_OPAQUE: number = 0;
	/**渲染状态_透明测试。*/
	static RENDERMODE_CUTOUT: number = 1;
	/**渲染状态_透明混合_游戏中经常使用的透明。*/
	static RENDERMODE_FADE: number = 2;
	/**渲染状态_透明混合_物理上看似合理的透明。*/
	static RENDERMODE_TRANSPARENT: number = 3;

	static SHADERDEFINE_ALBEDOTEXTURE: ShaderDefine;
	static SHADERDEFINE_NORMALTEXTURE: ShaderDefine;
	static SHADERDEFINE_SMOOTHNESSSOURCE_ALBEDOTEXTURE_ALPHA: ShaderDefine;
	static SHADERDEFINE_METALLICGLOSSTEXTURE: ShaderDefine;
	static SHADERDEFINE_OCCLUSIONTEXTURE: ShaderDefine;
	static SHADERDEFINE_PARALLAXTEXTURE: ShaderDefine;
	static SHADERDEFINE_EMISSION: ShaderDefine;
	static SHADERDEFINE_EMISSIONTEXTURE: ShaderDefine;
	static SHADERDEFINE_REFLECTMAP: ShaderDefine;
	static SHADERDEFINE_TILINGOFFSET: ShaderDefine;
	static SHADERDEFINE_ALPHAPREMULTIPLY: ShaderDefine;

	static ALBEDOTEXTURE: number = Shader3D.propertyNameToID("u_AlbedoTexture");
	static METALLICGLOSSTEXTURE: number = Shader3D.propertyNameToID("u_MetallicGlossTexture");
	static NORMALTEXTURE: number = Shader3D.propertyNameToID("u_NormalTexture");
	static PARALLAXTEXTURE: number = Shader3D.propertyNameToID("u_ParallaxTexture");
	static OCCLUSIONTEXTURE: number = Shader3D.propertyNameToID("u_OcclusionTexture");
	static EMISSIONTEXTURE: number = Shader3D.propertyNameToID("u_EmissionTexture");

	static ALBEDOCOLOR: number = Shader3D.propertyNameToID("u_AlbedoColor");
	static EMISSIONCOLOR: number = Shader3D.propertyNameToID("u_EmissionColor");

	static METALLIC: number = Shader3D.propertyNameToID("u_metallic");
	static SMOOTHNESS: number = Shader3D.propertyNameToID("u_smoothness");
	static SMOOTHNESSSCALE: number = Shader3D.propertyNameToID("u_smoothnessScale");
	static SMOOTHNESSSOURCE: number = -1;//TODO:
	static OCCLUSIONSTRENGTH: number = Shader3D.propertyNameToID("u_occlusionStrength");
	static NORMALSCALE: number = Shader3D.propertyNameToID("u_normalScale");
	static PARALLAXSCALE: number = Shader3D.propertyNameToID("u_parallaxScale");
	static ENABLEEMISSION: number = -1;//TODO:
	static ENABLEREFLECT: number = -1;//TODO:
	static TILINGOFFSET: number = Shader3D.propertyNameToID("u_TilingOffset");

	static CULL: number = Shader3D.propertyNameToID("s_Cull");
	static BLEND: number = Shader3D.propertyNameToID("s_Blend");
	static BLEND_SRC: number = Shader3D.propertyNameToID("s_BlendSrc");
	static BLEND_DST: number = Shader3D.propertyNameToID("s_BlendDst");
	static DEPTH_TEST: number = Shader3D.propertyNameToID("s_DepthTest");
	static DEPTH_WRITE: number = Shader3D.propertyNameToID("s_DepthWrite");

	/** 默认材质，禁止修改*/
	static defaultMaterial: PBRStandardMaterial;

	/**
	 * @internal
	 */
	static __initDefine__(): void {
		PBRStandardMaterial.SHADERDEFINE_ALBEDOTEXTURE = Shader3D.getDefineByName("ALBEDOTEXTURE");
		PBRStandardMaterial.SHADERDEFINE_METALLICGLOSSTEXTURE = Shader3D.getDefineByName("METALLICGLOSSTEXTURE");
		PBRStandardMaterial.SHADERDEFINE_SMOOTHNESSSOURCE_ALBEDOTEXTURE_ALPHA = Shader3D.getDefineByName("SMOOTHNESSSOURCE_ALBEDOTEXTURE_ALPHA");
		PBRStandardMaterial.SHADERDEFINE_NORMALTEXTURE = Shader3D.getDefineByName("NORMALTEXTURE");
		PBRStandardMaterial.SHADERDEFINE_PARALLAXTEXTURE = Shader3D.getDefineByName("PARALLAXTEXTURE");
		PBRStandardMaterial.SHADERDEFINE_OCCLUSIONTEXTURE = Shader3D.getDefineByName("OCCLUSIONTEXTURE");
		PBRStandardMaterial.SHADERDEFINE_EMISSION = Shader3D.getDefineByName("EMISSION");
		PBRStandardMaterial.SHADERDEFINE_EMISSIONTEXTURE = Shader3D.getDefineByName("EMISSIONTEXTURE");
		PBRStandardMaterial.SHADERDEFINE_REFLECTMAP = Shader3D.getDefineByName("REFLECTMAP");
		PBRStandardMaterial.SHADERDEFINE_TILINGOFFSET = Shader3D.getDefineByName("TILINGOFFSET");
		PBRStandardMaterial.SHADERDEFINE_ALPHAPREMULTIPLY = Shader3D.getDefineByName("ALPHAPREMULTIPLY");
	}

	private _albedoColor: Vector4;
	private _emissionColor: Vector4;

	/**
	 * @internal
	 */
	get _ColorR(): number {
		return this._albedoColor.x;
	}

	/**
	 * @internal
	 */
	set _ColorR(value: number) {
		this._albedoColor.x = value;
		this.albedoColor = this._albedoColor;
	}

	/**
	 * @internal
	 */
	get _ColorG(): number {
		return this._albedoColor.y;
	}

	/**
	 * @internal
	 */
	set _ColorG(value: number) {
		this._albedoColor.y = value;
		this.albedoColor = this._albedoColor;
	}

	/**
	 * @internal
	 */
	get _ColorB(): number {
		return this._albedoColor.z;
	}

	/**
	 * @internal
	 */
	set _ColorB(value: number) {
		this._albedoColor.z = value;
		this.albedoColor = this._albedoColor;
	}

	/**
	 * @internal
	 */
	get _ColorA(): number {
		return this._albedoColor.w;
	}

	/**
	 * @internal
	 */
	set _ColorA(value: number) {
		this._albedoColor.w = value;
		this.albedoColor = this._albedoColor;
	}

	/**
	 * @internal
	 */
	get _Metallic(): number {
		return this._shaderValues.getNumber(PBRStandardMaterial.METALLIC);
	}

	/**
	 * @internal
	 */
	set _Metallic(value: number) {
		this._shaderValues.setNumber(PBRStandardMaterial.METALLIC, value);
	}

	/**
	 * @internal
	 */
	get _Glossiness(): number {
		return this._shaderValues.getNumber(PBRStandardMaterial.SMOOTHNESS);
	}

	/**
	 * @internal
	 */
	set _Glossiness(value: number) {
		this._shaderValues.setNumber(PBRStandardMaterial.SMOOTHNESS, value);
	}

	/**
	 * @internal
	 */
	get _GlossMapScale(): number {
		return this._shaderValues.getNumber(PBRStandardMaterial.SMOOTHNESSSCALE);
	}

	/**
	 * @internal
	 */
	set _GlossMapScale(value: number) {
		this._shaderValues.setNumber(PBRStandardMaterial.SMOOTHNESSSCALE, value);
	}

	/**
	 * @internal
	 */
	get _BumpScale(): number {
		return this._shaderValues.getNumber(PBRStandardMaterial.NORMALSCALE);
	}

	/**
	 * @internal
	 */
	set _BumpScale(value: number) {
		this._shaderValues.setNumber(PBRStandardMaterial.NORMALSCALE, value);
	}

	/**@internal */
	get _Parallax(): number {
		return this._shaderValues.getNumber(PBRStandardMaterial.PARALLAXSCALE);
	}

	/**
	 * @internal
	 */
	set _Parallax(value: number) {
		this._shaderValues.setNumber(PBRStandardMaterial.PARALLAXSCALE, value);
	}

	/**@internal */
	get _OcclusionStrength(): number {
		return this._shaderValues.getNumber(PBRStandardMaterial.OCCLUSIONSTRENGTH);
	}

	/**
	 * @internal
	 */
	set _OcclusionStrength(value: number) {
		this._shaderValues.setNumber(PBRStandardMaterial.OCCLUSIONSTRENGTH, value);
	}

	/**
	 * @internal
	 */
	get _EmissionColorR(): number {
		return this._emissionColor.x;
	}

	/**
	 * @internal
	 */
	set _EmissionColorR(value: number) {
		this._emissionColor.x = value;
		this.emissionColor = this._emissionColor;
	}

	/**
	 * @internal
	 */
	get _EmissionColorG(): number {
		return this._emissionColor.y;
	}

	/**
	 * @internal
	 */
	set _EmissionColorG(value: number) {
		this._emissionColor.y = value;
		this.emissionColor = this._emissionColor;
	}

	/**
	 * @internal
	 */
	get _EmissionColorB(): number {
		return this._emissionColor.z;
	}

	/**
	 * @internal
	 */
	set _EmissionColorB(value: number) {
		this._emissionColor.z = value;
		this.emissionColor = this._emissionColor;
	}

	/**
	 * @internal
	 */
	get _EmissionColorA(): number {
		return this._emissionColor.w;
	}

	/**
	 * @internal
	 */
	set _EmissionColorA(value: number) {
		this._emissionColor.w = value;
		this.emissionColor = this._emissionColor;
	}

	/**
	 * @internal
	 */
	get _MainTex_STX(): number {
		return this._shaderValues.getVector(PBRStandardMaterial.TILINGOFFSET).x;
	}

	/**
	 * @internal
	 */
	set _MainTex_STX(x: number) {
		var tilOff: Vector4 = (<Vector4>this._shaderValues.getVector(PBRStandardMaterial.TILINGOFFSET));
		tilOff.x = x;
		this.tilingOffset = tilOff;
	}

	/**
	 * @internal
	 */
	get _MainTex_STY(): number {
		return this._shaderValues.getVector(PBRStandardMaterial.TILINGOFFSET).y;
	}

	/**
	 * @internal
	 */
	set _MainTex_STY(y: number) {
		var tilOff: Vector4 = (<Vector4>this._shaderValues.getVector(PBRStandardMaterial.TILINGOFFSET));
		tilOff.y = y;
		this.tilingOffset = tilOff;
	}

	/**
	 * @internal
	 */
	get _MainTex_STZ(): number {
		return this._shaderValues.getVector(PBRStandardMaterial.TILINGOFFSET).z;
	}

	/**
	 * @internal
	 */
	set _MainTex_STZ(z: number) {
		var tilOff: Vector4 = (<Vector4>this._shaderValues.getVector(PBRStandardMaterial.TILINGOFFSET));
		tilOff.z = z;
		this.tilingOffset = tilOff;
	}

	/**
	 * @internal
	 */
	get _MainTex_STW(): number {
		return this._shaderValues.getVector(PBRStandardMaterial.TILINGOFFSET).w;
	}

	/**
	 * @internal
	 */
	set _MainTex_STW(w: number) {
		var tilOff: Vector4 = (<Vector4>this._shaderValues.getVector(PBRStandardMaterial.TILINGOFFSET));
		tilOff.w = w;
		this.tilingOffset = tilOff;
	}

	/**
	 * @internal
	 */
	get _Cutoff(): number {
		return this.alphaTestValue;
	}

	/**
	 * @internal
	 */
	set _Cutoff(value: number) {
		this.alphaTestValue = value;
	}

	/**
	 * 获取反射率颜色R分量。
	 * @return 反射率颜色R分量。
	 */
	get albedoColorR(): number {
		return this._ColorR;
	}

	/**
	 * 设置反射率颜色R分量。
	 * @param value 反射率颜色R分量。
	 */
	set albedoColorR(value: number) {
		this._ColorR = value;
	}

	/**
	 * 获取反射率颜色G分量。
	 * @return 反射率颜色G分量。
	 */
	get albedoColorG(): number {
		return this._ColorG;
	}

	/**
	 * 设置反射率颜色G分量。
	 * @param value 反射率颜色G分量。
	 */
	set albedoColorG(value: number) {
		this._ColorG = value;
	}

	/**
	 * 获取反射率颜色B分量。
	 * @return 反射率颜色B分量。
	 */
	get albedoColorB(): number {
		return this._ColorB;
	}

	/**
	 * 设置反射率颜色B分量。
	 * @param value 反射率颜色B分量。
	 */
	set albedoColorB(value: number) {
		this._ColorB = value;
	}

	/**
	 * 获取反射率颜色Z分量。
	 * @return 反射率颜色Z分量。
	 */
	get albedoColorA(): number {
		return this._ColorA;
	}

	/**
	 * 设置反射率颜色alpha分量。
	 * @param value 反射率颜色alpha分量。
	 */
	set albedoColorA(value: number) {
		this._ColorA = value;
	}

	/**
	 * 获取漫反射颜色。
	 * @return 漫反射颜色。
	 */
	get albedoColor(): Vector4 {
		return this._albedoColor;
	}

	/**
	 * 设置漫反射颜色。
	 * @param value 漫反射颜色。
	 */
	set albedoColor(value: Vector4) {
		this._albedoColor = value;
		this._shaderValues.setVector(PBRStandardMaterial.ALBEDOCOLOR, value);
	}

	/**
	 * 获取漫反射贴图。
	 * @return 漫反射贴图。
	 */
	get albedoTexture(): BaseTexture {
		return this._shaderValues.getTexture(PBRStandardMaterial.ALBEDOTEXTURE);
	}

	/**
	 * 设置漫反射贴图。
	 * @param value 漫反射贴图。
	 */
	set albedoTexture(value: BaseTexture) {
		if (value) {
			this._shaderValues.addDefine(PBRStandardMaterial.SHADERDEFINE_ALBEDOTEXTURE);
		} else {
			this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_ALBEDOTEXTURE);
		}
		this._shaderValues.setTexture(PBRStandardMaterial.ALBEDOTEXTURE, value);
	}

	/**
	 * 获取法线贴图。
	 * @return 法线贴图。
	 */
	get normalTexture(): BaseTexture {
		return this._shaderValues.getTexture(PBRStandardMaterial.NORMALTEXTURE);
	}

	/**
	 * 设置法线贴图。
	 * @param value 法线贴图。
	 */
	set normalTexture(value: BaseTexture) {
		if (value) {
			this._shaderValues.addDefine(PBRStandardMaterial.SHADERDEFINE_NORMALTEXTURE);
		} else {
			this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_NORMALTEXTURE);
		}
		this._shaderValues.setTexture(PBRStandardMaterial.NORMALTEXTURE, value);
	}

	/**
	 * 获取法线贴图缩放系数。
	 * @return 法线贴图缩放系数。
	 */
	get normalTextureScale(): number {
		return this._BumpScale;
	}

	/**
	 * 设置法线贴图缩放系数。
	 * @param value 法线贴图缩放系数。
	 */
	set normalTextureScale(value: number) {
		this._BumpScale = value;
	}

	/**
	 * 获取视差贴图。
	 * @return 视察贴图。
	 */
	get parallaxTexture(): BaseTexture {
		return this._shaderValues.getTexture(PBRStandardMaterial.PARALLAXTEXTURE);
	}

	/**
	 * 设置视差贴图。
	 * @param value 视察贴图。
	 */
	set parallaxTexture(value: BaseTexture) {
		if (value) {
			this._shaderValues.addDefine(PBRStandardMaterial.SHADERDEFINE_PARALLAXTEXTURE);
		} else {
			this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_PARALLAXTEXTURE);
		}
		this._shaderValues.setTexture(PBRStandardMaterial.PARALLAXTEXTURE, value);
	}

	/**
	 * 获取视差贴图缩放系数。
	 * @return 视差缩放系数。
	 */
	get parallaxTextureScale(): number {
		return this._Parallax;
	}

	/**
	 * 设置视差贴图缩放系数。
	 * @param value 视差缩放系数。
	 */
	set parallaxTextureScale(value: number) {
		this._Parallax = Math.max(0.005, Math.min(0.08, value));
	}

	/**
	 * 获取遮挡贴图。
	 * @return 遮挡贴图。
	 */
	get occlusionTexture(): BaseTexture {
		return this._shaderValues.getTexture(PBRStandardMaterial.OCCLUSIONTEXTURE);
	}

	/**
	 * 设置遮挡贴图。
	 * @param value 遮挡贴图。
	 */
	set occlusionTexture(value: BaseTexture) {
		if (value) {
			this._shaderValues.addDefine(PBRStandardMaterial.SHADERDEFINE_OCCLUSIONTEXTURE);
		} else {
			this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_OCCLUSIONTEXTURE);
		}
		this._shaderValues.setTexture(PBRStandardMaterial.OCCLUSIONTEXTURE, value);
	}

	/**
	 * 获取遮挡贴图强度。
	 * @return 遮挡贴图强度,范围为0到1。
	 */
	get occlusionTextureStrength(): number {
		return this._OcclusionStrength;
	}

	/**
	 * 设置遮挡贴图强度。
	 * @param value 遮挡贴图强度,范围为0到1。
	 */
	set occlusionTextureStrength(value: number) {
		this._OcclusionStrength = Math.max(0.0, Math.min(1.0, value));
	}

	/**
	 * 获取金属光滑度贴图。
	 * @return 金属光滑度贴图。
	 */
	get metallicGlossTexture(): BaseTexture {
		return this._shaderValues.getTexture(PBRStandardMaterial.METALLICGLOSSTEXTURE);
	}

	/**
	 * 设置金属光滑度贴图。
	 * @param value 金属光滑度贴图。
	 */
	set metallicGlossTexture(value: BaseTexture) {
		if (value) {
			this._shaderValues.addDefine(PBRStandardMaterial.SHADERDEFINE_METALLICGLOSSTEXTURE);
		} else {
			this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_METALLICGLOSSTEXTURE);
		}
		this._shaderValues.setTexture(PBRStandardMaterial.METALLICGLOSSTEXTURE, value);
	}

	/**
	 * 获取金属度。
	 * @return 金属度,范围为0到1。
	 */
	get metallic(): number {
		return this._Metallic;
	}

	/**
	 * 设置金属度。
	 * @param value 金属度,范围为0到1。
	 */
	set metallic(value: number) {
		this._Metallic = Math.max(0.0, Math.min(1.0, value));
	}

	/**
	 * 获取光滑度。
	 * @return 光滑度,范围为0到1。
	 */
	get smoothness(): number {
		return this._Glossiness;
	}

	/**
	 * 设置光滑度。
	 * @param value 光滑度,范围为0到1。
	 */
	set smoothness(value: number) {
		this._Glossiness = Math.max(0.0, Math.min(1.0, value));
	}

	/**
	 * 获取光滑度缩放系数。
	 * @return 光滑度缩放系数,范围为0到1。
	 */
	get smoothnessTextureScale(): number {
		return this._GlossMapScale;
	}

	/**
	 * 设置光滑度缩放系数。
	 * @param value 光滑度缩放系数,范围为0到1。
	 */
	set smoothnessTextureScale(value: number) {
		this._GlossMapScale = Math.max(0.0, Math.min(1.0, value));
	}

	/**
	 * 获取光滑度数据源
	 * @return 光滑滑度数据源,0或1。
	 */
	get smoothnessSource(): number {
		return this._shaderValues.getInt(PBRStandardMaterial.SMOOTHNESSSOURCE);
	}

	/**
	 * 设置光滑度数据源。
	 * @param value 光滑滑度数据源,0或1。
	 */
	set smoothnessSource(value: number) {
		if (value) {
			this._shaderValues.addDefine(PBRStandardMaterial.SHADERDEFINE_SMOOTHNESSSOURCE_ALBEDOTEXTURE_ALPHA);
			this._shaderValues.setInt(PBRStandardMaterial.SMOOTHNESSSOURCE, 1);
		} else {
			this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_SMOOTHNESSSOURCE_ALBEDOTEXTURE_ALPHA);
			this._shaderValues.setInt(PBRStandardMaterial.SMOOTHNESSSOURCE, 0);
		}
	}

	/**
	 * 获取是否激活放射属性。
	 * @return 是否激活放射属性。
	 */
	get enableEmission(): boolean {
		return this._shaderValues.getBool(PBRStandardMaterial.ENABLEEMISSION);
	}

	/**
	 * 设置是否激活放射属性。
	 * @param value 是否激活放射属性
	 */
	set enableEmission(value: boolean) {
		if (value) {
			this._shaderValues.addDefine(PBRStandardMaterial.SHADERDEFINE_EMISSION);
		} else {
			this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_EMISSION);
		}
		this._shaderValues.setBool(PBRStandardMaterial.ENABLEEMISSION, value);
	}

	/**
	 * 获取放射颜色R分量。
	 * @return 放射颜色R分量。
	 */
	get emissionColorR(): number {
		return this._EmissionColorR;
	}

	/**
	 * 设置放射颜色R分量。
	 * @param value 放射颜色R分量。
	 */
	set emissionColorR(value: number) {
		this._EmissionColorR = value;
	}

	/**
	 * 获取放射颜色G分量。
	 * @return 放射颜色G分量。
	 */
	get emissionColorG(): number {
		return this._EmissionColorG;
	}

	/**
	 * 设置放射颜色G分量。
	 * @param value 放射颜色G分量。
	 */
	set emissionColorG(value: number) {
		this._EmissionColorG = value;
	}

	/**
	 * 获取放射颜色B分量。
	 * @return 放射颜色B分量。
	 */
	get emissionColorB(): number {
		return this._EmissionColorB;
	}

	/**
	 * 设置放射颜色B分量。
	 * @param value 放射颜色B分量。
	 */
	set emissionColorB(value: number) {
		this._EmissionColorB = value;
	}

	/**
	 * 获取放射颜色A分量。
	 * @return 放射颜色A分量。
	 */
	get emissionColorA(): number {
		return this._EmissionColorA;
	}

	/**
	 * 设置放射颜色A分量。
	 * @param value 放射颜色A分量。
	 */
	set emissionColorA(value: number) {
		this._EmissionColorA = value;
	}

	/**
	 * 获取放射颜色。
	 * @return 放射颜色。
	 */
	get emissionColor(): Vector4 {
		return (<Vector4>this._shaderValues.getVector(PBRStandardMaterial.EMISSIONCOLOR));
	}

	/**
	 * 设置放射颜色。
	 * @param value 放射颜色。
	 */
	set emissionColor(value: Vector4) {
		this._shaderValues.setVector(PBRStandardMaterial.EMISSIONCOLOR, value);
	}

	/**
	 * 获取放射贴图。
	 * @return 放射贴图。
	 */
	get emissionTexture(): BaseTexture {
		return this._shaderValues.getTexture(PBRStandardMaterial.EMISSIONTEXTURE);
	}

	/**
	 * 设置放射贴图。
	 * @param value 放射贴图。
	 */
	set emissionTexture(value: BaseTexture) {
		if (value) {
			this._shaderValues.addDefine(PBRStandardMaterial.SHADERDEFINE_EMISSIONTEXTURE);
		} else {
			this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_EMISSIONTEXTURE);
		}
		this._shaderValues.setTexture(PBRStandardMaterial.EMISSIONTEXTURE, value);
	}

	/**
	 * 获取是否开启反射。
	 * @return 是否开启反射。
	 */
	get enableReflection(): boolean {
		return this._shaderValues.getBool(PBRStandardMaterial.ENABLEREFLECT);
	}

	/**
	 * 设置是否开启反射。
	 * @param value 是否开启反射。
	 */
	set enableReflection(value: boolean) {
		this._shaderValues.setBool(PBRStandardMaterial.ENABLEREFLECT, true);
		if (value) {
			this._disablePublicDefineDatas.remove(Scene3DShaderDeclaration.SHADERDEFINE_REFLECTMAP);
		} else {
			this._disablePublicDefineDatas.add(Scene3DShaderDeclaration.SHADERDEFINE_REFLECTMAP);
		}
	}

	/**
	 * 获取纹理平铺和偏移X分量。
	 * @return 纹理平铺和偏移X分量。
	 */
	get tilingOffsetX(): number {
		return this._MainTex_STX;
	}

	/**
	 * 获取纹理平铺和偏移X分量。
	 * @param x 纹理平铺和偏移X分量。
	 */
	set tilingOffsetX(x: number) {
		this._MainTex_STX = x;
	}

	/**
	 * 获取纹理平铺和偏移Y分量。
	 * @return 纹理平铺和偏移Y分量。
	 */
	get tilingOffsetY(): number {
		return this._MainTex_STY;
	}

	/**
	 * 获取纹理平铺和偏移Y分量。
	 * @param y 纹理平铺和偏移Y分量。
	 */
	set tilingOffsetY(y: number) {
		this._MainTex_STY = y;
	}

	/**
	 * 获取纹理平铺和偏移Z分量。
	 * @return 纹理平铺和偏移Z分量。
	 */
	get tilingOffsetZ(): number {
		return this._MainTex_STZ;
	}

	/**
	 * 获取纹理平铺和偏移Z分量。
	 * @param z 纹理平铺和偏移Z分量。
	 */
	set tilingOffsetZ(z: number) {
		this._MainTex_STZ = z;
	}

	/**
	 * 获取纹理平铺和偏移W分量。
	 * @return 纹理平铺和偏移W分量。
	 */
	get tilingOffsetW(): number {
		return this._MainTex_STW;
	}

	/**
	 * 获取纹理平铺和偏移W分量。
	 * @param w 纹理平铺和偏移W分量。
	 */
	set tilingOffsetW(w: number) {
		this._MainTex_STW = w;
	}

	/**
	 * 获取纹理平铺和偏移。
	 * @return 纹理平铺和偏移。
	 */
	get tilingOffset(): Vector4 {
		return (<Vector4>this._shaderValues.getVector(PBRStandardMaterial.TILINGOFFSET));
	}

	/**
	 * 获取纹理平铺和偏移。
	 * @param value 纹理平铺和偏移。
	 */
	set tilingOffset(value: Vector4) {
		if (value) {
			if (value.x != 1 || value.y != 1 || value.z != 0 || value.w != 0) {
				this._shaderValues.addDefine(PBRStandardMaterial.SHADERDEFINE_TILINGOFFSET);
			} else {
				this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_TILINGOFFSET);
			}
		} else {
			this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_TILINGOFFSET);
		}
		this._shaderValues.setVector(PBRStandardMaterial.TILINGOFFSET, value);
	}

	/**
	 * 设置渲染模式。
	 * @return 渲染模式。
	 */
	set renderMode(value: number) {
		switch (value) {
			case PBRStandardMaterial.RENDERMODE_OPAQUE:
				this.alphaTest = false;
				this.renderQueue = BaseMaterial.RENDERQUEUE_OPAQUE;
				this.depthWrite = true;
				this.cull = RenderState.CULL_BACK;
				this.blend = RenderState.BLEND_DISABLE;
				this.depthTest = RenderState.DEPTHTEST_LESS;
				this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_ALPHAPREMULTIPLY);
				break;
			case PBRStandardMaterial.RENDERMODE_CUTOUT:
				this.renderQueue = BaseMaterial.RENDERQUEUE_ALPHATEST;
				this.alphaTest = true;
				this.depthWrite = true;
				this.cull = RenderState.CULL_BACK;
				this.blend = RenderState.BLEND_DISABLE;
				this.depthTest = RenderState.DEPTHTEST_LESS;
				this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_ALPHAPREMULTIPLY);
				break;
			case PBRStandardMaterial.RENDERMODE_FADE:
				this.renderQueue = BaseMaterial.RENDERQUEUE_TRANSPARENT;
				this.alphaTest = false;
				this.depthWrite = false;
				this.cull = RenderState.CULL_BACK;
				this.blend = RenderState.BLEND_ENABLE_ALL;
				this.blendSrc = RenderState.BLENDPARAM_SRC_ALPHA;
				this.blendDst = RenderState.BLENDPARAM_ONE_MINUS_SRC_ALPHA;
				this.depthTest = RenderState.DEPTHTEST_LESS;
				this._shaderValues.removeDefine(PBRStandardMaterial.SHADERDEFINE_ALPHAPREMULTIPLY);
				break;
				break;
			case PBRStandardMaterial.RENDERMODE_TRANSPARENT:
				this.renderQueue = BaseMaterial.RENDERQUEUE_TRANSPARENT;
				this.alphaTest = false;
				this.depthWrite = false;
				this.cull = RenderState.CULL_BACK;
				this.blend = RenderState.BLEND_ENABLE_ALL;
				this.blendSrc = RenderState.BLENDPARAM_ONE;
				this.blendDst = RenderState.BLENDPARAM_ONE_MINUS_SRC_ALPHA;
				this.depthTest = RenderState.DEPTHTEST_LESS;
				this._shaderValues.addDefine(PBRStandardMaterial.SHADERDEFINE_ALPHAPREMULTIPLY);
				break;
			default:
				throw new Error("PBRSpecularMaterial : renderMode value error.");
		}
	}

	/**
	 * 设置是否写入深度。
	 * @param value 是否写入深度。
	 */
	set depthWrite(value: boolean) {
		this._shaderValues.setBool(PBRStandardMaterial.DEPTH_WRITE, value);
	}

	/**
	 * 获取是否写入深度。
	 * @return 是否写入深度。
	 */
	get depthWrite(): boolean {
		return this._shaderValues.getBool(PBRStandardMaterial.DEPTH_WRITE);
	}

	/**
	 * 设置剔除方式。
	 * @param value 剔除方式。
	 */
	set cull(value: number) {
		this._shaderValues.setInt(PBRStandardMaterial.CULL, value);
	}

	/**
	 * 获取剔除方式。
	 * @return 剔除方式。
	 */
	get cull(): number {
		return this._shaderValues.getInt(PBRStandardMaterial.CULL);
	}

	/**
	 * 设置混合方式。
	 * @param value 混合方式。
	 */
	set blend(value: number) {
		this._shaderValues.setInt(PBRStandardMaterial.BLEND, value);
	}

	/**
	 * 获取混合方式。
	 * @return 混合方式。
	 */
	get blend(): number {
		return this._shaderValues.getInt(PBRStandardMaterial.BLEND);
	}

	/**
	 * 设置混合源。
	 * @param value 混合源
	 */
	set blendSrc(value: number) {
		this._shaderValues.setInt(PBRStandardMaterial.BLEND_SRC, value);
	}

	/**
	 * 获取混合源。
	 * @return 混合源。
	 */
	get blendSrc(): number {
		return this._shaderValues.getInt(PBRStandardMaterial.BLEND_SRC);
	}

	/**
	 * 设置混合目标。
	 * @param value 混合目标
	 */
	set blendDst(value: number) {
		this._shaderValues.setInt(PBRStandardMaterial.BLEND_DST, value);
	}

	/**
	 * 获取混合目标。
	 * @return 混合目标。
	 */
	get blendDst(): number {
		return this._shaderValues.getInt(PBRStandardMaterial.BLEND_DST);
	}

	/**
	 * 设置深度测试方式。
	 * @param value 深度测试方式
	 */
	set depthTest(value: number) {
		this._shaderValues.setInt(PBRStandardMaterial.DEPTH_TEST, value);
	}

	/**
	 * 获取深度测试方式。
	 * @return 深度测试方式。
	 */
	get depthTest(): number {
		return this._shaderValues.getInt(PBRStandardMaterial.DEPTH_TEST);
	}

	/**
	 * 创建一个 <code>PBRStandardMaterial</code> 实例。
	 */
	constructor() {
		super();
		this.setShaderName("PBRStandard");
		this._albedoColor = new Vector4(1.0, 1.0, 1.0, 1.0);
		this._shaderValues.setVector(PBRStandardMaterial.ALBEDOCOLOR, new Vector4(1.0, 1.0, 1.0, 1.0));
		this._emissionColor = new Vector4(0.0, 0.0, 0.0, 0.0);
		this._shaderValues.setVector(PBRStandardMaterial.EMISSIONCOLOR, new Vector4(0.0, 0.0, 0.0, 0.0));
		this._shaderValues.setNumber(PBRStandardMaterial.METALLIC, 0.0);
		this._shaderValues.setNumber(PBRStandardMaterial.SMOOTHNESS, 0.5);
		this._shaderValues.setNumber(PBRStandardMaterial.SMOOTHNESSSCALE, 1.0);
		this._shaderValues.setNumber(PBRStandardMaterial.SMOOTHNESSSOURCE, 0);
		this._shaderValues.setNumber(PBRStandardMaterial.OCCLUSIONSTRENGTH, 1.0);
		this._shaderValues.setNumber(PBRStandardMaterial.NORMALSCALE, 1.0);
		this._shaderValues.setNumber(PBRStandardMaterial.PARALLAXSCALE, 0.001);
		this._shaderValues.setBool(PBRStandardMaterial.ENABLEEMISSION, false);
		this._shaderValues.setBool(PBRStandardMaterial.ENABLEREFLECT, true);
		this._shaderValues.setNumber(BaseMaterial.ALPHATESTVALUE, 0.5);
		this._disablePublicDefineDatas.remove(Scene3DShaderDeclaration.SHADERDEFINE_REFLECTMAP);
		this.renderMode = PBRStandardMaterial.RENDERMODE_OPAQUE;
	}

	/**
	 * 克隆。
	 * @return	 克隆副本。
	 * @override
	 */
	clone(): any {
		var dest: PBRStandardMaterial = new PBRStandardMaterial();
		this.cloneTo(dest);
		return dest;
	}

	/**
	 * @inheritDoc
	 * @override
	 */
	cloneTo(destObject: any): void {
		super.cloneTo(destObject);
		var destMaterial: PBRStandardMaterial = (<PBRStandardMaterial>destObject);
		this._albedoColor.cloneTo(destMaterial._albedoColor);
		this._emissionColor.cloneTo(destMaterial._emissionColor);
	}
}


