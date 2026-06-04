import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User, UserType } from '../../services/auth.service';
import { LocationService, Province } from '../../services/location.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EvaluationService, Evaluation } from '../../services/evaluation.service';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    FormsModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: Omit<User, 'password'> | null = null;
  isLoading = false;

  provinces: Province[] = [];
  districts: string[] = [];

  // Denúncia de avaliações no perfil
  showReportModal = false;
  evaluationToReportId: string | number | null = null;
  reportReason = '';

  userReviews: Evaluation[] = [];
  reputationAverage = 5.0;
  reputationTotal = 0;
  completedTransactions = 0;


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
  institutionTypes = ['Banco', 'Fundo de Impacto', 'ONG', 'Governo', 'Outro'];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private locationService: LocationService,
    private snack: MatSnackBar,
    private router: Router,
    public evaluationService: EvaluationService
  ) {
    this.profileForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      telefone: [{ value: '', disabled: true }], // Imutável
      tipo: [{ value: '', disabled: true }], // Imutável no perfil para simplificar, ou apenas visualização
      provincia: ['', Validators.required],
      distrito: ['', Validators.required],
      descricao: ['', [Validators.required, Validators.maxLength(250)]],
      email: ['', [Validators.email]],

      // Preferências de Notificação (RF-60)
      notifSMS_otp: [true],
      notifSMS_interesse: [true],
      notifSMS_aceite: [true],
      notifSMS_recusa: [true],
      notifEmail_otp: [true],
      notifEmail_interesse: [true],
      notifEmail_aceite: [true],
      notifEmail_recusa: [true],
      notifPush_otp: [true],
      notifPush_interesse: [true],
      notifPush_aceite: [true],
      notifPush_recusa: [true],

      // Campos específicos condicionais
      areaCultivo: [null],
      numMembros: [null],
      nomeAssociacao: [''],
      tipoComprador: [''],
      produtosInteresse: [[]],
      tipoInstituicao: ['']
    });
  }

  async ngOnInit(): Promise<void> {
    this.provinces = this.locationService.getProvinces();
    this.currentUser = this.auth.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Escutar mudanças de província para atualizar distritos
    this.profileForm.get('provincia')?.valueChanges.subscribe((prov) => {
      this.districts = this.locationService.getDistrictsForProvince(prov);
    });

    this.carregarDadosUtilizador();
    await this.loadReputationAndReviews();
  }

  async loadReputationAndReviews(): Promise<void> {
    if (!this.currentUser) return;
    const reputation = await this.evaluationService.getUserReputation(this.currentUser.id);
    this.reputationAverage = reputation.average;
    this.reputationTotal = reputation.total;
    this.completedTransactions = await this.evaluationService.getCompletedTransactionsCount(this.currentUser.id);
    this.userReviews = await this.evaluationService.getEvaluationsForUser(this.currentUser.id);
  }

  private carregarDadosUtilizador(): void {
    if (!this.currentUser) return;

    // Disparar a carga de distritos para a província atual do utilizador
    this.districts = this.locationService.getDistrictsForProvince(this.currentUser.provincia);

    this.profileForm.patchValue({
      nome: this.currentUser.nome,
      telefone: this.currentUser.telefone,
      tipo: this.currentUser.tipo,
      provincia: this.currentUser.provincia,
      distrito: this.currentUser.distrito,
      descricao: this.currentUser.descricao || '',
      email: this.currentUser.email || '',
      notifSMS_otp: this.currentUser.notifSMS_otp !== false,
      notifSMS_interesse: this.currentUser.notifSMS_interesse !== false,
      notifSMS_aceite: this.currentUser.notifSMS_aceite !== false,
      notifSMS_recusa: this.currentUser.notifSMS_recusa !== false,
      notifEmail_otp: this.currentUser.notifEmail_otp !== false,
      notifEmail_interesse: this.currentUser.notifEmail_interesse !== false,
      notifEmail_aceite: this.currentUser.notifEmail_aceite !== false,
      notifEmail_recusa: this.currentUser.notifEmail_recusa !== false,
      notifPush_otp: this.currentUser.notifPush_otp !== false,
      notifPush_interesse: this.currentUser.notifPush_interesse !== false,
      notifPush_aceite: this.currentUser.notifPush_aceite !== false,
      notifPush_recusa: this.currentUser.notifPush_recusa !== false,
      areaCultivo: this.currentUser.areaCultivo,
      numMembros: this.currentUser.numMembros,
      nomeAssociacao: this.currentUser.nomeAssociacao || '',
      tipoComprador: this.currentUser.tipoComprador || '',
      produtosInteresse: this.currentUser.produtosInteresse || [],
      tipoInstituicao: this.currentUser.tipoInstituicao || ''
    });

    // Aplicar validadores específicos baseados no tipo do utilizador
    this.updateConditionalValidators(this.currentUser.tipo);
  }

  private updateConditionalValidators(tipo: UserType): void {
    const areaCultivo = this.profileForm.get('areaCultivo');
    const numMembros = this.profileForm.get('numMembros');
    const nomeAssociacao = this.profileForm.get('nomeAssociacao');
    const tipoComprador = this.profileForm.get('tipoComprador');
    const produtosInteresse = this.profileForm.get('produtosInteresse');
    const tipoInstituicao = this.profileForm.get('tipoInstituicao');

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

    areaCultivo?.updateValueAndValidity();
    numMembros?.updateValueAndValidity();
    nomeAssociacao?.updateValueAndValidity();
    tipoComprador?.updateValueAndValidity();
    produtosInteresse?.updateValueAndValidity();
    tipoInstituicao?.updateValueAndValidity();
  }

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formVal = this.profileForm.getRawValue();

    try {
      const result = await this.auth.atualizarPerfil({
        nome: formVal.nome,
        provincia: formVal.provincia,
        distrito: formVal.distrito,
        descricao: formVal.descricao,
        areaCultivo: formVal.areaCultivo || undefined,
        numMembros: formVal.numMembros || undefined,
        nomeAssociacao: formVal.nomeAssociacao || undefined,
        tipoComprador: formVal.tipoComprador || undefined,
        produtosInteresse: formVal.produtosInteresse || undefined,
        tipoInstituicao: formVal.tipoInstituicao || undefined,
        email: formVal.email || '',
        notifSMS_otp: formVal.notifSMS_otp,
        notifSMS_interesse: formVal.notifSMS_interesse,
        notifSMS_aceite: formVal.notifSMS_aceite,
        notifSMS_recusa: formVal.notifSMS_recusa,
        notifEmail_otp: formVal.notifEmail_otp,
        notifEmail_interesse: formVal.notifEmail_interesse,
        notifEmail_aceite: formVal.notifEmail_aceite,
        notifEmail_recusa: formVal.notifEmail_recusa,
        notifPush_otp: formVal.notifPush_otp,
        notifPush_interesse: formVal.notifPush_interesse,
        notifPush_aceite: formVal.notifPush_aceite,
        notifPush_recusa: formVal.notifPush_recusa
      });

      this.isLoading = false;

      if (result.success) {
        this.snack.open(result.message, 'OK', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
        this.currentUser = this.auth.getCurrentUser(); // recarregar utilizador
        await this.loadReputationAndReviews();
      } else {
        this.snack.open(result.message, 'Fechar', {
          duration: 4000,
          panelClass: ['snackbar-error']
        });
      }
    } catch (e: any) {
      this.isLoading = false;
      this.snack.open('Erro ao atualizar perfil.', 'Fechar', { duration: 4000 });
    }
  }

  voltar(): void {
    this.router.navigate(['/dashboard']);
  }

  abrirModalReportar(evaluationId: string | number): void {
    this.evaluationToReportId = evaluationId;
    this.reportReason = '';
    this.showReportModal = true;
  }

  async submeterDenuncia(): Promise<void> {
    if (this.evaluationToReportId === null || !this.reportReason) return;
    try {
      await this.evaluationService.reportEvaluation(this.evaluationToReportId, this.reportReason);
      this.snack.open('Avaliação denunciada aos administradores.', 'OK', { duration: 3000 });
      this.showReportModal = false;
      this.evaluationToReportId = null;
      await this.loadReputationAndReviews();
    } catch (e: any) {
      this.snack.open('Erro ao denunciar avaliação.', 'Fechar', { duration: 4000 });
    }
  }
}
