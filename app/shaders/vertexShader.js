const vertexShader = `

// Vertex Shader
varying vec3 v_normal;
varying vec2 v_uv;
varying float v_noise;

void main() {
v_uv = uv;
v_normal = normal;
v_noise = snoise(vec3(position * 0.1, u_time)); // Pass the noise value to the fragment shader
gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

`
;

export default vertexShader;