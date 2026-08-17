const CATEGORY_MAP = {
  Facture: { name: 'Factures', icon: 'receipt' },
  Contrat: { name: 'Contrats', icon: 'file-text' },
  "Document d'assurance": { name: 'Assurance', icon: 'shield-check' },
  Amende: { name: 'Administration', icon: 'buildings' },
  'Document bancaire': { name: 'Banque', icon: 'bank' },
  'Document fiscal': { name: 'Administration', icon: 'buildings' },
  'Document de logement': { name: 'Logement', icon: 'house-line' },
};
const DEFAULT_CATEGORY = { name: 'Autres', icon: 'dots-three-circle' };

export function categoryFor(documentType) {
  return CATEGORY_MAP[documentType] || DEFAULT_CATEGORY;
}

export function formatDue(dueAt) {
  if (!dueAt) return 'Sans échéance';
  const days = Math.ceil((new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const dateLabel = new Date(dueAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  if (days < 0) return `En retard · ${dateLabel}`;
  if (days === 0) return `Aujourd'hui`;
  return `Dans ${days} j · ${dateLabel}`;
}

export function formatEur(cents) {
  if (cents == null) return null;
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
