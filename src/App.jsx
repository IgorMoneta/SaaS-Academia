import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Brain,
  Building,
  ChevronRight,
  Cloud,
  Dumbbell,
  History,
  LogOut,
  MessageSquare,
  Ruler,
  Save,
} from 'lucide-react';
import MeasurementsForm from './components/MeasurementsForm';
import MLRecommendation from './components/MLRecommendation';
import DietChatbot from './components/DietChatbot';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  setDoc,
  doc,
} from 'firebase/firestore';

const firebaseConfig = (() => {
  const raw = globalThis.__firebase_config;
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
})();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dbRef = getFirestore(app);
const appId = globalThis.__app_id || 'default-app-id';

const emptyDb = {
  tenants: [],
  users: [],
  students: [],
  workout_plans: [],
  exercises: [],
  load_logs: [],
  measurements: [],
};

export default function App() {
  const [cloudDb, setCloudDb] = useState(emptyDb);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDomain, setCurrentDomain] = useState('fitsaas.com');
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (globalThis.__initial_auth_token) {
          await signInWithCustomToken(auth, globalThis.__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Erro ao autenticar na Cloud', err);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (user) => setFirebaseUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const cols = ['tenants', 'users', 'students', 'workout_plans', 'exercises', 'load_logs', 'measurements'];
    const loaded = new Set();
    const unsubscribes = cols.map((colName) => {
      const col = collection(dbRef, 'artifacts', appId, 'public', 'data', colName);
      return onSnapshot(col, (snap) => {
        setCloudDb((prev) => ({
          ...prev,
          [colName]: snap.docs.map((row) => ({ id: row.id, ...row.data() })),
        }));
        loaded.add(colName);
        if (loaded.size === cols.length) setIsLoadingDb(false);
      });
    });
    return () => unsubscribes.forEach((u) => u());
  }, [firebaseUser]);

  const registerUser = async (userData) => {
    if (userData.tenant_id) {
      const ref = await addDoc(collection(dbRef, 'artifacts', appId, 'public', 'data', 'students'), userData);
      return { id: ref.id, ...userData, role: 'student' };
    }
    const ref = await addDoc(collection(dbRef, 'artifacts', appId, 'public', 'data', 'users'), {
      ...userData,
      role: 'client',
      tenant_id: null,
    });
    return { id: ref.id, ...userData, role: 'client', tenant_id: null };
  };

  const promoteToOwner = async (userId, gymName) => {
    const tenant = {
      nome: gymName,
      dominio: `${gymName.toLowerCase().replace(/\s+/g, '')}.app`,
      plano: 'Starter',
      status: 'Ativo',
    };
    const tenantRef = await addDoc(collection(dbRef, 'artifacts', appId, 'public', 'data', 'tenants'), tenant);
    await setDoc(
      doc(dbRef, 'artifacts', appId, 'public', 'data', 'users', userId),
      { role: 'owner', tenant_id: tenantRef.id },
      { merge: true }
    );
  };

  const addLoadLog = async (log) => {
    await addDoc(collection(dbRef, 'artifacts', appId, 'public', 'data', 'load_logs'), {
      ...log,
      data: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    });
  };

  const addMeasurement = async (data) => {
    await addDoc(collection(dbRef, 'artifacts', appId, 'public', 'data', 'measurements'), data);
  };

  const addWorkoutPlan = async (plan) => {
    const ref = await addDoc(collection(dbRef, 'artifacts', appId, 'public', 'data', 'workout_plans'), plan);
    return ref.id;
  };

  const addExercise = async (exercise) => {
    await addDoc(collection(dbRef, 'artifacts', appId, 'public', 'data', 'exercises'), exercise);
  };

  if (isLoadingDb) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <Cloud className="animate-pulse text-indigo-500 mb-4" size={48} />
        <p className="font-medium">A sincronizar com a Base de Dados Cloud...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <div className="bg-slate-950 text-slate-400 text-xs p-2 flex justify-center gap-3 items-center">
        <span>URL do Navegador</span>
        <select
          value={currentDomain}
          onChange={(e) => {
            setCurrentDomain(e.target.value);
            setCurrentUser(null);
          }}
          className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-700"
        >
          <option value="fitsaas.com">fitsaas.com</option>
          {cloudDb.tenants.map((t) => (
            <option key={t.id} value={t.dominio}>{t.dominio}</option>
          ))}
        </select>
      </div>

      {!currentUser ? (
        <AuthScreen db={cloudDb} onLogin={setCurrentUser} onRegister={registerUser} currentDomain={currentDomain} />
      ) : (
        <>
          <header className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-xl"><Activity />FitSaaS Platform</div>
            <button onClick={() => setCurrentUser(null)} className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-md">
              <LogOut size={16} /> Sair
            </button>
          </header>
          <main className="max-w-6xl mx-auto p-6 flex-1 w-full">
            {currentUser.role === 'admin' && <AdminDashboard db={cloudDb} onPromote={promoteToOwner} />}
            {currentUser.role === 'owner' && (
              <OwnerDashboard
                db={cloudDb}
                tenantId={currentUser.tenant_id}
                onAddWorkoutPlan={addWorkoutPlan}
                onAddExercise={addExercise}
              />
            )}
            {currentUser.role === 'student' && (
              <StudentDashboard
                db={cloudDb}
                studentId={currentUser.id}
                onAddLoadLog={addLoadLog}
                onAddMeasurement={addMeasurement}
                onAddWorkoutPlan={addWorkoutPlan}
                onAddExercise={addExercise}
              />
            )}
            {currentUser.role === 'client' && <ClientDashboard />}
          </main>
        </>
      )}
    </div>
  );
}

