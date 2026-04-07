from flask import Blueprint, jsonify, request
from src.models.financeiro import db, Conta, Categoria, Receita, Gasto, Meta, Devedor, TransacaoConta, Investimento
from datetime import datetime, date
from sqlalchemy import func, extract
import calendar
import io
import json
import os
import re
from urllib.request import urlopen
from urllib.parse import quote, urlencode
from pypdf import PdfReader

try:
    from openai import OpenAI
except Exception:
    OpenAI = None

financeiro_bp = Blueprint('financeiro', __name__)


def _safe_float(value, default=0.0):
    try:
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        clean = str(value).replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
        return float(clean)
    except Exception:
        return default


def _normalize_date(value):
    raw = str(value or '').strip()
    if not raw:
        return datetime.now().strftime('%Y-%m-%d')
    raw = raw.replace('/', '-')
    parts = raw.split('-')
    if len(parts) != 3:
        return datetime.now().strftime('%Y-%m-%d')
    if len(parts[0]) == 4:
        y, m, d = parts
    else:
        d, m, y = parts
        if len(y) == 2:
            y = f'20{y}'
    try:
        return datetime.strptime(f'{y}-{m}-{d}', '%Y-%m-%d').strftime('%Y-%m-%d')
    except Exception:
        return datetime.now().strftime('%Y-%m-%d')


def _safe_dot_float(value, default=0.0):
    try:
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        return float(str(value).replace(',', '').strip())
    except Exception:
        return default


def _is_balance_line(text):
    t = (text or '').lower()
    return any(marker in t for marker in [
        'saldo anterior', 'saldo do dia', 'saldo final', 'saldo atual', 'saldo inicial', 'saldo:'
    ])


def _infer_transaction_type(raw_line, parsed_value):
    text = (raw_line or '').lower()
    saida_keywords = [
        'enviado', 'pagto', 'pagamento', 'compra', 'débito', 'debito', 'saque',
        'transferencia enviada', 'transferência enviada', 'pix enviado', 'tarifa', 'iof'
    ]
    entrada_keywords = [
        'recebido', 'recebida', 'salario', 'salário', 'provento', 'deposito', 'depósito',
        'transferencia recebida', 'transferência recebida', 'pix recebido', 'rendimento'
    ]

    if '(-)' in text or text.strip().startswith('-') or any(k in text for k in saida_keywords):
        return 'gasto'
    if '(+)' in text or text.strip().startswith('+') or any(k in text for k in entrada_keywords):
        return 'receita'
    return 'receita' if (parsed_value or 0) > 0 else 'gasto'


def _extract_text_from_file(uploaded_file):
    filename = (uploaded_file.filename or '').lower()
    content = uploaded_file.read()

    if filename.endswith('.pdf'):
        reader = PdfReader(io.BytesIO(content))
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or '')
        return '\n'.join(parts)

    if filename.endswith('.ofx'):
        text = content.decode('utf-8', errors='ignore')
        text = re.sub(r'<[^>]+>', ' ', text)
        return re.sub(r'\s+', ' ', text)

    return content.decode('utf-8', errors='ignore')


def _basic_statement_parser(text):
    money_regex = re.compile(r'-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|-?\d+(?:[.,]\d{2})')
    date_regex = re.compile(r'(\d{2}[/-]\d{2}[/-]\d{2,4}|\d{4}[/-]\d{2}[/-]\d{2})')

    lancamentos = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or _is_balance_line(line):
            continue

        valores = money_regex.findall(line)
        if not valores:
            continue

        valor = _safe_float(valores[-1], None)
        if valor is None or valor == 0:
            continue

        dt = date_regex.search(line)
        data = _normalize_date(dt.group(1) if dt else '')
        descricao = date_regex.sub('', line)
        descricao = money_regex.sub('', descricao).strip()
        descricao = re.sub(r'\s+', ' ', descricao)[:140] or 'Lancamento via extrato'
        tipo = _infer_transaction_type(line, valor)

        lancamentos.append({
            'data': data,
            'descricao': descricao,
            'valor': abs(valor),
            'tipo': tipo,
            'categoria_sugerida': 'Outros',
            'confianca': 0.45
        })

    return lancamentos[:300]


