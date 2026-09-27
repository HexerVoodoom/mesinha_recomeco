package com.mesinha.app

import java.time.LocalDate

/**
 * Par de falas do widget duplo: uma fala do Corvinho e uma da Alpaquinha.
 */
data class DialoguePair(val corvinho: String, val alpaquinha: String)

/**
 * Frases PADRÃO (reserva) dos widgets, embutidas no app. São usadas quando
 * ainda não há uma lista baixada do servidor (ver [PhraseRepository]) — por
 * exemplo, no primeiro uso ou sem internet. A lista "ao vivo" fica no backend
 * (KV `widget-phrases`) e é editada pelo próprio app em Configurações.
 */
object Dialogues {

    val DEFAULT_POOL: List<DialoguePair> = listOf(
        DialoguePair("Viram algum post novo no Mural hoje?", "Vi sim! Que memória mais fofa..."),
        DialoguePair("Qual é o plano de hoje?", "Jantar naquele lugar que a gente salvou!"),
        DialoguePair("Tem filme novo na lista pra maratonar?", "Tem! Coloca na fila e aguarda!"),
        DialoguePair("Não esquece o lembrete das 21h!", "Já ativei! Obrigada, corvinho."),
        DialoguePair("Que data especial está chegando?", "Olha lá nas Datas e se prepara!"),
        DialoguePair("Bobeira do dia: qual foi a melhor?", "Aquela do elevador ainda me faz rir!"),
        DialoguePair("Top 3 filmes de romance, vai lá!", "La La Land, já garantido no primeiro!"),
        DialoguePair("Tem lugar novo pra visitar na lista?", "Uma cachoeira novinha apareceu!"),
        DialoguePair("Comida nova pra explorar esse mês?", "Aquela pizza na lista me chama demais!"),
        DialoguePair("Alguém curtiu o post do mural hoje?", "Só corações e amor por aqui!"),
        DialoguePair("Já planejaram o fim de semana?", "Praia, piquenique ou sofá? Difícil!"),
        DialoguePair("Série nova na lista pra ver juntos?", "Adiciona lá e a gente decide!"),
        DialoguePair("Lembrete: dizer 'te amo' hoje!", "Isso não precisa de lembrete!"),
        DialoguePair("Viram algum vídeo curtinho hoje?", "Mandei um nos Vídeos Curtos!"),
        DialoguePair("Top 3 de sabores de sorvete, rápido!", "Chocolate, morango e creme! Fácil."),
        DialoguePair("Tem jogo novo pra jogar junto?", "Vamos jogar Ragnarok? Eu te curo!"),
        DialoguePair("Mural cheio de memórias boas?", "Cada post é uma históriazinha!"),
        DialoguePair("Aquele restaurante novo está na lista?", "Já adicionei em Comidas!"),
        DialoguePair("O aniversário de vocês está marcado?", "Claro! Com lembrete e tudo!"),
        DialoguePair("Qual o plano pra próxima viagem?", "Tem bastante coisa em Lugares!"),
        DialoguePair("Tem vídeo novo pra rir juntos?", "Adicionei três hoje! Vai rir muito."),
        DialoguePair("Já escreveram alguma bobeira hoje?", "Ainda não, mas tem história pra contar!"),
        DialoguePair("Lembrou de marcar a data importante?", "Sim! Com notificação e tudo!"),
        DialoguePair("Alguém ganhou o Top 3 de hoje?", "Empate! Os dois têm bom gosto."),
        DialoguePair("Que lugar faz tempo que querem ir?", "Machu Picchu está na lista há séculos!"),
        DialoguePair("Stardew Valley ou Ak-xolotl: Together hoje?", "Precisa de uma votação rápida!"),
        DialoguePair("Quantos itens pendentes na lista?", "Bastante! Mas faz parte do charme!"),
        DialoguePair("Já mandaram um post fofo no Mural?", "Ainda não! Vai lá e surpreende!"),
        DialoguePair("Culinária nova na lista de comidas?", "Japonesa está esperando uma chance!"),
        DialoguePair("Próximo jogo de tabuleiro: qual?", "Tem ideia salva em Jogos! Olha lá."),
        DialoguePair("O mural está com saudade de vocês!", "Bora adicionar uma memória nova!"),
        DialoguePair("Já conferiram os lembretes de hoje?", "Sim! Tudo certo e no horário."),
        DialoguePair("Prefiro cachoeira a praia hoje.", "Combinado, cachoeira então."),
        DialoguePair("Combinado, sofá, coberta e muito abraço.", "Hoje prefiro um encontro de sofá."),
        DialoguePair("Separei o controle pra jogar Ak-xolotl: Together.", "Perfeito, chego em cinco minutos."),
        DialoguePair("Foi um dia produtivo de Top 3 então.", "Vi duas betoneiras novas na rua hoje."),
        DialoguePair("Tem episódio novo de Frieren.", "Bora maratonar juntinhos então."),
        DialoguePair("Melhor programa que existe.", "Reservei a noite inteira pro nosso cafuné."),
        DialoguePair("Coloquei aquele pastel colorido na lista de Comidas.", "Já coloquei estrelinha de favorito nele também."),
        DialoguePair("Só um, você prometeu.", "Já bebi meu monsterzim de hoje."),
        DialoguePair("Hoje tô com vontade de algo azedo.", "Eu sempre topo, você sabe."),
        DialoguePair("Gritei o nome dele bem alto, aposto.", "Vi o Fusca amarelo passar de novo hoje."),
        DialoguePair("Hoje eu vou de helicóptero salvar seu dia.", "Sempre pode contar comigo pra missão."),
        DialoguePair("Faltam poucos, olha lá em Datas.", "Já tô contando os dias pro nosso aniversário."),
        DialoguePair("Ainda não assisti aquele filme que salvamos.", "Bora colocar pra hoje à noite então."),
        DialoguePair("Já entrou na lista de Filmes/Séries, então.", "Apareceu uma série nova pra maratonar."),
        DialoguePair("Foi aquela do chinelo perdido, aposto.", "Registrei a bobeira de hoje no Mural."),
        DialoguePair("Uma vila de pescadores linda, vi sim.", "Coloquei um lugar novo na lista de viagem."),
        DialoguePair("Guardei uma cutucada pra mandar mais tarde.", "Vou adorar a surpresa."),
        DialoguePair("Sempre, principalmente do seu lado.", "Prefiro o pôr do sol ao amanhecer na praia."),
        DialoguePair("E é linda igual você, com certeza.", "Ak-xolotl: Together tem uma fase nova pra descobrir."),
        DialoguePair("Overcooked 2 ainda está esperando a gente.", "Hoje eu escolho jogar com você de verdade."),
        DialoguePair("Já separei a cura pra você.", "Marquei uma raid de Ragnarok pra hoje."),
        DialoguePair("Reservei um cafuné de fim de tarde.", "Com direito a soneca, espero."),
        DialoguePair("Virou tradição sagrada, com certeza.", "Aquele pastel colorido virou hábito de fim de semana."),
        DialoguePair("Um monster gelado combina bem com hoje.", "Combina ainda mais com um filme e colo."),
        DialoguePair("Perfeito, vou provar e rir com você.", "Hoje tá tudo azedinho por aqui."),
        DialoguePair("Aquele Fusca amarelo ainda dá sorte.", "Sempre dá, coisa boa vem por aí."),
        DialoguePair("Missão: me fazer sorrir, aceito.", "Vou te chamar de helicóptero de novo hoje."),
        DialoguePair("Faltam poucos dias pro nosso aniversário.", "Já tô ansiosa demais, viu."),
        DialoguePair("Fizemos o Top 3 de músicas do nosso casamento imaginário.", "E a primeira é a nossa música mesmo."),
        DialoguePair("Igual esse nosso momento, então.", "Meu Sabor do Dia de hoje foi doce."),
        DialoguePair("A Pergunta do Dia de hoje não foi fácil.", "Nem tanto, principalmente pensando em você."),
        DialoguePair("Sem sombra de dúvida, também prefiro.", "Prefiro café da manhã na cama."),
        DialoguePair("Marquei um lembrete novo pra essa semana.", "Nosso date de sexta, não vou esquecer."),
        DialoguePair("Já marquei com direito a lembrete.", "Apareceu uma data especial nova no calendário."),
        DialoguePair("Guardei uma bobeira nova pro Mural.", "Deve ser hilária, já quero ver."),
        DialoguePair("Eu já vi três, não canso de rir.", "Já vi o vídeo curtinho de hoje duas vezes."),
        DialoguePair("Uma comida nova entrou pra explorar esse mês.", "Um hambúrguer artesanal me chamando."),
        DialoguePair("Uma praia escondida, já vi.", "Apareceu um lugar secreto novo na lista."),
        DialoguePair("Tenho uma ideia solta pra guardar em Outros.", "Guardei uma surpresa pra você também."),
        DialoguePair("Hoje o encontro vai ser em casa com jogo.", "Ak-xolotl: Together já está esperando então."),
        DialoguePair("Aposto que chego antes de você.", "O Mapa está mostrando quem chega primeiro hoje."),
        DialoguePair("Fez o meu dia, com certeza.", "Mandei uma cutucada surpresa de manhã."),
        DialoguePair("Raft tem uma ilha nova pra explorar hoje.", "Perfeita pra uma tarde preguiçosa."),
        DialoguePair("Uma abóbora gigante, eu vi.", "Colhi algo bonito na fazenda de Stardew Valley."),
        DialoguePair("Frieren me fez chorar de novo no último episódio.", "Foi um choro bom, tipo os nossos."),
        DialoguePair("Prefiro um clássico de sempre a um filme novo.", "Clássico, sempre que é com você do lado."),
        DialoguePair("Foi disputadíssimo hoje, com certeza.", "A betoneira do dia já entrou no Top 3."),
        DialoguePair("Escondi um recadinho novo no Mural.", "Vou lá agora atrás desse carinho."),
        DialoguePair("Então digo agora: eu te amo.", "Ainda não disse 'eu te amo' hoje.")
    )

