import { Transform, TransformCallback } from "stream";
import { Pixel, RGBAFrame } from "./Types";

export class MotionDetector extends Transform {

    constructor() {
        super({
            objectMode: true,
        });
    }

    public _transform(frame: any, encoding: string, callback: TransformCallback): void {
        const newFrame = this.handleFrame(frame);
        callback(null, newFrame);
    }

    private previousFrame: Buffer | null = null;

    private handleFrame(frame: RGBAFrame): RGBAFrame {
        if (this.previousFrame) {
            const diff = this.differentPixels(this.previousFrame, frame.data, frame.width);
            const newData = Buffer.from(frame.data);
            for (let i = 0; i < diff.length; i += 4) {
                const pixel = diff[i];
                const index = (pixel.y * frame.width + pixel.x) * 4;
                newData[index] = 255;       // R
                newData[index + 1] = 255;   // G
                newData[index + 2] = 0;     // B
                newData[index + 3] = 255;   // A
            }
            this.previousFrame = frame.data;
            frame.data = newData;
            console.log(`frame ${frame.sequence} timestamp ${frame.timestamp} diff ${diff.length} handled`);
        } else {
            this.previousFrame = frame.data;
        }

        return frame;
    }

    private differentPixels(previousFrame: Buffer, currentFrame: Buffer, width: number): Pixel[] {
        const threshold = 70; // predefined level
        const totalPixels = previousFrame.length / 4;
        const step = Math.floor(totalPixels / (totalPixels * 0.25)); // 25% of total pixels

        const pixels: Pixel[] = [];
        for (let i = 0; i < previousFrame.length; i += 4 * step) { // assuming rgba format
            const prevLuminocity = this.luminocity(previousFrame[i], previousFrame[i + 1], previousFrame[i + 2]);
            const currLuminocity = this.luminocity(currentFrame[i], currentFrame[i + 1], currentFrame[i + 2]);
            if (Math.abs(prevLuminocity - currLuminocity) > threshold) {
                pixels.push({
                    x: (i / 4) % width,
                    y: Math.floor(i / 4 / width)
                });
            }
        }
        return pixels;
    }

    private luminocity(r: number, g: number, b: number): number {
        return 0.2126 * r + 0.7152 * g + 0.722 * b;
    }
}