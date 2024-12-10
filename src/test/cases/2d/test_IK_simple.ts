import "laya/ModuleDef";

import { Laya } from "Laya";
import { Camera } from "laya/d3/core/Camera";
import { DirectionLightCom } from "laya/d3/core/light/DirectionLightCom";
import { BlinnPhongMaterial } from "laya/d3/core/material/BlinnPhongMaterial";
import { MeshFilter } from "laya/d3/core/MeshFilter";
import { MeshRenderer } from "laya/d3/core/MeshRenderer";
import { MeshSprite3D } from "laya/d3/core/MeshSprite3D";
import { Scene3D } from "laya/d3/core/scene/Scene3D";
import { Sprite3D } from "laya/d3/core/Sprite3D";
import { PrimitiveMesh } from "laya/d3/resource/models/PrimitiveMesh";
import { Stage } from "laya/display/Stage";
import { IK_CCDSolver } from "laya/IK/CCD/IK_CCDSolver";
import { IK_Chain } from "laya/IK/IK_Chain";
import { IK_ISolver } from "laya/IK/IK_ISolver";
import { IK_Joint } from "laya/IK/IK_Joint";
import { Color } from "laya/maths/Color";
import { Matrix4x4 } from "laya/maths/Matrix4x4";
import { Quaternion } from "laya/maths/Quaternion";
import { Vector3 } from "laya/maths/Vector3";
import { Mesh } from "laya/d3/resource/models/Mesh";
import { IK_Target } from "laya/IK/IK_Pose1";

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

class IKDemo {
    private scene: Scene3D;
    private camera: Camera;
    private chain: IK_Chain;
    private solver: IK_ISolver;
    private target: Sprite3D;
    private joints: Sprite3D[];
    private targetPose = new IK_Target(new Vector3(), new Quaternion())

    constructor(scene:Scene3D, camera:Camera) {
        this.scene = scene;
        this.camera=camera;
        this.createIKChain();
        this.createTarget();
        Laya.timer.frameLoop(1, this, this.onUpdate);
    }

    private createIKChain(): void {
        this.chain = new IK_Chain();
        this.joints = [];

        const numJoints = 5;
        const jointLength = 1;

        for (let i = 0; i < numJoints; i++) {
            const position = new Vector3(0, i * jointLength, 0);
            const joint = new IK_Joint();
            this.chain.addJoint(joint, position);

            const cylinderJoint = createMeshSprite(PrimitiveMesh.createCylinder(0.1, jointLength),new Color(1,1,1,1));
            cylinderJoint.transform.position = position;
            this.scene.addChild(cylinderJoint);
            this.joints.push(cylinderJoint);
        }
        this.chain.setEndEffector(numJoints-1)

        this.solver = new IK_CCDSolver();
    }

    private createTarget(): void {
        let target = this.target = new Sprite3D();
        let mf = target.addComponent(MeshFilter);
        mf.sharedMesh = PrimitiveMesh.createSphere(0.2);
        let r = target.addComponent(MeshRenderer)
        let mtl = new BlinnPhongMaterial();
        r.material = mtl;
        mtl.albedoColor = new Color(1, 0, 0, 1);
        this.scene.addChild(target);
        target.transform.position = new Vector3(2, 3, 0);
    }

    private onUpdate(): void {
        // Move target
        const time = Laya.timer.currTimer * 0.001;
        this.target.transform.position.setValue(
            Math.sin(time) * 2,
            3 + Math.cos(time),
            Math.cos(time * 0.5) * 2
        );
        this.targetPose.pos = this.target.transform.position.clone();

        // Solve IK
        this.solver.solve(this.chain, this.targetPose);

        // // Update joint visuals
        // for (let i = 0; i < this.chain.joints.length; i++) {
        //     const joint = this.chain.joints[i];
        //     const cylinderJoint = this.joints[i];

        //     cylinderJoint.transform.position = joint.position;
        //     cylinderJoint.transform.rotation = joint.rotation;
        // }
    }

}

async function test() {
    //初始化引擎
    await Laya.init(0, 0);
    Laya.stage.scaleMode = Stage.SCALE_FULL;
    Laya.stage.screenMode = Stage.SCREEN_NONE;

    let scene = new Scene3D();
    Laya.stage.addChild(scene);

    // 创建相机
    let camera = scene.addChild(new Camera(0, 0.1, 100)) as Camera;
    camera.transform.translate(new Vector3(0, 3, 25));
    camera.transform.rotate(new Vector3(-15, 0, 0), true, false);

    // 创建平行光
    let directlightSprite = new Sprite3D();
    let dircom = directlightSprite.addComponent(DirectionLightCom);
    scene.addChild(directlightSprite);
    //方向光的颜色
    dircom.color.setValue(1, 1, 1, 1);
    //设置平行光的方向
    var mat: Matrix4x4 = directlightSprite.transform.worldMatrix;
    mat.setForward(new Vector3(-1.0, -1.0, -1.0));
    directlightSprite.transform.worldMatrix = mat;

    new IKDemo(scene,camera);
}


test();


