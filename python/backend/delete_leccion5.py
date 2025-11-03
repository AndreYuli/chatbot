"""
Script para eliminar todos los documentos de la Lección 5 de Qdrant
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

def delete_leccion5_documents():
    """Elimina todos los documentos de la Lección 5 de Qdrant"""
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    api_key = os.getenv('QDRANT_API_KEY', None)
    collection_name = 'ESCUELA-SABATICA'
    
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['api-key'] = api_key
    
    try:
        # 1. Primero, obtener todos los puntos para identificar los de Lección 5
        print("🔍 Buscando documentos de Lección 5...")
        response = requests.post(
            f"{qdrant_url}/collections/{collection_name}/points/scroll",
            headers=headers,
            json={
                "limit": 100,
                "with_payload": True,
                "with_vector": False
            },
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"❌ Error al obtener documentos: {response.status_code}")
            print(response.text)
            return
        
        data = response.json()
        points = data.get('result', {}).get('points', [])
        
        # 2. Identificar IDs de documentos de Lección 5
        leccion5_ids = []
        for point in points:
            payload = point.get('payload', {})
            content = payload.get('content', '')
            
            # Buscar Lección 5
            if 'Lección 5' in content or 'lección 5' in content:
                point_id = point.get('id')
                leccion5_ids.append(point_id)
                print(f"   📄 Encontrado: ID {point_id} - {content[:100]}...")
        
        print(f"\n📊 Total de documentos de Lección 5 encontrados: {len(leccion5_ids)}")
        
        if not leccion5_ids:
            print("⚠️  No se encontraron documentos de Lección 5")
            return
        
        # 3. Confirmar eliminación
        print(f"\n⚠️  ¿Estás seguro de que quieres eliminar {len(leccion5_ids)} documentos de Lección 5?")
        print("   Esto NO se puede deshacer.")
        confirm = input("   Escribe 'SI' para confirmar: ")
        
        if confirm.upper() != 'SI':
            print("❌ Operación cancelada")
            return
        
        # 4. Eliminar documentos usando DELETE points
        print(f"\n🗑️  Eliminando {len(leccion5_ids)} documentos...")
        
        # Qdrant REST API espera el payload en formato específico
        delete_payload = {
            "points": leccion5_ids
        }
        
        response = requests.post(
            f"{qdrant_url}/collections/{collection_name}/points/delete",
            headers=headers,
            json=delete_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Documentos eliminados exitosamente!")
            print(f"   Status: {result.get('status')}")
            print(f"   Result: {result.get('result')}")
            
            # Verificar resultado final
            response = requests.get(
                f"{qdrant_url}/collections/{collection_name}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                updated_info = response.json()
                total_points = updated_info.get('result', {}).get('points_count', 0)
                print(f"\n📊 Puntos restantes en '{collection_name}': {total_points}")
                print(f"   (Se eliminaron {len(leccion5_ids)} documentos)")
        else:
            print(f"❌ Error al eliminar documentos: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    delete_leccion5_documents()
