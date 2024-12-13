import { BlinnPhongMaterial } from "../d3/core/material/BlinnPhongMaterial";
import { MeshFilter } from "../d3/core/MeshFilter";
import { MeshRenderer } from "../d3/core/MeshRenderer";
import { Sprite3D } from "../d3/core/Sprite3D";
import { Mesh } from "../d3/resource/models/Mesh";
import { PrimitiveMesh } from "../d3/resource/models/PrimitiveMesh";
import { Color } from "../maths/Color";
import { Matrix4x4 } from "../maths/Matrix4x4";
import { Quaternion } from "../maths/Quaternion";
import { Vector3 } from "../maths/Vector3";
import { IK_CCDSolver } from "./CCD/IK_CCDSolver";
import { IK_Chain } from "./IK_Chain";
import { IK_ISolver } from "./IK_ISolver";
import { IK_Joint } from "./IK_Joint";
import { IK_Pose1, IK_Target } from "./IK_Pose1";

interface IK_ChainUserData{
    target:IK_Target;
    bones:Sprite3D[];
    rotOffs:Quaternion[];
    debugMod?:Sprite3D[];
}

//一个可以整体移动的系统，例如一个人身上的多个链
export class IK_System{
    private solver: IK_ISolver;
    private chains: IK_Chain[] = [];
    private rootSprite:Sprite3D = null;

    constructor() {
        this.solver = new IK_CCDSolver();
    }

    setRoot(r:Sprite3D){
        this.rootSprite=r;
    }

    setSolver(){

    }

    onPoseChange(): void {
        //TODO 
    }

    /**
     * 可以包含多个chain
     * @param chain 
     */
    addChain(chain: IK_Chain) {

    }

    private _getChildByID(sp:Sprite3D, id:number):Sprite3D|null{
        if (sp.id === id) {
            return sp;
        }
    
        const childCount = sp.numChildren;
        // 递归查找所有子节点
        for (let i = 0; i < childCount; i++) {
            const child = sp.getChildAt(i) as Sprite3D;
            
            // 递归调用
            const result = this._getChildByID(child, id);
            if (result !== null) {
                return result;
            }
        }
    
        // 如果没有找到，返回null
        return null;    
    }

    private _getChildByName(sp:Sprite3D, name:string):Sprite3D|null{
        if (sp.name === name) {
            return sp;
        }
    
        const childCount = sp.numChildren;
        // 递归查找所有子节点
        for (let i = 0; i < childCount; i++) {
            const child = sp.getChildAt(i) as Sprite3D;
            
            // 递归调用
            const result = this._getChildByName(child, name);
            if (result !== null) {
                return result;
            }
        }
    
        // 如果没有找到，返回null
        return null;    
    }

    //辅助函数
    private getByID(id:number):Sprite3D{
        return this._getChildByID(this.rootSprite,id);
    }
    private getByName(name:string):Sprite3D{
        return this._getChildByName(this.rootSprite,name);
    }

    /**
     * 根据给定的id或者名字找到一条链
     * @param idorname 如果是数字就是id，否则就是名字
     * @param length 链的长度
     * 返回的骨骼的顺序是从末端到根
     */
    getBoneChain(idorname:number|string,length:number){
        let end:Sprite3D=null;
        if(typeof(idorname)=='number'){
            end = this.getByID(idorname);
        }else{
            end = this.getByName(idorname);
        }
        if(!end)return null;
        let ret:Sprite3D[]=[end];
        let cur = end;
        for(let i=0; i<length-1; i++){
            cur = cur.parent as Sprite3D;
            if(!cur){
                break;
            }
            ret.push(cur);
        }
        return ret;
    }

