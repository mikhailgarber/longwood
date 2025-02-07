export interface RGBAFrame {
    sequence: number;
    width: number;
    height: number;
    data: Buffer;      // RGBA pixel data
    timestamp: number; // Frame timestamp in milliseconds
}

export interface VideoProcessorOptions {
    fps?: number;
    frameQuality?: number;
    videoBitrate?: string;
    videoCodec?: string;
    width?: number;    // Output frame width
    height?: number;   // Output frame height
}

export interface Pixel {
    x: number;
    y: number;
}

