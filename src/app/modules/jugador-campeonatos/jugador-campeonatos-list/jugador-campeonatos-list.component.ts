import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { JugadorCampeonatosService } from '../jugador-campeonatos.service';
import { JugadorCampeonato } from '../jugador-campeonato.model';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { LigasService } from '../../../core/services/ligas.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { PdfCarnetService } from '../../../core/services/pdf-carnet.service';
import { Liga } from '../../../core/models/liga.model';
import { Campeonato } from '../../campeonatos/campeonato.model';
import { Equipo } from '../../../core/models/equipo.model';

@Component({
  selector: 'app-jugador-campeonatos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MainNavComponent, FormsModule],
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

  constructor(
    private jugadorCampeonatosService: JugadorCampeonatosService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private route: ActivatedRoute,
    private router: Router,
    private ligasService: LigasService,
    private campeonatosService: CampeonatosService,
    private equiposService: EquiposService,
    private pdfCarnetService: PdfCarnetService
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

  getEstadoText(estado: string): string {
    const map: any = {
      'pendiente': 'Pendiente',
      'habilitado': 'Habilitado',
      'rechazado': 'Rechazado'
    };
    return map[estado] || estado;
  }

  aprobar(id: number): void {
    if (!confirm('¿Está seguro de aprobar esta habilitación?')) {
      return;
    }

    const observaciones = prompt('Observaciones (opcional):');
    
    this.jugadorCampeonatosService.aprobar(id, observaciones || undefined).subscribe({
      next: () => {
        alert('Habilitación aprobada exitosamente');
        this.loadJugadorCampeonatos();
      },
      error: (error) => {
        console.error('Error al aprobar:', error);
        alert('Error al aprobar la habilitación: ' + (error.error?.message || 'Error desconocido'));
      }
    });
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
  
  onLigaChange(): void {
    // Al cambiar la liga, limpiar los filtros dependientes
    this.filterCampeonatoId = '';
    this.filterEquipoId = '';
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
    // Los filtros se aplican automáticamente mediante computed property
  }
  
  clearFilters(): void {
    this.filterLigaId = '';
    this.filterCampeonatoId = '';
    this.filterEquipoId = '';
    this.filterEstado = '';
    this.searchTerm = '';
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
  }

  clearSearch(): void {
    this.searchTerm = '';
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
    const isHabilitado = jugadorCampeonato.estado === 'habilitado';
    return isAuthorized && isHabilitado;
  }

  /**
   * Verifica si el usuario puede generar carnets masivos
   */
  canGenerarCarnetsPorEquipo(): boolean {
    const role = this.currentUser?.rol?.nombre;
    return role === 'master' || role === 'directivo_liga';
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
      await this.pdfCarnetService.generarCarnetIndividual(jugadorCampeonato);
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
      await this.pdfCarnetService.abrirCarnetIndividual(jugadorCampeonato);
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

    // Filtrar jugadores habilitados del equipo seleccionado
    const jugadoresHabilitados = this.filteredJugadorCampeonatos.filter(
      jc => jc.estado === 'habilitado'
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
      await this.pdfCarnetService.generarCarnetsPorEquipo(jugadoresHabilitados);
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
           this.filteredJugadorCampeonatos.some(jc => jc.estado === 'habilitado');
  }
}
