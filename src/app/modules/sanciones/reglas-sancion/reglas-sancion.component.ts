import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { SancionesService } from '../sanciones.service';
import { ReglaSancion, TipoSancion, CreateReglaSancionDto, UpdateReglaSancionDto } from '../sancion.model';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-reglas-sancion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, MainNavComponent],
  templateUrl: './reglas-sancion.component.html',
  styleUrl: './reglas-sancion.component.scss',
})
export class ReglasSancionComponent implements OnInit {
  reglas: ReglaSancion[] = [];
  tipos: TipoSancion[] = [];
  ligas: any[] = [];
  selectedLigaId: number | null = null;
  form: FormGroup;
  reglaEditando: ReglaSancion | null = null;
  cargando = false;
  guardando = false;
  mostrarFormulario = false;
  error = '';
  exito = '';
  user$: Observable<any>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly sancionesService: SancionesService,
    private readonly authService: AuthService,
    private readonly ligasService: LigasService,
  ) {
    this.user$ = this.authService.currentUser$;
    this.form = this.fb.group({
      tipoSancionId: [null, Validators.required],
      descripcion: [''],
      modoCastigo: ['partidos'],
      acumulacionActiva: [false],
      acumulacionCantidad: [{ value: null, disabled: true }],
      partidosSuspension: [null],
      duracionMeses: [{ value: null, disabled: true }],
      puntosDescuento: [0],
    });

    // Habilitar/deshabilitar campos según modo de castigo
    this.form.get('modoCastigo')!.valueChanges.subscribe((modo) => {
      const ctrlPartidos = this.form.get('partidosSuspension')!;
      const ctrlMeses    = this.form.get('duracionMeses')!;
      if (modo === 'tiempo') {
        ctrlPartidos.setValue(null);
        ctrlMeses.enable();
        ctrlMeses.setValidators([Validators.required, Validators.min(1)]);
      } else {
        ctrlMeses.setValue(null);
        ctrlMeses.disable();
        ctrlMeses.clearValidators();
      }
      ctrlMeses.updateValueAndValidity();
    });

    // Al cambiar tipo de sanción: si NO aplica a jugador, limpiar campos de suspensión.
    // Un equipo/barra/directivo no cumple partidos de suspensión.
    this.form.get('tipoSancionId')!.valueChanges.subscribe((tipoId) => {
      if (!tipoId) return;
      const tipo = this.tipos.find((t) => t.id === Number(tipoId));
      if (tipo && tipo.aplicaA !== 'jugador') {
        this.form.patchValue({
          modoCastigo:       'partidos',
          partidosSuspension: null,
          duracionMeses:      null,
        });
      }
    });

    // Habilitar/deshabilitar acumulacionCantidad según toggle
    this.form.get('acumulacionActiva')!.valueChanges.subscribe((val) => {
      const ctrl = this.form.get('acumulacionCantidad')!;
      if (val) {
        ctrl.enable();
        ctrl.setValidators([Validators.required, Validators.min(1)]);
      } else {
        ctrl.disable();
        ctrl.clearValidators();
        ctrl.setValue(null);
      }
      ctrl.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    if (this.isMaster) {
      this.ligasService.getAll().subscribe({ next: (l) => (this.ligas = l) });
    } else {
      this.cargarTipos();
      this.cargarReglas();
    }
  }

  logout(): void {
    this.authService.logout();
  }

  get isMaster(): boolean {
    return this.authService.currentUserValue?.rol?.nombre === 'master';
  }

  /**
   * Devuelve el 'aplicaA' del tipo seleccionado en el formulario.
   * '' cuando aún no se eligió ningún tipo.
   * Se usa en el HTML para mostrar/ocultar los campos de suspensión.
   */
  get aplicaADelTipo(): string {
    const tipoId = Number(this.form.getRawValue().tipoSancionId);
    return this.tipos.find((t) => t.id === tipoId)?.aplicaA ?? '';
  }

  /** True si el tipo seleccionado aplica solo a jugadores (o aún no hay tipo). */
  get esParaJugador(): boolean {
    const a = this.aplicaADelTipo;
    return a === '' || a === 'jugador';
  }

  get ligaId(): number | null {
    if (this.isMaster) return this.selectedLigaId;
    return (this.authService.currentUserValue as any)?.ligaId ?? null;
  }

  onLigaChange(): void {
    this.reglas = [];
    this.tipos = [];
    if (this.selectedLigaId) {
      this.cargarTipos();
      this.cargarReglas();
    }
  }

  cargarTipos(): void {
    if (!this.ligaId) return;
    this.sancionesService.getTiposSancion(this.ligaId).subscribe({
      next: (t) => (this.tipos = t),
    });
  }

  cargarReglas(): void {
    if (!this.ligaId) return;
    this.cargando = true;
    this.sancionesService.getReglas(this.ligaId).subscribe({
      next: (r) => {
        this.reglas = r;
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al cargar las reglas.';
        this.cargando = false;
      },
    });
  }

  abrirFormulario(): void {
    this.reglaEditando = null;
    this.form.reset({ acumulacionActiva: false, puntosDescuento: 0 });
    this.form.get('tipoSancionId')!.enable();
    this.mostrarFormulario = true;
    this.exito = '';
    this.error = '';
  }

  editar(regla: ReglaSancion): void {
    this.reglaEditando = regla;
    // Deshabilitar tipo al editar (no se cambia, solo se editan los parámetros)
    this.form.get('tipoSancionId')!.disable();
    this.form.patchValue({
      tipoSancionId: regla.tipoSancionId,
      descripcion: regla.descripcion ?? '',
      modoCastigo: regla.modoCastigo ?? 'partidos',
      acumulacionActiva: regla.acumulacionActiva,
      acumulacionCantidad: regla.acumulacionCantidad ?? null,
      partidosSuspension: regla.partidosSuspension ?? null,
      duracionMeses: regla.duracionMeses ?? null,
      puntosDescuento: regla.puntosDescuento ?? 0,
    });
    // Ajustar estado de duracionMeses según modo guardado
    const ctrlMeses = this.form.get('duracionMeses')!;
    if ((regla.modoCastigo ?? 'partidos') === 'tiempo') {
      ctrlMeses.enable();
    } else {
      ctrlMeses.disable();
    }
    this.mostrarFormulario = true;
    this.exito = '';
    this.error = '';
    // Scroll suave al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.reglaEditando = null;
    this.form.reset({ acumulacionActiva: false });
    this.form.get('tipoSancionId')!.enable();
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    const val = this.form.getRawValue();

    if (this.reglaEditando) {
      // ── Modo edición ──────────────────────────────────────────────────────
      const dto: UpdateReglaSancionDto = {
        descripcion: val.descripcion || undefined,
        // Para tipos no-jugador no tiene sentido guardar modo/partidos/meses
        modoCastigo: this.esParaJugador ? (val.modoCastigo ?? 'partidos') : 'partidos',
        acumulacionActiva: val.acumulacionActiva ?? false,
        acumulacionCantidad: val.acumulacionCantidad ?? undefined,
        partidosSuspension: (this.esParaJugador && val.modoCastigo !== 'tiempo') ? (val.partidosSuspension ?? undefined) : undefined,
        duracionMeses: (this.esParaJugador && val.modoCastigo === 'tiempo') ? (val.duracionMeses ?? undefined) : undefined,
        puntosDescuento: val.puntosDescuento ?? 0,
      };
      this.sancionesService.updateRegla(this.reglaEditando.id, dto).subscribe({
        next: () => {
          this.exito = 'Regla actualizada correctamente.';
          this.guardando = false;
          this.cancelar();
          this.cargarReglas();
        },
        error: () => {
          this.error = 'Error al actualizar la regla.';
          this.guardando = false;
        },
      });
    } else {
      // ── Modo creación ─────────────────────────────────────────────────────
      const dto: CreateReglaSancionDto = {
        ligaId: this.ligaId!,
        tipoSancionId: Number(val.tipoSancionId),
        descripcion: val.descripcion || undefined,
        // Para tipos no-jugador no tiene sentido guardar modo/partidos/meses
        modoCastigo: this.esParaJugador ? (val.modoCastigo ?? 'partidos') : 'partidos',
        acumulacionActiva: val.acumulacionActiva ?? false,
        acumulacionCantidad: val.acumulacionCantidad ?? undefined,
        partidosSuspension: (this.esParaJugador && val.modoCastigo !== 'tiempo') ? (val.partidosSuspension ?? undefined) : undefined,
        duracionMeses: (this.esParaJugador && val.modoCastigo === 'tiempo') ? (val.duracionMeses ?? undefined) : undefined,
        puntosDescuento: val.puntosDescuento ?? 0,
      };
      this.sancionesService.createRegla(dto).subscribe({
        next: () => {
          this.exito = 'Regla creada correctamente.';
          this.guardando = false;
          this.cancelar();
          this.cargarReglas();
        },
        error: () => {
          this.error = 'Error al guardar la regla.';
          this.guardando = false;
        },
      });
    }
  }

  // Toggle rápido de acumulación directamente en la lista
  toggleAcumulacion(regla: ReglaSancion): void {
    const nuevoEstado = !regla.acumulacionActiva;
    this.sancionesService.updateRegla(regla.id, { acumulacionActiva: nuevoEstado }).subscribe({
      next: () => {
        regla.acumulacionActiva = nuevoEstado;
        this.exito = `Acumulación ${nuevoEstado ? 'activada' : 'desactivada'} correctamente.`;
      },
      error: () => (this.error = 'Error al actualizar la regla.'),
    });
  }

  descripcionRegla(regla: ReglaSancion): string {
    const castigo = regla.modoCastigo === 'tiempo'
      ? `${regla.duracionMeses ?? '?'} mes(es) de suspensión`
      : `${regla.partidosSuspension ?? '?'} partido(s) de suspensión`;
    if (!regla.acumulacionActiva) return castigo || 'Sin acumulación automática';
    return `${regla.acumulacionCantidad ?? '?'} ${regla.tipoSancion?.nombre ?? 'tarjetas'} → ${castigo}`;
  }
}
