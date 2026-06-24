from flask import Flask, request, jsonify, Response
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, verify_jwt_in_request
from flask_cors import CORS
import os
import datetime
import calendar
import smtplib
from email.mime.text import MIMEText
import random
import string
import pandas as pd
import io
from flask import send_file

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'chave-padrao-temporaria')

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

def add_months(sourcedate, months):
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year, month)[1])
    return datetime.date(year, month, day)

def calcular_fechamento(data_referencia, dia_fechamento, deslocamento=0):
    """
    Calcula a data do fechamento de fatura para uma data de referência,
    de acordo com o dia de fechamento configurado para o cliente.
    deslocamento=0  -> fechamento atual (o primeiro fechamento >= data_referencia)
    deslocamento=1  -> próximo fechamento
    deslocamento=2  -> daqui dois fechamentos
    Se dia_fechamento for None, retorna None (cliente sem fechamento configurado).
    """
    if not dia_fechamento:
        return None
    dia_fechamento = max(1, min(28, int(dia_fechamento)))
    ano, mes = data_referencia.year, data_referencia.month
    ultimo_dia_mes = calendar.monthrange(ano, mes)[1]
    dia_mes_atual = min(dia_fechamento, ultimo_dia_mes)
    fechamento_atual = datetime.date(ano, mes, dia_mes_atual)
    if data_referencia > fechamento_atual:
        fechamento_atual = add_months(fechamento_atual, 1)
    return add_months(fechamento_atual, deslocamento)

def calcular_vencimento_por_fechamento(data_fechamento):
    """
    Retorna a data de vencimento com base no fechamento de fatura:
    vencimento = data_fechamento + 10 dias corridos.
    Garante que todas as cobranças de um cliente com fechamento definido
    vençam sempre 10 dias após o fechamento, independente de quando
    a cobrança foi gerada.
    Se data_fechamento for None (cliente sem fechamento), retorna hoje como fallback.
    """
    if not data_fechamento:
        return datetime.date.today()
    return data_fechamento + datetime.timedelta(days=10)

# --- MODELOS DE BANCO DE DADOS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user')

class Funcionario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cpf = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100))
    telefone = db.Column(db.String(20))
    endereco = db.Column(db.String(200))
    cargo = db.Column(db.String(50), default='Secretaria')
    username = db.Column(db.String(50), nullable=False) 

class Instrutor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cargo = db.Column(db.String(50), default='Instrutor')
    email = db.Column(db.String(100))
    telefone = db.Column(db.String(20))
    cpf = db.Column(db.String(20), unique=True, nullable=False)
    nascimento = db.Column(db.String(20))
    endereco = db.Column(db.String(200))

class Aeronave(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.String(50), nullable=False)

class Cliente(db.Model):
    __tablename__ = 'cliente'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cpf = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100))
    telefone = db.Column(db.String(20))
    nascimento = db.Column(db.String(20))
    rua = db.Column(db.String(100))
    numero = db.Column(db.String(10))
    bairro = db.Column(db.String(50))
    cidade = db.Column(db.String(50))
    estado = db.Column(db.String(2))
    cep = db.Column(db.String(10))
    
    saldo_pago = db.Column(db.Float, default=0.0)
    suspenso = db.Column(db.Boolean, default=False)
    perfil = db.Column(db.String(200)) 
    
    mensalidade = db.Column(db.Float, default=0.0)
    duracao_meses = db.Column(db.Integer, default=1)
    descricao_servico = db.Column(db.String(100))
    valor_servico = db.Column(db.Float, default=0.0)

    # Dados de Treinamento Externo
    nome_treinamento = db.Column(db.String(100))
    valor_parcela = db.Column(db.Float, default=0.0)
    numero_parcelas = db.Column(db.Integer, default=1)

    # Dia do mês em que a fatura desse cliente fecha (1-28). Definido na contratação.
    dia_fechamento_fatura = db.Column(db.Integer, nullable=True)

    cobrancas = db.relationship('Cobranca', backref='cliente', lazy=True, cascade="all, delete-orphan")
    voos = db.relationship('Voo', backref='cliente_rel', lazy=True)
    creditos = db.relationship('Credito', backref='cliente_cred', lazy=True, cascade="all, delete-orphan")
    pacotes = db.relationship('PacoteHoras', backref='cliente_pacote', lazy=True, cascade="all, delete-orphan")

