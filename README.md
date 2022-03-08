This project is a basic flight simulator over a finite, random, terrain.
The user flies something more like a quadcopter than an airplane as the camera will not fly forward on its own.
This project makes use of meshes, perspective projections, lighting, and collision detection.
The terrain is generated using the diamond-square algorithm which is a recursive algorithm.
The terrain is drawn with lighting so the contours and shapes of the terrain can be easily seen (shadows are ignored).
Colors and shading are meant to look somewhat like a realistic landscape.
The colors depend on the range of heights in the terrain.
The entire terrain is drawn with a single call to drawElements.
The flyer starts in the middle of the random terrain slightly above the surface.
The random terrain is generated in such a way that the middle of it may be negative or positive thus the user does not necessarily start just above a height of 0.

The controls for the flyer are as follows: 
* Up/Down arrow: moves forward/backward based on the direction it is facing 
* Left/Right arrow: rotates to the left/right (yaw) 
* W/S: rotates down/up (pitch) 
* A/D: rotates clockwise/counter-clockwise (roll)

The flyer is not allowed to pass through the terrain but nothing bad happens when it "hits" the terrain.
Collision detection relies on the detection of whether a line segment and a triangle intersect in 3D.
If the flyer does not leave the defined area then the underside of the terrain can never be seen, however, since the terrain is finite in area it may end up leaving the region where 
terrain is defined and fly under the terrain.
The view from the flyer uses a perspective such that no part of the terrain is ever clipped if the flyer is above the defined region and not absurdly far off the ground.
The canvas is full-screen and maintains the proper aspect ratio regardless of the dimensions of the window.