@financeiro_bp.route('/ia/analisar-extrato', methods=['POST'])
def analisar_extrato_ia():
    if 'arquivo' not in request.files:
        return jsonify({'error': 'Arquivo nao enviado'}), 400

    arquivo = request.files['arquivo']
    instrucao_usuario = request.form.get('instrucao', '').strip()
    if not arquivo or not arquivo.filename:
        return jsonify({'error': 'Arquivo invalido'}), 400

    try:
        texto = _extract_text_from_file(arquivo)
    except Exception as exc:
        return jsonify({'error': f'Falha ao ler arquivo: {str(exc)}'}), 400

    if not texto or len(texto.strip()) < 8:
        return jsonify({'error': 'Nao foi possivel extrair conteudo do arquivo'}), 400

    openai_key = os.getenv('OPENAI_API_KEY', '').strip()
    if not openai_key or OpenAI is None:
        fallback = _basic_statement_parser(texto)
        return jsonify({
            'source': 'fallback',
            'warning': 'OPENAI_API_KEY nao configurada ou pacote openai ausente. Usando parser local.',
            'lancamentos': fallback
        })

    prompt = f"""
Você é um assistente de extração financeira.
Extraia transações de extrato bancário e retorne APENAS JSON válido no formato:
{{
  "lancamentos": [
    {{
      "data": "YYYY-MM-DD",
      "descricao": "texto curto",
      "valor": 123.45,
      "tipo": "receita" | "gasto",
      "categoria_sugerida": "texto",
      "confianca": 0.0-1.0
    }}
  ]
}}
Regras:
- Ignore linhas de saldo (saldo anterior, saldo do dia, saldo final).
- Use valor absoluto positivo em "valor".
- Classifique como "gasto" quando houver envio/pagamento/compra/debito/(-).
- Classifique como "receita" quando houver recebimento/deposito/(+).
- Máximo 300 lançamentos.
Instrução adicional do usuário: {instrucao_usuario or "nenhuma"}
Conteúdo do extrato:
{texto[:120000]}
"""

    try:
        client = OpenAI(api_key=openai_key)
        model = os.getenv('OPENAI_MODEL', 'gpt-4.1-mini')
        completion = client.chat.completions.create(
            model=model,
            response_format={'type': 'json_object'},
            temperature=0.1,
            messages=[
                {'role': 'system', 'content': 'Voce retorna apenas JSON valido.'},
                {'role': 'user', 'content': prompt}
            ],
        )
        raw = completion.choices[0].message.content or '{}'
        parsed = json.loads(raw)
        lancamentos = parsed.get('lancamentos', [])
        sanitized = []

        for item in lancamentos[:300]:
            valor = _safe_float(item.get('valor'), 0)
            if valor <= 0:
                continue

            descricao = str(item.get('descricao') or 'Lancamento via extrato').strip()[:140]
            if _is_balance_line(descricao):
                continue

            tipo_raw = str(item.get('tipo', '')).strip().lower()
            if tipo_raw not in ('receita', 'gasto'):
                tipo = _infer_transaction_type(descricao, valor)
            else:
                tipo = _infer_transaction_type(descricao, valor)

            data = _normalize_date(item.get('data'))
            categoria = str(item.get('categoria_sugerida') or 'Outros').strip()[:60] or 'Outros'
            confianca = _safe_float(item.get('confianca'), 0.6)
            confianca = max(0.0, min(1.0, confianca))

            sanitized.append({
                'data': data,
                'descricao': descricao,
                'valor': round(abs(valor), 2),
                'tipo': tipo,
                'categoria_sugerida': categoria,
                'confianca': confianca
            })

        return jsonify({'source': 'openai', 'lancamentos': sanitized})
    except Exception as exc:
        fallback = _basic_statement_parser(texto)
        return jsonify({
            'source': 'fallback',
            'warning': f'Falha na IA ({str(exc)}). Usando parser local.',
            'lancamentos': fallback
        })


def _fetch_market_quotes(tickers):
    if not tickers:
        return {}
    token = os.getenv('BRAPI_TOKEN', '').strip()
    out = {}
    normalized_tickers = sorted(set([str(t).upper() for t in tickers if str(t).strip()]))
    batch_size = 5

    for start in range(0, len(normalized_tickers), batch_size):
        batch = normalized_tickers[start:start + batch_size]
        try:
            tickers_param = quote(','.join(batch))
            url = f'https://brapi.dev/api/quote/{tickers_param}'
            if token:
                url = f'{url}?token={quote(token)}'
            with urlopen(url, timeout=12) as response:
                payload = json.loads(response.read().decode('utf-8'))
                results = payload.get('results', [])
        except Exception:
            results = []

        if not results and len(batch) > 1:
            # Se um lote falhar por algum ticker específico, tenta individualmente
            # para preservar performance sem perder ativos válidos.
            for single in batch:
                try:
                    single_url = f'https://brapi.dev/api/quote/{quote(single)}'
                    if token:
                        single_url = f'{single_url}?token={quote(token)}'
                    with urlopen(single_url, timeout=8) as response:
                        payload = json.loads(response.read().decode('utf-8'))
                        results.extend(payload.get('results', []))
                except Exception:
                    continue

        for item in results:
            symbol = (item.get('symbol') or '').upper()
            if not symbol:
                continue
            out[symbol] = {
                'ticker': symbol,
                'nome': item.get('shortName') or symbol,
                'preco': _safe_float(item.get('regularMarketPrice'), 0.0),
                'variacao': _safe_float(item.get('regularMarketChange'), 0.0),
                'variacao_percentual': _safe_float(item.get('regularMarketChangePercent'), 0.0),
                'abertura': _safe_float(item.get('regularMarketOpen'), 0.0),
                'maxima': _safe_float(item.get('regularMarketDayHigh'), 0.0),
                'minima': _safe_float(item.get('regularMarketDayLow'), 0.0),
                'fechamento_anterior': _safe_float(item.get('regularMarketPreviousClose'), 0.0),
                'maxima_52_semanas': _safe_float(item.get('fiftyTwoWeekHigh'), 0.0),
                'minima_52_semanas': _safe_float(item.get('fiftyTwoWeekLow'), 0.0),
                'pl': _safe_float(item.get('priceEarnings'), 0.0),
                'lpa': _safe_float(item.get('earningsPerShare'), 0.0),
                'volume': _safe_float(item.get('regularMarketVolume'), 0.0),
                'logo_url': item.get('logourl') or '',
                'moeda': item.get('currency') or 'BRL',
                'fonte': 'brapi'
            }
    return out


def _fetch_market_history(ticker, range_period='3mo', interval='1d'):
    symbol = str(ticker or '').strip().upper()
    if not symbol:
        return {}

    token = os.getenv('BRAPI_TOKEN', '').strip()
    url = f'https://brapi.dev/api/quote/{quote(symbol)}?range={quote(range_period)}&interval={quote(interval)}'
    if token:
        url = f'{url}&token={quote(token)}'

    try:
        with urlopen(url, timeout=12) as response:
            payload = json.loads(response.read().decode('utf-8'))
            results = payload.get('results', [])
    except Exception:
        return {}

    if not results:
        return {}

    item = results[0]
    history = item.get('historicalDataPrice', []) or []
    points = []
    for entry in history:
        price = _safe_float(entry.get('close'), None)
        when = entry.get('date')
        if price is None or when is None:
            continue
        try:
            date_label = datetime.fromtimestamp(int(when)).strftime('%Y-%m-%d')
        except Exception:
            continue
        points.append({
            'data': date_label,
            'fechamento': round(price, 2),
            'abertura': round(_safe_float(entry.get('open'), 0.0), 2),
            'maxima': round(_safe_float(entry.get('high'), 0.0), 2),
            'minima': round(_safe_float(entry.get('low'), 0.0), 2),
            'volume': round(_safe_float(entry.get('volume'), 0.0), 2),
        })

    return {
        'ticker': symbol,
        'nome': item.get('shortName') or symbol,
        'preco_atual': round(_safe_float(item.get('regularMarketPrice'), 0.0), 2),
        'maxima_52_semanas': round(_safe_float(item.get('fiftyTwoWeekHigh'), 0.0), 2),
        'minima_52_semanas': round(_safe_float(item.get('fiftyTwoWeekLow'), 0.0), 2),
        'historico': points
    }


