# 📅 Sistema de Búsqueda por Fechas - Escuela Sabática

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### 1. **Detección Temporal Automática**

El sistema detecta y convierte automáticamente estas palabras en fechas específicas:

| Palabra Usuario | Detección | Fecha Calculada (hoy = Lunes 3 nov) |
|----------------|-----------|-------------------------------------|
| `hoy` | ✅ | Lunes 3 de noviembre |
| `mañana` | ✅ | Martes 4 de noviembre |
| `pasado mañana` | ✅ | Miércoles 5 de noviembre |
| `ayer` | ✅ | Domingo 2 de noviembre |
| `antes de ayer` | ✅ | Sábado 1 de noviembre |
| `30 de octubre` | ✅ | Jueves 30 de octubre |
| `4 de noviembre` | ✅ | Martes 4 de noviembre |

### 2. **Búsqueda Híbrida en Qdrant**

Cuando el usuario pregunta por una fecha:

1. **Detección**: Sistema detecta "mañana" → "Martes 4 de noviembre"
2. **Enriquecimiento**: Query se enriquece: `"de que trata la leccion de mañana Martes 4 de noviembre"`
3. **Búsqueda Vectorial**: Se buscan 20 documentos similares (en lugar de 8 normales)
4. **Verificación**: ¿Alguno coincide exactamente con "Martes 4 de noviembre"?
   - ✅ **SI**: Se prioriza con re-ranking (+0.5 boost)
   - ❌ **NO**: Se ejecuta **Scroll Search**
5. **Scroll Search**: Revisa TODA la colección (100+ docs) buscando coincidencia exacta
6. **Inserción**: Si encuentra el documento, lo inserta al inicio con score 1.5

### 3. **Re-ranking Inteligente**

Los documentos se priorizan así:

| Tipo de Match | Boost | Ejemplo |
|--------------|-------|---------|
| **Exacto** | +0.5 | "Martes 4 de noviembre" (día + número + mes) |
| **Parcial** | +0.2 | Solo "Martes" o solo "4 de noviembre" |
| **Normal** | 0.0 | Otros documentos relevantes |

### 4. **Prompt del LLM Optimizado**

El LLM recibe:

```
📅 CALENDARIO ACTUAL:
* HOY es: Lunes 3 de noviembre de 2025
* MAÑANA será: Martes 4 de noviembre
* PASADO MAÑANA será: Miércoles 5 de noviembre
* AYER fue: Domingo 2 de noviembre
* ANTES DE AYER fue: Sábado 1 de noviembre

REGLAS:
1. El material YA fue filtrado por fecha
2. Si tiene "Lección X | Martes 4 de noviembre" → ESA es la respuesta
3. NO busques otras fechas diferentes
4. NO digas "no encontré" si hay contenido de lecciones
```

## 🔄 FLUJO COMPLETO DE EJEMPLO

**Usuario pregunta**: "de que trata la leccion de mañana"

### Paso 1: Backend (`embeddings.py`)
```
🔍 Query recibida: "de que trata la leccion de mañana"
📅 Detectado: MAÑANA → Martes 4 de noviembre
🔍 Query enriquecida: "de que trata la leccion de mañana Martes 4 de noviembre"
```

### Paso 2: Búsqueda en Qdrant
```
🔎 Búsqueda HÍBRIDA activada para: Martes 4 de noviembre
   - Búsqueda vectorial: 20 docs
   - Búsqueda por scroll: revisando toda la colección
📡 Resultados vectoriales: 20 documentos
⚠️  No se encontró match exacto en los 20 resultados
🔄 Ejecutando scroll search...
📜 Scroll encontró 124 documentos en total
✅ ¡ENCONTRADO en scroll! Agregando al inicio
   Contenido: 68| Lección 6 | Martes 4 de noviembre - DECISIONES EQUIVOCADAS...
```

### Paso 3: Re-ranking
```
🎯 Aplicando re-ranking por coincidencia de fecha exacta...
   ✅ MATCH EXACTO: 68| Lección 6 | Martes 4 de noviembre... (score: 1.500)
   🔸 MATCH PARCIAL: Lección 6 | Jueves 6 de noviembre... (score: 0.753)
   📄 Doc encontrado: Lección 5 | Viernes 31 de octubre... (score: 0.576)
```

### Paso 4: LLM (`llm.py`)
```
🤖 Usando modelo: gemini-2.0-flash-exp

MATERIAL DISPONIBLE:
68| Lección 6 | Martes 4 de noviembre
DECISIONES EQUIVOCADAS
Lee Josué 7:19-21...

✅ Respuesta generada: 
**Lección 6 | Martes 4 de noviembre**

El estudio de mañana (Martes 4 de noviembre) trata sobre 
"DECISIONES EQUIVOCADAS"...
```

## 🛠️ ARCHIVOS MODIFICADOS

1. **`embeddings.py`**:
   - Detección temporal con orden correcto (pasado mañana ANTES que mañana)
   - Búsqueda híbrida con scroll
   - Re-ranking por coincidencia de fecha
   - Logs detallados

2. **`llm.py`**:
   - Calendario completo en el prompt
   - Instrucciones claras sobre búsqueda por fecha
   - Modelo de rotación (3 modelos Gemini)
   - Regla de oro: usar material si menciona "Lección X + fecha"

3. **`app.py`**:
   - Extracción contextual de mes
   - Ejemplo: "y la del 31" + contexto "octubre" → "31 de octubre"

## 📊 CASOS DE USO

### ✅ Casos que funcionan correctamente:

1. **"de que trata la leccion de hoy"** → Lunes 3 de noviembre
2. **"de que trata la leccion de mañana"** → Martes 4 de noviembre
3. **"de que trata la leccion de pasado mañana"** → Miércoles 5 de noviembre
4. **"de que trataba la leccion de ayer"** → Domingo 2 de noviembre
5. **"de que trataba la leccion del 30 de octubre"** → Jueves 30 de octubre
6. **"y la del 31"** (con contexto "octubre") → Viernes 31 de octubre

### ⚠️ Casos especiales:

- Si un día NO existe en Qdrant, el scroll search no lo encontrará
- El LLM debería decir "No encontré el estudio de [fecha]"
- Solución: subir PDFs completos de todas las lecciones

## 🔍 DEBUGGING

Para ver logs detallados, busca en la consola del backend:

```
📅 Detectado: MAÑANA → Martes 4 de noviembre
🔎 Búsqueda HÍBRIDA activada
✅ MATCH EXACTO: ... (score: 1.500)
🤖 Usando modelo: gemini-2.0-flash-exp
```

Si NO aparece el documento correcto:
1. Verifica que existe en Qdrant: `python check_leccion6_details.py`
2. Revisa los logs de scroll search
3. Confirma que el contenido del documento tiene el formato correcto
