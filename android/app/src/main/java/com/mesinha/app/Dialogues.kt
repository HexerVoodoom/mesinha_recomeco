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
        DialoguePair("Stardew Valley ou Unravel Two hoje?", "Precisa de uma votação rápida!"),
        DialoguePair("Quantos itens pendentes na lista?", "Bastante! Mas faz parte do charme!"),
        DialoguePair("Já mandaram um post fofo no Mural?", "Ainda não! Vai lá e surpreende!"),
        DialoguePair("Culinária nova na lista de comidas?", "Japonesa está esperando uma chance!"),
        DialoguePair("Próximo jogo de tabuleiro: qual?", "Tem ideia salva em Jogos! Olha lá."),
        DialoguePair("O mural está com saudade de vocês!", "Bora adicionar uma memória nova!"),
        DialoguePair("Já conferiram os lembretes de hoje?", "Sim! Tudo certo e no horário.")
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
        "Feliz Hoje!",
        "Bom dia pra minha princesa Alpaquinha!",
        "Amor da minha vida todinha, rainha do meu viver, senhora da minha vontade, cor do meu mundo, aquela que traz minha paz, destruidora das angústias, soberana da minha alma, evocadora dos meus sorrisos, inspiração da minha determinação, musa dos meus sonhos, razão do meu coração!",
        "Ainda que fique tudo preto, você sempre vai fazer meu caminho claro.",
        "Um beijo! Bem no meio dessa sua carinha bonita! E outro pra por onde quiser! Te amo!",
        "Um corvinho e uma alpaquinha entraram num bar.....",
        "Quando eu acordo a primeira coisa que faço é te procurar, seja na cama ou em mensagem..",
        "Bora de ragzin?",
        "Top 3 betoneiras VAI!",
        "Minha coisa favorita é sentir seu cheirinho DO NADA",
        "Vem deitar a cabeça no meu colo enquanto te faço cafuné :3",
        "Já vamos pensando no que assistir na próxima noite do reFrierengerante?",
        "Não tem tempo nem chão que te separa de mim, meu carinho ;)",
        "Se eu tivesse um último pedido antes do fim do mundo seria pra poder pentear seu cabelo outra vez.",
        "Obrigado por sempre me apoiar e acolher, é muito mais fácil e feliz com você.",
        "Amo você 🫵",
        "Cada pedacinho meu ama cada pedacinho seu!"
    )

    /**
     * Índice determinístico que muda 1x por dia para um pool de tamanho [size].
     * Fórmula: `(diaDoAno + ano*365) % size`.
     */
    fun dailyIndex(size: Int): Int {
        if (size <= 0) return 0
        val date = LocalDate.now()
        val n = date.dayOfYear.toLong() + date.year.toLong() * 365L
        return Math.floorMod(n, size.toLong()).toInt()
    }
}
