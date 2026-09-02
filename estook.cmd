@echo off
rem  El lanzador. Existe por una razon concreta y vale la pena contarla.
rem
rem  `pnpm` se instala en C:\Users\<tu>\AppData\Roaming\npm, y esa carpeta se
rem  anade al PATH al instalarlo. Pero **una ventana de terminal ya abierta se
rem  queda con el PATH que habia cuando se abrio**, para siempre. Asi que
rem  despues de instalar pnpm, cualquier ventana anterior sigue diciendo «no se
rem  reconoce pnpm» aunque este perfectamente instalado, y el error no da
rem  ninguna pista de que la causa sea esa.
rem
rem  Esto lo rodea: busca pnpm donde de verdad esta, sin depender del PATH.
rem
rem      .\estook.cmd bd:migrar
rem      .\estook.cmd verifica
rem
rem  Funciona igual en PowerShell y en cmd, en una ventana recien abierta o en
rem  una de hace tres dias.
rem
rem  Ojo con dos cosas al tocarlo:
rem
rem    - El fichero va con finales de linea de Windows. Con los de Unix, cmd
rem      parte las lineas por donde no debe. Lo fija `.gitattributes`.
rem    - `exit /b %errorlevel%` NO puede ir dentro de un bloque `( )`: ahi se
rem      calcula al leer el bloque, no al ejecutarlo, y un fallo saldria como
rem      exito. Por eso todo son saltos y hay una sola llamada al final.

setlocal

if "%~1"=="" goto :uso

rem  Donde puede estar, en orden de mas probable a mas raro.
where pnpm >nul 2>nul
if not errorlevel 1 goto :en_el_path

if exist "%APPDATA%\npm\pnpm.cmd" goto :en_npm
if exist "%LOCALAPPDATA%\pnpm\pnpm.cmd" goto :en_pnpm

rem  Ultimo recurso: corepack viene dentro de Node y sabe traerselo solo.
where corepack >nul 2>nul
if not errorlevel 1 goto :con_corepack

goto :no_hay

:en_el_path
call pnpm %*
exit /b %errorlevel%

:en_npm
call "%APPDATA%\npm\pnpm.cmd" %*
exit /b %errorlevel%

:en_pnpm
call "%LOCALAPPDATA%\pnpm\pnpm.cmd" %*
exit /b %errorlevel%

:con_corepack
call corepack pnpm %*
exit /b %errorlevel%

:uso
echo.
echo   Uso:  estook.cmd ^<orden^>
echo.
echo   Las de siempre:
echo     estook.cmd bd:migrar        aplica las migraciones pendientes
echo     estook.cmd bd:sembrar       carga los datos de ejemplo
echo     estook.cmd bd:comprobar     dice como esta la base
echo     estook.cmd verifica         tipos, formato, textos y pruebas
echo.
exit /b 1

:no_hay
echo.
echo   No encuentro pnpm por ningun lado, y he mirado en los cuatro sitios
echo   donde puede estar. Instalalo con:
echo.
echo       npm install -g pnpm@9.15.0
echo.
echo   Y despues cierra esta ventana y abre otra.
echo.
exit /b 1
