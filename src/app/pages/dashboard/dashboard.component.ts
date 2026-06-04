import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { LocationService, Province } from '../../services/location.service';
import { OfferService, Offer, OfferStatus } from '../../services/offer.service';
import { InterestService, Interest } from '../../services/interest.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';

interface Connection {
  produtor: string;
  consumidor: string;
  distrito: string;
  produto: string;
  quantidade: string;
  status: string;
  timestamp: string;
}

interface PriceTicker {
  produto: string;
  preco: string;
  variacao: string;
  subiu: boolean;
}

interface BuyerProposal {
  id: number;
  comprador: string;
  produto: string;
  quantidade: string;
  precoOferecido: string;
  status: 'Pendente' | 'Aceito' | 'Recusado';
}

interface PurchaseRequest {
  id: number;
  produto: string;
  quantidade: string;
  precoMaximo: string;
  status: string;
  propostas: number;
}

interface InvestmentProject {
  id: number;
  titulo: string;
  produtor: string;
  valorNecessario: number;
  valorArrecadado: number;
  categoria: string;
  retorno: string;
  descricao: string;
}

interface InvestedProject {
  id: number;
  titulo: string;
  investido: number;
  retornoAcumulado: number;
  progressoCultura: number;
  estagioCultura: string;
  previsaoColheita: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTabsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected readonly Math = Math;
  user: Omit<User, 'password'> | null = null;
  greeting = '';

  // Modais de Simulação
  showOfferModal = false;
  showBidModal = false;
  showRequestModal = false;
  showInvestModal = false;
  showDeleteConfirmModal = false;
  offerToDeleteId: number | null = null;

  // Form de Oferta
  newOffer = {
    produto: '',
    quantidade: null as number | null,
    unidade: 'kg' as 'kg' | 'ton',
    dataInicio: '',
    dataFim: '',
    precoUnitario: null as number | null,
    provincia: '',
    distrito: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    fotos: [] as string[]
  };
  editingOfferId: number | null = null;

  // Dropdown e localizações
  productsList: string[] = [];
  provincesList: Province[] = [];
  districtsList: string[] = [];

  // Geolocalização
  loadingLocation = false;
  locationDenied = false;

  newRequest = { produto: '', quantidade: '', precoMaximo: '' };
  newBid = { preco: '', quantidade: '' };
  investAmount = 50000;

  // Itens Selecionados para Modais
  selectedOfferForBid: Offer | null = null;
  selectedProjectForInvestment: InvestmentProject | null = null;

  // Busca e Filtros
  searchQuery = '';
  selectedProvince = 'Todas';
  priceSearch = '';

  // Provedor de províncias para filtros
  provincias = ['Todas', 'Maputo', 'Gaza', 'Inhambane', 'Sofala', 'Nampula'];

  // Dados Compartilhados / Conexões Recentes no ecossistema AlvorField
  connections: Connection[] = [
    {
      produtor: 'Mateus Tembe',
      consumidor: 'Lúcia Maputo',
      distrito: 'Bilene → Maputo',
      produto: 'Tomate Calibre A',
      quantidade: '2.5 Toneladas',
      status: 'Concluído',
      timestamp: 'Há 2 horas'
    },
    {
      produtor: 'Cooperativa de Chókwè',
      consumidor: 'Supermercados VIP',
      distrito: 'Chókwè → Maputo',
      produto: 'Arroz de Sequeiro',
      quantidade: '10 Toneladas',
      status: 'Em Trânsito',
      timestamp: 'Há 5 horas'
    },
    {
      produtor: 'Machamba de Namaacha',
      consumidor: 'Hotel Polana',
      distrito: 'Namaacha → Maputo',
      produto: 'Hortelã e Alface Orgânica',
      quantidade: '300 Kg',
      status: 'Acordado',
      timestamp: 'Há 1 dia'
    }
  ];

