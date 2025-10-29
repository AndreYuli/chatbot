# Script para reiniciar el proyecto limpiamente
Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  REINICIO LIMPIO DEL PROYECTO CHATBOT            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Paso 1: Detener procesos de Node
Write-Host "[1/5] Deteniendo procesos de Node.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "      ✓ Procesos detenidos`n" -ForegroundColor Green

# Paso 2: Limpiar caché de Next.js
Write-Host "[2/5] Limpiando caché de Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "      ✓ Carpeta .next eliminada`n" -ForegroundColor Green
} else {
    Write-Host "      ✓ No hay caché para limpiar`n" -ForegroundColor Green
}

# Paso 3: Verificar estructura de archivos
Write-Host "[3/5] Verificando estructura de archivos..." -ForegroundColor Yellow
$criticalFiles = @(
    "app\page.tsx",
    "app\[locale]\layout.tsx",
    "app\[locale]\auth\signin\page.tsx",
    "app\[locale]\chat\page.tsx",
    "middleware.ts",
    "i18n.ts",
    "next.config.js"
)

$allGood = $true
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "      ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "      ✗ $file FALTA" -ForegroundColor Red
        $allGood = $false
    }
}

if (-not $allGood) {
    Write-Host "`n⚠  ADVERTENCIA: Algunos archivos faltan. Revisa la configuración.`n" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Paso 4: Verificar dependencias
Write-Host "[4/5] Verificando node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "      ✓ Dependencias instaladas`n" -ForegroundColor Green
} else {
    Write-Host "      ⚠ node_modules no encontrado. Ejecutando pnpm install...`n" -ForegroundColor Yellow
    pnpm install
}

# Paso 5: Iniciar servidor
Write-Host "[5/5] Iniciando servidor de desarrollo...`n" -ForegroundColor Yellow
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  El servidor se está iniciando...                 ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📍 URLs disponibles:" -ForegroundColor Cyan
Write-Host "   • http://localhost:3000" -ForegroundColor White
Write-Host "   • http://localhost:3000/es-ES/auth/signin" -ForegroundColor White
Write-Host "   • http://localhost:3000/es-ES/chat`n" -ForegroundColor White

Write-Host "⚠  RECUERDA: Siempre usa rutas con locale (/es-ES/, /en-US/, /es-CO/)`n" -ForegroundColor Yellow

# Iniciar el servidor
pnpm dev
