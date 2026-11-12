"""Persistência na tabela public.memphis do Supabase (REST). Só roda se houver a chave
service_role no ambiente; sem ela o app funciona só em memória. Nunca loga conteúdo."""
import logging
import os
from datetime import datetime

import requests

from memphis_core import _data

log = logging.getLogger("memphis")
URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SERVICE = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
ativo = bool(URL and SERVICE)
_H = {"apikey": SERVICE or "", "Authorization": f"Bearer {SERVICE}", "Content-Type": "application/json"}


def _iso(txt):
    d = _data(txt or "")
    return None if d == datetime.min else d.isoformat()


def _br(iso):
    return datetime.fromisoformat(iso).strftime("%d/%m/%Y %H:%M") if iso else ""


def salvar(hawbs, derivar_status, traduzir):
    """hawbs: lista do coletar(). Upsert por hawb."""
    if not ativo or not hawbs:
        return
    linhas = []
    for h in hawbs:
        ev = h["eventos"]
        ult = ev[-1] if ev else None
        linhas.append({
            "hawb": h["hawb"],
            "destinatario": h.get("destinatario") or None,
            "criado_em": _iso(h["criado"]),
            "status": derivar_status(ev),
            "ultimo_checkpoint_em": _iso(ult["data"]) if ult else None,
            "ultimo_checkpoint_desc": traduzir(ult["descricao"]) if ult else None,
            # comentario fica de fora (pode ter dado de paciente); descricao original p/ derivar status
            "eventos": [{k: e[k] for k in ("estacao", "codigo", "data", "descricao")} for e in ev],
            "coletado_em": datetime.now().isoformat(timespec="seconds"),
        })
    r = requests.post(f"{URL}/rest/v1/memphis?on_conflict=hawb", json=linhas, timeout=60,
                      headers={**_H, "Prefer": "resolution=merge-duplicates,return=minimal"})
    if r.status_code >= 300:
        log.error("supabase: falha ao salvar (%s)", r.status_code)
    else:
        log.info("supabase: %d linhas salvas", len(linhas))


def carregar():
    """Lê tudo da tabela e devolve no formato do coletar()."""
    if not ativo:
        return [], None
    r = requests.get(f"{URL}/rest/v1/memphis?select=*&order=criado_em.desc&limit=5000", headers=_H, timeout=60)
    if r.status_code != 200:
        log.error("supabase: falha ao carregar (%s)", r.status_code)
        return [], None
    rows = r.json()
    hawbs = [{"hawb": x["hawb"], "criado": _br(x["criado_em"]), "destinatario": x.get("destinatario") or "",
              "eventos": [{**e, "comentario": ""} for e in (x.get("eventos") or [])]} for x in rows]
    ultima = max((x["coletado_em"] for x in rows), default=None)
    return hawbs, ultima
