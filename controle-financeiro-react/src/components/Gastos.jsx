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
import { Plus, Edit, Trash2, TrendingDown, Calendar, CreditCard, Filter, Search } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import apiService from '../services/api'

const Gastos = () => {
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGasto, setEditingGasto] = useState(null)
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroMes, setFiltroMes] = useState('todos')
  const [busca, setBusca] = useState('')
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    categoria_id: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'avista',
    parcelas: '1',
    observacoes: ''
  })

  useEffect(() => {
    loadGastosData()
  }, [])

  const loadGastosData = async () => {
    try {
      setLoading(true)
      const [gastosData, categoriasData] = await Promise.all([
        apiService.getGastos(),
        apiService.getCategorias()
      ])
      setGastos(gastosData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Erro ao carregar gastos:', error)
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
      parcelas: parseInt(formData.parcelas),
      observacoes: formData.observacoes
    }

    try {
      if (editingGasto) {
        await apiService.updateGasto(editingGasto.id, payload)
      } else {
        await apiService.createGasto(payload)
      }
      await loadGastosData()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Erro ao salvar gasto:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este gasto?')) {
      try {
        await apiService.deleteGasto(id)
        await loadGastosData()
      } catch (error) {
        console.error('Erro ao excluir gasto:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      descricao: '',
      valor: '',
      categoria_id: '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'avista',
      parcelas: '1',
      observacoes: ''
    })
    setEditingGasto(null)
  }

  const openEditDialog = (gasto) => {
    const categoriaId = gasto.categoria_id
      ?? categorias.find(c => c.nome === gasto.categoria)?.id
      ?? ''
    setEditingGasto(gasto)
    setFormData({
      descricao: gasto.descricao,
      valor: gasto.valor.toString(),
      categoria_id: categoriaId.toString(),
      data: gasto.data,
      tipo: gasto.tipo,
      parcelas: gasto.parcelas.toString(),
      observacoes: gasto.observacoes
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
  const gastosFiltrados = gastos.filter(gasto => {
    const categoriaFiltroId = parseInt(filtroCategoria)
    const categoriaFiltroNome = categorias.find(c => c.id === categoriaFiltroId)?.nome
    const matchCategoria = filtroCategoria === 'todas'
      || gasto.categoria_id === categoriaFiltroId
      || gasto.categoria === categoriaFiltroNome
    const matchMes = filtroMes === 'todos' || gasto.data.startsWith(filtroMes)
    const matchBusca = gasto.descricao.toLowerCase().includes(busca.toLowerCase())
    return matchCategoria && matchMes && matchBusca
  })

  // Cálculos
  const totalGastos = gastosFiltrados.reduce((sum, gasto) => sum + gasto.valor, 0)
  const gastosPorCategoria = categorias.map(categoria => ({
    name: categoria.nome,
    value: gastosFiltrados
      .filter(gasto => gasto.categoria_id === categoria.id || gasto.categoria === categoria.nome)
      .reduce((sum, gasto) => sum + gasto.valor, 0),
    color: categoria.cor
  })).filter(item => item.value > 0)

  const gastosPorMes = gastosFiltrados.reduce((acc, gasto) => {
    const mes = gasto.data.substring(0, 7)
    acc[mes] = (acc[mes] || 0) + gasto.valor
    return acc
  }, {})

  const dadosGraficoMensal = Object.entries(gastosPorMes).map(([mes, valor]) => ({
    mes: new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
    valor
  }))

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
            Controle de Gastos
          </h1>
          <p className="text-gray-600">Gerencie e acompanhe seus gastos mensais</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Novo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-blue-900">
                {editingGasto ? 'Editar Gasto' : 'Novo Gasto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Supermercado"
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
                <Label htmlFor="tipo">Tipo de Pagamento</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avista">À Vista</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.tipo === 'parcelado' && (
                <div>
                  <Label htmlFor="parcelas">Número de Parcelas</Label>
                  <Input
                    id="parcelas"
                    type="number"
                    min="2"
                    max="24"
                    value={formData.parcelas}
                    onChange={(e) => setFormData({ ...formData, parcelas: e.target.value })}
                    required
                  />
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
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                {editingGasto ? 'Atualizar' : 'Adicionar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total de Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalGastos)}</div>
            <p className="text-xs opacity-75 mt-1">
              {gastosFiltrados.length} transações
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Média por Gasto</CardTitle>
            <Calendar className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(gastosFiltrados.length > 0 ? totalGastos / gastosFiltrados.length : 0)}
            </div>
            <p className="text-xs opacity-75 mt-1">
              Valor médio
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Maior Gasto</CardTitle>
            <CreditCard className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(gastosFiltrados.length > 0 ? Math.max(...gastosFiltrados.map(g => g.valor)) : 0)}
            </div>
            <p className="text-xs opacity-75 mt-1">
              Maior valor
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Categorias Ativas</CardTitle>
            <Filter className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gastosPorCategoria.length}</div>
            <p className="text-xs opacity-75 mt-1">
              Com gastos
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-blue-900">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {gastosPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Nenhum gasto encontrado
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
                <BarChart data={dadosGraficoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="mes" stroke="#6366f1" />
                  <YAxis stroke="#6366f1" />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="valor" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Gastos */}
      <Card className="shadow-lg border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">Lista de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {gastosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum gasto encontrado. Adicione seu primeiro gasto!
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
                {gastosFiltrados.map((gasto) => (
                  <TableRow key={gasto.id} className="hover:bg-blue-50">
                    <TableCell className="font-medium">{gasto.descricao}</TableCell>
                    <TableCell>
                      <Badge 
                        style={{ backgroundColor: getCategoriaCor(gasto.categoria_id) }}
                        className="text-white"
                      >
                        {getCategoriaNome(gasto.categoria_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {formatCurrency(gasto.valor)}
                    </TableCell>
                    <TableCell>
                      {new Date(gasto.data).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={gasto.tipo === 'avista' ? 'default' : 'secondary'}>
                        {gasto.tipo === 'avista' ? 'À Vista' : `${gasto.parcelas}x`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(gasto)}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(gasto.id)}
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

export default Gastos

