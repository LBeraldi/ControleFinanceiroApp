from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Conta(db.Model):
    __tablename__ = 'contas'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, default='Conta')
    tipo = db.Column(db.String(20), nullable=False, default='corrente')
    banco = db.Column(db.String(100), nullable=False)
    saldo_inicial = db.Column(db.Float, nullable=False, default=0.0)
    saldo = db.Column(db.Float, nullable=False, default=0.0)
    observacoes = db.Column(db.Text, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'tipo': self.tipo,
            'banco': self.banco,
            'saldo_inicial': self.saldo_inicial,
            'saldo': self.saldo,
            'saldo_atual': self.saldo,
            'observacoes': self.observacoes or ''
        }


class TransacaoConta(db.Model):
    __tablename__ = 'transacoes_conta'

    id = db.Column(db.Integer, primary_key=True)
    conta_id = db.Column(db.Integer, db.ForeignKey('contas.id'), nullable=False)
    tipo = db.Column(db.String(10), nullable=False)  # entrada, saida
    valor = db.Column(db.Float, nullable=False)
    descricao = db.Column(db.String(200), nullable=False)
    data = db.Column(db.Date, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'conta_id': self.conta_id,
            'tipo': self.tipo,
            'valor': self.valor,
            'descricao': self.descricao,
            'data': self.data.isoformat() if self.data else None
        }

class Categoria(db.Model):
    __tablename__ = 'categorias'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), nullable=False)
    cor = db.Column(db.String(7), nullable=False, default='#607D8B')
    tipo = db.Column(db.String(10), nullable=False)  # 'gasto', 'receita', 'ambos'
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'cor': self.cor,
            'tipo': self.tipo
        }

class Receita(db.Model):
    __tablename__ = 'receitas'
    
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(200), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    data = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    categoria = db.Column(db.String(50), nullable=False, default='Outros')
    
    def to_dict(self):
        return {
            'id': self.id,
            'descricao': self.descricao,
            'valor': self.valor,
            'data': self.data.isoformat() if self.data else None,
            'categoria': self.categoria
        }

class Gasto(db.Model):
    __tablename__ = 'gastos'
    
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(200), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    categoria = db.Column(db.String(50), nullable=False)
    tipo = db.Column(db.String(10), nullable=False)  # 'avista', 'aprazo'
    fixo = db.Column(db.Boolean, nullable=False, default=False)
    parcelas = db.Column(db.Integer, nullable=False, default=1)
    parcela_atual = db.Column(db.Integer, nullable=False, default=1)
    data = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    pago = db.Column(db.Boolean, nullable=False, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'descricao': self.descricao,
            'valor': self.valor,
            'categoria': self.categoria,
            'tipo': self.tipo,
            'fixo': self.fixo,
            'parcelas': self.parcelas,
            'parcela_atual': self.parcela_atual,
            'data': self.data.isoformat() if self.data else None,
            'pago': self.pago
        }

class Meta(db.Model):
    __tablename__ = 'metas'
    
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(200), nullable=False)
    valor_meta = db.Column(db.Float, nullable=False)
    valor_atual = db.Column(db.Float, nullable=False, default=0.0)
    data_criacao = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    
    def to_dict(self):
        progresso = (self.valor_atual / self.valor_meta * 100) if self.valor_meta > 0 else 0
        return {
            'id': self.id,
            'descricao': self.descricao,
            'valor_meta': self.valor_meta,
            'valor_atual': self.valor_atual,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'progresso': round(progresso, 1)
        }

class Devedor(db.Model):
    __tablename__ = 'devedores'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pendente')  # pendente, pago, vencido
    descricao = db.Column(db.String(500), nullable=True)
    data_emprestimo = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    data_vencimento = db.Column(db.Date, nullable=True)
    data_pagamento = db.Column(db.Date, nullable=True)
    tipo_devedor = db.Column(db.String(20), nullable=False, default='pessoa_fisica')  # pessoa_fisica, pessoa_juridica, fornecedor
    contato = db.Column(db.String(200), nullable=True)  # telefone, email, etc.
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'valor': self.valor,
            'status': self.status,
            'descricao': self.descricao,
            'data_emprestimo': self.data_emprestimo.isoformat() if self.data_emprestimo else None,
            'data_vencimento': self.data_vencimento.isoformat() if self.data_vencimento else None,
            'data_pagamento': self.data_pagamento.isoformat() if self.data_pagamento else None,
            'tipo_devedor': self.tipo_devedor,
            'contato': self.contato,
            'dias_em_atraso': self.calcular_dias_atraso()
        }
    
    def calcular_dias_atraso(self):
        if self.status == 'pago' or not self.data_vencimento:
            return 0
        hoje = datetime.utcnow().date()
        if hoje > self.data_vencimento:
            return (hoje - self.data_vencimento).days
        return 0


class Investimento(db.Model):
    __tablename__ = 'investimentos'

    id = db.Column(db.Integer, primary_key=True)
    ticker = db.Column(db.String(20), nullable=False, index=True)
    quantidade = db.Column(db.Float, nullable=False, default=0.0)
    preco_medio = db.Column(db.Float, nullable=False, default=0.0)
    data_compra = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    corretora = db.Column(db.String(100), nullable=True)
    classe_ativo = db.Column(db.String(30), nullable=False, default='acao')
    origem = db.Column(db.String(20), nullable=False, default='manual')
    created_at = db.Column(db.Date, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'ticker': (self.ticker or '').upper(),
            'quantidade': float(self.quantidade or 0),
            'preco_medio': float(self.preco_medio or 0),
            'data_compra': self.data_compra.isoformat() if self.data_compra else None,
            'corretora': self.corretora or '',
            'classe_ativo': self.classe_ativo or 'acao',
            'origem': self.origem or 'manual'
        }
