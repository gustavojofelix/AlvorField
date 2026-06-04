import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { OfferService, Offer } from './offer.service';
import { NotificationService } from './notification.service';

export interface Interest {
  id: number;
  offerId: number;
  produto: string;
  produtorId: number;
  produtorNome: string;
  produtorTelefone?: string; // Revelado apenas quando status === 'Aceite'
  compradorId: number;
  compradorNome: string;
  compradorTelefone: string;
  mensagem: string;
  quantidadePretendida?: number | null;
  unidade: 'kg' | 'ton';
  dataInteresse: number;
  status: 'Pendente' | 'Aceite' | 'Recusado';
  dataAceite?: number; // Data em que o contacto foi aceite
  compradorConfirmou?: boolean | null; // Sim (true), Não (false), Aguardando (null)
  produtorConfirmou?: boolean | null; // Sim (true), Não (false), Aguardando (null)
  compradorAvaliou?: boolean; // Se o comprador já avaliou o produtor
  produtorAvaliou?: boolean; // Se o produtor já avaliou o comprador
}


@Injectable({
  providedIn: 'root'
})
export class InterestService {
  private readonly INTERESTS_KEY = 'alvorfield_interests';

  constructor(
    private authService: AuthService,
    private offerService: OfferService,
    private notificationService: NotificationService
  ) {
    this.initializeMockInterests();
  }

