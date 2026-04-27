import React, { useMemo, useState } from 'react';
import { Brain, Dumbbell, TrendingUp, AlertCircle, CheckCircle, BookmarkPlus } from 'lucide-react';

// ------------------------------------------------------------
// Biblioteca de exercícios por grupo muscular
// ------------------------------------------------------------
const WORKOUT_LIBRARY = {
  'Peitoral e Ombros': {
    cor: 'from-blue-600 to-indigo-600',
    descricao: 'Seu peitoral e deltoides apresentam maior potencial de ganho em relação ao seu porte atual.',
    exercicios: [
      { nome: 'Supino Reto com Barra',     grupo: 'Peitoral',  series: 4, reps: '8-12',  descanso: '90s' },
      { nome: 'Supino Inclinado com Halter', grupo: 'Peitoral', series: 3, reps: '10-12', descanso: '75s' },
      { nome: 'Crucifixo com Halteres',    grupo: 'Peitoral',  series: 3, reps: '12-15', descanso: '60s' },
      { nome: 'Desenvolvimento Militar',   grupo: 'Ombro',     series: 4, reps: '8-10',  descanso: '90s' },
      { nome: 'Elevação Lateral',          grupo: 'Ombro',     series: 3, reps: '12-15', descanso: '60s' },
      { nome: 'Elevação Frontal',          grupo: 'Ombro',     series: 3, reps: '12',    descanso: '60s' },
    ],
  },
  'Dorsais e Costas': {
    cor: 'from-emerald-600 to-teal-600',
    descricao: 'Suas costas estão subdesenvolvidas em relação ao tronco. Dorsais amplas criam o shape em V.',
    exercicios: [
      { nome: 'Puxada Frontal Aberta',     grupo: 'Dorsal',    series: 4, reps: '8-12',  descanso: '90s' },
      { nome: 'Remada Curvada com Barra',  grupo: 'Dorsal',    series: 4, reps: '8-10',  descanso: '90s' },
      { nome: 'Remada Unilateral',         grupo: 'Dorsal',    series: 3, reps: '10-12', descanso: '75s' },
      { nome: 'Pullover com Halter',       grupo: 'Dorsal',    series: 3, reps: '12-15', descanso: '60s' },
      { nome: 'Hiperextensão Lombar',      grupo: 'Lombar',    series: 3, reps: '15',    descanso: '60s' },
      { nome: 'Encolhimento com Barra',    grupo: 'Trapézio',  series: 3, reps: '12-15', descanso: '60s' },
    ],
  },
  'Bíceps e Tríceps': {
    cor: 'from-violet-600 to-purple-600',
    descricao: 'Seus braços têm potencial significativo de crescimento — são o grupo mais visual do treino.',
    exercicios: [
      { nome: 'Rosca Direta com Barra',    grupo: 'Bíceps',   series: 4, reps: '10-12', descanso: '60s' },
      { nome: 'Rosca Martelo',             grupo: 'Bíceps',   series: 3, reps: '10-12', descanso: '60s' },
      { nome: 'Rosca Concentrada',         grupo: 'Bíceps',   series: 3, reps: '12',    descanso: '45s' },
      { nome: 'Tríceps Testa',             grupo: 'Tríceps',  series: 4, reps: '10-12', descanso: '60s' },
      { nome: 'Tríceps Pulley Corda',      grupo: 'Tríceps',  series: 3, reps: '12-15', descanso: '60s' },
      { nome: 'Mergulho no Banco',         grupo: 'Tríceps',  series: 3, reps: '12-15', descanso: '60s' },
    ],
  },
  'Quadríceps e Posteriores': {
    cor: 'from-amber-600 to-orange-600',
    descricao: 'Seus membros inferiores apresentam déficit em relação ao tronco — pernas fortes sustentam tudo.',
    exercicios: [
      { nome: 'Agachamento Livre',         grupo: 'Quadríceps', series: 4, reps: '8-12',  descanso: '120s' },
      { nome: 'Leg Press 45°',             grupo: 'Quadríceps', series: 4, reps: '10-15', descanso: '90s' },
      { nome: 'Cadeira Extensora',         grupo: 'Quadríceps', series: 3, reps: '12-15', descanso: '60s' },
      { nome: 'Mesa Flexora',              grupo: 'Posterior',  series: 4, reps: '10-12', descanso: '75s' },
      { nome: 'Stiff com Barra',           grupo: 'Posterior',  series: 3, reps: '10-12', descanso: '90s' },
      { nome: 'Cadeira Flexora',           grupo: 'Posterior',  series: 3, reps: '12-15', descanso: '60s' },
    ],
  },
  'Panturrilha e Core': {
    cor: 'from-rose-600 to-pink-600',
    descricao: 'Panturrilhas e core são os grupos mais negligenciados — e os que mais chamam atenção quando desenvolvidos.',
    exercicios: [
      { nome: 'Panturrilha em Pé (Smith)', grupo: 'Panturrilha', series: 5, reps: '15-20', descanso: '60s' },
      { nome: 'Panturrilha Sentado',       grupo: 'Panturrilha', series: 4, reps: '15-20', descanso: '60s' },
      { nome: 'Prancha Frontal',           grupo: 'Core',         series: 4, reps: '45s',   descanso: '45s' },
      { nome: 'Abdominal Crunch',          grupo: 'Core',         series: 3, reps: '20',    descanso: '45s' },
      { nome: 'Elevação de Pernas',        grupo: 'Core',         series: 3, reps: '15',    descanso: '45s' },
      { nome: 'Rotação de Tronco',         grupo: 'Core',         series: 3, reps: '20',    descanso: '45s' },
    ],
  },
};

