import { Heart } from 'lucide-react';

interface EmptyStateProps {
  category: string;
}

const categoryEmojis: Record<string, string> = {
  watch: '📺',
  movies: '🎬',
  games: '🎮',
  food: '🍕',
  places: '📍',
  dates: '💝',
  jokes: '😄',
  alarm: '⏰',
  top3: '🏆',
  mural: '💌',
  other: '☂️',
};

const categoryMessages: Record<string, string> = {
  watch: 'Adicione vídeos e conteúdos para assistir',
  movies: 'Crie sua lista de filmes e séries',
  games: 'Salve jogos para jogar juntos',
  food: 'Descubram comidas e restaurantes',
  places: 'Marquem lugares para visitar',
  dates: 'Adicione datas especiais com lembretes',
  jokes: 'Guardem suas bobeiras internas',
  alarm: 'Configure lembretes compartilhados',
  top3: 'Criem suas listas de Top 3 favoritos',
  mural: 'Compartilhem momentos especiais',
  other: 'Adicione outros itens importantes',
};

export function EmptyState({ category }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-7xl mb-4 animate-pulse">
        {categoryEmojis[category] || '💕'}
      </div>
      <p className="text-lg text-muted-foreground mb-2">
        {categoryMessages[category] || 'Nenhum item ainda'}
      </p>
      <p className="text-base text-muted-foreground/70">
        Toque no botão + para começar
      </p>
    </div>
  );
}