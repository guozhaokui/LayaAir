import { Loader } from "../../../net/Loader";
import { BaseTexture } from "../../../resource/BaseTexture";
import { Resource } from "../../../resource/Resource";
import { Handler } from "../../../utils/Handler";
import { Vector2 } from "../../math/Vector2";
import { Vector3 } from "../../math/Vector3";
import { Vector4 } from "../../math/Vector4";
import { BlendFactor } from "../../../RenderEngine/RenderEnum/BlendFactor";
import { BlendEquationSeparate } from "../../../RenderEngine/RenderEnum/BlendEquationSeparate";
import { CompareFunction } from "../../../RenderEngine/RenderEnum/CompareFunction";
import { Laya } from "../../../../Laya";
import { DefineDatas } from "../../../RenderEngine/RenderShader/DefineDatas";
import { Shader3D } from "../../../RenderEngine/RenderShader/Shader3D";
import { ShaderData } from "../../../RenderEngine/RenderShader/ShaderData";
import { ShaderDefine } from "../../../RenderEngine/RenderShader/ShaderDefine";
import { UniformBufferObject } from "../../../RenderEngine/UniformBufferObject";
import { ClassUtils } from "../../../utils/ClassUtils";
import { IClone } from "../IClone";
import { LayaGL } from "../../../layagl/LayaGL";
import { Config3D } from "../../../../Config3D";
import { UnifromBufferData } from "../../../RenderEngine/UniformBufferData";
import { BufferUsage } from "../../../RenderEngine/RenderEnum/BufferTargetType";
import { ShaderDataType } from "../render/command/SetShaderDataCMD";

/**
 * <code>Material</code> 类用于创建材质。
 */
export class Material extends Resource implements IClone {
	/**Material资源。*/
	static MATERIAL: string = "MATERIAL";

	/** 渲染队列_不透明。*/
	static RENDERQUEUE_OPAQUE: number = 2000;
	/** 渲染队列_阿尔法裁剪。*/
	static RENDERQUEUE_ALPHATEST: number = 2450;
	/** 渲染队列_透明。*/
	static RENDERQUEUE_TRANSPARENT: number = 3000;

	/**着色器变量,透明测试值。*/
	static ALPHATESTVALUE: number;
	/**@internal */
	static CULL: number;
	/**@internal */
	static BLEND: number;
	/**@internal */
	static BLEND_SRC: number;
	/**@internal */
	static BLEND_DST: number;
	/**@internal */
	static DEPTH_TEST: number;
	/**@internal */
	static DEPTH_WRITE: number;
	/**@internal */
	static STENCIL_TEST: number;
	/**@internal */
	static STENCIL_WRITE: number;
	/**@internal */
	static STENCIL_Ref: number;
	/**@internal */
	static STENCIL_Op: number;

	/**@internal */


	/**材质级着色器宏定义,透明测试。*/
	static SHADERDEFINE_ALPHATEST: ShaderDefine;

	/**
	 * 加载材质。
	 * @param url 材质地址。
	 * @param complete 完成回掉。
	 */
	static load(url: string, complete: Handler): void {
		Laya.loader.create(url, complete, null, Material.MATERIAL);
	}

	/**
	 * @internal
	 */
	static __initDefine__(): void {
		Material.SHADERDEFINE_ALPHATEST = Shader3D.getDefineByName("ALPHATEST");
		Material.ALPHATESTVALUE = Shader3D.propertyNameToID("u_AlphaTestValue");
		Material.CULL = Shader3D.propertyNameToID("s_Cull");
		Material.BLEND = Shader3D.propertyNameToID("s_Blend");
		Material.BLEND_SRC = Shader3D.propertyNameToID("s_BlendSrc");
		Material.BLEND_DST = Shader3D.propertyNameToID("s_BlendDst");
		Material.DEPTH_TEST = Shader3D.propertyNameToID("s_DepthTest");
		Material.DEPTH_WRITE = Shader3D.propertyNameToID("s_DepthWrite");
		Material.STENCIL_TEST = Shader3D.propertyNameToID("s_StencilTest");
		Material.STENCIL_WRITE = Shader3D.propertyNameToID("s_StencilWrite");
		Material.STENCIL_Ref = Shader3D.propertyNameToID("s_StencilRef");
		Material.STENCIL_Op = Shader3D.propertyNameToID("s_StencilOp");
	}

