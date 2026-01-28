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
  Checkbox,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AttachMoney,
  CheckCircle,
  Schedule,
  PendingActions,
  Edit,
  Settings,
} from '@mui/icons-material';

interface Commission {
  id: string;
  technicianId: string;
  technician: { id: string; name: string; level: string | null };
  serviceAmount: number;
  productAmount: number;
  tipAmount: number;
  commissionRate: number;
  commissionAmount: number;
  period: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface CommissionRule {
  id: string;
  technicianId: string;
  technician: { id: string; name: string };
  serviceRate: number;
  productRate: number;
  tipRate: number;
}

const statusColors: Record<string, 'default' | 'primary' | 'success'> = {
  PENDING: 'default',
  APPROVED: 'primary',
  PAID: 'success',
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [summary, setSummary] = useState({ totalPending: 0, totalApproved: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7) // Current month
  );

  useEffect(() => {
    fetchCommissions();
  }, [selectedPeriod]);

  const fetchCommissions = async () => {
    try {
      const response = await fetch(`/api/commissions?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setCommissions(data.commissions || []);
        setRules(data.rules || []);
        setSummary(data.summary || { totalPending: 0, totalApproved: 0, totalPaid: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;

    try {
      await fetch('/api/commissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      });
      setSelectedIds([]);
      fetchCommissions();
    } catch (error) {
      console.error('Failed to update commissions:', error);
    }
  };

  const tabs = ['All', 'Pending', 'Approved', 'Paid'];
  const statusMap: Record<number, string | null> = { 0: null, 1: 'PENDING', 2: 'APPROVED', 3: 'PAID' };

  const filteredCommissions = commissions.filter(
    c => selectedTab === 0 || c.status === statusMap[selectedTab]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const pendingIds = filteredCommissions.filter(c => c.status !== 'PAID').map(c => c.id);
    setSelectedIds(prev => prev.length === pendingIds.length ? [] : pendingIds);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Commissions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            type="month"
            size="small"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            sx={{ width: 180 }}
          />
          <IconButton onClick={() => setRuleDialogOpen(true)}>
            <Tooltip title="Commission Rules">
              <Settings />
            </Tooltip>
          </IconButton>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PendingActions color="warning" />
                <Typography variant="body2" color="text.secondary">Pending</Typography>
              </Box>
              <Typography variant="h4">${summary.totalPending.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Schedule color="primary" />
                <Typography variant="body2" color="text.secondary">Approved</Typography>
              </Box>
              <Typography variant="h4">${summary.totalApproved.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="success" />
                <Typography variant="body2" color="text.secondary">Paid</Typography>
              </Box>
              <Typography variant="h4">${summary.totalPaid.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AttachMoney color="info" />
                <Typography variant="body2" color="text.secondary">Total</Typography>
              </Box>
              <Typography variant="h4">
                ${(summary.totalPending + summary.totalApproved + summary.totalPaid).toFixed(2)}
              </Typography>
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

        {selectedIds.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => handleStatusUpdate('APPROVED')}
            >
              Approve Selected ({selectedIds.length})
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleStatusUpdate('PAID')}
            >
              Mark as Paid ({selectedIds.length})
            </Button>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.length > 0 && selectedIds.length === filteredCommissions.filter(c => c.status !== 'PAID').length}
                      onChange={selectAll}
                    />
                  </TableCell>
                  <TableCell>Technician</TableCell>
                  <TableCell align="right">Services</TableCell>
                  <TableCell align="right">Products</TableCell>
                  <TableCell align="right">Tips</TableCell>
                  <TableCell align="right">Rate</TableCell>
                  <TableCell align="right">Commission</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCommissions.map((commission) => (
                  <TableRow key={commission.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.includes(commission.id)}
                        onChange={() => toggleSelect(commission.id)}
                        disabled={commission.status === 'PAID'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {commission.technician.name}
                        </Typography>
                        {commission.technician.level && (
                          <Typography variant="caption" color="text.secondary">
                            {commission.technician.level}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">${commission.serviceAmount.toFixed(2)}</TableCell>
                    <TableCell align="right">${commission.productAmount.toFixed(2)}</TableCell>
                    <TableCell align="right">${commission.tipAmount.toFixed(2)}</TableCell>
                    <TableCell align="right">{(commission.commissionRate * 100).toFixed(0)}%</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600}>${commission.commissionAmount.toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={commission.status}
                        size="small"
                        color={statusColors[commission.status]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCommissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No commissions for this period
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Commission Rules Dialog */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Commission Rules</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Technician</TableCell>
                  <TableCell align="right">Service Rate</TableCell>
                  <TableCell align="right">Product Rate</TableCell>
                  <TableCell align="right">Tip Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.technician.name}</TableCell>
                    <TableCell align="right">{(rule.serviceRate * 100).toFixed(0)}%</TableCell>
                    <TableCell align="right">{(rule.productRate * 100).toFixed(0)}%</TableCell>
                    <TableCell align="right">{(rule.tipRate * 100).toFixed(0)}%</TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary">
                        No custom rules. Default: 45% services, 10% products, 100% tips
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
