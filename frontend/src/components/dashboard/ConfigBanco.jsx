import React, { useState, useEffect } from 'react';

// --- Funções de Máscara e Validação de CNPJ ---
const formatCNPJ = (value) => {
  return value
    .replace(/\D/g, '') // Remove o que não é número
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18); // Limita a 18 caracteres (tamanho do CNPJ com máscara)
};

const validateCNPJ = (cnpj) => {
  cnpj = cnpj.replace(/[^\d]+/g, ''); // Remove pontuação
  if (cnpj === '' || cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
};

const ConfigBanco = () => {
    const [config, setConfig] = useState({
        banco_codigo: '756', // Padrão Sicoob
        agencia: '',
        agencia_dv: '',
        conta: '',
        conta_dv: '',
        convenio: '',
        codigo_cedente: '',
        nome_empresa: '',
        cnpj_empresa: ''
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/config/banco');
            if (response.ok) {
                const data = await response.json();
                if (data.agencia) {
                    // Aplica a máscara no CNPJ ao carregar do banco
                    setConfig({ ...data, cnpj_empresa: formatCNPJ(data.cnpj_empresa || '') });
                }
            }
        } catch (error) {
            console.error("Erro ao carregar config:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCnpjChange = (e) => {
        const maskedValor = formatCNPJ(e.target.value);
        setConfig({ ...config, cnpj_empresa: maskedValor });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Validação 1: Campos em branco
        const camposObrigatorios = ['agencia', 'conta', 'convenio', 'codigo_cedente', 'nome_empresa', 'cnpj_empresa'];
        const camposVazios = camposObrigatorios.filter(campo => !config[campo] || config[campo].trim() === '');
        
        if (camposVazios.length > 0) {
            setMessage({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios.' });
            return;
        }

        // Validação 2: CNPJ Inválido
        if (!validateCNPJ(config.cnpj_empresa)) {
            setMessage({ type: 'error', text: 'O CNPJ informado é inválido.' });
            return;
        }

        try {
            // Remove a máscara do CNPJ antes de mandar para o banco para salvar apenas números
            const payload = {
                ...config,
                cnpj_empresa: config.cnpj_empresa.replace(/\D/g, '')
            };

            const response = await fetch('http://localhost:5000/api/config/banco', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
            } else {
                setMessage({ type: 'error', text: 'Erro ao salvar as configurações no servidor.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro de conexão com o servidor.' });
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Carregando configurações...</div>;

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-6">Integração Bancária (SICOOB)</h2>

            {message.text && (
                <div className={`p-4 rounded-xl mb-6 font-bold text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome da Empresa (Razão Social)</label>
                        <input
                            type="text"
                            maxLength="30" // Limite do arquivo CNAB para o nome
                            placeholder="Ex: AEROCLUBE LTDA"
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all uppercase"
                            value={config.nome_empresa}
                            onChange={(e) => setConfig({...config, nome_empresa: e.target.value.toUpperCase()})}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">CNPJ da Empresa</label>
                        <input
                            type="text"
                            placeholder="00.000.000/0000-00"
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-mono"
                            value={config.cnpj_empresa}
                            onChange={handleCnpjChange}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2 md:col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Código Banco</label>
                        <input
                            type="text"
                            disabled
                            value="756 (SICOOB)"
                            className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl text-slate-400 font-bold cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Agência</label>
                        <input
                            type="text"
                            maxLength="4"
                            placeholder="Ex: 4321"
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-mono"
                            value={config.agencia}
                            onChange={(e) => setConfig({...config, agencia: e.target.value.replace(/\D/g, '')})}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">DV Ag.</label>
                        <input
                            type="text"
                            maxLength="1"
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-mono text-center"
                            value={config.agencia_dv}
                            onChange={(e) => setConfig({...config, agencia_dv: e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()})}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Conta Corrente</label>
                        <input
                            type="text"
                            maxLength="8"
                            placeholder="Ex: 123456"
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-mono"
                            value={config.conta}
                            onChange={(e) => setConfig({...config, conta: e.target.value.replace(/\D/g, '')})}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">DV Conta</label>
                        <input
                            type="text"
                            maxLength="1"
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-mono text-center"
                            value={config.conta_dv}
                            onChange={(e) => setConfig({...config, conta_dv: e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()})}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 mt-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Código do Convênio</label>
                        <input
                            type="text"
                            maxLength="10"
                            placeholder="Número do contrato com o banco"
                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-mono"
                            value={config.convenio}
                            onChange={(e) => setConfig({...config, convenio: e.target.value.replace(/\D/g, '')})}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Código do Cedente</label>
                        <input
                            type="text"
                            maxLength="10"
                            placeholder="Geralmente igual ao convênio"
                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-mono"
                            value={config.codigo_cedente}
                            onChange={(e) => setConfig({...config, codigo_cedente: e.target.value.replace(/\D/g, '')})}
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200"
                    >
                        SALVAR CONFIGURAÇÕES
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ConfigBanco;