	/**
	 * TODO:
	 * 兼容Blend数据
	 */
	static _getRenderStateParams(type: number) {
		switch (type) {
			case 0x0300:
				return BlendFactor.SourceColor;
			case 0x0301:
				return BlendFactor.OneMinusSourceColor;
			case 0x0306:
				return BlendFactor.DestinationColor;
			case 0x0307:
				return BlendFactor.OneMinusDestinationColor;
			case 0x0302:
				return BlendFactor.SourceAlpha;
			case 0x0303:
				return BlendFactor.OneMinusSourceAlpha;
			case 0x0304:
				return BlendFactor.DestinationAlpha;
			case 0x0305:
				return BlendFactor.OneMinusDestinationAlpha;
			case 0x0308:
				return BlendFactor.SourceAlphaSaturate;
			case 0x8006:
				return BlendEquationSeparate.ADD;
			case 0x800A:
				return BlendEquationSeparate.SUBTRACT;
			case 0x800B:
				return BlendEquationSeparate.REVERSE_SUBTRACT;
			case 0x0200:
				return CompareFunction.Never;
			case 0x0201:
				return CompareFunction.Less;
			case 0x0202:
				return CompareFunction.Equal;
			case 0x0203:
				return CompareFunction.LessEqual;
			case 0x0204:
				return CompareFunction.Greater;
			case 0x0205:
				return CompareFunction.NotEqual;
			case 0x0206:
				return CompareFunction.GreaterEqual;
			case 0x0207:
				return CompareFunction.Always;
			default:
				return type;
		}
	}

