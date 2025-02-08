import { createReadStream, createWriteStream } from "node:fs";
import { argv } from 'process';
import { VideoProcessor } from "./VideoProcessor";
import { MotionDetector } from "./MotionDetector";
import { execSync } from 'child_process';
import { getVideoFrameSize } from "./Utils";
import { ObjectDetector } from "./ObjectDetector";

console.log('Hello, world!');
if (!argv[2]) {
    console.error('No input file specified');
    process.exit(1);
}

if (!argv[3]) {
    console.error('No output file specified');
    process.exit(1);
}



const { width, height } = getVideoFrameSize(argv[2]);
console.log(`Input video frame size: ${width}x${height}`);

const inputFileStream = createReadStream(argv[2]);
const outputFileStream = createWriteStream(argv[3]);



const processor = new VideoProcessor({
    fps: 24,
    width,
    height
});

const objectDetector = new ObjectDetector();
processor.process(inputFileStream, outputFileStream, objectDetector).then(() => {
    objectDetector.stop();
    console.log('done');
}).catch((err: Error) => {
    console.error(err);
});

