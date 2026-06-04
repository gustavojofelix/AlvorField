import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

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
}

@Injectable({
  providedIn: 'root',
})
export class OfferService {
  private readonly OFFERS_KEY = 'alvorfield_offers';

  // RF-13: Lista de produtos gerida pelo administrador (pré-definida)
  readonly PREDEFINED_PRODUCTS = [
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

  constructor(private authService: AuthService) {
    this.initializeMockOffers();
    this.verificarEExpirarOfertas();
  }

  private initializeMockOffers(): void {
    const existing = localStorage.getItem(this.OFFERS_KEY);
    if (!existing) {
      const mockOffers: Offer[] = [
        {
          id: 1,
          produtorId: 1, // Mateus Tembe
          produtorNome: 'Mateus Tembe',
          produto: 'Tomate',
          quantidade: 2.5,
          unidade: 'ton',
          dataInicio: '2026-05-15',
          dataFim: '2026-06-15',
          precoUnitario: 45, // 45 MT/kg
          provincia: 'Gaza',
          distrito: 'Bilene',
          latitude: -25.263,
          longitude: 33.242,
          fotos: [],
          estado: 'Activa',
          dataCriacao: Date.now() - 5 * 24 * 60 * 60 * 1000
        },
        {
          id: 2,
          produtorId: 1, // Mateus Tembe
          produtorNome: 'Mateus Tembe',
          produto: 'Cebola Vermelha',
          quantidade: 1200,
          unidade: 'kg',
          dataInicio: '2026-05-20',
          dataFim: '2026-06-20',
          precoUnitario: 55,
          provincia: 'Gaza',
          distrito: 'Bilene',
          latitude: -25.264,
          longitude: 33.243,
          fotos: [],
          estado: 'Activa',
          dataCriacao: Date.now() - 2 * 24 * 60 * 60 * 1000
        },
        {
          id: 3,
          produtorId: 101, // Outro produtor de exemplo
          produtorNome: 'Cooperativa de Chókwè',
          produto: 'Milho Branco',
          quantidade: 15,
          unidade: 'ton',
          dataInicio: '2026-04-01',
          dataFim: '2026-05-01', // Data no passado para testar expiração
          precoUnitario: 24,
          provincia: 'Gaza',
          distrito: 'Chókwè',
          latitude: -24.524,
          longitude: 32.998,
          fotos: [],
          estado: 'Activa', // Será alterado para Expirada na inicialização
          dataCriacao: Date.now() - 60 * 24 * 60 * 60 * 1000
        }
      ];
      localStorage.setItem(this.OFFERS_KEY, JSON.stringify(mockOffers));
    }
  }

  getOffers(): Offer[] {
    this.verificarEExpirarOfertas();
    const data = localStorage.getItem(this.OFFERS_KEY);
    return data ? JSON.parse(data) : [];
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

  // RF-17: Editar oferta ativa
  updateOffer(id: number, updatedData: Partial<Offer>): void {
    const offers = this.getOffers();
    const index = offers.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Oferta não encontrada.');

    // Verificar se o utilizador é dono da oferta
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || offers[index].produtorId !== currentUser.id) {
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
