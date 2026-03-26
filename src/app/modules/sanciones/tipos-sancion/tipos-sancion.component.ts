import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { SancionesService } from '../sanciones.service';
import { TipoSancion } from '../sancion.model';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { Liga } from '../../../core/models/liga.model';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-tipos-sancion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MainNavComponent],
  templateUrl: './tipos-sancion.component.html',
  styleUrl: './tipos-sancion.component.scss',
})
export class TiposSancionComponent implements OnInit {
  tipos: TipoSancion[] = [];
  ligas: Liga[] = [];
  form: FormGroup;
  editandoId: number | null = null;
  cargando = false;
  guardando = false;
  error = '';
  exito = '';
  mostrarFormulario = false;

  readonly APLICA_A_LABELS: Record<string, string> = {
    jugador: '👤 Jugador',
    equipo: '⚽ Equipo',
    directivo: '👔 Directivo',
    barra: '🎉 Barra',
  };

  user$: Observable<any>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly sancionesService: SancionesService,
    private readonly authService: AuthService,
    private readonly ligasService: LigasService,
  ) {
    this.user$ = this.authService.currentUser$;
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: [''],
      aplicaA: ['jugador', Validators.required],
      ligaId: [null],
    });
  }

  ngOnInit(): void {
    this.cargarLigas();
    this.cargarTipos();
  }

  logout(): void {
    this.authService.logout();
  }

  get usuario() {
    return this.authService.currentUserValue;
  }

  get ligaIdUsuario(): number | null {
    return (this.usuario as any)?.ligaId ?? null;
  }

  cargarLigas(): void {
    if (this.usuario?.rol?.nombre === 'master') {
      this.ligasService.getAll().subscribe({
        next: (l) => (this.ligas = l),
      });
    }
  }

  cargarTipos(): void {
    this.cargando = true;
    this.error = '';
    const ligaId = this.usuario?.rol?.nombre === 'master' ? undefined : this.ligaIdUsuario ?? undefined;
    this.sancionesService.getTiposSancion(ligaId).subscribe({
      next: (t) => {
        this.tipos = t;
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al cargar los tipos de sanción.';
        this.cargando = false;
      },
    });
  }

  abrirFormulario(): void {
    this.form.reset({ aplicaA: 'jugador', ligaId: this.ligaIdUsuario });
    this.editandoId = null;
    this.mostrarFormulario = true;
    this.exito = '';
    this.error = '';
  }

  editarTipo(tipo: TipoSancion): void {
    this.editandoId = tipo.id;
    this.form.patchValue({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion ?? '',
      aplicaA: tipo.aplicaA,
      ligaId: tipo.ligaId ?? null,
    });
    this.mostrarFormulario = true;
    this.exito = '';
    this.error = '';
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
    this.form.reset({ aplicaA: 'jugador' });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    this.error = '';
    const val = this.form.value;

    const obs$ = this.editandoId
      // Al editar, solo enviamos los campos que acepta UpdateTipoSancionDto (sin ligaId)
      ? this.sancionesService.updateTipoSancion(this.editandoId, {
          nombre: val.nombre,
          descripcion: val.descripcion ?? undefined,
          aplicaA: val.aplicaA,
        })
      : this.sancionesService.createTipoSancion(val);

    obs$.subscribe({
      next: () => {
        this.exito = this.editandoId ? 'Tipo actualizado correctamente.' : 'Tipo creado correctamente.';
        this.guardando = false;
        this.cancelar();
        this.cargarTipos();
      },
      error: () => {
        this.error = 'Error al guardar. Intenta nuevamente.';
        this.guardando = false;
      },
    });
  }

  toggleActivo(tipo: TipoSancion): void {
    const obs$: Observable<any> = tipo.activo
      ? this.sancionesService.deleteTipoSancion(tipo.id)
      : this.sancionesService.updateTipoSancion(tipo.id, { activo: true });

    obs$.subscribe({
      next: () => this.cargarTipos(),
      error: () => (this.error = 'Error al cambiar estado.'),
    });
  }
}
