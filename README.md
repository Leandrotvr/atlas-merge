# Atlas Merge

Juego idle de fusionar objetos y restaurar un mapa por regiones. Funciona en el navegador y se puede instalar en Android como app.

**Jugar:** https://leandrotvr.github.io/atlas-merge/

## Instalar en Android
1. Abrí el link de arriba en Chrome.
2. Tocá el menú (los tres puntos) y elegí **Instalar app** o **Agregar a la pantalla principal**.
3. Queda como una app más y funciona sin internet.

## Cómo se juega
- **Explorar** da un objeto nuevo (cuesta monedas y 1 energía).
- Tocá o arrastrá un objeto sobre otro **igual** para fusionarlos en uno mejor.
- Los objetos producen monedas solos, también con el juego cerrado (hasta 8 horas).
- Con las monedas restaurás regiones del mapa, que multiplican el ingreso.
- Con las 8 regiones podés **reeditar el atlas** y ganar un bonus permanente.

## Para desarrolladores
- `index.html` + `engine.js`: el juego (la lógica está separada de la pantalla).
- `simular.js`: simulador de balance. Ejecutar `node simular.js 60` simula 60 días con cuatro perfiles de jugador.
- APK de prueba: la receta `.github/workflows/android.yml` lo compila con Capacitor. Se ejecuta desde la pestaña Actions y el APK queda descargable como artefacto.

Prototipo en desarrollo.
