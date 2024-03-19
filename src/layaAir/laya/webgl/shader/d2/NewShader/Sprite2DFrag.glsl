vec3 gammaToLinear(in vec3 value)
{
    return pow((value + 0.055) / 1.055, vec3(2.4));
}

vec4 gammaToLinear(in vec4 value)
{
    return vec4(gammaToLinear(value.rgb), value.a);
}

vec3 linearToGamma(in vec3 value)
{
    return vec3(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))));

    // return pow(value, vec3(1.0 / 2.2));
    // return pow(value, vec3(0.455));
}

vec4 linearToGamma(in vec4 value)
{
    return vec4(linearToGamma(value.rgb), value.a);
}

vec4 colorGamma(inout vec4 color) {
#ifndef GAMMATEXTURE
    //是linear数据
    #ifdef GAMMASPACE
        color.xyz = linearToGamma(color.xyz);    
    #endif
#else
    //gamma数据
    #ifndef GAMMASPACE
        color.xyz = gammaToLinear(color.xyz);
    #endif
#endif
}

// WGSL转译不支持函数参数中传递纹理，去掉该函数，等价的功能为：
// texture2D(spriteTexture, uv);
// colorGamma(color);
// vec4 sampleTexture(sampler2D spriteTexture, vec2 uv)
// {
//     vec4 color = texture2D(spriteTexture, uv);
// #ifndef GAMMATEXTURE
//     //是linear数据
//     #ifdef GAMMASPACE
//         color.xyz = linearToGamma(color.xyz);    
//     #endif
// #else
//     //gamma数据
//     #ifndef GAMMASPACE
//         color.xyz = gammaToLinear(color.xyz);
//     #endif
// #endif
//     return color;
// }

#if defined(PRIMITIVEMESH)
    varying vec4 v_color;
    varying vec2 v_cliped;
  

    vec4 getGlColor(vec4 color){
        #ifdef GAMMASPACE
            return color;
        #else
            return gammaToLinear(color);
        #endif
    }

