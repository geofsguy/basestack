import express from 'express';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Part, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const isProd = process.argv.includes('--prod');
const port = Number(process.env.PORT || 3000);

dotenv.config({ path: path.resolve(rootDir, '.env') });
dotenv.config({ path: path.resolve(rootDir, '.env.local'), override: true });

const defaultSupabaseUrl = 'https://tlpfmktpdxekqaadypkv.supabase.co';
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscGZta3RwZHhla3FhYWR5cGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDI5NjcsImV4cCI6MjA5MTMxODk2N30.NWBzeinA3nNaI9Wyqr3tHL6izURm7OfFvuAPzPaHDug';
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '25mb' }));
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

type UserData = {
  name: string;
  role: string;
  location: string;
  availability: string;
  bio: string;
  hobbies: string;
  experience: string;
  projects: string;
  skills: string;
  goals: string;
  socials: string;
  vibe: string;
  photos?: string[];
};

type ProfileTree = {
  identity: Record<string, string>;
  experience: Array<Record<string, string>>;
  education: Array<Record<string, string>>;
  skills: Array<Record<string, string>>;
  projects: Array<Record<string, string>>;
  achievements: Array<Record<string, string>>;
  social: Record<string, string>;
  personal: Record<string, string>;
  goals: Record<string, string>;
  custom: Array<Record<string, string>>;
  photos?: string[];
};

type SiteGenerationMode = 'html' | 'nextjs';

type SiteProjectFile = {
  path: string;
  content: string;
};

