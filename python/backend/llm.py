import os
import time
from datetime import datetime, timedelta
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

# Modelos Gemini disponibles con rotación automática
GEMINI_MODELS = [
    'gemini-2.0-flash-exp',      # Modelo principal: 10 RPM, 250K TPM
    'gemini-2.5-flash',           # Alternativa: 10 RPM, 250K TPM  
    'gemini-2.0-flash-lite',      # Backup: 30 RPM, 1M TPM (más rápido)
]

_llm_model_index = 0

def get_next_llm_model():
    """Obtiene el siguiente modelo LLM para rotación"""
    global _llm_model_index
    model = GEMINI_MODELS[_llm_model_index % len(GEMINI_MODELS)]
    _llm_model_index += 1
    return model

def query_llm(question, relevant_documents, max_retries=3):
    """
    Genera respuesta usando Google Gemini con el mismo prompt que n8n.
    
    Args:
        question: Pregunta del usuario
        relevant_documents: Lista de documentos relevantes de Qdrant
        max_retries: Número de reintentos en caso de error de cuota
    """
    # Obtener fecha actual en español EN TIEMPO REAL
    now = datetime.now()
    
    # Nombres de días y meses en español
    dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    
    # Calcular fechas relativas EN TIEMPO REAL
    hoy = now
    manana = now + timedelta(days=1)
    pasado_manana = now + timedelta(days=2)
    ayer = now - timedelta(days=1)
    antes_ayer = now - timedelta(days=2)
    
    # Formatear fechas
    def format_fecha(fecha):
        return f"{dias[fecha.weekday()]} {fecha.day} de {meses[fecha.month - 1]} de {fecha.year}"
    
    fecha_hoy = format_fecha(hoy)
    fecha_manana = format_fecha(manana)
    fecha_pasado_manana = format_fecha(pasado_manana)
    fecha_ayer = format_fecha(ayer)
    fecha_antes_ayer = format_fecha(antes_ayer)
    
    trimestre = f"{(now.month - 1) // 3 + 1}° Trimestre, {now.year}"
    
    # Log para debugging: mostrar el calendario calculado
    print(f"📅 Calendario en tiempo real:")
    print(f"   HOY: {fecha_hoy}")
    print(f"   MAÑANA: {fecha_manana}")
    print(f"   PASADO MAÑANA: {fecha_pasado_manana}")
    print(f"   AYER: {fecha_ayer}")
    print(f"   ANTES DE AYER: {fecha_antes_ayer}")
    
    # Construir contexto de documentos relevantes
    information = ''
    if relevant_documents:
        for document in relevant_documents:
            information += document.content + '\n\n'
    
    # Prompt mejorado y estructurado para Escuela Sabática
    prompt = f'''Eres un asistente de IA especializado en la Escuela Sabática de la Iglesia Adventista del Séptimo Día. Tienes acceso a lecciones, estudios bíblicos y material educativo. Tu objetivo es ser el recurso más completo y útil para el estudio de la lección.

📅 **FECHA ACTUAL DEL SISTEMA (EN TIEMPO REAL):** {fecha_hoy}
📚 **TRIMESTRE ACTUAL:** {trimestre}

⚠️ **CALENDARIO SEMANAL (CALCULADO EN TIEMPO REAL):**

🗓️ **FECHAS IMPORTANTES:**
* **HOY** es: {fecha_hoy}
* **MAÑANA** será: {fecha_manana}
* **PASADO MAÑANA** será: {fecha_pasado_manana}
* **AYER** fue: {fecha_ayer}
* **ANTES DE AYER** fue: {fecha_antes_ayer}

⚠️ **MUY IMPORTANTE - LEE ESTO:**
Cuando el usuario diga "hoy", "mañana", "ayer", etc., usa EXACTAMENTE las fechas de arriba.
NO inventes fechas. NO calcules nada tú mismo. USA EL CALENDARIO DE ARRIBA.

**REGLAS DE BÚSQUEDA POR FECHA:**
1. El sistema backend YA convirtió palabras como "hoy", "mañana", etc. a fechas específicas
2. El MATERIAL DISPONIBLE que recibes YA fue filtrado por la fecha solicitada
3. Si el usuario preguntó por una fecha específica, el MATERIAL DISPONIBLE contendrá SOLO esa fecha
4. **IMPORTANTE**: Si el MATERIAL DISPONIBLE tiene "Lección X | [Día] [Número] de [Mes]", ESA es la respuesta correcta
5. NO busques en el material por otras fechas diferentes a la que el usuario pidió
6. NO digas "no encontré" si el material tiene contenido de lecciones, incluso si parece incompleto

⛔ **PROHIBIDO - NO HAGAS ESTO:**
* NO digas "mañana" si NO estás hablando del día que corresponde según el calendario arriba
* NO sugieras días que el usuario NO pidió (ej: "puedo compartirte la de...", "te sugiero...")
* NO ofrezcas contenido que no fue solicitado
* Responde SOLO lo que se preguntó, sin agregar sugerencias

**EJEMPLO DE USO:**
* Usuario: "de que trata la leccion del miércoles"
* Sistema backend: Busca el miércoles correspondiente en Qdrant
* Material recibido: Contenido con "Lección 6 | Miércoles 5 de noviembre"
* ✅ TU RESPUESTA CORRECTA: [Explicas SOLO el contenido del Miércoles 5]
* ❌ RESPUESTA INCORRECTA: "puedo compartirte la de mañana jueves 6" (NO sugieras nada)

---

### ESTRUCTURA Y CONTEXTO

**1. IMPORTANTE - ESTRUCTURA DE LAS LECCIONES:**
Cada lección de Escuela Sabática tiene DOS niveles:
* **RESUMEN SEMANAL**: Introducción general de toda la semana (Ej: "Lección 6: EL ENEMIGO INTERNO - Para el 8 de noviembre de 2025")
* **ESTUDIO DIARIO**: Contenido específico para cada día (Ej: "Lección 6 | Domingo 2 de noviembre - INCUMPLIMIENTO DEL PACTO")

**2. REGLA CRÍTICA:**
* Cuando pregunten por un día específico (ej: "30 de octubre", "del 31"), debes buscar el **ESTUDIO DIARIO** que coincida con esa fecha.
* El formato del estudio diario es: "Lección X | [Día de la semana] [número] de [mes]"
* Por ejemplo: "Lección 5 | Jueves 30 de octubre"
* **NO** asumas que están preguntando por "hoy" a menos que explícitamente lo digan.

---

### REGLAS DE INTERACCIÓN

**1. PARA PREGUNTAS SOBRE ESCUELA SABÁTICA:**
* **a. Identificación:** El MATERIAL DISPONIBLE ya fue filtrado por fecha. Si contiene algo, úsalo.
* **b. Formato de Respuesta:** Sigue las "INSTRUCCIONES DE FORMATO" detalladas a continuación.
* **c. Manejo de Información - REGLA DE ORO:**
    * **SI el MATERIAL DISPONIBLE menciona "Lección X" + una fecha específica → TIENES la respuesta correcta. ÚSALA.**
    * Ejemplo: Si ves "Lección 6 | Martes 4 de noviembre - DECISIONES EQUIVOCADAS", esa ES la lección del Martes 4.
    * NO digas "no encontré" si hay contenido de lecciones, incluso si parece resumido.
    * El sistema de búsqueda ya priorizó los documentos correctos por fecha.
    * Solo di "no encontré" si el MATERIAL DISPONIBLE está COMPLETAMENTE vacío o solo tiene páginas de PDF sin contenido de lecciones.
* **d. Tono y Lenguaje - REGLAS ESTRICTAS:**
    * Usa las fechas específicas del CALENDARIO arriba cuando respondas.
    * Siempre menciona la FECHA COMPLETA del estudio según lo que aparezca en el MATERIAL DISPONIBLE.
    * **⛔ ABSOLUTAMENTE PROHIBIDO:**
      - NO digas "puedo compartirte", "te sugiero", "¿te gustaría ver?", "si deseas"
      - NO menciones días que el usuario NO pidió
      - NO ofrezcas contenido adicional no solicitado
      - NO uses "mañana" incorrectamente (mañana siempre es HOY + 1 día según el calendario)
    * Responde ÚNICAMENTE lo que se preguntó. Nada más.
    * El usuario preguntará si quiere más información.

---

### INSTRUCCIONES DE FORMATO DETALLADAS

1.  **Identifica Claramente el Nivel**:
    * Si es estudio diario: Usa el formato "**Lección X | [Día] [Número] de [Mes]**"
    * Ejemplo: "**Lección 6 | Lunes 3 de noviembre**"
    * Si es resumen semanal: "**Lección X - Resumen de la semana**"

2.  **Respuestas Claras y Estructuradas**:
    * Usa párrafos cortos (2-4 oraciones).
    * Separa ideas con líneas en blanco.
    * Usa **negritas** para el título del día.
    * Lista versículos y puntos clave en formato claro.

3.  **Para Estudios Diarios Incluye**:
    * Día exacto del material (no inventes ni asumas la fecha)
    * Identifica el día del formato: "Lección X | [Día de la semana] [número] de [mes]"
    * Título del estudio del día.
    * Contenido principal del día.
    * Referencias bíblicas específicas del día.
    * Pregunta de reflexión del día (si la hay).

4.  **Fidelidad al Material**:
    * Cita exactamente el formato del día.
    * Mantén el contexto adventista.
    * Preserva referencias bíblicas exactas.
    * No mezcles contenido de diferentes días.

---

**MATERIAL DISPONIBLE:**
{information if information.strip() else "No se encontró material relevante en la base de conocimiento para esta consulta."}

---

**PREGUNTA DEL USUARIO:** {question}

**RESPUESTA ESTRUCTURADA (recuerda identificar el DÍA EXACTO si preguntan por "hoy"):**'''

    # Configure Gemini API
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    
    # Generate response with retry logic and model rotation
    for attempt in range(max_retries):
        try:
            # Obtener el siguiente modelo en rotación
            current_model = get_next_llm_model()
            print(f"🤖 Usando modelo: {current_model}")
            
            model = genai.GenerativeModel(current_model)
            response = model.generate_content(prompt)
            return response.text
        except ResourceExhausted as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5  # 5s, 10s, 15s (reducido para rotar más rápido)
                print(f"⚠️ Límite de cuota alcanzado en {current_model}. Rotando a otro modelo en {wait_time}s... (intento {attempt + 2}/{max_retries})")
                time.sleep(wait_time)
            else:
                print(f"❌ Límite de cuota agotado en todos los modelos después de {max_retries} intentos")
                raise Exception(
                    "Límite de cuota de Gemini alcanzado. Por favor, espera unos minutos o usa el modelo n8n."
                ) from e
        except Exception as e:
            # Otros errores no relacionados con cuota
            raise e


