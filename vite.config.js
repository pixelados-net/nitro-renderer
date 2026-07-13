// vite.config.js
import typescript from '@rollup/plugin-typescript';
import { resolve } from 'path';
import { defineConfig } from 'vite';

const resolvePath = str => resolve(__dirname, str);

export default defineConfig({
    plugins: [
        typescript({
            'target': 'es6',
            'rootDir': resolvePath('./src'),
            'declaration': true,
            exclude: resolvePath('./node_modules/**'),
            allowSyntheticDefaultImports: true
        })
    ],
    build: {
        sourcemap: true,
        lib: {
            entry: {
                'nitro-renderer': resolve(__dirname, 'src/index.ts'),
                standalone: resolve(__dirname, 'src/standalone/index.ts')
            },
            formats: ['es'],
            name: 'nitro-renderer',
            fileName: (_, entryName) => `${entryName}.js`
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '~': resolve(__dirname, 'node_modules')
        }
    },
    server: {
        host: '127.0.0.1'
    }
});
