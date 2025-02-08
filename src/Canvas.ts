import { createCanvas, ImageData, loadImage } from 'canvas';

interface TextOptions {
    text: string;
    x: number;
    y: number;
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
    ctx.fillText(options.text, options.x, options.y);

    // Return new buffer
    return canvas.toBuffer();
}