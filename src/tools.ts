import { Location } from './types';

/**
 * Simple geometric distance between two points.
 * @param p1
 * @param p2
 */
export function distance(p1: [number, number], p2: [number, number]) {
	const [x1, y1] = p1;
	const [x2, y2] = p2;

	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

// long = x

const R = 6371e3; // metres

/**
 * Calculates the great circle distance in meters based on the haversine formula.
 * Further reading: https://www.movable-type.co.uk/scripts/latlong.html
 * @param location1 - Geo location 1
 * @param location2 - Geo location 2
 */
export function greatCircleDistance(location1: Location, location2: Location) {
	const { latitude: lat1, longitude: lon1 } = location1;

	const { latitude: lat2, longitude: lon2 } = location2;

	const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((lon2 - lon1) * Math.PI) / 180;

	const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c; // in metres
}
