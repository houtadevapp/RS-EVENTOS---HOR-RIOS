
import React, { useState, useMemo, useEffect } from 'react';
import { getDB, saveDB } from '../dbService';
import { Horario, User, UserRole, PersonType, HorarioPessoa, HistoricoEdicao } from '../types';
import { ICONS } from '../constants';

interface SchedulesProps {
  user: User;
}

const Schedules: React.FC<SchedulesProps> = ({ user }) => {
  const [db, setDb] = useState(getDB());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Estados dos Filtros
  const [filterDate, setFilterDate] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [filterCollaborator, setFilterCollaborator] = useState('');

  // Estados do formulário
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedEquipe, setSelectedEquipe] = useState('');
  const [presentes, setPresentes] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState('');
  
  const [nameSearchTerm, setNameSearchTerm] = useState('');

  useEffect(() => {
    setDb(getDB());
  }, [isAdding, viewingId]);

  const handleOpenEdit = (h: Horario) => {
    setEditingId(h.id);
    setSelectedDate(h.data);
    setStartTime(h.horario_inicio);
    setEndTime(h.horario_fim);
    setSelectedEquipe(h.equipe_id);
    setObservacoes(h.observacoes || '');
    const ids = db.horarioPessoas.filter(hp => hp.horario_id === h.id).map(hp => hp.pessoa_id);
    setPresentes(ids);
    setIsAdding(true);
    setNameSearchTerm('');
  };

  const deleteSchedule = () => {
    if (!idToDelete || user.tipo !== UserRole.ADMIN) return;
    const currentDb = getDB();
    const scheduleToDelete = currentDb.horarios.find(h => h.id === idToDelete);
    const equipeName = currentDb.equipes.find(e => e.id === scheduleToDelete?.equipe_id)?.nome_equipe || 'Equipe';

    currentDb.historico.push({
      id: Math.random().toString(36).substr(2, 9),
      horario_id: idToDelete,
      editado_por: user.id,
      data_edicao: new Date().toISOString(),
      descricao_alteracao: `EXCLUIU ESCALA: Equipe ${equipeName} do dia ${scheduleToDelete?.data}`
    });

    const newDb = {
      ...currentDb,
      horarios: currentDb.horarios.filter(h => h.id !== idToDelete),
      horarioPessoas: currentDb.horarioPessoas.filter(hp => hp.horario_id !== idToDelete)
    };
    saveDB(newDb);
    setDb(newDb);
    setIdToDelete(null);
    setViewingId(null);
  };

  const handlePublish = () => {
    if (!selectedEquipe || presentes.length === 0) {
      alert('Selecione uma equipe e marque os presentes.');
      return;
    }

    const currentDb = getDB();
    const newHorario: Horario = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      data: selectedDate,
      horario_inicio: startTime,
      horario_fim: endTime,
      equipe_id: selectedEquipe,
      criado_por: user.id,
      data_publicacao: new Date().toISOString(),
      observacoes: observacoes.trim()
    };

    const duplicates: string[] = [];
    const otherSchedulesToday = currentDb.horarios.filter(h => h.data === selectedDate && h.id !== newHorario.id);
    
    presentes.forEach(pId => {
      const isAlreadyWorking = otherSchedulesToday.some(h => 
        currentDb.horarioPessoas.some(hp => hp.horario_id === h.id && hp.pessoa_id === pId)
      );
      if (isAlreadyWorking) {
        const pName = currentDb.pessoas.find(p => p.id === pId)?.nome || 'Pessoa';
        duplicates.push(pName);
      }
    });

    if (user.tipo === UserRole.CHEFE) {
      currentDb.notificacoes.push({
        id: Math.random().toString(36).substr(2, 9),
        tipo_role: UserRole.ADMIN,
        titulo: 'ESCALA EDITADA',
        mensagem: `O chefe ${user.nome} ${editingId ? 'editou' : 'publicou'} um horário para a equipe ${currentDb.equipes.find(e => e.id === selectedEquipe)?.nome_equipe || ''}.`,
        data: new Date().toISOString(),
        lida: false
      });
    }

    let updatedHorarios = [...currentDb.horarios];
    let updatedRelations = currentDb.horarioPessoas.filter(hp => hp.horario_id !== newHorario.id);

    if (editingId) {
      updatedHorarios = updatedHorarios.map(h => h.id === editingId ? newHorario : h);
    } else {
      updatedHorarios.push(newHorario);
    }

    if (duplicates.length > 0) {
      currentDb.notificacoes.push({
        id: Math.random().toString(36).substr(2, 9),
        tipo_role: UserRole.ADMIN,
        titulo: '⚠️ DUPLICIDADE DETECTADA',
        mensagem: `Atenção: ${duplicates.join(', ')} foram escalados em mais de uma equipe em ${selectedDate}.`,
        data: new Date().toISOString(),
        lida: false
      });
    }

    const newRels: HorarioPessoa[] = presentes.map(pId => ({
      id: Math.random().toString(36).substr(2, 9),
      horario_id: newHorario.id,
      pessoa_id: pId
    }));

    const newDb = { 
      ...currentDb, 
      horarios: updatedHorarios, 
      horarioPessoas: [...updatedRelations, ...newRels] 
    };

    saveDB(newDb);
    setDb(newDb);
    setIsAdding(false);
    setEditingId(null);
    setPresentes([]);
    setObservacoes('');
    setNameSearchTerm('');
  };

  const filteredHorarios = useMemo(() => {
    let list = [...db.horarios];
    if (user.tipo === UserRole.CHEFE) {
      list = list.filter(h => h.equipe_id === user.equipe_id || h.criado_por === user.id);
    }
    if (filterDate) list = list.filter(h => h.data === filterDate);
    if (filterEquipe) list = list.filter(h => h.equipe_id === filterEquipe);
    if (filterCollaborator) {
      list = list.filter(h => db.horarioPessoas.some(hp => hp.horario_id === h.id && hp.pessoa_id === filterCollaborator));
    }
    return list.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [db.horarios, db.horarioPessoas, user, filterDate, filterEquipe, filterCollaborator]);

  const filteredPessoas = useMemo(() => {
    if (!nameSearchTerm.trim()) return db.pessoas;
    const term = nameSearchTerm.toLowerCase();
    return db.pessoas.filter(p => p.nome.toLowerCase().includes(term));
  }, [db.pessoas, nameSearchTerm]);

  return (
    <div className="space-y-6">
      {idToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/20">
               {ICONS.Trash}
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Excluir Publicação?</h3>
              <p className="text-zinc-500 text-sm font-medium mt-2">Esta ação é permanente e removerá a escala para todos.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={deleteSchedule} className="w-full h-16 bg-red-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest">EXCLUIR AGORA</button>
              <button onClick={() => setIdToDelete(null)} className="w-full h-12 text-zinc-500 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Painel de Horários</h2>
        {!isAdding && (
          <button onClick={() => { setIsAdding(true); setNameSearchTerm(''); }} className="bg-emerald-500 text-zinc-950 px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">
            {ICONS.Plus} PUBLICAR
          </button>
        )}
      </div>

      {!isAdding && (
        <div className="bg-zinc-900/50 p-4 rounded-[1.8rem] border border-zinc-800/80 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-emerald-500">{ICONS.Arrow}</span>
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Busca inteligente</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700/50">
              <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1 block">Por Data</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full bg-transparent text-white font-bold text-sm outline-none" />
            </div>
            <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700/50">
              <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1 block">Por Equipe</label>
              <select value={filterEquipe} onChange={(e) => setFilterEquipe(e.target.value)} className="w-full bg-transparent text-white font-bold text-sm outline-none cursor-pointer">
                <option value="" className="bg-zinc-900">Todas</option>
                {db.equipes.map(eq => <option key={eq.id} value={eq.id} className="bg-zinc-900">{eq.nome_equipe}</option>)}
              </select>
            </div>
            <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700/50">
              <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1 block">Por Nome</label>
              <select value={filterCollaborator} onChange={(e) => setFilterCollaborator(e.target.value)} className="w-full bg-transparent text-white font-bold text-sm outline-none cursor-pointer">
                <option value="" className="bg-zinc-900">Todos</option>
                {[...db.pessoas].sort((a,b) => a.nome.localeCompare(b.nome)).map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.nome}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {isAdding ? (
        <div className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 space-y-6 animate-in slide-in-from-bottom-4 shadow-2xl">
          <div className="space-y-5">
            <h3 className="text-emerald-500 font-black uppercase tracking-[0.3em] text-[10px] text-center mb-4">{editingId ? 'Editar Escala' : 'Nova Escala'}</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Data do Evento</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-transparent text-white font-black text-xl outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Entrada</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-transparent text-white font-black text-xl outline-none" />
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Saída</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-transparent text-white font-black text-xl outline-none" />
                </div>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Equipe Responsável</label>
                <select value={selectedEquipe} onChange={(e) => setSelectedEquipe(e.target.value)} className="w-full bg-transparent text-white font-black text-lg outline-none">
                  <option value="" className="bg-zinc-900">Selecionar...</option>
                  {db.equipes.map(e => <option key={e.id} value={e.id} className="bg-zinc-900">{e.nome_equipe}</option>)}
                </select>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Anotações da Escala</label>
                <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Instruções adicionais..." className="w-full bg-transparent text-white font-medium text-sm outline-none resize-none h-20 placeholder:text-zinc-600" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-emerald-500 uppercase ml-1 block">Vincular Colaboradores</label>
              <div className="bg-zinc-800/80 p-3 rounded-2xl border border-zinc-700/50 flex items-center gap-3">
                 <input type="text" value={nameSearchTerm} onChange={(e) => setNameSearchTerm(e.target.value)} placeholder="Pesquisar colaborador..." className="w-full bg-transparent text-white font-bold text-sm outline-none" />
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {filteredPessoas.map(p => (
                  <div key={p.id} onClick={() => setPresentes(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${presentes.includes(p.id) ? 'bg-emerald-500/10 border-emerald-500' : 'bg-zinc-800/50 border-zinc-800'}`}>
                    <div>
                       <span className={`font-black text-lg block ${presentes.includes(p.id) ? 'text-emerald-500' : 'text-zinc-100'}`}>{p.nome}</span>
                       <span className={`text-[8px] font-black uppercase ${p.tipo === PersonType.DIARISTA ? 'text-blue-500' : 'text-orange-500'}`}>{p.tipo}</span>
                    </div>
                    {presentes.includes(p.id) && <span className="text-emerald-500 text-xl font-black">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={handlePublish} className="w-full h-20 bg-emerald-500 text-zinc-950 font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest">{editingId ? 'SALVAR' : 'PUBLICAR'}</button>
            <button onClick={() => { setIsAdding(false); setEditingId(null); setPresentes([]); setNameSearchTerm(''); }} className="w-full h-12 text-zinc-600 font-black uppercase text-[10px]">CANCELAR</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHorarios.map(h => {
            const eq = db.equipes.find(e => e.id === h.equipe_id);
            const isExpanded = viewingId === h.id;
            return (
              <div key={h.id} className={`bg-zinc-900 rounded-[2.5rem] border transition-all ${isExpanded ? 'border-emerald-500 shadow-2xl' : 'border-zinc-800'}`}>
                <div onClick={() => setViewingId(isExpanded ? null : h.id)} className="p-7 flex justify-between items-center cursor-pointer">
                  <div className="flex items-center gap-5">
                    <div className="bg-zinc-800 p-3 rounded-2xl text-center min-w-[60px] border border-zinc-700/50">
                      <span className="text-3xl font-black text-emerald-500 block leading-none">{new Date(h.data + 'T12:00:00').getDate()}</span>
                      <span className="text-[8px] font-black text-zinc-500 uppercase">{new Date(h.data + 'T12:00:00').toLocaleString('pt-BR', {month: 'short'})}</span>
                    </div>
                    <div>
                      <p className="text-zinc-100 font-black text-xl mb-1">{h.horario_inicio} - {h.horario_fim}</p>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{eq?.nome_equipe || 'Equipe'}</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-full transition-all ${isExpanded ? 'bg-emerald-500 text-zinc-950 rotate-180' : 'bg-zinc-800 text-zinc-600'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-7 pt-2 border-t border-zinc-800/50 bg-zinc-950/20">
                    <div className="flex flex-wrap gap-2 mb-6">
                      {db.horarioPessoas.filter(hp => hp.horario_id === h.id).map(hp => {
                        const p = db.pessoas.find(x => x.id === hp.pessoa_id);
                        return p ? (
                          <div key={p.id} className="px-3 py-1 bg-zinc-800 rounded-xl flex items-center gap-2 border border-zinc-700/50">
                            <span className="text-xs font-bold text-zinc-300">{p.nome}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleOpenEdit(h)} className="flex-1 h-16 bg-emerald-500 text-zinc-950 font-black rounded-2xl uppercase">EDITAR</button>
                      {user.tipo === UserRole.ADMIN && (
                        <button onClick={() => setIdToDelete(h.id)} className="w-16 h-16 bg-zinc-800 text-red-500 rounded-2xl flex items-center justify-center border border-zinc-700/50">{ICONS.Trash}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Schedules;
