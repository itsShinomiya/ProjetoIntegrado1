import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const Pendencias = () => {
  const [sociosFinanceiro, setSociosFinanceiro] = useState([]);
  const [erroRemessa, setErroRemessa] = useState(''); 
  const [erroCarregamento, setErroCarregamento] = useState(''); 

  const fetchPendencias = async () => {
    try {
      setErroCarregamento('');
      const res = await fetch(`${API_URL}/clientes`);
      const data = await res.json();
      
      if (res.ok && Array.isArray(data)) {
        setSociosFinanceiro(data);
      } else {
        setErroCarregamento(data.error || 'A estrutura do banco falhou. Faça o reset dos volumes.');
        setSociosFinanceiro([]);
      }
    } catch (error) {
      console.error("Erro ao buscar pendências:", error);
      setErroCarregamento('Erro de conexão com o servidor da API.');
      setSociosFinanceiro([]);
    }
  };

  const handleDownloadCNAB = async () => {
    setErroRemessa(''); 

    try {
      const response = await fetch(`${API_URL}/financeiro/gerar-remessa`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 'Configurações bancárias incompletas. Acesse a aba de configurações e preencha os dados da conta.'
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'REMESSA_SICOOB.rem');
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar remessa:", error);
      setErroRemessa(error.message); 
    }
  };

  useEffect(() => { fetchPendencias(); }, []);

  // Usa o "totalDebito" (Tudo que foi faturado independente do vencimento)
  const sociosOrdenados = Array.isArray(sociosFinanceiro) ? [...sociosFinanceiro].sort((a, b) => {
    const devedorA = Math.max(0, (a.totalDebito || 0) - (a.saldoPago || 0));
    const devedorB = Math.max(0, (b.totalDebito || 0) - (b.saldoPago || 0));
    return devedorB - devedorA; 
  }) : [];

  // Calcula o global sobre TODA a dívida do sistema
  const totalGlobal = sociosOrdenados.reduce((acc, s) => acc + Math.max(0, (s.totalDebito || 0) - (s.saldoPago || 0)), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Financeiro de Clientes</h2>
          <p className="text-slate-500 text-sm">Filtrado pelo valor total em aberto (inclui faturamentos futuros e vencidos)</p>
          
          <div className="mt-4 flex flex-col items-start gap-2">
            <button 
              onClick={handleDownloadCNAB}
              className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-black px-4 py-2 rounded-lg transition-all shadow-md active:scale-95 uppercase tracking-widest"
            >
              Baixar Arquivo Remessa (CNAB 240)
            </button>
            
            {erroRemessa && (
              <div className="p-3 mt-1 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-bold animate-pulse">
                ⚠️ {erroRemessa}
              </div>
            )}

            {erroCarregamento && (
              <div className="p-4 mt-2 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl text-xs font-bold">
                ⚠️ ALERTA DO SERVIDOR: {erroCarregamento}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Global A Receber</p>
          <p className="text-2xl font-black text-blue-600">R$ {totalGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Histórico Voos</th>
              <th className="px-6 py-4">Cobranças Emitidas (Total)</th>
              <th className="px-6 py-4 text-green-600">Total Pago</th>
              <th className="px-6 py-4 text-red-600">Saldo Devedor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sociosOrdenados.length === 0 && !erroCarregamento && (
                <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-400 font-bold">Nenhum cliente encontrado.</td>
                </tr>
            )}
            {sociosOrdenados.map((socio) => {
              // Subtrai o pago do total faturado geral
              const saldoDevedorFinal = Math.max(0, (socio.totalDebito || 0) - (socio.saldoPago || 0));
              
              return (
                <tr key={socio.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{socio.nome || 'Sem Nome'}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">
                        ID: #{socio.id ? socio.id.toString().padStart(4, '0') : '0000'} | {socio.perfil || 'Sem Perfil'}
                    </p>
                  </td>
                  <td className="px-6 py-5 font-medium text-slate-500">R$ {(socio.voos_debito || 0).toFixed(2)}</td>
                  <td className="px-6 py-5 font-medium text-slate-500">R$ {(socio.debito_servicos || 0).toFixed(2)}</td>
                  <td className="px-6 py-5 font-bold text-green-600">R$ {(socio.saldoPago || 0).toFixed(2)}</td>
                  <td className="px-6 py-5">
                    <div className={`px-4 py-2 rounded-lg inline-block font-mono font-bold text-sm shadow-sm ${saldoDevedorFinal > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-900 text-white'}`}>
                      R$ {saldoDevedorFinal.toFixed(2)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Pendencias;