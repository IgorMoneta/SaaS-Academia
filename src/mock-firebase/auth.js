export const getAuth = () => ({ currentUser: { uid: 'mock-user' } });
export const onAuthStateChanged = (auth, cb) => {
  setTimeout(() => cb({ uid: 'mock-user' }), 100);
  return () => {};
};
export const signInAnonymously = async () => ({ user: { uid: 'mock-user' } });
export const signInWithCustomToken = async () => ({ user: { uid: 'mock-user' } });
