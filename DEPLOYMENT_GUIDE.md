# 🚀 Guía de Despliegue - Chatbot SAGES en Docker Swarm

Esta guía documenta los pasos exactos para desplegar el chatbot de Escuela Sabática en un servidor con Docker Swarm (Contabo VPS).

## 📋 Prerrequisitos

- Servidor con Docker Swarm inicializado
- Traefik configurado con red `traefik_public`
- Base de datos PostgreSQL accesible
- Repositorio GitHub: `AndreYuli/chatbot`

## 🔧 Pasos de Despliegue

### 1. Conectarse al Servidor

```bash
ssh root@156.67.25.71
cd /tmp/chatbot
```

### 2. Actualizar el Código desde GitHub

```bash
git pull origin main
```

### 3. Construir las Imágenes Docker

```bash
# Construir backend Python
docker build -t chatbot-backend:latest ./python/backend

# Construir frontend Next.js
docker build -t chatbot-frontend:latest .
```

**Nota importante**: El Dockerfile usa Alpine 3.18 para compatibilidad con OpenSSL 1.1 (requerido por Prisma 5.7.0).

### 4. Configurar Variables de Entorno

Crear el archivo `.env` en `/tmp/chatbot`:

```bash
nano .env
```

Contenido del archivo `.env`:

```env
# Gemini API
GEMINI_API_KEY=AIzaSyC89o4EhQhutOOiKQ79yofbypU5P3z0K5A

# Qdrant Vector Database
QDRANT_URL=https://appqdrant.sages.icu
QDRANT_API_KEY=9253bcc8145de2be70135bc786d63949
QDRANT_COLLECTION=ESCUELA-SABATICA

# Database
DATABASE_URL=postgresql://postgres:9253bcc8145de2be70135bc786d63949@156.67.25.71:5432/sages

# NextAuth
NEXTAUTH_SECRET=L7Di7Zzp12bVUDNqApCG1wyCGueAcPIpQj3IDYrQMz8=
NEXTAUTH_URL=https://escuelasabatica.sages.icu

# Google OAuth
GOOGLE_CLIENT_ID=76032541326-rfl8ruasnk14octbmhcvc3r06j84c5p5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Backend Services (usar nombres internos de Docker)
PYTHON_BACKEND_URL=http://escuelasabatica_backend:5000
N8N_BASE_URL=http://n8n_fila_n8n_webhook:5678
N8N_WEBHOOK_PATH=/webhook/e5a8ee32-7f6f-4633-9c89-270be92427cc
N8N_API_KEY=your-n8n-api-key-here

# App Config
NEXT_PUBLIC_APP_NAME=SAGES Chat
DEFAULT_LOCALE=es-ES
SUPPORTED_LOCALES=es-ES,en-US,es-CO
NODE_ENV=production
LOG_LEVEL=info
APP_VERSION=1.0.0
```

**⚠️ IMPORTANTE**: 
- Para `PYTHON_BACKEND_URL` y `N8N_BASE_URL` usa los **nombres internos de los servicios Docker**, NO los dominios externos.
- Los dominios externos (como `n8n.sages.icu`) no se pueden resolver desde dentro de los contenedores.

Guardar con `Ctrl+O`, Enter, `Ctrl+X`.

### 5. Desplegar el Stack en Docker Swarm

```bash
# Cargar las variables de entorno
export $(cat .env | xargs)

# Si existe un stack anterior, eliminarlo
docker stack rm escuelasabatica

# Esperar 30 segundos para que se limpie
sleep 30

# Desplegar el nuevo stack
docker stack deploy -c docker-compose.yml escuelasabatica
```

### 6. Verificar el Despliegue

```bash
# Ver el estado de los servicios
docker service ls | grep escuelasabatica

# Debería mostrar:
# o9v42hehf142   escuelasabatica_backend      replicated   1/1   chatbot-backend:latest
# etq388rxwhy5   escuelasabatica_frontend     replicated   1/1   chatbot-frontend:latest
```

### 7. Aplicar Migraciones de Prisma

```bash
# Listar contenedores del frontend
docker ps | grep escuelasabatica_frontend

# Ejecutar migraciones (reemplaza <container-id> con el ID real)
docker exec -it <container-id> npx prisma migrate deploy

# Ejemplo:
# docker exec -it 944f3bd48a94 npx prisma migrate deploy
```

### 8. Ver los Logs

```bash
# Logs del frontend
docker service logs escuelasabatica_frontend -f

# Logs del backend
docker service logs escuelasabatica_backend -f
```

