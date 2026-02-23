import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LigasService } from '../../../core/services/ligas.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { Usuario } from '../../../core/models/usuario.model';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-liga-form',
  templateUrl: './liga-form.component.html',
  styleUrls: ['./liga-form.component.scss'],
  standalone: false
})
export class LigaFormComponent implements OnInit {
  ligaForm: FormGroup;
  loading = false;
  errorMessage = '';
  isEditMode = false;
  ligaId: number | null = null;
  currentUserId: number | null = null;
  user$ = this.authService.currentUser$;
  directivos: Usuario[] = [];

  constructor(
    private fb: FormBuilder,
    private ligasService: LigasService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.ligaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      ubicacion: ['', [Validators.required, Validators.maxLength(200)]],
      fechaFundacion: ['', Validators.required],
      directivoId: [''], // Opcional: puede asignarse después de crear la liga
      imagen: [''],
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.currentUserId = currentUser?.id || null;

    // Cargar directivos disponibles
    this.loadDirectivos();

    // Pre-llenar el directivoId si el usuario actual es directivo_liga
    if (currentUser?.rol?.nombre === 'directivo_liga') {
      this.ligaForm.patchValue({ directivoId: currentUser.id });
    }

    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.ligaId = +params['id'];
        this.loadLiga();
      }
    });
  }

  loadDirectivos(): void {
    this.authService.getDirectivosDisponibles().subscribe({
      next: (usuarios) => {
        this.directivos = usuarios;
      },
      error: (error) => {
        console.error('Error loading directivos:', error);
        this.errorMessage = 'Error al cargar los directivos disponibles';
      }
    });
  }

  loadLiga(): void {
    if (!this.ligaId) return;

    this.loading = true;
    this.ligasService.getById(this.ligaId).subscribe({
      next: (liga) => {
        this.ligaForm.patchValue({
          nombre: liga.nombre,
          ubicacion: liga.ubicacion,
          fechaFundacion: liga.fechaFundacion.split('T')[0], // Formato YYYY-MM-DD
          directivoId: liga.directivoId,
          imagen: liga.imagen || '',
        });
        
        // Agregar directivo actual al listado si no está presente
        if (liga.directivo && !this.directivos.find(d => d.id === liga.directivo?.id)) {
          this.directivos = [liga.directivo, ...this.directivos];
        }
        
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al cargar la liga';
        this.loading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.ligaForm.invalid) {
      this.markFormGroupTouched(this.ligaForm);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Convertir directivoId: si está vacío enviar null, si no convertir a número
    const directivoIdValue = this.ligaForm.value.directivoId;
    const directivoId = directivoIdValue && directivoIdValue !== '' 
      ? Number(directivoIdValue) 
      : null;

    const formData = {
      ...this.ligaForm.value,
      directivoId: directivoId
    };

    const request = this.isEditMode
      ? this.ligasService.update(this.ligaId!, formData)
      : this.ligasService.create(formData);

    request.subscribe({
      next: (response) => {
        // Si es modo creación y no hay ligaId, guardarlo para futuras subidas de imagen
        if (!this.isEditMode && response && response.id) {
          this.ligaId = response.id;
          this.isEditMode = true; // Cambiar a modo edición para que futuras subidas usen el ID correcto
        }
        this.router.navigate(['/ligas']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message || 'Error al guardar la liga';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/ligas']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.ligaForm.get(field);
    return !!(control && control.hasError(error) && control.touched);
  }

  getErrorMessage(field: string): string {
    const control = this.ligaForm.get(field);
    if (!control || !control.touched) return '';

    if (control.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.getError('maxlength').requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    return '';
  }

  logout(): void {
    this.authService.logout();
  }

  onImageUploaded(imageUrl: string): void {
    this.ligaForm.patchValue({ imagen: imageUrl });
  }

  onImageUploadError(error: string): void {
    this.errorMessage = error;
  }
}
