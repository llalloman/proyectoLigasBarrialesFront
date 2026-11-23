import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { PartidosService } from '../partidos.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { InscripcionesService } from '../../inscripciones/inscripciones.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-partido-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MainNavComponent, SearchableSelectComponent],
  templateUrl: './partido-form.component.html',
  styleUrls: ['./partido-form.component.scss'],
})
export class PartidoFormComponent implements OnInit {
  partidoForm: FormGroup;
  isEditMode = false;
  partidoId: number | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';
  private parametrosRetorno: Record<string, string | number | null> = {};
  user$ = this.authService.currentUser$;
  private suppressCascade = false;

  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];
  equipos: any[] = [];

  get equiposLocalOptions(): SearchableSelectOption[] {
    const visitanteId = Number(this.partidoForm.get('equipoVisitanteId')?.value || 0);
    return this.equipos.map(equipo => ({
      value: equipo.id,
      label: equipo.nombre,
      secondary: equipo.representante ? `Representante: ${equipo.representante}` : undefined,
      searchText: `${equipo.nombre} ${equipo.representante ?? ''}`,
      disabled: visitanteId > 0 && Number(equipo.id) === visitanteId,
    }));
  }

  get equiposVisitanteOptions(): SearchableSelectOption[] {
    const localId = Number(this.partidoForm.get('equipoLocalId')?.value || 0);
    return this.equipos.map(equipo => ({
      value: equipo.id,
      label: equipo.nombre,
      secondary: equipo.representante ? `Representante: ${equipo.representante}` : undefined,
      searchText: `${equipo.nombre} ${equipo.representante ?? ''}`,
      disabled: localId > 0 && Number(equipo.id) === localId,
    }));
  }

  estadosOpciones = [
    { value: 'programado', label: 'Programado' },
    { value: 'en_juego', label: 'En juego' },
    { value: 'jugado', label: 'Jugado' },
    { value: 'suspendido', label: 'Suspendido' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  constructor(
    private fb: FormBuilder,
    private partidosService: PartidosService,
    private ligasService: LigasService,
    private campeonatosService: CampeonatosService,
    private categoriasService: CategoriasService,
    private inscripcionesService: InscripcionesService,
    public permissions: PermissionsService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.partidoForm = this.fb.group({
      ligaId: [''],
      campeonatoId: ['', Validators.required],
      categoriaId: ['', Validators.required],
      equipoLocalId: ['', Validators.required],
      equipoVisitanteId: ['', Validators.required],
      etapa: ['Fase Regular', [Validators.required, Validators.maxLength(100)]],
      jornada: [1, [Validators.required, Validators.min(1)]],
      fechaPartido: [''],
      horaPartido: [''],
      cancha: ['', Validators.maxLength(200)],
      estado: ['programado'],
      observaciones: [''],
    });
  }

  ngOnInit(): void {
    // Conserva filtros, estado rápido y página cuando se llegó desde el
    // listado de partidos. Si se abre la URL directamente, queda vacío.
    this.parametrosRetorno = this.route.snapshot.queryParams;
    if (!this.permissions.canEditPartido()) {
      this.volverAPartidos();
      return;
    }
    this.loadLigas();

    this.partidoForm.get('ligaId')?.valueChanges.subscribe((ligaId) => {
      if (this.suppressCascade) return;
      this.campeonatos = [];
      this.categorias = [];
      this.equipos = [];
      this.partidoForm.patchValue({ campeonatoId: '', categoriaId: '' });
      if (ligaId) this.loadCampeonatos(ligaId);
    });

    this.partidoForm.get('campeonatoId')?.valueChanges.subscribe((campeonatoId) => {
      if (this.suppressCascade) return;
      this.categorias = [];
      this.equipos = [];
      this.partidoForm.patchValue({ categoriaId: '' });
      if (campeonatoId) this.loadCategorias(campeonatoId);
    });

    this.partidoForm.get('categoriaId')?.valueChanges.subscribe((categoriaId) => {
      if (this.suppressCascade) return;
      this.equipos = [];
      if (categoriaId) this.loadEquipos(categoriaId);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.partidoId = +id;
      this.loadPartido();
    }
  }

  loadLigas(): void {
    this.ligasService.getAll().subscribe({
      next: (data) => {
        this.ligas = data;
        const user = this.authService.getCurrentUser();
        if (user?.rol?.nombre === 'directivo_liga' && user.ligaId) {
          this.partidoForm.patchValue({ ligaId: user.ligaId });
          this.partidoForm.get('ligaId')?.disable();
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

  loadEquipos(categoriaId: number): void {
    this.inscripcionesService.getByCategoria(categoriaId).subscribe({
      next: (inscripciones) => {
        const seen = new Set<number>();
        this.equipos = inscripciones
          .filter((i) => i.estado === 'confirmada' && i.equipo)
          .filter((i) => {
            if (seen.has(i.equipoId)) return false;
            seen.add(i.equipoId);
            return true;
          })
          .map((i) => i.equipo);
      },
    });
  }

  loadPartido(): void {
    if (!this.partidoId) return;
    this.loading = true;
    this.partidosService.getById(this.partidoId).subscribe({
      next: (partido) => {
        const ligaId = partido.campeonato?.ligaId;
        this.suppressCascade = true;

        // Cargar campeonatos → categorias → equipos antes de patchear
        this.campeonatosService.getByLiga(ligaId).subscribe({
          next: (campeonatos) => {
            this.campeonatos = campeonatos;
            this.categoriasService.getByCampeonato(partido.campeonatoId).subscribe({
              next: (categorias) => {
                this.categorias = categorias;
                this.inscripcionesService.getByCategoria(partido.categoriaId).subscribe({
                  next: (inscripciones) => {
                    const seen = new Set<number>();
                    this.equipos = inscripciones
                      .filter((i) => (i.estado === 'confirmada' || i.estado === 'transferida') && i.equipo)
                      .filter((i) => {
                        if (seen.has(i.equipoId)) return false;
                        seen.add(i.equipoId);
                        return true;
                      })
                      .map((i) => i.equipo);

                    // Patchear todo el formulario con los datos del partido
                    this.partidoForm.patchValue({
                      ligaId: ligaId,
                      campeonatoId: partido.campeonatoId,
                      categoriaId: partido.categoriaId,
                      equipoLocalId: partido.equipoLocalId,
                      equipoVisitanteId: partido.equipoVisitanteId,
                      etapa: partido.etapa,
                      jornada: partido.jornada,
                      fechaPartido: partido.fechaPartido?.substring(0, 10) ?? '',
                      horaPartido: partido.horaPartido ?? '',
                      cancha: partido.cancha ?? '',
                      estado: partido.estado,
                      observaciones: partido.observaciones ?? '',
                    });

                    // Bloquear campos estructurales en modo edición
                    const camposEstructurales = [
                      'ligaId', 'campeonatoId', 'categoriaId',
                      'etapa', 'jornada', 'equipoLocalId', 'equipoVisitanteId'
                    ];
                    camposEstructurales.forEach(campo =>
                      this.partidoForm.get(campo)?.disable()
                    );

                    this.suppressCascade = false;
                    this.loading = false;
                  },
                  error: () => {
                    this.errorMessage = 'Error al cargar los equipos del partido';
                    this.suppressCascade = false;
                    this.loading = false;
                  },
                });
              },
              error: () => {
                this.errorMessage = 'Error al cargar las categorías del partido';
                this.suppressCascade = false;
                this.loading = false;
              },
            });
          },
          error: () => {
            this.errorMessage = 'Error al cargar los campeonatos del partido';
            this.suppressCascade = false;
            this.loading = false;
          },
        });
      },
      error: () => {
        this.errorMessage = 'Error al cargar el partido';
        this.loading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.partidoForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    const formValue = this.partidoForm.getRawValue();
    const { ligaId, ...payloadBase } = formValue;
    // Fecha y hora son opcionales: un partido puede permanecer en el fixture
    // sin programación (incluidos los que se resolverán administrativamente).
    // Enviar cadena vacía hacía que la validación del DTO la interpretara como
    // una fecha inválida, aunque el campo no sea obligatorio.
    const payload = {
      ...payloadBase,
      fechaPartido: payloadBase.fechaPartido || null,
      horaPartido: payloadBase.horaPartido || null,
      cancha: payloadBase.cancha?.trim() || null,
    };

    const operacion = this.isEditMode
      ? this.partidosService.update(this.partidoId!, payload)
      : this.partidosService.create(payload);

    operacion.subscribe({
      next: () => {
        this.successMessage = this.isEditMode ? 'Partido actualizado.' : 'Partido creado.';
        this.loading = false;
        setTimeout(() => this.volverAPartidos(), 1500);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Error al guardar el partido';
        this.loading = false;
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }

  volverAPartidos(): void {
    this.router.navigate(['/partidos'], { queryParams: this.parametrosRetorno });
  }
}
