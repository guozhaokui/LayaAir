import { PixelLineSprite3D } from "../d3/core/pixelLine/PixelLineSprite3D";
import { Sprite3D } from "../d3/core/Sprite3D";
import { Color } from "../maths/Color";
import { Quaternion } from "../maths/Quaternion";
import { Vector3 } from "../maths/Vector3";
import { IK_Constraint } from "./IK_Constraint";
import { IK_EndEffector } from "./IK_EndEffector";
import { IK_Joint } from "./IK_Joint";
import { IK_Pose1, IK_Target } from "./IK_Pose1";
import { IK_Space } from "./IK_Space";
import { ClsInst, rotationTo } from "./IK_Utils";

const Z = new Vector3(0, 0, 1);
let dpos = new Vector3();
let v1 = new Vector3();


/**
 * 从IK_pose1可以方便的绑定到某个骨骼上，随着动画动
 */
export class IK_Chain extends IK_Pose1 {
    static clsid = '6ea18086-4a8d-438f-a17e-639bcdff8718';
    name=''
    //顺序是从根到末端
    joints: IK_Joint[];
    //先只支持单个末端执行器
    private _end_effector: IK_EndEffector;
    //根关节的初始姿态，用来做动画控制，下面的变量用来临时把世界空间转到chain空间
    //chain空间是动画控制的，就是根骨骼空间
    //这个空间的朝向最终其实会被ik修改
    private _chainSpace:IK_Space = null;
    //private _chainSpacePos = new Vector3();
    //private _chainSpaceInvQuat = new Quaternion();
    //设置世界矩阵或者修改某个joint的时候更新。0表示需要全部更新
    //private _dirtyIndex = 0;
    private _showDbg = false;
    private _target:IK_Target=null;

    //构造的时候的位置，以后的位置都是相对这个做偏移
    private _lastPos = new Vector3();

    constructor() {
        super();
        ClsInst.addInst(this);
        this.joints = [];
    }

    //不可写
    get end_effector(){
        return this._end_effector;
    }

    /**
     * 
     * @param joint 
     * @param pos 
     * @param isWorldPos 是否是世界空间，所谓的世界空间不一定真的是世界空间，如果是在system中，则是system空间
     */
    addJoint(joint: IK_Joint, pos: Vector3, isWorldPos = false, isEnd = false): void {
        if (this.end_effector) {
            throw '已经结束了'
        }
        //记录attach的初始姿态
        if(this.joints.length==0 && joint.userData.bone){
            let chainSpaceSprite = joint.userData.bone;
            let quat = (chainSpaceSprite.parent as Sprite3D)?.transform.rotation;
            if(!quat) quat = new Quaternion();
            this._chainSpace = new IK_Space(
                chainSpaceSprite.transform.position,
                quat
            )
        }

        //先转到chain空间
        this._chainSpace.toLocalPos(pos,pos);

        let lastJoint = this.joints[this.joints.length - 1];
        joint.position = new Vector3();
        if (!lastJoint) {
//this._lastPos = pos.clone();
            joint.rotationQuat = new Quaternion();  //第一个固定为单位旋转
            pos.cloneTo(joint.position);
        } else {
            if (isWorldPos) {
                pos.cloneTo(joint.position);
                //先转成本地空间
                let localPos = new Vector3();
                //与上一个joint的世界空间对比。这时候上一个joint的position已经计算了。
                pos.vsub(lastJoint.position, localPos);
                pos = localPos;
            } else {
                //累加
                lastJoint.position.vadd(pos, joint.position);
            }
            lastJoint.length = pos.length();
            //计算朝向
            pos.normalize();
            let quat = lastJoint.rotationQuat;
            rotationTo(Z, pos, quat);
            lastJoint.rotationQuat = quat;
            joint.parent = lastJoint;
        }
        this.joints.push(joint);
        //为了简化，末端就是最后一个joint
        if (isEnd) {
            this.setEndEffector(this.joints.length - 1);
        }
    }

    setConstraint(def:{[key:string]:IK_Constraint}){
        for(let joint of this.joints){
            if(def[joint.name]){
                joint._angleLimit = def[joint.name];
            }
        }
    }

