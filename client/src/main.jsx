import React from 'react';
import ReactDOM from 'react-dom/client';
import { loadRuntimeConfig } from './config/runtime';
import './index.css';

// Boot order matters: resolve the runtime API URL (runtime-config.json)
// BEFORE any app module evaluates, then load the app dynamically.
async function boot() {
  await loadRuntimeConfig();

  const { BrowserRouter } = await import('react-router-dom');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const App = (await import('./App')).default;
  const AppShell = (await import('./components/AppShell')).default;
  const { requestNativePermissions } = await import('./utils/native');
  await import('./store/settings.store'); // applies persisted theme + language on boot

  requestNativePermissions(); // no-op in browser; asks camera/location on Android

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000
      }
    }
  });

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShell>
            <App />
          </AppShell>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

boot();
