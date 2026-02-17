
import React, { useState, useMemo } from 'react';
import { getDB } from '../dbService';
import { PersonType } from '../types';
import { ICONS } from '../constants';

const Absences: React.FC = () => {
  const [db] = useState(getDB());
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);

  const results = useMemo(() => {
    const schedulesToday = db.horarios.filter(h => h.data === checkDate);
    const presentIds = new Set(
      db.horarioPessoas
        .filter(hp => schedulesToday.some(h => h.id === hp.horario_id))
        .map(hp => hp.pessoa_id)
    );

    const missingFixos = db.pessoas.filter(p => p.ativo && p.tipo === PersonType.FIXO && !presentIds.has(p.id));
    const missingDiaristas = db.pessoas.filter(p => p.ativo && p.tipo === PersonType.DIARISTA && !presentIds.has(p.id));

    return { missingFixos, missingDiaristas };
  }, [db, checkDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2 px-1">
        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Possíveis Faltas</h2>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Quem não está em nenhuma escala hoje</p>
      </div>

      <div className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 shadow-xl">
        <label className="block text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 ml-1">Verificar Data</label>
        <div className="flex items-center gap-3 bg-zinc-800 p-4 rounded-2xl border border-zinc-700/50">
          <div className="text-emerald-500">{ICONS.Calendar}</div>
          <input 
            type="date" 
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
            className="w-full bg-transparent text-white font-black text-xl focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-8">
        {/* FIXOS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">FIXOS NÃO ALOCADOS</h3>
            </div>
            <span className="bg-zinc-800 text-yellow-500 px-3 py-1 rounded-full text-[10px] font-black border border-yellow-500/20">
              {results.missingFixos.length}
            </span>
          </div>
          
          {results.missingFixos.length === 0 ? (
            <div className="p-10 text-center bg-zinc-900/50 rounded-[2rem] border border-zinc-800 border-dashed">
               <p className="text-zinc-600 font-black text-[10px] uppercase tracking-widest italic">Todos os fixos estão em equipes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {results.missingFixos.map(p => (
                <div key={p.id} className="p-5 bg-zinc-900 border border-zinc-800 rounded-[1.8rem] flex items-center shadow-lg">
                  <div>
                    <span className="font-black text-yellow-400 text-lg tracking-tight block leading-none mb-1">{p.nome}</span>
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Contrato Fixo</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DIARISTAS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]"></div>
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">DIARISTAS SEM EQUIPE</h3>
            </div>
            <span className="bg-zinc-800 text-red-400 px-3 py-1 rounded-full text-[10px] font-black border border-red-400/20">
              {results.missingDiaristas.length}
            </span>
          </div>

          {results.missingDiaristas.length === 0 ? (
            <div className="p-10 text-center bg-zinc-900/50 rounded-[2rem] border border-zinc-800 border-dashed">
               <p className="text-zinc-600 font-black text-[10px] uppercase tracking-widest italic">Nenhum diarista sobrando hoje</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {results.missingDiaristas.map(p => (
                <div key={p.id} className="p-5 bg-zinc-900 border border-zinc-800 rounded-[1.8rem] flex items-center shadow-lg">
                  <div>
                    <span className="font-black text-red-300 text-lg tracking-tight block leading-none mb-1">{p.nome}</span>
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Colaborador Diarista</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Absences;
