import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
  id: number;
  nome: string;
  telefone: string;
  password: string;
  tipo: 'Produtor' | 'Consumidor' | 'Investidor';
  localidade?: string;
  descricao?: string;
  avatar?: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly USERS_KEY = 'alvorfield_users';
  private readonly LOGGED_USER_KEY = 'alvorfield_logged_user';

  // 3 Utilizadores Dummy pré-definidos (Produtor, Consumidor, Investidor)
  private readonly dummyUsers: User[] = [
    {
      id: 1,
      nome: 'Mateus Tembe',
      telefone: '841234567',
      password: 'password123',
      tipo: 'Produtor',
      localidade: 'Macia, Gaza',
      descricao: 'Produtor de Hortícolas orgânicas e Tubérculos. Capacidade anual de 15 toneladas de batata doce e tomate.',
      avatar: 'agriculture'
    },
    {
      id: 2,
      nome: 'Lúcia Maputo',
      telefone: '829876543',
      password: 'password123',
      tipo: 'Consumidor',
      localidade: 'Maputo Cidade',
      descricao: 'Supermercado e distribuidora local. Compra hortícolas em grandes quantidades.',
      avatar: 'shopping_basket'
    },
    {
      id: 3,
      nome: 'AgroInvest Moçambique',
      telefone: '855554433',
      password: 'password123',
      tipo: 'Investidor',
      localidade: 'Beira, Sofala',
      descricao: 'Fundo de investimento com foco em modernização agrícola e sistemas de rega eficientes.',
      avatar: 'trending_up'
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
        
        // Assegurar que todos os 3 utilizadores dummy existem no localStorage
        for (const dummy of this.dummyUsers) {
          const index = users.findIndex(u => u.telefone === dummy.telefone);
          if (index === -1) {
            users.push(dummy);
            updated = true;
          } else {
            // Atualizar password ou dados caso tenham mudado
            users[index] = { ...dummy, id: users[index].id };
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

  register(user: Omit<User, 'id'>): AuthResult {
    const users = this.getUsers();
    if (users.some(u => u.telefone === user.telefone)) {
      return { success: false, message: 'Este número de telefone já está registado.' };
    }

    const newUser: User = {
      ...user,
      id: Date.now(),
      avatar: user.tipo === 'Produtor' ? 'agriculture' : (user.tipo === 'Consumidor' ? 'shopping_basket' : 'trending_up')
    };

    users.push(newUser);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    return { success: true, message: 'Conta criada com sucesso!' };
  }

  login(telefone: string, password: string): AuthResult {
    const users = this.getUsers();
    const user = users.find(u => u.telefone === telefone && u.password === password);

    if (!user) {
      return { success: false, message: 'Telefone ou password incorrectos.' };
    }

    const { password: _, ...safeUser } = user;
    localStorage.setItem(this.LOGGED_USER_KEY, JSON.stringify(safeUser));
    return { success: true, message: `Bem-vindo, ${user.nome}!` };
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
}
