# Remessas Memphis

1. Copie `.env.example` para `.env` e preencha `MEMPHIS_USER` e `MEMPHIS_PASS` (o `.env` está no `.gitignore`).
2. Backend: `pip install -r backend/requirements.txt` e, na raiz, `uvicorn backend.app:app --host 127.0.0.1 --port 8000`
3. Front: `cd frontend && npm install && npm run dev` e abra http://localhost:5173
4. CLI (opcional): `python memphis_monitor.py --json`
5. Testes: `python -m pytest tests`

Privacidade: nome, CPF e endereço do destinatário não são lidos; o campo `comentario` dos checkpoints não é exposto pela API.
