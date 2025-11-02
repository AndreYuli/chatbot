# 🚀 Guía de Deployment en Portainer

## 📋 Configuración de Variables de Entorno

Cuando despliegues el stack en Portainer, necesitas configurar las siguientes variables de entorno:

### Backend Python
```env
GEMINI_API_KEY=AIzaSyC89o4EhQhutOOiKQ79yofbypU5P3z0K5A
QDRANT_URL=https://appqdrant.sages.icu
QDRANT_API_KEY=9253bcc8145de2be70135bc786d63949
QDRANT_COLLECTION=ESCUELA-SABATICA
```

### Frontend Next.js
```env
DATABASE_URL=postgresql://postgres:9253bcc8145de2be70135bc786d63949@156.67.25.71:5432/sages
NEXTAUTH_SECRET=L7Di7Zzp12bVUDNqApCG1wyCGueAcPIpQj3IDYrQMz8=
NEXTAUTH_URL=https://escuelasabatica.sages.icu
GOOGLE_CLIENT_ID=76032541326-rfl8ruasnk14octbmhcvc3r06j84c5p5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
PYTHON_BACKEND_URL=http://backend:5000
NEXT_PUBLIC_APP_NAME=SAGES Chat
DEFAULT_LOCALE=es-ES
SUPPORTED_LOCALES=es-ES,en-US,es-CO
```

## 🔧 Pasos para Deploy en Portainer

### 1. Crear el Stack desde GitHub

1. **Stacks** → **Add Stack**
2. **Name**: `escuelasabatica`
3. **Build method**: ✅ Repository
4. **Repository URL**: `https://github.com/AndreYuli/chatbot`
5. **Repository reference**: `refs/heads/main`
6. **Compose path**: `docker-compose.yml`
7. ✅ **Authentication**: Si el repo es privado
8. ✅ **Build Images**: Activar

### 2. Configurar Variables de Entorno

En la sección **Environment variables**, agrega **UNA POR UNA**:

```
GEMINI_API_KEY=AIzaSyC89o4EhQhutOOiKQ79yofbypU5P3z0K5A
QDRANT_URL=https://appqdrant.sages.icu
QDRANT_API_KEY=9253bcc8145de2be70135bc786d63949
QDRANT_COLLECTION=ESCUELA-SABATICA
DATABASE_URL=postgresql://postgres:9253bcc8145de2be70135bc786d63949@156.67.25.71:5432/sages
NEXTAUTH_SECRET=L7Di7Zzp12bVUDNqApCG1wyCGueAcPIpQj3IDYrQMz8=
NEXTAUTH_URL=https://escuelasabatica.sages.icu
GOOGLE_CLIENT_ID=76032541326-rfl8ruasnk14octbmhcvc3r06j84c5p5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
PYTHON_BACKEND_URL=http://backend:5000
NEXT_PUBLIC_APP_NAME=SAGES Chat
DEFAULT_LOCALE=es-ES
SUPPORTED_LOCALES=es-ES,en-US,es-CO
```

### 3. Deploy

Click **Deploy the stack**

### 4. Verificar

Una vez desplegado:

1. Verifica que los contenedores estén corriendo
2. Revisa los logs del frontend para confirmar que Prisma se generó correctamente
3. Si es necesario, ejecuta las migraciones de Prisma:
   ```bash
   docker exec -it escuelasabatica_frontend npx prisma migrate deploy
   ```

## 🌐 Acceso

Tu aplicación estará disponible en: **https://escuelasabatica.sages.icu**

## ⚠️ Importante

- Asegúrate de que el dominio `escuelasabatica.sages.icu` apunte a tu servidor
- Traefik debe estar configurado con Let's Encrypt
- La red `traefik_public` debe existir previamente

## 🔄 Actualizar el Stack

Para actualizar después de hacer cambios en GitHub:

1. **Stacks** → **escuelasabatica** → **Editor**
2. ✅ **Re-pull image and redeploy**
3. ✅ **Build Images** (si cambiaron los Dockerfiles)
4. Click **Update the stack**
