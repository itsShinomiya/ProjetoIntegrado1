import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const API_URL = 'http://localhost:5000/api';

const Titulos = () => {
  const [titulos, setTitulos] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tipoTitulo, setTipoTitulo] = useState('Pagamento de fornecedor');

  const [novoTitulo, setNovoTitulo] = useState({
    descricao: '',
    numero_nf: '',
    valor: '',
    numero_parcelas: 1,
    data_emissao: '',
    data_vencimento: '',
    duracao_meses: 1,
    dia_pagamento: 1
  });

  const fetchTitulos = async () => {
    try {
      const res = await fetch(`${API_URL}/titulos`);
      if (res.ok) {
        setTitulos(await res.json());
      }
    } catch (error) { console.error("Erro ao buscar títulos:", error); }
  };

  useEffect(() => { fetchTitulos(); }, []);

  const handleAddTitulo = async (e) => {
    e.preventDefault();
    const data = { ...novoTitulo, tipo: tipoTitulo };

    try {
      const res = await fetch(`${API_URL}/titulos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert("Título(s) registado(s) com sucesso!");
        setIsAddModalOpen(false);
        setNovoTitulo({
          descricao: '', numero_nf: '', valor: '', 
          numero_parcelas: 1, data_emissao: '', data_vencimento: '', duracao_meses: 1, dia_pagamento: 1
        });
        fetchTitulos();
      } else {
        alert("Erro ao guardar o título.");
      }
    } catch (error) { alert("Erro de ligação."); }
  };

  const handleStatusChange = async (titulo) => {
    const statusOpcoes = ['pendente', 'abatido', 'atrasado'];
    const proximoIndex = (statusOpcoes.indexOf(titulo.status) + 1) % statusOpcoes.length;
    const novoStatus = statusOpcoes[proximoIndex];
    let valorExtra = 0;

    if (novoStatus === 'atrasado') {
      const inputExtra = prompt("O título está a ser marcado como ATRASADO. Qual foi o valor a MAIS pago pelo atraso (R$)?", "0");
      if (inputExtra === null) return; 
      valorExtra = parseFloat(inputExtra.replace(',', '.')) || 0;
    }

    try {
      await fetch(`${API_URL}/titulos/${titulo.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, valor_extra: valorExtra })
      });
      fetchTitulos();
    } catch (error) { alert("Erro ao atualizar o status."); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente apagar este registo?")) {
      try {
        await fetch(`${API_URL}/titulos/${id}`, { method: 'DELETE' });
        fetchTitulos();
      } catch (error) { alert("Erro ao apagar o título."); }
    }
  };

  const renderCamposCondicionais = () => {
    if (tipoTitulo === 'Folha de pagamento') {
      return (
        <>
          <div><Label>Salário Mensal (R$)</Label><Input required type="number" step="0.01" value={novoTitulo.valor} onChange={(e) => setNovoTitulo({...novoTitulo, valor: e.target.value})} /></div>
          <div><Label>Duração em meses</Label><Input required type="number" min="1" value={novoTitulo.duracao_meses} onChange={(e) => setNovoTitulo({...novoTitulo, duracao_meses: e.target.value})} /></div>
          <div><Label>Dia do pagamento</Label><Input required type="number" min="1" max="31" value={novoTitulo.dia_pagamento} onChange={(e) => setNovoTitulo({...novoTitulo, dia_pagamento: e.target.value})} /></div>
        </>
      );
    }
    return (
      <>
        <div><Label>Valor de cada Parcela (R$)</Label><Input required type="number" step="0.01" value={novoTitulo.valor} onChange={(e) => setNovoTitulo({...novoTitulo, valor: e.target.value})} /></div>
        <div><Label>Nº de Parcelas</Label><Input required type="number" min="1" value={novoTitulo.numero_parcelas} onChange={(e) => setNovoTitulo({...novoTitulo, numero_parcelas: e.target.value})} /></div>
        <div><Label>Data de Emissão</Label><Input required type="date" value={novoTitulo.data_emissao} onChange={(e) => setNovoTitulo({...novoTitulo, data_emissao: e.target.value})} /></div>
        <div><Label>1º Vencimento</Label><Input required type="date" value={novoTitulo.data_vencimento} onChange={(e) => setNovoTitulo({...novoTitulo, data_vencimento: e.target.value})} /></div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Títulos a Pagar</h2>
          <p className="text-slate-500 text-sm">Controlo de contas e despesas do aeroclube</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2">
          <span>+</span> ADICIONAR TÍTULO
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4 text-center">NF</th>
              <th className="px-6 py-4 text-right">Valor Parcela</th>
              <th className="px-6 py-4">Vencimento</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {titulos.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-5 font-bold text-slate-700">{t.descricao}</td>
                <td className="px-6 py-5 text-slate-500 text-[10px] font-bold uppercase">{t.tipo}</td>
                <td className="px-6 py-5 text-center text-slate-500 font-mono text-xs">{t.numero_nf || '-'}</td>
                <td className="px-6 py-5 text-right">
                  <div className="font-bold text-slate-700">R$ {t.valor.toFixed(2)}</div>
                  {t.valor_extra > 0 && <div className="text-[10px] font-black text-red-500">+ R$ {t.valor_extra.toFixed(2)} atraso</div>}
                </td>
                <td className="px-6 py-5 text-slate-500 text-sm">{t.data_vencimento ? t.data_vencimento.split('-').reverse().join('/') : '-'}</td>
                <td className="px-6 py-5 text-center">
                  <button onClick={() => handleStatusChange(t)} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                    t.status === 'pendente' ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 
                    t.status === 'abatido' ? 'bg-green-100 text-green-600 hover:bg-green-200' : 
                    'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}>
                    {t.status}
                  </button>
                </td>
                <td className="px-6 py-5 text-right">
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><TrashIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createPortal(<>
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Novo Título a Pagar</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleAddTitulo} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Tipo de Título</Label>
                  <select 
                    value={tipoTitulo} 
                    onChange={(e) => setTipoTitulo(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-blue-500 outline-none"
                  >
                    <option value="Pagamento de fornecedor">Pagamento de fornecedor</option>
                    <option value="Folha de pagamento">Folha de pagamento</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <Label>Descrição</Label>
                  <Input required type="text" value={novoTitulo.descricao} onChange={(e) => setNovoTitulo({...novoTitulo, descricao: e.target.value})} placeholder="Ex: Compra de combustível" />
                </div>

                <div className="md:col-span-2">
                  <Label>Número da NF</Label>
                  <Input type="text" value={novoTitulo.numero_nf} onChange={(e) => setNovoTitulo({...novoTitulo, numero_nf: e.target.value})} placeholder="Ex: 001.234" />
                </div>

                {renderCamposCondicionais()}

              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 uppercase tracking-widest text-xs mt-4 transition-all shadow-lg shadow-blue-200">
                Guardar Registro
              </button>
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

export default Titulos;