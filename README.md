# SAGES Chat

Chat con IA para la escuela sabática de la Iglesia Adventista Del Séptimo Día

## 🚀 Inicio Rápido

### Requisitos

- Node.js >= 18.19.0
- pnpm >= 8.0.0
- PostgreSQL (para base de datos)

### Instalación

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
# Crea un archivo .env con las siguientes variables:
# DATABASE_URL="postgresql://user:password@localhost:5432/chatbot"
# GOOGLE_CLIENT_ID="tu_google_client_id"
# GOOGLE_CLIENT_SECRET="tu_google_client_secret"
# NEXTAUTH_SECRET="tu_nextauth_secret"
# NEXTAUTH_URL="http://localhost:3000"
# NEXT_PUBLIC_APP_NAME="SAGES Chat"
# N8N_BASE_URL="https://sswebhookss.sages.icu"
# N8N_WEBHOOK_PATH="/webhook/e5a8ee32-7f6f-4633-9c89-270be92427cc"

# Generar cliente de Prisma
pnpm prisma generate

# Ejecutar migraciones
pnpm prisma db push

# Iniciar servidor de desarrollo
pnpm dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

**URLs principales:**
- `/` → Redirige a `/es-ES/auth/signin`
- `/es-ES/auth/signin` → Página de inicio de sesión
- `/es-ES/chat` → Interfaz de chat

## 📦 Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Inicia servidor de desarrollo

# Producción
pnpm build            # Construye para producción
pnpm start            # Inicia servidor de producción

# Calidad
pnpm type-check       # Verifica tipos de TypeScript
pnpm lint             # Ejecuta linter

# Tests E2E
pnpm test:e2e         # Ejecuta tests de Playwright (headless)
pnpm test:e2e:ui      # Ejecuta tests con UI visual
pnpm test:e2e:headed  # Ejecuta tests mostrando el navegador
pnpm test:e2e:debug   # Ejecuta tests en modo debug
```

## 🧪 Tests E2E

### Primera vez

```bash
# Instalar navegadores de Playwright
pnpm exec playwright install chromium
```

### Ejecutar tests

```bash
# Tests automáticos
pnpm test:e2e

# Ver reporte HTML
pnpm exec playwright show-report
```

Ver documentación completa en [`tests/README.md`](./tests/README.md)

## 🗄️ Base de Datos

### Configuración de PostgreSQL

```bash
# 1. Configurar DATABASE_URL en .env
DATABASE_URL="postgresql://user:password@localhost:5432/chatbot"

# 2. Crear migración inicial
npx prisma migrate dev --name init

# 3. Abrir Prisma Studio (opcional)
npx prisma studio
```

Ver documentación completa en [`Información/IMPLEMENTACION_PRISMA.md`](./Información/IMPLEMENTACION_PRISMA.md)

## 🔒 Seguridad (CSP)

La aplicación incluye Content Security Policy configurada en `next.config.js`:

- Permite conexiones solo a `'self'` y `N8N_BASE_URL`
- Headers de seguridad (HSTS, X-Frame-Options, etc.)
- Protección contra XSS y clickjacking

Ver documentación completa en [`Información/CSP_Y_TESTS.md`](./Información/CSP_Y_TESTS.md)

## 🌍 Internacionalización (i18n)

Idiomas soportados:
- 🇪🇸 Español España (es-ES) - **Por defecto**
- 🇺🇸 Inglés (en-US)
- 🇨🇴 Español Colombia (es-CO)

### Estructura de URLs:
```
/ → /es-ES/auth/signin (redirección automática)

/es-ES/auth/signin → Página de login en español
/es-ES/chat → Chat en español

/en-US/auth/signin → Página de login en inglés
/en-US/chat → Chat en inglés

