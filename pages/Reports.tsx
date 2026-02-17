
import React, { useState, useMemo, useEffect } from 'react';
import { getDB, saveDB } from '../dbService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { COLORS, ICONS } from '../constants';
import { jsPDF } from 'jspdf';
import { PersonType, UserRole, Contato } from '../types';

const Reports: React.FC = () => {
  const [db, setDb] = useState(getDB());
  const today = new Date();
  const is16th = today.getDate() === 16;
  const user = db.currentUser;
  const isAdmin = user?.tipo === UserRole.ADMIN;

  // Estados para novo contato
  const [nomeContato, setNomeContato] = useState('');
  const [numeroContato, setNumeroContato] = useState('');

  useEffect(() => {
    const dbUpdateHandler = () => {
      setDb(getDB());
    };
    window.addEventListener('dbUpdated', dbUpdateHandler);
    return () => window.removeEventListener('dbUpdated', dbUpdateHandler);
  }, []);

  // Estatísticas Simples
  const totalPessoas = db.pessoas.length;
  const totalHorarios = db.horarios.length;
  
  const teamStats = db.equipes.map(eq => {
    const count = db.horarios
      .filter(h => h.equipe_id === eq.id)
      .reduce((acc, h) => acc + db.horarioPessoas.filter(hp => hp.horario_id === h.id).length, 0);
    return { name: eq.nome_equipe, value: count };
  });

  const sortedHistory = useMemo(() => {
    return [...db.historico].sort((a, b) => 
      new Date(b.data_edicao).getTime() - new Date(a.data_edicao).getTime()
    );
  }, [db.historico]);

  const handleAddContato = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!nomeContato.trim() || !numeroContato.trim()) {
      alert('Preencha nome e número.');
      return;
    }

    const novo: Contato = {
      id: Math.random().toString(36).substr(2, 9),
      nome: nomeContato.trim(),
      numero: numeroContato.trim()
    };

    const currentDb = getDB();
    const newDb = { ...currentDb, contatos: [...(currentDb.contatos || []), novo] };
    saveDB(newDb);
    setDb(newDb);
    setNomeContato('');
    setNumeroContato('');
  };

  const deleteContato = (id: string) => {
    if (!isAdmin) return;
    const currentDb = getDB();
    const newDb = { ...currentDb, contatos: currentDb.contatos.filter(c => c.id !== id) };
    saveDB(newDb);
    setDb(newDb);
  };

  const openWhatsApp = (numero: string) => {
    const cleanNumber = numero.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber.startsWith('55') ? cleanNumber : '55' + cleanNumber}`, '_blank');
  };

  const handleExportPDF = async () => {
    if (!isAdmin) return;
    if (!is16th) {
      alert('⚠️ ATENÇÃO: A exportação oficial de fechamento mensal está habilitada apenas no dia 16 de cada mês.');
      return;
    }

    try {
      const doc = new jsPDF();
      const margin = 15;
      let y = 20;

      doc.setFontSize(22);
      doc.setTextColor(16, 185, 129);
      doc.text('RS EVENTOS - RELATÓRIO MENSAL', margin, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Data do Relatório: ${today.toLocaleDateString('pt-BR')}`, margin, y);
      
      y += 15;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('RESUMO GERAL', margin, y);
      y += 8;
      doc.setFontSize(11);
      doc.text(`Total de Colaboradores: ${totalPessoas}`, margin, y);
      y += 6;
      doc.text(`Total de Escalas Publicadas: ${totalHorarios}`, margin, y);

      y += 15;
      doc.save(`Relatorio_RS_Eventos_${today.getMonth() + 1}_${today.getFullYear()}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar PDF.');
    }
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-bold text-white tracking-tight uppercase">
          {isAdmin ? 'Painel de Relatórios' : 'Agenda de Contatos'}
        </h2>
        {isAdmin && (
          <div className={`px-4 py-2 rounded-full border ${is16th ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-zinc-800 bg-zinc-900 text-zinc-600'} text-[8px] font-black uppercase tracking-widest`}>
            {is16th ? 'Fechamento Disponível' : 'Fechamento no Dia 16'}
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl">
               <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1">Total Pessoas</p>
               <p className="text-3xl font-black text-white">{totalPessoas}</p>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl">
               <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1">Escalas</p>
               <p className="text-3xl font-black text-white">{totalHorarios}</p>
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 shadow-xl space-y-4 animate-in fade-in duration-500">
             <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Presença por Equipe
             </h3>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamStats}>
                    <XAxis dataKey="name" hide />
                    <Tooltip 
                      cursor={{fill: '#27272a'}}
                      contentStyle={{backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px'}}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {teamStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.primary} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </>
      )}

      {/* AGENDA DE CONTATOS WHATSAPP (Acessível a todos) */}
      <div className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 shadow-xl space-y-6">
         <div className="flex flex-col gap-1">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Agenda de Contatos Rápida
            </h3>
            <p className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest">Identificação e números para contato direto</p>
         </div>

         {isAdmin && (
           <form onSubmit={handleAddContato} className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  value={nomeContato} 
                  onChange={(e) => setNomeContato(e.target.value)}
                  placeholder="Nome pessoal"
                  className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-emerald-500 transition-all"
                />
                <input 
                  type="tel" 
                  value={numeroContato} 
                  onChange={(e) => setNumeroContato(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-zinc-950 font-black text-[10px] py-4 rounded-xl uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                Salvar Contato
              </button>
           </form>
         )}

         <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {(db.contatos || []).length === 0 ? (
              <p className="text-zinc-600 text-center py-8 font-black text-[9px] uppercase tracking-widest italic opacity-50">Nenhum contato salvo ainda</p>
            ) : (
              db.contatos.map(contato => (
                <div key={contato.id} className="p-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl flex items-center justify-between group transition-all hover:bg-zinc-800/60">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-100 font-black text-sm tracking-tight">{contato.nome}</span>
                    <span className="text-zinc-500 font-bold text-[10px]">{contato.numero}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openWhatsApp(contato.numero)}
                      className="w-10 h-10 bg-emerald-500 text-zinc-950 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
                      title="Abrir WhatsApp"
                    >
                      {ICONS.WhatsApp}
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => deleteContato(contato.id)}
                        className="w-10 h-10 bg-zinc-700 text-red-400 rounded-xl flex items-center justify-center border border-zinc-600 opacity-50 hover:opacity-100 active:scale-90 transition-all"
                      >
                        {ICONS.Trash}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
         </div>
      </div>

      {isAdmin && (
        <>
          <div className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 shadow-xl space-y-4 animate-in fade-in duration-700">
             <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Histórico de Alterações
             </h3>
             <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
               {sortedHistory.length === 0 ? (
                 <p className="text-zinc-600 text-center py-8 font-medium italic text-xs uppercase">Nenhum registro encontrado.</p>
               ) : (
                 sortedHistory.map(log => (
                   <div key={log.id} className="p-4 border-l-2 border-emerald-500 bg-zinc-800/40 rounded-r-2xl transition-all hover:bg-zinc-800/60">
                     <p className="font-bold text-zinc-100 text-xs leading-tight mb-2">{log.descricao_alteracao}</p>
                     <div className="flex justify-between items-center opacity-60">
                       <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                         {db.users.find(u => u.id === log.editado_por)?.nome || 'Sistema'}
                       </p>
                       <p className="text-[9px] font-black text-zinc-400 uppercase">
                         {new Date(log.data_edicao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                       </p>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={handleExportPDF}
              className={`w-full h-20 font-black text-lg rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest ${is16th ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'}`}
            >
              Exportar Relatório (.PDF)
            </button>
            {!is16th && (
              <p className="text-[9px] font-bold text-zinc-600 text-center uppercase tracking-widest px-4">
                A exportação de fechamento só é permitida no dia 16 de cada mês.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
