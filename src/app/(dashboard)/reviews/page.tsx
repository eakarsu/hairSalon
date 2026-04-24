'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Rating,
  Avatar,
  IconButton,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Drawer,
  Divider,
  Checkbox,
} from '@mui/material';
import {
  Star,
  Reply,
  FilterList,
  Google,
  ThumbUp,
  ThumbDown,
  TrendingUp,
  Close,
  Delete,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { CardsSkeleton } from '@/components/LoadingSkeleton';

interface Review {
  id: string;
  platform: string;
  rating: number;
  content?: string;
  response?: string;
  respondedAt?: string;
  reviewDate: string;
  client?: {
    id: string;
    name: string;
  };
  appointment?: {
    id: string;
    startTime: string;
    service: { name: string };
    technician: { name: string };
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
}

export default function ReviewsPage() {
  const { showSuccess, showError } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterResponded, setFilterResponded] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // Detail Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerReview, setDrawerReview] = useState<Review | null>(null);

  // Confirm Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [filterPlatform, filterRating, filterResponded]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPlatform) params.append('platform', filterPlatform);
      if (filterRating) params.append('rating', filterRating);
      if (filterResponded) params.append('responded', filterResponded);

      const response = await fetch(`/api/reviews?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setReviews(data.reviews || []);
        setStats(data.stats || null);
      } else {
        showError('Failed to fetch reviews');
      }
    } catch (error) {
      showError('Error fetching reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedReview || !responseText.trim()) return;

    try {
      const response = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReview.id,
          response: responseText,
        }),
      });

      if (response.ok) {
        showSuccess('Response submitted successfully');
        fetchReviews();
        setSelectedReview(null);
        setResponseText('');
        // Update the drawer review if it's the same one
        if (drawerReview && drawerReview.id === selectedReview.id) {
          setDrawerReview({ ...drawerReview, response: responseText, respondedAt: new Date().toISOString() });
        }
      } else {
        showError('Failed to submit response');
      }
    } catch (error) {
      showError('Error responding to review. Please try again.');
    }
  };

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;
    setConfirmLoading(true);
    try {
      const response = await fetch(`/api/reviews?id=${reviewToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess('Review deleted successfully');
        fetchReviews();
        // Close the drawer if the deleted review is currently shown
        if (drawerReview && drawerReview.id === reviewToDelete) {
          setDrawerOpen(false);
          setDrawerReview(null);
        }
        // Remove from selection
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(reviewToDelete);
          return next;
        });
      } else {
        showError('Failed to delete review');
      }
    } catch (error) {
      showError('Error deleting review. Please try again.');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setReviewToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteLoading(true);
    try {
      const response = await fetch('/api/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), type: 'reviews' }),
      });

      if (response.ok) {
        showSuccess(`${selectedIds.size} review(s) deleted successfully`);
        setSelectedIds(new Set());
        // Close drawer if the currently viewed review was bulk-deleted
        if (drawerReview && selectedIds.has(drawerReview.id)) {
          setDrawerOpen(false);
          setDrawerReview(null);
        }
        fetchReviews();
      } else {
        showError('Failed to delete selected reviews');
      }
    } catch (error) {
      showError('Error deleting reviews. Please try again.');
    } finally {
      setBulkDeleteLoading(false);
      setBulkConfirmOpen(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCardClick = (review: Review) => {
    setDrawerReview(review);
    setDrawerOpen(true);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'GOOGLE':
        return <Google />;
      default:
        return <Star />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'GOOGLE':
        return '#4285f4';
      case 'YELP':
        return '#d32323';
      case 'FACEBOOK':
        return '#1877f2';
      default:
        return '#e91e63';
    }
  };

  const positiveReviews = reviews.filter((r) => r.rating >= 4).length;
  const negativeReviews = reviews.filter((r) => r.rating <= 2).length;
  const needsResponse = reviews.filter((r) => !r.response).length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Client Reviews
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Star sx={{ color: '#ffc107' }} />
                  <Typography variant="h4" fontWeight="bold">
                    {stats.averageRating.toFixed(1)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Average Rating
                </Typography>
                <Rating value={stats.averageRating} precision={0.1} readOnly size="small" />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {stats.totalReviews}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Reviews
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ThumbUp sx={{ color: 'success.main' }} />
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {positiveReviews}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Positive (4-5 stars)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Reply sx={{ color: 'warning.main' }} />
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {needsResponse}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Needs Response
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Platform</InputLabel>
              <Select
                value={filterPlatform}
                label="Platform"
                onChange={(e) => setFilterPlatform(e.target.value)}
              >
                <MenuItem value="">All Platforms</MenuItem>
                <MenuItem value="GOOGLE">Google</MenuItem>
                <MenuItem value="YELP">Yelp</MenuItem>
                <MenuItem value="INTERNAL">Internal</MenuItem>
                <MenuItem value="FACEBOOK">Facebook</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Rating</InputLabel>
              <Select
                value={filterRating}
                label="Rating"
                onChange={(e) => setFilterRating(e.target.value)}
              >
                <MenuItem value="">All Ratings</MenuItem>
                <MenuItem value="5">5 Stars</MenuItem>
                <MenuItem value="4">4 Stars</MenuItem>
                <MenuItem value="3">3 Stars</MenuItem>
                <MenuItem value="2">2 Stars</MenuItem>
                <MenuItem value="1">1 Star</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Response</InputLabel>
              <Select
                value={filterResponded}
                label="Response"
                onChange={(e) => setFilterResponded(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="false">Needs Response</MenuItem>
                <MenuItem value="true">Responded</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setFilterPlatform('');
                setFilterRating('');
                setFilterResponded('');
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
          }}
        >
          <Typography variant="body1" fontWeight="medium">
            {selectedIds.size} review(s) selected
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={() => setBulkConfirmOpen(true)}
            >
              Delete Selected
            </Button>
          </Box>
        </Paper>
      )}

      {/* Reviews List */}
      {loading ? (
        <CardsSkeleton count={4} />
      ) : reviews.length === 0 ? (
        <Alert severity="info">No reviews found matching your filters.</Alert>
      ) : (
        <Grid container spacing={2}>
          {reviews.map((review) => (
            <Grid size={{ xs: 12 }} key={review.id}>
              <Paper
                sx={{
                  p: 3,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 4 },
                  border: selectedIds.has(review.id) ? '2px solid' : 'none',
                  borderColor: selectedIds.has(review.id) ? 'primary.main' : 'transparent',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Checkbox
                      checked={selectedIds.has(review.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(review.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                    />
                    <Avatar
                      sx={{ bgcolor: getPlatformColor(review.platform), cursor: 'pointer' }}
                      onClick={() => handleCardClick(review)}
                    >
                      {review.client?.name?.charAt(0) || 'C'}
                    </Avatar>
                    <Box
                      onClick={() => handleCardClick(review)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <Typography variant="subtitle1" fontWeight="medium">
                        {review.client?.name || 'Anonymous'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating value={review.rating} readOnly size="small" />
                        <Chip
                          icon={getPlatformIcon(review.platform)}
                          label={review.platform}
                          size="small"
                          sx={{ bgcolor: `${getPlatformColor(review.platform)}20` }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Box
                    sx={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => handleCardClick(review)}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(review.reviewDate), 'MMM d, yyyy')}
                    </Typography>
                    {!review.response && (
                      <Chip
                        label="Needs Response"
                        size="small"
                        color="warning"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                </Box>

                <Box onClick={() => handleCardClick(review)} sx={{ cursor: 'pointer' }}>
                  {review.content && (
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      &ldquo;{review.content}&rdquo;
                    </Typography>
                  )}

                  {review.appointment && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Service: {review.appointment.service.name} with{' '}
                      {review.appointment.technician.name}
                    </Typography>
                  )}
                </Box>

                {review.response ? (
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Your Response:
                    </Typography>
                    <Typography variant="body2">{review.response}</Typography>
                    {review.respondedAt && (
                      <Typography variant="caption" color="text.secondary">
                        Responded on {format(new Date(review.respondedAt), 'MMM d, yyyy')}
                      </Typography>
                    )}
                  </Paper>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Reply />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReview(review);
                      setResponseText('');
                    }}
                  >
                    Write Response
                  </Button>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Response Dialog */}
      <Dialog
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Respond to Review</DialogTitle>
        <DialogContent>
          {selectedReview && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Original Review:
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Rating value={selectedReview.rating} readOnly size="small" />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {selectedReview.content || 'No comment provided'}
                  </Typography>
                </Paper>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Your Response"
                placeholder="Thank the customer and address any concerns..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedReview(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRespond}
            disabled={!responseText.trim()}
          >
            Submit Response
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerReview(null);
        }}
        PaperProps={{ sx: { width: 420, maxWidth: '100vw' } }}
      >
        {drawerReview && (
          <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Review Details
              </Typography>
              <IconButton
                onClick={() => {
                  setDrawerOpen(false);
                  setDrawerReview(null);
                }}
              >
                <Close />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Client Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar
                sx={{
                  bgcolor: getPlatformColor(drawerReview.platform),
                  width: 56,
                  height: 56,
                  fontSize: 24,
                }}
              >
                {drawerReview.client?.name?.charAt(0) || 'C'}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="medium">
                  {drawerReview.client?.name || 'Anonymous'}
                </Typography>
                <Chip
                  icon={getPlatformIcon(drawerReview.platform)}
                  label={drawerReview.platform}
                  size="small"
                  sx={{
                    bgcolor: `${getPlatformColor(drawerReview.platform)}20`,
                    color: getPlatformColor(drawerReview.platform),
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>

            {/* Rating */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Rating
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Rating value={drawerReview.rating} readOnly />
                <Typography variant="body1" fontWeight="bold">
                  {drawerReview.rating}/5
                </Typography>
              </Box>
            </Box>

            {/* Review Content */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Review
              </Typography>
              <Typography variant="body1">
                {drawerReview.content ? `"${drawerReview.content}"` : 'No comment provided'}
              </Typography>
            </Box>

            {/* Service & Technician */}
            {drawerReview.appointment && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Service
                </Typography>
                <Typography variant="body1">
                  {drawerReview.appointment.service.name}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                  Technician
                </Typography>
                <Typography variant="body1">
                  {drawerReview.appointment.technician.name}
                </Typography>
              </Box>
            )}

            {/* Response */}
            {drawerReview.response && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Your Response
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">{drawerReview.response}</Typography>
                  {drawerReview.respondedAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Responded on {format(new Date(drawerReview.respondedAt), 'MMM d, yyyy')}
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}

            {/* Review Date */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Review Date
              </Typography>
              <Typography variant="body1">
                {format(new Date(drawerReview.reviewDate), 'MMMM d, yyyy')}
              </Typography>
            </Box>

            {/* Drawer Actions */}
            <Box sx={{ mt: 'auto', display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                fullWidth
                onClick={() => {
                  setReviewToDelete(drawerReview.id);
                  setConfirmOpen(true);
                }}
              >
                Delete
              </Button>
              {!drawerReview.response && (
                <Button
                  variant="contained"
                  startIcon={<Reply />}
                  fullWidth
                  onClick={() => {
                    setSelectedReview(drawerReview);
                    setResponseText('');
                  }}
                >
                  Respond
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Single Delete Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={confirmLoading}
        onConfirm={handleDeleteReview}
        onCancel={() => {
          setConfirmOpen(false);
          setReviewToDelete(null);
        }}
      />

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Delete Selected Reviews"
        message={`Are you sure you want to delete ${selectedIds.size} selected review(s)? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
        loading={bulkDeleteLoading}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
      />
    </Box>
  );
}
