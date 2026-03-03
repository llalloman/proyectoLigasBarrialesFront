import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../models/auth.model';
import { ConfiguracionService } from './configuracion.service';

/**
 * Servicio de autenticación
 * Aplica principios SOLID:
 * - Single Responsibility: Solo maneja lógica de autenticación
 * - Dependency Inversion: Depende de HttpClient (abstracción)
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Observable para el estado de autenticación
  private currentUserSubject = new BehaviorSubject<User | null>(
    this.getUserFromStorage()
  );
  public currentUser$ = this.currentUserSubject.asObservable();
  public user$ = this.currentUser$;

  constructor(private http: HttpClient, private router: Router, private configuracionService: ConfiguracionService) {}

  /**
   * Realiza el login del usuario
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response) => {
          this.saveAuthData(response);
          // Cargar configuración global tras login
          this.configuracionService.cargar().subscribe();
        })
      );
  }

  /**
   * Realiza el registro del usuario
   */
  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(
        tap((response) => {
          this.saveAuthData(response);
        })
      );
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.configuracionService.reset();
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el token de autenticación
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Obtiene el valor actual del usuario (getter)
   */
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  /**
   * Guarda los datos de autenticación en localStorage
   */
  private saveAuthData(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  /**
   * Recupera el usuario desde localStorage
   */
  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Obtiene usuarios disponibles para ser dirigentes de equipos
   */
  getDirigentesDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/dirigentes-disponibles`);
  }
  /**
   * Obtiene usuarios disponibles para ser dirigentes filtrados por liga
   */
  getDirigentesDisponiblesByLiga(ligaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/dirigentes-disponibles?ligaId=${ligaId}`);
  }
  /**
   * Obtiene usuarios disponibles para ser directivos de liga
   */
  getDirectivosDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/directivos-disponibles`);
  }

  /**
   * Obtiene todos los roles disponibles en el sistema
   */
  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/roles`);
  }
}