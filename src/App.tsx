import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import AdminDashboard from './components/AdminDashboard';
import DistributorDashboard from './components/DistributorDashboard';
import BranchOperatorDashboard from './components/BranchOperatorDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import MobileStockistDashboard from './components/MobileStockistDashboard';
import FrontDeskDashboard from './components/FrontDeskDashboard';
import {
  Leaf,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Award,
  Sparkles,
  CheckCircle2,
  Play,
  Mail,
  Phone,
  MapPin,
  Lock,
  User,
  Eye,
  EyeOff,
  ChevronRight,
  ExternalLink,
  Sun,
  Droplets,
  HeartHandshake,
  Send,
  Building2,
  Check,
  Scale,
  Sprout,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
} from 'lucide-react';

// ============================================================================
// EDITABLE BRAND & CONTENT CONFIGURATION — AMANAH PROJECT SYSTEM
// Update these objects to easily customize initiatives, media, and company info.
// ============================================================================

const BRAND_CONFIG = {
  name: 'AMANAH',
  subtitle: 'Distribution & Marketing Co.',
  tagline: 'Building Opportunities • Empowering Communities',
  foundedYear: '2016',
  logoUrl:
    'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/logo/logo/logo.jpg',
  bannerUrl:
    'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/banner/Gemini_Generated_Image_2mzmh32mzmh32mzm.jpg',
  email: 'concierge@amanahproject.com',
  phone: '+63 (33) 555-0194',
  address: 'Suite 402, Amanah Heritage Center, Mandurriao, Iloilo City 5000',
  socials: {
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    youtube: 'https://youtube.com',
    linkedin: 'https://linkedin.com',
  },
};

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  tagline: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  badge: string;
  servingSize: string;
  features: string[];
  usage: string;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
}

interface MediaItem {
  id: string;
  type: 'video' | 'photo';
  category: string;
  title: string;
  duration?: string;
  thumbnail: string;
  youtubeId?: string;
  videoUrl?: string;
  description: string;
}

const PRODUCTS_DATA: ProductItem[] = [
  {
    id: 'amanah-glutagen-cee',
    name: 'Amanah Glutagen Cee (3-in-1 Beauty & Wellness)',
    category: 'Glutathione • Collagen • Sodium Ascorbate',
    price: 600,
    tagline: '3-in-1 antioxidant, skin hydration, and collagen formation daily capsule support.',
    shortDescription:
      'Formulated with Glutathione, Oral Collagen, and Sodium Ascorbate (Vitamin C) to support antioxidant defense, skin elasticity, and healthy daily radiance.',
    fullDescription:
      'Amanah Glutagen Cee unites three synergistic beauty and cellular wellness nutrients in a convenient 500mg capsule format. Glutathione supports the body’s defense against oxidative stress, collagen supports skin hydration and elasticity, and Sodium Ascorbate supports normal collagen formation and antioxidant protection.',
    image:
      'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_erqnc3erqnc3erqn.jpg',
    badge: '3-in-1 Beauty Support',
    servingSize: '60 Capsules • 500mg (Net Wt. 15g)',
    features: [
      'Antioxidant Support with Glutathione',
      'Skin Hydration & Elasticity Support with Collagen',
      'Nutritional Support for Healthy Skin with Sodium Ascorbate',
      'Informed by published nutritional & clinical ingredient research',
    ],
    usage: 'Take 1–2 capsules daily with water or as directed by your healthcare professional.',
  },
  {
    id: 'amanah-baskug-coffee',
    name: 'Baskug Herbal Coffee for Men',
    category: 'Herbal Wellness • Daily Vitality • Active Lifestyle',
    price: 450,
    tagline: 'Tongkat Ali, Maca Root, and Agaricus Blazei Murrill complete men’s vitality coffee formula.',
    shortDescription:
      'A rich functional herbal coffee blend crafted with Tongkat Ali, Maca, and Agaricus Blazei Murrill to support daily vitality, energy, and an active lifestyle.',
    fullDescription:
      'Clinically inspired and formulated to provide comprehensive daily wellness for men, Baskug Coffee combines three renowned botanical ingredients—Tongkat Ali, Maca Root, and Agaricus Blazei Murrill—into an invigorating daily coffee ritual supporting stamina, active performance, and antioxidant balance.',
    image:
      'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_jybv4xjybv4xjybv.jpg',
    badge: 'Men’s Vitality Formula',
    servingSize: '10 Sachets per Pouch',
    features: [
      'Powered by Tongkat Ali, Maca Root & Agaricus Blazei Murrill',
      'Supports daily vitality, stamina, and an active lifestyle',
      'Botanical nutritional & antioxidant support',
      'Convenient single-serve functional coffee sachets',
    ],
    usage: 'Empty 1 sachet into a cup of hot water, stir well, and enjoy daily.',
  },
  {
    id: 'amanah-herbal-oil',
    name: 'Amanah Cooling Herbal Oil',
    category: 'Topical Comfort • Cooling Menthol Relief',
    price: 180,
    tagline: 'Powered by Menthol, Camphor, Eucalyptus, and Cloves for soothing everyday massage.',
    shortDescription:
      'Your everyday herbal massage companion delivering a refreshing cooling menthol sensation for muscle and body comfort.',
    fullDescription:
      'Amanah Herbal Oil combines time-honored aromatic botanicals—Menthol, Camphor, Eucalyptus, and Cloves—to deliver an immediate cooling, invigorating sensation ideal for soothing massage and everyday muscle or body discomfort.',
    image:
      'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_mjmdqumjmdqumjmd.jpg',
    badge: 'Cooling Herbal Relief',
    servingSize: 'Available in 10ml & 60ml Bottles',
    features: [
      'Refreshing menthol cooling comfort sensation',
      'Ideal for soothing massage and everyday muscle comfort',
      'Infused with Eucalyptus, Camphor & Clove botanicals',
      'Fast-absorbing, non-greasy aromatic herbal feel',
    ],
    usage: 'Apply a generous amount onto desired area and massage gently until absorbed. For external use only.',
  },
  {
    id: 'amanah-barakah-coffee',
    name: 'Barakah Green Coffee Mix',
    category: 'Green Energy • Daily Wellness & Metabolism',
    price: 450,
    tagline: 'Chlorogenic-acid-rich Green Arabica Coffee, L-Carnitine, and Whole-Grain Barley.',
    shortDescription:
      'A convenient daily wellness drink combining Green Arabica Coffee extract, L-Carnitine, and nutrient-rich Barley to support active energy metabolism.',
    fullDescription:
      'Barakah Green Coffee Mix blends unroasted Green Arabica Coffee beans—naturally rich in chlorogenic acids—with L-Carnitine for fatty-acid transport and whole-grain Barley for dietary fiber and daily wellness balance.',
    image:
      'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_s9qnxps9qnxps9qn.jpg',
    badge: 'Green Energy Mix',
    servingSize: '10 Sachets • Net Wt. 210g (21g x 10)',
    features: [
      'Chlorogenic-acid-rich Green Arabica Coffee Extract',
      'Enriched with L-Carnitine to support energy metabolism',
      'Fortified with whole-grain Barley, Garcinia, Green Tea & Mangosteen',
      'No artificial colors or preservatives',
    ],
    usage: 'Dissolve 1 sachet in 150ml–180ml of hot or warm water, stir thoroughly, and enjoy.',
  },
  {
    id: 'amanah-herbal-rub',
    name: 'Amanah Herbal Rub',
    category: 'Cooling • Soothing • Herbal Comfort Balm',
    price: 125,
    tagline: 'Menthol, Camphor, Eucalyptus, and Clove soothing topical balm for localized relief.',
    shortDescription:
      'A comforting topical herbal balm formulated with Menthol, Camphor, Eucalyptus, and Clove to ease everyday muscle tension and provide cooling-warming sensory relief.',
    fullDescription:
      'Designed for targeted topical application, Amanah Herbal Rub brings together Menthol, Camphor, Eucalyptus oil, and traditional Clove extract to provide fast-acting cooling and warming sensory relief for tired shoulders, knees, back, and muscles.',
    image:
      'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_toe9wxtoe9wxtoe9.jpg',
    badge: 'Soothing Topical Rub',
    servingSize: 'Travel & Family Jar Formats',
    features: [
      'Dual cooling & warming sensory comfort with Menthol & Camphor',
      'Aromatic refreshment from Eucalyptus & Clove botanicals',
      'Targeted soothing comfort for everyday muscle fatigue',
      'Smooth balm texture easy to apply anytime, anywhere',
    ],
    usage: 'Rub gently onto temples, neck, shoulders, or sore muscles as needed. For external use only.',
  },
  {
    id: 'amanah-serpentina',
    name: 'Amanah Serpentina (Andrographis paniculata)',
    category: 'Respiratory & Herbal Wellness Support',
    price: 600,
    tagline: '500mg pure Andrographis paniculata leaf capsules for seasonal & antioxidant support.',
    shortDescription:
      'Nature-inspired herbal capsules powered by Andrographis paniculata, traditionally and clinically researched for respiratory and antioxidant wellness.',
    fullDescription:
      'Amanah Serpentina harnesses standardized Andrographis paniculata—a revered botanical rich in bioactive andrographolides—to offer convenient daily plant-based respiratory, immune, and antioxidant wellness support.',
    image:
      'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_ut2yd8ut2yd8ut2y.jpg',
    badge: '100% Natural Herbal',
    servingSize: '50 Capsules • 500mg (Net Wt. 25g)',
    features: [
      'Powered by Andrographis paniculata (rich in andrographolides)',
      'Supports respiratory & seasonal upper-tract wellness',
      'Natural plant-based antioxidant support',
      '50 easy-to-swallow 500mg vegetarian-friendly capsules',
    ],
    usage: 'Take 1 capsule daily with water after meals, or consult a qualified healthcare professional.',
  },
  {
    id: 'amanah-spirulina',
    name: 'Amanah Spirulina Superfood',
    category: 'Nutrient-Dense Blue-Green Algae',
    price: 350,
    tagline: '100% natural blue-green algae tablets rich in plant protein, phycocyanin, vitamins & minerals.',
    shortDescription:
      'Whole-food blue-green algae tablets packed with plant protein, phycocyanin, antioxidants, and essential micronutrients for daily nourishment.',
    fullDescription:
      'Amanah Spirulina delivers pure, nutrient-dense blue-green algae in convenient daily tablets. Naturally abundant in complete plant protein, phycocyanin, vitamins, and minerals, it supports energy, antioxidant defense, and a nutrient-conscious lifestyle.',
    image:
      'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_vm18ixvm18ixvm18.jpg',
    badge: 'Superfood Tablets',
    servingSize: '100 Tablets • 100% Natural',
    features: [
      'Rich natural source of plant protein, vitamins & minerals',
      'Contains phycocyanin and naturally occurring antioxidants',
      'Supports a nutrient-conscious, active daily lifestyle',
      '100 convenient tablets per bottle with zero artificial binders',
    ],
    usage: 'Take 2–4 tablets daily with a full glass of water.',
  },
  {
    id: 'amanah-max-c-pro',
    name: 'Max C Pro (Vitamins • Minerals • Antioxidant Support)',
    category: 'Complete Daily Immune & Energy Formula',
    price: 1000,
    tagline: 'Sodium Ascorbate, Calcium Ascorbate, B-Complex, Magnesium, Vitamin D3, Zinc & Mangosteen.',
    shortDescription:
      'Complete daily nutritional support in one formula combining non-acidic Vitamin C, Vitamin D3, Zinc, B-Complex, Magnesium, and Mangosteen xanthones.',
    fullDescription:
      'Max C Pro brings together buffered Sodium & Calcium Ascorbate, Vitamin D3, Zinc, B-Complex, Magnesium, and Mangosteen extract to provide multi-system support for immune defense, energy metabolism, bone & muscle strength, and nervous system health.',
    image:
      'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_vt2wfmvt2wfmvt2w.jpg',
    badge: 'Complete Multi-Support',
    servingSize: '500mg Capsules / Blister Box',
    features: [
      'Immune Support: Sodium & Calcium Ascorbate + Vitamin D3 + Zinc',
      'Antioxidant Support: Vitamin C + Mangosteen Xanthones',
      'Energy & Nervous System Support: B-Complex + Magnesium',
      'Bone & Muscle Function Support: Vitamin D3 + Magnesium',
    ],
    usage: 'Take 1 capsule daily with a meal and water, or as advised by your healthcare provider.',
  },
];

