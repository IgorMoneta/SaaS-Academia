const STORAGE_KEY = 'fitsaas_personal_v1_db';

export const initialDb = {
  users: [],
  workout_plans: [],
  exercises: [],
  load_logs: [],
  measurements: [],
};

function clone(value) {
  return structuredClone(value);
}

function normalizeDb(db) {
  const fallback = clone(initialDb);
  if (!db || typeof db !== 'object') return fallback;

  const users = Array.isArray(db.users)
    ? db.users
        .map((item) => ({
          id: item.id || createId('user'),
          nome: item.nome || 'Usuario',
          email: item.email || '',
          senha: item.senha || '123',
          objetivo: item.objetivo || 'Hipertrofia',
          meta_semanal: Number(item.meta_semanal || item.frequencia || 4),
          altura: item.altura ? Number(item.altura) : null,
          criado_em: item.criado_em || item.created_at || new Date().toISOString().slice(0, 10),
        }))
    : [];

  const primaryUserId = users[0]?.id || 'unassigned_user';
  const knownUserIds = new Set(users.map((item) => item.id));

  const workoutPlans = Array.isArray(db.workout_plans)
    ? db.workout_plans.map((plan) => ({
        id: plan.id || createId('plan'),
        user_id: knownUserIds.has(plan.user_id) ? plan.user_id : plan.user_id || primaryUserId,
        nome: plan.nome || 'Treino',
        tipo: plan.tipo || 'A',
        created_at: plan.created_at || new Date().toISOString().slice(0, 10),
      }))
    : fallback.workout_plans;

  const exercises = Array.isArray(db.exercises)
    ? db.exercises.map((exercise) => ({
        id: exercise.id || createId('exercise'),
        plan_id: exercise.plan_id,
        nome: exercise.nome || 'Exercicio',
        grupo: exercise.grupo || 'Geral',
        series: Number(exercise.series || 3),
        reps: String(exercise.reps || '8-12'),
        created_at: exercise.created_at || new Date().toISOString().slice(0, 10),
      }))
    : fallback.exercises;

  const loadLogs = Array.isArray(db.load_logs)
    ? db.load_logs.map((log) => ({
        id: log.id || createId('log'),
        user_id: knownUserIds.has(log.user_id) ? log.user_id : log.user_id || primaryUserId,
        exercise_id: log.exercise_id,
        peso_kg: Number(log.peso_kg || 0),
        reps: Number(log.reps || 0),
        data: log.data || new Date().toISOString().slice(0, 10),
        timestamp: log.timestamp || Date.now(),
      }))
    : fallback.load_logs;

  const measurements = Array.isArray(db.measurements)
    ? db.measurements.map((measurement) => ({
        id: measurement.id || createId('measurement'),
        user_id: knownUserIds.has(measurement.user_id)
          ? measurement.user_id
          : measurement.user_id || primaryUserId,
        data: measurement.data || new Date().toISOString().slice(0, 10),
        peso: measurement.peso ?? null,
        altura: measurement.altura ?? null,
        peito: measurement.peito ?? null,
        cintura: measurement.cintura ?? null,
        braco: measurement.braco ?? null,
        coxa: measurement.coxa ?? null,
        panturrilha: measurement.panturrilha ?? null,
        timestamp: measurement.timestamp || Date.now(),
      }))
    : fallback.measurements;

  return {
    users,
    workout_plans: workoutPlans,
    exercises,
    load_logs: loadLogs,
    measurements,
  };
}

export function loadDb() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeDb(JSON.parse(saved));
  } catch {
    // Falls back to an empty state if the browser cache is unavailable.
  }
  return clone(initialDb);
}

export function saveDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeDb(db)));
}

export function resetDb() {
  localStorage.removeItem(STORAGE_KEY);
  return clone(initialDb);
}

export function createId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
