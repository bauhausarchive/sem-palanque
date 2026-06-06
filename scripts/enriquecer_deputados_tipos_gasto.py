import json
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ANO = 2024
INPUT = Path("frontend/public/data/deputados-enriquecidos.json")
OUTPUT = Path("frontend/public/data/deputados-gastos-tipos.json")

TIPOS_ALVO = [
    ("DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR", "divulgacao"),
    ("COMBUSTÍVEIS E LUBRIFICANTES", "combustiveis"),
    ("PASSAGEM AÉREA", "passagens_aereas"),
    ("LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES", "aluguel_veiculos"),
]

def get_json(url):
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "SemPalanque/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))

def despesas_deputado(deputado_id):
    pagina = 1
    totais = defaultdict(float)
    qtds = defaultdict(int)

    while True:
        url = (
            f"https://dadosabertos.camara.leg.br/api/v2/deputados/{deputado_id}/despesas"
            f"?ano={ANO}&pagina={pagina}&itens=100&ordem=ASC&ordenarPor=mes"
        )
        data = get_json(url)
        itens = data.get("dados", [])

        for item in itens:
            tipo = (item.get("tipoDespesa") or "").strip().upper()
            valor = float(item.get("valorLiquido") or 0)

            totais[tipo] += valor
            qtds[tipo] += 1

        links = data.get("links", [])
        has_next = any(link.get("rel") == "next" for link in links)
        if not has_next:
            break

        pagina += 1
        time.sleep(0.05)

    return totais, qtds

def main():
    deputados = json.loads(INPUT.read_text())

    saida = []
    for i, dep in enumerate(deputados, start=1):
        dep_id = dep["id"]
        nome = dep["nome"]

        try:
            totais, qtds = despesas_deputado(dep_id)

            campos = {}
            for prefixo_tipo, slug in TIPOS_ALVO:
                total_tipo = 0.0
                qtd_tipo = 0

                for tipo_real, total_real in totais.items():
                    tipo_limpo = tipo_real.strip().upper().rstrip(".")
                    if tipo_limpo.startswith(prefixo_tipo):
                        total_tipo += total_real
                        qtd_tipo += qtds.get(tipo_real, 0)

                campos[f"total_{slug}"] = round(total_tipo, 2)
                campos[f"quantidade_{slug}"] = qtd_tipo

            print(
                f"[{i}/{len(deputados)}] {nome}: "
                f"divulgação R$ {campos['total_divulgacao']:,.2f} | "
                f"combustíveis R$ {campos['total_combustiveis']:,.2f} | "
                f"passagens R$ {campos['total_passagens_aereas']:,.2f}"
            )

        except Exception as e:
            print(f"[{i}/{len(deputados)}] ERRO {nome}: {e}")
            campos = {
                "total_divulgacao": 0.0,
                "quantidade_divulgacao": 0,
                "total_combustiveis": 0.0,
                "quantidade_combustiveis": 0,
                "total_passagens_aereas": 0.0,
                "quantidade_passagens_aereas": 0,
                "total_aluguel_veiculos": 0.0,
                "quantidade_aluguel_veiculos": 0,
            }

        saida.append({
            **dep,
            **campos,
            "ano_gastos_por_tipo": ANO,
            "fonte_gastos_por_tipo": "Câmara dos Deputados - Dados Abertos / CEAP",
        })

        time.sleep(0.08)

    OUTPUT.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nArquivo gerado: {OUTPUT}")

if __name__ == "__main__":
    main()
