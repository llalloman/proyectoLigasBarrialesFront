import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TransferenciasService } from '../transferencias.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { PdfTransferenciaService } from '../../../core/services/pdf-transferencia.service';
import { Transferencia } from '../transferencia.model';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { Observable, map, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-transferencias-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MainNavComponent
  ],
  templateUrl: './transferencias-list.component.html',
  styleUrls: ['./transferencias-list.component.scss'],
})
export class TransferenciasListComponent implements OnInit {
  transferencias: Transferencia[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  user$ = this.authService.currentUser$;
  currentUser: any = null;
  currentEquipoId: number | null = null;

  // Filtros
  ligas: any[] = [];
  campeonatos: any[] = [];
  equipos: any[] = [];
  estados = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'rechazado', label: 'Rechazado' }
  ];

  selectedLigaId: number | null = null;
  selectedCampeonatoId: number | null = null;
  selectedEquipoOrigenId: number | null = null;
  selectedEquipoDestinoId: number | null = null;
  selectedEstado: string = '';
  fechaDesde: string = '';
  fechaHasta: string = '';

  // Autocomplete para jugadores
  jugadorControl = new FormControl('');
  filteredJugadores$!: Observable<any[]>;

  constructor(
    private transferenciasService: TransferenciasService,
    public permissions: PermissionsService,
    private authService: AuthService,
    private ligasService: LigasService,
    private campeonatosService: CampeonatosService,
    private equiposService: EquiposService,
    private pdfTransferenciaService: PdfTransferenciaService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.currentUser = user;
        this.currentEquipoId = user.equipoId || null;
      }
    });
    this.loadTransferencias();
    if (this.canShowFilters()) {
      this.loadFilters();
    }

    // Configurar autocomplete para jugadores
    // Se filtra desde las transferencias cargadas
    this.filteredJugadores$ = this.jugadorControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterJugadores(value || ''))
    );
  }

  canShowFilters(): boolean {
    return this.permissions.isMaster() || 
           this.permissions.isDirectivo() ||
           this.permissions.isDirigente();
  }

  loadFilters(): void {
    if(!this.canShowFilters()) return;

    // Cargar ligas (solo master y directivo_liga)
    if (this.permissions.isMaster() || this.permissions.isDirectivo()) {
      this.ligasService.getAll().subscribe({
        next: (ligas: any[]) => {
          this.ligas = ligas.filter((l: any) => l.activo);
        },
        error: (error: any) => console.error('Error loading ligas:', error)
      });
    }

    // Cargar campeonatos
    this.campeonatosService.getAll().subscribe({
      next: (campeonatos) => {
        this.campeonatos = campeonatos.filter((c: any) => c.activo);
      },
      error: (error) => console.error('Error loading campeonatos:', error)
    });

    // Cargar equipos
    this.equiposService.getAll().subscribe({
      next: (equipos: any[]) => {
        this.equipos = equipos.filter((e: any) => e.activo);
      },
      error: (error: any) => console.error('Error loading equipos:', error)
    });
  }

  get filteredCampeonatos(): any[] {
    if (!this.selectedLigaId) {
      return this.campeonatos;
    }
    return this.campeonatos.filter(c => c.ligaId === this.selectedLigaId);
  }

  get filteredEquiposOrigen(): any[] {
    // Si hay campeonato seleccionado y los equipos tienen inscripciones, filtrar por campeonato
    if (this.selectedCampeonatoId) {
      const equiposConInscripcion = this.equipos.filter((e: any) => {
        return e.inscripciones?.some((i: any) => i.campeonatoId === this.selectedCampeonatoId);
      });
      // Si encontramos equipos con inscripciones, usarlos; si no, devolver todos
      return equiposConInscripcion.length > 0 ? equiposConInscripcion : this.equipos;
    }
    
    return this.equipos;
  }

  get filteredEquiposDestino(): any[] {
    // Si hay campeonato seleccionado y los equipos tienen inscripciones, filtrar por campeonato
    if (this.selectedCampeonatoId) {
      const equiposConInscripcion = this.equipos.filter((e: any) => {
        return e.inscripciones?.some((i: any) => i.campeonatoId === this.selectedCampeonatoId);
      });
      // Si encontramos equipos con inscripciones, usarlos; si no, devolver todos
      return equiposConInscripcion.length > 0 ? equiposConInscripcion : this.equipos;
    }
    
    return this.equipos;
  }

  onLigaChange(): void {
    this.selectedCampeonatoId = null;
    this.selectedEquipoOrigenId = null;
    this.selectedEquipoDestinoId = null;

    // Recargar equipos de la liga seleccionada
    if (this.selectedLigaId) {
      this.equiposService.getByLiga(this.selectedLigaId).subscribe({
        next: (equipos: any[]) => {
          this.equipos = equipos.filter((e: any) => e.activo);
        },
        error: (error: any) => console.error('Error loading equipos by liga:', error)
      });
    } else {
      // Si no hay liga seleccionada, cargar todos los equipos
      this.equiposService.getAll().subscribe({
        next: (equipos: any[]) => {
          this.equipos = equipos.filter((e: any) => e.activo);
        },
        error: (error: any) => console.error('Error loading equipos:', error)
      });
    }
  }

  onCampeonatoChange(): void {
    this.selectedEquipoOrigenId = null;
    this.selectedEquipoDestinoId = null;
  }

  private _filterJugadores(value: string | any): any[] {
    // Obtener jugadores únicos de las transferencias actuales
    const jugadoresUnicos = new Map();
    
    this.transferencias.forEach(t => {
      if (t.jugador && !jugadoresUnicos.has(t.jugador.id)) {
        jugadoresUnicos.set(t.jugador.id, t.jugador);
      }
    });
    
    const jugadoresArray = Array.from(jugadoresUnicos.values());
    
    // Si no hay valor o es un objeto (jugador ya seleccionado), mostrar todos
    if (!value || typeof value === 'object') {
      return jugadoresArray.slice(0, 20);
    }
    
    // Si es string vacío, mostrar todos
    if (typeof value === 'string' && value.trim() === '') {
      return jugadoresArray.slice(0, 20);
    }
    
    // Filtrar por nombre o cédula
    const filterValue = value.toLowerCase().trim();
    const filtered = jugadoresArray.filter(j => 
      j.nombreCompleto?.toLowerCase().includes(filterValue) ||
      j.nombre?.toLowerCase().includes(filterValue) ||
      j.cedula?.includes(filterValue)
    );
    
    return filtered.slice(0, 20);
  }

  displayJugador(jugador: any): string {
    return jugador ? `${jugador.nombreCompleto || jugador.nombre} (${jugador.cedula})` : '';
  }

  applyFilters(): void {
    // Los filtros se aplican automáticamente a través del getter filteredTransferencias
  }

  clearFilters(): void {
    this.selectedLigaId = null;
    this.selectedCampeonatoId = null;
    this.selectedEquipoOrigenId = null;
    this.selectedEquipoDestinoId = null;
    this.selectedEstado = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.jugadorControl.setValue('');
  }

  get filteredTransferencias(): Transferencia[] {
    let filtered = this.transferencias;

    // Filtro por liga (solo para master y directivo_liga)
    if (this.selectedLigaId && (this.permissions.isMaster() || this.permissions.isDirectivo())) {
      filtered = filtered.filter(t => t.campeonato?.ligaId === this.selectedLigaId);
    }

    // Filtro por campeonato
    if (this.selectedCampeonatoId) {
      filtered = filtered.filter(t => t.campeonatoId === this.selectedCampeonatoId);
    }

    // Filtro por equipo origen
    if (this.selectedEquipoOrigenId) {
      filtered = filtered.filter(t => t.equipoOrigenId === this.selectedEquipoOrigenId);
    }

    // Filtro por equipo destino
    if (this.selectedEquipoDestinoId) {
      filtered = filtered.filter(t => t.equipoDestinoId === this.selectedEquipoDestinoId);
    }

    // Filtro por estado
    if (this.selectedEstado) {
      filtered = filtered.filter(t => {
        const estadoCompleto = this.getEstadoCompleto(t);
        return estadoCompleto === this.selectedEstado;
      });
    }

    // Filtro por jugador (autocomplete)
    const jugadorValue = this.jugadorControl.value as any;
    if (jugadorValue) {
      // Si es un objeto (jugador seleccionado), filtrar por ID exacto
      if (typeof jugadorValue === 'object' && jugadorValue.id) {
        filtered = filtered.filter(t => t.jugadorId === jugadorValue.id);
      }
      // Si es un string (está escribiendo), filtrar por coincidencia en nombre o cédula
      else if (typeof jugadorValue === 'string' && jugadorValue.trim() !== '') {
        const searchValue = jugadorValue.toLowerCase().trim();
        filtered = filtered.filter(t => 
          t.jugador?.nombreCompleto?.toLowerCase().includes(searchValue) ||
          t.jugador?.nombre?.toLowerCase().includes(searchValue) ||
          t.jugador?.cedula?.includes(searchValue)
        );
      }
    }

    // Filtro por fecha desde
    if (this.fechaDesde) {
      const desde = new Date(this.fechaDesde);
      filtered = filtered.filter(t => {
        const fechaSolicitud = new Date(t.fechaSolicitud);
        return fechaSolicitud >= desde;
      });
    }

    // Filtro por fecha hasta
    if (this.fechaHasta) {
      const hasta = new Date(this.fechaHasta);
      filtered = filtered.filter(t => {
        const fechaSolicitud = new Date(t.fechaSolicitud);
        return fechaSolicitud <= hasta;
      });
    }

    // Si es dirigente de equipo, solo muestra sus transferencias
    if (this.permissions.isDirigente() && this.currentEquipoId) {
      filtered = filtered.filter(t => 
        t.equipoOrigenId === this.currentEquipoId || 
        t.equipoDestinoId === this.currentEquipoId
      );
    }

    return filtered;
  }

  getEstadoCompleto(transferencia: Transferencia): string {
    if (
      transferencia.estadoEquipoOrigen === 'aprobado' &&
      transferencia.estadoDirectivo === 'aprobado'
    ) {
      return 'aprobado';
    }
    if (
      transferencia.estadoEquipoOrigen === 'rechazado' ||
      transferencia.estadoDirectivo === 'rechazado'
    ) {
      return 'rechazado';
    }
    return 'pendiente';
  }

  viewCedulaImage(imageUrl: string | undefined): void {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    } else {
      alert('No hay imagen de cédula disponible para este jugador');
    }
  }

  loadTransferencias(): void {
    this.loading = true;
    this.errorMessage = '';
    this.transferenciasService.getAll().subscribe({
      next: (transferencias) => {
        this.transferencias = transferencias;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading transferencias:', error);
        this.errorMessage = 'Error al cargar las transferencias';
        this.loading = false;
      },
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'aprobado':
        return 'badge-aprobado';
      case 'rechazado':
        return 'badge-rechazado';
      case 'pendiente':
        return 'badge-pendiente';
      default:
        return '';
    }
  }

  getEstadoCompletoClass(transferencia: Transferencia): string {
    if (
      transferencia.estadoEquipoOrigen === 'aprobado' &&
      transferencia.estadoDirectivo === 'aprobado'
    ) {
      return 'badge-aprobado';
    }
    if (
      transferencia.estadoEquipoOrigen === 'rechazado' ||
      transferencia.estadoDirectivo === 'rechazado'
    ) {
      return 'badge-rechazado';
    }
    return 'badge-pendiente';
  }

  getEstadoCompletoText(transferencia: Transferencia): string {
    if (
      transferencia.estadoEquipoOrigen === 'aprobado' &&
      transferencia.estadoDirectivo === 'aprobado'
    ) {
      return 'Completada';
    }
    if (
      transferencia.estadoEquipoOrigen === 'rechazado' ||
      transferencia.estadoDirectivo === 'rechazado'
    ) {
      return 'Rechazada';
    }
    return 'En Proceso';
  }

  cancelar(id: number): void {
    if (confirm('¿Está seguro de cancelar esta transferencia?')) {
      this.transferenciasService.cancelar(id).subscribe({
        next: () => {
          this.successMessage = 'Transferencia cancelada';
          this.loadTransferencias();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error canceling transferencia:', error);
          this.errorMessage =
            error.error?.message || 'Error al cancelar la transferencia';
        },
      });
    }
  }

  canCancelar(transferencia: Transferencia): boolean {
    // Solo puede cancelar el equipo DESTINO (el que solicitó la transferencia)
    // Y solo si ambos estados están pendientes
    return (
      this.permissions.canCancelarTransferencia() &&
      this.currentEquipoId === transferencia.equipoDestinoId &&
      transferencia.estadoEquipoOrigen === 'pendiente' &&
      transferencia.estadoDirectivo === 'pendiente'
    );
  }

  /**
   * Verifica si el usuario puede descargar el PDF del acta de transferencia
   * - Master y Directivo: pueden descargar cualquier PDF
   * - Dirigente: solo puede descargar si su equipo es el destino (recibe al jugador)
   */
  canDownloadPdf(transferencia: Transferencia): boolean {
    // Master y directivo pueden descargar cualquier PDF
    if (this.permissions.isMaster() || this.permissions.isDirectivo()) {
      return true;
    }

    // Dirigente solo puede descargar si su equipo es el destino
    if (this.permissions.isDirigente() && this.currentEquipoId) {
      return transferencia.equipoDestinoId === this.currentEquipoId;
    }

    return false;
  }

  /**
   * Genera y descarga el PDF del acta de transferencia
   */
  async descargarPdf(transferencia: Transferencia): Promise<void> {
    // Validación adicional de seguridad
    if (!this.canDownloadPdf(transferencia)) {
      this.errorMessage = 'No tienes permisos para descargar este PDF';
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
      return;
    }

    try {
      await this.pdfTransferenciaService.generarPdfTransferencia(transferencia);
      this.successMessage = 'PDF generado exitosamente';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.errorMessage = 'Error al generar el PDF';
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
    }
  }

  /**
   * Abre el PDF en una nueva pestaña
   */
  abrirPdf(transferencia: Transferencia): void {
    // Validación adicional de seguridad
    if (!this.canDownloadPdf(transferencia)) {
      this.errorMessage = 'No tienes permisos para visualizar este PDF';
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
      return;
    }

    try {
      this.pdfTransferenciaService.abrirPdfTransferencia(transferencia);
    } catch (error) {
      console.error('Error opening PDF:', error);
      this.errorMessage = 'Error al abrir el PDF';
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
