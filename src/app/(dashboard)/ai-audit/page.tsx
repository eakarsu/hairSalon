'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Card,
  CardContent,
  Grid,
  Tooltip,
} from '@mui/material';
import { AutoAwesome, AttachMoney, QueryStats } from '@mui/icons-material';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  contextType: string;
  clientId: string | null;
  clientName: string | null;
  inputPreview: string;
  outputPreview: string;
  estimatedCostUsd: number;
  createdAt: string;
}

interface MonthlyStats {
  totalCalls: number;
  estimatedCostUsd: number;
  month: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const CONTEXT_TYPE_COLORS: Record<string, 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error' | 'default'> = {
  CHAT: 'primary',
  REMINDER: 'info',
  MULTILANG: 'info',
  LOYALTY: 'success',
  KPI: 'secondary',
  REVIEW: 'warning',
  VISIT_NOTES: 'default',
  RESCHEDULE: 'warning',
  SERVICE_RECOMMEND: 'success',
  STAFF_INSIGHTS: 'secondary',
  NOSHOW_PREDICT: 'error',
  MARKETING: 'primary',
};

const AI_CONTEXT_TYPES = [
  'CHAT', 'REMINDER', 'MULTILANG', 'LOYALTY', 'KPI', 'REVIEW',
  'VISIT_NOTES', 'RESCHEDULE', 'SERVICE_RECOMMEND', 'STAFF_INSIGHTS',
  'NOSHOW_PREDICT', 'MARKETING',
];

export default function AIAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [contextTypeFilter, setContextTypeFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '25',
        ...(contextTypeFilter ? { contextType: contextTypeFilter } : {}),
      });
      const res = await fetch(`/api/admin/ai-audit?${params}`);
      if (!res.ok) throw new Error('Failed to fetch AI audit logs');
      const data = await res.json();
      setLogs(data.logs);
      setMonthlyStats(data.monthlyStats);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to load AI audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, contextTypeFilter]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AutoAwesome color="primary" />
        <Typography variant="h5" fontWeight={600}>
          AI Audit Log
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Monthly Stats Cards */}
      {monthlyStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <QueryStats color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    AI Calls This Month ({monthlyStats.month})
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {monthlyStats.totalCalls.toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AttachMoney color="success" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Est. Cost This Month
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    ${monthlyStats.estimatedCostUsd.toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={contextTypeFilter}
            label="Filter by Type"
            onChange={(e) => {
              setContextTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All Types</MenuItem>
            {AI_CONTEXT_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Paper elevation={0} variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Timestamp</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Client</strong></TableCell>
                    <TableCell><strong>Input Preview</strong></TableCell>
                    <TableCell><strong>Output Preview</strong></TableCell>
                    <TableCell align="right"><strong>Est. Cost</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No AI audit logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.contextType}
                            color={CONTEXT_TYPE_COLORS[log.contextType] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{log.clientName || '—'}</TableCell>
                        <TableCell>
                          <Tooltip title={log.inputPreview} placement="top">
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {log.inputPreview}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={log.outputPreview} placement="top">
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {log.outputPreview}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            ${log.estimatedCostUsd.toFixed(4)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {pagination && pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={pagination.totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
