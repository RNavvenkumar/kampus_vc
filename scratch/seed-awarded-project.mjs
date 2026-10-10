import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true
});

async function seed() {
  console.log('Seeding awarded project for browser verification...');

  // 1. Register Brand
  const brandRes = await api.post('/auth/register', {
    name: 'Matrix Studios',
    email: 'brand.lead@matrix.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'brand'
  });
  const brandCookie = brandRes.headers['set-cookie'];

  // 2. Create Brief
  const briefRes = await api.post(
    '/brand/briefs',
    {
      title: 'Neon Odyssey 3D Trailer',
      category: '3D Animation & CGI',
      summary: 'Produce a 60-second teaser trailer for an upcoming sci-fi game.',
      description: 'Complete high quality 3D character design, environment, and composited render.',
      requiredSpecialties: ['3D Modeling', 'Unreal Engine 5'],
      creativeTools: ['Unreal Engine', 'Blender'],
      deliverables: ['Character Concepts', '3D Scene Blockout', 'Final 4K Master Video'],
      budgetType: 'fixed',
      budgetMin: 8000,
      budgetMax: 8000,
      currency: 'USD',
      durationWeeks: 4
    },
    { headers: { Cookie: brandCookie } }
  );
  const briefId = briefRes.data.data.id;

  // 3. Publish Brief
  await api.post(`/brand/briefs/${briefId}/publish`, {}, { headers: { Cookie: brandCookie } });

  // 4. Register Creator
  const creatorRes = await api.post('/auth/register', {
    name: 'Kai Vance',
    email: 'kai.vance@renderforge.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'creator'
  });
  const creatorCookie = creatorRes.headers['set-cookie'];

  // 5. Submit Proposal
  const propRes = await api.post(
    '/creator/proposals',
    {
      briefId,
      pitchTitle: 'High-Fidelity UE5 Cinematic Teaser',
      pitchMessage: 'I specialize in real-time UE5 cinematic production with custom Metahuman character rigs.',
      proposedPrice: 8000,
      currency: 'USD',
      deliveryDurationWeeks: 4,
      deliverables: ['Character Concepts', '3D Scene Blockout', 'Final 4K Master Video'],
      milestones: [
        {
          title: 'Character Concept & Level Blockout',
          description: 'High-poly character sculpts and UE5 blockout environment.',
          amount: 3000,
          durationWeeks: 2,
          order: 1
        },
        {
          title: 'Lumen Lighting & Final 4K Master',
          description: 'Nanite lighting passes, Niagara VFX, and master 4K MP4 export.',
          amount: 5000,
          durationWeeks: 2,
          order: 2
        }
      ],
      revisionAllowance: 2,
      isDraft: false
    },
    { headers: { Cookie: creatorCookie } }
  );
  const proposalId = propRes.data.data.id;

  // 6. Brand Accepts Proposal & Awards Project
  const acceptRes = await api.post(`/brand/proposals/${proposalId}/accept`, {}, { headers: { Cookie: brandCookie } });
  const projectId = acceptRes.data.data.project.id;

  console.log('SUCCESS! Seeded Project Details:');
  console.log('Project ID:', projectId);
  console.log('Brand Login: brand.lead@matrix.com / Password123!');
  console.log('Creator Login: kai.vance@renderforge.com / Password123!');
  console.log('Workspace URL: http://localhost:5173/projects/' + projectId);
}

seed().catch((err) => {
  console.error('Seeding failed:', err.response?.data || err.message);
  process.exit(1);
});
