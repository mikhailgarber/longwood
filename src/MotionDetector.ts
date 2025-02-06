import { ChangedFrameHandler, FrameHandler, Pixel, RawFrame } from "./Types";

export class MotionDetector implements FrameHandler {
    
    private frameHandler: ChangedFrameHandler | null = null;

    constructor() {
    }

    public setChangedFrameHandler(frameHandler: ChangedFrameHandler): void {
        this.frameHandler = frameHandler;
    }

    private previousFrame: Buffer | null = null;

    public handleFrame(frame: RawFrame): void {
        if (this.previousFrame) {
            const diff = this.differentPixels(this.previousFrame, frame.data);
            console.log(`frame ${frame.sequence} timestamp ${frame.timestamp} diff ${diff.length}`);
            this.frameHandler?.handleFrame({ ...frame, changes: diff });
        }
        this.previousFrame = frame.data;
    }

    private differentPixels(previousFrame: Buffer, currentFrame: Buffer): Pixel[] {
        const threshold = 50; // predefined level
        let diff = 0;
        const pixels: Pixel[] = [];
        for (let i = 0; i < previousFrame.length; i += 4) { // assuming rgba format
            const prevLuminocity = this.luminocity(previousFrame[i], previousFrame[i + 1], previousFrame[i + 2]);
            const currLuminocity = this.luminocity(currentFrame[i], currentFrame[i + 1], currentFrame[i + 2]);
            if (Math.abs(prevLuminocity - currLuminocity) > threshold) {
                diff++;
                pixels.push({
                    r: currentFrame[i],
                    g: currentFrame[i + 1],
                    b: currentFrame[i + 2],
                    a: currentFrame[i + 3],
                    x: i / 4 % 1920,
                    y: Math.floor(i / 4 / 1920)
                });
            }
        }
        return pixels;
    }

    private luminocity(r: number, g: number, b: number): number {
        return 0.2126 * r + 0.7152 * g + 0.722 * b;
    }
}