@echo off
:: Activate the local virtual environment
call venv\Scripts\activate

:: Load variables from .env if it exists
if exist .env (
    for /f "tokens=1,* delims==" %%a in (.env) do (
        set %%a=%%b
    )
)

:: Execute the MCP Server
python -m app.mcp.server
