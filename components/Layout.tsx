
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ICONS, COLORS } from '../constants';
import { UserRole, UserStatus, Notificacao, User } from '../types';
import { getDB, saveDB } from '../dbService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole | undefined;
  userId: string | undefined;
  onLogout: () => void;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, userRole, userId, onLogout, title }) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [localDb, setLocalDb] = useState(getDB());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Estados de Notificação
  const [selectedNotifs, setSelectedNotifs] = useState<Set<string>>(new Set());
  const [showConfirmDeleteNotifs, setShowConfirmDeleteNotifs] = useState(false);
  
  // Estados de edição de perfil
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Busca dados do usuário atual do banco local
  const userData = useMemo(() => {
    return localDb.users.find(u => u.id === userId);
  }, [localDb.users, userId]);

  // Sincroniza campos de edição quando o perfil abre ou os dados mudam
  useEffect(() => {
    if (userData) {
      setEditEmail(userData.email);
      setEditPhone(userData.telefone || '');
    }
  }, [userData, showProfile]);

  const userInitial = useMemo(() => {
    return userData?.nome?.charAt(0).toUpperCase() || 'U';
  }, [userData]);

  // Gerenciamento de Tema
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('rs_eventos_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [showFabWarning, setShowFabWarning] = useState(false);
  const warningTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    localStorage.setItem('rs_eventos_theme', theme);
  }, [theme]);

  // Listeners para atualizações globais
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const dbUpdateHandler = () => setLocalDb(getDB());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('dbUpdated', dbUpdateHandler);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('dbUpdated', dbUpdateHandler);
    };
  }, []);

  const notifications = useMemo(() => {
    return localDb.notificacoes.filter(n => 
      (!n.para_usuario_id && n.tipo_role === UserRole.ADMIN && userRole === UserRole.ADMIN) || 
      (n.para_usuario_id === userId)
    ).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [localDb.notificacoes, userId, userRole]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.lida).length, [notifications]);

  const handleFabClick = useCallback(() => {
    if (userRole === UserRole.ADMIN) {
      setIsFabOpen(prev => !prev);
    } else {
      setShowFabWarning(true);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = window.setTimeout(() => setShowFabWarning(false), 3000);
    }
  }, [userRole]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const navigateAndClose = useCallback((tab: string) => {
    setActiveTab(tab);
    setIsFabOpen(false);
  }, [setActiveTab]);

  // Salva alterações de perfil no banco de dados
  const updateProfile = () => {
    const currentDb = getDB();
    const updatedUsers = currentDb.users.map(u => {
      if (u.id === userId) {
        return { ...u, email: editEmail, telefone: editPhone };
      }
      return u;
    });
    // Atualiza também o currentUser persistido para refletir em outras abas
    const updatedUser = updatedUsers.find(u => u.id === userId);
    saveDB({ ...currentDb, users: updatedUsers, currentUser: updatedUser || currentDb.currentUser });
    setIsEditing(false);
  };

  const updateStatus = (status: UserStatus) => {
    const currentDb = getDB();
    const updatedUsers = currentDb.users.map(u => {
      if (u.id === userId) return { ...u, status };
      return u;
    });
    const updatedUser = updatedUsers.find(u => u.id === userId);
    saveDB({ ...currentDb, users: updatedUsers, currentUser: updatedUser || currentDb.currentUser });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const currentDb = getDB();
        const updatedUsers = currentDb.users.map(u => {
          if (u.id === userId) return { ...u, foto: base64String };
          return u;
        });
        const updatedUser = updatedUsers.find(u => u.id === userId);
        saveDB({ ...currentDb, users: updatedUsers, currentUser: updatedUser || currentDb.currentUser });
      };
      reader.readAsDataURL(file);
    }
  };

  // Funções de Gerenciamento de Notificações
  const toggleSelectNotif = (id: string) => {
    const newSelected = new Set(selectedNotifs);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedNotifs(newSelected);
  };

  const selectAllNotifs = () => {
    if (selectedNotifs.size === notifications.length && notifications.length > 0) {
      setSelectedNotifs(new Set());
    } else {
      setSelectedNotifs(new Set(notifications.map(n => n.id)));
    }
  };

  const deleteSelectedNotifs = () => {
    const currentDb = getDB();
    const updatedNotifs = currentDb.notificacoes.filter(n => !selectedNotifs.has(n.id));
    saveDB({ ...currentDb, notificacoes: updatedNotifs });
    setSelectedNotifs(new Set());
    setShowConfirmDeleteNotifs(false);
  };

  const markSelectedAsRead = () => {
    const currentDb = getDB();
    const updatedNotifs = currentDb.notificacoes.map(n => 
      selectedNotifs.has(n.id) ? { ...n, lida: true } : n
    );
    saveDB({ ...currentDb, notificacoes: updatedNotifs });
    setSelectedNotifs(new Set());
  };

  const statusConfig = {
    [UserStatus.ONLINE]: { color: 'bg-emerald-500', label: 'Online' },
    [UserStatus.INACTIVE]: { color: 'bg-yellow-500', label: 'Inativo' },
    [UserStatus.OFFLINE]: { color: 'bg-zinc-500', label: 'Offline' },
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden relative">
      <header className="px-6 py-5 bg-zinc-900 border-b border-emerald-600/30 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowProfile(true)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg active:scale-90 transition-all border-2 border-emerald-400/30 relative"
          >
            {userData?.foto ? (
              <img src={userData.foto} className="w-full h-full object-cover" alt="Perfil" />
            ) : (
              <div className="w-full h-full bg-emerald-500 flex items-center justify-center text-zinc-950 font-black text-xl">
                {userInitial}
              </div>
            )}
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${statusConfig[userData?.status || UserStatus.OFFLINE].color}`}></div>
          </button>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-emerald-500 tracking-tight uppercase">RS EVENTOS</h1>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            </div>
            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{title}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className={`p-3 rounded-full active:scale-90 transition-all border ${theme === 'dark' ? 'bg-zinc-800 text-yellow-500 border-yellow-500/20' : 'bg-slate-100 text-slate-900 border-slate-300'}`}>
            {theme === 'dark' ? ICONS.Sun : ICONS.Moon}
          </button>
          {userRole === UserRole.ADMIN && (
            <button 
              onClick={() => { setShowNotifs(true); setSelectedNotifs(new Set()); }} 
              className="p-3 bg-zinc-800 rounded-full text-zinc-300 relative shadow-lg active:scale-95 transition-all"
            >
              {ICONS.Bell}
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-zinc-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900">{unreadCount}</span>}
            </button>
          )}
          <button onClick={onLogout} className="p-3 bg-zinc-800 rounded-full text-zinc-300">{ICONS.Logout}</button>
        </div>
      </header>

      {/* MODAL DE NOTIFICAÇÕES */}
      {showNotifs && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotifs(false)}></div>
          <div className="relative w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
             <header className="p-6 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                <div>
                   <h2 className="text-xl font-black text-white uppercase tracking-tighter">Central de Avisos</h2>
                   <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{notifications.length} notificações registradas</p>
                </div>
                <button onClick={() => setShowNotifs(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">✕</button>
             </header>

             <div className="p-4 flex gap-2 border-b border-zinc-800 bg-zinc-900/50">
                <button 
                  onClick={selectAllNotifs}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-black text-[9px] uppercase rounded-xl border border-zinc-700 active:scale-95 transition-all"
                >
                   {selectedNotifs.size === notifications.length && notifications.length > 0 ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                </button>
                {selectedNotifs.size > 0 && (
                   <>
                     <button 
                        onClick={markSelectedAsRead}
                        className="px-4 py-3 bg-emerald-500/10 text-emerald-500 font-black text-[9px] uppercase rounded-xl border border-emerald-500/20 active:scale-95 transition-all"
                     >
                        Lida
                     </button>
                     <button 
                        onClick={() => setShowConfirmDeleteNotifs(true)}
                        className="px-4 py-3 bg-red-500/10 text-red-500 font-black text-[9px] uppercase rounded-xl border border-red-500/20 active:scale-95 transition-all"
                     >
                        {ICONS.Trash}
                     </button>
                   </>
                )}
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {notifications.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                      <div className="p-6 bg-zinc-800 rounded-full">{ICONS.Bell}</div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma notificação</p>
                   </div>
                ) : (
                   notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={() => toggleSelectNotif(notif.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${selectedNotifs.has(notif.id) ? 'bg-emerald-500/5 border-emerald-500/40 shadow-lg' : 'bg-zinc-900 border-zinc-800'} ${!notif.lida ? 'border-l-4 border-l-emerald-500' : ''}`}
                      >
                         <div className="flex justify-between items-start mb-2">
                            <h3 className={`text-xs font-black uppercase tracking-tighter ${!notif.lida ? 'text-emerald-500' : 'text-zinc-400'}`}>
                               {notif.titulo}
                            </h3>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedNotifs.has(notif.id) ? 'bg-emerald-500 border-emerald-500 text-zinc-950' : 'border-zinc-700'}`}>
                               {selectedNotifs.has(notif.id) && <span className="text-[10px] font-black">✓</span>}
                            </div>
                         </div>
                         <p className="text-zinc-300 text-[11px] leading-relaxed mb-3">{notif.mensagem}</p>
                         <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                            {new Date(notif.data).toLocaleString('pt-BR')}
                         </span>
                      </div>
                   ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE NOTIFICAÇÕES */}
      {showConfirmDeleteNotifs && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 animate-in fade-in">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowConfirmDeleteNotifs(false)}></div>
           <div className="relative w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/20">
                 {ICONS.Trash}
              </div>
              <div>
                 <h3 className="text-xl font-black text-white uppercase tracking-tighter">Apagar {selectedNotifs.size} item(s)?</h3>
                 <p className="text-zinc-500 text-xs font-medium mt-2">Esta ação removerá permanentemente os avisos selecionados do sistema.</p>
              </div>
              <div className="flex flex-col gap-3">
                 <button onClick={deleteSelectedNotifs} className="w-full h-16 bg-red-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest">EXCLUIR AGORA</button>
                 <button onClick={() => setShowConfirmDeleteNotifs(false)} className="w-full h-12 text-zinc-500 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
              </div>
           </div>
        </div>
      )}

      {/* DRAWER DE PERFIL PESSOAL */}
      {showProfile && (
        <div className="fixed inset-0 z-[200] flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => { setShowProfile(false); setIsEditing(false); }}></div>
          <div className="relative w-full max-w-sm h-full bg-zinc-900 border-r border-zinc-800 shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col overflow-y-auto">
             <div className="p-8 space-y-8 flex-1">
                <div className="flex justify-between items-start">
                   <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-zinc-950 font-black text-4xl shadow-xl shadow-emerald-500/20 overflow-hidden cursor-pointer relative group"
                   >
                      {userData?.foto ? (
                        <img src={userData.foto} className="w-full h-full object-cover" alt="Perfil" />
                      ) : (
                        userInitial
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest text-center px-2">Trocar Foto</span>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                   </div>
                   <button onClick={() => { setShowProfile(false); setIsEditing(false); }} className="p-2 text-zinc-500 hover:text-white transition-colors">✕</button>
                </div>
                
                <div className="space-y-4">
                   <div className="space-y-1">
                      <h2 className="text-2xl font-black text-white tracking-tight leading-none">{userData?.nome || 'Usuário'}</h2>
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{userRole === UserRole.ADMIN ? 'Administrador' : 'Chefe de Equipe'}</p>
                   </div>

                   {/* SELECTOR DE SITUAÇÃO */}
                   <div className="space-y-3 pt-2">
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block">Minha Situação Atual</span>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.values(UserStatus).map(status => (
                          <button 
                            key={status}
                            onClick={() => updateStatus(status)}
                            className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-tighter transition-all flex flex-col items-center gap-1.5 ${userData?.status === status ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-lg' : 'border-zinc-800 text-zinc-600'}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${statusConfig[status].color}`}></div>
                            {statusConfig[status].label}
                          </button>
                        ))}
                      </div>
                   </div>

                   {/* CAMPOS EDITÁVEIS */}
                   <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Informações de Contato</span>
                        <button onClick={() => setIsEditing(!isEditing)} className="text-[9px] font-black text-emerald-500 uppercase underline decoration-2 underline-offset-4">
                          {isEditing ? 'Cancelar' : 'Editar'}
                        </button>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase px-1 tracking-wider">Novo E-mail</label>
                            <input 
                              type="email" 
                              value={editEmail} 
                              onChange={(e) => setEditEmail(e.target.value)} 
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-emerald-500 transition-colors shadow-inner"
                              placeholder="exemplo@email.com"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase px-1 tracking-wider">Número WhatsApp</label>
                            <input 
                              type="tel" 
                              value={editPhone} 
                              onChange={(e) => setEditPhone(e.target.value)} 
                              placeholder="(00) 00000-0000"
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-emerald-500 transition-colors shadow-inner"
                            />
                          </div>
                          <button 
                            onClick={updateProfile}
                            className="w-full h-14 bg-emerald-500 text-zinc-950 font-black text-[10px] rounded-xl uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-2"
                          >
                            Confirmar Alterações
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                           <div className="p-5 bg-zinc-800/40 rounded-2xl border border-zinc-800/60 flex justify-between items-center shadow-sm">
                              <div className="space-y-0.5">
                                <span className="text-[8px] font-black text-zinc-600 uppercase block tracking-widest">Endereço de E-mail</span>
                                <span className="text-zinc-200 text-sm font-bold truncate max-w-[180px] block">{userData?.email}</span>
                              </div>
                              <span className="text-emerald-500/30">✓</span>
                           </div>
                           <div className="p-5 bg-zinc-800/40 rounded-2xl border border-zinc-800/60 flex justify-between items-center shadow-sm">
                              <div className="space-y-0.5">
                                <span className="text-[8px] font-black text-zinc-600 uppercase block tracking-widest">Contato Vinculado</span>
                                <span className="text-zinc-200 text-sm font-bold">{userData?.telefone || 'Não informado'}</span>
                              </div>
                              <span className="text-zinc-700">{ICONS.WhatsApp}</span>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             <div className="p-8 border-t border-zinc-800 bg-zinc-950/20">
                <button 
                  onClick={() => { onLogout(); setShowProfile(false); }}
                  className="w-full h-14 bg-red-500/10 text-red-500 font-black text-[10px] rounded-xl border border-red-500/20 uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                   {ICONS.Logout} Finalizar Sessão
                </button>
                <p className="text-center text-zinc-700 text-[8px] font-black uppercase mt-4 tracking-tighter">RS Eventos • Versão 1.2.1 • 2024</p>
             </div>
          </div>
        </div>
      )}

      {/* FAB E MENU ADMIN */}
      <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-4">
        {showFabWarning && <div className="bg-yellow-500 text-zinc-950 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300 border-2 border-yellow-400">somente administradores tem acesso</div>}
        {isFabOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[-1]" onClick={() => setIsFabOpen(false)}></div>}
        {isFabOpen && (
          <div className="flex flex-col gap-2 bg-zinc-900/90 backdrop-blur-xl border border-emerald-500/30 p-2 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 w-16">
            <button onClick={() => navigateAndClose('gestao')} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-zinc-800 text-emerald-500 active:scale-90 transition-all">{ICONS.Users}</button>
            <button onClick={() => navigateAndClose('horarios')} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-zinc-800 text-emerald-500 active:scale-90 transition-all">{ICONS.Calendar}</button>
            <button onClick={() => navigateAndClose('gestao')} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-zinc-800 text-emerald-500 active:scale-90 transition-all">{ICONS.AddUser}</button>
            <button onClick={() => navigateAndClose('gestao')} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-zinc-800 text-emerald-500 active:scale-90 transition-all">{ICONS.Plus}</button>
          </div>
        )}
        <button onClick={handleFabClick} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 border-4 ${isFabOpen ? 'bg-zinc-900 border-emerald-500 rotate-45 text-emerald-500' : 'bg-emerald-500 border-emerald-400/30 text-zinc-950'}`}>
          <div className="scale-125">{isFabOpen ? '✕' : ICONS.Arrow}</div>
        </button>
      </div>

      <main className="flex-1 overflow-y-auto pb-32 pt-4 px-4 custom-scrollbar">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.4)] z-50">
        <div className="flex justify-around items-center h-20">
          <button onClick={() => setActiveTab('horarios')} className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'horarios' ? 'text-emerald-500 scale-110 font-black' : 'text-zinc-500 font-medium'}`}>{ICONS.Calendar}<span className="text-[9px] mt-1 uppercase tracking-wider">Horários</span></button>
          <button onClick={() => setActiveTab('gestao')} className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'gestao' ? 'text-emerald-500 scale-110 font-black' : 'text-zinc-500 font-medium'}`}>{ICONS.AddUser}<span className="text-[9px] mt-1 uppercase tracking-wider">Gestão</span></button>
          <button onClick={() => setActiveTab('faltas')} className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'faltas' ? 'text-emerald-500 scale-110 font-black' : 'text-zinc-500 font-medium'}`}>{ICONS.UserMinus}<span className="text-[9px] mt-1 uppercase tracking-wider">Faltas</span></button>
          <button onClick={() => setActiveTab('relatorios')} className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'relatorios' ? 'text-emerald-500 scale-110 font-black' : 'text-zinc-500 font-medium'}`}>{ICONS.Report}<span className="text-[9px] mt-1 uppercase tracking-wider">Relatórios</span></button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
