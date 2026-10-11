export type FreeCodeCampCatalogEntry = {
  slug: string;
  title: string;
  description: string;
  categories: string[];
  language: string;
  certificateIncluded: true;
  lastReviewedAt: string;
};

export const FREECODECAMP_CATALOG: FreeCodeCampCatalogEntry[] = [
  {
    slug: 'responsive-web-design-v9',
    title: 'Certificación de Diseño Web Responsivo',
    description:
      'Aprende HTML semántico, accesibilidad, CSS, Flexbox, Grid y diseño adaptable mediante lecciones, ejercicios y proyectos prácticos.',
    categories: ['Certificación gratuita', 'Desarrollo web', 'HTML', 'CSS'],
    language: 'Inglés',
    certificateIncluded: true,
    lastReviewedAt: '2026-10-11',
  },
  {
    slug: 'javascript-v9',
    title: 'Certificación de JavaScript',
    description:
      'Aprende los fundamentos de JavaScript, estructuras de datos, programación funcional, algoritmos y desarrollo de aplicaciones interactivas.',
    categories: ['Certificación gratuita', 'JavaScript', 'Programación'],
    language: 'Inglés',
    certificateIncluded: true,
    lastReviewedAt: '2026-10-11',
  },
  {
    slug: 'front-end-development-libraries-v9',
    title: 'Certificación de Librerías de Desarrollo Front-end',
    description:
      'Desarrolla interfaces modernas y profundiza en herramientas y librerías usadas para construir aplicaciones web del lado del cliente.',
    categories: ['Certificación gratuita', 'Desarrollo web', 'Front-end'],
    language: 'Inglés',
    certificateIncluded: true,
    lastReviewedAt: '2026-10-11',
  },
  {
    slug: 'python-v9',
    title: 'Certificación de Python',
    description:
      'Aprende programación con Python mediante lecciones prácticas, ejercicios y proyectos que cubren los conceptos esenciales del lenguaje.',
    categories: ['Certificación gratuita', 'Python', 'Programación'],
    language: 'Inglés',
    certificateIncluded: true,
    lastReviewedAt: '2026-10-11',
  },
  {
    slug: 'relational-databases-v9',
    title: 'Certificación de Bases de Datos Relacionales',
    description:
      'Aprende fundamentos de bases de datos relacionales, SQL y herramientas de línea de comandos mediante ejercicios y proyectos prácticos.',
    categories: ['Certificación gratuita', 'Bases de datos', 'SQL'],
    language: 'Inglés',
    certificateIncluded: true,
    lastReviewedAt: '2026-10-11',
  },
  {
    slug: 'back-end-development-and-apis-v9',
    title: 'Certificación de Desarrollo Back-end y APIs',
    description:
      'Aprende a construir servicios de servidor y APIs, gestionar datos y aplicar prácticas fundamentales del desarrollo back-end.',
    categories: ['Certificación gratuita', 'Back-end', 'APIs'],
    language: 'Inglés',
    certificateIncluded: true,
    lastReviewedAt: '2026-10-11',
  },
  {
    slug: 'full-stack-developer-v9',
    title: 'Certificación de Desarrollo Full Stack',
    description:
      'Recorre un programa integral de desarrollo web que combina fundamentos de front-end, back-end, bases de datos y proyectos prácticos.',
    categories: ['Certificación gratuita', 'Desarrollo web', 'Full stack'],
    language: 'Inglés',
    certificateIncluded: true,
    lastReviewedAt: '2026-10-11',
  },
];
