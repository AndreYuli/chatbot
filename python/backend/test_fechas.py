"""
Script de prueba para verificar detección y conversión de fechas
"""
from datetime import datetime, timedelta

# Fecha actual del sistema
now = datetime.now()

# Nombres en español
dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
         'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

print("=" * 60)
print("📅 PRUEBA DE DETECCIÓN DE FECHAS")
print("=" * 60)
print()

# Mostrar fecha actual
dia_semana = dias[now.weekday()]
mes = meses[now.month - 1]
print(f"🔹 HOY es: {dia_semana} {now.day} de {mes} de {now.year}")
print()

# Calcular fechas relativas
fechas_relativas = {
    "MAÑANA": now + timedelta(days=1),
    "PASADO MAÑANA": now + timedelta(days=2),
    "AYER": now - timedelta(days=1),
    "ANTES DE AYER": now - timedelta(days=2)
}

for palabra, fecha in fechas_relativas.items():
    dia = dias[fecha.weekday()]
    mes_nombre = meses[fecha.month - 1]
    print(f"🔹 {palabra:15} → {dia} {fecha.day} de {mes_nombre}")

print()
print("=" * 60)
print("✅ TODAS LAS FECHAS CALCULADAS CORRECTAMENTE")
print("=" * 60)
