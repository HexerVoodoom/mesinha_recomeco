import {
  Tv,
  Film,
  Gamepad2,
  UtensilsCrossed,
  MapPin,
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

interface CategoryMenuProps {
  activeCategory: Category;
  showSearch: boolean;
  showMeetupCalendar: boolean;
  onCategoryChange: (categoryId: Category) => void;
  onOpenMeetupCalendar: () => void;
}

/** Cartão com o badge da categoria ativa e a grade de ícones de navegação. */
export function CategoryMenu({ activeCategory, showSearch, showMeetupCalendar, onCategoryChange, onOpenMeetupCalendar }: CategoryMenuProps) {
  return (
    <div className="bg-[#F8F6F4] rounded-[32px] border-2 border-[#E9E4DF] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[21px] mb-6 relative mx-6">
      {/* Label Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E9E4DF] rounded-full px-4 py-1 flex items-center gap-2">
        {showMeetupCalendar ? (
          <CalendarHeart className="w-5 h-5 text-[#2B2A28]" strokeWidth={1.5} />
        ) : (
          <img
            src={showSearch ? categoryIcons.search : categoryIcons[activeCategory]}
            alt=""
            className="w-5 h-5 object-contain"
          />
        )}
        <span className="font-['Quicksand',sans-serif] font-bold text-xs text-[#2B2A28] uppercase tracking-tight">
          {showMeetupCalendar ? 'Encontros' : showSearch ? 'Buscar' : categories.find(c => c.id === activeCategory)?.label}
        </span>
      </div>

      {/* Category Icons Grid */}
      <div className="grid grid-cols-6 gap-4 pt-4">
        {categories.map(category => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id && !showSearch && !showMeetupCalendar;
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

        {/* Calendário de Encontros: propor e confirmar os dias em que vão se ver */}
        <button
          onClick={onOpenMeetupCalendar}
          className="flex flex-col items-center gap-1"
        >
          <div className={`transition-colors ${
            showMeetupCalendar ? 'text-[#4D989B]' : 'text-[#2B2A28]'
          }`}>
            <CalendarHeart className="w-[20px] h-[20px]" strokeWidth={1.5} />
          </div>
        </button>
      </div>
    </div>
  );
}
