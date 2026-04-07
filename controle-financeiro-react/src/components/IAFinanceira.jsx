import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, Bot, Send, Sparkles, FileText, CheckCircle2, Trash2 } from 'lucide-react'
import apiService from '../services/api'

const IA_STORAGE_KEY = 'cfapp_ia_financeira_state_v1'
const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    text: 'Sou sua IA financeira. Envie um extrato (.txt, .csv, .pdf ou .ofx) e eu preparo os lançamentos automáticos.'
  }
]

const IAFinanceira = () => {
  const [mensagens, setMensagens] = useState(INITIAL_MESSAGES)
  const [prompt, setPrompt] = useState('')
  const [arquivoNome, setArquivoNome] = useState('')
  const [lancamentos, setLancamentos] = useState([])
  const [aplicando, setAplicando] = useState(false)
  const [analisando, setAnalisando] = useState(false)
  const [resultadoAplicacao, setResultadoAplicacao] = useState(null)
  const fileRef = useRef(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(IA_STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (Array.isArray(saved.mensagens) && saved.mensagens.length > 0) setMensagens(saved.mensagens)
      if (typeof saved.prompt === 'string') setPrompt(saved.prompt)
      if (typeof saved.arquivoNome === 'string') setArquivoNome(saved.arquivoNome)
      if (Array.isArray(saved.lancamentos)) setLancamentos(saved.lancamentos)
      if (saved.resultadoAplicacao && typeof saved.resultadoAplicacao === 'object') {
        setResultadoAplicacao(saved.resultadoAplicacao)
      }
    } catch (error) {
      console.error('Erro ao restaurar estado da IA:', error)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        IA_STORAGE_KEY,
        JSON.stringify({ mensagens, prompt, arquivoNome, lancamentos, resultadoAplicacao })
      )
    } catch (error) {
      console.error('Erro ao salvar estado da IA:', error)
    }
  }, [mensagens, prompt, arquivoNome, lancamentos, resultadoAplicacao])

  const resumo = useMemo(() => {
    const receitas = lancamentos.filter((l) => l.tipo === 'receita')
    const gastos = lancamentos.filter((l) => l.tipo === 'gasto')
    const totalReceitas = receitas.reduce((acc, item) => acc + item.valor, 0)
    const totalGastos = gastos.reduce((acc, item) => acc + Math.abs(item.valor), 0)
    return {
      total: lancamentos.length,
      receitas: receitas.length,
      gastos: gastos.length,
      totalReceitas,
      totalGastos
    }
  }, [lancamentos])

  const adicionarMensagem = (role, text) => {
    setMensagens((prev) => [...prev, { role, text }])
  }

  const atualizarLancamento = (index, campo, valor) => {
    setLancamentos((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item
        if (campo === 'valor') {
          return { ...item, valor: Number(valor) || 0 }
        }
        return { ...item, [campo]: valor }
      })
    )
  }

  const removerLancamento = (index) => {
    setLancamentos((prev) => prev.filter((_, idx) => idx !== index))
  }

  const limparEstadoIA = () => {
    setMensagens(INITIAL_MESSAGES)
    setPrompt('')
    setArquivoNome('')
    setLancamentos([])
    setResultadoAplicacao(null)
    localStorage.removeItem(IA_STORAGE_KEY)
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const ext = file.name.toLowerCase().split('.').pop()
    if (!['txt', 'csv', 'pdf', 'ofx'].includes(ext)) {
      adicionarMensagem('assistant', 'Formato não suportado. Use .txt, .csv, .pdf ou .ofx.')
      return
    }

    adicionarMensagem('user', `Enviei o extrato: ${file.name}`)
    setAnalisando(true)
    try {
      const response = await apiService.analisarExtratoIA(file, prompt)
      const parsed = Array.isArray(response?.lancamentos) ? response.lancamentos : []
      setArquivoNome(file.name)
      setLancamentos(parsed)
      setResultadoAplicacao(null)

      if (parsed.length === 0) {
        adicionarMensagem('assistant', 'Não consegui reconhecer lançamentos neste arquivo.')
        return
      }

      if (response?.warning) {
        adicionarMensagem('assistant', response.warning)
      }
      adicionarMensagem(
        'assistant',
        `Analisei ${parsed.length} lançamentos via ${response?.source === 'openai' ? 'IA' : 'parser local'}. Clique em "Lançar automaticamente".`
      )
    } catch (error) {
      adicionarMensagem('assistant', 'Erro ao analisar o extrato. Verifique se o backend está rodando e tente novamente.')
    } finally {
      setAnalisando(false)
      if (fileRef.current) {
        fileRef.current.value = ''
      }
    }
  }

  const handleMensagem = () => {
    if (!prompt.trim()) return
    adicionarMensagem('user', prompt)
    adicionarMensagem('assistant', 'Posso te ajudar com o extrato. Envie um arquivo e eu preparo os lançamentos para você confirmar.')
    setPrompt('')
  }

  const aplicarLancamentos = async () => {
    if (lancamentos.length === 0) {
      adicionarMensagem('assistant', 'Ainda não há lançamentos para aplicar.')
      return
    }

    setAplicando(true)
    setResultadoAplicacao(null)
    try {
      const contas = await apiService.getContas()
      const contaPadrao = contas[0]

      let receitasCriadas = 0
      let gastosCriados = 0
      let transacoesCriadas = 0
      let falhas = 0

      for (const item of lancamentos) {
        try {
          const payloadBase = {
            descricao: item.descricao,
            valor: Number(item.valor.toFixed(2)),
            data: item.data,
            categoria: item.categoria_sugerida || 'Outros'
          }

          if (item.tipo === 'receita') {
            await apiService.createReceita({
              ...payloadBase,
              tipo: 'unica',
              recorrencia: ''
            })
            receitasCriadas += 1
          } else {
            await apiService.createGasto({
              ...payloadBase,
              tipo: 'avista',
              parcelas: 1
            })
            gastosCriados += 1
          }

          if (contaPadrao) {
            await apiService.createTransacaoConta({
              conta_id: contaPadrao.id,
              tipo: item.tipo === 'receita' ? 'entrada' : 'saida',
              valor: Number(item.valor.toFixed(2)),
              descricao: item.descricao,
              data: item.data
            })
            transacoesCriadas += 1
          }
        } catch (error) {
          falhas += 1
        }
      }

      const resumoAplicacao = { receitasCriadas, gastosCriados, transacoesCriadas, falhas }
      setResultadoAplicacao(resumoAplicacao)
      adicionarMensagem(
        'assistant',
        `Importação concluída. Receitas: ${receitasCriadas}, gastos: ${gastosCriados}, transações em conta: ${transacoesCriadas}, falhas: ${falhas}.`
      )
    } finally {
      setAplicando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-transparent">
          IA Financeira
        </h1>
        <p className="text-gray-600">Importe um extrato e lance automaticamente em receitas, gastos e contas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-cyan-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="w-5 h-5" />
              Chat da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[420px] overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-cyan-50/50 to-white">
              {mensagens.map((m, idx) => (
                <div key={`${m.role}-${idx}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white border border-cyan-100 text-gray-700 rounded-bl-md'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-cyan-100 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                  onClick={() => fileRef.current?.click()}
                  disabled={analisando}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {analisando ? 'Analisando...' : 'Enviar extrato'}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.csv,.pdf,.ofx"
                  className="hidden"
                  onChange={handleUpload}
                />
                {arquivoNome && (
                  <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
                    <FileText className="w-3 h-3 mr-1" />
                    {arquivoNome}
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={limparEstadoIA}
                >
                  Limpar conversa/importação
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: classifique por categorias e aplique automaticamente"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleMensagem()
                  }}
                />
                <Button onClick={handleMensagem} className="bg-cyan-600 hover:bg-cyan-700">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Sparkles className="w-5 h-5" />
              Prévia da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-green-50 border border-green-100 p-3">
                <p className="text-xs text-green-700">Receitas</p>
                <p className="text-xl font-bold text-green-700">{resumo.receitas}</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                <p className="text-xs text-red-700">Gastos</p>
                <p className="text-xl font-bold text-red-700">{resumo.gastos}</p>
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <p className="text-xs text-blue-700">Total encontrado</p>
              <p className="text-2xl font-bold text-blue-800">{resumo.total}</p>
            </div>
            <Button
              onClick={aplicarLancamentos}
              disabled={aplicando || analisando || lancamentos.length === 0}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800"
            >
              {analisando ? 'Analisando extrato...' : aplicando ? 'Aplicando...' : 'Lançar automaticamente'}
            </Button>

            {resultadoAplicacao && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Importação concluída
                </div>
                <p>Receitas: {resultadoAplicacao.receitasCriadas}</p>
                <p>Gastos: {resultadoAplicacao.gastosCriados}</p>
                <p>Transações: {resultadoAplicacao.transacoesCriadas}</p>
                <p>Falhas: {resultadoAplicacao.falhas}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-cyan-100 shadow-lg">
        <CardHeader>
          <CardTitle className="text-cyan-900">Pré-visualizar e editar lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {lancamentos.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum lançamento carregado.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="w-[70px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentos.map((item, idx) => (
                    <TableRow key={`${item.data}-${idx}`}>
                      <TableCell>
                        <Input
                          type="date"
                          value={item.data || ''}
                          onChange={(e) => atualizarLancamento(idx, 'data', e.target.value)}
                          className="min-w-[150px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.descricao || ''}
                          onChange={(e) => atualizarLancamento(idx, 'descricao', e.target.value)}
                          className="min-w-[240px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.valor ?? 0}
                          onChange={(e) => atualizarLancamento(idx, 'valor', e.target.value)}
                          className="min-w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={item.tipo || 'gasto'}
                          onChange={(e) => atualizarLancamento(idx, 'tipo', e.target.value)}
                          className="h-10 min-w-[110px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                        >
                          <option value="receita">Receita</option>
                          <option value="gasto">Gasto</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.categoria_sugerida || ''}
                          onChange={(e) => atualizarLancamento(idx, 'categoria_sugerida', e.target.value)}
                          className="min-w-[160px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => removerLancamento(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default IAFinanceira

