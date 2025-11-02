# 🤖 Selector de Modelos de IA

## Descripción General

El chatbot ahora soporta **dos backends de IA diferentes**:

1. **n8n (Gemini)** - Modelo predeterminado
   - Usa Google Gemini como LLM
   - Integrado con n8n workflow
   - RAG con Qdrant vector store
   - Memoria de conversación con Redis

2. **Python RAG** - Backend personalizado
   - Backend Python con FastAPI
   - RAG con Qdrant y LangChain
   - Procesamiento personalizado de documentos

## 🎯 Características

### ✅ Selector Visual
- Dropdown en la interfaz de chat
- Íconos distintivos: 🤖 para n8n, 🐍 para Python
- Descripción de cada modelo

### ✅ Modal de Confirmación
- Alerta al usuario cuando intenta cambiar de modelo
- Explica que se creará una nueva conversación
- Muestra características del modelo seleccionado
- Opciones de Confirmar o Cancelar

### ✅ Gestión de Conversaciones
- Cada conversación guarda el modelo utilizado
- Al cambiar de modelo se crea automáticamente una nueva conversación
- La conversación actual se guarda antes del cambio

### ✅ Persistencia
- El modelo se guarda en `conversation.settings` (campo JSON)
- Las conversaciones mantienen su modelo original

## 📁 Archivos Creados/Modificados

### Nuevos Componentes

1. **`components/ModelSelector.tsx`**
   - Componente dropdown para seleccionar modelo
   - Tipo: `AIModel = 'n8n' | 'python'`
   - Props: `currentModel`, `onModelChange`, `disabled`

2. **`components/ModelChangeModal.tsx`**
   - Modal de confirmación para cambio de modelo
   - Muestra modelo origen y destino
   - Lista características del nuevo modelo
   - Botones: Cancelar / Crear Nueva Conversación

3. **`app/api/chat/python/route.ts`**
   - Endpoint para el backend Python
   - Proxy a `http://localhost:8000/chat`
   - Maneja streaming SSE
   - Guarda mensajes en PostgreSQL

### Archivos Modificados

1. **`hooks/useChat.ts`**
   - Ahora acepta parámetro `model: 'n8n' | 'python'`
   - Enruta a `/api/chat/send` (n8n) o `/api/chat/python` (Python)
   - Pasa modelo en settings de la petición

2. **`components/ChatInput.tsx`**
   - Integra `ModelSelector`
   - Props nuevas: `currentModel`, `onModelChange`
   - Pasa modelo actual al enviar mensajes

3. **`app/[locale]/chat/page.tsx`**
   - Estado para modelo actual (`currentModel`)
   - Estado para modelo pendiente (`pendingModel`)
   - Control del modal de cambio (`showModelChangeModal`)
   - Lógica para confirmar/cancelar cambio de modelo
   - Reset de conversación al cambiar modelo

4. **`.env.example`**
   - Nueva variable: `PYTHON_BACKEND_URL`

## 🚀 Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local` (si no existe) y agrega:

```env
# Python Backend
PYTHON_BACKEND_URL="http://localhost:8000"
```

### 2. Levantar Backend Python

Navega a la carpeta del backend Python:

```bash
cd python/backend
```

Instala dependencias (si no lo has hecho):

```bash
pip install -r requirements.txt
```

Levanta el servidor:

```bash
python app.py
```

El servidor debería estar corriendo en `http://localhost:8000`

### 3. Verificar Qdrant

Asegúrate de que Qdrant esté corriendo:

```bash
# Si usas Docker:
docker run -p 6333:6333 qdrant/qdrant
```

## 📖 Uso

### Para Usuarios

1. **Seleccionar Modelo**
   - En la interfaz de chat, haz clic en el dropdown del selector de modelo
   - Verás las opciones: n8n (Gemini) y Python RAG

2. **Cambiar de Modelo**
   - Selecciona el modelo deseado
   - Si tienes una conversación activa, aparecerá un modal de confirmación
   - El modal te informa que se creará una nueva conversación
   - Confirma el cambio o cancélalo

3. **Nueva Conversación**
   - Al confirmar, la conversación actual se guarda automáticamente
   - Se crea una nueva conversación con el modelo seleccionado
   - Puedes empezar a chatear inmediatamente

4. **Conversaciones Guardadas**
   - Cada conversación recuerda qué modelo utilizó
   - Al abrir una conversación antigua, se mantiene su modelo original

### Para Desarrolladores

#### Tipo `AIModel`

```typescript
export type AIModel = 'n8n' | 'python';
```

#### Uso del Hook `useChat`

```typescript
const { handleSubmit } = useChat();

// En el submit:
handleSubmit(e, 'n8n');      // Usa n8n
handleSubmit(e, 'python');   // Usa Python
```

#### Estructura de la Petición

```typescript
// Petición a /api/chat/send (n8n) o /api/chat/python
{
  message: "Hola, ¿cómo estás?",
  conversationId: "uuid-conversation",
  settings: {
    topK: 5,
    temperature: 0.7,
    model: "n8n" // o "python"
  }
}
```

#### Respuesta SSE (Server-Sent Events)

Ambos endpoints devuelven eventos SSE con este formato:

