export class RC4Cipher
{
    private _i: number = 0;
    private _j: number = 0;
    private _table: Uint8Array = new Uint8Array(256);

    constructor(key: Uint8Array)
    {
        if(!key || !key.length) throw new Error('RC4 key is required');

        for(let index = 0; index < this._table.length; index++) this._table[index] = index;

        let j = 0;

        for(let index = 0; index < this._table.length; index++)
        {
            j = (j + this._table[index] + key[index % key.length]) & 0xff;

            const current = this._table[index];

            this._table[index] = this._table[j];
            this._table[j] = current;
        }
    }

    public process(source: ArrayBuffer): ArrayBuffer
    {
        const result = new Uint8Array(source.slice(0));

        for(let index = 0; index < result.length; index++)
        {
            this._i = (this._i + 1) & 0xff;
            this._j = (this._j + this._table[this._i]) & 0xff;

            const current = this._table[this._i];

            this._table[this._i] = this._table[this._j];
            this._table[this._j] = current;

            result[index] ^= this._table[(this._table[this._i] + this._table[this._j]) & 0xff];
        }

        return result.buffer;
    }
}