function AuthScreen({ db, onLogin, onRegister, currentDomain }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const activeTenant = useMemo(() => db.tenants.find((t) => t.dominio === currentDomain), [db.tenants, currentDomain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const user = db.users.find((u) => u.email === email && u.senha === senha);
        if (user) return onLogin(user);
        const student = db.students.find((s) => s.email === email && s.senha === senha);
        if (student && activeTenant && student.tenant_id === activeTenant.id) return onLogin({ ...student, role: 'student' });
        setError('Credenciais inválidas.');
        return;
      }
      if (!nome || !email || !senha) return setError('Preencha os campos obrigatórios.');
      const tenantId = activeTenant ? activeTenant.id : null;
      const newUser = await onRegister({ nome, email, senha, tenant_id: tenantId });
      onLogin(newUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold text-center mb-6">{isLogin ? 'Entrar' : 'Criar Conta'}</h2>
        {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className="w-full p-2 border rounded" />}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded" />
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" className="w-full p-2 border rounded" />
          <button disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded">{loading ? 'A processar...' : isLogin ? 'Entrar' : 'Registar'}</button>
        </form>
        <button onClick={() => setIsLogin((v) => !v)} className="w-full mt-3 text-indigo-600">{isLogin ? 'Não tens conta? Regista-te' : 'Já tens conta? Entra'}</button>
      </div>
    </div>
  );
}
function AdminClientRow({ client, onPromote }) {
  const [gymName, setGymName] = useState('');
  const [promoting, setPromoting] = useState(false);

  const handle = async () => {
    if (!gymName.trim()) return;
    setPromoting(true);
    await onPromote(client.id, gymName.trim());
    setPromoting(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl border flex gap-3 items-end flex-wrap">
      <div className="flex-1 min-w-[160px]">
        <p className="font-semibold">{client.nome}</p>
        <p className="text-sm text-slate-500">{client.email}</p>
      </div>
      <input
        value={gymName}
        onChange={(e) => setGymName(e.target.value)}
        placeholder="Nome da academia"
        className="p-2 border rounded flex-1 min-w-[180px]"
      />
      <button
        onClick={handle}
        disabled={promoting || !gymName.trim()}
        className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-indigo-700">
        {promoting ? 'Promovendo...' : 'Promover a Owner'}
      </button>
    </div>
  );
}

function AdminDashboard({ db, onPromote }) {
  const pending = db.users.filter((u) => u.role === 'client');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-indigo-900">Admin SaaS</h1>
      {pending.length === 0 && (
        <div className="bg-white border rounded-xl p-6 text-center text-slate-400 text-sm">
          Nenhum cliente pendente de aprovação.
        </div>
      )}
      {pending.map((client) => (
        <AdminClientRow key={client.id} client={client} onPromote={onPromote} />
      ))}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-left">
          <thead><tr className="bg-slate-100"><th className="p-3">Nome</th><th className="p-3">Domínio</th><th className="p-3">Plano</th></tr></thead>
          <tbody>
            {db.tenants.map((t) => (
              <tr key={t.id} className="border-t"><td className="p-3">{t.nome}</td><td className="p-3">{t.dominio}</td><td className="p-3">{t.plano}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const GRUPOS_MUSCULARES = [
  'Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps',
  'Quadríceps', 'Posterior', 'Panturrilha', 'Abdômen', 'Lombar',
];

function OwnerDashboard({ db, tenantId, onAddWorkoutPlan, onAddExercise }) {
  const students = db.students.filter((s) => s.tenant_id === tenantId);
  const [selected, setSelected] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ nome: '', tipo: 'A' });
  const [addingExerciseToPlan, setAddingExerciseToPlan] = useState(null);
  const [exForm, setExForm] = useState({ nome: '', grupo: 'Peito', series: '3', reps: '12' });
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingEx, setSavingEx] = useState(false);

  const handleAddPlan = async () => {
    if (!planForm.nome.trim()) return;
    setSavingPlan(true);
    await onAddWorkoutPlan({ student_id: selected.id, nome: planForm.nome, tipo: planForm.tipo });
    setPlanForm({ nome: '', tipo: 'A' });
    setShowPlanForm(false);
    setSavingPlan(false);
  };

  const handleAddExercise = async (planId) => {
    if (!exForm.nome.trim()) return;
    setSavingEx(true);
    await onAddExercise({
      plan_id: planId,
      nome: exForm.nome,
      grupo: exForm.grupo,
      series: parseInt(exForm.series, 10),
      reps: parseInt(exForm.reps, 10),
    });
    setExForm({ nome: '', grupo: 'Peito', series: '3', reps: '12' });
    setAddingExerciseToPlan(null);
    setSavingEx(false);
  };

  if (selected) {
    const plans = db.workout_plans.filter((p) => p.student_id === selected.id);
    return (
      <div className="space-y-5">
        <button onClick={() => { setSelected(null); setShowPlanForm(false); setAddingExerciseToPlan(null); }}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={16} /> Voltar para alunos
        </button>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-emerald-900">Treinos de {selected.nome}</h2>
          <button onClick={() => setShowPlanForm((v) => !v)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
            + Novo Treino
          </button>
        </div>

        {/* Formulário de novo treino */}
        {showPlanForm && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-emerald-700 mb-1 font-medium">Nome do Treino</label>
              <input
                value={planForm.nome}
                onChange={(e) => setPlanForm((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Treino de Peito"
                className="w-full p-2 border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs text-emerald-700 mb-1 font-medium">Tipo</label>
              <select value={planForm.tipo} onChange={(e) => setPlanForm((p) => ({ ...p, tipo: e.target.value }))}
                className="p-2 border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                {['A', 'B', 'C', 'D', 'E'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={handleAddPlan} disabled={savingPlan || !planForm.nome.trim()}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-emerald-700">
              {savingPlan ? 'Criando...' : 'Criar Treino'}
            </button>
            <button onClick={() => setShowPlanForm(false)} className="text-slate-400 hover:text-slate-600 px-2 py-2 text-sm">
              Cancelar
            </button>
          </div>
        )}

        {plans.length === 0 && !showPlanForm && (
          <div className="bg-white border rounded-xl p-8 text-center text-slate-400">
            <Dumbbell className="mx-auto mb-3 text-slate-300" size={40} />
            <p>Nenhum treino ainda. Clique em <strong>+ Novo Treino</strong> para começar.</p>
          </div>
        )}

        {/* Lista de planos */}
        <div className="space-y-4">
          {plans.map((p) => {
            const exercises = db.exercises.filter((e) => e.plan_id === p.id);
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-700 text-white px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Treino {p.tipo}</span>
                    <span className="ml-2 text-emerald-200 text-sm">— {p.nome}</span>
                  </div>
                  <button
                    onClick={() => setAddingExerciseToPlan(addingExerciseToPlan === p.id ? null : p.id)}
                    className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                    + Exercício
                  </button>
                </div>

                {/* Formulário de novo exercício */}
                {addingExerciseToPlan === p.id && (
                  <div className="bg-slate-50 border-b border-slate-200 p-4 flex gap-3 flex-wrap items-end">
                    <div className="flex-1 min-w-[160px]">
                      <label className="block text-xs text-slate-500 mb-1">Nome do Exercício</label>
                      <input value={exForm.nome} onChange={(e) => setExForm((f) => ({ ...f, nome: e.target.value }))}
                        placeholder="Ex: Supino Reto"
                        className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Grupo</label>
                      <select value={exForm.grupo} onChange={(e) => setExForm((f) => ({ ...f, grupo: e.target.value }))}
                        className="p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                        {GRUPOS_MUSCULARES.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="block text-xs text-slate-500 mb-1">Séries</label>
                      <input type="number" value={exForm.series} onChange={(e) => setExForm((f) => ({ ...f, series: e.target.value }))}
                        className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs text-slate-500 mb-1">Reps</label>
                      <input type="number" value={exForm.reps} onChange={(e) => setExForm((f) => ({ ...f, reps: e.target.value }))}
                        className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                    <button onClick={() => handleAddExercise(p.id)} disabled={savingEx || !exForm.nome.trim()}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-emerald-700">
                      {savingEx ? 'Salvando...' : 'Adicionar'}
                    </button>
                    <button onClick={() => setAddingExerciseToPlan(null)} className="text-slate-400 hover:text-slate-600 text-sm px-2 py-2">
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Lista de exercícios */}
                {exercises.length === 0 ? (
                  <p className="text-slate-400 text-sm p-4">Nenhum exercício. Clique em <strong>+ Exercício</strong>.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {exercises.map((e, i) => (
                      <div key={e.id} className="flex items-center px-5 py-3 gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{e.nome}</p>
                          <p className="text-xs text-slate-400">{e.grupo}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-emerald-700">{e.series} séries</p>
                          <p className="text-xs text-slate-400">{e.reps} reps</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-emerald-900">Gestão de Alunos</h1>
      {students.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center text-slate-400">
          <p>Nenhum aluno cadastrado nesta academia ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s) => {
            const planCount = db.workout_plans.filter((p) => p.student_id === s.id).length;
            return (
              <button key={s.id} onClick={() => setSelected(s)}
                className="bg-white p-5 rounded-xl border text-left hover:shadow-md transition-shadow">
                <p className="font-semibold text-slate-800">{s.nome}</p>
                <p className="text-sm text-slate-400">{s.email}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    {planCount} treino{planCount !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium">
                    Gerenciar <ChevronRight size={16} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STUDENT_TABS = [
  { id: 'treino',  label: 'Treino',   icon: Dumbbell },
  { id: 'medidas', label: 'Medidas',  icon: Ruler },
  { id: 'dieta',   label: 'Dieta',    icon: MessageSquare },
];

function StudentDashboard({ db, studentId, onAddLoadLog, onAddMeasurement, onAddWorkoutPlan, onAddExercise }) {
  const [tab, setTab] = useState('treino');
  const plans = db.workout_plans.filter((p) => p.student_id === studentId);
  const [activePlan, setActivePlan] = useState(plans[0] || null);
  const measurements = db.measurements.filter((m) => m.student_id === studentId);
  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;

  useEffect(() => {
    if (!activePlan && plans.length > 0) setActivePlan(plans[0]);
  }, [plans, activePlan]);

  const saveMLWorkout = async ({ grupo, exercicios }) => {
    const planId = await onAddWorkoutPlan({
      student_id: studentId,
      nome: `Foco em ${grupo}`,
      tipo: 'ML',
    });
    for (const ex of exercicios) {
      await onAddExercise({ plan_id: planId, ...ex, reps: parseInt(ex.reps) || ex.reps });
    }
    setTab('treino');
  };

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-200 p-1 rounded-xl w-fit">
        {STUDENT_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Aba: Treino */}
      {tab === 'treino' && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-amber-900">Treino do Dia</h1>
          {plans.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border text-center text-slate-500">
              <Dumbbell className="mx-auto mb-3 text-amber-300" size={40} />
              <p>Nenhuma ficha ainda.</p>
              <p className="text-sm mt-1">Vá em <strong>Medidas</strong> para gerar sua ficha pelo ML.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePlan(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${activePlan?.id === p.id
                        ? 'bg-amber-800 text-white'
                        : 'bg-amber-100 text-amber-900 hover:bg-amber-200'}`}
                  >
                    Treino {p.tipo}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {db.exercises
                  .filter((e) => e.plan_id === activePlan?.id)
                  .map((ex) => (
                    <ExerciseLogger
                      key={ex.id}
                      exercise={ex}
                      studentId={studentId}
                      db={db}
                      onAddLoadLog={onAddLoadLog}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Aba: Medidas + ML */}
      {tab === 'medidas' && (
        <div className="space-y-6">
          <MeasurementsForm
            studentId={studentId}
            latestMeasurement={latestMeasurement}
            onSave={onAddMeasurement}
          />
          {measurements.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain size={18} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Recomendação do Sistema</h2>
              </div>
              <MLRecommendation measurements={measurements} onSaveWorkout={saveMLWorkout} />
            </div>
          )}
        </div>
      )}

      {/* Aba: Dieta */}
      {tab === 'dieta' && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-green-900">Assistente de Dieta</h1>
          <DietChatbot medicoes={measurements} />
        </div>
      )}
    </div>
  );
}

function ExerciseLogger({ exercise, studentId, db, onAddLoadLog }) {
  const history = db.load_logs
    .filter((l) => l.exercise_id === exercise.id && l.student_id === studentId)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const lastLog = history[0];

  const [peso, setPeso] = useState(lastLog?.peso_kg?.toString() || '');
  const [reps, setReps] = useState(lastLog?.reps || exercise.reps || 0);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!peso) return;
    setLoading(true);
    await onAddLoadLog({
      student_id: studentId,
      exercise_id: exercise.id,
      peso_kg: parseFloat(peso),
      reps: parseInt(reps, 10),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // Mantém os campos preenchidos para facilitar o próximo registro
  };

  return (
    <div className={`bg-white border rounded-xl p-4 transition-all ${saved ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800">{exercise.nome}</p>
          <p className="text-sm text-slate-400">{exercise.grupo} — {exercise.series}x{exercise.reps}</p>
        </div>
        {saved && (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium shrink-0">
            ✓ Salvo!
          </span>
        )}
      </div>

      {lastLog ? (
        <p className="text-xs mt-2 text-amber-700 inline-flex items-center gap-1">
          <History size={12} /> Último: <strong>{lastLog.peso_kg}kg × {lastLog.reps} reps</strong>
        </p>
      ) : (
        <p className="text-xs mt-2 text-slate-400 italic">Sem registro anterior — primeiro treino!</p>
      )}

      <div className="flex gap-2 mt-3">
        <input
          type="number"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Carga (kg)"
        />
        <input
          type="number"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-24 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Reps"
        />
        <button
          onClick={save}
          disabled={loading || !peso}
          className="bg-amber-600 text-white px-3 rounded-lg disabled:opacity-50 hover:bg-amber-700 transition-colors">
          <Save size={18} />
        </button>
      </div>
    </div>
  );
}

function ClientDashboard() {
  return (
    <div className="bg-white p-8 rounded-xl border text-center max-w-2xl mx-auto mt-8">
      <Building className="mx-auto text-indigo-300 mb-4" size={56} />
      <h2 className="text-2xl font-bold mb-2">Conta criada com sucesso</h2>
      <p className="text-slate-600">A tua conta está pendente de aprovação do Admin SaaS.</p>
    </div>
  );
}
