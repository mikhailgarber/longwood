import { createReadStream, createWriteStream } from "node:fs";
import { argv } from 'process';
import * as FrameEmitter from "./FrameEmitter";
import { FrameWithChanges, RawFrame } from "./Types";
import { MotionDetector } from "./MotionDetector";
import { StreamRecreator } from "./StreamRecreator";

console.log('Hello, world!');
if (!argv[2]) {
    console.error('No input file specified');
    process.exit(1);
}

if (!argv[3]) {
    console.error('No output file specified');
    process.exit(1);
}

const inputFileStream = createReadStream(argv[2]);
const outputFileStream = createWriteStream(argv[3]);

const streamRecreator = new StreamRecreator(outputFileStream);

const motionDetector = new MotionDetector();
motionDetector.setChangedFrameHandler(streamRecreator);

FrameEmitter.processStream(inputFileStream, motionDetector).then(() => {
    console.log('done');
}).catch((err) => {
    console.error(err);
});