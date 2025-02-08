import sharp from 'sharp';

interface RgbaToJpegOptions {
    quality?: number;  // JPEG quality (0-100)
    width: number;     // Image width in pixels
    height: number;    // Image height in pixels
}

/**
 * Converts an RGBA buffer to JPEG format
 * @param rgbaBuffer - Buffer containing RGBA pixel data
 * @param options - Conversion options including dimensions and quality
 * @returns Promise resolving to JPEG buffer
 */
export async function rgbaToJpeg(
    rgbaBuffer: Buffer,
    options: RgbaToJpegOptions
): Promise<Buffer> {
    const { width, height, quality = 80 } = options;

    try {
        const image = sharp(rgbaBuffer, {
            raw: {
                width,
                height,
                channels: 4 // RGBA
            }
        });

        const jpegBuffer = await image
            .jpeg({
                quality
            })
            .toBuffer();

        return jpegBuffer;
    } catch (error) {
        throw new Error(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}



