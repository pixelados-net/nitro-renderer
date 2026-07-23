export class DiffieHandshake
{
    private _prime: bigint;
    private _generator: bigint;
    private _privateKey: bigint;
    private _publicKey: bigint;

    constructor(primeDecimal: string, generatorDecimal: string)
    {
        this._prime = BigInt(primeDecimal);
        this._generator = BigInt(generatorDecimal);

        const two = BigInt(2);

        if(this._prime <= two || this._generator < two || this._generator >= this._prime) throw new Error('Invalid Diffie parameters');

        this._privateKey = DiffieHandshake.randomPrivateKey(30);
        this._publicKey = DiffieHandshake.modPow(this._generator, this._privateKey, this._prime);

        if(!this.isGroupValue(this._publicKey)) throw new Error('Invalid generated Diffie public key');
    }

    public get publicKey(): string
    {
        return this._publicKey.toString(10);
    }

    public sharedKey(serverPublicDecimal: string): Uint8Array
    {
        const serverPublic = BigInt(serverPublicDecimal);

        if(!this.isGroupValue(serverPublic)) throw new Error('Invalid server Diffie public key');

        const shared = DiffieHandshake.modPow(serverPublic, this._privateKey, this._prime);

        if(shared < BigInt(2)) throw new Error('Invalid Diffie shared key');

        let hex = shared.toString(16);

        if(hex.length % 2) hex = `0${ hex }`;

        const result = new Uint8Array(hex.length / 2);

        for(let index = 0; index < result.length; index++) result[index] = parseInt(hex.slice(index * 2, (index * 2) + 2), 16);

        return result;
    }

    private isGroupValue(value: bigint): boolean
    {
        return value >= BigInt(2) && value <= (this._prime - BigInt(2));
    }

    private static randomPrivateKey(bytes: number): bigint
    {
        const random = new Uint8Array(bytes);

        crypto.getRandomValues(random);
        random[0] |= 1;

        const hex = Array.from(random, value => value.toString(16).padStart(2, '0')).join('');

        return BigInt(`0x${ hex }`);
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
}
