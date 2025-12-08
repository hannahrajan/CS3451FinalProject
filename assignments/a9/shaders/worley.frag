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

in vec3 vtx_pos;
in vec3 vtx_normal;
in vec2 vtx_uv;

out vec4 frag_color;


uniform vec3 ka;            /* object material ambient */
uniform vec3 kd;            /* object material diffuse */
uniform vec3 ks;            /* object material specular */
uniform float shininess;    /* object material shininess */

uniform sampler2D tex_color; 

vec3 hash3(vec3 p) {
    return mod((34.0 * p + 1.0) * p, 289.0) / 289.0;
}

float worley_noise_3d(vec3 p)
{
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    float noise = 1.0;
    
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            for (int z = -1; z <= 1; z++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 feature = hash3(i + neighbor);
                feature = 0.5 + 0.5 * sin(iTime + 6.2831 * feature);
                float dist = length(neighbor + feature - f);
                noise = min(noise, dist);
            }
        }
    }
    
    return noise;
}

float noiseOctave_3d(vec3 v, int num)
{
    float sum = 0;
    float amplitude = 1.0;
    float frequency = 1.0;
    
    for(int i = 0; i < num; i++) {
        sum += amplitude * worley_noise_3d(frequency * v);
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

    vec3 tex_color = texture(tex_color, uv).rgb;
    
    vec3 ambColor = ka * li.amb.rgb * tex_color;
    vec3 difColor = tex_color * li.dif.rgb * max(0., dot(n, l));
    vec3 specColor = ks * li.spec.rgb * pow(max(dot(v, r), 0.), shininess);

    return vec4(ambColor + difColor + specColor, 1);
}

vec3 shading_worley_sphere(vec3 world_pos, vec3 normal, vec2 uv)
{
    // Scale the position to control cell size
    float scale = 5.0;
    vec3 sample_pos = world_pos * scale;
    
    // Get 3D Worley noise
    float noise = noiseOctave_3d(sample_pos, 1);
    
    // Make cells more distinct
    noise = smoothstep(0.2, 0.8, noise);

	vec3 n = normal;
	vec3 e = position.xyz;
	vec3 p = world_pos;
	vec3 s = lt[0].pos.xyz;
    vec3 color = shading_texture_with_phong(lt[0], e, p, s, n, uv).xyz;
	color = color * mix(0.9, 1.1, noise); // Grayscale first	
    
    return color;

}

void main()
{
    frag_color = vec4(shading_worley_sphere(vtx_pos, normalize(vtx_normal), vtx_uv), 1.0);
}
