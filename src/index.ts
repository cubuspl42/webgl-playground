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

const n = 128;

const vertexShaderSource = `#version 300 es

in vec2 a_position;
in vec2 a_tileCoord;

out vec2 v_texcoord;
out vec2 v_tileCoord;

void main(void) {
    gl_Position = vec4(a_position.x, -a_position.y, 0.0, 1.0);
    v_texcoord = a_position;
    v_tileCoord = a_tileCoord;
}

`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
precision mediump sampler2DArray;
precision mediump isampler2D;

uniform sampler2DArray u_textureArray;
uniform isampler2D u_tiles;

in vec2 v_texcoord;
in vec2 v_tileCoord;

out vec4 outColor;
 
void main() {
    // int tileId = int(v_tileCoord);
    int tileId = texelFetch(u_tiles, ivec2(floor(v_tileCoord * ${n}.0)), 0).r;
    
    vec2 texcoord = v_texcoord * ${n}.0;
    
    outColor = texture(u_textureArray, vec3(texcoord, tileId));
    // outColor = vec4(1.0, 0.0, 0.0, 1.0);
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

const textureArrayUniform = gl.getUniformLocation(program, "u_textureArray");
const tilesUniform = gl.getUniformLocation(program, "u_tiles");

// Define the positions (as vec2, in normalized coordinates) of the square that covers the canvas.
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, // top left
    -1, 1, // bottom left
    1, 1, // bottom right
    1, -1, // top left
]), gl.STATIC_DRAW);

// Bind the position buffer to the position attribute.
const positionAttribute = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionAttribute);
gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

// Define the positions (as vec2, in normalized coordinates) of the square that covers the canvas.
const tileIdBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, tileIdBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    // 300, 300 + n, 300 + n, 300 + n,
    // 302, 302, 302, 302,
    // 0, 1024, 1024, 1024,
    0, 0,
    0, 1,
    1, 1,
    1, 0
]), gl.STATIC_DRAW);

const tileCoordAttribute = gl.getAttribLocation(program, "a_tileCoord");
gl.enableVertexAttribArray(tileCoordAttribute);
gl.vertexAttribPointer(tileCoordAttribute, 2, gl.FLOAT, false, 0, 0);

// gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

async function main() {
// Create a texture.
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);

    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

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

    // Create tiles data texture

    const tilesTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tilesTexture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.uniform1i(textureArrayUniform, 0); // TEXTURE0

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tilesTexture);
    gl.uniform1i(tilesUniform, 1); // TEXTURE1

    const w = 1024 * 2;
    const h = w;

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tilesTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32I, w, h, 0, gl.RED_INTEGER, gl.INT,
        new Int32Array(Array.from({length: w * h}, () => Math.floor(Math.random() * 1024))),
    );

    const data = new Int32Array(Array(w * h).fill(323));

    function drawScene() {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, tilesTexture);
        // gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RED_INTEGER, gl.INT, data);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        requestAnimationFrame(drawScene);
    }

    drawScene();
}

main().then(_ => {
});
