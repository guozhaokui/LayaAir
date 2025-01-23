import { BlinnPhongMaterial } from "../d3/core/material/BlinnPhongMaterial";
import { MeshFilter } from "../d3/core/MeshFilter";
import { MeshRenderer } from "../d3/core/MeshRenderer";
import { Sprite3D } from "../d3/core/Sprite3D";
import { PrimitiveMesh } from "../d3/resource/models/PrimitiveMesh";
import { Color } from "../maths/Color";
import { Quaternion } from "../maths/Quaternion";
import { Vector3 } from "../maths/Vector3";
import { IK_CCDSolver } from "./IKSolver/IK_CCD_Solver";
import { IK_Chain } from "./IK_Chain";
import { IK_ISolver } from "./IK_ISolver";
import { IK_Joint, IK_JointUserData } from "./IK_Joint";
import { IK_Target } from "./IK_Pose1";
import { ClsInst, delay, rotationTo } from "./IK_Utils";
import { IK_FABRIK_Solver } from "./IKSolver/IK_FABRIK_Solver";
import { PixelLineSprite3D } from "../d3/core/pixelLine/PixelLineSprite3D";
import { RenderState } from "../RenderDriver/RenderModuleData/Design/RenderState";
import { Scene3D } from "../d3/core/scene/Scene3D";
import { Laya } from "../../Laya";
import { Mesh } from "../d3/resource/models/Mesh";
import { IK_Constraint } from "./IK_Constraint";
import { IK_IJointManager } from "./IK_IJointManager";

function createMeshSprite(mesh:Mesh,color:Color){
    let sp3 = new Sprite3D();
    let mf = sp3.addComponent(MeshFilter);
    mf.sharedMesh = mesh;
    let r = sp3.addComponent(MeshRenderer)
    let mtl = new BlinnPhongMaterial();
    r.material = mtl;
    mtl.albedoColor = color;
    return sp3;
}

class ChainSlot{
    chain:IK_Chain;
    attach:Sprite3D;    //chain的root的parent
}

//一个可以整体移动的系统，例如一个人身上的多个链
export class IK_System implements IK_IJointManager{
    static clsid = 'e7c05dbd-3a55-4f8a-a74b-1bb56162ca76'
    private solver: IK_ISolver;
    private chains: IK_Chain[] = [];
    private chainsParent:Sprite3D[]=[];
    private rootSprite:Sprite3D = null;
    private _showDbg = false;
    private _visualSp:PixelLineSprite3D=null
    private _scene:Scene3D;
    private _updating=false;
    private _boneConstraint:{[key:string]:IK_Constraint}=null;
    //名字到joint的映射，可以避免多个joint控制一个骨骼，也可以用来查找joint，确定链接关系
    //例如找parent
    private _mapBoneJoint:{[key:string]:IK_Joint}={}

    constructor(scene:Scene3D) {
        this.solver = new IK_CCDSolver();
        //this.solver = new IK_FABRIK_Solver();
        this._scene = scene;
        ClsInst.addInst(this);
    }
    
    getJoint(name: string): IK_Joint {
        return this._mapBoneJoint[name];
    }
    addJoint(name: string, joint: IK_Joint): void {
        this._mapBoneJoint[name]=joint;
    }

    setRoot(r:Sprite3D){
        this.rootSprite=r;
    }

    set showDbg(b:boolean){
        this._showDbg=b;
        for(let chain of this.chains){
            chain.showDbg = b;
        }
    }

    get showDbg(){
        return this._showDbg;
    }

    visualize(b=true){
        if(b&&!this._visualSp){
            this._visualSp = new PixelLineSprite3D();
            this._visualSp.maxLineCount=1000;
            let mtl = this._visualSp._render.material;
            mtl.depthTest= RenderState.DEPTHTEST_ALWAYS;
            this._scene.addChild(this._visualSp);
        }
        if(b){
            //先画坐标轴
            this._visualSp.addLine(new Vector3, new Vector3(10,0,0),Color.RED,Color.RED);
            this._visualSp.addLine(new Vector3, new Vector3(0,10,0),Color.GREEN,Color.GREEN);
            this._visualSp.addLine(new Vector3, new Vector3(0,0,10),Color.BLUE,Color.BLUE);
        
            for(let chain of this.chains){
                chain.visualize(this._visualSp);
            }
        }
    }

    /**
     * 可以包含多个chain
     * @param chain 
     */
    addChain(chain: IK_Chain) {
        this.chains.push(chain);
    }

