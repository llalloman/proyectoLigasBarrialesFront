import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { JugadorCampeonatosService } from '../jugador-campeonatos.service';
import {
  CambioDorsalEtapa,
  JugadorCampeonato,
  OpcionesCambioDorsal,
  OpcionEtapaCambioDorsal,
  ResumenReingreso,
} from '../jugador-campeonato.model';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { LigasService } from '../../../core/services/ligas.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { PdfCarnetService } from '../../../core/services/pdf-carnet.service';
import { ListaJugadoresService } from '../../../core/services/lista-jugadores.service';
import { Liga } from '../../../core/models/liga.model';
import { Campeonato } from '../../campeonatos/campeonato.model';
import { Equipo } from '../../../core/models/equipo.model';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-jugador-campeonatos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MainNavComponent, FormsModule, SearchableSelectComponent],
  templateUrl: './jugador-campeonatos-list.component.html',
  styleUrls: ['./jugador-campeonatos-list.component.scss']
})
export class JugadorCampeonatosListComponent implements OnInit {
  jugadorCampeonatos: JugadorCampeonato[] = [];
  loading = false;
  errorMessage = '';
  user$: Observable<any>;
  showImageModal = false;
  modalImageUrl = '';
  showReviewModal = false;
  reviewLoading = false;
  reviewSaving = false;
  resumenReingreso: ResumenReingreso | null = null;
  motivoReingreso = '';
  referenciaReingreso = '';
  fechaBaja = '';
  motivoBaja = '';
  referenciaBaja = '';
  showDorsalModal = false;
  cambioDorsalLoading = false;
  cambioDorsalError = '';
  jugadorCambioDorsal: JugadorCampeonato | null = null;
  opcionesCambioDorsal: OpcionesCambioDorsal | null = null;
  cambioDorsalForm: {
    etapaCompetenciaId: number | null;
    numeroCancha: number | null;
    jornadaDesde: number;
    motivo: string;
  } = { etapaCompetenciaId: null, numeroCancha: null, jornadaDesde: 1, motivo: '' };
  searchTerm = '';
  
  // Filtros
  filterLigaId: string = '';
  filterCampeonatoId: string = '';
  filterEquipoId: string = '';
  filterEstado: string = '';
  
  // Opciones de filtros
  ligas: Liga[] = [];
  campeonatos: Campeonato[] = [];
  equipos: Equipo[] = [];
  currentUser: any;

  // Paginación
  Math = Math;
  currentPage = 1;
  pageSize = 6;
  pageSizeOptions = [6, 12, 24];
  selectedCarnetIds = new Set<number>();

  get paginatedJugadorCampeonatos(): JugadorCampeonato[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredJugadorCampeonatos.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredJugadorCampeonatos.length / this.pageSize);
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  constructor(
    private jugadorCampeonatosService: JugadorCampeonatosService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private route: ActivatedRoute,
    private router: Router,
    private ligasService: LigasService,
    private campeonatosService: CampeonatosService,
    private equiposService: EquiposService,
    private pdfCarnetService: PdfCarnetService,
    private listaJugadoresService: ListaJugadoresService
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadFilters();
    this.loadJugadorCampeonatos();
  }

  loadJugadorCampeonatos(): void {
    this.loading = true;
    this.errorMessage = '';

    this.jugadorCampeonatosService.getAll().subscribe({
      next: (data) => {
        this.jugadorCampeonatos = data;
        this.sincronizarSeleccionCarnets();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar habilitaciones:', error);
        this.errorMessage = 'Error al cargar las habilitaciones de jugadores';
        this.loading = false;
      }
    });
  }

  canCreate(): boolean {
    return this.permissions.canInscribirJugador();
  }

  canEdit(): boolean {
    return this.permissions.canEditJugadorCampeonato();
  }

  canApprove(): boolean {
    return this.permissions.canAprobarHabilitaciones();
  }