type SiteContent = {
  html: string;
  generationMode: SiteGenerationMode;
  framework: string | null;
  projectFiles?: SiteProjectFile[] | null;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured on the server.`);
  }
  return value;
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || getRequiredEnv('VITE_GEMINI_API_KEY');
}

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  }
  return genAI;
}

function getServerSupabase(accessToken: string) {
  return createClient(process.env.VITE_SUPABASE_URL || defaultSupabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getSubscriptionTier(
  supabase: ReturnType<typeof getServerSupabase>,
  userId: string,
): Promise<'free' | 'pro' | 'studio'> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const tier = String(data?.tier || 'free').toLowerCase();
  return tier === 'studio' ? 'studio' : tier === 'pro' ? 'pro' : 'free';
}

function dataUrlToPart(dataUrl: string): Part | null {
  const match = dataUrl.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,(.+)$/);
  if (!match) return null;

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

function serializeProfileTree(tree: ProfileTree): string {
  const lines: string[] = ['--- Detailed Profile Data ---'];

  const id = tree.identity || {};
  if (id.name) lines.push(`Name: ${id.name}`);
  if (id.role) lines.push(`Role: ${id.role}`);
  if (id.location) lines.push(`Location: ${id.location}`);
  if (id.email) lines.push(`Email: ${id.email}`);
  if (id.tagline) lines.push(`Tagline: ${id.tagline}`);
  if (id.availability) lines.push(`Availability: ${id.availability}`);
  if (id.bio) lines.push(`Bio: ${id.bio}`);

  if ((tree.experience || []).length > 0) {
    lines.push('\nWork Experience:');
    tree.experience.forEach((entry) => {
      lines.push(`  • ${entry.title || ''} at ${entry.company || ''} (${entry.duration || ''})`);
      if (entry.description) lines.push(`    ${entry.description}`);
      if (entry.achievements) lines.push(`    Achievements: ${entry.achievements}`);
    });
  }

  if ((tree.education || []).length > 0) {
    lines.push('\nEducation:');
    tree.education.forEach((entry) => {
      lines.push(`  • ${entry.degree || ''} in ${entry.field || ''} — ${entry.school || ''} (${entry.year || ''})`);
      if (entry.gpa) lines.push(`    GPA: ${entry.gpa}`);
      if (entry.highlights) lines.push(`    ${entry.highlights}`);
    });
  }

  if ((tree.skills || []).length > 0) {
    lines.push('\nSkills:');
    const byCategory = tree.skills.reduce<Record<string, string[]>>((acc, skill) => {
      const category = skill.category || 'Other';
      (acc[category] = acc[category] || []).push(`${skill.name || 'Unknown'} (${skill.level || 'Unknown'})`);
      return acc;
    }, {});
    Object.entries(byCategory).forEach(([category, skills]) => {
      lines.push(`  ${category}: ${skills.join(', ')}`);
    });
  }

  if ((tree.projects || []).length > 0) {
    lines.push('\nProjects:');
    tree.projects.forEach((project) => {
      lines.push(`  • ${project.name || ''} [${project.status || ''}]${project.url ? ` — ${project.url}` : ''}`);
      if (project.stack) lines.push(`    Stack: ${project.stack}`);
      if (project.description) lines.push(`    ${project.description}`);
      if (project.highlights) lines.push(`    ${project.highlights}`);
    });
  }

  if ((tree.achievements || []).length > 0) {
    lines.push('\nAchievements:');
    tree.achievements.forEach((achievement) => {
      lines.push(`  • ${achievement.title || ''}${achievement.organization ? ` — ${achievement.organization}` : ''}${achievement.year ? ` (${achievement.year})` : ''}`);
      if (achievement.description) lines.push(`    ${achievement.description}`);
    });
  }

  const social = Object.entries(tree.social || {}).filter(([, value]) => value);
  if (social.length > 0) {
    lines.push('\nSocial Links:');
    social.forEach(([key, value]) => lines.push(`  ${key}: ${value}`));
  }

  const personal = tree.personal || {};
  if (personal.interests) lines.push(`\nInterests: ${personal.interests}`);
  if (personal.languages) lines.push(`Languages: ${personal.languages}`);
  if (personal.values) lines.push(`Values: ${personal.values}`);
  if (personal.funFacts) lines.push(`Fun Facts: ${personal.funFacts}`);

  const goals = tree.goals || {};
  if (goals.shortTerm || goals.longTerm || goals.currentlyLearning || goals.openTo) {
    lines.push('\nGoals:');
    if (goals.shortTerm) lines.push(`  Short-term: ${goals.shortTerm}`);
    if (goals.longTerm) lines.push(`  Long-term: ${goals.longTerm}`);
    if (goals.currentlyLearning) lines.push(`  Currently learning: ${goals.currentlyLearning}`);
    if (goals.openTo) lines.push(`  Open to: ${goals.openTo}`);
  }

  if ((tree.custom || []).length > 0) {
    lines.push('\nAdditional:');
    tree.custom
      .filter((entry) => entry.key && entry.value)
      .forEach((entry) => lines.push(`  ${entry.key}: ${entry.value}`));
  }

  lines.push('--- End Profile Data ---');
  return lines.join('\n');
}

const AVAILABLE_FONTS = `
Available font utilities in the render environment:
- font-sans -> Manrope
- font-display -> Space Grotesk
- font-editorial -> Cormorant Garamond
- font-accent -> Sora
- font-mono -> IBM Plex Mono
`;

const DESIGN_QUALITY_RULES = `
DESIGN DIRECTION:
- Create a site that feels custom-designed, not templated.
- Start by inferring a strong visual concept from the user's vibe and profile. Then make every section support that concept.
- Use asymmetry, contrast, scale shifts, layered backgrounds, section breaks, and visual rhythm where appropriate.
- Avoid the generic startup-template pattern of: centered hero, three cards, testimonials, footer, all on white.
- Avoid overusing glassmorphism, soft purple gradients, or default SaaS aesthetics unless the user's vibe explicitly calls for them.
- Make typography do real design work: choose an intentional pairing from the available fonts and vary size, weight, tracking, and case.
- Use a clear color story with 1 dominant palette, 1 accent, and deliberate neutrals. Colors should feel curated, not random.
- Include at least one standout visual moment: an oversized headline, editorial composition, immersive hero, timeline, mosaic, bold stat treatment, or dramatic call-to-action.
- Use motion thoughtfully if you add it: subtle fades, marquees, or floating accents are fine, but avoid distracting gimmicks.

LAYOUT + CONTENT:
- Build a rich one-page personal website with enough depth to feel complete.
- Prioritize sections that fit the actual user data. Good options include hero, about, experience timeline, selected work, skills, achievements, social proof, writing/interests, contact, and availability.
- If data is sparse, lean harder into visual storytelling, strong copy treatment, and a tighter set of sections instead of inventing fake facts.
- If data is rich, surface concrete details, metrics, tools, and accomplishments rather than generic summaries.
- Treat projects and experience as editorial content, not plain bullet dumps.
- Make mobile layouts feel carefully designed, not just shrunk-down desktop layouts.

IMPLEMENTATION:
- Wrap everything in a single root <div>.
- You may include a small <style> block inside that root div for custom keyframes, CSS variables, masks, or effects that Tailwind alone can't express cleanly.
- Use Tailwind CSS classes for the majority of styling.
- Use the available font utilities intentionally instead of defaulting everything to font-sans.
- Prefer semantic HTML sections and accessible markup.
- Ensure strong spacing cadence, strong contrast, and readable line lengths.
- Do not include placeholder lorem ipsum or fabricated companies, awards, links, or metrics.
`;

function replacePhotoPlaceholders(source: string, photos?: string[]) {
  if (!photos?.length) return source;

  let output = source;
  photos.forEach((dataUrl, index) => {
    output = output.split(`__PHOTO_${index + 1}__`).join(dataUrl);
  });
  return output;
}

function normalizeNextGlobalsCss(globalsCss: string) {
  const trimmed = globalsCss.trim();
  return trimmed.includes('@import "tailwindcss";')
    ? trimmed
    : `@import "tailwindcss";\n\n${trimmed}`;
}

function buildNextJsProjectFiles(pageTsx: string, globalsCss: string, siteTitle: string): SiteProjectFile[] {
  return [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'basestack-portfolio',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          next: 'latest',
          react: 'latest',
          'react-dom': 'latest',
        },
        devDependencies: {
          typescript: 'latest',
          '@types/node': 'latest',
          '@types/react': 'latest',
          '@types/react-dom': 'latest',
          tailwindcss: 'latest',
          '@tailwindcss/postcss': 'latest',
        },
      }, null, 2),
    },
    {
      path: 'next.config.ts',
      content: `import type { NextConfig } from 'next';\n\nconst nextConfig: NextConfig = {\n  output: 'standalone',\n};\n\nexport default nextConfig;\n`,
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2017',
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: false,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }],
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      }, null, 2),
    },
    {
      path: 'next-env.d.ts',
      content: `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// This file is auto-generated by Next.js.\n`,
    },
    {
      path: 'postcss.config.mjs',
      content: `export default {\n  plugins: {\n    '@tailwindcss/postcss': {},\n  },\n};\n`,
    },
    {
      path: 'app/layout.tsx',
      content: `import type { ReactNode } from 'react';\nimport './globals.css';\n\nexport const metadata = {\n  title: ${JSON.stringify(siteTitle)},\n  description: 'Generated by BaseStack',\n};\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
    },
    {
      path: 'app/page.tsx',
      content: pageTsx.trim(),
    },
    {
      path: 'app/globals.css',
      content: normalizeNextGlobalsCss(globalsCss),
    },
    {
      path: 'README.md',
      content: `# BaseStack Portfolio\n\nThis project was generated by BaseStack for deployment on a Next.js server.\n\n## Local run\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Production build\n\n\`\`\`bash\nnpm install\nnpm run build\nnpm run start\n\`\`\`\n`,
    },
    {
      path: '.nvmrc',
      content: '20\n',
    },
  ];
}

