import {
  Tv,
  Film,
  Gamepad2,
  UtensilsCrossed,
  MapPin,
  MapPinned,
  Calendar,
  Smile,
  AlarmClock,
  Umbrella,
  CalendarHeart,
  Trophy,
  Gift,
} from 'lucide-react';
import imgIconeMural from "figma:asset/f55be14c67f2ee6191fde351aa33771fce7d5b93.png";
import imgIconLembrete from "figma:asset/5097108198344c1c84390e42ebe8df3ec16868c9.png";
import imgIconData from "figma:asset/e6ae93276b700b8f8f931da6519affe6c2e9c5d0.png";
import imgIconBobeiras from "figma:asset/44df7767036d0bbe143fb9ee3102554d9c29474f.png";
import imgIconTop3 from "figma:asset/f296c57b6ed7e73b350453d968fd883591dd3581.png";
import imgIconFilmesESeries from "figma:asset/a7e6f180afcfd6cefd1ae8165ed758a29e25da14.png";
import imgIconPesquisar from "figma:asset/cb1c8fe4b905e0ba73cec7627c5b9f5168142c03.png";
import imgIconOutros from "figma:asset/9598e760cce271dc861fb90f06a336792553ef6a.png";
import imgIconLugares from "figma:asset/d4ec5ae65b7bd51ce704f9bf07164532caa53a33.png";
import imgIconcomidas from "figma:asset/2c8cffafea0b456e1dfa9a773e633226de456ac0.png";
import imgIconVideoGame from "figma:asset/783a5ddb42e8653aa6debba484cc8b75c211df92.png";
import imgIconVieosCurtos from "figma:asset/b72dc3ec57224b4caa82c0bbb8e9602e4a8602e4.png";

export type Category =
  | 'watch' | 'movies' | 'games' | 'food' | 'places' | 'dates'
  | 'jokes' | 'alarm' | 'top3' | 'mural' | 'other';

export const categories = [
  { id: 'mural' as Category, icon: Gift, label: 'Mural' },
  { id: 'alarm' as Category, icon: AlarmClock, label: 'Lembrete' },
  { id: 'dates' as Category, icon: Calendar, label: 'Datas' },
  { id: 'jokes' as Category, icon: Smile, label: 'Bobeiras' },
  { id: 'top3' as Category, icon: Trophy, label: 'Top 3' },
  { id: 'movies' as Category, icon: Film, label: 'Filmes/Séries' },
  { id: 'watch' as Category, icon: Tv, label: 'Vídeos Curtos' },
  { id: 'games' as Category, icon: Gamepad2, label: 'Jogos' },
  { id: 'food' as Category, icon: UtensilsCrossed, label: 'Comidas' },
  { id: 'places' as Category, icon: MapPin, label: 'Lugares' },
  { id: 'other' as Category, icon: Umbrella, label: 'Outros' },
];

// Mapeamento dos ícones personalizados do Figma
const categoryIcons: Record<Category | 'search', string> = {
  mural: imgIconeMural,
  alarm: imgIconLembrete,
  dates: imgIconData,
  jokes: imgIconBobeiras,
  top3: imgIconTop3,
  movies: imgIconFilmesESeries,
  watch: imgIconVieosCurtos,
  games: imgIconVideoGame,
  food: imgIconcomidas,
  places: imgIconLugares,
  other: imgIconOutros,
  search: imgIconPesquisar,
};

// Ferramentas extras (fora da grade de categorias), num slider horizontal
// pra sempre dar pra encaixar mais uma sem espremer os ícones existentes.
const tools = [
  { id: 'meetup' as const, icon: CalendarHeart, label: 'Encontros' },
  { id: 'map' as const, icon: MapPinned, label: 'Mapa' },
];
type ToolId = (typeof tools)[number]['id'];

interface CategoryMenuProps {
  activeCategory: Category;
  showSearch: boolean;
  showMeetupCalendar: boolean;
  showMap: boolean;
  onCategoryChange: (categoryId: Category) => void;
  onOpenMeetupCalendar: () => void;
  onOpenMap: () => void;
}

/** Cartão com o badge da categoria ativa, a grade de ícones de navegação e o slider de ferramentas. */
export function CategoryMenu({
  activeCategory,
  showSearch,
  showMeetupCalendar,
  showMap,
  onCategoryChange,
  onOpenMeetupCalendar,
  onOpenMap,
}: CategoryMenuProps) {
  const activeTool: ToolId | null = showMeetupCalendar ? 'meetup' : showMap ? 'map' : null;
  const activeToolMeta = tools.find(t => t.id === activeTool);
  const toolHandlers: Record<ToolId, () => void> = { meetup: onOpenMeetupCalendar, map: onOpenMap };

  return (
    <div className="bg-[#F8F6F4] rounded-[32px] border-2 border-[#E9E4DF] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[21px] mb-6 relative mx-6">
      {/* Label Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E9E4DF] rounded-full px-4 py-1 flex items-center gap-2">
        {activeToolMeta ? (
          <activeToolMeta.icon className="w-5 h-5 text-[#2B2A28]" strokeWidth={1.5} />
        ) : (
          <img
            src={showSearch ? categoryIcons.search : categoryIcons[activeCategory]}
            alt=""
            className="w-5 h-5 object-contain"
          />
        )}
        <span className="font-['Quicksand',sans-serif] font-bold text-xs text-[#2B2A28] uppercase tracking-tight">
          {activeToolMeta ? activeToolMeta.label : showSearch ? 'Buscar' : categories.find(c => c.id === activeCategory)?.label}
        </span>
      </div>

      {/* Category Icons Grid */}
      <div className="grid grid-cols-6 gap-4 pt-4">
        {categories.map(category => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id && !activeTool && !showSearch;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className="flex flex-col items-center gap-1"
            >
              <div className={`transition-colors ${
                isActive ? 'text-[#4D989B]' : 'text-[#2B2A28]'
              }`}>
                <Icon className="w-[20px] h-[20px]" strokeWidth={1.5} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Slider de ferramentas: espaço pra crescer sem mexer na grade acima */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pt-4 mt-3 border-t border-[#E9E4DF] -mx-1 px-1 hide-scrollbar">
        {tools.map(tool => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={toolHandlers[tool.id]}
              className={`shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition-colors ${
                isActive ? 'border-primary bg-primary/10 text-primary' : 'border-[#E9E4DF] text-[#2B2A28]'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-xs font-medium whitespace-nowrap">{tool.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
