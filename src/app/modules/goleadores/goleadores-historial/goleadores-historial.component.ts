import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../shared/components/searchable-select/searchable-select.component';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import {
  EstadoHistorialGol,
  HistorialGolFiltros,
  HistorialGolItem,
  HistorialGolesRespuesta,
  TipoGol,
} from '../goleadores.model';
import { GoleadoresService } from '../goleadores.service';
import { GoleadoresHistorialExportService } from '../goleadores-historial-export.service';

@Component({
  selector: 'app-goleadores-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainNavComponent, SearchableSelectComponent],
  templateUrl: './goleadores-historial.component.html',
  styleUrls: ['./goleadores-historial.component.scss'],
})
export class GoleadoresHistorialComponent implements OnInit {
  readonly Math = Math;
  readonly pageSizeOptions = [20, 50, 100];

  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];
  selectedLigaId: number | null = null;
  selectedCampeonatoId: number | null = null;
  selectedCategoriaId: number | null = null;

  etapa = '';
  jornada: number | null = null;
  equipoId: number | null = null;
  jugadorId: number | null = null;
  tipo: TipoGol | '' = '';
  fechaDesde = '';
  fechaHasta = '';
  estado: EstadoHistorialGol = 'activos';

  items: HistorialGolItem[] = [];
  opciones: HistorialGolesRespuesta['opciones'] = {
    etapas: [], jornadas: [], jornadasPorEtapa: {}, equipos: [], jugadores: [],
  };
  resumen: HistorialGolesRespuesta['resumen'] = {
    registros: 0, golesJugador: 0, penales: 0, autogoles: 0,
  };

  pagina = 1;
  limite = 20;
  total = 0;
  totalPaginas = 0;
  consultado = false;
  loading = false;
  exportando = false;
  errorMessage = '';
  private consultaId = 0;

  user$ = this.authService.currentUser$;

  constructor(
    private readonly authService: AuthService,
    private readonly ligasService: LigasService,
    private readonly campeonatosService: CampeonatosService,
    private readonly categoriasService: CategoriasService,
    private readonly goleadoresService: GoleadoresService,
    private readonly exportService: GoleadoresHistorialExportService,
  ) {}

  ngOnInit(): void {
    this.cargarLigas();
  }

  logout(): void {
    this.authService.logout();
  }

  cargarLigas(): void {
    this.ligasService.getAll().subscribe({
      next: (ligas) => {
        this.ligas = ligas;
        const usuario = this.authService.getCurrentUser();
        if (usuario?.rol?.nombre !== 'master' && usuario?.ligaId) {
          this.selectedLigaId = usuario.ligaId;
          this.cargarCampeonatos(usuario.ligaId);
        }
      },
      error: () => this.errorMessage = 'No se pudieron cargar las ligas.',
    });
  }

  onLigaChange(): void {
    this.campeonatos = [];
    this.categorias = [];
    this.selectedCampeonatoId = null;
    this.selectedCategoriaId = null;
    this.reiniciarConsulta();
    if (this.selectedLigaId) this.cargarCampeonatos(this.selectedLigaId);
  }

  cargarCampeonatos(ligaId: number): void {
    this.campeonatosService.getByLiga(ligaId).subscribe({
      next: (campeonatos) => this.campeonatos = campeonatos,
      error: () => this.errorMessage = 'No se pudieron cargar los campeonatos.',
    });
  }

  onCampeonatoChange(): void {
    this.categorias = [];
    this.selectedCategoriaId = null;
    this.reiniciarConsulta();
    if (this.selectedCampeonatoId) {
      this.categoriasService.getByCampeonato(this.selectedCampeonatoId).subscribe({
        next: (categorias) => this.categorias = categorias,
        error: () => this.errorMessage = 'No se pudieron cargar las categorías.',
      });
      this.buscar(1);
    }
  }

  onCategoriaChange(): void {
    this.reiniciarConsulta();
    if (this.selectedCampeonatoId) this.buscar(1);
  }

  onEtapaChange(): void {
    if (this.jornada && !this.jornadasDisponibles.includes(Number(this.jornada))) {
      this.jornada = null;
    }
  }

  onEquipoChange(): void {
    if (this.jugadorId && !this.jugadoresDisponibles.some(
      jugador => jugador.id === Number(this.jugadorId),
    )) {
      this.jugadorId = null;
    }
  }

  get jornadasDisponibles(): number[] {
    return this.etapa
      ? (this.opciones.jornadasPorEtapa[this.etapa] ?? [])
      : this.opciones.jornadas;
  }

  get jugadoresDisponibles(): Array<{ id: number; nombre: string; equipoIds: number[] }> {
    if (!this.equipoId) return this.opciones.jugadores;
    const equipoId = Number(this.equipoId);
    return this.opciones.jugadores.filter(jugador => jugador.equipoIds.includes(equipoId));
  }

  get equiposSearchOptions(): SearchableSelectOption[] {
    return this.opciones.equipos.map(equipo => ({
      value: equipo.id,
      label: equipo.nombre,
      searchText: equipo.nombre,
    }));
  }

  get jugadoresSearchOptions(): SearchableSelectOption[] {
    return this.jugadoresDisponibles.map(jugador => ({
      value: jugador.id,
      label: jugador.nombre,
      searchText: jugador.nombre,
    }));
  }

  buscar(pagina = 1): void {
    if (!this.selectedCampeonatoId) return;
    if (this.fechaDesde && this.fechaHasta && this.fechaDesde > this.fechaHasta) {
      this.errorMessage = 'La fecha desde no puede ser posterior a la fecha hasta.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const consultaId = ++this.consultaId;
    this.goleadoresService.getHistorial(this.crearFiltros(pagina, this.limite)).subscribe({
      next: (respuesta) => {
        if (consultaId !== this.consultaId) return;
        this.items = respuesta.items;
        this.opciones = respuesta.opciones;
        this.resumen = respuesta.resumen;
        this.total = respuesta.total;
        this.pagina = respuesta.pagina;
        this.totalPaginas = respuesta.totalPaginas;
        this.consultado = true;
        this.loading = false;
      },
      error: (error) => {
        if (consultaId !== this.consultaId) return;
        this.errorMessage = error?.error?.message ?? 'No se pudo consultar el historial de goles.';
        this.loading = false;
      },
    });
  }

  limpiarFiltrosAvanzados(): void {
    this.etapa = '';
    this.jornada = null;
    this.equipoId = null;
    this.jugadorId = null;
    this.tipo = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.estado = 'activos';
    if (this.selectedCampeonatoId) this.buscar(1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas || pagina === this.pagina) return;
    this.buscar(pagina);
  }

  cambiarLimite(): void {
    if (this.selectedCampeonatoId) this.buscar(1);
  }

  get paginasVisibles(): number[] {
    if (this.totalPaginas <= 7) {
      return Array.from({ length: this.totalPaginas }, (_, indice) => indice + 1);
    }
    const paginas = new Set([1, this.totalPaginas]);
    for (let pagina = this.pagina - 2; pagina <= this.pagina + 2; pagina++) {
      if (pagina > 1 && pagina < this.totalPaginas) paginas.add(pagina);
    }
    return Array.from(paginas).sort((a, b) => a - b);
  }

  async descargarPdf(): Promise<void> {
    const registros = await this.obtenerRegistrosExportacion();
    if (registros) this.exportService.descargarPdf(this.datosExportacion(registros));
  }

  async descargarExcel(): Promise<void> {
    const registros = await this.obtenerRegistrosExportacion();
    if (registros) this.exportService.descargarExcel(this.datosExportacion(registros));
  }

  tipoLabel(tipo: TipoGol): string {
    if (tipo === 'penal') return 'Penal';
    if (tipo === 'autogol') return 'Autogol';
    return 'Normal';
  }

  etapaLabel(etapa: string): string {
    return etapa ? etapa.replace(/_/g, ' ').replace(/\b\w/g, letra => letra.toUpperCase()) : 'Sin etapa';
  }

  fechaLabel(fecha: string | null): string {
    if (!fecha) return 'Sin fecha';
    const [anio, mes, dia] = fecha.slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  }

  marcador(item: HistorialGolItem): string {
    return item.golesLocal == null || item.golesVisitante == null
      ? '—'
      : `${item.golesLocal} - ${item.golesVisitante}`;
  }

  private crearFiltros(pagina: number, limite: number): HistorialGolFiltros {
    return {
      campeonatoId: this.selectedCampeonatoId!,
      categoriaId: this.selectedCategoriaId,
      etapa: this.etapa,
      jornada: this.jornada,
      equipoId: this.equipoId,
      jugadorId: this.jugadorId,
      tipo: this.tipo,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      estado: this.estado,
      pagina,
      limite,
    };
  }

  private async obtenerRegistrosExportacion(): Promise<HistorialGolItem[] | null> {
    if (!this.total || !this.selectedCampeonatoId) return null;
    if (this.total > 10000) {
      this.errorMessage = 'La exportación admite hasta 10.000 registros. Aplica más filtros antes de descargar.';
      return null;
    }

    this.exportando = true;
    this.errorMessage = '';
    try {
      const respuesta = await firstValueFrom(
        this.goleadoresService.getHistorial(this.crearFiltros(1, Math.max(this.total, 1))),
      );
      return respuesta.items;
    } catch (error: any) {
      this.errorMessage = error?.error?.message ?? 'No se pudieron preparar los datos para exportar.';
      return null;
    } finally {
      this.exportando = false;
    }
  }

  private datosExportacion(registros: HistorialGolItem[]) {
    const liga = this.ligas.find(item => item.id === Number(this.selectedLigaId));
    const campeonato = this.campeonatos.find(item => item.id === Number(this.selectedCampeonatoId));
    const categoria = this.categorias.find(item => item.id === Number(this.selectedCategoriaId));
    return {
      ligaNombre: liga?.nombre ?? 'Liga Barrial',
      campeonatoNombre: campeonato?.nombre ?? 'Campeonato',
      categoriaNombre: categoria?.nombre ?? 'Todas las categorías',
      filtrosDescripcion: this.descripcionFiltros(),
      registros,
    };
  }

  private descripcionFiltros(): string {
    const filtros: string[] = [];
    if (this.etapa) filtros.push(`Etapa: ${this.etapaLabel(this.etapa)}`);
    if (this.jornada) filtros.push(`Jornada: ${this.jornada}`);
    const equipo = this.opciones.equipos.find(item => item.id === Number(this.equipoId));
    if (equipo) filtros.push(`Equipo: ${equipo.nombre}`);
    const jugador = this.opciones.jugadores.find(item => item.id === Number(this.jugadorId));
    if (jugador) filtros.push(`Jugador: ${jugador.nombre}`);
    if (this.tipo) filtros.push(`Tipo: ${this.tipoLabel(this.tipo)}`);
    if (this.fechaDesde) filtros.push(`Desde: ${this.fechaLabel(this.fechaDesde)}`);
    if (this.fechaHasta) filtros.push(`Hasta: ${this.fechaLabel(this.fechaHasta)}`);
    if (this.estado !== 'activos') filtros.push(`Estado: ${this.estado}`);
    return filtros.length ? filtros.join(' · ') : 'Sin filtros adicionales';
  }

  private reiniciarConsulta(): void {
    this.consultaId++;
    this.items = [];
    this.opciones = { etapas: [], jornadas: [], jornadasPorEtapa: {}, equipos: [], jugadores: [] };
    this.resumen = { registros: 0, golesJugador: 0, penales: 0, autogoles: 0 };
    this.total = 0;
    this.totalPaginas = 0;
    this.pagina = 1;
    this.consultado = false;
    this.loading = false;
    this.errorMessage = '';
    this.etapa = '';
    this.jornada = null;
    this.equipoId = null;
    this.jugadorId = null;
    this.tipo = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.estado = 'activos';
  }
}
