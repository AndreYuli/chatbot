import os
import uuid
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from embeddings import add_pdf_to_collection, get_documents
from llm import query_llm

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


@app.route('/health', methods=['GET'])
def health():
    collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
    return jsonify({
        'status': 'ok',
        'port': os.environ.get('PORT', '5000'),
        'qdrant_url': os.getenv('QDRANT_URL'),
        'default_collection': collection_name
    }), 200

if __name__ == '__main__':
    app.run(debug=True)
