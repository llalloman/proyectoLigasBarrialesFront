# Frontend - Sistema de Ligas Barriales

Frontend construido con Angular, TypeScript y arquitectura modular.

## Tecnologías

- **Angular 17** - Framework frontend moderno
- **TypeScript** - Tipado estático
- **RxJS** - Programación reactiva
- **SCSS** - Estilos con preprocesador
- **Reactive Forms** - Formularios reactivos

## Arquitectura

El proyecto sigue principios SOLID y clean code:

- **Single Responsibility**: Cada componente/servicio tiene una única responsabilidad
- **Dependency Injection**: Las dependencias se inyectan mediante constructores
- **Modular**: Código organizado en módulos lazy-loaded
- **Reactive**: Uso de Observables para gestión de estado

## Estructura del proyecto

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/              # Servicios core, guards, interceptors
│   │   │   ├── guards/       # Guards de autenticación
│   │   │   ├── interceptors/ # HTTP interceptors
│   │   │   ├── models/       # Modelos e interfaces
│   │   │   └── services/     # Servicios globales
│   │   ├── modules/          # Módulos de la aplicación
│   │   │   ├── auth/         # Módulo de autenticación
│   │   │   └── dashboard/    # Dashboard principal
│   │   ├── app.component.ts
│   │   ├── app.module.ts
│   │   └── app-routing.module.ts
│   ├── environments/         # Configuración de entornos
│   ├── styles.scss          # Estilos globales
│   └── index.html
├── angular.json
├── package.json
└── tsconfig.json
```

## Instalación

### Requisitos previos
- Node.js (v18 o superior)
- npm o yarn
- Angular CLI: `npm install -g @angular/cli`

### Pasos

1. Instalar dependencias:
```bash
npm install
```

2. Configurar entorno (opcional):
Editar `src/environments/environment.development.ts` si es necesario:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};
```

3. Iniciar el servidor de desarrollo:
```bash
npm start
# o
ng serve --port 4201
```

La aplicación estará disponible en `http://localhost:4201`

## Scripts disponibles

```bash
# Desarrollo
npm start          # Inicia servidor de desarrollo
ng serve --open    # Inicia y abre en el navegador

# Producción
npm run build      # Build de producción

# Tests
npm test           # Ejecuta tests unitarios
npm run test:watch # Tests en modo watch

# Linting
npm run lint       # Ejecuta el linter
```

## Características implementadas

### Módulo de Autenticación
- ✅ Login con validación de formularios
- ✅ Autenticación JWT
- ✅ Interceptor HTTP para agregar token
- ✅ Guard para proteger rutas
- ✅ Manejo de sesión en localStorage
- ✅ Diseño responsive

### Dashboard
- ✅ Vista protegida (requiere autenticación)
- ✅ Información del usuario
- ✅ Cerrar sesión

## Próximos pasos

1. Implementar módulo de registro de usuarios
2. Crear módulos para ligas, equipos, jugadores
3. Implementar guards de roles para permisos
4. Agregar mensajes de notificación (toast/snackbar)
5. Implementar tests unitarios
6. Agregar loading states y skeleton loaders

## Uso

### Login
1. Abrir `http://localhost:4201/login`
2. Ingresar credenciales (primero crear usuario en el backend)
3. Serás redirigido al dashboard

### Crear primer usuario (usando el backend)
```bash
# Usando curl o Postman
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "nombre": "Admin",
  "email": "admin@example.com",
  "password": "123456",
  "rolId": 1
}
```

Nota: Primero debes crear el rol en la base de datos.

## Convenciones de código

- Componentes: `nombre.component.ts`
- Servicios: `nombre.service.ts`
- Guards: `nombre.guard.ts`
- Interceptors: `nombre.interceptor.ts`
- Modelos: `nombre.model.ts`
- Usar camelCase para variables y funciones
- Usar PascalCase para clases e interfaces
- Comentar código complejo
# proyectoLigasBarrialesFront
