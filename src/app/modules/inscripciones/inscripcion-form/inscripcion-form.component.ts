import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { InscripcionesService } from '../inscripciones.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { Campeonato } from '../../campeonatos/campeonato.model';
import { Categoria } from '../../categorias/categoria.model';
import { Equipo } from '../../../core/models/equipo.model';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-inscripcion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MainNavComponent],
  templateUrl: './inscripcion-form.component.html',
  styleUrl: './inscripcion-form.component.scss'
})
export class InscripcionFormComponent implements OnInit {
  inscripcionForm: FormGroup;
  campeonatos: Campeonato[] = [];
  categorias: Categoria[] = [];
  equipos: Equipo[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  isEditMode = false;
  inscripcionId: number = 0;
  campeonatoId: number = 0;
  isReintentar = false;
  currentUser: any;
  user$: Observable<any>;

  constructor(
    private fb: FormBuilder,
    private inscripcionesService: InscripcionesService,
    private campeonatosService: CampeonatosService,
    private categoriasService: CategoriasService,
    private equiposService: EquiposService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.user$ = this.authService.currentUser$;
    this.inscripcionForm = this.fb.group({
      campeonatoId: ['', Validators.required],
      categoriaId: ['', Validators.required],
      equipoId: ['', Validators.required],
      fechaInscripcion: [''],
      observaciones: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    // Detectar modo edición
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.inscripcionId = Number(id);
    }

    // Si es dirigente_equipo y tiene equipoId, pre-seleccionar y bloquear
    if (this.currentUser?.rol?.nombre === 'dirigente_equipo' && this.currentUser?.equipoId) {
      this.inscripcionForm.patchValue({ equipoId: this.currentUser.equipoId });
      this.inscripcionForm.get('equipoId')?.disable();
    }

    // Listener para cargar categorías y equipos cuando cambia el campeonato
    this.inscripcionForm.get('campeonatoId')?.valueChanges.subscribe((campeonatoId) => {
      if (campeonatoId) {
        this.onCampeonatoChange();
      }
    });

    // Cargar campeonatos primero, luego aplicar pre-selección o cargar inscripción
    this.loadCampeonatos();
  }

  loadCampeonatos(): void {
    // Si es dirigente_equipo, primero obtener su equipo para filtrar por liga
    if (this.currentUser?.rol?.nombre === 'dirigente_equipo' && this.currentUser?.equipoId) {
      this.equiposService.getById(this.currentUser.equipoId).subscribe({
        next: (equipo) => {
          // Cargar campeonatos filtrados por la liga del equipo
          this.loadCampeonatosByLiga(equipo.ligaId);
        },
        error: (err) => {
          this.errorMessage = 'Error al cargar información del equipo';
          console.error(err);
        }
      });
    } else {
      // Para master y directivo_liga, cargar todos los campeonatos
      this.loadCampeonatosByLiga(null);
    }
  }

  loadCampeonatosByLiga(ligaId: number | null): void {
    this.campeonatosService.getAll().subscribe({
      next: (data) => {
        let campeonatosFiltrados = data;

        // Filtrar por liga si es necesario (dirigente_equipo)
        if (ligaId) {
          campeonatosFiltrados = data.filter(c => c.ligaId === ligaId);
        }

        // En modo edición, mostrar todos los campeonatos de la liga
        if (this.isEditMode) {
          this.campeonatos = campeonatosFiltrados.filter(c => c.activo);
          this.loadInscripcion();
        } else {
          // En modo crear, filtrar solo campeonatos en estado 'inscripcion_abierta'
          this.campeonatos = campeonatosFiltrados.filter(c => c.estado === 'inscripcion_abierta' && c.activo);

          // Pre-seleccionar campeonato si viene en queryParams
          const campeonatoId = this.route.snapshot.queryParamMap.get('campeonatoId');
          if (campeonatoId) {
            this.campeonatoId = Number(campeonatoId);
            this.inscripcionForm.patchValue({ campeonatoId: this.campeonatoId });
            // Las categorías se cargarán automáticamente por el valueChanges
          }

          // Pre-seleccionar categoría si viene en queryParams
          const categoriaId = this.route.snapshot.queryParamMap.get('categoriaId');
          if (categoriaId) {
            // Esperamos que las categorías se carguen primero
            setTimeout(() => {
              this.inscripcionForm.patchValue({ categoriaId: Number(categoriaId) });
            }, 500);
          }

          // Pre-seleccionar equipo si viene en queryParams (modo reintentar)
          const equipoIdParam = this.route.snapshot.queryParamMap.get('equipoId');
          if (equipoIdParam) {
            setTimeout(() => {
              this.inscripcionForm.patchValue({ equipoId: Number(equipoIdParam) });
            }, 500);
          }

          // Detectar si es un reintento de inscripción rechazada
          const reintentar = this.route.snapshot.queryParamMap.get('reintentar');
          if (reintentar === 'true') {
            this.isReintentar = true;
          }
        }
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar campeonatos';
        console.error(err);
      }
    });
  }

  loadInscripcion(): void {
    this.inscripcionesService.getById(this.inscripcionId).subscribe({
      next: (inscripcion) => {
        // Guardar campeonatoId para navegación posterior
        this.campeonatoId = inscripcion.campeonatoId;

        // Cargar categorías y equipos del campeonato
        this.onCampeonatoChange();

        // Convertir fecha al formato YYYY-MM-DD para el input type="date"
        let fechaFormateada = '';
        if (inscripcion.fechaInscripcion) {
          const fecha = new Date(inscripcion.fechaInscripcion);
          const year = fecha.getFullYear();
          const month = String(fecha.getMonth() + 1).padStart(2, '0');
          const day = String(fecha.getDate()).padStart(2, '0');
          fechaFormateada = `${year}-${month}-${day}`;
        }

        // Rellenar formulario con datos existentes
        this.inscripcionForm.patchValue({
          campeonatoId: inscripcion.campeonatoId,
          categoriaId: inscripcion.categoriaId,
          equipoId: inscripcion.equipoId,
          fechaInscripcion: fechaFormateada,
          observaciones: inscripcion.observaciones
        });
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar la inscripción';
        console.error(err);
      }
    });
  }

  onCampeonatoChange(): void {
    const campeonatoIdValue = this.inscripcionForm.get('campeonatoId')?.value;
    if (!campeonatoIdValue) {
      this.categorias = [];
      this.inscripcionForm.patchValue({ categoriaId: '' });
      return;
    }

    const campeonatoId = Number(campeonatoIdValue);
    this.campeonatoId = campeonatoId;

    // Cargar categorías del campeonato seleccionado
    this.categoriasService.getByCampeonato(campeonatoId).subscribe({
      next: (data) => {
        this.categorias = data.filter(c => c.activo).sort((a, b) => a.orden - b.orden);
        console.log('Categorías cargadas:', this.categorias);
        
        // Limpiar selección de categoría si ya no es válida
        const currentCategoriaId = this.inscripcionForm.get('categoriaId')?.value;
        if (currentCategoriaId && !this.categorias.find(c => c.id === Number(currentCategoriaId))) {
          this.inscripcionForm.patchValue({ categoriaId: '' });
        }
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar categorías';
        console.error('Error cargando categorías:', err);
        this.categorias = [];
      }
    });

    // Cargar equipos de la liga del campeonato seleccionado
    const campeonatoSeleccionado = this.campeonatos.find(c => c.id === campeonatoId);
    if (campeonatoSeleccionado) {
      this.loadEquiposPorLiga(campeonatoSeleccionado.ligaId);
    }
  }

  loadEquiposPorLiga(ligaId: number): void {
    this.equiposService.getAll().subscribe({
      next: (data) => {
        // Filtrar equipos de la liga del campeonato
        let equiposFiltrados = data.filter(e => e.ligaId === ligaId && e.activo);

        // Si es dirigente_equipo, solo mostrar su equipo
        if (this.currentUser?.rol?.nombre === 'dirigente_equipo' && this.currentUser?.equipoId) {
          equiposFiltrados = equiposFiltrados.filter(e => e.id === this.currentUser.equipoId);
        }
        
        this.equipos = equiposFiltrados;
        
        // Limpiar selección de equipo si ya no es válido (solo para master/directivo)
        const currentEquipoId = this.inscripcionForm.get('equipoId')?.value;
        if (currentEquipoId && !equiposFiltrados.find(e => e.id === Number(currentEquipoId))) {
          this.inscripcionForm.patchValue({ equipoId: '' });
        }
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar equipos';
        console.error(err);
      }
    });
  }

  onSubmit(): void {
    if (this.inscripcionForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Obtener valores del formulario (incluyendo campos deshabilitados)
    const formValues = this.inscripcionForm.getRawValue();
    const { fechaInscripcion, ...inscripcionData } = formValues;

    const formData = {
      ...inscripcionData,
      campeonatoId: Number(formValues.campeonatoId),
      categoriaId: Number(formValues.categoriaId),
      equipoId: Number(formValues.equipoId),
      // Solo incluir fechaInscripcion si tiene valor
      ...(fechaInscripcion && { fechaInscripcion })
    };

    const request = this.isEditMode
      ? this.inscripcionesService.update(this.inscripcionId, formData)
      : this.inscripcionesService.create(formData);

    request.subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = this.isEditMode 
          ? '✓ Inscripción actualizada exitosamente'
          : '✓ Inscripción creada exitosamente';
        
        // Redirigir después de 1.5 segundos para que el usuario vea el mensaje
        setTimeout(() => {
          this.router.navigate(['/inscripciones'], {
            queryParams: { campeonatoId: this.campeonatoId }
          });
        }, 1500);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al guardar la inscripción';
        console.error(err);
        this.loading = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/inscripciones'], {
      queryParams: { campeonatoId: this.campeonatoId }
    });
  }

  isDirigenteEquipo(): boolean {
    return this.currentUser?.rol?.nombre === 'dirigente_equipo';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  hasError(field: string, error: string): boolean {
    const control = this.inscripcionForm.get(field);
    return !!(control && control.hasError(error) && (control.dirty || control.touched));
  }

  getErrorMessage(field: string): string {
    const control = this.inscripcionForm.get(field);
    if (control?.hasError('required') && (control.dirty || control.touched)) {
      return 'Este campo es requerido';
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    return '';
  }
}
