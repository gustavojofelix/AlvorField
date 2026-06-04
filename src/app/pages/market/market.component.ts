import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../services/auth.service';
import { LocationService, Province } from '../../services/location.service';
import { OfferService, Offer } from '../../services/offer.service';
import { InterestService } from '../../services/interest.service';

interface CustomAlert {
  id: number;
  produto: string;
  provincia: string;
  distrito: string;
  volumeMinimo: number | null;
  volumeUnidade: 'kg' | 'ton';
  precoMaximo: number | null;
  canais: { app: boolean; sms: boolean };
  dataCriacao: number;
}

@Component({
  selector: 'app-market',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatCheckboxModule
  ],
  templateUrl: './market.component.html',
  styleUrl: './market.component.scss'
})
export class MarketComponent implements OnInit {
  // Configs
  viewMode: 'split' | 'map' | 'list' = 'split';
  currentPage = 1;
  itemsPerPage = 5;

  // Filter Models
  searchQuery = '';
  selectedProducts: string[] = []; // Multiple products
  selectedProvince = 'Todas';
  selectedDistrict = 'Todos';
  minVolume: number | null = null;
  minVolumeUnit: 'kg' | 'ton' = 'kg';
  startDate = '';
  endDate = '';
  maxPrice: number | null = null;
  onlyFavorites = false;

  // Data sources
  provincesList: Province[] = [];
  districtsList: string[] = [];
  productsList: string[] = [
    'Milho Branco', 'Feijão Nhemba', 'Feijão Manteiga', 'Gergelim',
    'Castanha de Caju', 'Manga', 'Mandioca', 'Amendoim',
    'Batata Doce', 'Tomate', 'Cebola Vermelha'
  ];
  availableOffers: Offer[] = [];
  favorites: Array<string | number> = [];
  activeAlerts: CustomAlert[] = [];

  // User location (defaults to Maputo unless permission is allowed)
  buyerLat = -25.968;
  buyerLng = 32.573;
  gpsAllowed = false;
  gpsLoading = false;

  // Modals / Details
  selectedOffer: Offer | null = null;
  showDetailModal = false;
  showAlertModal = false;
  showBidModal = false;
  showInterestModal = false;

  // Forms
  alertForm = {
    produto: '',
    provincia: 'Todas',
    distrito: 'Todos',
    volumeMinimo: null as number | null,
    volumeUnidade: 'kg' as 'kg' | 'ton',
    precoMaximo: null as number | null,
    canais: { app: true, sms: false }
  };

  newBid = {
    preco: null as number | null,
    quantidade: null as number | null,
    unidade: 'kg' as 'kg' | 'ton'
  };

  interestForm = {
    message: '',
    quantity: null as number | null
  };

  // Provinces list derived for filters dropdown
  provincias: string[] = [];

  constructor(
    private authService: AuthService,
    private locationService: LocationService,
    private offerService: OfferService,
    private interestService: InterestService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    // Apenas compradores podem ver esta página
    const user = this.authService.getCurrentUser();
    if (!user || user.tipo !== 'Comprador') {
      this.snack.open('Acesso restrito a compradores.', 'OK', { duration: 3000 });
      this.router.navigate(['/dashboard']);
      return;
    }

    this.productsList = await this.offerService.getPredefinedProducts();
    this.provincesList = this.locationService.getProvinces();
    this.provincias = ['Todas', ...this.provincesList.map(p => p.nome)];
    
    // Tentar ler a geolocalização automaticamente
    this.obterLocalizacaoComprador(false);

    await this.loadOffers();
    this.loadFavorites();
    this.loadAlerts();
  }

  async loadOffers(): Promise<void> {
    this.availableOffers = await this.offerService.getPublicOffers();
  }

  loadFavorites(): void {
    const user = this.authService.getCurrentUser();
    this.favorites = user?.preferences?.favorites || [];
  }

  loadAlerts(): void {
    const user = this.authService.getCurrentUser();
    this.activeAlerts = user?.preferences?.alerts || [];
  }

