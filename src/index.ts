import './index.css';

const vertexShaderSource = `#version 300 es

in vec2 a_position;
out vec2 v_texcoord;

void main(void) {
    gl_Position = vec4(a_position.x, -a_position.y, 0.0, 1.0);
    v_texcoord = a_position;
}

`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
in vec2 v_texcoord;

out vec4 outColor;
 
void main() {
    outColor = texture(u_texture, v_texcoord);
}

`;

// Select the canvas from the document.
const canvas = document.querySelector("canvas")!;
// Create the WebGL gl, with fallback for experimental support.

const gl = canvas.getContext("webgl2")!;

// Compile the vertex shader.
const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(vertexShader)!);

// Compile the fragment shader.
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(fragmentShader)!);

// Link and use the program.
const program = gl.createProgram()!;
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program)!);
gl.useProgram(program);

// Define the positions (as vec2, in normalized coordinates) of the square that covers the canvas.
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0, // bottom left
    0, 1, // bottom right
    1, 0, // top right
    0, 1,
    1, 1, // --
    1, 0,
]), gl.STATIC_DRAW);

// Bind the position buffer to the position attribute.
const positionAttribute = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionAttribute);
gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

// Create a texture.
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
// Fill the texture with a 1x1 blue pixel.
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 255, 255]));

const image = new Image();
image.src = "012.png";
image.addEventListener('load', function () {
    // Now that the image has loaded make copy it to the texture.
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
});

function drawScene() {
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 6);
    requestAnimationFrame(drawScene);
}

drawScene();