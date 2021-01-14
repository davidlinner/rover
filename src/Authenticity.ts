import { Location, PhysicalOptions, VehicleOptions } from './types';
import LatLon from 'geodesy/latlon-spherical.js';
import { MAX_PROXIMITY_DISTANCE } from './Simulation';
import { randn_bm } from './utils';

/**
 * Creates physical options with ideal properties, i.e. no errors, noise, etc.
 * @param vehicleOptions The vehicle options to prepare physical options for
 */
export function AUTHENTICITY_LEVEL0(vehicleOptions?: VehicleOptions): PhysicalOptions {
	const engineCount = vehicleOptions?.engineCount || 2;

	const errorHeading = (heading: number) => heading;
	const errorEngine = new Array<number>(engineCount).map(() => (value: number) => value);
	const errorLocation = (location: Location) => location;
	const errorProximity = (distance: number) => distance;

	return {
		errorEngine,
		errorHeading,
		errorLocation,
		errorProximity,
	};
}

function biasedRandom(bias: number, influence = 1, min = 0, max = 1) {
	const rnd = Math.random() * (max - min) + min;
	const mix = Math.random() * influence;
	return rnd * (1 - mix) + bias * mix;
}

/**
 * Creates physical options with the following properties:
 * - heading has a dynamic, random error of -3° <= x <= 3°
 * - engines have a random static error of -0.05 <= v <= 0.05
 * - location is a random error of max. 1.5m in random direction
 * @param vehicleOptions The vehicle options to prepare physical options for
 */
export function AUTHENTICITY_LEVEL1(vehicleOptions?: VehicleOptions): PhysicalOptions {
	const engineCount = vehicleOptions?.engineCount || 2;

	const maxHeadingError = 5; //degree
	const maxEngineError = 0.01; //power
	const maxLocationError = 5; //meters

	const errorHeading = (heading: number) => (360 + heading + maxHeadingError * (Math.random() * 2 - 1)) % 360;

	const errorEngine = Array.from({ length: engineCount }, () => {
		const staticEngineError = maxEngineError * (Math.random() * 2 - 1);
		return (value: number) => value + staticEngineError;
	});

	const errorLocation = (location: Location) => {
		const { latitude, longitude } = location;

		const l0 = new LatLon(latitude, longitude);
		const l1 = l0.destinationPoint(Math.random() * maxLocationError, Math.random() * 359.999);

		return {
			latitude: l1.latitude,
			longitude: l1.longitude,
		};
	};

	const errorProximity = (distance: number) => {
		let error = (biasedRandom(0.5) - 0.5) * 0.2;

		if (Math.floor(distance + 0.001) === MAX_PROXIMITY_DISTANCE) {
			error = (biasedRandom(0.25) - 0.25) * 0.1 * MAX_PROXIMITY_DISTANCE;
		}

		// Faulty value
		if (Math.random() < 0.001) {
			error = MAX_PROXIMITY_DISTANCE * 10;
		}

		return distance + error;
	};

	return {
		errorEngine,
		errorHeading,
		errorLocation,
		errorProximity,
	};
}

/**
 * Creates physical options with the following properties:
 * - heading has a dynamic, random error of -3° <= x <= 3°
 * - engines have a random static error of -0.05 <= v <= 0.05
 * - location is a random error of max. 1.5m in random direction
 * @param vehicleOptions The vehicle options to prepare physical options for
 */
export function AUTHENTICITY_LEVEL2(vehicleOptions?: VehicleOptions): PhysicalOptions {
	const engineCount = vehicleOptions?.engineCount || 2;

	const maxHeadingError = 5; //degree
	const maxEngineError = 0.01; //power
	const maxLocationError = 5; //meters

	const errorHeading = (heading: number) => {
		const staticHeadingError = randn_bm(-maxHeadingError, maxHeadingError);
		return (360 + heading + staticHeadingError) % 360;
	};

	const errorEngine = Array.from({ length: engineCount }, () => {
		const staticEngineError = randn_bm(-maxEngineError, maxEngineError);
		return (value: number) => value + staticEngineError;
	});

	const errorLocation = (location: Location) => {
		const { latitude, longitude } = location;

		const l0 = new LatLon(latitude, longitude);
		const l1 = l0.destinationPoint(randn_bm(-maxLocationError, maxLocationError), Math.random() * 359.999);

		return {
			latitude: l1.latitude,
			longitude: l1.longitude,
		};
	};

	return {
		errorEngine,
		errorHeading,
		errorLocation,
	};
}
