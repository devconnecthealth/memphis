"""Tradução dos textos de checkpoint do portal (inglês) para português.
Dicionário fixo, sem IA. Texto desconhecido é exibido como veio do portal."""

_PT = {
    "house created successfully": "Remessa criada com sucesso",
    "exportation clearance in process": "Liberação de exportação em andamento",
    "exportation done": "Exportação concluída",
    "shipment in transfer": "Remessa em transferência",
    "shipment in transit": "Remessa em trânsito",
    "departure: the shipment has left its present location and is on its way toward the destination airport":
        "Partida: a remessa saiu do local atual e segue para o aeroporto de destino",
    "arrival: the shipment has arrived at gru airport facilities":
        "Chegada: a remessa chegou às instalações do Aeroporto de Guarulhos (GRU)",
    "arrived to courier warehouse": "Chegou ao armazém do courier",
    "begin clearance process": "Início do processo de desembaraço",
    "consignment is being inspected by customs": "Remessa em inspeção pela Receita Federal (alfândega)",
    "inspected by anvisa": "Inspecionada pela Anvisa",
    "clearance: the shipment is cleared by local customs": "Desembaraço: remessa liberada pela alfândega local",
    "check-in at warehouse": "Entrada registrada no armazém",
    "delivered: the shipment has been delivered. the date and time of delivery is recorded.":
        "Entregue: a remessa foi entregue (data e hora da entrega registradas)",
    "shipment selected for inspection by customs": "Remessa selecionada para inspeção pela alfândega",
    "objeto recebido na unidade de exportação": "Objeto recebido na unidade de exportação",
}


def traduzir(texto):
    return _PT.get((texto or "").strip().lower(), texto)
