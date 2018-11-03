// Basic Flight Simulator

// Global WebGL context variable
let gl;

// Locations of the uniforms
let model_view_loc, projection_loc, height_range_loc;

// Vertices, indices, and total number of vertices to draw
let verts, inds, total_verts;

// Current rotation angle, position, and scale of the display
let thetas = [0,0,0], position = [0,0,0], cur_scale = 1;

// Amount of detail of terrain and roughness
const DETAIL = 7, ROUGHNESS = 0.003;


window.addEventListener('load', function init() {
	// Get the HTML5 canvas object from it's ID
	const canvas = document.getElementById('gl-canvas');

	// Get the WebGL context (save into a global variable)
	gl = WebGLUtils.create3DContext(canvas, {premultipliedAlpha:false});
	if (!gl) {
		window.alert("WebGL isn't available");
		return;
	}

	// Configure WebGL
	onResize();
	gl.clearColor(1.0, 1.0, 1.0, 0.0); // setup the background color with red, green, blue, and alpha
	gl.enable(gl.DEPTH_TEST); // things further away will be hidden by closer things
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(1.0, 2.0);
	gl.lineWidth(0.5);

	// Generate the data for the mesh
	verts = [], inds = [];
	let terrain = generate_terrain(DETAIL, ROUGHNESS);
	generate_mesh(terrain, verts, inds);
	total_verts = inds.length;
	let normals = calc_normals(verts, inds);

	// place the flyer a little above the surface of the center of the terrain
	position[1] = -terrain[64][64] - 0.03;

	// find the min and max heights
	let min_height = verts[0][1], max_height = verts[0][1];
	for (let i = 1; i < verts.length; i++) {
		if (verts[i][1] < min_height) {
			min_height = verts[i][1];
		} else if (verts[i][1] > max_height) {
			max_height = verts[i][1];
		}
	}

	// Compile shaders
	let vertShdr = compileShader(gl, gl.VERTEX_SHADER, `
		attribute vec4 vPosition, vNormal, vColor;
		uniform mat4 model_view, projection;
		uniform float height_range;
		varying vec4 N, L, V;
		varying float fHeight, fHeight_range;
		void main() {
			vec4 pos = model_view*vPosition;
			gl_Position = projection*pos;
			fHeight = vPosition.y;
			fHeight_range = height_range;

			N = normalize(model_view*vNormal);
			L = normalize(vec4(0.0, 1.0, 0.0, 1.0) - pos);

			// NOTE: this assumes viewer is at <0,0,0> in model coordinates
			V = normalize(vec4(0.0, 0.0, 0.0, 1.0)-pos);
			V.z = -V.z;
		}
	`);

	let fragShdr = compileShader(gl, gl.FRAGMENT_SHADER, `
		precision mediump float;
		const float ka = 0.8, kd = 1.0, ks = 1.0, shininess = 20.0;
		varying vec4 N, L, V;
		varying float fHeight, fHeight_range;
		void main() {
			vec4 n = normalize(N);
			vec4 l = normalize(L);
			vec4 v = normalize(V);

			float d = max(dot(l, n), 0.0), s = 0.0;
			if (d != 0.0) {
				vec4 H = normalize(l + v);
				s = pow(max(dot(n, H), 0.0), shininess);
			}

			float factor = abs(fHeight / fHeight_range); // factors in the min/max height of terrain
			gl_FragColor = (ka*vec4(1, 1, 1, 1) + kd*d*vec4(1, 1, 1, 1) + ks*s*vec4(1, 1, 1, 1))*vec4(0.0, factor, 0.0, 1.0);
			gl_FragColor.a = 1.0; // force opaque
		}
	`);

	// Link the programs and use them with the WebGL context
	let program = linkProgram(gl, [vertShdr, fragShdr]);
	gl.useProgram(program);

	// Load the vertex data into the GPU and associate with shader
	create_vertex_attr_buffer(program, 'vPosition', verts);
	create_vertex_attr_buffer(program, 'vNormal', normals);

	// Upload the indices
	let bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferId); // bind to the new buffer
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(inds), gl.DYNAMIC_DRAW); // load the flattened data into the buffer

	// Get the location of the uniforms
	model_view_loc = gl.getUniformLocation(program, "model_view");
	projection_loc = gl.getUniformLocation(program, "projection");
	height_range_loc = gl.getUniformLocation(program, "height_range");

	// Initialize the uniforms
	gl.uniform1f(height_range_loc, max_height-min_height);
	update_model_view();
	update_projection();


	// Add the resize listener
	window.addEventListener('resize', onResize);

	// Listen to keyboard events
	window.addEventListener('keydown', onKeyDown);

	// Render the scene
	render();
});

/**
 * Render the scene.
 */