function buildHtmlSitePrompt(userData: UserData, profileContext: string) {
  return `
    You are an elite, award-winning frontend developer and digital art director.
    Your task is to generate a completely unique, visually impressive personal website using raw HTML and Tailwind CSS.

    ${profileContext ? `Extended Profile Data (use this for rich, accurate content):\n${profileContext}\n\n` : ''}
    Form Input:
    Name: ${userData.name}
    Role: ${userData.role}
    Location: ${userData.location}
    Availability: ${userData.availability}
    Bio: ${userData.bio}
    Hobbies: ${userData.hobbies}
    Experience: ${userData.experience}
    Projects: ${userData.projects}
    Skills: ${userData.skills}
    Goals: ${userData.goals}
    Social Links: ${userData.socials}
    Desired Vibe: ${userData.vibe}
    ${userData.photos && userData.photos.length > 0
      ? `The user has uploaded ${userData.photos.length} photo(s) (visible to you above as images). Incorporate them into the site using <img> tags. For each photo's src attribute, use the EXACT placeholder token __PHOTO_1__, __PHOTO_2__, etc. (matching the order the images appear). Do not use any other value for those src attributes.`
      : ''}

    ${AVAILABLE_FONTS}

    ${DESIGN_QUALITY_RULES}

    SECURITY REQUIREMENTS:
    1. Do not include any <script>, <iframe>, <object>, <embed>, <form>, or remote code-loading tags.
    2. Do not include inline event handler attributes like onclick.
    3. Only use standard links and images.

    TECHNICAL REQUIREMENTS:
    1. Return ONLY valid JSON: { "html": "..." }
    2. The "html" string MUST contain ONLY the elements to go inside <body>.
    3. Use Tailwind CSS for the large majority of styling, with generous spacing, polished composition, and purposeful typography.
    4. DO NOT wrap HTML in markdown blocks inside the JSON string.
    5. Use ALL available data to build a rich, comprehensive site.
    6. The site must be fully responsive and feel intentional on mobile, tablet, and desktop.
    7. Output body HTML only, but it may contain a small <style> block inside the root <div> if needed.
    8. Think like a top-tier portfolio designer, not a generic UI generator.
  `;
}

function buildNextJsSitePrompt(userData: UserData, profileContext: string) {
  return `
    You are an elite, award-winning frontend developer and digital art director.
    Your task is to generate a premium personal portfolio for a paid user as both:
    1. a previewable HTML render for BaseStack
    2. a deployable Next.js App Router page using React and Tailwind CSS

    ${profileContext ? `Extended Profile Data (use this for rich, accurate content):\n${profileContext}\n\n` : ''}
    Form Input:
    Name: ${userData.name}
    Role: ${userData.role}
    Location: ${userData.location}
    Availability: ${userData.availability}
    Bio: ${userData.bio}
    Hobbies: ${userData.hobbies}
    Experience: ${userData.experience}
    Projects: ${userData.projects}
    Skills: ${userData.skills}
    Goals: ${userData.goals}
    Social Links: ${userData.socials}
    Desired Vibe: ${userData.vibe}
    ${userData.photos && userData.photos.length > 0
      ? `The user has uploaded ${userData.photos.length} photo(s) (visible to you above as images). For both html and pageTsx, use the EXACT placeholder token __PHOTO_1__, __PHOTO_2__, etc. in image src attributes. Do not use any other photo source values.`
      : ''}

    ${AVAILABLE_FONTS}

    ${DESIGN_QUALITY_RULES}

    NEXT.JS REQUIREMENTS:
    1. Return ONLY valid JSON: { "html": "...", "pageTsx": "...", "globalsCss": "..." }.
    2. "html" must be preview HTML body content only, wrapped in a single root <div>.
    3. "pageTsx" must be the full contents of app/page.tsx.
    4. "pageTsx" must export a default React component and must NOT include markdown fences.
    5. "pageTsx" must not import third-party packages, use client hooks, use browser APIs at module scope, or depend on any file besides app/globals.css.
    6. "globalsCss" must be the full contents of app/globals.css and may include CSS variables, keyframes, and custom utility layers.
    7. Use Tailwind CSS for the majority of styling in both outputs.
    8. Keep the preview HTML and the Next.js page visually aligned in concept, structure, and copy.
    9. Do not fabricate companies, awards, metrics, or links.
    10. Do not include forms, scripts, iframes, embeds, or inline event handlers.
  `;
}

async function generateHtmlWebsiteContent(userData: UserData, profileTree?: ProfileTree | null): Promise<SiteContent> {
  const profileContext = profileTree ? serializeProfileTree(profileTree) : '';
  const textPrompt = buildHtmlSitePrompt(userData, profileContext);

  const imageParts: Part[] = (userData.photos || [])
    .map(dataUrlToPart)
    .filter((part): part is Part => part !== null);

  const contents = [
    ...imageParts,
    { text: textPrompt },
  ];

  const ai = getGenAI();
  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: imageParts.length > 0 ? [{ role: 'user', parts: contents }] : textPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          html: {
            type: Type.STRING,
            description: 'The complete HTML code for the website, wrapped in a single root <div>, styled with Tailwind CSS.',
          },
        },
        required: ['html'],
      },
    },
  });

  const text = result.text;
  if (!text) throw new Error('Empty response from Gemini.');

  const parsed = JSON.parse(text) as { html: string };
  return {
    html: replacePhotoPlaceholders(parsed.html, userData.photos),
    generationMode: 'html',
    framework: null,
    projectFiles: null,
  };
}

async function generateNextJsWebsiteContent(userData: UserData, profileTree?: ProfileTree | null): Promise<SiteContent> {
  const profileContext = profileTree ? serializeProfileTree(profileTree) : '';
  const textPrompt = buildNextJsSitePrompt(userData, profileContext);

  const imageParts: Part[] = (userData.photos || [])
    .map(dataUrlToPart)
    .filter((part): part is Part => part !== null);

  const contents = [
    ...imageParts,
    { text: textPrompt },
  ];

  const ai = getGenAI();
  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: imageParts.length > 0 ? [{ role: 'user', parts: contents }] : textPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          html: { type: Type.STRING },
          pageTsx: { type: Type.STRING },
          globalsCss: { type: Type.STRING },
        },
        required: ['html', 'pageTsx', 'globalsCss'],
      },
    },
  });

  const text = result.text;
  if (!text) throw new Error('Empty response from Gemini.');

  const parsed = JSON.parse(text) as { html: string; pageTsx: string; globalsCss: string };
  const siteTitle = userData.name ? `${userData.name} | Portfolio` : 'BaseStack Portfolio';
  return {
    html: replacePhotoPlaceholders(parsed.html, userData.photos),
    generationMode: 'nextjs',
    framework: 'nextjs',
    projectFiles: buildNextJsProjectFiles(
      replacePhotoPlaceholders(parsed.pageTsx, userData.photos),
      replacePhotoPlaceholders(parsed.globalsCss, userData.photos),
      siteTitle,
    ),
  };
}

async function generateWebsiteContent(
  userData: UserData,
  generationMode: SiteGenerationMode,
  profileTree?: ProfileTree | null,
): Promise<SiteContent> {
  return generationMode === 'nextjs'
    ? generateNextJsWebsiteContent(userData, profileTree)
    : generateHtmlWebsiteContent(userData, profileTree);
}

function getProjectFile(projectFiles: SiteProjectFile[] | null | undefined, filePath: string) {
  return projectFiles?.find((file) => file.path === filePath)?.content || '';
}

async function refineHtmlWebsiteContent(currentHtml: string, refinementPrompt: string): Promise<SiteContent> {
  const prompt = `
    You are an elite frontend designer-developer refining a custom personal website.
    Keep the site feeling premium, distinctive, and intentionally art-directed while applying the user's request.

    ${AVAILABLE_FONTS}

    ${DESIGN_QUALITY_RULES}

    SECURITY REQUIREMENTS:
    1. Do not include any <script>, <iframe>, <object>, <embed>, <form>, or remote code-loading tags.
    2. Do not include inline event handler attributes like onclick.
    3. Only use standard links and images.

    User Request: "${refinementPrompt}"

    Current HTML (body content only):
    ${currentHtml}

    REFINEMENT RULES:
    - Preserve the strongest existing ideas unless the request clearly asks to replace them.
    - If the request is visual, improve composition, spacing, hierarchy, and typography instead of making a narrow superficial edit.
    - If the request targets one area, do not accidentally flatten the rest of the page into a generic layout.
    - Keep the HTML body-only and fully responsive.
    - Return only valid JSON: { "html": "..." } with the updated body HTML.
  `;

  const ai = getGenAI();
  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          html: {
            type: Type.STRING,
            description: 'The updated HTML code.',
          },
        },
        required: ['html'],
      },
    },
  });

  const text = result.text;
  if (!text) throw new Error('Empty response from Gemini.');

  const parsed = JSON.parse(text) as { html: string };
  return {
    html: parsed.html,
    generationMode: 'html',
    framework: null,
    projectFiles: null,
  };
}

async function refineNextJsWebsiteContent(siteContent: SiteContent, refinementPrompt: string): Promise<SiteContent> {
  const currentPageTsx = getProjectFile(siteContent.projectFiles, 'app/page.tsx');
  const currentGlobalsCss = getProjectFile(siteContent.projectFiles, 'app/globals.css');
  const currentLayoutTsx = getProjectFile(siteContent.projectFiles, 'app/layout.tsx');

  if (!currentPageTsx || !currentGlobalsCss) {
    throw new Error('This paid project is missing its Next.js source files, so it cannot be refined safely.');
  }

  const prompt = `
    You are an elite frontend designer-developer refining a premium personal portfolio that exists in two synchronized forms:
    1. preview HTML used inside BaseStack
    2. a deployable Next.js App Router page

    ${AVAILABLE_FONTS}

    ${DESIGN_QUALITY_RULES}

    User Request: "${refinementPrompt}"

    Current Preview HTML (body content only):
    ${siteContent.html}

    Current app/page.tsx:
    ${currentPageTsx}

    Current app/globals.css:
    ${currentGlobalsCss}

    REFINEMENT RULES:
    - Preserve the strongest existing ideas unless the request clearly asks to replace them.
    - Keep the preview HTML and Next.js outputs visually aligned in concept, structure, and copy.
    - pageTsx must remain a valid app/page.tsx default export.
    - Do not add third-party imports, client hooks, forms, scripts, iframes, embeds, or inline event handlers.
    - Return ONLY valid JSON: { "html": "...", "pageTsx": "...", "globalsCss": "..." }.
  `;

  const ai = getGenAI();
  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          html: { type: Type.STRING },
          pageTsx: { type: Type.STRING },
          globalsCss: { type: Type.STRING },
        },
        required: ['html', 'pageTsx', 'globalsCss'],
      },
    },
  });

  const text = result.text;
  if (!text) throw new Error('Empty response from Gemini.');

  const parsed = JSON.parse(text) as { html: string; pageTsx: string; globalsCss: string };
  const siteTitleMatch = currentLayoutTsx.match(/title:\s*["'`](.+?)["'`]/);
  const siteTitle = siteTitleMatch?.[1] || 'BaseStack Portfolio';
  return {
    html: parsed.html,
    generationMode: 'nextjs',
    framework: 'nextjs',
    projectFiles: buildNextJsProjectFiles(parsed.pageTsx, parsed.globalsCss, siteTitle),
  };
}

