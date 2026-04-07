import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, TrendingUp, Calendar, DollarSign, Filter, Search, Repeat } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

import apiService from '../services/api'
const Receitas = () => {
  const [receitas, setReceitas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingReceita, setEditingReceita] = useState(null)
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroMes, setFiltroMes] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    categoria_id: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'unica',
    recorrencia: 'mensal',
    observacoes: ''
  })

  useEffect(() => {
    loadReceitasData()
  }, [])

  const loadReceitasData = async () => {
    try {
      setLoading(true)
      const [receitasData, categoriasData] = await Promise.all([
        apiService.getReceitas(),
        apiService.getCategorias()
      ])
      setReceitas(receitasData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Erro ao carregar receitas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const categoriaId = parseInt(formData.categoria_id)
    const categoriaSelecionada = categorias.find(c => c.id === categoriaId)
    const payload = {
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      categoria_id: categoriaId,
      categoria: categoriaSelecionada?.nome || 'Outros',
      data: formData.data,
      tipo: formData.tipo,
      recorrencia: formData.tipo === 'recorrente' ? formData.recorrencia : '',
      observacoes: formData.observacoes
    }

    try {
      if (editingReceita) {
        await apiService.updateReceita(editingReceita.id, payload)
      } else {
        await apiService.createReceita(payload)
      }
      await loadReceitasData()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Erro ao salvar receita:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta receita?')) {
      try {
        await apiService.deleteReceita(id)
        await loadReceitasData()
      } catch (error) {
        console.error('Erro ao excluir receita:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      descricao: '',
      valor: '',
      categoria_id: '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'unica',
      recorrencia: 'mensal',
      observacoes: ''
    })
    setEditingReceita(null)
  }

  const openEditDialog = (receita) => {
    const categoriaId = receita.categoria_id
      ?? categorias.find(c => c.nome === receita.categoria)?.id
      ?? ''
    setEditingReceita(receita)
    setFormData({
      descricao: receita.descricao,
      valor: receita.valor.toString(),
      categoria_id: categoriaId.toString(),
      data: receita.data,
      tipo: receita.tipo,
      recorrencia: receita.recorrencia || 'mensal',
      observacoes: receita.observacoes
    })
    setIsDialogOpen(true)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getCategoriaNome = (categoriaId) => {
    if (typeof categoriaId === 'string') return categoriaId
    const categoria = categorias.find(c => c.id === categoriaId)
    return categoria ? categoria.nome : 'Sem categoria'
  }

  const getCategoriaCor = (categoriaId) => {
    const categoria = typeof categoriaId === 'string'
      ? categorias.find(c => c.nome === categoriaId)
      : categorias.find(c => c.id === categoriaId)
    return categoria ? categoria.cor : '#6B7280'
  }

  // Filtros
  const receitasFiltradas = receitas.filter(receita => {
    const categoriaFiltroId = parseInt(filtroCategoria)
    const categoriaFiltroNome = categorias.find(c => c.id === categoriaFiltroId)?.nome
    const matchCategoria = filtroCategoria === 'todas'
      || receita.categoria_id === categoriaFiltroId
      || receita.categoria === categoriaFiltroNome
    const matchMes = filtroMes === 'todos' || receita.data.startsWith(filtroMes)
    const matchTipo = filtroTipo === 'todos' || receita.tipo === filtroTipo
    const matchBusca = receita.descricao.toLowerCase().includes(busca.toLowerCase())
    return matchCategoria && matchMes && matchTipo && matchBusca
  })

  // Cálculos
  const totalReceitas = receitasFiltradas.reduce((sum, receita) => sum + receita.valor, 0)
  const receitasRecorrentes = receitasFiltradas.filter(r => r.tipo === 'recorrente').reduce((sum, receita) => sum + receita.valor, 0)
  const receitasUnicas = receitasFiltradas.filter(r => r.tipo === 'unica').reduce((sum, receita) => sum + receita.valor, 0)

  const receitasPorCategoria = categorias.map(categoria => ({
    name: categoria.nome,
    value: receitasFiltradas
      .filter(receita => receita.categoria_id === categoria.id || receita.categoria === categoria.nome)
      .reduce((sum, receita) => sum + receita.valor, 0),
    color: categoria.cor
  })).filter(item => item.value > 0)

  const receitasPorMes = receitasFiltradas.reduce((acc, receita) => {
    const mes = receita.data.substring(0, 7)
    acc[mes] = (acc[mes] || 0) + receita.valor
    return acc
  }, {})

  const dadosGraficoMensal = Object.entries(receitasPorMes).map(([mes, valor]) => ({
    mes: new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
    valor
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Controle de Receitas
          </h1>
          <p className="text-gray-600">Gerencie e acompanhe suas receitas mensais</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Nova Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-blue-900">
                {editingReceita ? 'Editar Receita' : 'Nova Receita'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Salário CLT"
                  required
                />
              </div>
              <div>
                <Label htmlFor="valor">Valor</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select value={formData.categoria_id} onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: categoria.cor }}
                          />
                          <span>{categoria.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de Receita</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unica">Única</SelectItem>
                    <SelectItem value="recorrente">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.tipo === 'recorrente' && (
                <div>
                  <Label htmlFor="recorrencia">Recorrência</Label>
                  <Select value={formData.recorrencia} onValueChange={(value) => setFormData({ ...formData, recorrencia: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações adicionais (opcional)"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                {editingReceita ? 'Atualizar' : 'Adicionar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total de Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceitas)}</div>
            <p className="text-xs opacity-75 mt-1">
              {receitasFiltradas.length} receitas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Receitas Recorrentes</CardTitle>
            <Repeat className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(receitasRecorrentes)}</div>
            <p className="text-xs opacity-75 mt-1">
              Renda fixa mensal
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Receitas Únicas</CardTitle>
            <DollarSign className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(receitasUnicas)}</div>
            <p className="text-xs opacity-75 mt-1">
              Renda variável
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Média por Receita</CardTitle>
            <Calendar className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(receitasFiltradas.length > 0 ? totalReceitas / receitasFiltradas.length : 0)}
            </div>
            <p className="text-xs opacity-75 mt-1">
              Valor médio
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="busca">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="busca"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por descrição..."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filtroCategoria">Categoria</Label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id.toString()}>
                      {categoria.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filtroTipo">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="unica">Única</SelectItem>
                  <SelectItem value="recorrente">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filtroMes">Mês</Label>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  <SelectItem value="2024-07">Julho 2024</SelectItem>
                  <SelectItem value="2024-06">Junho 2024</SelectItem>
                  <SelectItem value="2024-05">Maio 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFiltroCategoria('todas')
                  setFiltroMes('todos')
                  setFiltroTipo('todos')
                  setBusca('')
                }}
                className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Receitas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {receitasPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={receitasPorCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {receitasPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Nenhuma receita encontrada
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosGraficoMensal.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dadosGraficoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="mes" stroke="#10b981" />
                  <YAxis stroke="#10b981" />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="url(#greenGradient)" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2 }}
                  />
                  <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Receitas */}
      <Card className="shadow-lg border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">Lista de Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          {receitasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma receita encontrada. Adicione sua primeira receita!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitasFiltradas.map((receita) => (
                  <TableRow key={receita.id} className="hover:bg-green-50">
                    <TableCell className="font-medium">{receita.descricao}</TableCell>
                    <TableCell>
                      <Badge 
                        style={{ backgroundColor: getCategoriaCor(receita.categoria_id) }}
                        className="text-white"
                      >
                        {getCategoriaNome(receita.categoria_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(receita.valor)}
                    </TableCell>
                    <TableCell>
                      {new Date(receita.data).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={receita.tipo === 'unica' ? 'default' : 'secondary'}>
                        {receita.tipo === 'unica' ? 'Única' : `${receita.recorrencia}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(receita)}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(receita.id)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Receitas


