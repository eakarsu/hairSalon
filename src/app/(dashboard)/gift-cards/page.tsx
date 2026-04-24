'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  ButtonGroup,
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
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  Autocomplete,
  Drawer,
  Toolbar,
  Divider,
  Checkbox,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  CardGiftcard as GiftCardIcon,
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  AccountBalanceWallet as BalanceIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

type GiftCardStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface GiftCard {
  id: string;
  code: string;
  initialValue: number;
  balance: number;
  purchasedBy: string | null;
  status: GiftCardStatus;
  expiresAt: string | null;
  createdAt: string;
  recipient: Client | null;
}

const STATUS_COLORS: Record<GiftCardStatus, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  USED: 'default',
  EXPIRED: 'warning',
  CANCELLED: 'error',
};

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [searchCode, setSearchCode] = useState('');

  // Create dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    initialValue: '',
    purchasedBy: '',
    recipientId: '',
    expiresAt: '',
  });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    status: '' as GiftCardStatus | '',
    recipientId: '',
    purchasedBy: '',
  });

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);

  // Lookup dialog
  const [lookupDialog, setLookupDialog] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<{
    balance: number;
    status: string;
    expiresAt: string | null;
  } | null>(null);
  const [lookupError, setLookupError] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'bulkDelete'>('delete');
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  useEffect(() => {
    fetchGiftCards();
    fetchClients();
  }, [filterStatus, searchCode]);

  const fetchGiftCards = async () => {
    try {
      setLoading(true);
      let url = '/api/gift-cards?';
      if (filterStatus) url += `status=${filterStatus}&`;
      if (searchCode) url += `code=${searchCode}`;

      const res = await fetch(url);
      const data = await res.json();
      setGiftCards(data.giftCards || []);
    } catch {
      setError('Failed to load gift cards');
      toast.showError('Failed to load gift cards');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      console.error('Failed to fetch clients');
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialValue: parseFloat(formData.initialValue),
          purchasedBy: formData.purchasedBy || null,
          recipientId: formData.recipientId || null,
          expiresAt: formData.expiresAt || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to create');

      setDialogOpen(false);
      setFormData({ initialValue: '', purchasedBy: '', recipientId: '', expiresAt: '' });
      toast.showSuccess('Gift card created successfully');
      fetchGiftCards();
    } catch {
      toast.showError('Failed to create gift card');
    }
  };

  const handleLookup = async () => {
    setLookupError('');
    setLookupResult(null);

    try {
      const res = await fetch(`/api/gift-cards/lookup?code=${encodeURIComponent(lookupCode)}`);
      const data = await res.json();

      if (!res.ok) {
        setLookupError(data.error || 'Gift card not found');
        return;
      }

      setLookupResult(data.giftCard);
    } catch {
      setLookupError('Lookup failed');
    }
  };

  const handleCopyCode = (code: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.showInfo('Code copied to clipboard');
  };

  const handleRowClick = (gc: GiftCard) => {
    setSelectedCard(gc);
    setDetailOpen(true);
  };

  const handleStatusChange = async (id: string, status: GiftCardStatus) => {
    try {
      const res = await fetch(`/api/gift-cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.showSuccess(`Gift card ${status.toLowerCase()} successfully`);
        fetchGiftCards();
        if (selectedCard?.id === id) {
          setSelectedCard((prev) => prev ? { ...prev, status } : null);
        }
      } else {
        toast.showError('Failed to update status');
      }
    } catch {
      toast.showError('Failed to update status');
    }
  };

  // Edit gift card
  const handleEditClick = () => {
    if (!selectedCard) return;
    setEditFormData({
      status: selectedCard.status,
      recipientId: selectedCard.recipient?.id || '',
      purchasedBy: selectedCard.purchasedBy || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedCard) return;
    try {
      const res = await fetch(`/api/gift-cards/${selectedCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editFormData.status && { status: editFormData.status }),
          ...(editFormData.recipientId !== undefined && { recipientId: editFormData.recipientId || null }),
        }),
      });
      if (res.ok) {
        toast.showSuccess('Gift card updated successfully');
        setEditDialogOpen(false);
        setDetailOpen(false);
        setSelectedCard(null);
        fetchGiftCards();
      } else {
        const data = await res.json();
        toast.showError(data.error || 'Failed to update gift card');
      }
    } catch {
      toast.showError('Failed to update gift card');
    }
  };

  // Single delete
  const handleDeleteClick = () => {
    setConfirmAction('delete');
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCard) return;
    setDeleting(true);
    try {
      const response = await fetch('/api/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [selectedCard.id], type: 'gift-cards' }),
      });
      if (response.ok) {
        toast.showSuccess('Gift card deleted successfully');
        setConfirmOpen(false);
        setDetailOpen(false);
        setSelectedCard(null);
        fetchGiftCards();
      } else {
        toast.showError('Failed to delete gift card');
      }
    } catch {
      toast.showError('Failed to delete gift card');
    } finally {
      setDeleting(false);
    }
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedIds.size === giftCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(giftCards.map((gc) => gc.id)));
    }
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDeleteClick = () => {
    setConfirmAction('bulkDelete');
    setConfirmOpen(true);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), type: 'gift-cards' }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.showSuccess(`Deleted ${data.deletedCount} gift cards`);
        setSelectedIds(new Set());
        setConfirmOpen(false);
        fetchGiftCards();
      } else {
        toast.showError('Failed to delete gift cards');
      }
    } catch {
      toast.showError('Bulk delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // Export
  const handleExport = (format: 'csv' | 'pdf') => {
    const url = format === 'csv' ? '/api/export/csv?type=gift-cards' : '/api/export/pdf?type=gift-cards';
    window.open(url, '_blank');
    toast.showInfo(`Exporting gift cards as ${format.toUpperCase()}...`);
  };

  // Summary stats
  const totalActive = giftCards.filter((gc) => gc.status === 'ACTIVE').length;
  const totalBalance = giftCards
    .filter((gc) => gc.status === 'ACTIVE')
    .reduce((sum, gc) => sum + gc.balance, 0);
  const totalIssued = giftCards.reduce((sum, gc) => sum + gc.initialValue, 0);
  const totalUsed = giftCards.filter((gc) => gc.status === 'USED').length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>Gift Cards</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ButtonGroup variant="outlined" size="small">
            <Button startIcon={<DownloadIcon />} onClick={() => handleExport('csv')}>CSV</Button>
            <Button startIcon={<PdfIcon />} onClick={() => handleExport('pdf')}>PDF</Button>
          </ButtonGroup>
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={() => setLookupDialog(true)}
          >
            Check Balance
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Create Gift Card
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      {loading ? (
        <CardsSkeleton count={4} />
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Active Cards
                </Typography>
                <Typography variant="h4">{totalActive}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Outstanding Balance
                </Typography>
                <Typography variant="h4">${totalBalance.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Issued Value
                </Typography>
                <Typography variant="h4">${totalIssued.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Fully Used
                </Typography>
                <Typography variant="h4">{totalUsed}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="USED">Used</MenuItem>
            <MenuItem value="EXPIRED">Expired</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Search by code..."
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.50' }}>
          <Typography variant="body2" fontWeight={600}>{selectedIds.size} selected</Typography>
          <Button size="small" color="error" startIcon={<DeleteSweepIcon />} onClick={handleBulkDeleteClick}>
            Delete Selected
          </Button>
          <Button size="small" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
        </Paper>
      )}

      {/* Gift Cards Table */}
      {loading ? (
        <TableSkeleton rows={8} columns={9} />
      ) : giftCards.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <GiftCardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No gift cards found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Create gift cards for your clients
          </Typography>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Create First Gift Card
          </Button>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.size > 0 && selectedIds.size < giftCards.length}
                    checked={giftCards.length > 0 && selectedIds.size === giftCards.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Initial Value</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell>Purchased By</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {giftCards.map((gc) => (
                <TableRow
                  key={gc.id}
                  hover
                  onClick={() => handleRowClick(gc)}
                  sx={{ cursor: 'pointer' }}
                  selected={selectedIds.has(gc.id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.has(gc.id)}
                      onClick={(e) => handleSelectOne(gc.id, e)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontFamily="monospace" fontWeight="bold">
                        {gc.code}
                      </Typography>
                      <IconButton size="small" onClick={(e) => handleCopyCode(gc.code, e)}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={gc.status}
                      color={STATUS_COLORS[gc.status]}
                    />
                  </TableCell>
                  <TableCell align="right">${gc.initialValue.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold" color={gc.balance > 0 ? 'success.main' : 'text.secondary'}>
                      ${gc.balance.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>{gc.purchasedBy || '-'}</TableCell>
                  <TableCell>{gc.recipient?.name || '-'}</TableCell>
                  <TableCell>
                    {gc.expiresAt ? format(new Date(gc.expiresAt), 'MMM d, yyyy') : 'Never'}
                  </TableCell>
                  <TableCell>{format(new Date(gc.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    {gc.status === 'ACTIVE' && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleStatusChange(gc.id, 'CANCELLED')}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail Drawer */}
      <Drawer anchor="right" open={detailOpen} onClose={() => setDetailOpen(false)}>
        <Box sx={{ width: 420, p: 3 }}>
          <Toolbar sx={{ justifyContent: 'space-between', px: 0, mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>Gift Card Details</Typography>
            <IconButton onClick={() => setDetailOpen(false)}><CloseIcon /></IconButton>
          </Toolbar>
          {selectedCard && (
            <>
              {/* Card code and status */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <GiftCardIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h5" fontFamily="monospace" fontWeight="bold" sx={{ mb: 1 }}>
                  {selectedCard.code}
                </Typography>
                <IconButton size="small" onClick={(e) => handleCopyCode(selectedCard.code, e)} sx={{ mb: 1 }}>
                  <CopyIcon fontSize="small" />
                </IconButton>
                <Box>
                  <Chip
                    label={selectedCard.status}
                    color={STATUS_COLORS[selectedCard.status]}
                    sx={{ mb: 2 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Balance info */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="body2" color="text.secondary">Initial Value</Typography>
                      <Typography variant="h6">${selectedCard.initialValue.toFixed(2)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="body2" color="text.secondary">Current Balance</Typography>
                      <Typography variant="h6" color={selectedCard.balance > 0 ? 'success.main' : 'text.secondary'}>
                        ${selectedCard.balance.toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* Details list */}
              <List dense>
                <ListItem>
                  <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Purchased By" secondary={selectedCard.purchasedBy || 'Not specified'} />
                </ListItem>
                <ListItem>
                  <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Recipient" secondary={selectedCard.recipient?.name || 'Not assigned'} />
                </ListItem>
                <ListItem>
                  <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Expires"
                    secondary={selectedCard.expiresAt ? format(new Date(selectedCard.expiresAt), 'MMM d, yyyy') : 'Never'}
                  />
                </ListItem>
                <ListItem>
                  <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Created"
                    secondary={format(new Date(selectedCard.createdAt), 'MMM d, yyyy')}
                  />
                </ListItem>
                <ListItem>
                  <TagIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Used Amount"
                    secondary={`$${(selectedCard.initialValue - selectedCard.balance).toFixed(2)}`}
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleEditClick}
                  fullWidth
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteClick}
                  fullWidth
                >
                  Delete
                </Button>
              </Box>

              {selectedCard.status === 'ACTIVE' && (
                <Button
                  fullWidth
                  color="warning"
                  variant="outlined"
                  sx={{ mt: 1 }}
                  onClick={() => {
                    handleStatusChange(selectedCard.id, 'CANCELLED');
                    setDetailOpen(false);
                  }}
                >
                  Cancel Card
                </Button>
              )}
            </>
          )}
        </Box>
      </Drawer>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Gift Card</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            required
            type="number"
            label="Amount"
            value={formData.initialValue}
            onChange={(e) => setFormData((prev) => ({ ...prev, initialValue: e.target.value }))}
            sx={{ mt: 2, mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />

          <TextField
            fullWidth
            label="Purchased By"
            value={formData.purchasedBy}
            onChange={(e) => setFormData((prev) => ({ ...prev, purchasedBy: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="Name of purchaser"
          />

          <Autocomplete
            options={clients}
            getOptionLabel={(option) => `${option.name} (${option.phone})`}
            onChange={(_, value) =>
              setFormData((prev) => ({ ...prev, recipientId: value?.id || '' }))
            }
            renderInput={(params) => (
              <TextField {...params} label="Recipient (Optional)" sx={{ mb: 2 }} />
            )}
          />

          <TextField
            fullWidth
            type="date"
            label="Expiration Date (Optional)"
            value={formData.expiresAt}
            onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!formData.initialValue || parseFloat(formData.initialValue) <= 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Gift Card</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editFormData.status}
                label="Status"
                onChange={(e) => setEditFormData((prev) => ({ ...prev, status: e.target.value as GiftCardStatus }))}
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="USED">Used</MenuItem>
                <MenuItem value="EXPIRED">Expired</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              options={clients}
              getOptionLabel={(option) => `${option.name} (${option.phone})`}
              value={clients.find((c) => c.id === editFormData.recipientId) || null}
              onChange={(_, value) =>
                setEditFormData((prev) => ({ ...prev, recipientId: value?.id || '' }))
              }
              renderInput={(params) => (
                <TextField {...params} label="Recipient" />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lookup Dialog */}
      <Dialog open={lookupDialog} onClose={() => setLookupDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Check Gift Card Balance</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Gift Card Code"
            value={lookupCode}
            onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
            sx={{ mt: 2, mb: 2 }}
            placeholder="XXXX-XXXX-XXXX-XXXX"
          />

          {lookupError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {lookupError}
            </Alert>
          )}

          {lookupResult && (
            <Card sx={{ bgcolor: 'success.50' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  Available Balance
                </Typography>
                <Typography variant="h3" color="success.main" sx={{ my: 1 }}>
                  ${lookupResult.balance.toFixed(2)}
                </Typography>
                <Chip
                  label={lookupResult.status}
                  color={STATUS_COLORS[lookupResult.status as GiftCardStatus] || 'default'}
                />
                {lookupResult.expiresAt && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Expires: {format(new Date(lookupResult.expiresAt), 'MMM d, yyyy')}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLookupDialog(false)}>Close</Button>
          <Button variant="contained" onClick={handleLookup} disabled={!lookupCode}>
            Check
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmAction === 'bulkDelete' ? 'Delete Selected Gift Cards' : 'Delete Gift Card'}
        message={
          confirmAction === 'bulkDelete'
            ? `Are you sure you want to delete ${selectedIds.size} selected gift cards? This action cannot be undone.`
            : `Are you sure you want to delete gift card ${selectedCard?.code}? This action cannot be undone.`
        }
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmAction === 'bulkDelete' ? handleBulkDelete : handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
}
