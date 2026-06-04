import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User, UserType } from '../../services/auth.service';
import { LocationService, Province } from '../../services/location.service';
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
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm: FormGroup;
  currentStep = 1;
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  // OTP State
  otpEnviado = false;
  otpVerificado = false;
  otpError = '';
  otpTimer: any;
  otpCountdown = 0; // em segundos (10 minutos = 600 segundos)

  // Localidade State
  provinces: Province[] = [];
  districts: string[] = [];

  // Tipos de Conta
  userTypes = [
    { value: 'Produtor Individual', label: 'Produtor Individual', icon: 'person', desc: 'Produção agrícola em pequena ou média escala' },
    { value: 'Cooperativa', label: 'Cooperativa / Associação', icon: 'groups', desc: 'Associações e cooperativas de produtores unidos' },
    { value: 'Comprador', label: 'Consumidor / Comprador', icon: 'shopping_basket', desc: 'Supermercados, processadores, exportadores e retalhistas' },
    { value: 'Investidor', label: 'Investidor de Agro-Negócio', icon: 'trending_up', desc: 'Bancos, ONGs e fundos de impacto social e financeiro' },
  ];

  // Comprador options
  buyerTypes = ['Processador', 'Grossista', 'Exportador', 'Retalhista', 'Outro'];
  availableProducts = [
    { value: 'milho', label: 'Milho' },
    { value: 'feijão', label: 'Feijão' },
    { value: 'gergelim', label: 'Gergelim' },
    { value: 'castanha de caju', label: 'Castanha de Caju' },
    { value: 'manga', label: 'Manga' },
    { value: 'mandioca', label: 'Mandioca' },
    { value: 'amendoim', label: 'Amendoim' },
    { value: 'tomate', label: 'Tomate' },
    { value: 'batata', label: 'Batata' },
    { value: 'cebola', label: 'Cebola' },
    { value: 'arroz', label: 'Arroz' },
  ];

  // Investidor options
  institutionTypes = ['Banco', 'Fundo de Impacto', 'ONG', 'Governo', 'Outro'];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private locationService: LocationService,
    private router: Router,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    // Inicialização do formulário reativo com validações completas
    this.registerForm = this.fb.group({
      // Passo 1: Telefone & OTP
      telefone: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      otpCode: ['', [Validators.pattern(/^[0-9]{6}$/)]],

      // Passo 2: Tipo de Conta & Senhas
      tipo: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],

      // Passo 3: Dados de Perfil Complementares
      nome: ['', [Validators.required, Validators.minLength(3)]],
      provincia: ['', Validators.required],
      distrito: ['', Validators.required],
      descricao: ['', [Validators.required, Validators.maxLength(250)]],

      // Campos específicos condicionais
      areaCultivo: [null],
      numMembros: [null],
      nomeAssociacao: [''],
      tipoComprador: [''],
      produtosInteresse: [[]],
      tipoInstituicao: ['']
    }, { validators: this.passwordMatchValidator });

    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    this.provinces = this.locationService.getProvinces();
    
    // Escutar mudanças de província para atualizar distritos
    this.registerForm.get('provincia')?.valueChanges.subscribe((prov) => {
      this.districts = this.locationService.getDistrictsForProvince(prov);
      this.registerForm.get('distrito')?.setValue('');
    });

    // Escutar mudança de tipo de conta para aplicar validadores condicionais
    this.registerForm.get('tipo')?.valueChanges.subscribe((tipo: UserType) => {
      this.updateConditionalValidators(tipo);
    });
  }

  ngOnDestroy(): void {
    if (this.otpTimer) {
      clearInterval(this.otpTimer);
    }
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  // Validações reativas dinâmicas conforme o tipo de conta (RF-04 a RF-07)
  private updateConditionalValidators(tipo: UserType): void {
    const areaCultivo = this.registerForm.get('areaCultivo');
    const numMembros = this.registerForm.get('numMembros');
    const nomeAssociacao = this.registerForm.get('nomeAssociacao');
    const tipoComprador = this.registerForm.get('tipoComprador');
    const produtosInteresse = this.registerForm.get('produtosInteresse');
    const tipoInstituicao = this.registerForm.get('tipoInstituicao');

    // Resetar validadores
    areaCultivo?.clearValidators();
    numMembros?.clearValidators();
    nomeAssociacao?.clearValidators();
    tipoComprador?.clearValidators();
    produtosInteresse?.clearValidators();
    tipoInstituicao?.clearValidators();

    if (tipo === 'Produtor Individual') {
      areaCultivo?.setValidators([Validators.required, Validators.min(0.1)]);
    } else if (tipo === 'Cooperativa') {
      areaCultivo?.setValidators([Validators.required, Validators.min(0.1)]);
      numMembros?.setValidators([Validators.required, Validators.min(2)]);
      nomeAssociacao?.setValidators([Validators.required, Validators.minLength(3)]);
    } else if (tipo === 'Comprador') {
      tipoComprador?.setValidators([Validators.required]);
      produtosInteresse?.setValidators([Validators.required, Validators.minLength(1)]);
    } else if (tipo === 'Investidor') {
      tipoInstituicao?.setValidators([Validators.required]);
    }

    // Atualizar validade dos controlos
    areaCultivo?.updateValueAndValidity();
    numMembros?.updateValueAndValidity();
    nomeAssociacao?.updateValueAndValidity();
    tipoComprador?.updateValueAndValidity();
    produtosInteresse?.updateValueAndValidity();
    tipoInstituicao?.updateValueAndValidity();
  }

  // Passo 1: Enviar OTP
  solicitarOTP(): void {
    const telefoneCtrl = this.registerForm.get('telefone');
    if (telefoneCtrl?.invalid) {
      telefoneCtrl.markAsTouched();
      return;
    }

    const telefone = telefoneCtrl?.value;
    const users = this.auth.getUsers();
    if (users.some(u => u.telefone === telefone)) {
      this.snack.open('Este número de telefone já está registado.', 'Fechar', { duration: 4000, panelClass: ['snackbar-error'] });
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges(); // Previne ExpressionChanged no disabled do botão
    
    setTimeout(() => {
      const code = this.auth.enviarOTP(telefone);
      this.otpEnviado = true;
      this.isLoading = false;
      this.iniciarOtpCountdown();
      this.cdr.detectChanges(); // Força atualização de bindings após re-render do template
      this.snack.open(`[SMS SIMULADO] Código OTP enviado por SMS: ${code}`, 'OK', { duration: 15000 });
    }, 500);
  }

  iniciarOtpCountdown(): void {
    if (this.otpTimer) {
      clearInterval(this.otpTimer);
    }
    this.otpCountdown = 600; // 10 minutos
    this.otpTimer = setInterval(() => {
      if (this.otpCountdown > 0) {
        this.otpCountdown--;
      } else {
        clearInterval(this.otpTimer);
        this.otpEnviado = false;
        this.otpError = 'O código OTP expirou. Por favor, envie novamente.';
      }
    }, 1000);
  }

  formatCountdown(): string {
    const minutes = Math.floor(this.otpCountdown / 60);
    const seconds = this.otpCountdown % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  getSelectedTypeIcon(value: string): string {
    const type = this.userTypes.find(t => t.value === value);
    return type ? type.icon : 'badge';
  }

  // Passo 1: Confirmar OTP
  confirmarOTP(): void {
    const otpCodeCtrl = this.registerForm.get('otpCode');
    const telefone = this.registerForm.get('telefone')?.value;

    if (!otpCodeCtrl?.value || otpCodeCtrl.invalid) {
      this.otpError = 'Introduza um código OTP válido de 6 dígitos.';
      return;
    }

    const isValid = this.auth.verificarOTP(telefone, otpCodeCtrl.value);
    if (isValid) {
      this.otpVerificado = true;
      this.otpError = '';
      clearInterval(this.otpTimer);
      this.currentStep = 2;
      this.snack.open('Número de telefone verificado com sucesso!', 'OK', { duration: 3000, panelClass: ['snackbar-success'] });
    } else {
      this.otpError = 'Código OTP incorreto ou expirado. Tente novamente.';
    }
  }

  voltarPasso(passo: number): void {
    this.currentStep = passo;
  }

  avancarPasso2(): void {
    const tipoCtrl = this.registerForm.get('tipo');
    const passwordCtrl = this.registerForm.get('password');
    const confirmPasswordCtrl = this.registerForm.get('confirmPassword');

    if (tipoCtrl?.invalid || passwordCtrl?.invalid || confirmPasswordCtrl?.invalid || this.registerForm.hasError('mismatch')) {
      tipoCtrl?.markAsTouched();
      passwordCtrl?.markAsTouched();
      confirmPasswordCtrl?.markAsTouched();
      return;
    }

    this.currentStep = 3;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formVal = this.registerForm.value;

    setTimeout(() => {
      const result = this.auth.register({
        nome: formVal.nome,
        telefone: formVal.telefone,
        password: formVal.password,
        tipo: formVal.tipo,
        provincia: formVal.provincia,
        distrito: formVal.distrito,
        descricao: formVal.descricao,
        areaCultivo: formVal.areaCultivo || undefined,
        numMembros: formVal.numMembros || undefined,
        nomeAssociacao: formVal.nomeAssociacao || undefined,
        tipoComprador: formVal.tipoComprador || undefined,
        produtosInteresse: formVal.produtosInteresse || undefined,
        tipoInstituicao: formVal.tipoInstituicao || undefined
      } as Omit<User, 'id'>);

      this.isLoading = false;

      if (result.success) {
        this.snack.open(result.message + ' Bem-vindo ao AlvorField!', 'OK', {
          duration: 4000,
          panelClass: ['snackbar-success']
        });
        this.router.navigate(['/dashboard']);
      } else {
        this.snack.open(result.message, 'Fechar', {
          duration: 4000,
          panelClass: ['snackbar-error']
        });
      }
    }, 800);
  }
}
