import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PiSquaresFour } from "react-icons/pi";
import { TbUsers } from "react-icons/tb";
import { LuPlaneTakeoff } from "react-icons/lu";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { FaRegMoneyBill1 } from "react-icons/fa6";
import { MdOutlineReceiptLong, MdOutlineAdminPanelSettings } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { CiBank } from "react-icons/ci";

// Importação das páginas e componentes
import logoAeroclube from './logo_aeroclube.png';
import Login from './pages/Login';
import Clientes from './components/dashboard/Clientes';
import Voos from './components/dashboard/Voos';
import Pendencias from './components/dashboard/Pendencias';
import AdminPanel from './components/dashboard/AdminPanel';
import ConfigBanco from './components/dashboard/ConfigBanco';
import TitulosReceber from './components/dashboard/TitulosReceber';
import Titulos from './components/dashboard/Titulos';
import PortalCliente from './components/dashboard/PortalCliente';
import HomeDashboard from './components/dashboard/HomeDashboard';

// --- COMPONENTE DE PROTEÇÃO DE ROTA ---
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

// --- ITENS DO MENU (reutilizado na sidebar desktop e no drawer mobile) ---
const NavItems = ({ activeTab, setActiveTab, userRole, onNavigate, onOpenPassword, onLogout }) => {
  const [configOpen, setConfigOpen] = useState(false);

  const mainItems = [
    { key: 'home', label: 'Visão Geral', icon: <PiSquaresFour size={18} /> },
    { key: 'clientes', label: 'Clientes', icon: <TbUsers size={18} /> },
    { key: 'voos', label: 'Voos', icon: <LuPlaneTakeoff size={18} /> },
    { key: 'pendencias', label: 'Pendências', icon: <HiOutlineClipboardDocumentList size={18} /> },
    { key: 'titulos_receber', label: 'Títulos a Receber', icon: <FaRegMoneyBill1 size={18} /> },
    { key: 'titulos', label: 'Títulos a Pagar', icon: <MdOutlineReceiptLong size={18} /> },
  ];

  const isConfigActive =
    activeTab === 'admin_panel' || activeTab === 'config_banco';

  return (
    <nav className="flex-1 space-y-1">
      {mainItems.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => { setActiveTab(key); onNavigate && onNavigate(); }}
          className={`w-full text-left p-4 rounded-xl font-bold transition-all flex items-center gap-3 ${
            activeTab === key
              ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span className="shrink-0">{icon}</span>
          {label}
        </button>
      ))}

      {/* MENU CONFIGURAÇÕES */}
      <div>
        <button
          onClick={() => setConfigOpen(prev => !prev)}
          className={`w-full text-left p-4 rounded-xl font-bold transition-all flex items-center gap-3 ${
            isConfigActive
              ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span className="shrink-0"><IoSettingsOutline size={18} /></span>
          <span className="flex-1">Configurações</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform duration-200 ${configOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {configOpen && (
          <div className="mt-1 ml-4 space-y-1 border-l-2 border-slate-700 pl-3">
            {userRole === 'admin' && (
              <>
                <button
                  onClick={() => { setActiveTab('admin_panel'); onNavigate && onNavigate(); }}
                  className={`w-full text-left px-3 py-3 rounded-xl font-bold transition-all flex items-center gap-3 text-sm ${
                    activeTab === 'admin_panel'
                      ? 'bg-purple-600 text-white'
                      : 'text-purple-400 hover:bg-purple-900/20 hover:text-purple-300'
                  }`}
                >
                  <span className="shrink-0"><MdOutlineAdminPanelSettings size={16} /></span>
                  Configurações Admin
                </button>
                <button
                  onClick={() => { setActiveTab('config_banco'); onNavigate && onNavigate(); }}
                  className={`w-full text-left px-3 py-3 rounded-xl font-bold transition-all flex items-center gap-3 text-sm ${
                    activeTab === 'config_banco'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-400 hover:bg-blue-900/20 hover:text-blue-300'
                  }`}
                >
                  <span className="shrink-0"><CiBank size={16} /></span>
                  Configurações Bancárias
                </button>
              </>
            )}

            {/* Alterar Senha */}
            <button
              onClick={() => { onOpenPassword && onOpenPassword(); onNavigate && onNavigate(); }}
              className="w-full text-left px-3 py-3 rounded-xl font-bold transition-all flex items-center gap-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <span className="shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </span>
              Alterar Senha
            </button>

            {/* Sair do Sistema */}
            <button
              onClick={onLogout}
              className="w-full text-left px-3 py-3 rounded-xl font-bold transition-all flex items-center gap-3 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300"
            >
              <span className="shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
              Sair do Sistema
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userRole = localStorage.getItem('role');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/minha-senha', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nova_senha: novaSenha })
      });

      if (res.ok) {
        alert("Senha atualizada com sucesso! Use-a no seu próximo login.");
        setShowPasswordModal(false);
        setNovaSenha('');
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao alterar a senha.");
      }
    } catch (error) {
      alert("Erro de conexão ao tentar alterar a senha.");
    }
  };

  const SidebarContent = ({ onNavigate }) => (
    <>
      <div className="mb-8 flex items-center justify-center">
        <img src={logoAeroclube} alt="Aeroclube de Rio Claro" className="w-52 object-contain" />
      </div>

      <NavItems
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        onNavigate={onNavigate}
        onOpenPassword={() => setShowPasswordModal(true)}
        onLogout={handleLogout}
      />
    </>
  );

  return (
    <>
      {/* Layout principal: sidebar + conteúdo */}
      <div className="min-h-screen bg-slate-50 flex">

        {/* ── SIDEBAR DESKTOP (md+) ── */}
        <div className="hidden md:flex w-64 shrink-0 bg-slate-900 text-white p-6 flex-col h-screen sticky top-0 overflow-y-auto scrollbar-none" style={{scrollbarWidth:'none'}}>
          <SidebarContent />
        </div>

        {/* ── ÁREA PRINCIPAL ── */}
        <div className="flex-1 flex flex-col">

          {/* Topbar mobile */}
          <header className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-40">
            <img src={logoAeroclube} alt="Aeroclube de Rio Claro" className="h-8 object-contain" />
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Abrir menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </header>

          {/* Conteúdo principal */}
          <main className="flex-1 p-4 md:p-8">
            {activeTab === 'home' && <HomeDashboard key={activeTab} />}
            {activeTab === 'clientes' && <Clientes />}
            {activeTab === 'voos' && <Voos />}
            {activeTab === 'pendencias' && <Pendencias />}
            {activeTab === 'titulos_receber' && <TitulosReceber />}
            {activeTab === 'titulos' && <Titulos />}
            {activeTab === 'admin_panel' && userRole === 'admin' && <AdminPanel />}
            {activeTab === 'config_banco' && userRole === 'admin' && <ConfigBanco />}
          </main>
        </div>
      </div>

      {/* ── DRAWER MOBILE ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-slate-900 text-white p-6 flex flex-col h-full overflow-y-auto">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors"
              aria-label="Fechar menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── MODAL DE ALTERAÇÃO DE SENHA ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Alterar Palavra-Passe</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl">×</button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-widest">Nova Senha</label>
                <input
                  required
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Introduza a sua nova senha"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                />
                <p className="text-[9px] text-slate-400 mt-2 ml-1">Para sua segurança, não partilhe esta senha com ninguém.</p>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 uppercase tracking-widest text-xs mt-2 transition-all shadow-lg shadow-blue-200">
                Confirmar Alteração
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// --- ESTRUTURA DE ROTAS PRINCIPAL ---
function App() {
  const userRole = localStorage.getItem('role');

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              {userRole === 'cliente' ? <PortalCliente /> : <Dashboard />}
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;