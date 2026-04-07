import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  PieChart,
  RefreshCw,
  BarChart3,
  LineChart as LineChartIcon
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts'
import apiService from '../services/api'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4']

const EMPTY_RESUMO = {
  ativos: 0,
  total_investido: 0,
  total_atual: 0,
  resultado: 0,
  resultado_percentual: 0,
}

const EMPTY_FORM = {
  ticker: '',
  preco_medio: '',
  valor_investido: '',
  quantidade: '',
  data_compra: new Date().toISOString().split('T')[0],
  corretora: '',
  classe_ativo: 'acao',
}

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(Number(value) || 0)

const parseDecimal = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')

  if (!normalized) return NaN
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

const normalizeAtivo = (ativo) => {
  const quantidade = Number(ativo?.quantidade) || 0
  const precoMedio = Number(ativo?.preco_medio) || 0
  const cotacaoPreco = Number(ativo?.cotacao?.preco) || 0
  const valorInvestido = ativo?.valor_investido != null ? Number(ativo.valor_investido) || 0 : quantidade * precoMedio
  const valorAtual = ativo?.valor_atual != null ? Number(ativo.valor_atual) || 0 : quantidade * cotacaoPreco
  const resultado = ativo?.resultado != null ? Number(ativo.resultado) || 0 : valorAtual - valorInvestido
  const resultadoPercentual = ativo?.resultado_percentual != null
    ? Number(ativo.resultado_percentual) || 0
    : (valorInvestido > 0 ? (resultado / valorInvestido) * 100 : 0)

  return {
    ...ativo,
    ticker: (ativo?.ticker || '').toUpperCase(),
    quantidade,
    preco_medio: precoMedio,
    cotacao: ativo?.cotacao ? {
      ...ativo.cotacao,
      preco: cotacaoPreco,
      variacao_percentual: Number(ativo.cotacao.variacao_percentual) || 0,
    } : null,
    valor_investido: valorInvestido,
    valor_atual: valorAtual,
    resultado,
    resultado_percentual: resultadoPercentual,
  }
}

const buildResumo = (carteira) => {
  const totalInvestido = carteira.reduce((acc, item) => acc + (Number(item.valor_investido) || 0), 0)
  const totalAtual = carteira.reduce((acc, item) => acc + (Number(item.valor_atual) || 0), 0)
  const resultado = totalAtual - totalInvestido

  return {
    ativos: carteira.length,
    total_investido: totalInvestido,
    total_atual: totalAtual,
    resultado,
    resultado_percentual: totalInvestido > 0 ? (resultado / totalInvestido) * 100 : 0,
  }
}

