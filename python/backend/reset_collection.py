#!/usr/bin/env python3
"""
Script para limpiar y recrear la colección de Qdrant
Esto es necesario cuando cambiamos el task_type de los embeddings
"""

import os
import requests
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def delete_collection(collection_name):
    """Elimina una colección de Qdrant"""
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    api_key = os.getenv('QDRANT_API_KEY', None)
    
    headers = {}
    if api_key:
        headers['api-key'] = api_key
    
    url = f"{qdrant_url}/collections/{collection_name}"
    
    try:
        print(f"🗑️  Eliminando colección '{collection_name}'...")
        response = requests.delete(url, headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Colección '{collection_name}' eliminada exitosamente")
            return True
        elif response.status_code == 404:
            print(f"⚠️  La colección '{collection_name}' no existe")
            return True
        else:
            print(f"❌ Error al eliminar colección: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def create_collection(collection_name, vector_size=768):
    """Crea una nueva colección en Qdrant"""
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    api_key = os.getenv('QDRANT_API_KEY', None)
    
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['api-key'] = api_key
    
    url = f"{qdrant_url}/collections/{collection_name}"
    
    # Configuración de la colección
    data = {
        "vectors": {
            "size": vector_size,
            "distance": "Cosine"
        }
    }
    
    try:
        print(f"📦 Creando colección '{collection_name}' (dimensión: {vector_size})...")
        response = requests.put(url, json=data, headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Colección '{collection_name}' creada exitosamente")
            return True
        else:
            print(f"❌ Error al crear colección: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    collection_name = os.getenv('QDRANT_COLLECTION', 'ESCUELA-SABATICA')
    
    print("=" * 60)
    print("🔄 RESET DE COLECCIÓN QDRANT")
    print("=" * 60)
    print(f"Colección: {collection_name}")
    print(f"Qdrant URL: {os.getenv('QDRANT_URL', 'http://localhost:6333')}")
    print("=" * 60)
    print()
    
    # Paso 1: Eliminar colección existente
    if not delete_collection(collection_name):
        print("\n⚠️  Hubo un problema al eliminar la colección")
        print("   Continuando de todas formas...")
    
    print()
    
    # Paso 2: Crear nueva colección
    # Google Gemini text-embedding-004 genera vectores de 768 dimensiones
    if create_collection(collection_name, vector_size=768):
        print("\n" + "=" * 60)
        print("✅ ¡Colección lista para recibir documentos!")
        print("=" * 60)
        print("\n📝 Siguiente paso:")
        print("   1. Sube tus PDFs usando el endpoint /upload")
        print("   2. Los embeddings ahora serán compatibles con n8n")
        print()
    else:
        print("\n" + "=" * 60)
        print("❌ Error al crear la colección")
        print("=" * 60)

if __name__ == "__main__":
    main()
