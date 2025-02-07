import { Readable, Transform, Writable } from "stream";
import { VideoProcessorOptions, RGBAFrame } from "./Types";
import { spawn } from "child_process";
import { FrameParser } from "./FrameParser";
import { pipeline } from "stream/promises";

export class VideoProcessor {
    private options: VideoProcessorOptions;

    constructor(options: VideoProcessorOptions = {}) {
        this.options = {
            fps: 30,
            frameQuality: 2,
            videoBitrate: '2M',
            videoCodec: 'libx264',
            width: 1280,
            height: 720,
            ...options
        };
    }

    private createFFmpegReadStream(inputStream: Readable): Transform {
        // Create FFmpeg process for reading video and extracting RGBA frames
        const ffmpeg = spawn('ffmpeg', [
            '-i', 'pipe:0', // read from stdin
            '-f', 'rawvideo', // output format is raw video
            '-pix_fmt', 'rgba', // output pixel format is RGBA
            '-analyzeduration',  '2147483647',
            '-probesize', '2147483647',
            '-s', `${this.options.width}x${this.options.height}`, // frame size
            '-r', String(this.options.fps), // frame rate
            '-' // write to stdout
        ]);

        // Handle FFmpeg process errors
        ffmpeg.stderr.on('data', (data) => {
            console.warn('FFmpeg Read stderr:', data.toString());
        });

        // Create frame parser transform stream
        const frameParser = new FrameParser(
            this.options.width as number,
            this.options.height as number,
            this.options.fps as number
        );

        // Pipe input to FFmpeg
        inputStream.pipe(ffmpeg.stdin);
        ffmpeg.stdout.pipe(frameParser);

        return frameParser;
    }

    private createFFmpegWriteStream(outputStream: Writable): Transform {
        // Create FFmpeg process for reassembling frames into video
        const ffmpeg = spawn('ffmpeg', [
            '-f', 'rawvideo',           // Input format is raw video
            '-vcodec', 'rawvideo',      // Input codec is raw video
            '-s', `${this.options.width}x${this.options.height}`,
            '-pix_fmt', 'rgba',         // Input pixel format (from our frame processor)
            '-framerate', String(this.options.fps),
            '-i', 'pipe:0',             // Read from stdin
            '-c:v', this.options.videoCodec as string,  // Output codec (e.g., libx264)
            '-b:v', this.options.videoBitrate as string,
            '-pix_fmt', 'yuv420p',      // Output pixel format (standard for web/mobile playback)
            '-movflags', 'frag_keyframe+empty_moov',   // Enable streaming
            '-f', 'mp4',                // Output format
            '-'                    // Write to stdout
        ]);

        // Handle FFmpeg process errors
        ffmpeg.stderr.on('data', (data) => {
            console.warn('FFmpeg Write stderr:', data.toString());
        });

        // Create transform stream that converts frame objects back to raw buffers
        const frameSerializer = new Transform({
            objectMode: true,
            transform(frame: RGBAFrame, encoding, callback) {
                callback(null, frame.data);
            }
        });

        // Connect serializer to FFmpeg input
        frameSerializer.pipe(ffmpeg.stdin);
        // Pipe FFmpeg output to output stream
        ffmpeg.stdout.pipe(outputStream);

        return frameSerializer;
    }

    public async process(
        inputStream: Readable,
        outputStream: Writable,
        frameProcessor?: Transform
    ): Promise<void> {
        try {
            console.log('Starting video processing...');

            // Create processing pipeline
            const readStream = this.createFFmpegReadStream(inputStream);
            const writeStream = this.createFFmpegWriteStream(outputStream);

            // If no frame processor is provided, create a pass-through
            const processor = frameProcessor || new Transform({
                objectMode: true,
                transform(frame: RGBAFrame, encoding, callback) {
                    callback(null, frame);
                }
            });

            // Connect the streams
            await pipeline(
                readStream,
                processor,
                writeStream
            );

            console.log('Video processing completed successfully!');
        } catch (error) {
            console.error('Error during video processing:', error);
            throw error;
        }
    }
}