	/**
	 * TODO:需要改动
	 * @inheritDoc
	 */
	static _parse(data: any, propertyParams: any = null, constructParams: any[] = null): Material {
		var jsonData: any = data;
		var props: any = jsonData.props;

		var material;
		var classType: string = props.type;
		//var clasPaths: any[] = classType.split('.');
		//var clas: new () => any = Browser.window;
		//clasPaths.forEach(function (cls: any): void {
		//	clas = clas[cls];
		//});
		var clas: any = ClassUtils.getRegClass(classType);
		if (clas)
			material = new clas();
		else {
			material = new Material();
			material.setShaderName(classType);
		}


		switch (jsonData.version) {
			case "LAYAMATERIAL:01":
			case "LAYAMATERIAL:02":
				var i: number, n: number;
				for (var key in props) {
					switch (key) {
						case "type":
							break;
						case "vectors":
							var vectors = props[key];
							for (i = 0, n = vectors.length; i < n; i++) {
								var vector = vectors[i];
								var vectorValue = vector.value;
								switch (vectorValue.length) {
									case 2:
										material[vector.name] = new Vector2(vectorValue[0], vectorValue[1]);
										break;
									case 3:
										material[vector.name] = new Vector3(vectorValue[0], vectorValue[1], vectorValue[2]);
										break;
									case 4:
										material[vector.name] = new Vector4(vectorValue[0], vectorValue[1], vectorValue[2], vectorValue[3]);
										break;
									default:
										throw new Error("BaseMaterial:unkonwn color length.");
								}
							}
							break;
						case "textures":
							var textures: any[] = props[key];
							for (i = 0, n = textures.length; i < n; i++) {
								var texture: any = textures[i];
								var path: string = texture.path;
								(path) && (material[texture.name] = Loader.getRes(path));
							}
							break;
						case "defines":
							var defineNames: any[] = props[key];
							for (i = 0, n = defineNames.length; i < n; i++) {
								var define: ShaderDefine = Shader3D.getDefineByName(defineNames[i]);//TODO:是否取消defines
								material._shaderValues.addDefine(define);
							}
							break;
						case "renderStates"://"LAYAMATERIAL:02" 
							var renderStatesData: any[] = props[key];
							var renderStateData: any = renderStatesData[0];
							var mat: Material = (<Material>material);//TODO:临时兼容
							mat.blend = renderStateData.blend;
							mat.cull = this._getRenderStateParams(renderStateData.cull);
							mat.depthTest = this._getRenderStateParams(renderStateData.depthTest);
							mat.depthWrite = renderStateData.depthWrite;
							mat.blendSrc = this._getRenderStateParams(renderStateData.srcBlend);
							mat.blendDst = this._getRenderStateParams(renderStateData.dstBlend);
							break;
						case "cull"://"LAYAMATERIAL:01"
							((<any>material)).cull = this._getRenderStateParams(props[key]);
							break;
						case "blend"://"LAYAMATERIAL:01"
							((<any>material)).blend = this._getRenderStateParams(props[key]);
							break;
						case "depthWrite"://"LAYAMATERIAL:01" 
							((<any>material)).depthWrite = this._getRenderStateParams(props[key]);
							break;
						case "srcBlend"://"LAYAMATERIAL:01" 
							((<any>material)).blendSrc = this._getRenderStateParams(props[key]);
							break;
						case "dstBlend"://"LAYAMATERIAL:01" 
							((<any>material)).blendDst = this._getRenderStateParams(props[key]);
							break;
						case "depthTest":
							((<any>material)).depthTest = this._getRenderStateParams(props[key]);
							break;
						case "blendDst":
							((<any>material)).blendDst = this._getRenderStateParams(props[key]);
							break;
						case "blendSrc":
							((<any>material)).blendSrc = this._getRenderStateParams(props[key]);
							break;
						default:
							material[key] = props[key];
					}
				}
				break;
			case "LAYAMATERIAL:03":
				var i: number, n: number;
				for (var key in props) {
					switch (key) {
						case "type":
						case "name":
							break;
						case "defines":
							var defineNames: any[] = props[key];
							for (i = 0, n = defineNames.length; i < n; i++) {
								var define: ShaderDefine = Shader3D.getDefineByName(defineNames[i]);//TODO:是否取消defines
								material._shaderValues.addDefine(define);
							}
							break;
						case "textures":
							var textures: any[] = props[key];
							for (i = 0, n = textures.length; i < n; i++) {
								var texture: any = textures[i];
								var path: string = texture.path;
								(path) && (material._shaderValues.setTexture(Shader3D.propertyNameToID(texture.name), Loader.getRes(path)));
							}
							break;
						default:
							var property = props[key];
							var uniName = Shader3D.propertyNameToID(key);
							if (!property.length) {
								material._shaderValues.setNumber(uniName, props[key]);
							} else {
								var vectorValue = property;
								switch (vectorValue.length) {
									case 2:
										material._shaderValues.setVector2(uniName, new Vector2(vectorValue[0], vectorValue[1]));
										break;
									case 3:
										material._shaderValues.setVector3(uniName, new Vector3(vectorValue[0], vectorValue[1], vectorValue[2]));
										break;
									case 4:
										material._shaderValues.setVector(uniName, new Vector4(vectorValue[0], vectorValue[1], vectorValue[2], vectorValue[3]));
										break;
									default:
										throw new Error("BaseMaterial:unkonwn color length.");
								}
							}
					}
				}
				break;
			default:
				throw new Error("BaseMaterial:unkonwn version.");
		}
		return material;
	}


	/** @internal */
	_shader: Shader3D;
	/** @private */
	_shaderValues: ShaderData | null;//TODO:剥离贴图ShaderValue
	/** 所属渲染队列. */
	renderQueue: number;

	/**@internal */
	private _uniformBufferDatas: Map<string, UniformBufferObject>;


	/**
	 * 着色器数据。
	 */
	get shaderData(): ShaderData {
		return this._shaderValues;
	}

	/**
	 * 透明测试模式裁剪值。
	 */
	get alphaTestValue(): number {
		return this._shaderValues.getNumber(Material.ALPHATESTVALUE);
	}

	set alphaTestValue(value: number) {
		this._shaderValues.setNumber(Material.ALPHATESTVALUE, value);
	}

	/**
	 * 是否透明裁剪。
	 */
	get alphaTest(): boolean {
		return this.shaderData.hasDefine(Material.SHADERDEFINE_ALPHATEST);
	}

	set alphaTest(value: boolean) {
		if (value)
			this._shaderValues.addDefine(Material.SHADERDEFINE_ALPHATEST);
		else
			this._shaderValues.removeDefine(Material.SHADERDEFINE_ALPHATEST);
	}

