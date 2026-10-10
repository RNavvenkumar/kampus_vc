import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { hashPassword } from '../utils/password.js';
import { User } from '../models/User.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { BrandProfile } from '../models/BrandProfile.js';
import { CampaignBrief } from '../models/CampaignBrief.js';
import { CampaignProposal } from '../models/CampaignProposal.js';
import { Project } from '../models/Project.js';
import { ProjectSubmission } from '../models/ProjectSubmission.js';
import { ProjectMessage } from '../models/ProjectMessage.js';
import { ProjectActivity } from '../models/ProjectActivity.js';
import { Review } from '../models/Review.js';
import { Payment } from '../models/Payment.js';
import { FinancialLedgerEntry } from '../models/FinancialLedgerEntry.js';
import { Conversation } from '../models/Conversation.js';
import { DirectMessage } from '../models/DirectMessage.js';
import { Notification } from '../models/Notification.js';
import { MediaAsset } from '../models/MediaAsset.js';

export async function runSeed(): Promise<{ message: string; stats: Record<string, number> }> {
  console.log('🌱 Starting medium demo data seed...');

  // 1. Wipe existing data
  await Promise.all([
    User.deleteMany({}),
    CreatorProfile.deleteMany({}),
    BrandProfile.deleteMany({}),
    CampaignBrief.deleteMany({}),
    CampaignProposal.deleteMany({}),
    Project.deleteMany({}),
    ProjectSubmission.deleteMany({}),
    ProjectMessage.deleteMany({}),
    ProjectActivity.deleteMany({}),
    Review.deleteMany({}),
    Payment.deleteMany({}),
    FinancialLedgerEntry.deleteMany({}),
    Conversation.deleteMany({}),
    DirectMessage.deleteMany({}),
    Notification.deleteMany({}),
    MediaAsset.deleteMany({})
  ]);

  console.log('🧹 Cleaned existing database collections.');

  const defaultPasswordHash = await hashPassword('Password123!');

  // 2. Create Brands
  const nikeUser = await User.create({
    name: 'Marcus Sterling',
    email: 'brand@nike.com',
    passwordHash: defaultPasswordHash,
    role: 'brand',
    accountStatus: 'active',
    emailVerified: true,
    onboardingStatus: 'completed',
    onboardingStep: 3,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  });

  const nikeProfile = await BrandProfile.create({
    userId: nikeUser._id,
    companyName: 'Nike Virtual Studios',
    companySlug: 'nike-virtual',
    industry: 'Sportswear & Digital Fashion',
    companySize: '1000+',
    website: 'https://nike.com/virtual',
    description: 'Pioneering next-generation digital athletic footwear, interactive generative apparel, and Web3 virtual merchandise for global athletes.',
    logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80',
    location: 'Beaverton, OR, United States',
    contactName: 'Marcus Sterling',
    contactRole: 'Global Head of Creative Production',
    profileCompletion: 100
  });

  const redbullUser = await User.create({
    name: 'Sven Lindqvist',
    email: 'partners@redbull.com',
    passwordHash: defaultPasswordHash,
    role: 'brand',
    accountStatus: 'active',
    emailVerified: true,
    onboardingStatus: 'completed',
    onboardingStep: 3,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
  });

  await BrandProfile.create({
    userId: redbullUser._id,
    companyName: 'Red Bull Media House',
    companySlug: 'redbull-media',
    industry: 'Action Sports & Media Production',
    companySize: '201-1000',
    website: 'https://redbull.com',
    description: 'Award-winning global media company producing extreme sports documentaries, high-octane VFX reels, and cinematic storytelling.',
    logoUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200&auto=format&fit=crop&q=80',
    location: 'Salzburg, Austria',
    contactName: 'Sven Lindqvist',
    contactRole: 'Executive Producer',
    profileCompletion: 100
  });

  // 3. Create Hero Creator (Elena Rostova)
  const elenaUser = await User.create({
    name: 'Elena Rostova',
    email: 'creator@kampus.vc',
    passwordHash: defaultPasswordHash,
    role: 'creator',
    accountStatus: 'active',
    emailVerified: true,
    onboardingStatus: 'completed',
    onboardingStep: 3,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  });

  const elenaProfile = await CreatorProfile.create({
    userId: elenaUser._id,
    displayName: 'Elena Rostova',
    username: 'elenarostova',
    headline: 'Senior 3D Motion Designer & AI Generative Art Director',
    biography: 'Crafting hyper-realistic 3D CGI visuals, holographic product teasers, and unreal engine realtime simulations for top-tier apparel and tech brands. 8+ years collaborating with global sportswear giants.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
    specialties: ['3D Animation', 'Motion Graphics', 'Generative AI', 'VFX', 'Brand Identity'],
    creativeTools: ['Cinema 4D', 'Unreal Engine 5', 'Blender', 'Octane Render', 'Midjourney', 'After Effects'],
    experienceLevel: 'expert',
    location: 'Berlin, Germany / Remote',
    website: 'https://elenarostova.design',
    socialLinks: {
      twitter: 'https://x.com/elena_rostova',
      instagram: 'https://instagram.com/elena.3d',
      behance: 'https://behance.net/elenarostova'
    },
    portfolio: [
      {
        id: 'port-1',
        title: 'Nike Air Max 2026: Cyber Kinetic Teaser',
        description: '4K procedural particle animation and clay-to-chrome materials turnaround.',
        category: '3D Animation',
        tags: ['Footwear', 'CGI', 'Octane', 'Cinema 4D'],
        creativeTools: ['Cinema 4D', 'Octane Render', 'After Effects'],
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
        clientName: 'Nike Virtual Studios',
        isFeatured: true,
        displayOrder: 1,
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'port-2',
        title: 'Aura Holographic Soundscape',
        description: 'Real-time interactive audio-visualizer rendered in Unreal Engine 5 with Niagara fluids.',
        category: 'Generative AI',
        tags: ['Audio Visualizer', 'UE5', 'Spatial'],
        creativeTools: ['Unreal Engine 5', 'Niagara', 'TouchDesigner'],
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
        clientName: 'Spotify Labs',
        isFeatured: true,
        displayOrder: 2,
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'port-3',
        title: 'Neo-Tokyo Cyberpunk Apparel Capsule',
        description: 'Digital cloth simulation and clo3D pattern engineering for virtual fashion runway.',
        category: 'Virtual Fashion',
        tags: ['Fashion', 'Clo3D', 'Cyberpunk'],
        creativeTools: ['Clo3D', 'Blender', 'Substance Painter'],
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&auto=format&fit=crop&q=80',
        clientName: 'Apex Fashion',
        isFeatured: false,
        displayOrder: 3,
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    services: [
      {
        id: 'srv-1',
        title: '3D Product Teaser (15-30s)',
        description: 'High-impact 4K social cut with dynamic camera motions, lighting setups, and sound design.',
        category: '3D Animation',
        deliverables: ['1x 30s 4K 16:9 Master', '1x 9:16 Vertical Cut', 'Project Source Files'],
        revisions: 2,
        price: 1500,
        currency: 'USD',
        turnaroundDays: 7,
        packageTier: 'starter',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'srv-2',
        title: 'Full 3D Commercial Campaign (60s)',
        description: 'Complete commercial production from storyboarding, clay turnarounds, lighting, to final color grading.',
        category: '3D Animation',
        deliverables: ['1x 60s 4K Master Commercial', '3x Social Cutdowns (15s)', 'Color Grading Master', 'Lossless Audio Stems'],
        revisions: 3,
        price: 3800,
        currency: 'USD',
        turnaroundDays: 14,
        packageTier: 'standard',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    availabilityStatus: 'available_now',
    averageRating: 5.0,
    totalReviews: 2,
    completedProjectsCount: 2,
    profileCompletion: 100
  });

  // 4. Create 3 other diverse creators for talent search
  const creatorsSeedData = [
    {
      name: 'Marcus Vance',
      email: 'marcus@kampus.vc',
      username: 'marcusvance',
      headline: 'Unreal Engine 5 Real-Time Virtual Production Director',
      bio: 'Pioneering in-camera VFX, LED volume environments, and real-time cinematics for major commercial campaigns.',
      specialties: ['Virtual Production', 'Unreal Engine 5', 'VFX', 'Cinematography'],
      tools: ['Unreal Engine 5', 'Houdini', 'Nuke', 'DaVinci Resolve'],
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
      portTitle: 'Solaris Sci-Fi Cinematic Trailer',
      portImg: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80'
    },
    {
      name: 'Aria Chen',
      email: 'aria@kampus.vc',
      username: 'ariachen',
      headline: 'Cyberpunk Concept Artist & Generative Fashion Designer',
      bio: 'Blending generative diffusion pipelines with precision 3D tailoring to build next-era aesthetic worlds.',
      specialties: ['Concept Art', 'Virtual Fashion', 'Generative AI', 'Character Design'],
      tools: ['Midjourney', 'Stable Diffusion', 'Blender', 'Photoshop'],
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
      portTitle: 'Neo-Hong Kong 2099 Character Suite',
      portImg: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80'
    },
    {
      name: 'Devon Reed',
      email: 'devon@kampus.vc',
      username: 'devonreed',
      headline: 'Spatial Audio Engineer & Commercial Sound Designer',
      bio: 'Grammy-nominated sound designer creating immersive Dolby Atmos mixes and kinetic foley for luxury brands.',
      specialties: ['Sound Design', 'Dolby Atmos', 'Spatial Audio', 'Music Production'],
      tools: ['Ableton Live', 'Pro Tools', 'Logic Pro', 'FabFilter'],
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600&auto=format&fit=crop&q=80',
      portTitle: 'Porsche Taycan EV Sound Identity',
      portImg: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80'
    }
  ];

  for (const c of creatorsSeedData) {
    const u = await User.create({
      name: c.name,
      email: c.email,
      passwordHash: defaultPasswordHash,
      role: 'creator',
      accountStatus: 'active',
      emailVerified: true,
      onboardingStatus: 'completed',
      onboardingStep: 3,
      avatarUrl: c.avatar
    });

    await CreatorProfile.create({
      userId: u._id,
      displayName: c.name,
      username: c.username,
      headline: c.headline,
      biography: c.bio,
      avatarUrl: c.avatar,
      coverUrl: c.cover,
      specialties: c.specialties,
      creativeTools: c.tools,
      experienceLevel: 'advanced',
      location: 'Los Angeles, CA / Remote',
      availabilityStatus: 'available_now',
      averageRating: 4.9,
      totalReviews: 3,
      completedProjectsCount: 3,
      profileCompletion: 95,
      portfolio: [
        {
          id: `port-${c.username}`,
          title: c.portTitle,
          description: 'High-concept creative project produced for international brand campaign.',
          category: c.specialties[0],
          tags: c.specialties,
          creativeTools: c.tools,
          mediaType: 'image',
          mediaUrl: c.portImg,
          thumbnailUrl: c.portImg,
          isFeatured: true,
          displayOrder: 1,
          visibility: 'public',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      services: [
        {
          id: `srv-${c.username}`,
          title: `${c.specialties[0]} Production Package`,
          description: 'Turnkey creative execution with complete project stems and licensing.',
          category: c.specialties[0],
          deliverables: ['Production Master', 'Source Assets', 'Commercial Rights'],
          revisions: 2,
          price: 2200,
          currency: 'USD',
          turnaroundDays: 10,
          packageTier: 'standard',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });
  }

  // 5. Create Campaign Briefs
  const heroBrief = await CampaignBrief.create({
    brandId: nikeUser._id,
    companyName: 'Nike Virtual Studios',
    companySlug: 'nike-virtual',
    title: 'Nike Air Max 2027: Hyper-Motion CGI Reveal',
    slug: 'nike-air-max-2027-hyper-motion',
    summary: 'Seeking world-class 3D motion designers to produce a 60-second photorealistic CGI commercial for the upcoming Air Max 2027 launch.',
    description: `We are debuting the revolutionary Air Max 2027 footwear line featuring generative lattice cushioning and dynamic color-shift materials.

We require a visionary 3D Director to craft:
1. Milestone #1: 3D Clay turnaround & camera blocking.
2. Milestone #2: Photorealistic material shaders, color-shift passes, and fluid simulations.
3. Milestone #3: Final 4K 60fps master render with synchronized sound design.

Target Audience: Global sneakerheads, digital collectors, and lifestyle athletes.`,
    category: '3D Animation',
    requiredSpecialties: ['3D Animation', 'Motion Graphics', 'VFX'],
    creativeTools: ['Cinema 4D', 'Unreal Engine 5', 'Octane Render'],
    deliverables: ['1x 60s 4K Master Render (ProRes 422)', '2x 15s Vertical Social Cuts (9:16)', 'Full 3D Asset Source Stems'],
    budgetType: 'fixed',
    budgetMin: 4500,
    budgetMax: 4500,
    currency: 'USD',
    durationWeeks: 3,
    engagementType: 'milestone',
    locationPreference: 'remote',
    experienceLevel: 'expert',
    referenceUrls: ['https://nike.com', 'https://vimeo.com/channels/motiongraphics'],
    status: 'awarded',
    publishedAt: new Date(Date.now() - 7 * 86400000),
    awardedAt: new Date(Date.now() - 3 * 86400000),
    awardedCreatorId: elenaUser._id
  });

  await CampaignBrief.create({
    brandId: redbullUser._id,
    companyName: 'Red Bull Media House',
    companySlug: 'redbull-media',
    title: 'Red Bull High-Altitude FPV Drone Reel: AI VFX Grading',
    slug: 'redbull-high-altitude-fpv-drone',
    summary: 'Looking for a VFX director to composite neural speed trails and hyper-kinetic particle overlays on high-speed Alps drone footage.',
    description: 'We shot high-speed FPV footage of world-class wingsuit flyers through the Swiss Alps. We need cutting-edge VFX treatments, speed lines, and dynamic sound design.',
    category: 'VFX & Post',
    requiredSpecialties: ['VFX', 'Motion Graphics', 'Generative AI'],
    creativeTools: ['After Effects', 'Houdini', 'DaVinci Resolve'],
    deliverables: ['4K Master Reel (45s)', 'Vertical Cut (30s)'],
    budgetType: 'fixed',
    budgetMin: 3200,
    budgetMax: 3200,
    currency: 'USD',
    durationWeeks: 2,
    engagementType: 'milestone',
    locationPreference: 'remote',
    experienceLevel: 'advanced',
    status: 'published',
    publishedAt: new Date(Date.now() - 2 * 86400000)
  });

  await CampaignBrief.create({
    brandId: nikeUser._id,
    companyName: 'Nike Virtual Studios',
    companySlug: 'nike-virtual',
    title: 'Cyberpunk Neo-Tokyo Fashion Week: Hologram Keyframes',
    slug: 'cyberpunk-neo-tokyo-fashion-week',
    summary: 'Create 5 interactive 3D holographic digital fashion lookbook concepts for virtual runway showcase.',
    description: 'Designing virtual garments that react to atmospheric lighting and audio frequencies for an upcoming Tokyo digital fashion week exhibition.',
    category: 'Virtual Fashion',
    requiredSpecialties: ['Virtual Fashion', '3D Animation', 'Concept Art'],
    creativeTools: ['Clo3D', 'Blender', 'Unreal Engine 5'],
    deliverables: ['5x High-Res Holographic Keyframes', '1x 30s Runway Loop'],
    budgetType: 'range',
    budgetMin: 4000,
    budgetMax: 5500,
    currency: 'USD',
    durationWeeks: 3,
    engagementType: 'milestone',
    locationPreference: 'remote',
    experienceLevel: 'advanced',
    status: 'published',
    publishedAt: new Date(Date.now() - 1 * 86400000)
  });

  // 6. Create Accepted Campaign Proposal for Hero Project
  const heroProposal = await CampaignProposal.create({
    creatorId: elenaUser._id,
    briefId: heroBrief._id,
    brandId: nikeUser._id,
    proposalReference: 'PROP-NIKE-2027',
    pitchTitle: 'Hyper-Realistic Photorealism & Procedural Lattice Simulations',
    pitchMessage: `Hello Marcus and the Nike Virtual Studios team!

Having led 3D CGI direction on previous digital footwear campaigns, I am thrilled to submit our proposal for the Air Max 2027. We will utilize Cinema 4D and Octane Render with bespoke procedural particle systems to highlight the dual-density air chamber and dynamic material transitions.

Our structured 3-milestone pipeline ensures complete transparency and rapid feedback turnarounds.`,
    referencedPortfolioItemIds: ['port-1'],
    proposedPrice: 4500,
    currency: 'USD',
    deliveryDurationWeeks: 3,
    deliverables: ['1x 60s 4K Master Render (ProRes 422)', '2x 15s Vertical Social Cuts (9:16)', 'Full 3D Asset Source Stems'],
    milestones: [
      {
        order: 1,
        title: 'Milestone #1: 3D Clay Turnaround & Lighting Concept',
        description: 'Complete 3D model blocking, camera choreography, and base lighting pass.',
        amount: 1500,
        durationWeeks: 1
      },
      {
        order: 2,
        title: 'Milestone #2: 4K Color Grade & Particle Simulation',
        description: 'High-fidelity material shaders, lattice fluid dynamics, and dynamic color-shift texturing.',
        amount: 1500,
        durationWeeks: 1
      },
      {
        order: 3,
        title: 'Milestone #3: Final 60s 4K Master Render & Sound Design',
        description: 'Final 4K 60fps master delivery, sound effects mix, and vertical cutdowns.',
        amount: 1500,
        durationWeeks: 1
      }
    ],
    revisionAllowance: 2,
    status: 'accepted',
    submittedAt: new Date(Date.now() - 5 * 86400000),
    decisionAt: new Date(Date.now() - 3 * 86400000),
    revisionNumber: 1
  });

  // Link proposal to brief
  heroBrief.awardedProposalId = heroProposal._id;
  await heroBrief.save();

  // 7. Create Active Hero Working Project
  const activeProject = await Project.create({
    projectReference: 'PRJ-NIKE-2027',
    briefId: heroBrief._id,
    proposalId: heroProposal._id,
    creatorId: elenaUser._id,
    brandId: nikeUser._id,
    title: 'Nike Air Max 2027: Hyper-Motion CGI Reveal',
    agreedDescription: 'Full 3D commercial production for the Air Max 2027 reveal across 3 structured milestones.',
    agreedDeliverables: ['1x 60s 4K Master Render (ProRes 422)', '2x 15s Vertical Social Cuts (9:16)', 'Full 3D Asset Source Stems'],
    agreedPrice: 4500,
    currency: 'USD',
    deliveryDurationWeeks: 3,
    status: 'in_progress',
    revisionAllowance: 2,
    milestones: [
      {
        title: 'Milestone #1: 3D Clay Turnaround & Lighting Concept',
        description: 'Complete 3D geometry turnaround, camera motions, and studio lighting setup ready for brand client review.',
        amount: 1500,
        durationWeeks: 1,
        order: 1,
        deliverables: ['3D Clay Render Turnaround', 'Camera Motion Layout', 'Keyframe Contact Sheet'],
        dueDate: new Date(Date.now() + 4 * 86400000),
        status: 'in_progress',
        startedAt: new Date(Date.now() - 2 * 86400000)
      },
      {
        title: 'Milestone #2: 4K Color Grade & Particle Simulation',
        description: 'Color-shift shaders, procedural dust particles, and lattice cushioning dynamics.',
        amount: 1500,
        durationWeeks: 1,
        order: 2,
        deliverables: ['Color Graded Pass', 'Particle Simulation Stems'],
        dueDate: new Date(Date.now() + 11 * 86400000),
        status: 'not_started'
      },
      {
        title: 'Milestone #3: Final 60s 4K Master Render & Sound Design',
        description: 'Full 4K 60fps master delivery, sound effects mix, and vertical cutdowns.',
        amount: 1500,
        durationWeeks: 1,
        order: 3,
        deliverables: ['4K Master Commercial', 'Vertical Social Cuts', 'Clean Audio Stems'],
        dueDate: new Date(Date.now() + 18 * 86400000),
        status: 'not_started'
      }
    ],
    agreementSnapshot: {
      agreedPrice: 4500,
      currency: 'USD',
      deliveryDurationWeeks: 3,
      deliverables: ['1x 60s 4K Master Render (ProRes 422)', '2x 15s Vertical Social Cuts (9:16)', 'Full 3D Asset Source Stems'],
      milestones: [
        {
          order: 1,
          title: 'Milestone #1: 3D Clay Turnaround & Lighting Concept',
          amount: 1500,
          durationWeeks: 1
        },
        {
          order: 2,
          title: 'Milestone #2: 4K Color Grade & Particle Simulation',
          amount: 1500,
          durationWeeks: 1
        },
        {
          order: 3,
          title: 'Milestone #3: Final 60s 4K Master Render & Sound Design',
          amount: 1500,
          durationWeeks: 1
        }
      ],
      revisionAllowance: 2,
      pitchMessage: heroProposal.pitchMessage,
      creatorId: elenaUser._id,
      brandId: nikeUser._id,
      briefId: heroBrief._id,
      acceptedAt: new Date(),
      proposalVersion: 1
    }
  });

  const milestone1 = activeProject.milestones[0];

  // 8. Create Funded Escrow Payment for Milestone #1
  const payment1 = await Payment.create({
    paymentReference: 'PAY-ESCROW-M1-NIKE',
    projectId: activeProject._id,
    milestoneId: milestone1._id,
    brandId: nikeUser._id,
    creatorId: elenaUser._id,
    amountMinor: 150000, // $1,500.00
    currency: 'USD',
    paymentPurpose: 'milestone_payment',
    milestoneOrder: 1,
    milestoneTitle: milestone1.title,
    gateway: 'razorpay',
    gatewayOrderId: 'order_mock_nike_m1',
    gatewayPaymentId: 'pay_mock_nike_m1_escrow',
    status: 'captured',
    idempotencyKey: 'idemp-nike-m1-captured',
    capturedAmountMinor: 150000,
    refundedAmountMinor: 0,
    remainingRefundableAmountMinor: 150000,
    capturedAt: new Date(Date.now() - 2 * 86400000),
    receiptNumber: 'RCP-NIKE-2027-01'
  });

  // 9. Financial Ledger Entries (Populates dashboard columns!)
  await FinancialLedgerEntry.create({
    entryReference: 'LEDGER-ESCROW-HOLD-M1',
    idempotencyKey: 'idemp-ledger-escrow-hold-m1',
    projectId: activeProject._id,
    paymentId: payment1._id,
    entryType: 'payment_captured',
    account: 'escrow_hold',
    debitMinor: 150000, // $1,500.00 held in escrow
    creditMinor: 0,
    currency: 'USD',
    description: 'Secured Escrow Deposit for Milestone #1 (3D Clay Turnaround)',
    immutable: true,
    sequence: 1
  });

  await FinancialLedgerEntry.create({
    entryReference: 'LEDGER-CREATOR-PAYABLE-M1',
    idempotencyKey: 'idemp-ledger-creator-payable-m1',
    projectId: activeProject._id,
    paymentId: payment1._id,
    entryType: 'creator_payable',
    account: 'creator_earnings',
    debitMinor: 0,
    creditMinor: 135000, // $1,350.00 payout earmarked for creator
    currency: 'USD',
    description: 'Creator Payout Allocation (90% after platform escrow processing)',
    immutable: true,
    sequence: 2
  });

  await FinancialLedgerEntry.create({
    entryReference: 'LEDGER-PLATFORM-FEE-M1',
    idempotencyKey: 'idemp-ledger-platform-fee-m1',
    projectId: activeProject._id,
    paymentId: payment1._id,
    entryType: 'platform_fee',
    account: 'platform_revenue',
    debitMinor: 0,
    creditMinor: 15000, // $150.00
    currency: 'USD',
    description: 'Kampus VC Platform Escrow Processing Fee (10%)',
    immutable: true,
    sequence: 3
  });

  // 10. Project Messages (Active Collaboration Thread)
  await ProjectMessage.create({
    projectId: activeProject._id,
    senderId: nikeUser._id,
    senderRole: 'brand',
    content: 'Welcome aboard Elena! We are thrilled to kick off the Air Max 2027 production. The escrow funds for Milestone #1 have been secured in the vault. Feel free to submit the clay turnaround here once ready!',
    attachments: [],
    isEdited: false,
    createdAt: new Date(Date.now() - 2 * 86400000)
  });

  await ProjectMessage.create({
    projectId: activeProject._id,
    senderId: elenaUser._id,
    senderRole: 'creator',
    content: 'Thank you Marcus! The geometry layout is looking incredible. I have locked the camera move and am wrapping up the initial high-fidelity lighting tests. I will upload the deliverable package to Milestone #1 shortly.',
    attachments: [],
    isEdited: false,
    createdAt: new Date(Date.now() - 1 * 86400000)
  });

  // 11. Completed Past Projects & Verified Reviews
  const completedProject1 = await Project.create({
    projectReference: 'PRJ-NIKE-PULSE-2025',
    briefId: heroBrief._id,
    proposalId: heroProposal._id,
    creatorId: elenaUser._id,
    brandId: nikeUser._id,
    title: 'Nike Air Max Pulse 2025: Holographic Social Teaser',
    agreedDescription: 'Full 3D holographic teaser production completed with verified approval.',
    agreedDeliverables: ['1x 30s 4K Master', 'Social Cutdowns'],
    agreedPrice: 2800,
    currency: 'USD',
    deliveryDurationWeeks: 2,
    status: 'completed',
    revisionAllowance: 2,
    milestones: [
      {
        title: 'Milestone #1: Complete CGI Production',
        description: 'Turnkey 3D generation and color master.',
        amount: 2800,
        durationWeeks: 2,
        order: 1,
        deliverables: ['4K Master Commercial'],
        status: 'approved',
        startedAt: new Date(Date.now() - 30 * 86400000),
        approvedAt: new Date(Date.now() - 14 * 86400000)
      }
    ],
    agreementSnapshot: {
      agreedPrice: 2800,
      currency: 'USD',
      deliveryDurationWeeks: 2,
      deliverables: ['1x 30s 4K Master'],
      milestones: [{ order: 1, title: 'Milestone #1: Complete CGI Production', amount: 2800, durationWeeks: 2 }],
      revisionAllowance: 2,
      pitchMessage: 'Completed project',
      creatorId: elenaUser._id,
      brandId: nikeUser._id,
      briefId: heroBrief._id,
      acceptedAt: new Date(Date.now() - 30 * 86400000),
      proposalVersion: 1
    }
  });

  // Review 1 (Nike -> Elena)
  await Review.create({
    projectId: completedProject1._id,
    milestoneId: completedProject1.milestones[0]._id,
    brandId: nikeUser._id,
    creatorId: elenaUser._id,
    rating: 5,
    review: 'Elena delivered a world-class 3D sequence ahead of schedule. The lighting and dynamic cloth simulations blew our marketing leadership away. Looking forward to many more collaborations!',
    projectTitle: 'Nike Air Max Pulse 2025: Holographic Social Teaser',
    brandName: 'Nike Virtual Studios',
    brandAvatar: nikeProfile.logoUrl,
    creatorName: 'Elena Rostova',
    creatorAvatar: elenaProfile.avatarUrl,
    createdAt: new Date(Date.now() - 14 * 86400000)
  });

  const completedProject2 = await Project.create({
    projectReference: 'PRJ-REDBULL-APEX',
    briefId: heroBrief._id,
    proposalId: heroProposal._id,
    creatorId: elenaUser._id,
    brandId: redbullUser._id,
    title: 'Red Bull Apex Cyber-Jacket Reveal',
    agreedDescription: 'Virtual garment 3D animation and dynamic turnaround.',
    agreedDeliverables: ['1x 30s 4K Teaser'],
    agreedPrice: 3200,
    currency: 'USD',
    deliveryDurationWeeks: 2,
    status: 'completed',
    revisionAllowance: 2,
    milestones: [
      {
        title: 'Milestone #1: Full Visual Deliverable',
        description: 'Complete 3D CGI animation.',
        amount: 3200,
        durationWeeks: 2,
        order: 1,
        deliverables: ['4K Master'],
        status: 'approved',
        startedAt: new Date(Date.now() - 45 * 86400000),
        approvedAt: new Date(Date.now() - 25 * 86400000)
      }
    ],
    agreementSnapshot: {
      agreedPrice: 3200,
      currency: 'USD',
      deliveryDurationWeeks: 2,
      deliverables: ['1x 30s 4K Teaser'],
      milestones: [{ order: 1, title: 'Milestone #1: Full Visual Deliverable', amount: 3200, durationWeeks: 2 }],
      revisionAllowance: 2,
      pitchMessage: 'Completed project',
      creatorId: elenaUser._id,
      brandId: redbullUser._id,
      briefId: heroBrief._id,
      acceptedAt: new Date(Date.now() - 45 * 86400000),
      proposalVersion: 1
    }
  });

  // Review 2 (Red Bull -> Elena)
  await Review.create({
    projectId: completedProject2._id,
    milestoneId: completedProject2.milestones[0]._id,
    brandId: redbullUser._id,
    creatorId: elenaUser._id,
    rating: 5,
    review: 'Stunning visual fidelity and instant communication throughout the entire milestone lifecycle. Elena sets the gold standard on Kampus VC.',
    projectTitle: 'Red Bull Apex Cyber-Jacket Reveal',
    brandName: 'Red Bull Media House',
    brandAvatar: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200&auto=format&fit=crop&q=80',
    creatorName: 'Elena Rostova',
    creatorAvatar: elenaProfile.avatarUrl,
    createdAt: new Date(Date.now() - 25 * 86400000)
  });

  console.log('✅ Demo database seeded successfully!');

  return {
    message: 'Realistic demo dataset populated successfully',
    stats: {
      brands: 2,
      creators: 4,
      briefs: 3,
      projects: 3,
      reviews: 2,
      ledgerEntries: 3
    }
  };
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  mongoose.connect(env.MONGODB_URI)
    .then(async () => {
      console.log('Connected to MongoDB. Running seed...');
      await runSeed();
      await mongoose.disconnect();
      console.log('Seed completed and disconnected.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed execution error:', err);
      process.exit(1);
    });
}
