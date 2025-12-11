#version 330 core

/*default camera matrices. do not modify.*/
layout(std140) uniform camera
{
    mat4 projection;	/*camera's projection matrix*/
    mat4 view;			/*camera's view matrix*/
    mat4 pvm;			/*camera's projection*view*model matrix*/
    mat4 ortho;			/*camera's ortho projection matrix*/
    vec4 position;		/*camera's position in world space*/
};
struct Light 
{
    vec3 position;          /* light position */
    vec3 Ia;                /* ambient intensity */
    vec3 Id;                /* diffuse intensity */
    vec3 Is;                /* specular intensity */     
};
/* set light ubo. do not modify.*/
struct light
{
	ivec4 att; 
	vec4 pos; // position
	vec4 dir;
	vec4 amb; // ambient intensity
	vec4 dif; // diffuse intensity
	vec4 spec; // specular intensity
	vec4 atten;
	vec4 r;
};
layout(std140) uniform lights
{
	vec4 amb;
	ivec4 lt_att; // lt_att[0] = number of lights
	light lt[4];
};

/*input variables*/
in vec3 vtx_normal; // vtx normal in world space
in vec3 vtx_position; // vtx position in world space
in vec3 vtx_model_position; // vtx position in model space
in vec4 vtx_color;
in vec2 vtx_uv;
in vec3 vtx_tangent;

uniform vec3 ka;            /* object material ambient */
uniform vec3 kd;            /* object material diffuse */
uniform vec3 ks;            /* object material specular */
uniform float shininess;    /* object material shininess */

uniform sampler2D tex_color;   /* texture sampler for color */
uniform sampler2D tex_normal;   /* texture sampler for normal vector */

/*output variables*/
out vec4 frag_color;

vec3 shading_texture_with_phong(light li, vec3 e, vec3 p, vec3 s, vec3 n)
{
    return vec3(0.0);
}
vec4 sophiaphong(light li, vec3 e, vec3 p, vec3 s, vec3 n, vec3 texcolor){
    vec3 v = e - p;
    v = normalize(v);
    vec3 r = reflect((p-s), n);
    r = normalize(r);
    vec3 Ls = ks*li.spec.rgb*pow(max(0,dot(v, r)), shininess);
    vec3 llambert = li.amb.rgb*ka * texcolor;
    vec3 l = s-p;
    l = normalize(l);
    vec3 other = kd*li.dif.rgb*max(0, dot(l, n)) * texcolor;
    llambert += other;
    llambert += Ls;
    vec4 ans = vec4(llambert, 1.0f);
    return ans;
}

vec3 read_normal_texture()
{
    vec3 normal = texture(tex_normal, vtx_uv).rgb;
    normal = normalize(normal * 2.0 - 1.0);
    return normal;
}

void main()
{
    
    const Light light1 = Light(/*position*/ vec3(0, 0, -100), 
                                /*Ia*/ vec3(0.1, 0.1, 0.1), 
                                /*Id*/ vec3(1.0, 1.0, 1.0), 
                                /*Is*/ vec3(0.9, 0.9, 0.9));
    const Light light2 = Light(/*position*/ vec3(0, 0, 0), 
                                /*Ia*/ vec3(0.5, 0.5, 0.5), 
                                /*Id*/ vec3(1.0, 1.0, 1.0), 
                                /*Is*/ vec3(0.0, 0.0, 0.0));
    vec3 e = position.xyz;              //// eye position
    vec3 p = vtx_position;              //// surface position
    vec3 N = normalize(vtx_normal);     //// normal vector
    vec3 T = normalize(vtx_tangent);    //// tangent vector
    

    vec3 texture_normal = read_normal_texture();
    vec3 texture_color = texture(tex_color, vtx_uv).rgb;

    frag_color = vec4(0.0);
    //frag_color = sophiaphong(light1, e, p, light1.position, N, texture_color);
    //frag_color += sophiaphong(light2, e, p, light2.position, N, texture_color);
    for (int i = 0; i < lt_att[0]; i++) {
        vec3 s = lt[i].pos.xyz;
        frag_color += sophiaphong(lt[i], e, p, lt[i].pos.xyz, N, texture_color);
    }
}