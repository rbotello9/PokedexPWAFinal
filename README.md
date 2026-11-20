# Pokédex PWA — Kanto

Aplicación web progresiva (PWA) para capturar Pokémon de la primera generación (#001–#151) escaneando códigos QR. La colección se guarda en el dispositivo con `localStorage`; no hay backend, base de datos ni inicio de sesión.

## Autores

Rene Botello · Juan Carlos Del Rio · Kristina Rodriguez · Gael Solis

## Cómo ejecutar la aplicación

La cámara y el Service Worker solo funcionan en `localhost` o con HTTPS (no abriendo el archivo con doble clic).

```bash
cd pokedex
python3 -m http.server 8000
# o: npx serve .
```

Abre `http://localhost:8000`. Para probar en el celular, publica la carpeta con HTTPS (por ejemplo GitHub Pages) o usa un túnel como ngrok.

## Códigos QR de prueba

Abre `qr/index.html` (con el mismo servidor) para ver y descargar los QR de Bulbasaur, Charmander, Squirtle, Pikachu, Jigglypuff, Meowth, Gengar, Eevee, Mewtwo y Mew. El contenido de cada QR es `pokemon:{id}`, por ejemplo `pokemon:25`.

## Librerías

- **QR:** [html5-qrcode](https://github.com/mebjas/html5-qrcode) 2.3.8
- **Estilos:** Tailwind CSS (CDN)
- **Datos:** [PokéAPI](https://pokeapi.co)

## Cómo instalar la PWA

1. Abre la app en Chrome o Edge (Android o escritorio) o en Safari (iPhone).
2. Android/escritorio: menú ⋮ → **Instalar aplicación**. iPhone: botón Compartir → **Agregar a pantalla de inicio**.
3. Ábrela desde el icono: se mostrará como aplicación independiente.

Para que funcione sin conexión, abre la app una vez con Internet; el Service Worker guardará los recursos principales.

## Estructura

```
pokedex/
├── index.html
├── manifest.json
├── service-worker.js
├── js/app.js
├── icons/ (icon-192.png, icon-512.png)
└── qr/index.html
```
