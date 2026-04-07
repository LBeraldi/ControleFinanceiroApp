import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Plus, Edit, Trash2, Target, Calendar, DollarSign, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

import apiService from '../services/api'
const Metas = () => {
  const [metas, setMetas] = useState([])
  const [contribuicoes, setContribuicoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isContribuicaoDialogOpen, setIsContribuicaoDialogOpen] = useState(false)
  const [editingMeta, setEditingMeta] = useState(null)
  const [metaSelecionada, setMetaSelecionada] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todas')
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor_objetivo: '',
    valor_atual: '0',
    data_inicio: new Date().toISOString().split('T')[0],
    data_limite: '',
    categoria: 'economia',
    prioridade: 'media'
  })
  const [formContribuicao, setFormContribuicao] = useState({
    meta_id: '',
    valor: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadMetas()
  }, [])

  const loadMetas = async () => {
    try {
      setLoading(true)
      const data = await apiService.getMetas()
      setMetas(data)
      setContribuicoes([])
    } catch (error) {
      console.error('Erro ao carregar metas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      nome: formData.nome,
      descricao: formData.descricao,
      valor_objetivo: parseFloat(formData.valor_objetivo),
      valor_atual: parseFloat(formData.valor_atual),
      data_inicio: formData.data_inicio,
      data_limite: formData.data_limite,
      categoria: formData.categoria,
      prioridade: formData.prioridade,
      status: parseFloat(formData.valor_atual) >= parseFloat(formData.valor_objetivo) ? 'concluida' : 'ativa'
    }

    try {
      if (editingMeta) {
        await apiService.updateMeta(editingMeta.id, payload)
      } else {
        await apiService.createMeta(payload)
      }
      await loadMetas()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Erro ao salvar meta:', error)
    }
  }

  const handleContribuicaoSubmit = async (e) => {
    e.preventDefault()
    const novaContribuicao = {
      id: Date.now(),
      meta_id: parseInt(formContribuicao.meta_id),
      valor: parseFloat(formContribuicao.valor),
      descricao: formContribuicao.descricao,
      data: formContribuicao.data
    }

    const metaAtualizada = metas.find(m => m.id === novaContribuicao.meta_id)
    if (!metaAtualizada) {
      return
    }

    const novoValor = metaAtualizada.valor_atual + novaContribuicao.valor
    const novoStatus = novoValor >= metaAtualizada.valor_objetivo ? 'concluida' : 'ativa'

    try {
      await apiService.updateMeta(metaAtualizada.id, {
        ...metaAtualizada,
        valor_atual: novoValor,
        status: novoStatus
      })
      await loadMetas()
      setContribuicoes([...contribuicoes, novaContribuicao])
      resetContribuicaoForm()
      setIsContribuicaoDialogOpen(false)
    } catch (error) {
      console.error('Erro ao salvar contribuição:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta?')) {
      try {
        await apiService.deleteMeta(id)
        await loadMetas()
        setContribuicoes(contribuicoes.filter(item => item.meta_id !== id))
      } catch (error) {
        console.error('Erro ao excluir meta:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      valor_objetivo: '',
      valor_atual: '0',
      data_inicio: new Date().toISOString().split('T')[0],
      data_limite: '',
      categoria: 'economia',
      prioridade: 'media'
    })
    setEditingMeta(null)
  }

  const resetContribuicaoForm = () => {
    setFormContribuicao({
      meta_id: '',
      valor: '',
      descricao: '',
      data: new Date().toISOString().split('T')[0]
    })
  }

  const openEditDialog = (meta) => {
    setEditingMeta(meta)
    setFormData({
      nome: meta.nome,
      descricao: meta.descricao,
      valor_objetivo: meta.valor_objetivo.toString(),
      valor_atual: meta.valor_atual.toString(),
      data_inicio: meta.data_inicio,
      data_limite: meta.data_limite,
      categoria: meta.categoria,
      prioridade: meta.prioridade
    })
    setIsDialogOpen(true)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const calcularProgresso = (valorAtual, valorObjetivo) => {
    return Math.min((valorAtual / valorObjetivo) * 100, 100)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'ativa':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'atrasada':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Target className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      ativa: { label: 'Ativa', variant: 'default' },
      concluida: { label: 'Concluída', variant: 'success' },
      atrasada: { label: 'Atrasada', variant: 'destructive' },
      pausada: { label: 'Pausada', variant: 'secondary' }
    }
    const config = statusConfig[status] || statusConfig.ativa
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPrioridadeCor = (prioridade) => {
    const cores = {
      alta: 'from-red-500 to-red-600',
      media: 'from-yellow-500 to-yellow-600',
      baixa: 'from-green-500 to-green-600'
    }
    return cores[prioridade] || 'from-gray-500 to-gray-600'
  }

  const getCategoriaNome = (categoria) => {
    const categorias = {
      economia: 'Economia',
      lazer: 'Lazer',
      bens: 'Bens',
      educacao: 'Educação',
      saude: 'Saúde',
      investimento: 'Investimento'
    }
    return categorias[categoria] || categoria
  }

  // Filtros
  const metasFiltradas = metas.filter(meta => {
    if (filtroStatus === 'todas') return true
    return meta.status === filtroStatus
  })

  // Cálculos
  const totalMetas = metas.length
  const metasConcluidas = metas.filter(m => m.status === 'concluida').length
  const metasAtivas = metas.filter(m => m.status === 'ativa').length
  const valorTotalObjetivos = metas.reduce((sum, meta) => sum + meta.valor_objetivo, 0)
  const valorTotalAlcancado = metas.reduce((sum, meta) => sum + meta.valor_atual, 0)

  const metasPorCategoria = metas.reduce((acc, meta) => {
    const categoria = getCategoriaNome(meta.categoria)
    acc[categoria] = (acc[categoria] || 0) + 1
    return acc
  }, {})

  const dadosGraficoCategoria = Object.entries(metasPorCategoria).map(([categoria, quantidade]) => ({
    name: categoria,
    value: quantidade,
    color: `#${Math.floor(Math.random()*16777215).toString(16)}`
  }))

  const progressoGeral = valorTotalObjetivos > 0 ? (valorTotalAlcancado / valorTotalObjetivos) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Metas Financeiras
          </h1>
          <p className="text-gray-600">Defina e acompanhe seus objetivos financeiros</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isContribuicaoDialogOpen} onOpenChange={setIsContribuicaoDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetContribuicaoForm} variant="outline" className="border-green-200 text-green-600 hover:bg-green-50">
                <DollarSign className="w-4 h-4 mr-2" />
                Adicionar Contribuição
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-blue-900">Nova Contribuição</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleContribuicaoSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="metaContribuicao">Meta</Label>
                  <Select value={formContribuicao.meta_id} onValueChange={(value) => setFormContribuicao({ ...formContribuicao, meta_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma meta" />
                    </SelectTrigger>
                    <SelectContent>
                      {metas.filter(m => m.status === 'ativa').map((meta) => (
                        <SelectItem key={meta.id} value={meta.id.toString()}>
                          {meta.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="valorContribuicao">Valor</Label>
                  <Input
                    id="valorContribuicao"
                    type="number"
                    step="0.01"
                    value={formContribuicao.valor}
                    onChange={(e) => setFormContribuicao({ ...formContribuicao, valor: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="descricaoContribuicao">Descrição</Label>
                  <Input
                    id="descricaoContribuicao"
                    value={formContribuicao.descricao}
                    onChange={(e) => setFormContribuicao({ ...formContribuicao, descricao: e.target.value })}
                    placeholder="Ex: Depósito mensal"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataContribuicao">Data</Label>
                  <Input
                    id="dataContribuicao"
                    type="date"
                    value={formContribuicao.data}
                    onChange={(e) => setFormContribuicao({ ...formContribuicao, data: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                  Adicionar Contribuição
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-blue-900">
                  {editingMeta ? 'Editar Meta' : 'Nova Meta'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Meta</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Reserva de Emergência"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva sua meta..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valor_objetivo">Valor Objetivo</Label>
                    <Input
                      id="valor_objetivo"
                      type="number"
                      step="0.01"
                      value={formData.valor_objetivo}
                      onChange={(e) => setFormData({ ...formData, valor_objetivo: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="valor_atual">Valor Atual</Label>
                    <Input
                      id="valor_atual"
                      type="number"
                      step="0.01"
                      value={formData.valor_atual}
                      onChange={(e) => setFormData({ ...formData, valor_atual: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="data_inicio">Data Início</Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="data_limite">Data Limite</Label>
                    <Input
                      id="data_limite"
                      type="date"
                      value={formData.data_limite}
                      onChange={(e) => setFormData({ ...formData, data_limite: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economia">Economia</SelectItem>
                        <SelectItem value="lazer">Lazer</SelectItem>
                        <SelectItem value="bens">Bens</SelectItem>
                        <SelectItem value="educacao">Educação</SelectItem>
                        <SelectItem value="saude">Saúde</SelectItem>
                        <SelectItem value="investimento">Investimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select value={formData.prioridade} onValueChange={(value) => setFormData({ ...formData, prioridade: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  {editingMeta ? 'Atualizar' : 'Criar Meta'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total de Metas</CardTitle>
            <Target className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetas}</div>
            <p className="text-xs opacity-75 mt-1">
              Metas criadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Metas Concluídas</CardTitle>
            <CheckCircle className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metasConcluidas}</div>
            <p className="text-xs opacity-75 mt-1">
              {totalMetas > 0 ? Math.round((metasConcluidas / totalMetas) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Metas Ativas</CardTitle>
            <Clock className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metasAtivas}</div>
            <p className="text-xs opacity-75 mt-1">
              Em andamento
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Progresso Geral</CardTitle>
            <TrendingUp className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressoGeral.toFixed(1)}%</div>
            <p className="text-xs opacity-75 mt-1">
              {formatCurrency(valorTotalAlcancado)} de {formatCurrency(valorTotalObjetivos)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="shadow-lg border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div>
              <Label htmlFor="filtroStatus">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as metas</SelectItem>
                  <SelectItem value="ativa">Ativas</SelectItem>
                  <SelectItem value="concluida">Concluídas</SelectItem>
                  <SelectItem value="atrasada">Atrasadas</SelectItem>
                  <SelectItem value="pausada">Pausadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards das Metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metasFiltradas.map((meta) => {
          const progresso = calcularProgresso(meta.valor_atual, meta.valor_objetivo)
          const faltam = meta.valor_objetivo - meta.valor_atual
          
          return (
            <Card key={meta.id} className="shadow-lg border-blue-100 hover:shadow-xl transition-shadow">
              <CardHeader className={`bg-gradient-to-r ${getPrioridadeCor(meta.prioridade)} text-white rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(meta.status)}
                    <div>
                      <CardTitle className="text-lg">{meta.nome}</CardTitle>
                      <p className="text-sm opacity-90">{getCategoriaNome(meta.categoria)}</p>
                    </div>
                  </div>
                  {getStatusBadge(meta.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Progresso</p>
                    <Progress value={progresso} className="h-3" />
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">{progresso.toFixed(1)}%</span>
                      <span className="text-gray-600">
                        {formatCurrency(meta.valor_atual)} / {formatCurrency(meta.valor_objetivo)}
                      </span>
                    </div>
                  </div>
                  
                  {meta.status !== 'concluida' && (
                    <div>
                      <p className="text-sm text-gray-600">Faltam</p>
                      <p className="text-lg font-semibold text-blue-600">{formatCurrency(faltam)}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-600">Prazo</p>
                    <p className="text-sm text-gray-800">
                      {new Date(meta.data_limite).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {meta.descricao && (
                    <div>
                      <p className="text-sm text-gray-600">Descrição</p>
                      <p className="text-sm text-gray-800">{meta.descricao}</p>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(meta)}
                      className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(meta.id)}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Metas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosGraficoCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosGraficoCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dadosGraficoCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Nenhuma meta encontrada
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Progresso das Metas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metas.filter(m => m.status === 'ativa').map((meta) => {
                const progresso = calcularProgresso(meta.valor_atual, meta.valor_objetivo)
                return (
                  <div key={meta.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{meta.nome}</span>
                      <span className="text-gray-600">{progresso.toFixed(1)}%</span>
                    </div>
                    <Progress value={progresso} className="h-2" />
                  </div>
                )
              })}
              {metas.filter(m => m.status === 'ativa').length === 0 && (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  Nenhuma meta ativa
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Metas