### 9. Verificar que Funcione

```bash
# Probar el endpoint de salud
curl https://escuelasabatica.sages.icu/api/keep-alive
```

Abrir en el navegador: https://escuelasabatica.sages.icu

## 🔄 Actualizar la Aplicación

Para actualizar después de hacer cambios en el código:

```bash
cd /tmp/chatbot

# 1. Pull de los cambios
git pull origin main

# 2. Reconstruir imágenes
docker build -t chatbot-backend:latest ./python/backend
docker build -t chatbot-frontend:latest .

# 3. Eliminar stack
docker stack rm escuelasabatica
sleep 30

# 4. Recargar variables
export $(cat .env | xargs)

# 5. Redesplegar
docker stack deploy -c docker-compose.yml escuelasabatica

# 6. Ver logs
docker service logs escuelasabatica_frontend -f
```

## 📝 Notas Importantes

### Sobre las Variables de Entorno

Docker Stack **NO lee archivos `.env` automáticamente**. Por eso es necesario:

```bash
export $(cat .env | xargs)
```

Esto carga las variables en el shell, y luego Docker Stack las inyecta en los contenedores.

### Sobre las Redes Docker

La app usa dos redes:
- `chatbot_internal`: Red interna para comunicación backend ↔ frontend
- `traefik_public`: Red externa (overlay de Swarm) para exposición vía Traefik

La red `traefik_public` debe existir y ser **attachable**:

```bash
# Verificar la red
docker network inspect traefik_public

# Si no existe o no es attachable, recrearla:
docker network rm traefik_public
docker network create traefik_public --driver overlay --attachable
```

### Migraciones de Base de Datos

Las migraciones incluidas:
- `20251027123055_init`: Esquema inicial
- `20251028183229_correcciones`: Correcciones
- `20251103225434_add_guest_sessions`: ⭐ **Sesiones de invitados**

La migración `add_guest_sessions` agrega:
- Modelo `GuestSession` para usuarios sin login
- Campo `guestSessionId` en conversaciones
- Campo `userId` ahora opcional
- Títulos automáticos basados en primer mensaje
- Auto-migración de conversaciones invitado → usuario

### Troubleshooting

**Error: "network traefik_public not manually attachable"**
```bash
docker network rm traefik_public
docker network create traefik_public --driver overlay --attachable
```

**Error: "getaddrinfo ENOTFOUND n8n.sages.icu"**
- Cambiar `N8N_BASE_URL` a usar el nombre interno del servicio:
  `http://n8n_fila_n8n_webhook:5678`

**Las variables no se aplican al contenedor**
- Asegurarse de ejecutar `export $(cat .env | xargs)` antes de cada deploy
- Mejor opción: Usar Portainer para gestionar variables de entorno

**Error 500 en /api/chat/send**
- Verificar que `PYTHON_BACKEND_URL` y `N8N_BASE_URL` usen nombres internos
- Verificar que ambos servicios estén corriendo
- Revisar logs: `docker service logs escuelasabatica_frontend -f`

## ✅ Verificación Final

Después del despliegue, verificar:

1. ✅ Servicios corriendo: `docker service ls | grep escuelasabatica`
2. ✅ API respondiendo: `curl https://escuelasabatica.sages.icu/api/keep-alive`
3. ✅ Frontend accesible: https://escuelasabatica.sages.icu
4. ✅ Sin errores en logs: `docker service logs escuelasabatica_frontend --tail 50`
5. ✅ Crear conversación de invitado funciona
6. ✅ Enviar mensaje funciona (n8n o Python)
7. ✅ Título se genera automáticamente

## 🎯 Funcionalidades Implementadas

- ✅ **Sesiones de invitados**: Usuarios sin login pueden crear conversaciones persistentes en DB
- ✅ **Títulos inteligentes**: Generados automáticamente del primer mensaje
- ✅ **Auto-migración**: Conversaciones de invitado migran a cuenta de usuario al hacer login
- ✅ **Cookie de sesión**: `guest_token` expira al cerrar navegador
- ✅ **Dual backend**: Soporta N8N y Python RAG simultáneamente

## 📚 Recursos

- **Repositorio**: https://github.com/AndreYuli/chatbot
- **Dominio**: https://escuelasabatica.sages.icu
- **Portainer**: Gestión visual de Docker Swarm
- **Traefik**: Reverse proxy con SSL automático

---

**Última actualización**: Noviembre 4, 2025  
**Versión**: 1.0.0