function render() {
	// Render
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Draw the surface of the mesh
	gl.drawElements(gl.TRIANGLE_STRIP, total_verts, gl.UNSIGNED_SHORT, 0);

	// Animate
	window.requestAnimationFrame(render);
}

/**
 * Update the model-view transformation
 */
function update_model_view() {
	let mv = mult(mult(rotateZ(thetas[2]), rotateY(thetas[1])), rotateX(thetas[0]));
	mv = mult(mv, translate(position[0], position[1], position[2]));
	mv = mult(scalem(cur_scale, cur_scale, cur_scale), mv);
	gl.uniformMatrix4fv(model_view_loc, false, flatten(mv));
}

/**
* Update the projection transformation based on global variables.
 */
function update_projection() {
	let p, w = gl.canvas.width, h = gl.canvas.height;
	p = perspective(45, w/h, 0.01, 10);
	gl.uniformMatrix4fv(projection_loc, false, flatten(p));
}

/**
 * Make the canvas fit the window
 */
function onResize() {
	let w = window.innerWidth, h = window.innerHeight;
	gl.canvas.width = w;
	gl.canvas.height = h;
	gl.viewport(0, 0, w, h);
	update_projection();
}

/**
 * Creates a vertex attribute buffer for the given program and attribute with
 * the given name. If x is an array, it is used as the initial values in the
 * buffer. Otherwise it must be an integer and specifies the size of the buffer.
 * In addition, if x is not an array, n must be provided which is the dimension
 * of the data to be allocated eventually.
 */
function create_vertex_attr_buffer(program, name, x, n) {
	let is_array = Array.isArray(x);
	let bufferId = gl.createBuffer(); // create a new buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId); // bind to the new buffer
	gl.bufferData(gl.ARRAY_BUFFER, is_array ? flatten(x) : (x*n*sizeof.vec2/2), gl.STATIC_DRAW); // load the flattened data into the buffer
	let attrib_loc = gl.getAttribLocation(program, name); // get the vertex shader attribute location
	gl.vertexAttribPointer(attrib_loc, is_array ? x[0].length : n, gl.FLOAT, false, 0, 0); // associate the buffer with the attributes making sure it knows its type
	gl.enableVertexAttribArray(attrib_loc); // enable this set of data
	return bufferId;
}

function onKeyDown(evt) {
	const rot_deg = 6;
	switch (evt.keyCode) {
	// Move forward and backward based on the direction being faced
	case 38: // up
		checkForCollisionAndMove(0.05);
		break;
	case 40: // down
		checkForCollisionAndMove(-0.05);
		break;

	// rotates to the left and right (yaw)
	case 37: // left
		thetas[1] -= rot_deg;
		break;
	case 39: // right
		thetas[1] += rot_deg;
		break;

	// rotates down and up (pitch)
	case 87: // w
		thetas[0] -= rot_deg;
		break;
	case 83: // s
		thetas[0] += rot_deg;
		break;

	// rotates clockwise and counter-clockwise (roll)
	case 65: // a
		thetas[2] -= rot_deg;
		break;
	case 68: // d
		thetas[2] += rot_deg;
		break;
	}
	// update rotation matrix in shader
	update_model_view();
}

// returns the distance between the two points
function dist(pt1, pt2) {
	return Math.sqrt(Math.pow(pt1[0]-pt2[0], 2)+Math.pow(pt1[1]-pt2[1], 2)+Math.pow(pt1[2]-pt2[2], 2));
}

function checkForCollisionAndMove(distance) {
	let rot = mult(mult(rotateZ(-thetas[2]), rotateY(-thetas[1])), rotateX(-thetas[0]));
	let positionVec = mult(rot, vec4(0, 0, distance, 0));

	// check for collisions
	let intersected_triangles = [];
	let pos = negate(position);
	for (let i = 0; i < inds.length - 2; i++) {
		let pt = null;
		if (dist(verts[inds[i]], position) <= 0.2 || dist(verts[inds[i+1]], position) <= 0.2 || dist(verts[inds[i+2]], position) <= 0.2) {
			pt = line_seg_triangle_intersection(pos, positionVec, verts[inds[i]], verts[inds[i+1]], verts[inds[i+2]]);
		}
		if (pt !== null) {
			intersected_triangles.push(pt);
		}
	}
	let closest = 1;
	for (let i = 0; i < intersected_triangles.length; i++) {
		let triangle = intersected_triangles[i];
		let coll_dist = dist(triangle, position);
		closest = (coll_dist < closest) ? coll_dist : closest;
	}

	// move if there is no collision
	if (closest > 0.2) {
		position[0] += positionVec[0];
		position[1] += positionVec[1];
		position[2] += positionVec[2];
	}
}
