# Arquitectura

## Vista general

```
src/
├── core/         Configuración, comunicación (websocket + códecs) y utilidades base
├── api/          Interfaces públicas + AssetManager (carga de bundles .nitro)
├── events/       Todos los eventos (NitroEvent y derivados)
├── room/         Motor genérico de salas: canvas de sprites, geometría isométrica
├── nitro/        La capa "cliente": Nitro, RoomEngine, AvatarRenderManager, sesión, sonido…
├── pixi-proxy/   Envoltorios sobre PixiJS (Application, TextureUtils, Ticker)
└── standalone/   Fachada de imaging sin conexión (avatares/furnis como imágenes)
```

## Ciclo de vida del cliente completo

1. `Nitro.bootstrap()` crea el canvas, la `Application` de Pixi y la instancia singleton `Nitro.instance`.
2. La configuración se carga (`NitroConfiguration`) y dispara `ConfigurationEvent.LOADED`.
3. Se establece la conexión websocket (`communication`), **requisito de `Nitro.init()`**.
4. `Nitro.init()` inicializa los managers en orden: avatar → sonido → sesión → `RoomEngine`.
5. `RoomEngine` dispara `RoomEngineEvent.ENGINE_INITIALIZED` cuando el `RoomContentLoader` está listo.

## Managers principales

| Manager | Responsabilidad | ¿Necesita conexión? |
|---|---|---|
| `NitroCommunicationManager` | Websocket, códec EvaWire, mensajes entrantes/salientes | Sí |
| `AvatarRenderManager` | Figuras de avatar: geometría, partsets, animaciones, descarga de ropa | **No** |
| `RoomEngine` | Instancias de sala, objetos, visualizaciones, imágenes de furni/pet | Solo para salas en vivo |
| `RoomManager` | Ciclo de vida de `RoomInstance` y sus objetos | No |
| `SessionDataManager` | Datos de sesión (usuario, permisos, badges) | Sí |
| `RoomSessionManager` | Sesiones de sala (entrar/salir, usuarios) | Sí |
| `RoomCameraWidgetManager` | Cámara/foto dentro de la sala | No |
| `SoundManager` | Música y efectos (howler) | Parcial |

## Assets

Los assets se descargan por HTTP como bundles `.nitro` (zlib + JSON de spritesheet + PNG). `AssetManager` (`GetAssetManager()`) mantiene las colecciones en memoria; las descargas se hacen en paralelo (límite de 8 conexiones).

## Puntos singleton a conocer

- `Nitro.instance` — el cliente completo.
- `PixiApplicationProxy.instance` — la `Application` de Pixi (renderer + ticker). `TextureUtils` la usa por defecto para generar texturas; puede sustituirse con `TextureUtils.setRenderer(...)`.
- `AssetManager._INSTANCE` vía `GetAssetManager()` — caché global de colecciones y texturas.
