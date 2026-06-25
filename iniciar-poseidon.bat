@echo off
setlocal

cd /d "%~dp0"

set "PYTHON_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if not exist "%PYTHON_EXE%" (
  where python >nul 2>nul
  if errorlevel 1 (
    echo No se encontro Python para iniciar el servidor local.
    echo Instala Python o ejecuta el proyecto con pnpm run dev.
    pause
    exit /b 1
  )
  set "PYTHON_EXE=python"
)

if not exist "dist\index.html" (
  echo No existe el build en la carpeta dist.
  echo Ejecuta pnpm run build y vuelve a intentar.
  pause
  exit /b 1
)

echo Poseidon Sistema de Gestion
echo.
echo Servidor iniciado en:
echo http://localhost:5173
echo.
echo Manten esta ventana abierta mientras uses la app.
echo Para detener el servidor, cierra esta ventana o presiona Ctrl+C.
echo.

"%PYTHON_EXE%" -m http.server 5173 --bind 127.0.0.1 --directory dist

pause
