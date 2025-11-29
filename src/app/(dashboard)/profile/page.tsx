'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Grid,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
  });

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      OWNER: 'Owner',
      MANAGER: 'Manager',
      TECHNICIAN: 'Technician',
      FRONTDESK: 'Front Desk',
      CLIENT_USER: 'Client',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string): 'error' | 'warning' | 'info' | 'success' | 'default' => {
    const colors: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
      OWNER: 'error',
      MANAGER: 'warning',
      TECHNICIAN: 'info',
      FRONTDESK: 'success',
      CLIENT_USER: 'default',
    };
    return colors[role] || 'default';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name }),
      });

      if (!res.ok) {
        throw new Error('Failed to update profile');
      }

      await update({ name: formData.name });
      setSuccess('Profile updated successfully');
      setEditing(false);
    } catch {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        My Profile
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  fontSize: '3rem',
                  bgcolor: 'primary.main',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {session?.user?.name || 'User'}
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                {session?.user?.email}
              </Typography>
              <Chip
                label={getRoleLabel(session?.user?.role || '')}
                color={getRoleColor(session?.user?.role || '')}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Account Information</Typography>
                {!editing ? (
                  <Button variant="outlined" onClick={() => setEditing(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={() => setEditing(false)}>Cancel</Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </Box>
                )}
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Full Name
                    </Typography>
                  </Box>
                  {editing ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  ) : (
                    <Typography>{session?.user?.name || '-'}</Typography>
                  )}
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <EmailIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Email Address
                    </Typography>
                  </Box>
                  <Typography>{session?.user?.email || '-'}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <BadgeIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Role
                    </Typography>
                  </Box>
                  <Typography>{getRoleLabel(session?.user?.role || '')}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Button variant="outlined" color="warning">
                Change Password
              </Button>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                We recommend changing your password periodically for security.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
