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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  AccessTime,
  AttachMoney,
  Close,
  Download,
  PictureAsPdf,
  DeleteSweep,
  Category,
  Description,
  ToggleOn,
} from '@mui/icons-material';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

const SERVICE_CATEGORIES = {
  HAIRCUT: 'Haircut',
  BEARD: 'Beard',
  SHAVE: 'Shave',
  COLORING: 'Coloring',
  MANICURE: 'Manicure',
  PEDICURE: 'Pedicure',
  GEL: 'Gel',
  ACRYLIC: 'Acrylic',
  NAIL_ART: 'Nail Art',
  ADDON: 'Add-on',
  OTHER: 'Other',
} as const;

type ServiceCategory = keyof typeof SERVICE_CATEGORIES;

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  basePrice: number;
  active: boolean;
  category: ServiceCategory;
}

const categories = Object.keys(SERVICE_CATEGORIES) as ServiceCategory[];

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'OTHER' as ServiceCategory,
    durationMinutes: 30,
    basePrice: 0,
    active: true,
  });

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailService, setDetailService] = useState<Service | null>(null);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'bulkDelete'>('delete');
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      toast.showError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (service: Service) => {
    setDetailService(service);
    setDetailOpen(true);
  };

  const handleEdit = (service?: Service) => {
    const s = service || detailService;
    if (s) {
      setSelectedService(s);
      setFormData({
        name: s.name,
        description: s.description || '',
        category: s.category || 'OTHER',
        durationMinutes: s.durationMinutes,
        basePrice: s.basePrice,
        active: s.active,
      });
      setEditMode(true);
      setDialogOpen(true);
      setDetailOpen(false);
    }
  };

  const handleAddNew = () => {
    setSelectedService(null);
    setEditMode(false);
    setFormData({ name: '', description: '', category: 'OTHER', durationMinutes: 30, basePrice: 0, active: true });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editMode && selectedService ? `/api/services/${selectedService.id}` : '/api/services';
      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to save');
      setDialogOpen(false);
      toast.showSuccess(editMode ? 'Service updated successfully' : 'Service added successfully');
      fetchServices();
    } catch (error) {
      toast.showError('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (service?: Service) => {
    const s = service || detailService;
    if (s) {
      setSelectedService(s);
      setConfirmAction('delete');
      setConfirmOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedService) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/services/${selectedService.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.showSuccess(`${selectedService.name} deleted`);
        setConfirmOpen(false);
        setDetailOpen(false);
        fetchServices();
      } else {
        toast.showError('Failed to delete service');
      }
    } catch (error) {
      toast.showError('Failed to delete service');
    } finally {
      setDeleting(false);
    }
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedIds.size === filteredServices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredServices.map(s => s.id)));
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
        body: JSON.stringify({ ids: Array.from(selectedIds), type: 'services' }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.showSuccess(`Deleted ${data.deletedCount} services`);
        setSelectedIds(new Set());
        setConfirmOpen(false);
        fetchServices();
      }
    } catch (error) {
      toast.showError('Bulk delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    window.open(`/api/export/${format}?type=services`, '_blank');
    toast.showInfo(`Exporting services as ${format.toUpperCase()}...`);
  };

  const filteredServices = services.filter(
    (service) =>
      (selectedCategory === 0 || service.category === categories[selectedCategory - 1]) &&
      (service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const avgDuration = services.length > 0
    ? Math.round(services.reduce((sum, s) => sum + s.durationMinutes, 0) / services.length) : 0;
  const priceRange = services.length > 0
    ? `$${Math.min(...services.map(s => s.basePrice))}-$${Math.max(...services.map(s => s.basePrice))}` : '$0';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>Services</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ButtonGroup variant="outlined" size="small">
            <Button startIcon={<Download />} onClick={() => handleExport('csv')}>CSV</Button>
            <Button startIcon={<PictureAsPdf />} onClick={() => handleExport('pdf')}>PDF</Button>
          </ButtonGroup>
          <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>Add Service</Button>
        </Box>
      </Box>

      {loading ? <CardsSkeleton count={4} /> : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Total Services</Typography><Typography variant="h4">{services.length}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Active Services</Typography><Typography variant="h4">{services.filter(s => s.active).length}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Avg Duration</Typography><Typography variant="h4">{avgDuration} min</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Price Range</Typography><Typography variant="h4">{priceRange}</Typography></CardContent></Card></Grid>
        </Grid>
      )}

      {selectedIds.size > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.50' }}>
          <Typography variant="body2" fontWeight={600}>{selectedIds.size} selected</Typography>
          <Button size="small" color="error" startIcon={<DeleteSweep />} onClick={handleBulkDeleteClick}>Delete Selected</Button>
          <Button size="small" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedCategory} onChange={(_, v) => setSelectedCategory(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="All" />
            {categories.map((cat) => <Tab key={cat} label={SERVICE_CATEGORIES[cat]} />)}
          </Tabs>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField placeholder="Search services..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ width: 300 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
        </Box>

        {loading ? <TableSkeleton rows={8} columns={6} /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedIds.size > 0 && selectedIds.size < filteredServices.length}
                      checked={filteredServices.length > 0 && selectedIds.size === filteredServices.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleRowClick(service)} selected={selectedIds.has(service.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={selectedIds.has(service.id)} onClick={(e) => handleSelectOne(service.id, e)} />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{service.name}</Typography>
                        {service.description && <Typography variant="caption" color="text.secondary">{service.description}</Typography>}
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={SERVICE_CATEGORIES[service.category] || service.category} size="small" /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">{service.durationMinutes} min</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AttachMoney sx={{ fontSize: 16, color: 'success.main' }} />
                        <Typography variant="body2" fontWeight={500}>{service.basePrice}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={service.active ? 'Active' : 'Inactive'} size="small" color={service.active ? 'success' : 'default'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Detail Drawer */}
      <Drawer anchor="right" open={detailOpen} onClose={() => setDetailOpen(false)}>
        <Box sx={{ width: 400, p: 3 }}>
          <Toolbar sx={{ justifyContent: 'space-between', px: 0, mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>Service Details</Typography>
            <IconButton onClick={() => setDetailOpen(false)}><Close /></IconButton>
          </Toolbar>
          {detailService && (
            <>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>{detailService.name}</Typography>
              <Chip label={SERVICE_CATEGORIES[detailService.category]} size="small" sx={{ mb: 2 }} />
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem><Description sx={{ mr: 2, color: 'text.secondary' }} /><ListItemText primary="Description" secondary={detailService.description || 'No description'} /></ListItem>
                <ListItem><AccessTime sx={{ mr: 2, color: 'text.secondary' }} /><ListItemText primary="Duration" secondary={`${detailService.durationMinutes} minutes`} /></ListItem>
                <ListItem><AttachMoney sx={{ mr: 2, color: 'text.secondary' }} /><ListItemText primary="Base Price" secondary={`$${detailService.basePrice}`} /></ListItem>
                <ListItem><Category sx={{ mr: 2, color: 'text.secondary' }} /><ListItemText primary="Category" secondary={SERVICE_CATEGORIES[detailService.category]} /></ListItem>
                <ListItem><ToggleOn sx={{ mr: 2, color: 'text.secondary' }} /><ListItemText primary="Status" secondary={detailService.active ? 'Active' : 'Inactive'} /></ListItem>
              </List>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<Edit />} onClick={() => handleEdit()} fullWidth>Edit</Button>
                <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => handleDeleteClick()} fullWidth>Delete</Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Service' : 'Add New Service'}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Service Name" fullWidth required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <TextField label="Description" fullWidth multiline rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={formData.category} label="Category" onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceCategory })}>
                {categories.map((cat) => <MenuItem key={cat} value={cat}>{SERVICE_CATEGORIES[cat]}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Duration (minutes)" type="number" fullWidth required value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })} />
            <TextField label="Base Price ($)" type="number" fullWidth required value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            <FormControlLabel control={<Switch checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} />} label="Active" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formData.name || !formData.durationMinutes}>
            {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Add Service'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmAction === 'bulkDelete' ? 'Delete Selected Services' : 'Delete Service'}
        message={confirmAction === 'bulkDelete' ? `Delete ${selectedIds.size} selected services?` : `Delete ${selectedService?.name}?`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmAction === 'bulkDelete' ? handleBulkDelete : handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
}
