# ✅ Configuración de Upload de Archivos

## 📋 Resumen de Cambios

Se configuró el sistema de upload de archivos para usar **siempre** el backend de Python, independientemente del modelo seleccionado (n8n o Python).

---

## 🔧 Arquitectura

```
┌─────────────────┐
│   Frontend      │
│  (ChatInput)    │
└────────┬────────┘
         │
         │ POST /api/upload
         ▼
┌─────────────────┐
│  Next.js API    │
│  /api/upload    │
└────────┬────────┘
         │
         │ Siempre usa Python
         ▼
┌─────────────────┐
│ Python Backend  │
│  Flask:5000     │
│  /upload        │
└────────┬────────┘
         │
         │ Procesa PDF
         ▼
┌─────────────────┐
│     Qdrant      │
│ (Vector Store)  │
│ ESCUELA-        │
│ SABATICA        │
└─────────────────┘
```

---

## 📁 Archivos Modificados

### 1. **app/api/upload/route.ts** (Next.js API)

**Cambio principal:** Ahora usa `handlePythonUpload()` en lugar de `handleN8nUpload()`

```typescript
export async function POST(req: NextRequest) {
  // ...
  // Usar backend Python para uploads (ambos modelos)
  return await handlePythonUpload(file);
}
```

**Función nueva:**
```typescript
async function handlePythonUpload(file: File) {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000';
  const uploadUrl = `${pythonBackendUrl}/upload`;
  
  // Envía el archivo al backend Python
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: pythonFormData,
  });
  
  // Retorna respuesta con información de Qdrant
}
```

### 2. **python/backend/app.py** (Flask Backend)

**Endpoint nuevo:** `/upload`

```python
@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Endpoint para subir archivos PDF a Qdrant
    Compatible con el frontend Next.js
    """
    # 1. Validar que sea PDF
    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'Solo se permiten archivos PDF'}), 400
    
    # 2. Guardar temporalmente
    file_path = os.path.join('pdf_files', file.filename)
    file.save(file_path)
    
    # 3. Procesar y agregar a Qdrant
    collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
    result = add_pdf_to_collection(collection_name, file_path, file.filename)
    
    # 4. Retornar éxito
    return jsonify({
        'success': True,
        'message': f'Archivo agregado a Qdrant',
        'pages_added': result['pages_added']
    })
```

---

## 🔑 Variables de Entorno

### Frontend (.env)
```env
PYTHON_BACKEND_URL=http://127.0.0.1:5000
```

### Backend Python (python/backend/.env)
```env
QDRANT_URL=https://appqdrant.sages.icu
QDRANT_API_KEY=9253bcc8145de2be70135bc786d63949
QDRANT_COLLECTION=ESCUELA-SABATICA
GEMINI_API_KEY=AIzaSyC89o4EhQhutOOiKQ79yofbypU5P3z0K5A
```

---

## 🚀 Flujo de Funcionamiento

### Paso 1: Usuario sube archivo PDF

```
Usuario hace clic en 📎 → Selecciona PDF
```

### Paso 2: Frontend envía a API

```typescript
// components/ChatInput.tsx
const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData  // Contiene el archivo PDF
});
```

### Paso 3: Next.js API proxy

```typescript
// app/api/upload/route.ts
// Redirige siempre a Python backend
fetch('http://127.0.0.1:5000/upload', {
  method: 'POST',
  body: pythonFormData
});
```

### Paso 4: Python procesa el PDF

```python
# python/backend/app.py
# 1. Guarda el PDF
file.save('pdf_files/documento.pdf')

# 2. Extrae texto y crea embeddings
result = add_pdf_to_collection('ESCUELA-SABATICA', file_path)

# 3. Almacena en Qdrant
# embeddings.py → Qdrant API
```

### Paso 5: Respuesta al usuario

```json
{
  "success": true,
  "message": "Archivo procesado y agregado a Qdrant",
  "collection": "ESCUELA-SABATICA",
  "pages_added": 15,
  "filename": "leccion-1.pdf"
}
```

---

## 📦 Dependencias del Backend Python

```python
# python/backend/requirements.txt
Flask==3.0.0
flask-cors==4.0.0
python-dotenv==1.0.0
google-generativeai==0.3.1
PyPDF2==3.0.1
requests==2.31.0
```

---

## 🧪 Pruebas

### 1. Verificar que Python esté corriendo

```bash
cd python/backend
python app.py
```

Debe mostrar:
```
✅ Google Gemini configurado
* Running on http://127.0.0.1:5000
```

### 2. Probar endpoint directamente

```bash
curl -X POST http://127.0.0.1:5000/upload \
  -F "file=@ruta/archivo.pdf"
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Archivo procesado...",
  "pages_added": 10
}
```

### 3. Probar desde el frontend

1. Iniciar Next.js: `npm run dev`
2. Ir al chat
3. Hacer clic en 📎
4. Seleccionar un PDF
5. Verificar mensaje de éxito

---

## ⚠️ Notas Importantes

### 1. **Solo PDFs**
El sistema solo acepta archivos `.pdf`. Si se intenta subir otro tipo, retorna error 400.

### 2. **Colección Única**
Todos los archivos van a la misma colección: `ESCUELA-SABATICA` (configurado en `.env`)

### 3. **Modelos (n8n y Python) usan la misma fuente**
Ambos modelos consultan la **misma colección de Qdrant**, solo difieren en el workflow:
- **n8n**: Gemini + Qdrant + Redis (historial)
- **Python**: Gemini + Qdrant directo

### 4. **Archivos temporales**
Los PDFs se guardan en `python/backend/pdf_files/` para procesamiento. Podrías añadir limpieza automática.

---

## 🔄 Proceso de Embedding

```python
# embeddings.py
def add_pdf_to_collection(collection_name, pdf_path, filename):
    # 1. Extraer texto del PDF
    reader = PdfReader(pdf_path)
    for page in reader.pages:
        text = page.extract_text()
        
        # 2. Generar embedding con Gemini
        vector = generate_embedding(text)
        
        # 3. Crear documento
        document = {
            "id": str(uuid.uuid4()),
            "vector": vector,
            "payload": {
                "content": text,
                "filename": filename,
                "page": page_num
            }
        }
        
        # 4. Subir a Qdrant
        qdrant_client.upsert(collection_name, [document])
```

---

## 📊 Respuestas de Error

| Código | Error | Solución |
|--------|-------|----------|
| 400 | No file provided | Asegurar que el FormData tenga 'file' |
| 400 | Solo se permiten PDFs | Verificar extensión del archivo |
| 500 | Error al procesar | Revisar logs de Python backend |
| 503 | No se pudo conectar | Verificar que Python esté en puerto 5000 |

---

## ✅ Verificación Final

**Checklist de implementación:**

- ✅ `/api/upload/route.ts` usa `handlePythonUpload()`
- ✅ Python backend tiene endpoint `/upload`
- ✅ Endpoint procesa PDFs y los sube a Qdrant
- ✅ Variables de entorno configuradas
- ✅ ChatInput usa `/api/upload`
- ✅ Ambos modelos (n8n y Python) usan la misma colección

---

**Fecha de implementación:** 31 de Octubre, 2025  
**Estado:** ✅ Completado y listo para usar
