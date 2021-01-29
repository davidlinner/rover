"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.greatCircleDistance = exports.distance = void 0;
function distance(p1, p2) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}
exports.distance = distance;
const R = 6371e3;
function greatCircleDistance(location1, location2) {
    const { latitude: lat1, longitude: lon1 } = location1;
    const { latitude: lat2, longitude: lon2 } = location2;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
exports.greatCircleDistance = greatCircleDistance;
