import React, { useState, useEffect } from 'react';

const PortalCliente = () => {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    const fetchMeuPerfil = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/meu-perfil', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setDados(await res.json());
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };
    fetchMeuPerfil();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  if (!dados) return <div className="p-10 text-center font-bold">Carregando seus dados...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Olá, {dados.nome}</h1>
            <p className="text-sm font-bold text-blue-500 uppercase">Perfil: {dados.perfil}</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition-all">Sair</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-100">
            <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Seu Saldo Atual</h3>
            <p className="text-4xl font-black text-blue-700">R$ {dados.saldoPago.toFixed(2)}</p>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-100">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Suas Próximas Cobranças</h3>
             {dados.cobrancas.filter(c => c.status !== 'Abatido').map((cob, i) => (
               <div key={i} className="flex justify-between text-sm font-bold border-b border-slate-200 py-2">
                 <span className="text-slate-600">{cob.descricao}</span>
                 <span className={cob.status === 'Atrasado' ? 'text-red-500' : 'text-slate-800'}>R$ {cob.valor.toFixed(2)}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalCliente;