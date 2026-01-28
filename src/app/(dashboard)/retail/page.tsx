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
  Alert,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  ShoppingCart,
  Inventory,
  Warning,
  TrendingUp,
} from '@mui/icons-material';

interface RetailProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  brand: string | null;
  costPrice: number;
  retailPrice: number;
  quantity: number;
  minQuantity: number;
  imageUrl: string | null;
}

interface RetailSale {
  id: string;
  product: { id: string; name: string; sku: string | null };
  client: { id: string; name: string } | null;
  soldBy: { id: string; name: string } | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export default function RetailPage() {
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [sales, setSales] = useState<RetailSale[]>([]);
  const [salesSummary, setSalesSummary] = useState({ totalSales: 0, totalUnits: 0, salesCount: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RetailProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    costPrice: 0,
    retailPrice: 0,
    quantity: 0,
    minQuantity: 5,
  });
  const [saleData, setSaleData] = useState({
    productId: '',
    quantity: 1,
  });

  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/retail-products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await fetch('/api/retail-sales');
      if (response.ok) {
        const data = await response.json();
        setSales(data.sales || []);
        setSalesSummary(data.summary || { totalSales: 0, totalUnits: 0, salesCount: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    }
  };

  const handleOpenDialog = (product?: RetailProduct) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || '',
        brand: product.brand || '',
        costPrice: product.costPrice,
        retailPrice: product.retailPrice,
        quantity: product.quantity,
        minQuantity: product.minQuantity,
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        category: '',
        brand: '',
        costPrice: 0,
        retailPrice: 0,
        quantity: 0,
        minQuantity: 5,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/retail-products', {
        method: selectedProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedProduct ? { id: selectedProduct.id, ...formData } : formData),
      });

      if (!response.ok) throw new Error('Failed to save');

      setDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSale = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/retail-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to create sale');
        return;
      }

      setSaleDialogOpen(false);
      setSaleData({ productId: '', quantity: 1 });
      fetchProducts();
      fetchSales();
    } catch (error) {
      console.error('Failed to create sale:', error);
    } finally {
      setSaving(false);
    }
  };

  const lowStockProducts = products.filter(p => p.quantity <= p.minQuantity);
  const tabs = ['Products', 'Sales History', 'Low Stock'];

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Retail Products
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ShoppingCart />}
            onClick={() => setSaleDialogOpen(true)}
          >
            New Sale
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Product
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Inventory color="primary" />
                <Typography variant="body2" color="text.secondary">Total Products</Typography>
              </Box>
              <Typography variant="h4">{products.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Warning color="warning" />
                <Typography variant="body2" color="text.secondary">Low Stock</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">{lowStockProducts.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ShoppingCart color="success" />
                <Typography variant="body2" color="text.secondary">Total Sales</Typography>
              </Box>
              <Typography variant="h4">${salesSummary.totalSales.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp color="info" />
                <Typography variant="body2" color="text.secondary">Units Sold</Typography>
              </Box>
              <Typography variant="h4">{salesSummary.totalUnits}</Typography>
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

        {selectedTab === 0 && (
          <>
            <Box sx={{ mb: 2 }}>
              <TextField
                placeholder="Search products..."
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
                      <TableCell>Product</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {product.name}
                            </Typography>
                            {product.brand && (
                              <Typography variant="caption" color="text.secondary">
                                {product.brand}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{product.sku || '-'}</TableCell>
                        <TableCell>
                          {product.category && (
                            <Chip label={product.category} size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="right">${product.costPrice.toFixed(2)}</TableCell>
                        <TableCell align="right">${product.retailPrice.toFixed(2)}</TableCell>
                        <TableCell align="right">
                          <Typography
                            color={product.quantity <= product.minQuantity ? 'error' : 'inherit'}
                            fontWeight={product.quantity <= product.minQuantity ? 600 : 400}
                          >
                            {product.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenDialog(product)}>
                            <Edit />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

        {selectedTab === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Sold By</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{sale.product.name}</TableCell>
                    <TableCell>{sale.client?.name || 'Walk-in'}</TableCell>
                    <TableCell>{sale.soldBy?.name || '-'}</TableCell>
                    <TableCell align="right">{sale.quantity}</TableCell>
                    <TableCell align="right">${sale.totalPrice.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {selectedTab === 2 && (
          <>
            {lowStockProducts.length === 0 ? (
              <Alert severity="success">All products are well stocked!</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Current Stock</TableCell>
                      <TableCell align="right">Min Required</TableCell>
                      <TableCell align="right">Reorder Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockProducts.map((product) => (
                      <TableRow key={product.id} hover>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.sku || '-'}</TableCell>
                        <TableCell align="right">
                          <Typography color="error" fontWeight={600}>
                            {product.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{product.minQuantity}</TableCell>
                        <TableCell align="right">
                          {Math.max(product.minQuantity * 2 - product.quantity, 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Paper>

      {/* Add/Edit Product Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
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
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="SKU"
                  fullWidth
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Barcode"
                  fullWidth
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Category"
                  fullWidth
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Brand"
                  fullWidth
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Cost Price"
                  type="number"
                  fullWidth
                  required
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Retail Price"
                  type="number"
                  fullWidth
                  required
                  value={formData.retailPrice}
                  onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Min Quantity"
                  type="number"
                  fullWidth
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.name}
          >
            {saving ? 'Saving...' : selectedProduct ? 'Save Changes' : 'Add Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Sale Dialog */}
      <Dialog open={saleDialogOpen} onClose={() => setSaleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Sale</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Product</InputLabel>
              <Select
                label="Product"
                value={saleData.productId}
                onChange={(e) => setSaleData({ ...saleData, productId: e.target.value })}
              >
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name} - ${product.retailPrice.toFixed(2)} ({product.quantity} in stock)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={saleData.quantity}
              onChange={(e) => setSaleData({ ...saleData, quantity: parseInt(e.target.value) })}
              inputProps={{ min: 1 }}
            />
            {saleData.productId && (
              <Typography variant="h6">
                Total: ${((products.find(p => p.id === saleData.productId)?.retailPrice || 0) * saleData.quantity).toFixed(2)}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaleDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSale}
            disabled={saving || !saleData.productId}
          >
            {saving ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