def _fetch_supported_asset_quote(ticker):
    symbol = str(ticker or '').strip().upper()
    if not symbol:
        return {}
    if '-' in symbol:
        return _fetch_awesome_quotes([symbol]).get(symbol, {})
    return _fetch_market_quotes([symbol]).get(symbol, {})


def _fetch_awesome_quotes(pairs):
    if not pairs:
        return {}

    url = f'https://economia.awesomeapi.com.br/json/last/{quote(",".join(pairs))}'
    try:
        with urlopen(url, timeout=12) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except Exception:
        return {}

    out = {}
    for pair in pairs:
        key = pair.replace('-', '')
        item = payload.get(key)
        if not item:
            continue
        bid_price = _safe_float(item.get('bid'), 0.0)
        change_pct = _safe_float(item.get('pctChange'), 0.0)
        out[pair] = {
            'ticker': pair,
            'nome': item.get('name') or pair,
            'preco': _safe_dot_float(item.get('bid'), 0.0),
            'variacao_percentual': _safe_dot_float(item.get('pctChange'), 0.0),
            'variacao': _safe_dot_float(item.get('varBid'), 0.0),
            'logo_url': '',
            'tipo_movimento': 'alta' if _safe_dot_float(item.get('pctChange'), 0.0) >= 0 else 'baixa',
            'classe': 'macro'
        }
    return out


def _fetch_awesome_history(pair, limit=30):
    symbol = str(pair or '').strip().upper()
    if not symbol:
        return {}

    url = f'https://economia.awesomeapi.com.br/json/daily/{quote(symbol)}/{int(limit)}'
    try:
        with urlopen(url, timeout=12) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except Exception:
        return {}

    if not isinstance(payload, list) or not payload:
        return {}

    points = []
    for entry in reversed(payload):
        ts = entry.get('timestamp')
        bid = _safe_dot_float(entry.get('bid'), None)
        if ts is None or bid is None:
            continue
        try:
            date_label = datetime.fromtimestamp(int(ts)).strftime('%Y-%m-%d')
        except Exception:
            continue
        points.append({
            'data': date_label,
            'fechamento': round(bid, 2),
            'abertura': round(_safe_dot_float(entry.get('bid'), 0.0), 2),
            'maxima': round(_safe_dot_float(entry.get('high'), 0.0), 2),
            'minima': round(_safe_dot_float(entry.get('low'), 0.0), 2),
            'volume': 0.0,
        })

    latest = payload[0]
    return {
        'ticker': symbol,
        'nome': latest.get('name') or symbol,
        'preco_atual': round(_safe_dot_float(latest.get('bid'), 0.0), 2),
        'maxima_52_semanas': round(max((point['maxima'] for point in points), default=0.0), 2),
        'minima_52_semanas': round(min((point['minima'] for point in points), default=0.0), 2),
        'historico': points
    }


def _search_market_assets(query, limit=8):
    raw_query = str(query or '').strip().upper()
    if len(raw_query) < 2:
        return []

    suggestions = []
    seen = set()

    brapi_url = f'https://brapi.dev/api/quote/list?search={quote(raw_query)}&limit={int(limit)}&page=1'
    try:
        with urlopen(brapi_url, timeout=12) as response:
            payload = json.loads(response.read().decode('utf-8'))
            for item in payload.get('stocks', []) or []:
                ticker = (item.get('stock') or '').upper().strip()
                if not ticker or ticker in seen:
                    continue
                asset_type = (item.get('type') or 'stock').lower().strip()
                token = os.getenv('BRAPI_TOKEN', '').strip()
                # Sem token, a brapi costuma negar quote/historico para funds/bdrs.
                if not token and asset_type not in ('stock',):
                    continue
                seen.add(ticker)
                suggestions.append({
                    'ticker': ticker,
                    'nome': item.get('name') or ticker,
                    'classe': asset_type,
                    'preco_atual': round(_safe_dot_float(item.get('close'), 0.0), 2),
                    'fonte': 'brapi'
                })
    except Exception:
        pass

    try:
        with urlopen('https://economia.awesomeapi.com.br/json/available', timeout=12) as response:
            available = json.loads(response.read().decode('utf-8'))
    except Exception:
        available = {}

    macro_matches = []
    for pair, name in available.items():
        pair_upper = str(pair).upper()
        name_upper = str(name).upper()
        if raw_query in pair_upper or raw_query in name_upper:
            macro_matches.append(pair_upper)
        if len(macro_matches) >= limit:
            break

    if macro_matches:
        awesome_quotes = _fetch_awesome_quotes(macro_matches[:limit])
        for pair in macro_matches:
            item = awesome_quotes.get(pair)
            if not item or pair in seen:
                continue
            seen.add(pair)
            suggestions.append({
                'ticker': pair,
                'nome': item.get('nome') or pair,
                'classe': 'macro',
                'preco_atual': round(_safe_dot_float(item.get('preco'), 0.0), 2),
                'fonte': 'awesomeapi'
            })

    suggestions.sort(key=lambda item: (0 if item['ticker'].startswith(raw_query) else 1, item['ticker']))
    return suggestions[:limit]


