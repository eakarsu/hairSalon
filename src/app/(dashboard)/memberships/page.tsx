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
  TextField,
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
  ListItemIcon,
  ListItemText,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  CardMembership,
  People,
  AttachMoney,
  Check,
  Pause,
  PlayArrow,
  Cancel,
} from '@mui/icons-material';

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  annualPrice: number | null;
  benefits: string[];
  discountPercent: number;
  freeServices: Record<string, number> | null;
  _count: { memberships: number };
}

interface Membership {
  id: string;
  plan: { id: string; name: string; monthlyPrice: number; discountPercent: number };
  client: { id: string; name: string; phone: string; email: string | null };
  status: string;
  startDate: string;
  endDate: string | null;
  billingCycle: string;
  nextBillDate: string | null;
}

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  CANCELLED: 'error',
  EXPIRED: 'default',
};

export default function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [summary, setSummary] = useState({ active: 0, paused: 0, cancelled: 0, monthlyRevenue: 0 });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    monthlyPrice: 0,
    annualPrice: 0,
    discountPercent: 10,
    benefits: [''],
  });
  const [enrollForm, setEnrollForm] = useState({
    planId: '',
    clientId: '',
    billingCycle: 'MONTHLY',
  });

  useEffect(() => {
    fetchPlans();
    fetchMemberships();
    fetchClients();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/memberships?type=plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const fetchMemberships = async () => {
    try {
      const response = await fetch('/api/memberships?type=members');
      if (response.ok) {
        const data = await response.json();
        setMemberships(data.memberships || []);
        setSummary(data.summary || { active: 0, paused: 0, cancelled: 0, monthlyRevenue: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch memberships:', error);
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

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'plan',
          ...planForm,
          benefits: planForm.benefits.filter(b => b.trim()),
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      setPlanDialogOpen(false);
      setPlanForm({
        name: '',
        description: '',
        monthlyPrice: 0,
        annualPrice: 0,
        discountPercent: 10,
        benefits: [''],
      });
      fetchPlans();
    } catch (error) {
      console.error('Failed to save plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEnroll = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'enrollment',
          ...enrollForm,
        }),
      });

      if (!response.ok) throw new Error('Failed to enroll');

      setEnrollDialogOpen(false);
      setEnrollForm({ planId: '', clientId: '', billingCycle: 'MONTHLY' });
      fetchMemberships();
    } catch (error) {
      console.error('Failed to enroll:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleMembershipAction = async (id: string, action: string) => {
    try {
      await fetch('/api/memberships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      fetchMemberships();
    } catch (error) {
      console.error('Failed to update membership:', error);
    }
  };

  const addBenefit = () => {
    setPlanForm({ ...planForm, benefits: [...planForm.benefits, ''] });
  };

  const updateBenefit = (index: number, value: string) => {
    const updated = [...planForm.benefits];
    updated[index] = value;
    setPlanForm({ ...planForm, benefits: updated });
  };

  const tabs = ['Plans', 'Members'];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Memberships
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setPlanDialogOpen(true)}
          >
            Create Plan
          </Button>
          <Button
            variant="contained"
            startIcon={<People />}
            onClick={() => setEnrollDialogOpen(true)}
          >
            Enroll Client
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CardMembership color="primary" />
                <Typography variant="body2" color="text.secondary">Active Members</Typography>
              </Box>
              <Typography variant="h4">{summary.active}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Pause color="warning" />
                <Typography variant="body2" color="text.secondary">Paused</Typography>
              </Box>
              <Typography variant="h4">{summary.paused}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AttachMoney color="success" />
                <Typography variant="body2" color="text.secondary">Monthly Revenue</Typography>
              </Box>
              <Typography variant="h4">${summary.monthlyRevenue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <People color="info" />
                <Typography variant="body2" color="text.secondary">Total Plans</Typography>
              </Box>
              <Typography variant="h4">{plans.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
          <>
            {selectedTab === 0 && (
              <Grid container spacing={3}>
                {plans.map((plan) => (
                  <Grid key={plan.id} size={{ xs: 12, md: 6, lg: 4 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>{plan.name}</Typography>
                        <Typography variant="h4" color="primary" gutterBottom>
                          ${plan.monthlyPrice.toFixed(2)}<Typography component="span" variant="body2">/mo</Typography>
                        </Typography>
                        {plan.annualPrice && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            or ${plan.annualPrice.toFixed(2)}/year (save {Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100)}%)
                          </Typography>
                        )}
                        <Chip
                          label={`${plan.discountPercent}% off services`}
                          color="success"
                          size="small"
                          sx={{ mb: 2 }}
                        />
                        {plan.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {plan.description}
                          </Typography>
                        )}
                        <List dense>
                          {plan.benefits.map((benefit, i) => (
                            <ListItem key={i} sx={{ py: 0 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <Check color="success" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={benefit} />
                            </ListItem>
                          ))}
                        </List>
                        <Typography variant="caption" color="text.secondary">
                          {plan._count.memberships} active members
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {plans.length === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                      No membership plans created yet.
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}

            {selectedTab === 1 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Start Date</TableCell>
                      <TableCell>Next Bill</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {memberships.map((membership) => (
                      <TableRow key={membership.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {membership.client.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {membership.client.phone}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{membership.plan.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              ${membership.plan.monthlyPrice}/mo • {membership.plan.discountPercent}% off
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={membership.status}
                            size="small"
                            color={statusColors[membership.status]}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(membership.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {membership.nextBillDate
                            ? new Date(membership.nextBillDate).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {membership.status === 'ACTIVE' && (
                            <IconButton
                              size="small"
                              onClick={() => handleMembershipAction(membership.id, 'pause')}
                              title="Pause"
                            >
                              <Pause />
                            </IconButton>
                          )}
                          {membership.status === 'PAUSED' && (
                            <IconButton
                              size="small"
                              onClick={() => handleMembershipAction(membership.id, 'resume')}
                              title="Resume"
                            >
                              <PlayArrow />
                            </IconButton>
                          )}
                          {membership.status !== 'CANCELLED' && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleMembershipAction(membership.id, 'cancel')}
                              title="Cancel"
                            >
                              <Cancel />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {memberships.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>
                            No members enrolled yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Paper>

      {/* Create Plan Dialog */}
      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Membership Plan</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Plan Name"
              fullWidth
              required
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Monthly Price"
                  type="number"
                  fullWidth
                  required
                  value={planForm.monthlyPrice}
                  onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: parseFloat(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Annual Price (optional)"
                  type="number"
                  fullWidth
                  value={planForm.annualPrice}
                  onChange={(e) => setPlanForm({ ...planForm, annualPrice: parseFloat(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Service Discount %"
              type="number"
              fullWidth
              value={planForm.discountPercent}
              onChange={(e) => setPlanForm({ ...planForm, discountPercent: parseFloat(e.target.value) })}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            />
            <Typography variant="subtitle2">Benefits</Typography>
            {planForm.benefits.map((benefit, index) => (
              <TextField
                key={index}
                placeholder={`Benefit ${index + 1}`}
                fullWidth
                size="small"
                value={benefit}
                onChange={(e) => updateBenefit(index, e.target.value)}
              />
            ))}
            <Button variant="text" onClick={addBenefit} startIcon={<Add />}>
              Add Benefit
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSavePlan}
            disabled={saving || !planForm.name || !planForm.monthlyPrice}
          >
            {saving ? 'Creating...' : 'Create Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enroll Client Dialog */}
      <Dialog open={enrollDialogOpen} onClose={() => setEnrollDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enroll Client in Membership</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Client</InputLabel>
              <Select
                label="Client"
                value={enrollForm.clientId}
                onChange={(e) => setEnrollForm({ ...enrollForm, clientId: e.target.value })}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Plan</InputLabel>
              <Select
                label="Plan"
                value={enrollForm.planId}
                onChange={(e) => setEnrollForm({ ...enrollForm, planId: e.target.value })}
              >
                {plans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.monthlyPrice}/mo
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Billing Cycle</InputLabel>
              <Select
                label="Billing Cycle"
                value={enrollForm.billingCycle}
                onChange={(e) => setEnrollForm({ ...enrollForm, billingCycle: e.target.value })}
              >
                <MenuItem value="MONTHLY">Monthly</MenuItem>
                <MenuItem value="ANNUAL">Annual</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEnroll}
            disabled={saving || !enrollForm.clientId || !enrollForm.planId}
          >
            {saving ? 'Enrolling...' : 'Enroll'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
