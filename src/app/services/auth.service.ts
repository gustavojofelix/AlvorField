import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from './notification.service';

export type UserType = 'Produtor Individual' | 'Cooperativa' | 'Comprador' | 'Investidor';

export interface User {
  id: number;
  nome: string;
  telefone: string;
  password: string;
  tipo: UserType;
  provincia: string;
  distrito: string;
  isAdmin?: boolean; // Se o utilizador é um administrador do sistema
  status?: 'Activo' | 'Suspenso' | 'Eliminado'; // Estado da conta (RF-51)
  
  // Campos extra
  areaCultivo?: number; // Produtor Individual e Cooperativa
  numMembros?: number;  // Cooperativa
  nomeAssociacao?: string; // Cooperativa
  tipoComprador?: 'Processador' | 'Grossista' | 'Exportador' | 'Retalhista' | 'Outro'; // Comprador
  produtosInteresse?: string[]; // Comprador
  tipoInstituicao?: 'Banco' | 'Fundo de Impacto' | 'ONG' | 'Governo' | 'Outro'; // Investidor
  
  ultimoLogin?: number;
  ultimoAcesso?: number;
  avatar?: string;
  descricao?: string;

  // Modulo 8: Notificações e Comunicações (RF-58, RF-60)
  email?: string;
  notifSMS_otp?: boolean;
  notifSMS_interesse?: boolean;
  notifSMS_aceite?: boolean;
  notifSMS_recusa?: boolean;
  notifEmail_otp?: boolean;
  notifEmail_interesse?: boolean;
  notifEmail_aceite?: boolean;
  notifEmail_recusa?: boolean;
  notifPush_otp?: boolean;
  notifPush_interesse?: boolean;
  notifPush_aceite?: boolean;
  notifPush_recusa?: boolean;
}


export interface AuthResult {
  success: boolean;
  message: string;
}

interface OtpData {
  codigo: string;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly USERS_KEY = 'alvorfield_users';
  private readonly LOGGED_USER_KEY = 'alvorfield_current_user'; // Como solicitado: alvorfield_current_user

  // Mapa de OTP temporários (chave: telefone, valor: OTP + expiração)
  private otps = new Map<string, OtpData>();

  private readonly dummyUsers: User[] = [
    {
      id: 1,
      nome: 'Mateus Tembe',
      telefone: '841234567',
      password: 'password123',
      tipo: 'Produtor Individual',
      provincia: 'Gaza',
      distrito: 'Bilene',
      areaCultivo: 15,
      descricao: 'Produtor de Hortícolas orgânicas e Tubérculos. Especializado em batata doce e tomate.',
      avatar: 'agriculture',
      ultimoLogin: Date.now(),
      ultimoAcesso: Date.now(),
      status: 'Activo',
      email: 'mateus@alvorfield.co.mz'
    },
    {
      id: 2,
      nome: 'Lúcia Maputo',
      telefone: '829876543',
      password: 'password123',
      tipo: 'Comprador',
      provincia: 'Maputo Cidade',
      distrito: 'KaMpfumo',
      tipoComprador: 'Grossista',
      produtosInteresse: ['milho', 'feijão', 'gergelim', 'amendoim'],
      descricao: 'Supermercado e distribuidora local. Compra em grandes quantidades.',
      avatar: 'shopping_basket',
      ultimoLogin: Date.now(),
      ultimoAcesso: Date.now(),
      status: 'Activo',
      email: 'lucia@alvorfield.co.mz'
    },
    {
      id: 3,
      nome: 'AgroInvest Moçambique',
      telefone: '855554433',
      password: 'password123',
      tipo: 'Investidor',
      provincia: 'Sofala',
      distrito: 'Beira',
      tipoInstituicao: 'Fundo de Impacto',
      descricao: 'Fundo de investimento com foco em modernização agrícola e sistemas de rega eficientes.',
      avatar: 'trending_up',
      ultimoLogin: Date.now(),
      ultimoAcesso: Date.now(),
      status: 'Activo',
      email: 'info@agroinvest.co.mz'
    },
    {
      id: 4,
      nome: 'Administrador Alvor',
      telefone: '840000000',
      password: 'admin123',
      tipo: 'Comprador',
      provincia: 'Maputo Cidade',
      distrito: 'KaMpfumo',
      descricao: 'Administrador global do sistema AlvorField.',
      avatar: 'admin_panel_settings',
      ultimoLogin: Date.now(),
      ultimoAcesso: Date.now(),
      isAdmin: true,
      status: 'Activo',
      email: 'admin@alvorfield.co.mz'
    }
  ];

  constructor(
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.initializeData();
  }