def _fetch_market_radar():
    stock_universe = [
        'PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'BBAS3', 'ABEV3', 'WEGE3',
        'PRIO3', 'B3SA3', 'GGBR4', 'SUZB3', 'RENT3', 'EQTL3', 'JBSS3', 'VIVT3'
    ]
    macro_pairs = ['USD-BRL', 'EUR-BRL', 'BTC-BRL', 'ETH-BRL']

    stock_quotes = _fetch_market_quotes(stock_universe)
    macro_quotes = _fetch_awesome_quotes(macro_pairs)

    ordered_items = []

    for pair in macro_pairs:
      if pair in macro_quotes:
          ordered_items.append(macro_quotes[pair])

    for ticker in stock_universe:
        item = stock_quotes.get(ticker)
        if not item:
            continue
        ordered_items.append({
            'ticker': item.get('ticker'),
            'nome': item.get('nome') or item.get('ticker'),
            'preco': item.get('preco', 0),
            'variacao_percentual': item.get('variacao_percentual', 0),
            'variacao': item.get('variacao', 0),
            'logo_url': item.get('logo_url', ''),
            'tipo_movimento': 'alta' if item.get('variacao_percentual', 0) >= 0 else 'baixa',
            'classe': 'acao'
        })

    return ordered_items


@financeiro_bp.route('/investimentos', methods=['GET'])
def get_investimentos():
    itens = Investimento.query.order_by(Investimento.ticker.asc(), Investimento.id.desc()).all()
    return jsonify([item.to_dict() for item in itens])


@financeiro_bp.route('/investimentos', methods=['POST'])
def create_investimento():
    data = request.json or {}
    ticker = str(data.get('ticker', '')).strip().upper()
    if not ticker:
        return jsonify({'error': 'Ticker e obrigatorio'}), 400

    cotacao = _fetch_supported_asset_quote(ticker)
    if not cotacao or _safe_float(cotacao.get('preco'), 0) <= 0:
        return jsonify({
            'error': 'Esse ativo nao possui cotacao disponivel no sistema atual. Use um ticker suportado, como PETR4, VALE3, USD-BRL ou BTC-BRL.'
        }), 400

    preco_medio = _safe_float(data.get('preco_medio'), 0)
    valor_investido = _safe_float(data.get('valor_investido'), 0)
    quantidade = _safe_float(data.get('quantidade'), 0)

    if valor_investido > 0 and preco_medio > 0:
        quantidade = valor_investido / preco_medio

    investimento = Investimento(
        ticker=ticker,
        quantidade=quantidade,
        preco_medio=preco_medio,
        data_compra=datetime.strptime(
            data.get('data_compra', datetime.now().strftime('%Y-%m-%d')),
            '%Y-%m-%d'
        ).date(),
        corretora=str(data.get('corretora', '')).strip()[:100],
        classe_ativo=str(data.get('classe_ativo', 'acao')).strip()[:30] or 'acao',
        origem=str(data.get('origem', 'manual')).strip()[:20] or 'manual'
    )
    db.session.add(investimento)
    db.session.commit()
    return jsonify(investimento.to_dict()), 201


@financeiro_bp.route('/investimentos/<int:investimento_id>', methods=['PUT'])
def update_investimento(investimento_id):
    investimento = Investimento.query.get_or_404(investimento_id)
    data = request.json or {}
    novo_ticker = str(data.get('ticker', investimento.ticker)).strip().upper() or investimento.ticker
    cotacao = _fetch_supported_asset_quote(novo_ticker)
    if not cotacao or _safe_float(cotacao.get('preco'), 0) <= 0:
        return jsonify({
            'error': 'Esse ativo nao possui cotacao disponivel no sistema atual. Use um ticker suportado, como PETR4, VALE3, USD-BRL ou BTC-BRL.'
        }), 400
    investimento.ticker = novo_ticker
    investimento.preco_medio = _safe_float(data.get('preco_medio', investimento.preco_medio), investimento.preco_medio)
    valor_investido = _safe_float(data.get('valor_investido'), 0)
    quantidade = _safe_float(data.get('quantidade', investimento.quantidade), investimento.quantidade)
    if valor_investido > 0 and investimento.preco_medio > 0:
        quantidade = valor_investido / investimento.preco_medio
    investimento.quantidade = quantidade
    if 'data_compra' in data:
        investimento.data_compra = datetime.strptime(data['data_compra'], '%Y-%m-%d').date()
    investimento.corretora = str(data.get('corretora', investimento.corretora or '')).strip()[:100]
    investimento.classe_ativo = str(data.get('classe_ativo', investimento.classe_ativo or 'acao')).strip()[:30]
    investimento.origem = str(data.get('origem', investimento.origem or 'manual')).strip()[:20]
    db.session.commit()
    return jsonify(investimento.to_dict())


@financeiro_bp.route('/investimentos/<int:investimento_id>', methods=['DELETE'])
def delete_investimento(investimento_id):
    investimento = Investimento.query.get_or_404(investimento_id)
    db.session.delete(investimento)
    db.session.commit()
    return '', 204


@financeiro_bp.route('/investimentos/mercado', methods=['GET'])
def get_investimentos_mercado():
    carteira = Investimento.query.all()
    tickers = [item.ticker for item in carteira if item.ticker]

    extra = request.args.get('tickers', '').strip()
    if extra:
        tickers.extend([x.strip().upper() for x in extra.split(',') if x.strip()])

    quotes = _fetch_market_quotes(tickers)

    portfolio = []
    for item in carteira:
        quote_data = quotes.get((item.ticker or '').upper(), {})
        preco = quote_data.get('preco', 0.0)
        valor_investido = float(item.quantidade or 0) * float(item.preco_medio or 0)
        valor_atual = float(item.quantidade or 0) * float(preco or 0)
        resultado = valor_atual - valor_investido
        resultado_pct = (resultado / valor_investido * 100) if valor_investido > 0 else 0
        portfolio.append({
            **item.to_dict(),
            'cotacao': quote_data,
            'valor_investido': round(valor_investido, 2),
            'valor_atual': round(valor_atual, 2),
            'resultado': round(resultado, 2),
            'resultado_percentual': round(resultado_pct, 2)
        })

    resumo = {
        'ativos': len(portfolio),
        'total_investido': round(sum(x['valor_investido'] for x in portfolio), 2),
        'total_atual': round(sum(x['valor_atual'] for x in portfolio), 2),
    }
    resumo['resultado'] = round(resumo['total_atual'] - resumo['total_investido'], 2)
    resumo['resultado_percentual'] = round(
        (resumo['resultado'] / resumo['total_investido'] * 100) if resumo['total_investido'] > 0 else 0,
        2
    )

    universe = [
        'PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'BBAS3', 'ABEV3', 'WEGE3', 'MGLU3', 'RENT3', 'SUZB3',
        'ELET3', 'LREN3', 'RADL3', 'PRIO3', 'B3SA3', 'HAPV3', 'EQTL3', 'EMBR3', 'RAIL3', 'JBSS3'
    ]
    market_quotes = _fetch_market_quotes(universe)
    ranking = sorted(
        [x for x in market_quotes.values() if x.get('preco', 0) > 0],
        key=lambda x: x.get('variacao_percentual', 0),
        reverse=True
    )

    return jsonify({
        'resumo': resumo,
        'carteira': portfolio,
        'top_altas': ranking[:5],
        'top_baixas': list(reversed(ranking[-5:])),
        'ultima_atualizacao': datetime.now().isoformat()
    })


