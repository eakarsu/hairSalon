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
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  AccessTime,
  AttachMoney,
} from '@mui/icons-material';

// Service categories matching the Prisma enum
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, service: Service) => {
    setAnchorEl(event.currentTarget);
    setSelectedService(service);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedService) {
      setFormData({
        name: selectedService.name,
        description: selectedService.description || '',
        category: selectedService.category || 'OTHER',
        durationMinutes: selectedService.durationMinutes,
        basePrice: selectedService.basePrice,
        active: selectedService.active,
      });
    }
    setEditMode(true);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleAddNew = () => {
    setSelectedService(null);
    setEditMode(false);
    setFormData({
      name: '',
      description: '',
      category: 'OTHER' as ServiceCategory,
      durationMinutes: 30,
      basePrice: 0,
      active: true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editMode && selectedService
        ? `/api/services/${selectedService.id}`
        : '/api/services';

      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save');

      setDialogOpen(false);
      fetchServices();
    } catch (error) {
      console.error('Failed to save service:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredServices = services.filter(
    (service) =>
      (selectedCategory === 0 || service.category === categories[selectedCategory - 1]) &&
      (service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const avgDuration = services.length > 0
    ? Math.round(services.reduce((sum, s) => sum + s.durationMinutes, 0) / services.length)
    : 0;
  const priceRange = services.length > 0
    ? `$${Math.min(...services.map(s => s.basePrice))}-$${Math.max(...services.map(s => s.basePrice))}`
    : '$0';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Services
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
          Add Service
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Services</Typography>
              <Typography variant="h4">{services.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Active Services</Typography>
              <Typography variant="h4">{services.filter(s => s.active).length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Avg Duration</Typography>
              <Typography variant="h4">{avgDuration} min</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Price Range</Typography>
              <Typography variant="h4">{priceRange}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedCategory} onChange={(_, v) => setSelectedCategory(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="All" />
            {categories.map((cat) => (
              <Tab key={cat} label={SERVICE_CATEGORIES[cat]} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Search services..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
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
                  <TableCell>Service</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {service.name}
                        </Typography>
                        {service.description && (
                          <Typography variant="caption" color="text.secondary">
                            {service.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={SERVICE_CATEGORIES[service.category] || service.category} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">{service.durationMinutes} min</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AttachMoney sx={{ fontSize: 16, color: 'success.main' }} />
                        <Typography variant="body2" fontWeight={500}>
                          {service.basePrice}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={service.active ? 'Active' : 'Inactive'}
                        size="small"
                        color={service.active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={(e) => handleMenuOpen(e, service)}>
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <Edit sx={{ mr: 1, fontSize: 20 }} /> Edit
        </MenuItem>
        <MenuItem sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1, fontSize: 20 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Service' : 'Add New Service'}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Service Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {SERVICE_CATEGORIES[cat]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Duration (minutes)"
              type="number"
              fullWidth
              required
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
            />
            <TextField
              label="Base Price ($)"
              type="number"
              fullWidth
              required
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.durationMinutes}
          >
            {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Add Service'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
