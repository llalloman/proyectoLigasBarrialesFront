import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { JugadoresService } from '../../../core/services/jugadores.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { Equipo } from '../../../core/models/equipo.model';
import { Usuario } from '../../../core/models/usuario.model';
import { Observable } from 'rxjs';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-jugador-form',
  templateUrl: './jugador-form.component.html',
  styleUrl: './jugador-form.component.scss',
  standalone: false
})
export class JugadorFormComponent implements OnInit {
  jugadorForm!: FormGroup;
  isEditMode = false;
  jugadorId: number | null = null;
  loading = false;
  errorMessage = '';
  equipos: Equipo[] = [];
  user$: Observable<Usuario | null>;
  isMaster = false;

  constructor(
    private fb: FormBuilder,
    private jugadoresService: JugadoresService,
    private equiposService: EquiposService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    this.checkUserRole();
    this.loadEquipos();
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.jugadorId = +id;
      this.loadJugador(this.jugadorId);
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
    this.jugadorForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      tipoDocumento: ['Cédula', Validators.required],
      cedula: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      fechaNacimiento: ['', Validators.required],
      equipoId: [''],
      descripcion: [''],
      imagen: [''],
      imagenCedula: [''],
      numeroCancha: ['', [Validators.min(1), Validators.max(99)]],
      posicion: ['']
    });

    // Escuchar cambios en tipoDocumento para adaptar validaciones de cedula
    this.jugadorForm.get('tipoDocumento')?.valueChanges.subscribe(tipo => {
      const cedulaControl = this.jugadorForm.get('cedula');
      if (tipo === 'Cédula') {
        cedulaControl?.setValidators([Validators.required, Validators.pattern(/^\d{10}$/)]);
      } else if (tipo === 'Pasaporte') {
        cedulaControl?.setValidators([Validators.required, Validators.minLength(6)]);
      }
      cedulaControl?.updateValueAndValidity();
    });
  }

  loadEquipos(): void {
    const currentUser = this.authService.getCurrentUser();
    const rolNombre = currentUser?.rol?.nombre;

    // Master ve todos los equipos
    if (rolNombre === 'master') {
      this.equiposService.getAll().subscribe({
        next: (equipos) => {
          this.equipos = equipos.filter(equipo => equipo.activo);
        },
        error: (error) => {
          console.error('Error loading equipos:', error);
          this.errorMessage = 'Error al cargar los equipos';
        }
      });
    }
    // Directivo de liga ve equipos de su liga
    else if (rolNombre === 'directivo_liga') {
      if (!currentUser?.ligaId) {
        this.errorMessage = 'No tienes una liga asignada. No puedes crear jugadores. Contacta al administrador.';
        this.equipos = [];
        return;
      }
      this.equiposService.getAll().subscribe({
        next: (equipos) => {
          this.equipos = equipos.filter(equipo => equipo.activo);
        },
        error: (error) => {
          console.error('Error loading equipos:', error);
          this.errorMessage = 'Error al cargar los equipos';
        }
      });
    }
    // Dirigente de equipo solo ve SU equipo
    else if (rolNombre === 'dirigente_equipo') {
      if (!currentUser?.equipoId) {
        this.errorMessage = 'No tienes un equipo asignado. No puedes crear jugadores. Contacta al administrador o directivo de liga.';
        this.equipos = [];
        return;
      }
      this.equiposService.getAll().subscribe({
        next: (equipos) => {
          this.equipos = equipos.filter(equipo => equipo.activo && equipo.id === currentUser.equipoId);
          // Pre-seleccionar el equipo del dirigente
          if (this.equipos.length > 0) {
            this.jugadorForm.patchValue({ equipoId: this.equipos[0].id });
            this.jugadorForm.get('equipoId')?.disable(); // Deshabilitar cambio de equipo
          }
        },
        error: (error) => {
          console.error('Error loading equipos:', error);
          this.errorMessage = 'Error al cargar los equipos';
        }
      });
    } else {
      // Otros roles no pueden crear jugadores
      this.errorMessage = 'No tienes permisos para crear jugadores.';
      this.equipos = [];
    }
  }

  loadJugador(id: number): void {
    this.loading = true;
    this.jugadoresService.getById(id).subscribe({
      next: (jugador) => {
        this.jugadorForm.patchValue({
          nombre: jugador.nombre,
          tipoDocumento: jugador.tipoDocumento || 'Cédula',
          cedula: jugador.cedula,
          fechaNacimiento: jugador.fechaNacimiento ? new Date(jugador.fechaNacimiento).toISOString().split('T')[0] : '',
          equipoId: jugador.equipoId || '',
          descripcion: jugador.descripcion || '',
          imagen: jugador.imagen || '',
          imagenCedula: jugador.imagenCedula || '',
          numeroCancha: jugador.numeroCancha || '',
          posicion: jugador.posicion || ''
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading jugador:', error);
        this.errorMessage = 'Error al cargar el jugador';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.jugadorForm.invalid) {
      this.jugadorForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const formData = { ...this.jugadorForm.value };
    
    // Incluir equipoId si está deshabilitado (caso dirigente_equipo)
    if (this.jugadorForm.get('equipoId')?.disabled) {
      formData.equipoId = this.jugadorForm.get('equipoId')?.value;
    }
    
    // Convertir fecha
    formData.fechaNacimiento = new Date(formData.fechaNacimiento);
    
    // Si equipoId está vacío, convertir a null, si no, convertir a número
    if (!formData.equipoId || formData.equipoId === '') {
      formData.equipoId = null;
    } else {
      formData.equipoId = Number(formData.equipoId);
    }

    const request = this.isEditMode
      ? this.jugadoresService.update(this.jugadorId!, formData)
      : this.jugadoresService.create(formData);

    request.subscribe({
      next: () => {
        this.router.navigate(['/jugadores']);
      },
      error: (error) => {
        console.error('Error saving jugador:', error);
        this.errorMessage = error.error?.message || 'Error al guardar el jugador';
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/jugadores']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onImageUploaded(imageUrl: string): void {
    this.jugadorForm.patchValue({ imagen: imageUrl });
  }

  onImageCedulaUploaded(imageUrl: string): void {
    this.jugadorForm.patchValue({ imagenCedula: imageUrl });
  }

  onImageUploadError(error: string): void {
    this.errorMessage = error;
  }

  get selectedLigaId(): number | undefined {
    const equipoId = this.jugadorForm.get('equipoId')?.value;
    if (!equipoId) return undefined;
    
    const equipo = this.equipos.find(e => e.id === +equipoId);
    return equipo?.ligaId;
  }
}
