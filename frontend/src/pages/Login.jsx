import React, { useState } from 'react';
import logoAeroclube from '../logo_aeroclube.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para a Recuperação de Senha
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recuperarUser, setRecuperarUser] = useState('');
  const [recuperarMsg, setRecuperarMsg] = useState({ type: '', text: '' });
  const [recuperarLoading, setRecuperarLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Limpa a máscara do CPF se o usuário digitar com pontos e traços
    const cleanUsername = username.replace(/[.-]/g, '');

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role);
        window.location.href = '/dashboard';
      } else {
        setError(data.msg || 'Credenciais inválidas');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    setRecuperarLoading(true);
    setRecuperarMsg({ type: '', text: '' });

    const cleanUsername = recuperarUser.replace(/[.-]/g, '');

    try {
      const res = await fetch('http://localhost:5000/api/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setRecuperarMsg({ type: 'success', text: data.msg });
        setTimeout(() => setIsModalOpen(false), 4000); // Fecha o modal após 4 segundos
      } else {
        setRecuperarMsg({ type: 'error', text: data.error });
      }
    } catch (err) {
      setRecuperarMsg({ type: 'error', text: 'Falha ao conectar com o servidor de e-mail.' });
    } finally {
      setRecuperarLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-[0_0_40px_rgba(37,99,235,0.15)] p-10 relative overflow-hidden">
        
        {/* Detalhe visual de fundo */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-blue-50"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-purple-50"></div>

        <div className="text-center mb-10 relative z-10">
          <img src={logoAeroclube} alt="Aeroclube de Rio Claro" className="w-52 mx-auto mb-2 object-contain" />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center mb-6 border border-red-100 flex items-center justify-center gap-2 relative z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-widest">Acesso de Usuário</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-700"
                placeholder="Seu CPF ou Login..."
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-widest">Senha de Segurança</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-700"
                placeholder="••••••••"
              />
            </div>
            <div className="text-right mt-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(true)}
                className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
              >
                Esqueceu a senha?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-[0_8px_20px_rgba(37,99,235,0.25)] active:scale-95 uppercase tracking-widest text-xs mt-4 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA'}
          </button>
        </form>
      </div>

      {/* MODAL DE RECUPERAÇÃO DE SENHA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden transform transition-all">
            
            <div className="p-8 pb-6 text-center relative">
              <button onClick={() => { setIsModalOpen(false); setRecuperarMsg({type:'', text:''}); }} className="absolute top-6 right-6 h-8 w-8 text-slate-300 hover:text-red-500 bg-slate-50 rounded-full flex items-center justify-center transition-colors">✕</button>
              
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Recuperar Acesso</h3>
              <p className="text-xs text-slate-500 font-medium">
                Digite o seu CPF (cliente) ou Login (funcionário). Enviaremos uma senha temporária para o seu e-mail cadastrado.
              </p>
            </div>
            
            <form onSubmit={handleRecuperarSenha} className="p-8 pt-0 space-y-4">
              
              {recuperarMsg.text && (
                <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${recuperarMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                  {recuperarMsg.type === 'error' 
                    ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  }
                  {recuperarMsg.text}
                </div>
              )}

              <div>
                <input 
                  required 
                  type="text" 
                  value={recuperarUser} 
                  onChange={(e) => setRecuperarUser(e.target.value)} 
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 text-center placeholder:font-medium placeholder:text-slate-400" 
                  placeholder="Seu CPF ou Login..."
                />
              </div>
              
              <button 
                type="submit" 
                disabled={recuperarLoading}
                className="w-full bg-slate-800 text-white font-black py-4 rounded-xl hover:bg-slate-900 uppercase tracking-widest text-xs mt-2 disabled:opacity-50 transition-all shadow-md active:scale-95"
              >
                {recuperarLoading ? 'ENVIANDO...' : 'ENVIAR SENHA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;