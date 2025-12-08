#version 330 core

layout(std140) uniform camera
{
    mat4 projection;
    mat4 view;
    mat4 pvm;
    mat4 ortho;
    vec4 position;
};

uniform mat4 model;

layout(location = 0) in vec4 pos;
layout(location = 2) in vec4 normal;
layout(location = 3) in vec4 uv;

out vec3 vtx_pos;
out vec3 vtx_normal;
out vec2 vtx_uv;

void main()
{
    vtx_pos = (model * vec4(pos.xyz, 1.)).xyz;
    vtx_normal = normalize((model * vec4(normal.xyz, 0.)).xyz);
    vtx_uv = uv.xy;
    
    gl_Position = pvm * vec4(pos.xyz, 1.);
}