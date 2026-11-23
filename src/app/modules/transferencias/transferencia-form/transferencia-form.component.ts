import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TransferenciasService } from '../transferencias.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { JugadorCampeonatosService } from '../../jugador-campeonatos/jugador-campeonatos.service';
import { InscripcionesService } from '../../inscripciones/inscripciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { CreateTransferenciaDto } from '../transferencia.model';
import { Campeonato } from '../../campeonatos/campeonato.model';
import { JugadorCampeonato } from '../../jugador-campeonatos/jugador-campeonato.model';
import { Equipo } from '../../../core/models/equipo.model';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../shared/components/searchable-select/searchable-select.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-transferencia-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MainNavComponent,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    SearchableSelectComponent,
  ],
  templateUrl: './transferencia-form.component.html',
  styleUrls: ['./transferencia-form.component.scss'],
})
export class TransferenciaFormComponent implements OnInit {
  form: FormGroup;
  campeonatos: Campeonato[] = [];
  jugadoresHabilitados: JugadorCampeonato[] = [];
  equiposDestino: Equipo[] = [];
  jugadorSearchControl = new FormControl('');
  filteredJugadores$: Observable<JugadorCampeonato[]> | undefined;
  loading = false;
  errorMessage = '';
  advertenciaMessage = '';
  currentEquipoId: number | null = null;
  currentRole = '';
  user$ = this.authService.currentUser$;

