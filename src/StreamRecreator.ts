import { Writable } from "stream";
import { FrameHandler, RawFrame } from "./Types";
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

export class StreamRecreator implements FrameHandler {


    private ffmpegProcess: ChildProcessWithoutNullStreams;

    constructor(private stream: Writable) {

        this.ffmpegProcess = spawn('ffmpeg', [
            '-f', 'rawvideo',
            '-vcodec', 'rawvideo',
            '-pix_fmt', 'rgba',
            '-s', '1920x1080', // Adjust according to your frame size
            '-r', '30', // Frame rate
            '-i', 'pipe:0', // Input from stdin
            '-c:v', 'libx264',
            '-b:v', '2M',
            '-preset', 'medium',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-movflags', 'frag_keyframe+empty_moov',
            '-f', 'mp4',
            '-' // Output to stdout
        ]);

        this.ffmpegProcess.stdout.on('data', (data) => {
            this.stream.write(data);
        });

        this.ffmpegProcess.stderr.on('data', (data) => {
            console.warn(`ffmpeg stderr: ${data}`);
        });

        this.ffmpegProcess.on('close', (code) => {
            console.log(`ffmpeg process exited with code ${code}`);
        });
    }

    public handleFrame(frame: RawFrame): void {
        this.ffmpegProcess.stdin.write(frame.data);
    }

}