  private initializeData(): void {
    const existingData = localStorage.getItem(this.USERS_KEY);
    if (!existingData) {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(this.dummyUsers));
    } else {
      try {
        const users: User[] = JSON.parse(existingData);
        let updated = false;
        
        for (const dummy of this.dummyUsers) {
          const index = users.findIndex(u => u.telefone === dummy.telefone);
          if (index === -1) {
            users.push(dummy);
            updated = true;
          } else if (dummy.isAdmin && users[index].password === 'admin') {
            // Atualizar password antiga para cumprir regra de 6 caracteres
            users[index].password = 'admin123';
            updated = true;
          }
        }
        
        // Garantir que todos os utilizadores existentes têm o campo status e preferências de notificação definidos
        users.forEach(u => {
          if (!u.status) {
            u.status = 'Activo';
            updated = true;
          }
          if (u.notifSMS_otp === undefined) {
            u.notifSMS_otp = true;
            u.notifSMS_interesse = true;
            u.notifSMS_aceite = true;
            u.notifSMS_recusa = true;
            u.notifEmail_otp = true;
            u.notifEmail_interesse = true;
            u.notifEmail_aceite = true;
            u.notifEmail_recusa = true;
            u.notifPush_otp = true;
            u.notifPush_interesse = true;
            u.notifPush_aceite = true;
            u.notifPush_recusa = true;
            updated = true;
          }
        });
        
        if (updated) {
          localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        }
      } catch (e) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(this.dummyUsers));
      }
    }
  }

  getDummyUsersList(): User[] {
    return this.dummyUsers;
  }

  getUsers(): User[] {
    const data = localStorage.getItem(this.USERS_KEY);
    const users: User[] = data ? JSON.parse(data) : this.dummyUsers;
    return users.filter(u => u.status !== 'Eliminado'); // Não listar utilizadores eliminados de forma geral
  }

  getAllUsersWithDeleted(): User[] {
    const data = localStorage.getItem(this.USERS_KEY);
    return data ? JSON.parse(data) : this.dummyUsers;
  }

  // RF-03: Enviar código OTP por SMS (simulado)
  enviarOTP(telefone: string): string {
    // Gerar código de 6 dígitos aleatório
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // Validade de 10 minutos
    
    this.otps.set(telefone, { codigo, expiresAt });
    
    // Obter utilizador se já existir (para recuperação de password)
    const existing = this.getAllUsersWithDeleted().find(u => u.telefone === telefone);
    const userId = existing ? existing.id : 0;
    const userName = existing ? existing.nome : 'Novo Utilizador';
    
    // Acionar a notificação multicanal
    const msg = `AlvorField: O seu codigo OTP de verificacao e ${codigo}. Valido por 10 minutos.`;
    this.notificationService.sendNotification(
      userId,
      'otp',
      'Código de Verificação OTP',
      msg,
      telefone,
      userName
    );
    
    return codigo;
  }

  // RF-03: Verificar se o OTP é válido
  verificarOTP(telefone: string, codigo: string): boolean {
    const data = this.otps.get(telefone);
    if (!data) return false;
    
    if (Date.now() > data.expiresAt) {
      this.otps.delete(telefone); // Remove expirado
      return false;
    }
    
    const isValid = data.codigo === codigo;
    if (isValid) {
      this.otps.delete(telefone); // Utilizado
    }
    return isValid;
  }

  // RF-01 e RF-02: Registo de novos utilizadores
  register(user: Omit<User, 'id'>): AuthResult {
    const users = this.getAllUsersWithDeleted();
    const existingUser = users.find(u => u.telefone === user.telefone);
    
    if (existingUser) {
      if (existingUser.status === 'Eliminado') {
        // Se a conta foi eliminada, podemos permitir registar de novo reativando-a
        existingUser.status = 'Activo';
        existingUser.nome = user.nome;
        existingUser.password = user.password;
        existingUser.tipo = user.tipo;
        existingUser.provincia = user.provincia;
        existingUser.distrito = user.distrito;
        existingUser.areaCultivo = user.areaCultivo;
        existingUser.numMembros = user.numMembros;
        existingUser.nomeAssociacao = user.nomeAssociacao;
        existingUser.tipoComprador = user.tipoComprador;
        existingUser.produtosInteresse = user.produtosInteresse;
        existingUser.tipoInstituicao = user.tipoInstituicao;
        existingUser.descricao = user.descricao;
        existingUser.ultimoLogin = Date.now();
        existingUser.ultimoAcesso = Date.now();
        
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        const { password: _, ...safeUser } = existingUser;
        localStorage.setItem(this.LOGGED_USER_KEY, JSON.stringify(safeUser));
        return { success: true, message: 'Conta reativada e criada com sucesso!' };
      }
      return { success: false, message: 'Este número de telefone já está registado.' };
    }

    const newUser: User = {
      ...user,
      id: Date.now(),
      ultimoLogin: Date.now(),
      ultimoAcesso: Date.now(),
      avatar: this.getDefaultAvatar(user.tipo),
      status: 'Activo',
      notifSMS_otp: user.notifSMS_otp !== false,
      notifSMS_interesse: user.notifSMS_interesse !== false,
      notifSMS_aceite: user.notifSMS_aceite !== false,
      notifSMS_recusa: user.notifSMS_recusa !== false,
      notifEmail_otp: user.notifEmail_otp !== false,
      notifEmail_interesse: user.notifEmail_interesse !== false,
      notifEmail_aceite: user.notifEmail_aceite !== false,
      notifEmail_recusa: user.notifEmail_recusa !== false,
      notifPush_otp: user.notifPush_otp !== false,
      notifPush_interesse: user.notifPush_interesse !== false,
      notifPush_aceite: user.notifPush_aceite !== false,
      notifPush_recusa: user.notifPush_recusa !== false
    };

    users.push(newUser);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    
    // Auto-login do novo utilizador
    const { password: _, ...safeUser } = newUser;
    localStorage.setItem(this.LOGGED_USER_KEY, JSON.stringify(safeUser));

    return { success: true, message: 'Conta criada com sucesso!' };
  }

  // RF-08: Login com telemóvel e password
  login(telefone: string, password: string): AuthResult {
    const users = this.getAllUsersWithDeleted();
    const index = users.findIndex(u => u.telefone === telefone && u.password === password);

    if (index === -1) {
      return { success: false, message: 'Telefone ou password incorrectos.' };
    }

    const user = users[index];
    
    // RF-51 Bloqueio de utilizadores suspensos ou eliminados
    if (user.status === 'Suspenso') {
      return { success: false, message: 'A sua conta foi suspensa pela administração. Contacte o suporte.' };
    }
    if (user.status === 'Eliminado') {
      return { success: false, message: 'Esta conta já não se encontra activa no sistema.' };
    }

    // RF-11: Guardar data e hora do último login
    user.ultimoLogin = Date.now();
    user.ultimoAcesso = Date.now();
    users[index] = user;
    
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    
    const { password: _, ...safeUser } = user;
    localStorage.setItem(this.LOGGED_USER_KEY, JSON.stringify(safeUser));

    return { success: true, message: `Bem-vindo, ${user.nome}!` };
  }

  // RF-10: Recuperação de password via SMS OTP
  redefinirPassword(telefone: string, novaPassword: string): AuthResult {
    const users = this.getAllUsersWithDeleted();
    const index = users.findIndex(u => u.telefone === telefone);
    
    if (index === -1) {
      return { success: false, message: 'Este número de telefone não está registado.' };
    }
    
    if (users[index].status === 'Eliminado') {
      return { success: false, message: 'Esta conta foi removida do sistema.' };
    }

    users[index].password = novaPassword;
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    return { success: true, message: 'Password alterada com sucesso! Faça login com a sua nova password.' };
  }

  // RF-09: Edição do perfil (exceto telefone que é imutável)
  atualizarPerfil(perfilData: Partial<User>): AuthResult {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Nenhum utilizador com sessão ativa.' };
    }

    const users = this.getAllUsersWithDeleted();
    const index = users.findIndex(u => u.telefone === currentUser.telefone);
    if (index === -1) {
      return { success: false, message: 'Utilizador não encontrado no sistema.' };
    }

    // Impedir alteração de telefone e id
    const updatedUser: User = {
      ...users[index],
      ...perfilData,
      id: users[index].id,
      telefone: users[index].telefone // Imutável
    };

    users[index] = updatedUser;
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));

    const { password: _, ...safeUser } = updatedUser;
    localStorage.setItem(this.LOGGED_USER_KEY, JSON.stringify(safeUser));

    return { success: true, message: 'Perfil atualizado com sucesso!' };
  }

  // RF-11: Atualiza ultimoAcesso a cada navegação protegida
  registarAcesso(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const users = this.getAllUsersWithDeleted();
    const index = users.findIndex(u => u.telefone === currentUser.telefone);
    if (index !== -1) {
      const now = Date.now();
      users[index].ultimoAcesso = now;
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));

      currentUser.ultimoAcesso = now;
      localStorage.setItem(this.LOGGED_USER_KEY, JSON.stringify(currentUser));
    }
  }

  // RF-51: Atualização de estado do utilizador (Activar, Suspender, Eliminar)
  updateUserStatus(userId: number, status: 'Activo' | 'Suspenso' | 'Eliminado'): void {
    const users = this.getAllUsersWithDeleted();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('Utilizador não encontrado.');
    
    users[index].status = status;
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));

    // Se o utilizador atual for suspenso ou eliminado, força o logout imediato
    const current = this.getCurrentUser();
    if (current && current.id === userId && status !== 'Activo') {
      this.logout();
    }
  }

  logout(): void {
    localStorage.removeItem(this.LOGGED_USER_KEY);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return localStorage.getItem(this.LOGGED_USER_KEY) !== null;
  }

  getCurrentUser(): Omit<User, 'password'> | null {
    const data = localStorage.getItem(this.LOGGED_USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  private getDefaultAvatar(tipo: UserType): string {
    switch (tipo) {
      case 'Produtor Individual':
      case 'Cooperativa':
        return 'agriculture';
      case 'Comprador':
        return 'shopping_basket';
      case 'Investidor':
        return 'trending_up';
      default:
        return 'person';
    }
  }
}
