export type CuratedCourse = {
  externalId: string;
  title: string;
  description: string;
  sourceUrl: string;
  categories: string[];
  language: string;
  lastReviewedAt: string;
};

export type CuratedCourseSource = {
  id: string;
  sourceName: string;
  organizationName: string;
  hostname: string;
  pathPrefix: string;
  enabledEnvironmentVariable: string;
  providerEmail: string;
  catalog: CuratedCourse[];
};

export const CS50_SOURCE: CuratedCourseSource = {
  id: 'cs50',
  sourceName: 'CS50',
  organizationName: 'Harvard University',
  hostname: 'cs50.harvard.edu',
  pathPrefix: '/',
  enabledEnvironmentVariable: 'CS50_IMPORT_ENABLED',
  providerEmail: 'cs50-import@bolivar-opportunities.invalid',
  catalog: [
    {
      externalId: 'introduction-computer-science',
      title: 'CS50: Introducción a las Ciencias de la Computación',
      description:
        'Curso introductorio de Harvard sobre pensamiento computacional, algoritmos, estructuras de datos y programación con C, Python, SQL, HTML, CSS y JavaScript.',
      sourceUrl: 'https://cs50.harvard.edu/x/',
      categories: [
        'Certificación gratuita',
        'Ciencias de la computación',
        'Programación',
      ],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
    {
      externalId: 'python',
      title: 'CS50: Introducción a la Programación con Python',
      description:
        'Aprende Python desde los fundamentos: funciones, condicionales, ciclos, excepciones, pruebas unitarias, expresiones regulares, programación orientada a objetos y manejo de archivos.',
      sourceUrl: 'https://cs50.harvard.edu/python/',
      categories: ['Certificación gratuita', 'Python', 'Programación'],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
    {
      externalId: 'artificial-intelligence-python',
      title: 'CS50: Introducción a la Inteligencia Artificial con Python',
      description:
        'Explora búsqueda, representación del conocimiento, probabilidad, optimización, aprendizaje automático, redes neuronales y procesamiento del lenguaje mediante proyectos en Python.',
      sourceUrl: 'https://cs50.harvard.edu/ai/',
      categories: [
        'Certificación gratuita',
        'Inteligencia artificial',
        'Python',
      ],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
    {
      externalId: 'web-python-javascript',
      title: 'CS50: Programación Web con Python y JavaScript',
      description:
        'Profundiza en el desarrollo de aplicaciones web con Python, JavaScript, SQL y Django, incluyendo APIs, interfaces, pruebas, escalabilidad y seguridad.',
      sourceUrl: 'https://cs50.harvard.edu/web/',
      categories: [
        'Certificación gratuita',
        'Desarrollo web',
        'Python',
        'JavaScript',
      ],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
    {
      externalId: 'databases-sql',
      title: 'CS50: Introducción a Bases de Datos con SQL',
      description:
        'Aprende a modelar, consultar y optimizar bases de datos relacionales con SQL mediante ejercicios y proyectos prácticos.',
      sourceUrl: 'https://cs50.harvard.edu/sql/',
      categories: ['Certificación gratuita', 'Bases de datos', 'SQL'],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
    {
      externalId: 'cybersecurity',
      title: 'CS50: Introducción a la Ciberseguridad',
      description:
        'Introducción técnica y práctica a la protección de cuentas, datos, sistemas y software, con énfasis en riesgos, privacidad y decisiones de seguridad.',
      sourceUrl: 'https://cs50.harvard.edu/cybersecurity/',
      categories: ['Certificación gratuita', 'Ciberseguridad'],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
    {
      externalId: 'programming-r',
      title: 'CS50: Introducción a la Programación con R',
      description:
        'Aprende los fundamentos de programación y análisis de datos con R, incluyendo funciones, estructuras de datos, visualización y proyectos prácticos.',
      sourceUrl: 'https://cs50.harvard.edu/r/',
      categories: [
        'Certificación gratuita',
        'Análisis de datos',
        'Programación',
      ],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
  ],
};

export const OPENLEARN_SOURCE: CuratedCourseSource = {
  id: 'openlearn',
  sourceName: 'OpenLearn',
  organizationName: 'The Open University',
  hostname: 'www.open.edu',
  pathPrefix: '/openlearn/',
  enabledEnvironmentVariable: 'OPENLEARN_IMPORT_ENABLED',
  providerEmail: 'openlearn-import@bolivar-opportunities.invalid',
  catalog: [
    {
      externalId: 'introduction-cyber-security',
      title: 'Introducción a la Ciberseguridad: Mantente Seguro en Línea',
      description:
        'Aprende a reconocer amenazas digitales, reducir riesgos y comprender conceptos como malware, seguridad de redes, criptografía y robo de identidad.',
      sourceUrl:
        'https://www.open.edu/openlearn/digital-computing/introduction-cyber-security-stay-safe-online/content-section-overview',
      categories: [
        'Insignia digital gratuita',
        'Constancia de participación',
        'Ciberseguridad',
      ],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
    {
      externalId: 'entrepreneurship-ideas-reality',
      title: 'Emprendimiento: de las Ideas a la Realidad',
      description:
        'Explora cómo desarrollar una idea de negocio, elegir un modelo, evaluar tus capacidades, buscar financiación y planificar el crecimiento mediante casos prácticos.',
      sourceUrl:
        'https://www.open.edu/openlearn/money-business/entrepreneurship-ideas-reality/content-section-overview',
      categories: [
        'Insignia digital gratuita',
        'Constancia de participación',
        'Emprendimiento',
      ],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
    {
      externalId: 'working-in-teams',
      title: 'Trabajo en Equipo',
      description:
        'Fortalece tus habilidades para colaborar en equipos presenciales y virtuales, comunicarte con claridad, resolver conflictos y presentar esta experiencia ante empleadores.',
      sourceUrl:
        'https://www.open.edu/openlearn/money-business/working-teams/content-section-overview',
      categories: [
        'Insignia digital gratuita',
        'Constancia de participación',
        'Habilidades laborales',
      ],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
    {
      externalId: 'career-mentoring-coaching',
      title: 'Mentoría y Coaching Profesional',
      description:
        'Conoce cómo funcionan la mentoría y el coaching profesional, cómo ayudan a cuestionar supuestos y cómo pueden apoyar decisiones y objetivos de carrera.',
      sourceUrl:
        'https://www.open.edu/openlearn/money-business/exploring-career-mentoring-and-coaching/content-section-overview',
      categories: [
        'Insignia digital gratuita',
        'Constancia de participación',
        'Desarrollo profesional',
      ],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
    {
      externalId: 'returning-to-stem',
      title: 'Regresar a una Carrera STEM',
      description:
        'Desarrolla estrategias y habilidades para retomar una carrera en ciencia, tecnología, ingeniería o matemáticas y presentar tu experiencia profesional con confianza.',
      sourceUrl:
        'https://www.open.edu/openlearn/science-maths-technology/returning-stem/content-section-overview',
      categories: [
        'Insignia digital gratuita',
        'Constancia de participación',
        'STEM',
        'Desarrollo profesional',
      ],
      language: 'Inglés',
      lastReviewedAt: '2026-10-11',
    },
  ],
};

export const CURATED_COURSE_SOURCES = [CS50_SOURCE, OPENLEARN_SOURCE];