    visualize(line:PixelLineSprite3D){
        //目标
        if(this.target){
            //在target位置画一个十字
            const pos = this.target.pos;
            let len = 0.1
            let end1 = new Vector3(pos.x+len,pos.y,pos.z);
            let end2 = new Vector3(pos.x-len,pos.y,pos.z);
            let end3 = new Vector3(pos.x,pos.y+len,pos.z);
            let end4 = new Vector3(pos.x,pos.y-len,pos.z);
            let end5 = new Vector3(pos.x,pos.y,pos.z+len);
            let end6 = new Vector3(pos.x,pos.y,pos.z-len);
            line.addLine(pos,end1,Color.RED,Color.RED);
            line.addLine(pos,end2,Color.RED,Color.RED);
            line.addLine(pos,end3,Color.GREEN,Color.GREEN);
            line.addLine(pos,end4,Color.GREEN,Color.GREEN);
            line.addLine(pos,end5,Color.BLUE,Color.BLUE);
            line.addLine(pos,end6,Color.BLUE,Color.BLUE);
        }
        let joints = this.joints;
        for(let i=0,n=joints.length; i<n; i++){
            let joint = joints[i];
            joint.visualize(line,this._chainSpace);
            let next = joints[i+1];
            if(next){
                line.addLine(this._chainSpace.toWorldPos(joint.position), 
                    this._chainSpace.toWorldPos(next.position), 
                    new Color(1,0,0,1), new Color(0,1,0,1));
            }
        }
    }

    //给一个相对空间的，如果都是null则使用最后一个joint作为end effector
    //chain只是允许设置相对空间的，如果要设置世界空间，需要在system中设置，那里能得到世界信息
    setEndEffector(index=-1) {
        let joints = this.joints;
        if(index<0){
            index = joints.length-1;
        }
        this._end_effector = new IK_EndEffector(joints[index]);

        //设置结束，可以做一些预处理
        this.onLinkEnd();
    }

    private onLinkEnd(){
        //计算每个joint的相对于bone的旋转偏移
        let joincnt = this.joints.length;
        let lastJointZ = new Vector3();
        for(let i=0; i<joincnt-1; i++){
            let curJoint = this.joints[i];
            let nextJoint = this.joints[i+1];
            let curnode = curJoint.userData.bone;
            let curBoneZ:Vector3;
            if(curnode){
                let wmat = curnode.transform.worldMatrix.elements;
                curBoneZ = new Vector3(wmat[8],wmat[9],wmat[10]);
                //下面要把这个转到chain空间
                this._chainSpace.toLocalPos(curBoneZ, curBoneZ);
            }else{
                curBoneZ = Z;
            }
            //旋转偏移：ik默认的骨骼朝向是(0,0,1),因此这里先要找出实际z的朝向，作为一个旋转偏移
            nextJoint.position.vsub(curJoint.position,lastJointZ);
            lastJointZ.normalize();
            let rotoff = new Quaternion();
            rotationTo(lastJointZ,curBoneZ,rotoff);
            curJoint.userData.rotOff = rotoff;

            //初始化约束信息
            let limit = curJoint.angleLimit;
            if(limit){
                limit.init(curJoint);
            }
        }
    }

    //附加一个末端。
    appendEndEffector(pos: Vector3, isWorldSpace = false) {
        this.addJoint(new IK_Joint(), pos, isWorldSpace);
        this.setEndEffector();
    }

    enable(b: boolean) {
    }

    set showDbg(b:boolean){
        this._showDbg=b;
        if(!b){
            for(let joint of this.joints){
                if(joint.userData.dbgModel){
                    if(joint.userData.dbgModel.scene){
                        joint.userData.dbgModel.scene.removeChild(joint.userData.dbgModel);
                    }
                }
                joint.userData.dbgModel = null;
            }
        }
    }

    get showDbg(){
        return this._showDbg;
    }

    toChainSpace(pos:Vector3, localPos?:Vector3){
        return this._chainSpace.toLocalPos(pos,localPos);
    }

    /**
     * 设置根节点的位置
     * @param pos 
     */
    setWorldPos(pos: Vector3) {
        pos.vsub(this._lastPos,dpos);
        //更新所有节点的位置
        for(let joint of this.joints){
            joint.position.vadd(dpos,joint.position);
        }
        //为了避免误差，第一个直接设置。这样后续的即使有误差，也会被solve的过程中修正（长度固定）
        pos.cloneTo(this.joints[0].position);
        pos.cloneTo(this._lastPos);
    }

