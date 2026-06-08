@echo off
title Agente Editorial - Blog IA
cd /d "%~dp0"

echo.
echo [96m============================================[0m
echo [96m    Agente Editorial v1.0                   [0m
echo [96m    Blog automatizado sobre IA, No-Code     [0m
echo [96m============================================[0m
echo.

if "%1"=="--now" goto now
if "%1"=="--once" goto once
if "%1"=="--dev" goto dev
if "%1"=="--help" goto help

:menu
echo Comandos disponiveis:
echo.
echo  run --now     Executar uma unica vez agora
echo  run --once    Executar uma unica vez
echo  run --dev     Modo desenvolvimento (hot-reload)
echo  run --help    Ajuda
echo.
echo Pressione uma tecla para executar em modo agendado...
echo.
pause >nul
npx tsx src/index.ts
goto end

:now
echo [93mExecutando pipeline uma unica vez...[0m
echo.
npx tsx src/index.ts --now
goto end

:once
echo [93mExecutando pipeline uma unica vez (modo --once)...[0m
echo.
npx tsx src/index.ts --once
goto end

:dev
echo [93mModo desenvolvimento com hot-reload...[0m
echo.
npx tsx watch src/index.ts
goto end

:help
echo Uso: run [--now --once --dev --help]
echo.
echo  --now    Executa o pipeline imediatamente e finaliza
echo  --once   Executa uma unica vez (alias para --now)
echo  --dev    Inicia com hot-reload para desenvolvimento
echo  --help   Mostra esta ajuda
echo.
echo  (sem argumentos) Inicia o modo agendado
goto end

:end
echo.
pause
