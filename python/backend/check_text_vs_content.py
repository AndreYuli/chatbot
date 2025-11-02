#!/usr/bin/env python3
"""
Verificar los últimos puntos subidos (con 'text' vs 'content')
"""

import os
import requests
from dotenv import load_dotenv
import json

load_dotenv()

QDRANT_URL = os.getenv('QDRANT_URL', 'https://appqdrant.sages.icu')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')
COLLECTION = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')

def main():
    headers = {'Content-Type': 'application/json'}
    if QDRANT_API_KEY:
        headers['api-key'] = QDRANT_API_KEY
    
    print("=" * 80)
    print("🔍 VERIFICANDO ESTRUCTURA DE TODOS LOS PUNTOS")
    print("=" * 80)
    
    # Obtener todos los puntos
    response = requests.post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
        headers=headers,
        json={"limit": 100, "with_payload": True, "with_vector": False}
    )
    
    if response.status_code == 200:
        points = response.json().get('result', {}).get('points', [])
        
        with_text = 0
        with_content = 0
        with_both = 0
        
        print(f"\n📊 Total de puntos: {len(points)}")
        print("\nVerificando estructura de payload...")
        
        for point in points:
            payload = point.get('payload', {})
            has_text = 'text' in payload
            has_content = 'content' in payload
            
            if has_text and has_content:
                with_both += 1
            elif has_text:
                with_text += 1
                # Mostrar ejemplo
                if with_text == 1:
                    print(f"\n📄 EJEMPLO con 'text':")
                    print(f"   ID: {point.get('id')}")
                    print(f"   Keys: {list(payload.keys())}")
                    metadata = payload.get('metadata', {})
                    print(f"   Filename: {metadata.get('filename', 'N/A')}")
            elif has_content:
                with_content += 1
        
        print(f"\n" + "=" * 80)
        print("📊 RESUMEN:")
        print("=" * 80)
        print(f"   Puntos con 'text': {with_text}")
        print(f"   Puntos con 'content': {with_content}")
        print(f"   Puntos con ambos: {with_both}")
        print("=" * 80)
        
        if with_text > 0:
            print("\n✅ Python SÍ está guardando con 'text'")
        else:
            print("\n❌ Python NO está guardando con 'text'")
        
        if with_content > 0:
            print("✅ n8n (y quizás Python antiguo) usa 'content'")

if __name__ == "__main__":
    main()
