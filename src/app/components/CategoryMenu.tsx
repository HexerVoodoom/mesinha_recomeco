import { useRef, useState, type ComponentType } from 'react';
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
  Dices,
  HeartHandshake,
  Hourglass,
  SmilePlus,
  MessageCircleQuestion,
  Brush,
  ListChecks,
  Sparkles,
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
  | 'jokes' | 'alarm' | 'top3' | 'mural' | 'other' | 'capsule'
  | 'chore' | 'bucket' | 'gratitude';

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
  { id: 'capsule' as Category, icon: Hourglass, label: 'Cápsula' },
  { id: 'chore' as Category, icon: Brush, label: 'Tarefas' },
  { id: 'bucket' as Category, icon: ListChecks, label: 'Sonhos' },
  { id: 'gratitude' as Category, icon: Sparkles, label: 'Gratidão' },
];

// Categorias que nasceram depois da grade original — vão pra página 2 junto
// das ferramentas, preservando a página 1 como sempre foi.
const PAGE_2_CATEGORIES: Category[] = ['capsule', 'chore', 'bucket', 'gratitude'];

// Mapeamento dos ícones personalizados do Figma. Categorias sem PNG (ex.:
// capsule) caem no ícone lucide correspondente no badge.
const categoryIcons: Partial<Record<Category | 'search', string>> = {
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

// Ferramentas extras, que entram na mesma grade de ícones (não são categoria
// de lista, mas usam o mesmo slot visual). "meetup" e "map" trocam a tela;
// "roleta" e "nudge" abrem modais por cima da tela atual.
const tools = [
  { id: 'meetup' as const, icon: CalendarHeart, label: 'Encontros' },
  { id: 'map' as const, icon: MapPinned, label: 'Mapa' },
  { id: 'mood' as const, icon: SmilePlus, label: 'Humor' },
  { id: 'question' as const, icon: MessageCircleQuestion, label: 'Pergunta do Dia' },
  { id: 'roleta' as const, icon: Dices, label: 'Roleta' },
  { id: 'nudge' as const, icon: HeartHandshake, label: 'Cutucada' },
];
type ToolId = (typeof tools)[number]['id'];

type MenuEntry =
  | { kind: 'category'; id: Category; icon: ComponentType<{ className?: string; strokeWidth?: number }> }
  | { kind: 'tool'; id: ToolId; icon: ComponentType<{ className?: string; strokeWidth?: number }> };

// Grade original de 6x2 (12 ícones). Quando sobra mais que 12 (categorias +
// ferramentas), a grade vira um slide: a página 1 continua exatamente como
// era, e o que não coube nasce numa página 2 (por enquanto só o Mapa) — dá
// pra ir enchendo essa segunda página com mais ferramentas no futuro.
const PAGE_SIZE = 12;

function paginate(entries: MenuEntry[]): (MenuEntry | null)[][] {
  const pages: (MenuEntry | null)[][] = [];
  for (let i = 0; i < entries.length; i += PAGE_SIZE) {
    const page: (MenuEntry | null)[] = entries.slice(i, i + PAGE_SIZE);
    while (page.length < PAGE_SIZE) page.push(null);
    pages.push(page);
  }
  return pages;
}

interface CategoryMenuProps {
  activeCategory: Category;
  showSearch: boolean;
  showMeetupCalendar: boolean;
  showMap: boolean;
  showMood: boolean;
  showQuestion: boolean;
  onCategoryChange: (categoryId: Category) => void;
  onOpenMeetupCalendar: () => void;
  onOpenMap: () => void;
  onOpenMood: () => void;
  onOpenQuestion: () => void;
  onOpenRoulette: () => void;
  onOpenNudge: () => void;
}

/** Cartão com o badge da categoria ativa e a grade de ícones (6x2, com slide pra mais páginas). */
export function CategoryMenu({
  activeCategory,
  showSearch,
  showMeetupCalendar,
  showMap,
  showMood,
  showQuestion,
  onCategoryChange,
  onOpenMeetupCalendar,
  onOpenMap,
  onOpenMood,
  onOpenQuestion,
  onOpenRoulette,
  onOpenNudge,
}: CategoryMenuProps) {
  // Roleta e Cutucada abrem modais (não trocam a tela), então nunca ficam "ativas".
  const activeTool: ToolId | null = showMeetupCalendar ? 'meetup'
    : showMap ? 'map'
    : showMood ? 'mood'
    : showQuestion ? 'question'
    : null;
  const activeToolMeta = tools.find(t => t.id === activeTool);
  const toolHandlers: Record<ToolId, () => void> = {
    meetup: onOpenMeetupCalendar,
    map: onOpenMap,
    mood: onOpenMood,
    question: onOpenQuestion,
    roleta: onOpenRoulette,
    nudge: onOpenNudge,
  };

  // Ordem da grade: a página 1 fica EXATAMENTE como sempre foi (11 categorias
  // + Encontros); tudo que veio depois mora nas páginas seguintes — sem
  // quebrar a memória muscular de ninguém.
  const page1Categories = categories.filter(c => !PAGE_2_CATEGORIES.includes(c.id));
  const laterCategories = categories.filter(c => PAGE_2_CATEGORIES.includes(c.id));
  const entries: MenuEntry[] = [
    ...page1Categories.map(c => ({ kind: 'category' as const, id: c.id, icon: c.icon })),
    ...tools.map(t => ({ kind: 'tool' as const, id: t.id, icon: t.icon })),
    ...laterCategories.map(c => ({ kind: 'category' as const, id: c.id, icon: c.icon })),
  ];
  const pages = paginate(entries);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setPageIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="bg-[#F8F6F4] rounded-[32px] border-2 border-[#E9E4DF] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[21px] mb-6 relative mx-6">
      {/* Label Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E9E4DF] rounded-full px-4 py-1 flex items-center gap-2">
        {activeToolMeta ? (
          <activeToolMeta.icon className="w-5 h-5 text-[#2B2A28]" strokeWidth={1.5} />
        ) : (showSearch ? categoryIcons.search : categoryIcons[activeCategory]) ? (
          <img
            src={showSearch ? categoryIcons.search : categoryIcons[activeCategory]}
            alt=""
            className="w-5 h-5 object-contain"
          />
        ) : (() => {
          // Categoria sem PNG do Figma (ex.: Cápsula): usa o ícone lucide dela
          const meta = categories.find(c => c.id === activeCategory);
          return meta ? <meta.icon className="w-5 h-5 text-[#2B2A28]" strokeWidth={1.5} /> : null;
        })()}
        <span className="font-['Quicksand',sans-serif] font-bold text-xs text-[#2B2A28] uppercase tracking-tight">
          {activeToolMeta ? activeToolMeta.label : showSearch ? 'Buscar' : categories.find(c => c.id === activeCategory)?.label}
        </span>
      </div>

      {/* Grade de ícones (categorias + ferramentas), com slide entre páginas de 12 */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pt-4"
      >
        {pages.map((page, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 w-full shrink-0 snap-start">
            {page.map((entry, slot) => {
              if (!entry) return <div key={`empty-${slot}`} />;
              const Icon = entry.icon;
              const isActive = entry.kind === 'category'
                ? activeCategory === entry.id && !activeTool && !showSearch
                : activeTool === entry.id;
              const onClick = entry.kind === 'category'
                ? () => onCategoryChange(entry.id)
                : toolHandlers[entry.id];
              return (
                <button
                  key={`${entry.kind}-${entry.id}`}
                  onClick={onClick}
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
        ))}
      </div>

      {/* Bolinhas indicando a página atual — só aparece quando há mais de uma */}
      {pages.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {pages.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === pageIndex ? 'bg-[#4D989B]' : 'bg-[#E9E4DF]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
