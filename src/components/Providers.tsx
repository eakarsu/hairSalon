'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { SessionProvider } from 'next-auth/react';
import theme from '@/lib/theme';
import { ToastProvider } from '@/components/ToastProvider';
import ErrorBoundary from '@/components/ErrorBoundary';

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <SessionProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ErrorBoundary>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SessionProvider>
    </AppRouterCacheProvider>
  );
}
