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

## Próximos pasos sugeridos
- Ajustar detalles visuales y de datos según feedback real.
- Validar que todos los jugadores y datos relevantes se exporten correctamente.
- Mejorar la exportación a PDF si es necesario.
- Documentar cualquier cambio adicional tras la revisión del usuario.
