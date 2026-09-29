cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Update .env with your MySQL credentials
uvicorn app.main:app --reload --port 8000
API docs at http://localhost:8000/docs