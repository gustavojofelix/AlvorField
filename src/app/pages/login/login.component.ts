import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatExpansionModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginForm: FormGroup;
  sampleUsers: User[];
  hidePassword = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      telefone: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.sampleUsers = this.auth.getDummyUsersList();

    // Redirecionar se já logado
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  // Preencher os dados ao clicar num utilizador de teste e fazer login automático
  quickLogin(user: User): void {
    this.loginForm.patchValue({
      telefone: user.telefone,
      password: user.password
    });
    
    this.snack.open(`A preencher dados de ${user.nome}...`, 'OK', { duration: 1500 });
    
    // Pequeno delay para efeito visual de preenchimento
    this.isLoading = true;
    setTimeout(() => {
      this.onSubmit();
    }, 600);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { telefone, password } = this.loginForm.value;

    setTimeout(() => {
      const result = this.auth.login(telefone!, password!);
      this.isLoading = false;
      
      if (result.success) {
        this.snack.open(result.message, 'OK', { 
          duration: 3000,
          panelClass: ['snackbar-success']
        });
        this.router.navigate(['/dashboard']);
      } else {
        this.snack.open(result.message, 'Fechar', { 
          duration: 4000,
          panelClass: ['snackbar-error']
        });
      }
    }, 500);
  }
}
