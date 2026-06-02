import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

/**
 * Definição das rotas da aplicação AlvorField.
 * - /login e /register são públicas.
 * - /dashboard é protegido pelo authGuard.
 * - A rota raiz redireciona para /dashboard.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
    title: 'Entrar — AlvorField',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then(
        (m) => m.RegisterComponent
      ),
    title: 'Criar Conta — AlvorField',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [authGuard],
    title: 'Painel — AlvorField',
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
