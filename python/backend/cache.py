"""
Simple cache para respuestas del LLM
Evita llamadas repetidas a Gemini para las mismas preguntas
"""
import json
import os
import hashlib
from datetime import datetime, timedelta

CACHE_DIR = 'cache'
CACHE_EXPIRY_HOURS = 24

# Crear directorio de cache si no existe
os.makedirs(CACHE_DIR, exist_ok=True)

def get_cache_key(question: str, num_docs: int = 5) -> str:
    """Genera una clave de cache basada en la pregunta"""
    cache_string = f"{question.lower().strip()}_{num_docs}"
    return hashlib.md5(cache_string.encode()).hexdigest()

def get_cached_response(question: str) -> dict | None:
    """Obtiene una respuesta del cache si existe y no ha expirado"""
    cache_key = get_cache_key(question)
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    
    if not os.path.exists(cache_file):
        return None
    
    try:
        with open(cache_file, 'r', encoding='utf-8') as f:
            cached_data = json.load(f)
        
        # Verificar si el cache ha expirado
        cached_time = datetime.fromisoformat(cached_data['timestamp'])
        if datetime.now() - cached_time > timedelta(hours=CACHE_EXPIRY_HOURS):
            print(f"⏰ Cache expirado para: {question[:50]}...")
            os.remove(cache_file)
            return None
        
        print(f"✅ Respuesta obtenida del cache para: {question[:50]}...")
        # Devolver el diccionario completo con response y sources
        return {
            'response': cached_data['response'],
            'sources': cached_data.get('sources', [])
        }
    
    except Exception as e:
        print(f"⚠️ Error leyendo cache: {e}")
        return None

def save_to_cache(question: str, response: str, sources: list = None):
    """Guarda una respuesta en el cache"""
    cache_key = get_cache_key(question)
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    
    try:
        cache_data = {
            'question': question,
            'response': response,
            'sources': sources or [],
            'timestamp': datetime.now().isoformat()
        }
        
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Respuesta guardada en cache")
    
    except Exception as e:
        print(f"⚠️ Error guardando en cache: {e}")

def clear_cache():
    """Limpia todo el cache"""
    try:
        for file in os.listdir(CACHE_DIR):
            if file.endswith('.json'):
                os.remove(os.path.join(CACHE_DIR, file))
        print("🗑️ Cache limpiado")
    except Exception as e:
        print(f"⚠️ Error limpiando cache: {e}")
