---
name: designer
description: Designer do TinPet. Use ao criar ou mudar qualquer tela, componente, texto de interface, cor, ícone ou ilustração do apps/web, ou quando pedirem para revisar o visual, "deixar com cara própria" ou tirar a "cara de IA". Traz a identidade visual do TinPet, a lista do que denuncia layout gerado por IA e o passo a passo para conferir com capturas reais.
---

# Designer do TinPet

O TinPet é o **quadro de avisos do bairro para quem tem pet**: vizinhos que se ajudam a achar pet perdido, passear, vacinar e se encontrar. A interface tem que parecer feita por gente daqui, para um uso real, não um template de "app de pet" gerado em série.

## Identidade

**Conceito-assinatura: a plaquinha de coleira.** É um recurso de verdade do app (QR na coleira que acha o pet perdido). A forma dela (círculo com argola no topo) é o logo e aparece como selo nos lugares importantes, com o componente `Plaquinha` (`apps/web/src/components/ui/Plaquinha.tsx`). Não use pata de pacote de ícones como marca.

**Cores** (tokens em `apps/web/src/index.css`, sempre pelo nome, nunca hex solto no JSX):

| Token | Papel | Inspiração |
|---|---|---|
| `brand-*` (caju) | ação principal, alertas, destaque | o vermelho-alaranjado do caju |
| `sun-*` (cajuína) | selo, recompensa, ranking | o dourado da cajuína |
| `river-*` (verde-rio) | confiança, privacidade, saúde, links secundários | o verde-escuro do rio Poti |
| `ink` | texto | marrom quase preto, quente (nada de roxo) |
| `canvas` / `surface` | fundos | papel de quadro de avisos, cru |

**Tipografia:** `font-display` = Bricolage Grotesque (títulos, números grandes); `font-sans` = Nunito Sans (todo o resto). Títulos curtos e com peso; nada de título em gradiente.

**Forma:** cantos de `rounded-card` (1 rem) em cartões; `rounded-full` só em botões, avatares e selos. Prefira **borda** (`border-line`) a sombra; sombra só no que flutua (menus, folhas, o pino do mural).

**Ícones:** lucide, traço fino, em cor de texto (`text-muted` ou `text-ink`). Ícone dentro de quadradinho colorido em todo card é cara de template: só use quando o ícone **é** o conteúdo (ex.: tipo de notificação).

## Voz dos textos

- Concreto e do dia a dia: "Mel sumiu perto do Jóquei" em vez de "Ajude pets perdidos".
- Fale do que o app **faz**, com o nome da coisa: plaquinha, passeador, cãominhada, carteira de vacina.
- Sem promessa vazia ("revolucione", "tudo o que você precisa", "em primeiro lugar", "experiência incrível").
- Sem número inventado (nada de "+10 mil tutores" sem dado real).
- Emoji: só em conteúdo de usuário, em notificações e no máximo um por tela de festa (match, pet encontrado). Nunca em título, botão ou toast de rotina.
- Segunda pessoa, frases curtas, português do Brasil sem gírias forçadas.

## O que denuncia "cara de IA" (checklist de revisão)

Se a tela tem **três ou mais** destes, refaça:

- [ ] Selo em pílula acima do título ("✨ A nova forma de...")
- [ ] Título com uma palavra em cor de destaque ou gradiente
- [ ] Dois botões lado a lado no hero ("Começar grátis" + "Saiba mais")
- [ ] Colagem de fotos inclinadas com um balão flutuante ("Deu match!")
- [ ] Grade de 3 ou 4 cards iguais: ícone em quadradinho + título + 2 linhas
- [ ] Lista com ícone de escudo/check em cada item
- [ ] Faixa escura no fim com "Pronto para começar?"
- [ ] Gradientes roxo/rosa, brilho, vidro fosco sem motivo
- [ ] Todos os cantos muito arredondados e todas as caixas com sombra
- [ ] Textos genéricos que serviriam para qualquer app
- [ ] Emoji em título, botão ou mensagem de sistema
- [ ] Mesma foto de banco repetida na página

## Como trabalhar

1. **Veja antes de mexer.** Suba o app (`pnpm dev`) e tire capturas reais com o Chrome sem janela:
   ```bash
   CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
   "$CHROME" --headless=new --hide-scrollbars --window-size=390,2400 --virtual-time-budget=6000 \
     --screenshot='C:\pgtinpet\shots\tela-celular.png' http://localhost:5173/
   ```
   Faça em 390 px (celular, o uso real) e 1366 px. Use um caminho sem acento para o arquivo.
2. **Marque o checklist** acima e anote o que é genérico.
3. **Mude pelo sistema, não pela tela:** se a mudança é de cor, fonte ou forma, mude o token em `index.css` ou o componente em `components/ui`; não espalhe classes soltas.
4. **Escreva o texto antes do layout.** Se o texto é genérico, nenhum layout salva.
5. **Confira de novo** com captura em celular e computador, nos temas claro e escuro (`localStorage.setItem('tinpet:tema','dark')`).
6. **Acessibilidade não é opcional:** contraste AA (texto 4.5:1), foco visível, alvo de toque ≥ 44 px, `alt` em foto que informa, `aria-hidden` em decoração.
7. Rode `pnpm lint && pnpm typecheck && pnpm test` antes de dizer que terminou.
