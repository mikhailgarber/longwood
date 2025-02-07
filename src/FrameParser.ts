import { Transform } from "stream";
import { RGBAFrame } from "./Types";

export class FrameParser extends Transform {
    private buffer: Buffer;
    private frameSize: number;
    private width: number;
    private height: number;
    private frameCount: number;
    private fps: number;

    constructor(width: number, height: number, fps: number) {
        super({
            readableObjectMode: true, // Output parsed frame objects
        });
        this.width = width;
        this.height = height;
        this.fps = fps;
        this.frameSize = width * height * 4; // 4 bytes per pixel (RGBA)
        this.buffer = Buffer.alloc(0);
        this.frameCount = 0;
    }

    _transform(chunk: Buffer, encoding: string, callback: Function) {
        // Append new data to existing buffer
        this.buffer = Buffer.concat([this.buffer, chunk]);

        // Process complete frames
        while (this.buffer.length >= this.frameSize) {
            const frameData = this.buffer.slice(0, this.frameSize);
            this.buffer = this.buffer.slice(this.frameSize);
            const sequence = this.frameCount++;
            const frame: RGBAFrame = {
                width: this.width,
                height: this.height,
                data: frameData,
                sequence,
                timestamp: (sequence * 1000) / this.fps // Calculate timestamp in ms
            };

            this.push(frame);
        }

        callback();
    }

    _flush(callback: Function) {
        // Handle any remaining data
        if (this.buffer.length > 0) {
            console.warn(`Discarding ${this.buffer.length} bytes of incomplete frame data`);
        }
        callback();
    }
}
