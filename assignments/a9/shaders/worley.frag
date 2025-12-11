#version 330 core

layout (std140) uniform camera
{
	mat4 projection;
	mat4 view;
	mat4 pvm;
	mat4 ortho;
	vec4 position;
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

uniform float iTime;
uniform mat4 model;		/*model matrix*/

in vec3 vtx_normal; // vtx normal in world space
in vec3 vtx_position; // vtx position in world space
in vec3 vtx_model_position; // vtx position in model space
in vec4 vtx_color;
in vec2 vtx_uv;
in vec3 vtx_tangent;

out vec4 frag_color;

uniform vec3 ka;            /* object material ambient */
uniform vec3 kd;            /* object material diffuse */
uniform vec3 ks;            /* object material specular */
uniform float shininess;    /* object material shininess */

uniform sampler2D texture_color; 
uniform samplerCube skybox;

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

float worley_noise_2d(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    float f1 = 1.0; // Closest
    float f2 = 1.0; // Second closest
    
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            vec2 neighbor = vec2(float(x), float(y));
			vec2 feature = hash2(i + neighbor);
			feature = 0.5 + 0.25 * sin(iTime + 6.2831 * feature);
			float dist = length(neighbor + feature - f);
            
			if (dist < f1) {
                f2 = f1;
                f1 = dist;
            } else if (dist < f2) {
                f2 = dist;
            }
        }
    }
    
    return f2 - f1;
}

float noiseOctave_2d(vec2 v, int num)
{
    float sum = 0;
    float amplitude = 1.0;
    float frequency = 1.0;
    
    for(int i = 0; i < num; i++) {
        sum += amplitude * worley_noise_2d(frequency * v);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return sum;
}

vec4 shading_texture_with_phong(light li, vec3 e, vec3 p, vec3 s, vec3 n, vec2 uv) 
{
    vec3 v = normalize(e - p);
    vec3 l = normalize(s - p);
    vec3 r = normalize(reflect(-l, n));

    vec3 tex_color = texture(texture_color, uv).rgb;
    
    vec3 ambColor = ka * li.amb.rgb * tex_color;
    vec3 difColor = tex_color * li.dif.rgb * max(0., dot(n, l));
    vec3 specColor = ks * li.spec.rgb * pow(max(dot(v, r), 0.), shininess);

    return vec4(ambColor + difColor + specColor, 1);
}

vec2 sphericalUV(vec3 pos) {
    float u = atan(pos.z, pos.x) / (2.0 * 3.14159);
    float v = asin(pos.y) / 3.14159;
    return vec2(u, v);
}

//replace typical lighting to get a "sunset" effect
vec3 sunset_lighting(vec3 world_pos, vec3 normal, vec2 uv)
{
    vec3 sun_dir = normalize(vec3(-0.7, 0.2, 0.5)); //sun location

    float sun_dot = max(dot(normal, sun_dir), 0.0); //colors based on where sun is
    
    vec3 sunset_color = mix(vec3(0.1, 0.1, 0.2), vec3(1.0, 0.5, 0.1), sun_dot); //gradient for "sunset"
    
    return sunset_color;
}

vec3 shading_worley_sphere(vec3 world_pos, vec3 model_pos, vec3 normal, vec2 uv)
{
	//3D position -> Spherical coordinates
	vec2 sphere_uv = sphericalUV(normalize(model_pos));

    // Scale the position to control cell size
    float scale = 10.0;
    vec2 sample_pos = sphere_uv * scale;
    
    // Get 3D Worley noise
    float noise = noiseOctave_2d(sample_pos, 6);
    
    // Make cells more distinct
    noise = smoothstep(0.4, 0.6, noise);

	vec3 n = normal;
	vec3 e = position.xyz;
	vec3 p = world_pos;
    vec3 color = sunset_lighting(world_pos, normal, uv);
    float edges = fwidth(noise) * 2.0; //gradient, creating outline for all noise
    vec3 edge_color = vec3(1.0, 0.8, 0.6); //"glow" color
    color = mix(color, edge_color, edges);
    
    return clamp(color, 0.0, 1.0);

    return color;

}


vec3 shading_worley_with_reflection(vec3 world_pos, vec3 model_pos, vec3 normal, vec2 uv)
{
    vec3 view_dir = normalize(position.xyz - world_pos);
    if (dot(normal, view_dir) < 0.0) {
        normal = -normal; // Flip back-face normals
    }
    // Get Worley Noise
	vec3 worley_color = shading_worley_sphere(world_pos, model_pos, normal, uv);

    // Skybox reflection!
    vec3 I = normalize(position.xyz - world_pos);
    vec3 R = reflect(I, normal);
    vec3 reflection = texture(skybox, vec3(R.x, -R.y, -R.z)).rgb;
    
    // Worley + reflection!
    float reflection_strength = 0.5; 
    vec3 final_color = mix(worley_color, reflection, reflection_strength);
    
    return final_color;
}

void main()
{
    frag_color = vec4(shading_worley_with_reflection(vtx_position, vtx_model_position, normalize(vtx_normal), vtx_uv), 0.5);
}