const Investimentos = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [carteira, setCarteira] = useState([])
  const [resumo, setResumo] = useState(EMPTY_RESUMO)
  const [topAltas, setTopAltas] = useState([])
  const [topBaixas, setTopBaixas] = useState([])
  const [painelMercado, setPainelMercado] = useState([])
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAtivo, setEditingAtivo] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [screenError, setScreenError] = useState('')
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [selectedTicker, setSelectedTicker] = useState('')
  const [historyData, setHistoryData] = useState(null)
  const [ativoSuggestions, setAtivoSuggestions] = useState([])
  const [searchingAtivos, setSearchingAtivos] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)

  const buildFallbackPainel = () => {
    const merged = [
      ...topAltas.map((item) => ({
        ticker: item?.ticker || '',
        nome: item?.nome || item?.ticker || 'Ativo',
        preco: Number(item?.preco) || 0,
        variacao: Number(item?.variacao) || 0,
        variacao_percentual: Number(item?.variacao_percentual) || 0,
        logo_url: item?.logo_url || '',
        tipo_movimento: Number(item?.variacao_percentual || 0) >= 0 ? 'alta' : 'baixa',
        classe: 'acao',
      })),
      ...topBaixas.map((item) => ({
        ticker: item?.ticker || '',
        nome: item?.nome || item?.ticker || 'Ativo',
        preco: Number(item?.preco) || 0,
        variacao: Number(item?.variacao) || 0,
        variacao_percentual: Number(item?.variacao_percentual) || 0,
        logo_url: item?.logo_url || '',
        tipo_movimento: Number(item?.variacao_percentual || 0) >= 0 ? 'alta' : 'baixa',
        classe: 'acao',
      })),
      ...carteira
        .filter((item) => Number(item?.cotacao?.preco) > 0)
        .map((item) => ({
          ticker: item.ticker,
          nome: item.ticker,
          preco: Number(item.cotacao?.preco) || 0,
          variacao: Number(item.cotacao?.variacao) || 0,
          variacao_percentual: Number(item.cotacao?.variacao_percentual) || 0,
          logo_url: item.cotacao?.logo_url || '',
          tipo_movimento: Number(item.cotacao?.variacao_percentual || 0) >= 0 ? 'alta' : 'baixa',
          classe: 'acao',
        })),
    ]

    const unique = merged.filter((item, index, list) => (
      item.ticker && list.findIndex((candidate) => candidate.ticker === item.ticker) === index
    ))

    unique.sort((a, b) => Math.abs(Number(b.variacao_percentual) || 0) - Math.abs(Number(a.variacao_percentual) || 0))
    return unique.slice(0, 8)
  }

  const resetForm = () => {
    setFormData({
      ...EMPTY_FORM,
      data_compra: new Date().toISOString().split('T')[0],
    })
    setEditingAtivo(null)
    setFormError('')
    setAtivoSuggestions([])
    setSelectedSuggestion(null)
  }

  const applyMercadoData = (data) => {
    const normalizedCarteira = Array.isArray(data?.carteira) ? data.carteira.map(normalizeAtivo) : []
    const normalizedResumo = data?.resumo
      ? {
          ativos: Number(data.resumo.ativos) || normalizedCarteira.length,
          total_investido: Number(data.resumo.total_investido) || 0,
          total_atual: Number(data.resumo.total_atual) || 0,
          resultado: Number(data.resumo.resultado) || 0,
          resultado_percentual: Number(data.resumo.resultado_percentual) || 0,
        }
      : buildResumo(normalizedCarteira)

    setCarteira(normalizedCarteira)
    setResumo(normalizedResumo)
    setTopAltas(Array.isArray(data?.top_altas) ? data.top_altas : [])
    setTopBaixas(Array.isArray(data?.top_baixas) ? data.top_baixas : [])
    setUltimaAtualizacao(data?.ultima_atualizacao || '')
  }

  const loadCarteiraFallback = async (errorMessage) => {
    const baseCarteira = await apiService.getInvestimentos()
    const normalizedCarteira = baseCarteira.map(normalizeAtivo)
    setCarteira(normalizedCarteira)
    setResumo(buildResumo(normalizedCarteira))
    setTopAltas([])
    setTopBaixas([])
    setUltimaAtualizacao('')
    setScreenError(errorMessage || 'Nao foi possivel atualizar as cotacoes de mercado. A carteira foi carregada sem precos em tempo real.')
  }

  const loadCarteira = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      setScreenError('')
      const data = await apiService.getMercadoInvestimentos()
      applyMercadoData(data)
    } catch (error) {
      console.error('Erro ao carregar investimentos:', error)
      try {
        await loadCarteiraFallback(error.message)
      } catch (fallbackError) {
        console.error('Erro ao carregar fallback de investimentos:', fallbackError)
        setCarteira([])
        setResumo(EMPTY_RESUMO)
        setTopAltas([])
        setTopBaixas([])
        setUltimaAtualizacao('')
        setScreenError(fallbackError.message || 'Nao foi possivel carregar os investimentos.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadPainelMercado = async () => {
    try {
      const data = await apiService.getPainelMercadoInvestimentos()
      const items = Array.isArray(data?.itens) ? data.itens : []
      setPainelMercado(items.length > 0 ? items : buildFallbackPainel())
    } catch (error) {
      console.error('Erro ao carregar painel de mercado:', error)
      setPainelMercado(buildFallbackPainel())
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([loadCarteira(), loadPainelMercado()])
    }
    bootstrap()
  }, [])

  useEffect(() => {
    if (painelMercado.length === 0) {
      const fallback = buildFallbackPainel()
      if (fallback.length > 0) {
        setPainelMercado(fallback)
      }
    }
  }, [topAltas, topBaixas, carteira])

  useEffect(() => {
    if (editingAtivo) return

    const query = formData.ticker.trim()
    if (query.length < 2) {
      setAtivoSuggestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        setSearchingAtivos(true)
        const data = await apiService.searchAtivosInvestimentos(query)
        setAtivoSuggestions(Array.isArray(data?.itens) ? data.itens : [])
      } catch (error) {
        console.error('Erro ao buscar ativos:', error)
        setAtivoSuggestions([])
      } finally {
        setSearchingAtivos(false)
      }
    }, 250)

    return () => clearTimeout(timeoutId)
  }, [formData.ticker, editingAtivo])

  const openEditDialog = (ativo) => {
    setEditingAtivo(ativo)
    setFormData({
      ticker: ativo.ticker || '',
      preco_medio: String(ativo.preco_medio ?? ''),
      valor_investido: String((Number(ativo.quantidade ?? 0) * Number(ativo.preco_medio ?? 0)).toFixed(2)),
      quantidade: String(ativo.quantidade ?? ''),
      data_compra: ativo.data_compra || new Date().toISOString().split('T')[0],
      corretora: ativo.corretora || '',
      classe_ativo: ativo.classe_ativo || 'acao'
    })
    setSelectedSuggestion({
      ticker: ativo.ticker || '',
      classe: ativo.classe_ativo || 'acao',
      preco_atual: Number(ativo.preco_medio) || 0,
    })
    setFormError('')
    setIsDialogOpen(true)
  }

  const handleSelectSuggestion = (item) => {
    setSelectedSuggestion(item)
    setFormData((current) => ({
      ...current,
      ticker: item.ticker,
      preco_medio: item.preco_atual ? String(item.preco_atual) : current.preco_medio,
      classe_ativo: item.classe === 'macro' ? 'macro' : current.classe_ativo,
    }))
    setAtivoSuggestions([])
  }

  const openHistoryDialog = async (ticker) => {
    setSelectedTicker(ticker)
    setHistoryDialogOpen(true)
    setHistoryLoading(true)
    setHistoryError('')
    setHistoryData(null)

    try {
      const data = await apiService.getHistoricoInvestimento(ticker)
      setHistoryData(data)
    } catch (error) {
      console.error('Erro ao carregar historico:', error)
      setHistoryError(error.message || 'Nao foi possivel carregar o historico do ativo.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleDialogChange = (open) => {
    setIsDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const validateForm = () => {
    const ticker = formData.ticker.trim().toUpperCase()
    const precoMedio = parseDecimal(formData.preco_medio)
    const valorInvestido = parseDecimal(formData.valor_investido)
    let quantidade = parseDecimal(formData.quantidade)

    if (!ticker) {
      return { valid: false, message: 'Informe o ticker do ativo.' }
    }

    if (!/^[A-Z0-9-]{3,15}$/.test(ticker)) {
      return { valid: false, message: 'Informe um ticker valido, sem espacos ou caracteres especiais.' }
    }

    if (
      selectedSuggestion &&
      !['stock', 'macro', 'acao'].includes(String(selectedSuggestion.classe || '').toLowerCase())
    ) {
      return {
        valid: false,
        message: 'Esse tipo de ativo ainda nao tem cotacao e historico disponiveis no sistema atual.',
      }
    }

    if (!Number.isFinite(precoMedio) || precoMedio <= 0) {
      return { valid: false, message: 'Informe um preco medio maior que zero.' }
    }

    if (Number.isFinite(valorInvestido) && valorInvestido > 0) {
      quantidade = valorInvestido / precoMedio
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return { valid: false, message: 'Informe um valor investido ou quantidade valida.' }
    }

    if (!formData.data_compra) {
      return { valid: false, message: 'Informe a data de compra.' }
    }

    return {
      valid: true,
      payload: {
        ticker,
        quantidade,
        preco_medio: precoMedio,
        valor_investido: Number.isFinite(valorInvestido) && valorInvestido > 0 ? valorInvestido : quantidade * precoMedio,
        data_compra: formData.data_compra,
        corretora: formData.corretora.trim(),
        classe_ativo: formData.classe_ativo,
        origem: 'manual'
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    const validation = validateForm()
    if (!validation.valid) {
      setFormError(validation.message)
      return
    }

    setSaving(true)
    setFormError('')

    try {
      if (editingAtivo) {
        await apiService.updateInvestimento(editingAtivo.id, validation.payload)
      } else {
        await apiService.createInvestimento(validation.payload)
      }

      setIsDialogOpen(false)
      resetForm()
      await Promise.all([loadCarteira(true), loadPainelMercado()])
    } catch (error) {
      console.error('Erro ao salvar ativo:', error)
      setFormError(error.message || 'Nao foi possivel salvar o ativo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este ativo da carteira?')) return
    try {
      await apiService.deleteInvestimento(id)
      await Promise.all([loadCarteira(true), loadPainelMercado()])
    } catch (error) {
      console.error('Erro ao excluir ativo:', error)
      setScreenError(error.message || 'Nao foi possivel excluir o ativo.')
    }
  }

  const chartData = useMemo(() => (
    carteira
      .filter((item) => (item.valor_atual || 0) > 0)
      .map((item) => ({ name: item.ticker, value: item.valor_atual }))
  ), [carteira])

  const historySeries = useMemo(() => (
    Array.isArray(historyData?.historico) ? historyData.historico : []
  ), [historyData])

  const quantidadeCalculada = useMemo(() => {
    const precoMedio = parseDecimal(formData.preco_medio)
    const valorInvestido = parseDecimal(formData.valor_investido)
    if (Number.isFinite(precoMedio) && precoMedio > 0 && Number.isFinite(valorInvestido) && valorInvestido > 0) {
      return valorInvestido / precoMedio
    }
    const quantidade = parseDecimal(formData.quantidade)
    return Number.isFinite(quantidade) ? quantidade : 0
  }, [formData.preco_medio, formData.valor_investido, formData.quantidade])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-700 to-blue-900 bg-clip-text text-transparent">
            Investimentos B3
          </h1>
          <p className="text-gray-600">Carteira consolidada com cotacoes de mercado e monitoramento diario.</p>
          {ultimaAtualizacao && (
            <p className="text-xs text-gray-500 mt-1">Ultima atualizacao: {new Date(ultimaAtualizacao).toLocaleString('pt-BR')}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => Promise.all([loadCarteira(true), loadPainelMercado()])} disabled={refreshing || saving}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar mercado
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button className="bg-blue-700 hover:bg-blue-800" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar ativo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingAtivo ? 'Editar ativo' : 'Novo ativo'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="ticker">Ticker</Label>
                  <div className="relative">
                    <Input
                      id="ticker"
                      value={formData.ticker}
                      onChange={(e) => {
                        setSelectedSuggestion(null)
                        setFormData({ ...formData, ticker: e.target.value.toUpperCase() })
                      }}
                      placeholder="Ex: PETR4 ou USD-BRL"
                      autoComplete="off"
                      required
                    />
                    {searchingAtivos && !editingAtivo && (
                      <div className="absolute right-3 top-2 text-xs text-gray-400">Buscando...</div>
                    )}
                    {!editingAtivo && ativoSuggestions.length > 0 && (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow-lg">
                        {ativoSuggestions.map((item) => (
                          <button
                            key={`${item.ticker}-${item.fonte}`}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-blue-50"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{item.ticker}</p>
                              <p className="text-xs text-gray-500">{item.nome}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatCurrency(item.preco_atual)}</p>
                              <p className="text-xs text-gray-400">{item.classe}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="valor_investido">Valor investido</Label>
                    <Input
                      id="valor_investido"
                      type="text"
                      inputMode="decimal"
                      value={formData.valor_investido}
                      onChange={(e) => setFormData({ ...formData, valor_investido: e.target.value })}
                      placeholder="Ex: 1000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="preco_medio">Preco medio</Label>
                    <Input
                      id="preco_medio"
                      type="text"
                      inputMode="decimal"
                      value={formData.preco_medio}
                      onChange={(e) => setFormData({ ...formData, preco_medio: e.target.value })}
                      placeholder="Ex: 27,35"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="quantidade">Quantidade calculada</Label>
                    <Input
                      id="quantidade"
                      type="text"
                      value={quantidadeCalculada > 0 ? quantidadeCalculada.toFixed(6) : ''}
                      readOnly
                      placeholder="Calculada automaticamente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="classe_ativo">Classe</Label>
                    <select
                      id="classe_ativo"
                      value={formData.classe_ativo}
                      onChange={(e) => setFormData({ ...formData, classe_ativo: e.target.value })}
                      className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="acao">Acao</option>
                      <option value="fii">FII</option>
                      <option value="etf">ETF</option>
                      <option value="bdr">BDR</option>
                      <option value="macro">Macro</option>
                      <option value="renda_fixa">Renda fixa</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="data_compra">Data compra</Label>
                    <Input
                      id="data_compra"
                      type="date"
                      value={formData.data_compra}
                      onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })}
                      required
                    />
                  </div>
                  <div />
                </div>
                <div>
                  <Label htmlFor="corretora">Corretora</Label>
                  <Input
                    id="corretora"
                    value={formData.corretora}
                    onChange={(e) => setFormData({ ...formData, corretora: e.target.value })}
                    placeholder="Ex: XP"
                  />
                </div>
                {formError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800" disabled={saving}>
                  {saving ? 'Salvando...' : (editingAtivo ? 'Atualizar' : 'Adicionar')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {screenError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {screenError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Investido</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(resumo.total_investido)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Valor Atual</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(resumo.total_atual)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Resultado</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${resumo.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(resumo.resultado)}</p><Badge className={resumo.resultado >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{resumo.resultado_percentual >= 0 ? '+' : ''}{Number(resumo.resultado_percentual || 0).toFixed(2)}%</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Ativos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{resumo.ativos}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="w-4 h-4" />Distribuicao da carteira</CardTitle></CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-gray-500">Sem dados para grafico</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <RechartsPieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={110} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                    {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-600" />Maiores Altas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topAltas.length === 0 && <p className="text-sm text-gray-500">Sem ranking disponivel.</p>}
              {topAltas.map((item) => (
                <div key={item.ticker} className="flex items-center justify-between border rounded-md p-2">
                  <div><p className="font-semibold">{item.ticker}</p><p className="text-xs text-gray-500">{item.nome}</p></div>
                  <div className="text-right"><p className="text-sm">{formatCurrency(item.preco)}</p><p className="text-sm text-green-600">+{(Number(item.variacao_percentual) || 0).toFixed(2)}%</p></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-600" />Maiores Baixas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topBaixas.length === 0 && <p className="text-sm text-gray-500">Sem ranking disponivel.</p>}
              {topBaixas.map((item) => (
                <div key={item.ticker} className="flex items-center justify-between border rounded-md p-2">
                  <div><p className="font-semibold">{item.ticker}</p><p className="text-xs text-gray-500">{item.nome}</p></div>
                  <div className="text-right"><p className="text-sm">{formatCurrency(item.preco)}</p><p className="text-sm text-red-600">{(Number(item.variacao_percentual) || 0).toFixed(2)}%</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />Posicoes da carteira</CardTitle>
        </CardHeader>
        <CardContent>
          {carteira.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhum ativo cadastrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Preco medio</TableHead>
                  <TableHead>Cotacao</TableHead>
                  <TableHead>Investido</TableHead>
                  <TableHead>Atual</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carteira.map((ativo) => (
                  <TableRow key={ativo.id}>
                    <TableCell className="font-semibold">{ativo.ticker}</TableCell>
                    <TableCell>{ativo.classe_ativo}</TableCell>
                    <TableCell>{ativo.quantidade}</TableCell>
                    <TableCell>{formatCurrency(ativo.preco_medio)}</TableCell>
                    <TableCell>
                      {ativo.cotacao?.preco ? (
                        <div>
                          <p>{formatCurrency(ativo.cotacao.preco)}</p>
                          <p className={`text-xs ${(ativo.cotacao.variacao_percentual || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(ativo.cotacao.variacao_percentual || 0) >= 0 ? '+' : ''}{(ativo.cotacao.variacao_percentual || 0).toFixed(2)}%
                          </p>
                        </div>
                      ) : <span className="text-gray-400">Sem cotacao</span>}
                    </TableCell>
                    <TableCell>{formatCurrency(ativo.valor_investido)}</TableCell>
                    <TableCell>{formatCurrency(ativo.valor_atual)}</TableCell>
                    <TableCell>
                      <p className={ativo.resultado >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{formatCurrency(ativo.resultado)}</p>
                      <p className={`text-xs ${ativo.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>{ativo.resultado_percentual >= 0 ? '+' : ''}{(ativo.resultado_percentual || 0).toFixed(2)}%</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(ativo)}><Edit className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(ativo.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50">
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                Mercado em movimento
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Lista de ativos que mais se moveram no dia, em alta ou em baixa.
              </p>
            </div>
            {ultimaAtualizacao && (
              <p className="text-xs text-gray-500">
                Atualizado em {new Date(ultimaAtualizacao).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {painelMercado.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhum ativo disponivel no momento.</div>
          ) : (
            <div className="space-y-3">
              {painelMercado.map((item) => {
                const isPositive = Number(item.variacao_percentual || 0) >= 0
                return (
                  <div key={item.ticker} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {isPositive ? '▲' : '▼'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.ticker}</p>
                        <p className="text-sm text-gray-500">{item.nome}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:gap-6">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Valor atual</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(item.preco)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Variacao</p>
                        <p className={`font-semibold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                          {isPositive ? '+' : ''}{Number(item.variacao_percentual || 0).toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Oscilacao</p>
                        <p className={`font-semibold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(item.variacao)}
                        </p>
                      </div>
                      <div className="flex items-center justify-end">
                        <Button variant="outline" size="sm" onClick={() => openHistoryDialog(item.ticker)}>
                          <LineChartIcon className="w-4 h-4 mr-2" />
                          Grafico
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            Integracao de mercado habilitada. Para sincronizacao automatica de posicoes da B3 (sem cadastro manual), o proximo passo e conectar seu extrato/arquivo da corretora ou API custodiante quando disponivel.
          </p>
        </CardContent>
      </Card>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Historico de {selectedTicker || 'ativo'}</DialogTitle>
          </DialogHeader>

          {historyLoading && (
            <div className="flex items-center justify-center h-72">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          )}

          {!historyLoading && historyError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {historyError}
            </div>
          )}

          {!historyLoading && !historyError && historyData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Preco atual</p>
                  <p className="text-xl font-semibold">{formatCurrency(historyData.preco_atual)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Minima 52 semanas</p>
                  <p className="text-xl font-semibold">{formatCurrency(historyData.minima_52_semanas)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Maxima 52 semanas</p>
                  <p className="text-xl font-semibold">{formatCurrency(historyData.maxima_52_semanas)}</p>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="mb-3">
                  <p className="font-medium text-gray-900">Comparacao de preco historico</p>
                  <p className="text-sm text-gray-500">
                    Use o fechamento historico para avaliar se o ativo esta mais perto das faixas baratas ou caras.
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={historySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                    <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => `R$ ${Number(value).toFixed(0)}`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="fechamento" stroke="#2563eb" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Investimentos
