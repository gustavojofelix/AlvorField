import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that prevents access to routes when the user is not authenticated.
 * If the user is logged in, it registers the last access timestamp in localStorage.
 * If the user is not logged in, they are redirected to the login page.
 */
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isLoggedIn()) {
    authService.registarAcesso(); // RF-11: Registrar último acesso ao acessar rotas protegidas
    return true;
  }
  
  // Redireciona para a página de login
  router.navigate(['/login']);
  return false;
};
