# Instalación

## Como dependencia

```bash
npm install @nitrots/nitro-renderer
# o
yarn add @nitrots/nitro-renderer
```

El paquete distribuye el código TypeScript fuente (`main: "./index"`); el bundler del proyecto consumidor (Vite, webpack…) lo compila junto al resto de la aplicación.

## Desarrollo local

```bash
git clone https://github.com/pixelados-net/nitro-renderer.git
cd nitro-renderer
yarn install
```

Scripts disponibles:

| Script | Descripción |
|---|---|
| `yarn build` | Compila la librería con Vite (salida en `dist/`) |
| `yarn typecheck` | Chequeo de tipos sin emitir |
| `yarn compile` | Compila con `tsc` emitiendo a `dist/` |
| `yarn lint` | ESLint en modo verificación |
| `yarn eslint` | ESLint con autofix |
| `yarn test` | Tests con vitest |

## Uso con un proyecto local (yarn link)

```bash
cd nitro-renderer
yarn link

cd ../mi-cliente
yarn link @nitrots/nitro-renderer
```
