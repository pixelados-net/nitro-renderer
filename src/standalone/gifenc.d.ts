declare module 'gifenc'
{
    export interface IGIFEncoder
    {
        writeFrame(index: Uint8Array, width: number, height: number, options?: {
            palette?: number[][];
            delay?: number;
            transparent?: boolean;
            transparentIndex?: number;
            dispose?: number;
            repeat?: number;
            first?: boolean;
        }): void;
        finish(): void;
        bytes(): Uint8Array;
        buffer: ArrayBuffer;
        reset(): void;
    }

    export function GIFEncoder(options?: { auto?: boolean, initialCapacity?: number }): IGIFEncoder;
    export function quantize(data: Uint8Array | Uint8ClampedArray, maxColors: number, options?: { format?: string, oneBitAlpha?: boolean | number, clearAlpha?: boolean, clearAlphaThreshold?: number, clearAlphaColor?: number }): number[][];
    export function applyPalette(data: Uint8Array | Uint8ClampedArray, palette: number[][], format?: string): Uint8Array;
    export function nearestColorIndex(palette: number[][], pixel: number[]): number;
}
