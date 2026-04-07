# Controle Financeiro Pessoal - Aplicação Web

Uma aplicação web moderna para controle financeiro pessoal, desenvolvida com Flask (backend) e HTML/CSS/JavaScript (frontend).

## Funcionalidades

### 📊 Dashboard
- Visão geral das finanças com cards informativos
- Gráfico de pizza mostrando gastos por categoria
- Gráfico de linha com evolução mensal de receitas e gastos
- Indicadores de saldo total, receitas e gastos do mês

### 💸 Gestão de Gastos
- Cadastro de gastos com categorização
- Suporte a pagamentos à vista e parcelados
- Marcação de gastos fixos
- Listagem e exclusão de gastos

### 💰 Gestão de Receitas
- Cadastro de receitas com categorização
- Listagem e exclusão de receitas
- Acompanhamento de entradas mensais

### 🏦 Gestão de Contas
- Cadastro de contas bancárias
- Controle de saldos
- Visão consolidada do patrimônio

### 🎯 Metas Financeiras
- Criação de metas de economia
- Acompanhamento visual do progresso
- Barra de progresso para cada meta

### 📈 Relatórios
- Balanço geral das finanças
- Análise de gastos por categoria
- Evolução mensal de receitas e gastos

### ⚙️ Configurações
- Gerenciamento de categorias personalizadas
- Inicialização de categorias padrão
- Configuração de cores para categorias

## Tecnologias Utilizadas

### Backend
- **Flask**: Framework web Python
- **SQLAlchemy**: ORM para banco de dados
- **SQLite**: Banco de dados local
- **Flask-CORS**: Suporte a CORS para APIs

### Frontend
- **HTML5**: Estrutura das páginas
- **CSS3**: Estilização moderna e responsiva
- **JavaScript**: Lógica de interação e comunicação com API
- **Chart.js**: Biblioteca para gráficos interativos
- **Font Awesome**: Ícones

## Estrutura do Projeto

```
controle-financeiro/
├── src/
│   ├── models/
│   │   └── financeiro.py      # Modelos de dados (SQLAlchemy)
│   ├── routes/
│   │   ├── financeiro.py      # Rotas da API financeira
│   │   └── user.py           # Rotas de usuário (placeholder)
│   ├── static/
│   │   ├── index.html        # Página principal
│   │   ├── styles.css        # Estilos CSS
│   │   └── script.js         # Lógica JavaScript
│   ├── database/
│   │   └── app.db           # Banco de dados SQLite
│   └── main.py              # Arquivo principal do Flask
├── venv/                    # Ambiente virtual Python
├── requirements.txt         # Dependências Python
└── README.md               # Este arquivo
```

## Instalação e Execução

### Pré-requisitos
- Python 3.11+
- pip (gerenciador de pacotes Python)

### Passos para execução

1. **Clone ou baixe o projeto**
   ```bash
   cd controle-financeiro
   ```

2. **Ative o ambiente virtual**
   ```bash
   source venv/bin/activate
   ```

3. **Instale as dependências**
   ```bash
   pip install -r requirements.txt
   ```

4. **Execute a aplicação**
   ```bash
   python src/main.py
   ```

5. **Acesse a aplicação**
   - Abra seu navegador e vá para: `http://localhost:5000`

## Uso da Aplicação

### Primeiro Acesso
1. Acesse a seção **Configurações**
2. Clique em **"Inicializar Categorias Padrão"** para criar as categorias básicas
3. Comece cadastrando suas contas bancárias na seção **Contas**
4. Adicione suas receitas e gastos nas respectivas seções

### Navegação
- Use o menu lateral para navegar entre as seções
- O **Dashboard** oferece uma visão geral de suas finanças
- Cada seção tem formulários para adicionar novos registros
- As tabelas mostram os dados mais recentes

### Dicas de Uso
- **Categorias**: Use categorias consistentes para melhor análise
- **Gastos Parcelados**: O sistema divide automaticamente o valor pelas parcelas
- **Metas**: Defina metas realistas e acompanhe o progresso
- **Relatórios**: Consulte regularmente para entender seus padrões financeiros

## API Endpoints

### Dashboard
- `GET /api/dashboard` - Dados do dashboard

### Gastos
- `GET /api/gastos` - Listar gastos
- `POST /api/gastos` - Criar gasto
- `PUT /api/gastos/{id}` - Atualizar gasto
- `DELETE /api/gastos/{id}` - Excluir gasto

### Receitas
- `GET /api/receitas` - Listar receitas
- `POST /api/receitas` - Criar receita
- `PUT /api/receitas/{id}` - Atualizar receita
- `DELETE /api/receitas/{id}` - Excluir receita

### Contas
- `GET /api/contas` - Listar contas
- `POST /api/contas` - Criar conta
- `PUT /api/contas/{id}` - Atualizar conta
- `DELETE /api/contas/{id}` - Excluir conta

### Metas
- `GET /api/metas` - Listar metas
- `POST /api/metas` - Criar meta
- `PUT /api/metas/{id}` - Atualizar meta
- `DELETE /api/metas/{id}` - Excluir meta

### Categorias
- `GET /api/categorias` - Listar categorias
- `POST /api/categorias` - Criar categoria
- `DELETE /api/categorias/{id}` - Excluir categoria

### Relatórios
- `GET /api/relatorios/gastos-categoria` - Gastos por categoria
- `GET /api/relatorios/evolucao-mensal` - Evolução mensal
- `GET /api/relatorios/balanco-geral` - Balanço geral

### Configurações
- `POST /api/inicializar` - Inicializar categorias padrão

## Características Técnicas

### Responsividade
- Interface adaptável para desktop e mobile
- Layout flexível com CSS Grid e Flexbox
- Navegação otimizada para diferentes tamanhos de tela

### Segurança
- Validação de dados no frontend e backend
- Sanitização de entradas
- CORS configurado adequadamente

### Performance
- Carregamento assíncrono de dados
- Gráficos renderizados no cliente
- Paginação para listas grandes

### Usabilidade
- Interface intuitiva e moderna
- Feedback visual para ações do usuário
- Notificações toast para confirmações e erros
- Loading states durante operações

## Possíveis Melhorias Futuras

1. **Autenticação de usuários**
2. **Backup e sincronização em nuvem**
3. **Importação de extratos bancários**
4. **Notificações de vencimentos**
5. **Relatórios mais avançados**
6. **Modo escuro**
7. **PWA (Progressive Web App)**
8. **Integração com APIs bancárias**

## Suporte

Para dúvidas ou problemas:
1. Verifique se todas as dependências estão instaladas
2. Confirme que o Python 3.11+ está sendo usado
3. Verifique se a porta 5000 está disponível
4. Consulte os logs do servidor para erros específicos

## Licença

Este projeto foi desenvolvido para fins educacionais e de demonstração.

