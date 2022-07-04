#if defined(GL_FRAGMENT_PRECISION_HIGH)
precision highp float;
#else
precision mediump float;
#endif

vec4 remapGLPositionZ(vec4 position)
{
    position.z = position.z * 2.0 - position.w;
    return position;
}

void main()
{
    gl_Position = vec4(u_OffsetScale.x * 2.0 - 1.0 + (a_PositionTexcoord.x + 1.0) * u_OffsetScale.z, (1.0 - ((u_OffsetScale.y * 2.0 - 1.0 + (-a_PositionTexcoord.y + 1.0) * u_OffsetScale.w) + 1.0) / 2.0) * 2.0 - 1.0, 0.0, 1.0);
    v_Texcoord0 = a_PositionTexcoord.zw;
    gl_Position = remapGLPositionZ(gl_Position);
}