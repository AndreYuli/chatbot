import os
import uuid
import time
import PyPDF2
import requests
import google.generativeai as genai
from qdrant_client import QdrantClient
from document import Document

# Configurar Google Gemini para embeddings
print("🔄 Configurando Google Gemini para embeddings...")
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
print("✅ Google Gemini configurado")

def generate_embedding(text: str, retry_delay=2) -> list:
    """
    Genera embedding usando Google Gemini
    Usa el modelo 'models/text-embedding-004' que es compatible con n8n
    Incluye delay automático para evitar rate limiting
    """
    max_retries = 3
    for attempt in range(max_retries):
        try:
            result = genai.embed_content(
                model='models/text-embedding-004',
                content=text,
                task_type="retrieval_document"
            )
            # Pequeño delay después de cada llamada exitosa para evitar rate limiting
            time.sleep(0.5)
            return result['embedding']
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "Resource exhausted" in error_msg:
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (attempt + 1)
                    print(f"⚠️ Rate limit alcanzado. Esperando {wait_time}s antes de reintentar...")
                    time.sleep(wait_time)
                else:
                    print(f"❌ Error generando embedding después de {max_retries} intentos: {e}")
                    raise
            else:
                print(f"❌ Error generando embedding: {e}")
                raise

def get_qdrant_client():
    """Obtener cliente de Qdrant con configuración desde variables de entorno"""
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    qdrant_api_key = os.getenv('QDRANT_API_KEY', None)
    
    if qdrant_api_key:
        # Qdrant Cloud o servidor con autenticación
        # Usar prefer_grpc=False para forzar REST API en lugar de gRPC
        return QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key,
            prefer_grpc=False  # Usar REST API solamente
        )
    else:
        # Qdrant local sin autenticación
        return QdrantClient(url=qdrant_url)

def create_embeddings(chatbot_id, file_name):
    """Extraer texto del PDF y crear embeddings en Qdrant"""
    # Extraer el texto del pdf
    with open(os.path.join('pdf_files', file_name), 'rb') as pdf_file:
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        documents = []
        for page_num, page in enumerate(pdf_reader.pages):
            document = Document(
                doc_id=str(uuid.uuid4()),
                content=page.extract_text(),
                metadata={'page_number': str(page_num), 'filename': file_name}
            )
            documents.append(document)

    # Conectar a Qdrant
    client = get_qdrant_client()
    
    # Crear colección si no existe
    collections = client.get_collections().collections
    collection_exists = any(col.name == chatbot_id for col in collections)
    
    if not collection_exists:
        client.create_collection(
            collection_name=chatbot_id,
            vectors_config=VectorParams(
                size=768,  # Dimensión del modelo paraphrase-multilingual-mpnet-base-v2
                distance=Distance.COSINE
            )
        )
    
    # Crear embeddings y guardar en Qdrant
    points = []
    for doc in documents:
        # Generar embedding
        vector = embedding_model.encode(doc.content).tolist()
        
        # Crear punto
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                'content': doc.content,
                'metadata': doc.metadata
            }
        )
        points.append(point)
    
    # Subir puntos a Qdrant
    client.upsert(
        collection_name=chatbot_id,
        points=points
    )

