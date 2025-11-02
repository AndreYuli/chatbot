#!/usr/bin/env python3
"""
Comparar la estructura de payload entre n8n y Python
"""

import os
import requests
from dotenv import load_dotenv
import json

load_dotenv()

QDRANT_URL = os.getenv('QDRANT_URL', 'https://appqdrant.sages.icu')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')
COLLECTION = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')

def get_points_by_filename(filename_pattern):
    """Obtener puntos que coincidan con un filename"""
    headers = {'Content-Type': 'application/json'}
    if QDRANT_API_KEY:
        headers['api-key'] = QDRANT_API_KEY
    
    # Scroll through all points
    response = requests.post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
        headers=headers,
        json={"limit": 100, "with_payload": True, "with_vector": False}
    )
    
    if response.status_code == 200:
        points = response.json().get('result', {}).get('points', [])
        matching = []
        for point in points:
            payload = point.get('payload', {})
            metadata = payload.get('metadata', {})
            filename = metadata.get('filename', '')
            if filename_pattern.lower() in filename.lower():
                matching.append(point)
        return matching
    return []

def main():
    print("=" * 80)
    print("🔍 COMPARANDO ESTRUCTURA DE PAYLOAD: n8n vs Python")
    print("=" * 80)
    
    # Buscar un punto subido por n8n (Lección 1)
    print("\n📥 Buscando puntos de Lección 1 (subidos por n8n)...")
    n8n_points = get_points_by_filename("Leccion-1")
    
    if n8n_points:
        n8n_point = n8n_points[0]
        print(f"✅ Punto de n8n encontrado:")
        print(f"   ID: {n8n_point.get('id')}")
        print(f"\n📦 ESTRUCTURA COMPLETA DEL PAYLOAD (n8n):")
        print(json.dumps(n8n_point.get('payload'), indent=2))
    else:
        print("❌ No se encontraron puntos de Lección 1")
    
    # Buscar un punto subido por Python (Lección 4 recién subida)
    print("\n" + "=" * 80)
    print("\n📥 Buscando puntos de Lección 4 (subidos por Python)...")
    python_points = get_points_by_filename("Leccion-4")
    
    if python_points:
        python_point = python_points[0]
        print(f"✅ Punto de Python encontrado:")
        print(f"   ID: {python_point.get('id')}")
        print(f"\n📦 ESTRUCTURA COMPLETA DEL PAYLOAD (Python):")
        print(json.dumps(python_point.get('payload'), indent=2))
    else:
        print("❌ No se encontraron puntos de Lección 4")
    
    # Comparar estructuras
    if n8n_points and python_points:
        print("\n" + "=" * 80)
        print("📊 COMPARACIÓN:")
        print("=" * 80)
        
        n8n_payload = n8n_points[0].get('payload', {})
        python_payload = python_points[0].get('payload', {})
        
        print("\n🔑 Claves en payload de n8n:")
        print(f"   {list(n8n_payload.keys())}")
        
        print("\n🔑 Claves en payload de Python:")
        print(f"   {list(python_payload.keys())}")
        
        # Comparar metadata
        n8n_metadata = n8n_payload.get('metadata', {})
        python_metadata = python_payload.get('metadata', {})
        
        print("\n📋 Metadata de n8n:")
        print(json.dumps(n8n_metadata, indent=2))
        
        print("\n📋 Metadata de Python:")
        print(json.dumps(python_metadata, indent=2))
        
        # Verificar diferencias
        print("\n" + "=" * 80)
        print("⚠️  DIFERENCIAS ENCONTRADAS:")
        print("=" * 80)
        
        n8n_keys = set(n8n_payload.keys())
        python_keys = set(python_payload.keys())
        
        only_n8n = n8n_keys - python_keys
        only_python = python_keys - n8n_keys
        
        if only_n8n:
            print(f"\n❌ Campos que tiene n8n pero Python NO:")
            for key in only_n8n:
                print(f"   - {key}: {type(n8n_payload[key]).__name__}")
        
        if only_python:
            print(f"\n❌ Campos que tiene Python pero n8n NO:")
            for key in only_python:
                print(f"   - {key}: {type(python_payload[key]).__name__}")
        
        if not only_n8n and not only_python:
            print("\n✅ Ambos tienen las mismas claves en el payload raíz")
        
        # Comparar tipos de datos de metadata
        print("\n📊 Comparación de tipos en metadata:")
        for key in set(list(n8n_metadata.keys()) + list(python_metadata.keys())):
            n8n_type = type(n8n_metadata.get(key)).__name__ if key in n8n_metadata else 'N/A'
            python_type = type(python_metadata.get(key)).__name__ if key in python_metadata else 'N/A'
            
            match = "✅" if n8n_type == python_type else "❌"
            print(f"   {match} {key}: n8n={n8n_type}, Python={python_type}")

if __name__ == "__main__":
    main()