  private getInterests(): Interest[] {
    const data = localStorage.getItem(this.INTERESTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveInterests(interests: Interest[]): void {
    localStorage.setItem(this.INTERESTS_KEY, JSON.stringify(interests));
  }

  private initializeMockInterests(): void {
    const existing = localStorage.getItem(this.INTERESTS_KEY);
    if (!existing) {
      // Mock de alguns interesses iniciais para demonstração
      const mockInterests: Interest[] = [
        {
          id: 1001,
          offerId: 1, // Oferta de Tomate do Mateus Tembe
          produto: 'Tomate',
          produtorId: 1, // Mateus Tembe
          produtorNome: 'Mateus Tembe',
          compradorId: 2, // Lúcia Maputo
          compradorNome: 'Lúcia Maputo',
          compradorTelefone: '829876543',
          mensagem: 'Gostaria de negociar a compra de tomates para o nosso supermercado em Maputo.',
          quantidadePretendida: 1.5,
          unidade: 'ton',
          dataInteresse: Date.now() - 24 * 60 * 60 * 1000,
          status: 'Pendente'
        },
        {
          id: 1002,
          offerId: 2, // Cebola Vermelha do Mateus Tembe
          produto: 'Cebola Vermelha',
          produtorId: 1,
          produtorNome: 'Mateus Tembe',
          compradorId: 2,
          compradorNome: 'Lúcia Maputo',
          compradorTelefone: '829876543',
          mensagem: 'Temos interesse na cebola vermelha, podemos combinar transporte para Gaza?',
          quantidadePretendida: 800,
          unidade: 'kg',
          dataInteresse: Date.now() - 12 * 60 * 60 * 1000,
          status: 'Pendente'
        }
      ];
      this.saveInterests(mockInterests);
    }
  }

  // RF-31, RF-32, RF-33
  createInterest(offer: Offer, mensagem: string, quantidadePretendida?: number | null): Interest {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('Utilizador não autenticado.');
    if (currentUser.tipo !== 'Comprador') throw new Error('Apenas compradores podem manifestar interesse.');

    const newInterest: Interest = {
      id: Date.now(),
      offerId: offer.id,
      produto: offer.produto,
      produtorId: offer.produtorId,
      produtorNome: offer.produtorNome,
      compradorId: currentUser.id,
      compradorNome: currentUser.nome,
      compradorTelefone: currentUser.telefone,
      mensagem: mensagem,
      quantidadePretendida: quantidadePretendida,
      unidade: offer.unidade,
      dataInteresse: Date.now(),
      status: 'Pendente'
    };

    const interests = this.getInterests();
    interests.unshift(newInterest);
    this.saveInterests(interests);

    // RF-33, RF-57: Novo interesse sobre oferta do produtor (com nome do comprador e produto)
    const producer = this.authService.getUsers().find(u => u.id === offer.produtorId);
    const produtorTelefone = producer ? producer.telefone : '';
    const notificationSummary = `${currentUser.nome} está interessado na sua oferta de ${offer.produto}.`;
    this.notificationService.sendNotification(
      offer.produtorId,
      'interesse',
      'Novo Interesse Recebido',
      notificationSummary,
      produtorTelefone,
      offer.produtorNome
    );

    return newInterest;
  }

  // RF-34: O produtor visualiza manifestações recebidas ordenadas por data
  getReceivedInterests(producerId: number): Interest[] {
    return this.getInterests()
      .filter(i => i.produtorId === producerId)
      .sort((a, b) => b.dataInteresse - a.dataInteresse);
  }

  // RF-37: Histórico de interações enviadas pelo comprador
  getSentInterests(buyerId: number): Interest[] {
    return this.getInterests()
      .filter(i => i.compradorId === buyerId)
      .sort((a, b) => b.dataInteresse - a.dataInteresse);
  }

  // RF-35: O produtor escolhe "Aceitar contacto"
  acceptInterest(interestId: number): void {
    const interests = this.getInterests();
    const index = interests.findIndex(i => i.id === interestId);
    if (index === -1) throw new Error('Registo de interesse não encontrado.');

    const interest = interests[index];
    const producer = this.authService.getUsers().find(u => u.id === interest.produtorId);
    if (!producer) throw new Error('Produtor não encontrado.');

    interest.status = 'Aceite';
    interest.dataAceite = Date.now();
    interest.compradorConfirmou = null;
    interest.produtorConfirmou = null;
    interest.compradorAvaliou = false;
    interest.produtorAvaliou = false;
    interest.produtorTelefone = producer.telefone; // Revela o contacto do produtor
    this.saveInterests(interests);

    // RF-36, RF-57: Aceitação de contacto (para comprador com contacto do produtor)
    const notificationMsg = `O produtor ${producer.nome} aceitou o seu contacto para a oferta de ${interest.produto}. Contacto do produtor: ${producer.telefone}.`;
    this.notificationService.sendNotification(
      interest.compradorId,
      'aceite',
      'Contacto Aceite pelo Produtor',
      notificationMsg,
      interest.compradorTelefone,
      interest.compradorNome
    );
  }

  // RF-35: O produtor escolhe "Recusar"
  refuseInterest(interestId: number): void {
    const interests = this.getInterests();
    const index = interests.findIndex(i => i.id === interestId);
    if (index === -1) throw new Error('Registo de interesse não encontrado.');

    const interest = interests[index];
    interest.status = 'Recusado';
    this.saveInterests(interests);

    // RF-57: Recusa de contacto
    const notificationMsg = `O produtor ${interest.produtorNome} recusou o interesse na oferta de ${interest.produto}.`;
    this.notificationService.sendNotification(
      interest.compradorId,
      'recusa',
      'Contacto Recusado pelo Produtor',
      notificationMsg,
      interest.compradorTelefone,
      interest.compradorNome
    );
  }

  // RF-39, RF-40, RF-41
  confirmTransaction(interestId: number, userId: number, confirmed: boolean): void {
    const interests = this.getInterests();
    const index = interests.findIndex(i => i.id === interestId);
    if (index === -1) throw new Error('Transação não encontrada.');

    const interest = interests[index];
    if (userId === interest.compradorId) {
      interest.compradorConfirmou = confirmed;
    } else if (userId === interest.produtorId) {
      interest.produtorConfirmou = confirmed;
    } else {
      throw new Error('Utilizador sem autorização para confirmar esta transação.');
    }

    this.saveInterests(interests);

    // RF-41: Se ambas as partes confirmarem a conclusão, a oferta é marcada como Concluída
    if (interest.compradorConfirmou === true && interest.produtorConfirmou === true) {
      this.offerService.markAsCompleted(interest.offerId);
      console.info(`[SISTEMA]: Ambas as partes confirmaram a conclusão. Oferta ${interest.offerId} marcada como CONCLUÍDA.`);
    }
  }

  markAsRated(interestId: number, userId: number): void {
    const interests = this.getInterests();
    const index = interests.findIndex(i => i.id === interestId);
    if (index === -1) return;

    const interest = interests[index];
    if (userId === interest.compradorId) {
      interest.compradorAvaliou = true;
    } else if (userId === interest.produtorId) {
      interest.produtorAvaliou = true;
    }
    this.saveInterests(interests);
  }

  // Simulação de tempo para fins de teste
  simulateSevenDaysPassed(interestId: number): void {
    const interests = this.getInterests();
    const index = interests.findIndex(i => i.id === interestId);
    if (index === -1) return;

    const interest = interests[index];
    // Altera a data de aceitação para 8 dias atrás para passar os 7 dias
    interest.dataAceite = Date.now() - (8 * 24 * 60 * 60 * 1000);
    this.saveInterests(interests);
  }
}