    addChainByBoneName(name:string, length:number, isEndEffector=true):IK_Chain{
        let bones = this.getBoneChain(name,length);
        if(bones.length!=length){
            throw 'eeee';
        }
        let chain = new IK_Chain();
        
        let userData = {bones:[], target:null, rotOffs:[]} as IK_ChainUserData;
        chain.userData=userData;
        let rotOffs = userData.rotOffs;
        let jointBones = userData.bones;    //新建一个是为了保证顺序与joint一致
        //DEBUG
        let dbgMod:Sprite3D[] = userData.debugMod= [];
        //

        //创建chain
        //确定对应关系
        for(let i=length-1; i>=0; i--){
            //注意按照从根到末端的顺序
            const joint = new IK_Joint();
            const curnode = bones[i];   //前面的是根
            jointBones.push(curnode);
            let wmat = curnode.transform.worldMatrix.elements;
            let gpos = new Vector3(wmat[12],wmat[13],wmat[14]);
            //joint.angleLimit = new IK_AngleLimit( new Vector3(-Math.PI, 0,0), new Vector3(Math.PI, 0,0))
            chain.addJoint(joint, gpos, true);
            //DEBUG
            dbgMod.push(this._addMeshSprite(0.2,new Color(1,1,1,1),new Vector3()));
            //
        }
        if(isEndEffector){
            chain.setEndEffector(length-1);
        }
        this.chains.push(chain);
        return chain;
    }

    appendEndEffector(chainIndex: number, pos: Vector3, isWorldSpace = false) {
        if (chainIndex >= 0 && chainIndex < this.chains.length) {
            const chain = this.chains[chainIndex];
            if (isWorldSpace) {
                const localPos = this.worldToLocal(pos);
                //const localDir = this.worldToLocalRotation(dir);
                chain.setEndEffector(localPos);
            } else {
                chain.setEndEffector(pos);
            }
        }
    }

    private _findChainByName(name:string){
        for(let chain of this.chains){
            if(chain.name==name){
                return chain;
            }
        }
        return null;
    }

    setTarget(endEffectorName:string, target:IK_Target){
        let chain = this._findChainByName(endEffectorName);
        if(!chain)
            return;
        (chain.userData as IK_ChainUserData).target = target;
    }

    private worldToLocal(worldPos: Vector3): Vector3 {
        // 实现世界坐标到局部坐标的转换
        return null;
    }

    private _addMeshSprite(radius:number,color:Color,pos:Vector3){
        let sp3 = new Sprite3D();
        let mf = sp3.addComponent(MeshFilter);
        mf.sharedMesh = PrimitiveMesh.createSphere(radius);
        let r = sp3.addComponent(MeshRenderer)
        let mtl = new BlinnPhongMaterial();
        r.material = mtl;
        sp3.transform.position=pos;
        this.rootSprite.scene.addChild(sp3);
        mtl.albedoColor = color;
        return sp3;
    }    

    private worldToLocalRotation(worldRot: Quaternion): Quaternion {
        // 实现世界旋转到局部旋转的转换
        return null;
    }

    /**
     * 要求joints和bones的顺序是一致的
     * @param chain 
     * @param bones 
     */
    private _applyChain(chain:IK_Chain, bones:Sprite3D[]){
        for(let i=0, n=chain.joints.length; i<n; i++){
            let joint = chain.joints[i];
            let bone = bones[i];
            bone.transform.position = joint.position;
            bone.transform.rotation = joint.rotationQuat;
        }
    }

    onUpdate(){
        for(let chain of this.chains){
            let udata:IK_ChainUserData = chain.userData;
            if(!udata) //TODO 没有userData也有用把
                continue;
            if(!udata.target)
                continue;
            this.solver.solve(chain,udata.target);
            //应用ik结果
            this._applyChain(chain,udata.bones);
            //DEBUG
            for(let n=chain.joints.length,i=n-1; i>=0; i--){
                let joint = chain.joints[i];
                let mod = udata.debugMod[i]
                mod.transform.position = joint.position;
            }    
        }

        //TEST

    }

    upbdatePose(){

    }

    /**
     * 整体求解
     * 多个链
     */
    solve_whole_system() {

    }
}
