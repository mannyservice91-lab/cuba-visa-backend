# Cuban-Serbia Visa Center - Product Requirements Document

## Problema Original
Aplicación móvil para gestión de visas entre Cuba y Serbia con panel de administración completo.

## Arquitectura Actual

```
[APK/Web App] --> [Render Backend (FastAPI)] --> [MongoDB Atlas]
                         |
                    [SendGrid para emails]
```

### URLs de Producción
- **Backend**: `https://cuba-visa-backend.onrender.com`
- **MongoDB Atlas**: Configurado en Render
- **Preview (Desarrollo)**: `https://cuba-serbia-visa.preview.emergentagent.com`

## Funcionalidades Implementadas

### Sistema de Autenticación
- [x] Login de usuarios con JWT
- [x] Registro de usuarios con validación
- [x] **Sistema de Aprobación de Admin** (NUEVO - Feb 2026)
  - Usuarios registrados quedan en estado "pendiente"
  - Pantalla de "Pendiente de Aprobación" con botón WhatsApp
  - Login bloqueado hasta aprobación por admin
  - Panel admin para aprobar/revocar usuarios
- [x] Login de administrador separado
- [x] Eliminada la verificación por email (no funcionaba)

### Panel de Administración
- [x] Dashboard con estadísticas
- [x] Gestión de destinos y tipos de visa
- [x] Gestión de usuarios (aprobar, revocar, desactivar, eliminar)
- [x] Gestión de testimonios (fotos de visas)
- [x] Gestión de asesores
- [x] Gestión de solicitudes

### Aplicación de Usuario
- [x] Ver destinos disponibles
- [x] Crear solicitudes de visa
- [x] Subir documentos
- [x] Ver estado de solicitud
- [x] Pagos via PayPal (link externo)
- [x] Contacto via WhatsApp

## Base de Datos (MongoDB Atlas)

### Colecciones
- **users**: id, email, hashed_password, full_name, phone, passport_number, is_approved, is_active, is_verified
- **admins**: id, email, hashed_password, role
- **destinations**: id, country, image_url, visa_types
- **applications**: id, user_id, destination, status, documents
- **testimonials**: id, image_url, title, description
- **advisors**: id, name, phone, whatsapp

## Credenciales de Prueba
- **Admin**: josemgt91@gmail.com / Jmg910217*
- **WhatsApp**: +381693444935

## Archivos Clave
- `/app/backend/server.py` - API FastAPI completa
- `/app/frontend/app/register.tsx` - Registro con pantalla de aprobación pendiente
- `/app/frontend/app/login.tsx` - Login con bloqueo para no aprobados
- `/app/frontend/app/admin-users.tsx` - Panel de gestión de usuarios
- `/app/frontend/src/config/api.ts` - Configuración de API

## Tareas Pendientes

### P0 - Alta Prioridad
- [ ] Crear sitio web público (Opción C: Landing + Web App)

### P1 - Media Prioridad
- [ ] Implementar subida de videos para testimonios
- [ ] Conectar barra de progreso de solicitud al backend

### P2 - Baja Prioridad
- [ ] Mejorar notificaciones push
- [ ] Sistema de chat integrado

## Changelog

### Feb 23, 2026
- Implementado sistema completo de aprobación de usuarios por admin
- Eliminada verificación de email (no funcionaba)
- Pantalla de "Pendiente de Aprobación" con botón WhatsApp en registro
- Pantalla de "Cuenta Pendiente" con botón WhatsApp en login para no aprobados
- Panel admin actualizado con badges de estado (Aprobado/Pendiente) y botones de aprobar/revocar

### Sesiones Anteriores
- Migración completa a Render y MongoDB Atlas
- Configuración de EAS Build para APK/AAB
- Corrección de bugs de compilación React Native
