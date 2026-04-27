import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, AlertTriangle, Bot, User } from 'lucide-react';

const DISCLAIMER = 'As orientações deste chatbot são de caráter informativo e genérico. Consulte um nutricionista ou profissional de saúde habilitado antes de fazer alterações significativas na sua alimentação.';

// ------------------------------------------------------------
// Engine de resposta baseada em palavras-chave
// Substituir por chamada à API do Claude quando backend estiver pronto
// ------------------------------------------------------------
function gerarResposta(msg, contexto) {
  const texto = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const peso   = parseFloat(contexto?.peso)   || 80;
  const altura = parseFloat(contexto?.altura) || 175;
  const objetivo = contexto?.objetivo || 'Hipertrofia';

  const tmb = contexto?.sexo === 'F'
    ? 447.6 + 9.25 * peso + 3.1 * altura - 4.33 * (parseFloat(contexto?.idade) || 25)
    : 88.36 + 13.4 * peso + 4.8 * altura - 5.7 * (parseFloat(contexto?.idade) || 25);

  const tdee = Math.round(tmb * 1.55); // fator moderado (3-5x/semana)
  const calorias = objetivo === 'Hipertrofia' ? tdee + 300
    : objetivo === 'Definição' ? tdee - 400
    : objetivo === 'Força' ? tdee + 200
    : tdee;

  const protMin = Math.round(peso * 1.6);
  const protMax = Math.round(peso * 2.2);

  if (texto.match(/proteina|proteína|protein/)) {
    return `Para **${objetivo.toLowerCase()}**, a recomendação geral é consumir entre **${protMin}g e ${protMax}g de proteína por dia** (1,6–2,2g por kg de peso).

**Boas fontes proteicas:**
• Frango, peixe e carne bovina magra (~30g prot/100g)
• Ovos inteiros + claras
• Atum em lata (escorrido)
• Queijo cottage e iogurte grego
• Whey protein (suplemento — 25g prot/dose)

Distribua em 4–5 refeições ao longo do dia para otimizar a síntese proteica.`;
  }

  if (texto.match(/caloria|kcal|calorias|quanto comer|tdee|gasto/)) {
    return `Com base no seu perfil, seu **TDEE estimado é ~${tdee} kcal/dia** (gasto com 4–5 treinos semanais).

**Ajuste conforme objetivo:**
• Hipertrofia → **+250 a +400 kcal** = ~${tdee + 300} kcal
• Definição → **−300 a −500 kcal** = ~${tdee - 400} kcal
• Manutenção → **${tdee} kcal**

Calcule pela fórmula Mifflin-St Jeor e ajuste conforme evolução na balança (±0,5 kg/semana).`;
  }

  if (texto.match(/carboidrato|carbo|massa|arroz|batata|macarrao|macarrão/)) {
    return `Carboidratos são o principal combustível para treinos intensos. Para ${objetivo.toLowerCase()}:

**Recomendação:** 3–5g de carboidrato por kg/dia = **${Math.round(peso * 3)}–${Math.round(peso * 5)}g/dia**.

**Boas fontes:**
• Arroz branco/integral, batata doce
• Aveia, mandioca, macarrão integral
• Frutas (banana antes do treino)

Concentre a maior parte dos carboidratos **pré e pós-treino** para maximizar performance e recuperação.`;
  }

  if (texto.match(/gordura|gordurasaudavel|azeite|abacate|castanha|omega/)) {
    return `Gorduras saudáveis são essenciais para produção hormonal, inclusive testosterona.

**Recomendação:** 0,8–1,2g por kg/dia = **${Math.round(peso * 0.8)}–${Math.round(peso * 1.2)}g/dia**.

**Fontes recomendadas:**
• Azeite de oliva extra virgem
• Abacate
• Castanhas, nozes e amendoim
• Salmão e peixes gordos
• Ovos inteiros

Evite gorduras trans (frituras industrializadas).`;
  }

  if (texto.match(/pre.?treino|antes do treino|pre treino|energia para treinar/)) {
    return `**Refeição pré-treino** (30–60 min antes):

• **Carboidrato de médio índice glicêmico** + **proteína leve**
• Exemplos: banana + whey, arroz + frango, aveia + ovos

**Objetivo:** glicogênio disponível sem desconforto gástrico.

Se treinar em jejum (manhã cedo), considere 1 banana ou uma dose de whey antes — evita catabolismo sem prejudicar a queima de gordura.`;
  }

  if (texto.match(/pos.?treino|depois do treino|apos treino|recupera/)) {
    return `**Janela pós-treino** (até 60 min após):

• **Proteína de rápida absorção** + **carboidrato simples**
• Exemplos: whey + arroz branco, frango + batata, atum + pão integral

**Por que importa?**
O músculo está mais receptivo à síntese proteica nas primeiras 1–2h após o treino. Não pule esta refeição.

**Meta mínima pós-treino:** 30–40g de proteína.`;
  }

  if (texto.match(/suplemento|creatina|whey|bcaa|colageno|pre.?treino|suplementacao/)) {
    return `**Suplementos básicos para musculação intermediária:**

• **Creatina monohidratada** — o mais estudado. 3–5g/dia, diariamente (sem ciclar). Melhora força e volume muscular.
• **Whey protein** — proteína rápida. Útil se difícil bater meta pela alimentação.
• **Cafeína** — melhora performance. 3–6mg/kg, 30–45 min antes.

**Não urgentes para iniciantes-intermediários:**
BCAA (desnecessário se proteína estiver alta), Glutamina, HMB.

⚠️ Suplementos complementam — não substituem alimentação.`;
  }

  if (texto.match(/emagrecer|perder peso|perder gordura|deficit|defict|secar|definicao|definição/)) {
    return `Para **perder gordura preservando massa muscular**:

**Princípio:** déficit calórico moderado **(-300 a -500 kcal/dia)** = ~${tdee - 400} kcal.

**Dicas essenciais:**
• Mantenha proteína alta (${protMin}–${protMax}g/dia) — protege músculo no déficit
• Não corte carboidrato excessivamente — prejudica treino
• Déficit agressivo (>700 kcal) causa perda de músculo
• Pese na balança sempre no mesmo horário, média semanal

Perda saudável: **0,3–0,7kg por semana**.`;
  }

  if (texto.match(/ganhar massa|massa muscular|bulking|ganhar peso|hipertrofia/)) {
    return `Para **ganho de massa muscular**:

**Superávit calórico recomendado:** +250–400 kcal = ~${calorias} kcal/dia.

**Estratégia:**
• Superávit pequeno = menos gordura acumulada
• Proteína: ${protMin}–${protMax}g/dia (prioridade máxima)
• Carboidratos: 4–5g/kg — combustível para treinar pesado
• Ganho esperado: 0,5–1kg por mês (massa magra real)

Sem superávit + proteína adequada + treino progressivo = sem crescimento muscular.`;
  }

  if (texto.match(/agua|hidratacao|hidratação|beber/)) {
    return `**Hidratação para quem treina musculação:**

• Mínimo: **35ml por kg/dia** = ~${Math.round(peso * 35)}ml (${(peso * 35 / 1000).toFixed(1)}L)
• Com treino intenso: adicione **500–750ml extras**
• Urina clara/amarelo claro = bem hidratado

**Dicas:**
• Beba água antes, durante e após o treino
• Eletrólitos (sódio, potássio) importam em treinos >60 min
• Cafeína e álcool aumentam necessidade hídrica`;
  }

  if (texto.match(/ola|oi|bom dia|boa tarde|boa noite|olá/)) {
    return `Olá! Sou o assistente de nutrição esportiva do FitSaaS. 👋

Posso te ajudar com:
• Cálculo de calorias e macros
• Proteínas, carboidratos e gorduras
• Alimentação pré e pós-treino
• Suplementação básica
• Estratégias para ganho de massa ou definição

O que gostaria de saber?`;
  }

  if (texto.match(/refeicao|refeição|quantas vezes|frequencia alimentar|quando comer/)) {
    return `**Frequência de refeições:**

Não existe número mágico — o que importa é **bater os totais de calorias e proteína no dia**.

**Estratégia prática:**
• 3–5 refeições por dia funciona bem para a maioria
• Espaçamento de 3–5h entre refeições
• Distribua proteínas igualmente entre as refeições (~30–40g/refeição)
• Inclua carboidrato nas refeições pré e pós-treino

Jejum intermitente também funciona se você bater os macros dentro da janela.`;
  }

  return `Entendi sua pergunta sobre *"${msg}"*.

Posso te orientar sobre:
• **Calorias e TDEE** — quanto você deve comer
• **Proteínas** — quanto e quais fontes
• **Carboidratos e gorduras** — distribuição dos macros
• **Pré e pós-treino** — timing de refeições
• **Suplementos** — o que vale a pena
• **Ganho de massa ou definição** — estratégia geral

Tenta reformular sua pergunta com uma dessas palavras-chave!`;
}

