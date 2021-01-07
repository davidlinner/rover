## About The Project

[![Rover Simulation][product-screenshot]](/)

Simple simulation for a program-driven vehicle with a top-down visualization.

Motivation
 * Testing of simple navigation routines
 * Preparation of IOT projects with autonomous vehicles
 * JavaScript/Typescript only   

### Built With

The rover simulation uses the following 3rd party libraries:
* [Geodesy](http://www.movable-type.co.uk/scripts/geodesy-library.html)
* [P2](https://github.com/schteppe/p2.js)

Special thanks to Chris Veness!

## Installation

To use the simulation create a new web project including a bundler like [Webpack](https://webpack.js.org/) and install 
the package from github.

_with npm_   

  ```sh
  npm install github:davidlinner/rover
  ```
<!-- USAGE EXAMPLES -->
## Usage

Basic example:

```js
import {Simulation} from 'rover';

const loop = ({location, heading, clock}, {engines}) => {    
    return {
        engines: [0.5,0.8]
    }
}

const simulation = new Simulation({
    loop,
    origin: {
        latitude:52.477050353132384,
        longitude:13.395281227289209
    },
    element: document.querySelector('main'),
    locationsOfInterest: [{
        latitude: 52.47880703639255,
        longitude: 13.395281227289209,
        label: 'A'
    }],
    renderingOptions: {
        width: 500,
        height: 500
    }
});

simulation.start();
```

Please consult the API Docs for details.

* [API Docs](https://davidlinner.github.io/rover/)

## License

Distributed under the MIT License.




[product-screenshot]: images/screenshot.jpg
