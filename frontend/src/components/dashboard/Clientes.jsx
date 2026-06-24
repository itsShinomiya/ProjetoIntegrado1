import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const API_URL = 'http://localhost:5000/api';

const formatCPF = (value) => value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
const validateCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]+/g, '');
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
const formatTelefone = (value) => value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4,5})(\d{4})$/, '$1-$2').slice(0, 15);
const formatCEP = (value) => value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);

const Clientes = () => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRenovarModalOpen, setIsRenovarModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedCobrancaId, setSelectedCobrancaId] = useState('');
  const [clientes, setClientes] = useState([]);
  const [activeTab, setActiveTab] = useState('financeiro');
  const [isCreditoModalOpen, setIsCreditoModalOpen] = useState(false);
  const [novoCredito, setNovoCredito] = useState({ valor: '' });
  const [aeronaves, setAeronaves] = useState([]); 
  const [isPacoteModalOpen, setIsPacoteModalOpen] = useState(false);
  const [novoPacote, setNovoPacote] = useState({ horas: '', aeronave_id: '', tipo_voo: 'Solo', tipo_pagamento: 'Crédito', valor: '' });
  
  const [dadosRenovacao, setDadosRenovacao] = useState({ tipo: 'Sócio', duracao_meses: 1, novo_valor: '' });

  const [novoCliente, setNovoCliente] = useState({ 
    nome: '', cpf: '', email: '', telefone: '', nascimento: '', 
    rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
    perfis: ['Sócio'], 
    mensalidade: 150, duracao_meses: 12,
    valor_credito: 0,
    nome_treinamento: '', valor_parcela: 0, numero_parcelas: 1, 
    descricao_servico: '', valor_servico: 0, duracao_outro: 1,
    dia_fechamento_fatura: ''
  });

  const fetchDados = async () => {
    try {
      const resCli = await fetch(`${API_URL}/clientes`);
      if(resCli.ok) setClientes(await resCli.json());

      const resAero = await fetch(`${API_URL}/aeronaves`);
      if(resAero.ok) {
        const aeroData = await resAero.json();
        setAeronaves(aeroData);
        if(aeroData.length > 0) setNovoPacote(prev => ({ ...prev, aeronave_id: aeroData[0].id }));
      }
    } catch (error) { console.error("Erro:", error); }
  };

  useEffect(() => { fetchDados(); }, []);

  const openDetails = (cliente) => {
    setSelectedCliente(cliente);
    setActiveTab('financeiro');
    setIsDetailsModalOpen(true);
  };

  const handleCpfChange = (e) => setNovoCliente({ ...novoCliente, cpf: formatCPF(e.target.value) });

  const handleCheckboxChange = (perfil) => {
    setNovoCliente(prev => {
      const isSelected = prev.perfis.includes(perfil);
      return {
        ...prev,
        perfis: isSelected ? prev.perfis.filter(p => p !== perfil) : [...prev.perfis, perfil]
      };
    });
  };

  const handleAddCliente = async (e) => {
    e.preventDefault();
    if (!novoCliente.nome || !novoCliente.cpf) return alert("Preencha Nome e CPF.");
    if (!validateCPF(novoCliente.cpf)) return alert("CPF Inválido.");
    if (novoCliente.perfis.length === 0) return alert("Selecione pelo menos 1 perfil para o cliente.");

    try {
      const payload = {
        ...novoCliente,
        cpf: novoCliente.cpf.replace(/\D/g, ''),
        telefone: novoCliente.telefone.replace(/\D/g, ''),
        cep: novoCliente.cep.replace(/\D/g, ''),
        dia_fechamento_fatura: novoCliente.dia_fechamento_fatura === '' ? null : parseInt(novoCliente.dia_fechamento_fatura, 10)
      };

      const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("Cliente cadastrado com sucesso!");
        setIsAddModalOpen(false);
        setNovoCliente({ 
          nome: '', cpf: '', email: '', telefone: '', nascimento: '', rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
          perfis: ['Sócio'], mensalidade: 150, duracao_meses: 12, valor_credito: 0,
          nome_treinamento: '', valor_parcela: 0, numero_parcelas: 1, descricao_servico: '', valor_servico: 0, duracao_outro: 1,
          dia_fechamento_fatura: ''
        });
        fetchDados();
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
    
    if (!data.nome) return alert("O campo Nome é obrigatório para edição.");
    if (data.telefone) data.telefone = data.telefone.replace(/\D/g, '');
    if (data.cep) data.cep = data.cep.replace(/\D/g, '');
    if ('dia_fechamento_fatura' in data) {
      data.dia_fechamento_fatura = data.dia_fechamento_fatura === '' ? null : parseInt(data.dia_fechamento_fatura, 10);
    }

    try {
      const res = await fetch(`${API_URL}/clientes/${selectedCliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert("Dados cadastrais atualizados!");
        fetchDados();
        setIsDetailsModalOpen(false);
      } else { alert("Erro ao atualizar dados."); }
    } catch(err) { alert("Erro de conexão ao atualizar."); }
  };

  const handleExcluir = async (id) => {
    if (window.confirm("Deseja permanentemente excluir este cliente e seus vínculos?")) {
      try {
        const res = await fetch(`${API_URL}/clientes/${id}`, { method: 'DELETE' });
        if (res.ok) { fetchDados(); alert("Excluído!"); }
      } catch (error) { alert("Erro ao excluir."); }
    }
  };
  
  const handleToggleSuspensao = async (id) => {
    try {
      const res = await fetch(`${API_URL}/clientes/${id}/suspender`, { method: 'PUT' });
      if (res.ok) {
        alert("Status de cobrança alterado!");
        setIsDetailsModalOpen(false);
        fetchDados();
      }
    } catch (error) { alert("Erro de conexão."); }
  };

  const handlePayment = async () => {
    const valor = parseFloat(paymentAmount);
    if (isNaN(valor) || valor <= 0) return alert("Insira um valor válido para efetuar a baixa.");

    try {
      const res = await fetch(`${API_URL}/clientes/${selectedCliente.id}/pagar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor, cobranca_id: selectedCobrancaId })
      });
      if(res.ok) {
        setPaymentAmount('');
        setSelectedCobrancaId('');
        alert(`Baixa de pagamento registrada com sucesso!`);
        setIsDetailsModalOpen(false); 
        fetchDados(); 
      } else { alert("Erro ao registrar pagamento."); }
    } catch (error) { alert("Erro de conexão."); }
  };

  const handleRenovarContrato = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/clientes/${selectedCliente.id}/renovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosRenovacao)
      });
      if(res.ok) {
        alert("Contrato renovado e faturas geradas!");
        setIsRenovarModalOpen(false);
        setIsDetailsModalOpen(false);
        setDadosRenovacao({ tipo: 'Sócio', duracao_meses: 1, novo_valor: '' });
        fetchDados();
      } else { alert("Erro ao renovar contrato."); }
    } catch(err) { alert("Erro de conexão."); }
  };

  const handleAddCredito = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/clientes/${selectedCliente.id}/creditos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoCredito)
      });
      if (res.ok) {
        alert("Créditos registrados!");
        setIsCreditoModalOpen(false);
        setNovoCredito({ valor: '' });
        fetchDados();
        setIsDetailsModalOpen(false); 
      }
    } catch (error) { alert("Erro de conexão."); }
  };

  const handleAddPacote = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/clientes/${selectedCliente.id}/pacotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoPacote)
      });
      if (res.ok) {
        alert("Pacote adicionado!");
        setIsPacoteModalOpen(false);
        setNovoPacote({ horas: '', aeronave_id: aeronaves[0]?.id || '', tipo_voo: 'Solo', tipo_pagamento: 'Crédito', valor: '' });
        fetchDados();
        setIsDetailsModalOpen(false); 
      } else {
        const errorData = await res.json();
        alert(`Falha ao adicionar pacote: ${errorData.error || 'Erro desconhecido.'}`);
      }
    } catch (error) { alert("Erro de conexão."); }
  };

  const handleRenegociarPacote = async (pacoteId) => {
    const dataDigitada = prompt("Insira a nova data de renegociação (Formato YYYY-MM-DD):", "2026-12-31");
    if(!dataDigitada) return;

    try {
      const res = await fetch(`${API_URL}/pacotes/${pacoteId}/renegociar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_renegociacao: dataDigitada })
      });
      if(res.ok) {
        alert("Data de renegociação atualizada!");
        fetchDados();
        setIsDetailsModalOpen(false);
      } else { alert("Data no formato inválido."); }
    } catch (e) { alert("Erro ao renegociar."); }
  };

  const openRenovarModal = () => {
    let valorAtual = '';
    if (selectedCliente.perfil.includes('Sócio')) valorAtual = selectedCliente.mensalidade;
    else if (selectedCliente.perfil.includes('Externo')) valorAtual = selectedCliente.valor_parcela;
    else if (selectedCliente.perfil.includes('Outro')) valorAtual = selectedCliente.valor_servico;

    setDadosRenovacao({ 
      tipo: selectedCliente.perfil.includes('Sócio') ? 'Sócio' : selectedCliente.perfil.includes('Externo') ? 'Externo' : 'Outro', 
      duracao_meses: 1, 
      novo_valor: valorAtual 
    });
    setIsRenovarModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gestão de Clientes</h2>
          <p className="text-slate-500 text-sm">Controle de membros, alunos e parceiros</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2">
          <span>+</span> ADICIONAR CLIENTE
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Perfil(is)</th>
              <th className="px-6 py-4 text-center">Status Financeiro</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-5 font-bold text-slate-700">{c.nome}</td>
                <td className="px-6 py-5">
                  {c.perfil.split(', ').map(p => (
                     <span key={p} className="px-2 py-1 mr-1 mb-1 inline-block rounded-md text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">{p}</span>
                  ))}
                </td>
                <td className="px-6 py-5 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${c.totalVencido > c.saldoPago ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {c.totalVencido > c.saldoPago ? 'Com Pendências' : 'Regular'}
                  </span>
                </td>
                <td className="px-6 py-5 text-right flex justify-end gap-3 items-center">
                  <button onClick={() => openDetails(c)} className="text-blue-600 hover:bg-blue-50 font-bold py-2 px-4 rounded-lg text-xs border border-blue-100">DETALHAR</button>
                  <button onClick={() => handleExcluir(c.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><TrashIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createPortal(<>
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Novo Cliente</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleAddCliente} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto">
              
              <div className="md:col-span-3 mb-2 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-3 block">Múltiplos Perfis de Cadastro (Selecione todos que se aplicam)</label>
                <div className="flex flex-wrap gap-4">
                  {['Sócio', 'Aluno', 'Externo', 'Outro'].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 border border-slate-200 rounded-lg hover:border-blue-500">
                      <input type="checkbox" checked={novoCliente.perfis.includes(p)} onChange={() => handleCheckboxChange(p)} className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-700 text-sm">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Nome Completo *</label><input required type="text" value={novoCliente.nome} onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">CPF *</label><input required type="text" value={novoCliente.cpf} onChange={handleCpfChange} maxLength="14" placeholder="000.000.000-00" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-mono focus:border-blue-500 outline-none transition-all" /></div>

              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Data Nasc.</label><input type="date" value={novoCliente.nascimento} onChange={(e) => setNovoCliente({...novoCliente, nascimento: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">E-mail</label><input type="email" value={novoCliente.email} onChange={(e) => setNovoCliente({...novoCliente, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Telefone</label><input type="text" value={novoCliente.telefone} onChange={(e) => setNovoCliente({...novoCliente, telefone: formatTelefone(e.target.value)})} placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>

              <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Logradouro (Rua/Av) *</label><input required type="text" value={novoCliente.rua} onChange={(e) => setNovoCliente({...novoCliente, rua: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Nº *</label><input required type="text" value={novoCliente.numero} onChange={(e) => setNovoCliente({...novoCliente, numero: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>

              <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Bairro *</label><input required type="text" value={novoCliente.bairro} onChange={(e) => setNovoCliente({...novoCliente, bairro: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
              <div className="md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Cidade *</label><input required type="text" value={novoCliente.cidade} onChange={(e) => setNovoCliente({...novoCliente, cidade: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">UF *</label><input required type="text" value={novoCliente.estado} onChange={(e) => setNovoCliente({...novoCliente, estado: e.target.value.toUpperCase()})} maxLength="2" placeholder="SP" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">CEP *</label><input required type="text" value={novoCliente.cep} onChange={(e) => setNovoCliente({...novoCliente, cep: formatCEP(e.target.value)})} placeholder="00000-000" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" /></div>

              <div className="md:col-span-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <label className="text-[10px] font-black text-indigo-500 uppercase ml-1 mb-2 block">
                  Dia de Fechamento de Fatura
                  {(novoCliente.perfis.includes('Sócio') || novoCliente.perfis.includes('Externo') || novoCliente.perfis.includes('Outro')) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <input
                  type="number" min="1" max="28"
                  placeholder="Ex: 10 — todas as cobranças fecham neste dia"
                  value={novoCliente.dia_fechamento_fatura}
                  onChange={(e) => setNovoCliente({...novoCliente, dia_fechamento_fatura: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl font-bold text-indigo-800"
                />
                <p className="text-[10px] text-indigo-400 font-medium mt-2">
                  Obrigatório para Sócio, Externo e Outro. Todas as cobranças do cliente fecham neste dia todo mês e vencem 10 dias depois. Títulos individuais podem ser adiados para o próximo fechamento.
                </p>
              </div>

              <div className="md:col-span-3 border-t border-slate-100 mt-2 pt-4">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Parâmetros Operacionais (Preencha os ativados)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {novoCliente.perfis.includes('Sócio') && (
                      <div className="md:col-span-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl grid grid-cols-3 gap-4">
                        <h5 className="col-span-3 text-blue-800 font-bold text-sm border-b border-blue-200 pb-2">Contrato de Sócio</h5>
                        <div><label className="text-[10px] font-black text-blue-400 uppercase ml-1 mb-2 block">Mensalidade (R$)</label><input required type="number" step="0.01" value={novoCliente.mensalidade} onChange={(e) => setNovoCliente({...novoCliente, mensalidade: e.target.value})} className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg font-bold" /></div>
                        <div><label className="text-[10px] font-black text-blue-400 uppercase ml-1 mb-2 block">Duração (Meses)</label><input required type="number" min="1" value={novoCliente.duracao_meses} onChange={(e) => setNovoCliente({...novoCliente, duracao_meses: e.target.value})} className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg font-bold" /></div>

                      </div>
                    )}

                    {novoCliente.perfis.includes('Externo') && (
                      <div className="md:col-span-3 p-4 bg-purple-50/50 border border-purple-100 rounded-xl grid grid-cols-3 gap-4">
                        <h5 className="col-span-3 text-purple-800 font-bold text-sm border-b border-purple-200 pb-2">Treinamento Externo</h5>
                        <div className="col-span-3"><label className="text-[10px] font-black text-purple-400 uppercase ml-1 mb-2 block">Nome Treinamento</label><input required type="text" value={novoCliente.nome_treinamento} onChange={(e) => setNovoCliente({...novoCliente, nome_treinamento: e.target.value})} className="w-full px-4 py-2 bg-white border border-purple-200 rounded-lg font-bold" /></div>
                        <div><label className="text-[10px] font-black text-purple-400 uppercase ml-1 mb-2 block">Valor Parcela (R$)</label><input required type="number" step="0.01" value={novoCliente.valor_parcela} onChange={(e) => setNovoCliente({...novoCliente, valor_parcela: e.target.value})} className="w-full px-4 py-2 bg-white border border-purple-200 rounded-lg font-bold" /></div>
                        <div><label className="text-[10px] font-black text-purple-400 uppercase ml-1 mb-2 block">Nº Parcelas</label><input required type="number" min="1" value={novoCliente.numero_parcelas} onChange={(e) => setNovoCliente({...novoCliente, numero_parcelas: e.target.value})} className="w-full px-4 py-2 bg-white border border-purple-200 rounded-lg font-bold" /></div>

                      </div>
                    )}

                    {novoCliente.perfis.includes('Outro') && (
                      <div className="md:col-span-3 p-4 bg-orange-50/50 border border-orange-100 rounded-xl grid grid-cols-3 gap-4">
                        <h5 className="col-span-3 text-orange-800 font-bold text-sm border-b border-orange-200 pb-2">Outro Serviço</h5>
                        <div className="col-span-3"><label className="text-[10px] font-black text-orange-400 uppercase ml-1 mb-2 block">Desc. Serviço</label><input required type="text" value={novoCliente.descricao_servico} onChange={(e) => setNovoCliente({...novoCliente, descricao_servico: e.target.value})} className="w-full px-4 py-2 bg-white border border-orange-200 rounded-lg font-bold" /></div>
                        <div><label className="text-[10px] font-black text-orange-400 uppercase ml-1 mb-2 block">Valor Parcela (R$)</label><input required type="number" step="0.01" value={novoCliente.valor_servico} onChange={(e) => setNovoCliente({...novoCliente, valor_servico: e.target.value})} className="w-full px-4 py-2 bg-white border border-orange-200 rounded-lg font-bold" /></div>
                        <div><label className="text-[10px] font-black text-orange-400 uppercase ml-1 mb-2 block">Duração Meses</label><input required type="number" min="1" value={novoCliente.duracao_outro} onChange={(e) => setNovoCliente({...novoCliente, duracao_outro: e.target.value})} className="w-full px-4 py-2 bg-white border border-orange-200 rounded-lg font-bold" /></div>

                      </div>
                    )}

                    {(novoCliente.perfis.includes('Sócio') || novoCliente.perfis.includes('Aluno')) && (
                      <div className="md:col-span-3 p-4 border border-green-200 bg-green-50/30 rounded-xl mt-2">
                        <div><label className="text-[10px] font-black text-green-600 uppercase ml-1 mb-2 block">Vender Créditos Iniciais de Voo (R$ = Créditos)</label><input type="number" step="0.01" value={novoCliente.valor_credito} onChange={(e) => setNovoCliente({...novoCliente, valor_credito: e.target.value})} className="w-full px-4 py-3 bg-white border border-green-200 rounded-lg font-bold text-green-800" placeholder="Ex: 500.00" /></div>
                      </div>
                    )}

                 </div>
              </div>

              <button type="submit" className="md:col-span-3 w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 uppercase tracking-widest text-xs mt-2 transition-all shadow-lg shadow-blue-200">Confirmar Cadastro</button>
            </form>
          </div>
        </div>
      )}

      {isRenovarModalOpen && selectedCliente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Renovar Contrato</h3>
              <button onClick={() => setIsRenovarModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleRenovarContrato} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Qual serviço deseja renovar?</label>
                <select value={dadosRenovacao.tipo} onChange={(e) => setDadosRenovacao({...dadosRenovacao, tipo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none">
                  {selectedCliente.perfil.includes('Sócio') && <option value="Sócio">Contrato de Sócio</option>}
                  {selectedCliente.perfil.includes('Externo') && <option value="Externo">Treinamento Externo</option>}
                  {selectedCliente.perfil.includes('Outro') && <option value="Outro">Outro Serviço Ativo</option>}
                </select>
              </div>
              
              <div>
                <label className="text-[10px] font-black text-blue-600 uppercase ml-1 mb-2 block">Novo Valor da Parcela/Mensalidade (R$)</label>
                <input required type="number" step="0.01" value={dadosRenovacao.novo_valor} onChange={(e) => setDadosRenovacao({...dadosRenovacao, novo_valor: e.target.value})} className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl font-bold text-blue-800 outline-blue-500" />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Nova Duração / Nº de Parcelas</label>
                <input required type="number" min="1" value={dadosRenovacao.duracao_meses} onChange={(e) => setDadosRenovacao({...dadosRenovacao, duracao_meses: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" />
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 uppercase tracking-widest text-xs mt-2 transition-all">Confirmar Renovação</button>
            </form>
          </div>
        </div>
      )}

      {isDetailsModalOpen && selectedCliente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">{selectedCliente.nome}</h3>
                    {(selectedCliente.perfil.includes('Sócio') || selectedCliente.perfil.includes('Aluno')) && (
                        <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-xl text-sm font-black tracking-widest uppercase">
                            {selectedCliente.creditos?.reduce((acc, c) => acc + Number(c.valor), 0).toFixed(2)} Créditos
                        </span>
                    )}
                </div>
                <p className="text-slate-400 text-sm font-mono mt-1">ID: #{selectedCliente.id.toString().padStart(4, '0')} | {selectedCliente.perfil}</p>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl font-bold">×</button>
            </div>
            
            <div className="flex bg-slate-100 border-b border-slate-200 shrink-0 overflow-x-auto">
              <button onClick={() => setActiveTab('financeiro')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'financeiro' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>Financeiro & Faturas</button>
              {(selectedCliente.perfil.includes('Sócio') || selectedCliente.perfil.includes('Aluno')) && (
                  <>
                    <button onClick={() => setActiveTab('creditos')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'creditos' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>Créditos de Voo</button>
                    <button onClick={() => setActiveTab('pacotes')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'pacotes' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>Pacotes Adquiridos</button>
                  </>
              )}
              <button onClick={() => setActiveTab('cadastro')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'cadastro' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>Dados Cadastrais</button>
            </div>

            <div className="p-8 overflow-y-auto">
              {activeTab === 'financeiro' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Resumo Financeiro Global</h4>
                    <div className="flex justify-between mb-2"><span className="text-slate-500">Total Faturado no Sistema:</span><span className="font-bold text-slate-700">R$ {selectedCliente.debito_servicos?.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-2"><span className="text-slate-500">Total de Voos Consumidos:</span><span className="font-bold text-slate-700">R$ {selectedCliente.voos_debito?.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-4 pb-4 border-b border-slate-200"><span className="text-green-600 font-bold">Total Já Pago ao Clube:</span><span className="font-bold text-green-600">R$ {selectedCliente.saldoPago?.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-red-800 font-bold uppercase text-xs">Saldo Devedor (Atrasado/Hoje):</span><span className="text-xl font-black text-slate-900">R$ {Math.max(0, (selectedCliente.totalVencido || 0) - (selectedCliente.saldoPago || 0)).toFixed(2)}</span></div>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100 flex flex-col justify-center gap-4">
                    <div className="flex gap-2 mb-2 border-b border-blue-200 pb-4">
                      {selectedCliente.perfil.includes('Sócio') && (
                        <button type="button" onClick={() => handleToggleSuspensao(selectedCliente.id)} className={`flex-1 font-black py-2 rounded-xl text-[9px] uppercase tracking-widest transition-all border ${selectedCliente.suspenso ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'}`}>
                          {selectedCliente.suspenso ? 'Reativar Sócio' : 'Suspender Sócio'}
                        </button>
                      )}
                      {(selectedCliente.perfil.includes('Sócio') || selectedCliente.perfil.includes('Outro') || selectedCliente.perfil.includes('Externo')) && (
                        <button type="button" onClick={openRenovarModal} className="flex-1 font-black py-2 rounded-xl text-[9px] uppercase tracking-widest transition-all border bg-white text-blue-600 border-blue-200 hover:bg-blue-100">
                          Renovar Contrato
                        </button>
                      )}
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-bold text-blue-900 mb-1">Dar Baixa em Faturas (Parcial ou Total)</h4>
                        <p className="text-[10px] text-blue-600 mb-3 font-medium uppercase tracking-widest">Escolha a fatura alvo e digite o valor recebido do cliente</p>
                        <div className="flex flex-col xl:flex-row gap-3">
                          <select 
                            className="w-full xl:flex-1 p-3 rounded-xl border-2 border-blue-200 outline-none font-bold text-slate-700 bg-white text-xs truncate"
                            value={selectedCobrancaId}
                            onChange={(e) => setSelectedCobrancaId(e.target.value)}
                          >
                            <option value="">Abater da Dívida Geral (Avulso)</option>
                            {selectedCliente.cobrancas?.filter(c => c.status !== 'Abatido').map(c => (
                              <option key={c.id} value={c.id}>
                                {c.descricao} (Pendente: R$ {(c.valor - (c.valor_pago || 0)).toFixed(2)})
                              </option>
                            ))}
                          </select>
                          <input type="number" step="0.01" placeholder="Valor Pagar (R$)" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full xl:w-32 p-3 rounded-xl border-2 border-blue-200 outline-none font-bold text-sm" />
                          <button onClick={handlePayment} className="w-full xl:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-xl transition-all whitespace-nowrap text-[10px] uppercase">
                            DAR BAIXA
                          </button>
                        </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 mt-4">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Histórico Detalhado de Títulos</h4>
                     <div className="overflow-hidden border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-500"><tr><th className="p-4">Referência de Faturamento</th><th className="p-4">Vencimento</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Valor Final</th></tr></thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {selectedCliente.cobrancas?.map((cob, i) => (
                                    <tr key={i}>
                                        <td className="p-4 font-bold text-slate-700">{cob.descricao}</td>
                                        <td className="p-4 text-slate-500">{cob.data_vencimento.split('-').reverse().join('/')}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 text-[10px] uppercase font-black rounded-md ${
                                                cob.status === 'Pendente' ? 'bg-orange-100 text-orange-600' : 
                                                cob.status === 'Parcialmente Abatido' ? 'bg-blue-100 text-blue-600' : 
                                                cob.status === 'Abatido' ? 'bg-green-100 text-green-600' : 
                                                'bg-red-100 text-red-600'
                                            }`}>{cob.status}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-bold text-slate-700">R$ {cob.valor.toFixed(2)}</div>
                                            {cob.status === 'Parcialmente Abatido' && (
                                                <div className="text-[10px] font-black text-green-600 mt-1 uppercase tracking-wider">
                                                    Já Pago: R$ {cob.valor_pago ? cob.valor_pago.toFixed(2) : '0.00'}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'creditos' && (selectedCliente.perfil.includes('Sócio') || selectedCliente.perfil.includes('Aluno')) && (
                  <div className="grid grid-cols-1 gap-4">
                     <div className="flex justify-between items-center mb-2">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Movimentação de Créditos</h4>
                         <button onClick={() => { setIsCreditoModalOpen(true); }} className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-black px-4 py-2 rounded-lg transition-all shadow-md active:scale-95">+ COMPRAR CRÉDITOS</button>
                     </div>
                     <div className="overflow-hidden border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-500"><tr><th className="p-4">Movimentação (R$ = Créditos)</th><th className="p-4 text-right">Data</th></tr></thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {selectedCliente.creditos?.map((credito, i) => (
                                    <tr key={i}>
                                        <td className="p-4 font-bold text-slate-700">
                                            {credito.valor >= 0 
                                                ? <span className="text-green-600">+ R$ {credito.valor?.toFixed(2) || '0.00'}</span> 
                                                : <span className="text-red-500">- R$ {Math.abs(credito.valor).toFixed(2)} <span className="text-[10px] font-black uppercase text-slate-400 ml-1">(Consumido)</span></span>
                                            }
                                        </td>
                                        <td className="p-4 text-right font-medium text-slate-500">{credito.data_compra ? credito.data_compra.split('-').reverse().join('/') : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                  </div>
              )}

              {activeTab === 'pacotes' && (selectedCliente.perfil.includes('Sócio') || selectedCliente.perfil.includes('Aluno')) && (
                  <div className="grid grid-cols-1 gap-4">
                     <div className="flex justify-between items-center mb-2">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pacotes Adquiridos</h4>
                         <button onClick={() => { setIsPacoteModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-4 py-2 rounded-lg transition-all shadow-md active:scale-95">+ ADICIONAR PACOTE</button>
                     </div>
                     <div className="overflow-hidden border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-500"><tr><th className="p-4">Horas</th><th className="p-4">Aeronave</th><th className="p-4">Renegociação</th><th className="p-4">Pagamento</th><th className="p-4 text-right">Ação</th></tr></thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {selectedCliente.pacotes?.map((pacote, i) => (
                                    <tr key={i}>
                                        <td className="p-4 font-bold text-slate-700">{pacote.horas}h</td>
                                        <td className="p-4 text-slate-500 font-bold">{pacote.aeronave} <span className="block font-normal text-[10px] uppercase text-slate-400">{pacote.tipo_voo}</span></td>
                                        <td className="p-4 text-slate-500 font-medium">
                                          {pacote.data_renegociacao ? pacote.data_renegociacao.split('-').reverse().join('/') : 'Nenhuma'}
                                        </td>
                                        <td className="p-4"><span className={`px-2 py-1 text-[10px] uppercase font-black rounded-md ${pacote.tipo_pagamento === 'Crédito' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{pacote.tipo_pagamento}</span></td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleRenegociarPacote(pacote.id)} className="text-[10px] bg-slate-100 text-blue-600 border border-slate-200 px-3 py-2 rounded-lg font-bold uppercase hover:bg-blue-50">
                                              Renegociar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                  </div>
              )}

              {activeTab === 'cadastro' && (
                <form onSubmit={handleUpdateDados} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Nome</label><input required name="nome" type="text" defaultValue={selectedCliente.nome} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">CPF (Imutável)</label><input type="text" value={formatCPF(selectedCliente.cpf || '')} disabled className="w-full px-4 py-3 bg-slate-200 border-2 border-slate-200 rounded-xl font-mono text-slate-500 cursor-not-allowed" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Data Nasc.</label><input name="nascimento" type="date" defaultValue={selectedCliente.nascimento} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">E-mail</label><input required name="email" type="email" defaultValue={selectedCliente.email} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Telefone</label><input name="telefone" type="text" defaultValue={selectedCliente.telefone} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  
                  <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Rua</label><input required name="rua" type="text" defaultValue={selectedCliente.rua} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Nº</label><input required name="numero" type="text" defaultValue={selectedCliente.numero} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Bairro</label><input required name="bairro" type="text" defaultValue={selectedCliente.bairro} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Cidade</label><input required name="cidade" type="text" defaultValue={selectedCliente.cidade} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">UF</label><input required name="estado" type="text" defaultValue={selectedCliente.estado} maxLength="2" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500 uppercase" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">CEP</label><input required name="cep" type="text" defaultValue={formatCEP(selectedCliente.cep || '')} onChange={(e) => e.target.value = formatCEP(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500" /></div>

                  <div className="md:col-span-2 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <label className="text-[10px] font-black text-indigo-500 uppercase ml-1 mb-2 block">Dia de Fechamento de Fatura</label>
                    <input name="dia_fechamento_fatura" type="number" min="1" max="28" placeholder="Ex: 10 (deixe vazio para não usar fechamento)" defaultValue={selectedCliente.dia_fechamento_fatura || ''} className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl font-bold text-indigo-800" />
                    <p className="text-[10px] text-indigo-400 font-medium mt-2">Alterar aqui não move títulos já gerados — use o adiamento de títulos em "Títulos a Receber" para isso.</p>
                  </div>
                  
                  <button type="submit" className="md:col-span-2 w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 uppercase tracking-widest text-xs mt-2">Salvar Alterações</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      
      {isPacoteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Adicionar Pacote de Voos</h3>
              <button onClick={() => setIsPacoteModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleAddPacote} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Quantia de Horas</label><input required type="number" step="0.1" min="0.1" value={novoPacote.horas} onChange={(e) => setNovoPacote({...novoPacote, horas: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700" /></div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Tipo de Voo</label>
                    <select value={novoPacote.tipo_voo} onChange={(e) => setNovoPacote({...novoPacote, tipo_voo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none">
                      <option value="Solo">Solo</option><option value="Duplo Comando">Duplo Comando</option>
                    </select>
                  </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Aeronave Vinculada</label>
                <select required value={novoPacote.aeronave_id} onChange={(e) => setNovoPacote({...novoPacote, aeronave_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none">
                  <option value="">Selecione...</option>
                  {aeronaves.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Valor do Pacote (R$)</label><input required type="number" step="0.01" min="0.01" value={novoPacote.valor} onChange={(e) => setNovoPacote({...novoPacote, valor: e.target.value})} placeholder="Ex: 1500.00" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700" /></div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Forma de Pagamento</label>
                    <select value={novoPacote.tipo_pagamento} onChange={(e) => setNovoPacote({...novoPacote, tipo_pagamento: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none">
                      <option value="Crédito">Abater de Créditos</option>
                      <option value="Fatura">Gerar Título a Receber</option>
                    </select>
                  </div>
              </div>
              {novoPacote.tipo_pagamento === 'Crédito' && (
                <p className="text-[10px] text-slate-400 font-bold uppercase -mt-2">
                  Saldo de créditos atual: R$ {Number(selectedCliente?.saldoPago || 0).toFixed(2)}
                </p>
              )}
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl mt-2">Registrar Pacote</button>
            </form>
          </div>
        </div>
      )}

      {isCreditoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Comprar Créditos</h3>
              <button onClick={() => setIsCreditoModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleAddCredito} className="p-6 space-y-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block">Valor a Pagar (R$)</label><input required type="number" step="0.01" value={novoCredito.valor} onChange={(e) => setNovoCredito({...novoCredito, valor: e.target.value})} className="w-full px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl font-bold text-green-800" /></div>
              <button type="submit" className="w-full bg-green-600 text-white font-black py-4 rounded-xl mt-2">Confirmar</button>
            </form>
          </div>
        </div>
      )}
      </>, document.body)}
    </div>
  );
};

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

export default Clientes;