// ------------------------------------------------------------
// Componente principal
// ------------------------------------------------------------
export default function DietChatbot({ medicoes }) {
  const contexto = medicoes?.length > 0 ? medicoes[medicoes.length - 1] : null;

  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: `Olá! Sou o assistente de nutrição do FitSaaS. Pergunte sobre calorias, proteínas, carboidratos, refeições, suplementos ou estratégias para o seu objetivo de **${contexto?.objetivo || 'musculação'}**.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setTyping(true);

    // Simula latência de API (será substituído por chamada real ao backend)
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

    const resposta = gerarResposta(msg, contexto);
    setTyping(false);
    setMessages((prev) => [...prev, { role: 'bot', text: resposta }]);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Disclaimer fixo */}
      <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 shrink-0">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">{DISCLAIMER}</p>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {typing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-4 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ex: Quantas proteínas devo comer?"
          className="flex-1 p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || typing}
          className="bg-green-600 text-white px-4 rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isBot = message.role === 'bot';

  // Renderiza markdown simples (negrito e listas)
  const renderText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const withItalic = bold.replace(/\*(.*?)\*/g, '<em>$1</em>');
      return (
        <p
          key={i}
          className={line.startsWith('•') ? 'ml-2' : ''}
          dangerouslySetInnerHTML={{ __html: withItalic || '&nbsp;' }}
        />
      );
    });
  };

  return (
    <div className={`flex gap-2 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center
        ${isBot ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
        {isBot ? <Bot size={16} /> : <User size={16} />}
      </div>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed space-y-1
          ${isBot
            ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
            : 'bg-indigo-600 text-white rounded-tr-none'}`}
      >
        {renderText(message.text)}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
        <Bot size={16} />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
