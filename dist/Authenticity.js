"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTHENTICITY_LEVEL2 = exports.AUTHENTICITY_LEVEL1 = exports.AUTHENTICITY_LEVEL0 = void 0;
const latlon_spherical_js_1 = __importDefault(require("geodesy/latlon-spherical.js"));
function AUTHENTICITY_LEVEL0(vehicleOptions) {
    const engineCount = (vehicleOptions === null || vehicleOptions === void 0 ? void 0 : vehicleOptions.engineCount) || 2;
    const errorHeading = (heading) => heading;
    const errorEngine = new Array(engineCount).map(() => (value) => value);
    const errorLocation = (location) => location;
    return {
        errorEngine,
        errorHeading,
        errorLocation,
    };
}
exports.AUTHENTICITY_LEVEL0 = AUTHENTICITY_LEVEL0;
function AUTHENTICITY_LEVEL1(vehicleOptions) {
    const engineCount = (vehicleOptions === null || vehicleOptions === void 0 ? void 0 : vehicleOptions.engineCount) || 2;
    const maxHeadingError = 5;
    const maxEngineError = 0.01;
    const maxLocationError = 5;
    const errorHeading = (heading) => (360 + heading + maxHeadingError * (Math.random() * 2 - 1)) % 360;
    const errorEngine = Array.from({ length: engineCount }, () => {
        const staticEngineError = maxEngineError * (Math.random() * 2 - 1);
        return (value) => value + staticEngineError;
    });
    const errorLocation = (location) => {
        const { latitude, longitude } = location;
        const l0 = new latlon_spherical_js_1.default(latitude, longitude);
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
exports.AUTHENTICITY_LEVEL1 = AUTHENTICITY_LEVEL1;
function AUTHENTICITY_LEVEL2(vehicleOptions) {
    const engineCount = (vehicleOptions === null || vehicleOptions === void 0 ? void 0 : vehicleOptions.engineCount) || 2;
    const maxHeadingError = 5;
    const maxEngineError = 0.01;
    const maxLocationError = 5;
    const errorHeading = (heading) => (360 + heading + maxHeadingError * (Math.random() * 2 - 1)) % 360;
    const errorEngine = Array.from({ length: engineCount }, () => {
        const staticEngineError = maxEngineError * (Math.random() * 2 - 1);
        return (value) => value + staticEngineError;
    });
    const errorLocation = (location) => {
        const { latitude, longitude } = location;
        const l0 = new latlon_spherical_js_1.default(latitude, longitude);
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
exports.AUTHENTICITY_LEVEL2 = AUTHENTICITY_LEVEL2;
