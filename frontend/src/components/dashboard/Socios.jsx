import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

// --- Funções de Máscara e Validação ---
const formatCPF = (value) => {
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto
    .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca traço
    .replace(/(-\d{2})\d+?$/, '$1'); // Impede mais de 14 caracteres
};

const validateCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]+/g, ''); // Remove pontuação para validar
  if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let add = 0;
  for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  add = 0;
  for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;
  return true;
};

// Novas Máscaras Adicionadas
const formatTelefone = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})$/, '$1-$2')
    .slice(0, 15);
};

const formatCEP = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9);
};

const Socios = () => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSocio, setSelectedSocio] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [socios, setSocios] = useState([]);
  
  // Controle de Abas
  const [activeTab, setActiveTab] = useState('financeiro'); // 'financeiro' ou 'cadastro'

  const [novoSocio, setNovoSocio] = useState({ 
    nome: '', cpf: '', email: '', telefone: '', nascimento: '', 
    rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
    mensalidade: 150 
  });

  const fetchSocios = async () => {
    try {
      const res = await fetch(`${API_URL}/socios`);
      const data = await res.json();
      setSocios(data);
    } catch (error) { console.error("Erro:", error); }
  };

  useEffect(() => { fetchSocios(); }, []);

  const openDetails = (socio) => {
    setSelectedSocio(socio);
    setActiveTab('financeiro');
    setIsDetailsModalOpen(true);
  };

  // Aplica a máscara no momento da digitação
  const handleCpfChange = (e) => setNovoSocio({ ...novoSocio, cpf: formatCPF(e.target.value) });

  const handleAddSocio = async (e) => {
    e.preventDefault();
    
    // Validação de Campos Obrigatórios (garantia extra além do atributo "required" do HTML)
    if (!novoSocio.nome || !novoSocio.cpf || !novoSocio.telefone) {
      return alert("Por favor, preencha os campos obrigatórios (Nome, CPF e Telefone).");
    }

    // Trava o envio se o CPF não for matematicamente válido
    if (!validateCPF(novoSocio.cpf)) {
      return alert("CPF Inválido! Verifique os números digitados.");
    }

    try {
      // Limpeza das máscaras antes de enviar para a API (sanitização)
      const payload = {
        ...novoSocio,
        cpf: novoSocio.cpf.replace(/\D/g, ''),
        telefone: novoSocio.telefone.replace(/\D/g, ''),
        cep: novoSocio.cep.replace(/\D/g, '')
      };

      const res = await fetch(`${API_URL}/socios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("Sócio cadastrado!");
        setIsAddModalOpen(false);
        // Limpa o formulário após sucesso
        setNovoSocio({ 
          nome: '', cpf: '', email: '', telefone: '', nascimento: '', 
          rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
          mensalidade: 150 
        });
        fetchSocios();
      } else {
        const errorData = await res.json();
        alert(`Falha: ${errorData.error}`);
      }
    } catch (error) { alert("Erro de conexão."); }
  };

  const handleUpdateDados = async (e) => {
    e.preventDefault();
    const formDataObj = new FormData(e.target);
    const data = Object.fromEntries(formDataObj.entries());
    
    // Validação na Edição
    if (!data.nome) {
      return alert("O campo Nome é obrigatório para edição.");
    }

    // Limpeza de caracteres da edição antes de enviar
    if (data.telefone) data.telefone = data.telefone.replace(/\D/g, '');
    if (data.cep) data.cep = data.cep.replace(/\D/g, '');

    try {
      const res = await fetch(`${API_URL}/socios/${selectedSocio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert("Dados cadastrais atualizados!");
        fetchSocios();
        setIsDetailsModalOpen(false);
      }
    } catch(err) { alert("Erro ao atualizar."); }
  };

  const handleExcluir = async (id) => {
    if (window.confirm("Deseja permanentemente excluir este sócio e seus voos?")) {
      try {
        const res = await fetch(`${API_URL}/socios/${id}`, { method: 'DELETE' });
        
        if (res.ok) {
          setSocios(prevSocios => prevSocios.filter(socio => socio.id !== id));
          alert("Sócio e voos vinculados excluídos com sucesso!");
        } else {
          const errorData = await res.json();
          alert(`Falha ao excluir: ${errorData.error}`);
        }
      } catch (error) { 
        alert("Erro de conexão ao tentar excluir."); 
      }
    }
  };

  const handleToggleSuspensao = async (id) => {
    try {
      const res = await fetch(`${API_URL}/socios/${id}/suspender`, { method: 'PUT' });
      if (res.ok) {
        alert("Status de mensalidade alterado!");
        setIsDetailsModalOpen(false);
        fetchSocios();
      }
    } catch (error) { alert("Erro de conexão."); }
  };

  const handlePayment = async () => {
    const valor = parseFloat(paymentAmount);
    if (isNaN(valor) || valor <= 0) return alert("Insira um valor válido");

    try {
      const res = await fetch(`${API_URL}/socios/${selectedSocio.id}/pagar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor })
      });
      if(res.ok) {
        setPaymentAmount('');
        alert(`Pagamento registrado!`);
        setIsDetailsModalOpen(false);
        fetchSocios(); 
      }
    } catch (error) { alert("Erro ao registrar."); }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gestão de Sócios</h2>
          <p className="text-slate-500 text-sm">Controle de membros e histórico financeiro</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2">
          <span>+</span> ADICIONAR SÓCIO
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
              <th className="px-8 py-4">Nome</th>
              <th className="px-8 py-4">CPF</th>
              <th className="px-8 py-4 text-center">Cobrança</th>
              <th className="px-8 py-4 text-center">Situação</th>
              <th className="px-8 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {socios.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50">
                <td className="px-8 py-5 font-bold text-slate-700">{s.nome}</td>
                <td className="px-8 py-5 text-slate-500 font-mono text-sm">{formatCPF(s.cpf || '')}</td>
                <td className="px-8 py-5 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.suspenso ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {s.suspenso ? 'Suspensa' : 'Ativa'}
                  </span>
                </td>
                <td className="px-8 py-5 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.totalDebito > s.saldoPago ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {s.totalDebito > s.saldoPago ? 'Pendente' : 'Regular'}
                  </span>
                </td>
                <td className="px-8 py-5 text-right flex justify-end gap-3 items-center">
                  <button onClick={() => openDetails(s)} className="text-blue-600 hover:bg-blue-50 font-bold py-2 px-4 rounded-lg text-xs border border-blue-100">DETALHAR</button>
                  <button onClick={() => handleExcluir(s.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><TrashIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Novo Sócio</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleAddSocio} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Nome Completo</label>
                <input required type="text" value={novoSocio.nome} onChange={(e) => setNovoSocio({...novoSocio, nome: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">CPF</label>
                <input required type="text" value={novoSocio.cpf} onChange={handleCpfChange} maxLength="14" placeholder="000.000.000-00" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-mono focus:border-blue-500 outline-none transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Data Nasc.</label>
                <input type="date" value={novoSocio.nascimento} onChange={(e) => setNovoSocio({...novoSocio, nascimento: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">E-mail</label>
                <input required type="email" value={novoSocio.email} onChange={(e) => setNovoSocio({...novoSocio, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Telefone</label>
                {/* Aplicação da máscara de telefone no onChange */}
                <input required type="text" value={novoSocio.telefone} onChange={(e) => setNovoSocio({...novoSocio, telefone: formatTelefone(e.target.value)})} placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
              </div>

              {/* CAMPOS DE ENDEREÇO DETALHADOS */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Logradouro (Rua/Av)</label>
                <input required type="text" value={novoSocio.rua} onChange={(e) => setNovoSocio({...novoSocio, rua: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Nº</label>
                <input required type="text" value={novoSocio.numero} onChange={(e) => setNovoSocio({...novoSocio, numero: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Bairro</label>
                <input required type="text" value={novoSocio.bairro} onChange={(e) => setNovoSocio({...novoSocio, bairro: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">CEP</label>
                {/* Aplicação da máscara de CEP no onChange */}
                <input required type="text" value={novoSocio.cep} onChange={(e) => setNovoSocio({...novoSocio, cep: formatCEP(e.target.value)})} placeholder="00000-000" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Cidade</label>
                  <input required type="text" value={novoSocio.cidade} onChange={(e) => setNovoSocio({...novoSocio, cidade: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">UF</label>
                  <input required type="text" maxLength="2" value={novoSocio.estado} onChange={(e) => setNovoSocio({...novoSocio, estado: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-center" />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Mensalidade Inicial (R$)</label>
                <input required type="number" step="0.01" value={novoSocio.mensalidade} onChange={(e) => setNovoSocio({...novoSocio, mensalidade: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
              </div>
              <button type="submit" className="md:col-span-3 w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 uppercase tracking-widest text-xs mt-2 transition-all shadow-lg shadow-blue-200">Confirmar Cadastro</button>
            </form>
          </div>
        </div>
      )}

      {isDetailsModalOpen && selectedSocio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">{selectedSocio.nome}</h3>
                <p className="text-slate-400 text-sm font-mono mt-1">ID: #{selectedSocio.id.toString().padStart(4, '0')} | Mensalidade Base: R$ {selectedSocio.mensalidade.toFixed(2)}</p>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl font-bold">×</button>
            </div>
            
            {/* Sistema de Abas */}
            <div className="flex bg-slate-100 border-b border-slate-200 shrink-0">
              <button onClick={() => setActiveTab('financeiro')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'financeiro' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>Financeiro</button>
              <button onClick={() => setActiveTab('cadastro')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'cadastro' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>Dados Cadastrais</button>
            </div>

            <div className="p-8 overflow-y-auto">
              {activeTab === 'financeiro' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 md:col-span-2">
                    <div className="flex justify-between mb-2"><span className="text-slate-500">Histórico de Mensalidades:</span><span className="font-bold text-slate-700">R$ {selectedSocio.debito_mensalidade_total?.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-2"><span className="text-slate-500">Histórico de Voos:</span><span className="font-bold text-slate-700">R$ {selectedSocio.voos_debito?.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-4 pb-4 border-b border-slate-200"><span className="text-green-600 font-bold">Total já Pago:</span><span className="font-bold text-green-600">R$ {selectedSocio.saldoPago?.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-800 font-bold uppercase text-xs">Saldo Devedor:</span><span className="text-xl font-black text-slate-900">R$ {Math.max(0, (selectedSocio.totalDebito || 0) - (selectedSocio.saldoPago || 0)).toFixed(2)}</span></div>
                  </div>
                  <div className="md:col-span-2 flex gap-4">
                    <button type="button" onClick={() => handleToggleSuspensao(selectedSocio.id)} className={`flex-1 font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all border ${selectedSocio.suspenso ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}>
                      {selectedSocio.suspenso ? 'Reativar Cobrança Mensal' : 'Suspender Mensalidade'}
                    </button>
                  </div>
                  <div className="md:col-span-2 bg-blue-50 p-6 rounded-2xl border-2 border-blue-100 space-y-4">
                    <h4 className="text-sm font-bold text-blue-900">Abater Saldo Devedor</h4>
                    <div className="flex gap-4">
                      <input type="number" placeholder="Valor (R$)" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="flex-1 p-4 rounded-xl border-2 border-blue-200 outline-none font-bold" />
                      <button onClick={handlePayment} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-xl transition-all">CONFIRMAR</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cadastro' && (
                <form onSubmit={handleUpdateDados} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Nome</label><input required name="nome" type="text" defaultValue={selectedSocio.nome} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">CPF (Imutável)</label>
                    {/* Exibe o CPF formatado na tela, mesmo que venha só com números do backend */}
                    <input type="text" value={formatCPF(selectedSocio.cpf || '')} disabled className="w-full px-4 py-3 bg-slate-200 border-2 border-slate-200 rounded-xl font-mono text-slate-500 cursor-not-allowed" />
                  </div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Data Nasc.</label><input name="nascimento" type="date" defaultValue={selectedSocio.nascimento} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">E-mail</label><input required name="email" type="email" defaultValue={selectedSocio.email} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  
                  {/* Máscara inline aplicada no modal de edição */}
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Telefone</label><input name="telefone" type="text" defaultValue={formatTelefone(selectedSocio.telefone || '')} onChange={(e) => e.target.value = formatTelefone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Rua</label><input name="rua" type="text" defaultValue={selectedSocio.rua} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Nº</label><input name="numero" type="text" defaultValue={selectedSocio.numero} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Bairro</label><input name="bairro" type="text" defaultValue={selectedSocio.bairro} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
                  
                  {/* Máscara inline aplicada no modal de edição */}
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">CEP</label><input name="cep" type="text" defaultValue={formatCEP(selectedSocio.cep || '')} onChange={(e) => e.target.value = formatCEP(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
                  
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Cidade</label><input name="cidade" type="text" defaultValue={selectedSocio.cidade} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">UF</label><input name="estado" type="text" maxLength="2" defaultValue={selectedSocio.estado} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold uppercase" /></div>
                  
                  <button type="submit" className="md:col-span-2 w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 uppercase tracking-widest text-xs mt-2">Salvar Alterações</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

export default Socios;