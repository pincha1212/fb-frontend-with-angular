# Portafolio de Federico Barzola

Portafolio personal para presentar proyectos de desarrollo front-end, juegos web y geotecnologías. Está hecho con Angular y mantiene una versión tradicional del portafolio junto con un simulador espacial 3D opcional.

## Desarrollo local

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:3000`.

## Simulador

- `W` o `↑`: avanzar; `S` o `↓`: retroceder.
- `A` / `D` o flechas: girar.
- `Espacio`: impulso.
- `F`: disparar durante un encuentro.
- `C`: cambiar la cámara; `R`: reposicionar la nave.
- En pantallas táctiles se muestran controles en pantalla.

Al acercarse a una estación, aparecen dos o tres naves hostiles. El radar muestra las estaciones y los contactos enemigos; el panel permite disparar y consultar el estado del casco.

## Publicación

Los cambios en `master` se compilan y publican en GitHub Pages mediante `.github/workflows/deploy.yml`.
