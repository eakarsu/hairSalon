'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Tabs,
  Tab,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddCircle as AddStockIcon,
  RemoveCircle as RemoveStockIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';

type InventoryCategory = 'NAIL_POLISH' | 'GEL' | 'ACRYLIC' | 'TOOLS' | 'SANITIZATION' | 'DISPOSABLES' | 'OTHER';

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: InventoryCategory;
  quantity: number;
  minQuantity: number;
  costPrice: number | null;
  retailPrice: number | null;
  supplier: string | null;
}

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'NAIL_POLISH', label: 'Nail Polish' },
  { value: 'GEL', label: 'Gel' },
  { value: 'ACRYLIC', label: 'Acrylic' },
  { value: 'TOOLS', label: 'Tools' },
  { value: 'SANITIZATION', label: 'Sanitization' },
  { value: 'DISPOSABLES', label: 'Disposables' },
  { value: 'OTHER', label: 'Other' },
];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedTab, setSelectedTab] = useState(0);
  const [filterCategory, setFilterCategory] = useState('');

  // Item Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'OTHER' as InventoryCategory,
    quantity: 0,
    minQuantity: 5,
    costPrice: '',
    retailPrice: '',
    supplier: '',
  });

  // Adjust Dialog
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    fetchItems();
  }, [filterCategory, selectedTab]);

  const fetchItems = async () => {
    try {
      let url = '/api/inventory?';
      if (filterCategory) url += `category=${filterCategory}&`;
      if (selectedTab === 1) url += 'lowStock=true';

      const res = await fetch(url);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        sku: item.sku || '',
        category: item.category,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        costPrice: item.costPrice?.toString() || '',
        retailPrice: item.retailPrice?.toString() || '',
        supplier: item.supplier || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        sku: '',
        category: 'OTHER',
        quantity: 0,
        minQuantity: 5,
        costPrice: '',
        retailPrice: '',
        supplier: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const url = editingItem ? `/api/inventory/${editingItem.id}` : '/api/inventory';
      const method = editingItem ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        retailPrice: formData.retailPrice ? parseFloat(formData.retailPrice) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save');

      setDialogOpen(false);
      fetchItems();
    } catch {
      setError('Failed to save item');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await fetch(`/api/inventory/${itemId}`, { method: 'DELETE' });
      fetchItems();
    } catch {
      setError('Failed to delete item');
    }
  };

  const handleAdjustOpen = (item: InventoryItem, isAdd: boolean) => {
    setAdjustItem(item);
    setAdjustQty(isAdd ? 1 : -1);
    setAdjustReason('');
    setAdjustDialog(true);
  };

  const handleAdjustSubmit = async () => {
    if (!adjustItem) return;

    try {
      const res = await fetch(`/api/inventory/${adjustItem.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityChange: adjustQty,
          reason: adjustReason,
        }),
      });

      if (!res.ok) throw new Error('Failed to adjust');

      setAdjustDialog(false);
      fetchItems();
    } catch {
      setError('Failed to adjust stock');
    }
  };

  const getCategoryLabel = (category: InventoryCategory) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const lowStockCount = items.filter((item) => item.quantity <= item.minQuantity).length;

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
        <Typography variant="h4">Inventory Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Add Item
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
          <Tab label="All Items" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="warning" fontSize="small" />
                Low Stock ({lowStockCount})
              </Box>
            }
          />
        </Tabs>
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Category</InputLabel>
          <Select
            value={filterCategory}
            label="Filter by Category"
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <MenuItem value="">All Categories</MenuItem>
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                {cat.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {items.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No inventory items
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Start tracking your salon supplies
          </Typography>
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            Add First Item
          </Button>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Min Stock</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell align="right">Retail</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  onClick={() => handleOpenDialog(item)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: item.quantity <= item.minQuantity ? 'warning.50' : 'inherit',
                    '&:hover': {
                      bgcolor: item.quantity <= item.minQuantity ? 'warning.100' : undefined,
                    },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.name}
                      {item.quantity <= item.minQuantity && (
                        <Chip size="small" color="warning" label="Low" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{item.sku || '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={getCategoryLabel(item.category)} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      fontWeight="bold"
                      color={item.quantity <= item.minQuantity ? 'warning.main' : 'text.primary'}
                    >
                      {item.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{item.minQuantity}</TableCell>
                  <TableCell align="right">
                    {item.costPrice ? `$${item.costPrice.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {item.retailPrice ? `$${item.retailPrice.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>{item.supplier || '-'}</TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleAdjustOpen(item, true)}
                      title="Add stock"
                    >
                      <AddStockIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleAdjustOpen(item, false)}
                      title="Remove stock"
                    >
                      <RemoveStockIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Item Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Item Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            sx={{ mt: 2, mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              label="Category"
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value as InventoryCategory }))
              }
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingItem && (
            <TextField
              fullWidth
              type="number"
              label="Initial Quantity"
              value={formData.quantity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
              }
              sx={{ mb: 2 }}
            />
          )}

          <TextField
            fullWidth
            type="number"
            label="Minimum Stock Level"
            value={formData.minQuantity}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, minQuantity: parseInt(e.target.value) || 0 }))
            }
            sx={{ mb: 2 }}
            helperText="Alert when stock falls below this level"
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Cost Price"
              value={formData.costPrice}
              onChange={(e) => setFormData((prev) => ({ ...prev, costPrice: e.target.value }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              type="number"
              label="Retail Price"
              value={formData.retailPrice}
              onChange={(e) => setFormData((prev) => ({ ...prev, retailPrice: e.target.value }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Box>

          <TextField
            fullWidth
            label="Supplier"
            value={formData.supplier}
            onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!formData.name}>
            {editingItem ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialog} onClose={() => setAdjustDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {adjustQty > 0 ? 'Add Stock' : 'Remove Stock'} - {adjustItem?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current quantity: {adjustItem?.quantity}
          </Typography>

          <TextField
            fullWidth
            type="number"
            label="Quantity"
            value={Math.abs(adjustQty)}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setAdjustQty(adjustQty > 0 ? val : -val);
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Reason"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder={adjustQty > 0 ? 'e.g., Received shipment' : 'e.g., Used, Damaged'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={adjustQty > 0 ? 'success' : 'error'}
            onClick={handleAdjustSubmit}
          >
            {adjustQty > 0 ? 'Add' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
