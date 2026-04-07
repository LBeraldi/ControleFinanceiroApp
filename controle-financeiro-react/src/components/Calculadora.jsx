import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Calculator, Percent, TrendingUp, DollarSign, PieChart } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import apiService from '../services/api'

const Calculadora = () => {
  // Estado para Percentual do Salário
  const [salarioData, setSalarioData] = useState({
    salario: '',
    gastos: [
      { categoria: 'Moradia', valor: '' },
      { categoria: 'Alimentação', valor: '' },
      { categoria: 'Transporte', valor: '' },
      { categoria: 'Lazer', valor: '' },
      { categoria: 'Outros', valor: '' }
    ]
  })
  const [resultadoSalario, setResultadoSalario] = useState(null)

  // Estado para Regra 50-30-20
  const [regra503020Data, setRegra503020Data] = useState({
    salario_liquido: ''
  })
  const [resultadoRegra, setResultadoRegra] = useState(null)

  // Estado para Juros Compostos
  const [jurosData, setJurosData] = useState({
    capital_inicial: '',
    aporte_mensal: '',
    taxa_juros_anual: '',
    periodo_anos: ''
  })
  const [resultadoJuros, setResultadoJuros] = useState(null)

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const handleSalarioGastoChange = (index, valor) => {
    const novosGastos = [...salarioData.gastos]
    novosGastos[index].valor = valor
    setSalarioData({ ...salarioData, gastos: novosGastos })
  }

  const calcularPercentualSalario = async () => {
    try {
      const gastosValidos = salarioData.gastos
        .filter(g => g.valor && parseFloat(g.valor) > 0)
        .map(g => ({ categoria: g.categoria, valor: parseFloat(g.valor) }))

      const resultado = await apiService.calcularPercentualSalario({
        salario: parseFloat(salarioData.salario),
        gastos: gastosValidos
      })
      setResultadoSalario(resultado)
    } catch (error) {
      console.error('Erro ao calcular percentual do salário:', error)
    }
  }

  const calcularRegra503020 = async () => {
    try {
      const resultado = await apiService.calcularRegra503020({
        salario_liquido: parseFloat(regra503020Data.salario_liquido)
      })
      setResultadoRegra(resultado)
    } catch (error) {
      console.error('Erro ao calcular regra 50-30-20:', error)
    }
  }

  const calcularJurosCompostos = async () => {
    try {
      const resultado = await apiService.calcularJurosCompostos({
        capital_inicial: parseFloat(jurosData.capital_inicial),
        aporte_mensal: parseFloat(jurosData.aporte_mensal) || 0,
        taxa_juros_anual: parseFloat(jurosData.taxa_juros_anual),
        periodo_anos: parseFloat(jurosData.periodo_anos)
      })
      setResultadoJuros(resultado)
    } catch (error) {
      console.error('Erro ao calcular juros compostos:', error)
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Calculadora Financeira</h1>
        <p className="text-gray-600">Ferramentas para planejamento e análise financeira</p>
      </div>

      <Tabs defaultValue="percentual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="percentual">Percentual do Salário</TabsTrigger>
          <TabsTrigger value="regra">Regra 50-30-20</TabsTrigger>
          <TabsTrigger value="juros">Juros Compostos</TabsTrigger>
        </TabsList>

        {/* Aba Percentual do Salário */}
        <TabsContent value="percentual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Percent className="h-5 w-5" />
                  <span>Análise de Gastos por Salário</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="salario">Salário Mensal</Label>
                  <Input
                    id="salario"
                    type="number"
                    step="0.01"
                    value={salarioData.salario}
                    onChange={(e) => setSalarioData({ ...salarioData, salario: e.target.value })}
                    placeholder="Ex: 5000.00"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Gastos por Categoria</Label>
                  {salarioData.gastos.map((gasto, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Label className="w-24 text-sm">{gasto.categoria}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={gasto.valor}
                        onChange={(e) => handleSalarioGastoChange(index, e.target.value)}
                        placeholder="0.00"
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={calcularPercentualSalario}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!salarioData.salario}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Calcular Percentuais
                </Button>
              </CardContent>
            </Card>

            {resultadoSalario && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado da Análise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total de Gastos</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(resultadoSalario.total_gastos)}
                      </p>
                      <Badge variant="outline">{resultadoSalario.percentual_total_gastos}%</Badge>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Valor Restante</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(resultadoSalario.valor_restante)}
                      </p>
                      <Badge variant="outline">{resultadoSalario.percentual_restante}%</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Detalhamento por Categoria</h4>
                    {resultadoSalario.gastos_detalhados.map((gasto, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">{gasto.categoria}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium">{formatCurrency(gasto.valor)}</span>
                          <Badge variant="secondary" className="ml-2">{gasto.percentual}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {resultadoSalario.gastos_detalhados.length > 0 && (
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPieChart>
                        <Pie
                          data={resultadoSalario.gastos_detalhados}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="valor"
                          label={({ categoria, percentual }) => `${categoria} ${percentual}%`}
                        >
                          {resultadoSalario.gastos_detalhados.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Aba Regra 50-30-20 */}
        <TabsContent value="regra" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Regra 50-30-20</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>50%</strong> para necessidades (moradia, alimentação, transporte)</li>
                    <li>• <strong>30%</strong> para desejos (lazer, entretenimento)</li>
                    <li>• <strong>20%</strong> para poupança e investimentos</li>
                  </ul>
                </div>

                <div>
                  <Label htmlFor="salario_liquido">Salário Líquido Mensal</Label>
                  <Input
                    id="salario_liquido"
                    type="number"
                    step="0.01"
                    value={regra503020Data.salario_liquido}
                    onChange={(e) => setRegra503020Data({ salario_liquido: e.target.value })}
                    placeholder="Ex: 4000.00"
                  />
                </div>

                <Button 
                  onClick={calcularRegra503020}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!regra503020Data.salario_liquido}
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  Aplicar Regra 50-30-20
                </Button>
              </CardContent>
            </Card>

            {resultadoRegra && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição Recomendada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-green-900">Necessidades (50%)</h4>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(resultadoRegra.necessidades.valor)}
                        </span>
                      </div>
                      <p className="text-sm text-green-700">{resultadoRegra.necessidades.descricao}</p>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-yellow-900">Desejos (30%)</h4>
                        <span className="text-lg font-bold text-yellow-600">
                          {formatCurrency(resultadoRegra.desejos.valor)}
                        </span>
                      </div>
                      <p className="text-sm text-yellow-700">{resultadoRegra.desejos.descricao}</p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-blue-900">Poupança (20%)</h4>
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(resultadoRegra.poupanca.valor)}
                        </span>
                      </div>
                      <p className="text-sm text-blue-700">{resultadoRegra.poupanca.descricao}</p>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Necessidades', value: resultadoRegra.necessidades.valor, fill: '#10b981' },
                          { name: 'Desejos', value: resultadoRegra.desejos.valor, fill: '#f59e0b' },
                          { name: 'Poupança', value: resultadoRegra.poupanca.valor, fill: '#3b82f6' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Aba Juros Compostos */}
        <TabsContent value="juros" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Simulador de Juros Compostos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="capital_inicial">Capital Inicial</Label>
                  <Input
                    id="capital_inicial"
                    type="number"
                    step="0.01"
                    value={jurosData.capital_inicial}
                    onChange={(e) => setJurosData({ ...jurosData, capital_inicial: e.target.value })}
                    placeholder="Ex: 10000.00"
                  />
                </div>

                <div>
                  <Label htmlFor="aporte_mensal">Aporte Mensal (opcional)</Label>
                  <Input
                    id="aporte_mensal"
                    type="number"
                    step="0.01"
                    value={jurosData.aporte_mensal}
                    onChange={(e) => setJurosData({ ...jurosData, aporte_mensal: e.target.value })}
                    placeholder="Ex: 500.00"
                  />
                </div>

                <div>
                  <Label htmlFor="taxa_juros_anual">Taxa de Juros Anual (%)</Label>
                  <Input
                    id="taxa_juros_anual"
                    type="number"
                    step="0.01"
                    value={jurosData.taxa_juros_anual}
                    onChange={(e) => setJurosData({ ...jurosData, taxa_juros_anual: e.target.value })}
                    placeholder="Ex: 12.00"
                  />
                </div>

                <div>
                  <Label htmlFor="periodo_anos">Período (anos)</Label>
                  <Input
                    id="periodo_anos"
                    type="number"
                    step="0.1"
                    value={jurosData.periodo_anos}
                    onChange={(e) => setJurosData({ ...jurosData, periodo_anos: e.target.value })}
                    placeholder="Ex: 5"
                  />
                </div>

                <Button 
                  onClick={calcularJurosCompostos}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!jurosData.capital_inicial || !jurosData.taxa_juros_anual || !jurosData.periodo_anos}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Simular Investimento
                </Button>
              </CardContent>
            </Card>

            {resultadoJuros && (
              <Card>
                <CardHeader>
                  <CardTitle>Projeção do Investimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Total Investido</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(resultadoJuros.total_investido)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <p className="text-sm text-gray-600">Montante Final</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(resultadoJuros.montante_final)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-blue-900">Juros Ganhos</h4>
                      <span className="text-xl font-bold text-blue-600">
                        {formatCurrency(resultadoJuros.juros_ganhos)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Rentabilidade</span>
                      <Badge className="bg-blue-600">{resultadoJuros.rentabilidade_percentual}%</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Detalhes da Simulação</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Capital inicial:</span>
                        <span>{formatCurrency(resultadoJuros.capital_inicial)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aporte mensal:</span>
                        <span>{formatCurrency(resultadoJuros.aporte_mensal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa anual:</span>
                        <span>{resultadoJuros.taxa_juros_anual}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Período:</span>
                        <span>{resultadoJuros.periodo_anos} anos</span>
                      </div>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[
                      { name: 'Investido', valor: resultadoJuros.total_investido, fill: '#6b7280' },
                      { name: 'Juros', valor: resultadoJuros.juros_ganhos, fill: '#3b82f6' }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="valor" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Calculadora

