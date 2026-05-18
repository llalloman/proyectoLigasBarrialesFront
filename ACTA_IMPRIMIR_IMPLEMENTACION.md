# Implementación de Acta de Vocalía para Impresión

## Estado al 2026-03-23

- Se creó el componente Angular `acta-imprimir` en `frontend/src/app/modules/acta-partido/acta-imprimir/`.
- Replica el acta física en dos páginas (planilla de jugadores, valores, firmas, informes, tribunal, impugnación).
- Los jugadores se pre-cargan desde la base de datos, el resto de campos se dejan en blanco para llenar a mano.
- Se agregó botón "Imprimir Acta" en la cabecera del acta digital.
- Ruta: `/partidos/:partidoId/acta/imprimir`.
- Estilos de impresión y PDF listos para A4.

---

## Actualización 2026-04-03

### Resaltado visual de jugadores suspendidos
- Las filas de jugadores con `estadoSugerido === 'suspendido'` se muestran con fondo **rojo sólido** (`#e74c3c`) y texto blanco negrita.
- El resaltado aplica tanto en la pantalla como en la impresión/PDF, forzado con `print-color-adjust: exact`.
- Permite al vocal de turno identificar de inmediato qué jugadores no pueden actuar en el acta física.
- Clase CSS afectada: `.fila-suspendido td` en `acta-imprimir.component.scss`.
- Binding HTML: `[ngClass]="{'fila-suspendido': fila?.estadoSugerido === 'suspendido'}"` en ambas tablas (local y visitante).

---

## Cambios de impresión y equivalencia física (abril 2026)

- Se completó la equivalencia visual y funcional entre el acta digital impresa y el acta física tradicional.
- Mejoras aplicadas:
  - Bordes exteriores de todos los bloques de la segunda página (informes, tribunal, impugnación) ahora son idénticos a los de la planilla de jugadores (página 1).
  - Colores de encabezados y sub-encabezados unificados (verde claro y gris claro).
  - Espacios para firmas y campos a llenar a mano ampliados y alineados con el formato físico.
  - Leyenda de copyright y pie de página ocultos en impresión.
  - Texto de observaciones y etiquetas relevantes en mayúsculas.
  - Secciones de impugnación y tribunal ajustadas para máxima similitud visual y funcional.
- El acta impresa es válida para llenado manual en campo y cumple requisitos de presentación ante la liga.
- Cambios también documentados en ACTA_DIGITAL_IMPLEMENTACION.md y ACTA_VOCALIA_CAMBIOS_2026.md.

---

## Estado del componente (mayo 2026)
- ✅ Implementado y en producción. Equivalencia visual total con acta física validada.
- ✅ Resaltado de suspendidos en impresión. Campo árbitro editable. Nueva línea vocalía ($16.00).
- ✅ Todos los jugadores habilitados se exportan correctamente, ordenados por número de camiseta.
- ⚠️ Pendiente de futuro: reportes estadísticos globales desde el acta.

**Última actualización:** 13 de mayo de 2026