// ------------------------------------------------------------
// Engine de análise de proporções corporais
// Baseada nas proporções ideais de Steve Reeves (adaptadas)
// Déficit = distância percentual do ideal para a altura
// ------------------------------------------------------------
function analyzeBody(m) {
  const alt = parseFloat(m.altura);
  if (!alt || alt < 100) return null;

  const grupos = [
    {
      nome: 'Peitoral e Ombros',
      ideal: alt * 0.535,
      atual: parseFloat(m.peito) || null,
    },
    {
      nome: 'Dorsais e Costas',
      // Estima largura de costas como 95% do peito quando não medido separado
      ideal: alt * 0.520,
      atual: parseFloat(m.peito) ? parseFloat(m.peito) * 0.95 : null,
    },
    {
      nome: 'Bíceps e Tríceps',
      ideal: alt * 0.200,
      atual: parseFloat(m.braco) || null,
    },
    {
      nome: 'Quadríceps e Posteriores',
      ideal: alt * 0.310,
      atual: parseFloat(m.coxa) || null,
    },
    {
      nome: 'Panturrilha e Core',
      ideal: alt * 0.220,
      atual: parseFloat(m.panturrilha) || null,
    },
  ];

  return grupos
    .filter((g) => g.atual !== null)
    .map((g) => ({
      ...g,
      deficit: ((g.ideal - g.atual) / g.ideal) * 100,
      pct: Math.min(100, Math.round((g.atual / g.ideal) * 100)),
    }))
    .sort((a, b) => b.deficit - a.deficit);
}

// Ajusta reps conforme objetivo
function ajustarReps(reps, objetivo) {
  const parts = reps.split('-').map(Number);
  if (objetivo === 'Força') {
    return parts.length > 1 ? `${parts[0] - 2}-${parts[0]}` : `${parseInt(reps) - 2}`;
  }
  if (objetivo === 'Resistência' || objetivo === 'Definição') {
    return parts.length > 1 ? `${parts[1]}-${parts[1] + 4}` : `${parseInt(reps) + 4}`;
  }
  return reps;
}

// Cores de barra por posição
const BAR_COLORS = ['bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'];

