import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EquiposService } from '../../../core/services/equipos.service';
import { LigasService } from '../../../core/services/ligas.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { Liga } from '../../../core/models/liga.model';
import { Usuario } from '../../../core/models/usuario.model';
import { Observable } from 'rxjs';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-equipo-form',
  templateUrl: './equipo-form.component.html',
  styleUrl: './equipo-form.component.scss',
  standalone: false
})
export class EquipoFormComponent implements OnInit {
  equipoForm!: FormGroup;
  isEditMode = false;
  equipoId: number | null = null;
  loading = false;
  errorMessage = '';
  ligas: Liga[] = [];
  dirigentes: Usuario[] = [];
  user$: Observable<Usuario | null>;
  isMaster = false;

  constructor(
    private fb: FormBuilder,
    private equiposService: EquiposService,
    private ligasService: LigasService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    // Verificar permisos antes de continuar
    if (!this.permissions.canCreateEquipo() && !this.isEditMode) {
      this.router.navigate(['/equipos']);
      return;
    }
    
    if (this.isEditMode && !this.permissions.canEditEquipo()) {
      this.router.navigate(['/equipos']);
      return;
    }

    this.checkUserRole();
    this.loadLigas();
    this.initForm();

    // Escuchar cambios en el campo ligaId para recargar dirigentes
    this.equipoForm.get('ligaId')?.valueChanges.subscribe(ligaId => {
      if (ligaId) {
        this.loadDirigentesByLiga(ligaId);
      } else {
        this.dirigentes = [];
        this.equipoForm.patchValue({ dirigenteId: '' });
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.equipoId = +id;
      this.loadEquipo(this.equipoId);
    }
  }

  checkUserRole(): void {
    this.authService.user$.subscribe((user: Usuario | null) => {
      if (user) {
        this.isMaster = user.rol.nombre === 'master';
      }
    });
  }

  initForm(): void {
    this.equipoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      representante: [''],
      fundacion: [''],
      descripcion: [''],
      imagen: [''],
      ligaId: ['', Validators.required],
      dirigenteId: ['', Validators.required]
    });
  }

  loadLigas(): void {
    const currentUser = this.authService.getCurrentUser();
    const rolNombre = currentUser?.rol?.nombre;

    // Verificar si el usuario tiene liga asignada según su rol
    if (rolNombre === 'directivo_liga') {
      if (!currentUser?.ligaId) {
        this.errorMessage = 'No tienes una liga asignada. No puedes crear equipos. Contacta al administrador.';
        this.ligas = [];
        return;
      }
      // Directivo de liga solo puede crear equipos en SU liga
      this.ligasService.getAll().subscribe({
        next: (ligas) => {
          this.ligas = ligas.filter(liga => liga.activo && liga.id === currentUser.ligaId);
          // Pre-seleccionar la liga del directivo
          // FIX: { emitEvent: false } evita disparar valueChanges que borraría el dirigenteId
          if (this.ligas.length > 0) {
            this.equipoForm.get('ligaId')?.setValue(this.ligas[0].id, { emitEvent: false });
            this.equipoForm.get('ligaId')?.disable({ emitEvent: false });
          }
        },
        error: (error) => {
          console.error('Error loading ligas:', error);
          this.errorMessage = 'Error al cargar las ligas';
        }
      });
    } else if (rolNombre === 'dirigente_equipo') {
      // Dirigente de equipo solo ve su liga (del equipo que maneja)
      if (currentUser?.equipoId) {
        this.equiposService.getById(currentUser.equipoId).subscribe({
          next: (equipo) => {
            if (equipo.ligaId) {
              this.ligasService.getById(equipo.ligaId).subscribe({
                next: (liga) => {
                  this.ligas = [liga];
                  // FIX: { emitEvent: false } evita disparar valueChanges que borraría el dirigenteId
                  this.equipoForm.get('ligaId')?.setValue(liga.id, { emitEvent: false });
                  this.equipoForm.get('ligaId')?.disable({ emitEvent: false });
                },
                error: (error) => {
                  console.error('Error loading liga:', error);
                  this.errorMessage = 'Error al cargar la liga';
                }
              });
            }
          },
          error: (error) => {
            console.error('Error loading equipo:', error);
          }
        });
      } else {
        this.errorMessage = 'No tienes un equipo asignado.';
        this.ligas = [];
      }
    } else if (rolNombre === 'master') {
      // Master ve todas las ligas
      this.ligasService.getAll().subscribe({
        next: (ligas) => {
          this.ligas = ligas.filter(liga => liga.activo);

          // FIX: Cuando loadLigas() llega después de loadEquipo(), reemplazar el array
          // destruye y recrea los <option> en el DOM. Si ya hay un ligaId seteado
          // (modo edición), forzamos la re-renderización y re-aplicamos el valor
          // para que el <select> muestre la opción correcta.
          const ligaActual = this.equipoForm.get('ligaId')?.value;
          if (ligaActual) {
            this.cdr.detectChanges();
            this.equipoForm.get('ligaId')?.setValue(ligaActual, { emitEvent: false });
          }
        },
        error: (error) => {
          console.error('Error loading ligas:', error);
          this.errorMessage = 'Error al cargar las ligas';
        }
      });
    } else {
      // Otros roles no pueden crear ni editar equipos
      this.errorMessage = 'No tienes permisos para crear o editar equipos.';
      this.ligas = [];
    }
  }

