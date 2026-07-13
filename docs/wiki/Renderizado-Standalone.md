# Renderizado Standalone

Desde el entrypoint `@nitrots/nitro-renderer/standalone` se pueden renderizar **avatares y furnis como imágenes sin cliente completo**: sin websocket, sin emulador y sin `Nitro.bootstrap()`. Pensado para CMS, catálogos web, herramientas de administración, etc.

Solo se necesitan los **assets estáticos por HTTP** (los mismos que usa el cliente): configuración, figuredata/figuremap, effectmap, furnidata y los bundles `.nitro`.

## Inicialización

```ts
import { createNitroImaging } from '@nitrots/nitro-renderer/standalone';

const imaging = await createNitroImaging({
    // La misma configuración JSON del cliente (renderer-config)
    configurationUrl: 'https://assets.mihotel.com/renderer-config.json',

    // Opcional: sobreescribir/añadir claves puntuales
    configuration: {
        'furnidata.url': 'https://assets.mihotel.com/gamedata/furnidata.json'
    }
});
```

Claves de configuración que deben existir (todas están en la config estándar del cliente): `avatar.default.figuredata`, `avatar.figuredata.url`, `avatar.actions.url`, `avatar.figuremap.url`, `avatar.effectmap.url`, `avatar.asset.url`, `furnidata.url`, `room.asset.url` y las URLs base de assets.

## Avatares

```ts
// Fotograma de un avatar (HTMLImageElement; .src es un data URL)
const image = await imaging.avatar.render({
    figure: 'hd-180-1.ch-210-66.lg-270-82.sh-290-80',
    gender: 'M',
    direction: 2,        // 0-7
    posture: 'std',      // 'std' | 'sit' | 'lay' | 'wlk' ...
    gesture: 'sml',      // 'sml' | 'sad' | 'agr' | 'srp'
    expression: 'wav',   // 'wav', 'blw', 'laugh'... (AvatarAction)
    dance: 1,            // opcional
    effect: 6,           // opcional (se descarga automáticamente)
    frame: 0,            // frame de la animación
    headOnly: false
});

document.body.appendChild(image);

// O directamente el data URL:
const dataUrl = await imaging.avatar.renderDataUrl({ figure, headOnly: true });
```

La descarga de las librerías de ropa necesarias es automática: el método espera a que estén listas antes de resolver.

## Furnis

```ts
// Por classname (furnidata)
const throne = await imaging.furni.render({
    classname: 'throne',
    direction: 90,   // grados (0, 90, 180, 270)
    state: 0,
    scale: 64        // 64 | 32
});

// Por typeId (ítem de pared con wallItem: true)
const poster = await imaging.furni.render({ typeId: 13 });

const dataUrl = await imaging.furni.renderDataUrl({ classname: 'throne' });
```

## Limpieza

```ts
imaging.dispose(); // libera renderer, managers y listeners
```

## Convivencia con el cliente

Si `Nitro.bootstrap()` ya se ejecutó en la misma página, `createNitroImaging` **reutiliza** la `Application` de Pixi existente en lugar de crear otra. El flujo del cliente no se ve afectado.

## Limitaciones actuales

- Solo navegador (usa canvas/WebGL del DOM). El render en Node/servidor está planificado (ver plan de mejoras, M9).
- Las previews de salas completas (plano + furnis) llegan en el milestone M6.
- Los GIFs/spritesheets de animaciones llegan en el milestone M6.
