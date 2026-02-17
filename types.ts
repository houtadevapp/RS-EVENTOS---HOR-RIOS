
export enum UserRole {
  ADMIN = 'admin',
  CHEFE = 'chefe'
}

export enum UserStatus {
  ONLINE = 'online',
  INACTIVE = 'inactive',
  OFFLINE = 'offline'
}

export enum PersonType {
  FIXO = 'fixo',
  DIARISTA = 'diarista'
}

export interface User {
  id: string;
  nome: string;
  email: string;
  tipo: UserRole;
  equipe_id?: string;
  senha: string;
  data_criacao: string;
  telefone?: string;
  foto?: string; // Base64 string
  status?: UserStatus;
}

export interface Equipe {
  id: string;
  nome_equipe: string;
  chefe_responsavel: string; // User ID
}

export interface Pessoa {
  id: string;
  nome: string;
  tipo: PersonType;
  ativo: boolean;
  equipe_id?: string;
}

export interface Horario {
  id: string;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  equipe_id: string;
  criado_por: string;
  data_publicacao: string;
  observacoes?: string;
}

export interface HorarioPessoa {
  id: string;
  horario_id: string;
  pessoa_id: string;
}

export interface HistoricoEdicao {
  id: string;
  horario_id: string;
  editado_por: string;
  data_edicao: string;
  descricao_alteracao: string;
}

export interface Notificacao {
  id: string;
  para_usuario_id?: string;
  tipo_role?: UserRole;
  titulo: string;
  mensagem: string;
  data: string;
  lida: boolean;
}

export interface Contato {
  id: string;
  nome: string;
  numero: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  equipes: Equipe[];
  pessoas: Pessoa[];
  horarios: Horario[];
  horarioPessoas: HorarioPessoa[];
  historico: HistoricoEdicao[];
  notificacoes: Notificacao[];
  contatos: Contato[];
}
