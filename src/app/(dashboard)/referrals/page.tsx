'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  Add,
  CardGiftcard,
  People,
  Star,
  TrendingUp,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface Referral {
  id: string;
  referrer: { id: string; name: string; phone: string; email: string | null };
  referred: { id: string; name: string; phone: string; email: string | null; createdAt: string };
  status: string;
  rewardType: string | null;
  rewardValue: number | null;
  rewardGivenAt: string | null;
  createdAt: string;
}

interface TopReferrer {
  client: { id: string; name: string; phone: string } | undefined;
  count: number;
}

const statusColors: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  PENDING: 'default',
  QUALIFIED: 'warning',
  REWARDED: 'success',
  EXPIRED: 'default',
};

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    qualified: 0,
    rewarded: 0,
    totalRewardsGiven: 0,
  });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    referrerId: '',
    referredId: '',
    rewardType: 'points',
    rewardValue: 100,
  });

  useEffect(() => {
    fetchReferrals();
    fetchClients();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await fetch('/api/referrals');
      if (response.ok) {
        const data = await response.json();
        setReferrals(data.referrals || []);
        setTopReferrers(data.topReferrers || []);
        setSummary(data.summary || {
          total: 0,
          pending: 0,
          qualified: 0,
          rewarded: 0,
          totalRewardsGiven: 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to create referral');
        return;
      }

      setDialogOpen(false);
      setFormData({ referrerId: '', referredId: '', rewardType: 'points', rewardValue: 100 });
      fetchReferrals();
    } catch (error) {
      console.error('Failed to create referral:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      await fetch('/api/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      fetchReferrals();
    } catch (error) {
      console.error('Failed to update referral:', error);
    }
  };

  const tabs = ['All', 'Pending', 'Qualified', 'Rewarded'];
  const statusMap: Record<number, string | null> = {
    0: null,
    1: 'PENDING',
    2: 'QUALIFIED',
    3: 'REWARDED',
  };

  const filteredReferrals = referrals.filter(
    r => selectedTab === 0 || r.status === statusMap[selectedTab]
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Referrals
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Add Referral
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <People color="primary" />
                <Typography variant="body2" color="text.secondary">Total Referrals</Typography>
              </Box>
              <Typography variant="h4">{summary.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp color="warning" />
                <Typography variant="body2" color="text.secondary">Qualified</Typography>
              </Box>
              <Typography variant="h4">{summary.qualified}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CardGiftcard color="success" />
                <Typography variant="body2" color="text.secondary">Rewarded</Typography>
              </Box>
              <Typography variant="h4">{summary.rewarded}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Star color="info" />
                <Typography variant="body2" color="text.secondary">Rewards Given</Typography>
              </Box>
              <Typography variant="h4">{summary.totalRewardsGiven} pts</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
                {tabs.map((tab) => (
                  <Tab key={tab} label={tab} />
                ))}
              </Tabs>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Referrer</TableCell>
                      <TableCell>Referred</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Reward</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredReferrals.map((referral) => (
                      <TableRow key={referral.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {referral.referrer.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {referral.referrer.phone}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {referral.referred.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Joined {format(new Date(referral.referred.createdAt), 'MMM d, yyyy')}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={referral.status}
                            size="small"
                            color={statusColors[referral.status]}
                          />
                        </TableCell>
                        <TableCell>
                          {referral.rewardType === 'points'
                            ? `${referral.rewardValue} pts`
                            : referral.rewardType === 'discount'
                            ? `$${referral.rewardValue} off`
                            : referral.rewardType || '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(referral.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell align="right">
                          {referral.status === 'PENDING' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleAction(referral.id, 'qualify')}
                            >
                              Mark Qualified
                            </Button>
                          )}
                          {referral.status === 'QUALIFIED' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleAction(referral.id, 'reward')}
                            >
                              Give Reward
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredReferrals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>
                            No referrals found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Referrers
            </Typography>
            <List>
              {topReferrers.map((item, index) => (
                <ListItem key={index}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: index === 0 ? 'gold' : index === 1 ? 'silver' : '#CD7F32' }}>
                      {index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.client?.name || 'Unknown'}
                    secondary={`${item.count} referral${item.count !== 1 ? 's' : ''}`}
                  />
                </ListItem>
              ))}
              {topReferrers.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                  No referrers yet
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Add Referral Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Referral</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Referrer (Existing Client)</InputLabel>
              <Select
                label="Referrer (Existing Client)"
                value={formData.referrerId}
                onChange={(e) => setFormData({ ...formData, referrerId: e.target.value })}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Referred (New Client)</InputLabel>
              <Select
                label="Referred (New Client)"
                value={formData.referredId}
                onChange={(e) => setFormData({ ...formData, referredId: e.target.value })}
              >
                {clients
                  .filter(c => c.id !== formData.referrerId)
                  .map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Reward Type</InputLabel>
              <Select
                label="Reward Type"
                value={formData.rewardType}
                onChange={(e) => setFormData({ ...formData, rewardType: e.target.value })}
              >
                <MenuItem value="points">Loyalty Points</MenuItem>
                <MenuItem value="discount">Discount</MenuItem>
                <MenuItem value="free_service">Free Service</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving || !formData.referrerId || !formData.referredId}
          >
            {saving ? 'Creating...' : 'Add Referral'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
