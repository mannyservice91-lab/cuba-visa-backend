# Cuban-Serbia Visa Center - Product Requirements Document

## Overview
Plataforma de marketplace de servicios de visa que permite al administrador principal alquilar espacio a proveedores de servicios (remeseros, agencias de viajes) con sistema de suscripción.

## User Personas
1. **Administrador Principal**: Gestiona la plataforma, aprueba proveedores, activa suscripciones, crea destinos y promociones propias
2. **Proveedor de Servicios**: Empresas que pagan por publicar sus ofertas (remesas, pasajes)
3. **Usuario Final**: Visitantes que consultan servicios de visa y ofertas de proveedores

## Core Requirements

### Sistema de Proveedores
- Registro y login de proveedores
- Dashboard privado para gestionar perfil y ofertas
- Tipos de servicio: remesas, pasajes
- Estados de suscripción: trial (7 días), active, expired, awaiting_payment

### Sistema de Suscripciones
- 7 días de prueba gratis al aprobar nuevo proveedor
- Planes de pago: 50€/mes, 250€/6 meses, 450€/año
- Aprobación manual de pagos por el admin
- Desactivación automática si no hay pago después del trial

### Panel de Admin
- Gestión de usuarios (aprobar/rechazar)
- Gestión de proveedores (aprobar, activar suscripciones)
- Gestión de destinos (crear/editar/eliminar con descripción)
- Mis Promociones (ofertas propias del admin en homepage)
- Gestión de asesores (WhatsApp de contacto)
- Testimonios de clientes

### Homepage
- Sección de destinos disponibles
- Sección de proveedores activos por tipo de servicio
- Promociones del administrador
- Testimonios

## Tech Stack
- **Backend**: FastAPI + MongoDB (Motor) + Pydantic
- **Frontend**: React Native / Expo (Web + Mobile)
- **Database**: MongoDB Atlas (Producción)
- **Deployment**: Render (Backend y Static Site)
- **Auth**: JWT con tokens de acceso

## What's Been Implemented

### 2026-02-25
- **Sistema de Suscripciones COMPLETO**:
  - Endpoint `/api/provider/me` devuelve estado de suscripción (subscription_status, days_remaining)
  - Endpoint `/api/admin/service-providers/{id}/approve-payment` para aprobar pagos
  - Dashboard del proveedor muestra tarjeta de estado de suscripción con alertas
  - Estados: trial, active, expired, awaiting_payment, trial_pending
  
- **Gestión de Destinos COMPLETO**:
  - CRUD completo (POST, PUT, DELETE) en `/api/admin/destinations`
  - Campo `description` añadido a destinos
  - UI con modal para crear nuevos destinos
  - UI con modal para editar destinos (incluye descripción)
  - Icono de editar y botón + en header
  
- **Mis Promociones COMPLETO**:
  - CRUD completo en `/api/admin/promotions` con JSON body
  - Endpoint público `/api/promotions` para mostrar en homepage
  - UI funcional para crear/editar/eliminar promociones
  - Soporte para imagen base64

### Anteriormente Completado
- Marketplace multi-proveedor funcional
- Login/registro de proveedores
- Dashboard de proveedor con gestión de ofertas
- Homepage con cards de proveedores por tipo de servicio
- Panel admin con todas las secciones de navegación
- Sistema de testimonios
- Sistema de asesores

## Testing Status
- **Backend**: 100% de tests pasando (30 tests)
- **Frontend**: 95% funcional (warning de shadow* deprecado)

## API Endpoints

### Públicos
- GET /api/destinations
- GET /api/service-providers
- GET /api/service-offers
- GET /api/promotions
- GET /api/testimonials

### Admin (requiere Bearer token)
- POST/GET /api/admin/destinations
- PUT/DELETE /api/admin/destinations/{id}
- POST/GET /api/admin/promotions
- PUT/DELETE /api/admin/promotions/{id}
- GET /api/admin/service-providers
- PUT /api/admin/service-providers/{id}/approve-payment
- PUT /api/admin/service-providers/{id}/toggle

### Provider (requiere Bearer token)
- GET /api/provider/me (incluye subscription_status, days_remaining)
- POST/GET /api/provider/offers
- PUT/DELETE /api/provider/offers/{id}

## Prioritized Backlog

### P0 - Critical (Completado)
- [x] Sistema de suscripciones completo
- [x] Gestión de destinos con descripción
- [x] Mis Promociones del admin

### P1 - High Priority (Pendiente)
- [ ] Desactivación automática de proveedores con trial expirado (scheduled job)
- [ ] Subida de logo/imagen por parte de proveedores
- [ ] Mostrar promociones del admin en homepage

### P2 - Medium Priority (Futuro)
- [ ] Videos de testimonios
- [ ] Barra de progreso de aplicación conectada al backend
- [ ] CI/CD para despliegue automático web

### P3 - Low Priority (Futuro)
- [ ] Migrar shadow* styles a boxShadow (deprecation warnings)
- [ ] Notificaciones push para proveedores

## Credentials
- **Admin**: josemgt91@gmail.com / Jmg910217*
- **Test Provider**: remesero@test.com / test123456
