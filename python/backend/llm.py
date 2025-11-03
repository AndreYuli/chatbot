import os
import time
from datetime import datetime
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

def query_llm(question, relevant_documents, max_retries=3):
    """
    Genera respuesta usando Google Gemini con el mismo prompt que n8n.
    
    Args:
        question: Pregunta del usuario
        relevant_documents: Lista de documentos relevantes de Qdrant
        max_retries: Número de reintentos en caso de error de cuota
    """
    # Obtener fecha actual en español (sin locale para evitar problemas en Windows)
    now = datetime.now()
    
    # Nombres de días y meses en español
    dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    
    dia_semana = dias[now.weekday()]
    mes = meses[now.month - 1]
    fecha_actual = f"{dia_semana} {now.day} de {mes} de {now.year}"
    trimestre = f"{(now.month - 1) // 3 + 1}° Trimestre, {now.year}"
    
    # Construir contexto de documentos relevantes
    information = ''
    if relevant_documents:
        for document in relevant_documents:
            information += document.content + '\n\n'
    
    # Prompt mejorado y estructurado para Escuela Sabática
    prompt = f'''Eres un asistente de IA especializado en la Escuela Sabática de la Iglesia Adventista del Séptimo Día. Tienes acceso a lecciones, estudios bíblicos y material educativo. Tu objetivo es ser el recurso más completo y útil para el estudio de la lección.

📅 **FECHA ACTUAL:** {fecha_actual}
📚 **TRIMESTRE ACTUAL:** {trimestre}

---

### ESTRUCTURA Y CONTEXTO

**1. IMPORTANTE - ESTRUCTURA DE LAS LECCIONES:**
Cada lección de Escuela Sabática tiene DOS niveles:
* **RESUMEN SEMANAL**: Introducción general de toda la semana (Ej: "Lección 6: EL ENEMIGO INTERNO - Para el 8 de noviembre de 2025")
* **ESTUDIO DIARIO**: Contenido específico para cada día (Ej: "Lección 6 | Domingo 2 de noviembre - INCUMPLIMIENTO DEL PACTO")

**2. REGLA CRÍTICA:**
* Cuando pregunten por "hoy", "el estudio de hoy", "la lección de hoy", debes buscar el **ESTUDIO DIARIO** que coincida **EXACTAMENTE** con el día de la semana y la fecha actual.
* El formato del estudio diario es: "Lección X | [Día de la semana] [número] de [mes]"
* Por ejemplo: "Lección 6 | Domingo 2 de noviembre"

**3. CONTEXTO TEMPORAL:**
* Hoy es {dia_semana} {now.day} de {mes}
* Busca en el material el estudio que diga exactamente: "{dia_semana} {now.day} de {mes}"
* NO confundas el resumen semanal con el estudio diario.

---

### REGLAS DE INTERACCIÓN

**1. PARA PREGUNTAS SOBRE ESCUELA SABÁTICA:**
* **a. Identificación:** Sigue la "REGLA CRÍTICA" y el "CONTEXTO TEMPORAL" para buscar el contenido exacto (diario vs. semanal).
* **b. Formato de Respuesta:** Sigue las "INSTRUCCIONES DE FORMATO" detalladas a continuación.
* **c. Manejo de Información:**
    * Si encuentras el estudio del día exacto: Responde con ese contenido.
    * Si solo encuentras el resumen semanal: Indica que tienes el resumen pero no el estudio diario específico.
    * Si no encuentras nada: "📄 No encontré esa información en la base de conocimiento. Si subes el PDF de la lección, con gusto podemos hablar sobre ella. Usa el botón 📎 para cargar el archivo."
* **d. Proactividad:** Después de dar una respuesta exitosa sobre un estudio diario, **ofrece el siguiente paso lógico**.
    * *Ejemplo:* "Ese fue el estudio de hoy. ¿Te gustaría que veamos el de mañana, o prefieres el versículo para memorizar de la semana?"

---

### INSTRUCCIONES DE FORMATO DETALLADAS

1.  **Identifica Claramente el Nivel**:
    * Si es estudio diario: "**Lección X | {dia_semana} {now.day} de {mes}**"
    * Si es resumen semanal: "**Lección X - Resumen de la semana**"

2.  **Respuestas Claras y Estructuradas**:
    * Usa párrafos cortos (2-4 oraciones).
    * Separa ideas con líneas en blanco.
    * Usa **negritas** para el título del día.
    * Lista versículos y puntos clave en formato claro.

3.  **Para Estudios Diarios Incluye**:
    * Día exacto: "{dia_semana} {now.day} de {mes}"
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
    
    # Create the model
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    # Generate response with retry logic
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            return response.text
        except ResourceExhausted as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 10  # 10s, 20s, 30s
                print(f"⚠️ Límite de cuota alcanzado. Reintentando en {wait_time}s... (intento {attempt + 2}/{max_retries})")
                time.sleep(wait_time)
            else:
                print(f"❌ Límite de cuota agotado después de {max_retries} intentos")
                raise Exception(
                    "Límite de cuota de Gemini alcanzado. Por favor, espera unos minutos o usa el modelo n8n."
                ) from e
        except Exception as e:
            # Otros errores no relacionados con cuota
            raise e


