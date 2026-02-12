
export interface Task {
  title: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  icon: string;
  tasks: string[];
  goals: string[];
  color: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  features: string[];
  priceRange?: string;
  priceNotes?: string;
}

export interface Goal {
  id: number;
  title:string;
  description: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ContactInfo {
  phones: string[];
  email: string;
  ceo: {
    name: string;
    title: string;
    phone: string;
  };
  socials: {
    facebook: string;
    x: string;
    whatsapp: string;
  };
  address: string;
  mapEmbedUrl: string;
  mapDirectionsUrl: string;
}
