# Persistencia del Modelo AI en Conversaciones

## ✅ Implementación Completa

### Objetivo
Guardar el modelo de IA (`n8n` o `python`) utilizado en cada conversación, para que al cargar una conversación anterior, automáticamente se seleccione el modelo correcto.

---

## 🔧 Cambios Realizados

### 1. **Base de Datos (Schema Prisma)**
- ✅ Ya existía el campo `settings Json?` en el modelo `Conversation`
- Se utiliza para guardar `{ aiModel: 'n8n' | 'python' }`

### 2. **Backend (API Routes)**

#### `app/api/conversations/route.ts`
- ✅ Ya soportaba el campo `settings` en POST
- Acepta `{ title, settings }` en el body
- Guarda `settings` como JSON stringify

### 3. **Hooks**

#### `hooks/useConversations.ts`
```typescript
interface Conversation {
  // ...campos existentes
  settings?: {
    aiModel?: 'n8n' | 'python';
  } | null;
}

// Parsea settings de string a objeto cuando viene de la API
settings: conv.settings ? (typeof conv.settings === 'string' ? JSON.parse(conv.settings) : conv.settings) : null

// createConversation ahora acepta aiModel
createConversation(title?: string, aiModel?: 'n8n' | 'python')
```

#### `hooks/useChat.ts`
```typescript
// ensureConversation ahora recibe el modelo
ensureConversation(userMessage: string, aiModel?: 'n8n' | 'python')

// Se pasa al crear conversación
settings: aiModel ? { aiModel } : undefined

// handleSubmit pasa el modelo a ensureConversation
const ensuredConversationId = await ensureConversation(userInput, model);
```

### 4. **Frontend Components**

#### `app/[locale]/chat/page.tsx`
```typescript
// Import useConversations para acceder a la lista
const { conversations } = useConversations();

// Al seleccionar una conversación, carga su modelo
const handleConversationSelect = useCallback((convId: string) => {
  // ...código existente
  
  // NUEVO: Cargar el modelo de la conversación
  const conversation = conversations.find(c => c.id === convId);
  if (conversation?.settings?.aiModel) {
    setCurrentModel(conversation.settings.aiModel);
  }
}, [setConversationId, conversations]);
```

#### `components/ConversationSidebar.tsx`
```tsx
// Muestra badge visual del modelo
{aiModel && (
  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
    aiModel === 'python' 
      ? 'bg-green-100 text-green-700' // Verde para Python
      : 'bg-purple-100 text-purple-700' // Morado para N8N
  }`}>
    {aiModel === 'python' ? 'PY' : 'N8N'}
  </span>
)}
```

---

## 🎯 Flujo Completo

### Escenario 1: Nueva Conversación con Python

1. Usuario selecciona modelo **Python**
2. Usuario escribe primer mensaje
3. `handleSubmit` llama a `ensureConversation(userInput, 'python')`
4. Se crea conversación con `settings: { aiModel: 'python' }`
5. Se guarda en PostgreSQL
6. **Badge verde "PY"** aparece en el sidebar

### Escenario 2: Cargar Conversación Anterior

1. Usuario hace clic en una conversación del sidebar
2. `handleConversationSelect` busca la conversación en el array
3. Lee `conversation.settings.aiModel`
4. **Automáticamente** cambia `currentModel` al modelo guardado
5. El selector muestra el modelo correcto
6. Siguientes mensajes usan el modelo correcto

### Escenario 3: Cambiar de Modelo

1. Usuario tiene conversación activa con n8n
2. Cambia a Python → aparece modal de confirmación
3. Al confirmar:
   - Se dispara evento `conversation:updated`
   - Sidebar refresca y muestra conversación con badge **N8N**
   - Se resetea chat
   - Nueva conversación usa Python
   - Badge cambia a **PY**

---

## 🎨 Indicadores Visuales

### Badges en Sidebar

| Modelo | Color | Badge |
|--------|-------|-------|
| N8N    | Morado (`purple-100/700`) | `N8N` |
| Python | Verde (`green-100/700`) | `PY` |
| Sin modelo | - | (sin badge) |

### Estados del Selector

- Al cargar conversación → se actualiza automáticamente
- Al crear nueva → usa el modelo actualmente seleccionado
- Al cambiar modelo → valida si hay conversación activa

---

## 🔄 Compatibilidad con Conversaciones Antiguas

Las conversaciones creadas **antes** de esta implementación:
- No tienen campo `settings.aiModel`
- Badge no se muestra
- Se puede usar con cualquier modelo
- Al enviar nuevo mensaje, NO se actualiza el modelo guardado

**Nota:** Si deseas actualizar conversaciones antiguas, necesitarías una migración o que el primer mensaje post-implementación actualice el settings.

---

## 🧪 Testing

### Casos a Probar

1. ✅ Crear conversación con n8n → verificar badge N8N
2. ✅ Crear conversación con Python → verificar badge PY
3. ✅ Cargar conversación n8n → selector debe mostrar n8n
4. ✅ Cargar conversación Python → selector debe mostrar Python
5. ✅ Cambiar modelo en conversación activa → modal aparece
6. ✅ Confirmar cambio → conversación anterior aparece en sidebar con badge correcto
7. ✅ Usuarios invitados → settings se guarda en localStorage
8. ✅ Usuarios autenticados → settings se guarda en PostgreSQL

---

## 📝 Notas Técnicas

### Para Usuarios Invitados (Guest)
```typescript
// En useChat.ts
const guestConversation = {
  // ...otros campos
  settings: aiModel ? JSON.stringify({ aiModel }) : null,
};
```
Se guarda como string JSON en localStorage.

### Para Usuarios Autenticados
```typescript
// En API route
body: JSON.stringify({
  title,
  settings: aiModel ? { aiModel } : undefined,
})
```
PostgreSQL guarda como tipo `Json` y Prisma lo maneja automáticamente.

### Parseo de Settings
```typescript
// Al leer de la API
settings: conv.settings ? (typeof conv.settings === 'string' ? JSON.parse(conv.settings) : conv.settings) : null
```
Compatible con ambos formatos (string o objeto).

---

## 🚀 Próximas Mejoras Posibles

1. **Migración de conversaciones antiguas**: Script para añadir `aiModel: 'n8n'` por defecto
2. **Filtro por modelo**: En el sidebar, poder filtrar solo conversaciones de Python o N8N
3. **Estadísticas**: Dashboard de uso de cada modelo
4. **Auto-detect**: Si se detecta código Python en mensajes, sugerir cambiar a Python model
5. **Bloqueo de cambio**: Opción para "anclar" una conversación a su modelo original

---

## 📚 Archivos Modificados

- ✅ `hooks/useConversations.ts` - Interface + parsing + createConversation
- ✅ `hooks/useChat.ts` - ensureConversation con aiModel
- ✅ `app/[locale]/chat/page.tsx` - Cargar modelo al seleccionar conversación
- ✅ `components/ConversationSidebar.tsx` - Badge visual del modelo
- ✅ `prisma/schema.prisma` - (sin cambios, ya tenía settings)
- ✅ `app/api/conversations/route.ts` - (sin cambios, ya aceptaba settings)

---

**Fecha de implementación:** 31 de Octubre, 2025  
**Estado:** ✅ Completado y listo para testing