async function refineWebsiteContent(siteContent: SiteContent, refinementPrompt: string): Promise<SiteContent> {
  return siteContent.generationMode === 'nextjs'
    ? refineNextJsWebsiteContent(siteContent, refinementPrompt)
    : refineHtmlWebsiteContent(siteContent.html, refinementPrompt);
}

async function parseLinkedInText(text: string) {
  const prompt = `
    You are a data extraction expert. Parse the following LinkedIn profile text and extract structured information.

    Profile text:
    ${text}

    Extract all available information and return as JSON. For arrays, extract as many entries as you find.
    For skills, infer the level (Beginner/Intermediate/Advanced/Expert) from context clues.
    For skills category, use one of: Language, Framework, Tool, Soft Skill, Other.
    Leave fields empty string if not found. Omit array entries if empty.
  `;

  const ai = getGenAI();
  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          identity: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              location: { type: Type.STRING },
              bio: { type: Type.STRING },
              tagline: { type: Type.STRING },
              email: { type: Type.STRING },
              availability: { type: Type.STRING },
            },
          },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                company: { type: Type.STRING },
                title: { type: Type.STRING },
                duration: { type: Type.STRING },
                description: { type: Type.STRING },
                achievements: { type: Type.STRING },
                url: { type: Type.STRING },
              },
            },
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                school: { type: Type.STRING },
                degree: { type: Type.STRING },
                field: { type: Type.STRING },
                year: { type: Type.STRING },
                gpa: { type: Type.STRING },
                highlights: { type: Type.STRING },
              },
            },
          },
          skills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                level: { type: Type.STRING },
                category: { type: Type.STRING },
              },
            },
          },
          projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                url: { type: Type.STRING },
                stack: { type: Type.STRING },
                status: { type: Type.STRING },
                highlights: { type: Type.STRING },
              },
            },
          },
          achievements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                organization: { type: Type.STRING },
                year: { type: Type.STRING },
                description: { type: Type.STRING },
              },
            },
          },
          social: {
            type: Type.OBJECT,
            properties: {
              github: { type: Type.STRING },
              linkedin: { type: Type.STRING },
              twitter: { type: Type.STRING },
              portfolio: { type: Type.STRING },
              youtube: { type: Type.STRING },
              instagram: { type: Type.STRING },
              other: { type: Type.STRING },
            },
          },
          personal: {
            type: Type.OBJECT,
            properties: {
              interests: { type: Type.STRING },
              languages: { type: Type.STRING },
              values: { type: Type.STRING },
              funFacts: { type: Type.STRING },
              personalityType: { type: Type.STRING },
            },
          },
          goals: {
            type: Type.OBJECT,
            properties: {
              shortTerm: { type: Type.STRING },
              longTerm: { type: Type.STRING },
              currentlyLearning: { type: Type.STRING },
              openTo: { type: Type.STRING },
            },
          },
        },
      },
    },
  });

  const responseText = result.text;
  if (!responseText) throw new Error('Empty response.');
  return JSON.parse(responseText);
}

