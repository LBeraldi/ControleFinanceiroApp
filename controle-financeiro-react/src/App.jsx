import { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Gastos from './components/Gastos'
import Receitas from './components/Receitas'
import Contas from './components/Contas'
import IAFinanceira from './components/IAFinanceira'
import Metas from './components/Metas'
import Devedores from './components/Devedores'
import Investimentos from './components/Investimentos'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'gastos':
        return <Gastos />
      case 'receitas':
        return <Receitas />
      case 'contas':
        return <Contas />
      case 'ia':
        return <IAFinanceira />
      case 'metas':
        return <Metas />
      case 'devedores':
        return <Devedores />
      case 'investimentos':
        return <Investimentos />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  )
}

export default App
