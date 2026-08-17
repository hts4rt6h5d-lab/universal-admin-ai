import { PrismaClient } from '@prisma/client';
import { PREMIUM_FIRST_MONTH_PROMO_CODE, PLAN_PRICES_CENTS } from '../src/services/stripe/index.js';

const prisma = new PrismaClient();

// Spec section 40: this is deliberately NOT a claim of legal coverage for
// every country. `coverageLevel` records how much of each profile has
// actually been filled in so the product never implies more certainty
// than it has — see CountryProfile.coverageLevel in schema.prisma.
const COUNTRIES = [
  {
    code: 'FR',
    name: 'France',
    defaultLocale: 'fr',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    phoneFormat: '+33 X XX XX XX XX',
    addressFormat: '{street}\n{postalCode} {city}\n{country}',
    officialSources: [
      { label: 'service-public.fr', url: 'https://www.service-public.fr' },
      { label: 'impots.gouv.fr', url: 'https://www.impots.gouv.fr' },
    ],
    knownDocumentTypes: ['Facture', 'Avis d’imposition', 'Amende (avis de contravention)', 'Quittance de loyer'],
    knownAuthorities: ['EDF', 'ANTS', 'CAF', 'URSSAF', 'DGFiP'],
    coverageLevel: 'partial',
  },
  {
    code: 'US',
    name: 'United States',
    defaultLocale: 'en',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    phoneFormat: '(XXX) XXX-XXXX',
    addressFormat: '{street}\n{city}, {state} {zip}\n{country}',
    officialSources: [{ label: 'IRS.gov', url: 'https://www.irs.gov' }],
    knownDocumentTypes: ['Invoice', 'Tax notice', 'Traffic citation'],
    knownAuthorities: ['IRS', 'DMV'],
    coverageLevel: 'basic',
  },
  {
    code: 'DE',
    name: 'Deutschland',
    defaultLocale: 'de',
    currency: 'EUR',
    dateFormat: 'DD.MM.YYYY',
    phoneFormat: '+49 XXX XXXXXXX',
    addressFormat: '{street}\n{postalCode} {city}\n{country}',
    officialSources: [{ label: 'bundesfinanzministerium.de', url: 'https://www.bundesfinanzministerium.de' }],
    knownDocumentTypes: ['Rechnung', 'Steuerbescheid'],
    knownAuthorities: ['Finanzamt'],
    coverageLevel: 'basic',
  },
  {
    code: 'ES',
    name: 'España',
    defaultLocale: 'es',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    phoneFormat: '+34 XXX XX XX XX',
    addressFormat: '{street}\n{postalCode} {city}\n{country}',
    officialSources: [{ label: 'agenciatributaria.es', url: 'https://www.agenciatributaria.es' }],
    knownDocumentTypes: ['Factura', 'Declaración de la renta'],
    knownAuthorities: ['Agencia Tributaria'],
    coverageLevel: 'basic',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    defaultLocale: 'en',
    currency: 'GBP',
    dateFormat: 'DD/MM/YYYY',
    phoneFormat: '+44 XXXX XXXXXX',
    addressFormat: '{street}\n{city}\n{postcode}\n{country}',
    officialSources: [{ label: 'gov.uk', url: 'https://www.gov.uk' }],
    knownDocumentTypes: ['Invoice', 'Council tax bill'],
    knownAuthorities: ['HMRC'],
    coverageLevel: 'basic',
  },
];

async function main() {
  await prisma.promotion.upsert({
    where: { code: PREMIUM_FIRST_MONTH_PROMO_CODE },
    create: {
      code: PREMIUM_FIRST_MONTH_PROMO_CODE,
      description: '20 € offerts sur le premier mois Premium',
      amountOffCents: 2000,
      appliesToPlan: 'PREMIUM',
      active: true,
    },
    update: {},
  });

  for (const country of COUNTRIES) {
    await prisma.countryProfile.upsert({
      where: { code: country.code },
      create: country,
      update: country,
    });
  }

  console.log(`Seeded 1 promotion (${PLAN_PRICES_CENTS.PREMIUM / 100} €/mo plan) and ${COUNTRIES.length} country profiles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
