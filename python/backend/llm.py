import os
import time
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

def query_llm(question, relevant_documents, max_retries=3):

    information = ''
    for document in relevant_documents:
        information += document.content + '\n'
    
    prompt = f'''
Eres un asistente especializado en la Escuela Sabática de la Iglesia Adventista.

REGLAS ESTRICTAS - DEBES CUMPLIRLAS AL PIE DE LA LETRA:
1. Para preguntas de SALUDO (hola, buenos días, etc.) o PRESENTACIÓN: Responde amablemente y ofrece ayuda sobre la Escuela Sabática
2. Para preguntas SOBRE LA ESCUELA SABÁTICA: SOLO puedes usar la INFORMACIÓN PROPORCIONADA ABAJO
3. NUNCA uses conocimiento externo, internet o información que no esté en la información proporcionada para preguntas sobre contenido
4. Si una pregunta sobre contenido NO está en la información proporcionada, di: "Lo siento, no encontré esa información específica en la base de conocimiento de la Escuela Sabática. ¿Puedo ayudarte con algo más?"
5. PROHIBIDO inventar, asumir o agregar información sobre contenido de escuela sabática que no esté explícitamente en la información proporcionada
6. Responde SIEMPRE en español de forma clara, directa y profesional
7. Cita textualmente cuando sea posible

INFORMACIÓN DISPONIBLE (ÚNICA FUENTE PERMITIDA PARA CONTENIDO):
{information}

PREGUNTA DEL USUARIO: {question}

INSTRUCCIONES FINALES:
- Si es un SALUDO/PRESENTACIÓN: Responde amablemente y ofrece tu ayuda
- Si encuentras la respuesta en la información: Responde de forma clara usando SOLO esa información
- Si NO encuentras la respuesta sobre contenido: Di "Lo siento, no encontré esa información específica en la base de conocimiento de la Escuela Sabática"
- NUNCA uses conocimiento externo para responder preguntas sobre contenido

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