  obterLocalizacaoComprador(exibirFeedback = true): void {
    if (!navigator.geolocation) {
      if (exibirFeedback) {
        this.snack.open('Geolocalização não suportada no seu navegador.', 'OK', { duration: 3000 });
      }
      return;
    }

    this.gpsLoading = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.buyerLat = position.coords.latitude;
        this.buyerLng = position.coords.longitude;
        this.gpsAllowed = true;
        this.gpsLoading = false;
        if (exibirFeedback) {
          this.snack.open('Distâncias recalculadas com base na sua localização atual!', 'Excelente', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
        }
      },
      (error) => {
        this.gpsLoading = false;
        this.gpsAllowed = false;
        if (exibirFeedback) {
          this.snack.open('Permissão negada. Usando localização padrão em Maputo.', 'OK', { duration: 3000 });
        }
      },
      { timeout: 5000 }
    );
  }

  onProvinceChange(): void {
    if (this.selectedProvince && this.selectedProvince !== 'Todas') {
      this.districtsList = ['Todos', ...this.locationService.getDistrictsForProvince(this.selectedProvince)];
      this.selectedDistrict = 'Todos';
    } else {
      this.districtsList = [];
      this.selectedDistrict = 'Todos';
    }
  }

  onAlertProvinceChange(): void {
    if (this.alertForm.provincia && this.alertForm.provincia !== 'Todas') {
      this.districtsList = ['Todos', ...this.locationService.getDistrictsForProvince(this.alertForm.provincia)];
      this.alertForm.distrito = 'Todos';
    } else {
      this.alertForm.distrito = 'Todos';
    }
  }

  toggleProductFilter(produto: string): void {
    const idx = this.selectedProducts.indexOf(produto);
    if (idx > -1) {
      this.selectedProducts.splice(idx, 1);
    } else {
      this.selectedProducts.push(produto);
    }
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedProducts = [];
    this.selectedProvince = 'Todas';
    this.selectedDistrict = 'Todos';
    this.minVolume = null;
    this.startDate = '';
    this.endDate = '';
    this.maxPrice = null;
    this.onlyFavorites = false;
    this.districtsList = [];
    this.currentPage = 1;
    this.snack.open('Filtros limpos.', 'OK', { duration: 2000 });
  }

  // Haversine formula (RF-27)
  calculateDistance(offerLat?: number, offerLng?: number): number {
    if (offerLat === undefined || offerLng === undefined) return 9999;
    const R = 6371; // Raio da Terra em km
    const dLat = (offerLat - this.buyerLat) * Math.PI / 180;
    const dLng = (offerLng - this.buyerLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.buyerLat * Math.PI / 180) * Math.cos(offerLat * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  }

  // Filtragem avançada (RF-25 / RF-29)
  get filteredOffers(): Offer[] {
    return this.availableOffers.filter(offer => {
      // 1. Text Search (Produto ou Produtor)
      const matchText = this.searchQuery ? (
        offer.produto.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        offer.produtorNome.toLowerCase().includes(this.searchQuery.toLowerCase())
      ) : true;

      // 2. Múltiplos Produtos
      const matchProducts = this.selectedProducts.length > 0 ? (
        this.selectedProducts.includes(offer.produto)
      ) : true;

      // 3. Província e Distrito
      const matchProvince = this.selectedProvince === 'Todas' || offer.provincia === this.selectedProvince;
      const matchDistrict = this.selectedDistrict === 'Todos' || offer.distrito === this.selectedDistrict;

      // 4. Volume Mínimo (convertendo para kg se unidades diferirem)
      let matchVolume = true;
      if (this.minVolume !== null) {
        const offerValInKg = offer.unidade === 'ton' ? offer.quantidade * 1000 : offer.quantidade;
        const filterValInKg = this.minVolumeUnit === 'ton' ? this.minVolume * 1000 : this.minVolume;
        matchVolume = offerValInKg >= filterValInKg;
      }

      // 5. Preço Máximo
      const matchPrice = this.maxPrice !== null ? offer.precoUnitario <= this.maxPrice : true;

      // 6. Datas de Disponibilidade
      let matchDates = true;
      if (this.startDate) {
        matchDates = matchDates && (offer.dataFim >= this.startDate);
      }
      if (this.endDate) {
        matchDates = matchDates && (offer.dataInicio <= this.endDate);
      }

      // 7. Apenas Favoritos
      const matchFav = this.onlyFavorites ? this.favorites.includes(offer.id) : true;

      return matchText && matchProducts && matchProvince && matchDistrict && matchVolume && matchPrice && matchDates && matchFav;
    });
  }

  // Paginação (RF-26)
  get paginatedOffers(): Offer[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredOffers.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredOffers.length / this.itemsPerPage) || 1;
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Favoritos (RF-29)
  isFavorite(offerId: string | number): boolean {
    return this.favorites.includes(offerId as any);
  }

  async toggleFavorite(offerId: string | number, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const idx = this.favorites.indexOf(offerId as any);
    if (idx > -1) {
      this.favorites.splice(idx, 1);
      this.snack.open('Oferta removida dos favoritos.', 'OK', { duration: 2000 });
    } else {
      this.favorites.push(offerId as any);
      this.snack.open('Oferta guardada nos favoritos!', 'Excelente', { duration: 2000 });
    }
    await this.authService.updatePreferences('favorites', this.favorites);
  }

  // Detalhe da Oferta (RF-28)
  openDetail(offer: Offer): void {
    this.selectedOffer = offer;
    this.showDetailModal = true;
  }

  closeDetail(): void {
    this.selectedOffer = null;
    this.showDetailModal = false;
  }

  // RF-31, RF-32
  openInterest(offer: Offer, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedOffer = offer;
    this.interestForm.message = '';
    this.interestForm.quantity = null;
    this.showInterestModal = true;
  }

  async submitInterest(): Promise<void> {
    if (!this.selectedOffer) return;

    if (!this.interestForm.message || this.interestForm.message.trim().length < 10) {
      this.snack.open('A mensagem é obrigatória e deve ter pelo menos 10 caracteres.', 'OK', { duration: 3000 });
      return;
    }

    try {
      await this.interestService.createInterest(
        this.selectedOffer,
        this.interestForm.message,
        this.interestForm.quantity
      );

      this.snack.open(`Manifestação de interesse enviada com sucesso para ${this.selectedOffer.produtorNome}!`, 'Excelente', {
        duration: 4000,
        panelClass: ['snackbar-success']
      });

      this.showInterestModal = false;
      this.showDetailModal = false;
    } catch (e: any) {
      this.snack.open(e.message || 'Erro ao registar interesse.', 'OK', { duration: 3000 });
    }
  }

  // Proposta Directa
  openBid(offer: Offer, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedOffer = offer;
    this.newBid.preco = offer.precoUnitario;
    this.newBid.quantidade = offer.quantidade;
    this.newBid.unidade = offer.unidade;
    this.showBidModal = true;
  }

  async submitBid(): Promise<void> {
    if (!this.selectedOffer || !this.newBid.preco || !this.newBid.quantidade) {
      this.snack.open('Preencha os campos de preço e volume.', 'OK', { duration: 3000 });
      return;
    }

    const user = this.authService.getCurrentUser();
    const proposalsList = user?.preferences?.buyer_proposals || [];
    
    proposalsList.unshift({
      id: Date.now(),
      comprador: user?.nome || 'Comprador Registado',
      produto: this.selectedOffer.produto,
      quantidade: `${this.newBid.quantidade} ${this.newBid.unidade}`,
      precoOferecido: `${this.newBid.preco} MT/${this.newBid.unidade}`,
      status: 'Pendente'
    });
    
    await this.authService.updatePreferences('buyer_proposals', proposalsList);

    this.snack.open(`Proposta enviada com sucesso para ${this.selectedOffer.produtorNome}!`, 'Excelente', {
      duration: 4000,
      panelClass: ['snackbar-success']
    });

    this.showBidModal = false;
    this.showDetailModal = false;
  }

  // Alertas Personalizados (RF-30)
  openCreateAlert(): void {
    this.alertForm = {
      produto: this.selectedProducts[0] || '',
      provincia: this.selectedProvince,
      distrito: this.selectedDistrict,
      volumeMinimo: this.minVolume,
      volumeUnidade: this.minVolumeUnit,
      precoMaximo: this.maxPrice,
      canais: { app: true, sms: false }
    };
    this.showAlertModal = true;
  }

  async createAlert(): Promise<void> {
    if (!this.alertForm.produto) {
      this.snack.open('Indique o produto para o alerta.', 'OK', { duration: 3000 });
      return;
    }

    const newAlert: CustomAlert = {
      id: Date.now(),
      produto: this.alertForm.produto,
      provincia: this.alertForm.provincia,
      distrito: this.alertForm.distrito,
      volumeMinimo: this.alertForm.volumeMinimo,
      volumeUnidade: this.alertForm.volumeUnidade,
      precoMaximo: this.alertForm.precoMaximo,
      canais: { ...this.alertForm.canais },
      dataCriacao: Date.now()
    };

    this.activeAlerts.unshift(newAlert);
    await this.authService.updatePreferences('alerts', this.activeAlerts);

    this.snack.open(`Alerta de cotação para "${newAlert.produto}" ativado com sucesso!`, 'Excelente', {
      duration: 3500,
      panelClass: ['snackbar-success']
    });

    console.info(`[ALERTA REGISTADO] Alerta #${newAlert.id} configurado para ${newAlert.produto}. Canais: App=${newAlert.canais.app}, SMS=${newAlert.canais.sms}`);

    this.showAlertModal = false;
  }

  async removeAlert(alertId: number): Promise<void> {
    this.activeAlerts = this.activeAlerts.filter(a => a.id !== alertId);
    await this.authService.updatePreferences('alerts', this.activeAlerts);
    this.snack.open('Alerta removido.', 'OK', { duration: 2500 });
  }

  // Map markers projection helpers (RF-23 / RF-24)
  getMarkerX(longitude?: number): number {
    if (longitude === undefined) return 50;
    // Map longitude range [30.0, 41.0] to pixel percentage [5%, 95%]
    const pct = (longitude - 30.0) / (41.0 - 30.0);
    return 5 + pct * 90;
  }

  getMarkerY(latitude?: number): number {
    if (latitude === undefined) return 50;
    // Map latitude range [-27.0, -10.0] to pixel percentage [95%, 5%] (since latitude is negative, south is higher negative)
    const pct = (-latitude - 10.0) / (27.0 - 10.0);
    return 5 + pct * 90;
  }

  getProductColor(produto: string): string {
    switch (produto) {
      case 'Tomate': return '#E53935'; // Red
      case 'Cebola Vermelha': return '#8E24AA'; // Purple
      case 'Milho Branco': return '#FBC02D'; // Yellow/Gold
      case 'Batata Doce': return '#FB8C00'; // Orange
      case 'Amendoim': return '#8D6E63'; // Brown
      case 'Castanha de Caju': return '#6D4C41'; // Dark Brown
      case 'Gergelim': return '#FFB300'; // Amber
      case 'Feijão Nhemba': return '#43A047'; // Green
      case 'Feijão Manteiga': return '#7CB342'; // Light Green
      default: return '#1E88E5'; // Blue
    }
  }

  getProductIcon(produto: string): string {
    switch (produto) {
      case 'Tomate': return 'fiber_manual_record';
      case 'Cebola Vermelha': return 'lens';
      case 'Milho Branco': return 'grain';
      case 'Batata Doce': return 'cookie';
      case 'Amendoim': return 'spa';
      case 'Castanha de Caju': return 'nature';
      case 'Gergelim': return 'filter_vintage';
      case 'Feijão Nhemba':
      case 'Feijão Manteiga':
        return 'grass';
      default: return 'agriculture';
    }
  }
}
