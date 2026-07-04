import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { UiProvider } from './context/UiContext';
import { ToastProvider } from './components/Toast/ToastContext';
import { ToastContainer } from './components/Toast/ToastContainer';
import { AppRoutes } from './routes';
import { GlobalOverlays } from './GlobalOverlays';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <UiProvider>
              <AppRoutes />
              <GlobalOverlays />
              <ToastContainer />
            </UiProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