function sendError(res: express.Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  res.status(500).json({ error: message });
}

async function requireUser(req: express.Request, res: express.Response) {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!accessToken) {
    res.status(401).json({ error: 'Authentication is required.' });
    return null;
  }

  const supabase = getServerSupabase(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    res.status(401).json({ error: 'Your session is invalid or expired.' });
    return null;
  }

  return { user: data.user, supabase };
}

app.post('/api/ai/generate', async (req, res) => {
  try {
    const auth = await requireUser(req, res);
    if (!auth) return;

    const { userData, profileTree, generationMode: requestedMode } = req.body as {
      userData?: UserData;
      profileTree?: ProfileTree | null;
      generationMode?: SiteGenerationMode;
    };
    if (!userData) {
      res.status(400).json({ error: 'Missing userData payload.' });
      return;
    }

    const tier = await getSubscriptionTier(auth.supabase, auth.user.id);
    const generationMode: SiteGenerationMode =
      requestedMode === 'nextjs' && tier !== 'free' ? 'nextjs' : 'html';
    const content = await generateWebsiteContent(userData, generationMode, profileTree);
    res.json(content);
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/ai/refine', async (req, res) => {
  try {
    const auth = await requireUser(req, res);
    if (!auth) return;

    const { siteContent, refinementPrompt } = req.body as { siteContent?: SiteContent; refinementPrompt?: string };
    if (!siteContent?.html || !refinementPrompt) {
      res.status(400).json({ error: 'Missing refinement payload.' });
      return;
    }

    const tier = await getSubscriptionTier(auth.supabase, auth.user.id);
    const effectiveMode: SiteGenerationMode =
      tier === 'free' || siteContent.generationMode !== 'nextjs' ? 'html' : 'nextjs';
    const content = await refineWebsiteContent(
      {
        ...siteContent,
        generationMode: effectiveMode,
        framework: effectiveMode === 'nextjs' ? 'nextjs' : null,
      },
      refinementPrompt,
    );
    res.json(content);
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/ai/parse-linkedin', async (req, res) => {
  try {
    const auth = await requireUser(req, res);
    if (!auth) return;

    const { text } = req.body as { text?: string };
    if (!text) {
      res.status(400).json({ error: 'Missing text payload.' });
      return;
    }

    const parsed = await parseLinkedInText(text);
    res.json(parsed);
  } catch (error) {
    sendError(res, error);
  }
});

async function start() {
  if (!isProd) {
    const vite = await createViteServer({
      root: rootDir,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const templatePath = path.resolve(rootDir, 'index.html');
        let template = await fs.readFile(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (error) {
        if (error instanceof Error) {
          vite.ssrFixStacktrace(error);
        }
        next(error);
      }
    });
  } else {
    const distDir = path.resolve(rootDir, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.use('*', async (_, res) => {
      const html = await fs.readFile(path.join(distDir, 'index.html'), 'utf-8');
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    });
  }

  app.listen(port, () => {
    console.log(`Basestack server running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
