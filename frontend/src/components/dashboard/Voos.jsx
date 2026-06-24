import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const API_URL = 'http://localhost:5000/api';

const Voos = () => {
  const [voos, setVoos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [instrutores, setInstrutores] = useState([]);
  const [aeronaves, setAeronaves] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    cliente_id: '',
    modelo: '',
    tipo: 'Avião',
    local_saida: '',
    local_chegada: '',
    horario_saida: '',
    horario_chegada: '',
    litros: '',
    custo: '',
    categoria_voo: 'Solo',
    instrutor: '',
    porcentagem_instrutor: '',
    forma_pagamento: 'cobranca',
    pacote_id: ''
  });

  const fetchData = async () => {
    try {
      const resVoos = await fetch(`${API_URL}/voos`);
      if (resVoos.ok) setVoos(await resVoos.json());

      const resCli = await fetch(`${API_URL}/clientes`);
      if (resCli.ok) setClientes(await resCli.json());

      const resIns = await fetch(`${API_URL}/instrutores`);
      if (resIns.ok) setInstrutores(await resIns.json());

      const resAero = await fetch(`${API_URL}/aeronaves`);
      if (resAero.ok) setAeronaves(await resAero.json());
    } catch (error) { console.error("Erro ao buscar dados:", error); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newData = { ...prev, [name]: value };
        // Limpa instrutor se for Solo
        if (name === 'categoria_voo' && value === 'Solo') {
            newData.instrutor = '';
            newData.porcentagem_instrutor = '';
        }
        // Ajusta tipo baseado no modelo de aeronave
        if (name === 'modelo') {
            const aero = aeronaves.find(a => a.nome === value);
            if (aero) newData.tipo = aero.tipo;
        }
        return newData;
    });
  };

  const calcularHoras = () => {
    if (formData.horario_saida && formData.horario_chegada) {
      const s = new Date(formData.horario_saida);
      const c = new Date(formData.horario_chegada);
      if (c <= s) return "0.00";
      
      let diffMin = (c - s) / 60000;
      let minRemainder = diffMin % 60;
      
      // Aplicar tolerância de 2 min no frontend visualmente
      if (minRemainder <= 2) diffMin -= minRemainder;
      else if (minRemainder >= 58) diffMin += (60 - minRemainder);
      
      return (diffMin / 60).toFixed(2);
    }
    return "0.00";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.forma_pagamento === 'pacote' && !formData.pacote_id) {
        return alert("Selecione um pacote de horas válido!");
    }

    try {
      const res = await fetch(`${API_URL}/voos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert("Voo registado com sucesso!");
        setIsModalOpen(false);
        setFormData({
          cliente_id: '', modelo: '', tipo: 'Avião', local_saida: '', local_chegada: '',
          horario_saida: '', horario_chegada: '', litros: '', custo: '', categoria_voo: 'Solo',
          instrutor: '', porcentagem_instrutor: '', forma_pagamento: 'cobranca', pacote_id: ''
        });
        fetchData();
      } else {
        const err = await res.json();
        alert(`Erro: ${err.error}`);
      }
    } catch (error) { alert("Erro de conexão."); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apagar este registro de voo?")) {
      await fetch(`${API_URL}/voos/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const clienteSelecionado = clientes.find(c => c.id === parseInt(formData.cliente_id));
  const pacotesAtivos = clienteSelecionado?.pacotes?.filter(p => p.horas > 0) || [];
  const fracaoAtual = calcularHoras();

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Diário de Voos</h2>
          <p className="text-slate-500 text-sm">Controle de operações, horas e comissionamento</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2">
          <span>+</span> REGISTRAR VOO
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
              <th className="px-6 py-4">Piloto / Aluno</th>
              <th className="px-6 py-4">Aeronave</th>
              <th className="px-6 py-4">Horários (Partida - Chegada)</th>
              <th className="px-6 py-4">Instrutor</th>
              <th className="px-6 py-4 text-right">Custo Declarado</th>
              <th className="px-6 py-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {voos.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-5 font-bold text-slate-700">{v.aluno}</td>
                <td className="px-6 py-5">
                    <span className="font-bold text-slate-700 block">{v.modelo}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">{v.tipo} - {v.categoria_voo}</span>
                </td>
                <td className="px-6 py-5 text-slate-500 text-xs">
                    {v.horario_saida.replace('T', ' ')} <br/> {v.horario_chegada.replace('T', ' ')}
                </td>
                <td className="px-6 py-5 text-slate-500 font-bold">{v.instrutor || '-'}</td>
                <td className="px-6 py-5 text-right font-black text-blue-600">R$ {v.custo?.toFixed(2)}</td>
                <td className="px-6 py-5 text-right">
                  <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
                    Apagar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createPortal(<>
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Lançamento de Voo</h3>
              <button onClick={() => setIsModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
              
              {/* BLOCO 1: INFORMAÇÕES BÁSICAS */}
              <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Informações da Operação</h4>
                  
                  <div><Label>Piloto Comando / Aluno *</Label>
                    <select required name="cliente_id" value={formData.cliente_id} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500">
                        <option value="">Selecione...</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.cpf})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Aeronave *</Label>
                        <select required name="modelo" value={formData.modelo} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500">
                            <option value="">Selecione...</option>
                            {aeronaves.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                        </select>
                    </div>
                    <div><Label>Categoria *</Label>
                        <select name="categoria_voo" value={formData.categoria_voo} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-blue-500">
                            <option value="Solo">Voo Solo</option>
                            <option value="Duplo Comando">Duplo Comando</option>
                        </select>
                    </div>
                  </div>

                  {formData.categoria_voo === 'Duplo Comando' && (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Selecione o Instrutor</Label>
                            <select required name="instrutor" value={formData.instrutor} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl font-bold outline-none">
                                <option value="">Nenhum...</option>
                                {instrutores.map(i => <option key={i.id} value={i.nome}>{i.nome}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <Label>Comissão do Instrutor (%)</Label>
                            <input required type="number" step="0.1" name="porcentagem_instrutor" value={formData.porcentagem_instrutor} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl font-bold outline-none" placeholder="Ex: 20" />
                        </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Local Saída</Label><Input name="local_saida" value={formData.local_saida} onChange={handleChange} placeholder="Ex: SBPC" /></div>
                    <div><Label>Local Chegada</Label><Input name="local_chegada" value={formData.local_chegada} onChange={handleChange} placeholder="Ex: SBPC" /></div>
                  </div>
              </div>

              {/* BLOCO 2: TEMPO E FATURAMENTO */}
              <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Tempos e Faturamento</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Horário Acionamento *</Label><Input required type="datetime-local" name="horario_saida" value={formData.horario_saida} onChange={handleChange} /></div>
                    <div><Label>Horário Corte *</Label><Input required type="datetime-local" name="horario_chegada" value={formData.horario_chegada} onChange={handleChange} /></div>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-xl text-center shadow-inner">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fração de Hora Calculada</p>
                      <p className="text-4xl font-black text-green-400">{fracaoAtual}h</p>
                      <p className="text-[9px] text-slate-500 mt-1 uppercase">Tolerância automática de 2 min aplicada</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Combustível (Lts)</Label><Input type="number" step="0.1" name="litros" value={formData.litros} onChange={handleChange} /></div>
                    <div><Label>Custo Operacional (R$) *</Label><Input required type="number" step="0.01" name="custo" value={formData.custo} onChange={handleChange} /></div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                      <div>
                          <Label>Forma de Cobrança do Cliente</Label>
                          <select name="forma_pagamento" value={formData.forma_pagamento} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-bold text-blue-900 outline-none">
                              <option value="cobranca">Gerar Título a Receber (Fatura)</option>
                              <option value="pacote">Abater de Pacote de Horas</option>
                          </select>
                      </div>

                      {formData.forma_pagamento === 'pacote' && (
                          <div>
                              <Label>Selecione o Pacote Ativo</Label>
                              <select name="pacote_id" value={formData.pacote_id} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-bold text-blue-900 outline-none">
                                  <option value="">Selecione...</option>
                                  {pacotesAtivos.map(p => (
                                      <option key={p.id} value={p.id}>
                                          {p.horas}h Disponíveis - {p.aeronave} ({p.tipo_voo})
                                      </option>
                                  ))}
                              </select>
                              {pacotesAtivos.length === 0 && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">Este cliente não possui pacotes com saldo.</p>}
                          </div>
                      )}
                  </div>
              </div>

              <div className="md:col-span-2 pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 uppercase tracking-widest text-xs shadow-lg shadow-blue-200 transition-all">
                  Concluir Registro de Voo
                </button>
              </div>
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

export default Voos;