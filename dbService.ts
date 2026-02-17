
import { AppState, User, UserRole, PersonType } from './types';

const DB_KEY = 'rs_eventos_db_v1';

const INITIAL_DATA: AppState = {
  currentUser: null,
  users: [
    { id: 'u1', nome: 'Administrador', email: 'admin@rseventos.com', tipo: UserRole.ADMIN, senha: '123', data_criacao: new Date().toISOString() },
  ],
  equipes: [
    { id: 'e1', nome_equipe: 'Equipe Cozinha A', chefe_responsavel: 'u1' },
  ],
  pessoas: [
    { id: 'p1', nome: 'João Silva', tipo: PersonType.FIXO, ativo: true },
    { id: 'p2', nome: 'Maria Souza', tipo: PersonType.FIXO, ativo: true },
  ],
  horarios: [],
  horarioPessoas: [],
  historico: [],
  notificacoes: [],
  contatos: []
};

export const getDB = (): AppState => {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
  return JSON.parse(data);
};

export const saveDB = (state: AppState) => {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('dbUpdated'));
};

export const clearDB = () => {
  localStorage.removeItem(DB_KEY);
  window.location.reload();
};
