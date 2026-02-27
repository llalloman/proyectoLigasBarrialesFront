import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { CategoriasService } from '../categorias.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-categoria-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MainNavComponent],
  templateUrl: './categoria-form.component.html',
  styleUrl: './categoria-form.component.scss'
})
export class CategoriaFormComponent implements OnInit {
  categoriaForm: FormGroup;
  isEditMode = false;
  categoriaId: number = 0;
  campeonatoId: number = 0;
  loading = false;
  errorMessage = '';
  successMessage = '';
  user$: Observable<any>;

  constructor(
    private fb: FormBuilder,
    private categoriasService: CategoriasService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.user$ = this.authService.currentUser$;
    this.categoriaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', Validators.maxLength(500)],
      orden: [1, [Validators.required, Validators.min(1)]],
      equiposAscienden: [0, [Validators.required, Validators.min(0)]],
      equiposDescienden: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.campeonatoId = Number(this.route.snapshot.queryParamMap.get('campeonatoId'));
    this.checkEditMode();
  }

  checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.categoriaId = Number(id);
      this.loadCategoria();
    }
  }

  loadCategoria(): void {
    this.loading = true;
    this.categoriasService.getById(this.categoriaId).subscribe({
      next: (categoria) => {
        this.categoriaForm.patchValue({
          nombre: categoria.nombre,
          descripcion: categoria.descripcion,
          orden: categoria.orden,
          equiposAscienden: categoria.equiposAscienden,
          equiposDescienden: categoria.equiposDescienden
        });
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar la categoría';
        console.error(err);
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.categoriaForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = {
      ...this.categoriaForm.value,
      campeonatoId: Number(this.campeonatoId)
    };

    const request = this.isEditMode
      ? this.categoriasService.update(this.categoriaId, formData)
      : this.categoriasService.create(formData);

    request.subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = this.isEditMode 
          ? '✓ Categoría actualizada exitosamente'
          : '✓ Categoría creada exitosamente';
        
        // Redirigir después de 1.5 segundos para que el usuario vea el mensaje
        setTimeout(() => {
          this.router.navigate(['/categorias'], {
            queryParams: { campeonatoId: this.campeonatoId }
          });
        }, 1500);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al guardar la categoría';
        console.error(err);
        this.loading = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/categorias'], {
      queryParams: { campeonatoId: this.campeonatoId }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  hasError(field: string, error: string): boolean {
    const control = this.categoriaForm.get(field);
    return !!(control && control.hasError(error) && (control.dirty || control.touched));
  }

  getErrorMessage(field: string): string {
    const control = this.categoriaForm.get(field);
    if (control?.hasError('required') && (control.dirty || control.touched)) {
      return 'Este campo es requerido';
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    if (control?.hasError('min')) {
      const min = control.errors?.['min'].min;
      return `Valor mínimo: ${min}`;
    }
    return '';
  }
}
