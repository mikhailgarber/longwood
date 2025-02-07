import { execSync } from "child_process";

export function getVideoFrameSize(filePath: string): { width: number, height: number } {
    const command = `ffmpeg -i ${filePath} 2>&1 | grep 'Stream #0:0' | grep -oP ', \\d+x\\d+' | grep -oP '\\d+x\\d+'`;
    const output = execSync(command).toString().trim();
    const [width, height] = output.split('x').map(Number);
    return { width, height };
}