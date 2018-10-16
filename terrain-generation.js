// Code for generating terrain-like height maps
/* exported generate_terrain */

/**
 * Generates random terrain using the square-diamond algorithm and median filtering.
 * detail determines the size of the returned 2D data (maximum of 7 if using indexed arrays)
 * roughness describes how rough the terrain is (likely to be between 0 and 0.01)
 * The returned data is a 2D array (array of arrays) that represents a height-map.
 */
function generate_terrain(detail, roughness) {
	// The actual size of the data must be a power of two in each direction
	let size = Math.pow(2, detail) + 1;
	let max = size - 1;
	let map = new Array(size);
	for (let i = 0; i < size; i++) { map[i] = new Float32Array(size); }

	let scale = roughness*size
	map[0][0] = Math.random()*scale*2 - scale;
	map[max][0] = Math.random()*scale*2 - scale;
	map[max][max] = Math.random()*scale*2 - scale;
	map[0][max] = Math.random()*scale*2 - scale;

	divide(max);

	function divide(sz) {
		let half = sz / 2, scl = roughness * sz;
		if (half < 1) { return; }

		for (let y = half; y < max; y += sz) {
			for (let x = half; x < max; x += sz) {
				let offset = Math.random() * scl * 2 - scl;
				map[x][y] = offset + square(x, y, half);
			}
		}

		for (let y = 0; y <= max; y += half) {
			for (let x = (y + half) % sz; x <= max; x += sz) {
				let offset = Math.random() * scl * 2 - scl;
				map[x][y] = offset + diamond(x, y, half);
			}
		}

		divide(sz / 2);
	}

	function average() {
		// Calculates average of all arguments given (except undefined values)
		// This ignores any x/y coordinate outside the map
		let args = Array.prototype.slice.call(arguments).filter(function (n) { return n === 0 || n; });
		let sum = 0;
		for (let i = 0; i < args.length; i++) { sum += args[i]; }
		return sum / args.length;
	}

	function square(x, y, sz) {
		// Performs a single square computation of the algorithm
		if (x < sz) { return average(map[x+sz][y-sz], map[x+sz][y+sz]); }
		if (x > max - sz) { return average(map[x+sz][y-sz], map[x+sz][y+sz]); }
		return average(map[x-sz][y-sz], map[x+sz][y-sz], map[x+sz][y+sz], map[x-sz][y+sz]);
	}

	function diamond(x, y, sz) {
		// Performs a single computation step of the algorithm
		if (x < sz) { return average(map[x][y-sz], map[x+sz][y], map[x][y+sz]); }
		if (x > max-sz) { return average(map[x][y-sz], map[x][y+sz], map[x-sz][y]); }
		return average(map[x][y-sz], map[x+sz][y], map[x][y+sz], map[x-sz][y]);
	}

	function median3Filter(src) {
		// Applies a 3x3 median filter to the given array-of-arrays.
		let N = src.length, n = N - 1;
		let block = new Float32Array(3*3);
		let dst = new Array(N);
		for (let y = 0; y < N; y++) { dst[y] = new Float32Array(N); }
		// Core of the 'image'
		for (let y = 0; y < N-2; y++) {
			for (let x = 0; x < N-2; x++) {
				for (let cy = 0; cy < 3; cy++) {
					for (let cx = 0; cx < 3; cx++) {
						block[cy*3+cx] = src[y+cy][x+cx];
					}
				}
				block.sort();
				dst[y+1][x+1] = block[4];
			}
		}
		// Corners
		dst[0][0] = median(src[0][0], src[1][0], src[0][1], src[1][1]);
		dst[n][0] = median(src[n][0], src[n][1], src[n-1][0], src[n-1][1]);
		dst[0][n] = median(src[0][n], src[1][n], src[0][n-1], src[1][n-1]);
		dst[n][n] = median(src[n][n], src[n][n-1], src[n-1][n], src[n-1][n-1]);
		// Edges
		for (let y = 1; y < n; y++) {
			dst[y][0] = median(src[y-1][0], src[y][0], src[y+1][0], src[y-1][1], src[y][1], src[y+1][1]);
			dst[y][n] = median(src[y-1][n], src[y][n], src[y+1][n], src[y-1][n-1], src[y][n-1], src[y+1][n-1]);
		}
		for (let x = 1; x < n; x++) {
			dst[0][x] = median(src[0][x-1], src[0][x], src[0][x+1], src[1][x-1], src[1][x], src[1][x+1]);
			dst[n][x] = median(src[n][x-1], src[n][x], src[n][x+1], src[n-1][x-1], src[n-1][x], src[n-1][x+1]);
		}
		// Done
		return dst;
	}
	function median() {
		// Calculates the median of all arguments given (except undefined values)
		let args = Array.prototype.slice.call(arguments).filter(function (n) { return n === 0 || n; });
		args.sort()
		if ((args.length % 2) === 1) { return args[(args.length-1)/2]; }
		return (args[args.length/2-1] + args[args.length/2]) / 2;
	}

	return median3Filter(map);
}
