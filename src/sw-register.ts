export const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' }) // ✅ scope explícito
          .then((reg) => {
            console.log('✅ SW registrado:', reg);
          })
          .catch((err) => {
            console.error('❌ Error registrando SW:', err);
          });
      });
    }
  };
  