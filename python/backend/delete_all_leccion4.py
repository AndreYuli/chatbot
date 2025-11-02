#!/usr/bin/env python3
"""
Eliminar TODOS los documentos de Lección 4 para empezar limpio
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

QDRANT_URL = os.getenv('QDRANT_URL', 'https://appqdrant.sages.icu')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')
COLLECTION = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')

def main():
    headers = {'Content-Type': 'application/json'}
    if QDRANT_API_KEY:
        headers['api-key'] = QDRANT_API_KEY
    
    print("=" * 80)
    print("🗑️  ELIMINANDO TODOS LOS DOCUMENTOS DE LECCIÓN 4")
    print("=" * 80)
    
    # Obtener todos los puntos
    response = requests.post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
        headers=headers,
        json={"limit": 100, "with_payload": True, "with_vector": False}
    )
    
    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        return
    
    points = response.json().get('result', {}).get('points', [])
    
    # Encontrar todos los puntos de Lección 4
    ids_to_delete = []
    for point in points:
        payload = point.get('payload', {})
        metadata = payload.get('metadata', {})
        filename = metadata.get('filename', '')
        if 'Leccion-4' in filename or 'leccion-4' in filename.lower():
            ids_to_delete.append(point.get('id'))
    
    if not ids_to_delete:
        print("\n✅ No hay documentos de Lección 4 para eliminar")
        return
    
    print(f"\n📊 Total de documentos de Lección 4 encontrados: {len(ids_to_delete)}")
    print("\n⏳ Eliminando...")
    
    # Eliminar en lotes de 50
    batch_size = 50
    for i in range(0, len(ids_to_delete), batch_size):
        batch = ids_to_delete[i:i+batch_size]
        delete_response = requests.post(
            f"{QDRANT_URL}/collections/{COLLECTION}/points/delete",
            headers=headers,
            json={"points": batch}
        )
        
        if delete_response.status_code == 200:
            print(f"   ✅ Eliminados {len(batch)} documentos (lote {i//batch_size + 1})")
        else:
            print(f"   ❌ Error eliminando lote: {delete_response.status_code}")
    
    # Verificar resultado final
    check_response = requests.get(
        f"{QDRANT_URL}/collections/{COLLECTION}",
        headers=headers
    )
    
    if check_response.status_code == 200:
        info = check_response.json().get('result', {})
        total_points = info.get('points_count', 0)
        print(f"\n📊 Puntos totales en la colección ahora: {total_points}")
        print("\n✅ Ahora puedes subir la Lección 4 limpiamente desde la aplicación web")

if __name__ == "__main__":
    main()
