import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { CampeonatosService } from '../campeonatos.service';
import { LigasService } from '../../../core/services/ligas.service';
import { Liga } from '../../../core/models/liga.model';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-campeonato-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MainNavComponent],
  templateUrl: './campeonato-form.component.html',
  styleUrl: './campeonato-form.component.scss'
})
export class CampeonatoFormComponent implements OnInit {
  campeonatoForm: FormGroup;
  isEditMode = false;
  campeonatoId: number | null = null;
  ligas: Liga[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  user$: Observable<any>;

  constructor(
    private fb: FormBuilder,
    private campeonatosService: CampeonatosService,
    private ligasService: LigasService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.user$ = this.authService.currentUser$;
    this.campeonatoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: [''],
      ligaId: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      fechaLimiteInscripcion: ['', Validators.required],
      maxJugadoresHabilitados: [20, [Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadLigas();
    this.checkEditMode();
  }

  loadLigas(): void {
    this.ligasService.getAll().subscribe({
      next: (data) => {
        this.ligas = data;
        const currentUser = this.authService.getCurrentUser();
        if (currentUser?.rol?.nombre === 'directivo_liga' && currentUser.ligaId) {
          this.campeonatoForm.patchValue({ ligaId: currentUser.ligaId });
          this.campeonatoForm.get('ligaId')?.disable();
        }
      },
      error: (err) => console.error('Error al cargar ligas:', err)
    });
  }

  checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.campeonatoId = +id;
      this.loadCampeonato();
    }
  }

  loadCampeonato(): void {
    if (this.campeonatoId) {
      this.campeonatosService.getById(this.campeonatoId).subscribe({
        next: (campeonato) => {
          this.campeonatoForm.patchValue({
            nombre: campeonato.nombre,
            descripcion: campeonato.descripcion,
            ligaId: campeonato.ligaId,
            fechaInicio: campeonato.fechaInicio.split('T')[0],
            fechaFin: campeonato.fechaFin.split('T')[0],
            fechaLimiteInscripcion: campeonato.fechaLimiteInscripcion.split('T')[0],
            maxJugadoresHabilitados: campeonato.maxJugadoresHabilitados || 20
          });
        },
        error: (err) => {
          this.errorMessage = 'Error al cargar campeonato';
          console.error('Error:', err);
        }
      });
    }
  }

  onSubmit(): void {
    if (this.campeonatoForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const formData = { ...this.campeonatoForm.value };
      
      if (this.campeonatoForm.get('ligaId')?.disabled) {
        formData.ligaId = this.campeonatoForm.get('ligaId')?.value;
      }
      
      formData.ligaId = Number(formData.ligaId);

      const request = this.isEditMode && this.campeonatoId
        ? this.campeonatosService.update(this.campeonatoId, formData)
        : this.campeonatosService.create(formData);

      request.subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = this.isEditMode 
            ? '✓ Campeonato actualizado exitosamente'
            : '✓ Campeonato creado exitosamente';
          
          // Redirigir después de 1.5 segundos para que el usuario vea el mensaje
          setTimeout(() => {
            this.router.navigate(['/campeonatos']);
          }, 1500);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Error al guardar campeonato';
          this.loading = false;
          console.error('Error:', err);
        }
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/campeonatos']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  hasError(field: string, error: string): boolean {
    const control = this.campeonatoForm.get(field);
    return !!(control && control.hasError(error) && (control.dirty || control.touched));
  }

  getErrorMessage(field: string): string {
    const control = this.campeonatoForm.get(field);
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
