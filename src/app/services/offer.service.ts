import { Injectable, Injector } from '@angular/core';
import { AuthService } from './auth.service';
import { EvaluationService } from './evaluation.service';


export type OfferStatus = 'Activa' | 'Pausada' | 'Expirada' | 'Concluída' | 'Rascunho';

export interface Offer {
  id: number;
  produtorId: number;
  produtorNome: string;
  produto: string;
  quantidade: number;
  unidade: 'kg' | 'ton';
  dataInicio: string; // formato YYYY-MM-DD
  dataFim: string; // formato YYYY-MM-DD
  precoUnitario: number; // em MZN
  provincia: string;
  distrito: string;
  latitude?: number;
  longitude?: number;
  fotos: string[]; // URLs de dados base64
  estado: OfferStatus;
  dataCriacao: number;
  produtorReputacao?: number;
  produtorTransacoes?: number;
}

@Injectable({
  providedIn: 'root',
})
export class OfferService {
  private readonly OFFERS_KEY = 'alvorfield_offers';

  // RF-13 e RF-52: Lista de produtos gerida pelo administrador (carregada do localStorage ou padrão)
  get PREDEFINED_PRODUCTS(): string[] {
    const data = localStorage.getItem('alvorfield_products');
    return data ? JSON.parse(data) : [
      'Milho Branco',
      'Feijão Nhemba',
      'Feijão Manteiga',
      'Gergelim',
      'Castanha de Caju',
      'Manga',
      'Mandioca',
      'Amendoim',
      'Batata Doce',
      'Tomate',
      'Cebola Vermelha'
    ];
  }

  constructor(
    private authService: AuthService,
    private injector: Injector
  ) {
    this.initializeMockOffers();
    this.verificarEExpirarOfertas();
  }