class Credito(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    valor = db.Column(db.Float, default=0.0)
    data_compra = db.Column(db.Date, default=datetime.date.today)

class PacoteHoras(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    aeronave_id = db.Column(db.Integer, db.ForeignKey('aeronave.id'), nullable=False)
    tipo_voo = db.Column(db.String(50), nullable=False)
    tipo_pagamento = db.Column(db.String(50), nullable=False)
    horas = db.Column(db.Float, nullable=False)
    valor = db.Column(db.Float, nullable=False)
    data_renegociacao = db.Column(db.Date, nullable=True)
    aeronave = db.relationship('Aeronave')

class Cobranca(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    descricao = db.Column(db.String(150), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    valor_pago = db.Column(db.Float, default=0.0)
    data_vencimento = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(30), default='Pendente')
    # Data do fechamento de fatura em que este título deve ser cobrado.
    # Permite adiar um título para o fechamento seguinte (ou daqui 2 fechamentos)
    # sem alterar a data de vencimento original.
    data_fechamento = db.Column(db.Date, nullable=True)

class Voo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    instrutor = db.Column(db.String(100))
    modelo = db.Column(db.String(100))
    tipo = db.Column(db.String(50))
    litros = db.Column(db.Float, default=0.0)
    custo = db.Column(db.Float, nullable=False)
    categoria_voo = db.Column(db.String(50), default='Solo')
    porcentagem_instrutor = db.Column(db.Float, default=0.0)
    horario_saida = db.Column(db.DateTime)
    horario_chegada = db.Column(db.DateTime)
    local_saida = db.Column(db.String(100))
    local_chegada = db.Column(db.String(100))

class Titulo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    descricao = db.Column(db.String(200))
    numero_parcela = db.Column(db.Integer)
    numero_nf = db.Column(db.String(50))
    data_emissao = db.Column(db.Date)
    data_vencimento = db.Column(db.Date)
    status = db.Column(db.String(20), default='pendente')
    valor_extra = db.Column(db.Float, default=0.0)

class ConfiguracaoBanco(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    banco_codigo = db.Column(db.String(3), default='756')
    agencia = db.Column(db.String(10), nullable=False)
    agencia_dv = db.Column(db.String(2))
    conta = db.Column(db.String(15), nullable=False)
    conta_dv = db.Column(db.String(2))
    convenio = db.Column(db.String(20), nullable=False)
    codigo_cedente = db.Column(db.String(20))
    nome_empresa = db.Column(db.String(100))
    cnpj_empresa = db.Column(db.String(20))

with app.app_context():
    db.create_all()
    if not User.query.filter_by(username='admin').first():
        hashed_admin = bcrypt.generate_password_hash('admin123').decode('utf-8')
        db.session.add(User(username='admin', password=hashed_admin, role='admin'))
    db.session.commit()

# --- ROTAS DA API ---

@app.route('/api/funcionarios', methods=['GET', 'POST', 'OPTIONS'])
def handle_funcionarios():
    if request.method == 'OPTIONS': return '', 200
    if request.method == 'GET':
        return jsonify([{'id': f.id, 'nome': f.nome, 'cpf': f.cpf, 'email': f.email, 'telefone': f.telefone, 'endereco': f.endereco, 'cargo': f.cargo, 'username': f.username} for f in Funcionario.query.all()])
    data = request.json
    try:
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Este usuário de login já existe.'}), 400
        hashed_pw = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        role = 'secretaria' if data.get('cargo') == 'Secretaria' else 'admin'
        novo_usuario = User(username=data['username'], password=hashed_pw, role=role)
        db.session.add(novo_usuario)
        novo_func = Funcionario(
            nome=data['nome'], cpf=data['cpf'], email=data.get('email'),
            telefone=data.get('telefone'), endereco=data.get('endereco'),
            cargo=data.get('cargo', 'Secretaria'), username=data['username']
        )
        db.session.add(novo_func)
        db.session.commit()
        return jsonify({'msg': 'Funcionário cadastrado e usuário criado'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/funcionarios/<int:id>', methods=['PUT', 'DELETE', 'OPTIONS'])
def update_delete_funcionario(id):
    if request.method == 'OPTIONS': return '', 200
    func = Funcionario.query.get_or_404(id)
    if request.method == 'DELETE':
        try:
            user = User.query.filter_by(username=func.username).first()
            if user: db.session.delete(user)
            db.session.delete(func)
            db.session.commit()
            return jsonify({'msg': 'Funcionário removido'}), 200
        except Exception:
            db.session.rollback()
            return jsonify({'error': 'Erro ao remover'}), 500
    if request.method == 'PUT':
        data = request.json
        try:
            for key in ['nome', 'email', 'telefone', 'endereco', 'cargo']:
                if key in data: setattr(func, key, data[key])
            if data.get('password') and data['password'].strip() != '':
                user = User.query.filter_by(username=func.username).first()
                if user:
                    user.password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
                    if 'cargo' in data: user.role = 'secretaria' if data['cargo'] == 'Secretaria' else 'admin'
            db.session.commit()
            return jsonify({'msg': 'Atualizado'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

@app.route('/api/clientes', methods=['GET', 'POST', 'OPTIONS'])
def handle_clientes():
    if request.method == 'OPTIONS': return '', 200
    if request.method == 'GET':
        hoje = datetime.date.today()
        clientes = Cliente.query.all()
        modificado = False
        for c in clientes:
            for cob in c.cobrancas:
                if cob.status != 'Abatido':
                    novo_status = cob.status
                    vp = getattr(cob, 'valor_pago', 0)
                    if vp >= cob.valor: novo_status = 'Abatido'
                    elif vp > 0: novo_status = 'Parcialmente Abatido'
                    elif cob.data_vencimento < hoje: novo_status = 'Atrasado'
                    else: novo_status = 'Pendente'
                    if cob.status != novo_status:
                        cob.status = novo_status
                        modificado = True
        if modificado: db.session.commit()
        result = []
        for c in clientes:
            debito_cobrancas = sum(cob.valor for cob in c.cobrancas)
            vencido_cobrancas = sum(cob.valor for cob in c.cobrancas if cob.data_vencimento <= hoje)
            custo_voos = sum(v.custo for v in c.voos)
            total_debito = round(debito_cobrancas, 2)
            total_vencido = round(vencido_cobrancas, 2)
            result.append({
                'id': c.id, 'nome': c.nome, 'cpf': c.cpf, 'email': c.email, 'telefone': c.telefone, 'nascimento': c.nascimento,
                'rua': c.rua, 'numero': c.numero, 'bairro': c.bairro, 'cidade': c.cidade, 'estado': c.estado, 'cep': c.cep,
                'perfil': c.perfil or '', 'mensalidade': c.mensalidade, 'duracao_meses': c.duracao_meses,
                'descricao_servico': c.descricao_servico, 'valor_servico': c.valor_servico, 'voos_debito': custo_voos, 
                'nome_treinamento': c.nome_treinamento, 'valor_parcela': c.valor_parcela, 'numero_parcelas': c.numero_parcelas,
                'dia_fechamento_fatura': c.dia_fechamento_fatura,
                'debito_servicos': debito_cobrancas, 'totalDebito': total_debito, 'totalVencido': total_vencido, 
                'saldoPago': round(c.saldo_pago, 2), 'suspenso': c.suspenso,
                'cobrancas': [{'id': cob.id, 'descricao': cob.descricao, 'valor': cob.valor, 'valor_pago': getattr(cob, 'valor_pago', 0), 'data_vencimento': cob.data_vencimento.strftime('%Y-%m-%d'), 'status': cob.status, 'data_fechamento': cob.data_fechamento.strftime('%Y-%m-%d') if cob.data_fechamento else None} for cob in c.cobrancas],
                'creditos': [{'valor': cred.valor, 'data_compra': cred.data_compra.strftime('%Y-%m-%d') if cred.data_compra else hoje.strftime('%Y-%m-%d')} for cred in c.creditos],
                'pacotes': [{'id': p.id, 'horas': p.horas, 'aeronave': p.aeronave.nome if p.aeronave else 'Removida', 'tipo_voo': p.tipo_voo, 'tipo_pagamento': p.tipo_pagamento, 'valor': p.valor, 'data_renegociacao': p.data_renegociacao.strftime('%Y-%m-%d') if p.data_renegociacao else None} for p in c.pacotes]
            })
        return jsonify(result)
    
    data = request.json
    try:
        perfis = data.get('perfis', [])
        data_base = datetime.date.today()
        dia_fechamento_fatura = data.get('dia_fechamento_fatura')
        dia_fechamento_fatura = int(dia_fechamento_fatura) if dia_fechamento_fatura else None
        # Valida que clientes com cobranças parceladas tenham dia de fechamento configurado
        tem_perfil_cobrado = any(p in data.get('perfis', []) for p in ['Sócio', 'Externo', 'Outro'])
        if tem_perfil_cobrado and not dia_fechamento_fatura:
            return jsonify({'error': 'Informe o dia de fechamento de fatura do cliente. É obrigatório para gerar as cobranças corretamente.'}), 400
        cliente = Cliente(
            nome=data['nome'], cpf=data['cpf'], email=data.get('email'), telefone=data.get('telefone'), nascimento=data.get('nascimento'),
            rua=data.get('rua'), numero=data.get('numero'), bairro=data.get('bairro'), cidade=data.get('cidade'), estado=data.get('estado'), 
            cep=data.get('cep'), perfil=", ".join(perfis), dia_fechamento_fatura=dia_fechamento_fatura
        )
        if 'Sócio' in perfis:
            cliente.mensalidade = float(data.get('mensalidade', 0))
            cliente.duracao_meses = int(data.get('duracao_meses', 1))
            db.session.add(cliente)
            db.session.flush()
            # Fechamento base: o primeiro fechamento a partir de data_base
            fechamento_base = calcular_fechamento(data_base, dia_fechamento_fatura)
            for i in range(cliente.duracao_meses):
                fechamento = add_months(fechamento_base, i) if fechamento_base else None
                venc = calcular_vencimento_por_fechamento(fechamento)
                db.session.add(Cobranca(cliente_id=cliente.id, descricao=f"Mensalidade - Parcela {i+1}/{cliente.duracao_meses}", valor=cliente.mensalidade, data_vencimento=venc, data_fechamento=fechamento))
        if 'Externo' in perfis:
            cliente.nome_treinamento = data.get('nome_treinamento')
            cliente.valor_parcela = float(data.get('valor_parcela', 0))
            cliente.numero_parcelas = int(data.get('numero_parcelas', 1))
            if not cliente.id:
                db.session.add(cliente)
                db.session.flush()
            fechamento_base_ext = calcular_fechamento(data_base, dia_fechamento_fatura)
            for i in range(cliente.numero_parcelas):
                fechamento = add_months(fechamento_base_ext, i) if fechamento_base_ext else None
                venc = calcular_vencimento_por_fechamento(fechamento)
                parcela_txt = f" - Parcela {i+1}/{cliente.numero_parcelas}" if cliente.numero_parcelas > 1 else ""
                db.session.add(Cobranca(cliente_id=cliente.id, descricao=f"Treinamento Externo: {cliente.nome_treinamento}{parcela_txt}", valor=cliente.valor_parcela, data_vencimento=venc, data_fechamento=fechamento))
        if 'Outro' in perfis:
            duracao = int(data.get('duracao_outro', 1))
            cliente.descricao_servico = data.get('descricao_servico')
            cliente.valor_servico = float(data.get('valor_servico', 0))
            if not cliente.id:
                db.session.add(cliente)
                db.session.flush()
            fechamento_base_out = calcular_fechamento(data_base, dia_fechamento_fatura)
            for i in range(duracao):
                fechamento = add_months(fechamento_base_out, i) if fechamento_base_out else None
                venc = calcular_vencimento_por_fechamento(fechamento)
                parcela_txt = f" - Parcela {i+1}/{duracao}" if duracao > 1 else ""
                db.session.add(Cobranca(cliente_id=cliente.id, descricao=f"Serviço: {cliente.descricao_servico}{parcela_txt}", valor=cliente.valor_servico, data_vencimento=venc, data_fechamento=fechamento))
        if not cliente.id:
            db.session.add(cliente)
            db.session.flush()
        if 'Sócio' in perfis or 'Aluno' in perfis:
            valor_credito = float(data.get('valor_credito') or 0)
            if valor_credito > 0:
                cliente.saldo_pago += valor_credito
                db.session.add(Credito(cliente_id=cliente.id, valor=valor_credito))
                db.session.add(Cobranca(cliente_id=cliente.id, descricao=f"Compra de {valor_credito} créditos", valor=valor_credito, data_vencimento=datetime.date.today(), status='Abatido', valor_pago=valor_credito))
        db.session.commit()
        return jsonify({'msg': 'Criado com sucesso'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/clientes/<int:id>', methods=['PUT', 'DELETE', 'OPTIONS'])
def update_delete_cliente(id):
    if request.method == 'OPTIONS': return '', 200
    if request.method == 'DELETE':
        try:
            cliente = Cliente.query.get_or_404(id)
            db.session.delete(cliente)
            db.session.commit()
            return jsonify({'msg': 'Cliente removido'}), 200
        except Exception:
            db.session.rollback()
            return jsonify({'error': 'Erro ao remover'}), 500
    if request.method == 'PUT':
        cliente = Cliente.query.get_or_404(id)
        data = request.json
        try:
            for key, value in data.items():
                if hasattr(cliente, key) and key != 'perfis': setattr(cliente, key, value)
            if 'perfis' in data: cliente.perfil = ", ".join(data['perfis'])
            db.session.commit()
            return jsonify({'msg': 'Cliente atualizado'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

@app.route('/api/clientes/<int:id>/renovar', methods=['POST', 'OPTIONS'])
def renovar_contrato(id):
    if request.method == 'OPTIONS': return '', 200
    cliente = Cliente.query.get_or_404(id)
    try:
        data = request.json
        tipo_renovacao = data.get('tipo', 'Sócio')
        duracao = int(data.get('duracao_meses', 1))
        data_base = datetime.date.today()
        novo_valor = float(data.get('novo_valor', 0))
        
        if tipo_renovacao == 'Sócio':
            cliente.mensalidade = novo_valor 
            desc_base = "Mensalidade (Renovação)"
            cliente.duracao_meses = duracao
        elif tipo_renovacao == 'Externo':
            cliente.valor_parcela = novo_valor
            cliente.numero_parcelas = duracao
            desc_base = f"Treinamento Externo: {cliente.nome_treinamento} (Renovação)"
        elif tipo_renovacao == 'Outro':
            cliente.valor_servico = novo_valor 
            desc_base = f"Serviço: {cliente.descricao_servico} (Renovação)"
        else: return jsonify({'error': 'Tipo de renovação inválida'}), 400

        fechamento_base_ren = calcular_fechamento(data_base, cliente.dia_fechamento_fatura)
        for i in range(duracao):
            fechamento = add_months(fechamento_base_ren, i) if fechamento_base_ren else None
            venc = calcular_vencimento_por_fechamento(fechamento)
            db.session.add(Cobranca(cliente_id=cliente.id, descricao=f"{desc_base} - Parcela {i+1}/{duracao}", valor=novo_valor, data_vencimento=venc, data_fechamento=fechamento))
        db.session.commit()
        return jsonify({'msg': 'Contrato renovado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/clientes/<int:id>/suspender', methods=['PUT', 'OPTIONS'])
def toggle_suspensao_cliente(id):
    if request.method == 'OPTIONS': return '', 200
    try:
        cliente = Cliente.query.get_or_404(id)
        cliente.suspenso = not cliente.suspenso
        db.session.commit()
        return jsonify({'msg': 'Atualizado', 'suspenso': cliente.suspenso}), 200
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Erro'}), 500

@app.route('/api/clientes/<int:id>/pagar', methods=['PUT', 'OPTIONS'])
def pagar_cliente(id):
    if request.method == 'OPTIONS': return '', 200
    cliente = Cliente.query.get_or_404(id)
    try:
        data = request.json
        valor = float(data.get('valor', 0))
        cobranca_id = data.get('cobranca_id')
        if cobranca_id:
            cobranca = Cobranca.query.get(int(cobranca_id))
            if cobranca and cobranca.cliente_id == cliente.id:
                cobranca.valor_pago = getattr(cobranca, 'valor_pago', 0.0) + valor
                hoje = datetime.date.today()
                if cobranca.valor_pago >= cobranca.valor:
                    cobranca.status = 'Abatido'
                    cobranca.valor_pago = cobranca.valor 
                elif cobranca.valor_pago > 0: cobranca.status = 'Parcialmente Abatido'
                elif cobranca.data_vencimento < hoje: cobranca.status = 'Atrasado'
                else: cobranca.status = 'Pendente'
        cliente.saldo_pago += valor
        db.session.commit()
        return jsonify({'msg': 'Pagamento registrado'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/clientes/<int:id>/creditos', methods=['POST', 'OPTIONS'])
def add_credito(id):
    if request.method == 'OPTIONS': return '', 200
    cliente = Cliente.query.get_or_404(id)
    data = request.json
    try:
        valor = float(data.get('valor', 0))
        if valor > 0:
            db.session.add(Credito(cliente_id=cliente.id, valor=valor))
            cliente.saldo_pago += valor
            db.session.add(Cobranca(cliente_id=cliente.id, descricao=f"Compra de {valor} créditos", valor=valor, data_vencimento=datetime.date.today(), status='Abatido', valor_pago=valor))
            db.session.commit()
            return jsonify({'msg': 'Crédito adicionado'}), 200
        else: return jsonify({'error': 'Valor deve ser maior que zero'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/clientes/<int:id>/pacotes', methods=['POST', 'OPTIONS'])
def add_pacote(id):
    if request.method == 'OPTIONS': return '', 200
    cliente = Cliente.query.get_or_404(id)
    data = request.json
    try:
        if not data.get('aeronave_id'):
            return jsonify({'error': 'Selecione a aeronave vinculada ao pacote.'}), 400
        try:
            horas = float(data.get('horas') or 0)
        except (TypeError, ValueError):
            return jsonify({'error': 'Informe a quantidade de horas do pacote.'}), 400
        try:
            valor = float(data.get('valor') or 0)
        except (TypeError, ValueError):
            return jsonify({'error': 'Informe o valor do pacote.'}), 400
        if horas <= 0:
            return jsonify({'error': 'A quantidade de horas deve ser maior que zero.'}), 400
        if valor <= 0:
            return jsonify({'error': 'O valor do pacote deve ser maior que zero.'}), 400

        tipo_pagamento = data.get('tipo_pagamento') or 'Crédito'
        novo_pacote = PacoteHoras(cliente_id=cliente.id, aeronave_id=int(data['aeronave_id']), tipo_voo=data.get('tipo_voo', 'Solo'), tipo_pagamento=tipo_pagamento, horas=horas, valor=valor)
        db.session.add(novo_pacote)
        if tipo_pagamento == 'Crédito':
            if (cliente.saldo_pago or 0) < valor:
                return jsonify({'error': f'Saldo de créditos insuficiente. Disponível: R$ {cliente.saldo_pago:.2f}, necessário: R$ {valor:.2f}.'}), 400
            db.session.add(Credito(cliente_id=cliente.id, valor=-valor))
            cliente.saldo_pago -= valor
        else:
            fechamento = calcular_fechamento(datetime.date.today(), cliente.dia_fechamento_fatura)
            venc_pacote = calcular_vencimento_por_fechamento(fechamento)
            db.session.add(Cobranca(cliente_id=cliente.id, descricao=f"Pacote de Voo ({horas}h - {data.get('tipo_voo', 'Solo')})", valor=valor, valor_pago=0.0, data_vencimento=venc_pacote, status='Pendente', data_fechamento=fechamento))
        db.session.commit()
        return jsonify({'msg': 'Pacote adicionado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pacotes/<int:id>/renegociar', methods=['PUT', 'OPTIONS'])
def renegociar_pacote(id):
    if request.method == 'OPTIONS': return '', 200
    pacote = PacoteHoras.query.get_or_404(id)
    try:
        data = request.json
        nova_data = data.get('data_renegociacao')
        if nova_data:
            pacote.data_renegociacao = datetime.datetime.strptime(nova_data, '%Y-%m-%d').date()
            db.session.commit()
            return jsonify({'msg': 'Data de renegociação salva.'}), 200
        return jsonify({'error': 'Data inválida.'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# --- ADIAMENTO DE TÍTULOS PARA OUTRO FECHAMENTO DE FATURA ---
@app.route('/api/titulos-receber/adiar', methods=['PUT', 'OPTIONS'])
def adiar_titulos_receber():
    if request.method == 'OPTIONS': return '', 200
    data = request.json
    try:
        ids = data.get('ids', [])
        deslocamento = int(data.get('deslocamento', 1))  # 1 = próximo fechamento, 2 = daqui dois fechamentos
        if not ids:
            return jsonify({'error': 'Selecione ao menos um título para adiar.'}), 400
        if deslocamento not in (0, 1, 2):
            return jsonify({'error': 'Deslocamento inválido. Use 0 (atual), 1 (próximo) ou 2 (daqui dois fechamentos).'}), 400

        atualizados = []
        for titulo_id in ids:
            cobranca = Cobranca.query.get(int(titulo_id))
            if not cobranca or cobranca.status == 'Abatido':
                continue
            cliente = cobranca.cliente
            dia_fechamento = cliente.dia_fechamento_fatura if cliente else None
            if not dia_fechamento:
                continue  # cliente sem fechamento configurado: não há para onde adiar
            referencia = cobranca.data_fechamento or cobranca.data_vencimento or datetime.date.today()
            novo_fechamento = calcular_fechamento(referencia, dia_fechamento, deslocamento)
            cobranca.data_fechamento = novo_fechamento
            # Atualiza vencimento para manter consistência: fechamento + 10 dias
            cobranca.data_vencimento = calcular_vencimento_por_fechamento(novo_fechamento)
            atualizados.append(cobranca.id)
        db.session.commit()
        return jsonify({'msg': f'{len(atualizados)} título(s) adiado(s) com sucesso.', 'ids_atualizados': atualizados}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/titulos-receber', methods=['GET', 'OPTIONS'])
def handle_titulos_receber():
    if request.method == 'OPTIONS': return '', 200
    hoje = datetime.date.today()
    cobrancas = Cobranca.query.all()
    modificado = False
    for cob in cobrancas:
        if cob.status != 'Abatido':
            novo_status = cob.status
            vp = getattr(cob, 'valor_pago', 0)
            if vp >= cob.valor: novo_status = 'Abatido'
            elif vp > 0: novo_status = 'Parcialmente Abatido'
            elif cob.data_vencimento < hoje: novo_status = 'Atrasado'
            else: novo_status = 'Pendente'
            if cob.status != novo_status:
                cob.status = novo_status
                modificado = True
    if modificado: db.session.commit()
    cobrancas = Cobranca.query.order_by(Cobranca.data_vencimento.asc(), Cobranca.id.asc()).all()
    return jsonify([{'id': c.id, 'cliente_id': c.cliente_id, 'descricao': c.descricao, 'valor': c.valor, 'valor_pago': getattr(c, 'valor_pago', 0), 'data_vencimento': c.data_vencimento.strftime('%Y-%m-%d'), 'data_fechamento': c.data_fechamento.strftime('%Y-%m-%d') if c.data_fechamento else None, 'status': c.status, 'cliente': c.cliente.nome if c.cliente else 'Cliente Removido', 'perfil': c.cliente.perfil if c.cliente else 'N/A'} for c in cobrancas])

@app.route('/api/titulos-receber/<int:id>/status', methods=['PUT', 'OPTIONS'])
def update_status_cobranca(id):
    if request.method == 'OPTIONS': return '', 200
    cobranca = Cobranca.query.get_or_404(id)
    try:
        cobranca.status = request.json.get('status', cobranca.status)
        db.session.commit()
        return jsonify({'msg': 'Status atualizado'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/titulos-receber/<int:id>', methods=['DELETE', 'OPTIONS'])
def delete_cobranca(id):
    if request.method == 'OPTIONS': return '', 200
    try:
        db.session.delete(Cobranca.query.get_or_404(id))
        db.session.commit()
        return jsonify({'msg': 'Removido'})
    except Exception: return jsonify({'error': 'Erro'}), 500

 # --- EXPORTAÇÃO EXCEL: TÍTULOS A RECEBER E ATRASADOS ---
@app.route('/api/relatorios/titulos-receber/excel', methods=['GET', 'POST', 'OPTIONS'])
def exportar_excel_titulos_receber():
    if request.method == 'OPTIONS': return '', 200
    
    hoje = datetime.date.today()
    cobrancas = Cobranca.query.all()
    
    # Atualiza os status antes de exportar
    modificado = False
    for cob in cobrancas:
        if cob.status != 'Abatido':
            novo_status = cob.status
            vp = getattr(cob, 'valor_pago', 0)
            if vp >= cob.valor: novo_status = 'Abatido'
            elif vp > 0: novo_status = 'Parcialmente Abatido'
            elif cob.data_vencimento < hoje: novo_status = 'Atrasado'
            else: novo_status = 'Pendente'
            if cob.status != novo_status:
                cob.status = novo_status
                modificado = True
    if modificado: db.session.commit()

    # No POST, o frontend envia exatamente os IDs marcados nas checkboxes
    # (respeitando a seleção feita pelo usuário, independente dos filtros aplicados na tela).
    # No GET (sem corpo), mantém o comportamento de exportar todos os títulos.
    ids_selecionados = None
    if request.method == 'POST':
        body = request.get_json(silent=True) or {}
        ids_selecionados = body.get('ids')
        if ids_selecionados is not None and len(ids_selecionados) == 0:
            return jsonify({'error': 'Selecione ao menos um título para exportar.'}), 400

    query = Cobranca.query.order_by(Cobranca.data_vencimento.asc())
    if ids_selecionados:
        ids_int = [int(i) for i in ids_selecionados]
        query = query.filter(Cobranca.id.in_(ids_int))
    cobrancas = query.all()

    if not cobrancas:
        return jsonify({'error': 'Nenhum título encontrado para exportar.'}), 400
    
    # Monta a estrutura de dados para a tabela
    dados_excel = []
    for c in cobrancas:
        saldo_devedor = c.valor - getattr(c, 'valor_pago', 0)
        dados_excel.append({
            'Código Fatura': f"FAT-{c.id}",
            'Cliente': c.cliente.nome if c.cliente else 'Cliente Removido',
            'Perfil': c.cliente.perfil if c.cliente else 'N/A',
            'Descrição da Cobrança': c.descricao,
            'Data de Vencimento': c.data_vencimento.strftime('%d/%m/%Y'),
            'Fechamento de Fatura': c.data_fechamento.strftime('%d/%m/%Y') if c.data_fechamento else '-',
            'Status': c.status,
            'Valor Total (R$)': round(c.valor, 2),
            'Valor Pago (R$)': round(getattr(c, 'valor_pago', 0), 2),
            'Saldo a Receber (R$)': round(saldo_devedor, 2)
        })
    
    # Cria o DataFrame (Tabela do Pandas)
    df = pd.DataFrame(dados_excel)
    
    # Converte para um arquivo Excel em memória
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Títulos a Receber')
        
        # Ajusta a largura das colunas automaticamente
        worksheet = writer.sheets['Títulos a Receber']
        for idx, col in enumerate(df.columns):
            max_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = max_len
            
    output.seek(0)
    
    # Envia o arquivo para o navegador do usuário
    nome_arquivo = f"Relatorio_Inadimplencia_e_Receitas_{hoje.strftime('%Y%m%d')}.xlsx"
    return send_file(
        output,
        download_name=nome_arquivo,
        as_attachment=True,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )   

@app.route('/api/instrutores', methods=['GET', 'POST', 'OPTIONS'])
def handle_instrutores():
    if request.method == 'OPTIONS': return '', 200
    if request.method == 'GET': return jsonify([{'id': i.id, 'nome': i.nome, 'cargo': i.cargo, 'email': i.email, 'telefone': i.telefone, 'cpf': i.cpf, 'nascimento': i.nascimento, 'endereco': i.endereco} for i in Instrutor.query.all()])
    try:
        db.session.add(Instrutor(**request.json))
        db.session.commit()
        return jsonify({'msg': 'Criado'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/instrutores/<int:id>', methods=['PUT', 'DELETE', 'OPTIONS'])
def update_delete_instrutor(id):
    if request.method == 'OPTIONS': return '', 200
    instrutor = Instrutor.query.get_or_404(id)
    if request.method == 'DELETE':
        try:
            db.session.delete(instrutor)
            db.session.commit()
            return jsonify({'msg': 'Removido'}), 200
        except Exception:
            db.session.rollback()
            return jsonify({'error': 'Erro ao remover'}), 500
    if request.method == 'PUT':
        try:
            for key, value in request.json.items():
                if hasattr(instrutor, key): setattr(instrutor, key, value)
            db.session.commit()
            return jsonify({'msg': 'Atualizado'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

@app.route('/api/voos', methods=['GET', 'POST', 'OPTIONS'])
def handle_voos():
    if request.method == 'OPTIONS': return '', 200
    if request.method == 'GET':
        return jsonify([{
            'id': v.id, 'aluno': v.cliente_rel.nome if v.cliente_rel else 'Cliente Removido', 
            'instrutor': v.instrutor, 'modelo': v.modelo, 'tipo': v.tipo, 'custo': v.custo,
            'categoria_voo': v.categoria_voo, 'porcentagem_instrutor': v.porcentagem_instrutor,
            'horario_saida': v.horario_saida.strftime('%Y-%m-%dT%H:%M') if v.horario_saida else '',
            'horario_chegada': v.horario_chegada.strftime('%Y-%m-%dT%H:%M') if v.horario_chegada else '',
            'local_saida': v.local_saida, 'local_chegada': v.local_chegada
        } for v in Voo.query.all()])
    try:
        data = request.json
        cliente_id = int(data['cliente_id'])
        
        h_saida_str, h_chegada_str = data.get('horario_saida', ''), data.get('horario_chegada', '')
        h_saida_dt = datetime.datetime.strptime(h_saida_str, '%Y-%m-%dT%H:%M') if h_saida_str else None
        h_chegada_dt = datetime.datetime.strptime(h_chegada_str, '%Y-%m-%dT%H:%M') if h_chegada_str else None

        # CÁLCULO DE FRAÇÃO DE HORA COM TOLERÂNCIA DE 2 MINUTOS
        fracao_hora = 0.0
        if h_saida_dt and h_chegada_dt:
            delta_minutes = (h_chegada_dt - h_saida_dt).total_seconds() / 60.0
            
            # Tolerância: Se passar até 2 min da hora cheia, arredonda pra baixo. 
            # Se faltar até 2 min pra hora cheia, arredonda pra cima.
            min_remainder = delta_minutes % 60
            if min_remainder <= 2:
                delta_minutes -= min_remainder
            elif min_remainder >= 58:
                delta_minutes += (60 - min_remainder)
            
            fracao_hora = round(delta_minutes / 60.0, 2)

        custo_total = float(data.get('custo', 0))
        forma_pagamento = data.get('forma_pagamento', 'cobranca')
        pacote_id = data.get('pacote_id')

        # 1. REGISTRO DO VOO
        novo_voo = Voo(
            cliente_id=cliente_id, instrutor=data.get('instrutor', ''), 
            modelo=data['modelo'], tipo=data['tipo'], litros=float(data.get('litros') or 0), 
            custo=custo_total, categoria_voo=data.get('categoria_voo', 'Solo'),
            porcentagem_instrutor=float(data.get('porcentagem_instrutor') or 0),
            horario_saida=h_saida_dt, horario_chegada=h_chegada_dt,
            local_saida=data.get('local_saida', ''), local_chegada=data.get('local_chegada', '')
        )
        db.session.add(novo_voo)
        
        # 2. FORMA DE PAGAMENTO DO CLIENTE
        cliente = Cliente.query.get(cliente_id)
        if forma_pagamento == 'pacote' and pacote_id:
            pacote = PacoteHoras.query.get(pacote_id)
            if pacote and pacote.horas >= fracao_hora:
                pacote.horas -= fracao_hora  # Desconta a fração exata do pacote
            else:
                return jsonify({'error': f'Horas insuficientes no pacote. Necessário: {fracao_hora}h.'}), 400
        elif forma_pagamento == 'cobranca':
            fechamento_voo = calcular_fechamento(datetime.date.today(), cliente.dia_fechamento_fatura)
            venc_voo = calcular_vencimento_por_fechamento(fechamento_voo)
            db.session.add(Cobranca(
                cliente_id=cliente.id,
                descricao=f"Voo {data['modelo']} ({fracao_hora}h operadas)",
                valor=custo_total,
                data_vencimento=venc_voo,
                status='Pendente',
                data_fechamento=fechamento_voo
            ))

        # 3. GERAÇÃO AUTOMÁTICA DE TÍTULO PARA O INSTRUTOR
        porcentagem = float(data.get('porcentagem_instrutor') or 0)
        nome_instrutor = data.get('instrutor')
        if nome_instrutor and porcentagem > 0:
            valor_instrutor = custo_total * (porcentagem / 100)
            db.session.add(Titulo(
                tipo='Pagamento de fornecedor',
                valor=valor_instrutor,
                descricao=f"Comissão de Voo ({fracao_hora}h) - Instrutor: {nome_instrutor}",
                numero_parcela=1,
                data_emissao=datetime.date.today(),
                data_vencimento=datetime.date.today() + datetime.timedelta(days=5),
                status='pendente'
            ))

        db.session.commit()
        return jsonify({'msg': 'Voo registrado com sucesso!'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/voos/<int:id>', methods=['DELETE', 'OPTIONS'])
def delete_voo(id):
    if request.method == 'OPTIONS': return '', 200
    try:
        db.session.delete(Voo.query.get_or_404(id))
        db.session.commit()
        return jsonify({'msg': 'Voo removido'}), 200
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Erro'}), 500

@app.route('/api/aeronaves', methods=['GET', 'POST', 'OPTIONS'])
def handle_aeronaves():
    if request.method == 'OPTIONS': return '', 200
    if request.method == 'GET': return jsonify([{'id': a.id, 'nome': a.nome, 'tipo': a.tipo} for a in Aeronave.query.all()])
    try:
        db.session.add(Aeronave(**request.json))
        db.session.commit()
        return jsonify({'msg': 'Criada'}), 201
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Erro'}), 500

@app.route('/api/config/banco', methods=['GET', 'POST', 'OPTIONS'])
def handle_config_banco():
    if request.method == 'OPTIONS': return '', 200
    config = ConfiguracaoBanco.query.first()
    if request.method == 'GET':
        if not config: return jsonify({}), 200
        return jsonify({'banco_codigo': config.banco_codigo, 'agencia': config.agencia, 'agencia_dv': config.agencia_dv, 'conta': config.conta, 'conta_dv': config.conta_dv, 'convenio': config.convenio, 'codigo_cedente': config.codigo_cedente, 'nome_empresa': config.nome_empresa, 'cnpj_empresa': config.cnpj_empresa})
    data = request.json
    try:
        if not config:
            config = ConfiguracaoBanco()
            db.session.add(config)
        for key, value in data.items():
            if hasattr(config, key): setattr(config, key, value)
        db.session.commit()
        return jsonify({'msg': 'Configuração salva'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def _cnab_num(value, length):
    """Formata número para campo CNAB: zeros à esquerda, sem decimais."""
    try:
        return str(int(round(float(value)))).zfill(length)[:length]
    except Exception:
        return '0' * length

def _cnab_val(value, length, decimals=2):
    """Formata valor monetário para campo CNAB (sem ponto/vírgula)."""
    try:
        cents = int(round(float(value) * (10 ** decimals)))
        return str(cents).zfill(length)[:length]
    except Exception:
        return '0' * length

def _cnab_alfa(value, length):
    """Formata campo alfanumérico para campo CNAB: espaços à direita, maiúsculas, sem acentos."""
    import unicodedata
    if value is None:
        value = ''
    value = str(value).upper()
    value = ''.join(c for c in unicodedata.normalize('NFD', value) if unicodedata.category(c) != 'Mn')
    return value.ljust(length)[:length]

def _cnab_data(d):
    """Formata data para DDMMAAAA."""
    if d is None:
        return '00000000'
    if isinstance(d, str):
        try:
            d = datetime.datetime.strptime(d, '%Y-%m-%d').date()
        except Exception:
            return '00000000'
    return d.strftime('%d%m%Y')

def _cnab240_header_arquivo(config, agora, nsa):
    """Registro Header do Arquivo (Tipo 0) — 240 chars."""
    cnpj = ''.join(filter(str.isdigit, config.cnpj_empresa or ''))
    agencia = _cnab_num(config.agencia, 5)
    agencia_dv = _cnab_alfa(config.agencia_dv or ' ', 1)
    conta = _cnab_num(config.conta, 12)
    conta_dv = _cnab_num(config.conta_dv or '0', 1)

    linha = (
        '756'                                      # 001-003  Banco
        + '0000'                                   # 004-007  Lote
        + '0'                                      # 008-008  Tipo Registro
        + ' ' * 9                                  # 009-017  CNAB
        + '2'                                      # 018-018  Tipo Inscrição (2=CNPJ)
        + cnpj.zfill(14)                           # 019-032  CNPJ
        + ' ' * 20                                 # 033-052  Convênio (brancos)
        + agencia                                  # 053-057  Agência
        + agencia_dv                               # 058-058  DV Agência
        + conta                                    # 059-070  Conta
        + conta_dv                                 # 071-071  DV Conta
        + '0'                                      # 072-072  DV Ag/Conta (zeros)
        + _cnab_alfa(config.nome_empresa, 30)      # 073-102  Nome Empresa
        + _cnab_alfa('SICOOB', 30)                 # 103-132  Nome Banco
        + ' ' * 10                                 # 133-142  CNAB
        + '1'                                      # 143-143  Código Remessa
        + agora.strftime('%d%m%Y')                 # 144-151  Data Geração
        + agora.strftime('%H%M%S')                 # 152-157  Hora Geração
        + _cnab_num(nsa, 6)                        # 158-163  NSA
        + '081'                                    # 164-166  Versão Layout
        + '00000'                                  # 167-171  Densidade
        + ' ' * 20                                 # 172-191  Reservado Banco
        + ' ' * 20                                 # 192-211  Reservado Empresa
        + ' ' * 29                                 # 212-240  CNAB
    )
    assert len(linha) == 240, f"Header arquivo: {len(linha)}"
    return linha

def _cnab240_header_lote(config, lote_num, agora, nsa):
    cnpj = ''.join(filter(str.isdigit, config.cnpj_empresa or ''))
    agencia = _cnab_num(config.agencia, 5)
    agencia_dv = _cnab_alfa(config.agencia_dv or ' ', 1)
    conta = _cnab_num(config.conta, 12)
    conta_dv = _cnab_num(config.conta_dv or '0', 1)

    linha = (
        '756'                                      
        + _cnab_num(lote_num, 4)                   
        + '1'                                      
        + 'R'                                      
        + '01'                                     
        + '  '                                     
        + '040'                                    
        + ' '                                      
        + '2'                                      
        + cnpj.zfill(15)                           
        + ' ' * 20                                 
        + agencia                                  
        + agencia_dv                               
        + conta                                    
        + conta_dv                                 
        + ' '                                      
        + _cnab_alfa(config.nome_empresa, 30)      
        + ' ' * 40                                 
        + ' ' * 40                                 
        + _cnab_num(nsa, 8)                        
        + agora.strftime('%d%m%Y')                 
        + '00000000'                               
        + ' ' * 33                                 
    )
    return linha

def _cnab240_segmento_p(config, seq, cobranca, nosso_numero, cliente):
    agencia = _cnab_num(config.agencia, 5)
    agencia_dv = _cnab_alfa(config.agencia_dv or ' ', 1)
    conta = _cnab_num(config.conta, 12)
    conta_dv = _cnab_num(config.conta_dv or '0', 1)
    
    nosso_num_fmt = '0000000000' + '01' + '01' + '4' + '     '

    vencimento = cobranca.data_vencimento
    data_emissao = datetime.date.today()

    linha = (
        '756'                                      # 001-003  Banco
        + '0001'                                   # 004-007  Lote
        + '3'                                      # 008-008  Tipo Registro
        + _cnab_num(seq, 5)                        # 009-013  Seq Lote
        + 'P'                                      # 014-014  Segmento
        + ' '                                      # 015-015  Brancos
        + '01'                                     # 016-017  Movimento
        + agencia                                  # 018-022  Agência
        + agencia_dv                               # 023-023  DV Agência
        + conta                                    # 024-035  Conta
        + conta_dv                                 # 036-036  DV Conta
        + ' '                                      # 037-037  DV Ag/Conta
        + nosso_num_fmt                            # 038-057  Nosso Número
        + '1'                                      # 058-058  Carteira
        + '0'                                      # 059-059  Cadastramento
        + ' '                                      # 060-060  Doc
        + '1'                                      # 061-061  Emissão (1=Banco)
        + '2'                                      # 062-062  Distribuição (2=Cliente)
        + _cnab_alfa(str(cobranca.id), 15)         # 063-077  Nº Documento
        + _cnab_data(vencimento)                   # 078-085  Vencimento
        + _cnab_val(cobranca.valor, 15)            # 086-100  Valor Título
        + '00000'                                  # 101-105  Ag. Cobradora
        + ' '                                      # 106-106  DV Ag Cobradora
        + '04'                                     # 107-108  Espécie (04=DS)
        + 'N'                                      # 109-109  Aceite
        + _cnab_data(data_emissao)                 # 110-117  Data Emissão
        + '0'                                      # 118-118  Juros (0=Isento)
        + '00000000'                               # 119-126  Data Juros Mora
        + _cnab_val(0.0, 15)                       # 127-141  Juros Mora
        + '0'                                      # 142-142  Desconto
        + '00000000'                               # 143-150  Data Desc
        + _cnab_val(0.0, 15)                       # 151-165  Valor Desc
        + _cnab_val(0.0, 15)                       # 166-180  IOF
        + _cnab_val(0.0, 15)                       # 181-195  Abatimento
        + _cnab_alfa(str(cobranca.id), 25)         # 196-220  Uso Empresa
        + '3'                                      # 221-221  Protesto
        + '00'                                     # 222-223  Prazo Prot
        + '0'                                      # 224-224  Baixa
        + '   '                                    # 225-227  Prazo Baixa
        + '09'                                     # 228-229  Moeda
        + '0000000000'                             # 230-239  Contrato
        + ' '                                      # 240-240  Brancos
    )
    return linha

def _cnab240_segmento_q(config, seq, cobranca, cliente):
    cpf_digits = ''.join(filter(str.isdigit, cliente.cpf or ''))
    
    cep_digits = ''.join(filter(str.isdigit, cliente.cep or ''))
    cep_ini = cep_digits[:5].zfill(5) if len(cep_digits) >= 5 else '00000'
    cep_suf = cep_digits[5:8].zfill(3) if len(cep_digits) >= 8 else '000'

    endereco = f"{cliente.rua or ''} {cliente.numero or ''}".strip()

    linha = (
        '756'                                      # 001-003
        + '0001'                                   # 004-007
        + '3'                                      # 008-008
        + _cnab_num(seq, 5)                        # 009-013
        + 'Q'                                      # 014-014
        + ' '                                      # 015-015
        + '01'                                     # 016-017
        + '1'                                      # 018-018
        + cpf_digits.zfill(15)                     # 019-033
        + _cnab_alfa(cliente.nome, 40)             # 034-073
        + _cnab_alfa(endereco, 40)                 # 074-113
        + _cnab_alfa(cliente.bairro, 15)           # 114-128
        + cep_ini                                  # 129-133
        + cep_suf                                  # 134-136
        + _cnab_alfa(cliente.cidade, 15)           # 137-151
        + _cnab_alfa(cliente.estado, 2)            # 152-153
        + '0'                                      # 154-154
        + '0' * 15                                 # 155-169
        + ' ' * 40                                 # 170-209
        + '000'                                    # 210-212
        + ' ' * 20                                 # 213-232
        + ' ' * 8                                  # 233-240
    )
    return linha

def _cnab240_trailer_lote(lote_num, qtd_registros, total_valor):
    """Registro Trailer do Lote (Tipo 5) — 240 chars."""
    linha = (
        '756'                                      # 001-003  Banco
        + _cnab_num(lote_num, 4)                   # 004-007  Lote
        + '5'                                      # 008-008  Tipo Registro
        + ' ' * 9                                  # 009-017  CNAB
        + _cnab_num(qtd_registros, 6)              # 018-023  Qtde Registros no Lote
        + _cnab_num(qtd_registros // 2, 6)         # 024-029  Qtde Títulos Cobrança Simples
        + _cnab_val(total_valor, 17)               # 030-046  Valor Total Cobrança Simples (15+2dec)
        + '000000'                                  # 047-052  Qtde Títulos Cobrança Vinculada
        + _cnab_val(0.0, 17)                       # 053-069  Valor Cobrança Vinculada
        + '000000'                                  # 070-075  Qtde Cobrança Caucionada
        + _cnab_val(0.0, 17)                       # 076-092  Valor Cobrança Caucionada
        + '000000'                                  # 093-098  Qtde Cobrança Descontada
        + _cnab_val(0.0, 17)                       # 099-115  Valor Cobrança Descontada
        + ' ' * 8                                  # 116-123  Nº Aviso Lançamento
        + ' ' * 117                                # 124-240  CNAB
    )
    assert len(linha) == 240, f"Trailer lote len={len(linha)}"
    return linha

def _cnab240_trailer_arquivo(qtd_lotes, qtd_registros):
    """Registro Trailer do Arquivo (Tipo 9) — 240 chars."""
    linha = (
        '756'                                      # 001-003  Banco
        + '9999'                                   # 004-007  Lote
        + '9'                                      # 008-008  Tipo Registro
        + ' ' * 9                                  # 009-017  CNAB
        + _cnab_num(qtd_lotes, 6)                  # 018-023  Qtde Lotes
        + _cnab_num(qtd_registros, 6)              # 024-029  Qtde Registros Total
        + '000000'                                  # 030-035  Qtde Contas Conciliação
        + ' ' * 205                                # 036-240  CNAB
    )
    assert len(linha) == 240, f"Trailer arquivo len={len(linha)}"
    return linha

@app.route('/api/financeiro/gerar-remessa', methods=['GET'])
def gerar_remessa():
    try:
        config = ConfiguracaoBanco.query.first()
        if not config:
            return jsonify({'error': 'Configure os dados bancários antes de gerar a remessa.'}), 400

        hoje = datetime.date.today()
        agora = datetime.datetime.now()

        cobrancas_pendentes = (
            Cobranca.query
            .filter(Cobranca.status.in_(['Pendente', 'Atrasado', 'Parcialmente Abatido']))
            .filter(Cobranca.data_vencimento <= hoje)
            .all()
        )

        if not cobrancas_pendentes:
            return jsonify({'error': 'Não há cobranças vencidas pendentes para gerar remessa.'}), 400

        linhas = []
        nsa = 1  

        linhas.append(_cnab240_header_arquivo(config, agora, nsa))

        lote_num = 1
        linhas.append(_cnab240_header_lote(config, lote_num, agora, nsa))

        seq_registro = 1
        total_valor = 0.0

        for idx, cobranca in enumerate(cobrancas_pendentes, start=1):
            cliente = cobranca.cliente
            if not cliente:
                continue

            nosso_numero = idx  

            linhas.append(_cnab240_segmento_p(config, seq_registro, cobranca, nosso_numero, cliente))
            seq_registro += 1
            
            linhas.append(_cnab240_segmento_q(config, seq_registro, cobranca, cliente))
            seq_registro += 1

            total_valor += cobranca.valor

        qtd_registros_lote = 1 + seq_registro + 1  
        linhas.append(_cnab240_trailer_lote(lote_num, qtd_registros_lote, total_valor))

        qtd_total_registros = len(linhas) + 1  
        linhas.append(_cnab240_trailer_arquivo(1, qtd_total_registros))

        conteudo = '\r\n'.join(linhas) + '\r\n'
        nome_arquivo = f"REMESSA_SICOOB_{agora.strftime('%Y%m%d_%H%M%S')}.rem"

        return Response(
            conteudo.encode('latin-1', errors='replace'),
            mimetype='text/plain',
            headers={'Content-Disposition': f'attachment; filename={nome_arquivo}'}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro no código Python: {str(e)}'}), 500

@app.route('/api/titulos', methods=['GET', 'POST', 'OPTIONS'])
def handle_titulos():
    if request.method == 'OPTIONS': return '', 200
    if request.method == 'GET':
        titulos = Titulo.query.order_by(Titulo.data_vencimento.asc()).all()
        return jsonify([{
            'id': t.id, 'tipo': t.tipo, 'valor': t.valor, 'descricao': t.descricao,
            'numero_parcela': t.numero_parcela, 'numero_nf': t.numero_nf,
            'data_emissao': t.data_emissao.strftime('%Y-%m-%d') if t.data_emissao else None,
            'data_vencimento': t.data_vencimento.strftime('%Y-%m-%d') if t.data_vencimento else None,
            'status': t.status, 'valor_extra': t.valor_extra
        } for t in titulos])
    data = request.json
    try:
        tipo = data.get('tipo')
        num_nf = data.get('numero_nf', '')
        valor_parcela = float(data.get('valor', 0)) 
        if tipo == 'Folha de pagamento':
            duracao = int(data.get('duracao_meses', 1))
            dia_pag = int(data.get('dia_pagamento', 1))
            hoje = datetime.date.today()
            for i in range(duracao):
                mes = hoje.month + i
                ano = hoje.year + (mes - 1) // 12
                mes = ((mes - 1) % 12) + 1
                try: vencimento = datetime.date(ano, mes, dia_pag)
                except ValueError:
                    import calendar
                    _, ultimo_dia = calendar.monthrange(ano, mes)
                    vencimento = datetime.date(ano, mes, ultimo_dia)
                desc_parcela = f"{data.get('descricao', '')} - Mês {i+1}/{duracao}" if duracao > 1 else data.get('descricao', '')
                db.session.add(Titulo(tipo=tipo, valor=valor_parcela, descricao=desc_parcela, numero_parcela=i+1, numero_nf=num_nf, data_emissao=hoje, data_vencimento=vencimento))
        else:
            n_parcelas = int(data.get('numero_parcelas', 1))
            d_emissao = datetime.datetime.strptime(data['data_emissao'], '%Y-%m-%d').date() if data.get('data_emissao') else None
            d_vencimento_base = datetime.datetime.strptime(data['data_vencimento'], '%Y-%m-%d').date() if data.get('data_vencimento') else datetime.date.today()
            for i in range(n_parcelas):
                venc_atual = add_months(d_vencimento_base, i)
                desc_parcela = f"{data.get('descricao', '')} - Parcela {i+1}/{n_parcelas}" if n_parcelas > 1 else data.get('descricao', '')
                db.session.add(Titulo(tipo=tipo, valor=valor_parcela, descricao=desc_parcela, numero_parcela=i+1, numero_nf=num_nf, data_emissao=d_emissao, data_vencimento=venc_atual))
        db.session.commit()
        return jsonify({'msg': 'Criado'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/titulos/<int:id>', methods=['DELETE', 'OPTIONS'])
def delete_titulo(id):
    if request.method == 'OPTIONS': return '', 200
    try:
        db.session.delete(Titulo.query.get_or_404(id))
        db.session.commit()
        return jsonify({'msg': 'Removido'}), 200
    except Exception: return jsonify({'error': 'Erro'}), 500

@app.route('/api/titulos/<int:id>/status', methods=['PUT', 'OPTIONS'])
def update_status_titulo(id):
    if request.method == 'OPTIONS': return '', 200
    titulo = Titulo.query.get_or_404(id)
    try:
        titulo.status = request.json.get('status', titulo.status)
        titulo.valor_extra = float(request.json.get('valor_extra', 0.0)) if titulo.status == 'atrasado' else 0.0
        db.session.commit()
        return jsonify({'msg': 'Atualizado'}), 200
    except Exception: return jsonify({'error': 'Erro'}), 500

@app.route('/login', methods=['POST', 'OPTIONS'])
@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS': return '', 200
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and bcrypt.check_password_hash(user.password, data.get('password')):
        return jsonify({"access_token": create_access_token(identity=user.username, additional_claims={"role": user.role}), "role": user.role, "username": user.username}), 200
    return jsonify({"msg": "Credenciais inválidas"}), 401

# --- PORTAL DO CLIENTE ---
@app.route('/api/meu-perfil', methods=['GET', 'OPTIONS'])
def meu_perfil():
    if request.method == 'OPTIONS': return '', 200
    verify_jwt_in_request()
    
    current_user_cpf = get_jwt_identity()
    cliente = Cliente.query.filter(db.func.replace(db.func.replace(Cliente.cpf, '.', ''), '-', '') == current_user_cpf).first()
            
    if not cliente: return jsonify({"msg": "Cliente não encontrado"}), 404
        
    hoje = datetime.date.today()
    return jsonify({
        'id': cliente.id, 'nome': cliente.nome, 'cpf': cliente.cpf,
        'saldoPago': round(cliente.saldo_pago, 2), 'perfil': cliente.perfil,
        'suspenso': cliente.suspenso,
        'cobrancas': [{'id': cob.id, 'descricao': cob.descricao, 'valor': cob.valor, 'valor_pago': getattr(cob, 'valor_pago', 0), 'data_vencimento': cob.data_vencimento.strftime('%Y-%m-%d'), 'status': cob.status} for cob in cliente.cobrancas],
    }), 200

# --- DASHBOARD ---
@app.route('/api/dashboard-resumo', methods=['GET', 'OPTIONS'])
def dashboard_resumo():
    if request.method == 'OPTIONS': return '', 200
    verify_jwt_in_request()
    
    # 1. Métricas Globais (Cartões Superiores)
    total_clientes = Cliente.query.count()
    inicio_semana = datetime.date.today() - datetime.timedelta(days=7)
    voos_semana = Voo.query.filter(db.func.date(Voo.horario_saida) >= inicio_semana).count()
    total_receber = sum((c.valor - getattr(c, 'valor_pago', 0)) for c in Cobranca.query.filter(Cobranca.status != 'Abatido').all())
    total_pagar = sum(t.valor for t in Titulo.query.filter(Titulo.status != 'abatido').all())
    
    # 2. Últimos 5 Voos Registados
    ultimos_voos_db = Voo.query.order_by(Voo.id.desc()).limit(5).all()
    ultimos_voos = [{
        'aluno': v.cliente_rel.nome if v.cliente_rel else 'Cliente Removido',
        'aeronave': v.modelo,
        'data': v.horario_saida.strftime('%d/%m/%Y') if v.horario_saida else 'N/A',
        'custo': v.custo
    } for v in ultimos_voos_db]

    # 3. Alertas Financeiros (Mensalidades/Faturas vencidas ou a vencer nos próximos 7 dias)
    hoje = datetime.date.today()
    limite_vencimento = hoje + datetime.timedelta(days=7)
    
    # Procura cobranças pendentes/parciais que vencem nos próximos 7 dias ou que já estão atrasadas
    cobrancas_alerta = Cobranca.query.filter(
        Cobranca.status.in_(['Pendente', 'Parcialmente Abatido', 'Atrasado']), 
        Cobranca.data_vencimento <= limite_vencimento
    ).order_by(Cobranca.data_vencimento.asc()).limit(5).all()

    alertas_financeiros = [{
        'descricao': c.descricao,
        'cliente': c.cliente.nome if c.cliente else 'Removido',
        'valor_pendente': c.valor - getattr(c, 'valor_pago', 0),
        'vencimento': c.data_vencimento.strftime('%d/%m/%Y'),
        'atrasado': c.data_vencimento < hoje
    } for c in cobrancas_alerta]
    
    return jsonify({
        'total_clientes': total_clientes, 
        'voos_semana': voos_semana,
        'total_receber': total_receber, 
        'total_pagar': total_pagar,
        'ultimos_voos': ultimos_voos,
        'alertas_financeiros': alertas_financeiros
    }), 200


# --- RECUPERAR SENHA ---
@app.route('/api/recuperar-senha', methods=['POST', 'OPTIONS'])
def recuperar_senha():
    if request.method == 'OPTIONS': return '', 200
    
    data = request.json
    username = data.get('username')

    if not username:
        return jsonify({'error': 'Forneça o CPF ou Login.'}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'Usuário não encontrado no sistema.'}), 404

    email_destino = None
    if user.role == 'cliente':
        cliente = Cliente.query.filter(db.func.replace(db.func.replace(Cliente.cpf, '.', ''), '-', '') == username).first()
        if cliente: email_destino = cliente.email
    else:
        func = Funcionario.query.filter_by(username=username).first()
        if func: email_destino = func.email

    if not email_destino:
        return jsonify({'error': 'Não há e-mail associado a esta conta.'}), 400

    nova_senha = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    user.password = bcrypt.generate_password_hash(nova_senha).decode('utf-8')
    db.session.commit()

    # LER CONFIGURAÇÕES UNIVERSAIS DO .ENV
    EMAIL_REMETENTE = os.environ.get('EMAIL_REMETENTE')
    SENHA_REMETENTE = os.environ.get('SENHA_REMETENTE')
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))

    if not EMAIL_REMETENTE or not SENHA_REMETENTE:
        return jsonify({'error': 'Configurações de e-mail ausentes no servidor (.env).'}), 500

    try:
        corpo_email = f"""Olá,

Foi solicitada a recuperação da sua senha no sistema Gestão Clube.
Sua nova credencial temporária é: {nova_senha}

Recomendamos alterar esta senha assim que fizer login.

Equipe do Aeroclube."""

        msg = MIMEText(corpo_email, 'plain', 'utf-8')
        msg['Subject'] = 'Recuperação de Acesso -  AeroClube de Rio Claro'
        msg['From'] = EMAIL_REMETENTE
        msg['To'] = email_destino

        # CONEXÃO DINÂMICA AO SERVIDOR SMTP
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_REMETENTE, SENHA_REMETENTE)
        server.sendmail(EMAIL_REMETENTE, email_destino, msg.as_string())
        server.quit()

        return jsonify({'msg': f'Uma nova senha foi enviada para {email_destino}'}), 200
    except Exception as e:
        db.session.rollback() 
        # O ERRO EXATO SERÁ IMPRESSO NO TERMINAL DO DOCKER E DEVOLVIDO AO FRONTEND
        print(f"ERRO SMTP FATAL: {str(e)}") 
        return jsonify({'error': f'Falha na configuração de e-mail: {str(e)}'}), 500
    
# --- ALTERAR PRÓPRIA SENHA ---
@app.route('/api/minha-senha', methods=['PUT', 'OPTIONS'])
def alterar_minha_senha():
    if request.method == 'OPTIONS': return '', 200
    
    # Verifica quem está logado no momento
    verify_jwt_in_request()
    current_username = get_jwt_identity()
    
    user = User.query.filter_by(username=current_username).first()
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
        
    data = request.json
    nova_senha = data.get('nova_senha')
    
    if not nova_senha or len(nova_senha) < 4:
        return jsonify({'error': 'A nova senha é muito curta.'}), 400
        
    # Encripta e guarda a nova senha
    user.password = bcrypt.generate_password_hash(nova_senha).decode('utf-8')
    db.session.commit()
    
    return jsonify({'msg': 'Senha atualizada com sucesso!'}), 200    

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)