  loadDirigentes(): void {
    const currentUser = this.authService.getCurrentUser();
    const rolNombre = currentUser?.rol?.nombre;

    // Solo cargar dirigentes si el usuario tiene permiso y liga asignada
    if (rolNombre === 'directivo_liga' && !currentUser?.ligaId) {
      // Si no tiene liga, no puede cargar dirigentes
      this.dirigentes = [];
      return;
    }

    if (rolNombre === 'master' || (rolNombre === 'directivo_liga' && currentUser?.ligaId)) {
      this.authService.getDirigentesDisponibles().subscribe({
        next: (usuarios) => {
          this.dirigentes = usuarios;
        },
        error: (error) => {
          console.error('Error loading dirigentes:', error);
          this.errorMessage = 'Error al cargar los dirigentes disponibles';
        }
      });
    } else {
      this.dirigentes = [];
    }
  }

  /**
   * Carga dirigentes disponibles filtrados por liga
   */
  loadDirigentesByLiga(ligaId: number): void {
    // Limpiar dirigente seleccionado al cambiar de liga
    this.equipoForm.patchValue({ dirigenteId: '' });
    
    this.authService.getDirigentesDisponiblesByLiga(ligaId).subscribe({
      next: (usuarios) => {
        this.dirigentes = usuarios;
        if (this.dirigentes.length === 0) {
          console.log('No hay dirigentes disponibles para esta liga');
        }
      },
      error: (error) => {
        console.error('Error loading dirigentes by liga:', error);
        this.errorMessage = 'Error al cargar los dirigentes disponibles para esta liga';
        this.dirigentes = [];
      }
    });
  }

  loadEquipo(id: number): void {
    this.loading = true;
    this.equiposService.getById(id).subscribe({
      next: (equipo) => {
        // FIX: Seteamos todos los campos excepto ligaId y dirigenteId primero
        this.equipoForm.patchValue({
          nombre: equipo.nombre,
          representante: equipo.representante || '',
          fundacion: equipo.fundacion ? new Date(equipo.fundacion).toISOString().split('T')[0] : '',
          descripcion: equipo.descripcion || '',
          imagen: equipo.imagen || '',
        });

        // FIX: Seteamos ligaId con { emitEvent: false } para NO disparar el valueChanges
        // Si no hacemos esto, el valueChanges llama a loadDirigentesByLiga() que
        // inmediatamente hace patchValue({ dirigenteId: '' }) borrando el valor.
        this.equipoForm.get('ligaId')?.setValue(equipo.ligaId, { emitEvent: false });

        // Agregar liga actual al listado si no está presente
        if (equipo.liga && !this.ligas.find(l => l.id === equipo.liga.id)) {
          this.ligas = [equipo.liga, ...this.ligas];
        }
        
        // Deshabilitar campo liga para dirigente_equipo en modo edición
        const currentUser = this.authService.getCurrentUser();
        if (currentUser?.rol?.nombre === 'dirigente_equipo') {
          this.equipoForm.get('ligaId')?.disable({ emitEvent: false });
        }
        
        // Cargar dirigentes de la liga del equipo y luego agregar el actual
        if (equipo.ligaId) {
          this.authService.getDirigentesDisponiblesByLiga(equipo.ligaId).subscribe({
            next: (usuarios) => {
              this.dirigentes = usuarios;
              
              // Agregar dirigente actual al listado si no está presente
              if (equipo.dirigente && !this.dirigentes.find(d => d.id === equipo.dirigente.id)) {
                this.dirigentes = [equipo.dirigente, ...this.dirigentes];
              }

              // FIX: detectChanges() le dice a Angular "renderiza YA las <option>"
              // antes de asignar el valor. Así el <select> siempre encuentra la opción
              // y la muestra correctamente, sin depender de timings del browser.
              this.cdr.detectChanges();
              this.equipoForm.get('ligaId')?.setValue(equipo.ligaId, { emitEvent: false });
              this.equipoForm.patchValue({ dirigenteId: equipo.dirigenteId });

              this.loading = false;
            },
            error: (error) => {
              console.error('Error loading dirigentes by liga:', error);
              // Aún así agregar el dirigente actual si existe
              if (equipo.dirigente) {
                this.dirigentes = [equipo.dirigente];
              }
              this.cdr.detectChanges();
              this.equipoForm.get('ligaId')?.setValue(equipo.ligaId, { emitEvent: false });
              this.equipoForm.patchValue({ dirigenteId: equipo.dirigenteId });
              this.loading = false;
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading equipo:', error);
        this.errorMessage = 'Error al cargar el equipo';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.equipoForm.invalid) {
      this.equipoForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const formData = { ...this.equipoForm.value };
    
    // Incluir ligaId si está deshabilitado (caso directivo_liga)
    if (this.equipoForm.get('ligaId')?.disabled) {
      formData.ligaId = this.equipoForm.get('ligaId')?.value;
    }
    
    // Incluir dirigenteId si está deshabilitado (caso dirigente_equipo)
    if (this.equipoForm.get('dirigenteId')?.disabled) {
      formData.dirigenteId = this.equipoForm.get('dirigenteId')?.value;
    }
    
    // Convertir ligaId y dirigenteId a número
    formData.ligaId = Number(formData.ligaId);
    formData.dirigenteId = Number(formData.dirigenteId);
    
    // Convertir fecha si existe
    if (formData.fundacion) {
      formData.fundacion = new Date(formData.fundacion);
    }

    const request = this.isEditMode
      ? this.equiposService.update(this.equipoId!, formData)
      : this.equiposService.create(formData);

    request.subscribe({
      next: () => {
        this.router.navigate(['/equipos']);
      },
      error: (error) => {
        console.error('Error saving equipo:', error);
        this.errorMessage = error.error?.message || 'Error al guardar el equipo';
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/equipos']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onImageUploaded(imageUrl: string): void {
    this.equipoForm.patchValue({ imagen: imageUrl });
  }

  onImageUploadError(error: string): void {
    this.errorMessage = error;
  }
}