	/**
	 * 是否写入深度。
	 */
	get depthWrite(): boolean {
		return this._shaderValues.getBool(Material.DEPTH_WRITE);
	}

	set depthWrite(value: boolean) {
		this._shaderValues.setBool(Material.DEPTH_WRITE, value);
	}


	/**
	 * 剔除方式。
	 */
	get cull(): number {
		return this._shaderValues.getInt(Material.CULL);
	}

	set cull(value: number) {
		this._shaderValues.setInt(Material.CULL, value);
	}

	/**
	 * 混合方式。
	 */
	get blend(): number {
		return this._shaderValues.getInt(Material.BLEND);
	}

	set blend(value: number) {
		this._shaderValues.setInt(Material.BLEND, value);
	}


	/**
	 * 混合源。
	 */
	get blendSrc(): number {
		return this._shaderValues.getInt(Material.BLEND_SRC);
	}

	set blendSrc(value: number) {
		this._shaderValues.setInt(Material.BLEND_SRC, value);
	}



	/**
	 * 混合目标。
	 */
	get blendDst(): number {
		return this._shaderValues.getInt(Material.BLEND_DST);
	}

	set blendDst(value: number) {
		this._shaderValues.setInt(Material.BLEND_DST, value);
	}

	/**
	 * 深度测试方式。
	 */
	get depthTest(): number {
		return this._shaderValues.getInt(Material.DEPTH_TEST);
	}

	set depthTest(value: number) {
		this._shaderValues.setInt(Material.DEPTH_TEST, value);
	}

	/**
	 * 模板测试方式
	 */
	get stencilTest(): number {
		return this._shaderValues.getInt(Material.STENCIL_TEST);
	}

	set stencilTest(value: number) {
		this._shaderValues.setInt(Material.STENCIL_TEST, value);
	}

	/**
	 * 是否写入模板。
	 */
	get stencilWrite(): boolean {
		return this._shaderValues.getBool(Material.STENCIL_WRITE);
	}

	set stencilWrite(value: boolean) {
		this._shaderValues.setBool(Material.STENCIL_WRITE, value);
	}

	/**
	 * 写入模板值
	 */
	set stencilRef(value: number) {
		this._shaderValues.setInt(Material.STENCIL_Ref, value);
	}

	get stencilRef(): number {
		return this._shaderValues.getInt(Material.STENCIL_Ref);
	}

	/** */
	/**
	 * 写入模板测试设置
	 * vector(fail, zfail, zpass)
	 */
	set stencilOp(value: Vector3) {
		this._shaderValues.setVector3(Material.STENCIL_Op, value);
	}

	get stencilOp(): Vector3 {
		return this._shaderValues.getVector3(Material.STENCIL_Op);
	}

	/**
	 * 获得材质属性
	 */
	get MaterialProperty(): any {
		let propertyMap: any = {};
		var shaderValues = this._shaderValues.getData();
		for (let key in shaderValues) {
			propertyMap[Shader3D._propertyNameMap[parseInt(key)]] = shaderValues[key];
		}
		return propertyMap;
	}

	/**
	 * 获得材质宏
	 */
	get MaterialDefine(): Array<string> {
		let shaderDefineArray = new Array<string>();
		let defineData = this._shaderValues._defineDatas;
		Shader3D._getNamesByDefineData(defineData, shaderDefineArray);
		return shaderDefineArray;
	}

	/**
	 * 创建一个 <code>BaseMaterial</code> 实例。
	 */
	constructor() {
		super();
		this._shaderValues = LayaGL.renderOBJCreate.createShaderData(this);
		this.renderQueue = Material.RENDERQUEUE_OPAQUE;
		this.alphaTest = false;
		if (Config3D._config._uniformBlock)
			this._uniformBufferDatas = new Map();
	}

	/**
	 * @internal
	 */
	private _removeTetxureReference(): void {
		var data: any = this._shaderValues.getData();
		for (var k in data) {
			var value: any = data[k];
			if (value && value instanceof BaseTexture)//TODO:需要优化,杜绝is判断，慢
				(<BaseTexture>value)._removeReference();
		}
	}

