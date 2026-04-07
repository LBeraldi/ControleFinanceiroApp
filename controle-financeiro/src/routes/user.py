from flask import Blueprint, jsonify, request
from src.models.financeiro import db

user_bp = Blueprint('user', __name__)

# Removendo as rotas de usuário por enquanto para focar no sistema financeiro