    val DEFAULT_AMANDA: List<String> = listOf(
        "Bom dia, meu amor! Já pensei em você hoje 💕",
        "Mateus, não esquece que te amo, viu?",
        "Add aquele filme na lista que quero ver com você!",
        "Saudade de você... vem logo pra Mesinha!",
        "Você é meu lugar favorito, sabia?",
        "Topa um date hoje? Eu escolho o lugar!",
        "Lembra de beber água, meu cuidadoso preferido!",
        "Te amo mais que ontem e menos que amanhã.",
        "Guardei uma bobeira nossa pra te contar!",
        "Você faz meus dias bem melhores, Mateus.",
        "Qual nosso próximo lugar pra visitar juntos?",
        "Coloquei a gente no Top 3 de hoje 😄",
        "Obrigada por ser tão você comigo.",
        "Vamos maratonar algo hoje à noite?",
        "Pensa numa pessoa apaixonada... sou eu por você.",
        "Te mandei um beijo pelo mural, achou?",
        "Você é o melhor parceiro de mesinha do mundo.",
        "Bora marcar mais uma memória nossa hoje?",
        "Meu coração tem seu nome, Mateus 💌",
        "Comida nova ou nosso clássico? Você decide!",
        "Conta comigo sempre, viu, amor?",
        "Cada dia com você é meu favorito.",
        "Já tô pensando no nosso próximo abraço.",
        "Você merece o mundo, e eu vou te dar.",
        "Vem fazer nada comigo, que é tudo com você.",
        "Anota aí: encontro marcado, eu e você.",
        "Te escolho de novo, todo santo dia.",
        "Seu sorriso é meu app favorito 😊",
        "Faz um carinho virtual em mim? Te amo!",
        "Tamo juntos nessa mesinha, pra sempre."
    )

