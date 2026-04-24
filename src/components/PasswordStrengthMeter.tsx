'use client';

import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { getPasswordStrength } from '@/lib/validation';

interface PasswordStrengthMeterProps {
  password: string;
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const progress = (strength.score / 4) * 100;

  return (
    <Box sx={{ mt: 1 }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            bgcolor: strength.color,
            borderRadius: 3,
          },
        }}
      />
      <Typography variant="caption" sx={{ color: strength.color, mt: 0.5, display: 'block' }}>
        Password strength: {strength.label}
      </Typography>
    </Box>
  );
}
