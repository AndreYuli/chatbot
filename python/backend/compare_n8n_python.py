#!/usr/bin/env python3
"""
Comparar un embedding específico de Qdrant (generado por n8n) vs uno generado por Python
"""

import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv
import math

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
QDRANT_URL = os.getenv('QDRANT_URL', 'https://appqdrant.sages.icu')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')
COLLECTION = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')

genai.configure(api_key=GEMINI_API_KEY)

def get_vector_from_qdrant(point_id):
    """Obtener un vector específico de Qdrant"""
    headers = {'Content-Type': 'application/json'}
    if QDRANT_API_KEY:
        headers['api-key'] = QDRANT_API_KEY
    
    response = requests.post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points",
        headers=headers,
        json={"ids": [point_id], "with_vector": True, "with_payload": True}
    )
    
    if response.status_code == 200:
        points = response.json().get('result', [])
        if points:
            return points[0]
    return None

def generate_embedding_python(text):
    """Generar embedding con Python (sin task_type)"""
    result = genai.embed_content(
        model='models/text-embedding-004',
        content=text
    )
    return result['embedding']

def cosine_similarity(vec1, vec2):
    """Calcular similitud coseno entre dos vectores"""
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = math.sqrt(sum(a * a for a in vec1))
    magnitude2 = math.sqrt(sum(b * b for b in vec2))
    return dot_product / (magnitude1 * magnitude2)

def main():
    print("=" * 70)
    print("🔬 COMPARACIÓN n8n vs Python")
    print("=" * 70)
    
    # Obtener el primer punto de Qdrant (subido por n8n)
    print("\n📥 Obteniendo un punto de Qdrant (generado por n8n)...")
    
    headers = {'Content-Type': 'application/json'}
    if QDRANT_API_KEY:
        headers['api-key'] = QDRANT_API_KEY
    
    # Obtener un punto aleatorio
    scroll_response = requests.post(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
        headers=headers,
        json={"limit": 1, "with_payload": True, "with_vector": True}
    )
    
    if scroll_response.status_code != 200:
        print(f"❌ Error obteniendo punto: {scroll_response.status_code}")
        return
    
    points = scroll_response.json().get('result', {}).get('points', [])
    if not points:
        print("❌ No hay puntos en Qdrant")
        return
    
    point = points[0]
    n8n_vector = point.get('vector')
    payload = point.get('payload', {})
    text = payload.get('text', payload.get('content', ''))
    
    print(f"✅ Punto obtenido:")
    print(f"   ID: {point.get('id')}")
    print(f"   Texto (primeros 100 chars): {text[:100]}...")
    print(f"   Vector dimensión: {len(n8n_vector)}")
    print(f"   Primeros 5 valores (n8n): {n8n_vector[:5]}")
    
    # Generar embedding del MISMO texto con Python
    print(f"\n🔄 Generando embedding del MISMO texto con Python...")
    python_vector = generate_embedding_python(text)
    
    print(f"✅ Embedding generado:")
    print(f"   Vector dimensión: {len(python_vector)}")
    print(f"   Primeros 5 valores (Python): {python_vector[:5]}")
    
    # Comparar vectores
    print(f"\n📊 COMPARACIÓN:")
    print("=" * 70)
    
    # Calcular similitud coseno
    similarity = cosine_similarity(n8n_vector, python_vector)
    print(f"Similitud Coseno: {similarity:.6f}")
    
    if similarity > 0.99:
        print("✅ Los vectores son PRÁCTICAMENTE IDÉNTICOS")
        print("   n8n y Python generan los mismos embeddings")
    elif similarity > 0.95:
        print("⚠️ Los vectores son MUY SIMILARES pero no idénticos")
        print("   Puede haber pequeñas diferencias en la implementación")
    elif similarity > 0.8:
        print("⚠️ Los vectores son SIMILARES pero con diferencias notables")
        print("   Puede haber diferencias en parámetros o normalización")
    else:
        print("❌ Los vectores son DIFERENTES")
        print("   n8n y Python están usando configuraciones distintas")
    
    # Comparar magnitudes
    n8n_magnitude = math.sqrt(sum(x * x for x in n8n_vector))
    python_magnitude = math.sqrt(sum(x * x for x in python_vector))
    
    print(f"\nMagnitud del vector n8n: {n8n_magnitude:.6f}")
    print(f"Magnitud del vector Python: {python_magnitude:.6f}")
    print(f"Diferencia: {abs(n8n_magnitude - python_magnitude):.6f}")
    
    # Verificar normalización
    if abs(n8n_magnitude - 1.0) < 0.01:
        print("\n✅ Vector n8n está NORMALIZADO (magnitud ≈ 1)")
    else:
        print(f"\n⚠️ Vector n8n NO está normalizado (magnitud = {n8n_magnitude:.6f})")
    
    if abs(python_magnitude - 1.0) < 0.01:
        print("✅ Vector Python está NORMALIZADO (magnitud ≈ 1)")
    else:
        print(f"⚠️ Vector Python NO está normalizado (magnitud = {python_magnitude:.6f})")
    
    print("\n" + "=" * 70)
    print("🎯 DIAGNÓSTICO:")
    print("=" * 70)
    
    if similarity > 0.99:
        print("Los embeddings son compatibles.")
        print("El problema de n8n debe ser en otro lugar:")
        print("  - Configuración del nodo Qdrant Vector Store en n8n")
        print("  - Parámetros de búsqueda (top_k, score_threshold)")
        print("  - Nombre de colección incorrecto")
    else:
        print("Los embeddings NO son compatibles.")
        print("Posibles causas:")
        print("  - n8n usa task_type diferente")
        print("  - n8n normaliza los vectores")
        print("  - n8n usa una versión diferente de la API")
    
    print("=" * 70)

if __name__ == "__main__":
    main()
