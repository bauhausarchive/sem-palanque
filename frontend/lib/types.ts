export interface Politico {
  id: number
  nome: string
  nomeCivil: string
  cpf?: string
  partido: string
  siglaUf: string
  cargo: string // DEPUTADO_FEDERAL, SENADOR, etc.
  legislaturaAtual?: number
  urlFoto?: string
  email?: string
  telefone?: string
  redeSocial?: string[]
  score_transparencia: number // 0-100
  total_condenacoes: number
  total_processos: number
  total_gastos_ceap: number
  mandatos: Mandato[]
}

export interface Mandato {
  cargo: string
  partido: string
  siglaUf: string
  anoInicio: number
  anoFim?: number
}

export interface Discurso {
  id: number
  politicoId: number
  dataHoraInicio: string
  dataHoraFim?: string
  sumario: string
  transcricao?: string
  keywords: string[]
  faseEvento?: string
  tipoDiscurso?: string
  urlTexto?: string
}

export interface Promessa {
  id: number
  politicoId: number
  descricao: string
  fonte: string // 'programa_de_governo' | 'entrevista' | 'debate' | 'rede_social'
  dataPromessa: string
  tema: string
  cumprida?: boolean | null // null = indefinido
}

export interface ComparacaoResult {
  promessa: Promessa
  discursos_relacionados: {
    discurso: Discurso
    similaridade: number // 0-1
    tipo: 'confirmacao' | 'contradicao' | 'neutro'
    trecho_destacado?: string
  }[]
  score_geral: number
  veredicto: 'cumprida' | 'contradita' | 'sem_evidencia'
}

export interface Gasto {
  id: number
  politicoId: number
  ano: number
  mes: number
  tipoDespesa: string
  cnpjCpfFornecedor: string
  nomeFornecedor: string
  numDocumento: string
  valorDocumento: number
  valorLiquido: number
  urlDocumento?: string
}

export interface GastoResumido {
  tipoDespesa: string
  total: number
  quantidade: number
  percentual: number
}

export interface GastosPorMes {
  ano: number
  mes: number
  total: number
}

export interface Condenacao {
  id: number
  politicoId: number
  orgao: string // CNJ, TCU, STF, TJ, etc.
  tipo: string // improbidade, criminal, eleitoral, administrativa
  descricao: string
  dataDecisao: string
  dataTransitoJulgado?: string
  status: 'transitada_julgado' | 'em_recurso' | 'extinta' | 'cumprida'
  pena?: string
  processo?: string
  urlDecisao?: string
}

export interface PoliticoSearchResult {
  id: number
  nome: string
  partido: string
  siglaUf: string
  cargo: string
  urlFoto?: string
  total_condenacoes: number
  score_transparencia: number
}

export interface Stats {
  total_politicos: number
  total_condenados: number
  total_processos: number
  total_gastos_ceap: number
  ultima_atualizacao: string
}

export interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
  per_page?: number
}