  private initializeMockOffers(): void {
    // Para fins de demonstração, sempre que não houver as novas ofertas ricas, vamos reinicializar
    const existing = localStorage.getItem(this.OFFERS_KEY);
    let parsed: Offer[] = [];
    try {
      if (existing) parsed = JSON.parse(existing);
    } catch (e) {}

    // Se não existir ou se for a inicialização antiga básica, geramos as novas ricas
    if (!existing || parsed.length <= 3) {
      const mockOffers: Offer[] = [
        {
          id: 1,
          produtorId: 1,
          produtorNome: 'Mateus Tembe',
          produto: 'Tomate',
          quantidade: 2.5,
          unidade: 'ton',
          dataInicio: '2026-05-15',
          dataFim: '2026-07-15',
          precoUnitario: 45,
          provincia: 'Gaza',
          distrito: 'Bilene',
          latitude: -25.263,
          longitude: 33.242,
          fotos: [],
          estado: 'Activa',
          dataCriacao: Date.now() - 5 * 24 * 60 * 60 * 1000,
          produtorReputacao: 4.8,
          produtorTransacoes: 14
        },
        {
          id: 2,
          produtorId: 1,
          produtorNome: 'Mateus Tembe',
          produto: 'Cebola Vermelha',
          quantidade: 1200,
          unidade: 'kg',
          dataInicio: '2026-05-20',
          dataFim: '2026-07-20',
          precoUnitario: 55,
          provincia: 'Gaza',
          distrito: 'Bilene',
          latitude: -25.264,
          longitude: 33.243,
          fotos: [],
          estado: 'Activa',
          dataCriacao: Date.now() - 2 * 24 * 60 * 60 * 1000,
          produtorReputacao: 4.8,
          produtorTransacoes: 14
        },
        {
          id: 3,
          produtorId: 101,
          produtorNome: 'Cooperativa de Chókwè',
          produto: 'Milho Branco',
          quantidade: 15,
          unidade: 'ton',
          dataInicio: '2026-04-01',
          dataFim: '2026-05-01',
          precoUnitario: 24,
          provincia: 'Gaza',
          distrito: 'Chókwè',
          latitude: -24.524,
          longitude: 32.998,
          fotos: [],
          estado: 'Activa',
          dataCriacao: Date.now() - 60 * 24 * 60 * 60 * 1000,
          produtorReputacao: 4.5,
          produtorTransacoes: 32
        },
        {
          id: 4,
          produtorId: 102,
          produtorNome: 'Associação AgroNamaacha',
          produto: 'Batata Doce',
          quantidade: 3.5,
          unidade: 'ton',
          dataInicio: '2026-06-01',
          dataFim: '2026-08-30',
          precoUnitario: 35,
          provincia: 'Maputo Província',
          distrito: 'Namaacha',
          latitude: -25.967,
          longitude: 32.032,
          fotos: [],
          estado: 'Activa',
          dataCriacao: Date.now() - 1 * 24 * 60 * 60 * 1000,
          produtorReputacao: 4.9,
          produtorTransacoes: 22
        },
        {
          id: 5,
          produtorId: 103,
          produtorNome: 'Machamba do Limpopo',
          produto: 'Amendoim',
          quantidade: 850,
          unidade: 'kg',
          dataInicio: '2026-06-02',
          dataFim: '2026-07-25',
          precoUnitario: 65,
          provincia: 'Gaza',
          distrito: 'Limpopo',
          latitude: -25.150,
          longitude: 33.520,
          fotos: [],
          estado: 'Activa',
          dataCriacao: Date.now(),
          produtorReputacao: 4.2,
          produtorTransacoes: 8
        },
        {
          id: 6,
          produtorId: 104,
          produtorNome: 'Filipe Nhaca',
          produto: 'Castanha de Caju',
          quantidade: 10,
          unidade: 'ton',
          dataInicio: '2026-06-01',
          dataFim: '2026-09-15',
          precoUnitario: 75,
          provincia: 'Nampula',
          distrito: 'Monapo',
          latitude: -14.922,
          longitude: 40.435,
          fotos: [],
          estado: 'Activa',
          dataCriacao: Date.now() - 3 * 24 * 60 * 60 * 1000,
          produtorReputacao: 4.7,
          produtorTransacoes: 41
        },
        {
          id: 7,
          produtorId: 105,
          produtorNome: 'Cooperativa Búzi',
          produto: 'Gergelim',
          quantidade: 18,
          unidade: 'ton',
          dataInicio: '2026-06-03',
          dataFim: '2026-10-30',
          precoUnitario: 80,
          provincia: 'Sofala',
          distrito: 'Búzi',
          latitude: -19.860,
          longitude: 34.340,
          fotos: [],
          estado: 'Activa',
          dataCriacao: Date.now(),
          produtorReputacao: 4.6,
          produtorTransacoes: 19
        }
      ];
      localStorage.setItem(this.OFFERS_KEY, JSON.stringify(mockOffers));
    }
  }

  getOffers(): Offer[] {
    this.verificarEExpirarOfertas();
    const data = localStorage.getItem(this.OFFERS_KEY);
    const offers: Offer[] = data ? JSON.parse(data) : [];

    try {
      const evaluationService = this.injector.get(EvaluationService);
      offers.forEach(o => {
        const rep = evaluationService.getUserReputation(o.produtorId);
        o.produtorReputacao = rep.average;
        
        const count = evaluationService.getCompletedTransactionsCount(o.produtorId);
        const baseline = o.produtorId === 1 ? 14 : (o.produtorId === 101 ? 32 : (o.produtorId === 102 ? 22 : 8));
        o.produtorTransacoes = baseline + count;
      });
    } catch (e) {
      // Evita erros de dependência circular durante a inicialização inicial
    }

    return offers;
  }

  getProducerOffers(producerId: number): Offer[] {
    return this.getOffers().filter(o => o.produtorId === producerId);
  }

  getPublicOffers(): Offer[] {
    // Apenas ofertas Activas são públicas
    return this.getOffers().filter(o => o.estado === 'Activa');
  }

