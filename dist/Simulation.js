"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Simulation = exports.MAX_PROXIMITY_DISTANCE = exports.LANDMINE_RADIUS = void 0;
const p2_1 = __importDefault(require("p2"));
const latlon_spherical_js_1 = __importDefault(require("geodesy/latlon-spherical.js"));
const render_1 = __importDefault(require("./render"));
const tools_1 = require("./tools");
const Authenticity_1 = require("./Authenticity");
const ROVER_WIDTH = .5;
const ROVER_HEIGHT = 1.0;
const ROVER_MASS = 10;
exports.LANDMINE_RADIUS = 0.15;
const MIN_TRACKING_POINT_DISTANCE = 1;
exports.MAX_PROXIMITY_DISTANCE = 8;
const MAX_SUB_STEPS = 5;
const FIXED_DELTA_TIME = 1 / 60;
const CONTROL_INTERVAL = 20;
const BASE_ENGINE_FORCE = 7.0;
const WHEEL_BREAK_FORCE = BASE_ENGINE_FORCE * 0.5;
const WHEEL_SIDE_FRICTION = BASE_ENGINE_FORCE * 2;
const INITIAL_WHEEL_CONSTRAINTS = [
    {
        localPosition: [0, 0.5],
        brakeForce: WHEEL_BREAK_FORCE,
        sideFriction: WHEEL_SIDE_FRICTION
    },
    {
        localPosition: [0, -0.5],
        brakeForce: WHEEL_BREAK_FORCE,
        sideFriction: WHEEL_SIDE_FRICTION
    }
];
class Simulation {
    constructor(simulationOptions) {
        this.engines = [
            0,
            0,
        ];
        this.steering = [
            180,
            180,
        ];
        this.trace = [];
        this.markers = [];
        this.obstacles = [];
        this.proximityValues = [];
        this.landmines = [];
        this.lastRenderTime = 0;
        this.startTime = 0;
        this.interval = null;
        this.animationFrame = null;
        this.animate = (time) => {
            this.animationFrame = requestAnimationFrame(this.animate);
            let deltaTime = this.lastRenderTime ? (time - this.lastRenderTime) / 1000 : 0;
            this.lastRenderTime = time;
            deltaTime = Math.min(1 / 10, deltaTime);
            this.world.step(FIXED_DELTA_TIME, deltaTime, MAX_SUB_STEPS);
            this.trackPosition();
            render_1.default(this.context, {
                position: this.rover.interpolatedPosition,
                angle: this.rover.angle,
                width: ROVER_WIDTH,
                height: ROVER_HEIGHT,
                wheelConstraints: this.wheelConstraints,
            }, this.trace, this.markers, this.obstacles, this.landmines, this.proximityValues, this.renderingOptions);
        };
        const { loop, element, renderingOptions = {}, physicalConstraints = Authenticity_1.AUTHENTICITY_LEVEL0, locationsOfInterest = [], obstacles = [], landmines = [], origin, } = simulationOptions;
        const { height = 500, width = 500 } = renderingOptions;
        this.loop = loop;
        const canvas = Simulation.createCanvas(element, width, height);
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Cannot create 2D rendering context for canvas.');
        }
        this.initMarkers(locationsOfInterest, origin);
        const world = new p2_1.default.World({
            gravity: [0, 0]
        });
        const rover = new p2_1.default.Body({ mass: ROVER_MASS });
        rover.addShape(new p2_1.default.Box({ width: ROVER_WIDTH, height: ROVER_HEIGHT }));
        world.addBody(rover);
        const vehicle = new p2_1.default.TopDownVehicle(rover);
        const wheelConstraints = INITIAL_WHEEL_CONSTRAINTS.map(({ sideFriction, brakeForce, localPosition }) => {
            const wheelConstraint = vehicle.addWheel({ localPosition });
            wheelConstraint.setSideFriction(sideFriction);
            wheelConstraint.setBrakeForce(brakeForce);
            return wheelConstraint;
        });
        vehicle.addToWorld(world);
        this.world = world;
        this.rover = rover;
        this.wheelConstraints = wheelConstraints;
        this.context = context;
        this.renderingOptions = Object.assign(Object.assign({}, renderingOptions), { width,
            height });
        this.physicalOptions = physicalConstraints({ engineCount: 2 });
        this.offset = new latlon_spherical_js_1.default(origin.latitude, origin.longitude);
        this.initObstacles(origin, obstacles);
        this.initLandmines(origin, landmines);
        this.updateProximityValues();
    }
    static createCanvas(parent, width, height) {
        const document = parent.ownerDocument;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        parent.appendChild(canvas);
        return canvas;
    }
    static toRelativeOffset(origin, position) {
        const pos = new latlon_spherical_js_1.default(position.latitude, position.longitude);
        const unsignedX = pos.distanceTo(new latlon_spherical_js_1.default(pos.latitude, origin.longitude));
        const unsignedY = pos.distanceTo(new latlon_spherical_js_1.default(origin.latitude, pos.longitude));
        const signedX = unsignedX * ((origin.longitude - pos.longitude) > 0 ? -1 : 1);
        const signedY = unsignedY * ((origin.latitude - pos.latitude) > 0 ? -1 : 1);
        return [signedX, signedY];
    }
    initMarkers(locationsOfInterest, origin) {
        if (origin) {
            this.markers = locationsOfInterest.map((marker) => {
                const [x, y] = Simulation.toRelativeOffset(origin, marker);
                console.log('MARK ', x.toFixed(6), y.toFixed(6));
                return {
                    position: [x, y],
                    label: marker.label
                };
            });
        }
    }
    initLandmines(origin, landmines) {
        if (origin) {
            this.landmines = landmines.map((mine) => {
                const [x, y] = Simulation.toRelativeOffset(origin, mine);
                const mineShape = new p2_1.default.Circle({ radius: exports.LANDMINE_RADIUS, sensor: true, collisionResponse: false });
                const mineBody = new p2_1.default.Body({
                    mass: 0,
                    position: [-x, y],
                    fixedX: true,
                    fixedY: true,
                    fixedRotation: true,
                    collisionResponse: false,
                });
                mineBody.addShape(mineShape);
                this.world.addBody(mineBody);
                return { position: [x, y] };
            });
        }
    }
    initObstacles(origin, obstacles) {
        if (origin) {
            this.obstacles = obstacles.map((obstacle) => {
                const [x, y] = Simulation.toRelativeOffset(origin, obstacle);
                const obstacleShape = new p2_1.default.Circle({ radius: obstacle.radius });
                const obstacleBody = new p2_1.default.Body({
                    mass: 0,
                    position: [-x, y],
                    angle: 0,
                    angularVelocity: 0,
                    fixedX: true,
                    fixedY: true,
                    fixedRotation: true,
                    collisionResponse: true,
                });
                obstacleBody.addShape(obstacleShape);
                this.world.addBody(obstacleBody);
                return {
                    position: [x, y],
                    radius: obstacle.radius,
                };
            });
        }
    }
    updateProximityValues() {
        const { errorProximity = d => d } = this.physicalOptions;
        const position = this.rover.interpolatedPosition;
        const [baseX, baseY] = position;
        const resolution = 180;
        for (let index = 0; index < resolution; index++) {
            const directionAngleInRadiant = (((Math.PI * 2) / resolution) * index) + this.rover.interpolatedAngle;
            const xx = baseX + (exports.MAX_PROXIMITY_DISTANCE * Math.cos(directionAngleInRadiant + Math.PI / 2));
            const yy = baseY + (exports.MAX_PROXIMITY_DISTANCE * Math.sin(directionAngleInRadiant + Math.PI / 2));
            const to = [xx, yy];
            const ray = new p2_1.default.Ray({ from: position, to, mode: p2_1.default.Ray.CLOSEST, skipBackfaces: true });
            const rayResult = new p2_1.default.RaycastResult();
            rayResult.reset();
            this.world.raycast(rayResult, ray);
            let rayDistance = Math.abs(rayResult.getHitDistance(ray));
            this.proximityValues[index] = errorProximity(rayDistance);
        }
    }
    getRoverHeading() {
        let heading = this.rover.angle % (2 * Math.PI);
        if (heading < 0) {
            heading += 2 * Math.PI;
        }
        const trueHeading = (180 / Math.PI) * heading;
        const { errorHeading = d => d } = this.physicalOptions;
        return errorHeading(trueHeading);
    }
    getRoverLocation() {
        const [x, y] = this.rover.interpolatedPosition;
        const trueLocation = {
            longitude: this.offset.destinationPoint(Math.abs(x), x <= 0 ? 90 : 270).longitude,
            latitude: this.offset.destinationPoint(Math.abs(y), y <= 0 ? 180 : 0).latitude
        };
        const { errorLocation = location => location } = this.physicalOptions;
        return errorLocation(trueLocation);
    }
    start() {
        if (this.interval) {
            throw new Error('Simulation is already running.');
        }
        this.startTime = performance.now();
        this.interval = window.setInterval(() => {
            const clock = performance.now() - this.startTime;
            this.updateProximityValues();
            const actuatorValues = this.loop({
                heading: this.getRoverHeading(),
                location: this.getRoverLocation(),
                proximity: this.proximityValues,
                clock
            }, {
                engines: this.engines,
                steering: this.steering
            });
            const { engines, steering } = actuatorValues;
            const { errorEngine = [] } = this.physicalOptions;
            if (engines.length === 2) {
                for (let i = 0; i < engines.length; i++) {
                    if (engines[i] <= 1.0 && engines[i] >= -1.0) {
                        this.engines[i] = engines[i];
                        const errorFunction = errorEngine[i] || (v => v);
                        this.wheelConstraints[i].engineForce = BASE_ENGINE_FORCE * errorFunction(engines[i]);
                    }
                    else {
                        console.error('Wheel power out of range [-1.0 : 1.0]');
                    }
                }
            }
            if (steering.length === 2) {
                steering.forEach((steeringValue, index) => {
                    if (steeringValue >= 0 || steeringValue <= 360) {
                        const mappedSteeringValue = (steeringValue - 180) * Math.PI / 180;
                        this.steering[index] = steeringValue;
                        this.wheelConstraints[index].steerValue = mappedSteeringValue;
                    }
                    else {
                        console.error('Steering value out of range [0 : 360]');
                    }
                });
            }
        }, CONTROL_INTERVAL);
        this.animationFrame = requestAnimationFrame(this.animate);
    }
    stop() {
        if (this.interval != null) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.animationFrame != null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    trackPosition() {
        const position = this.rover.interpolatedPosition;
        const [lastPosition] = this.trace;
        if (!lastPosition || tools_1.distance(lastPosition, position) > MIN_TRACKING_POINT_DISTANCE) {
            this.trace.unshift([...position]);
        }
    }
}
exports.Simulation = Simulation;