```
data: {"type":"message","data":{"content":"Hola "}}
data: {"type":"message","data":{"content":"mundo"}}
data: {"type":"sources","data":{"sources":[...]}}
data: {"type":"complete","data":{"conversationId":"uuid"}}
```

## 🔧 Personalización

### Agregar Nuevo Modelo

1. **Actualizar tipo `AIModel`** en `components/ModelSelector.tsx`:

```typescript
export type AIModel = 'n8n' | 'python' | 'nuevo-modelo';
```

2. **Agregar al array `models`**:

```typescript
const models = [
  { id: 'n8n', name: 'n8n (Gemini)', description: '...', icon: '🤖' },
  { id: 'python', name: 'Python RAG', description: '...', icon: '🐍' },
  { id: 'nuevo-modelo', name: 'Nuevo', description: '...', icon: '🎯' }
];
```

3. **Crear endpoint** en `app/api/chat/nuevo-modelo/route.ts`

4. **Actualizar routing** en `useChat.ts`:

```typescript
const endpoint = 
  model === 'python' ? '/api/chat/python' :
  model === 'nuevo-modelo' ? '/api/chat/nuevo-modelo' :
  '/api/chat/send';
```

### Personalizar Modal

Edita `components/ModelChangeModal.tsx` para:
- Cambiar colores
- Modificar textos
- Agregar más información
- Cambiar animaciones

### Cambiar Modelo por Defecto

En `app/[locale]/chat/page.tsx`:

```typescript
const [currentModel, setCurrentModel] = useState<AIModel>('python'); // Cambiar aquí
```

## 🧪 Testing

### Flujo Completo

1. Abre el chat
2. Envía un mensaje con modelo n8n (default)
3. Intenta cambiar a Python
4. Verifica que aparece el modal
5. Confirma el cambio
6. Verifica que se crea nueva conversación
7. Envía mensaje con Python
8. Revisa el sidebar - deberías ver dos conversaciones

### Verificar Endpoints

```bash
# n8n endpoint (debería estar funcionando)
curl -X POST http://localhost:3000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{"message":"Hola","conversationId":"test","settings":{"model":"n8n"}}'

# Python endpoint (requiere backend Python corriendo)
curl -X POST http://localhost:3000/api/chat/python \
  -H "Content-Type: application/json" \
  -d '{"message":"Hola","conversationId":"test","settings":{"model":"python"}}'
```

## 🐛 Solución de Problemas

### Error: "Python backend error: 500"

**Causa**: El backend Python no está corriendo o no está accesible.

**Solución**:
1. Verifica que Python backend esté corriendo: `http://localhost:8000`
2. Revisa la variable `PYTHON_BACKEND_URL` en `.env.local`
3. Verifica logs del backend Python

### Modal no aparece al cambiar modelo

**Causa**: No hay conversación activa.

**Comportamiento esperado**: Si no hay mensajes, el modelo cambia directamente sin modal.

### Conversación no se guarda con el modelo correcto

**Causa**: El campo `settings` no está configurado.

**Solución**: Verifica que el endpoint guarde:

```typescript
await prisma.conversation.create({
  data: {
    // ...
    settings: {
      model: 'python', // Importante!
      ...settings
    }
  }
});
```

### Backend Python no recibe mensajes

**Causa**: URL incorrecta o formato de petición incompatible.

**Solución**:
1. Verifica que el backend Python esté en `http://localhost:8000`
2. Revisa que el endpoint sea `/chat`
3. Verifica el formato JSON esperado por Python

## 📊 Diagrama de Flujo

```
Usuario selecciona modelo
        ↓
¿Hay conversación activa?
   ↓                    ↓
  SÍ                   NO
   ↓                    ↓
Mostrar modal      Cambiar directamente
   ↓
Usuario confirma/cancela
   ↓
Si confirma:
  - Guardar conversación actual
  - Resetear chat
  - Cambiar modelo
  - Nueva conversación
```

## 🎨 Personalización Visual

### Colores de Modelos

En `ModelSelector.tsx`, cada modelo tiene un color:

```typescript
// n8n: azul
className="text-blue-600"

// Python: verde
className="text-green-600"
```

Puedes cambiarlos editando las clases de Tailwind.

### Iconos

Puedes cambiar los emojis o usar iconos SVG:

```typescript
const models = [
  { id: 'n8n', icon: '🤖' },  // Cambiar aquí
  { id: 'python', icon: '🐍' }  // Cambiar aquí
];
```

## 📝 Notas Importantes

1. **Default es n8n**: El modelo predeterminado es n8n (Gemini)
2. **Conversaciones separadas**: Cada modelo mantiene conversaciones independientes
3. **Persistencia**: El modelo se guarda en `conversation.settings` (JSON)
4. **Streaming**: Ambos endpoints soportan SSE para respuestas en tiempo real
5. **Autenticación**: Las conversaciones se guardan en PostgreSQL para usuarios autenticados, en localStorage para invitados

## 🔮 Futuras Mejoras

- [ ] Permitir cambiar modelo dentro de una conversación (sin crear nueva)
- [ ] Mostrar indicador del modelo actual en el header
- [ ] Estadísticas de uso por modelo
- [ ] Configuración personalizada por modelo (temperatura, topK, etc.)
- [ ] Soporte para más backends (Claude, GPT-4, etc.)
- [ ] Comparación lado a lado de respuestas de diferentes modelos