  // Preços médios de mercado (Moçambique SIMA)
  prices: PriceTicker[] = [
    { produto: 'Tomate (Caixa 20kg)', preco: '950 MT', variacao: '+4.2%', subiu: true },
    { produto: 'Batata Nacional (Saco 10kg)', preco: '420 MT', variacao: '-1.5%', subiu: false },
    { produto: 'Cebola Vermelha (Saco 10kg)', preco: '550 MT', variacao: '+2.8%', subiu: true },
    { produto: 'Milho Branco (Saco 50kg)', preco: '1,200 MT', variacao: '0.0%', subiu: true },
    { produto: 'Feijão Nhemba (Saco 50kg)', preco: '1,850 MT', variacao: '+5.1%', subiu: true },
    { produto: 'Mandioca Fresca (Saco 20kg)', preco: '350 MT', variacao: '-2.0%', subiu: false }
  ];

  // 1. Dados Específicos do Produtor
  produtorOffers: Offer[] = [];
  buyerProposals: BuyerProposal[] = [];
  receivedInterests: Interest[] = [];

  // 2. Dados Específicos do Comprador
  availableOffers: Offer[] = [];
  myPurchaseRequests: PurchaseRequest[] = [];
  sentInterests: Interest[] = [];

  // 3. Dados Específicos do Investidor
  investmentProjects: InvestmentProject[] = [];
  investedProjects: InvestedProject[] = [];

  dashboardCards: { icon: string; title: string; description: string; color: string; action: string }[] = [];

  constructor(
    private authService: AuthService,
    private locationService: LocationService,
    private offerService: OfferService,
    private interestService: InterestService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.setGreeting();
    this.setDashboardCards();
    this.productsList = this.offerService.PREDEFINED_PRODUCTS;
    this.provincesList = this.locationService.getProvinces();
    this.loadMockData();
    this.loadOffers();
    this.loadInterests();
  }

