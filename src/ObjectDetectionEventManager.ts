import { DetectedObject, ObjectDetector } from "./ObjectDetector";

const CONFIDENT_THRESHOLD = 0.8;
const SIZE_THRESHOLD = 0.1;
const POSITION_THRESHOLD = 0.1;

const scene: DetectedObject[] = [];

export function objectsDetected(objects: DetectedObject[]): void {
    console.log(`Objects detected: ${objects.length}`);
    const previousScene = [...scene];
    for (const object of objects) {
        if (object.percent > CONFIDENT_THRESHOLD) {
            const existingObjects = scene.filter(o => o.token === object.token);
            let found = false;
            if (existingObjects.length > 0) {
                for (const existingObject of existingObjects) {
                    const sizeDiff = Math.abs(existingObject.width - object.width) / existingObject.width;
                    if (sizeDiff < SIZE_THRESHOLD) {
                        previousScene.splice(previousScene.indexOf(existingObject), 1);
                        scene[scene.indexOf(existingObject)] = object;
                        found = true;
                    }
                }
            }

            if (!found) {
                console.log(`New object detected: ${object.token}`);
                scene.push(object);
            }
        }
    }
    for (const object of previousScene) {
        const index = scene.indexOf(object);
        if (index > -1) {
            console.log(`Object disappeared: ${object.token}`);
            scene.splice(index, 1);
        }
    }
}