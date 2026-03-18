@echo off
:: 1. Teleport to the correct folder
cd /d "%~dp0"

:: 2. Set paths and Force UTF-8 so emojis don't crash Windows
set PYTHONPATH=%cd%
set PYTHONIOENCODING=utf-8

:: 3. Activate environment and run
call venv\Scripts\activate
python -m app.mcp.server
