export type RawFrame = {
    sequence: number;
    data: Buffer;
    timestamp: number;
}

export type FrameWithChanges = RawFrame & {
    changes: Pixel[];
}

export type Pixel = {
    r: number;
    g: number;
    b: number;
    a: number;
    x: number;
    y: number;
}

export interface FrameHandler {
    handleFrame: (frame: RawFrame) => void;
};

export interface ChangedFrameHandler {
    handleFrame: (frame: FrameWithChanges) => void;
};