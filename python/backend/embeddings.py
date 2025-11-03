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

# Modelos disponibles con rotación para evitar límites de cuota
EMBEDDING_MODELS = [
    'models/text-embedding-004',  # Modelo principal
]

# Índice para rotación de modelos (se incrementa en cada llamada)
_model_index = 0

def get_next_embedding_model():
    """Obtiene el siguiente modelo de la lista para rotación"""
    global _model_index
    model = EMBEDDING_MODELS[_model_index % len(EMBEDDING_MODELS)]
    _model_index += 1
    return model

def generate_embedding(text: str, task_type=None, retry_delay=2) -> list:
    """
    Genera embedding usando Google Gemini
    Usa el modelo 'models/text-embedding-004' que es compatible con n8n
    Incluye delay automático para evitar rate limiting
    
    Args:
        text: Texto para generar embedding
        task_type: None para compatibilidad con n8n, o 'retrieval_document'/'retrieval_query' si se especifica
        retry_delay: Tiempo de espera entre reintentos
    
    IMPORTANTE: n8n NO especifica task_type, así que usamos None por defecto
    para que los embeddings sean compatibles con las búsquedas de n8n
    """
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Si task_type es None, no lo pasamos (comportamiento por defecto de n8n)
            embed_params = {
                'model': 'models/text-embedding-004',
                'content': text
            }
            if task_type is not None:
                embed_params['task_type'] = task_type
                
            result = genai.embed_content(**embed_params)
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
        # Generar embedding usando Google Gemini (sin task_type, igual que n8n)
        vector = generate_embedding(doc.content)
        
        # Crear punto en formato dict para REST API
        # IMPORTANTE: n8n usa 'content' como campo principal
        point = {
            'id': str(uuid.uuid4()),
            'vector': vector,
            'payload': {
                'content': doc.content,  # n8n usa 'content'
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


def get_documents(collection_name, question, limit=8):
    """
    Buscar documentos relevantes en Qdrant usando búsqueda semántica
    Genera embedding de la pregunta y busca los documentos más similares
    
    IMPORTANTE: Usa task_type=None para compatibilidad con n8n
    Usa limit=8 por defecto para obtener mejor contexto y permitir re-ranking por fecha
    """
    from datetime import datetime
    
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    api_key = os.getenv('QDRANT_API_KEY', None)
    
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['api-key'] = api_key
    
    try:
        # Nombres en español para días y meses
        dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
        meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
        
        # DEBUG: Ver qué query recibimos
        print(f"🔍 Query recibida en semantic_search: '{question}'")
        
        # Enriquecer la pregunta con contexto temporal
        question_lower = question.lower()
        enriched_question = question
        target_date = None
        
        # Detectar referencias temporales y calcular la fecha correspondiente
        from datetime import timedelta
        import re
        now = datetime.now()
        
        # 1. Detectar referencias relativas (hoy, mañana, ayer, etc.)
        # IMPORTANTE: Detectar frases más específicas PRIMERO (pasado mañana antes que mañana)
        if 'hoy' in question_lower or 'de hoy' in question_lower or 'esta lección' in question_lower or 'lección de hoy' in question_lower or 'actual' in question_lower or 'esta semana' in question_lower:
            target_date = now
            print(f"📅 Detectado: HOY")
        elif 'pasado mañana' in question_lower or 'pasado-mañana' in question_lower or 'pasadomañana' in question_lower:
            target_date = now + timedelta(days=2)
            print(f"📅 Detectado: PASADO MAÑANA")
        elif 'antes de ayer' in question_lower or 'anteayer' in question_lower or 'antesdeayer' in question_lower:
            target_date = now - timedelta(days=2)
            print(f"📅 Detectado: ANTES DE AYER")
        elif 'mañana' in question_lower:
            target_date = now + timedelta(days=1)
            print(f"📅 Detectado: MAÑANA → {dias[target_date.weekday()]} {target_date.day} de {meses[target_date.month - 1]}")
        elif 'ayer' in question_lower:
            target_date = now - timedelta(days=1)
            print(f"📅 Detectado: AYER → {dias[target_date.weekday()]} {target_date.day} de {meses[target_date.month - 1]}")
        else:
            # 2. Detectar fechas explícitas en formato "DD de mes" (ej: "30 de octubre", "3 de noviembre")
            # Patrón: número + "de" + nombre_del_mes
            fecha_pattern = r'(\d{1,2})\s+de\s+(' + '|'.join(meses) + r')'
            match = re.search(fecha_pattern, question_lower)
            
            if match:
                dia_numero = int(match.group(1))
                mes_nombre = match.group(2)
                mes_numero = meses.index(mes_nombre) + 1
                
                # Construir la fecha con el año actual
                from datetime import date
                try:
                    target_date = date(now.year, mes_numero, dia_numero)
                    print(f"📅 Detectado fecha explícita: {dia_numero} de {mes_nombre}")
                except ValueError:
                    # Fecha inválida (ej: 31 de febrero)
                    print(f"⚠️ Fecha inválida: {dia_numero} de {mes_nombre}")
                    target_date = None
        
        # Si detectamos una referencia temporal, enriquecer la pregunta
        if target_date:
            dia_semana = dias[target_date.weekday()]
            dia_numero = target_date.day
            mes = meses[target_date.month - 1]
            
            enriched_question = f"{question} {dia_semana} {dia_numero} de {mes}"
            print(f"🔍 Pregunta enriquecida con contexto temporal: {enriched_question}")
        
        # Generar embedding SIN task_type para compatibilidad con n8n
        print(f"🔍 Generando embedding para búsqueda (modo n8n compatible): {enriched_question}")
        question_vector = generate_embedding(enriched_question, task_type=None)
        
        if not question_vector:
            print("❌ Error: No se pudo generar el vector de la pregunta")
            return []
        
        print(f"✅ Vector generado exitosamente (dimensión: {len(question_vector)})")
        
        # Buscar documentos similares usando búsqueda semántica
        # Aumentar limit a 20 para capturar todos los días de la lección cuando hay fecha específica
        # Luego se reduce a 'limit' después del re-ranking
        search_limit = 20 if target_date else limit
        
        payload = {
            "vector": question_vector,
            "limit": search_limit,
            "with_payload": True,
            "with_vector": False
            # SIN score_threshold - n8n no lo usa por defecto
        }
        
        # Si hay fecha específica, agregar búsqueda híbrida con scroll
        # para garantizar que encontremos el documento exacto
        if target_date:
            dia_semana_target = dias[target_date.weekday()]
            dia_numero_target = str(target_date.day)
            mes_target = meses[target_date.month - 1]
            
            print(f"🔎 Búsqueda HÍBRIDA activada para: {dia_semana_target} {dia_numero_target} de {mes_target}")
            print(f"   - Búsqueda vectorial: {search_limit} docs")
            print(f"   - Búsqueda por scroll: revisando toda la colección")
        
        print(f"🔎 Buscando en Qdrant: {qdrant_url}/collections/{collection_name}/points/search")
        print(f"   - Limit: {search_limit} ({'ampliado para búsqueda por fecha' if search_limit > limit else 'normal'})")
        print(f"   - Sin score_threshold (compatible con n8n)")
        
        response = requests.post(
            f"{qdrant_url}/collections/{collection_name}/points/search",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        print(f"📡 Respuesta de Qdrant: Status {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            points = data.get('result', [])
            
            print(f"� Resultados encontrados: {len(points)}")
            
            # Si hay fecha específica y no encontramos el documento exacto, hacer scroll search
            if target_date:
                dia_semana_target = dias[target_date.weekday()]
                dia_numero_target = str(target_date.day)
                mes_target = meses[target_date.month - 1]
                
                # Buscar si alguno de los resultados es match exacto
                has_exact_match = False
                for point in points:
                    content = point.get('payload', {}).get('content', '')
                    content_lower = content.lower()
                    if (dia_semana_target.lower() in content_lower and 
                        dia_numero_target in content and 
                        mes_target in content_lower):
                        has_exact_match = True
                        break
                
                # Si NO encontramos match exacto, hacer scroll para buscarlo
                if not has_exact_match:
                    print(f"⚠️  No se encontró match exacto en los {len(points)} resultados vectoriales")
                    print(f"🔄 Ejecutando scroll search para encontrar: {dia_semana_target} {dia_numero_target} de {mes_target}")
                    
                    try:
                        scroll_payload = {
                            "limit": 200,  # Aumentado a 200 para cubrir toda la colección (124 docs actuales)
                            "with_payload": True,
                            "with_vector": False
                        }
                        
                        scroll_response = requests.post(
                            f"{qdrant_url}/collections/{collection_name}/points/scroll",
                            headers=headers,
                            json=scroll_payload,
                            timeout=10
                        )
                        
                        if scroll_response.status_code == 200:
                            scroll_data = scroll_response.json()
                            scroll_points = scroll_data.get('result', {}).get('points', [])
                            print(f"📜 Scroll encontró {len(scroll_points)} documentos en total")
                            print(f"🔍 Buscando coincidencia exacta de: '{dia_semana_target}' + '{dia_numero_target}' + '{mes_target}'")
                            
                            # Buscar el documento con fecha exacta
                            found_match = False
                            for scroll_point in scroll_points:
                                content = scroll_point.get('payload', {}).get('content', '')
                                content_lower = content.lower()
                                
                                # Debug: mostrar primeros 100 caracteres de cada documento revisado
                                if 'lección 6' in content_lower and 'noviembre' in content_lower:
                                    print(f"   🔎 Revisando: {content[:120]}...")
                                
                                if (dia_semana_target.lower() in content_lower and 
                                    dia_numero_target in content and 
                                    mes_target in content_lower):
                                    
                                    print(f"✅ ¡ENCONTRADO en scroll! Agregando al inicio de resultados")
                                    print(f"   ID: {scroll_point.get('id')}")
                                    print(f"   Contenido: {content[:150]}...")
                                    
                                    # Agregar este documento al inicio con score alto
                                    points.insert(0, {
                                        'id': scroll_point.get('id'),
                                        'score': 1.5,  # Score artificial alto para priorizarlo
                                        'payload': scroll_point.get('payload', {})
                                    })
                                    found_match = True
                                    break
                            
                            if not found_match:
                                print(f"❌ No se encontró documento con: {dia_semana_target} {dia_numero_target} de {mes_target}")
                    except Exception as scroll_error:
                        print(f"⚠️  Error en scroll search: {scroll_error}")
            
            if not points:
                print("⚠️  No se encontraron documentos relevantes")
                print("   Esto puede significar que:")
                print("   1. La colección está vacía (points_count = 0)")
                print("   2. El score threshold es muy alto")
                print("   3. Los embeddings no coinciden (diferentes task_types)")
                return []
            
            # Primero, construir la lista de documentos con scores
            doc_candidates = []
            for point in points:
                payload = point.get('payload', {})
                content = payload.get('content', payload.get('text', ''))
                
                if content:
                    score = point.get('score', 0)
                    doc_candidates.append({
                        'point': point,
                        'content': content,
                        'score': score,
                        'payload': payload
                    })
            
            # RE-RANKING: Si la pregunta tiene fecha específica, priorizar documentos con esa fecha
            if target_date:  # Si se detectó una referencia temporal
                print(f"🎯 Aplicando re-ranking por coincidencia de fecha exacta...")
                
                # Extraer los componentes de la fecha objetivo
                dia_semana = dias[target_date.weekday()]
                dia_numero = str(target_date.day)
                mes_actual = meses[target_date.month - 1]
                
                # Re-ordenar documentos: los que contienen la fecha exacta van primero
                exact_matches = []
                partial_matches = []
                other_docs = []
                
                for doc in doc_candidates:
                    content_lower = doc['content'].lower()
                    
                    # Coincidencia EXACTA: contiene día de semana + número + mes
                    if (dia_semana.lower() in content_lower and 
                        dia_numero in doc['content'] and 
                        mes_actual in content_lower):
                        # BOOST: dar score adicional a coincidencias exactas
                        doc['score'] = doc['score'] + 0.5  
                        exact_matches.append(doc)
                        print(f"   ✅ MATCH EXACTO: {doc['content'][:100]}... (score: {doc['score']:.3f})")
                    # Coincidencia PARCIAL: solo día de semana o solo número+mes
                    elif (dia_semana.lower() in content_lower or 
                          (dia_numero in doc['content'] and mes_actual in content_lower)):
                        doc['score'] = doc['score'] + 0.2
                        partial_matches.append(doc)
                        print(f"   🔸 MATCH PARCIAL: {doc['content'][:100]}... (score: {doc['score']:.3f})")
                    else:
                        other_docs.append(doc)
                        print(f"   📄 Doc encontrado (score: {doc['score']:.3f}): {doc['content'][:100]}...")
                
                # Combinar: exact matches primero, luego partial, luego otros
                doc_candidates = exact_matches + partial_matches + other_docs
            else:
                # Sin enriquecimiento de fecha, solo mostrar scores
                for doc in doc_candidates:
                    print(f"   📄 Doc encontrado (score: {doc['score']:.3f}): {doc['content'][:100]}...")
            
            # Convertir a objetos Document
            relevant_docs = []
            for doc in doc_candidates[:limit]:  # Limitar al número solicitado
                relevant_docs.append(Document(
                    doc_id=str(doc['point'].get('id', '')),
                    content=doc['content'],
                    metadata=doc['payload'].get('metadata', {})
                ))
            
            print(f"📚 Total de documentos procesados: {len(relevant_docs)}")
            return relevant_docs
        else:
            print(f"❌ Error en la búsqueda de Qdrant: {response.status_code} - {response.text}")
            return []
            
    except Exception as e:
        print(f"❌ Error en get_documents: {e}")
        import traceback
        traceback.print_exc()
        return []
