import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { PermissionsService } from '@core/services/permissions.service';
import { Observable } from 'rxjs';

interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
}

interface Liga {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-usuario-form',
  templateUrl: './usuario-form.component.html',
  styleUrls: ['./usuario-form.component.scss'],
})
export class UsuarioFormComponent implements OnInit {
  usuarioForm: FormGroup;
  isEditMode = false;
  usuarioId: number | null = null;
  loading = false;
  roles: Rol[] = [];
  ligas: Liga[] = [];
  currentUser: any = null;
  showLigaField = false;
  user$ = this.authService.currentUser$;

  constructor(
    private fb: FormBuilder,
    private usuariosService: UsuariosService,
    private authService: AuthService,
    private ligasService: LigasService,
    private route: ActivatedRoute,
    private router: Router,
    public permissions: PermissionsService
  ) {
    this.usuarioForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rolId: [null, Validators.required],
      ligaId: [null],
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadRoles();
    this.loadLigas();

    // Escuchar cambios en rolId para mostrar/ocultar campo ligaId
    this.usuarioForm.get('rolId')?.valueChanges.subscribe(rolId => {
      this.updateLigaFieldVisibility(rolId);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.usuarioId = +id;
      this.usuarioForm.get('password')?.clearValidators();
      this.usuarioForm.get('password')?.updateValueAndValidity();
      this.loadUsuario(this.usuarioId);
    }
  }

  loadRoles(): void {
    this.authService.getRoles().subscribe({
      next: (data) => {
        // Si es directivo_liga, solo mostrar rol dirigente_equipo
        if (this.currentUser?.rol?.nombre === 'directivo_liga') {
          this.roles = data.filter(rol => rol.nombre === 'dirigente_equipo');
        } else {
          // Master ve todos los roles
          this.roles = data;
        }
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
      },
    });
  }

  loadLigas(): void {
    // Si es directivo_liga, solo mostrar su propia liga
    if (this.currentUser?.rol?.nombre === 'directivo_liga' && this.currentUser?.ligaId) {
      this.ligasService.getById(this.currentUser.ligaId).subscribe({
        next: (liga) => {
          this.ligas = [liga];
        },
        error: (error) => {
          console.error('Error al cargar liga:', error);
        },
      });
    } else {
      // Master ve todas las ligas
      this.ligasService.getAll().subscribe({
        next: (data) => {
          this.ligas = data.filter(liga => liga.activo);
        },
        error: (error) => {
          console.error('Error al cargar ligas:', error);
        },
      });
    }
  }

  updateLigaFieldVisibility(rolId: number): void {
    if (!rolId) {
      this.showLigaField = false;
      this.usuarioForm.get('ligaId')?.clearValidators();
      this.usuarioForm.get('ligaId')?.updateValueAndValidity();
      return;
    }

    const rol = this.roles.find(r => r.id === Number(rolId));
    const rolNombre = rol?.nombre;

    // Mostrar campo ligaId solo para directivo_liga o dirigente_equipo
    if (rolNombre === 'directivo_liga' || rolNombre === 'dirigente_equipo') {
      this.showLigaField = true;
      // No hacer el campo requerido - puede asignarse después
      this.usuarioForm.get('ligaId')?.clearValidators();
      
      // Si el usuario actual es directivo_liga, auto-asignar su liga
      if (this.currentUser?.rol?.nombre === 'directivo_liga' && this.currentUser?.ligaId) {
        this.usuarioForm.patchValue({ ligaId: this.currentUser.ligaId });
        this.usuarioForm.get('ligaId')?.disable();
      } else {
        this.usuarioForm.get('ligaId')?.enable();
      }
    } else {
      this.showLigaField = false;
      this.usuarioForm.get('ligaId')?.clearValidators();
      this.usuarioForm.patchValue({ ligaId: null });
    }
    this.usuarioForm.get('ligaId')?.updateValueAndValidity();
  }

  loadUsuario(id: number): void {
    this.loading = true;
    this.usuariosService.getUsuario(id).subscribe({
      next: (usuario) => {
        this.usuarioForm.patchValue({
          nombre: usuario.nombre,
          email: usuario.email,
          rolId: usuario.rol.id,
          ligaId: usuario.ligaId || null,
        });
        this.updateLigaFieldVisibility(usuario.rol.id);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar usuario:', error);
        alert('Error al cargar usuario');
        this.router.navigate(['/usuarios']);
        this.loading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = { ...this.usuarioForm.value };

    // Incluir ligaId si está deshabilitado (caso directivo_liga)
    if (this.usuarioForm.get('ligaId')?.disabled) {
      formValue.ligaId = this.usuarioForm.get('ligaId')?.value;
    }

    // Convertir rolId y ligaId a número, o null si está vacío
    formValue.rolId = Number(formValue.rolId);
    if (formValue.ligaId && formValue.ligaId !== '') {
      formValue.ligaId = Number(formValue.ligaId);
    } else {
      formValue.ligaId = null;
    }

    if (this.isEditMode && this.usuarioId) {
      // Si es modo edición y no se proporcionó password, no lo incluimos
      const updateData = { ...formValue };
      if (!updateData.password) {
        delete updateData.password;
      }
      // Si el campo liga no es visible en el formulario, no enviarlo
      // para evitar sobreescribir el valor existente con null
      if (!this.showLigaField) {
        delete updateData.ligaId;
      }

      this.usuariosService.updateUsuario(this.usuarioId, updateData).subscribe({
        next: () => {
          alert('Usuario actualizado correctamente');
          this.router.navigate(['/usuarios']);
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
          alert(error.error?.message || 'Error al actualizar usuario');
          this.loading = false;
        },
      });
    } else {
      this.usuariosService.createUsuario(formValue).subscribe({
        next: () => {
          alert('Usuario creado correctamente');
          this.router.navigate(['/usuarios']);
        },
        error: (error) => {
          console.error('Error al crear usuario:', error);
          alert(error.error?.message || 'Error al crear usuario');
          this.loading = false;
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/usuarios']);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.usuarioForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    if (field?.hasError('email')) {
      return 'Ingrese un email válido';
    }
    if (field?.hasError('minlength')) {
      const minLength = field.errors?.['minlength']?.requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    return '';
  }

  getRolName(rolId: number): string {
    const rol = this.roles.find((r) => r.id === rolId);
    return rol ? rol.nombre : '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
