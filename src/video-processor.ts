import { spawn } from 'child_process';
import { Readable, Writable, Transform, PassThrough } from 'stream';
import { pipeline } from 'stream/promises';

interface VideoProcessorOptions {
    fps?: number;
    frameQuality?: number;
    videoBitrate?: string;
    videoCodec?: string;
    width?: number;    // Output frame width
    height?: number;   // Output frame height
}

interface RGBAFrame {
    width: number;
    height: number;
    data: Buffer;      // RGBA pixel data
    timestamp: number; // Frame timestamp in milliseconds
}

class FrameParser extends Transform {
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

            const frame: RGBAFrame = {
                width: this.width,
                height: this.height,
                data: frameData,
                timestamp: (this.frameCount++ * 1000) / this.fps // Calculate timestamp in ms
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

class VideoProcessor {
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
            '-i', 'pipe:0',
            '-f', 'rawvideo',
            '-pix_fmt', 'rgba',
            '-s', `${this.options.width}x${this.options.height}`,
            '-r', String(this.options.fps),
            '-'
        ]);

        // Handle FFmpeg process errors
        ffmpeg.stderr.on('data', (data) => {
            console.warn('FFmpeg Read Warning:', data.toString());
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
            console.warn('FFmpeg Write Warning:', data.toString());
        });

        // Create transform stream that converts frame objects back to raw buffers
        const frameSerializer = new Transform({
            objectMode: true,
            transform(frame: RGBAFrame, encoding, callback) {
                callback(null, frame.data);
            }
        });

        // Pipe FFmpeg output to output stream
        ffmpeg.stdout.pipe(outputStream);

        // Connect serializer to FFmpeg input
        frameSerializer.pipe(ffmpeg.stdin);

        return frameSerializer;
    }

    async process(
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

// Example usage showing frame processing
async function main() {
    const processor = new VideoProcessor({
        fps: 30,
        width: 1280,
        height: 720
    });

    try {
        // Example frame processor that inverts colors
        const invertColors = new Transform({
            objectMode: true,
            transform(frame: RGBAFrame, encoding, callback) {
                const newData = Buffer.from(frame.data);
                for (let i = 0; i < newData.length; i += 4) {
                    // Invert RGB values, leave alpha unchanged
                    newData[i] = 255 - newData[i];       // R
                    newData[i + 1] = 255 - newData[i + 1]; // G
                    newData[i + 2] = 255 - newData[i + 2]; // B
                }
                frame.data = newData;
                callback(null, frame);
            }
        });

        const inputStream = process.stdin;
        const outputStream = process.stdout;

        await processor.process(inputStream, outputStream, invertColors);
    } catch (error) {
        console.error('Failed to process video:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export default VideoProcessor;