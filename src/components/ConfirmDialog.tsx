'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { Warning, Delete, Info, CheckCircle } from '@mui/icons-material';

type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<DialogVariant, { icon: React.ReactNode; color: string; buttonColor: 'error' | 'warning' | 'info' | 'success' }> = {
  danger: { icon: <Delete sx={{ fontSize: 40 }} />, color: '#f44336', buttonColor: 'error' },
  warning: { icon: <Warning sx={{ fontSize: 40 }} />, color: '#ff9800', buttonColor: 'warning' },
  info: { icon: <Info sx={{ fontSize: 40 }} />, color: '#2196f3', buttonColor: 'info' },
  success: { icon: <CheckCircle sx={{ fontSize: 40 }} />, color: '#4caf50', buttonColor: 'success' },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ color: config.color }}>{config.icon}</Box>
          <Typography variant="h6" fontWeight={600}>{title}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {typeof message === 'string' ? (
          <Typography variant="body1" color="text.secondary">{message}</Typography>
        ) : (
          message
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading}>{cancelText}</Button>
        <Button
          variant="contained"
          color={config.buttonColor}
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
