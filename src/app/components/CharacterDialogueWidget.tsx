import { useMemo } from 'react';

interface DialoguePair {
  corvinho: string;
  alpaquinha: string;
}

const DIALOGUE_POOL: DialoguePair[] = [
  {
    corvinho: "Viram algum post novo no Mural hoje?",
    alpaquinha: "Vi sim! Que memória mais fofa...",
  },
  {
    corvinho: "Qual é o plano de hoje?",
    alpaquinha: "Jantar naquele lugar que a gente salvou!",
  },
  {
    corvinho: "Tem filme novo na lista pra maratonar?",
    alpaquinha: "Tem! Coloca na fila e aguarda!",
  },
  {
    corvinho: "Não esquece o lembrete das 21h!",
    alpaquinha: "Já ativei! Obrigada, corvinho.",
  },
  {
    corvinho: "Que data especial está chegando?",
    alpaquinha: "Olha lá nas Datas e se prepara!",
  },
  {
    corvinho: "Bobeira do dia: qual foi a melhor?",
    alpaquinha: "Aquela do elevador ainda me faz rir!",
  },
  {
    corvinho: "Top 3 filmes de romance, vai lá!",
    alpaquinha: "La La Land, já garantido no primeiro!",
  },
  {
    corvinho: "Tem lugar novo pra visitar na lista?",
    alpaquinha: "Uma cachoeira novinha apareceu!",
  },
  {
    corvinho: "Comida nova pra explorar esse mês?",
    alpaquinha: "Aquela pizza na lista me chama demais!",
  },
  {
    corvinho: "Alguém curtiu o post do mural hoje?",
    alpaquinha: "Só corações e amor por aqui!",
  },
  {
    corvinho: "Já planejaram o fim de semana?",
    alpaquinha: "Praia, piquenique ou sofá? Difícil!",
  },
  {
    corvinho: "Série nova na lista pra ver juntos?",
    alpaquinha: "Adiciona lá e a gente decide!",
  },
  {
    corvinho: "Lembrete: dizer 'te amo' hoje!",
    alpaquinha: "Isso não precisa de lembrete!",
  },
  {
    corvinho: "Viram algum vídeo curtinho hoje?",
    alpaquinha: "Mandei um nos Vídeos Curtos!",
  },
  {
    corvinho: "Top 3 de sabores de sorvete, rápido!",
    alpaquinha: "Chocolate, morango e creme! Fácil.",
  },
  {
    corvinho: "Tem jogo novo pra jogar junto?",
    alpaquinha: "It Takes Two ainda está esperando!",
  },
  {
    corvinho: "Mural cheio de memórias boas?",
    alpaquinha: "Cada post é uma históriazinha!",
  },
  {
    corvinho: "Aquele restaurante novo está na lista?",
    alpaquinha: "Já adicionei em Comidas!",
  },
  {
    corvinho: "O aniversário de vocês está marcado?",
    alpaquinha: "Claro! Com lembrete e tudo!",
  },
  {
    corvinho: "Qual o plano pra próxima viagem?",
    alpaquinha: "Tem bastante coisa em Lugares!",
  },
  {
    corvinho: "Tem vídeo novo pra rir juntos?",
    alpaquinha: "Adicionei três hoje! Vai rir muito.",
  },
  {
    corvinho: "Já escreveram alguma bobeira hoje?",
    alpaquinha: "Ainda não, mas tem história pra contar!",
  },
  {
    corvinho: "Lembrou de marcar a data importante?",
    alpaquinha: "Sim! Com notificação e tudo!",
  },
  {
    corvinho: "Alguém ganhou o Top 3 de hoje?",
    alpaquinha: "Empate! Os dois têm bom gosto.",
  },
  {
    corvinho: "Que lugar faz tempo que querem ir?",
    alpaquinha: "Machu Picchu está na lista há séculos!",
  },
  {
    corvinho: "Stardew Valley ou Unravel Two hoje?",
    alpaquinha: "Precisa de uma votação rápida!",
  },
  {
    corvinho: "Quantos itens pendentes na lista?",
    alpaquinha: "Bastante! Mas faz parte do charme!",
  },
  {
    corvinho: "Já mandaram um post fofo no Mural?",
    alpaquinha: "Ainda não! Vai lá e surpreende!",
  },
  {
    corvinho: "Culinária nova na lista de comidas?",
    alpaquinha: "Japonesa está esperando uma chance!",
  },
  {
    corvinho: "Próximo jogo de tabuleiro: qual?",
    alpaquinha: "Tem ideia salva em Jogos! Olha lá.",
  },
  {
    corvinho: "O mural está com saudade de vocês!",
    alpaquinha: "Bora adicionar uma memória nova!",
  },
  {
    corvinho: "Já conferiram os lembretes de hoje?",
    alpaquinha: "Sim! Tudo certo e no horário.",
  },
];

function getDailyIndex(): number {
  const now = new Date();
  const dayOfYear =
    Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
        86400000
    ) + now.getFullYear() * 365;
  return dayOfYear % DIALOGUE_POOL.length;
}

export function CharacterDialogueWidget() {
  const dialogue = useMemo(() => DIALOGUE_POOL[getDailyIndex()], []);

  return (
    <div
      className="relative mx-6 mb-5 rounded-[24px] overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #F0FAF9 0%, #F8F6F3 60%, #F5F0FF 100%)',
        border: '2px solid #C8EEEC',
        boxShadow: '0 2px 12px rgba(77,152,155,0.10)',
        minHeight: 120,
      }}
    >
      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 rounded-[24px]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #4D989B22 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      />

      {/* Widget label */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C8EEEC] rounded-full px-3 py-0.5 z-10">
        <span className="font-['Quicksand',sans-serif] font-bold text-[10px] text-[#3A8A8D] uppercase tracking-wide">
          Conversa do dia
        </span>
      </div>

      {/* Main layout: corvinho | bubbles | alpaquinha */}
      <div className="flex items-center justify-between px-3 pt-4 pb-3 gap-2 relative z-0">

        {/* Corvinho (left) */}
        <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 52 }}>
          <img
            src="/characters/corvinho.png"
            alt="Corvinho"
            className="w-12 h-12 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Speech bubbles (center) */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          {/* Corvinho's bubble — tail on left */}
          <div className="relative">
            <div
              className="rounded-[14px] rounded-tl-[4px] px-3 py-1.5"
              style={{
                background: '#1A1A1A',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              }}
            >
              <p
                className="font-['Quicksand',sans-serif] font-semibold leading-snug text-white"
                style={{ fontSize: 11 }}
              >
                {dialogue.corvinho}
              </p>
            </div>
          </div>

          {/* Alpaquinha's bubble — tail on right */}
          <div className="relative">
            <div
              className="rounded-[14px] rounded-br-[4px] px-3 py-1.5"
              style={{
                background: '#8B4513',
                boxShadow: '0 1px 4px rgba(139,69,19,0.20)',
              }}
            >
              <p
                className="font-['Quicksand',sans-serif] font-semibold leading-snug text-white text-right"
                style={{ fontSize: 11 }}
              >
                {dialogue.alpaquinha}
              </p>
            </div>
          </div>
        </div>

        {/* Alpaquinha (right) */}
        <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 52 }}>
          <img
            src="/characters/alpaquinha.png"
            alt="Alpaquinha"
            className="w-12 h-12 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>
    </div>
  );
}
