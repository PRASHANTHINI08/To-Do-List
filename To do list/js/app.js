import { supabase } from './supabaseClient.js';

// --- State ---
let currentUser = null;
let tasks = [];
let habits = [];
let isLoginMode = true;

// --- DOM Elements ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authSubmitText = document.getElementById('auth-submit-text');
const authSwitchText = document.getElementById('auth-switch-text');
const authSwitchBtn = document.getElementById('auth-switch-btn');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');

const themeToggle = document.getElementById('theme-toggle');
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const pageTitle = document.getElementById('page-title');

const dashboardTaskList = document.getElementById('dashboard-task-list');
const mainTaskList = document.getElementById('main-task-list');
const habitList = document.getElementById('habit-list');

const statPending = document.getElementById('stat-pending');
const statCompleted = document.getElementById('stat-completed');
const statHabits = document.getElementById('stat-habits');

const tipText = document.getElementById('tip-text');

// Modals
const taskModal = document.getElementById('task-modal');
const closeTaskModalBtn = document.getElementById('close-task-modal');
const cancelTaskBtn = document.getElementById('cancel-task-btn');
const headerAddTaskBtn = document.getElementById('header-add-task-btn');
const taskForm = document.getElementById('task-form');

const habitModal = document.getElementById('habit-modal');
const addHabitBtn = document.getElementById('add-habit-btn');
const closeHabitModalBtn = document.getElementById('close-habit-modal');
const cancelHabitBtn = document.getElementById('cancel-habit-btn');
const habitForm = document.getElementById('habit-form');

// Task Filters
const taskSearch = document.getElementById('task-search');
const taskFilter = document.getElementById('task-filter');
const taskSort = document.getElementById('task-sort');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  lucide.createIcons();
  
  // Check local storage for theme
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Auth Listener
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      currentUser = session.user;
      authContainer.classList.add('hidden');
      appContainer.classList.remove('hidden');
      loadAppData();
    } else {
      currentUser = null;
      authContainer.classList.remove('hidden');
      appContainer.classList.add('hidden');
    }
  });
});

// --- Theme Toggle ---
themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme === 'dark') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
});

// --- Navigation ---
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    
    const targetId = item.getAttribute('data-target');
    views.forEach(view => view.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    
    // Update header title
    pageTitle.textContent = item.textContent.trim();
    
    if (targetId === 'analytics-view') {
      renderChart();
    }
  });
});

// --- Authentication ---
authSwitchBtn.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  authSubmitText.textContent = isLoginMode ? 'Log In' : 'Sign Up';
  authSwitchText.textContent = isLoginMode ? "Don't have an account? " : "Already have an account? ";
  authSwitchBtn.textContent = isLoginMode ? "Sign up" : "Log in";
  authError.style.display = 'none';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;
  authError.style.display = 'none';
  
  try {
    let error;
    if (isLoginMode) {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      error = loginError;
    } else {
      const { error: signupError } = await supabase.auth.signUp({ email, password });
      error = signupError;
      if (!error) {
         authError.style.display = 'block';
         authError.style.color = 'var(--success-color)';
         authError.textContent = 'Signup successful! Please log in.';
         isLoginMode = true;
         authSubmitText.textContent = 'Log In';
         return;
      }
    }
    
    if (error) throw error;
  } catch (err) {
    authError.style.display = 'block';
    authError.style.color = 'var(--danger-color)';
    authError.textContent = err.message;
  }
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// --- Data Loading ---
async function loadAppData() {
  await Promise.all([fetchTasks(), fetchHabits()]);
  renderTasks();
  renderHabits();
  updateDashboardStats();
  generateSmartTip();
}

// --- Tasks Logic ---
async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('deadline', { ascending: true });
    
  if (!error) tasks = data || [];
}

