'use client';

import React from 'react';
import { Box, Skeleton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <TableContainer component={Paper} sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" width={300} height={40} sx={{ borderRadius: 1 }} />
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableCell key={i}>
                <Skeleton variant="text" width={80} />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <TableCell key={colIdx}>
                  {colIdx === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Skeleton variant="circular" width={36} height={36} />
                      <Skeleton variant="text" width={120} />
                    </Box>
                  ) : (
                    <Skeleton variant="text" width={60 + Math.random() * 60} />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Paper key={i} sx={{ p: 2 }}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={40} />
        </Paper>
      ))}
    </Box>
  );
}

export function DetailSkeleton() {
  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Skeleton variant="circular" width={64} height={64} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="30%" height={20} />
        </Box>
      </Box>
      {Array.from({ length: 6 }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Skeleton variant="text" width="25%" />
          <Skeleton variant="text" width="45%" />
        </Box>
      ))}
    </Paper>
  );
}

export default TableSkeleton;