export default function MLRecommendation({ measurements, onSaveWorkout }) {
  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const analysis = useMemo(() => (latest ? analyzeBody(latest) : null), [latest]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (grupo, exercicios) => {
    setSaving(true);
    await onSaveWorkout({ grupo, exercicios });
    setSaving(false);
    setSaved(true);
  };

  if (!latest) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
        <Brain className="mx-auto mb-3 text-slate-300" size={48} />
        <p className="font-semibold text-slate-600">Nenhuma medida cadastrada</p>
        <p className="text-sm mt-1">Vá em "Medidas" e preencha seus dados para receber sua ficha personalizada.</p>
      </div>
    );
  }

  if (!analysis || analysis.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex gap-3 items-start">
        <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800">Medidas insuficientes</p>
          <p className="text-sm text-amber-700 mt-1">
            Preencha ao menos Peito, Braço, Coxa e Panturrilha para gerar a análise completa.
          </p>
        </div>
      </div>
    );
  }

  const top = analysis[0];
  const workout = WORKOUT_LIBRARY[top.nome];
  const objetivo = latest.objetivo || 'Hipertrofia';
  const gradiente = workout?.cor || 'from-indigo-600 to-violet-600';

  return (
    <div className="space-y-5">
      {/* Banner de resultado */}
      <div className={`bg-gradient-to-r ${gradiente} text-white rounded-xl p-6`}>
        <div className="flex items-center gap-2 text-white/70 text-xs mb-2 uppercase tracking-wide">
          <Brain size={13} /> Análise de Proporções Corporais
        </div>
        <h2 className="text-2xl font-bold">Prioridade: {top.nome}</h2>
        <p className="mt-1 text-white/80 text-sm leading-relaxed">{workout?.descricao}</p>
        <div className="mt-4 bg-black/20 rounded-lg p-3 text-sm grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-white/60 text-xs">Medida atual</p>
            <p className="font-bold text-lg">{top.atual?.toFixed(1)} cm</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Ideal p/ altura</p>
            <p className="font-bold text-lg">{top.ideal?.toFixed(1)} cm</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Déficit</p>
            <p className="font-bold text-lg">{top.deficit > 0 ? `${top.deficit.toFixed(1)}%` : '✓'}</p>
          </div>
        </div>
      </div>

      {/* Análise por grupo */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-indigo-500" /> Análise por Grupo Muscular
        </h3>
        <div className="space-y-3">
          {analysis.map((item, i) => (
            <div key={item.nome}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700 flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold
                    ${i === 0 ? 'bg-red-100 text-red-700' : i === 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {i + 1}
                  </span>
                  {item.nome}
                </span>
                <span className="text-slate-400 text-xs self-center">
                  {item.atual?.toFixed(0)}cm / ideal {item.ideal?.toFixed(0)}cm
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${BAR_COLORS[i] || 'bg-slate-400'}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <p className="text-right text-xs text-slate-400 mt-0.5">{item.pct}% do ideal</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ficha gerada */}
      {workout && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className={`bg-gradient-to-r ${gradiente} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-white">
                <Dumbbell size={18} />
                <div>
                  <p className="font-bold">Ficha Gerada — {top.nome}</p>
                  <p className="text-xs text-white/70">
                    Treino de foco prioritário · Objetivo: {objetivo}
                  </p>
                </div>
              </div>

              {/* Botão salvar */}
              {saved ? (
                <span className="flex items-center gap-1 bg-white/20 text-white text-xs px-3 py-2 rounded-lg font-medium shrink-0">
                  <CheckCircle size={14} /> Salvo na aba Treino!
                </span>
              ) : (
                <button
                  onClick={() => handleSave(top.nome, workout.exercicios)}
                  disabled={saving || !onSaveWorkout}
                  className="flex items-center gap-1 bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors shrink-0"
                >
                  <BookmarkPlus size={16} />
                  {saving ? 'Salvando...' : 'Salvar Ficha'}
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {workout.exercicios.map((ex, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{ex.nome}</p>
                  <p className="text-xs text-slate-400">{ex.grupo} · {ex.descanso} descanso</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-bold text-indigo-700">{ex.series}x</p>
                  <p className="text-xs text-slate-500">{ajustarReps(ex.reps, objetivo)} reps</p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-1">
            <p className="text-xs text-slate-500">
              ⚠️ Este é o <strong>treino do dia de foco</strong> em {top.nome}. Nos outros dias da semana, trabalhe os demais grupos musculares.
            </p>
            <p className="text-xs text-slate-400">
              * Reps ajustadas para objetivo: <strong>{objetivo}</strong>. Atualize suas medidas a cada 4 semanas para refinar a recomendação.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
