'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Drawer,
  Divider,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Payment as PaymentIcon,
  CreditCard as CardIcon,
  Money as CashIcon,
  CardGiftcard as GiftCardIcon,
  Undo as RefundIcon,
  Close as CloseIcon,
  FileDownload as ExportIcon,
  PictureAsPdf as PdfIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

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

// --- Export helpers ---

function exportPaymentsCSV(payments: Payment[]) {
  const headers = ['Date', 'Time', 'Client', 'Phone', 'Service', 'Technician', 'Amount', 'Method', 'Status', 'Notes'];
  const rows = payments.map((p) => [
    format(new Date(p.createdAt), 'yyyy-MM-dd'),
    format(new Date(p.createdAt), 'HH:mm'),
    p.client.name,
    p.client.phone,
    p.appointment?.service.name || '',
    p.appointment?.technician.name || '',
    p.amount.toFixed(2),
    METHOD_LABELS[p.method].label,
    p.status,
    (p.notes || '').replace(/"/g, '""'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportPaymentsPDF(payments: Payment[], summary: PaymentSummary | null) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const tableRows = payments
    .map(
      (p) => `
      <tr>
        <td>${format(new Date(p.createdAt), 'MMM d, yyyy h:mm a')}</td>
        <td>${p.client.name}</td>
        <td>${p.appointment?.service.name || '-'}</td>
        <td style="text-align:right">$${p.amount.toFixed(2)}</td>
        <td>${METHOD_LABELS[p.method].label}</td>
        <td><span class="status status-${p.status.toLowerCase()}">${p.status}</span></td>
      </tr>`
    )
    .join('');

  const summarySection = summary
    ? `<div class="summary">
        <div class="summary-card"><strong>Total Revenue</strong><br/>$${summary.totalRevenue.toFixed(2)}<br/><small>${summary.transactionCount} transactions</small></div>
        <div class="summary-card"><strong>Cash</strong><br/>$${summary.cash.toFixed(2)}</div>
        <div class="summary-card"><strong>Card</strong><br/>$${summary.card.toFixed(2)}</div>
        <div class="summary-card"><strong>Gift Card</strong><br/>$${summary.giftCard.toFixed(2)}</div>
      </div>`
    : '';

  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Payments Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #333; }
  h1 { margin-bottom: 4px; }
  .date { color: #666; margin-bottom: 20px; }
  .summary { display: flex; gap: 16px; margin-bottom: 24px; }
  .summary-card { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; flex: 1; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .status { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .status-completed { background: #e8f5e9; color: #2e7d32; }
  .status-pending { background: #fff3e0; color: #e65100; }
  .status-failed { background: #ffebee; color: #c62828; }
  .status-refunded { background: #f5f5f5; color: #616161; }
  @media print { body { padding: 0; } }
</style></head><body>
  <h1>Payments Report</h1>
  <p class="date">Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
  ${summarySection}
  <table>
    <thead><tr><th>Date/Time</th><th>Client</th><th>Service</th><th style="text-align:right">Amount</th><th>Method</th><th>Status</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body></html>`);

  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
  return true;
}

// --- Main component ---

export default function PaymentsPage() {
  const { showSuccess, showError, showInfo } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState('today');
  const [filterStatus, setFilterStatus] = useState('');

  // Add Payment Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    amount: '',
    method: 'CASH' as PaymentMethod,
    notes: '',
  });

  // Detail drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Refund confirmation state
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);

  const fetchData = useCallback(async () => {
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
      showError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [period, filterStatus, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---

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
      showSuccess('Payment recorded successfully');
      fetchData();
    } catch {
      showError('Failed to add payment');
    }
  };

  const handleRowClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    // Delay clearing selected payment so the closing animation looks smooth
    setTimeout(() => setSelectedPayment(null), 300);
  };

  const handleOpenRefundConfirm = (payment: Payment) => {
    setRefundPayment(payment);
    setRefundConfirmOpen(true);
  };

  const handleRefund = async () => {
    if (!refundPayment) return;

    setRefundLoading(true);
    try {
      const res = await fetch(`/api/payments/${refundPayment.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error('Refund failed');

      setRefundConfirmOpen(false);
      setRefundPayment(null);
      setDrawerOpen(false);
      showSuccess(`Refund of $${refundPayment.amount.toFixed(2)} processed successfully`);
      fetchData();
    } catch {
      showError('Refund failed. Please try again.');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (payments.length === 0) {
      showInfo('No payments to export');
      return;
    }
    exportPaymentsCSV(payments);
    showSuccess(`Exported ${payments.length} payments to CSV`);
  };

  const handleExportPDF = () => {
    if (payments.length === 0) {
      showInfo('No payments to export');
      return;
    }
    const opened = exportPaymentsPDF(payments, summary);
    if (opened) {
      showSuccess('PDF report opened in new tab');
    } else {
      showError('Could not open print window. Please allow popups for this site.');
    }
  };

  // --- Loading state ---

  if (loading && !summary) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Payments</Typography>
        </Box>
        <CardsSkeleton count={4} />
        <Box sx={{ mt: 3 }}>
          <TableSkeleton rows={6} columns={7} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Payments</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Export CSV">
            <Button
              variant="outlined"
              size="small"
              startIcon={<ExportIcon />}
              onClick={handleExportCSV}
            >
              CSV
            </Button>
          </Tooltip>
          <Tooltip title="Export PDF">
            <Button
              variant="outlined"
              size="small"
              startIcon={<PdfIcon />}
              onClick={handleExportPDF}
            >
              PDF
            </Button>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Record Payment
          </Button>
        </Stack>
      </Box>

      {/* Period Toggle & Status Filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
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
                        onClick={() => handleOpenRefundConfirm(payment)}
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

      {/* ===== Detail Drawer (right side) ===== */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 420 }, p: 0 },
        }}
      >
        {selectedPayment && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 3,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Payment Details
                </Typography>
              </Box>
              <IconButton onClick={handleCloseDrawer} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Drawer body */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
              {/* Amount and status hero */}
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

              <Divider sx={{ mb: 3 }} />

              {/* Detail fields */}
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Client
                  </Typography>
                  <Typography fontWeight="medium">{selectedPayment.client.name}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Phone
                  </Typography>
                  <Typography>{selectedPayment.client.phone}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Payment Method
                  </Typography>
                  <Chip
                    size="small"
                    icon={METHOD_LABELS[selectedPayment.method].icon}
                    label={METHOD_LABELS[selectedPayment.method].label}
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Date & Time
                  </Typography>
                  <Typography>
                    {format(new Date(selectedPayment.createdAt), 'MMM d, yyyy')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(selectedPayment.createdAt), 'h:mm a')}
                  </Typography>
                </Grid>

                {selectedPayment.appointment && (
                  <>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Service
                      </Typography>
                      <Typography>{selectedPayment.appointment.service.name}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Technician
                      </Typography>
                      <Typography>{selectedPayment.appointment.technician.name}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Appointment Time
                      </Typography>
                      <Typography>
                        {format(new Date(selectedPayment.appointment.startTime), 'MMM d, yyyy h:mm a')}
                      </Typography>
                    </Grid>
                  </>
                )}

                {selectedPayment.giftCard && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Gift Card Used
                    </Typography>
                    <Typography fontFamily="monospace">{selectedPayment.giftCard.code}</Typography>
                  </Grid>
                )}

                {selectedPayment.stripeId && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Stripe ID
                    </Typography>
                    <Typography fontFamily="monospace" variant="body2">
                      {selectedPayment.stripeId}
                    </Typography>
                  </Grid>
                )}

                {selectedPayment.notes && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Notes
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="body2">{selectedPayment.notes}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>

            {/* Drawer footer with action buttons */}
            <Box
              sx={{
                px: 3,
                py: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                gap: 1,
                justifyContent: 'flex-end',
              }}
            >
              {selectedPayment.status === 'COMPLETED' && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RefundIcon />}
                  onClick={() => handleOpenRefundConfirm(selectedPayment)}
                >
                  Refund
                </Button>
              )}
              <Button variant="outlined" onClick={handleCloseDrawer}>
                Close
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ===== Refund Confirm Dialog ===== */}
      <ConfirmDialog
        open={refundConfirmOpen}
        title="Confirm Refund"
        message={
          refundPayment
            ? `Are you sure you want to refund $${refundPayment.amount.toFixed(2)} to ${refundPayment.client.name}? This action cannot be undone.`
            : ''
        }
        confirmText="Process Refund"
        cancelText="Cancel"
        variant="warning"
        loading={refundLoading}
        onConfirm={handleRefund}
        onCancel={() => {
          setRefundConfirmOpen(false);
          setRefundPayment(null);
        }}
      />

      {/* ===== Add Payment Dialog ===== */}
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
    </Box>
  );
}
