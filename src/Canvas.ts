import { createCanvas, ImageData, loadImage } from 'canvas';
import { DetectedObject } from './ObjectDetector';

interface TextOptions {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
}

/**
 * Writes text on an RGBA image buffer
 * @param imageBuffer - The source image buffer
 * @param width - Width of the image
 * @param height - Height of the image
 * @param options - Text rendering options
 * @returns Promise<Buffer> - New image buffer with text
 */
export async function writeTextOnImage(
    imageBuffer: Buffer,
    width: number,
    height: number,
    detections: DetectedObject[],
    options: TextOptions
): Promise<Buffer> {
    // Create canvas with image dimensions
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Convert buffer to ImageData
    const imageData = new ImageData(
        new Uint8ClampedArray(imageBuffer),
        width,
        height
    );

    // Draw existing image data
    ctx.putImageData(imageData, 0, 0);

    // Configure text rendering
    ctx.font = `${options.fontSize || 24}px ${options.fontFamily || 'Arial'}`;
    ctx.fillStyle = options.color || '#000000';
    ctx.textAlign = options.align || 'left';
    ctx.textBaseline = options.baseline || 'top';

    // Write text
    for (const detection of detections) {
        const { x, y, width, height } = detection;
        ctx.fillText(`  ${detection.token}`, x, y);
    }
    // Return new buffer

    const rawBuffer =  canvas.toBuffer('raw');
    const rgbaBuffer = Buffer.alloc(rawBuffer.length);

    for (let i = 0; i < rawBuffer.length; i += 4) {
        rgbaBuffer[i] = rawBuffer[i + 2];     // R
        rgbaBuffer[i + 1] = rawBuffer[i + 1]; // G
        rgbaBuffer[i + 2] = rawBuffer[i];     // B
        rgbaBuffer[i + 3] = rawBuffer[i + 3]; // A
    }

    return rgbaBuffer;
}