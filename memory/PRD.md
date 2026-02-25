# Cuban-Serbia Visa Center - Product Requirements Document

## Problema Original
Aplicación móvil para gestión de visas entre Cuba y Serbia con panel de administración completo. 
**Visión futura**: Plataforma de servicios donde se puede rentar espacio a diferentes negocios (remesas, tiendas, etc.)

## Arquitectura Actual

```
[APK/Web App] --> [Render Backend (FastAPI)] --> [MongoDB Atlas]
                         |
                    [SendGrid para emails]
```

### URLs de Producción
- **Backend**: `https://cuba-visa-backend.onrender.com`
- **MongoDB Atlas**: Configurado en Render
- **Preview (Desarrollo)**: `https://visa-portal-v2.preview.emergentagent.com`

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
- [x] **Gestión de Proveedores de Servicios** (NUEVO - Feb 2026)

### Sistema de Proveedores de Servicios (Remesas) - NUEVO
- [x] Portal de proveedores independiente (`/provider`)
  - Registro de proveedores (requiere aprobación)
  - Login de proveedores
  - Dashboard para gestionar ofertas
- [x] Gestión de ofertas
  - Título, descripción, tasa de cambio
  - Fecha de vencimiento
  - Activar/desactivar ofertas
- [x] Admin puede activar/desactivar proveedores
- [x] Sección en homepage mostrando ofertas activas
  - Contacto WhatsApp del proveedor
  - Link al grupo de WhatsApp

### Aplicación de Usuario
- [x] Ver destinos disponibles
- [x] Crear solicitudes de visa
- [x] Subir documentos
- [x] Ver estado de solicitud
- [x] Pagos via PayPal (link externo)
- [x] Contacto via WhatsApp
- [x] Ver ofertas de servicios (remesas)

## Base de Datos (MongoDB Atlas)

### Colecciones
- **users**: id, email, hashed_password, full_name, phone, passport_number, is_approved, is_active, is_verified
- **admins**: id, email, hashed_password, role
- **destinations**: id, country, image_url, visa_types, description
- **applications**: id, user_id, destination, status, documents
- **testimonials**: id, image_url, title, description
- **advisors**: id, name, phone, whatsapp
- **service_providers**: id, email, business_name, owner_name, whatsapp_number, service_type, is_active
- **service_offers**: id, provider_id, title, description, exchange_rate, expires_at, is_active

## Credenciales de Prueba
- **Admin**: josemgt91@gmail.com / Jmg910217*
- **Proveedor Test**: remesero@test.com / test123456
- **WhatsApp**: +381693444935

## Archivos Clave
- `/app/backend/server.py` - API FastAPI completa
- `/app/frontend/app/index.tsx` - Homepage con ofertas de servicios
- `/app/frontend/app/provider.tsx` - Portal de proveedores
- `/app/frontend/app/admin-providers.tsx` - Admin de proveedores
- `/app/frontend/app/admin-users.tsx` - Panel de gestión de usuarios
- `/app/frontend/src/config/api.ts` - Configuración de API y enlaces

## Tareas Pendientes

### P0 - Alta Prioridad
- [x] ~~Crear sitio web público~~ - COMPLETADO
- [x] ~~Añadir sección de descarga de app en web~~ - COMPLETADO
- [x] ~~Mejorar diseño responsivo para desktop~~ - COMPLETADO
- [x] ~~Sistema de proveedores de servicios (remesas)~~ - COMPLETADO

### P1 - Media Prioridad
- [ ] Implementar subida de videos para testimonios
- [ ] Conectar barra de progreso de solicitud al backend
- [ ] Añadir descripción a destinos (ya está en backend)

### P2 - Baja Prioridad
- [ ] Mejorar notificaciones push
- [ ] Sistema de chat integrado
- [ ] CI/CD pipeline para builds automáticos del web app
- [ ] Soporte para múltiples tipos de servicios (tiendas, restaurantes)

## Changelog

### Feb 25, 2026 (Sesión actual)
- **Nueva Sección "Nuestros Servicios"**:
  - Reemplazó la sección de descarga de APK
  - Muestra tarjetas de proveedores activos con emoji según tipo de servicio
  - Tipos soportados: remesas (💵), pasajes (✈️), tienda (🛒), restaurante (🍽️), servicios (🔧)
  - Al tocar un proveedor, se navega a su página de ofertas
- **Página de Ofertas de Proveedor** (`/provider-offers`):
  - Muestra información del proveedor (nombre, propietario, descripción)
  - Botones de WhatsApp directo y grupo
  - Lista de ofertas activas con precios y fechas de vencimiento
- **Nuevos Endpoints**:
  - `GET /api/service-providers` - Lista proveedores activos públicamente
  - `GET /api/service-providers/{id}/offers` - Ofertas públicas de un proveedor
- **Backend**: Modelos ServiceProvider y ServiceOffer con registro, login, CRUD de ofertas
- **Testing**: 15 tests backend (100%), frontend UI (100%)

### Feb 23, 2026
- **Sección de Descarga de App**: Nueva sección en la web para descargar el APK
- **Diseño Web Mejorado**: Grid layout para destinos en desktop
- **Refactoring**: Configuración centralizada en api.ts

### Sesiones Anteriores
- Implementado sistema de aprobación de usuarios
- Migración completa a Render y MongoDB Atlas
- Configuración de EAS Build para APK/AAB