    val DEFAULT_MATEUS: List<String> = listOf(
        "Bom dia, Amanda! Você é minha alegria 💙",
        "Amanda, tô aqui torcendo por você sempre.",
        "Separei um lugar lindo pra gente visitar!",
        "Você deixa tudo mais leve, sabia?",
        "Te amo do jeitinho que você é.",
        "Bora um date? Hoje eu cuido de tudo.",
        "Lembra que você é incrível, viu?",
        "Mal posso esperar pra te ver de novo.",
        "Add um jogo pra gente jogar juntos!",
        "Você é meu sorriso favorito, Amanda.",
        "Guardei uma memória nossa no mural 💌",
        "Conta comigo pra qualquer bobeira.",
        "Meu dia melhora quando penso em você.",
        "Qual filme a gente vê hoje, princesa?",
        "Você é o meu lugar de paz.",
        "Te escolhi e escolho todo dia.",
        "Saudade já... volta logo pra Mesinha!",
        "Obrigado por existir do meu lado.",
        "Você é o melhor que me aconteceu.",
        "Coloquei a gente no Top 3 de sempre.",
        "Vem cá receber um abraço apertado.",
        "Seu nome é meu lembrete favorito 💙",
        "Topa criar mais uma memória hoje?",
        "Você merece todo o carinho do mundo.",
        "Tô planejando uma surpresa... aguarda!",
        "Com você até o nada vira aventura.",
        "Te amo mais a cada mesinha nossa.",
        "Você é forte, linda e minha inspiração.",
        "Manda um oi que meu dia já ganha cor.",
        "Pra sempre eu e você, combinado?"
    )

    /**
     * Índice determinístico que muda 1x por dia para um pool de tamanho [size].
     * Fórmula: `(diaDoAno + ano*365) % size`.
     */
    fun dailyIndex(size: Int): Int {
        if (size <= 0) return 0
        // Dias desde 1970. A conta antiga (dia-do-ano + ano*365) dava o MESMO
        // número no 31/12 de um ano bissexto e no 1º de janeiro seguinte — a
        // frase do dia ficava repetida bem na virada do ano.
        val n = LocalDate.now().toEpochDay()
        return Math.floorMod(n, size.toLong()).toInt()
    }
}
