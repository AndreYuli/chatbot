# Script de prueba para consultar la colección ESCUELA-SABATICA

import os
from dotenv import load_dotenv
from embeddings import get_qdrant_client, embedding_model

load_dotenv()

def test_qdrant_connection():
    """Probar conexión a Qdrant y consultar ESCUELA-SABATICA"""
    
    print("🔍 Probando conexión a Qdrant...")
    print(f"URL: {os.getenv('QDRANT_URL')}")
    print(f"Colección: {os.getenv('QDRANT_COLLECTION')}\n")
    
    try:
        # Conectar a Qdrant
        client = get_qdrant_client()
        
        # Obtener info de la colección
        collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
        collection_info = client.get_collection(collection_name)
        
        print(f"✅ Conexión exitosa!")
        print(f"📊 Puntos en la colección: {collection_info.points_count}")
        print(f"📐 Dimensiones del vector: {collection_info.config.params.vectors.size}")
        print(f"📏 Distancia: {collection_info.config.params.vectors.distance}\n")
        
        # Hacer una consulta de prueba
        question = "¿Qué es la escuela sabática?"
        print(f"❓ Pregunta de prueba: '{question}'")
        
        # Generar embedding de la pregunta
        question_vector = embedding_model.encode(question).tolist()
        print(f"✅ Vector generado: {len(question_vector)} dimensiones")
        
        # Buscar en Qdrant
        search_result = client.search(
            collection_name=collection_name,
            query_vector=question_vector,
            limit=3
        )
        
        print(f"\n🔎 Resultados encontrados: {len(search_result)}\n")
        
        for i, hit in enumerate(search_result, 1):
            print(f"--- Resultado {i} (Score: {hit.score:.4f}) ---")
            content = hit.payload.get('content', 'No content')
            # Mostrar solo los primeros 200 caracteres
            print(f"{content[:200]}...")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == '__main__':
    test_qdrant_connection()
