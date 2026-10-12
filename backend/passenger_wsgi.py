import os
import sys

# 1. Resolve current directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. Make sure python looks in CURRENT_DIR so `import app` resolves
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# 3. Change working directory so Pydantic finds the .env file and static files
os.chdir(CURRENT_DIR)

# 4. Import the FastAPI instance from app/main.py
from app.main import app as asgi_app

# 5. Adapt FastAPI (ASGI) to WSGI for LiteSpeed / Phusion Passenger
from a2wsgi import ASGIMiddleware

application = ASGIMiddleware(asgi_app)