  canCambiarDorsal(jugadorCampeonato: JugadorCampeonato): boolean {
    const role = this.currentUser?.rol?.nombre;
    return (role === 'master' || role === 'directivo_liga')
      && jugadorCampeonato.estado === 'habilitado'
      && jugadorCampeonato.activo !== false;
  }

  canVerMotivoCambioDorsal(): boolean {
    const role = this.currentUser?.rol?.nombre;
    return role === 'master' || role === 'directivo_liga';
  }

  dorsalVisible(jugadorCampeonato: JugadorCampeonato): number {
    return this.conDorsalActual(jugadorCampeonato).numeroCancha;
  }

  abrirCambioDorsal(jugadorCampeonato: JugadorCampeonato): void {
    if (!this.canCambiarDorsal(jugadorCampeonato)) return;
    this.showDorsalModal = true;
    this.cambioDorsalLoading = true;
    this.cambioDorsalError = '';
    this.jugadorCambioDorsal = jugadorCampeonato;
    this.opcionesCambioDorsal = null;
    this.cambioDorsalForm = {
      etapaCompetenciaId: null,
      numeroCancha: null,
      jornadaDesde: 1,
      motivo: '',
    };
    this.jugadorCampeonatosService.getOpcionesCambioDorsal(jugadorCampeonato.id).subscribe({
      next: opciones => {
        this.opcionesCambioDorsal = opciones;
        const etapa = opciones.etapas.find(item => item.estado === 'actual' && item.puedeCambiar)
          ?? opciones.etapas.find(item => item.puedeCambiar)
          ?? opciones.etapas.find(item => item.estado === 'actual')
          ?? opciones.etapas[0];
        if (etapa) {
          this.cambioDorsalForm.etapaCompetenciaId = etapa.id;
          this.cambioDorsalForm.jornadaDesde = Math.min(
            etapa.proximaJornadaSugerida,
            opciones.jornadaLimite,
          );
        }
        this.cambioDorsalLoading = false;
      },
      error: error => {
        this.cambioDorsalError = error.error?.message || 'No se pudo cargar la información del cambio de dorsal.';
        this.cambioDorsalLoading = false;
      },
    });
  }

  cerrarCambioDorsal(): void {
    if (this.cambioDorsalLoading) return;
    this.showDorsalModal = false;
    this.jugadorCambioDorsal = null;
    this.opcionesCambioDorsal = null;
    this.cambioDorsalError = '';
  }

  get etapaCambioDorsalSeleccionada(): OpcionEtapaCambioDorsal | undefined {
    return this.opcionesCambioDorsal?.etapas.find(
      item => item.id === Number(this.cambioDorsalForm.etapaCompetenciaId),
    );
  }

  onEtapaCambioDorsalChange(): void {
    const etapa = this.etapaCambioDorsalSeleccionada;
    if (!etapa || !this.opcionesCambioDorsal) return;
    this.cambioDorsalForm.jornadaDesde = Math.min(
      etapa.proximaJornadaSugerida,
      this.opcionesCambioDorsal.jornadaLimite,
    );
    this.cambioDorsalError = '';
  }

  guardarCambioDorsal(): void {
    const jugador = this.jugadorCambioDorsal;
    const etapa = this.etapaCambioDorsalSeleccionada;
    const numero = Number(this.cambioDorsalForm.numeroCancha);
    if (!jugador || !etapa) return;
    if (!etapa.puedeCambiar) {
      this.cambioDorsalError = etapa.cambioActivo
        ? 'El jugador ya tiene un cambio activo en esta etapa.'
        : 'Esta etapa ya no permite cambios de dorsal.';
      return;
    }
    if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
      this.cambioDorsalError = 'Ingresa un dorsal entre 1 y 99.';
      return;
    }
    if (!this.cambioDorsalForm.motivo.trim()) {
      this.cambioDorsalError = 'El motivo del cambio es obligatorio.';
      return;
    }

