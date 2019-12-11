import './index.css';

const vertexShaderSource = `

attribute vec2 a_position;

void main(void) {
  gl_Position = vec4(a_position, 0.0, 1.0);
}

`;

const fragmentShaderSource = `

void main(void) {
  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}

`;

// Select the canvas from the document.
const canvas = document.querySelector("canvas")!;
// Create the WebGL context, with fallback for experimental support.

const context = canvas.getContext("webgl")!;

// Compile the vertex shader.
const vertexShader = context.createShader(context.VERTEX_SHADER)!;
context.shaderSource(vertexShader, vertexShaderSource);
context.compileShader(vertexShader);
if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS))
    throw new Error(context.getShaderInfoLog(vertexShader)!);

// Compile the fragment shader.
const fragmentShader = context.createShader(context.FRAGMENT_SHADER)!;
context.shaderSource(fragmentShader, fragmentShaderSource);
context.compileShader(fragmentShader);
if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS))
    throw new Error(context.getShaderInfoLog(fragmentShader)!);

// Link and use the program.
const program = context.createProgram()!;
context.attachShader(program, vertexShader);
context.attachShader(program, fragmentShader);
context.linkProgram(program);
if (!context.getProgramParameter(program, context.LINK_STATUS))
    throw new Error(context.getProgramInfoLog(program)!);
context.useProgram(program);

// Define the positions (as vec2, in normalized coordinates) of the square that covers the canvas.
const positionBuffer = context.createBuffer();
context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
context.bufferData(context.ARRAY_BUFFER, new Float32Array([
    -1.0, -1.0,
    +1.0, -1.0,
    +1.0, +1.0,
    -1.0, +1.0
]), context.STATIC_DRAW);

// Bind the position buffer to the position attribute.
const positionAttribute = context.getAttribLocation(program, "a_position");
context.enableVertexAttribArray(positionAttribute);
context.vertexAttribPointer(positionAttribute, 2, context.FLOAT, false, 0, 0);

// Draw the square!
context.drawArrays(context.TRIANGLE_FAN, 0, 4);
