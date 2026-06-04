import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User, UserType } from '../../services/auth.service';
import { LocationService, Province } from '../../services/location.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

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
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      telefone: [{ value: '', disabled: true }], // Imutável
      tipo: [{ value: '', disabled: true }], // Imutável no perfil para simplificar, ou apenas visualização
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
    });
  }

  ngOnInit(): void {
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

    // Carregar dados no formulário
    this.carregarDadosUtilizador();
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

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formVal = this.profileForm.getRawValue(); // Usa getRawValue para capturar campos disabled se necessário

    setTimeout(() => {
      const result = this.auth.atualizarPerfil({
        nome: formVal.nome,
        provincia: formVal.provincia,
        distrito: formVal.distrito,
        descricao: formVal.descricao,
        areaCultivo: formVal.areaCultivo || undefined,
        numMembros: formVal.numMembros || undefined,
        nomeAssociacao: formVal.nomeAssociacao || undefined,
        tipoComprador: formVal.tipoComprador || undefined,
        produtosInteresse: formVal.produtosInteresse || undefined,
        tipoInstituicao: formVal.tipoInstituicao || undefined
      });

      this.isLoading = false;

      if (result.success) {
        this.snack.open(result.message, 'OK', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
        this.currentUser = this.auth.getCurrentUser(); // recarregar utilizador
      } else {
        this.snack.open(result.message, 'Fechar', {
          duration: 4000,
          panelClass: ['snackbar-error']
        });
      }
    }, 600);
  }

  voltar(): void {
    this.router.navigate(['/dashboard']);
  }
}
