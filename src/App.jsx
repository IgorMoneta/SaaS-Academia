import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle,
  Dumbbell,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Ruler,
  Save,
  Send,
  Settings,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';

import { createId, loadDb, saveDb } from './data/store.js';

const API_URL = import.meta.env.VITE_API_URL || '';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'treinos', label: 'Treinos', icon: Dumbbell },
  { id: 'progresso', label: 'Progresso', icon: BarChart3 },
  { id: 'medidas', label: 'Medidas', icon: Ruler },
  { id: 'insights', label: 'Insights IA', icon: Sparkles },
  { id: 'perfil', label: 'Perfil', icon: Settings },
];

const goals = ['Hipertrofia', 'Forca', 'Emagrecimento', 'Manutencao'];

export default function App() {
  const [db, setDb] = useState(loadDb);
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem('fitsaas_session_user') || '');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    saveDb(db);
    if (!storageReady) return;

    const timeout = window.setTimeout(() => {
      fetch(`${API_URL}/api/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: db }),
      }).catch(() => {
        // The app keeps working with the browser cache if the API is offline.
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [db, storageReady]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/state`)
      .then(async (response) => {
        if (!response.ok) return null;
        return readResponseJson(response);
      })
      .then((data) => {
        if (!cancelled && data?.state) {
          setDb(data.state);
        }
      })
      .catch(() => {
        // Local cache remains available during backend downtime.
      })
      .finally(() => {
        if (!cancelled) setStorageReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentUser = db.users.find((user) => user.id === currentUserId) || null;

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('fitsaas_session_user', currentUser.id);
    } else {
      localStorage.removeItem('fitsaas_session_user');
    }
  }, [currentUser]);

  const userData = useUserData(db, currentUser?.id);
  const analyticsState = useAnalytics(currentUser, userData);

  const updateDb = (updater) => {
    setDb((current) => updater(current));
  };

  const login = ({ email, senha }) => {
    const user = db.users.find((item) => item.email.trim().toLowerCase() === email.trim().toLowerCase() && item.senha === senha);
    if (!user) return false;
    setCurrentUserId(user.id);
    setActiveTab('dashboard');
    return true;
  };

  const createAccount = (payload) => {
    const exists = db.users.some((item) => item.email.trim().toLowerCase() === payload.email.trim().toLowerCase());
    if (exists) return { ok: false, error: 'Este email ja esta cadastrado.' };

    const user = {
      id: createId('user'),
      nome: payload.nome.trim(),
      email: payload.email.trim(),
      senha: payload.senha,
      objetivo: payload.objetivo,
      meta_semanal: Number(payload.meta_semanal),
      altura: payload.altura ? Number(payload.altura) : null,
      criado_em: today(),
    };

    updateDb((current) => ({
      ...current,
      users: [...current.users, user],
    }));
    setCurrentUserId(user.id);
    setActiveTab('dashboard');
    return { ok: true };
  };

  const updateProfile = (payload) => {
    updateDb((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              nome: payload.nome.trim(),
              objetivo: payload.objetivo,
              meta_semanal: Number(payload.meta_semanal),
              altura: payload.altura ? Number(payload.altura) : null,
            }
          : user
      ),
    }));
  };

  const addWorkoutPlan = (payload) => {
    updateDb((current) => ({
      ...current,
      workout_plans: [
        ...current.workout_plans,
        {
          id: createId('plan'),
          user_id: currentUser.id,
          nome: payload.nome.trim(),
          tipo: payload.tipo.trim() || 'A',
          created_at: today(),
        },
      ],
    }));
  };

  const deleteWorkoutPlan = (planId) => {
    const exerciseIds = new Set(db.exercises.filter((item) => item.plan_id === planId).map((item) => item.id));
    updateDb((current) => ({
      ...current,
      workout_plans: current.workout_plans.filter((plan) => plan.id !== planId),
      exercises: current.exercises.filter((exercise) => exercise.plan_id !== planId),
      load_logs: current.load_logs.filter((log) => !exerciseIds.has(log.exercise_id)),
    }));
  };

  const addExercise = (payload) => {
    updateDb((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          id: createId('exercise'),
          plan_id: payload.plan_id,
          nome: payload.nome.trim(),
          grupo: payload.grupo.trim(),
          series: Number(payload.series),
          reps: payload.reps.trim(),
          created_at: today(),
        },
      ],
    }));
  };

  const deleteExercise = (exerciseId) => {
    updateDb((current) => ({
      ...current,
      exercises: current.exercises.filter((exercise) => exercise.id !== exerciseId),
      load_logs: current.load_logs.filter((log) => log.exercise_id !== exerciseId),
    }));
  };

  const addLoadLog = (payload) => {
    updateDb((current) => ({
      ...current,
      load_logs: [
        ...current.load_logs,
        {
          id: createId('log'),
          user_id: currentUser.id,
          exercise_id: payload.exercise_id,
          peso_kg: Number(payload.peso_kg),
          reps: Number(payload.reps),
          data: payload.data || today(),
          timestamp: Date.now(),
        },
      ],
    }));
  };

  const addMeasurement = (payload) => {
    updateDb((current) => ({
      ...current,
      measurements: [
        ...current.measurements,
        {
          id: createId('measurement'),
          user_id: currentUser.id,
          ...numberize(payload),
          data: payload.data || today(),
          timestamp: Date.now(),
        },
      ],
    }));
  };

  if (!currentUser) {
    return <AuthScreen onLogin={login} onCreateAccount={createAccount} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Activity size={22} />
            </div>
            <div className="min-w-0">
              <p className="font-bold leading-tight text-slate-950">FitSaaS</p>
              <p className="text-xs text-slate-500 truncate">Performance e evolução nos treinos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-slate-600">{currentUser.nome}</span>
            <button
              type="button"
              onClick={() => setCurrentUserId('')}
              title="Sair"
              className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-950 inline-flex items-center justify-center"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
          <div className="flex flex-wrap gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`h-10 px-3 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${
                  activeTab === id
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <Dashboard user={currentUser} userData={userData} analyticsState={analyticsState} onOpenInsights={() => setActiveTab('insights')} />
        )}
        {activeTab === 'treinos' && (
          <WorkoutsView
            userData={userData}
            onAddWorkoutPlan={addWorkoutPlan}
            onDeleteWorkoutPlan={deleteWorkoutPlan}
            onAddExercise={addExercise}
            onDeleteExercise={deleteExercise}
            onAddLoadLog={addLoadLog}
          />
        )}
        {activeTab === 'progresso' && <ProgressView userData={userData} analyticsState={analyticsState} />}
        {activeTab === 'medidas' && <MeasurementsView user={currentUser} userData={userData} onAddMeasurement={addMeasurement} />}
        {activeTab === 'insights' && <InsightsView user={currentUser} userData={userData} analyticsState={analyticsState} />}
        {activeTab === 'perfil' && <ProfileView user={currentUser} onSave={updateProfile} />}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 text-xs text-slate-500">
        Seus dados de treino e evolução em um só lugar.
      </footer>
    </div>
  );
}