  private setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.greeting = 'Bom dia';
    } else if (hour < 18) {
      this.greeting = 'Boa tarde';
    } else {
      this.greeting = 'Boa noite';
    }
  }

  private setDashboardCards(): void {
    const commonCards = [
      {
        icon: 'map',
        title: 'Geolocalização e Rotas',
        description: 'Explore o mapa interactivo de produtores locais e planeie a logística de transporte.',
        color: '#1565C0',
        action: 'Ver Mapa'
      },
      {
        icon: 'analytics',
        title: 'Inteligência de Mercado',
        description: 'Gráficos e tendências de procura para prever preços e planear épocas de cultivo.',
        color: '#00695C',
        action: 'Ver Relatório'
      }
    ];

    const userTipo = this.user?.tipo;

    if (userTipo === 'Produtor Individual' || userTipo === 'Cooperativa') {
      this.dashboardCards = [
        {
          icon: 'add_photo_alternate',
          title: 'Publicar Nova Oferta',
          description: 'Registe o seu stock disponível, fotos da machamba, preços e previsão de colheita.',
          color: '#2E7D32',
          action: 'openOfferModal'
        },
        {
          icon: 'handshake',
          title: 'Propostas de Compradores',
          description: 'Veja propostas recebidas de supermercados e restaurantes interessados.',
          color: '#E65100',
          action: 'scrollToProposals'
        },
        ...commonCards
      ];
    } else if (userTipo === 'Comprador') {
      this.dashboardCards = [
        {
          icon: 'search',
          title: 'Pesquisar Produtores',
          description: 'Encontre machambas e cooperativas próximas filtrando por província, produto e cultivo.',
          color: '#E65100',
          action: 'scrollToMarket'
        },
        {
          icon: 'shopping_cart',
          title: 'Pedidos de Cotação',
          description: 'Publique o que a sua empresa necessita para que produtores lhe façam ofertas directas.',
          color: '#2E7D32',
          action: 'openRequestModal'
        },
        ...commonCards
      ];
    } else if (userTipo === 'Investidor') {
      this.dashboardCards = [
        {
          icon: 'trending_up',
          title: 'Projectos Agrícolas',
          description: 'Analise fichas técnicas de machambas à procura de capital para estufas e furos de água.',
          color: '#1565C0',
          action: 'scrollToProjects'
        },
        {
          icon: 'shield',
          title: 'Garantias & Contratos',
          description: 'Acompanhe os contratos inteligentes celebrados com produtores financiados.',
          color: '#7B1FA2',
          action: 'scrollToContracts'
        },
        ...commonCards
      ];
    }
  }

  private loadMockData(): void {
    // Carrega dados simulados do localStorage se existirem, senão inicializa padrões
    const isProdutor = this.user?.tipo === 'Produtor Individual' || this.user?.tipo === 'Cooperativa';
    const isComprador = this.user?.tipo === 'Comprador';
    const isInvestidor = this.user?.tipo === 'Investidor';

    if (isProdutor) {
      const localProposals = localStorage.getItem('alvor_buyer_proposals');
      this.buyerProposals = localProposals ? JSON.parse(localProposals) : [
        { id: 1, comprador: 'Supermercados VIP', produto: 'Tomate', quantidade: '2.0 Toneladas', precoOferecido: '42 MT/Kg', status: 'Pendente' },
        { id: 2, comprador: 'Hotel Polana', produto: 'Cebola Vermelha', quantidade: '500 Kg', precoOferecido: '53 MT/Kg', status: 'Pendente' }
      ];
    }

    if (isComprador) {
      const localRequests = localStorage.getItem('alvor_purchase_requests');
      this.myPurchaseRequests = localRequests ? JSON.parse(localRequests) : [
        { id: 1, produto: 'Batata Nacional', quantidade: '5 Toneladas', precoMaximo: '42 MT/Kg', status: 'Aberto', propostas: 3 },
        { id: 2, produto: 'Pimento Amarelo', quantidade: '600 Kg', precoMaximo: '90 MT/Kg', status: 'Aberto', propostas: 1 }
      ];
    }

    if (isInvestidor) {
      const localProjects = localStorage.getItem('alvor_invest_projects');
      this.investmentProjects = localProjects ? JSON.parse(localProjects) : [
        { id: 1, titulo: 'Estufa Automatizada e Sensores', produtor: 'Mateus Tembe', valorNecessario: 250000, valorArrecadado: 175000, categoria: 'Tecnologia de Rega', retorno: '15% a.a.', descricao: 'Implementação de estufa com irrigação automatizada e sensores inteligentes para cultivo de tomate em Bilene.' },
        { id: 2, titulo: 'Furo de Água Solar Cooperativo', produtor: 'Cooperativa de Chókwè', valorNecessario: 180000, valorArrecadado: 45000, categoria: 'Infraestrutura Hídrica', retorno: '12% a.a.', descricao: 'Bomba solar e canalização para irrigação sustentável de 5 hectares de arroz em Chókwè.' },
        { id: 3, titulo: 'Câmara Fria Solar Pós-Colheita', produtor: 'Machamba de Namaacha', valorNecessario: 350000, valorArrecadado: 320000, categoria: 'Cadeia Fria & Logística', retorno: '18% a.a.', descricao: 'Câmara de frio alimentada a painéis solares para conservação de hortícolas finas antes do envio a Maputo.' }
      ];

      const localInvested = localStorage.getItem('alvor_invested_projects');
      this.investedProjects = localInvested ? JSON.parse(localInvested) : [
        { id: 1, titulo: 'Estufa Automatizada e Sensores', investido: 50000, retornoAcumulado: 4120, progressoCultura: 75, estagioCultura: 'Frutificação / Maturação', previsaoColheita: 'Julho 2026' }
      ];
    }
  }

  loadOffers(): void {
    if (!this.user) return;
    const isProdutor = this.user.tipo === 'Produtor Individual' || this.user.tipo === 'Cooperativa';
    if (isProdutor) {
      this.produtorOffers = this.offerService.getProducerOffers(this.user.id);
    } else {
      this.availableOffers = this.offerService.getPublicOffers();
    }
  }

  onProvinceChange(): void {
    if (this.newOffer.provincia) {
      this.districtsList = this.locationService.getDistrictsForProvince(this.newOffer.provincia);
      this.newOffer.distrito = ''; // Reset distrito
    } else {
      this.districtsList = [];
    }
  }

  obterGeolocalizacao(): void {
    if (!navigator.geolocation) {
      this.snack.open('A geolocalização não é suportada por este dispositivo/browser.', 'OK', { duration: 3000 });
      return;
    }

    this.loadingLocation = true;
    this.locationDenied = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.newOffer.latitude = Number(position.coords.latitude.toFixed(6));
        this.newOffer.longitude = Number(position.coords.longitude.toFixed(6));
        this.loadingLocation = false;
        this.snack.open('Localização geográfica autodetectada com sucesso!', 'Excelente', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      },
      (error) => {
        this.loadingLocation = false;
        this.locationDenied = true;
        this.snack.open('Permissão de localização negada ou indisponível. Seleccione no mapa manualmente.', 'OK', {
          duration: 4000
        });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }

  selecionarCoordenadasMapa(lat: number, lng: number): void {
    this.newOffer.latitude = lat;
    this.newOffer.longitude = lng;
    this.snack.open(`Coordenadas marcadas manualmente: Lat ${lat}, Lng ${lng}`, 'OK', { duration: 2500 });
  }

  handlePhotoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    
    if (this.newOffer.fotos.length + files.length > 5) {
      this.snack.open('O sistema permite adicionar até no máximo 5 fotos.', 'Erro', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      return;
    }

    for (const file of files) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        this.snack.open(`Formato de ficheiro inválido para ${file.name}. Use apenas JPG ou PNG.`, 'Erro', { duration: 3500 });
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.snack.open(`O ficheiro ${file.name} ultrapassa o limite de 5MB por foto.`, 'Erro', { duration: 3500 });
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newOffer.fotos.push(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(index: number): void {
    this.newOffer.fotos.splice(index, 1);
  }

  abrirModalNovaOferta(): void {
    this.editingOfferId = null;
    this.newOffer = {
      produto: '',
      quantidade: null,
      unidade: 'kg',
      dataInicio: '',
      dataFim: '',
      precoUnitario: null,
      provincia: this.user?.provincia || '',
      distrito: this.user?.distrito || '',
      latitude: undefined,
      longitude: undefined,
      fotos: []
    };
    if (this.newOffer.provincia) {
      this.districtsList = this.locationService.getDistrictsForProvince(this.newOffer.provincia);
    }
    this.showOfferModal = true;
  }

  abrirModalEditarOferta(offer: Offer): void {
    this.editingOfferId = offer.id;
    this.newOffer = {
      produto: offer.produto,
      quantidade: offer.quantidade,
      unidade: offer.unidade,
      dataInicio: offer.dataInicio,
      dataFim: offer.dataFim,
      precoUnitario: offer.precoUnitario,
      provincia: offer.provincia,
      distrito: offer.distrito,
      latitude: offer.latitude,
      longitude: offer.longitude,
      fotos: [...offer.fotos]
    };
    this.districtsList = this.locationService.getDistrictsForProvince(offer.provincia);
    this.showOfferModal = true;
  }

  // Ações Gerais
  getUserTypeIcon(): string {
    const tipo = this.user?.tipo;
    if (tipo === 'Produtor Individual' || tipo === 'Cooperativa') {
      return 'agriculture';
    } else if (tipo === 'Comprador') {
      return 'shopping_basket';
    } else if (tipo === 'Investidor') {
      return 'trending_up';
    }
    return 'person';
  }

  triggerAction(actionName: string): void {
    if (actionName === 'openOfferModal') {
      this.abrirModalNovaOferta();
    } else if (actionName === 'openRequestModal') {
      this.showRequestModal = true;
    } else if (actionName === 'scrollToProposals') {
      document.getElementById('propostas-seccao')?.scrollIntoView({ behavior: 'smooth' });
    } else if (actionName === 'scrollToMarket') {
      this.router.navigate(['/mercado']);
    } else if (actionName === 'scrollToProjects') {
      document.getElementById('projetos-seccao')?.scrollIntoView({ behavior: 'smooth' });
    } else if (actionName === 'scrollToContracts') {
      document.getElementById('contratos-seccao')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      this.snack.open(`Funcionalidade "${actionName}" simulada com sucesso!`, 'OK', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
    }
  }

  // ==========================================
  // 1. AÇÕES DO PRODUTOR
  // ==========================================
  publishOffer(isDraft = false): void {
    if (
      !this.newOffer.produto ||
      this.newOffer.quantidade === null ||
      this.newOffer.precoUnitario === null ||
      !this.newOffer.dataInicio ||
      !this.newOffer.dataFim ||
      !this.newOffer.provincia ||
      !this.newOffer.distrito
    ) {
      this.snack.open('Por favor, preencha todos os campos obrigatórios marcados.', 'OK', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      return;
    }

    const start = new Date(this.newOffer.dataInicio);
    const end = new Date(this.newOffer.dataFim);
    if (end < start) {
      this.snack.open('A data de fim não pode ser anterior à data de início.', 'Erro', { duration: 3000 });
      return;
    }

    const offerData = {
      produto: this.newOffer.produto,
      quantidade: Number(this.newOffer.quantidade),
      unidade: this.newOffer.unidade,
      dataInicio: this.newOffer.dataInicio,
      dataFim: this.newOffer.dataFim,
      precoUnitario: Number(this.newOffer.precoUnitario),
      provincia: this.newOffer.provincia,
      distrito: this.newOffer.distrito,
      latitude: this.newOffer.latitude,
      longitude: this.newOffer.longitude,
      fotos: this.newOffer.fotos,
      estado: (isDraft ? 'Rascunho' : 'Activa') as OfferStatus
    };

    try {
      if (this.editingOfferId) {
        this.offerService.updateOffer(this.editingOfferId, offerData);
        this.snack.open('Oferta de colheita actualizada com sucesso!', 'Excelente', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      } else {
        this.offerService.createOffer(offerData);
        this.snack.open(
          isDraft ? 'Oferta guardada como Rascunho com sucesso!' : 'Oferta de colheita publicada com sucesso!',
          'Excelente',
          {
            duration: 3000,
            panelClass: ['snackbar-success']
          }
        );
      }
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao guardar oferta.', 'Erro', { duration: 3000 });
      return;
    }

    // Fechar modal e recarregar
    this.showOfferModal = false;
    this.editingOfferId = null;
    this.loadOffers();
  }

  togglePauseOffer(id: number): void {
    this.offerService.togglePauseOffer(id);
    this.loadOffers();
    const offer = this.produtorOffers.find(o => o.id === id);
    if (offer) {
      const msg = offer.estado === 'Pausada' ? 'Oferta pausada (oculta para compradores).' : 'Oferta reactivada com sucesso!';
      this.snack.open(msg, 'OK', { duration: 3000, panelClass: ['snackbar-success'] });
    }
  }

  deleteOffer(id: number): void {
    this.offerToDeleteId = id;
    this.showDeleteConfirmModal = true;
  }

  confirmDeleteOffer(): void {
    if (this.offerToDeleteId !== null) {
      this.offerService.deleteOffer(this.offerToDeleteId);
      this.snack.open('Oferta removida com sucesso.', 'OK', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      this.loadOffers();
    }
    this.showDeleteConfirmModal = false;
    this.offerToDeleteId = null;
  }

  cancelDeleteOffer(): void {
    this.showDeleteConfirmModal = false;
    this.offerToDeleteId = null;
  }

  markAsCompleted(id: number): void {
    this.offerService.markAsCompleted(id);
    this.snack.open('Oferta marcada como Vendida/Concluída manualmente.', 'Excelente', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
    this.loadOffers();
  }

  acceptProposal(proposal: BuyerProposal): void {
    proposal.status = 'Aceito';
    localStorage.setItem('alvor_buyer_proposals', JSON.stringify(this.buyerProposals));

    // Adicionar conexões recentes simuladas
    this.connections.unshift({
      produtor: this.user?.nome || 'Eu',
      consumidor: proposal.comprador,
      distrito: `${this.user?.distrito} → Maputo`,
      produto: proposal.produto,
      quantidade: proposal.quantidade,
      status: 'Concluído',
      timestamp: 'Agora mesmo'
    });

    this.snack.open(`Proposta da ${proposal.comprador} ACEITA com sucesso! Contrato de compra simulado gerado.`, 'Fixe', {
      duration: 4000,
      panelClass: ['snackbar-success']
    });
  }

  declineProposal(proposal: BuyerProposal): void {
    proposal.status = 'Recusado';
    localStorage.setItem('alvor_buyer_proposals', JSON.stringify(this.buyerProposals));
    this.snack.open(`Proposta da ${proposal.comprador} recusada.`, 'OK', { duration: 3000 });
  }

  loadInterests(): void {
    if (!this.user) return;
    this.receivedInterests = this.interestService.getReceivedInterests(this.user.id);
    this.sentInterests = this.interestService.getSentInterests(this.user.id);
  }

  // RF-35, RF-36
  acceptInterest(interest: Interest): void {
    try {
      this.interestService.acceptInterest(interest.id);
      this.snack.open(`Contacto de ${interest.compradorNome} ACEITO com sucesso! O comprador foi notificado por SMS.`, 'Excelente', {
        duration: 4000,
        panelClass: ['snackbar-success']
      });
      // Atualizar conexões
      this.connections.unshift({
        produtor: this.user?.nome || 'Eu',
        consumidor: interest.compradorNome,
        distrito: `${this.user?.distrito} → KaMpfumo`,
        produto: interest.produto,
        quantidade: interest.quantidadePretendida ? `${interest.quantidadePretendida} ${interest.unidade}` : 'N/A',
        status: 'Contacto Partilhado',
        timestamp: 'Agora mesmo'
      });
      this.loadInterests();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao aceitar contacto.', 'OK', { duration: 3000 });
    }
  }

  // RF-35
  refuseInterest(interest: Interest): void {
    try {
      this.interestService.refuseInterest(interest.id);
      this.snack.open(`Manifestação de interesse de ${interest.compradorNome} recusada.`, 'OK', { duration: 3000 });
      this.loadInterests();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao recusar contacto.', 'OK', { duration: 3000 });
    }
  }

  // ==========================================
  // 2. AÇÕES DO COMPRADOR
  // ==========================================
  get filteredOffers(): Offer[] {
    return this.availableOffers.filter(offer => {
      const matchSearch =
        offer.produto.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        offer.produtorNome.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchProv = this.selectedProvince === 'Todas' || offer.provincia === this.selectedProvince;
      return matchSearch && matchProv;
    });
  }

  openBidModal(offer: Offer): void {
    this.selectedOfferForBid = offer;
    this.newBid.preco = String(offer.precoUnitario);
    this.newBid.quantidade = `${offer.quantidade} ${offer.unidade}`;
    this.showBidModal = true;
  }

  submitBid(): void {
    if (!this.selectedOfferForBid || !this.newBid.preco || !this.newBid.quantidade) return;

    this.snack.open(`Proposta de ${this.newBid.preco} MT/Kg para ${this.selectedOfferForBid.produtorNome} enviada!`, 'Sucesso', {
      duration: 3500,
      panelClass: ['snackbar-success']
    });

    // Simula proposta entrando nas propostas recebidas se o produtor local estivesse logado
    const localProposals = localStorage.getItem('alvor_buyer_proposals');
    const proposalsList: BuyerProposal[] = localProposals ? JSON.parse(localProposals) : [];
    proposalsList.unshift({
      id: Date.now(),
      comprador: this.user?.nome || 'Comprador Corporativo',
      produto: this.selectedOfferForBid.produto,
      quantidade: this.newBid.quantidade,
      precoOferecido: `${this.newBid.preco} MT/Kg`,
      status: 'Pendente'
    });
    localStorage.setItem('alvor_buyer_proposals', JSON.stringify(proposalsList));

    this.showBidModal = false;
    this.selectedOfferForBid = null;
  }

  publishPurchaseRequest(): void {
    if (!this.newRequest.produto || !this.newRequest.quantidade || !this.newRequest.precoMaximo) {
      this.snack.open('Por favor, preencha todos os campos.', 'OK', { duration: 3000, panelClass: ['snackbar-error'] });
      return;
    }

    const req: PurchaseRequest = {
      id: Date.now(),
      produto: this.newRequest.produto,
      quantidade: this.newRequest.quantidade,
      precoMaximo: this.newRequest.precoMaximo + ' MT/Kg',
      status: 'Aberto',
      propostas: 0
    };

    this.myPurchaseRequests.unshift(req);
    localStorage.setItem('alvor_purchase_requests', JSON.stringify(this.myPurchaseRequests));

    this.snack.open('Pedido de cotação publicado para todos os produtores!', 'Excelente', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });

    this.newRequest = { produto: '', quantidade: '', precoMaximo: '' };
    this.showRequestModal = false;
  }

  // ==========================================
  // 3. AÇÕES DO INVESTIDOR
  // ==========================================
  openInvestModal(project: InvestmentProject): void {
    this.selectedProjectForInvestment = project;
    this.investAmount = Math.min(project.valorNecessario - project.valorArrecadado, 50000);
    this.showInvestModal = true;
  }

  submitInvestment(): void {
    if (!this.selectedProjectForInvestment || this.investAmount <= 0) return;

    const proj = this.investmentProjects.find(p => p.id === this.selectedProjectForInvestment!.id);
    if (proj) {
      proj.valorArrecadado += Number(this.investAmount);
      localStorage.setItem('alvor_invest_projects', JSON.stringify(this.investmentProjects));

      // Adiciona ao portfolio de projetos financiados pelo investidor
      const existing = this.investedProjects.find(ip => ip.id === proj.id);
      if (existing) {
        existing.investido += Number(this.investAmount);
      } else {
        this.investedProjects.unshift({
          id: proj.id,
          titulo: proj.titulo,
          investido: Number(this.investAmount),
          retornoAcumulado: 0,
          progressoCultura: 10,
          estagioCultura: 'Sementeira iniciada',
          previsaoColheita: 'Setembro 2026'
        });
      }
      localStorage.setItem('alvor_invested_projects', JSON.stringify(this.investedProjects));

      this.snack.open(`Investimento de ${Number(this.investAmount).toLocaleString()} MT em "${proj.titulo}" realizado com sucesso!`, 'Obrigado', {
        duration: 4000,
        panelClass: ['snackbar-success']
      });
    }

    this.showInvestModal = false;
    this.selectedProjectForInvestment = null;
  }

  // ==========================================
  // OUTRAS UTILIDADES
  // ==========================================
  get filteredPrices(): PriceTicker[] {
    if (!this.priceSearch) return this.prices;
    return this.prices.filter(p => p.produto.toLowerCase().includes(this.priceSearch.toLowerCase()));
  }

  logout(): void {
    this.authService.logout();
    this.snack.open('Sessão terminada.', 'Fechar', { duration: 2500 });
  }
}

