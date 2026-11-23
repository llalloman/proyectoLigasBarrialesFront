# Frontend - Sistema de Ligas Barriales

Aplicacion web construida con Angular, TypeScript, RxJS y SCSS.

**Estado de documentacion:** actualizado el 22/11/2026.
Para el estado funcional completo del sistema, revisar [../ESTADO_ACTUAL_PROYECTO.md](../ESTADO_ACTUAL_PROYECTO.md).

Actualizacion 12/11/2026: el formulario de habilitacion detecta bajas anteriores y solicita la justificacion del reingreso. La bandeja de pendientes incluye revision de ficha anterior, goles, sanciones y transferencias, ademas de la regularizacion de solicitudes historicas antes de aprobar.

Validacion 19/11/2026: el reingreso, el sorteo de vocalias con una programacion real completa y el cumplimiento de sanciones con partidos aplazados fueron validados en produccion. Tesoreria y las pruebas E2E integrales permanecen pausadas para sus respectivas etapas de validacion final.

## Tecnologias

- Angular
- TypeScript
- RxJS
- SCSS
- Reactive Forms
- Angular Material en filtros/autocomplete
- pdfmake/jsPDF segun modulo de PDF

## Modulos Frontend Principales

- Auth y dashboard.
- Usuarios.
- Ligas.
- Equipos.
- Jugadores.
- Upload de imagenes.
- Campeonatos.
- Categorias.
- Inscripciones.
- Habilitaciones de jugadores y descarga de carnets PDF individual, por equipo o mediante selección múltiple entre equipos.
- Transferencias.
- Partidos y fixture.
- Tabla de posiciones.
- Goles y goleadores.
- Reportes administrativos de campeonato, equipo y jugador, con linea de tiempo y exportacion PDF/Excel.
- Acta digital.
- Acta de impresion.
- Sanciones.
- Tribunal de penas.
- Centro interno de notificaciones.
- Tesoreria.
- Garantias.
- Derramas y deudas.
- Componentes compartidos, footer, guards y servicios core.

## Instalacion

```bash
cd frontend
npm install
npm start
```

Aplicacion local:

```text
http://localhost:4201
```

## Configuracion de Entornos

Desarrollo:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};
```

Produccion:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://proyectoligasbarrialesback.onrender.com/api',
};
```

Verificar `src/environments/environment.ts` antes de desplegar.

## Scripts

```bash
npm start
npm run build
npm test
npm run test:watch
npm run lint
```

## Funcionalidades UI Destacadas

- Navegacion protegida por roles.
- Los dirigentes refrescan la configuración al entrar a Jugadores, Inscripciones/Habilitaciones o Transferencias; si el módulo está cerrado o no puede verificarse, vuelven al dashboard con un aviso visible.
- La configuración aplica un criterio seguro ante errores de red: no habilita por defecto un módulo cuyo estado no pudo comprobarse.
- Menus y acciones visibles segun permisos.
- Filtros avanzados por rol.
- Autocomplete de jugadores.
- Rutas `/reportes`, `/reportes/equipos` y `/reportes/jugadores`, enlazadas desde el dashboard y el menu Competencia.
- Filtros en cascada.
- Formularios reactivos.
- Generacion de PDFs operativos.
- Carga y previsualizacion de imagenes.
- Vistas responsive.
- Acta impresa equivalente al formato fisico.
- Navegación unificada de Tesorería en todas sus pantallas.
- Cuenta consolidada de deudas por equipo.
- Libro de caja con rango de fechas y exportación PDF/Excel.
- Recibos persistentes disponibles para reimpresión.
- Conciliaciones periódicas y cierre definitivo con historial y comprobante PDF.
- Inicio operativo de caja, traslado trazable de saldo y consulta protegida de cobros históricos.
- Historial detallado de goles con filtros, resumen, paginacion y exportacion completa a PDF/Excel.
- Buscadores reutilizables para equipos, jugadores y partidos en jugadores, habilitaciones, inscripciones, transferencias, partidos, goleadores, sanciones y acta.
- Campana SVG global con contador, panel de cinco avisos recientes y actualizacion cada 60 segundos.
- Bandeja `/notificaciones` con filtros por estado y tipo, lectura individual o masiva y acceso directo al modulo relacionado.
- Filtros visuales para habilitaciones, transferencias, solicitudes de horario, sanciones, programaciones y reprogramaciones.

## Testing

Los comandos de test existen, pero falta consolidar una cobertura automatizada completa para los modulos actuales. El build productivo fue verificado el 22/11/2026 y finaliza sin advertencias. El paquete inicial mide 547.19 kB sin comprimir y 129.04 kB de transferencia estimada; los presupuestos conservan margenes de aviso y error para detectar crecimientos futuros.

## Despliegue

El despliegue documentado usa Netlify.

Ver:

- [Despliegue Netlify + Render](../DESPLIEGUE_NETLIFY_RENDER.md)
- [Forzar rebuild en Netlify](../NETLIFY_REBUILD_INSTRUCTIONS.md)

## Documentacion Relacionada

- [Estado actual del proyecto](../ESTADO_ACTUAL_PROYECTO.md)
- [Mejoras UI y filtros](../MEJORAS_UI_FILTROS.md)
- [Acta de impresion](./ACTA_IMPRIMIR_IMPLEMENTACION.md)
- [Centro interno de notificaciones](../NOTIFICACIONES_IMPLEMENTACION_NOVIEMBRE_2026.md)
- [Acta digital](../ACTA_DIGITAL_IMPLEMENTACION.md)
- [Modulo de Tesoreria](../MODULO_TESORERIA_RESUMEN.md)
- [Historial detallado de goles](../HISTORIAL_GOLES_IMPLEMENTACION_NOVIEMBRE_2026.md)
- [Buscadores reutilizables](../BUSCADORES_REUTILIZABLES_NOVIEMBRE_2026.md)
- [Upload de imagenes](../UPLOAD_SYSTEM.md)
