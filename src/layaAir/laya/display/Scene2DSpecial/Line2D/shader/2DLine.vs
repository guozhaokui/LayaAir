#define SHADER_NAME 2DLineVS

#include "Sprite2DVertex.glsl"

varying vec2 v_position;
varying vec4 v_linePionts;
varying float v_lineLength;

uniform float u_lineWidth;
uniform vec3 u_dashed;


void lineMat(in vec2 left,in vec2 right,inout vec3 xDir,inout vec3 yDir){
    vec2 dir=right-left;
    float halfWidth=u_lineWidth+2.0;
    float lineLength=length(dir)+halfWidth;
    dir=normalize(dir);
    xDir.x=dir.x*lineLength;
    yDir.x=dir.y*lineLength;
    
    xDir.y=-dir.y*(halfWidth);
    yDir.y=dir.x*(halfWidth);

    xDir.z=(left.x+right.x)*0.5;
    yDir.z=(left.y+right.y)*0.5;
}


void main(){
    v_lineLength = a_linelength;
   //v_lineLength = 1000.0;
   v_texcoord = a_position.xy + vec2(0.5,0.5);
    
    vec2 left,right;
    getGlobalPos(a_linePos.xy,left);
    getGlobalPos(a_linePos.zw,right);
    //getGlobalPos(vec2(500.0,200),left);
    //getGlobalPos(vec2(1000.0,200),right);

    v_linePionts=vec4(left,right);
    vec3 xDir;
    vec3 yDir;
    lineMat(left,right,xDir,yDir);
        
    transfrom(a_position.xy,xDir,yDir,v_position);
   
  
    vec2 viewPos;
    getViewPos(v_position,viewPos);
    v_cliped = getClipedInfo(viewPos);
    vec4 pos;
    getProjectPos(viewPos,pos);
    gl_Position = pos;
}