	//根据绑定的shader 缓存一些特殊的数据
	private _bindShaderInfo(shader: Shader3D) {
		//update UBOData by Shader
		let subShader = shader.getSubShaderAt(0);//TODO	
		let shaderUBODatas = subShader._uniformBufferData;
		if (!shaderUBODatas)
			return;
		for (let key of shaderUBODatas.keys()) {
			//create data
			let uboData = shaderUBODatas.get(key).clone();
			//create UBO
			let ubo = UniformBufferObject.create(key, BufferUsage.Dynamic, uboData.getbyteLength(), false);
			ubo.setDataByUniformBufferData(uboData);
			this._shaderValues.setValueData(Shader3D.propertyNameToID(key), ubo);
			this._uniformBufferDatas.set(key, ubo);
		}
	}

	private _releaseUBOData() {
		if (!Config3D._config._uniformBlock)
			return;
		for (let value of this._uniformBufferDatas.values()) {
			value._updateDataInfo.destroy();
			value.destroy();
		}
		this._uniformBufferDatas.clear();
	}

	/**
	 * @inheritDoc
	 * @override
	 */
	protected _disposeResource(): void {
		if (this._referenceCount > 0)
			this._removeTetxureReference();
		this._shaderValues = null;
	}

	/**
	 * @implements IReferenceCounter
	 * @internal
	 * @override
	 */
	_addReference(count: number = 1): void {
		super._addReference(count);
		var data: any = this._shaderValues.getData();
		for (var k in data) {
			var value: any = data[k];
			if (value && value instanceof BaseTexture)//TODO:需要优化,杜绝is判断，慢
				(<BaseTexture>value)._addReference();
		}
	}

	/**
	 * @implements IReferenceCounter
	 * @internal
	 * @override
	 */
	_removeReference(count: number = 1): void {
		super._removeReference(count);
		this._removeTetxureReference();
	}




	/**
	 * 设置使用Shader名字。
	 * @param name 名称。
	 */
	setShaderName(name: string): void {
		this._shader = Shader3D.find(name);
		if (!this._shader)
			throw new Error("BaseMaterial: unknown shader name.");
		if (!Config3D._config._uniformBlock)
			return;
		this._releaseUBOData();
		//bind shader info
		this._bindShaderInfo(this._shader);
	}

	/**
	 * 设置属性值
	 * @param name 
	 * @param value 
	 */
	setShaderPropertyValue(name: string, value: any) {
		this.shaderData.setValueData(Shader3D.propertyNameToID(name), value);
	}
	/**
	 * 获取属性值
	 * @param name 
	 */
	getShaderPropertyValue(name: string): any {
		return this.shaderData.getValueData(Shader3D.propertyNameToID(name));
	}

	/**
	 * 设置UBO数据
	 * @param uboName 
	 * @param propertyName 
	 * @param value 
	 */
	setUniformBufferData(uboName: string, propertyName: string, type: ShaderDataType, value: any) {
		if (!Config3D._config._uniformBlock)
			this.setShaderPropertyValue(propertyName, value);
		else {
			let ubo = this._uniformBufferDatas.get(uboName);
			ubo._updateDataInfo._setData(Shader3D.propertyNameToID(propertyName), type, value);
			//立即更新，可以优化
			ubo.setDataByUniformBufferData(ubo._updateDataInfo);
		}
	}


	/**
	 * 克隆。
	 * @param	destObject 克隆源。
	 */
	cloneTo(destObject: any): void {
		var destBaseMaterial: Material = (<Material>destObject);
		destBaseMaterial.name = this.name;
		destBaseMaterial.renderQueue = this.renderQueue;
		this._shaderValues.cloneTo(destBaseMaterial._shaderValues);
	}

	/**
	 * 克隆。
	 * @return	 克隆副本。
	 */
	clone(): any {
		var dest: Material = new Material();
		this.cloneTo(dest);
		return dest;
	}

	destroy(): void {
		this._releaseUBOData();
		this._shaderValues.destroy();
		super.destroy();

	}

	//--------------------------------------------兼容-------------------------------------------------
	get _defineDatas(): DefineDatas {
		return this._shaderValues._defineDatas;
	}


}