@financeiro_bp.route('/investimentos/oportunidades', methods=['GET'])
def get_oportunidades_investimentos():
    universe = [
        'PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'BBAS3', 'ABEV3', 'WEGE3', 'MGLU3', 'RENT3', 'SUZB3',
        'ELET3', 'LREN3', 'RADL3', 'PRIO3', 'B3SA3', 'HAPV3', 'EQTL3', 'EMBR3', 'RAIL3', 'JBSS3'
    ]
    quotes = _fetch_market_quotes(universe)

    oportunidades = []
    for item in quotes.values():
        preco = float(item.get('preco') or 0)
        high_52 = float(item.get('maxima_52_semanas') or 0)
        low_52 = float(item.get('minima_52_semanas') or 0)
        variacao = float(item.get('variacao_percentual') or 0)
        if preco <= 0:
            continue

        distancia_da_maxima = ((high_52 - preco) / high_52 * 100) if high_52 > 0 else 0
        perto_da_minima = ((preco - low_52) / low_52 * 100) if low_52 > 0 else 0
        score = round((distancia_da_maxima * 0.7) - (max(variacao, 0) * 0.15) - (max(perto_da_minima, 0) * 0.15), 2)

        oportunidades.append({
            **item,
            'distancia_da_maxima_52_semanas': round(distancia_da_maxima, 2),
            'distancia_da_minima_52_semanas': round(perto_da_minima, 2),
            'score_oportunidade': score
        })

    oportunidades.sort(key=lambda row: row.get('score_oportunidade', 0), reverse=True)
    return jsonify({
        'itens': oportunidades[:8],
        'atualizado_em': datetime.now().isoformat()
    })


@financeiro_bp.route('/investimentos/painel-mercado', methods=['GET'])
def get_painel_mercado_investimentos():
    itens = _fetch_market_radar()
    return jsonify({
        'itens': itens,
        'atualizado_em': datetime.now().isoformat()
    })


@financeiro_bp.route('/investimentos/busca-ativos', methods=['GET'])
def buscar_ativos_investimentos():
    query = request.args.get('q', '')
    limit = request.args.get('limit', 8, type=int)
    return jsonify({
        'itens': _search_market_assets(query, limit=max(1, min(limit, 15)))
    })


@financeiro_bp.route('/investimentos/historico/<ticker>', methods=['GET'])
def get_historico_investimento(ticker):
    range_period = str(request.args.get('range', '3mo')).strip() or '3mo'
    interval = str(request.args.get('interval', '1d')).strip() or '1d'
    if '-' in str(ticker):
        data = _fetch_awesome_history(ticker, 30)
    else:
        data = _fetch_market_history(ticker, range_period, interval)
    if not data:
        return jsonify({'error': 'Nao foi possivel carregar o historico do ativo'}), 404
    return jsonify(data)

# ========== ROTAS PARA CONTAS ==========
@financeiro_bp.route('/contas', methods=['GET'])
def get_contas():
    contas = Conta.query.all()
    return jsonify([conta.to_dict() for conta in contas])

@financeiro_bp.route('/contas', methods=['POST'])
def create_conta():
    data = request.json
    saldo_inicial = float(data.get('saldo_inicial', data.get('saldo', 0)))
    conta = Conta(
        nome=data.get('nome', data.get('banco', 'Conta')),
        tipo=data.get('tipo', 'corrente'),
        banco=data['banco'],
        saldo_inicial=saldo_inicial,
        saldo=float(data.get('saldo', saldo_inicial)),
        observacoes=data.get('observacoes', '')
    )
    db.session.add(conta)
    db.session.commit()
    return jsonify(conta.to_dict()), 201

@financeiro_bp.route('/contas/<int:conta_id>', methods=['PUT'])
def update_conta(conta_id):
    conta = Conta.query.get_or_404(conta_id)
    data = request.json
    conta.nome = data.get('nome', conta.nome)
    conta.tipo = data.get('tipo', conta.tipo)
    conta.banco = data.get('banco', conta.banco)
    conta.saldo_inicial = float(data.get('saldo_inicial', conta.saldo_inicial))
    conta.saldo = float(data.get('saldo', conta.saldo))
    conta.observacoes = data.get('observacoes', conta.observacoes)
    db.session.commit()
    return jsonify(conta.to_dict())

@financeiro_bp.route('/contas/<int:conta_id>', methods=['DELETE'])
def delete_conta(conta_id):
    conta = Conta.query.get_or_404(conta_id)
    TransacaoConta.query.filter_by(conta_id=conta_id).delete()
    db.session.delete(conta)
    db.session.commit()
    return '', 204


@financeiro_bp.route('/contas/transacoes', methods=['GET'])
def get_transacoes_conta():
    transacoes = TransacaoConta.query.order_by(TransacaoConta.data.desc(), TransacaoConta.id.desc()).all()
    return jsonify([transacao.to_dict() for transacao in transacoes])


