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
  CircularProgress,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Star,
  Reply,
  FilterList,
  Google,
  ThumbUp,
  ThumbDown,
  TrendingUp,
} from '@mui/icons-material';
import { format } from 'date-fns';

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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterResponded, setFilterResponded] = useState('');
  const [activeTab, setActiveTab] = useState(0);

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
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
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
        fetchReviews();
        setSelectedReview(null);
        setResponseText('');
      }
    } catch (error) {
      console.error('Error responding to review:', error);
    }
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

  const positiveReviews = reviews.filter(r => r.rating >= 4).length;
  const negativeReviews = reviews.filter(r => r.rating <= 2).length;
  const needsResponse = reviews.filter(r => !r.response).length;

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

      {/* Reviews List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : reviews.length === 0 ? (
        <Alert severity="info">No reviews found matching your filters.</Alert>
      ) : (
        <Grid container spacing={2}>
          {reviews.map((review) => (
            <Grid size={{ xs: 12 }} key={review.id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: getPlatformColor(review.platform) }}>
                      {review.client?.name?.charAt(0) || 'C'}
                    </Avatar>
                    <Box>
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
                  <Box sx={{ textAlign: 'right' }}>
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

                {review.content && (
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    "{review.content}"
                  </Typography>
                )}

                {review.appointment && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Service: {review.appointment.service.name} with{' '}
                    {review.appointment.technician.name}
                  </Typography>
                )}

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
                    onClick={() => {
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
    </Box>
  );
}
