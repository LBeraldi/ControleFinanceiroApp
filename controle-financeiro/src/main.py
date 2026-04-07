import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from sqlalchemy import inspect
from src.models.financeiro import db, Conta, Categoria, Receita, Gasto, Meta, Devedor, TransacaoConta, Investimento
from src.routes.user import user_bp
from src.routes.financeiro import financeiro_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Habilitar CORS para todas as rotas
CORS(app)

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(financeiro_bp, url_prefix='/api')

# uncomment if you need to use database
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)


def run_sqlite_migrations():
    # Backward-compatible migration for existing SQLite databases.
    columns = {column['name'] for column in inspect(db.engine).get_columns('contas')}
    statements = []
    if 'nome' not in columns:
        statements.append("ALTER TABLE contas ADD COLUMN nome VARCHAR(100) NOT NULL DEFAULT 'Conta'")
    if 'tipo' not in columns:
        statements.append("ALTER TABLE contas ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'corrente'")
    if 'saldo_inicial' not in columns:
        statements.append("ALTER TABLE contas ADD COLUMN saldo_inicial FLOAT NOT NULL DEFAULT 0.0")
    if 'observacoes' not in columns:
        statements.append("ALTER TABLE contas ADD COLUMN observacoes TEXT")

    if statements:
        with db.engine.begin() as conn:
            for statement in statements:
                conn.exec_driver_sql(statement)

with app.app_context():
    db.create_all()
    run_sqlite_migrations()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
