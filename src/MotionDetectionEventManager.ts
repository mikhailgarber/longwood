const DETECTION_THRESHOLD = 100;
const ALARM_THRESHOLD = 1000;
const QUIET_THRESHOLD = 100;

let referenceCount = 0;
let state : "quiet" | "alarm" = "quiet";

export function motionDetected(pixelCount: number): void {
    if (pixelCount > DETECTION_THRESHOLD) {
        console.log(`Motion detected: ${pixelCount} pixels`);
        if (state === "quiet") {
            referenceCount = referenceCount + pixelCount;
            if (referenceCount > ALARM_THRESHOLD) {
                console.log("Entered Alarm State");
                state = "alarm";
                // notifyTheAuthorities();
                referenceCount = 0;
            }
        }
    } else {
        console.log(`No motion detected: ${pixelCount} pixels`);
        if (state === "alarm") {
            referenceCount = referenceCount + 1;
            if (referenceCount > QUIET_THRESHOLD) {
                console.log("Entered Quiet State");
                state = "quiet";
                referenceCount = 0;
            }
        }
 
    }    
}