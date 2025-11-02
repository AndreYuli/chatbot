import os
import time
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
    # Construir contexto de documentos relevantes
    information = ''
    if relevant_documents:
        for document in relevant_documents:
            information += document.content + '\n\n'
    
    # Prompt que estructura mejor las respuestas
    prompt = f'''Eres un asistente de IA especializado en la Escuela Sabática de la Iglesia Adventista. Tu ÚNICA fuente de conocimiento es la información proporcionada a continuación.

Instrucciones Clave:

1. **Consulta Obligatoria**: Para CUALQUIER pregunta que requiera información sobre la Escuela Sabática, DEBES usar ÚNICAMENTE la información proporcionada.

2. **Presenta la Información de Forma Clara y Estructurada**: 
   - Separa la información en párrafos cortos (2-3 oraciones máximo)
   - Deja una línea en blanco entre párrafos
   - Usa **negritas** para títulos y secciones importantes
   - Si hay listas de temas o versículos, preséntalos en viñetas o líneas separadas
   - Organiza la información por secciones cuando sea apropiado
   
3. **Formato Legible**:
   - NO presentes todo en un solo bloque de texto
   - Divide ideas principales en párrafos separados
   - Usa saltos de línea para mejorar la legibilidad
   - Mantén las referencias bíblicas como aparecen en el original
   
4. **Manejo de Información Faltante**: Si la información NO contiene la respuesta, informa clara y directamente que no está disponible en la base de conocimiento.

5. **Fidelidad al Contenido**: Basa tu respuesta ÚNICA Y EXCLUSIVAMENTE en los datos proporcionados, pero organízalos de forma legible.

INFORMACIÓN DISPONIBLE:
{information if information.strip() else "No se encontró información relevante en la base de conocimiento."}

PREGUNTA DEL USUARIO: {question}

RESPUESTA (bien estructurada y con párrafos separados):'''

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


