import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from memphis_core import parse_checkpoints, parse_lista

LISTA = '''<input id="TotalPages" value="2"><table><tbody><tr><td></td>
<td><span class="d-none">x</span>01/02/2026 10:00</td>
<td><a href="/Houses/EditByIdentifier?identifier=abc">HW123 - </a></td></tr></tbody></table>'''
CP = '''<table><tr><th>Station Code</th><th>Code</th><th>Date</th><th>Description</th></tr>
<tr><td>GRU</td><td>DL</td><td>03/02/2026 09:00</td><td>Delivered</td></tr>
<tr><td>MIA</td><td>AR</td><td>01/02/2026 09:00</td><td>Arrived</td></tr></table>'''


def test_lista():
    h, total = parse_lista(LISTA)
    assert total == 2 and h[0]["hawb"] == "HW123" and h[0]["criado"] == "01/02/2026 10:00"


def test_checkpoints_ordenados():
    ev = parse_checkpoints(CP)
    assert [e["codigo"] for e in ev] == ["AR", "DL"]


CP_TH = '''<table><tr><th>Station Code</th><th>Code</th><th>Date</th><th>Description</th><th>Comments</th></tr>
<tr><td>MVD</td><th>FLT</th><td>11/11/2026 17:01:13</td><td>House created successfully</td><td>-</td><td></td></tr></table>'''


def test_checkpoint_com_code_em_th():
    ev = parse_checkpoints(CP_TH)
    assert ev[0]["codigo"] == "FLT" and ev[0]["data"] == "11/11/2026 17:01:13" and ev[0]["descricao"].startswith("House")


LISTA_TH = '''<table><tbody><tr><td><a href="/Houses/EditByIdentifier?identifier=a">H1 - </a></td>
<td>01/02/2026 10:00</td><td>1</td><td>1</td><td>2</td><th>Maria Teste</th><td>Rua X 1</td><td>1</td><td>SP</td></tr></tbody></table>'''


def test_destinatario_e_o_th_nao_o_endereco():
    h, _ = parse_lista(LISTA_TH)
    assert h[0]["destinatario"] == "Maria Teste"


def test_traducao():
    from backend.traducao import traduzir
    assert traduzir("Inspected by Anvisa") == "Inspecionada pela Anvisa"
    assert traduzir("Texto novo") == "Texto novo"
