'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
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
  CircularProgress,
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
} from '@mui/material';
import {
  Add as AddIcon,
  CardGiftcard as GiftCardIcon,
  Search as SearchIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

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

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    initialValue: '',
    purchasedBy: '',
    recipientId: '',
    expiresAt: '',
  });

  // Detail dialog
  const [detailDialog, setDetailDialog] = useState(false);
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

  useEffect(() => {
    fetchGiftCards();
    fetchClients();
  }, [filterStatus, searchCode]);

  const fetchGiftCards = async () => {
    try {
      let url = '/api/gift-cards?';
      if (filterStatus) url += `status=${filterStatus}&`;
      if (searchCode) url += `code=${searchCode}`;

      const res = await fetch(url);
      const data = await res.json();
      setGiftCards(data.giftCards || []);
    } catch {
      setError('Failed to load gift cards');
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
      fetchGiftCards();
    } catch {
      setError('Failed to create gift card');
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
  };

  const handleRowClick = (gc: GiftCard) => {
    setSelectedCard(gc);
    setDetailDialog(true);
  };

  const handleStatusChange = async (id: string, status: GiftCardStatus) => {
    try {
      await fetch(`/api/gift-cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchGiftCards();
    } catch {
      setError('Failed to update status');
    }
  };

  // Summary stats
  const totalActive = giftCards.filter((gc) => gc.status === 'ACTIVE').length;
  const totalBalance = giftCards
    .filter((gc) => gc.status === 'ACTIVE')
    .reduce((sum, gc) => sum + gc.balance, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gift Cards</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Cards
              </Typography>
              <Typography variant="h4">{totalActive}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Outstanding Balance
              </Typography>
              <Typography variant="h4">${totalBalance.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

      {/* Gift Cards Table */}
      {giftCards.length === 0 ? (
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
                >
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

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gift Card Details</DialogTitle>
        <DialogContent>
          {selectedCard && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" fontFamily="monospace" fontWeight="bold" sx={{ mb: 1 }}>
                  {selectedCard.code}
                </Typography>
                <Chip
                  label={selectedCard.status}
                  color={STATUS_COLORS[selectedCard.status]}
                  sx={{ mb: 2 }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Initial Value</Typography>
                  <Typography variant="h6">${selectedCard.initialValue.toFixed(2)}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Current Balance</Typography>
                  <Typography variant="h6" color={selectedCard.balance > 0 ? 'success.main' : 'text.secondary'}>
                    ${selectedCard.balance.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Purchased By</Typography>
                  <Typography>{selectedCard.purchasedBy || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Recipient</Typography>
                  <Typography>{selectedCard.recipient?.name || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Created</Typography>
                  <Typography>{format(new Date(selectedCard.createdAt), 'MMM d, yyyy')}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Expires</Typography>
                  <Typography>
                    {selectedCard.expiresAt ? format(new Date(selectedCard.expiresAt), 'MMM d, yyyy') : 'Never'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedCard?.status === 'ACTIVE' && (
            <Button
              color="error"
              onClick={() => {
                handleStatusChange(selectedCard.id, 'CANCELLED');
                setDetailDialog(false);
              }}
            >
              Cancel Card
            </Button>
          )}
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
