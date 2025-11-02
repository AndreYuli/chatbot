"""
Script para verificar qué lecciones están disponibles en Qdrant
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

def check_available_lessons():
    """Verifica qué lecciones están disponibles en Qdrant"""
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    api_key = os.getenv('QDRANT_API_KEY', None)
    collection_name = 'ESCUELA-SABATICA'
    
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['api-key'] = api_key
    
    try:
        # Obtener todos los puntos (limitado a 100)
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
        
        if response.status_code == 200:
            data = response.json()
            points = data.get('result', {}).get('points', [])
            
            print(f"📊 Total de documentos en Qdrant: {len(points)}\n")
            
            # Agrupar por lección
            lessons = {}
            for point in points:
                payload = point.get('payload', {})
                content = payload.get('content', '')
                
                # Buscar menciones de lecciones
                if 'Lección' in content or 'lección' in content:
                    # Extraer número de lección
                    import re
                    match = re.search(r'[Ll]ección\s+(\d+)', content[:200])
                    if match:
                        lesson_num = match.group(1)
                        if lesson_num not in lessons:
                            lessons[lesson_num] = []
                        lessons[lesson_num].append({
                            'id': point.get('id'),
                            'preview': content[:150]
                        })
            
            print("📚 Lecciones encontradas:\n")
            for lesson_num in sorted(lessons.keys(), key=int):
                print(f"📖 Lección {lesson_num}: {len(lessons[lesson_num])} documentos")
                print(f"   Preview: {lessons[lesson_num][0]['preview']}...\n")
            
            # Documentos sin lección clara
            other_docs = len(points) - sum(len(docs) for docs in lessons.values())
            if other_docs > 0:
                print(f"📄 Otros documentos: {other_docs}")
        
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    check_available_lessons()
