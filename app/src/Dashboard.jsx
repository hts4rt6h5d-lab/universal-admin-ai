import { useEffect, useRef, useState } from 'react';
import { css } from './lib/css';
import { api, ApiError, resolveApiUrl } from './api/client';
import { useAuth } from './auth/AuthContext';
import { categoryFor, formatDue } from './lib/format';

import StatusBar from './components/StatusBar';
import BottomNav from './components/BottomNav';
import AddSheet from './components/AddSheet';
import Toast from './components/Toast';
import Home from './screens/Home';
import Analyzing from './screens/Analyzing';
import Result from './screens/Result';
import Docview from './screens/Docview';
import Assistant from './screens/Assistant';
import Tasks from './screens/Tasks';
import Documents from './screens/Documents';
import Profile from './screens/Profile';

const NAV = [
  ['home', 'Accueil', 'house'],
  ['docs', 'Documents', 'folders'],
  ['tasks', 'Tâches', 'list-checks'],
  ['assistant', 'Assistant', 'chat-circle-dots'],
  ['profile', 'Profil', 'user'],
];

const SOURCES = [
  { icon: 'ph ph-camera', label: 'Prendre une photo', sub: 'Photographier un document papier', accept: 'image/*', capture: 'environment' },
  { icon: 'ph ph-image', label: 'Choisir une photo', sub: 'Depuis votre galerie', accept: 'image/*' },
  { icon: 'ph ph-file-pdf', label: 'Importer un PDF', sub: 'Même les gros fichiers', accept: 'application/pdf' },
  { icon: 'ph ph-paperclip', label: 'Importer un document', sub: 'Word, image, e-mail…', accept: '.pdf,image/*,text/plain' },
];

