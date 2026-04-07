import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, CheckCircle, AlertTriangle, Clock, User, Building } from 'lucide-react'
import apiService from '../services/api'

const Devedores = () => {
  const [devedores, setDevedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDevedor, setEditingDevedor] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    valor: '',
    descricao: '',
    data_emprestimo: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    tipo_devedor: 'pessoa_fisica',
    contato: ''
  })

  useEffect(() => {
    loadDevedores()
  }, [])

  const loadDevedores = async () => {
    try {
      setLoading(true)
      const data = await apiService.getDevedores()
      setDevedores(data)
    } catch (error) {
      console.error('Erro ao carregar devedores:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingDevedor) {
        await apiService.updateDevedor(editingDevedor.id, formData)
      } else {
        await apiService.createDevedor(formData)
      }
      await loadDevedores()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Erro ao salvar devedor:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este devedor?')) {
      try {
        await apiService.deleteDevedor(id)
        await loadDevedores()
      } catch (error) {
        console.error('Erro ao excluir devedor:', error)
      }
    }
  }

  const handleMarcarPago = async (id) => {
    try {
      await apiService.marcarDevedorPago(id)
      await loadDevedores()
    } catch (error) {
      console.error('Erro ao marcar como pago:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      valor: '',
      descricao: '',
      data_emprestimo: new Date().toISOString().split('T')[0],
      data_vencimento: '',
      tipo_devedor: 'pessoa_fisica',
      contato: ''
    })
    setEditingDevedor(null)
  }

  const openEditDialog = (devedor) => {
    setEditingDevedor(devedor)
    setFormData({
      nome: devedor.nome,
      valor: devedor.valor.toString(),
      descricao: devedor.descricao || '',
      data_emprestimo: devedor.data_emprestimo,
      data_vencimento: devedor.data_vencimento || '',
      tipo_devedor: devedor.tipo_devedor,
      contato: devedor.contato || ''
    })
    setIsDialogOpen(true)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (devedor) => {
    if (devedor.status === 'pago') {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Pago</Badge>
    }
    if (devedor.dias_em_atraso > 0) {
      return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Vencido ({devedor.dias_em_atraso} dias)</Badge>
    }
    return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
  }

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'pessoa_juridica':
      case 'fornecedor':
        return <Building className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const totalPendente = devedores
    .filter(d => d.status !== 'pago')
    .reduce((sum, d) => sum + d.valor, 0)

  const totalPago = devedores
    .filter(d => d.status === 'pago')
    .reduce((sum, d) => sum + d.valor, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devedores</h1>
          <p className="text-gray-600">Gerencie pessoas e empresas que lhe devem dinheiro</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Devedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingDevedor ? 'Editar Devedor' : 'Novo Devedor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipo_devedor">Tipo</Label>
                <Select value={formData.tipo_devedor} onValueChange={(value) => setFormData({ ...formData, tipo_devedor: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                    <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="data_emprestimo">Data do Empréstimo</Label>
                <Input
                  id="data_emprestimo"
                  type="date"
                  value={formData.data_emprestimo}
                  onChange={(e) => setFormData({ ...formData, data_emprestimo: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="data_vencimento">Data de Vencimento</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contato">Contato</Label>
                <Input
                  id="contato"
                  value={formData.contato}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                  placeholder="Telefone, email, etc."
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Detalhes sobre o empréstimo..."
                />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                {editingDevedor ? 'Atualizar' : 'Salvar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPendente)}</div>
            <p className="text-xs text-muted-foreground">
              {devedores.filter(d => d.status !== 'pago').length} devedor(es)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</div>
            <p className="text-xs text-muted-foreground">
              {devedores.filter(d => d.status === 'pago').length} devedor(es)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalPendente + totalPago)}</div>
            <p className="text-xs text-muted-foreground">
              {devedores.length} devedor(es) total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Devedores */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Devedores</CardTitle>
        </CardHeader>
        <CardContent>
          {devedores.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum devedor cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devedores.map((devedor) => (
                  <TableRow key={devedor.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {getTipoIcon(devedor.tipo_devedor)}
                        <span>{devedor.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {devedor.tipo_devedor === 'pessoa_fisica' && 'Pessoa Física'}
                      {devedor.tipo_devedor === 'pessoa_juridica' && 'Pessoa Jurídica'}
                      {devedor.tipo_devedor === 'fornecedor' && 'Fornecedor'}
                    </TableCell>
                    <TableCell>{formatCurrency(devedor.valor)}</TableCell>
                    <TableCell>{getStatusBadge(devedor)}</TableCell>
                    <TableCell>{formatDate(devedor.data_vencimento)}</TableCell>
                    <TableCell>{devedor.contato || '-'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {devedor.status !== 'pago' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarcarPago(devedor.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(devedor)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(devedor.id)}
                          className="text-red-600 hover:text-red-700"
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

export default Devedores

