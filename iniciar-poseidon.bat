@echo off
setlocal

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

set "CODEX_RUNTIME=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies"
set "CODEX_NODE_DIR=%CODEX_RUNTIME%\node\bin"
set "CODEX_BIN_DIR=%CODEX_RUNTIME%\bin"
set "VITE_CMD=%PROJECT_DIR%node_modules\.bin\vite.CMD"
set "APP_URL=http://127.0.0.1:5173/"

if exist "%CODEX_NODE_DIR%\node.exe" (
  set "PATH=%CODEX_NODE_DIR%;%CODEX_BIN_DIR%;%PATH%"
)

echo Poseidon Sistema de Gestion
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: No se encontro Node.js.
  echo Codex normalmente lo trae en:
  echo %CODEX_NODE_DIR%
  echo.
  echo Si esa carpeta no existe, abre Codex nuevamente o instala dependencias del runtime.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: Este script debe ejecutarse desde la carpeta raiz del proyecto Poseidon.
  echo Carpeta actual:
  cd
  pause
  exit /b 1
)

if not exist "%VITE_CMD%" (
  echo ERROR: No existe node_modules\.bin\vite.CMD.
  echo Ejecuta primero:
  echo pnpm install
  pause
  exit /b 1
)

if "%~1"=="--check" (
  echo Verificacion del entorno local:
  echo.
  echo Proyecto: %PROJECT_DIR%
  echo URL: %APP_URL%
  echo.
  node --version
  call "%VITE_CMD%" --version
  echo.
  netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
  if errorlevel 1 (
    echo Puerto 5173: libre.
  ) else (
    echo Puerto 5173: ocupado. Usa detener-poseidon.bat antes de iniciar.
  )
  echo.
  echo Check finalizado.
  exit /b 0
)

netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if not errorlevel 1 (
  echo ERROR: El puerto 5173 ya esta ocupado.
  echo.
  echo Abre la app en:
  echo %APP_URL%
  echo.
  echo Si no responde, ejecuta detener-poseidon.bat y vuelve a iniciar.
  pause
  exit /b 1
)

echo Servidor oficial de desarrollo:
echo %APP_URL%
echo.
echo Manten esta ventana abierta mientras uses la app.
echo Para detener el servidor: Ctrl+C o ejecutar detener-poseidon.bat.
echo.

call "%VITE_CMD%" --config vite.config.mjs --configLoader native --host 127.0.0.1 --port 5173 --strictPort

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo El servidor se detuvo con codigo %EXIT_CODE%.
pause
exit /b %EXIT_CODE%
