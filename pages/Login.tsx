
import React, { useState, useEffect } from 'react';
import { getDB, saveDB } from '../dbService';
import { User, UserRole } from '../types';
import { ICONS } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CHEFE);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isShattered, setIsShattered] = useState(false);

  // Estados para verificação de Admin
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');

  // Carregar credenciais salvas ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem('rs_eventos_remember');
    if (saved) {
      try {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      } catch (e) {
        console.error("Erro ao carregar credenciais salvas");
      }
    }
  }, []);

  const triggerShatter = (msg: string) => {
    setIsShattered(true);
    setError(msg);
    setTimeout(() => {
      setIsShattered(false);
    }, 1000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      triggerShatter('Preencha todos os campos para entrar.');
      return;
    }

    const db = getDB();
    const formattedEmail = email.trim().toLowerCase();
    
    const user = db.users.find(u => 
      u.email.trim().toLowerCase() === formattedEmail && 
      u.senha === password
    );
    
    if (user) {
      if (rememberMe) {
        localStorage.setItem('rs_eventos_remember', JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem('rs_eventos_remember');
      }
      onLogin(user);
    } else {
      triggerShatter('E-mail ou senha incorretos.');
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      triggerShatter('Preencha todos os dados cadastrais.');
      return;
    }

    const db = getDB();
    const formattedEmail = email.trim().toLowerCase();
    
    if (db.users.some(u => u.email.toLowerCase() === formattedEmail)) {
      triggerShatter('Este e-mail já está em uso.');
      return;
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      nome: name,
      email: formattedEmail,
      tipo: role,
      senha: password,
      data_criacao: new Date().toISOString()
    };

    const newDb = { ...db, users: [...db.users, newUser] };
    saveDB(newDb);
    
    if (rememberMe) {
      localStorage.setItem('rs_eventos_remember', JSON.stringify({ email, password }));
    }
    
    onLogin(newUser);
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !newPassword.trim()) {
      triggerShatter('Informe o e-mail e a nova senha.');
      return;
    }

    const db = getDB();
    const formattedEmail = email.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === formattedEmail);

    if (user) {
      if (newPassword.length < 3) {
        triggerShatter('A nova senha deve ter pelo menos 3 caracteres.');
        return;
      }
      user.senha = newPassword;
      saveDB(db);
      setSuccess('Senha redefinida com sucesso! Redirecionando...');
      setTimeout(() => setView('login'), 2000);
    } else {
      triggerShatter('E-mail não encontrado no sistema.');
    }
  };

  const verifyAdminPassword = () => {
    if (adminPassInput === '1029') {
      setRole(UserRole.ADMIN);
      setShowAdminAuthModal(false);
      setAdminPassInput('');
      setAdminAuthError('');
    } else {
      setAdminAuthError('Senha incorreta! Acesso negado.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 py-10 overflow-hidden relative">
      {/* Elementos do fundo animado */}
      <div className="animated-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500 z-10">
        <div className="text-center">
          <div className={`shatter-container ${isShattered ? 'shatter-active' : ''}`}>
            <div className="logo-box inline-block p-6 rounded-[2.5rem] bg-zinc-900/60 backdrop-blur-xl border border-emerald-500/30 mb-4 shadow-2xl transition-all duration-300 relative overflow-hidden h-32 w-32 flex items-center justify-center">
               <h1 className="shatter-part shatter-top absolute text-5xl font-black text-emerald-500 tracking-tighter">RS</h1>
               <h1 className="shatter-part shatter-bottom absolute text-5xl font-black text-emerald-500 tracking-tighter">RS</h1>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest">RS Eventos</h2>
          <p className="text-zinc-500 text-[10px] font-black mt-1 uppercase tracking-[0.2em]">Gestão de Escalas e Equipes</p>
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 flex">
          <button onClick={() => { setView('login'); setError(''); setSuccess(''); }} className={`flex-1 py-4 font-black rounded-xl text-[10px] uppercase transition-all ${view === 'login' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500'}`}>Entrar</button>
          <button onClick={() => { setView('signup'); setError(''); setSuccess(''); }} className={`flex-1 py-4 font-black rounded-xl text-[10px] uppercase transition-all ${view === 'signup' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500'}`}>Cadastrar</button>
        </div>

        <form onSubmit={view === 'login' ? handleLogin : (view === 'signup' ? handleSignup : handleRecovery)} className="space-y-4">
          {view === 'signup' && (
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu Nome Completo" className="w-full h-16 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-5 text-white focus:border-emerald-500 outline-none transition-all" />
          )}
          
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full h-16 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-5 text-white focus:border-emerald-500 outline-none transition-all" />
          
          {view !== 'forgot' && (
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full h-16 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-5 text-white focus:border-emerald-500 outline-none transition-all" />
          )}

          {view === 'forgot' && (
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Definir Nova Senha" className="w-full h-16 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-5 text-white focus:border-emerald-500 outline-none transition-all" />
          )}

          {view !== 'forgot' && (
            <div className="flex items-center gap-3 px-1 py-2">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 bg-zinc-800 border-zinc-700 rounded"
              />
              <label htmlFor="remember" className="text-xs text-zinc-400 font-bold uppercase tracking-widest cursor-pointer select-none">Manter conectado</label>
            </div>
          )}
          
          {view === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole(UserRole.CHEFE)} className={`h-14 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${role === UserRole.CHEFE ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-zinc-800 text-zinc-600'}`}>Chefe</button>
              <button type="button" onClick={() => { setShowAdminAuthModal(true); setAdminAuthError(''); }} className={`h-14 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${role === UserRole.ADMIN ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-zinc-800 text-zinc-600'}`}>Admin</button>
            </div>
          )}

          {error && <p className="text-red-500 text-[10px] font-black text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20 uppercase tracking-tighter animate-in slide-in-from-top-2">{error}</p>}
          {success && <p className="text-emerald-500 text-[10px] font-black text-center bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20 uppercase tracking-tighter">{success}</p>}
          
          <button type="submit" className="w-full h-20 bg-emerald-500 text-zinc-950 font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest mt-4">
            {view === 'login' ? 'ACESSAR' : (view === 'signup' ? 'CONFIRMAR' : 'REDEFINIR SENHA')}
          </button>

          {view === 'login' && (
            <button type="button" onClick={() => setView('forgot')} className="w-full text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2 hover:text-emerald-500 transition-colors">Esqueceu a senha?</button>
          )}

          {view === 'forgot' && (
            <button type="button" onClick={() => setView('login')} className="w-full text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-2">Voltar ao Início</button>
          )}
        </form>
      </div>

      {/* MODAL DE VERIFICAÇÃO DE ADMIN */}
      {showAdminAuthModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-zinc-900 border border-emerald-500/30 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
            
            <button 
              onClick={() => { setShowAdminAuthModal(false); setRole(UserRole.CHEFE); }}
              className="absolute top-6 right-6 text-zinc-500 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto border-2 border-emerald-500/20 shadow-xl">
                 {ICONS.Key}
              </div>
              
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Acesso Restrito</h3>
                <p className="text-zinc-500 text-[10px] font-bold mt-2 uppercase tracking-widest leading-relaxed">Insira a senha padrão de Administrador para prosseguir</p>
              </div>

              <div className="space-y-4">
                <input 
                  type="password" 
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  placeholder="Senha Admin"
                  className="w-full h-14 bg-zinc-800 border border-zinc-700 rounded-xl px-5 text-center text-white text-xl font-black focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
                {adminAuthError && (
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-tight bg-red-500/10 py-2 rounded-lg">{adminAuthError}</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={verifyAdminPassword}
                  className="w-full h-16 bg-emerald-500 text-zinc-950 font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest"
                >
                  VERIFICAR ACESSO
                </button>
                <button 
                  onClick={() => { setShowAdminAuthModal(false); setRole(UserRole.CHEFE); }} 
                  className="w-full h-12 text-zinc-600 font-black uppercase text-[10px] tracking-widest"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
