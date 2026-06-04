import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';

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
    MatCheckboxModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  recoveryForm: FormGroup;
  sampleUsers: User[];
  hidePassword = true;
  isLoading = false;

  // Recovery State (RF-08, RF-10)
  recoveringPassword = false;
  recoveryStep = 1; // 1: Telefone, 2: OTP + Nova Senha
  recoveryOtpEnviado = false;
  recoveryOtpError = '';
  recoveryTimer: any;
  recoveryCountdown = 0;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      telefone: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      lembarMe: [false]
    });

    this.recoveryForm = this.fb.group({
      telefone: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      otpCode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.sampleUsers = this.auth.getDummyUsersList();
  }

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnDestroy(): void {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
    }
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmNewPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  // Preencher os dados ao clicar num utilizador de teste e fazer login automático
  quickLogin(user: User): void {
    this.loginForm.patchValue({
      telefone: user.telefone,
      password: user.password
    });
    
    this.snack.open(`A preencher dados de ${user.nome}...`, 'OK', { duration: 1500 });
    
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

  // FLUXO RECUPERAÇÃO DE SENHA (RF-10)
  iniciarRecuperacao(): void {
    this.recoveringPassword = true;
    this.recoveryStep = 1;
    this.recoveryOtpEnviado = false;
    this.recoveryOtpError = '';
    this.recoveryForm.reset();
  }

  cancelarRecuperacao(): void {
    this.recoveringPassword = false;
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
    }
  }

  solicitarRecoveryOTP(): void {
    const telCtrl = this.recoveryForm.get('telefone');
    if (telCtrl?.invalid) {
      telCtrl.markAsTouched();
      return;
    }

    const telefone = telCtrl?.value;
    const users = this.auth.getUsers();
    const userExists = users.some(u => u.telefone === telefone);

    if (!userExists) {
      this.snack.open('Este número de telefone não está registado.', 'Fechar', { duration: 4000, panelClass: ['snackbar-error'] });
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges(); // Previne ExpressionChanged no disabled do botão
    
    setTimeout(() => {
      const code = this.auth.enviarOTP(telefone);
      this.recoveryOtpEnviado = true;
      this.recoveryStep = 2;
      this.isLoading = false;
      this.iniciarRecoveryCountdown();
      this.cdr.detectChanges(); // Atualiza os bindings reativos do template
      this.snack.open(`[SMS SIMULADO] Código de redefinição OTP enviado: ${code}`, 'OK', { duration: 15000 });
    }, 500);
  }

  iniciarRecoveryCountdown(): void {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
    }
    this.recoveryCountdown = 600; // 10 minutos
    this.recoveryTimer = setInterval(() => {
      if (this.recoveryCountdown > 0) {
        this.recoveryCountdown--;
      } else {
        clearInterval(this.recoveryTimer);
        this.recoveryOtpEnviado = false;
        this.recoveryOtpError = 'O código de redefinição expirou. Por favor, solicite novamente.';
      }
    }, 1000);
  }

  formatRecoveryCountdown(): string {
    const minutes = Math.floor(this.recoveryCountdown / 60);
    const seconds = this.recoveryCountdown % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  confirmarRedefinicao(): void {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      return;
    }

    const { telefone, otpCode, newPassword } = this.recoveryForm.value;

    const isOtpValid = this.auth.verificarOTP(telefone, otpCode);
    if (!isOtpValid) {
      this.recoveryOtpError = 'Código OTP incorreto ou expirado. Tente novamente.';
      return;
    }

    this.isLoading = true;
    setTimeout(() => {
      const result = this.auth.redefinirPassword(telefone, newPassword);
      this.isLoading = false;
      
      if (result.success) {
        this.snack.open(result.message, 'OK', { duration: 5000, panelClass: ['snackbar-success'] });
        this.recoveringPassword = false;
        if (this.recoveryTimer) {
          clearInterval(this.recoveryTimer);
        }
      } else {
        this.snack.open(result.message, 'Fechar', { duration: 4000, panelClass: ['snackbar-error'] });
      }
    }, 600);
  }
}
