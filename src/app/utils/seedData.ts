import { api } from './api';

const sampleItems = [
  {
    title: 'Assistir Breaking Bad',
    comment: 'Todo mundo recomendou essa série',
    category: 'movies',
    createdBy: 'Amanda',
  },
  {
    title: 'Jantar no restaurante italiano',
    comment: 'Aquele que tem a melhor pizza',
    category: 'food',
    createdBy: 'Você',
  },
  {
    title: 'Visitar o parque novo da cidade',
    comment: 'Dizem que tem uma vista incrível',
    category: 'places',
    createdBy: 'Amanda',
  },
  {
    title: 'Nosso aniversário de namoro',
    comment: 'Planejar algo especial!',
    category: 'dates',
    eventDate: '2026-04-15',
    createdBy: 'Você',
  },
  {
    title: 'Jogar It Takes Two',
    comment: 'Jogo cooperativo perfeito para jogar juntos',
    category: 'games',
    createdBy: 'Amanda',
  },
  {
    title: 'Aquela piada do cachorro',
    comment: 'Nunca vamos esquecer 😂',
    category: 'jokes',
    createdBy: 'Você',
  },
];

let seedingAttempted = false;

export async function seedInitialData() {
  // Only attempt seeding once
  if (seedingAttempted) return;
  seedingAttempted = true;

  try {
    const existingItems = await api.getItems();
    
    // Only seed if there are no items yet
    if (existingItems.length === 0) {
      console.log('Seeding initial data...');
      for (const item of sampleItems) {
        await api.createItem(item);
      }
      console.log('Initial data seeded successfully');
    }
  } catch (error) {
    console.error('Failed to seed initial data - server may not be ready yet:', error);
    // Don't throw - allow app to continue loading
  }
}