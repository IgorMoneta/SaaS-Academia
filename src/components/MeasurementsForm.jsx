import React, { useState } from 'react';
import { Ruler, Save, CheckCircle } from 'lucide-react';

const OBJETIVOS = ['Hipertrofia', 'Força', 'Resistência', 'Definição'];

function Field({ label, value, onChange, type = 'number', placeholder = '—' }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );
}

export default function MeasurementsForm({ studentId, latestMeasurement, onSave }) {
  const base = latestMeasurement || {};
  const [form, setForm] = useState({
    peso:        base.peso        || '',
    altura:      base.altura      || '',
    idade:       base.idade       || '',
    sexo:        base.sexo        || 'M',
    objetivo:    base.objetivo    || 'Hipertrofia',
    frequencia:  base.frequencia  || '3',
    peito:       base.peito       || '',
    cintura:     base.cintura     || '',
    quadril:     base.quadril     || '',
    braco:       base.braco       || '',
    antebraco:   base.antebraco   || '',
    coxa:        base.coxa        || '',
    panturrilha: base.panturrilha || '',
    gordura:     base.gordura     || '',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.peso || !form.altura) return;
    setLoading(true);
    await onSave({
      ...form,
      student_id: studentId,
      data: new Date().toISOString().split('T')[0],
    });
    setSaved(true);
    setLoading(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const canSave = form.peso && form.altura;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Ruler size={20} className="text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-800">Minhas Medidas</h2>
        {latestMeasurement && (
          <span className="ml-auto text-xs text-slate-400">
            Última atualização: {latestMeasurement.data}
          </span>
        )}
      </div>

      {/* Dados básicos */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">Dados Básicos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Peso (kg)" value={form.peso} onChange={(v) => set('peso', v)} />
          <Field label="Altura (cm)" value={form.altura} onChange={(v) => set('altura', v)} />
          <Field label="Idade" value={form.idade} onChange={(v) => set('idade', v)} />

          <div>
            <label className="block text-xs text-slate-500 mb-1">Sexo Biológico</label>
            <select
              value={form.sexo}
              onChange={(e) => set('sexo', e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Objetivo Principal</label>
            <select
              value={form.objetivo}
              onChange={(e) => set('objetivo', e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {OBJETIVOS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Dias de treino / semana</label>
            <select
              value={form.frequencia}
              onChange={(e) => set('frequencia', e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {['2', '3', '4', '5', '6'].map((d) => (
                <option key={d} value={d}>{d} dias</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Circunferências */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
          Circunferências (cm)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Peito" value={form.peito} onChange={(v) => set('peito', v)} />
          <Field label="Cintura" value={form.cintura} onChange={(v) => set('cintura', v)} />
          <Field label="Quadril" value={form.quadril} onChange={(v) => set('quadril', v)} />
          <Field label="Braço (contraído)" value={form.braco} onChange={(v) => set('braco', v)} />
          <Field label="Antebraço" value={form.antebraco} onChange={(v) => set('antebraco', v)} />
          <Field label="Coxa" value={form.coxa} onChange={(v) => set('coxa', v)} />
          <Field label="Panturrilha" value={form.panturrilha} onChange={(v) => set('panturrilha', v)} />
          <Field label="% Gordura (opcional)" value={form.gordura} onChange={(v) => set('gordura', v)} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading || !canSave}
        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors
          bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          'Salvando...'
        ) : saved ? (
          <><CheckCircle size={18} /> Medidas salvas!</>
        ) : (
          <><Save size={18} /> Salvar Medidas</>
        )}
      </button>

      {!canSave && (
        <p className="text-xs text-center text-slate-400">Preencha ao menos Peso e Altura para salvar.</p>
      )}
    </div>
  );
}
