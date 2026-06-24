-- =============================================================
--  SEED DE TESTES — Aeroclube (PostgreSQL)
--  Inserir APÓS o Flask criar as tabelas (primeiro `docker compose up`)
-- =============================================================

-- ---------------------------------------------------------------
-- USERS  (senha em bcrypt gerada pela mesma lib do projeto)
-- admin / admin123  |  secretaria / sec123  |  12345678909 / cliente123
-- ---------------------------------------------------------------
INSERT INTO "user" (username, password, role) VALUES
  ('admin',       '$2b$12$tEFBtO2QFSxJhRVdXBHr4eZxHVyalZNkUgPdGMqO.3tPDoD1.CJ9K', 'admin'),
  ('secretaria',  '$2b$12$XEXWb9KQnBb2hcxu4lDVCeYgRmi1MfPN7t1EcwfYHS2KGyIllSwdK', 'secretaria'),
  ('12345678909', '$2b$12$W/ZR8Vu6vCXyvfRwySLWcOWfDbYDT8SPXXZH28s4XsLOCAupm4146',  'cliente')
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------
-- FUNCIONARIO
-- ---------------------------------------------------------------
INSERT INTO funcionario (nome, cpf, email, telefone, endereco, cargo, username) VALUES
  ('Ana Paula Secretária', '111.111.111-11', 'ana@aeroclube.com.br',
   '(16) 99901-0001', 'Rua das Palmeiras, 10 - Centro', 'Secretaria', 'secretaria')
ON CONFLICT (cpf) DO NOTHING;

-- ---------------------------------------------------------------
-- INSTRUTOR
-- ---------------------------------------------------------------
INSERT INTO instrutor (nome, cargo, email, telefone, cpf, nascimento, endereco) VALUES
  ('Carlos Eduardo Instrutor', 'Instrutor', 'carlos@aeroclube.com.br',
   '(16) 99902-0002', '222.222.222-22', '1980-05-15',
   'Av. dos Pilotos, 200 - Jardim Aeroporto')
ON CONFLICT (cpf) DO NOTHING;

-- ---------------------------------------------------------------
-- AERONAVE
-- ---------------------------------------------------------------
INSERT INTO aeronave (nome, tipo) VALUES
  ('PP-ABC', 'Cessna 152'),
  ('PP-XYZ', 'Piper PA-28')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- CLIENTE  (CPF sem formatação = username do portal)
-- ---------------------------------------------------------------
INSERT INTO cliente (
  nome, cpf, email, telefone, nascimento,
  rua, numero, bairro, cidade, estado, cep,
  saldo_pago, suspenso, perfil,
  mensalidade, duracao_meses, descricao_servico, valor_servico,
  nome_treinamento, valor_parcela, numero_parcelas,
  dia_fechamento_fatura
) VALUES
  ('João da Silva',  '123.456.789-09', 'joao@email.com',  '(16) 99903-0001',
   '1990-03-22', 'Rua das Flores', '123', 'Centro', 'Ribeirão Preto', 'SP', '14010-050',
   0.00, false, 'Aluno PPL',
   350.00, 12, 'Mensalidade PPL', 350.00,
   NULL, 0.00, 1, 10),

  ('Maria Souza',    '987.654.321-00', 'maria@email.com', '(16) 99904-0002',
   '1985-07-11', 'Av. Brasil', '456', 'Vila Nova', 'Ribeirão Preto', 'SP', '14020-100',
   200.00, false, 'Aluna IFR',
   500.00, 6, 'Mensalidade IFR', 500.00,
   NULL, 0.00, 1, 15),

  ('Pedro Almeida',  '111.222.333-44', 'pedro@email.com', '(16) 99905-0003',
   '1995-11-30', 'Rua Ipê Amarelo', '789', 'Jardim Bela Vista', 'Ribeirão Preto', 'SP', '14030-200',
   0.00, false, 'Aluno Solo',
   280.00, 3, 'Mensalidade Solo', 280.00,
   NULL, 0.00, 1, 5)
ON CONFLICT (cpf) DO NOTHING;

-- ---------------------------------------------------------------
-- COBRANÇAS  (para disparar a geração de remessa CNAB240)
-- ---------------------------------------------------------------
INSERT INTO cobranca (cliente_id, descricao, valor, valor_pago, data_vencimento, status) VALUES
  -- João — 2 mensalidades vencidas (remessa vai pegar essas)
  (1, 'Mensalidade PPL - Abr/2026', 350.00, 0.00, '2026-04-10', 'Atrasado'),
  (1, 'Mensalidade PPL - Mai/2026', 350.00, 0.00, '2026-05-10', 'Pendente'),
  -- João — mensalidade futura (remessa NÃO pega)
  (1, 'Mensalidade PPL - Jun/2026', 350.00, 0.00, '2026-07-10', 'Pendente'),

  -- Maria — parcialmente paga
  (2, 'Mensalidade IFR - Mai/2026', 500.00, 200.00, '2026-05-15', 'Parcialmente Abatido'),
  -- Maria — futura
  (2, 'Mensalidade IFR - Jun/2026', 500.00, 0.00, '2026-07-15', 'Pendente'),

  -- Pedro — vencida
  (3, 'Mensalidade Solo - Mai/2026', 280.00, 0.00, '2026-05-05', 'Atrasado')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- VOOS
-- ---------------------------------------------------------------
INSERT INTO voo (
  cliente_id, instrutor, modelo, tipo, litros, custo,
  categoria_voo, porcentagem_instrutor,
  horario_saida, horario_chegada, local_saida, local_chegada
) VALUES
  (1, 'Carlos Eduardo Instrutor', 'Cessna 152', 'Duplo Comando',
   30.0, 420.00, 'Duplo', 30.0,
   '2026-05-10 08:00:00', '2026-05-10 09:30:00', 'SBRP', 'SBRP'),

  (2, 'Carlos Eduardo Instrutor', 'Piper PA-28', 'Duplo Comando',
   25.0, 380.00, 'Duplo', 30.0,
   '2026-05-12 10:00:00', '2026-05-12 11:15:00', 'SBRP', 'SBRP'),

  (3, NULL, 'Cessna 152', 'Solo',
   20.0, 260.00, 'Solo', 0.0,
   '2026-05-14 07:30:00', '2026-05-14 08:30:00', 'SBRP', 'SBRP')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- CONFIGURAÇÃO DO BANCO (Sicoob — dados fictícios de homologação)
-- ---------------------------------------------------------------
INSERT INTO configuracao_banco (
  banco_codigo, agencia, agencia_dv,
  conta, conta_dv,
  convenio, codigo_cedente,
  nome_empresa, cnpj_empresa
) VALUES (
  '756', '01234', '0',
  '000012345678', '1',
  '123456', '123456',
  'AEROCLUBE TESTE LTDA',
  '12.345.678/0001-90'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- TÍTULOS A PAGAR (contas internas do clube)
-- ---------------------------------------------------------------
INSERT INTO titulo (tipo, valor, descricao, numero_parcela, numero_nf, data_emissao, data_vencimento, status, valor_extra) VALUES
  ('Folha de pagamento', 3500.00, 'Salário Secretária - Mai/2026', 1, 'NF-001', '2026-05-01', '2026-05-05', 'pendente', 0.00),
  ('Combustível',        1200.00, 'Avgas Maio/2026',               1, 'NF-002', '2026-05-08', '2026-05-20', 'pendente', 0.00),
  ('Manutenção',          850.00, 'Revisão 100h PP-ABC',           1, 'NF-003', '2026-05-10', '2026-06-10', 'pendente', 0.00)
ON CONFLICT DO NOTHING;
