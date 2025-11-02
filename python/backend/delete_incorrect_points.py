#!/usr/bin/env python3
"""
Eliminar los 17 puntos incorrectos que tienen 'text' en lugar de 'content'
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
    print("🗑️  ELIMINANDO PUNTOS INCORRECTOS (con 'text' en lugar de 'content')")
    print("=" * 80)
    
    # Obtener todos los puntos
    response = requests.post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
        headers=headers,
        json={"limit": 100, "with_payload": True, "with_vector": False}
    )
    
    if response.status_code != 200:
        print(f"❌ Error obteniendo puntos: {response.status_code}")
        return
    
    points = response.json().get('result', {}).get('points', [])
    
    # Encontrar puntos con 'text'
    ids_to_delete = []
    for point in points:
        payload = point.get('payload', {})
        if 'text' in payload and 'content' not in payload:
            ids_to_delete.append(point.get('id'))
            metadata = payload.get('metadata', {})
            print(f"   🗑️  Marcado para eliminar: {metadata.get('filename', 'N/A')}")
    
    if not ids_to_delete:
        print("\n✅ No hay puntos con 'text' para eliminar")
        return
    
    print(f"\n📊 Total de puntos a eliminar: {len(ids_to_delete)}")
    print("\n⏳ Eliminando...")
    
    # Eliminar puntos
    delete_response = requests.post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/delete",
        headers=headers,
        json={"points": ids_to_delete}
    )
    
    if delete_response.status_code == 200:
        print(f"✅ Eliminados {len(ids_to_delete)} puntos correctamente")
        
        # Verificar resultado
        check_response = requests.get(
            f"{QDRANT_URL}/collections/{COLLECTION}",
            headers=headers
        )
        
        if check_response.status_code == 200:
            info = check_response.json().get('result', {})
            total_points = info.get('points_count', 0)
            print(f"📊 Puntos totales en la colección ahora: {total_points}")
    else:
        print(f"❌ Error eliminando puntos: {delete_response.status_code}")
        print(delete_response.text)

if __name__ == "__main__":
    main()
