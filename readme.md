## About The Project

This library implements a programmable simulation and top-down visualization for a simple land vehicle. The library was 
created as teaching material in the Internet of Things (IOT) project for and by the students of 
[Berlin School of Design and Communication](https://www.srh-university-berlin.de/).   

[![Rover Simulation][product-screenshot]](/)

### Motivation

In the IOT project students build a general purpose rover platform. Some usage scenarios students realize are
the autonomous search for land mines or long-term research observations in earth environments with rough climate 
conditions such as (ice) deserts.

A central challenge in this project is the implementation of routing and navigation in the presence of
static obstacles too small to be marked on maps (e.g. stones and rocks). Testing and debugging these algorithms 
in realtime on hardware is inevitable, but also slow and expensive. For this reason we were searching for a simulation
environment with the following features:

- fully programmable control loop
- vehicle with either chain drive or six steerable wheels
- open world
- simulated location sensor providing real latitude and longitude values
- simulated proximity sensor
- simulated compass
- simulated measurement "errors" on all sensor values
- implementation with an easy to learn script language, preferably JavaScript/Typescript

After some research we came to the conclusion our requirements are too special and created our own simulation. 
Here it is.  

### Built With

The rover simulation uses the following 3rd party libraries:

-   [Geodesy](http://www.movable-type.co.uk/scripts/geodesy-library.html)
-   [P2](https://github.com/schteppe/p2.js)

P2 seems not to be actively maintained and is also not really suited for simulation with natural gravity on Z-axis. 
We could replace this dependency sooner or later.

## Installation

To use the simulation create a new web project including a bundler like [Webpack](https://webpack.js.org/) and install
the package from github.

_with npm_

```sh
npm install github:davidlinner/rover
```

Proper NPM package about to follow...

<!-- USAGE EXAMPLES -->

## Usage

Basic example:

```js
import { ControlLoop, Simulation, LocationOfInterest, RoverType } from 'rover';

// Create a simple control function which only tells the engines to go forward, left a bit slower, so we drive in a circle
// The control function will be called periodically in the control loop
const loop: ControlLoop = ({ location, heading, clock }, { engines, steering }) => {
	return {
		engines: [0.8, 0.8],
	};
};

// Create a new simulation
const simulation = new Simulation({
	// add above loop
	loop,

	// type of vehicle (tank or rover); tank expects two engine argument left and right
	vehicleType: VehicleType.tank,

	// define the origin offset of the rover on the planet,
	origin: {
		latitude: 52.477050353132384,
		longitude: 13.395281227289209,
	},

	// select the DOM element the visualization canvas should be appended to as child
	element: document.querySelector('main'),

	// define a list of static points to be rendered in the visualization (nice for waypoints)
	locationsOfInterest: [
		{
			latitude: 52.47880703639255,
			longitude: 13.395281227289209,
			label: 'A',
		},
	],

	// set rending options like size and colors
	// consult the API docs for all switches and params
	renderingOptions: {
		width: 500, // width of created canvas
		height: 500, // height of created canvas
	},
});

// as soon as the simulation is created the visualization is rendered,
// but have to explicitely start the control loop
simulation.start();
```

**Adding measurement errors**

Additionally, you can configure a more realistic behavior for the simulation
by setting the `physicalContraints` property. Three constraint collections, `AUTHENTICITY_LEVEL0`, 
`AUTHENTICITY_LEVEL1`, `AUTHENTICITY_LEVEL2` are predefined, while the first means no errors at all. 

`AUTHENTICITY_LEVEL1`, in contrast, adds random measurement errors with equal distribution to heading and location and a little, random unbalance to the two engines.
Since the random seeds are different for each run of the simulation error correction has to
be added to the control loop.

`AUTHENTICITY_LEVEL2` is similar to `AUTHENTICITY_LEVEL1`, but adds errors with a more realistic gaussian distribution. 

Example with some environmental error:

```js
// Import main Simulation class and error factory function
import { Simulation, AUTHENTICITY_LEVEL2, /*...*/ } from 'rover';
//...

// Create a new simulation
const simulation = new Simulation({
	//...
	physicalConstraints: AUTHENTICITY_LEVEL2,
    //...
});

```

**Adding obstacles**

Similar to locations of interest, obstacles can be added in advance to the simulation. Obstacles all have a circular shape, 
but the radius can be configured in meters. To create more irregularly shaped obstacles, create overlapping circles.  

```javascript
const simulation = new Simulation({
    //...
    obstacles: [{
        radius: 1,
        latitude: 52.477000353132384,
        longitude: 13.395281227289209
    }],
    //...
});
```

Please consult the API Docs for more details.

-   [API Docs](https://davidlinner.github.io/rover/)

## License

Distributed under the MIT License.

[product-screenshot]: images/screenshot.jpg
