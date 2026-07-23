import { describe, expect, it } from 'vitest';
import { DiffieHandshake, LegacyRSA, RC4Cipher } from '../src/core/communication/crypto';

const exponent = '3';
const modulus = '86851dd364d5c5cece3c883171cc6ddc5760779b992482bd1e20dd296888df91b33b936a7b93f06d29e8870f703a216257dec7c81de0058fea4cc5116f75e6efc4e9113513e45357dc3fd43d4efab5963ef178b78bd61e81a14c603b24c8bcce0a12230b320045498edc29282ff0603bc7b7dae8fc1b05b52b2f301a9dc783b7';
const privateExponent = '59ae13e243392e89ded305764bdd9e92e4eafa67bb6dac7e1415e8c645b0950bccd26246fd0d4af37145af5fa026c0ec3a94853013eaae5ff1888360f4f9449ee023762ec195dff3f30ca0b08b8c947e3859877b5d7dced5c8715c58b53740b84e11fbc71349a27c31745fcefeeea57cff291099205e230e0c7c27e8e1c0512b';

describe('legacy handshake compatibility', () =>
{
    it('verifies signed server values and encrypts client values', () =>
    {
        const rsa = new LegacyRSA(modulus, exponent);
        const signature = serverSign('340282366920938463463374607431768211507');

        expect(rsa.verifyString(signature)).toBe('340282366920938463463374607431768211507');
        expect(serverDecrypt(rsa.encryptString('123456789'))).toBe('123456789');
    });

    it('derives a usable Diffie shared key and rejects invalid peers', () =>
    {
        const exchange = new DiffieHandshake('340282366920938463463374607431768211507', '170141183460469231731687303715884105727');
        const serverPublic = modPow(BigInt('170141183460469231731687303715884105727'), BigInt(3571), BigInt('340282366920938463463374607431768211507'));

        expect(exchange.publicKey.length).toBeGreaterThan(0);
        expect(exchange.sharedKey(serverPublic.toString(10)).length).toBeGreaterThan(0);
        expect(() => exchange.sharedKey('1')).toThrow('Invalid server Diffie public key');
    });

    it('matches the standard RC4 compatibility vector', () =>
    {
        const cipher = new RC4Cipher(new TextEncoder().encode('Key'));
        const encrypted = new Uint8Array(cipher.process(new TextEncoder().encode('Plaintext').buffer));

        expect(bytesToHex(encrypted)).toBe('bbf316e8d940af0ad3');
    });
});

const serverSign = (value: string): string =>
{
    const blockSize = modulus.length / 2;
    const data = new TextEncoder().encode(value);
    const block = new Uint8Array(blockSize);
    const paddingLength = blockSize - data.length - 3;

    block[1] = 1;
    block.fill(0xff, 2, 2 + paddingLength);
    block.set(data, 3 + paddingLength);

    return fixedHex(modPow(bytesToBigInt(block), BigInt(`0x${ privateExponent }`), BigInt(`0x${ modulus }`)), blockSize);
};

const serverDecrypt = (encrypted: string): string =>
{
    const blockSize = modulus.length / 2;
    const decrypted = fixedBytes(modPow(BigInt(`0x${ encrypted }`), BigInt(`0x${ privateExponent }`), BigInt(`0x${ modulus }`)), blockSize);
    let separator = 2;

    while(separator < decrypted.length && decrypted[separator] !== 0) separator++;

    return new TextDecoder().decode(decrypted.slice(separator + 1));
};

const modPow = (base: bigint, exponentValue: bigint, modulusValue: bigint): bigint =>
{
    let result = BigInt(1);
    let factor = base % modulusValue;
    let power = exponentValue;

    while(power > BigInt(0))
    {
        if((power % BigInt(2)) === BigInt(1)) result = (result * factor) % modulusValue;

        power /= BigInt(2);
        factor = (factor * factor) % modulusValue;
    }

    return result;
};

const bytesToBigInt = (source: Uint8Array): bigint => BigInt(`0x${ bytesToHex(source) }`);
const bytesToHex = (source: Uint8Array): string => Array.from(source, value => value.toString(16).padStart(2, '0')).join('');
const fixedHex = (value: bigint, size: number): string => value.toString(16).padStart(size * 2, '0');

const fixedBytes = (value: bigint, size: number): Uint8Array =>
{
    const hex = fixedHex(value, size);
    const result = new Uint8Array(size);

    for(let index = 0; index < size; index++) result[index] = parseInt(hex.slice(index * 2, (index * 2) + 2), 16);

    return result;
};
