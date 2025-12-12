
// Simulação de Backend usando LocalStorage

export interface User {
  username: string;
  password: string; 
  createdAt: string;
  accessCode?: string; // Rastreia qual código o usuário usou
}

const STORAGE_KEY = 'sportsim_users';
const SESSION_KEY = 'sportsim_session';

// --- ÁREA DE CONFIGURAÇÃO DE ACESSO (LINHA 13) ---
// Cadastre aqui os CÓDIGOS que seus amigos usarão para criar conta.
// O Nome de Usuário eles escolhem na hora do cadastro.
const ALLOWED_INVITE_CODES = [
  'ADMIN_MASTER',  // Seu acesso pessoal
  'VIP_2024',      // Um código genérico para vários amigos
  'MARCEL',    // Exemplo: Para revogar depois, basta apagar esta linha
  'DENNIS',  // Outro exemplo
];

export const authService = {
  // Retorna todos os usuários cadastrados
  getUsers: (): User[] => {
    const usersStr = localStorage.getItem(STORAGE_KEY);
    return usersStr ? JSON.parse(usersStr) : [];
  },

  // Valida se um código de convite existe e está ativo
  validateInvite: (code: string): boolean => {
    // Se a lista estiver vazia, permite qualquer um (modo desenvolvimento)
    // Se tiver códigos, obriga a bater com um deles
    if (ALLOWED_INVITE_CODES.length === 0) return true;
    return ALLOWED_INVITE_CODES.includes(code.trim());
  },

  // Registra um novo usuário
  register: (username: string, password: string, inviteCode: string = ''): { success: boolean; message: string } => {
    // 1. Validação de Convite (Security Check)
    if (ALLOWED_INVITE_CODES.length > 0 && !ALLOWED_INVITE_CODES.includes(inviteCode.trim())) {
        return { success: false, message: 'Código de convite inválido ou expirado.' };
    }

    const users = authService.getUsers();
    
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Usuário já existe.' };
    }

    if (password.length < 4) {
      return { success: false, message: 'A senha deve ter no mínimo 4 caracteres.' };
    }

    const newUser: User = {
      username,
      password, 
      accessCode: inviteCode,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    
    // Auto-login após registro
    authService.login(username, password);
    
    return { success: true, message: 'Conta criada com sucesso!' };
  },

  // Realiza login
  login: (username: string, password: string): { success: boolean; message: string } => {
    // Backdoor original mantido para testes (LINHA 68 - Usuário fixo de emergência)
    if (username === 'admin' && password === '1234') {
        localStorage.setItem(SESSION_KEY, 'admin');
        return { success: true, message: 'Bem-vindo, Admin.' };
    }

    const users = authService.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

    if (user) {
      localStorage.setItem(SESSION_KEY, user.username);
      return { success: true, message: `Bem-vindo de volta, ${user.username}.` };
    }

    return { success: false, message: 'Usuário ou senha incorretos.' };
  },

  // Verifica se há sessão ativa
  checkSession: (): string | null => {
    return localStorage.getItem(SESSION_KEY);
  },

  // Logout
  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  }
};
