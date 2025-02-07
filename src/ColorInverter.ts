import { Transform } from "stream";

export class ColorInverter extends Transform {
    constructor() {
        super({
            objectMode: true,
            transform(frame, encoding, callback) {
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
    }
}



