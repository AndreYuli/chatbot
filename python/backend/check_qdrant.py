#!/usr/bin/env python3
"""
Script para verificar el estado de Qdrant y los documentos en la colección
"""

import os
import requests
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def check_collection():
    """Verificar el estado de la colección ESCUELA-SABATICA"""
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    api_key = os.getenv('QDRANT_API_KEY', None)
    collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
    
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['api-key'] = api_key
    
    print("=" * 60)
    print("🔍 VERIFICANDO ESTADO DE QDRANT")
    print("=" * 60)
    print(f"URL: {qdrant_url}")
    print(f"Colección: {collection_name}")
    print("=" * 60)
    print()
    
    # Obtener información de la colección
    try:
        response = requests.get(
            f"{qdrant_url}/collections/{collection_name}",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            result = data.get('result', {})
            
            print("✅ COLECCIÓN ENCONTRADA")
            print(f"   Status: {result.get('status')}")
            print(f"   Puntos totales: {result.get('points_count', 0)}")
            print(f"   Vectores indexados: {result.get('indexed_vectors_count', 0)}")
            print(f"   Segmentos: {result.get('segments_count', 0)}")
            print()
            
            config = result.get('config', {})
            vectors = config.get('params', {}).get('vectors', {})
            print("📐 CONFIGURACIÓN DE VECTORES:")
            print(f"   Dimensión: {vectors.get('size', 'N/A')}")
            print(f"   Distancia: {vectors.get('distance', 'N/A')}")
            print()
            
            # Intentar obtener algunos puntos de ejemplo
            points_count = result.get('points_count', 0)
            if points_count > 0:
                print(f"📄 OBTENIENDO PRIMEROS 3 PUNTOS DE {points_count}:")
                scroll_response = requests.post(
                    f"{qdrant_url}/collections/{collection_name}/points/scroll",
                    headers=headers,
                    json={"limit": 3, "with_payload": True, "with_vector": False}
                )
                
                if scroll_response.status_code == 200:
                    scroll_data = scroll_response.json()
                    points = scroll_data.get('result', {}).get('points', [])
                    
                    for i, point in enumerate(points, 1):
                        payload = point.get('payload', {})
                        content = payload.get('text', payload.get('content', ''))
                        metadata = payload.get('metadata', {})
                        
                        print(f"\n   Punto {i}:")
                        print(f"   ID: {point.get('id')}")
                        if content:
                            preview = content[:150].replace('\n', ' ')
                            print(f"   Contenido: {preview}...")
                        if metadata:
                            print(f"   Metadata: {metadata}")
                else:
                    print(f"   ⚠️ Error al obtener puntos: {scroll_response.status_code}")
            else:
                print("⚠️ LA COLECCIÓN ESTÁ VACÍA (0 puntos)")
                print("   Necesitas subir archivos por n8n o Python")
                
        elif response.status_code == 404:
            print("❌ COLECCIÓN NO EXISTE")
            print(f"   La colección '{collection_name}' no fue encontrada")
        else:
            print(f"❌ ERROR: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            
    except Exception as e:
        print(f"❌ ERROR DE CONEXIÓN: {e}")
        print(f"   No se pudo conectar a {qdrant_url}")
    
    print()
    print("=" * 60)

if __name__ == "__main__":
    check_collection()
