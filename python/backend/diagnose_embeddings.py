#!/usr/bin/env python3
"""
Script final de diagnóstico - comparar embeddings de Python vs lo que hay en Qdrant
"""

import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configurar Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
QDRANT_URL = os.getenv('QDRANT_URL', 'https://appqdrant.sages.icu')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')
COLLECTION = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')

if not GEMINI_API_KEY:
    print("❌ ERROR: GEMINI_API_KEY no encontrada en .env")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)

def generate_embedding_python(text):
    """Generar embedding con Python (sin task_type, como n8n)"""
    try:
        result = genai.embed_content(
            model='models/text-embedding-004',
            content=text
        )
        return result['embedding']
    except Exception as e:
        print(f"❌ Error generando embedding: {e}")
        return None

def search_qdrant(query_vector, score_threshold=0.0):
    """Buscar en Qdrant con el vector"""
    headers = {'Content-Type': 'application/json'}
    if QDRANT_API_KEY:
        headers['api-key'] = QDRANT_API_KEY
    
    payload = {
        "vector": query_vector,
        "limit": 5,
        "score_threshold": score_threshold,
        "with_payload": True
    }
    
    response = requests.post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        return response.json().get('result', [])
    else:
        print(f"❌ Error en búsqueda: {response.status_code} - {response.text}")
        return []

def main():
    print("=" * 70)
    print("🔬 DIAGNÓSTICO DEFINITIVO - Python vs Qdrant")
    print("=" * 70)
    
    test_queries = [
        "lección 4",
        "plagas",
        "lección 1",
        "fórmula del éxito"
    ]
    
    for query in test_queries:
        print(f"\n{'='*70}")
        print(f"🔍 PROBANDO: '{query}'")
        print("=" * 70)
        
        # Generar embedding
        print("⏳ Generando embedding con Python (sin task_type, como n8n)...")
        vector = generate_embedding_python(query)
        
        if not vector:
            print("❌ No se pudo generar embedding")
            continue
        
        print(f"✅ Embedding generado: {len(vector)} dimensiones")
        print(f"   Primeros 5 valores: {vector[:5]}")
        
        # Buscar sin threshold (score_threshold=0)
        print(f"\n🔎 Buscando en Qdrant (sin threshold)...")
        results = search_qdrant(vector, score_threshold=0.0)
        
        if results:
            print(f"✅ Se encontraron {len(results)} resultados:")
            for i, result in enumerate(results[:3], 1):
                score = result.get('score', 0)
                payload = result.get('payload', {})
                content = payload.get('text', payload.get('content', ''))[:150]
                metadata = payload.get('metadata', {})
                
                print(f"\n   📄 Resultado {i}:")
                print(f"      Score: {score:.4f}")
                print(f"      Contenido: {content}...")
                if metadata:
                    print(f"      Metadata: {metadata}")
        else:
            print("❌ NO SE ENCONTRARON RESULTADOS (ni con score_threshold=0)")
            print("   Esto indica un problema serio de compatibilidad de embeddings")
        
        # Buscar con threshold 0.3 (lo que usa tu app)
        print(f"\n🔎 Buscando en Qdrant (con threshold=0.3)...")
        results_threshold = search_qdrant(vector, score_threshold=0.3)
        
        if results_threshold:
            print(f"✅ Con threshold=0.3: {len(results_threshold)} resultados")
        else:
            print(f"⚠️ Con threshold=0.3: 0 resultados")
            print(f"   (Los scores son menores a 0.3)")
    
    print("\n" + "=" * 70)
    print("🎯 CONCLUSIÓN:")
    print("=" * 70)
    print("Si NO encuentras resultados ni con score_threshold=0:")
    print("  - Los embeddings de Python son INCOMPATIBLES con los de n8n")
    print("  - Posible causa: n8n usa una versión diferente de la API")
    print("  - Solución: Necesitas re-subir los PDFs usando Python")
    print()
    print("Si SÍ encuentras resultados con score_threshold=0 pero NO con 0.3:")
    print("  - Los embeddings son compatibles pero los scores son bajos")
    print("  - Solución: Reduce el score_threshold en tu app")
    print("=" * 70)

if __name__ == "__main__":
    main()