const BENEFITS_DATA = [
  {
    icon: Sprout,
    title: 'Spirulina (Arthrospira / Blue-Green Algae)',
    description:
      'Nutrient-dense microalga providing plant protein, phycocyanin, vitamins, and minerals. Clinical trials and meta-analyses have investigated Spirulina for antioxidant status, blood lipid profiles, and blood pressure support, though study dosages and outcomes vary.',
    tag: 'Best For: Blood, Vessels & Metabolic System',
  },
  {
    icon: ShieldCheck,
    title: 'Serpentina (Andrographis paniculata)',
    description:
      'Botanical extract rich in bioactive lactones (andrographolides). Clinical reviews and trials have examined Andrographis paniculata primarily for relieving subjective symptoms of uncomplicated upper respiratory tract infections, such as sore throat, nasal discomfort, and cough.',
    tag: 'Best For: Upper Respiratory Tract & Throat',
  },
  {
    icon: Droplets,
    title: 'Herbal Oil (Menthol, Camphor, Eucalyptus, Ylang-Ylang & Clove)',
    description:
      'Topical botanical oil blend combining cooling menthol, warming-cooling camphor, eucalyptus, ylang-ylang, and clove aromatics. Research on topical menthol, camphor, and eucalyptus notes cooling/counter-irritant sensory effects, local skin and muscle comfort, and subjective relief of cold-related nasal/cough discomfort.',
    tag: 'Best For: Skin, Muscles & Upper Airways',
  },
  {
    icon: Sparkles,
    title: 'Glutagen Cee (Glutathione, Collagen & Sodium Ascorbate)',
    description:
      'Tri-ingredient wellness formula pairing glutathione (cellular antioxidant defense), collagen (structural protein), and sodium ascorbate (buffered Vitamin C involved in normal collagen formation and antioxidant protection). Clinical studies explore oral collagen for skin hydration and elasticity and glutathione/Vitamin C for oxidative stress.',
    tag: 'Best For: Skin & Cellular Antioxidant System',
  },
  {
    icon: Award,
    title: 'Herbal Rub (Mentholated Vapor Rub)',
    description:
      'Mentholated topical vapor balm formulated for external chest, neck, back, and muscle application. Clinical studies on topical mentholated and camphor/eucalyptus vapor rubs report soothing cooling/warming sensations, improved perceived nasal/cough comfort at bedtime, and localized muscle soothing.',
    tag: 'Best For: Chest, Airways, Neck & Muscles',
  },
  {
    icon: HeartHandshake,
    title: 'Research & Informed Wellness Disclaimer',
    description:
      'Product knowledge above summarizes published nutritional and clinical research on individual ingredients. Evidence varies by ingredient, formulation, and individual response; dietary supplements and topical rubs are not intended to diagnose, treat, cure, or prevent disease.',
    tag: 'Best For: Safe & Informed Daily Use',
  },
];

const MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'media-1',
    type: 'video',
    category: 'Project Documentary',
    title: 'The Amanah Vision: Stewardship from Soil to Community',
    duration: '02:45',
    thumbnail:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
    youtubeId: 'dQw4w9WgXcQ',
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-flying-over-a-green-field-with-trees-42516-large.mp4',
    description:
      'Discover how the Amanah Project System unites regenerative botanical agriculture with ethical community empowerment and transparent quality assurance.',
  },
  {
    id: 'media-2',
    type: 'video',
    category: 'Product Preparation',
    title: 'Crafting the Perfect Daily Green Elixir',
    duration: '01:30',
    thumbnail:
      'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=1000&q=80',
    youtubeId: 'ysz5S6PUM-U',
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-pouring-water-into-a-glass-with-ice-42937-large.mp4',
    description:
      'See how effortlessly Amanah micro-milled greens dissolve in cool water, citrus infusions, and morning smoothies without clumping.',
  },
  {
    id: 'media-3',
    type: 'video',
    category: 'Member Stories',
    title: 'Voices of Amanah: Partner & Family Journeys',
    duration: '03:18',
    thumbnail:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1000&q=80',
    youtubeId: 'jNQXAC9IVRw',
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-outdoors-in-the-morning-42430-large.mp4',
    description:
      'Community coordinators, parents, and wellness advocates share how the Amanah Project System elevated their daily routines and collective impact.',
  },
  {
    id: 'media-4',
    type: 'photo',
    category: 'Harvest & Craft',
    title: 'Dawn Harvest at Partner Agricultural Estates',
    thumbnail:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1000&q=80',
    description:
      'Young shoots reach optimal phytonutrient concentration just before the first warm rays of morning sunlight.',
  },
  {
    id: 'media-5',
    type: 'photo',
    category: 'Quality Lab',
    title: 'Precision Botanical Testing & Halal Purity Assurance',
    thumbnail:
      'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1000&q=80',
    description:
      'Every lot undergoes spectral chromatography and microbiological verification before receiving the Amanah seal of trust.',
  },
  {
    id: 'media-6',
    type: 'photo',
    category: 'Lifestyle',
    title: 'Mindful Mornings with Amanah Reserve',
    thumbnail:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80',
    description:
      'Elevating everyday nutrition with vibrant, whole-plant ingredients designed for modern living.',
  },
];

// ============================================================================
 // AMANAH UNILEVEL ROLE CATALOG
 // Role choice is a sign-in context only. The trusted account role must be
 // assigned and verified by the backend; this selector never grants access.
 // ============================================================================
const UNILEVEL_ROLES = [
  { id: 'distributor', label: 'Distributor', description: 'Personal profile, sponsor and downline genealogy, eligible sales volume, order history, and commission statements.' },
  { id: 'mobile_stockist', label: 'Mobile Stockist', description: 'Assigned stock, inventory movements, replenishment requests, and product handovers within an authorized territory.' },
  { id: 'branch_operator', label: 'Branch Operator', description: 'Branch sales and order processing, member assistance, stock receiving, and branch-level daily reconciliation.' },
  { id: 'manager', label: 'Manager', description: 'Supervised branch and team performance, operational approvals, stock oversight, and management reports.' },
  { id: 'front_desk', label: 'Front Desk', description: 'Front desk ordering, customer price categories, and printable order receipts.' },
  { id: 'admin', label: 'Admin', description: 'Authorized user and role administration, system configuration, audit monitoring, and controlled master data.' },
] as const;

