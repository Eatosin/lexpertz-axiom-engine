@echo off
:: 1. Teleport explicitly to the folder where this .bat file lives
cd /d "%~dp0"

:: 2. Tell Python exactly where the root directory is
set PYTHONPATH=%cd%

:: 3. Activate the local virtual environment
call venv\Scripts\activate

:: 4. Load variables from .env if it exists
if exist .env (
    for /f "tokens=1,* delims==" %%a in (.env) do (
        set %%a=%%b
    )
)

:: 5. Execute the MCP Server
python -m app.mcp.server
