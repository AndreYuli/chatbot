"""
Test de conexión a Qdrant usando solo REST API con httpx (sin gRPC)
"""

import os
import httpx
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def test_qdrant_rest():
    """Probar conexión directa REST API sin QdrantClient"""
    
    qdrant_url = os.getenv('QDRANT_URL')
    api_key = os.getenv('QDRANT_API_KEY')
    collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
    
    print("🔍 Probando conexión REST directa a Qdrant...")
    print(f"URL: {qdrant_url}")
    print(f"Colección: {collection_name}\n")
    
    headers = {
        'api-key': api_key,
        'Content-Type': 'application/json'
    }
    
    try:
        # Test 1: Health check
        print("1️⃣ Health check...")
        with httpx.Client(headers=headers, timeout=10.0) as client:
            response = client.get(f"{qdrant_url}/")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}\n")
        
        # Test 2: Listar colecciones
        print("2️⃣ Listando colecciones...")
        with httpx.Client(headers=headers, timeout=10.0) as client:
            response = client.get(f"{qdrant_url}/collections")
            if response.status_code == 200:
                collections = response.json()
                print(f"   ✅ Encontradas {len(collections.get('result', {}).get('collections', []))} colecciones")
                for col in collections.get('result', {}).get('collections', []):
                    print(f"      - {col['name']}\n")
            else:
                print(f"   ❌ Error: {response.status_code} - {response.text}\n")
        
        # Test 3: Info de la colección
        print(f"3️⃣ Información de {collection_name}...")
        with httpx.Client(headers=headers, timeout=10.0) as client:
            response = client.get(f"{qdrant_url}/collections/{collection_name}")
            if response.status_code == 200:
                info = response.json()
                result = info.get('result', {})
                print(f"   ✅ Puntos: {result.get('points_count', 'N/A')}")
                print(f"   ✅ Dimensiones: {result.get('config', {}).get('params', {}).get('vectors', {}).get('size', 'N/A')}")
                print(f"   ✅ Distancia: {result.get('config', {}).get('params', {}).get('vectors', {}).get('distance', 'N/A')}\n")
            else:
                print(f"   ❌ Error: {response.status_code} - {response.text}\n")
        
        # Test 4: Scroll de documentos
        print("4️⃣ Obteniendo documentos de ejemplo...")
        with httpx.Client(headers=headers, timeout=10.0) as client:
            payload = {
                "limit": 3,
                "with_payload": True,
                "with_vector": False
            }
            response = client.post(f"{qdrant_url}/collections/{collection_name}/points/scroll", json=payload)
            if response.status_code == 200:
                data = response.json()
                points = data.get('result', {}).get('points', [])
                print(f"   ✅ Obtenidos {len(points)} puntos:")
                for i, point in enumerate(points, 1):
                    content = point.get('payload', {}).get('content', 'N/A')
                    preview = content[:100] + '...' if len(content) > 100 else content
                    print(f"      {i}. {preview}\n")
            else:
                print(f"   ❌ Error: {response.status_code} - {response.text}\n")
        
        print("✅ ¡Todas las pruebas completadas exitosamente!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_qdrant_rest()
