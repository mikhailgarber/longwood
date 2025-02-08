import { Transform, TransformCallback } from "stream";
import { RGBAFrame } from "./Types";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { rgbaToJpeg } from "./ImageConverter";
import { writeTextOnImage } from "./Canvas";


const objectDetectorPath = '../object_detector/object_detector';
const modelNamesPath = "../object_detector/model.names";
const modelConfigPath = "../object_detector/model.cfg";
const modelWeightsPath = "../object_detector/yolov3.weights";

export interface DetectedObject {
    token: string;
    percent: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export class ObjectDetector extends Transform {

    private objectDetectorProcess: ChildProcessWithoutNullStreams;
    private chunks: Buffer[] = [];
    private odResolve: (value: any) => void = () => { };

    constructor() {
        super({
            objectMode: true,
        });

        console.log('Starting Object Detector...');
        const basePath = __dirname;
        this.objectDetectorProcess = spawn(`${basePath}/${objectDetectorPath}`, [
            `${basePath}/${modelNamesPath}`,
            `${basePath}/${modelConfigPath}`,
            `${basePath}/${modelWeightsPath}`,
            "0.6"
        ]);

        this.objectDetectorProcess.stdout.on('data', (chunk) => {
            const outputString = chunk.toString();
            this.chunks.push(chunk);
            if (outputString.indexOf(']') > -1) {
                const obj = JSON.parse(Buffer.concat(this.chunks).toString());
                this.chunks = [];
                if (this.odResolve !== (() => { })) {
                    this.odResolve(obj);
                    this.odResolve = () => { };
                }
            }
        });

        this.objectDetectorProcess.stderr.on('data', (data) => {
            console.error(`Object Detector stderr: ${data}`);
        });

        this.objectDetectorProcess.on('close', (code) => {
            console.log(`Object Detector process exited with code ${code}`);
        });

        console.log('Object Detector started');
    }

    public _transform(frame: any, encoding: string, callback: TransformCallback): void {
        this.handleFrame(frame).then((newFrame) => {
            callback(null, newFrame);
        }).catch((error) => {
            console.error('Error during frame processing:', error);
            callback(error);
        });
    }


    private async handleFrame(frame: RGBAFrame): Promise<RGBAFrame> {
        console.log(`OD: Processing frame ${frame.sequence}...`);
        const jpegBuffer = await rgbaToJpeg(frame.data, {height: frame.height, width: frame.width, quality: 80});
        const odPromise = new Promise((resolve, reject) => {
            this.odResolve = resolve;
            this.objectDetectorProcess.stdin.write(jpegBuffer);
        });
        const detections = (await odPromise) as DetectedObject[];
        console.log(`OD: Frame ${frame.sequence} processed with ${detections.length} detections`);
        const newData = Buffer.from(frame.data);
        for (const detection of detections) {
            const { x, y, width, height } = detection;
            for (let i = x; i < x + width; i++) {
                newData[(y * frame.width + i) * 4] = 255; // R
                newData[(y * frame.width + i) * 4 + 1] = 255; // G
                newData[(y * frame.width + i) * 4 + 2] = 0; // B
                newData[((y + height) * frame.width + i) * 4] = 255; // R
                newData[((y + height) * frame.width + i) * 4 + 1] = 255; // G
                newData[((y + height) * frame.width + i) * 4 + 2] = 0; // B
            }
            for (let j = y; j < y + height; j++) {
                newData[(j * frame.width + x) * 4] = 255; // R
                newData[(j * frame.width + x) * 4 + 1] = 255; // G
                newData[(j * frame.width + x) * 4 + 2] = 0; // B
                newData[(j * frame.width + x + width) * 4] = 255; // R
                newData[(j * frame.width + x + width) * 4 + 1] = 255; // G
                newData[(j * frame.width + x + width) * 4 + 2] = 0; // B
            }
            /*
            await writeTextOnImage(newData, frame.width, frame.height, {
                text: detection.token,
                x: x,
                y: y,
                fontSize: 8,
                color: '#FF0000',
                align: 'left',
                baseline: 'top'
            });
            */
        }
        frame.data = newData;
        return frame;
    }

    public stop(): void {
        console.log('Stopping Object Detector...');
        this.objectDetectorProcess.kill();
    }
}