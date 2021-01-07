
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


export interface RenderingOptions {
    width?: number
    height?: number
    showGrid?: boolean
    showTrace?: boolean
    colorGrid?: string
    colorTrace?: string
    colorRover?: string
    colorMarker?: string
}
