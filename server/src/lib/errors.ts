// Every error the API returns to a client goes through this shape, so the
// frontend always gets { error: { code, message } } with a message a
// non-technical user can act on (spec section 31) — never a raw stack
// trace or a bare "Error 500".
export class AppError extends Error {
  status: number;
  code: string;
  userMessage: string;

  constructor(status: number, code: string, userMessage: string) {
    super(userMessage);
    this.status = status;
    this.code = code;
    this.userMessage = userMessage;
  }
}

export const Errors = {
  unauthorized: () => new AppError(401, 'unauthorized', "Votre session a expiré. Reconnectez-vous pour continuer."),
  forbidden: () => new AppError(403, 'forbidden', "Vous n'avez pas accès à cette fonctionnalité avec votre formule actuelle."),
  notFound: (what = 'Ressource') => new AppError(404, 'not_found', `${what} introuvable.`),
  validation: (msg: string) => new AppError(400, 'validation', msg),
  conflict: (msg: string) => new AppError(409, 'conflict', msg),
  rateLimited: () => new AppError(429, 'rate_limited', 'Trop de tentatives. Merci de réessayer dans quelques minutes.'),
  configurationRequired: (what: string) =>
    new AppError(503, 'configuration_required', `${what} n'est pas encore configuré sur ce serveur.`),
  internal: () => new AppError(500, 'internal', "Une erreur inattendue s'est produite. Merci de réessayer."),
};
