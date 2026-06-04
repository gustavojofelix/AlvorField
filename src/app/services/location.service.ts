import { Injectable } from '@angular/core';

export interface Province {
  nome: string;
  distritos: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly provinces: Province[] = [
    {
      nome: 'Cabo Delgado',
      distritos: ['Pemba', 'Montepuez', 'Mocímboa da Praia', 'Palma', 'Mueda', 'Chiúre', 'Ancuabe', 'Balama', 'Ibo']
    },
    {
      nome: 'Gaza',
      distritos: ['Xai-Xai', 'Chókwè', 'Bilene', 'Chibuto', 'Mandlakazi', 'Mabalane', 'Chigubo', 'Massingir', 'Limpopo']
    },
    {
      nome: 'Inhambane',
      distritos: ['Inhambane Cidade', 'Maxixe', 'Vilankulo', 'Massinga', 'Zavala', 'Inharrime', 'Homoíne', 'Jangamo', 'Mabote']
    },
    {
      nome: 'Manica',
      distritos: ['Chimoio', 'Gondola', 'Sussundenga', 'Manica', 'Mossurize', 'Bárue', 'Macate', 'Vanduzi', 'Guro']
    },
    {
      nome: 'Maputo Cidade',
      distritos: ['KaMpfumo', 'Nlhamankulu', 'KaMaxakeni', 'KaMavota', 'KaMubukwana', 'KaTembe', 'KaNyaka']
    },
    {
      nome: 'Maputo Província',
      distritos: ['Matola', 'Boane', 'Namaacha', 'Manhiça', 'Marracuene', 'Moamba', 'Magude', 'Matutuíne']
    },
    {
      nome: 'Nampula',
      distritos: ['Nampula Cidade', 'Angoche', 'Nacala Porto', 'Monapo', 'Eráti', 'Ribáuè', 'Malema', 'Meconta', 'Ilha de Moçambique']
    },
    {
      nome: 'Niassa',
      distritos: ['Lichinga', 'Cuamba', 'Lago', 'Mandimba', 'Majune', 'Sanga', 'Mecanhelas', 'Marrupa', 'Muembe']
    },
    {
      nome: 'Sofala',
      distritos: ['Beira', 'Dondo', 'Nhamatanda', 'Caia', 'Búzi', 'Gorongosa', 'Marromeu', 'Cheringoma', 'Chemba']
    },
    {
      nome: 'Tete',
      distritos: ['Tete Cidade', 'Moatize', 'Angónia', 'Mutarara', 'Cahora Bassa', 'Changara', 'Macanga', 'Tsangano', 'Chifunde']
    },
    {
      nome: 'Zambézia',
      distritos: ['Quelimane', 'Mocuba', 'Gurué', 'Milange', 'Alto Molócuè', 'Mopeia', 'Nicoadala', 'Chinde', 'Namacurra']
    }
  ];

  getProvinces(): Province[] {
    return this.provinces;
  }

  getDistrictsForProvince(provinceName: string): string[] {
    const province = this.provinces.find(p => p.nome.toLowerCase() === provinceName.toLowerCase());
    return province ? province.distritos : [];
  }
}