    //应用一下骨骼的动画
    updateBoneAnim2(){
        if(!this.joints[0])return;
        let udata = this.joints[0].userData;
        let rootBone = udata.bone;
        if(!rootBone) return;
        let rootPos = rootBone.transform.position;
        //根据sprite的transform和rotoff来得到joint的朝向
        let invQ = new Quaternion();
        udata.rotOff.invert(invQ);
        Quaternion.multiply(rootBone.transform.rotation,invQ,this.joints[0].rotationQuat);
        this.setWorldPos(rootPos);        
    }

    private _lp = new Vector3();
    /**
     * 根据attachBone来更新链
     * 得到当前attachBone的全局姿态，根据记录的初始姿态得到一个delta，然后应用到chain上
     * 
     * @returns 
     */
    updateBoneAnim(){
        if(!this.joints[0])return;
        let rootBone = this.joints[0].userData.bone;
        let quat = (rootBone.parent as Sprite3D)?.transform.rotation;
        rootBone.transform.position.cloneTo(this._chainSpace.pos);
        //rootBone.transform.rotation.cloneTo(this._chainSpace.rot);
        if(quat){
          quat.cloneTo(this._chainSpace.rot)  
        }else{
            this._chainSpace.rot.identity();
        }
    }

    applyIKResult(){
        for(let i=0, n=this.joints.length; i<n; i++){
            let joint = this.joints[i];
            let bone = joint.userData.bone;
            let udata = joint.userData;
            let mod = udata.dbgModel;
            if(mod){
                this._chainSpace.toWorldPos(joint.position, mod.transform.position)
                //mod.transform.position = joint.position;
                this._chainSpace.toWorldRot(joint.rotationQuat,mod.transform.rotation);
                //mod.transform.rotation = joint.rotationQuat;
            }

            if(!bone) continue;
            //bone.transform.position = joint.position;
            let rot = joint.rotationQuat;
            let rotOff = joint.userData.rotOff;
            if(rotOff){
                let r = bone.transform.rotation;
                Quaternion.multiply(rotOff,rot,r);
                //转到世界空间
                bone.transform.rotation = this._chainSpace.toWorldRot(r,bone.transform.rotation);
                //bone.transform.rotation = r;
            }else{
                //bone.transform.rotation = rot;
            }
        }
    }

    //从某个joint开始旋转，会调整每个joint的位置
    rotateJoint(jointId: number, deltaQuat: Quaternion) {
        let joints = this.joints;
        for (let i = jointId; i < joints.length - 1; i++) {
            const current = joints[i];

            //先更新自己的朝向
            const curQuat = current.rotationQuat;
            Quaternion.multiply(deltaQuat, curQuat, curQuat);
            curQuat.normalize(curQuat);
            if(current.angleLimit){
                current.angleLimit.constraint(current,null);
            }

            const direction = new Vector3(0, 0, 1);
            Vector3.transformQuat(direction, curQuat, direction);
            direction.scale(current.length, direction);

            //再更新子关节的位置：从当前位置累加
            const next = joints[i + 1];
            next.position.setValue(
                current.position.x + direction.x,
                current.position.y + direction.y,
                current.position.z + direction.z
            );
        }
    }

    applyPosOff(off:Vector3){
        let joints = this.joints;
        for (let i = 0,l = joints.length; i < l; i++) {
            const current = joints[i];
            current.position.vadd(off,current.position);
        }
    }

    set target(tar:IK_Target){
        this._target = tar;
    }

    get target(){
        return this._target;
    }

    /**
     * 根据关节的位置计算关节的朝向。
     * 为了避免扭的效果，按照从根到末端计算，并且都按照相对parent的来计算，而不是按照Z
     */
    updateRotations(): void {
        const joints = this.joints;
        let jointCount = joints.length;
        if(jointCount<2)
            return;
        //先计算根的朝向
        let dir = v1;
        joints[1].position.vsub(joints[0].position,dir).normalize();
        const rotation = new Quaternion();
        rotationTo(Z, dir, rotation);
        rotation.cloneTo(joints[0].rotationQuat);
        let lastDir = dir.clone();
        let lastQuat = rotation.clone();

        for (let i = 1; i < jointCount - 1; i++) {
            const currentJoint = joints[i];
            const nextJoint = joints[i + 1];
            const direction = nextJoint.position.vsub(currentJoint.position, v1).normalize();

            rotationTo(lastDir, direction, rotation);
            Quaternion.multiply(rotation,lastQuat,currentJoint.rotationQuat);

            direction.cloneTo(lastDir);
            currentJoint.rotationQuat.cloneTo(lastQuat);

            //更新约束轴
            if (currentJoint.angleLimit) {

            }

        }
    }
}