  get equiposDestinoSearchOptions(): SearchableSelectOption[] {
    return this.equiposDestino.map((equipo) => ({
      value: equipo.id,
      label: equipo.nombre,
      searchText: equipo.nombre,
    }));
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private transferenciasService: TransferenciasService,
    private campeonatosService: CampeonatosService,
    private jugadorCampeonatosService: JugadorCampeonatosService,
    private inscripcionesService: InscripcionesService,
    private authService: AuthService,
    public permissions: PermissionsService
  ) {
    this.form = this.fb.group({
      campeonatoId: ['', Validators.required],
      equipoDestinoId: [''],
      jugadorCampeonatoId: ['', Validators.required],
      observaciones: ['', Validators.maxLength(500)],
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.currentRole = currentUser?.rol?.nombre || '';
    this.currentEquipoId = currentUser?.equipoId || null;

    if (this.currentRole === 'dirigente_equipo' && !this.currentEquipoId) {
      this.errorMessage =
        'Debe estar asociado a un equipo para solicitar transferencias';
      return;
    }

    if (this.currentRole === 'dirigente_equipo') {
      this.form.patchValue({ equipoDestinoId: this.currentEquipoId });
      this.form.get('equipoDestinoId')?.disable();
    } else if (this.currentRole === 'master') {
      this.form.get('equipoDestinoId')?.setValidators(Validators.required);
      this.form.get('equipoDestinoId')?.updateValueAndValidity();
    } else {
      this.errorMessage = 'No tienes permisos para solicitar transferencias';
      return;
    }

    this.loadCampeonatos();

    // Cargar jugadores cuando se seleccione un campeonato
    this.form.get('campeonatoId')?.valueChanges.subscribe((campeonatoId) => {
      if (campeonatoId) {
        // Resetear el campo de búsqueda y la selección de jugador
        this.jugadorSearchControl.setValue('');
        this.form.patchValue({ jugadorCampeonatoId: '', equipoDestinoId: this.currentEquipoId || '' });
        this.loadJugadoresHabilitados(campeonatoId);
        if (this.currentRole === 'master') {
          this.loadEquiposDestino(campeonatoId);
        }
      }
    });
  }

  loadEquiposDestino(campeonatoId: number): void {
    this.equiposDestino = [];
    this.inscripcionesService.getByCampeonato(Number(campeonatoId)).subscribe({
      next: (inscripciones) => {
        this.equiposDestino = inscripciones
          .filter((inscripcion) => inscripcion.activo && inscripcion.estado === 'confirmada' && !!inscripcion.equipo)
          .map((inscripcion) => inscripcion.equipo as Equipo)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
      },
      error: (error) => {
        console.error('Error loading equipos destino:', error);
        this.errorMessage = 'Error al cargar los equipos inscritos en el campeonato';
      },
    });
  }

  loadCampeonatos(): void {
    this.campeonatosService.getAll().subscribe({
      next: (campeonatos) => {
        // Campeonatos activos donde pueden haber transferencias
        this.campeonatos = campeonatos.filter(
          (c) => c.activo && (c.estado === 'inscripcion_abierta' || c.estado === 'en_curso')
        );
        
        console.log('Campeonatos cargados:', this.campeonatos);
      },
      error: (error) => {
        console.error('Error loading campeonatos:', error);
        this.errorMessage = 'Error al cargar los campeonatos';
      },
    });
  }

  loadJugadoresHabilitados(campeonatoId: number): void {
    this.jugadorCampeonatosService.getDisponiblesParaTransferencia(campeonatoId).subscribe({
      next: (habilitaciones) => {
        this.jugadoresHabilitados = habilitaciones;
        
        // Inicializar el filtro de búsqueda
        this.filteredJugadores$ = this.jugadorSearchControl.valueChanges.pipe(
          startWith(''),
          map((value) => {
            if (typeof value === 'string' && this.form.get('jugadorCampeonatoId')?.value) {
              this.form.patchValue({ jugadorCampeonatoId: '' }, { emitEvent: false });
            }
            return this._filterJugadores(value);
          })
        );
        
        console.log('Jugadores disponibles para transferencia:', this.jugadoresHabilitados);
      },
      error: (error) => {
        console.error('Error loading jugadores disponibles:', error);
        this.errorMessage = 'Error al cargar los jugadores disponibles para transferencia';
      },
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading = true;
      this.errorMessage = '';
      const formValue = this.form.getRawValue();

      // El valor del select ahora es directamente el jugadorId
      const jugadorId = Number(formValue.jugadorCampeonatoId);
      const equipoDestinoId = this.currentRole === 'master'
        ? Number(formValue.equipoDestinoId)
        : Number(this.currentEquipoId);

      if (!jugadorId || !equipoDestinoId) {
        this.errorMessage = 'Selecciona un jugador y un equipo destino válidos';
        this.loading = false;
        return;
      }

      const createDto: CreateTransferenciaDto = {
        jugadorId: jugadorId,
        campeonatoId: Number(formValue.campeonatoId),
        equipoDestinoId,
        observaciones: formValue.observaciones,
      };

      this.transferenciasService.create(createDto).subscribe({
        next: (response: any) => {
          if (response?.advertencia) {
            this.advertenciaMessage = response.advertencia;
            // Navegar después de 4 segundos para que el usuario lea el aviso
            setTimeout(() => this.router.navigate(['/transferencias']), 4000);
          } else {
            this.router.navigate(['/transferencias']);
          }
        },
        error: (error) => {
          console.error('Error creating transferencia:', error);
          this.errorMessage =
            error.error?.message || 'Error al crear la solicitud de transferencia';
          this.loading = false;
        },
      });
    } else {
      this.markFormGroupTouched(this.form);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.router.navigate(['/transferencias']);
  }

  logout(): void {
    this.authService.logout();
  }

  private _filterJugadores(value: string | JugadorCampeonato | null): JugadorCampeonato[] {
    if (!value || typeof value !== 'string') {
      return this.jugadoresHabilitados;
    }

    const filterValue = value.toLowerCase();
    return this.jugadoresHabilitados.filter((habilitacion) => {
      const jugador = habilitacion.jugador;
      const equipo = habilitacion.equipo;
      const nombreCompleto = jugador?.nombre?.toLowerCase() || '';
      const cedula = jugador?.cedula?.toLowerCase() || '';
      const nombreEquipo = equipo?.nombre?.toLowerCase() || '';

      return (
        nombreCompleto.includes(filterValue) ||
        cedula.includes(filterValue) ||
        nombreEquipo.includes(filterValue)
      );
    });
  }

  displayJugador(jugadorCampeonato: JugadorCampeonato | null): string {
    if (!jugadorCampeonato) return '';
    return this.getJugadorInfo(jugadorCampeonato);
  }

  onJugadorSelected(jugadorCampeonato: JugadorCampeonato): void {
    if (jugadorCampeonato?.jugador?.id) {
      this.form.patchValue({
        jugadorCampeonatoId: jugadorCampeonato.jugador.id,
      });
    }
  }

  getJugadorInfo(jugadorCampeonato: JugadorCampeonato): string {
    const jugador = jugadorCampeonato.jugador;
    const equipo = jugadorCampeonato.equipo;
    return `${jugador?.nombre} (${jugador?.cedula}) - ${equipo?.nombre}`;
  }
}
