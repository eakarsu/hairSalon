'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Payment as PaymentIcon,
  CreditCard as CardIcon,
  Money as CashIcon,
  CardGiftcard as GiftCardIcon,
  Undo as RefundIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
type PaymentMethod = 'CASH' | 'CARD' | 'GIFT_CARD' | 'OTHER';

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  notes: string | null;
  stripeId: string | null;
  createdAt: string;
  client: { id: string; name: string; phone: string };
  appointment: {
    id: string;
    startTime: string;
    service: { name: string };
    technician: { name: string };
  } | null;
  giftCard: { code: string } | null;
}

interface PaymentSummary {
  totalRevenue: number;
  transactionCount: number;
  cash: number;
  card: number;
  giftCard: number;
  pending: number;
  failed: number;
}

const STATUS_COLORS: Record<PaymentStatus, 'success' | 'warning' | 'error' | 'default'> = {
  COMPLETED: 'success',
  PENDING: 'warning',
  FAILED: 'error',
  REFUNDED: 'default',
};

const METHOD_LABELS: Record<PaymentMethod, { icon: React.ReactElement; label: string }> = {
  CASH: { icon: <CashIcon fontSize="small" />, label: 'Cash' },
  CARD: { icon: <CardIcon fontSize="small" />, label: 'Card' },
  GIFT_CARD: { icon: <GiftCardIcon fontSize="small" />, label: 'Gift Card' },
  OTHER: { icon: <PaymentIcon fontSize="small" />, label: 'Other' },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [period, setPeriod] = useState('today');
  const [filterStatus, setFilterStatus] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    amount: '',
    method: 'CASH' as PaymentMethod,
    notes: '',
  });

  // Refund dialog
  const [refundDialog, setRefundDialog] = useState(false);
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);

  // Detail dialog
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    fetchData();
  }, [period, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/payments?period=${period}`;
      if (filterStatus) url += `&status=${filterStatus}`;

      const [paymentsRes, clientsRes] = await Promise.all([
        fetch(url),
        fetch('/api/clients'),
      ]);

      const paymentsData = await paymentsRes.json();
      const clientsData = await clientsRes.json();

      setPayments(paymentsData.payments || []);
      setSummary(paymentsData.summary || null);
      setClients(clientsData.clients || []);
    } catch {
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to add payment');

      setDialogOpen(false);
      setFormData({ clientId: '', amount: '', method: 'CASH', notes: '' });
      fetchData();
    } catch {
      setError('Failed to add payment');
    }
  };

  const handleRowClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setDetailDialog(true);
  };

  const handleRefund = async () => {
    if (!refundPayment) return;

    try {
      const res = await fetch(`/api/payments/${refundPayment.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error('Refund failed');

      setRefundDialog(false);
      setRefundPayment(null);
      fetchData();
    } catch {
      setError('Refund failed');
    }
  };

  if (loading && !summary) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Payments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Record Payment
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Period Toggle */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, v) => v && setPeriod(v)}
          size="small"
        >
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="week">This Week</ToggleButton>
          <ToggleButton value="month">This Month</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="REFUNDED">Refunded</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'success.50' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Revenue
                </Typography>
                <Typography variant="h4" color="success.main">
                  ${summary.totalRevenue.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {summary.transactionCount} transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CashIcon color="success" />
                  <Typography color="text.secondary">Cash</Typography>
                </Box>
                <Typography variant="h5">${summary.cash.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CardIcon color="primary" />
                  <Typography color="text.secondary">Card</Typography>
                </Box>
                <Typography variant="h5">${summary.card.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <GiftCardIcon color="secondary" />
                  <Typography color="text.secondary">Gift Card</Typography>
                </Box>
                <Typography variant="h5">${summary.giftCard.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Payments Table */}
      {payments.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <PaymentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No payments recorded
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Record a payment to get started
          </Typography>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Record First Payment
          </Button>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date/Time</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Service</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow
                  key={payment.id}
                  hover
                  onClick={() => handleRowClick(payment)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(payment.createdAt), 'h:mm a')}
                    </Typography>
                  </TableCell>
                  <TableCell>{payment.client.name}</TableCell>
                  <TableCell>
                    {payment.appointment?.service.name || '-'}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      ${payment.amount.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={METHOD_LABELS[payment.method].icon}
                      label={METHOD_LABELS[payment.method].label}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={payment.status}
                      color={STATUS_COLORS[payment.status]}
                    />
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    {payment.status === 'COMPLETED' && (
                      <Button
                        size="small"
                        startIcon={<RefundIcon />}
                        onClick={() => {
                          setRefundPayment(payment);
                          setRefundDialog(true);
                        }}
                      >
                        Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Payment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 2, mb: 2 }}
            options={clients}
            getOptionLabel={(option) => `${option.name} (${option.phone})`}
            onChange={(_, value) =>
              setFormData((prev) => ({ ...prev, clientId: value?.id || '' }))
            }
            renderInput={(params) => (
              <TextField {...params} label="Client" required />
            )}
          />

          <TextField
            fullWidth
            required
            type="number"
            label="Amount"
            value={formData.amount}
            onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={formData.method}
              label="Payment Method"
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  method: e.target.value as PaymentMethod,
                }))
              }
            >
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="CARD">Card</MenuItem>
              <MenuItem value="GIFT_CARD">Gift Card</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddPayment}
            disabled={!formData.clientId || !formData.amount}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialog} onClose={() => setRefundDialog(false)}>
        <DialogTitle>Confirm Refund</DialogTitle>
        <DialogContent>
          {refundPayment && (
            <Typography>
              Are you sure you want to refund ${refundPayment.amount.toFixed(2)} to{' '}
              {refundPayment.client.name}?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRefund}>
            Process Refund
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h3" fontWeight="bold" color="success.main">
                  ${selectedPayment.amount.toFixed(2)}
                </Typography>
                <Chip
                  label={selectedPayment.status}
                  color={STATUS_COLORS[selectedPayment.status]}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Client</Typography>
                  <Typography fontWeight="medium">{selectedPayment.client.name}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography>{selectedPayment.client.phone}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Payment Method</Typography>
                  <Chip
                    size="small"
                    icon={METHOD_LABELS[selectedPayment.method].icon}
                    label={METHOD_LABELS[selectedPayment.method].label}
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Date & Time</Typography>
                  <Typography>{format(new Date(selectedPayment.createdAt), 'MMM d, yyyy h:mm a')}</Typography>
                </Grid>
                {selectedPayment.appointment && (
                  <>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2" color="text.secondary">Service</Typography>
                      <Typography>{selectedPayment.appointment.service.name}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2" color="text.secondary">Technician</Typography>
                      <Typography>{selectedPayment.appointment.technician.name}</Typography>
                    </Grid>
                  </>
                )}
                {selectedPayment.giftCard && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Gift Card Used</Typography>
                    <Typography fontFamily="monospace">{selectedPayment.giftCard.code}</Typography>
                  </Grid>
                )}
                {selectedPayment.stripeId && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Stripe ID</Typography>
                    <Typography fontFamily="monospace" variant="body2">{selectedPayment.stripeId}</Typography>
                  </Grid>
                )}
                {selectedPayment.notes && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Notes</Typography>
                    <Typography>{selectedPayment.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedPayment?.status === 'COMPLETED' && (
            <Button
              color="error"
              startIcon={<RefundIcon />}
              onClick={() => {
                setRefundPayment(selectedPayment);
                setDetailDialog(false);
                setRefundDialog(true);
              }}
            >
              Refund
            </Button>
          )}
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
