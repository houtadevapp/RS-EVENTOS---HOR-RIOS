
import React, { useState, useEffect } from 'react';
import { getDB, saveDB } from '../dbService';
import { Pessoa, PersonType, User, UserRole, Equipe } from '../types';
import { ICONS } from '../constants';

interface ManagementProps {
  user: User;
}

const Management: React.FC<ManagementProps> = ({ user }) => {
  const [db, setDb] = useState(getDB());
  const [tab, setTab] = useState<'pessoas' | 'equipes'>('pessoas');

  // Pessoa States
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<PersonType>(PersonType.FIXO);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Equipe States
  const [equipeNameInput, setEquipeNameInput] = useState('');
  const [editingEquipeId, setEditingEquipeId] = useState<string | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);

  useEffect(() => {
    setDb(getDB());
  }, []);

  // --- Pessoa Handlers ---
  const handleAddPessoa = () => {
    if (user.tipo !== UserRole.ADMIN) return;
    if (!newName.trim()) {
      alert('Digite o nome do colaborador.');
      return;
    }
    const newP: Pessoa = {
      id: Math.random().toString(36).substr(2, 9),
      nome: newName.trim(),
      tipo: newType,
      ativo: true
    };
    const currentDb = getDB();
    const newDb = { ...currentDb, pessoas: [...currentDb.pessoas, newP] };
    saveDB(newDb);
    setDb(newDb);
    setNewName('');
  };

  const deletePessoa = () => {
    if (!idToDelete || user.tipo !== UserRole.ADMIN) return;
    const currentDb = getDB();
    const newDb = { 
      ...currentDb, 
      pessoas: currentDb.pessoas.filter(p => p.id !== idToDelete),
      horarioPessoas: currentDb.horarioPessoas.filter(hp => hp.pessoa_id !== idToDelete)
    };
    saveDB(newDb);
    setDb(newDb);
    setIdToDelete(null);
  };

  // --- Equipe Handlers ---
  const handleSaveEquipe = () => {
    if (!equipeNameInput.trim()) {
      alert('Digite o nome da equipe.');
      return;
    }

    const currentDb = getDB();
    let updatedEquipes = [...currentDb.equipes];

    if (editingEquipeId) {
      updatedEquipes = updatedEquipes.map(e => 
        e.id === editingEquipeId ? { ...e, nome_equipe: equipeNameInput.trim() } : e
      );
      setEditingEquipeId(null);
    } else {
      const newE: Equipe = {
        id: Math.random().toString(36).substr(2, 9),
        nome_equipe: equipeNameInput.trim(),
        chefe_responsavel: user.id
      };
      updatedEquipes.push(newE);
    }

    const newDb = { ...currentDb, equipes: updatedEquipes };
    saveDB(newDb);
    setDb(newDb);
    setEquipeNameInput('');
  };

  const deleteEquipe = () => {
    if (!teamToDelete) return;
    const currentDb = getDB();
    const newDb = { 
      ...currentDb, 
      equipes: currentDb.equipes.filter(e => e.id !== teamToDelete),
      horarios: currentDb.horarios.filter(h => h.equipe_id !== teamToDelete)
    };
    saveDB(newDb);
    setDb(newDb);
    setTeamToDelete(null);
  };

  const startEditEquipe = (e: Equipe) => {
    setEditingEquipeId(e.id);
    setEquipeNameInput(e.nome_equipe);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (PESSOA) */}
      {idToDelete && user.tipo === UserRole.ADMIN && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/20">
               {ICONS.Trash}
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Excluir Colaborador?</h3>
              <p className="text-zinc-500 text-sm font-medium mt-2">Deseja realmente excluir este nome? As opções são:</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={deletePessoa} className="w-full h-16 bg-red-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest">EXCLUIR</button>
              <button onClick={() => setIdToDelete(null)} className="w-full h-12 text-zinc-500 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (EQUIPE) */}
      {teamToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/20">
               {ICONS.Trash}
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Excluir Equipe?</h3>
              <p className="text-zinc-500 text-sm font-medium mt-2">Remover a equipe excluirá também os horários associados a ela.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={deleteEquipe} className="w-full h-16 bg-red-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest">EXCLUIR</button>
              <button onClick={() => setTeamToDelete(null)} className="w-full h-12 text-zinc-500 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* TABS DE GESTÃO */}
      <div className="bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 flex shadow-xl">
        <button 
          onClick={() => setTab('pessoas')} 
          className={`flex-1 py-4 font-black rounded-xl text-[10px] uppercase transition-all ${tab === 'pessoas' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500'}`}
        >
          Colaboradores
        </button>
        <button 
          onClick={() => setTab('equipes')} 
          className={`flex-1 py-4 font-black rounded-xl text-[10px] uppercase transition-all ${tab === 'equipes' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500'}`}
        >
          Equipes
        </button>
      </div>

      {tab === 'pessoas' ? (
        <div className="space-y-6">
          {user.tipo === UserRole.ADMIN && (
            <div className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl space-y-5 animate-in slide-in-from-top-2">
              <h3 className="text-emerald-500 font-black uppercase tracking-[0.2em] text-[10px] text-center mb-2">Cadastrar Colaborador</h3>
              <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  placeholder="Ex: Maria das Dores" 
                  className="w-full h-16 bg-zinc-800 border border-zinc-700 rounded-2xl px-5 text-white focus:border-emerald-500 outline-none text-lg transition-all" 
              />
              <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setNewType(PersonType.FIXO)} 
                    className={`h-14 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${newType === PersonType.FIXO ? 'border-orange-500 bg-orange-500/10 text-orange-500 shadow-lg' : 'border-zinc-800 text-zinc-600'}`}
                  >
                    Fixo
                  </button>
                  <button 
                    onClick={() => setNewType(PersonType.DIARISTA)} 
                    className={`h-14 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${newType === PersonType.DIARISTA ? 'border-blue-600 bg-blue-600/10 text-blue-500 shadow-lg' : 'border-zinc-800 text-zinc-600'}`}
                  >
                    Diarista
                  </button>
              </div>
              <button onClick={handleAddPessoa} className="w-full h-20 bg-emerald-500 text-zinc-950 font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest">
                Salvar no Banco
              </button>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-zinc-600 font-black uppercase tracking-widest text-[10px] px-2">Lista Geral ({db.pessoas.length})</h3>
            <div className="grid grid-cols-1 gap-3">
              {db.pessoas.map(p => (
                <div key={p.id} className="flex items-center justify-between p-5 bg-zinc-900 border border-zinc-800 rounded-[1.8rem] shadow-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-black text-white text-lg tracking-tight leading-none mb-1">{p.nome}</p>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${p.tipo === PersonType.FIXO ? 'bg-orange-500 text-zinc-950' : 'bg-blue-600 text-white'}`}>{p.tipo}</span>
                      </div>
                    </div>
                    {user.tipo === UserRole.ADMIN && (
                      <button onClick={() => setIdToDelete(p.id)} className="p-4 bg-zinc-800 text-red-500 rounded-2xl border border-zinc-700/50 active:scale-90 shadow-md">
                        {ICONS.Trash}
                      </button>
                    )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl space-y-5">
            <h3 className="text-emerald-500 font-black uppercase tracking-[0.2em] text-[10px] text-center mb-2">
              {editingEquipeId ? 'Editar Equipe' : 'Cadastrar Equipe'}
            </h3>
            <input 
                type="text" 
                value={equipeNameInput} 
                onChange={(e) => setEquipeNameInput(e.target.value)} 
                placeholder="Ex: Equipe Cozinha B" 
                className="w-full h-16 bg-zinc-800 border border-zinc-700 rounded-2xl px-5 text-white focus:border-emerald-500 outline-none text-lg transition-all" 
            />
            <button onClick={handleSaveEquipe} className="w-full h-20 bg-emerald-500 text-zinc-950 font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest">
              {editingEquipeId ? 'Atualizar Equipe' : 'Criar Nova Equipe'}
            </button>
            {editingEquipeId && (
              <button onClick={() => { setEditingEquipeId(null); setEquipeNameInput(''); }} className="w-full h-12 text-zinc-600 font-black uppercase text-[10px] tracking-widest">Cancelar Edição</button>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-zinc-600 font-black uppercase tracking-widest text-[10px] px-2">Equipes Ativas ({db.equipes.length})</h3>
            <div className="grid grid-cols-1 gap-3">
              {db.equipes.map(e => (
                <div key={e.id} className="flex items-center justify-between p-5 bg-zinc-900 border border-zinc-800 rounded-[1.8rem] shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center font-black text-emerald-500">
                        {ICONS.Users}
                      </div>
                      <div>
                        <p className="font-black text-white text-lg tracking-tight leading-none mb-1">{e.nome_equipe}</p>
                        <span className="text-[8px] font-black text-zinc-600 uppercase">RS EVENTOS</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditEquipe(e)} className="p-4 bg-zinc-800 text-emerald-500 rounded-2xl border border-zinc-700/50 active:scale-90">
                        {ICONS.Edit}
                      </button>
                      <button onClick={() => setTeamToDelete(e.id)} className="p-4 bg-zinc-800 text-red-500 rounded-2xl border border-zinc-700/50 active:scale-90">
                        {ICONS.Trash}
                      </button>
                    </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Management;
