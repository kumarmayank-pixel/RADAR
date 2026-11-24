(() => {
  'use strict';
  const STORAGE_KEY = 'radar.tasks.v1';
  const EXAMS_KEY = 'radar.exams.v1';
  const THEME_KEY = 'radar.theme.v1';
  const SUPABASE_URL = 'https://amxusqkdgleqczfvifvq.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_0dw1xYjREqCTRGhGOxqXGQ_NzwDwVUY';
  const cloud = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const subjects = [
    { name: 'Discrete Mathematics', code: 'MTH · DISCRETE', color: 'violet' },
    { name: 'Engineering Mathematics', code: 'MTH · ENGINEERING', color: 'blue' },
    { name: 'Fundamentals of Computer Programming (FoCP)', code: 'CSE-1003 · FoCP', color: 'mint' },
    { name: 'Fundamentals of Electrical Engineering (FoEE)', code: 'EEE · FOEE', color: 'amber' },
    { name: 'Professional Communication', code: 'HUM · COMMUNICATION', color: 'rose' }
  ];
  const categoryNames = { projects: 'Projects', viva: 'Viva', assignments: 'Assignments' };
  const categoryDescriptions = {
    projects: 'Keep long-form work moving and milestones in sight.',
    viva: 'Stay prepared for practicals, vivas, and lab check-ins.',
    assignments: 'Keep written work and submissions on schedule.'
  };
  const categoryIcons = { projects: '◇', viva: '◉', assignments: '▤' };
  let tasks = [];
  let exams = [];
  let currentUser = null;
  let authMode = 'login';
  let activeView = 'dashboard';
  let selectedSubject = '';
  let activeFilter = 'all';
  let categoryFilter = 'all';
  let toastTimer;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const safeURL = value => {
    if (!value) return '';
    let input = String(value).trim();
    if (!input) return '';
    if (!/^[a-z][a-z\d+.-]*:/i.test(input)) input = `https://${input}`;
    try {
      const url = new URL(input);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.filter(task => task && typeof task.id === 'string' && typeof task.title === 'string' && Number.isFinite(Number(task.due))) : [];
      }
    } catch { /* Start with demo tasks when saved data cannot be read. */ }
    return makeDemoTasks();
  }
  async function saveTasks() {
    if (!currentUser) return;
    tasks.forEach(task => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(task.id)) task.id = crypto.randomUUID(); });
    const rows = tasks.map(task => ({ id: task.id, user_id: currentUser.id, title: task.title, subject: task.subject, category: task.category, due_at: new Date(Number(task.due)).toISOString(), submission_link: task.link || null, completed: Boolean(task.completed) }));
    if (rows.length) { const { error } = await cloud.from('tasks').upsert(rows); if (error) return showToast(`Cloud save failed: ${error.message}`); }
    const { data: saved, error: fetchError } = await cloud.from('tasks').select('id');
    if (fetchError) return showToast(`Cloud sync failed: ${fetchError.message}`);
    const ids = new Set(rows.map(row => row.id)); const removed = (saved || []).map(row => row.id).filter(id => !ids.has(id));
    if (removed.length) { const { error } = await cloud.from('tasks').delete().in('id', removed); if (error) showToast(`Cloud delete failed: ${error.message}`); }
  }
  function loadExams() {
    try {
      const parsed = JSON.parse(localStorage.getItem(EXAMS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(exam => exam && typeof exam.id === 'string' && typeof exam.title === 'string' && Number.isFinite(Number(exam.date))) : [];
    } catch { return []; }
  }
  async function saveExams() {
    if (!currentUser) return;
    exams.forEach(exam => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(exam.id)) exam.id = crypto.randomUUID(); });
    const rows = exams.map(exam => ({ id: exam.id, user_id: currentUser.id, title: exam.title, subject: exam.subject, exam_at: new Date(Number(exam.date)).toISOString(), duration: exam.duration || null, venue: exam.venue || null, reporting_time: exam.reporting || null, notes: exam.notes || null }));
    if (rows.length) { const { error } = await cloud.from('exams').upsert(rows); if (error) return showToast(`Cloud save failed: ${error.message}`); }
    const { data: saved, error: fetchError } = await cloud.from('exams').select('id');
    if (fetchError) return showToast(`Cloud sync failed: ${fetchError.message}`);
    const ids = new Set(rows.map(row => row.id)); const removed = (saved || []).map(row => row.id).filter(id => !ids.has(id));
    if (removed.length) { const { error } = await cloud.from('exams').delete().in('id', removed); if (error) showToast(`Cloud delete failed: ${error.message}`); }
  }
  function makeDemoTasks() {
    const now = Date.now();
    return [
      { id: 'demo-focp', title: 'Pointers & Arrays Lab Submission', subject: subjects[2].name, category: 'assignments', due: now + 7 * 3600000, link: '', completed: false },
      { id: 'demo-viva', title: 'Data Structures Lab Viva', subject: subjects[2].name, category: 'viva', due: now + 19 * 3600000, link: '', completed: false },
      { id: 'demo-math', title: 'Discrete Mathematics Problem Set', subject: subjects[0].name, category: 'assignments', due: now + 38 * 3600000, link: '', completed: false },
      { id: 'demo-ece', title: 'Circuit Analysis Mini Project', subject: subjects[3].name, category: 'projects', due: now + 4 * 86400000, link: '', completed: false },
      { id: 'demo-done', title: 'Communication Skills Reflection', subject: subjects[4].name, category: 'assignments', due: now - 86400000, link: '', completed: true }
    ];
  }
  function getUrgency(task) {
    if (task.completed) return 'completed';
    const remaining = Number(task.due) - Date.now();
    if (remaining < 24 * 3600000) return 'critical';
    if (remaining <= 48 * 3600000) return 'approaching';
    return 'safe';
  }
  function formatCountdown(due) {
    let seconds = Math.floor((Number(due) - Date.now()) / 1000);
    if (seconds < 0) return 'OVERDUE';
    const days = Math.floor(seconds / 86400); seconds %= 86400;
    const hours = Math.floor(seconds / 3600); seconds %= 3600;
    const minutes = Math.floor(seconds / 60); seconds %= 60;
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  function formatDue(due) {
    const date = new Date(Number(due));
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  }
  function countsFor(list) {
    return list.reduce((counts, task) => { counts.all++; counts[getUrgency(task)]++; return counts; }, { all: 0, critical: 0, approaching: 0, safe: 0, completed: 0 });
  }
  function updateCounters(prefix, counts) {
    const ids = { all: 'All', critical: 'Critical', approaching: 'Approaching', safe: 'Safe', completed: 'Completed' };
    Object.entries(ids).forEach(([key, label]) => { const target = $(`#${prefix}${label}`); if (target) target.textContent = counts[key]; });
  }
  function taskCard(task) {
    const urgency = getUrgency(task);
    const subject = escapeHTML(task.subject);
    const title = escapeHTML(task.title);
    const category = categoryNames[task.category] || 'Assignment';
    const completed = urgency === 'completed';
    const statusLabel = { critical: 'CRITICAL · <24H', approaching: 'APPROACHING', safe: 'SAFE ZONE', completed: 'COMPLETED' }[urgency];
    const validLink = safeURL(task.link);
    return `<article class="task-card ${urgency}-card${completed ? ' completed-card' : ''}" data-task-id="${escapeHTML(task.id)}">
      <button class="task-check" type="button" data-action="toggle" aria-label="${completed ? 'Mark incomplete' : 'Mark completed'}: ${title}">${completed ? '✓' : ''}</button>
      <div class="task-main"><div class="task-title-row"><h3 class="task-title">${title}</h3><span class="urgency-badge ${urgency}">${statusLabel}</span></div><div class="task-subject">${subject}</div><div class="task-meta"><span class="meta-chip category">${escapeHTML(category)}</span><span class="meta-chip due">◷ ${escapeHTML(formatDue(task.due))}</span>${validLink ? `<a class="meta-chip" href="${escapeHTML(validLink)}" target="_blank" rel="noopener noreferrer">↗ Link</a>` : ''}</div></div>
      <div class="task-actions"><span class="countdown" data-countdown="${escapeHTML(task.id)}">${completed ? '—' : formatCountdown(task.due)}</span><button class="copy-button" type="button" data-action="copy">☷ Copy Alert</button><button class="delete-button" type="button" data-action="delete" aria-label="Delete ${title}" title="Delete deadline">×</button></div>
    </article>`;
  }
  function matchesFilter(task, filter) { return filter === 'all' || getUrgency(task) === filter; }
  function searched(list, query) {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return list;
    return list.filter(task => `${task.title} ${task.subject} ${categoryNames[task.category] || ''}`.toLocaleLowerCase().includes(needle));
  }
  function sorted(list) {
    const order = { critical: 0, approaching: 1, safe: 2, completed: 3 };
    return [...list].sort((a, b) => order[getUrgency(a)] - order[getUrgency(b)] || Number(a.due) - Number(b.due));
  }
  function renderDashboard() {
    const counts = countsFor(tasks);
    const active = counts.critical + counts.approaching + counts.safe;
    $('#activeCount').textContent = active;
    $('#alertCount').textContent = counts.critical + counts.approaching;
    $('#completedCount').textContent = counts.completed;
    const percent = tasks.length ? Math.round(counts.completed / tasks.length * 100) : 0;
    $('#progressPercent').textContent = `${percent}%`;
    $('#progressBar').style.width = `${percent}%`;
    $('#progressCaption').textContent = `${counts.completed} of ${tasks.length} tasks completed`;
    updateCounters('filter', counts);
    const visible = sorted(searched(tasks.filter(task => matchesFilter(task, activeFilter)), $('#searchInput').value));
    $('#taskList').innerHTML = visible.map(taskCard).join('');
    $('#emptyState').classList.toggle('hidden', visible.length > 0);
    $('#subjectChips').innerHTML = subjects.map(item => `<button class="subject-chip" type="button" data-subject="${escapeHTML(item.name)}"><i></i>${escapeHTML(item.name)}<span aria-hidden="true">↗</span></button>`).join('');
    $('#todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date()).toUpperCase();
  }
  function renderSubjects() {
    $('#subjectPageGrid').innerHTML = subjects.map((subject, index) => {
      const subjectTasks = tasks.filter(task => task.subject === subject.name);
      const pending = subjectTasks.filter(task => !task.completed).length;
      return `<button class="subject-page-card" type="button" data-subject="${escapeHTML(subject.name)}" aria-label="Show tasks for ${escapeHTML(subject.name)}"><span class="subject-page-card-top"><span><span class="subject-index">0${index + 1} / COURSE</span><span class="subject-name">${escapeHTML(subject.name)}</span><span class="subject-code">${escapeHTML(subject.code)}</span></span><span class="subject-index">${String(subjectTasks.length).padStart(2, '0')} <span aria-hidden="true">↗</span></span></span><span class="subject-task-count"><strong>${pending}</strong> active deadline${pending === 1 ? '' : 's'} · ${subjectTasks.length - pending} completed</span></button>`;
    }).join('');
    renderSubjectTasks();
  }
  function renderSubjectTasks() {
    const detail = $('#subjectTaskDetail');
    const selected = subjects.find(subject => subject.name === selectedSubject);
    detail.classList.toggle('hidden', !selected);
    if (!selected) return;
    $('#subjectTaskHeading').textContent = selected.name;
    const related = sorted(tasks.filter(task => task.subject === selectedSubject));
    $('#subjectTaskList').innerHTML = related.map(taskCard).join('');
    $('#subjectTaskEmpty').classList.toggle('hidden', related.length > 0);
  }
  function openSubject(subject) {
    selectedSubject = subject;
    setView('subjects');
    renderSubjectTasks();
    $('#subjectTaskDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderCategory() {
    const type = activeView;
    const label = categoryNames[type];
    $('#categoryTitle').textContent = label;
    $('#categorySubtitle').textContent = categoryDescriptions[type];
    $('#categorySymbol').textContent = categoryIcons[type];
    $('#categorySummaryTitle').textContent = `${label} radar`;
    $('#categorySummaryText').textContent = categoryDescriptions[type];
    const categoryTasks = tasks.filter(task => task.category === type);
    const counts = countsFor(categoryTasks);
    $('#categoryTotal').textContent = `${String(categoryTasks.length).padStart(2, '0')} TRACKED`;
    updateCounters('category', counts);
    const visible = sorted(searched(categoryTasks.filter(task => matchesFilter(task, categoryFilter)), $('#categorySearch').value));
    $('#categoryTaskList').innerHTML = visible.map(taskCard).join('');
    $('#categoryEmpty').classList.toggle('hidden', visible.length > 0);
  }
  function renderExams() {
    const sortedExams = [...exams].sort((a, b) => Number(a.date) - Number(b.date));
    $('#examTotal').textContent = `${String(exams.length).padStart(2, '0')} EXAM${exams.length === 1 ? '' : 'S'}`;
    $('#examSummaryText').textContent = exams.length ? `${exams.filter(exam => Number(exam.date) >= Date.now()).length} upcoming · saved on this device` : 'Add your first exam to start building the timetable.';
    $('#examEmpty').classList.toggle('hidden', exams.length > 0);
    $('#examList').innerHTML = sortedExams.map(exam => {
      const date = new Date(Number(exam.date));
      const day = new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(date);
      const month = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date).toUpperCase();
      const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
      const expired = Number(exam.date) < Date.now();
      const venue = exam.venue ? `<span>⌖ ${escapeHTML(exam.venue)}</span>` : '';
      const reporting = exam.reporting ? `<span>◷ Report ${escapeHTML(exam.reporting)}</span>` : '';
      const notes = exam.notes ? `<p class="exam-note">${escapeHTML(exam.notes)}</p>` : '';
      return `<article class="exam-card${expired ? ' exam-past' : ''}"><div class="exam-date-block"><strong>${escapeHTML(day)}</strong><span>${escapeHTML(month)}</span></div><div class="exam-card-main"><div class="exam-card-heading"><div><span class="exam-weekday">${escapeHTML(weekday)}${expired ? ' · COMPLETED' : ''}</span><h2>${escapeHTML(exam.title)}</h2></div><button class="delete-button" type="button" data-delete-exam="${escapeHTML(exam.id)}" aria-label="Remove ${escapeHTML(exam.title)}" title="Remove exam">×</button></div><div class="exam-details"><span class="exam-subject">${escapeHTML(exam.subject)}</span><span>◷ ${escapeHTML(formatDue(exam.date))}</span><span>⌛ ${escapeHTML(exam.duration || 'Not set')}</span>${venue}${reporting}</div>${notes}</div></article>`;
    }).join('');
  }
  function setView(view) {
    activeView = view;
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
    ['dashboard', 'subjects', 'category', 'exams'].forEach(name => $(`#${name}View`).classList.toggle('hidden', name !== (['projects', 'viva', 'assignments'].includes(view) ? 'category' : view)));
    if (view === 'subjects') renderSubjects();
    if (['projects', 'viva', 'assignments'].includes(view)) renderCategory();
    if (view === 'dashboard') renderDashboard();
    if (view === 'exams') renderExams();
    $('#mainContent').scrollTop = 0;
  }
  function renderAll() { renderDashboard(); if (activeView === 'subjects') renderSubjects(); if (['projects', 'viva', 'assignments'].includes(activeView)) renderCategory(); if (activeView === 'exams') renderExams(); }
  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }
  function openModal(category = 'projects') {
    $('#taskForm').reset();
    const due = new Date(); due.setDate(due.getDate() + 1); due.setHours(17, 0, 0, 0);
    const localDate = new Date(due.getTime() - due.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    $('#taskDue').value = localDate;
    if (categoryNames[category]) $('#taskCategory').value = category;
    $('#taskModal').classList.remove('hidden'); $('#taskTitle').focus();
  }
  function setQuickDueDefault() {
    const due = new Date(); due.setDate(due.getDate() + 1); due.setHours(17, 0, 0, 0);
    $('#quickDue').value = new Date(due.getTime() - due.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  function addTaskFromForm(form) {
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    const dueDate = new Date(String(data.get('due') || ''));
    if (!title || Number.isNaN(dueDate.getTime())) return false;
    const rawLink = String(data.get('link') || '').trim();
    const link = safeURL(rawLink);
    if (rawLink && !link) {
      const input = form.elements.namedItem('link');
      input.setCustomValidity('Enter a valid http or https URL.'); input.reportValidity(); input.setCustomValidity(''); return false;
    }
    tasks.push({ id: globalThis.crypto?.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(36).slice(2)}`, title, subject: String(data.get('subject')), category: String(data.get('category')), due: dueDate.getTime(), link, completed: false });
    saveTasks(); renderAll(); showToast('Deadline added to your radar'); return true;
  }
  function openExamModal() {
    $('#examForm').reset();
    const due = new Date(); due.setDate(due.getDate() + 1); due.setHours(9, 0, 0, 0);
    $('#examDate').value = new Date(due.getTime() - due.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    $('#examModal').classList.remove('hidden'); $('#examTitle').focus();
  }
  function closeExamModal() { $('#examModal').classList.add('hidden'); }
  function closeModal() { $('#taskModal').classList.add('hidden'); }
  function alertMessage(task) {
    const link = safeURL(task.link);
    return `📡 RADAR DEADLINE REMINDER\n\n📝 ${task.title}\n📚 ${task.subject}\n⏰ Due: ${formatDue(task.due)}\n${link ? `🔗 ${link}\n` : ''}\nStay ahead — you’ve got this!`;
  }
  async function copyAlert(task) {
    const message = alertMessage(task);
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(message);
      else {
        const helper = document.createElement('textarea'); helper.value = message; helper.style.position = 'fixed'; helper.style.opacity = '0'; document.body.append(helper); helper.select();
        const copied = document.execCommand('copy'); helper.remove(); if (!copied) throw new Error('Clipboard unavailable');
      }
      showToast('WhatsApp reminder copied to clipboard');
    } catch { showToast('Could not copy alert. Check clipboard permissions.'); }
  }
  function handleCardAction(event) {
    const actionButton = event.target.closest('[data-action]'); if (!actionButton) return;
    const card = actionButton.closest('[data-task-id]'); if (!card) return;
    const task = tasks.find(item => item.id === card.dataset.taskId); if (!task) return;
    if (actionButton.dataset.action === 'toggle') { task.completed = !task.completed; saveTasks(); renderAll(); showToast(task.completed ? 'Deadline marked complete' : 'Deadline reopened'); }
    if (actionButton.dataset.action === 'delete') { tasks = tasks.filter(item => item.id !== task.id); saveTasks(); renderAll(); showToast('Deadline removed'); }
    if (actionButton.dataset.action === 'copy') copyAlert(task);
  }
  function attachFilterButtons(selector, getter, setter) {
    $$(selector).forEach(button => button.addEventListener('click', () => {
      setter(button.dataset.filter);
      const group = button.closest('.filter-pills'); $$('.filter-pill', group).forEach(pill => pill.classList.toggle('active', pill === button));
      if (activeView === 'dashboard') renderDashboard(); else if (['projects', 'viva', 'assignments'].includes(activeView)) renderCategory();
    }));
  }

  $$('.nav-item').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $$('[data-open-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.openView)));
  $('#searchInput').addEventListener('input', renderDashboard);
  $('#categorySearch').addEventListener('input', renderCategory);
  attachFilterButtons('#dashboardView .filter-pill', () => activeFilter, value => { activeFilter = value; });
  attachFilterButtons('#categoryView .filter-pill', () => categoryFilter, value => { categoryFilter = value; });
  $('#subjectPageGrid').addEventListener('click', event => { const button = event.target.closest('[data-subject]'); if (button) openSubject(button.dataset.subject); });
  $('#subjectChips').addEventListener('click', event => { const button = event.target.closest('[data-subject]'); if (button) openSubject(button.dataset.subject); });
  $('#clearSubjectSelection').addEventListener('click', () => { selectedSubject = ''; renderSubjectTasks(); $('#subjectPageGrid').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('#taskList').addEventListener('click', handleCardAction);
  $('#categoryTaskList').addEventListener('click', handleCardAction);
  $('#subjectTaskList').addEventListener('click', handleCardAction);
  $('#categoryAddButton').addEventListener('click', () => openModal(activeView));
  $('#dashboardAddButton').addEventListener('click', () => openModal('assignments'));
  const examSubjectSelect = $('#examSubject');
  examSubjectSelect.innerHTML = '<option value="">Choose a subject</option>' + subjects.map(subject => `<option value="${escapeHTML(subject.name)}">${escapeHTML(subject.name)}</option>`).join('');
  $('#addExamButton').addEventListener('click', openExamModal);
  $('#emptyAddExam').addEventListener('click', openExamModal);
  $('#closeExamModal').addEventListener('click', closeExamModal);
  $('#cancelExamModal').addEventListener('click', closeExamModal);
  $('#examModal').addEventListener('click', event => { if (event.target === $('#examModal')) closeExamModal(); });
  $('#examList').addEventListener('click', event => {
    const button = event.target.closest('[data-delete-exam]'); if (!button) return;
    exams = exams.filter(exam => exam.id !== button.dataset.deleteExam); saveExams(); renderExams(); showToast('Exam removed from timetable');
  });
  $('#examForm').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') || '').trim();
    const date = new Date(String(data.get('date') || ''));
    const subject = String(data.get('subject') || '');
    if (!title || !subject || Number.isNaN(date.getTime())) return;
    exams.push({ id: globalThis.crypto?.randomUUID?.() || `exam-${Date.now()}-${Math.random().toString(36).slice(2)}`, title, subject, date: date.getTime(), duration: String(data.get('duration') || ''), venue: String(data.get('venue') || '').trim(), reporting: String(data.get('reporting') || ''), notes: String(data.get('notes') || '').trim() });
    saveExams(); closeExamModal(); renderExams(); showToast('Exam added to your timetable');
  });
  $('#closeModal').addEventListener('click', closeModal); $('#cancelModal').addEventListener('click', closeModal);
  $('#taskModal').addEventListener('click', event => { if (event.target === $('#taskModal')) closeModal(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeModal(); closeExamModal(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); (activeView === 'dashboard' ? $('#searchInput') : $('#categorySearch'))?.focus(); }
  });
  $('#taskForm').addEventListener('submit', event => {
    event.preventDefault();
    if (addTaskFromForm(event.currentTarget)) { closeModal(); event.currentTarget.reset(); }
  });
  $('#quickAddForm').addEventListener('submit', event => {
    event.preventDefault();
    if (addTaskFromForm(event.currentTarget)) { event.currentTarget.elements.title.value = ''; event.currentTarget.elements.link.value = ''; setQuickDueDefault(); }
  });
  $('#resetDemo').addEventListener('click', () => {
    tasks = makeDemoTasks(); saveTasks(); activeFilter = 'all'; $('#searchInput').value = ''; $$('#dashboardView .filter-pill').forEach(button => button.classList.toggle('active', button.dataset.filter === 'all')); renderAll(); showToast('Demo deadlines restored');
  });
  function setTheme(theme) {
    const light = theme === 'light'; document.body.classList.toggle('light-theme', light);
    $('#themeIcon').textContent = light ? '☾' : '☼';
    $('#themeToggle').setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    localStorage.setItem(THEME_KEY, theme);
  }
  $('#themeToggle').addEventListener('click', () => setTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light'));
  const savedTheme = localStorage.getItem(THEME_KEY);
  setTheme(savedTheme === 'light' ? 'light' : 'dark');
  setQuickDueDefault();
  function setAuthFeedback(message, isError = false) { const node = $('#authFeedback'); node.textContent = message; node.classList.toggle('error', isError); }
  function toggleAuthMode() {
    authMode = authMode === 'login' ? 'signup' : 'login';
    $('#authTitle').innerHTML = authMode === 'login' ? 'Your deadlines,<br><em>wherever you are.</em>' : 'Create your RADAR<br><em>account.</em>';
    $('#authSubmit').textContent = authMode === 'login' ? 'Sign in' : 'Create account';
    $('#authMode').textContent = authMode === 'login' ? 'New to RADAR? Create an account' : 'Already have an account? Sign in';
    $('#authPassword').setAttribute('autocomplete', authMode === 'login' ? 'current-password' : 'new-password');
    setAuthFeedback('');
  }
  async function loadCloudData() {
    const [{ data: taskRows, error: taskError }, { data: examRows, error: examError }] = await Promise.all([
      cloud.from('tasks').select('*').order('due_at'), cloud.from('exams').select('*').order('exam_at')
    ]);
    if (taskError || examError) throw taskError || examError;
    tasks = (taskRows || []).map(row => ({ id: row.id, title: row.title, subject: row.subject, category: row.category, due: new Date(row.due_at).getTime(), link: row.submission_link || '', completed: row.completed }));
    exams = (examRows || []).map(row => ({ id: row.id, title: row.title, subject: row.subject, date: new Date(row.exam_at).getTime(), duration: row.duration || '', venue: row.venue || '', reporting: row.reporting_time || '', notes: row.notes || '' }));
    const migrationKey = `radar.migrated.${currentUser.id}`;
    if (!tasks.length && !localStorage.getItem(migrationKey)) { tasks = loadTasks(); await saveTasks(); }
    if (!exams.length) { const oldExams = loadExams(); if (oldExams.length) { exams = oldExams; await saveExams(); } }
    localStorage.setItem(migrationKey, 'yes');
    $('#signedInEmail').textContent = currentUser.email || '';
    $('#authScreen').classList.add('hidden'); $('.app-shell').classList.remove('hidden');
    renderAll();
  }
  async function activateSession(session) {
    currentUser = session?.user || null;
    if (!currentUser) { $('.app-shell').classList.add('hidden'); $('#authScreen').classList.remove('hidden'); return; }
    setAuthFeedback('Loading your cloud data…');
    try { await loadCloudData(); } catch (error) { currentUser = null; setAuthFeedback(`Could not load RADAR data: ${error.message}`, true); }
  }
  $('#authMode').addEventListener('click', toggleAuthMode);
  $('#authForm').addEventListener('submit', async event => {
    event.preventDefault(); const button = $('#authSubmit'); button.disabled = true; setAuthFeedback('Connecting securely…');
    const email = $('#authEmail').value.trim(); const password = $('#authPassword').value;
    const result = authMode === 'login' ? await cloud.auth.signInWithPassword({ email, password }) : await cloud.auth.signUp({ email, password });
    button.disabled = false;
    if (result.error) { setAuthFeedback(result.error.message, true); return; }
    if (authMode === 'signup' && !result.data.session) { setAuthFeedback('Account created. Check your email to confirm, then sign in.'); return; }
    if (result.data.session) await activateSession(result.data.session);
  });
  $('#signOutButton').addEventListener('click', async () => { await cloud.auth.signOut(); tasks = []; exams = []; currentUser = null; $('.app-shell').classList.add('hidden'); $('#authScreen').classList.remove('hidden'); });
  cloud.auth.onAuthStateChange((_event, session) => { if (session?.user?.id !== currentUser?.id) setTimeout(() => activateSession(session), 0); });
  cloud.auth.getSession().then(({ data, error }) => error ? setAuthFeedback(error.message, true) : activateSession(data.session));
  setInterval(() => { if (currentUser) renderAll(); }, 1000);
})();
