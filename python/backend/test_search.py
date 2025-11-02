#!/usr/bin/env python3
"""
Script de prueba para buscar documentos en Qdrant
"""

import os
import sys
from dotenv import load_dotenv

# Añadir el directorio actual al path
sys.path.insert(0, os.path.dirname(__file__))

from embeddings import get_documents

# Cargar variables de entorno
load_dotenv()

def test_search(query):
    """Probar búsqueda en Qdrant"""
    print("=" * 60)
    print(f"🔍 BUSCANDO: {query}")
    print("=" * 60)
    
    # get_documents necesita conversation_id y question
    documents = get_documents("test-conversation", query)
    
    print(f"\n📊 RESULTADOS: {len(documents)} documentos encontrados")
    print("=" * 60)
    
    if documents:
        for i, doc in enumerate(documents, 1):
            print(f"\nDocumento {i}:")
            print(f"Score: {doc.score}")
            preview = doc.content[:200].replace('\n', ' ')
            print(f"Contenido: {preview}...")
            print(f"Metadata: {doc.metadata}")
    else:
        print("\n⚠️ No se encontraron documentos relevantes")
        print("   Posibles causas:")
        print("   - El score_threshold (0.3) es demasiado alto")
        print("   - Los embeddings no coinciden")
        print("   - El texto buscado no existe en los documentos")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    # Pruebas con diferentes consultas
    test_queries = [
        "lección 4",
        "plagas",
        "lección 1",
        "fórmula del éxito"
    ]
    
    for query in test_queries:
        test_search(query)
        print("\n")
