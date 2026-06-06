import json
import time
import urllib.request
from pathlib import Path

ANO = 2024
INPUT = Path("frontend/public/data/deputados.json")
OUTPUT = Path("frontend/public/data/deputados-enriquecidos.json")

def get_json(url):
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "SemPalanque/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))

def total_ceap_deputado(deputado_id):
    total = 0.0
    qtd = 0
    pagina = 1

    while True:
        url = (
            f"https://dadosabertos.camara.leg.br/api/v2/deputados/{deputado_id}/despesas"
            f"?ano={ANO}&pagina={pagina}&itens=100&ordem=ASC&ordenarPor=mes"
        )
        data = get_json(url)
        itens = data.get("dados", [])

        for item in itens:
            total += float(item.get("valorLiquido") or 0)
            qtd += 1

        links = data.get("links", [])
        has_next = any(link.get("rel") == "next" for link in links)
        if not has_next:
            break

        pagina += 1
        time.sleep(0.05)

    return round(total, 2), qtd

def main():
    deputados = json.loads(INPUT.read_text())

    enriquecidos = []
    for i, dep in enumerate(deputados, start=1):
        dep_id = dep["id"]
        nome = dep["nome"]

        try:
            total, qtd = total_ceap_deputado(dep_id)
            print(f"[{i}/{len(deputados)}] {nome}: R$ {total:,.2f} ({qtd} despesas)")
        except Exception as e:
            print(f"[{i}/{len(deputados)}] ERRO {nome}: {e}")
            total, qtd = 0.0, 0

        enriquecidos.append({
            **dep,
            "ano_gastos": ANO,
            "total_gastos_cota_parlamentar": total,
            "quantidade_despesas": qtd,
            "fonte_gastos": "Câmara dos Deputados - Dados Abertos / CEAP",
        })

        time.sleep(0.08)

    OUTPUT.write_text(
        json.dumps(enriquecidos, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\nArquivo gerado: {OUTPUT}")

if __name__ == "__main__":
    main()
