#!/bin/bash

# 1. Activate the virtual environment
source venv/bin/activate

# 2. Export variables from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 3. Run the MCP server
python -m app.mcp.server
