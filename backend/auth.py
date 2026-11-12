"""Valida o login do Supabase (JWT enviado pelo front) sem precisar de segredo:
pergunta ao próprio Supabase quem é o dono do token."""
import os
import time

import requests
from fastapi import Header, HTTPException

URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
PERMITIDOS = {e.strip().lower() for e in (os.environ.get("ALLOWED_EMAILS") or "").split(",") if e.strip()}
_cache = {}  # token -> (expira_em, email)


def exigir_login(authorization: str = Header(default="")):
    if not URL or not KEY:
        raise HTTPException(500, "Supabase não configurado no servidor.")
    token = authorization[7:] if authorization.lower().startswith("bearer ") else ""
    if not token:
        raise HTTPException(401, "Faça login.")
    hit = _cache.get(token)
    if hit and hit[0] > time.time():
        return hit[1]
    try:
        r = requests.get(f"{URL}/auth/v1/user", headers={"apikey": KEY, "Authorization": f"Bearer {token}"}, timeout=10)
    except requests.RequestException:
        raise HTTPException(503, "Não foi possível validar o login agora.")
    if r.status_code != 200:
        raise HTTPException(401, "Sessão inválida ou expirada.")
    email = (r.json().get("email") or "").lower()
    if PERMITIDOS and email not in PERMITIDOS:
        raise HTTPException(403, "Usuário sem permissão.")
    _cache[token] = (time.time() + 60, email)
    return email
