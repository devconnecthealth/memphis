#!/usr/bin/env python3
"""
Monitor de remessas Memphis Courier (portal SSManager) - versão 1.
Sem banco de dados, sem notificações, sem IA: só imprime na tela o último
checkpoint de cada HAWB listado.

Uso:
    export MEMPHIS_USER="seu_usuario"
    export MEMPHIS_PASS="sua_senha"
    pip install requests beautifulsoup4
    python memphis_monitor.py            # usa o filtro padrão da tela /Houses
    python memphis_monitor.py --historico  # mostra todos os checkpoints de cada HAWB
    python memphis_monitor.py --json       # saída em JSON

Observação de privacidade: o script NÃO lê nem imprime nome, CPF ou endereço
do destinatário; usa só número do HAWB, data de criação e checkpoints.
"""
import argparse
import json
import os
import sys

from memphis_core import coletar

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--historico", action="store_true", help="mostra todos os checkpoints")
    ap.add_argument("--json", action="store_true", help="saída em JSON")
    ap.add_argument("--pausa", type=float, default=0.5, help="segundos entre requisições")
    args = ap.parse_args()

    user = os.environ.get("MEMPHIS_USER")
    password = os.environ.get("MEMPHIS_PASS")
    if not user or not password:
        sys.exit("Defina MEMPHIS_USER e MEMPHIS_PASS nas variáveis de ambiente (ou no .env).")

    resultado = coletar(user, password, args.pausa)
    if args.json:
        print(json.dumps(resultado, ensure_ascii=False, indent=2))
        return

    for h in resultado:
        ev = h["eventos"]
        if not ev:
            print(f"{h['hawb']:<14} criado {h['criado']:<17} | (sem checkpoints lidos)")
            continue
        ultimo = ev[-1]
        print(
            f"{h['hawb']:<14} criado {h['criado']:<17} | "
            f"{ultimo['data']} | {ultimo['codigo']} | {ultimo['descricao']}"
        )
        if args.historico:
            for e in ev:
                print(f"    - {e['data']} [{e['estacao']}/{e['codigo']}] {e['descricao']} {e['comentario']}")


if __name__ == "__main__":
    main()
