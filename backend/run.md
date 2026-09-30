cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\activate  |  Linux/macOS: source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
# Update .env with a long SECRET_KEY (>=32 chars) and your settings
.\.venv\Scripts\python.exe seed_demo.py
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
API docs at http://localhost:8000/docs