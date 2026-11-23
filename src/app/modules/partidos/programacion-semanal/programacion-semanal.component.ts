import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { LigasService } from '../../../core/services/ligas.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { PartidosService } from '../partidos.service';
import { BolillaHorario, ProgramacionSemanal, ProgramacionSemanalResumen, SolicitudHorario, VocaliaPartido, VocaliasProgramacion } from '../partido.model';
import { ProgramacionSemanalExport, ProgramacionSemanalExportService } from './programacion-semanal-export.service';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../shared/components/searchable-select/searchable-select.component';

@Component({ selector: 'app-programacion-semanal', standalone: true, imports: [CommonModule, FormsModule, RouterLink, MainNavComponent, SearchableSelectComponent], templateUrl: './programacion-semanal.component.html', styleUrls: ['./programacion-semanal.component.scss'] })
export class ProgramacionSemanalComponent implements OnInit {
  ligas: any[] = []; campeonatos: any[] = []; categorias: any[] = [];
  ligaId: number | null = null; campeonatoId: number | null = null; categoriaId: number | null = null;
  etapa = ''; jornada: number | null = null; fecha = ''; cancha = ''; horaInicio = '07:30'; horaFin = '16:30'; intervalo = 90;
  bolillas: BolillaHorario[] = []; sesion: ProgramacionSemanal | null = null; partidoSeleccionadoId: number | null = null;
  bolillaManualId: number | null = null;
  cargando = false; sorteando = false; confirmando = false; error = ''; exito = ''; ultimaBolilla: any = null;
  partidosProgramables: any[] = []; etapasDisponibles: string[] = []; jornadasDisponibles: number[] = [];
  seleccionesJornada: Record<number, number | null> = {};
  jornadaTodas: number | null = null;
  programacionesConfirmadas: ProgramacionSemanalResumen[] = [];
  historialEtapa = ''; historialJornada: number | null = null;
  historialCargando = false; programacionAbriendoId: number | null = null;
  vocalias: VocaliaPartido[] = []; vocaliasEstado: VocaliasProgramacion['estado'] = 'sin_asignar';
  vocaliasCargando = false; vocaliaProcesandoId: number | null = null;
  extractoresVocalia: Record<number, number | null> = {};
  user$: Observable<any>;
  esMaster = false;
  constructor(private readonly ligasService: LigasService, private readonly campeonatosService: CampeonatosService, private readonly categoriasService: CategoriasService, private readonly partidosService: PartidosService, private readonly authService: AuthService, private readonly exportador: ProgramacionSemanalExportService) { this.user$ = authService.currentUser$; }
  ngOnInit(): void {
    const usuario = this.authService.getCurrentUser();
    this.esMaster = usuario?.rol?.nombre === 'master';

    this.ligasService.getAll().subscribe(l => this.ligas = l);
    if (this.esMaster) return;

    if (usuario?.ligaId) {
      this.ligaId = usuario.ligaId;
      this.cambiarLiga();
      return;
    }

    this.error = 'Tu usuario no tiene una liga asignada para realizar la programación semanal.';
  }
  cambiarLiga(): void { this.campeonatos = []; this.categorias = []; this.campeonatoId = null; this.reiniciarHistorial(); if (this.ligaId) this.campeonatosService.getByLiga(this.ligaId).subscribe(c => this.campeonatos = c); }
  cambiarCampeonato(): void { this.categorias = []; this.categoriaId = null; this.etapa = ''; this.jornada = null; this.jornadaTodas = null; this.seleccionesJornada = {}; this.partidosProgramables = []; this.reiniciarHistorial(); if (this.campeonatoId) { this.categoriasService.getByCampeonato(this.campeonatoId).subscribe(c => this.categorias = c); this.cargarOpcionesProgramables(); this.cargarProgramacionesConfirmadas(); } }
  cambiarCategoria(): void { this.historialJornada = null; this.cargarProgramacionesConfirmadas(); }
  cambiarEtapa(): void { this.jornada = null; this.jornadaTodas = null; this.seleccionesJornada = {}; this.jornadasDisponibles = [...new Set(this.partidosProgramables.filter(p => p.etapa === this.etapa).map(p => p.jornada))].sort((a, b) => a - b); }
  generarBolillas(): void {
    this.error = ''; const inicio = this.minutos(this.horaInicio), fin = this.minutos(this.horaFin);
    const canchas = this.canchasDetectadas.length ? this.canchasDetectadas : this.cancha.trim() ? [this.cancha.trim()] : [];
    if (!this.fecha || !canchas.length || inicio === null || fin === null || inicio > fin || this.intervalo < 1) { this.error = 'Completa fecha, cancha, horas e intervalo válidos.'; return; }
    const nuevas: BolillaHorario[] = [];
    for (const cancha of canchas) for (let minuto = inicio; minuto <= fin; minuto += this.intervalo) nuevas.push({ fecha: this.fecha, hora: this.hora(minuto), cancha });
    const existeBolillaRepetida = nuevas.some(nueva => this.bolillas.some(actual =>
      actual.fecha === nueva.fecha && actual.hora === nueva.hora && actual.cancha.trim().toLowerCase() === nueva.cancha.trim().toLowerCase()
    ));
    if (existeBolillaRepetida) { this.error = 'Ya agregaste horarios para esa fecha, hora y cancha. Cambia la fecha o elimina las bolillas repetidas.'; return; }
    this.bolillas = [...this.bolillas, ...nuevas];
  }
  quitarBolilla(indice: number): void { this.bolillas.splice(indice, 1); }
  iniciar(): void {
    this.error = ''; this.exito = '';
    const selecciones = this.seleccionesActuales;
    if (!this.campeonatoId || !this.etapa.trim() || !selecciones.length) { this.error = 'Selecciona campeonato, etapa y al menos una jornada por categoría.'; return; }
    this.cargando = true;
    this.partidosService.obtenerProgramacionSemanalPendiente(this.campeonatoId, undefined, this.etapa.trim(), undefined, selecciones).subscribe({
      next: pendiente => {
        if (pendiente) { this.sesion = pendiente; this.exito = 'Se recuperó el sorteo que estaba en curso.'; this.cargando = false; return; }
        if (!this.bolillas.length) { this.error = 'Genera al menos una bolilla para iniciar un sorteo nuevo.'; this.cargando = false; return; }
        this.crearNuevaSesion();
      },
      error: e => { this.error = e?.error?.message ?? 'No se pudo validar si existe un sorteo pendiente.'; this.cargando = false; },
    });
  }
  get pendientes(): any[] { if (!this.sesion) return []; const asignados = new Set(this.sesion.bolillas.filter(b => b.partidoId).map(b => b.partidoId)); return this.sesion.partidos.filter(p => !asignados.has(p.id)); }
  get partidosPendientesSearchOptions(): SearchableSelectOption[] {
    return this.pendientes.map(partido => ({
      value: partido.id,
      label: `${this.solicitudDelPartido(partido.id) ? '⚑ SOLICITUD · ' : ''}${partido.categoria?.nombre || 'Categoría'} · J${partido.jornada} · ${partido.equipoLocal?.nombre} vs ${partido.equipoVisitante?.nombre}`,
      secondary: partido.cancha || undefined,
      searchText: `${partido.equipoLocal?.nombre ?? ''} ${partido.equipoVisitante?.nombre ?? ''} ${partido.categoria?.nombre ?? ''} jornada ${partido.jornada ?? ''}`,
    }));
  }
  get bolillasDisponibles(): number { return this.sesion?.bolillas.filter(b => b.estado === 'disponible').length ?? 0; }
  sacar(): void { if (!this.sesion || !this.partidoSeleccionadoId) return; this.sorteando = true; this.error = ''; this.partidosService.sacarBolilla(this.sesion.id, this.partidoSeleccionadoId).subscribe({ next: r => { this.ultimaBolilla = r.bolilla; this.partidoSeleccionadoId = null; this.refrescar(); this.sorteando = false; }, error: e => { this.error = e?.error?.message ?? 'No se pudo sacar la bolilla.'; this.sorteando = false; } }); }
  confirmar(): void { if (!this.sesion || this.pendientes.length) return; this.confirmando = true; this.partidosService.confirmarProgramacionSemanal(this.sesion.id).subscribe({ next: s => { this.sesion = s; this.exito = 'Programación confirmada. Los horarios fueron guardados en los partidos.'; this.confirmando = false; this.cargarProgramacionesConfirmadas(); this.cargarVocalias(); }, error: e => { this.error = e?.error?.message ?? 'No se pudo confirmar la programación.'; this.confirmando = false; } }); }
  cancelar(): void {
    if (!this.sesion || !window.confirm('¿Cancelar este sorteo? Las asignaciones aún no confirmadas se descartarán y los partidos no cambiarán.')) return;
    this.error = '';
    this.partidosService.cancelarProgramacionSemanal(this.sesion.id).subscribe({
      next: respuesta => { this.sesion = null; this.bolillas = []; this.partidoSeleccionadoId = null; this.bolillaManualId = null; this.exito = respuesta.mensaje; },
      error: e => this.error = e?.error?.message ?? 'No se pudo cancelar el sorteo.',
    });
  }
  liberar(bolilla: BolillaHorario): void {
    if (!this.sesion || !bolilla.id || !window.confirm('¿Liberar esta bolilla para corregir la asignación?')) return;
    this.error = '';
    this.partidosService.liberarBolillaProgramacion(this.sesion.id, bolilla.id).subscribe({ next: sesion => { this.sesion = sesion; this.exito = 'Bolilla liberada. Ahora puedes asignarla manualmente o volver a sortear.'; }, error: e => this.error = e?.error?.message ?? 'No se pudo liberar la bolilla.' });
  }
  asignarManual(): void {
    if (!this.sesion || !this.partidoSeleccionadoId || !this.bolillaManualId) return;
    this.error = '';
    const solicitud = this.solicitudDelPartido(this.partidoSeleccionadoId);
    this.partidosService.asignarBolillaManual(this.sesion.id, this.partidoSeleccionadoId, this.bolillaManualId, solicitud?.id).subscribe({
      next: sesion => { this.sesion = sesion; this.partidoSeleccionadoId = null; this.bolillaManualId = null; this.exito = solicitud ? 'Solicitud reglamentaria aplicada al bolillero. Revisa y confirma la programación.' : 'Horario asignado manualmente. Revisa y confirma cuando todo esté correcto.'; },
      error: e => this.error = e?.error?.message ?? 'No se pudo asignar el horario manualmente.',
    });
  }
  cargarProgramacionesConfirmadas(): void {
    if (!this.campeonatoId) { this.programacionesConfirmadas = []; return; }
    this.historialCargando = true;
    this.partidosService.listarProgramacionesSemanalesConfirmadas(this.campeonatoId, this.categoriaId ?? undefined).subscribe({
      next: programaciones => { this.programacionesConfirmadas = programaciones; this.historialCargando = false; },
      error: e => { this.error = e?.error?.message ?? 'No se pudieron cargar las programaciones confirmadas.'; this.historialCargando = false; },
    });
  }
  abrirProgramacionConfirmada(programacion: ProgramacionSemanalResumen): void {
    this.error = ''; this.exito = ''; this.programacionAbriendoId = programacion.id;
    this.partidosService.obtenerProgramacionSemanal(programacion.id).subscribe({
      next: sesion => {
        this.sesion = sesion;
        this.programacionAbriendoId = null;
        this.partidoSeleccionadoId = null;
        this.bolillaManualId = null;
        this.ultimaBolilla = null;
        this.cargarVocalias();
      },
      error: e => { this.error = e?.error?.message ?? 'No se pudo recuperar la programación confirmada.'; this.programacionAbriendoId = null; },
    });
  }
  cerrarProgramacion(): void {
    this.sesion = null;
    this.partidoSeleccionadoId = null;
    this.bolillaManualId = null;
    this.ultimaBolilla = null;
    this.vocalias = [];
    this.vocaliasEstado = 'sin_asignar';
    this.extractoresVocalia = {};
    this.error = '';
    this.cargarOpcionesProgramables();
    this.cargarProgramacionesConfirmadas();
  }
  cargarVocalias(): void {
    if (!this.sesion || this.sesion.estado !== 'confirmada') return;
    this.vocaliasCargando = true;
    this.partidosService.obtenerVocaliasProgramacion(this.sesion.id).subscribe({
      next: respuesta => { this.actualizarVocalias(respuesta); this.vocaliasCargando = false; },
      error: e => { this.error = e?.error?.message ?? 'No se pudieron cargar las vocalías.'; this.vocaliasCargando = false; },
    });
  }
  prepararVocalias(): void {
    if (!this.sesion) return;
    this.vocaliasCargando = true; this.error = '';
    this.partidosService.prepararVocaliasProgramacion(this.sesion.id).subscribe({
      next: respuesta => { this.actualizarVocalias(respuesta); this.vocaliasCargando = false; this.exito = 'Propuesta de vocalías preparada. Revisa cada relación antes del sorteo.'; },
      error: e => { this.error = e?.error?.message ?? 'No se pudo preparar la asignación de vocalías.'; this.vocaliasCargando = false; },
    });
  }
  reiniciarVocalias(): void {
    if (!this.sesion || !window.confirm('¿Regenerar toda la propuesta? Se eliminarán los sorteos y asignaciones de vocalía que todavía no estén confirmados.')) return;
    this.vocaliasCargando = true; this.error = '';
    this.partidosService.reiniciarVocaliasProgramacion(this.sesion.id).subscribe({
      next: respuesta => { this.extractoresVocalia = {}; this.actualizarVocalias(respuesta); this.vocaliasCargando = false; this.exito = 'Propuesta regenerada con la regla par/impar del día.'; },
      error: e => { this.error = e?.error?.message ?? 'No se pudo regenerar la propuesta de vocalías.'; this.vocaliasCargando = false; },
    });
  }
  sortearVocalia(vocalia: VocaliaPartido): void {
    if (!this.sesion || !vocalia.partidoOrigenId || !this.extractoresVocalia[vocalia.id]) return;
    this.vocaliaProcesandoId = vocalia.id; this.error = '';
    this.partidosService.configurarVocaliaProgramacion(this.sesion.id, vocalia.id, { tipoAsignacion: 'sorteo', partidoOrigenId: vocalia.partidoOrigenId }).subscribe({
      next: () => this.partidosService.sortearVocaliaProgramacion(this.sesion!.id, vocalia.id, this.extractoresVocalia[vocalia.id]!).subscribe({
        next: respuesta => { this.actualizarVocalias(respuesta); this.vocaliaProcesandoId = null; this.exito = 'Bolilla extraída y equipo vocal asignado.'; },
        error: e => { this.error = e?.error?.message ?? 'No se pudo realizar el sorteo de vocalía.'; this.vocaliaProcesandoId = null; },
      }),
      error: e => { this.error = e?.error?.message ?? 'No se pudo preparar el sorteo de vocalía.'; this.vocaliaProcesandoId = null; },
    });
  }
  asignarVocaliaManual(vocalia: VocaliaPartido): void {
    if (!this.sesion || !vocalia.partidoOrigenId || !vocalia.equipoVocalId) return;
    this.vocaliaProcesandoId = vocalia.id; this.error = '';
    this.partidosService.configurarVocaliaProgramacion(this.sesion.id, vocalia.id, { tipoAsignacion: 'manual_equipo', partidoOrigenId: vocalia.partidoOrigenId, equipoVocalId: vocalia.equipoVocalId }).subscribe({
      next: respuesta => { this.actualizarVocalias(respuesta); this.vocaliaProcesandoId = null; this.exito = 'Equipo vocal asignado manualmente.'; },
      error: e => { this.error = e?.error?.message ?? 'No se pudo asignar el equipo vocal.'; this.vocaliaProcesandoId = null; },
    });
  }
  asignarDirectivo(vocalia: VocaliaPartido): void {
    if (!this.sesion || !vocalia.directivoNombre?.trim()) return;
    this.vocaliaProcesandoId = vocalia.id; this.error = '';
    this.partidosService.configurarVocaliaProgramacion(this.sesion.id, vocalia.id, { tipoAsignacion: 'directivo', directivoNombre: vocalia.directivoNombre.trim() }).subscribe({
      next: respuesta => { this.actualizarVocalias(respuesta); this.vocaliaProcesandoId = null; this.exito = 'Directivo responsable asignado.'; },
      error: e => { this.error = e?.error?.message ?? 'No se pudo asignar el directivo.'; this.vocaliaProcesandoId = null; },
    });
  }
  liberarVocalia(vocalia: VocaliaPartido): void {
    if (!this.sesion || !window.confirm('¿Liberar esta vocalía para corregir su asignación?')) return;
    this.vocaliaProcesandoId = vocalia.id; this.error = '';
    this.partidosService.liberarVocaliaProgramacion(this.sesion.id, vocalia.id).subscribe({
      next: respuesta => {
        this.extractoresVocalia[vocalia.id] = null;
        this.actualizarVocalias(respuesta);
        this.vocaliaProcesandoId = null;
        this.exito = 'Resultado anterior eliminado. Selecciona nuevamente el equipo extractor y realiza un nuevo sorteo.';
      },
      error: e => { this.error = e?.error?.message ?? 'No se pudo liberar la vocalía.'; this.vocaliaProcesandoId = null; },
    });
  }
  confirmarVocalias(): void {
    if (!this.sesion || !this.vocalias.length || this.vocalias.some(item => item.estado !== 'asignada')) return;
    if (!window.confirm('¿Confirmar todas las vocalías? Después quedarán en modo de solo lectura.')) return;
    this.vocaliasCargando = true; this.error = '';
    this.partidosService.confirmarVocaliasProgramacion(this.sesion.id).subscribe({
      next: respuesta => { this.actualizarVocalias(respuesta); this.vocaliasCargando = false; this.exito = 'Vocalías confirmadas correctamente.'; },
      error: e => { this.error = e?.error?.message ?? 'No se pudieron confirmar las vocalías.'; this.vocaliasCargando = false; },
    });
  }
  partidosOrigen(vocalia: VocaliaPartido): any[] { return this.sesion?.partidos.filter(partido => partido.id !== vocalia.partidoId) ?? []; }
  candidatosVocalia(vocalia: VocaliaPartido): any[] {
    const origen = this.sesion?.partidos.find(partido => partido.id === vocalia.partidoOrigenId);
    return origen ? [origen.equipoLocal, origen.equipoVisitante].filter(Boolean) : [];
  }
  textoPartido(partido: any): string { return partido ? `${partido.equipoLocal?.nombre} vs ${partido.equipoVisitante?.nombre}` : 'Partido no disponible'; }
  textoVocal(vocalia: VocaliaPartido | undefined): string {
    if (!vocalia || vocalia.estado === 'pendiente') return 'Pendiente';
    return vocalia.tipoAsignacion === 'directivo' ? vocalia.directivoNombre ?? 'Directivo' : vocalia.equipoVocal?.nombre ?? this.nombreEquipo(vocalia.equipoVocalId);
  }
  nombreEquipo(equipoId: number | null | undefined): string {
    if (!equipoId || !this.sesion) return 'Equipo';
    for (const partido of this.sesion.partidos) {
      if (partido.equipoLocalId === equipoId) return partido.equipoLocal?.nombre ?? 'Equipo';
      if (partido.equipoVisitanteId === equipoId) return partido.equipoVisitante?.nombre ?? 'Equipo';
    }
    return 'Equipo';
  }
  vocaliaDelPartido(partidoId: number | null | undefined): VocaliaPartido | undefined { return this.vocalias.find(item => item.partidoId === partidoId); }
  get vocaliasPendientesCantidad(): number { return this.vocalias.filter(item => item.estado !== 'asignada' && item.estado !== 'confirmada').length; }
  exportarPdf(): void { const datos = this.datosExportacion(); if (datos) this.exportador.descargarPdf(datos); }
  exportarExcel(): void { const datos = this.datosExportacion(); if (datos) this.exportador.descargarExcel(datos); }
  async exportarImagenes(): Promise<void> {
    const datos = this.datosExportacion(); if (!datos) return;
    try { await this.exportador.descargarImagenes(datos); } catch { this.error = 'No se pudieron generar las imágenes de programación.'; }
  }
  logout(): void { this.authService.logout(); }
  get canchasDetectadas(): string[] {
    if (!this.etapa || !this.seleccionesActuales.length) return [];
    const seleccionadas = new Set(this.seleccionesActuales.map(item => `${item.categoriaId}:${item.jornada}`));
    return [...new Set(this.partidosProgramables
      .filter(partido => partido.etapa === this.etapa && seleccionadas.has(`${partido.categoriaId}:${partido.jornada}`) && partido.cancha?.trim())
      .map(partido => partido.cancha.trim()))].sort();
  }
  get seleccionesActuales(): Array<{ categoriaId: number; jornada: number }> {
    return this.categorias
      .map(categoria => ({ categoriaId: Number(categoria.id), jornada: Number(this.seleccionesJornada[categoria.id]) }))
      .filter(item => Number.isInteger(item.jornada) && item.jornada > 0);
  }
  jornadasPorCategoria(categoriaId: number): number[] {
    return [...new Set(this.partidosProgramables
      .filter(partido => partido.etapa === this.etapa && partido.categoriaId === categoriaId)
      .map(partido => Number(partido.jornada)))].sort((a, b) => a - b);
  }
  aplicarJornadaTodas(): void {
    if (!this.jornadaTodas) return;
    const nuevas: Record<number, number | null> = {};
    for (const categoria of this.categorias) {
      nuevas[categoria.id] = this.jornadasPorCategoria(categoria.id).includes(this.jornadaTodas) ? this.jornadaTodas : null;
    }
    this.seleccionesJornada = nuevas;
  }
  partidosSeleccionadosCategoria(categoriaId: number): number {
    const jornada = Number(this.seleccionesJornada[categoriaId]);
    if (!jornada) return 0;
    return this.partidosProgramables.filter(partido => partido.etapa === this.etapa && partido.categoriaId === categoriaId && partido.jornada === jornada).length;
  }
  get totalPartidosSeleccionados(): number {
    return this.seleccionesActuales.reduce((total, seleccion) => total + this.partidosProgramables.filter(partido =>
      partido.etapa === this.etapa && partido.categoriaId === seleccion.categoriaId && partido.jornada === seleccion.jornada,
    ).length, 0);
  }
  get bolillasManualesDisponibles(): BolillaHorario[] {
    if (!this.sesion) return [];
    const partido = this.pendientes.find(item => item.id === this.partidoSeleccionadoId);
    const solicitud = this.solicitudDelPartido(partido?.id);
    return this.sesion.bolillas.filter(bolilla => {
      if (bolilla.estado !== 'disponible') return false;
      const canchaRequerida = solicitud?.canchaSolicitada || partido?.cancha;
      if (canchaRequerida && bolilla.cancha.trim().toLowerCase() !== canchaRequerida.trim().toLowerCase()) return false;
      if (!solicitud) return true;
      return String(bolilla.fecha).slice(0, 10) === String(solicitud.fechaSolicitada).slice(0, 10)
        && bolilla.hora === solicitud.horaSolicitada;
    });
  }
  solicitudDelPartido(partidoId: number | null | undefined): SolicitudHorario | undefined {
    return this.sesion?.solicitudesHorario?.find(solicitud => solicitud.partidoId === partidoId);
  }
  get etapasHistorial(): string[] {
    return [...new Set(this.programacionesConfirmadas.map(item => item.etapa))].sort();
  }
  get jornadasHistorial(): number[] {
    return [...new Set(this.programacionesConfirmadas
      .filter(item => !this.historialEtapa || item.etapa === this.historialEtapa)
      .flatMap(item => (item.selecciones?.length ? item.selecciones : [{ categoriaId: item.categoriaId ?? null, jornada: item.jornada }]).map(seleccion => seleccion.jornada)))].sort((a, b) => a - b);
  }
  get programacionesConfirmadasFiltradas(): ProgramacionSemanalResumen[] {
    return this.programacionesConfirmadas.filter(item =>
      (!this.historialEtapa || item.etapa === this.historialEtapa)
      && (!this.historialJornada || (item.selecciones?.length ? item.selecciones : [{ categoriaId: item.categoriaId ?? null, jornada: item.jornada }]).some(seleccion => seleccion.jornada === this.historialJornada))
    );
  }
  cambiarEtapaHistorial(): void { this.historialJornada = null; }
  nombreCategoria(categoriaId: number | null | undefined): string {
    if (!categoriaId) return 'Todas las categorías';
    return this.categorias.find(categoria => categoria.id === categoriaId)?.nombre ?? `Categoría #${categoriaId}`;
  }
  nombreEtapa(etapa: string): string { return etapa.replace(/_/g, ' '); }
  resumenSelecciones(sesion: ProgramacionSemanal | ProgramacionSemanalResumen): string {
    const selecciones = sesion.selecciones?.length
      ? sesion.selecciones
      : [{ categoriaId: sesion.categoriaId ?? null, jornada: sesion.jornada }];
    return selecciones.map(seleccion => `${this.nombreCategoria(seleccion.categoriaId)} · J${seleccion.jornada}`).join(' | ');
  }
  private datosExportacion(): ProgramacionSemanalExport | null {
    if (!this.sesion) return null;
    const filas = this.sesion.bolillas.filter(bolilla => !!bolilla.partido).map(bolilla => ({
      fecha: String(bolilla.fecha).slice(0, 10), hora: bolilla.hora, cancha: bolilla.cancha,
      categoria: bolilla.partido?.categoria?.nombre ?? this.categorias.find(categoria => categoria.id === bolilla.partido?.categoriaId)?.nombre ?? 'Categoría',
      jornada: bolilla.partido?.jornada ?? this.sesion!.jornada,
      local: bolilla.partido?.equipoLocal?.nombre ?? '', visitante: bolilla.partido?.equipoVisitante?.nombre ?? '', manual: !!bolilla.asignacionManual,
      solicitudReglamentaria: !!bolilla.solicitudHorarioId,
      vocal: this.textoVocal(this.vocaliaDelPartido(bolilla.partidoId)),
    }));
    if (!filas.length) { this.error = 'Aún no existen horarios asignados para exportar.'; return null; }
    const liga = this.ligas.find(item => item.id === this.sesion!.ligaId);
    const campeonato = this.campeonatos.find(item => item.id === this.sesion!.campeonatoId);
    return { liga: liga?.nombre ?? 'Liga', ligaImagen: liga?.imagen, campeonato: campeonato?.nombre ?? 'Campeonato', seleccion: this.resumenSelecciones(this.sesion), etapa: this.sesion.etapa, jornada: this.sesion.jornada, mixta: (this.sesion.selecciones?.length ?? 1) > 1, estado: this.sesion.estado === 'confirmada' ? 'confirmada' : 'en_sorteo', filas };
  }
  private crearNuevaSesion(): void {
    const selecciones = this.seleccionesActuales;
    this.partidosService.crearProgramacionSemanal({ campeonatoId: this.campeonatoId!, categoriaId: selecciones.length === 1 ? selecciones[0].categoriaId : undefined, etapa: this.etapa.trim(), jornada: selecciones[0].jornada, selecciones, bolillas: this.bolillas }).subscribe({ next: s => { this.sesion = s; this.cargando = false; }, error: e => { this.error = e?.error?.message ?? 'No se pudo iniciar el sorteo.'; this.cargando = false; } });
  }
  private actualizarVocalias(respuesta: VocaliasProgramacion): void {
    this.vocaliasEstado = respuesta.estado;
    this.vocalias = respuesta.vocalias;
    for (const vocalia of this.vocalias) {
      this.extractoresVocalia[vocalia.id] = vocalia.equipoExtractorId ?? null;
    }
  }
  private reiniciarHistorial(): void { this.programacionesConfirmadas = []; this.historialEtapa = ''; this.historialJornada = null; }
  private cargarOpcionesProgramables(): void { if (!this.campeonatoId) return; this.partidosService.getByCampeonato(this.campeonatoId).subscribe({ next: partidos => { this.partidosProgramables = partidos.filter(p => p.estado === 'programado' && (!p.fechaPartido || !p.horaPartido)); this.etapasDisponibles = [...new Set(this.partidosProgramables.map(p => p.etapa))].sort(); }, error: () => this.error = 'No se pudieron cargar las jornadas programables.' }); }
  private refrescar(): void { if (this.sesion) this.partidosService.obtenerProgramacionSemanal(this.sesion.id).subscribe(s => this.sesion = s); }
  private minutos(hora: string): number | null { const p = hora.split(':').map(Number); return p.length === 2 && p.every(Number.isFinite) ? p[0] * 60 + p[1] : null; }
  private hora(minutos: number): string { return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`; }
}
