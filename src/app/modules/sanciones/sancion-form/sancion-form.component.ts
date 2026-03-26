import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { SancionesService } from '../sanciones.service';
import { TipoSancion, ReglaSancion, CreateSancionDto } from '../sancion.model';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { JugadoresService } from '../../../core/services/jugadores.service';
import { PartidosService } from '../../partidos/partidos.service';
import { AuthService } from '../../../core/services/auth.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-sancion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MainNavComponent],
  templateUrl: './sancion-form.component.html',
  styleUrl: './sancion-form.component.scss',
})
export class SancionFormComponent implements OnInit {
  form: FormGroup;
  tipos: TipoSancion[] = [];
  reglas: ReglaSancion[] = [];
  campeonatos: any[] = [];
  partidos: any[] = [];
  equipos: any[] = [];
  jugadores: any[] = [];

  guardando = false;
  error = '';
  exito = '';

  user$: Observable<any>;

  get ligaId(): number {
    return (this.authService.currentUserValue as any)?.ligaId;
  }

  /** aplicaA del tipo seleccionado — controla si se muestra jugador o equipo */
  get aplicaASeleccionado(): string {
    const tipoId = Number(this.form.get('tipoSancionId')?.value);
    return this.tipos.find((t) => t.id === tipoId)?.aplicaA ?? '';
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly sancionesService: SancionesService,
    private readonly campeonatosService: CampeonatosService,
    private readonly equiposService: EquiposService,
    private readonly jugadoresService: JugadoresService,
    private readonly partidosService: PartidosService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.user$ = this.authService.currentUser$;
    this.form = this.fb.group({
      tipoSancionId: [null, Validators.required],
      reglaSancionId: [null],
      campeonatoId: [null, Validators.required],
      partidoId: [null],
      jugadorId: [null],
      equipoId: [null],
      descripcion: [''],
      fechaSancion: [new Date().toISOString().substring(0, 10)],
      partidosSuspension: [0, [Validators.min(0)]],
    });

    // Al cambiar tipo de sanción → cargar reglas del reglamento asociadas
    this.form.get('tipoSancionId')!.valueChanges.subscribe((tipoId) => {
      this.form.patchValue({ reglaSancionId: null });
      this.reglas = [];
      if (tipoId) this.cargarReglas(Number(tipoId));
    });

    // Al seleccionar una regla → autocompletar partidos de suspensión
    this.form.get('reglaSancionId')!.valueChanges.subscribe((reglaId) => {
      if (reglaId) {
        const regla = this.reglas.find((r) => r.id === Number(reglaId));
        if (regla?.partidosSuspension != null) {
          this.form.patchValue({ partidosSuspension: regla.partidosSuspension });
        }
      }
    });

    // Al cambiar campeonato → cargar partidos; equipos solo si no hay partido seleccionado
    this.form.get('campeonatoId')!.valueChanges.subscribe((id) => {
      this.form.patchValue({ partidoId: null, equipoId: null, jugadorId: null });
      this.partidos = [];
      this.equipos = [];
      this.jugadores = [];
      if (id) {
        this.cargarPartidos(Number(id));
        this.cargarEquipos(); // carga todos; se filtra si se elige partido
      }
    });

    // Al cambiar partido → restringir equipos a los 2 del partido (o restaurar todos)
    this.form.get('partidoId')!.valueChanges.subscribe((partidoId) => {
      this.form.patchValue({ equipoId: null, jugadorId: null });
      this.jugadores = [];
      if (partidoId) {
        const partido = this.partidos.find((p) => p.id === Number(partidoId));
        if (partido?.equipoLocal && partido?.equipoVisitante) {
          this.equipos = [partido.equipoLocal, partido.equipoVisitante];
        }
      } else {
        // Sin partido seleccionado → mostrar todos los equipos del campeonato
        this.cargarEquipos();
      }
    });

    // Al cambiar equipo → cargar jugadores
    this.form.get('equipoId')!.valueChanges.subscribe((id) => {
      if (id) this.cargarJugadores(Number(id));
      else this.jugadores = [];
    });
  }

  ngOnInit(): void {
    this.cargarTipos();
    this.cargarCampeonatos();
  }

  cargarTipos(): void {
    this.sancionesService.getTiposSancion(this.ligaId).subscribe({
      next: (t) => (this.tipos = t),
    });
  }

  cargarReglas(tipoSancionId: number): void {
    this.sancionesService.getReglas(this.ligaId).subscribe({
      next: (r) => {
        // Filtrar solo las reglas que corresponden al tipo seleccionado
        this.reglas = r.filter((regla) => regla.tipoSancionId === tipoSancionId);
      },
      error: () => (this.reglas = []),
    });
  }

  cargarCampeonatos(): void {
    this.campeonatosService.getByLiga(this.ligaId).subscribe({
      next: (c) => (this.campeonatos = c),
    });
  }

  cargarPartidos(campeonatoId: number): void {
    this.partidosService.getByCampeonato(campeonatoId).subscribe({
      next: (p) => (this.partidos = p),
      error: () => (this.partidos = []),
    });
  }

  cargarEquipos(): void {
    this.equiposService.getByLiga(this.ligaId).subscribe({
      next: (e) => (this.equipos = e),
      error: () => (this.equipos = []),
    });
  }

  cargarJugadores(equipoId: number): void {
    this.jugadoresService.getByEquipo(equipoId).subscribe({
      next: (j) => (this.jugadores = j),
      error: () => (this.jugadores = []),
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando = true;
    this.error = '';
    const val = this.form.value;

    const dto: CreateSancionDto = {
      tipoSancionId: Number(val.tipoSancionId),
      ligaId: this.ligaId,
      campeonatoId: Number(val.campeonatoId),
      partidoId: val.partidoId ? Number(val.partidoId) : undefined,
      jugadorId: val.jugadorId ? Number(val.jugadorId) : undefined,
      equipoId: val.equipoId ? Number(val.equipoId) : undefined,
      reglaSancionId: val.reglaSancionId ? Number(val.reglaSancionId) : undefined,
      descripcion: val.descripcion || undefined,
      fechaSancion: val.fechaSancion || undefined,
      partidosSuspension: val.partidosSuspension ?? 0,
    };

    this.sancionesService.createSancion(dto).subscribe({
      next: () => {
        this.exito = 'Sanción registrada correctamente.';
        this.guardando = false;
        setTimeout(() => this.router.navigate(['/sanciones']), 1200);
      },
      error: (e) => {
        this.error = e?.error?.message ?? 'Error al registrar la sanción.';
        this.guardando = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/sanciones']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /** Etiqueta corta del partido para el select */
  labelPartido(p: any): string {
    const local = p.equipoLocal?.nombre ?? 'Local';
    const visita = p.equipoVisitante?.nombre ?? 'Visitante';
    return `J${p.jornada} – ${local} vs ${visita}`;
  }
}
