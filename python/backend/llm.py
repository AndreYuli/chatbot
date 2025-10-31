import os
import google.generativeai as genai

def query_llm(question, relevant_documents):

    information = ''
    for document in relevant_documents:
        information += document.content + '\n'

    # Extraer números de página solo si existen en metadata
    pages_list = []
    for doc in relevant_documents:
        if hasattr(doc, 'metadata') and isinstance(doc.metadata, dict) and 'page_number' in doc.metadata:
            pages_list.append(str(doc.metadata['page_number']))
    
    pages = ','.join(pages_list) if pages_list else 'N/A'

    # Incluir referencia a páginas solo si hay páginas disponibles
    page_reference = f"La información se encuentra en las páginas: {pages}" if pages != 'N/A' else ""
    
    prompt = f'''
Eres un asistente especializado en la Escuela Sabática de la Iglesia Adventista.

REGLAS IMPORTANTES:
1. USA ÚNICAMENTE la información proporcionada abajo para responder
2. Si la respuesta está en la información, responde de forma clara y detallada
3. Si NO encuentras la respuesta en la información, di: "Lo siento, no encontré esa información específica en la base de conocimiento"
4. NUNCA inventes información o uses conocimiento externo sobre Escuela Sabática
5. Responde SIEMPRE en español de forma amigable y profesional
{f"6. Si encuentras la respuesta, incluye al final: {page_reference}" if page_reference else ""}

INFORMACIÓN DISPONIBLE:
{information}

PREGUNTA DEL USUARIO: {question}

RESPUESTA:'''

    # Configure Gemini API
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    
    # Create the model
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    # Generate response
    response = model.generate_content(prompt)
    
    return response.text


