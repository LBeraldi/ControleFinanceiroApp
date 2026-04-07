const detectApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (configured) {
    return configured.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location
    const isLocalDevHost = hostname === 'localhost' || hostname === '127.0.0.1'
    const isViteDevPort = port === '5173' || port === '5174' || port === '4173'
    if (isLocalDevHost && isViteDevPort) {
      return 'http://127.0.0.1:5000/api'
    }
    return `${protocol}//${window.location.host}/api`
  }

  return '/api'
}

const API_BASE_URL = detectApiBaseUrl()

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const isFormData = options.body instanceof FormData
    const config = {
      headers: {
        ...options.headers,
      },
      ...options,
    }
    if (!isFormData && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json'
    }

    try {
      const response = await fetch(url, config)
      const contentType = response.headers.get('content-type') || ''

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorText = await response.text()
          if (errorText) {
            if (contentType.includes('application/json')) {
              const errorJson = JSON.parse(errorText)
              errorMessage = errorJson.error || errorJson.message || errorMessage
            } else if (errorText.trim().startsWith('<!doctype') || errorText.trim().startsWith('<html')) {
              errorMessage = 'A API retornou HTML em vez de JSON. Verifique se o backend está rodando e se o proxy do Vite está configurado.'
            } else {
              errorMessage = errorText
            }
          }
        } catch {
          // keep default message when error body cannot be parsed
        }
        throw new Error(errorMessage)
      }
      if (response.status === 204) {
        return null
      }

      const text = await response.text()
      if (!text) {
        return null
      }

      if (contentType.includes('application/json')) {
        return JSON.parse(text)
      }

      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
        throw new Error('A API retornou HTML em vez de JSON. Reinicie o frontend após configurar o proxy e confirme que o backend está ativo.')
      }

      return text
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Dashboard
  async getDashboard() {
    return this.request('/dashboard')
  }

  // Gastos
  async getGastos() {
    const data = await this.request('/gastos')
    return Array.isArray(data) ? data : (data.gastos || [])
  }

  async createGasto(gasto) {
    return this.request('/gastos', {
      method: 'POST',
      body: JSON.stringify(gasto),
    })
  }

  async updateGasto(id, gasto) {
    return this.request(`/gastos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(gasto),
    })
  }

  async deleteGasto(id) {
    return this.request(`/gastos/${id}`, {
      method: 'DELETE',
    })
  }

  // Receitas
  async getReceitas() {
    const data = await this.request('/receitas')
    return Array.isArray(data) ? data : (data.receitas || [])
  }

  async createReceita(receita) {
    return this.request('/receitas', {
      method: 'POST',
      body: JSON.stringify(receita),
    })
  }

  async updateReceita(id, receita) {
    return this.request(`/receitas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(receita),
    })
  }

  async deleteReceita(id) {
    return this.request(`/receitas/${id}`, {
      method: 'DELETE',
    })
  }

  // Contas
  async getContas() {
    const data = await this.request('/contas')
    const contas = Array.isArray(data) ? data : []
    return contas.map((conta) => ({
      id: conta.id,
      nome: conta.nome || conta.banco || 'Conta',
      tipo: conta.tipo || 'corrente',
      banco: conta.banco || '',
      saldo_inicial: conta.saldo_inicial ?? conta.saldo ?? 0,
      saldo_atual: conta.saldo_atual ?? conta.saldo ?? 0,
      observacoes: conta.observacoes || '',
    }))
  }

  async getTransacoesConta() {
    const data = await this.request('/contas/transacoes')
    return Array.isArray(data) ? data : []
  }

  async createConta(conta) {
    const payload = {
      ...conta,
      nome: conta.nome || conta.banco || 'Conta',
      tipo: conta.tipo || 'corrente',
      banco: conta.banco || conta.nome || 'Conta',
      saldo_inicial: conta.saldo_inicial ?? conta.saldo ?? conta.saldo_atual ?? 0,
      saldo: conta.saldo ?? conta.saldo_atual ?? conta.saldo_inicial ?? 0,
      observacoes: conta.observacoes || '',
    }
    return this.request('/contas', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async updateConta(id, conta) {
    const payload = {
      ...conta,
      nome: conta.nome || conta.banco || 'Conta',
      tipo: conta.tipo || 'corrente',
      banco: conta.banco || conta.nome || 'Conta',
      saldo_inicial: conta.saldo_inicial ?? conta.saldo ?? conta.saldo_atual ?? 0,
      saldo: conta.saldo ?? conta.saldo_atual ?? conta.saldo_inicial ?? 0,
      observacoes: conta.observacoes || '',
    }
    return this.request(`/contas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  async createTransacaoConta(transacao) {
    return this.request('/contas/transacoes', {
      method: 'POST',
      body: JSON.stringify(transacao),
    })
  }

  async deleteConta(id) {
    return this.request(`/contas/${id}`, {
      method: 'DELETE',
    })
  }

  // Metas
  async getMetas() {
    const data = await this.request('/metas')
    const metas = Array.isArray(data) ? data : []
    return metas.map((meta) => ({
      id: meta.id,
      nome: meta.nome || meta.descricao || 'Meta',
      descricao: meta.descricao || '',
      valor_objetivo: meta.valor_objetivo ?? meta.valor_meta ?? 0,
      valor_atual: meta.valor_atual ?? 0,
      data_inicio: meta.data_inicio || meta.data_criacao || new Date().toISOString().split('T')[0],
      data_limite: meta.data_limite || new Date().toISOString().split('T')[0],
      categoria: meta.categoria || 'economia',
      prioridade: meta.prioridade || 'media',
      status: meta.status || ((meta.valor_atual ?? 0) >= (meta.valor_objetivo ?? meta.valor_meta ?? 0) ? 'concluida' : 'ativa'),
    }))
  }

  async createMeta(meta) {
    const payload = {
      ...meta,
      valor_meta: meta.valor_meta ?? meta.valor_objetivo ?? 0,
    }
    return this.request('/metas', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async updateMeta(id, meta) {
    const payload = {
      ...meta,
      valor_meta: meta.valor_meta ?? meta.valor_objetivo ?? 0,
    }
    return this.request(`/metas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  async deleteMeta(id) {
    return this.request(`/metas/${id}`, {
      method: 'DELETE',
    })
  }

  // Devedores
  async getDevedores() {
    return this.request('/devedores')
  }

  async createDevedor(devedor) {
    return this.request('/devedores', {
      method: 'POST',
      body: JSON.stringify(devedor),
    })
  }

  async updateDevedor(id, devedor) {
    return this.request(`/devedores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(devedor),
    })
  }

  async deleteDevedor(id) {
    return this.request(`/devedores/${id}`, {
      method: 'DELETE',
    })
  }

  async marcarDevedorPago(id) {
    return this.request(`/devedores/${id}/marcar-pago`, {
      method: 'PUT',
    })
  }

  // Categorias
  async getCategorias() {
    return this.request('/categorias')
  }

  async createCategoria(categoria) {
    return this.request('/categorias', {
      method: 'POST',
      body: JSON.stringify(categoria),
    })
  }

  async deleteCategoria(id) {
    return this.request(`/categorias/${id}`, {
      method: 'DELETE',
    })
  }

  // Relatórios
  async getGastosPorCategoria() {
    return this.request('/relatorios/gastos-categoria')
  }

  async getEvolucaoMensal() {
    return this.request('/relatorios/evolucao-mensal')
  }

  async getBalancoGeral() {
    return this.request('/relatorios/balanco-geral')
  }

  // Calculadora
  async calcularPercentualSalario(data) {
    return this.request('/calculadora/percentual-salario', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async calcularRegra503020(data) {
    return this.request('/calculadora/regra-50-30-20', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async calcularJurosCompostos(data) {
    return this.request('/calculadora/juros-compostos', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Configurações
  async inicializarDados() {
    return this.request('/inicializar', {
      method: 'POST',
    })
  }

  async analisarExtratoIA(arquivo, instrucao = '') {
    const formData = new FormData()
    formData.append('arquivo', arquivo)
    formData.append('instrucao', instrucao)
    return this.request('/ia/analisar-extrato', {
      method: 'POST',
      body: formData,
      headers: {}
    })
  }

  // Investimentos
  async getInvestimentos() {
    const data = await this.request('/investimentos')
    return Array.isArray(data) ? data : []
  }

  async createInvestimento(investimento) {
    return this.request('/investimentos', {
      method: 'POST',
      body: JSON.stringify(investimento),
    })
  }

  async updateInvestimento(id, investimento) {
    return this.request(`/investimentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(investimento),
    })
  }

  async deleteInvestimento(id) {
    return this.request(`/investimentos/${id}`, {
      method: 'DELETE',
    })
  }

  async getMercadoInvestimentos(extraTickers = '') {
    const query = extraTickers ? `?tickers=${encodeURIComponent(extraTickers)}` : ''
    return this.request(`/investimentos/mercado${query}`)
  }

  async getOportunidadesInvestimentos() {
    return this.request('/investimentos/oportunidades')
  }

  async getHistoricoInvestimento(ticker, range = '3mo', interval = '1d') {
    const params = new URLSearchParams({ range, interval })
    return this.request(`/investimentos/historico/${encodeURIComponent(ticker)}?${params.toString()}`)
  }

  async getPainelMercadoInvestimentos() {
    return this.request('/investimentos/painel-mercado')
  }

  async searchAtivosInvestimentos(query, limit = 8) {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    return this.request(`/investimentos/busca-ativos?${params.toString()}`)
  }
}

export default new ApiService()
