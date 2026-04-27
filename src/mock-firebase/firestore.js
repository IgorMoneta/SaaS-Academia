const STORAGE_KEY = 'fitsaas_db';

const defaultDb = {
  tenants: [{ id: 't1', nome: 'Academia Mock', dominio: 'fitsaas.com', plano: 'pro' }],
  users: [{ id: 'u1', nome: 'Admin', email: 'admin@saas.com', senha: '123', role: 'admin' }],
  students: [{ id: 's1', nome: 'Aluno 1', email: 'aluno@fitsaas.com', senha: '123', tenant_id: 't1' }],
  workout_plans: [{ id: 'p1', student_id: 's1', nome: 'Treino A', tipo: 'A' }],
  exercises: [{ id: 'e1', plan_id: 'p1', nome: 'Supino', grupo: 'Peito', series: 4, reps: 12 }],
  load_logs: [],
  measurements: [],
};

function loadDb() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Garante que coleções do defaultDb existam caso o schema tenha evoluído
      return { ...defaultDb, ...parsed };
    }
  } catch {}
  return { ...defaultDb };
}

let memoryDb = loadDb();

const listeners = new Set();

const persist = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryDb)); } catch {}
};

const notify = () => {
  persist();
  listeners.forEach(l => l());
};

export const getFirestore = () => ({});
export const collection = (_db, ...path) => path.join('/');
export const doc = (_db, ...path) => path.join('/');

export const onSnapshot = (colPath, cb) => {
  const colName = colPath.split('/').pop();
  const trigger = () => {
    const data = memoryDb[colName] || [];
    cb({ docs: data.map(item => ({ id: item.id, data: () => item })) });
  };
  trigger();
  listeners.add(trigger);
  return () => listeners.delete(trigger);
};

export const addDoc = async (colPath, data) => {
  const colName = colPath.split('/').pop();
  const item = { id: Math.random().toString(36).substring(7), ...data };
  if (!memoryDb[colName]) memoryDb[colName] = [];
  memoryDb[colName].push(item);
  notify();
  return { id: item.id };
};

export const setDoc = async (docPath, data, options) => {
  const parts = docPath.split('/');
  const colName = parts[parts.length - 2];
  const docId = parts[parts.length - 1];
  if (!memoryDb[colName]) return;
  const idx = memoryDb[colName].findIndex(item => item.id === docId);
  if (idx === -1) {
    memoryDb[colName].push({ id: docId, ...data });
  } else if (options?.merge) {
    memoryDb[colName][idx] = { ...memoryDb[colName][idx], ...data };
  } else {
    memoryDb[colName][idx] = { id: docId, ...data };
  }
  notify();
};
