import './index.css';

function pad(num: number, size: number): string {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => {
            resolve(image);
        });
        image.addEventListener('error', (e) => {
            reject(e.message);
        });
        image.src = url;
    });
}

const vertexShaderSource = `#version 300 es

in vec2 a_position;
in uint a_tileId;

out vec2 v_texcoord;
out float v_tileId;

void main(void) {
    gl_Position = vec4(a_position.x, -a_position.y, 0.0, 1.0);
    v_texcoord = a_position;
    v_tileId = float(a_tileId);
}

`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
precision mediump sampler2DArray;

uniform sampler2DArray u_textureArray;

in vec2 v_texcoord;
in float v_tileId;

out vec4 outColor;
 
void main() {
    outColor = texture(u_textureArray, vec3(v_texcoord, floor(v_tileId)));
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
    0, 0, // top left
    0, 1, // bottom left
    1, 1, // bottom right
    1, 0, // top left
]), gl.STATIC_DRAW);

// Bind the position buffer to the position attribute.
const positionAttribute = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionAttribute);
gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

// Define the positions (as vec2, in normalized coordinates) of the square that covers the canvas.
const tileIdBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, tileIdBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Uint32Array([
    0, 1024, 1024, 1024
]), gl.STATIC_DRAW);

const tileIdAttribute = gl.getAttribLocation(program, "a_tileId");
gl.enableVertexAttribArray(tileIdAttribute);
gl.vertexAttribPointer(tileIdAttribute, 1, gl.UNSIGNED_INT, false, 0, 0);

// gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

async function main() {
// Create a texture.
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);

    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 64, 64, 1024);

    for (let i = 0; i < 1024; ++i) {
        const textureId = pad(i, 3);
        try {
            const image = await loadImage(`ACTION/${textureId}.png`);
            gl.texSubImage3D(
                gl.TEXTURE_2D_ARRAY,
                0, 0, 0, i,
                64, 64, 1,
                gl.RGBA, gl.UNSIGNED_BYTE,
                image,
            );
        } catch (e) {
            console.log(`Error: ${e}`);
        }
    }

    function drawScene() {
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        requestAnimationFrame(drawScene);
    }

    drawScene();
}

main().then(_ => {
});
