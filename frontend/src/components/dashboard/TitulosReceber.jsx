import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const statusStyle = (status) => {
  if (status === 'Pendente') return 'bg-orange-100 text-orange-600';
  if (status === 'Parcialmente Abatido') return 'bg-blue-100 text-blue-600';
  if (status === 'Abatido') return 'bg-green-100 text-green-600';
  return 'bg-red-100 text-red-600';
};

const TitulosReceber = () => {
  const [cobrancas, setCobrancas] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isAdiando, setIsAdiando] = useState(false);
  const [openClientes, setOpenClientes] = useState({});
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  // Seleção de títulos via checkbox. Usamos um Set de IDs que NUNCA é
  // limpo automaticamente ao buscar/filtrar — só muda por ação explícita do usuário.
  const [selecionados, setSelecionados] = useState(new Set());

  const fetchCobrancas = async () => {
    try {
      const res = await fetch(`${API_URL}/titulos-receber`);
      if (res.ok) setCobrancas(await res.json());
    } catch (error) { console.error("Erro ao buscar cobranças:", error); }
  };

  useEffect(() => { fetchCobrancas(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente apagar este registro de cobrança do cliente?")) {
      try {
        await fetch(`${API_URL}/titulos-receber/${id}`, { method: 'DELETE' });
        setSelecionados(prev => {
          const novo = new Set(prev);
          novo.delete(id);
          return novo;
        });
        fetchCobrancas();
      } catch (error) { alert("Erro ao apagar título."); }
    }
  };

  // A exportação só roda quando o botão é clicado (filtros não disparam exportação automática).
  // Envia exatamente os IDs marcados nas checkboxes, independente do que está
  // visível na tela no momento do clique — a seleção sobrevive a buscas e filtros.
  const handleExportarExcel = async () => {
    if (selecionados.size === 0) {
      alert("Selecione ao menos um título (checkbox) para exportar.");
      return;
    }
    setIsExporting(true);
    try {
      const res = await fetch(`${API_URL}/relatorios/titulos-receber/excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selecionados) })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao exportar.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Relatorio_Financeiro.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Erro ao exportar o relatório para Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdiarSelecionados = async (deslocamento) => {
    if (selecionados.size === 0) {
      alert("Selecione ao menos um título (checkbox) para adiar.");
      return;
    }
    const rotulo = deslocamento === 1 ? 'o próximo fechamento' : 'daqui dois fechamentos';
    if (!window.confirm(`Adiar ${selecionados.size} título(s) selecionado(s) para ${rotulo}? Títulos de clientes sem dia de fechamento configurado serão ignorados.`)) return;

    setIsAdiando(true);
    try {
      const res = await fetch(`${API_URL}/titulos-receber/adiar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selecionados), deslocamento })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.msg);
        fetchCobrancas();
      } else {
        alert(`Erro ao adiar: ${data.error}`);
      }
    } catch {
      alert("Erro de conexão ao adiar títulos.");
    } finally {
      setIsAdiando(false);
    }
  };

  const toggleCliente = (cliente) => {
    setOpenClientes(prev => ({ ...prev, [cliente]: !prev[cliente] }));
  };

  const toggleSelecionado = (id) => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  };

  // Processar e agrupar por cliente
  const cobrancasProcessadas = [...cobrancas].map(c => {
    let desc = c.descricao;
    if (c.cliente) {
      desc = desc.replace(`(${c.cliente})`, '').replace(c.cliente, '').replace('  ', ' ').trim();
      if (desc.startsWith('-')) desc = desc.substring(1).trim();
    }
    return { ...c, descricaoLimpa: desc };
  }).sort((a, b) => {
    const dateA = new Date(a.data_vencimento);
    const dateB = new Date(b.data_vencimento);
    if (dateA.getTime() === dateB.getTime()) return a.id - b.id;
    return dateA - dateB;
  });

  const STATUS_OPCOES = ['Todos', 'Pendente', 'Atrasado', 'Abatido', 'Parcialmente Abatido'];

  // Os filtros (busca/status) só decidem o que aparece na tela. A seleção de
  // checkboxes não é afetada por eles: nada é deselecionado ao buscar/filtrar.
  const cobrancasFiltradas = cobrancasProcessadas.filter(c => {
    const termoBusca = busca.toLowerCase();
    const matchBusca = !busca ||
      (c.cliente || '').toLowerCase().includes(termoBusca) ||
      (c.descricaoLimpa || '').toLowerCase().includes(termoBusca);
    const matchStatus = filtroStatus === 'Todos' || c.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const agrupado = cobrancasFiltradas.reduce((acc, c) => {
    const key = c.cliente || 'Sem Cliente';
    if (!acc[key]) acc[key] = { perfil: c.perfil, itens: [] };
    acc[key].itens.push(c);
    return acc;
  }, {});

  const clientes = Object.entries(agrupado);

  const totalGeral = cobrancasProcessadas.reduce((s, c) => s + (c.valor || 0), 0);
  const totalPendente = cobrancasProcessadas.filter(c => c.status === 'Pendente' || c.status === 'Atrasado').reduce((s, c) => s + (c.valor || 0), 0);

  // "Selecionar todos os títulos visíveis (respeitando os filtros aplicados)".
  // Considera marcado se todo o conjunto filtrado já está selecionado.
  const idsVisiveis = cobrancasFiltradas.map(c => c.id);
  const todosVisiveisSelecionados = idsVisiveis.length > 0 && idsVisiveis.every(id => selecionados.has(id));
  const algumVisivelSelecionado = idsVisiveis.some(id => selecionados.has(id));

  const toggleSelecionarTodosVisiveis = () => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (todosVisiveisSelecionados) {
        idsVisiveis.forEach(id => novo.delete(id));
      } else {
        idsVisiveis.forEach(id => novo.add(id));
      }
      return novo;
    });
  };

  const toggleSelecionarTodosDoCliente = (itensCliente) => {
    const idsCliente = itensCliente.map(c => c.id);
    const todosSelecionados = idsCliente.every(id => selecionados.has(id));
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (todosSelecionados) {
        idsCliente.forEach(id => novo.delete(id));
      } else {
        idsCliente.forEach(id => novo.add(id));
      }
      return novo;
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Títulos a Receber</h2>
          <p className="text-slate-500 text-sm">Histórico de cobranças e faturamentos de clientes gerados pelo sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}
          </span>
          <div className="relative group">
            <button
              disabled={isAdiando || selecionados.size === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
              {isAdiando ? 'ADIANDO...' : 'ADIAR PARA FECHAMENTO'}
            </button>
            <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
              <button onClick={() => handleAdiarSelecionados(1)} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-indigo-50 border-b border-slate-100">
                Próximo fechamento
              </button>
              <button onClick={() => handleAdiarSelecionados(2)} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-indigo-50">
                Daqui 2 fechamentos
              </button>
            </div>
          </div>
          <button
            onClick={handleExportarExcel}
            disabled={isExporting || selecionados.size === 0}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {isExporting ? 'A GERAR EXCEL...' : 'EXPORTAR SELECIONADOS (.XLSX)'}
          </button>
        </div>
      </div>

      {/* TOTAIS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Geral</p>
          <p className="text-2xl font-black text-slate-800">R$ {totalGeral.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">A Receber</p>
          <p className="text-2xl font-black text-orange-500">R$ {totalPendente.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Clientes</p>
          <p className="text-2xl font-black text-blue-600">{clientes.length}</p>
        </div>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none">
          <input
            type="checkbox"
            checked={todosVisiveisSelecionados}
            ref={el => { if (el) el.indeterminate = !todosVisiveisSelecionados && algumVisivelSelecionado; }}
            onChange={toggleSelecionarTodosVisiveis}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">Marcar visíveis</span>
        </label>
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Pesquisar por cliente ou descrição..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPCOES.map(s => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                filtroStatus === s
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ACCORDION POR CLIENTE */}
      <div className="space-y-3">
        {clientes.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400 font-bold">
            {busca || filtroStatus !== 'Todos' ? 'Nenhum resultado encontrado para os filtros aplicados.' : 'Nenhuma cobrança registrada ainda.'}
          </div>
        )}

        {clientes.map(([nome, { perfil, itens }]) => {
          const isOpen = openClientes[nome] ?? false;
          const totalCliente = itens.reduce((s, c) => s + (c.valor || 0), 0);
          const atrasados = itens.filter(c => c.status === 'Atrasado').length;
          const pendentes = itens.filter(c => c.status === 'Pendente').length;
          const abatidos = itens.filter(c => c.status === 'Abatido' || c.status === 'Parcialmente Abatido').length;
          const idsCliente = itens.map(c => c.id);
          const todosClienteSelecionados = idsCliente.every(id => selecionados.has(id));
          const algumClienteSelecionado = idsCliente.some(id => selecionados.has(id));

          return (
            <div key={nome} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* CABEÇALHO DO ACCORDION */}
              <div className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={todosClienteSelecionados}
                    ref={el => { if (el) el.indeterminate = !todosClienteSelecionados && algumClienteSelecionado; }}
                    onChange={(e) => { e.stopPropagation(); toggleSelecionarTodosDoCliente(itens); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-blue-600 rounded shrink-0"
                    title="Selecionar todos os títulos deste cliente"
                  />
                  <button onClick={() => toggleCliente(nome)} className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-600 text-sm shrink-0">
                      {nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800">{nome}</p>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{perfil}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 ml-2">
                    {atrasados > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600 uppercase">
                        {atrasados} atrasado{atrasados > 1 ? 's' : ''}
                      </span>
                    )}
                    {pendentes > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-600 uppercase">
                        {pendentes} pendente{pendentes > 1 ? 's' : ''}
                      </span>
                    )}
                    {abatidos > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-600 uppercase">
                        {abatidos} pago{abatidos > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => toggleCliente(nome)} className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total</p>
                    <p className="font-black text-slate-800">R$ {totalCliente.toFixed(2)}</p>
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{itens.length} título{itens.length > 1 ? 's' : ''}</p>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* TABELA DO CLIENTE */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
                        <th className="px-6 py-3 w-10"></th>
                        <th className="px-6 py-3">Descrição</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                        <th className="px-6 py-3">Vencimento</th>
                        <th className="px-6 py-3">Fechamento</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {itens.map((c) => (
                        <tr key={c.id} className={`hover:bg-slate-50/50 ${selecionados.has(c.id) ? 'bg-blue-50/40' : ''}`}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selecionados.has(c.id)}
                              onChange={() => toggleSelecionado(c.id)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700">{c.descricaoLimpa}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-bold text-slate-700">R$ {c.valor.toFixed(2)}</div>
                            {c.status === 'Parcialmente Abatido' && (
                              <div className="text-[10px] font-black text-green-600 mt-0.5 uppercase tracking-wider">
                                Pago: R$ {c.valor_pago ? c.valor_pago.toFixed(2) : '0.00'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {c.data_vencimento ? c.data_vencimento.split('-').reverse().join('/') : '-'}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {c.data_fechamento ? c.data_fechamento.split('-').reverse().join('/') : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusStyle(c.status)}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TitulosReceber;
