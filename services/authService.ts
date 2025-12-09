
// Simulação de Backend usando LocalStorage
// NOTA: Em produção real, você usaria Firebase, Supabase ou um backend Node.js.

export interface User {
  username: string;
  password: string; // Em um app real, isso seria um Hash, nunca texto puro.
  createdAt: string;
}

const STORAGE_KEY = 'sportsim_users';
const SESSION_KEY = 'sportsim_session';

export const authService = {
  // Retorna todos os usuários cadastrados
  getUsers: (): User[] => {
    const usersStr = localStorage.getItem(STORAGE_KEY);
    return usersStr ? JSON.parse(usersStr) : [];
  },

  // Registra um novo usuário
  register: (username: string, password: string): { success: boolean; message: string } => {
    const users = authService.getUsers();
    
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Usuário já existe.' };
    }

    if (password.length < 4) {
      return { success: false, message: 'A senha deve ter no mínimo 4 caracteres.' };
    }

    const newUser: User = {
      username,
      password, // Armazenando simples para demo. Em prod, usar bcrypt.
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
    // Backdoor original mantido para testes
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
