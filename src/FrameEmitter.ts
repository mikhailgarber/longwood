import { Readable, Writable } from "node:stream";
import { FrameHandler } from "./Types";
import { spawn } from "node:child_process";

export async function processStream(stream: Readable, frameHandler: FrameHandler): Promise<void> {

    const ffmpeg = spawn('ffmpeg',
        ['-loglevel', 'info',
            '-i', 'pipe:0',
            '-pix_fmt', 'rgba',
           // '-r', '30',
            '-f', 'rawvideo', '-',
        ], { stdio: ['pipe', 'pipe', process.stderr] });

    ffmpeg.on('error', (error) => {
        console.warn(`ffpmeg error ${error}`);
    });

    ffmpeg.on('exit', (code, signal) => {
        console.info(`ffmpeg exit, code ${code} signal ${signal}`);
    });

    const segmenter = new RGBASegmenter(1920, 1080, frameHandler);
    ffmpeg.stdio[1].pipe(segmenter);
    stream.pipe(ffmpeg.stdin);

}

class RGBASegmenter extends Writable {

    private bytesRemaining: number;
    private fragments: Buffer[];
    private sequence: number;

    constructor(private width: number, private height: number, private frameHandler: FrameHandler) {
        super();
        this.bytesRemaining = height * width * 4;
        this.fragments = [];
        this.sequence = 0;
    }

    public _write(chunk: Buffer, encoding: string, next: (error?: Error | null) => void): void {
        try {
            this.bytesRemaining = this.bytesRemaining - chunk.length;
            if (this.bytesRemaining <= 0) {
                const previousFrameFragment = chunk.slice(0, this.bytesRemaining + chunk.length);
                const nextFrameFragment = chunk.slice(this.bytesRemaining + chunk.length);
                this.fragments.push(previousFrameFragment);
                this.writeFrameOut();
                this.bytesRemaining = this.height * this.width * 4 - nextFrameFragment.length;
                this.fragments = [];
                this.fragments.push(nextFrameFragment);
            } else {
                // take entire buffer
                this.fragments.push(chunk);
            }
            next();

        } catch (err) {
            console.warn(`streaming error:${err}`);
            next();
        }
    }

    private async writeFrameOut() {
        const now = new Date().getTime();
        const buffer = Buffer.concat(this.fragments);
        this.frameHandler.handleFrame({ data: buffer, timestamp: now, sequence: this.sequence++ });
        this.fragments = [];
    }
}