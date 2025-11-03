"""
Script para verificar en detalle qué días de la Lección 6 están en Qdrant
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

def check_lesson_6_details():
    """Verifica qué días de la Lección 6 están disponibles"""
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    api_key = os.getenv('QDRANT_API_KEY', None)
    collection_name = 'ESCUELA-SABATICA'
    
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['api-key'] = api_key
    
    try:
        # Obtener todos los puntos
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
            
            print(f"📊 Revisando {len(points)} documentos en busca de Lección 6...\n")
            
            # Buscar documentos de Lección 6
            leccion6_docs = []
            for point in points:
                payload = point.get('payload', {})
                content = payload.get('content', '')
                
                # Buscar Lección 6
                if 'Lección 6' in content or 'lección 6' in content:
                    # Extraer las primeras líneas para ver el título
                    lines = content.split('\n')
                    title = ''
                    for line in lines[:20]:
                        if 'noviembre' in line.lower() or 'Lección 6' in line:
                            title += line.strip() + ' | '
                    
                    leccion6_docs.append({
                        'id': point.get('id'),
                        'title': title[:200],
                        'preview': content[:500]
                    })
            
            print(f"📚 Lección 6: {len(leccion6_docs)} documentos encontrados\n")
            
            # Días de la semana esperados
            dias_esperados = ['Sábado', 'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
            dias_encontrados = {dia: [] for dia in dias_esperados}
            
            for doc in leccion6_docs:
                for dia in dias_esperados:
                    if dia in doc['title'] or dia in doc['preview']:
                        dias_encontrados[dia].append(doc)
                        break
            
            print("📅 Distribución por días de la semana:\n")
            for dia in dias_esperados:
                count = len(dias_encontrados[dia])
                status = "✅" if count > 0 else "❌"
                print(f"{status} {dia}: {count} documento(s)")
                if count > 0:
                    for doc in dias_encontrados[dia]:
                        print(f"   - {doc['title'][:150]}")
            
            print("\n" + "="*80)
            print("📄 Contenido completo de cada documento de Lección 6:\n")
            for i, doc in enumerate(leccion6_docs, 1):
                print(f"\n--- Documento {i} ---")
                print(doc['preview'])
                print("-" * 80)
        
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    check_lesson_6_details()
