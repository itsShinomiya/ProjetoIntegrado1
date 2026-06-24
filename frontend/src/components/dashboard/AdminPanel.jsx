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

const formatTelefone = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})$/, '$1-$2')
    .slice(0, 15);
};

const AdminPanel = () => {
  const [showInsModal, setShowInsModal] = useState(false);
  const [showAeroModal, setShowAeroModal] = useState(false);
  const [showFuncModal, setShowFuncModal] = useState(false);
  
  const [selectedIns, setSelectedIns] = useState(null);
  const [selectedFunc, setSelectedFunc] = useState(null);
  
  const [cpfForm, setCpfForm] = useState('');
  const [cpfFuncForm, setCpfFuncForm] = useState('');

  const [instrutores, setInstrutores] = useState([]);
  const [aeronaves, setAeronaves] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);

  const fetchData = async () => {
    try {
      const resIns = await fetch(`${API_URL}/instrutores`);
      if (resIns.ok) setInstrutores(await resIns.json());

      const resAero = await fetch(`${API_URL}/aeronaves`);
      if (resAero.ok) setAeronaves(await resAero.json());

      const resFunc = await fetch(`${API_URL}/funcionarios`);
      if (resFunc.ok) setFuncionarios(await resFunc.json());
    } catch (error) { console.error("Falha na requisição.", error); }
  };

  useEffect(() => { fetchData(); }, []);

  const openInsModal = (instrutor = null) => {
    setSelectedIns(instrutor);
    setCpfForm(instrutor ? formatCPF(instrutor.cpf || '') : '');
    setShowInsModal(true);
  };

  const openFuncModal = (funcionario = null) => {
    setSelectedFunc(funcionario);
    setCpfFuncForm(funcionario ? formatCPF(funcionario.cpf || '') : '');
    setShowFuncModal(true);
  };

  const handleCpfChange = (e) => setCpfForm(formatCPF(e.target.value));

  const handleExcluir = async (tipo, id) => {
    if (window.confirm(`Deseja realmente excluir este ${tipo}?`)) {
      const endpoint = tipo === 'instrutor' ? 'instrutores' : tipo === 'funcionário' ? 'funcionarios' : 'aeronaves';
      try {
        await fetch(`${API_URL}/${endpoint}/${id}`, { method: 'DELETE' });
        fetchData();
      } catch (error) { console.error(`Erro ao excluir ${tipo}:`, error); }
    }
  };

  const handleInsSubmit = async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));
    formData.cargo = "Instrutor";
    
    // Injeta manualmente o CPF pois campos disabled não vão no FormData
    formData.cpf = cpfForm; 

    if (!formData.nome || !formData.cpf || !formData.telefone) return alert("Preencha Nome, CPF e Telefone.");
    if (!selectedIns && !validateCPF(formData.cpf)) return alert("CPF Inválido!");
    
    formData.cpf = formData.cpf.replace(/\D/g, '');
    formData.telefone = formData.telefone.replace(/\D/g, '');

    try {
      const url = selectedIns ? `${API_URL}/instrutores/${selectedIns.id}` : `${API_URL}/instrutores`;
      const res = await fetch(url, {
        method: selectedIns ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert(selectedIns ? "Instrutor atualizado!" : "Instrutor cadastrado!");
        setShowInsModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Falha: ${err.error}`);
      }
    } catch (error) { alert("Erro de conexão."); }
  };

  const handleFuncSubmit = async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));
    
    // Injeta manualmente o CPF pois campos disabled não vão no FormData
    formData.cpf = cpfFuncForm;
    
    // Correção: Na edição, o username é disabled e não é capturado no form. Injetamos ele de volta.
    if (selectedFunc) {
      formData.username = selectedFunc.username;
    }

    if (!formData.nome || !formData.cpf || !formData.telefone || !formData.username) return alert("Preencha Nome, CPF, Telefone e Login.");
    if (!selectedFunc && !formData.password) return alert("Forneça uma senha para o login.");
    if (!selectedFunc && !validateCPF(formData.cpf)) return alert("CPF Inválido!");
    
    formData.cpf = formData.cpf.replace(/\D/g, '');
    formData.telefone = formData.telefone.replace(/\D/g, '');

    try {
      const url = selectedFunc ? `${API_URL}/funcionarios/${selectedFunc.id}` : `${API_URL}/funcionarios`;
      const res = await fetch(url, {
        method: selectedFunc ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert(selectedFunc ? "Funcionário atualizado!" : "Funcionário cadastrado e acesso criado!");
        setShowFuncModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Falha: ${err.error}`);
      }
    } catch (error) { alert("Erro de conexão."); }
  };

  const handleAeroSubmit = async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));
    try {
      const res = await fetch(`${API_URL}/aeronaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert("Aeronave registrada!");
        setShowAeroModal(false);
        fetchData();
      } else { alert("Erro ao salvar."); }
    } catch (error) { alert("Erro de conexão."); }
  };

  return (
    <div className="space-y-8 relative">

      {/* SEÇÃO DE FUNCIONÁRIOS (SECRETARIA / ADMIN) */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Funcionários do Aeroclube</h2>
          <button onClick={() => openFuncModal()} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-lg shadow-green-100">+ NOVO FUNCIONÁRIO</button>
        </div>
        <div className="space-y-3">
          {funcionarios.length === 0 && <p className="text-sm font-medium text-slate-400">Nenhum funcionário cadastrado.</p>}
          {funcionarios.map((func) => (
            <div key={func.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-green-200 transition-all group">
              <div>
                <p className="font-bold text-slate-700">{func.nome}</p>
                <p className="text-[10px] text-green-600 uppercase font-black tracking-widest">{func.cargo} | Login: {func.username}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openFuncModal(func)} className="bg-white text-green-700 text-[10px] font-black px-4 py-2 rounded-lg border border-slate-200 hover:border-green-600 transition-all uppercase">Detalhar</button>
                <button onClick={() => handleExcluir('funcionário', func.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><TrashIcon /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SEÇÃO DE INSTRUTORES */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Gerenciar Instrutores</h2>
          <button onClick={() => openInsModal()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-100">+ NOVO INSTRUTOR</button>
        </div>
        <div className="space-y-3">
          {instrutores.length === 0 && <p className="text-sm font-medium text-slate-400">Nenhum instrutor cadastrado.</p>}
          {instrutores.map((ins) => (
            <div key={ins.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group">
              <div><p className="font-bold text-slate-700">{ins.nome}</p><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{ins.cargo}</p></div>
              <div className="flex items-center gap-3">
                <button onClick={() => openInsModal(ins)} className="bg-white text-blue-700 text-[10px] font-black px-4 py-2 rounded-lg border border-slate-200 hover:border-blue-600 transition-all uppercase">Detalhar</button>
                <button onClick={() => handleExcluir('instrutor', ins.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><TrashIcon /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SEÇÃO DE AERONAVES */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Gerenciar Aeronaves</h2>
          <button onClick={() => setShowAeroModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-lg shadow-purple-100">+ NOVA AERONAVE</button>
        </div>
        <div className="space-y-3">
          {aeronaves.length === 0 && <p className="text-sm font-medium text-slate-400">Nenhuma aeronave cadastrada.</p>}
          {aeronaves.map((aero) => (
            <div key={aero.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-purple-200 transition-all">
              <div><p className="font-bold text-slate-700">{aero.nome}</p><p className="text-[10px] text-purple-500 uppercase font-black tracking-widest">{aero.tipo}</p></div>
              <button onClick={() => handleExcluir('aeronave', aero.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><TrashIcon /></button>
            </div>
          ))}
        </div>
      </section>

      {createPortal(<>
      {/* MODAL FUNCIONÁRIO (SECRETARIA) */}
      {showFuncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{selectedFunc ? 'Ficha do Funcionário' : 'Novo Funcionário'}</h3>
              <button onClick={() => setShowFuncModal(false)} className="h-8 w-8 text-slate-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleFuncSubmit} className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><Label>Nome Completo *</Label><Input name="nome" type="text" defaultValue={selectedFunc?.nome} required /></div>
                  <div>
                    <Label>Cargo / Nível de Acesso *</Label>
                    <select name="cargo" defaultValue={selectedFunc?.cargo || "Secretaria"} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-green-500 font-bold outline-none">
                      <option value="Secretaria">Secretaria (Padrão)</option>
                      <option value="Gestão">Gestão / Admin</option>
                    </select>
                  </div>
                  <div>
                    <Label>Telefone / WhatsApp *</Label>
                    <Input name="telefone" type="text" defaultValue={formatTelefone(selectedFunc?.telefone || '')} onChange={(e) => e.target.value = formatTelefone(e.target.value)} placeholder="(00) 00000-0000" required />
                  </div>
                  <div><Label>E-mail Corporativo</Label><Input name="email" type="email" defaultValue={selectedFunc?.email} /></div>
                  <div>
                    <Label>CPF *</Label>
                    <input type="text" value={cpfFuncForm} onChange={(e) => setCpfFuncForm(formatCPF(e.target.value))} maxLength="14" placeholder="000.000.000-00" disabled={!!selectedFunc} className={`w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none font-bold font-mono ${selectedFunc ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-700 focus:border-green-500'}`} />
                  </div>
                  <div className="md:col-span-2"><Label>Endereço Completo</Label><Input name="endereco" type="text" defaultValue={selectedFunc?.endereco} /></div>

                  <div className="md:col-span-2 border-t border-slate-100 mt-2 pt-4">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Dados de Autenticação (Acesso ao Sistema)</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50/50 border border-green-100 rounded-xl">
                        <div>
                            <Label>Nome de Usuário (Login) *</Label>
                            <input name="username" type="text" required disabled={!!selectedFunc} defaultValue={selectedFunc?.username} placeholder="Ex: joao.secretaria" className={`w-full px-4 py-3 border border-slate-200 rounded-xl font-bold outline-none ${selectedFunc ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white focus:border-green-500'}`} />
                        </div>
                        <div>
                            <Label>Senha do Sistema {selectedFunc && "(Opcional: preencha para alterar)"}</Label>
                            <input name="password" type="password" required={!selectedFunc} placeholder="***" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-green-500" />
                        </div>
                     </div>
                  </div>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white font-black py-4 rounded-xl hover:bg-green-700 transition-all uppercase tracking-widest text-xs mt-6">{selectedFunc ? 'SALVAR ALTERAÇÕES' : 'FINALIZAR CADASTRO'}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INSTRUTOR */}
      {showInsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{selectedIns ? 'Ficha do Instrutor' : 'Novo Cadastro'}</h3>
              <button onClick={() => setShowInsModal(false)} className="h-8 w-8 text-slate-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleInsSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label>Nome Completo *</Label><Input name="nome" type="text" defaultValue={selectedIns?.nome} required /></div>
              <div><Label>E-mail Institucional</Label><Input name="email" type="email" defaultValue={selectedIns?.email} /></div>
              <div>
                <Label>Telefone / WhatsApp *</Label>
                <Input name="telefone" type="text" defaultValue={formatTelefone(selectedIns?.telefone || '')} onChange={(e) => e.target.value = formatTelefone(e.target.value)} placeholder="(00) 00000-0000" required />
              </div>
              <div>
                <Label>CPF *</Label>
                <input type="text" value={cpfForm} onChange={handleCpfChange} maxLength="14" placeholder="000.000.000-00" disabled={!!selectedIns} className={`w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none transition-all font-bold font-mono ${selectedIns ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-700 focus:border-blue-500'}`} />
              </div>
              <div><Label>Data de Nascimento</Label><Input name="nascimento" type="date" defaultValue={selectedIns?.nascimento} /></div>
              <div className="md:col-span-2"><Label>Endereço Completo</Label><Input name="endereco" type="text" defaultValue={selectedIns?.endereco} /></div>
              <div className="md:col-span-2 pt-2 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all">{selectedIns ? 'SALVAR ALTERAÇÕES' : 'FINALIZAR REGISTRO'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA AERONAVE */}
      {showAeroModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Registrar Aeronave</h3>
              <button type="button" onClick={() => setShowAeroModal(false)} className="h-8 w-8 text-slate-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleAeroSubmit} className="p-8 space-y-6">
              <div><Label>Nome / Prefixo da Aeronave</Label><Input name="nome" type="text" required /></div>
              <div>
                <Label>Categoria</Label>
                <select name="tipo" className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-purple-500 outline-none font-bold text-slate-700 appearance-none">
                  <option value="Avião">Avião</option>
                  <option value="Planador">Planador</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-purple-600 text-white font-black py-5 rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 uppercase tracking-widest text-xs">Confirmar Registro</button>
            </form>
          </div>
        </div>
      )}
      </>, document.body)}
    </div>
  );
};

const Label = ({ children }) => <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-widest">{children}</label>;
const Input = (props) => <input {...props} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700" />;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

export default AdminPanel;