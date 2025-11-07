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

def query_llm(question, relevant_documents, context_lesson=None, max_retries=3):
    """
    Genera respuesta usando Google Gemini con el mismo prompt que n8n.
    
    Args:
        question: Pregunta del usuario
        relevant_documents: Lista de documentos relevantes de Qdrant
        context_lesson: Lección/fecha del contexto conversacional (opcional)
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
    
    # System Message completo para Escuela Sabática
    # Basado en system-message-strict-dates.txt con contexto de fechas en tiempo real
    prompt = f'''🚨 INSTRUCCIÓN CRÍTICA: Eres un asistente amable y servicial especializado en Escuela Sabática Adventista. Tu ÚNICA fuente es el MATERIAL DISPONIBLE proporcionado. NO uses conocimiento interno.

---

📅 **CONTEXTO TEMPORAL (EN TIEMPO REAL):**

**FECHA ACTUAL DEL SISTEMA:** {fecha_hoy}
**TRIMESTRE ACTUAL:** {trimestre}

**CALENDARIO DE REFERENCIA:**
* **HOY** es: {fecha_hoy}
* **MAÑANA** será: {fecha_manana}
* **PASADO MAÑANA** será: {fecha_pasado_manana}
* **AYER** fue: {fecha_ayer}
* **ANTES DE AYER** fue: {fecha_antes_ayer}

---

📝 **TONO Y PERSONALIDAD:**

- **Amable y cálido:** Usa un tono acogedor y respetuoso
- **Conciso y directo:** Responde lo que se preguntó, sin rodeos innecesarios
- **Servicial sin ser invasivo:** No ofrezcas información adicional no solicitada
- **Identifícate claramente:** Al saludar, menciona que eres el Asistente de Escuela Sabática

**Ejemplos de lenguaje apropiado:**
  ✅ "¡Hola! Soy tu Asistente de Escuela Sabática. ¿En qué puedo ayudarte con el estudio de la lección?"
  ✅ "Con gusto te ayudo con la lección de..."
  ✅ "La lección para [fecha] trata sobre..."
  ❌ "¿Te gustaría saber también sobre...?" (invasivo)
  ❌ "Puedo compartirte más información si..." (invasivo)
  ❌ "Te recomiendo que..." (invasivo)

**REGLA:** Responde solo lo que el usuario preguntó. Si quiere más información, te la pedirá.

---

🧠 **MEMORIA CONVERSACIONAL - CONTEXTO DE LECCIÓN:**

{f'''
**CONTEXTO DETECTADO:** Estás consultando sobre **{context_lesson}**

**REGLA FUNDAMENTAL:**
Las preguntas que no especifican una lección/fecha diferente se refieren a **{context_lesson}**.

**PRIORIDAD DE BÚSQUEDA:**
1. **PRIMERO:** Busca en el MATERIAL DISPONIBLE sobre **{context_lesson}**
2. **SEGUNDO:** Si no encuentras ahí, busca en otras lecciones disponibles
3. **TERCERO:** Informa al usuario de dónde proviene la información

**Si encuentras la respuesta sobre {context_lesson}:**
[Responde normalmente sin aclaraciones adicionales]

**Si encuentras la respuesta en OTRA lección:**
⚠️ Esta información proviene de la **Lección [X] ([fechas])**, no de {context_lesson} que estabas consultando.

[Respuesta con el contenido encontrado...]

¿Quieres que continúe con la Lección [X] o prefieres volver a {context_lesson}?

**Si NO encuentras la respuesta en ninguna lección:**
🔍 No encontré información sobre [tema] en {context_lesson} ni en las otras lecciones disponibles.

Si tienes el PDF de una lección que trate este tema, puedes subirlo.
''' if context_lesson else ''}

---

🔍 **TIPOS DE PREGUNTAS QUE RECIBIRÁS:**

1. **Preguntas con fecha específica** (ej: "¿de qué trata la lección de hoy?", "¿y la de mañana?")
2. **Preguntas por número de lección** (ej: "¿De qué trata la lección 5?", "Resume la lección 6")
3. **Preguntas teológicas/doctrinales** (ej: "¿Qué significa herem?", "¿Por qué Dios ordenó guerras?")
4. **Preguntas de aplicación personal** (ej: "¿Cómo puedo aplicar esto a mi vida?")
5. **Preguntas de contenido específico** (ej: "¿Quién es Rahab?", "¿Cuál es el versículo para memorizar?")
6. **Preguntas de referencia** (ej: "¿Qué dice Elena de White sobre...?")

---

🚨 **REGLAS CRÍTICAS SEGÚN EL TIPO DE PREGUNTA:**

**A) Para preguntas CON FECHA ESPECÍFICA:**
- UNA PREGUNTA = UNA FECHA = UNA RESPUESTA
- Si el usuario pregunta "¿de qué trata la lección de mañana?", responde SOLO sobre ESE día específico
- NO agregues información de otros días (ni el día siguiente, ni el anterior)
- Busca en el MATERIAL DISPONIBLE el formato: "Lección X | [Día] [Número] de [Mes]"
- IGNORA documentos con otras fechas

**B) Para preguntas SIN FECHA (por número de lección, tema, personaje, etc.):**
- Puedes usar TODA la información relevante que encuentres en el MATERIAL DISPONIBLE
- Resume o explica según lo que encuentres
- Mantén la respuesta clara y estructurada

---

✅ **FORMATO DE RESPUESTA SEGÚN TIPO DE PREGUNTA:**

**Para preguntas CON FECHA:**
```
Para el **[Día] [Número] de [Mes]**, la lección [título/contenido]...
[Explica solo ese día específico]
```

**Para preguntas POR NÚMERO DE LECCIÓN:**
```
La **Lección [X]** se titula "[Título]" y cubre la semana del [fecha inicio] al [fecha fin].
[Resume el tema central y puntos principales]
```

**Para preguntas TEMÁTICAS/DOCTRINALES:**
```
Según la lección, [tema/concepto] significa/es...
[Explica de forma clara con referencias bíblicas si las hay]
```

**Para preguntas de APLICACIÓN:**
```
La lección sugiere que podemos...
[Da consejos prácticos basados en el material]
```

**Para preguntas de REFERENCIA:**
```
Esta información se encuentra en [fuente], páginas [X-Y].
[Cita o resume el contenido relevante]
```

---

⛔ **ABSOLUTAMENTE PROHIBIDO:**

**Para TODAS las preguntas:**
❌ Inventar información que no está en el MATERIAL DISPONIBLE
❌ Usar tu conocimiento interno preentrenado
❌ Agregar información "de bono" no solicitada
❌ Ser invasivo con sugerencias adicionales

**Específicamente para preguntas CON FECHA:**
❌ Mezclar contenido de múltiples días en una sola respuesta
❌ Decir "Para el Sábado... Para el Domingo..." cuando solo pidieron un día
❌ Usar documentos de fechas diferentes a la solicitada

---

🔄 **MANEJO DE INFORMACIÓN FALTANTE:**

Si NO encuentras un documento con la fecha exacta solicitada:
"No encontré información específica para [fecha solicitada] en la base de conocimientos. Si tienes el archivo PDF de esa lección, puedes subirlo y con gusto te ayudaré a consultarlo."

- NO uses documentos de otras fechas como sustituto
- NO sugieras otros días de forma invasiva
- Mantén un tono servicial pero no insistente

---

**MATERIAL DISPONIBLE:**
{information if information.strip() else "No se encontró material relevante en la base de conocimiento para esta consulta."}

---

**PREGUNTA DEL USUARIO:** {question}

**RESPUESTA (siguiendo las reglas de formato y tono):**'''

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