    this.cambioDorsalLoading = true;
    this.cambioDorsalError = '';
    this.jugadorCampeonatosService.registrarCambioDorsal(jugador.id, {
      etapaCompetenciaId: etapa.id,
      numeroCancha: numero,
      jornadaDesde: Number(this.cambioDorsalForm.jornadaDesde),
      motivo: this.cambioDorsalForm.motivo.trim(),
    }).subscribe({
      next: () => {
        this.cambioDorsalLoading = false;
        this.showDorsalModal = false;
        this.jugadorCambioDorsal = null;
        this.loadJugadorCampeonatos();
      },
      error: error => {
        this.cambioDorsalError = error.error?.message || 'No se pudo registrar el cambio de dorsal.';
        this.cambioDorsalLoading = false;
      },
    });
  }

  anularCambioDorsal(jugador: JugadorCampeonato, cambio: CambioDorsalEtapa): void {
    const motivo = prompt('Ingrese el motivo de anulación del cambio de dorsal:');
    if (motivo === null) return;
    if (!motivo.trim()) {
      alert('El motivo de anulación es obligatorio.');
      return;
    }
    if (!confirm(`¿Anular el dorsal #${cambio.numeroCancha} de ${cambio.etapa?.nombre || 'esta etapa'}?`)) return;
    this.loading = true;
    this.jugadorCampeonatosService.anularCambioDorsal(jugador.id, cambio.id, motivo.trim()).subscribe({
      next: () => this.loadJugadorCampeonatos(),
      error: error => {
        this.loading = false;
        alert(error.error?.message || 'No se pudo anular el cambio de dorsal.');
      },
    });
  }

  getEstadoText(estado: string): string {
    const map: any = {
      'pendiente': 'Pendiente',
      'habilitado': 'Habilitado',
      'rechazado': 'Rechazado',
      'baja': 'Dado de Baja'
    };
    return map[estado] || estado;
  }

  aprobar(id: number): void {
    this.showReviewModal = true;
    this.cargarResumenReingreso(id);
  }

  private cargarResumenReingreso(id: number): void {
    this.reviewLoading = true;
    this.errorMessage = '';
    this.jugadorCampeonatosService.getResumenReingreso(id).subscribe({
      next: resumen => {
        this.resumenReingreso = resumen;
        this.motivoReingreso = resumen.solicitud.motivoReingreso || '';
        this.referenciaReingreso = resumen.solicitud.referenciaReingreso || '';
        this.motivoBaja = resumen.antecedente?.motivoBaja || resumen.antecedente?.observaciones || '';
        this.referenciaBaja = resumen.antecedente?.referenciaBaja || '';
        this.reviewLoading = false;
      },
      error: error => {
        this.showReviewModal = false;
        this.reviewLoading = false;
        alert(error.error?.message || 'No se pudo cargar la revision de la solicitud');
      },
    });
  }

  regularizarReingreso(): void {
    const resumen = this.resumenReingreso;
    if (!resumen?.antecedente || !this.motivoReingreso.trim()) return;
    this.reviewSaving = true;
    this.jugadorCampeonatosService.regularizarReingreso(resumen.solicitud.id, {
      habilitacionOrigenId: resumen.antecedente.id,
      motivoReingreso: this.motivoReingreso.trim(),
      referenciaReingreso: this.referenciaReingreso.trim() || undefined,
      fechaBaja: this.fechaBaja || undefined,
      motivoBaja: this.motivoBaja.trim() || undefined,
      referenciaBaja: this.referenciaBaja.trim() || undefined,
    }).subscribe({
      next: () => {
        this.reviewSaving = false;
        this.cargarResumenReingreso(resumen.solicitud.id);
        this.loadJugadorCampeonatos();
      },
      error: error => {
        this.reviewSaving = false;
        alert(error.error?.message || 'No se pudo regularizar el reingreso');
      },
    });
  }

  aprobarRevisada(): void {
    const resumen = this.resumenReingreso;
    if (!resumen || resumen.requiereRegularizacion) return;
    if (!confirm('¿Esta seguro de aprobar esta habilitacion?')) return;
    this.reviewSaving = true;
    this.jugadorCampeonatosService.aprobar(resumen.solicitud.id).subscribe({
      next: () => {
        alert(resumen.esReingreso ? 'Reingreso aprobado exitosamente' : 'Habilitacion aprobada exitosamente');
        this.cerrarRevisionReingreso();
        this.loadJugadorCampeonatos();
      },
      error: error => {
        this.reviewSaving = false;
        alert(error.error?.message || 'No se pudo aprobar la habilitacion');
      },
    });
  }

  cerrarRevisionReingreso(): void {
    this.showReviewModal = false;
    this.reviewLoading = false;
    this.reviewSaving = false;
    this.resumenReingreso = null;
    this.motivoReingreso = '';
    this.referenciaReingreso = '';
    this.fechaBaja = '';
    this.motivoBaja = '';
    this.referenciaBaja = '';
  }

  rechazar(id: number): void {
    const observaciones = prompt('Ingrese el motivo del rechazo (obligatorio):');
    
    if (!observaciones || observaciones.trim() === '') {
      alert('Debe ingresar un motivo para rechazar');
      return;
    }

    this.jugadorCampeonatosService.rechazar(id, observaciones).subscribe({
      next: () => {
        alert('Habilitación rechazada');
        this.loadJugadorCampeonatos();
      },
      error: (error) => {
        console.error('Error al rechazar:', error);
        alert('Error al rechazar la habilitación: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  darDeBaja(id: number): void {
    const motivo = prompt('Ingrese el motivo de la baja del jugador (obligatorio):');
    if (motivo === null) return;
    if (!motivo.trim()) {
      alert('Debe ingresar un motivo para dar de baja al jugador');
      return;
    }
    const referencia = prompt('Referencia o acta de la baja (opcional):') || undefined;
    if (!confirm('¿Está seguro de dar de baja a este jugador? El cupo quedará libre para registrar un nuevo jugador.')) {
      return;
    }
    this.jugadorCampeonatosService.darDeBaja(id, motivo, referencia).subscribe({
      next: () => {
        alert('Jugador dado de baja exitosamente. El cupo está disponible para un nuevo jugador.');
        this.loadJugadorCampeonatos();
      },
      error: (error: any) => {
        console.error('Error al dar de baja:', error);
        alert('Error al dar de baja: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  editar(id: number): void {
    this.router.navigate(['/jugador-campeonatos/editar', id]);
  }

  loadFilters(): void {
    // Cargar ligas (solo para master)
    if (this.currentUser?.rol?.nombre === 'master') {
      this.ligasService.getAll().subscribe({
        next: (data) => this.ligas = data,
        error: (err) => console.error('Error al cargar ligas:', err)
      });
    }
    
    // Cargar campeonatos
    this.campeonatosService.getAll().subscribe({
      next: (data) => this.campeonatos = data,
      error: (err) => console.error('Error al cargar campeonatos:', err)
    });
    
    // Cargar equipos
    this.equiposService.getAll().subscribe({
      next: (data) => this.equipos = data,
      error: (err) => console.error('Error al cargar equipos:', err)
    });
  }
  
  get filteredCampeonatos(): Campeonato[] {
    if (!this.filterLigaId) {
      return this.campeonatos;
    }
    const ligaId = Number(this.filterLigaId);
    return this.campeonatos.filter(c => c.ligaId === ligaId);
  }
  
  get filteredEquipos(): Equipo[] {
    if (!this.filterLigaId) {
      return this.equipos;
    }
    const ligaId = Number(this.filterLigaId);
    return this.equipos.filter(e => e.ligaId === ligaId);
  }

  get filteredEquiposSearchOptions(): SearchableSelectOption[] {
    return this.filteredEquipos.map((equipo) => ({
      value: String(equipo.id),
      label: equipo.nombre,
      searchText: equipo.nombre,
    }));
  }
  
  onLigaChange(): void {
    this.filterCampeonatoId = '';
    this.filterEquipoId = '';
    this.currentPage = 1;
    this.applyFilters();
  }
  
  canShowFilters(): boolean {
    const role = this.currentUser?.rol?.nombre;
    return role === 'master' || role === 'directivo_liga' || role === 'dirigente_equipo';
  }
  
  canShowLigaFilter(): boolean {
    return this.currentUser?.rol?.nombre === 'master';
  }
  
  canShowCampeonatoFilter(): boolean {
    const role = this.currentUser?.rol?.nombre;
    return role === 'master' || role === 'directivo_liga' || role === 'dirigente_equipo';
  }
  
  canShowEquipoFilter(): boolean {
    const role = this.currentUser?.rol?.nombre;
    return role === 'master' || role === 'directivo_liga';
  }
  
  applyFilters(): void {
    this.currentPage = 1;
  }
  
  clearFilters(): void {
    this.filterLigaId = '';
    this.filterCampeonatoId = '';
    this.filterEquipoId = '';
    this.filterEstado = '';
    this.searchTerm = '';
    this.currentPage = 1;
  }
  
  get filteredJugadorCampeonatos(): JugadorCampeonato[] {
    let filtered = [...this.jugadorCampeonatos];
    
    // Filtro por liga (solo master)
    if (this.filterLigaId) {
      const ligaId = Number(this.filterLigaId);
      filtered = filtered.filter(jc => jc.equipo?.ligaId === ligaId);
    }
    
    // Filtro por campeonato
    if (this.filterCampeonatoId) {
      const campeonatoId = Number(this.filterCampeonatoId);
      filtered = filtered.filter(jc => jc.campeonatoId === campeonatoId);
    }
    
    // Filtro por equipo
    if (this.filterEquipoId) {
      const equipoId = Number(this.filterEquipoId);
      filtered = filtered.filter(jc => jc.equipoId === equipoId);
    }
    
    // Filtro por estado
    if (this.filterEstado) {
      filtered = filtered.filter(jc => jc.estado === this.filterEstado);
    }
    
    // Búsqueda por texto
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(jc => 
        jc.jugador?.nombre?.toLowerCase().includes(term) ||
        jc.jugador?.cedula?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
  }

  verHistorial(jugadorId: number): void {
    // Obtener todas las habilitaciones del jugador
    this.loading = true;
    this.jugadorCampeonatosService.getByJugador(jugadorId).subscribe({
      next: (habilitaciones) => {
        this.loading = false;
        if (habilitaciones.length === 0) {
          alert('Este jugador no tiene historial de habilitaciones.');
          return;
        }

        // Formatear el historial
        let historial = `HISTORIAL DE HABILITACIONES\n\n`;
        habilitaciones.forEach((h, index) => {
          historial += `${index + 1}. Campeonato: ${h.campeonato?.nombre || 'N/A'}\n`;
          historial += `   Equipo: ${h.equipo?.nombre || 'N/A'}\n`;
          historial += `   Estado: ${this.getEstadoText(h.estado)}\n`;
          historial += `   Fecha: ${new Date(h.fechaInscripcion).toLocaleDateString()}\n`;
          if (h.observaciones) {
            historial += `   Observaciones: ${h.observaciones}\n`;
          }
          historial += `   Activo: ${h.activo ? 'Sí' : 'No'}\n\n`;
        });

        alert(historial);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading historial:', error);
        this.errorMessage = 'Error al cargar el historial del jugador';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openImageModal(imageUrl: string): void {
    this.modalImageUrl = imageUrl;
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.modalImageUrl = '';
  }

  /**
   * Verifica si el usuario puede generar carnets
   * Solo master y directivo_liga pueden generar carnets
   */
  canGenerarCarnet(jugadorCampeonato: JugadorCampeonato): boolean {
    const role = this.currentUser?.rol?.nombre;
    const isAuthorized = role === 'master' || role === 'directivo_liga';
    // activo !== false garantiza que jugadores transferidos (activo=false) no generen carnet
    const isHabilitado = jugadorCampeonato.estado === 'habilitado' && jugadorCampeonato.activo !== false;
    return isAuthorized && isHabilitado;
  }

  /**
   * Verifica si el usuario puede generar carnets masivos
   */
  canGenerarCarnetsPorEquipo(): boolean {
    const role = this.currentUser?.rol?.nombre;
    return role === 'master' || role === 'directivo_liga';
  }

  get carnetsSeleccionados(): JugadorCampeonato[] {
    return this.jugadorCampeonatos.filter(
      jc => this.selectedCarnetIds.has(jc.id) && this.canGenerarCarnet(jc)
    );
  }

  get cantidadCarnetsSeleccionados(): number {
    return this.carnetsSeleccionados.length;
  }

  get carnetsSeleccionablesPagina(): JugadorCampeonato[] {
    return this.paginatedJugadorCampeonatos.filter(jc => this.canGenerarCarnet(jc));
  }

  mostrarSeleccionCarnets(): boolean {
    return this.canGenerarCarnetsPorEquipo() &&
      this.jugadorCampeonatos.some(jc => this.canGenerarCarnet(jc));
  }

  carnetEstaSeleccionado(id: number): boolean {
    return this.selectedCarnetIds.has(id);
  }

  toggleCarnetSeleccion(jugadorCampeonato: JugadorCampeonato, seleccionado: boolean): void {
    if (!this.canGenerarCarnet(jugadorCampeonato)) return;

    if (seleccionado) {
      this.selectedCarnetIds.add(jugadorCampeonato.id);
    } else {
      this.selectedCarnetIds.delete(jugadorCampeonato.id);
    }
  }

  seleccionarCarnetsPagina(): void {
    this.carnetsSeleccionablesPagina.forEach(jc => this.selectedCarnetIds.add(jc.id));
  }

  quitarCarnetsPagina(): void {
    this.carnetsSeleccionablesPagina.forEach(jc => this.selectedCarnetIds.delete(jc.id));
  }

  limpiarSeleccionCarnets(): void {
    this.selectedCarnetIds.clear();
  }

  async descargarCarnetsSeleccionados(): Promise<void> {
    const seleccionados = this.carnetsSeleccionados.map(item => this.conDorsalActual(item));

    if (seleccionados.length === 0) {
      alert('Selecciona al menos un carnet para descargar');
      return;
    }

    if (!confirm(`¿Desea generar ${seleccionados.length} carnet(s) seleccionado(s)?`)) {
      return;
    }

    try {
      this.loading = true;
      await this.pdfCarnetService.generarCarnetsSeleccionados(seleccionados);
      alert(`Se generaron ${seleccionados.length} carnet(s) seleccionado(s)`);
    } catch (error) {
      console.error('Error al generar carnets seleccionados:', error);
      alert('Error al generar los carnets seleccionados');
    } finally {
      this.loading = false;
    }
  }

  private sincronizarSeleccionCarnets(): void {
    const idsDisponibles = new Set(
      this.jugadorCampeonatos
        .filter(jc => this.canGenerarCarnet(jc))
        .map(jc => jc.id)
    );

    this.selectedCarnetIds.forEach(id => {
      if (!idsDisponibles.has(id)) this.selectedCarnetIds.delete(id);
    });
  }

  /**
   * Genera y descarga el carnet individual de un jugador
   */
  async descargarCarnet(jugadorCampeonato: JugadorCampeonato): Promise<void> {
    if (!this.canGenerarCarnet(jugadorCampeonato)) {
      alert('No tienes permisos para generar este carnet o el jugador no está habilitado');
      return;
    }

    try {
      this.loading = true;
      await this.pdfCarnetService.generarCarnetIndividual(this.conDorsalActual(jugadorCampeonato));
      this.loading = false;
    } catch (error) {
      console.error('Error al generar carnet:', error);
      alert('Error al generar el carnet del jugador');
      this.loading = false;
    }
  }

  /**
   * Abre el carnet en una nueva pestaña
   */
  async abrirCarnet(jugadorCampeonato: JugadorCampeonato): Promise<void> {
    if (!this.canGenerarCarnet(jugadorCampeonato)) {
      alert('No tienes permisos para generar este carnet o el jugador no está habilitado');
      return;
    }

    try {
      this.loading = true;
      await this.pdfCarnetService.abrirCarnetIndividual(this.conDorsalActual(jugadorCampeonato));
      this.loading = false;
    } catch (error) {
      console.error('Error al abrir carnet:', error);
      alert('Error al abrir el carnet del jugador');
      this.loading = false;
    }
  }

  /**
   * Genera carnets de todos los jugadores habilitados del equipo filtrado
   */
  async generarCarnetsPorEquipo(): Promise<void> {
    if (!this.canGenerarCarnetsPorEquipo()) {
      alert('No tienes permisos para generar carnets masivos');
      return;
    }

    if (!this.filterCampeonatoId || !this.filterEquipoId) {
      alert('Por favor, selecciona un campeonato y un equipo primero');
      return;
    }

    // Filtrar jugadores habilitados y activos del equipo seleccionado
    // activo !== false excluye a jugadores transferidos que quedaron inactivos en este equipo
    const jugadoresHabilitados = this.filteredJugadorCampeonatos.filter(
      jc => jc.estado === 'habilitado' && jc.activo !== false
    );

    if (jugadoresHabilitados.length === 0) {
      alert('No hay jugadores habilitados para este equipo en el campeonato seleccionado');
      return;
    }

    if (!confirm(`¿Desea generar ${jugadoresHabilitados.length} carnet(s) para el equipo?`)) {
      return;
    }

    try {
      this.loading = true;
      await this.pdfCarnetService.generarCarnetsPorEquipo(
        jugadoresHabilitados.map(item => this.conDorsalActual(item)),
      );
      this.loading = false;
      alert(`Se generaron ${jugadoresHabilitados.length} carnet(s) exitosamente`);
    } catch (error) {
      console.error('Error al generar carnets por equipo:', error);
      alert('Error al generar los carnets del equipo');
      this.loading = false;
    }
  }

  /**
   * Muestra el botón de carnets por equipo
   */
  showCarnetsPorEquipoButton(): boolean {
    return this.canGenerarCarnetsPorEquipo() && 
           !!this.filterCampeonatoId && 
           !!this.filterEquipoId &&
           this.filteredJugadorCampeonatos.some(jc => jc.estado === 'habilitado' && jc.activo !== false);
  }

  /**
   * Muestra los botones de descarga de lista cuando hay jugadores habilitados visibles.
   * Disponible para todos los roles.
   * No requiere filtro de equipo ni campeonato, funciona con cualquier combinación de filtros.
   */
  showDescargaListaButton(): boolean {
    return this.filteredJugadorCampeonatos.some(jc => jc.estado === 'habilitado' && jc.activo !== false);
  }

  /**
   * Obtiene el nombre del campeonato. Si hay filtro, usa ese nombre.
   * Si no hay filtro, intenta derivarlo de los datos: si todos comparten el mismo
   * campeonato muestra ese nombre; si hay varios, muestra 'Todos'.
   */
  private getNombreCampeonato(): string {
    if (this.filterCampeonatoId) {
      const c = this.campeonatos.find(x => x.id === Number(this.filterCampeonatoId));
      return c?.nombre || 'Campeonato';
    }
    const habilitados = this.filteredJugadorCampeonatos.filter(jc => jc.estado === 'habilitado' && jc.activo !== false);
    const nombres = [...new Set(habilitados.map(jc => jc.campeonato?.nombre).filter(n => !!n))];
    return nombres.length === 1 ? (nombres[0] as string) : 'Todos';
  }

  /**
   * Obtiene el nombre del equipo. Si hay filtro, usa ese nombre.
   * Si no hay filtro, intenta derivarlo de los datos: si todos comparten el mismo
   * equipo muestra ese nombre; si hay varios, muestra 'Todos'.
   */
  private getNombreEquipo(): string {
    if (this.filterEquipoId) {
      const e = this.equipos.find(x => x.id === Number(this.filterEquipoId));
      return e?.nombre || 'Equipo';
    }
    const habilitados = this.filteredJugadorCampeonatos.filter(jc => jc.estado === 'habilitado' && jc.activo !== false);
    const nombres = [...new Set(habilitados.map(jc => jc.equipo?.nombre).filter(n => !!n))];
    return nombres.length === 1 ? (nombres[0] as string) : 'Todos';
  }

  /**
   * Obtiene la categoría. Si todos los habilitados visibles comparten la misma
   * categoría muestra ese nombre; si hay varias, muestra 'Todas'.
   * Se basa en jc.categoria?.nombre que viene eager-cargado desde el backend.
   */
  private getNombreCategoria(): string {
    const habilitados = this.filteredJugadorCampeonatos.filter(jc => jc.estado === 'habilitado' && jc.activo !== false);
    const nombres = [...new Set(habilitados.map(jc => jc.categoria?.nombre).filter(n => !!n))];
    return nombres.length === 1 ? (nombres[0] as string) : 'Todas';
  }

  /**
   * Devuelve la URL del escudo del equipo cuando hay un único equipo en la vista.
   * Se usa para incluirlo en el PDF.
   */
  private getEquipoImagenUrl(): string | undefined {
    if (this.filterEquipoId) {
      const e = this.equipos.find(x => x.id === Number(this.filterEquipoId));
      return e?.imagen || undefined;
    }
    const habilitados = this.filteredJugadorCampeonatos.filter(jc => jc.estado === 'habilitado' && jc.activo !== false);
    const imagenes = [...new Set(habilitados.map(jc => jc.equipo?.imagen).filter(n => !!n))];
    return imagenes.length === 1 ? (imagenes[0] as string) : undefined;
  }

  /**
   * Descarga la lista de jugadores habilitados en formato PDF.
   * Los jugadores se ordenan por número de camiseta (ascendente) dentro del servicio.
   */
  async descargarListaPDF(): Promise<void> {
    try {
      this.loading = true;
      await this.listaJugadoresService.descargarListaPDF(
        this.filteredJugadorCampeonatos.map(item => this.conDorsalActual(item)),
        this.getNombreCampeonato(),
        this.getNombreEquipo(),
        this.getEquipoImagenUrl(),
        this.getNombreCategoria()
      );
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Descarga la lista de jugadores habilitados en formato Excel (.xlsx).
   * Los jugadores se ordenan por número de camiseta (ascendente) dentro del servicio.
   */
  descargarListaExcel(): void {
    try {
      this.listaJugadoresService.descargarListaExcel(
        this.filteredJugadorCampeonatos.map(item => this.conDorsalActual(item)),
        this.getNombreCampeonato(),
        this.getNombreEquipo()
      );
    } catch (error) {
      console.error('Error al generar Excel:', error);
      alert('Error al generar el Excel');
    }
  }

  private conDorsalActual(jugadorCampeonato: JugadorCampeonato): JugadorCampeonato {
    const cambioActual = jugadorCampeonato.cambiosDorsalActivos?.find(
      cambio => cambio.etapa?.estado === 'actual',
    );
    return cambioActual
      ? { ...jugadorCampeonato, numeroCancha: cambioActual.numeroCancha }
      : jugadorCampeonato;
  }
}
