import { ListItem } from '../utils/api';
import { MuralItemComponent } from './MuralItemComponent';
import { EmptyState } from './EmptyState';

interface MuralSectionProps {
  pendingItems: ListItem[];
  userProfile: 'Amanda' | 'Mateus';
  onDeleteItem: (id: string) => void;
  onMarkViewed: (id: string) => void;
  onToggleLike: (id: string) => void;
  onSetReaction: (id: string, emoji: string | null) => void;
}

/**
 * Grade do mural: primeiro post em largura total (hero) e os demais em duas
 * colunas.
 */
export function MuralSection({ pendingItems, userProfile, onDeleteItem, onMarkViewed, onToggleLike, onSetReaction }: MuralSectionProps) {
  if (pendingItems.length === 0) {
    return <EmptyState category="mural" />;
  }

  return (
    <>
      {/* Primeiro item do mural - largura total */}
      <div className="mb-4">
        <MuralItemComponent
          key={pendingItems[0].id}
          item={pendingItems[0]}
          onDelete={() => onDeleteItem(pendingItems[0].id)}
          currentUser={userProfile}
          onMarkViewed={() => onMarkViewed(pendingItems[0].id)}
          onToggleLike={() => onToggleLike(pendingItems[0].id)}
          onSetReaction={(emoji) => onSetReaction(pendingItems[0].id, emoji)}
          isHeroItem={true}
        />
      </div>

      {/* Demais itens em grid 2 colunas */}
      {pendingItems.length > 1 && (
        <div className="grid grid-cols-2 gap-4">
          {pendingItems.slice(1).map(item => (
            <MuralItemComponent
              key={item.id}
              item={item}
              onDelete={() => onDeleteItem(item.id)}
              currentUser={userProfile}
              onMarkViewed={() => onMarkViewed(item.id)}
              onToggleLike={() => onToggleLike(item.id)}
              onSetReaction={(emoji) => onSetReaction(item.id, emoji)}
              isHeroItem={false}
            />
          ))}
        </div>
      )}
    </>
  );
}
