import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JugadorCampeonatosService } from '../jugador-campeonatos.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { JugadoresService } from '../../../core/services/jugadores.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { InscripcionesService } from '../../inscripciones/inscripciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import {
  JugadorCampeonato,
  CreateJugadorCampeonatoDto,
  UpdateJugadorCampeonatoDto,
} from '../jugador-campeonato.model';
import { Campeonato } from '../../campeonatos/campeonato.model';
import { Equipo } from '../../../core/models/equipo.model';
import { Jugador } from '../../../core/models/jugador.model';
import { Categoria } from '../../categorias/categoria.model';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-jugador-campeonato-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MainNavComponent],
  templateUrl: './jugador-campeonato-form.component.html',
  styleUrls: ['./jugador-campeonato-form.component.scss'],
})
export class JugadorCampeonatoFormComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  jugadorCampeonatoId: number | null = null;
  campeonatos: Campeonato[] = [];
  equipos: Equipo[] = [];
  jugadores: Jugador[] = [];
  categorias: Categoria[] = [];
  loading = false;
  errorMessage = '';
  currentRole = '';
  currentEquipoId: number | null = null;
  user$ = this.authService.currentUser$;
  
  // Contador de habilitaciones
  habilitadosCount: number = 0;
  maxHabilitados: number = 20;
  showLimitInfo: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private jugadorCampeonatosService: JugadorCampeonatosService,
    private campeonatosService: CampeonatosService,
    private equiposService: EquiposService,
    private jugadoresService: JugadoresService,
    private categoriasService: CategoriasService,
    private inscripcionesService: InscripcionesService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      campeonatoId: [null, Validators.required],
      equipoId: [null, Validators.required],
      jugadorId: [null, Validators.required],
      categoriaId: [null, Validators.required],
      numeroCancha: [''],
      posicion: [''],
      observaciones: [''],
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.currentRole = currentUser?.rol?.nombre || '';
    this.currentEquipoId = currentUser?.equipoId || null;

    // Si es dirigente_equipo, pre-seleccionar su equipo
    if (this.currentRole === 'dirigente_equipo' && this.currentEquipoId) {
      this.form.patchValue({ equipoId: this.currentEquipoId });
      this.form.get('equipoId')?.disable();
    }

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.jugadorCampeonatoId = Number(id);
        this.loadJugadorCampeonato();
      }
    });

    this.loadCampeonatos();
    this.loadEquipos();
    // No cargar categorías hasta que se seleccione un campeonato

    // Cargar categoría del equipo cuando se seleccione campeonato o equipo
    this.form.get('campeonatoId')?.valueChanges.subscribe(() => {
      this.loadCategoriaDelEquipo();
      this.loadContadorHabilitados();
    });

    this.form.get('equipoId')?.valueChanges.subscribe((equipoId) => {
      if (equipoId) {
        this.loadJugadoresByEquipo(equipoId);
      }
      this.loadCategoriaDelEquipo();
      this.loadContadorHabilitados();
    });

    // Auto-completar datos del jugador cuando se seleccione
    this.form.get('jugadorId')?.valueChanges.subscribe((jugadorId) => {
      if (jugadorId) {
        const jugador = this.jugadores.find((j) => j.id === Number(jugadorId));
        if (jugador) {
          this.form.patchValue({
            numeroCancha: jugador.numeroCancha || '',
            posicion: jugador.posicion || '',
          });
        }
      }
    });
  }

  loadCampeonatos(): void {
    this.campeonatosService.getAll().subscribe({
      next: (campeonatos) => {
        // Solo campeonatos con inscripcion_abierta
        this.campeonatos = campeonatos.filter(
          (c) => c.estado === 'inscripcion_abierta'
        );
      },
      error: (error) => {
        console.error('Error loading campeonatos:', error);
        this.errorMessage = 'Error al cargar los campeonatos';
      },
    });
  }

  loadEquipos(): void {
    this.equiposService.getAll().subscribe({
      next: (equipos) => {
        this.equipos = equipos;
        // Si es dirigente, pre-cargar jugadores de su equipo
        if (this.currentEquipoId) {
          this.loadJugadoresByEquipo(this.currentEquipoId);
        }
      },
      error: (error) => {
        console.error('Error loading equipos:', error);
        this.errorMessage = 'Error al cargar los equipos';
      },
    });
  }

  loadJugadoresByEquipo(equipoId: number): void {
    this.jugadoresService.getByEquipo(equipoId).subscribe({
      next: (jugadores) => {
        this.jugadores = jugadores;
      },
      error: (error) => {
        console.error('Error loading jugadores:', error);
        this.errorMessage = 'Error al cargar los jugadores';
      },
    });
  }

  loadCategorias(): void {
    // Método deprecado - usar loadCategoriasByCampeonato
    this.categoriasService.getAll().subscribe({
      next: (categorias) => {
        this.categorias = categorias;
      },
      error: (error) => {
        console.error('Error loading categorias:', error);
        this.errorMessage = 'Error al cargar las categorías';
      },
    });
  }

  loadCategoriasByCampeonato(campeonatoId: number): void {
    this.categoriasService.getByCampeonato(campeonatoId).subscribe({
      next: (categorias) => {
        this.categorias = categorias;
        // Limpiar categoría seleccionada si ya no está en la lista
        const categoriaActual = this.form.get('categoriaId')?.value;
        if (categoriaActual && !categorias.find(c => c.id === Number(categoriaActual))) {
          this.form.patchValue({ categoriaId: null });
        }
      },
      error: (error) => {
        console.error('Error loading categorias by campeonato:', error);
        this.errorMessage = 'Error al cargar las categorías del campeonato';
      },
    });
  }

  /**
   * Cargar solo la categoría del equipo basada en su inscripción
   */
  loadCategoriaDelEquipo(): void {
    const campeonatoId = this.form.get('campeonatoId')?.value;
    const equipoId = this.form.get('equipoId')?.value;

    // Limpiar si falta algún campo
    if (!campeonatoId || !equipoId) {
      this.categorias = [];
      this.form.patchValue({ categoriaId: null });
      return;
    }

    // Buscar la inscripción del equipo en este campeonato
    this.inscripcionesService.getByCampeonato(Number(campeonatoId)).subscribe({
      next: (inscripciones) => {
        const inscripcion = inscripciones.find(
          (i) => i.equipoId === Number(equipoId) && i.estado === 'confirmada'
        );

        if (inscripcion && inscripcion.categoria) {
          // Mostrar SOLO la categoría de la inscripción
          this.categorias = [inscripcion.categoria];
          // Pre-seleccionar automáticamente
          this.form.patchValue({ categoriaId: inscripcion.categoriaId });
          // Deshabilitar el campo para que no se pueda cambiar
          this.form.get('categoriaId')?.disable();
        } else {
          // Si no hay inscripción confirmada, limpiar
          this.categorias = [];
          this.form.patchValue({ categoriaId: null });
          this.form.get('categoriaId')?.enable();
        }
      },
      error: (error) => {
        console.error('Error loading inscripción:', error);
        this.categorias = [];
        this.form.patchValue({ categoriaId: null });
      },
    });
  }

  /**
   * Cargar contador de jugadores habilitados
   */
  loadContadorHabilitados(): void {
    const campeonatoId = this.form.get('campeonatoId')?.value;
    const equipoId = this.form.get('equipoId')?.value;

    // Ocultar info si falta algún campo
    if (!campeonatoId || !equipoId) {
      this.showLimitInfo = false;
      return;
    }

    // Obtener el límite del campeonato seleccionado
    const campeonato = this.campeonatos.find(c => c.id === Number(campeonatoId));
    this.maxHabilitados = campeonato?.maxJugadoresHabilitados || 20;

    // Contar habilitados actuales
    this.jugadorCampeonatosService.getByCampeonatoAndEquipo(Number(campeonatoId), Number(equipoId)).subscribe({
      next: (habilitaciones) => {
        // Contar solo los que están en estado 'habilitado'
        this.habilitadosCount = habilitaciones.filter(h => h.estado === 'habilitado' && h.activo).length;
        this.showLimitInfo = true;
      },
      error: (error) => {
        console.error('Error loading contador habilitados:', error);
        this.showLimitInfo = false;
      },
    });
  }

  loadJugadorCampeonato(): void {
    if (!this.jugadorCampeonatoId) return;

    this.loading = true;
    this.jugadorCampeonatosService.getById(this.jugadorCampeonatoId).subscribe({
      next: (jugadorCampeonato) => {
        // Cargar jugadores del equipo PRIMERO y esperar a que se complete
        if (jugadorCampeonato.equipoId) {
          this.jugadoresService.getByEquipo(jugadorCampeonato.equipoId).subscribe({
            next: (jugadores) => {
              this.jugadores = jugadores;
              
              // AHORA sí patchear los valores después de cargar jugadores
              this.form.patchValue({
                campeonatoId: jugadorCampeonato.campeonatoId,
                equipoId: jugadorCampeonato.equipoId,
                jugadorId: jugadorCampeonato.jugadorId,
                categoriaId: jugadorCampeonato.categoriaId,
                numeroCancha: jugadorCampeonato.numeroCancha,
                posicion: jugadorCampeonato.posicion,
                observaciones: jugadorCampeonato.observaciones,
              });

              // Forzar la actualización de la vista y deshabilitar campos después
              // de que Angular haya renderizado las opciones del select
              this.cdr.detectChanges();
              
              setTimeout(() => {
                this.form.get('campeonatoId')?.disable();
                this.form.get('equipoId')?.disable();
                this.form.get('jugadorId')?.disable();
              }, 100);

              // Cargar la categoría del equipo (solo la inscrita)
              this.loadCategoriaDelEquipo();

              this.loading = false;
            },
            error: (error) => {
              console.error('Error loading jugadores:', error);
              this.errorMessage = 'Error al cargar los jugadores';
              this.loading = false;
            }
          });
        } else {
          // Si no hay equipoId, solo patchear valores
          this.form.patchValue({
            campeonatoId: jugadorCampeonato.campeonatoId,
            equipoId: jugadorCampeonato.equipoId,
            jugadorId: jugadorCampeonato.jugadorId,
            categoriaId: jugadorCampeonato.categoriaId,
            numeroCancha: jugadorCampeonato.numeroCancha,
            posicion: jugadorCampeonato.posicion,
            observaciones: jugadorCampeonato.observaciones,
          });

          this.form.get('campeonatoId')?.disable();
          this.form.get('equipoId')?.disable();
          this.form.get('jugadorId')?.disable();
          
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading jugador campeonato:', error);
        this.errorMessage = 'Error al cargar la habilitación';
        this.loading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.form.valid || (this.form.invalid && this.form.get('categoriaId')?.disabled)) {
      this.loading = true;
      this.errorMessage = '';

      // Usar getRawValue() para incluir campos deshabilitados
      const formValue = this.form.getRawValue();
      
      // Obtener equipoId (puede estar deshabilitado)
      const equipoId = formValue.equipoId || this.currentEquipoId;

      if (this.isEditMode && this.jugadorCampeonatoId) {
        const updateDto: UpdateJugadorCampeonatoDto = {
          categoriaId: Number(formValue.categoriaId),
          numeroCancha: formValue.numeroCancha ? Number(formValue.numeroCancha) : undefined,
          posicion: formValue.posicion || undefined,
        };
        this.jugadorCampeonatosService
          .update(this.jugadorCampeonatoId, updateDto)
          .subscribe({
            next: () => {
              this.router.navigate(['/jugador-campeonatos']);
            },
            error: (error) => {
              console.error('Error updating jugador campeonato:', error);
              this.errorMessage =
                error.error?.message ||
                'Error al actualizar la habilitación';
              this.loading = false;
            },
          });
      } else {
        const createDto: CreateJugadorCampeonatoDto = {
          jugadorId: Number(formValue.jugadorId),
          campeonatoId: Number(formValue.campeonatoId),
          equipoId: Number(equipoId),
          categoriaId: Number(formValue.categoriaId),
          numeroCancha: Number(formValue.numeroCancha) || 0,
          posicion: formValue.posicion || '',
        };
        this.jugadorCampeonatosService.create(createDto).subscribe({
          next: () => {
            this.router.navigate(['/jugador-campeonatos']);
          },
          error: (error) => {
            console.error('Error creating jugador campeonato:', error);
            this.errorMessage =
              error.error?.message || 'Error al crear la habilitación';
            this.loading = false;
          },
        });
      }
    } else {
      this.markFormGroupTouched(this.form);
    }
  }

  logout(): void {
    this.authService.logout();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.router.navigate(['/jugador-campeonatos']);
  }
}