function AuthScreen({ onLogin, onCreateAccount }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
  const [signupForm, setSignupForm] = useState({
    nome: '',
    email: '',
    senha: '',
    objetivo: 'Hipertrofia',
    meta_semanal: '4',
    altura: '',
  });
  const [error, setError] = useState('');

  const submitLogin = (event) => {
    event.preventDefault();
    setError('');
    if (!onLogin(loginForm)) setError('Email ou senha invalidos.');
  };

  const submitSignup = (event) => {
    event.preventDefault();
    setError('');
    if (!signupForm.nome.trim() || !signupForm.email.trim() || signupForm.senha.length < 3) {
      setError('Preencha nome, email e senha com pelo menos 3 caracteres.');
      return;
    }
    const result = onCreateAccount(signupForm);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-4">
            <Activity size={30} />
          </div>
          <h1 className="text-3xl font-bold text-white">FitSaaS</h1>
          <p className="text-sm text-slate-400 mt-2">Acompanhamento pessoal de musculacao.</p>
        </div>

        <div className="bg-white rounded-lg p-1 grid grid-cols-2 gap-1 mb-3">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`h-10 rounded-md text-sm font-medium ${mode === 'login' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`h-10 rounded-md text-sm font-medium ${mode === 'signup' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={mode === 'login' ? submitLogin : submitSignup} className="bg-white rounded-lg p-5 shadow-xl space-y-4">
          {mode === 'signup' && (
            <Field label="Nome" value={signupForm.nome} onChange={(value) => setSignupForm((current) => ({ ...current, nome: value }))} />
          )}

          <Field
            label="Email"
            type="email"
            value={mode === 'login' ? loginForm.email : signupForm.email}
            onChange={(value) =>
              mode === 'login'
                ? setLoginForm((current) => ({ ...current, email: value }))
                : setSignupForm((current) => ({ ...current, email: value }))
            }
          />

          <Field
            label="Senha"
            type="password"
            value={mode === 'login' ? loginForm.senha : signupForm.senha}
            onChange={(value) =>
              mode === 'login'
                ? setLoginForm((current) => ({ ...current, senha: value }))
                : setSignupForm((current) => ({ ...current, senha: value }))
            }
          />

          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Objetivo"
                value={signupForm.objetivo}
                options={goals}
                onChange={(value) => setSignupForm((current) => ({ ...current, objetivo: value }))}
              />
              <SelectField
                label="Meta semanal"
                value={signupForm.meta_semanal}
                options={['2', '3', '4', '5', '6']}
                suffix="dias"
                onChange={(value) => setSignupForm((current) => ({ ...current, meta_semanal: value }))}
              />
              <div className="col-span-2">
                <Field
                  label="Altura opcional (cm)"
                  type="number"
                  step="0.1"
                  value={signupForm.altura}
                  onChange={(value) => setSignupForm((current) => ({ ...current, altura: value }))}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3 font-medium inline-flex items-center justify-center gap-2">
            {mode === 'login' ? <LogIn size={17} /> : <Plus size={17} />}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ user, userData, analyticsState, onOpenInsights }) {
  const { analytics, error, loading, reload } = analyticsState;
  const latestMeasurement = userData.measurements.at(-1);
  const best = analytics?.treino?.exercicios?.[0];

  return (
    <section className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Ola, {user.nome}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">Dashboard pessoal</h1>
        </div>
        <button
          type="button"
          onClick={onOpenInsights}
          className="h-10 px-4 rounded-lg bg-slate-950 text-white text-sm font-medium inline-flex items-center justify-center gap-2"
        >
          <Sparkles size={16} />
          Abrir Insights IA
        </button>
      </div>

      <BackendBanner error={error} loading={loading} onReload={reload} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Meta semanal" value={`${user.meta_semanal} treinos`} tone="emerald" />
        <MetricCard label="Media ultimos 28 dias" value={analytics ? `${analytics.treino.media_dias_semana_28d} / semana` : '-'} tone="slate" />
        <MetricCard label="Peso atual" value={latestMeasurement?.peso ? `${latestMeasurement.peso} kg` : '-'} tone="amber" />
        <MetricCard label="Melhor evolucao" value={best?.nome || '-'} tone="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-slate-950">Observacoes calculadas</h2>
            <Activity size={18} className="text-emerald-600" />
          </div>
          {analytics?.observacoes?.length ? (
            <div className="space-y-3">
              {analytics.observacoes.map((item) => (
                <p key={item} className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3">
                  {item}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Registre cargas e medidas para gerar observacoes.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-950 mb-4">Cobertura da meta</h2>
          <ProgressRing value={analytics?.treino?.cobertura_meta_pct ?? 0} />
          <p className="text-xs text-slate-500 mt-4">
            Base: dias unicos registrados nos ultimos 28 dias, dividido por 4 semanas e comparado com sua meta.
          </p>
        </div>
      </div>
    </section>
  );
}

function WorkoutsView({ userData, onAddWorkoutPlan, onDeleteWorkoutPlan, onAddExercise, onDeleteExercise, onAddLoadLog }) {
  const [activePlanId, setActivePlanId] = useState(userData.plans[0]?.id || '');
  const [planForm, setPlanForm] = useState({ tipo: '', nome: '' });
  const [exerciseForm, setExerciseForm] = useState({ nome: '', grupo: '', series: '3', reps: '8-12' });

  useEffect(() => {
    if (!userData.plans.some((plan) => plan.id === activePlanId)) {
      setActivePlanId(userData.plans[0]?.id || '');
    }
  }, [activePlanId, userData.plans]);

  const activePlan = userData.plans.find((plan) => plan.id === activePlanId);
  const exercises = activePlan ? userData.exercises.filter((exercise) => exercise.plan_id === activePlan.id) : [];

  const submitPlan = (event) => {
    event.preventDefault();
    if (!planForm.nome.trim()) return;
    onAddWorkoutPlan(planForm);
    setPlanForm({ tipo: '', nome: '' });
  };

  const submitExercise = (event) => {
    event.preventDefault();
    if (!activePlan || !exerciseForm.nome.trim() || !exerciseForm.grupo.trim()) return;
    onAddExercise({ ...exerciseForm, plan_id: activePlan.id });
    setExerciseForm({ nome: '', grupo: '', series: '3', reps: '8-12' });
  };

  return (
    <section className="space-y-5">
      <ViewHeader title="Treinos" subtitle="Crie suas fichas e registre carga por exercicio." icon={Dumbbell} />

      <form onSubmit={submitPlan} className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-3">
        <Field label="Tipo" placeholder="A" value={planForm.tipo} onChange={(value) => setPlanForm((current) => ({ ...current, tipo: value }))} />
        <Field label="Nome do treino" placeholder="Peito e Triceps" value={planForm.nome} onChange={(value) => setPlanForm((current) => ({ ...current, nome: value }))} />
        <button className="self-end h-11 px-4 rounded-lg bg-emerald-600 text-white font-medium inline-flex items-center justify-center gap-2">
          <Plus size={17} />
          Criar
        </button>
      </form>

      <div className="flex flex-wrap gap-2 pb-1">
        {userData.plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setActivePlanId(plan.id)}
            className={`shrink-0 h-10 px-4 rounded-lg text-sm font-medium ${
              activePlanId === plan.id ? 'bg-slate-950 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {plan.tipo} - {plan.nome}
          </button>
        ))}
      </div>

      {!activePlan ? (
        <EmptyState icon={Dumbbell} text="Nenhum treino criado." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">{activePlan.tipo} - {activePlan.nome}</h2>
              <button
                type="button"
                onClick={() => onDeleteWorkoutPlan(activePlan.id)}
                title="Excluir treino"
                className="h-9 w-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {exercises.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {exercises.map((exercise) => (
                  <ExerciseLogger
                    key={exercise.id}
                    exercise={exercise}
                    logs={userData.logs.filter((log) => log.exercise_id === exercise.id)}
                    onDelete={() => onDeleteExercise(exercise.id)}
                    onSave={onAddLoadLog}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Dumbbell} text="Adicione exercicios ao treino ativo." />
            )}
          </div>

          <form onSubmit={submitExercise} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 h-fit">
            <h3 className="font-semibold text-slate-950">Adicionar exercicio</h3>
            <Field label="Nome" placeholder="Supino Reto" value={exerciseForm.nome} onChange={(value) => setExerciseForm((current) => ({ ...current, nome: value }))} />
            <Field label="Grupo" placeholder="Peito" value={exerciseForm.grupo} onChange={(value) => setExerciseForm((current) => ({ ...current, grupo: value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Series" type="number" min="1" value={exerciseForm.series} onChange={(value) => setExerciseForm((current) => ({ ...current, series: value }))} />
              <Field label="Reps" value={exerciseForm.reps} onChange={(value) => setExerciseForm((current) => ({ ...current, reps: value }))} />
            </div>
            <button className="w-full h-11 rounded-lg bg-emerald-600 text-white font-medium inline-flex items-center justify-center gap-2">
              <Plus size={17} />
              Adicionar
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

function ExerciseLogger({ exercise, logs, onDelete, onSave }) {
  const history = [...logs].sort(sortByDateDesc);
  const last = history[0];
  const [form, setForm] = useState({ peso_kg: last?.peso_kg?.toString() || '', reps: last?.reps?.toString() || '', data: today() });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      peso_kg: current.peso_kg || last?.peso_kg?.toString() || '',
      reps: current.reps || last?.reps?.toString() || '',
    }));
  }, [last]);

  const submit = (event) => {
    event.preventDefault();
    if (!form.peso_kg || !form.reps) return;
    onSave({ ...form, exercise_id: exercise.id });
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-950 truncate">{exercise.nome}</h3>
          <p className="text-xs text-slate-500">{exercise.grupo} - {exercise.series} x {exercise.reps}</p>
        </div>
        <button type="button" onClick={onDelete} title="Excluir exercicio" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 inline-flex items-center justify-center">
          <Trash2 size={15} />
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Ultimo: {last ? `${last.peso_kg} kg x ${last.reps} reps em ${formatDate(last.data)}` : 'sem registro'}
      </p>

      <div className="grid grid-cols-[1fr_90px] gap-2 mt-3">
        <Field label="Peso (kg)" type="number" step="0.5" min="0" value={form.peso_kg} onChange={(value) => setForm((current) => ({ ...current, peso_kg: value }))} />
        <Field label="Reps" type="number" min="1" value={form.reps} onChange={(value) => setForm((current) => ({ ...current, reps: value }))} />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <input
          type="date"
          value={form.data}
          onChange={(event) => setForm((current) => ({ ...current, data: event.target.value }))}
          className="h-10 border border-slate-200 rounded-lg px-3 text-sm"
        />
        <button className="h-10 px-3 rounded-lg bg-emerald-600 text-white inline-flex items-center justify-center gap-2">
          {saved ? <CheckCircle size={17} /> : <Save size={17} />}
          <span className="sr-only">Salvar</span>
        </button>
      </div>
    </form>
  );
}

function ProgressView({ userData, analyticsState }) {
  const { analytics, error, loading, reload } = analyticsState;
  const rows = analytics?.treino?.exercicios || [];
  const [selectedName, setSelectedName] = useState('');

  useEffect(() => {
    if (!rows.some((row) => row.nome === selectedName)) {
      setSelectedName(rows[0]?.nome || '');
    }
  }, [rows, selectedName]);

  const selectedRow = rows.find((row) => row.nome === selectedName);
  const selectedExercise = userData.exercises.find((exercise) => exercise.nome === selectedName);
  const history = selectedExercise
    ? userData.logs.filter((log) => log.exercise_id === selectedExercise.id).sort(sortByDateAsc)
    : [];

  return (
    <section className="space-y-5">
      <ViewHeader title="Progresso" subtitle="e1RM estimado como comparativo, nao como medicao direta de forca maxima." icon={BarChart3} />
      <BackendBanner error={error} loading={loading} onReload={reload} />

      {!rows.length ? (
        <EmptyState icon={BarChart3} text="Registre cargas para acompanhar progresso." />
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <label className="block text-xs font-medium text-slate-500 mb-1">Exercicio</label>
            <select value={selectedName} onChange={(event) => setSelectedName(event.target.value)} className="w-full sm:max-w-sm h-11 border border-slate-200 rounded-lg px-3">
              {rows.map((row) => (
                <option key={row.nome} value={row.nome}>{row.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <MetricCard label="Primeira carga" value={selectedRow ? `${selectedRow.primeira_carga_kg} kg` : '-'} tone="slate" />
            <MetricCard label="Carga atual" value={selectedRow ? `${selectedRow.ultima_carga_kg} kg` : '-'} tone="emerald" />
            <MetricCard label="Variacao carga" value={formatSigned(selectedRow?.variacao_carga_kg, ' kg')} tone="amber" />
            <MetricCard label="e1RM atual" value={selectedRow ? `${selectedRow.e1rm_atual_kg} kg` : '-'} tone="indigo" />
            <MetricCard label="Variacao e1RM" value={formatSigned(selectedRow?.variacao_e1rm_pct, '%')} tone="emerald" />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-950">Historico</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {history.map((item) => (
                <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">{formatDate(item.data)}</span>
                  <span className="font-medium text-slate-950">{item.peso_kg} kg x {item.reps} reps</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function MeasurementsView({ user, userData, onAddMeasurement }) {
  const latest = userData.measurements.at(-1);
  const first = userData.measurements[0];
  const [form, setForm] = useState(() => ({
    data: today(),
    peso: latest?.peso ?? '',
    altura: latest?.altura ?? user.altura ?? '',
    peito: latest?.peito ?? '',
    cintura: latest?.cintura ?? '',
    braco: latest?.braco ?? '',
    coxa: latest?.coxa ?? '',
    panturrilha: latest?.panturrilha ?? '',
  }));
  const [saved, setSaved] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    if (!form.peso) return;
    onAddMeasurement(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const weightDelta = first && latest && first.peso != null && latest.peso != null ? Number(latest.peso) - Number(first.peso) : null;

  return (
    <section className="space-y-5">
      <ViewHeader title="Medidas" subtitle="Registros corporais com evolucao simples por historico." icon={Ruler} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Data" type="date" value={form.data} onChange={(value) => setForm((current) => ({ ...current, data: value }))} />
            <Field label="Peso (kg)" type="number" step="0.1" value={form.peso} onChange={(value) => setForm((current) => ({ ...current, peso: value }))} />
            <Field label="Altura (cm)" type="number" step="0.1" value={form.altura} onChange={(value) => setForm((current) => ({ ...current, altura: value }))} />
            <Field label="Peito (cm)" type="number" step="0.1" value={form.peito} onChange={(value) => setForm((current) => ({ ...current, peito: value }))} />
            <Field label="Cintura (cm)" type="number" step="0.1" value={form.cintura} onChange={(value) => setForm((current) => ({ ...current, cintura: value }))} />
            <Field label="Braco (cm)" type="number" step="0.1" value={form.braco} onChange={(value) => setForm((current) => ({ ...current, braco: value }))} />
            <Field label="Coxa (cm)" type="number" step="0.1" value={form.coxa} onChange={(value) => setForm((current) => ({ ...current, coxa: value }))} />
            <Field label="Panturrilha (cm)" type="number" step="0.1" value={form.panturrilha} onChange={(value) => setForm((current) => ({ ...current, panturrilha: value }))} />
          </div>
          <button className="w-full h-11 rounded-lg bg-emerald-600 text-white font-medium inline-flex items-center justify-center gap-2">
            {saved ? <CheckCircle size={17} /> : <Save size={17} />}
            {saved ? 'Medidas salvas' : 'Salvar novo registro'}
          </button>
        </form>

        <div className="space-y-4">
          <MetricCard label="Peso" value={latest?.peso ? `${latest.peso} kg` : '-'} note={weightDelta == null ? '' : `${formatSigned(weightDelta, ' kg')} desde o primeiro registro`} tone="amber" />
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-950">Historico</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {[...userData.measurements].reverse().map((item) => (
                <div key={item.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{formatDate(item.data)}</span>
                    <span className="font-medium">{item.peso ?? '-'} kg</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Braco {item.braco ?? '-'} cm - Cintura {item.cintura ?? '-'} cm</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InsightsView({ user, userData, analyticsState }) {
  const { analytics, error, loading, reload } = analyticsState;
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Posso interpretar seus indicadores calculados pelo backend. Pergunte sobre frequencia registrada, cargas, medidas ou estagnacao.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (forcedMessage) => {
    const message = (forcedMessage || input).trim();
    if (!message || sending) return;

    const userMessage = { role: 'user', content: message };
    const history = messages.filter((item) => item.role === 'user' || item.role === 'assistant').slice(-8);
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          meta_semanal: user.meta_semanal,
          measurements: userData.measurements,
          load_logs: userData.logs,
          exercises: userData.exercises,
          message,
          historico: history,
        }),
      });

      const data = await readResponseJson(response);
      if (!response.ok) throw new Error(data?.detail || 'Nao foi possivel consultar o Hermes.');

      setMessages((current) => [...current, { role: 'assistant', content: data.resposta }]);
    } catch (sendError) {
      setMessages((current) => [
        ...current,
        {
          role: 'error',
          content: sendError.message || 'Assistente indisponivel. Verifique FastAPI e Hermes.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const quickQuestions = [
    'Qual exercicio mais evoluiu?',
    'Como esta minha frequencia registrada?',
    'Como minhas medidas mudaram?',
    'Tem algum exercicio estagnado?',
  ];

  return (
    <section className="space-y-5">
      <ViewHeader title="Insights IA" subtitle="Interpretações sobre seus dados de treino." icon={Sparkles} action={<RefreshButton loading={loading} onClick={reload} />} />
      <BackendBanner error={error} loading={loading} onReload={reload} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Dias registrados (28d)" value={analytics?.treino?.dias_ultimos_28_dias ?? '-'} tone="slate" />
        <MetricCard label="Media semanal" value={analytics?.treino?.media_dias_semana_28d ?? '-'} tone="emerald" />
        <MetricCard label="Meta semanal" value={analytics?.treino?.meta_dias_semana ?? user.meta_semanal} tone="amber" />
        <MetricCard label="Cobertura da meta" value={analytics?.treino?.cobertura_meta_pct == null ? '-' : `${analytics.treino.cobertura_meta_pct}%`} tone="indigo" />
      </div>

      <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900">Insights nao substituem avaliacao medica, nutricional ou de educacao fisica.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickQuestions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => send(question)}
            className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
          >
            {question}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="h-[420px] overflow-y-auto overflow-x-hidden p-4 space-y-4">
          {messages.map((message, index) => {
            const isUser = message.role === 'user';
            const isError = message.role === 'error';
            return (
              <div key={`${message.role}-${index}`} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${isUser ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[82%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap break-words leading-relaxed ${isUser ? 'bg-emerald-600 text-white' : isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 text-slate-800 border border-slate-200'}`}>
                  {message.content}
                </div>
              </div>
            );
          })}
          {sending && <p className="text-sm text-slate-400">Hermes analisando...</p>}
          <div ref={endRef} />
        </div>

        <div className="border-t border-slate-200 p-3 flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Pergunte sobre seus registros..."
            className="min-w-0 flex-1 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={!input.trim() || sending}
            className="h-11 px-4 rounded-lg bg-emerald-600 text-white disabled:opacity-40 inline-flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

function ProfileView({ user, onSave }) {
  const [form, setForm] = useState({
    nome: user.nome,
    objetivo: user.objetivo,
    meta_semanal: String(user.meta_semanal),
    altura: user.altura ?? '',
  });
  const [saved, setSaved] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    if (!form.nome.trim()) return;
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  return (
    <section className="space-y-5">
      <ViewHeader title="Perfil" subtitle="Dados pessoais usados nos indicadores de evolução." icon={Settings} />
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-lg p-5 max-w-2xl space-y-4">
        <Field label="Nome" value={form.nome} onChange={(value) => setForm((current) => ({ ...current, nome: value }))} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SelectField label="Objetivo" value={form.objetivo} options={goals} onChange={(value) => setForm((current) => ({ ...current, objetivo: value }))} />
          <SelectField label="Meta semanal" value={form.meta_semanal} options={['2', '3', '4', '5', '6']} suffix="dias" onChange={(value) => setForm((current) => ({ ...current, meta_semanal: value }))} />
          <Field label="Altura (cm)" type="number" step="0.1" value={form.altura} onChange={(value) => setForm((current) => ({ ...current, altura: value }))} />
        </div>
        <button className="h-11 px-4 rounded-lg bg-emerald-600 text-white font-medium inline-flex items-center justify-center gap-2">
          {saved ? <CheckCircle size={17} /> : <Save size={17} />}
          {saved ? 'Perfil salvo' : 'Salvar perfil'}
        </button>
      </form>
    </section>
  );
}

function useUserData(db, userId) {
  return useMemo(() => {
    if (!userId) return { plans: [], exercises: [], logs: [], measurements: [] };
    const plans = db.workout_plans.filter((plan) => plan.user_id === userId);
    const planIds = new Set(plans.map((plan) => plan.id));
    const exercises = db.exercises.filter((exercise) => planIds.has(exercise.plan_id));
    const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
    const logs = db.load_logs.filter((log) => log.user_id === userId && exerciseIds.has(log.exercise_id)).sort(sortByDateAsc);
    const measurements = db.measurements.filter((measurement) => measurement.user_id === userId).sort(sortByDateAsc);
    return { plans, exercises, logs, measurements };
  }, [db, userId]);
}

function useAnalytics(user, userData) {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const payload = useMemo(
    () =>
      user
        ? {
            user_id: user.id,
            meta_semanal: user.meta_semanal,
            measurements: userData.measurements,
            load_logs: userData.logs,
            exercises: userData.exercises,
          }
        : null,
    [user, userData]
  );

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    fetch(`${API_URL}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = await readResponseJson(response);
        if (!response.ok) throw new Error(data?.detail || 'Backend indisponivel.');
        return data;
      })
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError.message || 'Nao foi possivel carregar analytics.');
          setAnalytics(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [payload, nonce]);

  return {
    analytics,
    error,
    loading,
    reload: () => setNonce((value) => value + 1),
  };
}

function ViewHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function BackendBanner({ error, loading, onReload }) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">Backend offline ou indisponivel.</p>
          <p className="text-xs mt-1">
            {error} Verifique se o backend esta rodando na porta 8000.
          </p>
        </div>
        <RefreshButton loading={loading} onClick={onReload} />
      </div>
    );
  }
  return null;
}

function RefreshButton({ loading, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Atualizar"
      className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-700 inline-flex items-center justify-center"
    >
      <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
    </button>
  );
}

function MetricCard({ label, value, note, tone = 'slate' }) {
  const toneClasses = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  return (
    <div className={`border rounded-lg p-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold mt-1 text-slate-950 break-words">{value}</p>
      {note && <p className="text-xs mt-2 text-slate-500">{note}</p>}
    </div>
  );
}

function ProgressRing({ value }) {
  const normalized = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-28 h-28 rounded-full grid place-items-center"
        style={{ background: `conic-gradient(#059669 ${normalized * 3.6}deg, #e2e8f0 0deg)` }}
      >
        <div className="w-20 h-20 rounded-full bg-white grid place-items-center">
          <span className="text-xl font-bold text-slate-950">{normalized}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-950">Cobertura da meta semanal</p>
        <p className="text-xs text-slate-500 mt-1">Frequencia registrada, nao aderencia formal.</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
      <Icon className="mx-auto mb-3 text-slate-400" size={34} />
      <p>{text}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', ...props }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        {...props}
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange, suffix }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>{suffix ? `${option} ${suffix}` : option}</option>
        ))}
      </select>
    </label>
  );
}

function numberize(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (key === 'data') return [key, value];
      return [key, value === '' || value == null ? null : Number(value)];
    })
  );
}

async function readResponseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sortByDateAsc(a, b) {
  return `${a.data || ''}-${a.timestamp || 0}`.localeCompare(`${b.data || ''}-${b.timestamp || 0}`);
}

function sortByDateDesc(a, b) {
  return `${b.data || ''}-${b.timestamp || 0}`.localeCompare(`${a.data || ''}-${a.timestamp || 0}`);
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatSigned(value, suffix = '') {
  if (value == null || Number.isNaN(Number(value))) return '-';
  const numeric = Number(value);
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(1)}${suffix}`;
}
