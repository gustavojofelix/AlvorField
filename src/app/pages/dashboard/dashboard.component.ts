import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  user: Omit<User, 'password'> | null = null;
  greeting = '';

  // Conexões recentes no ecossistema AlvorField
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
  ];

  dashboardCards: { icon: string; title: string; description: string; color: string; action: string }[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.setGreeting();
    this.setDashboardCards();
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
          action: 'Publicar Oferta'
        },
        {
          icon: 'handshake',
          title: 'Propostas de Compradores',
          description: 'Veja propostas recebidas de supermercados e restaurantes interessados.',
          color: '#E65100',
          action: 'Ver Propostas (2)'
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
          action: 'Pesquisar'
        },
        {
          icon: 'shopping_cart',
          title: 'Pedidos de Cotação',
          description: 'Publique o que a sua empresa necessita para que produtores lhe façam ofertas directas.',
          color: '#2E7D32',
          action: 'Criar Pedido'
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
          action: 'Analisar Projectos'
        },
        {
          icon: 'shield',
          title: 'Garantias & Contratos',
          description: 'Acompanhe os contratos inteligentes celebrados com produtores financiados.',
          color: '#7B1FA2',
          action: 'Ver Contratos'
        },
        ...commonCards
      ];
    }
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
    this.snack.open(`Funcionalidade "${actionName}" simulada com sucesso!`, 'OK', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }

  logout(): void {
    this.authService.logout();
    this.snack.open('Sessão terminada.', 'Fechar', { duration: 2500 });
  }
}
