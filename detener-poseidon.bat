@echo off
setlocal

echo Poseidon Sistema de Gestion
echo.
echo Buscando procesos escuchando en el puerto 5173...
echo.

set "FOUND="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do (
  set "FOUND=1"
  echo Cerrando proceso PID %%P
  taskkill /PID %%P /F
)

if not defined FOUND (
  echo No hay ningun proceso escuchando en el puerto 5173.
) else (
  echo.
  echo Puerto 5173 liberado.
)

echo.
pause
