# Portafolio de Federico Barzola

Portafolio de Federico Barzola, desarrollador front-end y estudiante de Geotecnologías en Mendoza. La interfaz combina cartografía de misión e instrumentación de vuelo con una experiencia 3D opcional para recorrer estaciones satelitales.

## Desarrollo local

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:3000`.

## Simulador

- `W` / `S`: aplicar empuje hacia delante o contramarcha.
- `A` / `D` o flechas izquierda/derecha: orientar el rumbo.
- `Q` / `E`: inclinar el morro hacia arriba o abajo.
- `Espacio`: solicitar empuje auxiliar.
- `F`: activar las defensas ante naves no identificadas.
- `C`: cambiar la cámara; `R`: reposicionar la nave.
- En pantallas táctiles se muestran controles en pantalla.

El vuelo conserva su deriva al soltar el empuje y permite maniobrar en tres dimensiones. Al llegar a una estación pueden aparecer dos o tres naves no identificadas. El radar muestra estaciones y contactos; el panel permite revisar la integridad del casco y activar defensas.

## Publicación

Los cambios en `master` se compilan y publican en GitHub Pages mediante `.github/workflows/deploy.yml`.
