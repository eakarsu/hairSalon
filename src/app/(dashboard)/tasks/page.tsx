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
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  CheckCircle,
  Schedule,
  Warning,
  TaskAlt,
} from '@mui/icons-material';
import { format, isPast, isToday } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  dueDate: string | null;
  assignedToName: string | null;
  createdAt: string;
}

const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
  FOLLOW_UP: 'primary',
  STAFFING: 'secondary',
  INVENTORY: 'success',
  OTHER: 'warning',
};

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'error'> = {
  OPEN: 'default',
  IN_PROGRESS: 'primary',
  DONE: 'success',
  CANCELLED: 'error',
};

interface StaffMember {
  id: string;
  name: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'OTHER',
    status: 'OPEN',
    dueDate: '',
    assignedToId: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchStaff();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const handleOpenDialog = () => {
    setSelectedTask(null);
    setFormData({
      title: '',
      description: '',
      type: 'OTHER',
      status: 'OPEN',
      dueDate: '',
      assignedToId: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save');

      setDialogOpen(false);
      fetchTasks();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setSaving(false);
    }
  };

  // Mock data
  const mockTasks: Task[] = tasks.length > 0 ? tasks : [
    { id: '1', title: 'Follow up with Jessica Martinez', description: 'Send birthday discount offer', type: 'FOLLOW_UP', status: 'OPEN', dueDate: new Date().toISOString(), assignedToName: 'Emily Wilson', createdAt: '2024-01-10' },
    { id: '2', title: 'Order gel polish supplies', description: 'Low on OPI colors', type: 'INVENTORY', status: 'IN_PROGRESS', dueDate: new Date(Date.now() + 86400000).toISOString(), assignedToName: 'Maria Garcia', createdAt: '2024-01-09' },
    { id: '3', title: 'Schedule staff meeting', description: 'Monthly performance review', type: 'STAFFING', status: 'OPEN', dueDate: new Date(Date.now() + 172800000).toISOString(), assignedToName: 'Linda Nguyen', createdAt: '2024-01-08' },
    { id: '4', title: 'Review no-show clients', description: 'Contact clients with recent no-shows', type: 'FOLLOW_UP', status: 'OPEN', dueDate: new Date().toISOString(), assignedToName: 'Emily Wilson', createdAt: '2024-01-11' },
    { id: '5', title: 'Update holiday schedule', description: 'Plan schedule for upcoming holiday', type: 'STAFFING', status: 'DONE', dueDate: new Date(Date.now() - 86400000).toISOString(), assignedToName: 'Maria Garcia', createdAt: '2024-01-05' },
    { id: '6', title: 'Restock sanitization supplies', description: 'Order hand sanitizer and disinfectant', type: 'INVENTORY', status: 'OPEN', dueDate: new Date(Date.now() + 259200000).toISOString(), assignedToName: null, createdAt: '2024-01-10' },
    { id: '7', title: 'Train new nail art techniques', description: 'Schedule training session for technicians', type: 'STAFFING', status: 'IN_PROGRESS', dueDate: new Date(Date.now() + 432000000).toISOString(), assignedToName: 'Kim Tran', createdAt: '2024-01-07' },
    { id: '8', title: 'Contact VIP clients for feedback', description: 'Call Gold and Platinum members', type: 'FOLLOW_UP', status: 'OPEN', dueDate: new Date(Date.now() + 86400000).toISOString(), assignedToName: 'Emily Wilson', createdAt: '2024-01-12' },
  ];

  const tabs = ['All', 'Open', 'In Progress', 'Done'];
  const statusMap: Record<number, string> = {
    1: 'OPEN',
    2: 'IN_PROGRESS',
    3: 'DONE',
  };

  const filteredTasks = mockTasks.filter(
    (task) =>
      (selectedTab === 0 || task.status === statusMap[selectedTab]) &&
      (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const openTasks = mockTasks.filter(t => t.status === 'OPEN').length;
  const inProgressTasks = mockTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const overdueTasks = mockTasks.filter(
    t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'DONE' && t.status !== 'CANCELLED'
  ).length;

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const isOverdue = isPast(date) && !isToday(date);

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {isOverdue && <Warning sx={{ fontSize: 16, color: 'error.main' }} />}
        <Typography
          variant="body2"
          color={isOverdue ? 'error.main' : isToday(date) ? 'warning.main' : 'text.secondary'}
        >
          {isToday(date) ? 'Today' : format(date, 'MMM d')}
        </Typography>
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Tasks
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenDialog}
        >
          Add Task
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TaskAlt color="primary" />
                <Typography variant="body2" color="text.secondary">Open Tasks</Typography>
              </Box>
              <Typography variant="h4">{openTasks}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Schedule color="info" />
                <Typography variant="body2" color="text.secondary">In Progress</Typography>
              </Box>
              <Typography variant="h4">{inProgressTasks}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Warning color="error" />
                <Typography variant="body2" color="text.secondary">Overdue</Typography>
              </Box>
              <Typography variant="h4" color="error.main">{overdueTasks}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="success" />
                <Typography variant="body2" color="text.secondary">Completed</Typography>
              </Box>
              <Typography variant="h4">{mockTasks.filter(t => t.status === 'DONE').length}</Typography>
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

        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Search tasks..."
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
                  <TableCell>Task</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {task.title}
                        </Typography>
                        {task.description && (
                          <Typography variant="caption" color="text.secondary">
                            {task.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.type.replace('_', ' ')}
                        size="small"
                        color={typeColors[task.type]}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.status.replace('_', ' ')}
                        size="small"
                        color={statusColors[task.status]}
                      />
                    </TableCell>
                    <TableCell>{getDueDateDisplay(task.dueDate)}</TableCell>
                    <TableCell>
                      {task.assignedToName ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                            {task.assignedToName.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">{task.assignedToName}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedTask(task);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      {task.status !== 'DONE' && (
                        <IconButton size="small" color="success">
                          <CheckCircle />
                        </IconButton>
                      )}
                      <IconButton size="small" color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Task Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              fullWidth
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="FOLLOW_UP">Follow Up</MenuItem>
                <MenuItem value="STAFFING">Staffing</MenuItem>
                <MenuItem value="INVENTORY">Inventory</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="DONE">Done</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Due Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Assign To</InputLabel>
              <Select
                label="Assign To"
                value={formData.assignedToId}
                onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {staff.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.title}
          >
            {saving ? 'Saving...' : selectedTask ? 'Save Changes' : 'Add Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
