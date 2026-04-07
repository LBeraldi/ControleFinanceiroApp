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
import { Plus, Edit, Trash2, CreditCard, Building, Wallet, ArrowUpDown, TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import apiService from '../services/api'

const Contas = () => {
  const [contas, setContas] = useState([])
  const [transacoes, setTransacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTransacaoDialogOpen, setIsTransacaoDialogOpen] = useState(false)
  const [editingConta, setEditingConta] = useState(null)
  const [contaSelecionada, setContaSelecionada] = useState(null)
  const [mostrarSaldos, setMostrarSaldos] = useState(true)
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'corrente',
    banco: '',
    saldo_inicial: '',
    observacoes: ''
  })
  const [formTransacao, setFormTransacao] = useState({
    conta_id: '',
    tipo: 'entrada',
    valor: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0]
  })
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([loadContas(), loadTransacoes()])
  }

  const loadContas = async () => {
    try {
      setLoading(true)
      const data = await apiService.getContas()
      setContas(data)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransacoes = async () => {
    try {
      const data = await apiService.getTransacoesConta()
      setTransacoes(data)
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
    }
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    const contaPayload = {
      nome: formData.nome,
      tipo: formData.tipo,
      banco: formData.banco,
      saldo_inicial: parseFloat(formData.saldo_inicial),
      observacoes: formData.observacoes
    }

    try {
      if (editingConta) {
        await apiService.updateConta(editingConta.id, contaPayload)
      } else {
        await apiService.createConta(contaPayload)
      }
      await loadContas()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Erro ao salvar conta:', error)
    }
  }

  const handleTransacaoSubmit = async (e) => {
    e.preventDefault()

    const novaTransacao = {
      conta_id: parseInt(formTransacao.conta_id),
      tipo: formTransacao.tipo,
      valor: parseFloat(formTransacao.valor),
      descricao: formTransacao.descricao,
      data: formTransacao.data
    }

    try {
      await apiService.createTransacaoConta(novaTransacao)
      await loadData()
      resetTransacaoForm()
      setIsTransacaoDialogOpen(false)
    } catch (error) {
      console.error('Erro ao salvar transação:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      try {
        await apiService.deleteConta(id)
        await loadContas()
        setTransacoes(transacoes.filter(item => item.conta_id !== id))
      } catch (error) {
        console.error('Erro ao excluir conta:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'corrente',
      banco: '',
      saldo_inicial: '',
      observacoes: ''
    })
    setEditingConta(null)
  }

  const resetTransacaoForm = () => {
    setFormTransacao({
      conta_id: '',
      tipo: 'entrada',
      valor: '',
      descricao: '',
      data: new Date().toISOString().split('T')[0]
    })
  }

  const openEditDialog = (conta) => {
    setEditingConta(conta)
    setFormData({
      nome: conta.nome,
      tipo: conta.tipo,
      banco: conta.banco,
      saldo_inicial: conta.saldo_inicial.toString(),
      observacoes: conta.observacoes
    })
    setIsDialogOpen(true)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'corrente':
        return <Building className="w-5 h-5" />
      case 'poupanca':
        return <Wallet className="w-5 h-5" />
      case 'credito':
        return <CreditCard className="w-5 h-5" />
      case 'investimento':
        return <TrendingUp className="w-5 h-5" />
      default:
        return <Building className="w-5 h-5" />
    }
  }

  const getTipoNome = (tipo) => {
    const tipos = {
      corrente: 'Conta Corrente',
      poupanca: 'Poupança',
      credito: 'Cartão de Crédito',
      investimento: 'Investimentos'
    }
    return tipos[tipo] || tipo
  }

  const getTipoCor = (tipo) => {
    const cores = {
      corrente: 'from-blue-500 to-blue-600',
      poupanca: 'from-green-500 to-green-600',
      credito: 'from-red-500 to-red-600',
      investimento: 'from-purple-500 to-purple-600'
    }
    return cores[tipo] || 'from-gray-500 to-gray-600'
  }

  // Cálculos
  const totalPatrimonio = contas.reduce((sum, conta) => sum + conta.saldo_atual, 0)
  const totalPositivo = contas.filter(c => c.saldo_atual > 0).reduce((sum, conta) => sum + conta.saldo_atual, 0)
  const totalNegativo = Math.abs(contas.filter(c => c.saldo_atual < 0).reduce((sum, conta) => sum + conta.saldo_atual, 0))

  const dadosGrafico = contas.filter(c => c.saldo_atual !== 0).map(conta => ({
    name: conta.nome,
    value: Math.abs(conta.saldo_atual),
    color: conta.saldo_atual >= 0 ? '#10b981' : '#ef4444'
  }))

  const transacoesPorTipo = [
    { name: 'Entradas', value: transacoes.filter(t => t.tipo === 'entrada').reduce((sum, t) => sum + t.valor, 0), color: '#10b981' },
    { name: 'Saídas', value: transacoes.filter(t => t.tipo === 'saida').reduce((sum, t) => sum + t.valor, 0), color: '#ef4444' }
  ]

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
            Gestão de Contas
          </h1>
          <p className="text-gray-600">Controle suas contas bancárias e movimentações</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setMostrarSaldos(!mostrarSaldos)}
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            {mostrarSaldos ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {mostrarSaldos ? 'Ocultar Saldos' : 'Mostrar Saldos'}
          </Button>
          <Dialog open={isTransacaoDialogOpen} onOpenChange={setIsTransacaoDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetTransacaoForm} variant="outline" className="border-green-200 text-green-600 hover:bg-green-50">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-blue-900">Nova Transação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTransacaoSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="conta">Conta</Label>
                  <Select value={formTransacao.conta_id} onValueChange={(value) => setFormTransacao({ ...formTransacao, conta_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id.toString()}>
                          {conta.nome} - {getTipoNome(conta.tipo)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tipoTransacao">Tipo</Label>
                  <Select value={formTransacao.tipo} onValueChange={(value) => setFormTransacao({ ...formTransacao, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="valorTransacao">Valor</Label>
                  <Input
                    id="valorTransacao"
                    type="number"
                    step="0.01"
                    value={formTransacao.valor}
                    onChange={(e) => setFormTransacao({ ...formTransacao, valor: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="descricaoTransacao">Descrição</Label>
                  <Input
                    id="descricaoTransacao"
                    value={formTransacao.descricao}
                    onChange={(e) => setFormTransacao({ ...formTransacao, descricao: e.target.value })}
                    placeholder="Ex: Depósito salário"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataTransacao">Data</Label>
                  <Input
                    id="dataTransacao"
                    type="date"
                    value={formTransacao.data}
                    onChange={(e) => setFormTransacao({ ...formTransacao, data: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                  Adicionar Transação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-blue-900">
                  {editingConta ? 'Editar Conta' : 'Nova Conta'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Conta</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Conta Corrente Principal"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo de Conta</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                      <SelectItem value="credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="investimento">Investimentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="banco">Banco/Instituição</Label>
                  <Input
                    id="banco"
                    value={formData.banco}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    placeholder="Ex: Banco do Brasil"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="saldo_inicial">Saldo Inicial</Label>
                  <Input
                    id="saldo_inicial"
                    type="number"
                    step="0.01"
                    value={formData.saldo_inicial}
                    onChange={(e) => setFormData({ ...formData, saldo_inicial: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
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
                  {editingConta ? 'Atualizar' : 'Adicionar'}
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
            <CardTitle className="text-sm font-medium opacity-90">Patrimônio Total</CardTitle>
            <Wallet className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mostrarSaldos ? formatCurrency(totalPatrimonio) : '••••••'}
            </div>
            <p className="text-xs opacity-75 mt-1">
              {contas.length} contas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Saldos Positivos</CardTitle>
            <TrendingUp className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mostrarSaldos ? formatCurrency(totalPositivo) : '••••••'}
            </div>
            <p className="text-xs opacity-75 mt-1">
              Ativos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Saldos Negativos</CardTitle>
            <TrendingDown className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mostrarSaldos ? formatCurrency(totalNegativo) : '••••••'}
            </div>
            <p className="text-xs opacity-75 mt-1">
              Passivos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Transações</CardTitle>
            <ArrowUpDown className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transacoes.length}</div>
            <p className="text-xs opacity-75 mt-1">
              Este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards das Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contas.map((conta) => (
          <Card key={conta.id} className="shadow-lg border-blue-100 hover:shadow-xl transition-shadow">
            <CardHeader className={`bg-gradient-to-r ${getTipoCor(conta.tipo)} text-white rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getTipoIcon(conta.tipo)}
                  <div>
                    <CardTitle className="text-lg">{conta.nome}</CardTitle>
                    <p className="text-sm opacity-90">{conta.banco}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {getTipoNome(conta.tipo)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Saldo Atual</p>
                  <p className={`text-2xl font-bold ${conta.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {mostrarSaldos ? formatCurrency(conta.saldo_atual) : '••••••'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Saldo Inicial</p>
                  <p className="text-lg text-gray-800">
                    {mostrarSaldos ? formatCurrency(conta.saldo_inicial) : '••••••'}
                  </p>
                </div>
                {conta.observacoes && (
                  <div>
                    <p className="text-sm text-gray-600">Observações</p>
                    <p className="text-sm text-gray-800">{conta.observacoes}</p>
                  </div>
                )}
                <div className="flex space-x-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(conta)}
                    className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(conta.id)}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Distribuição por Conta</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosGrafico}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dadosGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Nenhuma conta com saldo
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Entradas vs Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transacoesPorTipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="name" stroke="#6366f1" />
                <YAxis stroke="#6366f1" />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {transacoesPorTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Últimas Transações */}
      <Card className="shadow-lg border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">Últimas Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {transacoes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma transação encontrada. Adicione sua primeira transação!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transacoes.slice(-10).reverse().map((transacao) => {
                  const conta = contas.find(c => c.id === transacao.conta_id)
                  return (
                    <TableRow key={transacao.id} className="hover:bg-blue-50">
                      <TableCell className="font-medium">
                        {conta ? conta.nome : 'Conta não encontrada'}
                      </TableCell>
                      <TableCell>{transacao.descricao}</TableCell>
                      <TableCell>
                        <Badge variant={transacao.tipo === 'entrada' ? 'default' : 'destructive'}>
                          {transacao.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`font-semibold ${transacao.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {transacao.tipo === 'entrada' ? '+' : '-'}{formatCurrency(transacao.valor)}
                      </TableCell>
                      <TableCell>
                        {new Date(transacao.data).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Contas



