"""Núcleo de coleta do portal Memphis (SSManager). Não lê dados do destinatário."""
import time
from datetime import datetime
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://app.memphiscourier.com.br"
HEADERS = {"User-Agent": "Mozilla/5.0 (monitor-remessas Connect Health)"}


def _form_payload(form):
    """Coleta todos os campos de um <form> (hidden, text, select...)."""
    data = {}
    for el in form.find_all(["input", "select", "textarea"]):
        name = el.get("name")
        if not name:
            continue
        if el.name == "select":
            opt = el.find("option", selected=True) or el.find("option")
            data[name] = opt.get("value", opt.text) if opt else ""
        elif el.get("type") in ("checkbox", "radio"):
            if el.has_attr("checked"):
                data[name] = el.get("value", "on")
        else:
            data[name] = el.get("value", "")
    return data


def login(session, user, password):
    r = session.get(f"{BASE}/Account/Login", headers=HEADERS, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    form = soup.find("form")
    if form is None:
        raise RuntimeError("Formulário de login não encontrado.")
    payload = _form_payload(form)
    # Descobre os campos de usuário e senha pelo tipo, sem depender do nome.
    for el in form.find_all("input"):
        if el.get("type") == "password":
            payload[el["name"]] = password
        elif el.get("type") == "text" and el.get("name"):
            payload[el["name"]] = user
    action = urljoin(r.url, form.get("action") or r.url)
    r = session.post(action, data=payload, headers=HEADERS, timeout=30)
    r.raise_for_status()
    if "/Account/Login" in r.url and "Log In" in r.text:
        raise RuntimeError("Login recusado (usuário/senha ou token inválido).")


def listar_hawbs(session, inicio=None, fim=None):
    """Replica o submit do formulário #frmHousesIndex e lê a tabela devolvida."""
    r = session.get(f"{BASE}/Houses", headers=HEADERS, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    form = soup.find("form", id="frmHousesIndex")
    if form is None:
        raise RuntimeError("Formulário frmHousesIndex não encontrado em /Houses.")
    payload = _form_payload(form)
    if inicio and fim:  # datetime.date; o portal espera DD/MM/YYYY
        payload["init"] = inicio.strftime("%d/%m/%Y")
        payload["end"] = fim.strftime("%d/%m/%Y")
        payload["reportrange"] = f"{payload['init']} - {payload['end']}"
    payload["PageNumber"] = "1"
    action = urljoin(r.url, form.get("action") or "/Houses/SearchIndexParams")
    method = (form.get("method") or "post").lower()

    hawbs = []
    pagina = 1
    while True:
        payload["PageNumber"] = str(pagina)
        if method == "post":
            resp = session.post(action, data=payload, headers=HEADERS, timeout=60)
        else:
            resp = session.get(action, params=payload, headers=HEADERS, timeout=60)
        resp.raise_for_status()
        pagina_hawbs, total_paginas = parse_lista(resp.text)
        hawbs.extend(pagina_hawbs)
        if pagina >= total_paginas:
            break
        pagina += 1
    return hawbs


def parse_lista(html):
    soup = BeautifulSoup(html, "html.parser")
    total = soup.find("input", id="TotalPages")
    try:
        total_paginas = int(total.get("value")) if total else 1
    except (TypeError, ValueError):
        total_paginas = 1
    hawbs = []
    for tr in soup.select("table tbody tr"):
        a = tr.find("a", href=True)
        if not a or "EditByIdentifier" not in a["href"]:
            continue
        tds = tr.find_all("td")
        if len(tds) > 1:
            for oculto in tds[1].select("span.d-none"):
                oculto.decompose()  # texto auxiliar de ordenação da tabela
        criado = tds[1].get_text(" ", strip=True) if len(tds) > 1 else ""
        # Só o nome da pessoa destinatária: no portal ele é o <th> da linha (Consignee).
        # Endereço, CEP, cidade e CPF nunca são lidos.
        th = tr.find("th")
        destinatario = th.get_text(" ", strip=True) if th else ""
        hawbs.append(
            {
                "destinatario": destinatario,
                "hawb": a.get_text(strip=True).rstrip("- ").strip(),
                "criado": criado,
                "url": urljoin(BASE, a["href"]),
            }
        )
    return hawbs, total_paginas


def _data(txt):
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y"):
        try:
            return datetime.strptime(txt.strip(), fmt)
        except ValueError:
            pass
    return datetime.min


def parse_checkpoints(html):
    """Acha a tabela com colunas Station Code / Code / Date / Description."""
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        head = [c.get_text(" ", strip=True).lower() for c in table.find_all("th")]
        if "description" in head and "date" in head:
            eventos = []
            for tr in table.find_all("tr"):
                # No portal o "Code" vem como <th> dentro da linha: lê th e td na ordem.
                if not tr.find("td"):
                    continue  # linha de cabeçalho
                tds = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
                if len(tds) >= 4:
                    eventos.append(
                        {
                            "estacao": tds[0],
                            "codigo": tds[1],
                            "data": tds[2],
                            "descricao": tds[3],
                            "comentario": tds[4] if len(tds) > 4 else "",
                        }
                    )
            eventos.sort(key=lambda e: _data(e["data"]))  # do mais antigo ao mais novo
            return eventos
    return []


def coletar(user, password, pausa=0.5, progresso=None, inicio=None, fim=None):
    """Login, lista HAWBs e lê checkpoints. progresso(n, total) é opcional."""
    s = requests.Session()
    login(s, user, password)
    hawbs = listar_hawbs(s, inicio, fim)
    resultado = []
    for i, h in enumerate(hawbs, 1):
        time.sleep(pausa)
        r = s.get(h["url"], headers=HEADERS, timeout=60)
        r.raise_for_status()
        resultado.append({"hawb": h["hawb"], "criado": h["criado"], "destinatario": h["destinatario"], "eventos": parse_checkpoints(r.text)})
        if progresso:
            progresso(i, len(hawbs))
    return resultado
