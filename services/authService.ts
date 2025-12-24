
export interface User {
  username: string;
  password: string; 
  createdAt: string;
  accessCode?: string;
}

const STORAGE_KEY = 'sportsim_users';
const SESSION_KEY = 'sportsim_session';

const ALLOWED_INVITE_CODES = [
  'ADMIN_MASTER',
  'VIP_2024',
  'AMIGO_JOAO',
  'TESTE_GRATIS',
];

export const authService = {
  getUsers: (): User[] => {
    const usersStr = localStorage.getItem(STORAGE_KEY);
    return usersStr ? JSON.parse(usersStr) : [];
  },

  validateInvite: (code: string): boolean => {
    const normalizedInput = code.trim().toUpperCase();
    return ALLOWED_INVITE_CODES.includes(normalizedInput);
  },

  register: (username: string, password: string, inviteCode: string = ''): { success: boolean; message: string } => {
    if (!authService.validateInvite(inviteCode)) {
      return { success: false, message: 'Código de convite inválido.' };
    }

    const users = authService.getUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Usuário já existe.' };
    }

    const newUser: User = {
      username,
      password, 
      accessCode: inviteCode.toUpperCase(),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    authService.login(username, password);
    
    return { success: true, message: 'Conta criada!' };
  },

  login: (username: string, password: string): { success: boolean; message: string } => {
    if (username === 'admin' && password === '1234') {
        localStorage.setItem(SESSION_KEY, 'admin');
        return { success: true, message: 'Bem-vindo, Admin.' };
    }

    const users = authService.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

    if (user) {
      localStorage.setItem(SESSION_KEY, user.username);
      return { success: true, message: `Bem-vindo, ${user.username}.` };
    }

    return { success: false, message: 'Login inválido.' };
  },

  checkSession: (): string | null => localStorage.getItem(SESSION_KEY),
  logout: () => localStorage.removeItem(SESSION_KEY)
};
