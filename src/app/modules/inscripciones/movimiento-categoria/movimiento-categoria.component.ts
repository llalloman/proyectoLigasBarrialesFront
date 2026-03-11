import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InscripcionesService } from '../inscripciones.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { LigasService } from '../../../core/services/ligas.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-movimiento-categoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MainNavComponent],
  templateUrl: './movimiento-categoria.component.html',
  styleUrls: ['./movimiento-categoria.component.scss'],
})
export class MovimientoCategoriaComponent implements OnInit {
  form: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  user$ = this.authService.currentUser$;

  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];
  equiposDisponibles: any[] = []; // equipos con inscripción confirmada en el campeonato

  constructor(
    private fb: FormBuilder,
    private inscripcionesService: InscripcionesService,
    private campeonatosService: CampeonatosService,
    private categoriasService: CategoriasService,
    private ligasService: LigasService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      ligaId:          ['', Validators.required],
      campeonatoId:    ['', Validators.required],
      equipoId:        ['', Validators.required],
      categoriaNuevaId:['', Validators.required],
      motivo:          ['ascenso', Validators.required],
      observaciones:   [''],
    });
  }

  ngOnInit(): void {
    if (!this.permissions.isDirectivo() && !this.permissions.isMaster()) {
      this.router.navigate(['/inscripciones']);
      return;
    }
    this.loadLigas();

    // Cascada liga → campeonato
    this.form.get('ligaId')?.valueChanges.subscribe((ligaId) => {
      this.campeonatos = [];
      this.categorias = [];
      this.equiposDisponibles = [];
      this.form.patchValue({ campeonatoId: '', equipoId: '', categoriaNuevaId: '' });
      if (ligaId) this.loadCampeonatos(ligaId);
    });

    // Cascada campeonato → equipos y categorías
    this.form.get('campeonatoId')?.valueChanges.subscribe((campeonatoId) => {
      this.categorias = [];
      this.equiposDisponibles = [];
      this.form.patchValue({ equipoId: '', categoriaNuevaId: '' });
      if (campeonatoId) {
        this.loadEquiposConfirmados(campeonatoId);
        this.loadCategorias(campeonatoId);
      }
    });
  }

  loadLigas(): void {
    this.ligasService.getAll().subscribe({
      next: (data) => {
        this.ligas = data;
        const user = this.authService.getCurrentUser();
        if (user?.rol?.nombre === 'directivo_liga' && user.ligaId) {
          this.form.patchValue({ ligaId: user.ligaId });
          this.form.get('ligaId')?.disable();
        }
      },
    });
  }

  loadCampeonatos(ligaId: number): void {
    this.campeonatosService.getByLiga(ligaId).subscribe({
      next: (data) => (this.campeonatos = data),
    });
  }

  loadCategorias(campeonatoId: number): void {
    this.categoriasService.getByCampeonato(campeonatoId).subscribe({
      next: (data) => (this.categorias = data),
    });
  }

  loadEquiposConfirmados(campeonatoId: number): void {
    // Carga inscripciones 'confirmadas' del campeonato para obtener los equipos disponibles
    this.inscripcionesService.getByCampeonato(campeonatoId).subscribe({
      next: (inscripciones) => {
        this.equiposDisponibles = inscripciones
          .filter((i) => i.estado === 'confirmada' && i.equipo)
          .map((i) => ({ ...i.equipo, categoriaActual: i.categoria?.nombre ?? '' }));
      },
    });
  }

  /**
   * Devuelve las categorías disponibles para el destino.
   * Excluye la categoría actual del equipo seleccionado.
   */
  get categoriasDestino(): any[] {
    const equipoId = Number(this.form.get('equipoId')?.value);
    if (!equipoId) return this.categorias;
    const inscr = this.equiposDisponibles.find((e) => e.id === equipoId);
    return this.categorias.filter(
      (c) => c.nombre !== inscr?.categoriaActual
    );
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const raw = this.form.getRawValue();
    this.inscripcionesService.registrarMovimientoCategoria({
      campeonatoId: Number(raw.campeonatoId),
      equipoId:     Number(raw.equipoId),
      categoriaNuevaId: Number(raw.categoriaNuevaId),
      motivo:       raw.motivo,
      observaciones: raw.observaciones || undefined,
    }).subscribe({
      next: () => {
        this.successMessage = `Movimiento registrado correctamente. El equipo ha sido ${raw.motivo === 'ascenso' ? 'ascendido' : 'descendido'}.`;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/inscripciones']), 2000);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Error al registrar el movimiento';
        this.loading = false;
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
