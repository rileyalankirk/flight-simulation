// Various useful functions
/* exported line_seg_triangle_intersection generate_mesh calc_normals */

function line_seg_triangle_intersection(p, vec, a, b, c) {
	// Finds the intersection between a line segment and a triangle. The line segment is given by a
	// point (p) and vector (vec). The triangle is given by three points (abc). If there is no
	// intersection, the line segment is parallel to the plane of the triangle, or the triangle is
	// degenerate then null is returned. Otherwise a vec4 is returned that contains the intersection.
	p = ensure_vec4(p, 1);
	a = ensure_vec4(a, 1); b = ensure_vec4(b, 1); c = ensure_vec4(c, 1);
	vec = ensure_vec4(vec, 0);

	let u = subtract(b, a), v = subtract(c, a); // triangle edge vectors
	let uu = dot(u, u), vv = dot(v, v), uv = dot(u, v);
	let tri_scale = uv*uv-uu*vv;
	if (tri_scale === 0) { return null; } // triangle is degenerate
	let n = vec4(cross(u, v)); // normal vector of the triangle

	// Find the point where the line intersects the plane of the triangle
	let denom = dot(n, vec);
	if (denom === 0) { return null; } // line segment is parallel to the plane of the triangle
	let rI = dot(n, subtract(a, p)) / denom;
	if (rI < 0 || rI > 1) { return null; } // line segment does not intersect the plane of the triangle
	p = add(p, scale(rI, vec)); // the point where the line segment intersects the plane of the triangle

	// Check if the point of intersection lies in within the triangle
	let w = subtract(p, a), wv = dot(w, v), wu = dot(w, u);
	let sI = (uv*wv-vv*wu)/tri_scale, tI = (uv*wu-uu*wv)/tri_scale;
	if (sI < 0 || tI < 0 || sI + tI > 1) { return null; } // intersection point is outside of the triangle

	// Return the intersection
	return p;
}

/**
 * Ensures that the argument v is a vec4 with the given last value. If it is only a vec3 than the
 * last value is appended and it is returned.
 */
function ensure_vec4(v, last) {
	if (v.length === 3) {
		v = vec4(v, last);
	} else if (v.length !== 4 || v[3] !== last) { throw "invalid argument value"; }
	return v;
}

/**
 * Calculates the normals for the vertices given an array of vertices and array of indices to look
 * up into. By default this assumes the indices represents a triangle strip. To work with triangles
 * pass a third argument of false.
 */
function calc_normals(verts, inds, strip) {
	if (strip !== true && strip !== false) { strip = true; }
	let normals = new Array(verts.length);

	// Start with all vertex normals as <0,0,0,0>
	for (let i = 0; i < verts.length; i++) { normals[i] = vec4(0, 0, 0, 0); }

	// Calculate the face normals for each triangle then add them to the vertices
	let inc = strip ? 1 : 3;
	for (let i = 0; i < inds.length - 2; i+=inc) {
		let j = inds[i], k = inds[i+1], l = inds[i+2];
		let a = verts[j], b = verts[k], c = verts[l];
		let face_norm = cross((strip && (i%2) !== 0) ? subtract(a, b) : subtract(b, a), subtract(a, c));
		normals[j] = add(normals[j], face_norm);
		normals[k] = add(normals[k], face_norm);
		normals[l] = add(normals[l], face_norm);
	}

	// Normalize the normals
	for (let i = 0; i < verts.length; i++) { normals[i] = normalize(normals[i]); }
	return normals;
}

/**
 * Generate a mesh of triangles from a 2D dataset that indicates the height of the mesh at every
 * point. The result is to be drawn with gl.drawElements(gl.TRIANGLE_STRIP).
 */
function generate_mesh(data, verts, inds) {
	let off = verts.length, n = data.length, m = data[0].length;
	// Just the vertices
	for (let i = 0; i < n; i++) {
		for (let j = 0; j < m; j++) {
			verts.push(vec4(2*i/(n-1)-1, data[i][j], 2*j/(m-1)-1, 1.0));
		}
	}
	// Rectangles
	for (let i = 0; i < n-1; i++) {
		for (let j = 0; j < m; j++) {
			inds.push(off+i*m+j);
			inds.push(off+(i+1)*m+j);
		}
		inds.push(off+(i+2)*m-1);
		inds.push(off+(i+1)*m);
	}
}