def add_pdf_to_collection(collection_name, file_path, file_name):
    """
    Agregar un PDF a una colección existente de Qdrant
    """
    print(f"📄 Procesando PDF: {file_name}")
    
    # Extraer el texto del PDF
    with open(file_path, 'rb') as pdf_file:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        total_pages = len(pdf_reader.pages)
        print(f"📖 Total de páginas: {total_pages}")

        documents = []
        for page_num, page in enumerate(pdf_reader.pages):
            content = page.extract_text()
            if content.strip():  # Solo agregar páginas con contenido
                document = Document(
                    doc_id=str(uuid.uuid4()),
                    content=content,
                    metadata={
                        'page_number': str(page_num + 1),
                        'filename': file_name,
                        'total_pages': str(total_pages)
                    }
                )
                documents.append(document)
        
        print(f"✅ Extraídas {len(documents)} páginas con contenido")

    # Verificar que la colección existe usando REST API
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    api_key = os.getenv('QDRANT_API_KEY', None)
    
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['api-key'] = api_key
    
    try:
        response = requests.get(
            f"{qdrant_url}/collections/{collection_name}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            collection_info = response.json()
            points_count = collection_info.get('result', {}).get('points_count', 0)
            print(f"✅ Colección '{collection_name}' encontrada: {points_count} puntos existentes")
        else:
            print(f"❌ Error: La colección '{collection_name}' no existe (status: {response.status_code})")
            raise ValueError(f"La colección '{collection_name}' no existe")
    except requests.RequestException as e:
        print(f"❌ Error al verificar colección: {e}")
        raise ValueError(f"No se pudo conectar a Qdrant: {e}")
    
    # Crear embeddings y puntos para Qdrant
    print("🔄 Generando embeddings...")
    points = []
    for i, doc in enumerate(documents):
        # Generar embedding usando Google Gemini
        vector = generate_embedding(doc.content)
        
        # Crear punto en formato dict para REST API
        point = {
            'id': str(uuid.uuid4()),
            'vector': vector,
            'payload': {
                'content': doc.content,
                'metadata': doc.metadata
            }
        }
        points.append(point)
        
        if (i + 1) % 10 == 0:
            print(f"   Procesadas {i + 1}/{len(documents)} páginas...")
    
    print(f"✅ Embeddings generados para {len(points)} páginas")
    
    # Subir puntos a Qdrant usando REST API
    try:
        payload = {
            'points': points
        }
        
        print(f"🔄 Subiendo {len(points)} puntos a Qdrant...")
        response = requests.put(
            f"{qdrant_url}/collections/{collection_name}/points",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ PDF agregado exitosamente!")
            print(f"   Status: {result.get('status')}")
        else:
            print(f"❌ Error al subir puntos: {response.status_code} - {response.text}")
            raise ValueError(f"Error al subir puntos a Qdrant: {response.status_code}")
            
    except requests.RequestException as e:
        print(f"❌ Error al conectar con Qdrant: {e}")
        raise ValueError(f"No se pudo subir a Qdrant: {e}")
    
    # Verificar resultado final con REST API
    response = requests.get(
        f"{qdrant_url}/collections/{collection_name}",
        headers=headers,
        timeout=10
    )
    
    if response.status_code == 200:
        updated_info = response.json()
        total_points = updated_info.get('result', {}).get('points_count', 0)
        print(f"   Puntos totales en '{collection_name}': {total_points}")
        
        return {
            'pages_added': len(documents),
            'total_points': total_points,
            'filename': file_name
        }
    else:
        return {
            'pages_added': len(documents),
            'total_points': 'unknown',
            'filename': file_name
        }


def get_documents(collection_name, question, limit=5):
    """
    Buscar documentos relevantes en Qdrant usando búsqueda semántica
    Genera embedding de la pregunta y busca los documentos más similares
    """
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    api_key = os.getenv('QDRANT_API_KEY', None)
    
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['api-key'] = api_key
    
    try:
        # Generar embedding de la pregunta
        print(f"🔍 Generando embedding para: {question}")
        question_vector = generate_embedding(question)
        
        # Buscar documentos similares usando búsqueda semántica
        payload = {
            "vector": question_vector,
            "limit": limit,
            "with_payload": True,
            "with_vector": False
        }
        
        response = requests.post(
            f"{qdrant_url}/collections/{collection_name}/points/search",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            points = data.get('result', [])
            
            print(f"📄 Obtenidos {len(points)} documentos de {collection_name}")
            
            relevant_docs = []
            for point in points:
                if point.get('payload') and 'content' in point['payload']:
                    content = point['payload'].get('content', '')
                    score = point.get('score', 0)
                    # Mostrar preview del contenido para debugging
                    preview = content[:100] + '...' if len(content) > 100 else content
                    print(f"   - Doc preview (score: {score:.3f}): {preview}")
                    
                    relevant_docs.append(
                        Document(
                            doc_id=str(point.get('id', '')),
                            content=content,
                            metadata=point['payload'].get('metadata', {})
                        )
                    )
            
            return relevant_docs
        else:
            print(f"❌ Error en búsqueda: {response.status_code} - {response.text}")
        
    except Exception as e:
        print(f"❌ Error en get_documents: {str(e)}")
        import traceback
        traceback.print_exc()
    
    return []
    