/es-CO/auth/signin → Página de login en español Colombia
/es-CO/chat → Chat en español Colombia
```

**Nota:** Todas las rutas deben incluir el prefijo de idioma (`/es-ES/`, `/en-US/`, o `/es-CO/`)

## 🔌 Integración con n8n

### Variables de entorno requeridas

```env
N8N_BASE_URL=https://sswebhookss.sages.icu
N8N_WEBHOOK_PATH=/webhook/e5a8ee32-7f6f-4633-9c89-270be92427cc
N8N_API_KEY=          # Opcional
```

### Contrato de integración

**Request** (POST `/api/chat/send`):
```json
{
  "message": "Hola",
  "conversationId": null,
  "settings": {
    "topK": 5,
    "temperature": 0.7,
    "model": "n8n"
  }
}
```

**Response** (SSE):
```
data: {"type":"message","data":{"content":"..."}}
data: {"type":"sources","data":{"sources":[...]}}
data: {"type":"usage","data":{"usage":{...}}}
data: {"type":"complete","data":{"ok":true,"conversationId":"..."}}
```

Ver documentación completa en [`Información/BUILD_SPEC.md`](./Información/BUILD_SPEC.md)

## 📁 Estructura del Proyecto

```
chatbot/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # NextAuth endpoints
│   │   ├── chat/send/            # Endpoint SSE para chat
│   │   ├── conversations/        # CRUD de conversaciones
│   │   ├── keep-alive/           # Keep-alive para n8n
│   │   ├── force-activate/       # Activación forzada de webhook
│   │   ├── auto-activate/        # Activación automática
│   │   └── upload/               # Subida de archivos
│   ├── [locale]/                 # Rutas internacionalizadas
│   │   ├── auth/signin/          # Página de login
│   │   └── chat/                 # Interfaz principal de chat
│   ├── globals.css               # Estilos globales
│   ├── layout.tsx                # Layout raíz con AuthProvider
│   └── page.tsx                  # Página raíz (redirige a signin)
├── components/                   # Componentes React
│   ├── AuthProvider.tsx          # Provider de NextAuth
│   ├── ChatArea.tsx              # Área de mensajes
│   ├── ChatHeader.tsx            # Header con usuario
│   ├── ChatInput.tsx             # Input y botones
│   ├── ConversationSidebar.tsx   # Sidebar de conversaciones
│   └── MessageBubble.tsx         # Burbujas de mensajes
├── hooks/                        # Custom hooks
│   ├── useChat.ts                # Hook principal de chat
│   ├── useConversations.ts       # Gestión de conversaciones
│   └── useWebhookKeepAlive.ts    # Keep-alive de webhooks
├── lib/                          # Utilidades
│   ├── auth.ts                   # Configuración NextAuth
│   └── prisma.ts                 # Cliente Prisma
├── messages/                     # Traducciones i18n
│   ├── es-ES.json                # Español España
│   ├── en-US.json                # Inglés
│   └── es-CO.json                # Español Colombia
├── prisma/                       # Base de datos
│   ├── schema.prisma             # Esquema de BD
│   └── migrations/               # Migraciones
├── tests/                        # Tests E2E (Playwright)
│   └── e2e/
│       └── chat.spec.ts
├── Información/                  # Documentación técnica
│   └── BUILD_SPEC.md             # Especificación completa
├── i18n.ts                       # Configuración next-intl
├── middleware.ts                 # Middleware de i18n
├── navigation.ts                 # Navegación internacionalizada
├── next.config.js                # Config Next.js + next-intl
└── start-clean.ps1               # Script de inicio limpio
```

## 🎯 data-testid Implementados

Para facilitar testing, todos los componentes tienen `data-testid`:

- `new-conversation` - Botón crear nueva conversación
- `sidebar-search` - Input de búsqueda en sidebar
- `chat-input` - Input principal del chat
- `send-button` - Botón enviar mensaje
- `message-user` - Burbujas de mensajes del usuario
- `message-assistant` - Burbujas de mensajes del asistente
- `view-sources` - Botón para ver fuentes

## 📚 Documentación

- [`Información/BUILD_SPEC.md`](./Información/BUILD_SPEC.md) - Especificación completa del proyecto
- [`Información/IMPLEMENTACION_PRISMA.md`](./Información/IMPLEMENTACION_PRISMA.md) - Guía de base de datos
- [`Información/CSP_Y_TESTS.md`](./Información/CSP_Y_TESTS.md) - Seguridad y testing
- [`tests/README.md`](./tests/README.md) - Guía de tests E2E

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 14.0.4 (App Router)
- **Lenguaje**: TypeScript 5.3.3
- **Estilos**: Tailwind CSS 3.3.6
- **i18n**: next-intl 3.4.0
- **Base de datos**: Prisma 5.7.0 + PostgreSQL
- **Testing**: Playwright 1.40.1
- **Gestión de paquetes**: pnpm 8.x

## 🐳 Docker (Producción)

```bash
# Construir imagen
docker build -t qoder-chat .

# Ejecutar contenedor
docker run -p 3000:3000 --env-file .env qoder-chat
```

Ver `Dockerfile` para más detalles.

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Haz commit: `git commit -am 'Añade nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crea un Pull Request

## 📝 Licencia

Este proyecto es privado y está destinado solo para uso educativo.

## 👥 Autores

- **Andre Yuli Lopez** - Desarrollo inicial
- **Corporación Universitaria Adventista** - Proyecto académico