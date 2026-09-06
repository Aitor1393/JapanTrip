# Desplegar en Cloudflare Pages

La web se sirve desde **Cloudflare Pages**, que además permite decidir quién
entra con **Cloudflare Access**. GitHub Pages no sabe hacer eso: publica en
abierto o no publica.

## Ajustes del proyecto

**Workers & Pages → Create → Pages → Connect to Git**, eliges este repositorio:

| Campo | Valor |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | `bash scripts/preparar-sitio.sh` |
| Build output directory | `_sitio` |

## Quién puede entrar

**Zero Trust → Access → Applications → Add an application → Self-hosted**,
apuntando al dominio del proyecto, y ahí defines la política: una lista de
correos, un dominio entero o acceso libre.

Las rutas de esta web van con almohadilla (`#/itinerario`), y lo que va detrás
de `#` no llega al servidor: **el control de acceso es por sitio entero, no por
pantalla**.

## El botón de Publicar sigue igual

Publicar escribe `data/viajes.json` en GitHub con tu token, exactamente como
hasta ahora. Lo que cambia es quién sirve el resultado: cada push a `main`
dispara una compilación de Cloudflare en lugar del despliegue de Pages.

## Apagar GitHub Pages

Mientras siga activo, la web está también en `aitor1393.github.io/JapanTrip/`
**sin identificación alguna**, y el control de acceso de Cloudflare no sirve de
nada. Cuando Cloudflare funcione: **Settings → Pages → Source → None**.
