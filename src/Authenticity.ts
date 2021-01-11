import { Location, PhysicalOptions, VehicleOptions } from './types';
import LatLon from 'geodesy/latlon-spherical.js';
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

	return {
		errorEngine,
		errorHeading,
		errorLocation,
	};
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

	return {
		errorEngine,
		errorHeading,
		errorLocation,
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
