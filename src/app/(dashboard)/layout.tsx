'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import DashboardLayout from '@/components/DashboardLayout';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress color="primary" />
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  if (!session) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
