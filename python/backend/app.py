import os
import uuid
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from embeddings import add_pdf_to_collection, get_documents
from llm import query_llm
from cache import get_cached_response, save_to_cache

load_dotenv()

app = Flask(__name__)
CORS(app)

chatbot_status = {}

# Crear carpeta pdf_files si no existe
os.makedirs('pdf_files', exist_ok=True)

@app.route('/build_chatbot', methods=['POST'])
def build_chatbot():
    """
    Subir PDF y agregarlo a la colección ESCUELA-SABATICA
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file found'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Validar que sea un PDF
    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are allowed'}), 400
    
    try:
        # Guardar archivo temporalmente
        file_path = os.path.join('pdf_files', file.filename)
        file.save(file_path)
        print(f"💾 Archivo guardado: {file_path}")
        
        # Usar la colección predeterminada
        collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
        
        # Agregar el PDF a la colección
        result = add_pdf_to_collection(collection_name, file_path, file.filename)
        
        return jsonify({
            'success': True,
            'message': f'PDF "{file.filename}" agregado exitosamente a {collection_name}',
            'collection': collection_name,
            'pages_added': result['pages_added'],
            'total_points': result['total_points']
        }), 200
        
    except Exception as e:
        print(f"❌ Error al procesar PDF: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'error': 'Error al procesar el archivo PDF',
            'details': str(e)
        }), 500

@app.route('/ask_chatbot/<string:chatbot_id>', methods=['POST'])
def ask_chatbot(chatbot_id):
    """
    Hacer pregunta sobre una colección de Qdrant.
    Si chatbot_id es 'default', usa la colección predeterminada de .env
    """
    data = request.get_json()
    if 'question' not in data:
        return jsonify({'error': 'Missing "question" in the request body'}), 400

    question = data['question']
    
    # Si es 'default', usar la colección predeterminada
    if chatbot_id == 'default':
        collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
    else:
        # Verificar si el chatbot existe (solo para colecciones creadas dinámicamente)
        if chatbot_id not in chatbot_status:
            return jsonify({'error': 'Chatbot not found'}), 404
        collection_name = chatbot_id

    # Acceder a la base de datos de vectores y obtener documentos relevantes
    relevant_documents = get_documents(collection_name, question)

    # Preguntar a Gemini con los documentos relevantes
    answer = query_llm(question, relevant_documents)

    return jsonify({'answer': answer}), 200


@app.route('/ask', methods=['POST'])
def ask():
    """
    Endpoint simplificado para hacer preguntas directamente a la colección predeterminada
    """
    data = request.get_json()
    if 'question' not in data:
        return jsonify({'error': 'Missing "question" in the request body'}), 400

    question = data['question']
    collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')

    try:
        # Obtener documentos relevantes
        relevant_documents = get_documents(collection_name, question)
        
        # Generar respuesta con Gemini
        answer = query_llm(question, relevant_documents)
        
        return jsonify({
            'answer': answer,
            'collection': collection_name,
            'documents_found': len(relevant_documents)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chat', methods=['POST'])
def chat():
    """
    Endpoint compatible con Next.js frontend para chat
    Espera: { "message": "pregunta", "conversationId": "id", "settings": {...}, "history": [...] }
    Retorna: { "content": "respuesta", "sources": [...] }
    """
    data = request.get_json()
    if 'message' not in data:
        return jsonify({'error': 'Missing "message" in the request body'}), 400

    message = data['message']
    conversation_history = data.get('history', [])  # Historial de conversación
    collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')

    try:
        print(f"💬 Nueva pregunta: {message}")
        
        # Respuestas directas para saludos y mensajes simples (sin llamadas API)
        simple_greetings = {
            'hola': '¡Hola! Soy tu asistente de la Escuela Sabática. ¿En qué puedo ayudarte hoy?',
            'hello': 'Hello! I am your Sabbath School assistant. How can I help you today?',
            'hi': 'Hi! How can I assist you with Sabbath School today?',
            'buenos días': '¡Buenos días! ¿En qué puedo ayudarte con la Escuela Sabática?',
            'buenas tardes': '¡Buenas tardes! ¿En qué te puedo ayudar?',
            'buenas noches': '¡Buenas noches! ¿Tienes alguna pregunta sobre la Escuela Sabática?',
            'gracias': '¡De nada! Estoy aquí para ayudarte.',
            'thank you': 'You\'re welcome! I\'m here to help.',
            'thanks': 'You\'re welcome!',
            'adiós': '¡Hasta luego! Que tengas un buen día.',
            'bye': 'Goodbye! Have a great day!',
            'chao': '¡Chao! Vuelve pronto si tienes más preguntas.'
        }
        
        message_lower = message.lower().strip()
        if message_lower in simple_greetings:
            print(f"💡 Respuesta directa (sin API): {message_lower}")
            return jsonify({
                'content': simple_greetings[message_lower],
                'response': simple_greetings[message_lower],
                'sources': [],
                'from_cache': False,
                'direct_response': True
            }), 200
        
        # Construir query contextual con historial reciente
        # Priorizar la pregunta actual pero incluir contexto si es una pregunta de seguimiento
        contextual_query = message
        
        # Palabras temporales que indican que la pregunta ya tiene contexto temporal completo
        temporal_keywords = ['hoy', 'mañana', 'ayer', 'pasado', 'antes', 'lunes', 'martes', 
                            'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
                            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
        
        message_lower = message.lower()
        has_temporal_keyword = any(keyword in message_lower for keyword in temporal_keywords)
        
        if conversation_history and len(conversation_history) > 0:
            # Tomar los últimos 10 mensajes para contexto
            recent_messages = conversation_history[-10:] if len(conversation_history) >= 10 else conversation_history
            context_parts = []
            for msg in recent_messages:
                if msg.get('role') == 'user':
                    context_parts.append(msg.get('content', ''))
            
            # Si hay contexto previo y la pregunta actual es corta (probablemente de seguimiento)
            # PERO NO tiene palabras temporales (para evitar conflictos como "hoy" vs "mañana")
            if context_parts and len(message.split()) < 8 and not has_temporal_keyword:
                # Combinar los últimos 2 mensajes del usuario con más peso en la pregunta actual
                recent_context = ' '.join(context_parts[-2:])
                contextual_query = f"{message} {recent_context}"
                print(f"🔗 Query contextual (pregunta corta sin palabras temporales): {contextual_query}")
                
                # IMPORTANTE: Si la pregunta corta menciona un día/número sin mes (ej: "y la del 31")
                # Intentar extraer el mes del contexto previo
                import re
                meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                         'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                
                # Buscar número de día en la pregunta actual (ej: "31", "del 31", "el 31")
                dia_match = re.search(r'\b(\d{1,2})\b', message.lower())
                
                # Buscar mes en el contexto previo
                mes_match = None
                for mes in meses:
                    if mes in recent_context.lower():
                        mes_match = mes
                        break
                
                # Si encontramos día en pregunta actual y mes en contexto previo
                if dia_match and mes_match:
                    dia_numero = dia_match.group(1)
                    # Enriquecer el query contextual con fecha completa
                    contextual_query = f"{message} {dia_numero} de {mes_match}"
                    print(f"📅 Fecha detectada del contexto: {dia_numero} de {mes_match}")
                    print(f"🔗 Query enriquecido con fecha: {contextual_query}")
            elif has_temporal_keyword:
                # Si tiene palabra temporal, usar SOLO el mensaje actual sin contexto
                print(f"🔗 Query con palabra temporal detectada: '{message}' (sin contexto adicional)")
            else:
                print(f"🔗 Query simple: {message}")
        
        # Intentar obtener del cache primero (usando solo el mensaje actual)
        cached_result = get_cached_response(message)
        if cached_result:
            return jsonify({
                'content': cached_result['response'],
                'response': cached_result['response'],
                'sources': cached_result.get('sources', []),
                'from_cache': True
            }), 200
        
        # Obtener documentos relevantes usando query contextual
        relevant_documents = get_documents(collection_name, contextual_query)
        print(f"📚 Documentos encontrados: {len(relevant_documents)}")
        
        # Generar respuesta con Gemini
        answer = query_llm(message, relevant_documents)
        print(f"✅ Respuesta generada: {answer[:100]}...")
        
        # Extraer contenido de los documentos (pueden ser objetos Document de LangChain)
        sources = []
        if relevant_documents:
            for i, doc in enumerate(relevant_documents[:3]):
                # Si es un objeto Document, extraer page_content
                if hasattr(doc, 'page_content'):
                    content = doc.page_content
                # Si es string, usar directamente
                elif isinstance(doc, str):
                    content = doc
                else:
                    content = str(doc)
                
                sources.append({
                    'title': f'Documento {i+1}',
                    'snippet': content[:200] + '...' if len(content) > 200 else content,
                    'url': ''
                })
        
        # Guardar en cache para futuras consultas
        save_to_cache(message, answer, sources)
        
        # Formato compatible con el endpoint de Next.js
        return jsonify({
            'content': answer,
            'response': answer,
            'sources': sources,
            'from_cache': False
        }), 200
    except Exception as e:
        error_message = str(e)
        print(f"❌ Error en /chat: {error_message}")
        import traceback
        traceback.print_exc()
        
        # Mensaje amigable para límite de cuota
        if "429" in error_message or "Resource exhausted" in error_message or "cuota" in error_message.lower():
            return jsonify({
                'error': 'Límite de cuota de Gemini alcanzado',
                'message': 'Has alcanzado el límite de solicitudes por minuto. Por favor, espera un momento e intenta nuevamente, o cambia al modelo n8n.',
                'details': error_message
            }), 429
        
        return jsonify({'error': error_message}), 500


@app.route('/health', methods=['GET'])
def health():
    collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
    return jsonify({
        'status': 'ok',
        'port': os.environ.get('PORT', '5000'),
        'qdrant_url': os.getenv('QDRANT_URL'),
        'default_collection': collection_name
    }), 200

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Endpoint simplificado para subir archivos PDF a Qdrant
    Compatible con el frontend Next.js
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No se encontró archivo en la solicitud'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No se seleccionó ningún archivo'}), 400
    
    # Validar que sea un PDF
    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'Solo se permiten archivos PDF'}), 400
    
    try:
        # Guardar archivo temporalmente
        file_path = os.path.join('pdf_files', file.filename)
        file.save(file_path)
        print(f"💾 Archivo guardado: {file_path}")
        
        # Usar la colección de Escuela Sabática
        collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
        print(f"📚 Procesando archivo para colección: {collection_name}")
        
        # Agregar el PDF a Qdrant
        result = add_pdf_to_collection(collection_name, file_path, file.filename)
        
        print(f"✅ PDF procesado exitosamente: {result['pages_added']} páginas agregadas")
        
        return jsonify({
            'success': True,
            'message': f'Archivo "{file.filename}" procesado y agregado a Qdrant',
            'collection': collection_name,
            'pages_added': result['pages_added'],
            'filename': file.filename
        }), 200
        
    except Exception as e:
        print(f"❌ Error procesando archivo: {str(e)}")
        return jsonify({
            'error': 'Error al procesar el archivo',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
