export class LegacyRSA
{
    private _modulus: bigint;
    private _exponent: bigint;
    private _blockSize: number;

    constructor(modulusHex: string, exponentHex: string = '3')
    {
        if(!modulusHex || !exponentHex) throw new Error('Diffie RSA public key is required');

        this._modulus = BigInt(`0x${ LegacyRSA.normalizeHex(modulusHex) }`);
        this._exponent = BigInt(`0x${ LegacyRSA.normalizeHex(exponentHex) }`);
        this._blockSize = Math.ceil(this._modulus.toString(16).length / 2);

        if(this._blockSize < 64) throw new Error('Diffie RSA modulus is too small');
    }

    public verifyString(encoded: string): string
    {
        const transformed = this.transform(LegacyRSA.hexToBytes(encoded));

        return new TextDecoder().decode(this.unpad(transformed, 1));
    }

    public encryptString(value: string): string
    {
        const data = new TextEncoder().encode(value);
        const paddingLength = this._blockSize - data.length - 3;

        if(paddingLength < 8) throw new Error('Diffie RSA payload is too large');

        const block = new Uint8Array(this._blockSize);

        block[1] = 2;

        const random = new Uint8Array(paddingLength);

        crypto.getRandomValues(random);

        for(let index = 0; index < random.length; index++)
        {
            while(random[index] === 0)
            {
                const replacement = new Uint8Array(1);

                crypto.getRandomValues(replacement);
                random[index] = replacement[0];
            }
        }

        block.set(random, 2);
        block.set(data, 3 + paddingLength);

        return LegacyRSA.bytesToHex(this.transform(block, true));
    }

    private transform(source: Uint8Array, fixedWidth: boolean = false): Uint8Array
    {
        if(source.length !== this._blockSize) throw new Error('Invalid Diffie RSA block size');

        const value = LegacyRSA.bytesToBigInt(source);
        const transformed = LegacyRSA.modPow(value, this._exponent, this._modulus);

        return LegacyRSA.bigIntToBytes(transformed, fixedWidth ? this._blockSize : undefined);
    }

    private unpad(source: Uint8Array, blockType: number): Uint8Array
    {
        let offset = 0;

        while(offset < source.length && source[offset] === 0) offset++;

        if(source[offset] !== blockType) throw new Error('Invalid Diffie RSA padding');

        const paddingStart = offset + 1;

        offset = paddingStart;

        while(offset < source.length && source[offset] !== 0)
        {
            if(blockType === 1 && source[offset] !== 0xff) throw new Error('Invalid Diffie RSA signature padding');

            offset++;
        }

        if((offset - paddingStart) < 8 || offset >= source.length) throw new Error('Invalid Diffie RSA padding length');

        return source.slice(offset + 1);
    }

    private static modPow(base: bigint, exponent: bigint, modulus: bigint): bigint
    {
        let result = BigInt(1);
        let factor = base % modulus;
        let power = exponent;
        const zero = BigInt(0);
        const two = BigInt(2);

        while(power > zero)
        {
            if((power % two) === BigInt(1)) result = (result * factor) % modulus;

            power /= two;
            factor = (factor * factor) % modulus;
        }

        return result;
    }

    private static bytesToBigInt(source: Uint8Array): bigint
    {
        const hex = LegacyRSA.bytesToHex(source);

        return hex ? BigInt(`0x${ hex }`) : BigInt(0);
    }

    private static bigIntToBytes(value: bigint, minimumLength: number = 0): Uint8Array
    {
        let hex = value.toString(16);

        if(hex.length % 2) hex = `0${ hex }`;

        const result = LegacyRSA.hexToBytes(hex);

        if(result.length >= minimumLength) return result;

        const padded = new Uint8Array(minimumLength);

        padded.set(result, minimumLength - result.length);

        return padded;
    }

    private static hexToBytes(value: string): Uint8Array
    {
        let hex = LegacyRSA.normalizeHex(value);

        if(hex.length % 2) hex = `0${ hex }`;

        const result = new Uint8Array(hex.length / 2);

        for(let index = 0; index < result.length; index++) result[index] = parseInt(hex.slice(index * 2, (index * 2) + 2), 16);

        return result;
    }

    private static bytesToHex(source: Uint8Array): string
    {
        return Array.from(source, value => value.toString(16).padStart(2, '0')).join('');
    }

    private static normalizeHex(value: string): string
    {
        return value.trim().replace(/^0x/i, '');
    }
}