function renderTasks() {
  const searchTerm = taskSearch.value.toLowerCase();
  const filter = taskFilter.value;
  const sort = taskSort.value;
  
  let filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm));
  if (filter !== 'all') {
    const isCompleted = filter === 'completed';
    filteredTasks = filteredTasks.filter(t => (t.status === 'Completed') === isCompleted);
  }
  
  filteredTasks.sort((a, b) => {
    if (sort === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    } else {
      const p = { 'High': 3, 'Medium': 2, 'Low': 1 };
      return p[b.priority] - p[a.priority];
    }
  });

  const generateTaskHTML = (task) => {
    const isCompleted = task.status === 'Completed';
    const isOverdue = !isCompleted && task.deadline && new Date(task.deadline) < new Date();
    
    return `
      <div class="task-item ${isOverdue ? 'overdue' : ''}" data-id="${task.id}">
        <div class="task-info">
          <div class="task-checkbox ${isCompleted ? 'completed' : ''}" onclick="toggleTaskStatus('${task.id}')">
            <i data-lucide="check" style="${isCompleted ? 'display:block' : 'display:none'}" width="16" height="16"></i>
          </div>
          <div>
            <div class="task-title ${isCompleted ? 'completed' : ''}">${task.title}</div>
            <div class="task-meta">
              <span class="priority-badge priority-${task.priority}">${task.priority}</span>
              ${task.deadline ? `<span class="${isOverdue ? 'overdue-text' : ''}"><i data-lucide="calendar" width="12" height="12" style="display:inline; vertical-align:middle; margin-right:4px;"></i>${new Date(task.deadline).toLocaleDateString()}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="delete" onclick="deleteTask('${task.id}')"><i data-lucide="trash-2" width="18" height="18"></i></button>
        </div>
      </div>
    `;
  };

  mainTaskList.innerHTML = filteredTasks.map(generateTaskHTML).join('') || '<p style="color:var(--text-secondary)">No tasks found.</p>';
  
  // Dashboard tasks (only pending, max 5)
  const dashboardTasks = tasks.filter(t => t.status === 'Pending').slice(0, 5);
  dashboardTaskList.innerHTML = dashboardTasks.map(generateTaskHTML).join('') || '<p style="color:var(--text-secondary)">No tasks for today. Enjoy your day!</p>';
  
  lucide.createIcons();
}

window.toggleTaskStatus = async (id) => {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  
  const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
  task.status = newStatus; // Optimistic update
  renderTasks();
  updateDashboardStats();
  
  await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
  
  if (newStatus === 'Completed') {
    logProductivity();
  }
};

window.deleteTask = async (id) => {
  tasks = tasks.filter(t => t.id !== id);
  renderTasks();
  updateDashboardStats();
  await supabase.from('tasks').delete().eq('id', id);
};

// Modals logic
const openTaskModal = () => { taskForm.reset(); document.getElementById('task-id').value = ''; taskModal.classList.add('active'); };
const closeTaskModal = () => taskModal.classList.remove('active');

headerAddTaskBtn.addEventListener('click', openTaskModal);
closeTaskModalBtn.addEventListener('click', closeTaskModal);
cancelTaskBtn.addEventListener('click', closeTaskModal);

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value;
  const description = document.getElementById('task-desc').value;
  const priority = document.getElementById('task-priority').value;
  const deadline = document.getElementById('task-deadline').value || null;
  
  closeTaskModal();
  
  const newTask = { user_id: currentUser.id, title, description, priority, deadline, status: 'Pending' };
  
  // Optimistic
  const tempId = 'temp-' + Date.now();
  tasks.push({ ...newTask, id: tempId });
  renderTasks();
  updateDashboardStats();
  
  const { data, error } = await supabase.from('tasks').insert(newTask).select();
  if (data) {
    tasks = tasks.map(t => t.id === tempId ? data[0] : t);
    renderTasks();
  }
});

// Search/Filter listeners
taskSearch.addEventListener('input', renderTasks);
taskFilter.addEventListener('change', renderTasks);
taskSort.addEventListener('change', renderTasks);


// --- Habits Logic ---
async function fetchHabits() {
  const { data, error } = await supabase.from('habits').select('*');
  if (!error) habits = data || [];
}

function renderHabits() {
  habitList.innerHTML = habits.map(habit => {
    const today = new Date().toISOString().split('T')[0];
    const isCompletedToday = habit.last_completed_date === today;
    
    return `
      <div class="habit-card">
        <div>
          <h4 style="font-size: 18px; margin-bottom: 4px;">${habit.habit_name}</h4>
          <p style="font-size: 12px;">Last done: ${habit.last_completed_date || 'Never'}</p>
        </div>
        <div style="display:flex; align-items:center; gap: 16px;">
          <div class="streak-counter">
            <i data-lucide="flame" style="color: var(--warning-color)"></i>
            ${habit.streak_count}
          </div>
          <button class="icon-btn" onclick="completeHabit('${habit.id}')" ${isCompletedToday ? 'disabled style="opacity:0.5"' : ''}>
            <i data-lucide="${isCompletedToday ? 'check' : 'plus'}" style="color: ${isCompletedToday ? 'var(--success-color)' : 'var(--text-primary)'}"></i>
          </button>
        </div>
      </div>
    `;
  }).join('') || '<p style="color:var(--text-secondary); grid-column: 1/-1;">No habits tracked yet.</p>';
  
  lucide.createIcons();
}

const openHabitModal = () => { habitForm.reset(); habitModal.classList.add('active'); };
const closeHabitModal = () => habitModal.classList.remove('active');

addHabitBtn.addEventListener('click', openHabitModal);
closeHabitModalBtn.addEventListener('click', closeHabitModal);
cancelHabitBtn.addEventListener('click', closeHabitModal);

habitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('habit-name').value;
  closeHabitModal();
  
  const newHabit = { user_id: currentUser.id, habit_name: name, streak_count: 0 };
  const { data } = await supabase.from('habits').insert(newHabit).select();
  if (data) {
    habits.push(data[0]);
    renderHabits();
    updateDashboardStats();
  }
});

window.completeHabit = async (id) => {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  
  const today = new Date().toISOString().split('T')[0];
  if (habit.last_completed_date === today) return; // Already done
  
  habit.streak_count += 1;
  habit.last_completed_date = today;
  renderHabits();
  
  await supabase.from('habits').update({ streak_count: habit.streak_count, last_completed_date: today }).eq('id', id);
};


// --- Dashboard Stats & Tips ---
function updateDashboardStats() {
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const completedToday = tasks.filter(t => t.status === 'Completed').length; // Simplification: we just count total completed for demo, ideally we filter by today's date
  
  statPending.textContent = pending;
  statCompleted.textContent = completedToday;
  statHabits.textContent = habits.length;
}

function generateSmartTip() {
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const overdue = tasks.filter(t => t.status === 'Pending' && t.deadline && new Date(t.deadline) < new Date()).length;
  
  if (overdue > 0) {
    tipText.textContent = `You have ${overdue} overdue tasks. Try to tackle them first!`;
    return;
  }
  
  if (pending > 5) {
    tipText.textContent = "You have a lot on your plate. Break down large tasks and focus on High Priority items.";
  } else if (pending > 0) {
    tipText.textContent = "You are on a roll! Keep up the good work.";
  } else {
    tipText.textContent = "All caught up! Why not track a new habit or enjoy your free time?";
  }
}

// --- Analytics Log ---
async function logProductivity() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('productivity_logs').select('*').eq('date', today).single();
  
  if (data) {
    await supabase.from('productivity_logs').update({ tasks_completed: data.tasks_completed + 1 }).eq('id', data.id);
  } else {
    await supabase.from('productivity_logs').insert({ user_id: currentUser.id, date: today, tasks_completed: 1 });
  }
}

// --- Chart Rendering ---
let myChart = null;
async function renderChart() {
  const ctx = document.getElementById('productivity-chart').getContext('2d');
  
  const { data } = await supabase.from('productivity_logs').select('*').order('date', { ascending: true }).limit(7);
  
  const labels = data ? data.map(d => d.date) : [];
  const counts = data ? data.map(d => d.tasks_completed) : [];
  
  if (myChart) myChart.destroy();
  
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
  
  myChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [{
        label: 'Tasks Completed',
        data: counts.length ? counts : [0],
        backgroundColor: primaryColor,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
