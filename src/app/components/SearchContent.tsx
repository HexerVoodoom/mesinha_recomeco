import { useState } from 'react';
import { motion } from 'motion/react';
import { Search as SearchIcon, X, Tv, Film, Gamepad2, UtensilsCrossed, MapPin, Calendar, Smile, AlarmClock, Trophy, MoreHorizontal } from 'lucide-react';
import { ListItem } from '../utils/api';
import { ListItemComponent } from './ListItemComponent';
import { Top3ItemComponent } from './Top3ItemComponent';

type Category = 'watch' | 'movies' | 'games' | 'food' | 'places' | 'dates' | 'jokes' | 'alarm' | 'top3' | 'other';

const categoryIcons: Record<Category, any> = {
  watch: Tv,
  movies: Film,
  games: Gamepad2,
  food: UtensilsCrossed,
  places: MapPin,
  dates: Calendar,
  jokes: Smile,
  alarm: AlarmClock,
  top3: Trophy,
  other: MoreHorizontal,
};

const categoryLabels: Record<Category, string> = {
  watch: 'Assistir',
  movies: 'Filmes/Séries',
  games: 'Jogos',
  food: 'Comidas',
  places: 'Lugares',
  dates: 'Datas',
  jokes: 'Bobeiras',
  alarm: 'Lembrete',
  top3: 'Top 3',
  other: 'Outros',
};

interface SearchContentProps {
  items: ListItem[];
  expandedItemId: string | null;
  onToggleExpand: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<ListItem>) => void;
  onDeleteItem: (id: string) => void;
  onMarkAsDone: (id: string) => void;
  onMarkAsPending: (id: string) => void;
}

export function SearchContent({
  items,
  expandedItemId,
  onToggleExpand,
  onUpdateItem,
  onDeleteItem,
  onMarkAsDone,
  onMarkAsPending,
}: SearchContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Coletar todas as tags únicas com contagem
  const getTagsWithCounts = () => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));
  };

  const allTags = getTagsWithCounts();
  
  // Filtrar tags baseado na pesquisa
  const suggestedTags = searchQuery.trim()
    ? allTags.filter(({ tag }) => 
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Filtrar itens pela tag selecionada
  const filteredItems = selectedTag
    ? items.filter(item => item.tags && item.tags.includes(selectedTag))
    : [];

  const handleSelectTag = (tag: string) => {
    setSelectedTag(tag);
    setSearchQuery(tag);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedTag(null);
  };

  // Agrupar itens por categoria
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const category = item.category as Category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<Category, ListItem[]>);

  return (
    <div className="px-6 pb-24">
      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedTag(null);
            }}
            placeholder="Digite para buscar tags..."
            className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-base"
            autoFocus
          />
          {(searchQuery || selectedTag) && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dropdown de Sugestões */}
        {suggestedTags.length > 0 && !selectedTag && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 bg-white border-2 border-border rounded-2xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
          >
            {suggestedTags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => handleSelectTag(tag)}
                className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center justify-between group border-b border-border last:border-b-0"
              >
                <span className="font-medium text-foreground text-base">{tag}</span>
                <span className="text-sm text-muted-foreground group-hover:text-primary">
                  {count} {count === 1 ? 'item' : 'itens'}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Results */}
      {selectedTag ? (
        <div className="space-y-6">
          {/* Tag selecionada */}
          <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SearchIcon className="w-5 h-5 text-primary" />
                <span className="text-base font-medium text-primary">
                  Resultados para: <span className="font-bold">{selectedTag}</span>
                </span>
              </div>
              <span className="text-sm text-primary/70">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
          </div>

          {/* Items grouped by category */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-lg font-medium text-muted-foreground">
                Nenhum item encontrado com esta tag
              </p>
            </div>
          ) : (
            Object.entries(itemsByCategory).map(([category, categoryItems]) => {
              const Icon = categoryIcons[category as Category];
              const label = categoryLabels[category as Category];
              
              return (
                <div key={category} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center gap-2 px-2">
                    <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    <h3 className="font-semibold text-base text-[#2B2A28]">{label}</h3>
                    <span className="text-sm text-muted-foreground">
                      ({categoryItems.length})
                    </span>
                  </div>

                  {/* Category Items */}
                  <div className="space-y-2">
                    {categoryItems.map(item => (
                      category === 'top3' ? (
                        <Top3ItemComponent
                          key={item.id}
                          item={item}
                          onUpdate={(updatedItem) => onUpdateItem(item.id, updatedItem)}
                          onDelete={() => onDeleteItem(item.id)}
                        />
                      ) : (
                        <ListItemComponent
                          key={item.id}
                          item={item}
                          isExpanded={expandedItemId === item.id}
                          onToggleExpand={() => onToggleExpand(
                            expandedItemId === item.id ? null : item.id
                          )}
                          onUpdate={(updates) => onUpdateItem(item.id, updates)}
                          onDelete={() => onDeleteItem(item.id)}
                          onMarkAsDone={() => onMarkAsDone(item.id)}
                          onMarkAsPending={() => onMarkAsPending(item.id)}
                          allItems={items}
                        />
                      )
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏷️</div>
          <p className="text-lg font-medium text-muted-foreground mb-2">
            Comece a digitar para buscar
          </p>
          <p className="text-sm text-muted-foreground">
            Digite o nome de uma tag para ver todos os itens
          </p>
        </div>
      )}
    </div>
  );
}
