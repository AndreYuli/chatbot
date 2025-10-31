# Script simple para probar conexión con ESCUELA-SABATICA

import os
import sys
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# NO importar sentence_transformers para evitar descargas pesadas
from qdrant_client import QdrantClient

def test_simple_connection():
    """Probar conexión básica a Qdrant"""
    
    print("🔍 Probando conexión a Qdrant...")
    print(f"URL: {os.getenv('QDRANT_URL')}")
    print(f"Colección: {os.getenv('QDRANT_COLLECTION')}\n")
    
    try:
        # Conectar a Qdrant
        qdrant_url = os.getenv('QDRANT_URL')
        
        # Configuración explícita para REST API con HTTPS
        client = QdrantClient(
            url=qdrant_url,
            api_key=os.getenv('QDRANT_API_KEY'),
            prefer_grpc=False,  # Forzar REST API
            timeout=30  # Aumentar timeout
        )
        
        print(f"🔧 Configuración: prefer_grpc=False, timeout=30s")
        
        # Obtener info de la colección
        collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
        collection_info = client.get_collection(collection_name)
        
        print(f"✅ Conexión exitosa!")
        print(f"📊 Puntos en la colección: {collection_info.points_count}")
        print(f"📐 Dimensiones del vector: {collection_info.config.params.vectors.size}\n")
        
        # Obtener algunos documentos de ejemplo
        print("📄 Obteniendo documentos de ejemplo...")
        result = client.scroll(
            collection_name=collection_name,
            limit=3,
            with_payload=True,
            with_vectors=False
        )
        
        points = result[0] if result else []
        print(f"✅ Se obtuvieron {len(points)} documentos\n")
        
        for i, point in enumerate(points, 1):
            print(f"--- Documento {i} ---")
            content = point.payload.get('content', 'No content')[:150]
            print(f"{content}...")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == '__main__':
    test_simple_connection()
