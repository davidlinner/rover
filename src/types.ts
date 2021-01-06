
export interface Location {
    latitude: number,
    longitude: number
}

export interface LocationOfInterest extends Location{
    label: string
}

export interface SensorValues {
    location: Location,
    heading: number,
    clock: number
}

export interface ActuatorValues {
    wheels: Array<number>
}

export type ControlLoop = (sensors: SensorValues, actuators: ActuatorValues) => ActuatorValues


