#!/usr/bin/env python3
"""
Test específico: ¿Por qué Lección 1 funciona pero Lección 4 NO?
"""

import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv
import json

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
QDRANT_URL = os.getenv('QDRANT_URL', 'https://appqdrant.sages.icu')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')
COLLECTION = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')

genai.configure(api_key=GEMINI_API_KEY)

def generate_embedding(text):
    """Generar embedding sin task_type (como n8n)"""
    result = genai.embed_content(
        model='models/text-embedding-004',
        content=text
    )
    return result['embedding']

def search_qdrant(query_text):
    """Buscar en Qdrant con parámetros exactos de n8n"""
    headers = {'Content-Type': 'application/json'}
    if QDRANT_API_KEY:
        headers['api-key'] = QDRANT_API_KEY
    
    # Generar embedding
    vector = generate_embedding(query_text)
    
    # Buscar con parámetros exactos de n8n (limit=4, sin score_threshold)
    payload = {
        "vector": vector,
        "limit": 4,
        "with_payload": True,
        "with_vector": False
    }
    
    response = requests.post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        return response.json().get('result', [])
    else:
        print(f"❌ Error: {response.status_code}")
        return []

def get_documents_by_filename(filename_pattern):
    """Obtener todos los documentos que coincidan con un filename"""
    headers = {'Content-Type': 'application/json'}
    if QDRANT_API_KEY:
        headers['api-key'] = QDRANT_API_KEY
    
    response = requests.post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
        headers=headers,
        json={"limit": 100, "with_payload": True, "with_vector": False}
    )
    
    if response.status_code == 200:
        all_points = response.json().get('result', {}).get('points', [])
        matching = []
        for point in all_points:
            payload = point.get('payload', {})
            metadata = payload.get('metadata', {})
            filename = metadata.get('filename', '')
            if filename_pattern.lower() in filename.lower():
                matching.append(point)
        return matching
    return []

def main():
    print("=" * 90)
    print("🧪 TEST COMPARATIVO: ¿Por qué Lección 1 SÍ funciona pero Lección 4 NO?")
    print("=" * 90)
    
    # 1. Verificar que ambas lecciones existen en Qdrant
    print("\n📋 PASO 1: Verificar que ambas lecciones están en Qdrant")
    print("-" * 90)
    
    leccion1_docs = get_documents_by_filename("Leccion-1")
    leccion4_docs = get_documents_by_filename("Leccion-4")
    
    print(f"✅ Lección 1: {len(leccion1_docs)} documentos encontrados")
    if leccion1_docs:
        metadata = leccion1_docs[0].get('payload', {}).get('metadata', {})
        print(f"   📄 Archivo: {metadata.get('filename', 'N/A')}")
        print(f"   📄 Páginas: {metadata.get('total_pages', 'N/A')}")
        # Verificar estructura
        payload_keys = list(leccion1_docs[0].get('payload', {}).keys())
        print(f"   🔑 Estructura payload: {payload_keys}")
    
    print(f"\n✅ Lección 4: {len(leccion4_docs)} documentos encontrados")
    if leccion4_docs:
        metadata = leccion4_docs[0].get('payload', {}).get('metadata', {})
        print(f"   📄 Archivo: {metadata.get('filename', 'N/A')}")
        print(f"   📄 Páginas: {metadata.get('total_pages', 'N/A')}")
        # Verificar estructura
        payload_keys = list(leccion4_docs[0].get('payload', {}).keys())
        print(f"   🔑 Estructura payload: {payload_keys}")
    
    if not leccion4_docs:
        print("\n❌ PROBLEMA ENCONTRADO: Lección 4 NO está en Qdrant")
        print("   Solución: Vuelve a subir el archivo Leccion-4.pdf")
        return
    
    # 2. Probar búsqueda semántica con las mismas consultas
    print("\n" + "=" * 90)
    print("📋 PASO 2: Probar búsqueda semántica (como lo hace n8n)")
    print("-" * 90)
    
    queries = [
        "lección 1",
        "lección 4",
        "fórmula del éxito",
        "plagas"
    ]
    
    for query in queries:
        print(f"\n🔍 Buscando: '{query}'")
        print("-" * 90)
        
        results = search_qdrant(query)
        
        if results:
            print(f"✅ Se encontraron {len(results)} resultados:")
            for i, result in enumerate(results, 1):
                score = result.get('score', 0)
                payload = result.get('payload', {})
                metadata = payload.get('metadata', {})
                content = payload.get('content', payload.get('text', ''))[:80]
                
                print(f"\n   {i}. Score: {score:.4f}")
                print(f"      Archivo: {metadata.get('filename', 'N/A')}")
                print(f"      Página: {metadata.get('page_number', 'N/A')}")
                print(f"      Contenido: {content}...")
        else:
            print("❌ NO se encontraron resultados")
    
    # 3. Comparar embeddings
    print("\n" + "=" * 90)
    print("📋 PASO 3: Comparar estructura de documentos")
    print("-" * 90)
    
    print("\n🔍 Lección 1 (primer documento):")
    if leccion1_docs:
        l1_payload = leccion1_docs[0].get('payload', {})
        print(json.dumps({
            'keys': list(l1_payload.keys()),
            'metadata': l1_payload.get('metadata', {}),
            'content_length': len(l1_payload.get('content', l1_payload.get('text', ''))),
            'has_content': 'content' in l1_payload,
            'has_text': 'text' in l1_payload
        }, indent=2))
    
    print("\n🔍 Lección 4 (primer documento):")
    if leccion4_docs:
        l4_payload = leccion4_docs[0].get('payload', {})
        print(json.dumps({
            'keys': list(l4_payload.keys()),
            'metadata': l4_payload.get('metadata', {}),
            'content_length': len(l4_payload.get('content', l4_payload.get('text', ''))),
            'has_content': 'content' in l4_payload,
            'has_text': 'text' in l4_payload
        }, indent=2))
    
    # 4. Diagnóstico final
    print("\n" + "=" * 90)
    print("🎯 DIAGNÓSTICO FINAL")
    print("=" * 90)
    
    if leccion1_docs and leccion4_docs:
        l1_has_content = 'content' in leccion1_docs[0].get('payload', {})
        l4_has_content = 'content' in leccion4_docs[0].get('payload', {})
        l4_has_text = 'text' in leccion4_docs[0].get('payload', {})
        
        if l1_has_content and l4_has_text:
            print("\n❌ PROBLEMA ENCONTRADO:")
            print("   - Lección 1 usa 'content' (subida por n8n)")
            print("   - Lección 4 usa 'text' (subida por Python con código incorrecto)")
            print("\n✅ SOLUCIÓN:")
            print("   1. Elimina la Lección 4 de Qdrant")
            print("   2. Vuelve a subir usando Python (ahora usa 'content' correctamente)")
        elif l1_has_content and l4_has_content:
            print("\n✅ ESTRUCTURA CORRECTA:")
            print("   - Ambas lecciones usan 'content'")
            print("   - El problema debe estar en otro lugar")
            print("\n🔍 Verifica:")
            print("   - ¿n8n está configurado correctamente?")
            print("   - ¿El webhook de n8n está activo?")

if __name__ == "__main__":
    main()
