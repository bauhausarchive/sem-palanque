const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON: ' + e.message));
        }
      });
    }).on('error', reject);
  });
}

async function fetchAllDeputados() {
  const allDeputados = [];
  let url = 'https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome&itens=513';

  while (url) {
    console.log(`Fetching: ${url}`);
    const result = await fetchPage(url);

    for (const dep of result.dados) {
      allDeputados.push({
        id: dep.id,
        nome: dep.nome,
        partido: dep.siglaPartido,
        siglaUf: dep.siglaUf,
        cargo: 'DEPUTADO_FEDERAL',
        urlFoto: dep.urlFoto,
        email: dep.email || null,
        total_condenacoes: 0,
        score_transparencia: 50,
      });
    }

    const nextLink = result.links && result.links.find(l => l.rel === 'next');
    url = nextLink ? nextLink.href : null;
  }

  return allDeputados;
}

async function main() {
  const deputados = await fetchAllDeputados();
  const outputPath = path.join(__dirname, '../frontend/public/data/deputados.json');
  fs.writeFileSync(outputPath, JSON.stringify(deputados, null, 2), 'utf8');
  console.log(`Saved ${deputados.length} deputies to ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
