import React, { useState, useEffect } from 'react';

const HomeDashboard = () => {
  const [metricas, setMetricas] = useState({
    total_clientes: 0,
    voos_semana: 0,
    total_receber: 0,
    total_pagar: 0,
    ultimos_voos: [],
    alertas_financeiros: []
  });
  const [loading, setLoading] = useState(true);

  const fetchMetricas = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/dashboard-resumo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMetricas(await res.json());
      }
    } catch (error) {
      console.error("Erro ao buscar métricas do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricas();
    const handleVisibility = () => { if (!document.hidden) fetchMetricas(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 font-bold tracking-widest uppercase animate-pulse">A carregar o painel...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Visão Geral</h2>
        <p className="text-slate-500 text-sm">Resumo operacional e financeiro do aeroclube</p>
      </div>

      {/* CARTÕES DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-blue-500 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-blue-50 rounded-full"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total de Clientes</p>
          <p className="text-4xl font-black text-slate-800 relative z-10">{metricas.total_clientes}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-purple-500 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-purple-50 rounded-full"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Voos (Últimos 7 dias)</p>
          <p className="text-4xl font-black text-slate-800 relative z-10">{metricas.voos_semana}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-green-500 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-green-50 rounded-full"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total a Receber</p>
          <p className="text-3xl font-black text-green-600 relative z-10">
            R$ {metricas.total_receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-red-500 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-red-50 rounded-full"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total a Pagar</p>
          <p className="text-3xl font-black text-red-600 relative z-10">
            R$ {metricas.total_pagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* LISTAS E ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* PAINEL ESQUERDO: Últimos Voos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Últimas Operações</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Os 5 voos mais recentes</p>
          </div>
          <div className="p-0 flex-1">
            {metricas.ultimos_voos && metricas.ultimos_voos.length > 0 ? (
              <ul className="divide-y divide-slate-50">
                {metricas.ultimos_voos.map((voo, index) => (
                  <li key={index} className="p-4 hover:bg-slate-50/50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-700">{voo.aluno}</p>
                      <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">{voo.aeronave} • {voo.data}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-500">R$ {voo.custo.toFixed(2)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm font-bold">Nenhum voo registado ainda.</div>
            )}
          </div>
        </div>

        {/* PAINEL DIREITO: Alertas Financeiros */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Atenção ao Caixa</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atrasos e próximos 7 dias</p>
          </div>
          <div className="p-0 flex-1">
            {metricas.alertas_financeiros && metricas.alertas_financeiros.length > 0 ? (
              <ul className="divide-y divide-slate-50">
                {metricas.alertas_financeiros.map((alerta, index) => (
                  <li key={index} className="p-4 hover:bg-slate-50/50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-700">{alerta.cliente}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{alerta.descricao}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-sm font-black text-slate-800">R$ {alerta.valor_pendente.toFixed(2)}</p>
                      <span className={`mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${alerta.atrasado ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {alerta.atrasado ? `Atrasado: ${alerta.vencimento}` : `Vence a: ${alerta.vencimento}`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-green-500 text-sm font-bold">Excelente! Nenhuma fatura crítica ou atrasada.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomeDashboard;