# FichaLimpa+ — Plataforma de Transparência Política

> Acompanhe condenações, gastos e a coerência entre discursos e promessas dos seus representantes políticos — com dados abertos do governo federal.

[![Deploy to GitHub Pages](https://github.com/seu-usuario/politico-transparente/actions/workflows/deploy.yml/badge.svg)](https://github.com/seu-usuario/politico-transparente/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Funcionalidades

- **Busca de Políticos** — por nome, partido ou estado
- **Perfil Completo** — cargo, mandatos, índice de transparência
- **Condenações** — dados do CNJ, TCU, TRE e CNIA cruzados por nome/CPF
- **Gastos CEAP** — visualizações dos gastos parlamentares por categoria e mês
- **Comparador de Discursos** — IA analisa coerência entre promessas de campanha e discursos parlamentares usando NLP em português

---

## Fontes de Dados

| Fonte | Dados | URL |
|-------|-------|-----|
| **Câmara dos Deputados API** | Deputados, discursos, despesas CEAP | https://dadosabertos.camara.leg.br/api/v2 |
| **Senado Federal API** | Senadores, pronunciamentos, votações | https://legis.senado.leg.br/dadosabertos |
| **TSE — Repositório de Dados Eleitorais** | Candidaturas, bens declarados, programas de governo | https://dadosabertos.tse.jus.br |
| **CNJ — Justiça Aberta** | Processos judiciais | https://www.cnj.jus.br/sistemas/justica-aberta |
| **CNIA — CGU** | Cadastro de condenações por improbidade administrativa | https://portaldatransparencia.gov.br/download-de-dados/cnia |
| **TCU — Dados Abertos** | Acórdãos e irregularidades fiscais | https://portal.tcu.gov.br/dados-abertos |
| **Portal da Transparência** | Servidores públicos, contratos, convênios | https://portaldatransparencia.gov.br |

> Todos os dados são públicos e disponibilizados pelo governo federal. O FichaLimpa+ apenas consolida, cruza e apresenta essas informações de forma acessível.

---

## Stack Tecnológica

### Frontend
- [Next.js 14](https://nextjs.org/) (App Router, static export)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/) para visualizações
- Deploy: **GitHub Pages** (export estático)

### Backend
- [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- [SQLAlchemy 2](https://docs.sqlalchemy.org/) (async) + [PostgreSQL](https://www.postgresql.org/)
- [pgvector](https://github.com/pgvector/pgvector) para busca semântica de discursos
- [sentence-transformers](https://www.sbert.net/) para NLP em português
- Deploy: **Railway** ou **Render**

---

## Como o Comparador de Discursos Funciona

O Comparador usa **processamento de linguagem natural (NLP)** para comparar promessas de campanha com discursos parlamentares registrados na API da Câmara/Senado.

### Pipeline

```
Promessa de campanha  →  [BERTimbau encoder]  →  vetor de 384 dimensões
Discurso parlamentar  →  [BERTimbau encoder]  →  vetor de 384 dimensões
                                                        ↓
                                          similaridade de cosseno [0, 1]
                                                        ↓
                    ≥ 0.60 → CONFIRMAÇÃO (promessa aparentemente cumprida)
                0.30–0.59 → NEUTRO (sem evidência clara)
                    ≤ 0.30 → CONTRADIÇÃO (discurso contraria a promessa)
```

### Modelo

Por padrão, usamos `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (~120 MB), que suporta português com boa qualidade. Para maior precisão, troque pelo modelo `neuralmind/bert-base-portuguese-cased` (~420 MB) com um head de sentence-transformer fine-tuned.

### Limitações

- Similaridade semântica não implica causalidade — um discurso sobre o mesmo tema não significa que a promessa foi cumprida ou quebrada
- O modelo pode ter viés para textos formais em português padrão
- Discursos técnicos ou muito curtos podem ter resultados menos precisos
- Promessas vagas são difíceis de classificar

---

## Setup de Desenvolvimento

### Pré-requisitos

- Node.js 20+
- Python 3.11+
- PostgreSQL 15+ com extensão `pgvector`
- (Opcional) Docker

### Frontend

```bash
cd frontend
npm install
npm run dev
# Acesse http://localhost:3000
```

Para build estático (GitHub Pages):
```bash
npm run build
# Saída em frontend/out/
```

### Backend

```bash
cd backend

# Criar ambiente virtual
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Rodar servidor de desenvolvimento
uvicorn main:app --reload --port 8000
# Acesse http://localhost:8000/docs
```

### Banco de dados com Docker

```bash
# PostgreSQL + pgvector
docker run -d \
  --name politico-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=politico_transparente \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# As tabelas são criadas automaticamente no startup da API
```

### Ingesting de dados iniciais

```python
# Dentro do backend com .env configurado:
python -c "
import asyncio
from crawlers.camara_api import ingest_deputados
from main import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as db:
        n = await ingest_deputados(db, legislatura=57)
        print(f'Importados {n} deputados')

asyncio.run(main())
"
```

---

## Estrutura do Projeto

```
politico-transparente/
├── frontend/                   # Next.js 14 (App Router)
│   ├── app/
│   │   ├── layout.tsx          # Root layout com nav e footer
│   │   ├── page.tsx            # Homepage com busca e stats
│   │   ├── politico/[id]/      # Perfil do político (tabs)
│   │   └── comparador/         # Comparador de discursos
│   ├── components/
│   │   ├── SearchBar.tsx       # Busca com autocomplete
│   │   ├── PoliticoCard.tsx    # Card de resultado
│   │   ├── DiscursoComparador.tsx  # Resultado NLP
│   │   └── GastoChart.tsx      # Charts de gastos
│   └── lib/
│       ├── api.ts              # Funções de fetch para o backend
│       ├── types.ts            # Tipos TypeScript
│       └── utils.ts            # Formatação, cores, etc.
│
├── backend/                    # FastAPI
│   ├── main.py                 # App principal + CORS + lifespan
│   ├── routers/
│   │   ├── politicos.py        # GET /politicos, /politicos/{id}
│   │   ├── discursos.py        # GET discursos, POST /comparar
│   │   ├── gastos.py           # GET gastos, resumo, por-mes
│   │   └── condenacoes.py      # GET condenações
│   ├── models/
│   │   ├── database.py         # SQLAlchemy ORM models
│   │   └── schemas.py          # Pydantic v2 schemas
│   ├── crawlers/
│   │   ├── camara_api.py       # Câmara API crawler
│   │   ├── senado_api.py       # Senado API crawler
│   │   ├── tse_api.py          # TSE bulk CSV loader
│   │   ├── cnia_scraper.py     # CNIA improbidade scraper
│   │   └── ceap_crawler.py     # CEAP gastos crawler
│   ├── services/
│   │   └── nlp_service.py      # Sentence-transformers NLP
│   └── Dockerfile
│
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Pages CI/CD
```

---

## Deploy

### Frontend — GitHub Pages

1. Acesse **Settings → Pages** no seu repositório
2. Source: **GitHub Actions**
3. No push para `main`, o workflow `.github/workflows/deploy.yml` faz o build e deploy automaticamente
4. Configure `NEXT_PUBLIC_API_URL` em **Settings → Secrets → Actions**

Para deploy em subdiretório (`/politico-transparente`), edite `next.config.js`:
```js
basePath: '/politico-transparente'
```

### Backend — Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli
railway login

# Deploy
cd backend
railway up

# Configurar variáveis
railway variables set DATABASE_URL=postgresql://...
railway variables set ALLOWED_ORIGINS=https://seu-usuario.github.io
```

### Backend — Render

1. Crie um **Web Service** no Render apontando para a pasta `backend/`
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Adicione um **PostgreSQL** database no Render e conecte via `DATABASE_URL`

---

## Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Faça suas mudanças com testes
4. Abra um Pull Request descrevendo o que foi alterado

### Áreas prioritárias

- [ ] Integração com CNJ Justiça Aberta (API REST)
- [ ] Integração com TCU (acórdãos)
- [ ] Fine-tuning do modelo NLP para discursos parlamentares brasileiros
- [ ] Análise de votações vs. posições declaradas
- [ ] App mobile (React Native)
- [ ] Alertas por e-mail quando um político monitorado tiver nova condenação

---

## Aviso Legal

Este projeto usa dados públicos disponibilizados pelo governo federal brasileiro. As informações são apresentadas como encontradas nas fontes originais, sem edição editorial. Condenações em recurso **não** implicam culpa definitiva. Sempre consulte as fontes originais para decisões importantes.

---

## Licença

[MIT](LICENSE) — livre para uso, modificação e distribuição.