type UnilevelRoleId = typeof UNILEVEL_ROLES[number]['id'];

// ============================================================================
// MAIN APPLICATION COMPONENT — AMANAH PROJECT SYSTEM
// ============================================================================

export default function AmanahApp() {
  // Navigation & View State
  const [activeView, setActiveView] = useState<'landing' | 'portal'>('landing');
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Interactive Modals & Gallery State
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [activeMediaModal, setActiveMediaModal] = useState<MediaItem | null>(null);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'photo'>('all');
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  // POS Cart & Ordering State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPosOpen, setIsPosOpen] = useState<boolean>(false);
  const [posCustomer, setPosCustomer] = useState({
    customerName: '',
    memberId: '',
    contactNumber: '',
    paymentMethod: 'Cash / Hub Pickup',
    deliveryAddress: '',
  });
  const [posOrderReceipt, setPosOrderReceipt] = useState<{
    orderNumber: string;
    date: string;
    items: CartItem[];
    subtotal: number;
    customerName: string;
    memberId: string;
    paymentMethod: string;
  } | null>(null);
  const [posToast, setPosToast] = useState<string>('');

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    fullName: '',
    email: '',
    subject: 'Amanah Project Inquiry',
    message: '',
  });
  const [contactStatus, setContactStatus] = useState({
    submitting: false,
    submitted: false,
    error: '',
  });

  // Supabase-Ready Login / Registration Portal State
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [selectedRole, setSelectedRole] = useState<UnilevelRoleId>('distributor');
  const [registrationRole, setRegistrationRole] = useState<'distributor' | 'mobile_stockist' | 'branch_operator'>('distributor');
  const [registrationManagers, setRegistrationManagers] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [portalAccess, setPortalAccess] = useState<'member' | 'admin' | 'front_desk'>('member');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authForm, setAuthForm] = useState({
    fullName: '',
    memberCode: '',
    email: '',
    username: '',
    password: '',
    rememberMe: true,
  });
  const [authFeedback, setAuthFeedback] = useState<{
    loading: boolean;
    status: 'idle' | 'configured_ready' | 'validation_error' | 'not_connected';
    message: string;
  }>({ loading: false, status: 'idle', message: '' });
  const [memberProfile, setMemberProfile] = useState<{
    id: string; member_number: string; full_name: string; role: string; account_status: string;
  } | null>(null);
  const [hasAuthenticatedSession, setHasAuthenticatedSession] = useState(false);
  const [activationRole, setActivationRole] = useState<'distributor' | 'mobile_stockist' | 'branch_operator' | 'manager'>('distributor');
  const [sponsorProfileId, setSponsorProfileId] = useState('');
  const [generatedActivation, setGeneratedActivation] = useState<{ activation_code: string; assigned_role: string; expires_at: string } | null>(null);

  // Load the limited active-Manager directory only while the registration form is open.
  useEffect(() => {
    if (authMode !== 'register' || !supabase) return;
    let active = true;
    supabase.rpc('get_active_managers_for_registration').then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setRegistrationManagers([]);
        setAuthFeedback({ loading: false, status: 'validation_error', message: `Unable to load active Managers: ${error.message}` });
        return;
      }
      setRegistrationManagers((data || []) as { id: string; full_name: string }[]);
    });
    return () => { active = false; };
  }, [authMode]);

  // Monitor scroll for sticky glassmorphic header transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 36);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll helper that switches back to main landing page if needed
  const navigateToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (activeView !== 'landing') {
      setActiveView('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Trigger inquiry pre-populated with a specific product
  const handleProductInquire = (product: ProductItem) => {
    setSelectedProduct(null);
    setContactForm((prev) => ({
      ...prev,
      subject: `Project & Product Inquiry: ${product.name}`,
      message: `Assalamu Alaikum / Greetings Amanah Team,\n\nI would like to request more details regarding availability, member allocation, and specifications for ${product.name}.`,
    }));
    navigateToSection('contact');
  };

  // POS Cart Helpers
  const addToPosCart = (product: ProductItem, openDrawer = false) => {
    setPosOrderReceipt(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setPosToast(`Added ${product.name} to POS Order`);
    setTimeout(() => setPosToast(''), 2400);
    if (openDrawer) {
      setIsPosOpen(true);
    }
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handlePosCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const orderNum = `AMN-${Math.floor(100000 + Math.random() * 900000)}`;
    setPosOrderReceipt({
      orderNumber: orderNum,
      date: new Date().toLocaleString(),
      items: [...cart],
      subtotal: totalCartAmount,
      customerName: posCustomer.customerName.trim() || 'Walk-in Client',
      memberId: posCustomer.memberId.trim() || 'RETAIL-GUEST',
      paymentMethod: posCustomer.paymentMethod,
    });
    setCart([]);
  };

  // Handle Contact Form Submission
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.fullName.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      setContactStatus({
        submitting: false,
        submitted: false,
        error: 'Please fill in your full name, email address, and message.',
      });
      return;
    }

    setContactStatus({ submitting: true, submitted: false, error: '' });
    setTimeout(() => {
      setContactStatus({ submitting: false, submitted: true, error: '' });
      setContactForm({
        fullName: '',
        email: '',
        subject: 'Amanah Project Inquiry',
        message: '',
      });
    }, 650);
  };

  const loadMemberProfile = async (userId: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase
      .from('member_profiles')
      .select('id, member_number, full_name, role, account_status')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const completeActivation = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    if (!authForm.fullName.trim() || !authForm.memberCode.trim()) {
      throw new Error('Enter your full legal name and Admin-issued activation code.');
    }
    if (registrationRole === 'branch_operator' && !selectedManagerId) {
      throw new Error('Select an active Manager before submitting a Branch Operator application.');
    }
    const { error } = await supabase.rpc('register_member_for_role', {
      p_activation_code: authForm.memberCode.trim(),
      p_full_name: authForm.fullName.trim(),
      p_mobile_number: null,
      p_expected_role: registrationRole,
      p_manager_id: registrationRole === 'branch_operator' ? selectedManagerId : null,
    });
    if (error) throw error;
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError || new Error('Your authenticated session could not be verified.');
    const profile = await loadMemberProfile(userData.user.id);
    if (!profile) throw new Error('Registration was processed, but the member profile could not be loaded. Contact an administrator.');
    setMemberProfile(profile);
    setHasAuthenticatedSession(true);
    setActiveView('portal');
    setAuthFeedback({ loading: false, status: 'configured_ready', message: `Enrollment completed. Your assigned role is ${profile.role.replaceAll('_', ' ')}. Member number: ${profile.member_number}.` });
  };

  const handleSupabaseAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setAuthFeedback({ loading: false, status: 'not_connected', message: 'The website build is missing its Supabase configuration. The site administrator must set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the deployment environment.' });
      return;
    }
    const { data: currentSessionData } = await supabase.auth.getSession();
    const sessionAvailable = Boolean(currentSessionData.session);
    setHasAuthenticatedSession(sessionAvailable);
    const email = authForm.email.trim() || currentSessionData.session?.user.email || '';
    const username = authForm.username.trim();
    if (authMode === 'login' && !username) {
      setAuthFeedback({ loading: false, status: 'validation_error', message: 'Enter your assigned username or Member Number.' });
      return;
    }
    if ((authMode === 'register' || authMode === 'forgot') && !email) {
      setAuthFeedback({ loading: false, status: 'validation_error', message: 'Enter the email address registered to your account.' });
      return;
    }
    if ((authMode === 'login' || (authMode === 'register' && !sessionAvailable)) && authForm.password.length < 6) {
      setAuthFeedback({ loading: false, status: 'validation_error', message: 'Password must be at least 6 characters long.' });
      return;
    }
    if (authMode === 'register' && (!authForm.fullName.trim() || !authForm.memberCode.trim())) {
      setAuthFeedback({ loading: false, status: 'validation_error', message: 'Full legal name and an Admin-issued activation code are required.' });
      return;
    }
    if (authMode === 'register' && registrationRole === 'branch_operator' && (!selectedManagerId || registrationManagers.length === 0)) {
      setAuthFeedback({ loading: false, status: 'validation_error', message: registrationManagers.length === 0 ? 'No active Managers are currently available. Branch Operator registration is temporarily unavailable; contact an administrator.' : 'Choose an active Manager for this Branch Operator application.' });
      return;
    }

    setAuthFeedback({ loading: true, status: 'idle', message: '' });
    try {
      if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        });
        if (error) throw error;
        setAuthFeedback({ loading: false, status: 'configured_ready', message: 'If this email belongs to an account, a password recovery link has been sent.' });
        return;
      }

      if (authMode === 'register') {
        if (!sessionAvailable) {
          const { data, error } = await supabase.auth.signUp({
            email: authForm.email.trim(),
            password: authForm.password,
            options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
          });
          if (error) throw error;
          if (!data.session) {
            setHasAuthenticatedSession(false);
            setAuthFeedback({ loading: false, status: 'configured_ready', message: 'Account created. Check your email and confirm your address. Then return here to complete enrollment with your activation code. After enrollment, sign in using your assigned username and password.' });
            setAuthMode('login');
            return;
          }
        }
        setHasAuthenticatedSession(true);
        await completeActivation();
        return;
      }

      const loginResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/username-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ username, password: authForm.password }),
      });
      const loginResult = await loginResponse.json();
      if (!loginResponse.ok || !loginResult?.session?.access_token || !loginResult?.session?.refresh_token) {
        throw new Error(loginResult?.error || 'Username or password is incorrect.');
      }
      const { data, error } = await supabase.auth.setSession({
        access_token: loginResult.session.access_token,
        refresh_token: loginResult.session.refresh_token,
      });
      if (error) throw error;
      if (!data.user) throw new Error('The authenticated account could not be verified.');
      const profile = await loadMemberProfile(data.user.id);
      setHasAuthenticatedSession(true);
      if (!profile) {
        setMemberProfile(null);
        setAuthForm((previous) => ({ ...previous, email: data.user.email || previous.email }));
        setActiveView('portal');
        setAuthMode('register');
        setAuthFeedback({ loading: false, status: 'configured_ready', message: 'Your email is authenticated, but enrollment is not complete. Enter your Admin-issued activation code and full legal name to finish creating your member profile.' });
        return;
      }
      if (profile.account_status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('This member account is not active. Contact an AMANAH administrator.');
      }
      if (profile.role !== selectedRole) {
        await supabase.auth.signOut();
        throw new Error(`This account is assigned to ${profile.role.replaceAll('_', ' ')}. Select that role and sign in again.`);
      }
      setMemberProfile(profile);
      setActiveView('portal');
      setAuthFeedback({ loading: false, status: 'configured_ready', message: `Signed in successfully. Verified role: ${profile.role.replaceAll('_', ' ')}. Member number: ${profile.member_number}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed. Please try again.';
      setAuthFeedback({ loading: false, status: 'validation_error', message });
    }
  };

  const handleGenerateActivation = async () => {
    if (!supabase || memberProfile?.role !== 'admin') return;
    setGeneratedActivation(null);
    setAuthFeedback({ loading: true, status: 'idle', message: '' });
    try {
      const { data, error } = await supabase.rpc('generate_activation_code', {
        p_role: activationRole,
        p_sponsor_id: sponsorProfileId.trim() || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.activation_code) throw new Error('The server did not return a new activation code.');
      setGeneratedActivation({ activation_code: row.activation_code, assigned_role: row.assigned_role, expires_at: row.expires_at });
      setAuthFeedback({ loading: false, status: 'configured_ready', message: 'Activation code generated. Copy it now; the full code is only returned once.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Activation code generation failed.';
      setAuthFeedback({ loading: false, status: 'validation_error', message });
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setMemberProfile(null);
    setHasAuthenticatedSession(false);
    setGeneratedActivation(null);
    setAuthFeedback({ loading: false, status: 'idle', message: '' });
  };

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!active || error || !data.user) return;
      setHasAuthenticatedSession(true);
      setAuthForm((previous) => ({ ...previous, email: data.user.email || previous.email }));
      try {
        const profile = await loadMemberProfile(data.user.id);
        if (!active) return;
        if (profile?.account_status === 'active') {
          setMemberProfile(profile);
          setActiveView('portal');
        } else if (!profile) {
          setAuthMode('register');
          setActiveView('portal');
          setAuthFeedback({ loading: false, status: 'configured_ready', message: 'You are signed in, but your member profile is not enrolled yet. Enter your full legal name and Admin-issued activation code to complete enrollment.' });
        } else {
          setAuthFeedback({ loading: false, status: 'validation_error', message: 'Your member profile is not active. Contact an AMANAH administrator.' });
        }
      } catch (profileError) {
        if (active) {
          const message = profileError instanceof Error ? profileError.message : 'Unable to verify your member profile.';
          setAuthFeedback({ loading: false, status: 'validation_error', message: `Your account is signed in, but the member profile could not be checked: ${message}` });
        }
      }
    });
    return () => { active = false; };
  }, []);

  const filteredMedia =
    mediaFilter === 'all'
      ? MEDIA_ITEMS
      : MEDIA_ITEMS.filter((item) => item.type === mediaFilter);

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-slate-800 font-sans selection:bg-emerald-800 selection:text-white overflow-x-hidden">
      {/* =====================================================================
          1. STICKY NAVIGATION HEADER
         ===================================================================== */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled || activeView === 'portal'
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-emerald-900/10 py-3'
            : 'bg-gradient-to-b from-black/80 via-black/45 to-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Official Amanah Brand Logo */}
          <button
            onClick={() => navigateToSection('home')}
            className="flex items-center gap-3 text-left group focus:outline-none"
            aria-label="Amanah Distribution and Marketing Co. Home"
          >
            <div className="w-11 h-11 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-md border border-amber-400/50 overflow-hidden group-hover:scale-105 transition-transform shrink-0">
              <img
                src={BRAND_CONFIG.logoUrl}
                alt="Amanah Distribution and Marketing Co. Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-lg sm:text-xl font-bold tracking-wider transition-colors ${
                    isScrolled || activeView === 'portal' ? 'text-emerald-950' : 'text-white'
                  }`}
                >
                  {BRAND_CONFIG.name}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border transition-colors ${
                    isScrolled || activeView === 'portal'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-white/10 text-amber-300 border-amber-400/30'
                  }`}
                >
                  Project
                </span>
              </div>
              <span
                className={`block text-[10px] uppercase tracking-[0.16em] font-semibold transition-colors ${
                  isScrolled || activeView === 'portal' ? 'text-amber-700' : 'text-amber-300'
                }`}
              >
                {BRAND_CONFIG.subtitle}
              </span>
            </div>
          </button>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7" aria-label="Main Navigation">
            {[
              { label: 'Home', id: 'home' },
              { label: 'Products', id: 'products' },
              { label: 'Our Charter', id: 'about' },
              { label: 'Pillars', id: 'benefits' },
              { label: 'Media Gallery', id: 'gallery' },
              { label: 'Contact', id: 'contact' },
            ].map((navItem) => (
              <button
                key={navItem.id}
                onClick={() => navigateToSection(navItem.id)}
                className={`text-sm font-medium tracking-wide transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-amber-500 hover:after:w-full after:transition-all ${
                  isScrolled || activeView === 'portal'
                    ? 'text-slate-700 hover:text-emerald-800'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                {navItem.label}
              </button>
            ))}
          </nav>

          {/* Right: POS Cart Button + Amanah System Portal CTA + Mobile Hamburger */}
          <div className="flex items-center gap-2.5 sm:gap-3">


            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (activeView === 'portal') {
                  setActiveView('landing');
                } else {
                  setActiveView('portal');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                activeView === 'portal'
                  ? 'bg-emerald-900 text-white hover:bg-emerald-800'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 shadow-amber-950/20'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{activeView === 'portal' ? 'Back to Website' : 'System Portal'}</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2.5 rounded-xl transition-colors ${
                isScrolled || activeView === 'portal'
                  ? 'text-emerald-950 hover:bg-emerald-50'
                  : 'text-white hover:bg-white/15'
              }`}
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-emerald-100 shadow-xl px-4 pt-3 pb-6 space-y-2 animate-fadeIn">
            {[
              { label: 'Home', id: 'home' },
              { label: 'Botanical Reserves', id: 'products' },
              { label: 'Our Charter & Story', id: 'about' },
              { label: 'Core Pillars', id: 'benefits' },
              { label: 'Media Gallery', id: 'gallery' },
              { label: 'Contact Concierge', id: 'contact' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => navigateToSection(item.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
              >
                <span>{item.label}</span>
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              </button>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setActiveView('portal');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-900 text-white font-semibold"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Amanah Member & Coordinator Portal</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =====================================================================
          CONDITIONAL VIEW: SUPABASE-READY AMANAH SYSTEM PORTAL OR LANDING PAGE
         ===================================================================== */}
      {activeView === 'portal' ? (memberProfile?.role === 'admin' ? (
        <AdminDashboard profile={memberProfile} onSignOut={handleSignOut} />
      ) : memberProfile?.role === 'distributor' ? (
        <DistributorDashboard profile={memberProfile} onSignOut={handleSignOut} />
      ) : memberProfile?.role === 'branch_operator' ? (
        <BranchOperatorDashboard profile={memberProfile} onSignOut={handleSignOut} />
      ) : memberProfile?.role === 'manager' ? (
        <ManagerDashboard profile={memberProfile} onSignOut={handleSignOut} />
      ) : memberProfile?.role === 'mobile_stockist' ? (
        <MobileStockistDashboard profile={memberProfile} onSignOut={handleSignOut} />
      ) : memberProfile?.role === 'front_desk' ? (
        <FrontDeskDashboard profile={memberProfile} onSignOut={handleSignOut} />
      ) : (
        <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 flex items-center justify-center relative overflow-hidden">
          {/* Ambient decorative rings */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

          <div className="max-w-5xl w-full grid lg:grid-cols-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-400/20 relative z-10">
            {/* Left Brand Showcase Panel */}
            <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white p-8 sm:p-10 flex flex-col justify-between relative">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-wider uppercase mb-6">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Amanah Project Gateway</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-4">
                  Welcome to the Amanah Project System Portal
                </h1>
                <p className="text-emerald-100/80 text-sm leading-relaxed">
                  Sign in to access your project ledger, manage community botanical allocations, verify Halal & COA batch certificates, and coordinate hub activities.
                </p>
              </div>

              <div className="my-8 space-y-4">
                {[
                  'Real-time project allocation & order tracking',
                  'Halal & Certificates of Analysis (COA) archive',
                  'Coordinator & community stewardship resources',
                ].map((perk, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/15 flex items-center justify-between text-xs text-emerald-200/70">
                <span>Supabase Auth Ready</span>
                <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                  <Lock className="w-3 h-3" /> Encrypted Session
                </span>
              </div>
            </div>

            {/* Right Authentication Form Panel */}
            <div className="lg:col-span-7 p-8 sm:p-12 bg-white">
              {/* Mode Switch Tabs */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl mb-8 max-w-sm">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthFeedback({ loading: false, status: 'idle', message: '' });
                  }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    authMode === 'login'
                      ? 'bg-white text-emerald-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Portal Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthFeedback({ loading: false, status: 'idle', message: '' });
                  }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    authMode === 'register'
                      ? 'bg-white text-emerald-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Enroll Member
                </button>
              </div>

              {authMode === 'login' && (
                <section className="mb-7" aria-label="Choose portal">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Choose your secure portal
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'member', role: 'distributor', title: 'Member', detail: 'Distributor access', icon: User },
                      { id: 'admin', role: 'admin', title: 'Admin', detail: 'System management', icon: ShieldCheck },
                      { id: 'front_desk', role: 'front_desk', title: 'Front Desk', detail: 'Orders & receipts', icon: ShoppingBag },
                    ] as const).map((portal) => {
                      const active = portalAccess === portal.id;
                      const PortalIcon = portal.icon;
                      return (
                        <button
                          key={portal.id}
                          type="button"
                          onClick={() => {
                            setPortalAccess(portal.id);
                            setSelectedRole(portal.role);
                            setAuthFeedback({ loading: false, status: 'idle', message: '' });
                          }}
                          aria-pressed={active}
                          className={`min-h-28 rounded-2xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700/30 ${
                            active
                              ? 'border-emerald-800 bg-emerald-50 text-emerald-950 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                          }`}
                        >
                          <PortalIcon className={`mb-3 h-5 w-5 ${active ? 'text-emerald-800' : 'text-slate-400'}`} />
                          <span className="block text-sm font-bold">{portal.title}</span>
                          <span className="mt-1 block text-[10px] leading-tight opacity-75">{portal.detail}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    {portalAccess === 'admin'
                      ? 'Authorized administrators only. Your Admin permission is verified after sign-in.'
                      : portalAccess === 'front_desk'
                      ? 'For authorized front-desk staff. Your Front Desk permission is verified after sign-in.'
                      : 'For distributors and members. Your assigned member role is verified after sign-in.'}
                  </p>
                </section>
              )}

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  {authMode === 'login' && (portalAccess === 'admin' ? 'Admin Portal Sign In' : portalAccess === 'front_desk' ? 'Front Desk Sign In' : 'Member Sign In')}
                  {authMode === 'register' && `Register as ${registrationRole === 'distributor' ? 'Distributor' : registrationRole === 'mobile_stockist' ? 'Mobile Stockist' : 'Branch Operator'}`}
                  {authMode === 'forgot' && 'Recover Portal Access'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {authMode === 'login' &&
                    (portalAccess === 'admin'
                      ? 'Use your assigned administrator username and password.'
                      : portalAccess === 'front_desk'
                      ? 'Use your assigned front-desk username and password.'
                      : 'Enter your assigned username or Member Number.')}
                  {authMode === 'register' &&
                    (registrationRole === 'branch_operator' ? 'Branch Operator application — choose the active Manager responsible for your branch.' : registrationRole === 'mobile_stockist' ? 'Mobile Stockist application — use your Admin-issued activation code.' : 'Distributor application — use your Admin-issued activation code.')}
                  {authMode === 'forgot' &&
                    'We will dispatch a secure recovery link to your registered email.'}
                </p>
              </div>

              {authFeedback.message && (
                <div
                  className={`mb-6 p-4 rounded-xl text-sm border flex items-start gap-3 ${
                    authFeedback.status === 'validation_error'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : authFeedback.status === 'not_connected'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700" />
                  <div>
                    <p className="font-semibold mb-0.5">
                      {authFeedback.status === 'validation_error'
                        ? 'Input Required'
                        : authFeedback.status === 'not_connected'
                        ? 'Authentication Not Connected'
                        : 'Supabase Integration Ready'}
                    </p>
                    <p className="leading-relaxed opacity-90">{authFeedback.message}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSupabaseAuthSubmit} className="space-y-5">
                {authMode === 'register' && (
                  <section className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Choose registration form</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {([
                        { id: 'distributor', title: 'Distributor', detail: 'Distributor application' },
                        { id: 'mobile_stockist', title: 'Mobile Stockist', detail: 'Stockist application' },
                        { id: 'branch_operator', title: 'Branch Operator', detail: 'Branch application + Manager' },
                      ] as const).map((item) => (
                        <button key={item.id} type="button" onClick={() => { setRegistrationRole(item.id); setSelectedManagerId(''); setAuthFeedback({ loading: false, status: 'idle', message: '' }); }} aria-pressed={registrationRole === item.id} className={`rounded-xl border p-3 text-left transition-all ${registrationRole === item.id ? 'border-emerald-800 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'}`}>
                          <span className="block text-sm font-bold">{item.title}</span>
                          <span className="mt-1 block text-[11px] opacity-75">{item.detail}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {authMode === 'register' && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Full Legal Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={authForm.fullName}
                          onChange={(e) =>
                            setAuthForm({ ...authForm, fullName: e.target.value })
                          }
                          placeholder="Fatimah Al-Zahra"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none text-sm transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Admin-Issued Activation Code *
                      </label>
                      <input
                        type="text"
                        value={authForm.memberCode}
                        onChange={(e) =>
                          setAuthForm({ ...authForm, memberCode: e.target.value })
                        }
                        placeholder="Enter your one-time activation code"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none text-sm transition-all"
                      />
                    </div>
                    {registrationRole === 'branch_operator' && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Select Your Manager *</label>
                        <select required value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)} disabled={registrationManagers.length === 0} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none text-sm disabled:bg-slate-100">
                          <option value="">{registrationManagers.length ? 'Choose an active Manager' : 'No active Managers available'}</option>
                          {registrationManagers.map((manager) => <option key={manager.id} value={manager.id}>{manager.full_name}</option>)}
                        </select>
                        <p className="mt-1.5 text-xs text-slate-500">A Manager assignment is required to submit this application and will be saved to your Branch Operator profile.</p>
                      </div>
                    )}
                  </div>
                )}

                {(authMode === 'register' || authMode === 'forgot') && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={authForm.email}
                        onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                        placeholder="member@amanahproject.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                )}
                {authMode === 'login' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Username / Member Number
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoComplete="username"
                        required
                        value={authForm.username}
                        onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                        placeholder={selectedRole === 'admin' ? 'amanahadmin1' : selectedRole === 'front_desk' ? 'frontdesk' : 'Your Member Number'}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                )}

                {(authMode === 'login' || (authMode === 'register' && !hasAuthenticatedSession)) && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Password
                      </label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('forgot');
                            setAuthFeedback({ loading: false, status: 'idle', message: '' });
                          }}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={authForm.password}
                        onChange={(e) =>
                          setAuthForm({ ...authForm, password: e.target.value })
                        }
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none text-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {authMode === 'login' && (
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={authForm.rememberMe}
                        onChange={(e) =>
                          setAuthForm({ ...authForm, rememberMe: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                      />
                      <span className="text-sm text-slate-600">Keep session active on this device</span>
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authFeedback.loading}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-white font-semibold text-sm shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>
                    {authFeedback.loading
                      ? 'Connecting securely...'
                      : authMode === 'login'
                      ? 'Access Amanah System'
                      : authMode === 'register'
                      ? `Submit ${registrationRole === 'distributor' ? 'Distributor' : registrationRole === 'mobile_stockist' ? 'Mobile Stockist' : 'Branch Operator'} Application`
                      : 'Send Password Reset Link'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </form>

              {memberProfile && (
                <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Authenticated member</p>
                      <h3 className="text-lg font-bold text-emerald-950">{memberProfile.full_name}</h3>
                      <p className="text-sm text-emerald-900">{memberProfile.member_number} · {memberProfile.role.replaceAll('_', ' ')}</p>
                    </div>
                    <button type="button" onClick={handleSignOut} className="text-xs font-semibold text-emerald-900 underline">Sign out</button>
                  </div>
                  {memberProfile.role === 'admin' && (
                    <div className="border-t border-emerald-200 pt-4 space-y-3">
                      <h4 className="font-bold text-emerald-950">Generate activation code</h4>
                      <p className="text-xs text-emerald-900/80">Admin-only. Codes expire after 7 days and are shown only once. Admin codes cannot be generated through this screen.</p>
                      <label className="block text-xs font-semibold text-slate-700">New member role</label>
                      <select value={activationRole} onChange={(e) => setActivationRole(e.target.value as typeof activationRole)} className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm">
                        <option value="distributor">Distributor</option>
                        <option value="mobile_stockist">Mobile Stockist</option>
                        <option value="branch_operator">Branch Operator</option>
                        <option value="manager">Manager</option>
                      </select>
                      <label className="block text-xs font-semibold text-slate-700">Sponsor profile UUID (optional)</label>
                      <input value={sponsorProfileId} onChange={(e) => setSponsorProfileId(e.target.value)} placeholder="Leave blank if no sponsor" className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm" />
                      <button type="button" disabled={authFeedback.loading} onClick={handleGenerateActivation} className="w-full rounded-xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">Generate one activation code</button>
                      {generatedActivation && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2">
                          <p className="text-xs font-bold text-amber-900">Copy this code now — it will not be shown again</p>
                          <code className="block break-all text-sm font-bold text-slate-900">{generatedActivation.activation_code}</code>
                          <p className="text-xs text-slate-700">Role: {generatedActivation.assigned_role} · Expires: {new Date(generatedActivation.expires_at).toLocaleString()}</p>
                          <button type="button" onClick={() => navigator.clipboard?.writeText(generatedActivation.activation_code)} className="rounded-lg bg-amber-200 px-3 py-2 text-xs font-bold text-amber-950">Copy activation code</button>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
                {authMode === 'login' ? (
                  <p>
                    New to the Amanah Project System?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="font-semibold text-emerald-800 hover:underline"
                    >
                      Request Member Enrollment
                    </button>
                  </p>
                ) : (
                  <p>
                    Already registered in the Amanah System?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="font-semibold text-emerald-800 hover:underline"
                    >
                      Return to Sign In
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      )) : (
        <main>
          {/* =================================================================
              2. CINEMATIC HERO BANNER
             ================================================================= */}
          <section
            id="home"
            className="relative min-h-[92vh] flex items-center pt-24 pb-16 overflow-hidden bg-emerald-950"
          >
            {/* Official Amanah Full-Bleed Banner Backdrop */}
            <div className="absolute inset-0 z-0">
              <img
                src={BRAND_CONFIG.bannerUrl}
                alt="Amanah Distribution and Marketing Co. — Building Opportunities, Empowering Communities, Growing Together"
                className="w-full h-full object-cover object-center"
              />
              {/* Multi-layered dark botanical gradient overlay for crisp text legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-950/80 to-emerald-950/55" />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-transparent to-black/35" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
              <div className="grid lg:grid-cols-12 gap-12 items-center">
                {/* Left Hero Editorial Copy */}
                <div className="lg:col-span-7 space-y-6 animate-fadeIn">
                  <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-semibold uppercase tracking-[0.2em]">
                    <Sprout className="w-3.5 h-3.5" />
                    <span>{BRAND_CONFIG.tagline}</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.12] tracking-tight">
                    Building Opportunities.{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-emerald-200">
                      Empowering Communities. Growing Together.
                    </span>
                  </h1>

                  <p className="text-base sm:text-lg text-emerald-100/90 max-w-2xl leading-relaxed font-normal">
                    The Amanah Project System connects ethical botanical distribution, certified wellness formulations, and community-driven hubs so families and partners can grow with trust and purpose.
                  </p>

                  {/* Dual Primary CTAs */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      onClick={() => navigateToSection('products')}
                      className="px-7 py-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-bold text-sm sm:text-base shadow-xl shadow-amber-950/30 transition-all inline-flex items-center gap-2.5 group"
                    >
                      <span>Explore Amanah Reserves</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                      onClick={() => navigateToSection('about')}
                      className="px-7 py-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-semibold text-sm sm:text-base transition-all inline-flex items-center gap-2"
                    >
                      <span>Our Charter & System</span>
                    </button>
                  </div>

                  {/* Trust Badges Strip */}
                  <div className="pt-8 grid grid-cols-3 gap-4 sm:gap-8 border-t border-white/15 max-w-xl">
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-amber-300">100%</p>
                      <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5">
                        Halal & Quality Assured
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-amber-300">8 Lines</p>
                      <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5">
                        Botanical & Wellness SKUs
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-amber-300">Nationwide</p>
                      <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5">
                        Distribution & Hub Network
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Featured Brand & Flagship Presentation Card */}
                <div className="lg:col-span-5">
                  <div className="relative mx-auto max-w-md">
                    <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-amber-400/30 via-emerald-400/20 to-transparent blur-xl" />
                    <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 sm:p-6 shadow-2xl text-white">
                      <div className="relative rounded-2xl overflow-hidden aspect-[16/9] mb-5 bg-stone-950">
                        <img
                          src={PRODUCTS_DATA[0].image}
                          alt={PRODUCTS_DATA[0].name}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-emerald-950/85 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-semibold">
                          Featured Formula
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-amber-300 font-semibold">
                            Amanah Distribution & Marketing Co.
                          </p>
                          <h2 className="text-xl font-bold text-white mt-1">
                            {PRODUCTS_DATA[0].name}
                          </h2>
                          <p className="text-xs sm:text-sm text-emerald-100/80 mt-1.5 leading-relaxed">
                            {PRODUCTS_DATA[0].shortDescription}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-emerald-200">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>Research-Informed & Verified</span>
                        </div>
                        <button
                          onClick={() => setSelectedProduct(PRODUCTS_DATA[0])}
                          className="text-xs font-bold uppercase tracking-wider text-amber-300 hover:text-amber-200 inline-flex items-center gap-1"
                        >
                          <span>Inspect Sheet</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
              3. AMANAH PRODUCT GALLERY SECTION
             ================================================================= */}
          <section id="products" className="py-20 sm:py-28 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Section Header */}
              <div className="max-w-3xl mx-auto text-center mb-16">
                <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-widest mb-3">
                  Official Amanah Product Gallery
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-emerald-950 tracking-tight">
                  Wellness Reserves Crafted with Amanah
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                  Explore our complete line of botanical capsules, functional coffees, topical herbal balms & oils, and daily nutrient formulas—add directly to your POS order or inspect full formulation sheets.
                </p>
              </div>

              {/* Responsive Product Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-7">
                {PRODUCTS_DATA.map((product) => (
                  <article
                    key={product.id}
                    className="group bg-[#FAFBF9] rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-700/30 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* 16:9 Product Infographic Image */}
                      <div className="relative aspect-[16/9] overflow-hidden bg-stone-950">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 text-amber-300 text-[11px] font-semibold tracking-wide border border-amber-400/30">
                            {product.badge}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 line-clamp-1">
                            {product.category}
                          </p>
                          <span className="text-sm font-extrabold text-emerald-900 shrink-0">
                            ₱{product.price.toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors leading-snug">
                          {product.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed line-clamp-3">
                          {product.shortDescription}
                        </p>

                        {/* Key Features List */}
                        <ul className="mt-3.5 pt-3.5 border-t border-slate-200/70 space-y-1.5">
                          {product.features.slice(0, 3).map((feat, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-slate-700"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-5 pb-5 pt-2 flex flex-col gap-2">
                      <button
                        onClick={() => addToPosCart(product, false)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add to POS Order</span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="py-2 px-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleProductInquire(product)}
                          className="py-2 px-3 rounded-xl bg-white hover:bg-amber-50 text-emerald-950 border border-slate-300 hover:border-amber-500 text-xs font-semibold transition-colors"
                        >
                          Inquire
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* =================================================================
              4. ABOUT US SECTION (SPLIT-SCREEN LAYOUT)
             ================================================================= */}
          <section
            id="about"
            className="py-20 sm:py-28 bg-gradient-to-b from-[#F4F7F3] to-white border-y border-emerald-900/5"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                {/* Left Column: Official Banner & Photography Showcase */}
                <div className="lg:col-span-6 space-y-5">
                  <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-[16/10] bg-emerald-950">
                    <img
                      src={BRAND_CONFIG.bannerUrl}
                      alt="Amanah Distribution and Marketing Co. Operations & Community"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-emerald-950/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl border border-amber-400/30">
                      <p className="text-[11px] uppercase tracking-widest text-amber-300 font-semibold">
                        Est. {BRAND_CONFIG.foundedYear} • {BRAND_CONFIG.name}
                      </p>
                      <p className="text-xs sm:text-sm font-medium mt-0.5">
                        {BRAND_CONFIG.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="rounded-2xl overflow-hidden shadow-md aspect-[16/9] bg-stone-950">
                      <img
                        src={PRODUCTS_DATA[3].image}
                        alt="Barakah Green Coffee Mix"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="rounded-2xl overflow-hidden shadow-md aspect-[16/9] bg-stone-950">
                      <img
                        src={PRODUCTS_DATA[6].image}
                        alt="Amanah Spirulina Superfood"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Narrative, Mission/Vision & Core Values */}
                <div className="lg:col-span-6 space-y-6">
                  <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-100/80 text-emerald-900 text-xs font-bold uppercase tracking-widest">
                    Our Charter & Heritage
                  </span>

                  <h2 className="text-3xl sm:text-4xl font-bold text-emerald-950 leading-tight">
                    Honoring Sacred Trust Through Ethical Distribution & Wellness.
                  </h2>

                  <p className="text-slate-600 leading-relaxed">
                    Founded in {BRAND_CONFIG.foundedYear}, Amanah Distribution and Marketing Co. operates on the enduring principle of <strong className="text-emerald-950">Amanah</strong>—trustworthiness, accountability, and shared responsibility. Our project system unites quality-tested botanical formulations with transparent distribution and community livelihoods.
                  </p>

                  {/* Mission & Vision Cards */}
                  <div className="grid sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-5 rounded-2xl bg-white border border-emerald-900/10 shadow-sm">
                      <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Our Mission
                      </h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        To build sustainable opportunities and empower communities with trustworthy, research-informed wellness products and transparent systems.
                      </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white border border-emerald-900/10 shadow-sm">
                      <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        Our Vision
                      </h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        To be a benchmark of ethical enterprise where members, hubs, and families grow together in health, dignity, and prosperity.
                      </p>
                    </div>
                  </div>

                  {/* Core Values Strip */}
                  <div className="pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                      Guiding Core Values
                    </h4>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        'Amanah (Sacred Trust)',
                        'Halal & Quality Integrity',
                        'Community Empowerment',
                        'Transparent Stewardship',
                        'Sustainable Growth',
                      ].map((value) => (
                        <span
                          key={value}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-950 text-amber-300 text-xs font-semibold"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 10 Sales Performance Empty Slots */}
              <div className="mt-24 pt-16 border-t border-slate-200/80">
                <div className="text-center max-w-2xl mx-auto mb-12">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
                    Sales Performance Leaderboard
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-emerald-950 mt-1">
                    Top 10 Sales Performance
                  </h3>
                  <p className="text-sm text-slate-600 mt-2">
                    Empty ranking slots #1 to #10 ready for sales performance entries.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }, (_, idx) => {
                    const rank = idx + 1;
                    return (
                      <div
                        key={rank}
                        aria-label={`Top ${rank} Sales Performance Slot`}
                        className="min-h-[148px] rounded-3xl bg-white/80 border-2 border-dashed border-emerald-900/20 p-5 flex flex-col justify-between shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-950 text-amber-300 text-xs font-extrabold">
                            #{rank}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Slot {rank}
                          </span>
                        </div>
                        <div className="my-3 h-12 rounded-2xl bg-[#FAFBF9] border border-slate-200/70" />
                        <div className="h-2.5 w-2/3 rounded bg-slate-200/70" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
              5. BENEFITS & QUALITY STANDARDS SECTION
             ================================================================= */}
          <section
            id="benefits"
            className="py-20 sm:py-28 bg-emerald-950 text-white relative overflow-hidden"
          >
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="max-w-3xl mx-auto text-center mb-16">
                <span className="inline-block px-3.5 py-1 rounded-full bg-white/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
                  Product Knowledge & Research Guide
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                  Amanah Product Knowledge & Target Body Systems
                </h2>
                <p className="mt-4 text-base sm:text-lg text-emerald-100/80 leading-relaxed">
                  Explore research-informed product knowledge for Spirulina, Serpentina, Herbal Oil, Glutagen Cee, and Herbal Rub—including the body organs and systems each is best suited to support.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
                {BENEFITS_DATA.map((benefit, index) => {
                  const IconComponent = benefit.icon;
                  return (
                    <div
                      key={index}
                      className="p-7 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-amber-400/40 hover:bg-white/[0.08] transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-emerald-500/20 border border-amber-400/30 flex items-center justify-center mb-5">
                          <IconComponent className="w-6 h-6 text-amber-300" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300/90">
                          {benefit.tag}
                        </span>
                        <h3 className="text-xl font-bold text-white mt-1.5">
                          {benefit.title}
                        </h3>
                        <p className="text-sm text-emerald-100/80 mt-3 leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* =================================================================
              6. VIDEO & PHOTO MULTIMEDIA GALLERY
             ================================================================= */}
          <section id="gallery" className="py-20 sm:py-28 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-widest mb-3">
                    Field & Community Chronicles
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-bold text-emerald-950">
                    Amanah Media & Harvest Gallery
                  </h2>
                  <p className="text-slate-600 mt-2 max-w-xl">
                    Witness our partner farms, Halal laboratory verification, and community gatherings across the network.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 self-start">
                  {[
                    { key: 'all', label: 'All Media' },
                    { key: 'video', label: 'Videos & Films' },
                    { key: 'photo', label: 'Photography' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setMediaFilter(tab.key as 'all' | 'video' | 'photo')}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        mediaFilter === tab.key
                          ? 'bg-emerald-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured Promotional Video Showcase */}
              <div className="mb-12 rounded-3xl overflow-hidden bg-emerald-950 shadow-2xl border border-emerald-900/15 grid lg:grid-cols-12">
                <div className="lg:col-span-8 relative aspect-video bg-black group">
                  <video
                    controls
                    poster={MEDIA_ITEMS[0].thumbnail}
                    className="w-full h-full object-cover"
                  >
                    <source src={MEDIA_ITEMS[0].videoUrl} type="video/mp4" />
                    Your browser does not support HTML5 video.
                  </video>
                </div>
                <div className="lg:col-span-4 p-8 sm:p-10 text-white flex flex-col justify-center">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-300 mb-3">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Featured Project Film</span>
                  </span>
                  <h3 className="text-2xl font-bold leading-snug">
                    {MEDIA_ITEMS[0].title}
                  </h3>
                  <p className="text-sm text-emerald-100/80 mt-4 leading-relaxed">
                    {MEDIA_ITEMS[0].description}
                  </p>
                  <div className="mt-6 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-emerald-200">
                    <span>HD Documentary Showcase</span>
                    <button
                      onClick={() => setActiveMediaModal(MEDIA_ITEMS[0])}
                      className="text-amber-300 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open Theater Mode</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Thumbnail Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveMediaModal(item)}
                    className="group cursor-pointer rounded-2xl overflow-hidden bg-[#FAFBF9] border border-slate-200/80 shadow-sm hover:shadow-xl transition-all"
                  >
                    <div className="relative aspect-video overflow-hidden bg-slate-900">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        {item.type === 'video' ? (
                          <div className="w-14 h-14 rounded-full bg-amber-400/95 text-emerald-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-current ml-0.5" />
                          </div>
                        ) : (
                          <span className="px-4 py-1.5 rounded-full bg-white/90 text-emerald-950 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            View High-Res Photo
                          </span>
                        )}
                      </div>
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-950/85 text-white text-[11px] font-semibold">
                        {item.category}
                      </div>
                      {item.duration && (
                        <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded bg-black/75 text-white text-xs font-mono">
                          {item.duration}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h4 className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* =================================================================
              7. CONTACT & REGIONAL HUB CONCIERGE SECTION
             ================================================================= */}
          <section
            id="contact"
            className="py-20 sm:py-28 bg-[#F4F7F3] border-t border-emerald-900/10"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-12 gap-12">
                {/* Left Column: Contact Details & Interactive Hub Card */}
                <div className="lg:col-span-5 space-y-8">
                  <div>
                    <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold uppercase tracking-widest mb-3">
                      Connect With Amanah
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-emerald-950">
                      Reach Out to Our Project Secretariat
                    </h2>
                    <p className="text-slate-600 mt-3 leading-relaxed">
                      Have questions regarding product allocations, Halal certifications, establishing a regional Amanah hub, or member onboarding? Our team is ready to assist.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200/80">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Amanah Central Secretariat
                        </h3>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {BRAND_CONFIG.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200/80">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Member & Hub Support Desk
                        </h3>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {BRAND_CONFIG.phone} (Mon–Sat, 8:00 AM – 6:00 PM PHT)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200/80">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Official Secretariat Email</h3>
                        <p className="text-sm text-slate-600 mt-0.5">{BRAND_CONFIG.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stylized Location Hub Card */}
                  <div className="rounded-3xl overflow-hidden border border-slate-200 bg-emerald-950 text-white p-6 relative shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          Western Visayas Operations Hub
                        </span>
                      </div>
                      <span className="text-xs text-emerald-200">10.7202° N, 122.5621° E</span>
                    </div>
                    <div className="h-36 rounded-2xl bg-emerald-900/80 border border-white/10 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
                      <MapPin className="w-8 h-8 text-amber-400 mb-1.5 animate-bounce" />
                      <p className="text-sm font-semibold">Iloilo City Flagship Center</p>
                      <p className="text-xs text-emerald-200/80 mt-0.5">
                        Member Orientation Lounge & Regional Distribution Depot
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Interactive Contact Form */}
                <div className="lg:col-span-7">
                  <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200/80">
                    <h3 className="text-2xl font-bold text-emerald-950 mb-2">
                      Send an Inquiry to Amanah
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                      Complete the form below and a project coordinator will respond within one business day.
                    </p>

                    {contactStatus.submitted && (
                      <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm">Inquiry Logged</p>
                          <p className="text-xs sm:text-sm mt-0.5">
                            Thank you for reaching out to the Amanah Project System. Our secretariat has recorded your message and will reply shortly.
                          </p>
                        </div>
                      </div>
                    )}

                    {contactStatus.error && (
                      <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
                        {contactStatus.error}
                      </div>
                    )}

                    <form onSubmit={handleContactSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={contactForm.fullName}
                            onChange={(e) =>
                              setContactForm({ ...contactForm, fullName: e.target.value })
                            }
                            placeholder="Ahmad bin Yusuf"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none text-sm transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={contactForm.email}
                            onChange={(e) =>
                              setContactForm({ ...contactForm, email: e.target.value })
                            }
                            placeholder="ahmad@example.com"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none text-sm transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={contactForm.subject}
                          onChange={(e) =>
                            setContactForm({ ...contactForm, subject: e.target.value })
                          }
                          placeholder="How can our secretariat assist you?"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none text-sm transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                          Message *
                        </label>
                        <textarea
                          rows={5}
                          required
                          value={contactForm.message}
                          onChange={(e) =>
                            setContactForm({ ...contactForm, message: e.target.value })
                          }
                          placeholder="Share your questions regarding product specifications, member enrollment, or regional hub coordination..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none text-sm transition-all resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={contactStatus.submitting}
                        className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-white font-semibold text-sm shadow-lg shadow-emerald-950/20 transition-all inline-flex items-center justify-center gap-2.5 disabled:opacity-60"
                      >
                        <Send className="w-4 h-4 text-amber-400" />
                        <span>
                          {contactStatus.submitting ? 'Sending Message...' : 'Submit Inquiry'}
                        </span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* =====================================================================
          8. PREMIUM CORPORATE FOOTER
         ===================================================================== */}
      <footer className="bg-emerald-950 text-emerald-100/80 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
            {/* Brand Column */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white p-0.5 border border-amber-400/50 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={BRAND_CONFIG.logoUrl}
                    alt="Amanah Distribution and Marketing Co. Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div>
                  <span className="block text-xl font-bold tracking-wider text-white">
                    {BRAND_CONFIG.name}
                  </span>
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-amber-300 font-semibold">
                    {BRAND_CONFIG.subtitle}
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-emerald-100/75 max-w-sm">
                Building Opportunities. Empowering Communities. Growing Together through ethical distribution, research-informed botanical wellness, and trusted stewardship.
              </p>
              <div className="flex items-center gap-3 pt-2">
                {[
                  { label: 'Home', href: '#home' },
                  { label: 'Instagram', href: BRAND_CONFIG.socials.instagram },
                  { label: 'YouTube', href: BRAND_CONFIG.socials.youtube },
                  { label: 'LinkedIn', href: BRAND_CONFIG.socials.linkedin },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target={social.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    aria-label={social.label}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-400 hover:text-emerald-950 text-xs font-semibold transition-colors border border-white/10"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-amber-300">
                Navigation
              </h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: 'Home', id: 'home' },
                  { label: 'Reserves', id: 'products' },
                  { label: 'Our Charter', id: 'about' },
                  { label: 'Core Pillars', id: 'benefits' },
                  { label: 'Media Gallery', id: 'gallery' },
                  { label: 'Contact', id: 'contact' },
                ].map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => navigateToSection(item.id)}
                      className="hover:text-amber-300 transition-colors"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Product Links */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-amber-300">
                Amanah Reserves
              </h4>
              <ul className="space-y-2.5 text-sm">
                {PRODUCTS_DATA.map((prod) => (
                  <li key={prod.id}>
                    <button
                      onClick={() => setSelectedProduct(prod)}
                      className="text-left hover:text-amber-300 transition-colors line-clamp-1"
                    >
                      {prod.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Details */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-amber-300">
                Secretariat Office
              </h4>
              <p className="text-sm leading-relaxed">{BRAND_CONFIG.address}</p>
              <p className="text-sm">{BRAND_CONFIG.phone}</p>
              <p className="text-sm text-amber-300">{BRAND_CONFIG.email}</p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setActiveView('portal');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Amanah System Portal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Legal & Disclaimer Bar */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-emerald-200/60">
            <p>
              © {new Date().getFullYear()} {BRAND_CONFIG.name} {BRAND_CONFIG.subtitle}. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setLegalModal('privacy')}
                className="hover:text-amber-300 transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setLegalModal('terms')}
                className="hover:text-amber-300 transition-colors"
              >
                Terms & Charter Governance
              </button>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-emerald-200/45 leading-relaxed">
            Wellness Notice: Amanah Project System botanical reserves are whole-food dietary supplements intended to complement a balanced diet and active lifestyle. They are not intended to diagnose, treat, cure, or prevent any medical condition.
          </p>
        </div>
      </footer>

      {/* =====================================================================
          MODAL 1: PRODUCT DETAIL MODAL
         ===================================================================== */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-emerald-900/15 my-8 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full-Width 16:9 Product Infographic Preview */}
            <div className="relative bg-emerald-950 aspect-[16/9] w-full max-h-[420px] overflow-hidden">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-full h-full object-contain bg-stone-950"
              />
              <span className="absolute top-4 left-4 px-3.5 py-1 rounded-full bg-emerald-950/90 text-amber-300 text-xs font-semibold border border-amber-400/30">
                {selectedProduct.badge}
              </span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    {selectedProduct.category}
                  </p>
                  <span className="text-xl font-extrabold text-emerald-900">
                    ₱{selectedProduct.price.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-emerald-950 mt-1">
                  {selectedProduct.name}
                </h3>

                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  {selectedProduct.fullDescription}
                </p>

                <div className="mt-5 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs sm:text-sm text-emerald-950 grid sm:grid-cols-2 gap-3">
                  <p>
                    <span className="font-bold">Packaging Format:</span>{' '}
                    {selectedProduct.servingSize}
                  </p>
                  <p>
                    <span className="font-bold">Suggested Use:</span>{' '}
                    {selectedProduct.usage}
                  </p>
                </div>

                <div className="mt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                    Key Highlights & Formulation Notes
                  </h4>
                  <ul className="grid sm:grid-cols-2 gap-2.5">
                    {selectedProduct.features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs sm:text-sm text-slate-700"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-7 pt-5 border-t border-slate-100 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const prod = selectedProduct;
                    setSelectedProduct(null);
                    addToPosCart(prod, true);
                  }}
                  className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 text-sm font-bold transition-colors inline-flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to POS Order (₱{selectedProduct.price.toLocaleString()})</span>
                </button>
                <button
                  onClick={() => handleProductInquire(selectedProduct)}
                  className="py-3 px-5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
                >
                  Inquire
                </button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="py-3 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          FLOATING POS NOTIFICATION TOAST
         ===================================================================== */}
      {posToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-amber-400/40 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm font-medium">{posToast}</span>
          <button
            onClick={() => {
              setPosToast('');
              setIsPosOpen(true);
            }}
            className="text-xs font-bold uppercase tracking-wider text-amber-300 hover:underline ml-2"
          >
            View POS
          </button>
        </div>
      )}

      {/* =====================================================================
          DRAWER: POINT-OF-SALE (POS) CARTING & ORDER CHECKOUT
         ===================================================================== */}
      {/* =====================================================================
          MODAL 2: VIDEO & PHOTO LIGHTBOX MODAL
         ===================================================================== */}
      {activeMediaModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveMediaModal(null)}
        >
          <div
            className="bg-emerald-950 border border-white/15 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                  {activeMediaModal.category}
                </span>
                <h3 className="text-lg font-bold">{activeMediaModal.title}</h3>
              </div>
              <button
                onClick={() => setActiveMediaModal(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                aria-label="Close media viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black aspect-video w-full">
              {activeMediaModal.type === 'video' ? (
                <video
                  controls
                  autoPlay
                  poster={activeMediaModal.thumbnail}
                  className="w-full h-full object-contain"
                >
                  <source src={activeMediaModal.videoUrl} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={activeMediaModal.thumbnail}
                  alt={activeMediaModal.title}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="p-6 text-sm text-emerald-100/85">
              {activeMediaModal.description}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: PRIVACY POLICY & CHARTER GOVERNANCE MODAL
         ===================================================================== */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-emerald-950">
                {legalModal === 'privacy'
                  ? 'Amanah Data Privacy Policy'
                  : 'Terms & Amanah Charter Governance'}
              </h3>
              <button
                onClick={() => setLegalModal(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-600 space-y-3 max-h-[60vh] overflow-y-auto pr-2 leading-relaxed">
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    The Amanah Project System treats member and visitor information as a sacred trust. Data submitted through our secretariat inquiry forms or member portal is encrypted in transit and processed strictly to manage project allocations, member profiles, and requested updates.
                  </p>
                  <p>
                    We never sell, rent, or disclose member records to unauthorized third parties. Authentication sessions are architected for token-based security via Supabase Auth.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Welcome to the Amanah Project System. By accessing this platform, reviewing product specifications, or utilizing the member portal, you agree to uphold our ethical stewardship guidelines and transparent community standards.
                  </p>
                  <p>
                    All botanical formulations are provided for general nutritional wellness. Always consult a qualified healthcare professional before making significant changes to your dietary regimen.
                  </p>
                </>
              )}
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setLegalModal(null)}
                className="px-6 py-2.5 rounded-xl bg-emerald-900 text-white text-sm font-semibold"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
