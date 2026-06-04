import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { LocationService, Province } from '../../services/location.service';
import { OfferService, Offer, OfferStatus } from '../../services/offer.service';
import { InterestService, Interest } from '../../services/interest.service';
import { EvaluationService, Evaluation } from '../../services/evaluation.service';
import { AdminService, AuditLog, ReportRequest } from '../../services/admin.service';
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

  // Reputação e Avaliação Modais
  showEvaluationModal = false;
  selectedInterestForEvaluation: Interest | null = null;
  evalRating = 5;
  evalComment = '';
  
  // Denúncias e Moderação
  showReportModal = false;
  evaluationToReportId: number | null = null;
  reportReason = '';
  reportedEvaluations: Evaluation[] = [];
  allEvaluations: Evaluation[] = [];

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

  // Filtros do Investidor
  investorFilters = {
    produto: 'Todos',
    dataInicio: '',
    dataFim: '',
    quantidadeMin: null as number | null,
    quantidadeMax: null as number | null
  };

  // Solicitação de Relatório
  showReportRequestModal = false;
  customReportRequest = {
    tema: '',
    detalhes: '',
    telefoneMpesa: '',
    pinMpesa: '',
    passoPagamento: 1, // 1: Preenchimento, 2: Pagamento M-Pesa, 3: Sucesso
    processandoPagamento: false
  };

  dashboardCards: { icon: string; title: string; description: string; color: string; action: string }[] = [];

  // ==========================================
  // VARIÁVEIS DO PAINEL DE ADMINISTRAÇÃO (MÓDULO 7)
  // ==========================================
  adminUsers: User[] = [];
  adminOffers: Offer[] = [];
  adminInterests: Interest[] = [];
  adminEvaluations: Evaluation[] = [];
  adminAuditLogs: AuditLog[] = [];
  adminReportRequests: ReportRequest[] = [];
  
  adminStats = {
    totalUsers: 0,
    totalOffers: 0,
    totalInterests: 0,
    totalEvaluations: 0,
    usersByType: {} as { [key: string]: number },
    offersByState: {} as { [key: string]: number },
    interestsPerWeek: 0
  };

  // CRUD de Produtos
  newProductInput = '';
  showProductEditModal = false;
  editingProductOldName = '';
  editingProductNewName = '';

  // Edição Forçada de Ofertas
  showAdminOfferEditModal = false;
  selectedOfferForAdminEdit: Offer | null = null;
  adminOfferEditForm = {
    produto: '',
    quantidade: 0,
    unidade: 'kg' as 'kg' | 'ton',
    precoUnitario: 0,
    dataFim: '',
    provincia: '',
    distrito: ''
  };

  // Resposta a Pedidos de Relatório
  showAdminReportResponseModal = false;
  selectedReportRequestForResponse: ReportRequest | null = null;
  adminReportResponseText = '';

  constructor(
    private authService: AuthService,
    private locationService: LocationService,
    private offerService: OfferService,
    private interestService: InterestService,
    public evaluationService: EvaluationService,
    private adminService: AdminService,
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
    this.loadAdminData();
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
          description: 'Encontre hortícolas, tubérculos e cereais diretamente das machambas de Gaza, Sofala, Sofala, etc.',
          color: '#00695C',
          action: 'scrollToMarket'
        },
        {
          icon: 'shopping_cart',
          title: 'Solicitar Cotação',
          description: 'Publique as necessidades da sua empresa para que os produtores lhe enviem propostas de preço.',
          color: '#3F51B5',
          action: 'openRequestModal'
        },
        ...commonCards
      ];
    } else if (userTipo === 'Investidor') {
      this.dashboardCards = [
        {
          icon: 'trending_up',
          title: 'Oportunidades de Investimento',
          description: 'Consulte projetos de irrigação, mecanização ou sementes selecionadas prontos a financiar.',
          color: '#E65100',
          action: 'scrollToProjects'
        },
        {
          icon: 'assignment',
          title: 'Relatório Agregado',
          description: 'Aceda à sua área exclusiva de análise e exporte dados agregados por região.',
          color: '#2b78e4',
          action: 'openRequestModal'
        },
        ...commonCards
      ];
    }
  }

  loadMockData(): void {
    // Carregar Projetos de Investimento
    const localProj = localStorage.getItem('alvor_invest_projects');
    if (localProj) {
      this.investmentProjects = JSON.parse(localProj);
    } else {
      this.investmentProjects = [
        {
          id: 501,
          titulo: 'Sistema de Rega Gota-a-Gota no Bilene',
          produtor: 'Mateus Tembe',
          valorNecessario: 180000,
          valorArrecadado: 120000,
          categoria: 'Irrigação',
          retorno: '18% a.a.',
          descricao: 'Projeto de instalação de rega localizada para cultura intensiva de batata doce e cebola vermelha.'
        },
        {
          id: 502,
          titulo: 'Mecanização de Machamba de Milho',
          produtor: 'Cooperativa de Chókwè',
          valorNecessario: 450000,
          valorArrecadado: 380000,
          categoria: 'Equipamento',
          retorno: '15% a.a.',
          descricao: 'Aquisição de micro-tractor e alfaias para lavoura e sementeira mecanizada de 20 hectares.'
        }
      ];
      localStorage.setItem('alvor_invest_projects', JSON.stringify(this.investmentProjects));
    }

    // Carregar Carteira de Investimentos
    const localInvested = localStorage.getItem('alvor_invested_projects');
    if (localInvested) {
      this.investedProjects = JSON.parse(localInvested);
    } else {
      this.investedProjects = [
        {
          id: 501,
          titulo: 'Sistema de Rega Gota-a-Gota no Bilene',
          investido: 50000,
          retornoAcumulado: 4500,
          progressoCultura: 65,
          estagioCultura: 'Crescimento vegetativo',
          previsaoColheita: 'Julho 2026'
        }
      ];
      localStorage.setItem('alvor_invested_projects', JSON.stringify(this.investedProjects));
    }

    // Propostas de Compradores
    const localProposals = localStorage.getItem('alvor_buyer_proposals');
    if (localProposals) {
      this.buyerProposals = JSON.parse(localProposals);
    } else {
      this.buyerProposals = [
        {
          id: 301,
          comprador: 'Supermercado Lúcia S.A.',
          produto: 'Tomate Calibre A',
          quantidade: '2.5 Toneladas',
          precoOferecido: '43.00 MT/Kg',
          status: 'Pendente'
        },
        {
          id: 302,
          comprador: 'Restaurante Costa do Sol',
          produto: 'Cebola Vermelha',
          quantidade: '500 Kg',
          precoOferecido: '52.50 MT/Kg',
          status: 'Pendente'
        }
      ];
      localStorage.setItem('alvor_buyer_proposals', JSON.stringify(this.buyerProposals));
    }

    // Pedidos de Cotação do Comprador
    const localReqs = localStorage.getItem('alvor_purchase_requests');
    if (localReqs) {
      this.myPurchaseRequests = JSON.parse(localReqs);
    } else {
      this.myPurchaseRequests = [
        {
          id: 401,
          produto: 'Milho Branco Moçambicano',
          quantidade: '8 Toneladas',
          precoMaximo: '26.00 MT/Kg',
          status: 'Aberto',
          propostas: 3
        }
      ];
      localStorage.setItem('alvor_purchase_requests', JSON.stringify(this.myPurchaseRequests));
    }
  }

  loadOffers(): void {
    this.produtorOffers = this.offerService.getOffers().filter(o => o.produtorId === this.user?.id);
    this.availableOffers = this.offerService.getPublicOffers();
  }

  onProvinceChange(): void {
    if (this.newOffer.provincia) {
      this.districtsList = this.locationService.getDistrictsForProvince(this.newOffer.provincia);
      this.newOffer.distrito = '';
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

  acceptInterest(interest: Interest): void {
    try {
      this.interestService.acceptInterest(interest.id);
      this.snack.open(`Contacto de ${interest.compradorNome} ACEITO com sucesso! O comprador foi notificado por SMS.`, 'Excelente', {
        duration: 4000,
        panelClass: ['snackbar-success']
      });
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

  get filteredPrices(): PriceTicker[] {
    if (!this.priceSearch) return this.prices;
    return this.prices.filter(p => p.produto.toLowerCase().includes(this.priceSearch.toLowerCase()));
  }

  logout(): void {
    this.authService.logout();
    this.snack.open('Sessão terminada.', 'Fechar', { duration: 2500 });
  }

  // ==========================================
  // AÇÕES DE AVALIAÇÃO E REPUTAÇÃO (MODULO 5)
  // ==========================================
  get pendingConfirmations(): Interest[] {
    if (!this.user) return [];
    const myInterests = this.receivedInterests.concat(this.sentInterests);
    
    return myInterests.filter(i => {
      if (i.status !== 'Aceite') return false;
      if (this.user!.id === i.compradorId && i.compradorConfirmou !== null && i.compradorConfirmou !== undefined) return false;
      if (this.user!.id === i.produtorId && i.produtorConfirmou !== null && i.produtorConfirmou !== undefined) return false;

      const dataAceite = i.dataAceite || i.dataInteresse;
      const seteDias = 7 * 24 * 60 * 60 * 1000;
      return (Date.now() - dataAceite) >= seteDias;
    });
  }

  get pendingEvaluationsList(): Interest[] {
    if (!this.user) return [];
    const myInterests = this.receivedInterests.concat(this.sentInterests);
    
    return myInterests.filter(i => {
      if (i.status !== 'Aceite') return false;
      if (this.user!.id === i.compradorId) {
        return i.compradorConfirmou === true && !i.compradorAvaliou;
      } else if (this.user!.id === i.produtorId) {
        return i.produtorConfirmou === true && !i.produtorAvaliou;
      }
      return false;
    });
  }

  confirmCompletion(interest: Interest, confirmed: boolean): void {
    if (!this.user) return;
    try {
      this.interestService.confirmTransaction(interest.id, this.user.id, confirmed);
      if (confirmed) {
        this.snack.open('Marcou como Concluída! Por favor, avalie o seu parceiro comercial.', 'OK', {
          duration: 4000,
          panelClass: ['snackbar-success']
        });
        this.abrirModalAvaliacao(interest);
      } else {
        this.snack.open('Respondeu "Não" à conclusão da transação.', 'OK', { duration: 3000 });
      }
      this.loadInterests();
      this.loadOffers();
      this.loadAdminData();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao processar resposta.', 'Erro', { duration: 3000 });
    }
  }

  simulateTimePassed(interest: Interest): void {
    this.interestService.simulateSevenDaysPassed(interest.id);
    this.snack.open('Tempo adiantado: A transação foi colocada há mais de 7 dias no passado.', 'Excelente', {
      duration: 3500,
      panelClass: ['snackbar-success']
    });
    this.loadInterests();
  }

  abrirModalAvaliacao(interest: Interest): void {
    this.selectedInterestForEvaluation = interest;
    this.evalRating = 5;
    this.evalComment = '';
    this.showEvaluationModal = true;
  }

  submeterAvaliacao(): void {
    if (!this.selectedInterestForEvaluation || !this.user) return;

    const interest = this.selectedInterestForEvaluation;
    const isComprador = this.user.id === interest.compradorId;
    const toUserId = isComprador ? interest.produtorId : interest.compradorId;
    const toUserName = isComprador ? interest.produtorNome : interest.compradorNome;

    try {
      this.evaluationService.createEvaluation(
        interest.id,
        this.user.id,
        this.user.nome,
        toUserId,
        toUserName,
        this.evalRating,
        this.evalComment
      );

      this.interestService.markAsRated(interest.id, this.user.id);

      this.snack.open(`Avaliação submetida com sucesso para ${toUserName}!`, 'Sucesso', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });

      this.showEvaluationModal = false;
      this.selectedInterestForEvaluation = null;
      this.loadInterests();
      this.loadOffers();
      this.loadAdminData();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao guardar avaliação.', 'Erro', { duration: 3000 });
    }
  }

  // RF-44 & RF-50: Administrador - carregar dados de moderação e consola global
  loadAdminData(): void {
    if (this.user?.isAdmin) {
      this.reportedEvaluations = this.evaluationService.getReportedEvaluations();
      this.allEvaluations = this.evaluationService.getAllEvaluations();
      this.loadAdminPanelData();
    }
  }

  abrirModalReportar(evaluationId: number): void {
    this.evaluationToReportId = evaluationId;
    this.reportReason = '';
    this.showReportModal = true;
  }

  submeterDenuncia(): void {
    if (this.evaluationToReportId === null || !this.reportReason) return;

    this.evaluationService.reportEvaluation(this.evaluationToReportId, this.reportReason);
    this.snack.open('A sua denúncia foi enviada para análise da administração.', 'Obrigado', { duration: 3500 });
    this.showReportModal = false;
    this.evaluationToReportId = null;
    this.loadAdminData();
  }

  removerAvaliacao(evaluationId: number): void {
    if (!this.user?.isAdmin) return;
    this.evaluationService.removeEvaluation(evaluationId);
    
    // Log de auditoria para remoção de avaliação
    this.adminService.logAction(
      this.user.nome,
      'Removeu Avaliação',
      `ID da Avaliação: ${evaluationId}`
    );

    this.snack.open('Avaliação removida permanentemente do sistema.', 'Painel Admin', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
    this.loadAdminData();
    this.loadOffers();
  }

  // ==========================================
  // 4. AÇÕES DE INVESTIDOR (MÓDULO 6)
  // ==========================================
  get aggregatedOffers(): Array<{
    produto: string;
    provincia: string;
    distrito: string;
    volumeTotalKg: number;
    quantidadeOfertas: number;
    volumeFormatado: string;
  }> {
    const allActiveOffers = this.offerService.getPublicOffers();
    
    const filtered = allActiveOffers.filter(offer => {
      if (this.investorFilters.produto !== 'Todos' && offer.produto !== this.investorFilters.produto) {
        return false;
      }
      
      const qtyInKg = offer.unidade === 'ton' ? offer.quantidade * 1000 : offer.quantidade;
      
      if (this.investorFilters.quantidadeMin !== null && this.investorFilters.quantidadeMin !== undefined && qtyInKg < this.investorFilters.quantidadeMin) {
        return false;
      }
      if (this.investorFilters.quantidadeMax !== null && this.investorFilters.quantidadeMax !== undefined && qtyInKg > this.investorFilters.quantidadeMax) {
        return false;
      }
      
      if (this.investorFilters.dataInicio) {
        const filterStart = new Date(this.investorFilters.dataInicio);
        const offerEnd = new Date(offer.dataFim);
        if (offerEnd < filterStart) return false;
      }
      if (this.investorFilters.dataFim) {
        const filterEnd = new Date(this.investorFilters.dataFim);
        const offerStart = new Date(offer.dataInicio);
        if (offerStart > filterEnd) return false;
      }
      
      return true;
    });
    
    const map = new Map<string, {
      produto: string;
      provincia: string;
      distrito: string;
      volumeTotalKg: number;
      quantidadeOfertas: number;
      volumeFormatado: string;
    }>();

    filtered.forEach(o => {
      const key = `${o.produto}|${o.provincia}|${o.distrito}`;
      const qtyInKg = o.unidade === 'ton' ? o.quantidade * 1000 : o.quantidade;
      
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.volumeTotalKg += qtyInKg;
        existing.quantidadeOfertas += 1;
      } else {
        map.set(key, {
          produto: o.produto,
          provincia: o.provincia,
          distrito: o.distrito,
          volumeTotalKg: qtyInKg,
          quantidadeOfertas: 1,
          volumeFormatado: ''
        });
      }
    });
    
    const result = Array.from(map.values());
    result.forEach(r => {
      if (r.volumeTotalKg >= 1000) {
        r.volumeFormatado = `${(r.volumeTotalKg / 1000).toFixed(1)} Toneladas`;
      } else {
        r.volumeFormatado = `${r.volumeTotalKg} Kg`;
      }
    });
    
    return result.sort((a, b) => b.volumeTotalKg - a.volumeTotalKg);
  }

  exportarDadosAgregadosCSV(): void {
    const data = this.aggregatedOffers;
    if (data.length === 0) {
      this.snack.open('Não há dados agregados para exportar com os filtros atuais.', 'OK', { duration: 3000 });
      return;
    }
    
    let csvContent = '\ufeffProduto,Provincia,Distrito,Volume Total (Kg),Quantidade de Ofertas,Volume Formatado\n';
    data.forEach(row => {
      csvContent += `"${row.produto}","${row.provincia}","${row.distrito}",${row.volumeTotalKg},${row.quantidadeOfertas},"${row.volumeFormatado}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `alvorfield_dados_agregados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.snack.open('Dados agregados exportados para CSV com sucesso!', 'Excelente', {
      duration: 3500,
      panelClass: ['snackbar-success']
    });
  }

  abrirModalSolicitarRelatorio(): void {
    this.customReportRequest = {
      tema: '',
      detalhes: '',
      telefoneMpesa: '',
      pinMpesa: '',
      passoPagamento: 1,
      processandoPagamento: false
    };
    this.showReportRequestModal = true;
  }
  
  avancarParaPagamento(): void {
    if (!this.customReportRequest.tema || !this.customReportRequest.detalhes) {
      this.snack.open('Por favor, preencha o tema e os detalhes do relatório.', 'Erro', { duration: 3000 });
      return;
    }
    this.customReportRequest.passoPagamento = 2;
  }
  
  confirmarPagamentoMpesa(): void {
    if (!this.customReportRequest.telefoneMpesa || !this.customReportRequest.pinMpesa) {
      this.snack.open('Por favor, introduza o número M-Pesa e o PIN.', 'Erro', { duration: 3000 });
      return;
    }
    
    this.customReportRequest.processandoPagamento = true;
    
    // Simula tempo de processamento da transação M-Pesa
    setTimeout(() => {
      this.customReportRequest.processandoPagamento = false;
      this.customReportRequest.passoPagamento = 3;
      
      this.snack.open('Pagamento M-Pesa simulado com sucesso!', 'OK', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });

      // Salvar a solicitação no serviço de administração
      this.adminService.createReportRequest(
        this.user!.id,
        this.user!.nome,
        this.customReportRequest.tema,
        this.customReportRequest.detalhes,
        this.customReportRequest.telefoneMpesa
      );
      
      console.log('--- EMAIL SIMULADO AO ADMINISTRADOR ---');
      console.log('Para: admin@alvorfield.co.mz');
      console.log('Assunto: Pedido de Relatório Personalizado - Pago via M-Pesa');
      console.log(`Investidor: ${this.user?.nome} (ID: ${this.user?.id})`);
      console.log(`Tema do Relatório: ${this.customReportRequest.tema}`);
      console.log(`Detalhes: ${this.customReportRequest.detalhes}`);
      console.log(`Pagamento M-Pesa: Confirmado (Telefone: ${this.customReportRequest.telefoneMpesa})`);
      console.log('---------------------------------------');

      this.loadAdminData();
    }, 2000);
  }

  // ==========================================================
  // MÓDULO 7: GESTÃO DO PAINEL DE ADMINISTRAÇÃO (RF-50 A RF-56)
  // ==========================================================
  
  loadAdminPanelData(): void {
    // RF-50: Visão completa de todos os utilizadores, ofertas, interesses e avaliações
    this.adminUsers = this.authService.getAllUsersWithDeleted();
    this.adminOffers = this.offerService.getOffers();
    
    // Ler interesses em localStorage de forma global
    const localInts = localStorage.getItem('alvorfield_interests');
    this.adminInterests = localInts ? JSON.parse(localInts) : [];
    
    this.adminEvaluations = this.evaluationService.getAllEvaluations();
    this.adminAuditLogs = this.adminService.getAuditLogs();
    this.adminReportRequests = this.adminService.getReportRequests();

    // RF-53: Calcular estatísticas dinâmicas
    this.calculateAdminStats();
  }

  private calculateAdminStats(): void {
    // Número de utilizadores por tipo
    const typeCounts: { [key: string]: number } = {
      'Produtor Individual': 0,
      'Cooperativa': 0,
      'Comprador': 0,
      'Investidor': 0
    };
    let activeUserCount = 0;
    this.adminUsers.forEach(u => {
      if (u.status !== 'Eliminado') {
        typeCounts[u.tipo] = (typeCounts[u.tipo] || 0) + 1;
        activeUserCount++;
      }
    });

    // Ofertas por estado
    const stateCounts: { [key: string]: number } = {
      'Activa': 0,
      'Pausada': 0,
      'Expirada': 0,
      'Concluída': 0,
      'Rascunho': 0
    };
    this.adminOffers.forEach(o => {
      stateCounts[o.estado] = (stateCounts[o.estado] || 0) + 1;
    });

    // Interesses criados na última semana (tempo simulado ou real)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekInterests = this.adminInterests.filter(i => i.dataInteresse >= sevenDaysAgo).length;

    this.adminStats = {
      totalUsers: activeUserCount,
      totalOffers: this.adminOffers.length,
      totalInterests: this.adminInterests.length,
      totalEvaluations: this.adminEvaluations.length,
      usersByType: typeCounts,
      offersByState: stateCounts,
      interestsPerWeek: weekInterests
    };
  }

  // RF-51: Activar, Suspender ou Eliminar qualquer conta de utilizador
  alterarEstadoUtilizador(userId: number, novoEstado: 'Activo' | 'Suspenso' | 'Eliminado'): void {
    if (!this.user?.isAdmin) return;
    
    const targetUser = this.adminUsers.find(u => u.id === userId);
    if (!targetUser) return;

    try {
      this.authService.updateUserStatus(userId, novoEstado);
      
      // Log de Auditoria
      this.adminService.logAction(
        this.user.nome,
        `${novoEstado === 'Activo' ? 'Activou' : novoEstado === 'Suspenso' ? 'Suspendeu' : 'Eliminou'} Utilizador`,
        `Utilizador: ${targetUser.nome} (${targetUser.tipo}), Telefone: ${targetUser.telefone}`
      );

      this.snack.open(
        `Estado da conta de ${targetUser.nome} alterado para "${novoEstado}" com sucesso.`, 
        'Sucesso', 
        { duration: 3000, panelClass: ['snackbar-success'] }
      );
      this.loadAdminPanelData();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao alterar estado.', 'Erro', { duration: 3000 });
    }
  }

  // RF-52: Adicionar novo produto
  adminAdicionarProduto(): void {
    if (!this.user?.isAdmin || !this.newProductInput.trim()) return;

    try {
      this.adminService.addProduct(this.newProductInput, this.user.nome);
      this.newProductInput = '';
      this.productsList = this.offerService.PREDEFINED_PRODUCTS; // Recarregar a lista reativa
      this.snack.open('Produto adicionado à lista do sistema com sucesso!', 'Excelente', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      this.loadAdminPanelData();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao adicionar produto.', 'Erro', { duration: 3000 });
    }
  }

  // RF-52: Abrir modal para renomear produto
  abrirModalEditarProduto(oldName: string): void {
    this.editingProductOldName = oldName;
    this.editingProductNewName = oldName;
    this.showProductEditModal = true;
  }

  salvarEdicaoProduto(): void {
    if (!this.user?.isAdmin || !this.editingProductNewName.trim()) return;

    try {
      this.adminService.editProduct(this.editingProductOldName, this.editingProductNewName, this.user.nome);
      this.showProductEditModal = false;
      this.productsList = this.offerService.PREDEFINED_PRODUCTS; // Recarregar a lista reativa
      this.snack.open('Produto renomeado com sucesso!', 'Excelente', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      this.loadAdminPanelData();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao renomear produto.', 'Erro', { duration: 3000 });
    }
  }

  // RF-52: Remover produto
  adminRemoverProduto(name: string): void {
    if (!this.user?.isAdmin) return;

    try {
      this.adminService.deleteProduct(name, this.user.nome);
      this.productsList = this.offerService.PREDEFINED_PRODUCTS; // Recarregar a lista reativa
      this.snack.open('Produto removido do sistema com sucesso.', 'OK', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      this.loadAdminPanelData();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao remover produto.', 'Erro', { duration: 3000 });
    }
  }

  // RF-55: Forçar expiração de qualquer oferta
  adminForcarExpiracaoOferta(offerId: number): void {
    if (!this.user?.isAdmin) return;

    const offer = this.adminOffers.find(o => o.id === offerId);
    if (!offer) return;

    try {
      this.offerService.adminForceExpire(offerId);
      
      this.adminService.logAction(
        this.user.nome,
        'Forçou Expiração de Oferta',
        `Oferta ID: ${offer.id}, Produtor: ${offer.produtorNome}, Cultura: ${offer.produto}`
      );

      this.snack.open('Expiração da oferta forçada com sucesso!', 'OK', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      
      this.loadOffers();
      this.loadAdminPanelData();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao expirar oferta.', 'Erro', { duration: 3000 });
    }
  }

  // RF-55: Abrir modal de edição de oferta para o admin
  abrirModalAdminEditarOferta(offer: Offer): void {
    this.selectedOfferForAdminEdit = offer;
    this.adminOfferEditForm = {
      produto: offer.produto,
      quantidade: offer.quantidade,
      unidade: offer.unidade,
      precoUnitario: offer.precoUnitario,
      dataFim: offer.dataFim,
      provincia: offer.provincia,
      distrito: offer.distrito
    };
    this.showAdminOfferEditModal = true;
  }

  salvarAdminEdicaoOferta(): void {
    if (!this.user?.isAdmin || !this.selectedOfferForAdminEdit) return;

    try {
      this.offerService.updateOffer(this.selectedOfferForAdminEdit.id, this.adminOfferEditForm);
      
      this.adminService.logAction(
        this.user.nome,
        'Editou Oferta Administrativamente',
        `Oferta ID: ${this.selectedOfferForAdminEdit.id}, Produtor: ${this.selectedOfferForAdminEdit.produtorNome}, Cultura: ${this.adminOfferEditForm.produto}`
      );

      this.snack.open('Oferta editada pelo administrador com sucesso!', 'Excelente', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });

      this.showAdminOfferEditModal = false;
      this.selectedOfferForAdminEdit = null;
      this.loadOffers();
      this.loadAdminPanelData();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao salvar alterações da oferta.', 'Erro', { duration: 3000 });
    }
  }

  // RF-54: Responder a pedidos de relatório de investidores (enviar CSV por email) - função manual
  abrirModalResponderRelatorio(request: ReportRequest): void {
    this.selectedReportRequestForResponse = request;
    
    // Auto-preencher o corpo do CSV de amostra com dados de mercado simulados baseados no tema solicitado
    this.adminReportResponseText = `Produto,Região,Distrito,Volume Total (Kg),Preço Médio SIMA (MT/Kg),Ofertas Ativas\n` +
      `Tomate Vermelho,Gaza,Bilene,12500,45.00,5\n` +
      `Cebola Vermelha,Gaza,Bilene,8200,55.00,3\n` +
      `Milho Branco,Sofala,Búzi,24000,24.00,4\n` +
      `Batata Doce,Maputo Província,Namaacha,15000,35.00,6`;
      
    this.showAdminReportResponseModal = true;
  }

  enviarRelatorioInvestidor(): void {
    if (!this.user?.isAdmin || !this.selectedReportRequestForResponse || !this.adminReportResponseText.trim()) return;

    try {
      this.adminService.respondToReportRequest(
        this.selectedReportRequestForResponse.id,
        this.adminReportResponseText,
        this.user.nome
      );

      this.snack.open(
        `Relatório enviado com sucesso por e-mail para o investidor ${this.selectedReportRequestForResponse.investidorNome}!`,
        'Enviado',
        { duration: 4000, panelClass: ['snackbar-success'] }
      );

      this.showAdminReportResponseModal = false;
      this.selectedReportRequestForResponse = null;
      this.loadAdminPanelData();
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao enviar relatório.', 'Erro', { duration: 3000 });
    }
  }
}
