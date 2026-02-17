
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Notificacao, PersonType } from './types';
import Login from './pages/Login';
import Schedules from './pages/Schedules';
import Management from './pages/Management';
import Absences from './pages/Absences';
import Reports from './pages/Reports';
import Layout from './components/Layout';
import { getDB, saveDB } from './dbService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('horarios');
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const checkDailySummary = useCallback((user: User) => {
    if (user.tipo !== UserRole.ADMIN) return;
    
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    const summaryId = 'summary-' + today;
    
    const schedulesToday = db.horarios.filter(h => h.data === today);
    const presentIds = new Set(
      db.horarioPessoas
        .filter(hp => schedulesToday.some(h => h.id === hp.horario_id))
        .map(hp => hp.pessoa_id)
    );
    
    const missingFixos = db.pessoas.filter(p => p.ativo && p.tipo === PersonType.FIXO && !presentIds.has(p.id));
    const missingDiaristas = db.pessoas.filter(p => p.ativo && p.tipo === PersonType.DIARISTA && !presentIds.has(p.id));
    
    const totalMissing = missingFixos.length + missingDiaristas.length;

    if (totalMissing === 0) return;

    const nomesFixos = missingFixos.map(p => p.nome).join(', ');
    const nomesDiaristas = missingDiaristas.map(p => p.nome).join(', ');

    const novaMensagem = `Pendências de hoje:\n• FIXOS SEM ESCALA (${missingFixos.length}): ${nomesFixos || 'Nenhum'}\n• DIARISTAS SEM ESCALA (${missingDiaristas.length}): ${nomesDiaristas || 'Nenhum'}`;

    const existingIndex = db.notificacoes.findIndex(n => n.id === summaryId);
    
    if (existingIndex === -1) {
      const notif: Notificacao = {
        id: summaryId,
        tipo_role: UserRole.ADMIN,
        titulo: '📢 RESUMO DE ALOCAÇÃO',
        mensagem: novaMensagem,
        data: new Date().toISOString(),
        lida: false
      };
      db.notificacoes.push(notif);
      saveDB(db);
      
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("RS Eventos", { body: `Há ${totalMissing} colaboradores sem escala.` });
      }
    }
  }, []);

  useEffect(() => {
    const db = getDB();
    if (db.currentUser) {
      setCurrentUser(db.currentUser);
      checkDailySummary(db.currentUser);
    }
    setIsLoading(false);
  }, [checkDailySummary]);

  const handleLogin = (user: User) => {
    setIsTransitioning(true);
    setTimeout(() => {
      const db = getDB();
      db.currentUser = user;
      saveDB(db);
      setCurrentUser(user);
      checkDailySummary(user);
      setTimeout(() => setIsTransitioning(false), 800);
    }, 400);
  };

  const handleLogout = () => {
    const db = getDB();
    db.currentUser = null;
    saveDB(db);
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {isTransitioning && (
        <div className="portal-overlay">
          <div className="portal-circle"></div>
          <div className="portal-rs">RS</div>
        </div>
      )}

      {!currentUser ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className={isTransitioning ? "opacity-0" : "main-app-reveal"}>
          <Layout 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            userRole={currentUser.tipo}
            userId={currentUser.id}
            onLogout={handleLogout}
            title={getPageTitle(activeTab)}
          >
            {renderContent(activeTab, currentUser)}
          </Layout>
        </div>
      )}
    </>
  );
};

const renderContent = (activeTab: string, currentUser: User) => {
  switch (activeTab) {
    case 'horarios': return <Schedules user={currentUser} />;
    case 'gestao': return <Management user={currentUser} />;
    case 'faltas': return <Absences />;
    case 'relatorios': return <Reports />;
    default: return <Schedules user={currentUser} />;
  }
};

const getPageTitle = (activeTab: string) => {
  switch (activeTab) {
    case 'horarios': return 'Agenda Diária';
    case 'gestao': return 'Adicionar Nomes';
    case 'faltas': return 'Possíveis Faltas';
    case 'relatorios': return 'Relatórios e Contatos';
    default: return '';
  }
};

export default App;