#elif defined(TEXTUREVS)
    varying vec2 v_cliped;
    varying vec4 v_texcoordAlpha;
    varying vec4 v_color;
    varying float v_useTex;
    
    //uniform
    uniform sampler2D u_spriteTexture;

    #ifdef BLUR_FILTER
        uniform vec4 u_strength_sig2_2sig2_gauss1; // TODO模糊的过程中会导致变暗变亮
        uniform vec2 u_blurInfo;
        #define PI 3.141593
    #endif

    #ifdef COLOR_FILTER
        uniform vec4 u_colorAlpha;
        uniform mat4 u_colorMat;
    #endif

    #ifdef GLOW_FILTER
        uniform vec4 u_color;
        uniform vec4 u_blurInfo1;
        uniform vec4 u_blurInfo2;
    #endif

    #ifdef COLOR_ADD
        uniform vec4 u_colorAdd;
    #endif

    #ifdef FILLTEXTURE
        uniform vec4 u_TexRange; // startu,startv,urange, vrange
    #endif


    #ifdef BLUR_FILTER
        float getGaussian(float x, float y)
        {
            return u_strength_sig2_2sig2_gauss1.w * exp(-(x * x + y * y) / u_strength_sig2_2sig2_gauss1.z);
        }

        vec4 blur()
        {
            const float blurw = 9.0;
            vec4 vec4Color = vec4(0.0, 0.0, 0.0, 0.0);
            vec2 halfsz = vec2(blurw, blurw) / 2.0 / u_blurInfo;
            vec2 startpos = v_texcoordAlpha.xy - halfsz;
            vec2 ctexcoord = startpos;
            vec2 step = 1.0 / u_blurInfo; //每个像素

            for (float y = 0.0; y <= blurw; ++y)
            {
                ctexcoord.x = startpos.x;
                for (float x = 0.0; x <= blurw; ++x)
                {
                    // TODO 纹理坐标的固定偏移应该在vs中处理
                    //vec4Color += sampleTexture(u_spriteTexture, ctexcoord) * getGaussian(x - blurw / 2.0, y - blurw / 2.0);
                    vec4Color += texture2D(u_spriteTexture, ctexcoord) * getGaussian(x - blurw / 2.0, y - blurw / 2.0);
                    colorGamma(vec4Color);
                    ctexcoord.x += step.x;
                }
                ctexcoord.y += step.y;
            }
            // vec4Color.w=1.0;  这个会导致丢失alpha。以后有时间再找模糊会导致透明的问题
            return vec4Color;
        }
    #endif

    vec4 getSpriteTextureColor(){
        #ifdef FILLTEXTURE
            vec4 color = texture2D(u_spriteTexture, fract(v_texcoordAlpha.xy) * u_TexRange.zw + u_TexRange.xy);
            //return sampleTexture(u_spriteTexture, fract(v_texcoordAlpha.xy) * u_TexRange.zw + u_TexRange.xy);
        #else
            vec4 color = texture2D(u_spriteTexture, v_texcoordAlpha.xy);
            //return sampleTexture(u_spriteTexture, v_texcoordAlpha.xy);
        #endif

        colorGamma(color);

        // #ifndef GAMMATEXTURE
        //     //是linear数据
        //     #ifdef GAMMASPACE
        //         color.xyz = linearToGamma(color.xyz);
        //     #endif
        // #else
        //     //gamma数据
        //     #ifndef GAMMASPACE
        //         color.xyz = gammaToLinear(color.xyz);
        //     #endif
        // #endif
        return color;
    }

    void setglColor(in vec4 color){
        if (v_useTex <= 0.)
            color = vec4(1., 1., 1., 1.);

        color.a *= v_color.w;
        // color.rgb*=v_color.w;
        vec4 transColor = v_color;
        #ifndef GAMMASPACE
            transColor = gammaToLinear(v_color);
        #endif
        color.rgb *= transColor.rgb;
        gl_FragColor = color;

        #ifdef COLOR_ADD
            gl_FragColor = vec4(u_colorAdd.rgb, u_colorAdd.a * gl_FragColor.a);
            gl_FragColor.xyz *= u_colorAdd.a;
        #endif

        #ifdef BLUR_FILTER
            gl_FragColor = blur();
            gl_FragColor.w *= v_color.w;
        #endif

        #ifdef COLOR_FILTER
            mat4 alphaMat = u_colorMat;

            alphaMat[0][3] *= gl_FragColor.a;
            alphaMat[1][3] *= gl_FragColor.a;
            alphaMat[2][3] *= gl_FragColor.a;

            gl_FragColor = gl_FragColor * alphaMat;
            gl_FragColor += u_colorAlpha / 255.0 * gl_FragColor.a;
        #endif

        #ifdef GLOW_FILTER
            const float c_IterationTime = 10.0;
            float floatIterationTotalTime = c_IterationTime * c_IterationTime;
            vec4 vec4Color = vec4(0.0, 0.0, 0.0, 0.0);
            vec2 vec2FilterDir = vec2(-u_blurInfo1.z / u_blurInfo2.x, -u_blurInfo1.w / u_blurInfo2.y);
            vec2 vec2FilterOff = vec2(u_blurInfo1.x / u_blurInfo2.x / c_IterationTime * 2.0, u_blurInfo1.y / u_blurInfo2.y / c_IterationTime * 2.0);
            float maxNum = u_blurInfo1.x * u_blurInfo1.y;
            vec2 vec2Off = vec2(0.0, 0.0);
            float floatOff = c_IterationTime / 2.0;
            for (float i = 0.0; i <= c_IterationTime; ++i){
                for (float j = 0.0; j <= c_IterationTime; ++j){
                    vec2Off = vec2(vec2FilterOff.x * (i - floatOff), vec2FilterOff.y * (j - floatOff));
                    //vec4Color += sampleTexture(u_spriteTexture, v_texcoordAlpha.xy + vec2FilterDir + vec2Off);
                    vec4Color += texture2D(u_spriteTexture, v_texcoordAlpha.xy + vec2FilterDir + vec2Off);
                    colorGamma(vec4Color);
                }
            }
            vec4Color /= floatIterationTotalTime;
            gl_FragColor = vec4(u_color.rgb, vec4Color.a * u_blurInfo2.z);
            gl_FragColor.rgb *= gl_FragColor.a;
        #endif
    }
#endif



void clip(){
    if(v_cliped.x<0.) discard;
    if(v_cliped.x>1.) discard;
    if(v_cliped.y<0.) discard;
    if(v_cliped.y>1.) discard;
}