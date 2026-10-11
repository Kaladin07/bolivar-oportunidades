import { PrismaClient, Modality, OpportunityType, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const samples = [
  { slug: 'demo-junior-software-developer', title: 'Demo: Junior Software Developer', type: OpportunityType.EMPLOYMENT, modality: Modality.REMOTE, locationPhysical: null, categories: ['Technology', 'Software'], description: 'Sample listing for local development. Build accessible web features with a remote team. This is not an active job offer.' },
  { slug: 'demo-logistics-internship-cartagena', title: 'Demo: Logistics Internship', type: OpportunityType.INTERNSHIP, modality: Modality.IN_PERSON, locationPhysical: 'Cartagena', categories: ['Logistics'], description: 'Sample listing for local development. Learn inventory coordination and operations in Cartagena. This is not an active internship.' },
  { slug: 'demo-digital-marketing-course', title: 'Demo: Digital Marketing Course', type: OpportunityType.COURSE, modality: Modality.REMOTE, locationPhysical: null, categories: ['Marketing'], description: 'Sample listing for local development. Explore campaign planning, analytics, and content strategy. This is not an active course.' },
  { slug: 'demo-community-scholarship', title: 'Demo: Community Leadership Scholarship', type: OpportunityType.SCHOLARSHIP, modality: Modality.HYBRID, locationPhysical: 'Turbaco', categories: ['Community'], description: 'Sample listing for local development. Support community projects across Bolívar. This is not an active scholarship.' },
  { slug: 'demo-design-assistant', title: 'Demo: Design Assistant', type: OpportunityType.EMPLOYMENT, modality: Modality.HYBRID, locationPhysical: 'Cartagena', categories: ['Design'], description: 'Sample listing for local development. Create visual materials with a small team. This is not an active job offer.' },
  { slug: 'demo-data-analysis-course', title: 'Demo: Introduction to Data Analysis', type: OpportunityType.COURSE, modality: Modality.IN_PERSON, locationPhysical: 'Magangué', categories: ['Technology', 'Data'], description: 'Sample listing for local development. Practice spreadsheets and introductory data analysis. This is not an active course.' },
];

try {
  const provider = await prisma.user.upsert({
    where: { email: 'demo-provider@example.com' },
    update: {},
    create: { email: 'demo-provider@example.com', displayName: 'Demo Organization', passwordHash: await hash(process.env.SEED_PROVIDER_PASSWORD ?? 'DemoPassword123!', 12), role: UserRole.PROVIDER, location: 'Cartagena' },
  });
  for (const sample of samples) {
    await prisma.opportunity.upsert({
      where: { slug: sample.slug },
      update: {},
      create: { slug: sample.slug, title: sample.title, description: sample.description, type: sample.type, modality: sample.modality, locationPhysical: sample.locationPhysical, providerId: provider.id, categories: { connectOrCreate: sample.categories.map((name) => ({ where: { name }, create: { name } })) } },
    });
  }
  console.log(`Seeded ${samples.length} sample opportunities.`);
} finally {
  await prisma.$disconnect();
}