    setJointConstraint(def:{[key:string]:IK_Constraint}){
        this._boneConstraint = def;        
        for(let chain of this.chains){
            chain.setConstraint(def);
        }
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
        if(!bones || bones.length!=length){
            console.error(`没有找到骨骼:${name}或者长度不足${length}`)
            return null;
        }
        let chain = new IK_Chain(this);
        chain.name = name;
        
        //创建chain
        //确定对应关系
        for(let i=length-1; i>=0; i--){
            const curnode = bones[i];   //前面的是根
            //注意按照从根到末端的顺序
            const joint = new IK_Joint(curnode);
            let wmat = curnode.transform.worldMatrix.elements;
            let gpos = new Vector3(wmat[12],wmat[13],wmat[14]);
            //joint.angleLimit = new IK_AngleLimit( new Vector3(-Math.PI, 0,0), new Vector3(Math.PI, 0,0))
            chain.addJoint(joint, gpos, true);
            if(this._boneConstraint){
                if(this._boneConstraint[joint.name]){
                    joint._angleLimit = this._boneConstraint[joint.name];
                }
            }
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
            chain.appendEndEffector(pos,isWorldSpace);
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

    setTarget(endEffectorName:string|IK_Chain, target:IK_Target){
        let chain:IK_Chain=null;
        if(endEffectorName instanceof IK_Chain){
            chain = endEffectorName;
        }else{
            chain = this._findChainByName(endEffectorName);
        }
        if(!chain)
            return;
        chain.target = target;
    }

    async solve(chain:IK_Chain, target:IK_Target){
        //简单的chain直接计算
        if(chain.joints.length==2){
            this._solveSimpleChain(chain,target);
        }else{
            await this.solver.solve(chain,target,this._visualSp);
        }
    }

    private _solveSimpleChain(chain:IK_Chain,target:IK_Target){
        let base = chain.joints[0];
        let end = chain.joints[1];
        //let parent = base.userData.bone||chain.attachBone;
        //这种的只能朝向
        let dir = new Vector3();
        //end.position.vsub(base.position,dir);
        target.pos.vsub(base.position,dir);
        dir.normalize();
        rotationTo(new Vector3(0,0,1),dir,base.rotationQuat);

        let dpos = new Vector3();
        if(base._angleLimit){
            base._angleLimit.constraint(base,dpos);
        }

        //更新end的位置和朝向
        if(end.userData.bone){
            let endpos = new Vector3();
            base.position.vadd(dir.scale(base.length, endpos), end.position);
            //TODO 修改朝向
            //Quaternion.multiply(end.rotationQuat,)
            //end.rotationQuat
            //在skin中，通常这个没什么用
        }
    }

    buildDbgModel(){
        let r1 = new Quaternion();
        //从y到z的旋转
        rotationTo(new Vector3(0,1,0), new Vector3(0,0,1), r1);

        for(let chain of this.chains){
            for(let i=0, n=chain.joints.length-1; i<n; i++){//最后一个是endeffector不添加模型
                let joint = chain.joints[i];
                let udata = joint.userData;
                if(!udata) udata = joint.userData = new IK_JointUserData();
                let mod = udata.dbgModel = new Sprite3D();
                //mod.addChild(this._addMeshSprite(PrimitiveMesh.createSphere(0.2),new Color(1,1,1,1),new Vector3()))

                //创建一个向上的，原点在中心的模型
                const cylinder = createMeshSprite(PrimitiveMesh.createCylinder(0.01, joint.length),new Color(1,1,1,1));
                cylinder.transform.localRotation = r1;
                cylinder.transform.localPosition = new Vector3(0,0,joint.length*0.5);
                let ball = createMeshSprite(PrimitiveMesh.createSphere(0.02),new Color(0,1,0,1));
    
                let spup = new Sprite3D();
                spup.addChild(cylinder);
                spup.addChild(ball);                        
                mod.addChild(spup);
                this._scene.addChild(mod);
            }
        }
    }

    async onUpdate(){
        if(this._visualSp){
            this._visualSp.clear();
        }

        if(this._updating){
            //调试用:如果没有一帧完成,则只更新骨骼和调试信息
            //因为由于await会导致没有机会更新
            this.visualize(this._showDbg);
            return;
        }

        this._updating=true;
        let delaySolves:Promise<void>[]=[];

        //debug
        const time = Laya.timer.currTimer * 0.001;
        let tpos = new Vector3(
            Math.sin(time) * 2,
            Math.cos(time * 0.5) * 3 ,
            0//Math.cos(time * 0.5) * 3
        );

        //debug

        for(let chain of this.chains){
            let target = chain.target;
            if(!target) 
                continue;
            //debug
            // tpos.cloneTo(target.pos);
            // target.pos.setValue(0,0.8,0);
            //debug
            chain.updateAnim();
            let p = this.solve(chain,target);
            delaySolves.push(p);
            //应用ik结果.注意必须在一帧之内,所以上面不能有await,否则会延迟到下一帧,然后被动画覆盖
            chain.applyIKResult();
        }
        this.visualize(this._showDbg);
        await Promise.all(delaySolves);
        this._updating=false;
    }

    /**
     * 整体求解
     * 多个链
     */
    solve_whole_system() {

    }
}
