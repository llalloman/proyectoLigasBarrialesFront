import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { ReportesExportService } from '../reportes-export.service';
import { ReporteCampeonato } from '../reportes.model';
import { ReportesService } from '../reportes.service';

@Component({
  selector: 'app-reportes-campeonato',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainNavComponent],
  templateUrl: './reportes-campeonato.component.html',
  styleUrls: ['./reportes-campeonato.component.scss'],
})
export class ReportesCampeonatoComponent implements OnInit {
  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];
  ligaId: number | null = null;
  campeonatoId: number | null = null;
  categoriaId: number | null = null;
  etapa = '';

  reporte: ReporteCampeonato | null = null;
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
    private readonly reportesService: ReportesService,
    private readonly exportService: ReportesExportService,
  ) {}

  ngOnInit(): void {
    this.cargarLigas();
  }

  get esMaster(): boolean {
    return this.authService.getCurrentUser()?.rol?.nombre === 'master';
  }

  get etapas(): string[] {
    return this.reporte?.opciones.etapas ?? [];
  }

  get estados(): Array<{ clave: string; etiqueta: string; valor: number; clase: string }> {
    if (!this.reporte) return [];
    const estado = this.reporte.estadosPartidos;
    return [
      { clave: 'jugados', etiqueta: 'Jugados', valor: estado.jugados, clase: 'jugado' },
      { clave: 'programados', etiqueta: 'Programados', valor: estado.programados, clase: 'programado' },
      { clave: 'enJuego', etiqueta: 'En juego', valor: estado.enJuego, clase: 'en-juego' },
      { clave: 'suspendidos', etiqueta: 'Suspendidos', valor: estado.suspendidos, clase: 'suspendido' },
      { clave: 'cancelados', etiqueta: 'Cancelados', valor: estado.cancelados, clase: 'cancelado' },
    ];
  }

  cargarLigas(): void {
    this.ligasService.getAll().subscribe({
      next: (ligas) => {
        this.ligas = ligas.filter((liga: any) => liga.activo !== false);
        const usuario = this.authService.getCurrentUser();
        if (!this.esMaster && usuario?.ligaId) {
          this.ligaId = usuario.ligaId;
          this.cargarCampeonatos(usuario.ligaId);
        }
      },
      error: () => this.errorMessage = 'No se pudieron cargar las ligas.',
    });
  }

  onLigaChange(): void {
    this.campeonatos = [];
    this.categorias = [];
    this.campeonatoId = null;
    this.categoriaId = null;
    this.etapa = '';
    this.reporte = null;
    if (this.ligaId) this.cargarCampeonatos(this.ligaId);
  }

  cargarCampeonatos(ligaId: number): void {
    this.campeonatosService.getByLiga(ligaId).subscribe({
      next: (campeonatos) => this.campeonatos = campeonatos.filter((campeonato: any) => campeonato.activo !== false),
      error: () => this.errorMessage = 'No se pudieron cargar los campeonatos.',
    });
  }

  onCampeonatoChange(): void {
    this.categorias = [];
    this.categoriaId = null;
    this.etapa = '';
    this.reporte = null;
    if (!this.campeonatoId) return;
    this.categoriasService.getByCampeonato(this.campeonatoId).subscribe({
      next: (categorias) => this.categorias = categorias.filter((categoria: any) => categoria.activo !== false),
      error: () => this.errorMessage = 'No se pudieron cargar las categorías.',
    });
    this.consultar();
  }

  onCategoriaChange(): void {
    this.etapa = '';
    this.consultar();
  }

  consultar(): void {
    if (!this.campeonatoId) return;
    this.loading = true;
    this.errorMessage = '';
    const consultaId = ++this.consultaId;
    this.reportesService.obtenerCampeonato({
      campeonatoId: this.campeonatoId,
      categoriaId: this.categoriaId,
      etapa: this.etapa || undefined,
    }).subscribe({
      next: (reporte) => {
        if (consultaId !== this.consultaId) return;
        this.reporte = reporte;
        if (this.etapa && !reporte.opciones.etapas.includes(this.etapa)) this.etapa = '';
        this.loading = false;
      },
      error: (error) => {
        if (consultaId !== this.consultaId) return;
        this.errorMessage = error?.error?.message ?? 'No se pudo generar el reporte.';
        this.loading = false;
      },
    });
  }

  porcentajeEstado(valor: number): number {
    if (!this.reporte?.resumen.totalPartidos) return 0;
    return Math.round((valor / this.reporte.resumen.totalPartidos) * 10000) / 100;
  }

  nombreEtapa(valor: string | null): string {
    return valor
      ? valor.replace(/_/g, ' ').replace(/\b\w/g, (letra) => letra.toUpperCase())
      : 'Todas las etapas';
  }

  descargarPdf(): void {
    if (!this.reporte) return;
    this.exportando = true;
    try {
      this.exportService.descargarPdf(this.reporte);
    } finally {
      this.exportando = false;
    }
  }

  descargarExcel(): void {
    if (!this.reporte) return;
    this.exportando = true;
    try {
      this.exportService.descargarExcel(this.reporte);
    } finally {
      this.exportando = false;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
