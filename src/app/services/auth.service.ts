import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export type UserType = 'Produtor Individual' | 'Cooperativa' | 'Comprador' | 'Investidor';

export interface User {
  id: number;
  nome: string;
  telefone: string;
  password: string;
  tipo: UserType;
  provincia: string;
  distrito: string;
  
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
      ultimoAcesso: Date.now()
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
      ultimoAcesso: Date.now()
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
      ultimoAcesso: Date.now()
    }
  ];

  constructor(private router: Router) {
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
          }
        }
        
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
    return data ? JSON.parse(data) : this.dummyUsers;
  }

  // RF-03: Enviar código OTP por SMS (simulado)
  enviarOTP(telefone: string): string {
    // Gerar código de 6 dígitos aleatório
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // Validade de 10 minutos
    
    this.otps.set(telefone, { codigo, expiresAt });
    
    // Simulação do envio por SMS
    console.info(`[SMS SIMULADO] Código OTP para ${telefone}: ${codigo} (Válido por 10 minutos)`);
    
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
    const users = this.getUsers();
    if (users.some(u => u.telefone === user.telefone)) {
      return { success: false, message: 'Este número de telefone já está registado.' };
    }

    const newUser: User = {
      ...user,
      id: Date.now(),
      ultimoLogin: Date.now(),
      ultimoAcesso: Date.now(),
      avatar: this.getDefaultAvatar(user.tipo)
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
    const users = this.getUsers();
    const index = users.findIndex(u => u.telefone === telefone && u.password === password);

    if (index === -1) {
      return { success: false, message: 'Telefone ou password incorrectos.' };
    }

    // RF-11: Guardar data e hora do último login
    const user = users[index];
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
    const users = this.getUsers();
    const index = users.findIndex(u => u.telefone === telefone);
    
    if (index === -1) {
      return { success: false, message: 'Este número de telefone não está registado.' };
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

    const users = this.getUsers();
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

    const users = this.getUsers();
    const index = users.findIndex(u => u.telefone === currentUser.telefone);
    if (index !== -1) {
      const now = Date.now();
      users[index].ultimoAcesso = now;
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));

      currentUser.ultimoAcesso = now;
      localStorage.setItem(this.LOGGED_USER_KEY, JSON.stringify(currentUser));
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