@financeiro_bp.route('/contas/transacoes', methods=['POST'])
def create_transacao_conta():
    data = request.json
    conta = Conta.query.get_or_404(data['conta_id'])

    tipo = data.get('tipo', 'entrada')
    valor = float(data['valor'])
    if tipo == 'entrada':
        conta.saldo += valor
    elif tipo == 'saida':
        conta.saldo -= valor
    else:
        return jsonify({'error': 'Tipo de transacao invalido'}), 400

    transacao = TransacaoConta(
        conta_id=conta.id,
        tipo=tipo,
        valor=valor,
        descricao=data['descricao'],
        data=datetime.strptime(
            data.get('data', datetime.now().strftime('%Y-%m-%d')),
            '%Y-%m-%d'
        ).date()
    )
    db.session.add(transacao)
    db.session.commit()
    return jsonify(transacao.to_dict()), 201

# ========== ROTAS PARA CATEGORIAS ==========
@financeiro_bp.route('/categorias', methods=['GET'])
def get_categorias():
    tipo = request.args.get('tipo')
    if tipo:
        categorias = Categoria.query.filter(
            (Categoria.tipo == tipo) | (Categoria.tipo == 'ambos')
        ).all()
    else:
        categorias = Categoria.query.all()
    return jsonify([categoria.to_dict() for categoria in categorias])

@financeiro_bp.route('/categorias', methods=['POST'])
def create_categoria():
    data = request.json
    categoria = Categoria(
        nome=data['nome'],
        cor=data.get('cor', '#607D8B'),
        tipo=data['tipo']
    )
    db.session.add(categoria)
    db.session.commit()
    return jsonify(categoria.to_dict()), 201

@financeiro_bp.route('/categorias/<int:categoria_id>', methods=['DELETE'])
def delete_categoria(categoria_id):
    categoria = Categoria.query.get_or_404(categoria_id)
    db.session.delete(categoria)
    db.session.commit()
    return '', 204

# ========== ROTAS PARA RECEITAS ==========
@financeiro_bp.route('/receitas', methods=['GET'])
def get_receitas():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    receitas = Receita.query.order_by(Receita.data.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'receitas': [receita.to_dict() for receita in receitas.items],
        'total': receitas.total,
        'pages': receitas.pages,
        'current_page': page
    })