export default function Dashboard() {
  const { user, plan, logout } = useAuth();
  const canUseAssistant = plan === 'PREMIUM';

  const [screen, setScreen] = useState('home');
  const [addSheet, setAddSheet] = useState(false);
  const [toastText, setToastText] = useState(null);
  const toastTimerRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [simpleMode, setSimpleMode] = useState(false);

  const [conversationId, setConversationId] = useState(null);
  const [chat, setChat] = useState([{ role: 'ai', text: 'Bonjour ! Posez-moi une question sur vos documents. Je réponds simplement, à partir de ce que vous m’autorisez à consulter.' }]);
  const [draft, setDraft] = useState('');
  const chatRef = useRef(null);

  const fileInputRef = useRef(null);
  const pendingAcceptRef = useRef('*/*');

  const showToast = (text) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastText(text);
    toastTimerRef.current = setTimeout(() => setToastText(null), 2800);
  };

  const loadTasks = async () => {
    try {
      const data = await api.get('/tasks');
      setTasks(data.tasks);
    } catch {
      // Tasks are Standard-and-up; a 403 here just means show nothing.
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await api.get('/documents');
      setDocuments(data.documents);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadTasks();
    loadDocuments();
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat.length]);

  function go(next) {
    setAddSheet(false);
    setScreen(next);
  }

  function openAdd() {
    setAddSheet(true);
  }
  function closeAdd() {
    setAddSheet(false);
  }

  function pickSource(accept) {
    pendingAcceptRef.current = accept;
    setAddSheet(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  }

  async function onFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setScreen('analyzing');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.upload('/documents', formData);
      setCurrentDocument(res.document);
      setCurrentAnalysis(res.analysis);
      setSimpleMode(false);
      loadDocuments();
      if (res.task) loadTasks();
      setScreen('result');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "L'analyse a échoué. Réessayez.");
      setScreen('home');
    }
  }

  async function toggleTask(id) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: t.status === 'OPEN' ? 'DONE' : 'OPEN' } : t)));
    try {
      await api.patch(`/tasks/${id}/toggle`);
    } catch {
      loadTasks(); // resync on failure
    }
  }

  async function openDocument(doc) {
    setCurrentDocument(doc);
    setCurrentAnalysis(doc.analysis);
    setSimpleMode(false);
    go('result');
  }

  async function send() {
    const question = draft.trim();
    if (!question || !canUseAssistant) return;
    setDraft('');
    setChat((c) => [...c, { role: 'user', text: question }]);
    try {
      const res = await api.post('/assistant/ask', {
        question,
        conversationId: conversationId || undefined,
        documentId: currentDocument?.id,
      });
      setConversationId(res.conversationId);
      setChat((c) => [...c, { role: 'ai', text: res.answer }]);
    } catch (err) {
      setChat((c) => [...c, { role: 'ai', text: err instanceof ApiError ? err.message : "Une erreur est survenue." }]);
    }
  }

  // ── Derived view data ──
  const at = ['home', 'docs', 'tasks', 'assistant', 'profile'].includes(screen) ? screen : '';
  const navItems = NAV.map(([key, label, ic]) => ({
    label,
    iconClass: (at === key ? 'ph-fill ph-' : 'ph ph-') + ic,
    navColor: at === key ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-text) 45%, transparent)',
    onClick: () => go(key),
  }));

  const openTasksCount = tasks.filter((t) => t.status === 'OPEN').length;
  const tiles = [
    { icon: 'ph ph-file-magnifying-glass', label: 'Analyser un document', sub: 'Photo, PDF ou image', onClick: openAdd },
    { icon: 'ph ph-chats-circle', label: 'Poser une question', sub: 'Assistant IA', onClick: () => go('assistant') },
    { icon: 'ph ph-list-checks', label: 'Mes tâches', sub: `${openTasksCount} à faire`, onClick: () => go('tasks') },
    { icon: 'ph ph-calendar-dots', label: 'Mes échéances', sub: openTasksCount ? 'Voir le calendrier' : 'Rien pour le moment', onClick: () => go('tasks') },
  ];

  const mapTask = (t) => ({ id: t.id, title: t.title, due: formatDue(t.dueAt), from: t.source || '', done: t.status === 'DONE', notDone: t.status !== 'DONE', onDone: () => toggleTask(t.id) });
  const byPrio = (p) => tasks.filter((t) => t.priority === p).map(mapTask);
  const priorityRank = { URGENT: 0, SOON: 1, PLANNED: 2 };
  const todayTasks = tasks
    .filter((t) => t.status === 'OPEN')
    .sort((a, b) => (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3))
    .slice(0, 3)
    .map((t) => ({ id: t.id, title: t.title, due: formatDue(t.dueAt), priority: t.priority }));

  const categoryCounts = new Map();
  for (const d of documents) {
    const cat = categoryFor(d.category);
    categoryCounts.set(cat.name, { ...cat, count: (categoryCounts.get(cat.name)?.count || 0) + 1 });
  }
  const categories = Array.from(categoryCounts.values()).map((c) => ({
    name: c.name,
    count: `${c.count} document${c.count > 1 ? 's' : ''}`,
    icon: 'ph ph-' + c.icon,
    onClick: () => showToast(`Catégorie : ${c.name}`),
  }));
  const recents = documents.slice(0, 6).map((d) => ({
    name: d.originalName,
    meta: `${d.category || 'Document'} · ${new Date(d.createdAt).toLocaleDateString('fr-FR')}`,
    onClick: () => openDocument(d),
  }));

  const suggestions = canUseAssistant
    ? [
        { q: 'Est-ce que je dois répondre ?', onClick: () => { setDraft('Est-ce que je dois répondre ?'); } },
        { q: 'Explique comme si j’avais 10 ans', onClick: () => { setDraft('Explique comme si j’avais 10 ans'); } },
        { q: 'Trouve les dates importantes', onClick: () => { setDraft('Trouve les dates importantes'); } },
      ]
    : [];

  async function exportData() {
    try {
      const res = await fetch(resolveApiUrl('/account/export'), { credentials: 'include' });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = 'universal-admin-ai-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Impossible d'exporter vos données pour le moment.");
    }
  }

  const settingsRows = [
    { label: 'Notifications', icon: 'ph ph-bell', value: '', onClick: () => showToast('Bientôt disponible dans cette démo.') },
    { label: 'Sécurité & 2FA', icon: 'ph ph-shield-check', value: '', onClick: () => showToast('Bientôt disponible dans cette démo.') },
    { label: 'Exporter mes données', icon: 'ph ph-download-simple', value: '', onClick: exportData },
    { label: 'Pays & langue', icon: 'ph ph-globe', value: `${user?.countryCode || ''} · ${user?.locale || ''}`, onClick: () => showToast('Bientôt disponible dans cette démo.') },
  ];

  const sources = SOURCES.map((s) => ({ ...s, onClick: () => pickSource(s.accept) }));

  const analyzeSteps = [
    { label: 'Envoi du document', done: true, active: false, todo: false },
    { label: 'Analyse par l’assistant', done: false, active: true, todo: false },
    { label: 'Extraction des informations', done: false, active: false, todo: true },
    { label: 'Préparation du résultat', done: false, active: false, todo: true },
  ];

  return (
    <>
      <input ref={fileInputRef} type="file" onChange={onFileChosen} style={{ display: 'none' }} />
      <StatusBar />
      <div style={css('position:absolute;top:0;left:0;right:0;bottom:72px;overflow:hidden;z-index:1')}>
        {screen === 'home' && <Home tiles={tiles} todayTasks={todayTasks} onGoTasks={() => go('tasks')} onGoProfile={() => go('profile')} onLangToast={() => showToast('Sélecteur de langue dans Profil.')} onOpenAdd={openAdd} userName={user?.firstName} />}
        {screen === 'analyzing' && <Analyzing steps={analyzeSteps} />}
        {screen === 'result' && (
          <Result
            document={currentDocument}
            analysis={currentAnalysis}
            simpleMode={simpleMode}
            canUseAssistant={canUseAssistant}
            onGoHome={() => go('home')}
            onToggleSimple={() => setSimpleMode((v) => !v)}
            onGoDocview={() => go('docview')}
            onGoAssistant={() => go('assistant')}
          />
        )}
        {screen === 'docview' && <Docview document={currentDocument} canUseAssistant={canUseAssistant} onGoResult={() => go('result')} onGoAssistant={() => go('assistant')} />}
        {screen === 'assistant' && (
          <Assistant
            chat={chat}
            suggestions={suggestions}
            draft={draft}
            onDraftChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            onSend={send}
            onGoHome={() => go('home')}
            setChatRef={(el) => { chatRef.current = el; }}
            locked={!canUseAssistant}
            contextLabel={currentDocument?.originalName}
          />
        )}
        {screen === 'tasks' && (
          <Tasks tasksRemaining={openTasksCount} urgentTasks={byPrio('URGENT')} soonTasks={byPrio('SOON')} plannedTasks={byPrio('PLANNED')} />
        )}
        {screen === 'docs' && <Documents categories={categories} recents={recents} onOpenAdd={openAdd} />}
        {screen === 'profile' && <Profile settingsRows={settingsRows} user={user} plan={plan} onLogout={logout} onManageToast={(msg) => showToast(msg)} />}
      </div>

      <BottomNav navItems={navItems} showChrome />

      {addSheet && <AddSheet sources={sources} onClose={closeAdd} />}
      {toastText && <Toast text={toastText} />}
    </>
  );
}
