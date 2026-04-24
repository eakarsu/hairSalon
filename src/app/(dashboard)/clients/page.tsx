'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Card,
  CardContent,
  Checkbox,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  ButtonGroup,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Send,
  Phone,
  Email,
  Loyalty,
  Close,
  Download,
  PictureAsPdf,
  DeleteSweep,
  Cake,
  Notes,
  Language,
  CheckBox,
  CheckBoxOutlineBlank,
} from '@mui/icons-material';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferredLanguage: string;
  preferredTechName: string | null;
  marketingOptIn: boolean;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalVisits: number;
  lastVisit: string | null;
  birthday: string | null;
  notes: string | null;
}

const languageLabels: Record<string, string> = {
  en: 'English',
  vi: 'Vietnamese',
  es: 'Spanish',
  zh: 'Chinese',
  ko: 'Korean',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    preferredLanguage: 'en',
    birthday: '',
    notes: '',
    marketingOptIn: true,
  });

  // Detail drawer state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'bulkDelete'>('delete');
  const [deleting, setDeleting] = useState(false);

  // Message dialog
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const toast = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast.showError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  // Row click handler - opens detail drawer
  const handleRowClick = (client: Client) => {
    setDetailClient(client);
    setDetailOpen(true);
  };

  const handleEdit = (client?: Client) => {
    const c = client || detailClient;
    if (c) {
      setSelectedClient(c);
      setFormData({
        name: c.name,
        phone: c.phone,
        email: c.email || '',
        preferredLanguage: c.preferredLanguage || 'en',
        birthday: c.birthday ? c.birthday.split('T')[0] : '',
        notes: c.notes || '',
        marketingOptIn: c.marketingOptIn,
      });
      setEditMode(true);
      setDialogOpen(true);
      setDetailOpen(false);
    }
  };

  const handleAddNew = () => {
    setSelectedClient(null);
    setEditMode(false);
    setFormData({ name: '', phone: '', email: '', preferredLanguage: 'en', birthday: '', notes: '', marketingOptIn: true });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editMode && selectedClient ? `/api/clients/${selectedClient.id}` : '/api/clients';
      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }
      setDialogOpen(false);
      toast.showSuccess(editMode ? 'Client updated successfully' : 'Client added successfully');
      fetchClients();
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (client?: Client) => {
    const c = client || detailClient;
    if (c) {
      setSelectedClient(c);
      setConfirmAction('delete');
      setConfirmOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/clients/${selectedClient.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.showSuccess(`${selectedClient.name} deleted successfully`);
        setConfirmOpen(false);
        setDetailOpen(false);
        setSelectedClient(null);
        fetchClients();
      } else {
        const data = await response.json();
        toast.showError(data.error || 'Failed to delete client');
      }
    } catch (error) {
      toast.showError('Failed to delete client');
    } finally {
      setDeleting(false);
    }
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
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
        body: JSON.stringify({ ids: Array.from(selectedIds), type: 'clients' }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.showSuccess(`Deleted ${data.deletedCount} clients`);
        setSelectedIds(new Set());
        setConfirmOpen(false);
        fetchClients();
      } else {
        toast.showError('Failed to delete clients');
      }
    } catch (error) {
      toast.showError('Bulk delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // Send message
  const handleSendMessage = (client: Client) => {
    setSelectedClient(client);
    setMessageText(`Hi ${client.name}, `);
    setMessageDialogOpen(true);
    setDetailOpen(false);
  };

  const handleSendSMS = async () => {
    if (!selectedClient || !messageText) return;
    setSendingMessage(true);
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedClient.phone, message: messageText, type: 'GENERAL' }),
      });
      if (response.ok) {
        toast.showSuccess('Message sent successfully!');
        setMessageDialogOpen(false);
        setMessageText('');
      } else {
        const data = await response.json();
        toast.showError(data.error || 'Failed to send message');
      }
    } catch (error) {
      toast.showError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Export
  const handleExport = (format: 'csv' | 'pdf') => {
    const url = format === 'csv' ? '/api/export/csv?type=clients' : '/api/export/pdf?type=clients';
    window.open(url, '_blank');
    toast.showInfo(`Exporting clients as ${format.toUpperCase()}...`);
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const tierColors: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
    BRONZE: 'default',
    SILVER: 'info',
    GOLD: 'warning',
    PLATINUM: 'success',
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>Clients</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ButtonGroup variant="outlined" size="small">
            <Button startIcon={<Download />} onClick={() => handleExport('csv')}>CSV</Button>
            <Button startIcon={<PictureAsPdf />} onClick={() => handleExport('pdf')}>PDF</Button>
          </ButtonGroup>
          <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>Add Client</Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {loading ? (
        <CardsSkeleton count={4} />
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary">Total Clients</Typography>
              <Typography variant="h4">{clients.length}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary">Active (30 days)</Typography>
              <Typography variant="h4">{clients.filter(c => c.totalVisits > 0).length}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary">Loyalty Members</Typography>
              <Typography variant="h4">{clients.filter(c => c.loyaltyPoints > 0).length}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary">Marketing Opt-In</Typography>
              <Typography variant="h4">{clients.filter(c => c.marketingOptIn).length}</Typography>
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.50' }}>
          <Typography variant="body2" fontWeight={600}>{selectedIds.size} selected</Typography>
          <Button size="small" color="error" startIcon={<DeleteSweep />} onClick={handleBulkDeleteClick}>
            Delete Selected
          </Button>
          <Button size="small" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Search clients by name, phone, or email..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 400 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
            }}
          />
        </Box>

        {loading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : clients.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No clients found. Add your first client!</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedIds.size > 0 && selectedIds.size < filteredClients.length}
                        checked={filteredClients.length > 0 && selectedIds.size === filteredClients.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Language</TableCell>
                    <TableCell>Preferred Tech</TableCell>
                    <TableCell>Loyalty</TableCell>
                    <TableCell>Visits</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredClients
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((client) => (
                      <TableRow
                        key={client.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleRowClick(client)}
                        selected={selectedIds.has(client.id)}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedIds.has(client.id)}
                            onClick={(e) => handleSelectOne(client.id, e)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>{client.name.charAt(0)}</Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{client.name}</Typography>
                              {client.marketingOptIn && (
                                <Chip label="Marketing" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2">{client.phone}</Typography>
                            </Box>
                            {client.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">{client.email}</Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={languageLabels[client.preferredLanguage] || client.preferredLanguage} size="small" />
                        </TableCell>
                        <TableCell>
                          {client.preferredTechName || <Typography variant="body2" color="text.secondary">None</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip icon={<Loyalty sx={{ fontSize: 14 }} />} label={`${client.loyaltyPoints} pts`} size="small" color={tierColors[client.loyaltyTier]} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{client.totalVisits}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredClients.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            />
          </>
        )}
      </Paper>

      {/* Detail Drawer */}
      <Drawer anchor="right" open={detailOpen} onClose={() => setDetailOpen(false)}>
        <Box sx={{ width: 420, p: 3 }}>
          <Toolbar sx={{ justifyContent: 'space-between', px: 0, mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>Client Details</Typography>
            <IconButton onClick={() => setDetailOpen(false)}><Close /></IconButton>
          </Toolbar>
          {detailClient && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, fontSize: 28 }}>
                  {detailClient.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{detailClient.name}</Typography>
                  <Chip
                    label={detailClient.loyaltyTier || 'No Tier'}
                    size="small"
                    color={tierColors[detailClient.loyaltyTier] || 'default'}
                  />
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem>
                  <Phone sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Phone" secondary={detailClient.phone} />
                </ListItem>
                <ListItem>
                  <Email sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Email" secondary={detailClient.email || 'Not provided'} />
                </ListItem>
                <ListItem>
                  <Language sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Language" secondary={languageLabels[detailClient.preferredLanguage] || detailClient.preferredLanguage} />
                </ListItem>
                <ListItem>
                  <Loyalty sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Loyalty Points" secondary={`${detailClient.loyaltyPoints} pts`} />
                </ListItem>
                <ListItem>
                  <Cake sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Birthday" secondary={detailClient.birthday ? new Date(detailClient.birthday).toLocaleDateString() : 'Not set'} />
                </ListItem>
                <ListItem>
                  <Notes sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Notes" secondary={detailClient.notes || 'No notes'} />
                </ListItem>
              </List>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Visits: {detailClient.totalVisits} | Last Visit: {detailClient.lastVisit ? new Date(detailClient.lastVisit).toLocaleDateString() : 'Never'}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<Edit />} onClick={() => handleEdit()} fullWidth>
                  Edit
                </Button>
                <Button variant="outlined" startIcon={<Send />} onClick={() => handleSendMessage(detailClient)} fullWidth>
                  Message
                </Button>
                <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => handleDeleteClick()} fullWidth>
                  Delete
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Full Name" fullWidth required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <TextField label="Phone" fullWidth required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <TextField label="Email" fullWidth type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Preferred Language</InputLabel>
              <Select label="Preferred Language" value={formData.preferredLanguage} onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="vi">Vietnamese</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="zh">Chinese</MenuItem>
                <MenuItem value="ko">Korean</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Birthday" type="date" fullWidth InputLabelProps={{ shrink: true }} value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })} />
            <TextField label="Notes" multiline rows={2} fullWidth value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            <FormControlLabel
              control={<Switch checked={formData.marketingOptIn} onChange={(e) => setFormData({ ...formData, marketingOptIn: e.target.checked })} />}
              label="Marketing Opt-In"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formData.name || !formData.phone}>
            {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Add Client'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Message to {selectedClient?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Phone: {selectedClient?.phone}</Typography>
            <TextField label="Message" multiline rows={4} fullWidth value={messageText} onChange={(e) => setMessageText(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<Send />} onClick={handleSendSMS} disabled={sendingMessage || !messageText.trim()}>
            {sendingMessage ? 'Sending...' : 'Send SMS'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmAction === 'bulkDelete' ? 'Delete Selected Clients' : 'Delete Client'}
        message={
          confirmAction === 'bulkDelete'
            ? `Are you sure you want to delete ${selectedIds.size} selected clients? This action cannot be undone.`
            : `Are you sure you want to delete ${selectedClient?.name}? This action cannot be undone.`
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