@financeiro_bp.route('/receitas', methods=['POST'])
def create_receita():
    data = request.json
    receita = Receita(
        descricao=data['descricao'],
        valor=float(data['valor']),
        categoria=data['categoria'],
        data=datetime.strptime(data.get('data', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date()
    )
    db.session.add(receita)
    db.session.commit()
    return jsonify(receita.to_dict()), 201

@financeiro_bp.route('/receitas/<int:receita_id>', methods=['PUT'])
def update_receita(receita_id):
    receita = Receita.query.get_or_404(receita_id)
    data = request.json
    receita.descricao = data.get('descricao', receita.descricao)
    receita.valor = float(data.get('valor', receita.valor))
    receita.categoria = data.get('categoria', receita.categoria)
    if 'data' in data:
        receita.data = datetime.strptime(data['data'], '%Y-%m-%d').date()
    db.session.commit()
    return jsonify(receita.to_dict())

@financeiro_bp.route('/receitas/<int:receita_id>', methods=['DELETE'])
def delete_receita(receita_id):
    receita = Receita.query.get_or_404(receita_id)
    db.session.delete(receita)
    db.session.commit()
    return '', 204

# ========== ROTAS PARA GASTOS ==========
@financeiro_bp.route('/gastos', methods=['GET'])
def get_gastos():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    gastos = Gasto.query.order_by(Gasto.data.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'gastos': [gasto.to_dict() for gasto in gastos.items],
        'total': gastos.total,
        'pages': gastos.pages,
        'current_page': page
    })

@financeiro_bp.route('/gastos', methods=['POST'])
def create_gasto():
    data = request.json
    parcelas = int(data.get('parcelas', 1))
    valor_total = float(data['valor'])
    valor_parcela = valor_total / parcelas
    
    gastos_criados = []
    for i in range(parcelas):
        gasto = Gasto(
            descricao=data['descricao'],
            valor=valor_parcela,
            categoria=data['categoria'],
            tipo=data['tipo'],
            fixo=data.get('fixo', False),
            parcelas=parcelas,
            parcela_atual=i + 1,
            data=datetime.strptime(data.get('data', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
            pago=data.get('pago', False)
        )
        db.session.add(gasto)
        gastos_criados.append(gasto)
    
    db.session.commit()
    return jsonify([gasto.to_dict() for gasto in gastos_criados]), 201

@financeiro_bp.route('/gastos/<int:gasto_id>', methods=['PUT'])
def update_gasto(gasto_id):
    gasto = Gasto.query.get_or_404(gasto_id)
    data = request.json
    gasto.descricao = data.get('descricao', gasto.descricao)
    gasto.valor = float(data.get('valor', gasto.valor))
    gasto.categoria = data.get('categoria', gasto.categoria)
    gasto.tipo = data.get('tipo', gasto.tipo)
    gasto.fixo = data.get('fixo', gasto.fixo)
    gasto.pago = data.get('pago', gasto.pago)
    if 'data' in data:
        gasto.data = datetime.strptime(data['data'], '%Y-%m-%d').date()
    db.session.commit()
    return jsonify(gasto.to_dict())

@financeiro_bp.route('/gastos/<int:gasto_id>', methods=['DELETE'])
def delete_gasto(gasto_id):
    gasto = Gasto.query.get_or_404(gasto_id)
    db.session.delete(gasto)
    db.session.commit()
    return '', 204

# ========== ROTAS PARA METAS ==========
@financeiro_bp.route('/metas', methods=['GET'])
def get_metas():
    metas = Meta.query.all()
    return jsonify([meta.to_dict() for meta in metas])

@financeiro_bp.route('/metas', methods=['POST'])
def create_meta():
    data = request.json
    meta = Meta(
        descricao=data['descricao'],
        valor_meta=float(data['valor_meta']),
        valor_atual=float(data.get('valor_atual', 0))
    )
    db.session.add(meta)
    db.session.commit()
    return jsonify(meta.to_dict()), 201

@financeiro_bp.route('/metas/<int:meta_id>', methods=['PUT'])
def update_meta(meta_id):
    meta = Meta.query.get_or_404(meta_id)
    data = request.json
    meta.descricao = data.get('descricao', meta.descricao)
    meta.valor_meta = float(data.get('valor_meta', meta.valor_meta))
    meta.valor_atual = float(data.get('valor_atual', meta.valor_atual))
    db.session.commit()
    return jsonify(meta.to_dict())

@financeiro_bp.route('/metas/<int:meta_id>', methods=['DELETE'])
def delete_meta(meta_id):
    meta = Meta.query.get_or_404(meta_id)
    db.session.delete(meta)
    db.session.commit()
    return '', 204

# ========== ROTAS PARA DASHBOARD ==========
@financeiro_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    # Saldo total das contas
    saldo_total = db.session.query(func.sum(Conta.saldo)).scalar() or 0
    
    # Receitas do mÃªs atual
    hoje = date.today()
    receitas_mes = db.session.query(func.sum(Receita.valor)).filter(
        extract('month', Receita.data) == hoje.month,
        extract('year', Receita.data) == hoje.year
    ).scalar() or 0
    
    # Gastos do mÃªs atual
    gastos_mes = db.session.query(func.sum(Gasto.valor)).filter(
        extract('month', Gasto.data) == hoje.month,
        extract('year', Gasto.data) == hoje.year
    ).scalar() or 0
    
    return jsonify({
        'saldo_total': saldo_total,
        'receitas_mes': receitas_mes,
        'gastos_mes': gastos_mes,
        'balanco_mes': receitas_mes - gastos_mes
    })

# ========== ROTAS PARA RELATÃ“RIOS ==========
@financeiro_bp.route('/relatorios/gastos-categoria', methods=['GET'])
def relatorio_gastos_categoria():
    resultado = db.session.query(
        Gasto.categoria,
        func.sum(Gasto.valor).label('total')
    ).group_by(Gasto.categoria).all()
    
    return jsonify([
        {'categoria': r.categoria, 'valor': r.total}
        for r in resultado
    ])

@financeiro_bp.route('/relatorios/evolucao-mensal', methods=['GET'])
def relatorio_evolucao_mensal():
    meses = request.args.get('meses', 6, type=int)
    
    # Ãšltimos N meses
    dados = []
    hoje = date.today()
    
    for i in range(meses):
        # Calcular o mÃªs
        mes = hoje.month - i
        ano = hoje.year
        if mes <= 0:
            mes += 12
            ano -= 1
        
        # Receitas do mÃªs
        receitas = db.session.query(func.sum(Receita.valor)).filter(
            extract('month', Receita.data) == mes,
            extract('year', Receita.data) == ano
        ).scalar() or 0
        
        # Gastos do mÃªs
        gastos = db.session.query(func.sum(Gasto.valor)).filter(
            extract('month', Gasto.data) == mes,
            extract('year', Gasto.data) == ano
        ).scalar() or 0
        
        dados.append({
            'mes': f"{ano}-{mes:02d}",
            'nome_mes': calendar.month_name[mes],
            'receitas': receitas,
            'gastos': gastos,
            'balanco': receitas - gastos
        })
    
    return jsonify(list(reversed(dados)))

@financeiro_bp.route('/relatorios/balanco-geral', methods=['GET'])
def relatorio_balanco_geral():
    total_receitas = db.session.query(func.sum(Receita.valor)).scalar() or 0
    total_gastos = db.session.query(func.sum(Gasto.valor)).scalar() or 0
    saldo_contas = db.session.query(func.sum(Conta.saldo)).scalar() or 0
    
    return jsonify({
        'total_receitas': total_receitas,
        'total_gastos': total_gastos,
        'balanco': total_receitas - total_gastos,
        'saldo_contas': saldo_contas,
        'status': 'POSITIVO' if (total_receitas - total_gastos) >= 0 else 'NEGATIVO'
    })

# ========== ROTAS PARA DEVEDORES ==========
@financeiro_bp.route('/devedores', methods=['GET'])
def get_devedores():
    devedores = Devedor.query.all()
    return jsonify([devedor.to_dict() for devedor in devedores])

@financeiro_bp.route('/devedores', methods=['POST'])
def create_devedor():
    data = request.json
    devedor = Devedor(
        nome=data['nome'],
        valor=float(data['valor']),
        status=data.get('status', 'pendente'),
        descricao=data.get('descricao', ''),
        data_emprestimo=datetime.strptime(data.get('data_emprestimo', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
        data_vencimento=datetime.strptime(data['data_vencimento'], '%Y-%m-%d').date() if data.get('data_vencimento') else None,
        tipo_devedor=data.get('tipo_devedor', 'pessoa_fisica'),
        contato=data.get('contato', '')
    )
    db.session.add(devedor)
    db.session.commit()
    return jsonify(devedor.to_dict()), 201

@financeiro_bp.route('/devedores/<int:devedor_id>', methods=['PUT'])
def update_devedor(devedor_id):
    devedor = Devedor.query.get_or_404(devedor_id)
    data = request.json
    devedor.nome = data.get('nome', devedor.nome)
    devedor.valor = float(data.get('valor', devedor.valor))
    devedor.status = data.get('status', devedor.status)
    devedor.descricao = data.get('descricao', devedor.descricao)
    devedor.tipo_devedor = data.get('tipo_devedor', devedor.tipo_devedor)
    devedor.contato = data.get('contato', devedor.contato)
    if 'data_vencimento' in data and data['data_vencimento']:
        devedor.data_vencimento = datetime.strptime(data['data_vencimento'], '%Y-%m-%d').date()
    db.session.commit()
    return jsonify(devedor.to_dict())

@financeiro_bp.route('/devedores/<int:devedor_id>', methods=['DELETE'])
def delete_devedor(devedor_id):
    devedor = Devedor.query.get_or_404(devedor_id)
    db.session.delete(devedor)
    db.session.commit()
    return '', 204

@financeiro_bp.route('/devedores/<int:devedor_id>/marcar-pago', methods=['PUT'])
def marcar_devedor_pago(devedor_id):
    devedor = Devedor.query.get_or_404(devedor_id)
    devedor.status = 'pago'
    devedor.data_pagamento = datetime.now().date()
    db.session.commit()
    return jsonify(devedor.to_dict())

# ========== ROTAS PARA CALCULADORA FINANCEIRA ==========
@financeiro_bp.route('/calculadora/percentual-salario', methods=['POST'])
def calcular_percentual_salario():
    data = request.json
    salario = float(data['salario'])
    gastos = data.get('gastos', [])
    
    resultado = {
        'salario': salario,
        'gastos_detalhados': [],
        'total_gastos': 0,
        'percentual_total_gastos': 0,
        'valor_restante': 0,
        'percentual_restante': 0
    }
    
    total_gastos = 0
    for gasto in gastos:
        valor = float(gasto['valor'])
        percentual = (valor / salario) * 100 if salario > 0 else 0
        total_gastos += valor
        
        resultado['gastos_detalhados'].append({
            'categoria': gasto['categoria'],
            'valor': valor,
            'percentual': round(percentual, 2)
        })
    
    resultado['total_gastos'] = total_gastos
    resultado['percentual_total_gastos'] = round((total_gastos / salario) * 100, 2) if salario > 0 else 0
    resultado['valor_restante'] = salario - total_gastos
    resultado['percentual_restante'] = round(((salario - total_gastos) / salario) * 100, 2) if salario > 0 else 0
    
    return jsonify(resultado)

@financeiro_bp.route('/calculadora/regra-50-30-20', methods=['POST'])
def calcular_regra_50_30_20():
    data = request.json
    salario_liquido = float(data['salario_liquido'])
    
    resultado = {
        'salario_liquido': salario_liquido,
        'necessidades': {
            'valor': salario_liquido * 0.5,
            'percentual': 50,
            'descricao': 'Gastos essenciais (moradia, alimentaÃ§Ã£o, transporte, saÃºde)'
        },
        'desejos': {
            'valor': salario_liquido * 0.3,
            'percentual': 30,
            'descricao': 'Lazer, entretenimento, compras nÃ£o essenciais'
        },
        'poupanca': {
            'valor': salario_liquido * 0.2,
            'percentual': 20,
            'descricao': 'Reserva de emergÃªncia e investimentos'
        }
    }
    
    return jsonify(resultado)

@financeiro_bp.route('/calculadora/juros-compostos', methods=['POST'])
def calcular_juros_compostos():
    data = request.json
    capital_inicial = float(data['capital_inicial'])
    aporte_mensal = float(data.get('aporte_mensal', 0))
    taxa_juros_anual = float(data['taxa_juros_anual']) / 100
    periodo_anos = float(data['periodo_anos'])
    
    # ConversÃ£o para taxa mensal
    taxa_mensal = (1 + taxa_juros_anual) ** (1/12) - 1
    periodo_meses = int(periodo_anos * 12)
    
    # CÃ¡lculo do montante final
    montante_capital = capital_inicial * ((1 + taxa_mensal) ** periodo_meses)
    
    # CÃ¡lculo dos aportes mensais
    if aporte_mensal > 0:
        montante_aportes = aporte_mensal * (((1 + taxa_mensal) ** periodo_meses - 1) / taxa_mensal)
    else:
        montante_aportes = 0
    
    montante_final = montante_capital + montante_aportes
    total_investido = capital_inicial + (aporte_mensal * periodo_meses)
    juros_ganhos = montante_final - total_investido
    
    resultado = {
        'capital_inicial': capital_inicial,
        'aporte_mensal': aporte_mensal,
        'taxa_juros_anual': data['taxa_juros_anual'],
        'periodo_anos': periodo_anos,
        'total_investido': round(total_investido, 2),
        'montante_final': round(montante_final, 2),
        'juros_ganhos': round(juros_ganhos, 2),
        'rentabilidade_percentual': round((juros_ganhos / total_investido) * 100, 2) if total_investido > 0 else 0
    }
    
    return jsonify(resultado)

# ========== ROTA PARA INICIALIZAR DADOS ==========
@financeiro_bp.route('/inicializar', methods=['POST'])
def inicializar_dados():
    """Inicializa categorias padrÃ£o se nÃ£o existirem"""
    if Categoria.query.count() == 0:
        categorias_padrao = [
            Categoria(nome='AlimentaÃ§Ã£o', cor='#FF5722', tipo='gasto'),
            Categoria(nome='Transporte', cor='#2196F3', tipo='gasto'),
            Categoria(nome='Moradia', cor='#9C27B0', tipo='gasto'),
            Categoria(nome='SaÃºde', cor='#4CAF50', tipo='gasto'),
            Categoria(nome='EducaÃ§Ã£o', cor='#FF9800', tipo='gasto'),
            Categoria(nome='Lazer', cor='#E91E63', tipo='gasto'),
            Categoria(nome='SalÃ¡rio', cor='#4CAF50', tipo='receita'),
            Categoria(nome='Freelance', cor='#2196F3', tipo='receita'),
            Categoria(nome='Investimentos', cor='#9C27B0', tipo='receita'),
            Categoria(nome='Outros', cor='#607D8B', tipo='ambos')
        ]
        
        for categoria in categorias_padrao:
            db.session.add(categoria)
        
        db.session.commit()
        return jsonify({'message': 'Categorias padrÃ£o criadas com sucesso'}), 201
    
    return jsonify({'message': 'Categorias jÃ¡ existem'}), 200

