"""API JSON para o front. Estado só em memória; sem banco."""
import logging
import os
import sys
import threading
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from memphis_core import _data, coletar  # noqa: E402
from backend.traducao import traduzir  # noqa: E402
from backend import store  # noqa: E402
from backend.auth import exigir_login  # noqa: E402

log = logging.getLogger("memphis")
logging.basicConfig(level=logging.INFO)

USER = os.environ.get("MEMPHIS_USER")
PASS = os.environ.get("MEMPHIS_PASS")
if not USER or not PASS:
    raise RuntimeError("Defina MEMPHIS_USER e MEMPHIS_PASS (variáveis de ambiente ou .env).")

app = FastAPI(title="Memphis Monitor", dependencies=[Depends(exigir_login)])
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])

_lock = threading.Lock()
estado = {"atualizado_em": None, "coletando": False, "erro": None, "progresso": [0, 0], "periodo": None, "hawbs": []}


def derivar_status(eventos):
    if not eventos:
        return "Sem checkpoints"
    desc = eventos[-1]["descricao"].lower()
    if "deliver" in desc or "entreg" in desc:
        return "Entregue"
    return "Em trânsito"


def _publico_evento(e):
    # comentario fica de fora de propósito: texto livre pode conter dado de paciente.
    # status continua derivado do texto original; a tradução é só de exibição.
    return {"estacao": e["estacao"], "codigo": e["codigo"], "data": e["data"], "descricao": traduzir(e["descricao"])}


def dias_sem_movimento(h):
    """Dias desde o último checkpoint (ou desde a criação, se não houver). None se entregue."""
    ev = h["eventos"]
    if derivar_status(ev) == "Entregue":
        return None
    ref = _data(ev[-1]["data"]) if ev else _data(h["criado"])
    if ref == datetime.min:
        return None
    return max((datetime.now() - ref).days, 0)


def _resumo(h):
    ev = h["eventos"]
    ult = _publico_evento(ev[-1]) if ev else None
    return {"hawb": h["hawb"], "criado": h["criado"], "destinatario": h.get("destinatario", ""), "ultimo_checkpoint": ult, "status": derivar_status(ev), "dias_sem_movimento": dias_sem_movimento(h)}


class Periodo(BaseModel):
    inicio: date
    fim: date


def _rodar(inicio, fim):
    def prog(n, total):
        estado["progresso"] = [n, total]

    try:
        res = coletar(USER, PASS, progresso=prog, inicio=inicio, fim=fim)
        estado["hawbs"] = res
        store.salvar(res, derivar_status, traduzir)
        estado["periodo"] = {"inicio": inicio.isoformat(), "fim": fim.isoformat()}
        estado["atualizado_em"] = datetime.now().isoformat(timespec="seconds")
        estado["erro"] = None
        log.info("coleta ok: %d HAWBs", len(res))
    except Exception as exc:  # mensagem genérica ao front; só o tipo vai ao log
        log.error("coleta falhou: %s", type(exc).__name__)
        estado["erro"] = "Falha ao consultar o portal Memphis (verifique credenciais e conexão)."
    finally:
        estado["coletando"] = False
        _lock.release()


@app.post("/api/atualizar", status_code=202)
def atualizar(p: Periodo):
    if p.fim < p.inicio or (p.fim - p.inicio).days > 366:
        raise HTTPException(422, "Período inválido (fim antes do início ou maior que 1 ano).")
    if not _lock.acquire(blocking=False):
        raise HTTPException(409, "Coleta já em andamento.")
    estado["coletando"] = True
    estado["progresso"] = [0, 0]
    threading.Thread(target=_rodar, args=(p.inicio, p.fim), daemon=True).start()
    return {"coletando": True}


@app.get("/api/status")
def status():
    return {k: estado[k] for k in ("coletando", "erro", "progresso", "atualizado_em", "periodo")}


@app.get("/api/hawbs")
def listar():
    return {"atualizado_em": estado["atualizado_em"], "periodo": estado["periodo"], "hawbs": [_resumo(h) for h in estado["hawbs"]]}


@app.get("/api/hawbs/{hawb}")
def detalhe(hawb: str):
    for h in estado["hawbs"]:
        if h["hawb"] == hawb:
            return {**_resumo(h), "eventos": [_publico_evento(e) for e in h["eventos"]]}
    raise HTTPException(404, "HAWB não encontrado.")


def _carregar_inicial():
    try:
        hawbs, ultima = store.carregar()
        if hawbs:
            estado["hawbs"], estado["atualizado_em"] = hawbs, (ultima or "")[:19] or None
            log.info("carregados %d HAWBs do Supabase", len(hawbs))
    except Exception as exc:
        log.error("não foi possível carregar do Supabase: %s", type(exc).__name__)


_carregar_inicial()
if not store.ativo:
    log.warning("SUPABASE_SERVICE_ROLE_KEY ausente: dados só em memória (sem persistência).")
