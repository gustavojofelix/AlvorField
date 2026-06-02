import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  userTypes = [
    { value: 'Produtor', label: 'Produtor Agrícola', icon: 'agriculture', desc: 'Produzir e vender colheitas e produtos agrícolas' },
    { value: 'Consumidor', label: 'Consumidor / Comprador', icon: 'shopping_basket', desc: 'Comprar colheitas para comércio, restauração ou uso doméstico' },
    { value: 'Investidor', label: 'Investidor de Agro-Negócio', icon: 'trending_up', desc: 'Financiar agricultores para melhoria técnica e lucros partilhados' },
  ];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      telefone: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      tipo: ['', Validators.required],
      localidade: ['', Validators.required],
      descricao: ['', [Validators.required, Validators.maxLength(250)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });

    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { nome, telefone, tipo, localidade, descricao, password } = this.registerForm.value;

    setTimeout(() => {
      const result = this.auth.register({
        nome,
        telefone,
        tipo,
        localidade,
        descricao,
        password
      } as Omit<User, 'id'>);
      
      this.isLoading = false;

      if (result.success) {
        this.snack.open(result.message + ' Faça o login.', 'OK', {
          duration: 4000,
          panelClass: ['snackbar-success']
        });
        this.router.navigate(['/login']);
      } else {
        this.snack.open(result.message, 'Fechar', {
          duration: 4000,
          panelClass: ['snackbar-error']
        });
      }
    }, 600);
  }
}
