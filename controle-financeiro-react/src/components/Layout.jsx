import { useState } from 'react'
import {
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Target,
  Users,
  BarChart3,
  Bot,
  MessageCircle,
  SendHorizontal,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Minimize2
} from 'lucide-react'

const Layout = ({ children, activeTab, setActiveTab }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [chatDockOpen, setChatDockOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gastos', label: 'Gastos', icon: TrendingDown },
    { id: 'receitas', label: 'Receitas', icon: TrendingUp },
    { id: 'contas', label: 'Contas', icon: CreditCard },
    { id: 'ia', label: 'IA Financeira', icon: Bot },
    { id: 'metas', label: 'Metas', icon: Target },
    { id: 'devedores', label: 'Devedores', icon: Users },
    { id: 'investimentos', label: 'Investimentos', icon: BarChart3 }
  ]

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex h-screen">
        <div className={`
          ${sidebarOpen ? 'w-64' : 'w-0 lg:w-16'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed lg:relative inset-y-0 left-0 z-50
          bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900
          transition-all duration-300 ease-in-out
          flex flex-col overflow-hidden
        `}>
          <div className="flex items-center justify-between h-16 px-4 bg-blue-950/50 backdrop-blur-sm flex-shrink-0">
            <div className={`flex items-center space-x-3 ${!sidebarOpen && 'lg:justify-center'}`}>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              {(sidebarOpen || mobileMenuOpen) && (
                <div className="lg:block">
                  <h1 className="text-white font-bold text-lg">Controle</h1>
                  <p className="text-blue-200 text-xs">Financeiro</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-white hover:text-blue-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActiveTab(item.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full flex items-center ${(sidebarOpen || mobileMenuOpen) ? 'space-x-3 px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                          : 'text-blue-100 hover:bg-blue-800/50 hover:text-white'
                      }`}
                      title={(!sidebarOpen && !mobileMenuOpen) ? item.label : ''}
                    >
                      <Icon className={`w-5 h-5 transition-transform duration-200 flex-shrink-0 ${
                        isActive ? 'scale-110' : 'group-hover:scale-105'
                      }`} />
                      {(sidebarOpen || mobileMenuOpen) && (
                        <>
                          <span className="font-medium">{item.label}</span>
                          {isActive && (
                            <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                          )}
                        </>
                      )}

                      {!sidebarOpen && !mobileMenuOpen && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {(sidebarOpen || mobileMenuOpen) && (
            <div className="p-4 flex-shrink-0">
              <div className="bg-blue-800/30 backdrop-blur-sm rounded-xl p-4 border border-blue-700/30">
                <p className="text-blue-200 text-sm text-center">
                  Versão 2.0
                </p>
                <p className="text-blue-300 text-xs text-center mt-1">
                  Powered by React
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 shadow-sm flex-shrink-0">
            <div className="flex items-center justify-between h-16 px-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleMobileMenu}
                  className="lg:hidden text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <button
                  onClick={toggleSidebar}
                  className="hidden lg:flex items-center justify-center text-blue-600 hover:text-blue-800 transition-all duration-200 p-2 rounded-lg hover:bg-blue-50 border border-blue-200 hover:border-blue-300"
                  title={sidebarOpen ? 'Ocultar menu lateral' : 'Mostrar menu lateral'}
                >
                  {sidebarOpen ? (
                    <ChevronLeft className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>

                <div>
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">U</span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-[60]">
        {chatDockOpen && (
          <div className="mb-2 w-[320px] rounded-2xl border border-blue-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                <span className="text-sm font-semibold">Assistente Financeiro</span>
              </div>
              <button
                onClick={() => setChatDockOpen(false)}
                className="rounded-md p-1 hover:bg-white/15 transition-colors"
                title="Minimizar"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Envie um extrato e a IA organiza os lançamentos para receitas, gastos e contas.
              </p>
              <button
                onClick={() => {
                  setActiveTab('ia')
                  setChatDockOpen(false)
                }}
                className="w-full text-sm rounded-lg px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Abrir página da IA
              </button>
            </div>
            <div className="border-t border-blue-100 px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <MessageCircle className="w-4 h-4" />
                <span>Digite na página da IA para conversar</span>
                <SendHorizontal className="w-4 h-4 ml-auto" />
              </div>
            </div>
          </div>
        )}
        {!chatDockOpen && (
          <button
            onClick={() => setChatDockOpen(true)}
            className="flex items-center gap-2 rounded-t-xl rounded-b-md px-4 py-3 shadow-xl border border-blue-200 bg-white hover:bg-blue-50 transition-colors"
            title="Abrir assistente"
          >
            <MessageCircle className="w-5 h-5 text-blue-700" />
            <span className="text-sm font-semibold text-blue-900">Mensagens</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default Layout
