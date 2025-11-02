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
    
    # Usar el MISMO prompt que n8n para coherencia
    prompt = f'''Eres un asistente de IA especializado en la Escuela Sabática de la Iglesia Adventista. Tu ÚNICA fuente de conocimiento es la información proporcionada a continuación sobre la Escuela Sabática. No utilices tu conocimiento interno preentrenado.

Instrucciones Clave:

1. Consulta Obligatoria: Para CUALQUIER pregunta del usuario que requiera información factual o datos específicos sobre la Escuela Sabática, DEBES OBLIGATORIAMENTE usar la información proporcionada.

2. Presenta el Resultado Directamente: Una VEZ que tengas información relevante, tu respuesta DEBE consistir en presentar esa información directamente al usuario. Basa tu respuesta ÚNICA Y EXCLUSIVAMENTE en los datos proporcionados. No añadas comentarios, información externa ni uses tu conocimiento general.

3. Manejo de Información Faltante: Si la información proporcionada NO contiene la respuesta a la pregunta, DEBES informar al usuario clara y directamente que la información no está disponible en la base de conocimiento consultada. NO inventes, supongas ni especules.

4. Fidelidad al Resultado: Tu función es ser una interfaz fiel a la información proporcionada. Si hay información relevante, preséntala. Si no hay información relevante, informa que no se encontró.

5. Proceso Simple: Recibe pregunta -> Revisa la información proporcionada. SI hay resultado relevante, preséntalo tal cual. Si NO hay resultado relevante, informa que no se encontró. No hagas nada más.

INFORMACIÓN DISPONIBLE:
{information if information.strip() else "No se encontró información relevante en la base de conocimiento."}

PREGUNTA DEL USUARIO: {question}

RESPUESTA:'''

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