  getOfferById(id: number): Offer | null {
    const offers = this.getOffers();
    return offers.find(o => o.id === id) || null;
  }

  // RF-12, RF-14, RF-15, RF-16
  createOffer(offerData: Omit<Offer, 'id' | 'produtorId' | 'produtorNome' | 'dataCriacao'>): Offer {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('Utilizador não autenticado.');

    const newOffer: Offer = {
      ...offerData,
      id: Date.now(),
      produtorId: currentUser.id,
      produtorNome: currentUser.nome,
      dataCriacao: Date.now()
    };

    const offers = this.getOffers();
    offers.unshift(newOffer);
    this.saveOffers(offers);

    // Sincronizar com mercado global se necessário
    this.verificarEExpirarOfertas();
    return newOffer;
  }

  // RF-17 e RF-55: Editar oferta ativa (permitir ao administrador editar também)
  updateOffer(id: number, updatedData: Partial<Offer>): void {
    const offers = this.getOffers();
    const index = offers.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Oferta não encontrada.');

    // Verificar se o utilizador é dono da oferta ou administrador (RF-55)
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || (offers[index].produtorId !== currentUser.id && !currentUser.isAdmin)) {
      throw new Error('Sem autorização para atualizar esta oferta.');
    }

    offers[index] = {
      ...offers[index],
      ...updatedData,
      id: offers[index].id,
      produtorId: offers[index].produtorId,
      produtorNome: offers[index].produtorNome,
      dataCriacao: offers[index].dataCriacao
    };

    this.saveOffers(offers);
    this.verificarEExpirarOfertas();
  }

  // RF-55: Administrador forçar expiração de qualquer oferta
  adminForceExpire(id: number): void {
    const offers = this.getOffers();
    const index = offers.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Oferta não encontrada.');

    offers[index].estado = 'Expirada';
    this.saveOffers(offers);
  }

  // RF-18: Pausar e Reativar oferta
  togglePauseOffer(id: number): void {
    const offers = this.getOffers();
    const index = offers.findIndex(o => o.id === id);
    if (index === -1) return;

    const offer = offers[index];
    if (offer.estado === 'Activa') {
      offer.estado = 'Pausada';
    } else if (offer.estado === 'Pausada') {
      // Antes de reativar, verifica se já não expirou
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dataFimDate = new Date(offer.dataFim + 'T23:59:59');
      if (dataFimDate < today) {
        offer.estado = 'Expirada';
      } else {
        offer.estado = 'Activa';
      }
    }
    this.saveOffers(offers);
  }

  // RF-19: Eliminar oferta permanentemente
  deleteOffer(id: number): void {
    let offers = this.getOffers();
    offers = offers.filter(o => o.id !== id);
    this.saveOffers(offers);
  }

  // RF-22: Marcar como Vendida/Concluída manualmente
  markAsCompleted(id: number): void {
    const offers = this.getOffers();
    const index = offers.findIndex(o => o.id === id);
    if (index !== -1) {
      offers[index].estado = 'Concluída';
      this.saveOffers(offers);
    }
  }

  // RF-21: Expira automaticamente ofertas cuja data final seja anterior à atual
  private verificarEExpirarOfertas(): void {
    const data = localStorage.getItem(this.OFFERS_KEY);
    if (!data) return;

    let offers: Offer[] = JSON.parse(data);
    let changed = false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    offers = offers.map(o => {
      // Apenas expira se estiver Activa ou Pausada ou Rascunho
      if (o.estado === 'Activa' || o.estado === 'Pausada' || o.estado === 'Rascunho') {
        const dataFimDate = new Date(o.dataFim + 'T23:59:59');
        if (dataFimDate < today) {
          o.estado = 'Expirada';
          changed = true;
        }
      }
      return o;
    });

    if (changed) {
      this.saveOffers(offers);
    }
  }

  private saveOffers(offers: Offer[]): void {
    localStorage.setItem(this.OFFERS_KEY, JSON.stringify(offers));
  }
}
