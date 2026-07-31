const roles = {
  super_admin: {
    label: "Super Admin",
    permissions: ["projects", "site", "media", "ads", "pages", "users", "roles", "messages"],
  },
  content_admin: {
    label: "Content Admin",
    permissions: ["projects", "site", "pages"],
  },
  marketing_admin: {
    label: "Marketing Admin",
    permissions: ["media", "ads"],
  },
  viewer_admin: {
    label: "Viewer Admin",
    permissions: [],
  },
};

const defaultSettings = {
  hero: {
    kicker: "ONE COMPANY - MANY BRANDS",
    headline: "We are an African technology company.",
    copy: "We build innovative digital products for businesses and individuals, one focused product at a time.",
  },
  announcement: {
    enabled: false,
    label: "Update",
    text: "We are building our first public software product.",
    linkText: "See projects",
    linkUrl: "projects.html",
  },
  media: {
    logoUrl: "assets/logo-system/svg/icon-logo-mark_full-color.svg",
    heroVideoUrl: "",
    socialImageUrl: "assets/logo-system/png/social-profile-square_full-color.png",
  },
  advertisement: {
    enabled: false,
    title: "Digital products built close to real needs.",
    body: "We design products around how African businesses and individuals actually live, work, and make decisions.",
    linkText: "Talk to us",
    linkUrl: "contact.html",
  },
  siteCopy: {
    aboutHeroTitle: "We turn useful ideas into focused digital products.",
    aboutHeroIntro:
      "Synteone comes from synthesis and one. We bring many ideas into one company, then give each product the focus it needs to become useful and trusted.",
    aboutRegisteredText: "We are registered in Rwanda and building for African markets.",
    productsHeroTitle: "We build products when the problem is clear.",
    productsHeroIntro: "We create innovative digital products for businesses and individuals, then give each product our full focus until it is proven.",
    homeWhatKicker: "What we do",
    homeWhatTitle: "We build digital products across the markets people use every day.",
    homeWhatBody:
      "We build innovative digital products for businesses and individuals, spanning technology, financial services, hospitality and tourism, real estate, and retail and commerce.",
    homeWhyKicker: "Why from Africa",
    homeWhyTitle: "We build close to the market we serve.",
    homeWhyBodyOne:
      "Our customers need digital products that respect local operating realities, customer behavior, payment habits, and trust gaps.",
    homeWhyBodyTwo: "We compete on trust and genuine relevance, not on being the cheapest option.",
    homePrinciplesKicker: "Vision, mission, values",
    homePrinciplesTitle: "We keep our principles clear.",
    homeVision:
      "To become a leading African technology company, creating trusted digital products that improve how people live, work, and do business across Africa and beyond.",
    homeMission:
      "Synteone builds innovative digital products that solve real problems for businesses and individuals, starting in Africa.",
    homeValues:
      "Innovation\nTrust\nCustomer Success\nSimplicity\nExcellence\nIntegrity\nCollaboration\nContinuous Improvement\nAfrican Innovation with Global Standards",
    homeProjectsKicker: "Projects",
    homeProjectsTitle: "Our current work lives in one place.",
    projectsHeroTitle: "We will share our products when they are ready.",
    projectsHeroIntro: "We share current and upcoming work when it is ready for customers, partners, and the market.",
    contactHeroTitle: "Talk to us about the work.",
    contactHeroIntro: "For company, partnership, or investor enquiries, use the details below.",
    contactAddress: "Bigega, Gahondo, Busasamana, Nyanza, Amajyepfo, Rwanda",
    footerCompanyLine: "SYNTEONE LTD - Rwanda",
  },
  emailjs: {
    enabled: false,
    serviceId: "",
    templateId: "",
    publicKey: "",
    privateKey: "",
    adminTemplateId: "",
  },
  ai: {
    enabled: false,
    openAiKey: "",
    model: "gpt-4.1-mini",
  },
};

const allowedPageTypes = new Set([
  "standard",
  "team",
  "services",
  "projects",
  "contact",
  "faq",
  "testimonials",
  "gallery",
  "careers",
  "custom",
]);

const json = (body, status = 200, headers = {}) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });

const textResponse = (body, status = 200, headers = {}) =>
  new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });

const base64UrlEncode = (buffer) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64Encode = (buffer) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64Decode = (value) => {
  const binary = atob(value || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const randomToken = (bytes = 32) => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
};

const sha256 = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64UrlEncode(digest);
};

const passwordHashIterations = 100000;
const legacyPasswordHashIterations = 210000;

const hashPassword = async (password, salt, iterations = passwordHashIterations) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations,
    },
    key,
    256,
  );
  return base64UrlEncode(bits);
};

const createPasswordHash = async (password) => {
  const salt = randomToken(16);
  return `${salt}:${passwordHashIterations}:${await hashPassword(password, salt)}`;
};

const verifyPassword = async (password, user) => {
  const passwordHash = user.passwordHash || "";
  if (!passwordHash) return password === (user.password || "");
  const [salt, storedIterations, storedHash] = passwordHash.split(":");
  const iterations = storedHash ? Number(storedIterations) : passwordHashIterations;
  const expected = storedHash || storedIterations;
  if (!salt || !expected) return false;
  if (Number.isFinite(iterations) && iterations > 0) {
    const actual = await hashPassword(password, salt, iterations).catch(() => "");
    if (actual === expected) return true;
  }
  if (storedHash) return false;
  const legacyActual = await hashPassword(password, salt, legacyPasswordHashIterations).catch(() => "");
  return legacyActual === expected;
};

const parseCookies = (request) =>
  Object.fromEntries(
    (request.headers.get("Cookie") || "")
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key]) => key),
  );

const cookieOptions = (request, maxAge) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
};

const requireDb = (env) => {
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is not configured");
  return env.DB;
};

const getStore = async (env, key, fallback) => {
  const db = requireDb(env);
  const row = await db.prepare("SELECT value FROM cms_store WHERE key = ?").bind(key).first();
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
};

const putStore = async (env, key, value) => {
  const db = requireDb(env);
  await db
    .prepare(
      "INSERT INTO cms_store (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(key, JSON.stringify(value), new Date().toISOString())
    .run();
};

const mergeSettings = (settings = {}) => ({
  hero: { ...defaultSettings.hero, ...(settings.hero || {}) },
  announcement: { ...defaultSettings.announcement, ...(settings.announcement || {}) },
  media: { ...defaultSettings.media, ...(settings.media || {}) },
  advertisement: { ...defaultSettings.advertisement, ...(settings.advertisement || {}) },
  siteCopy: { ...defaultSettings.siteCopy, ...(settings.siteCopy || {}) },
  emailjs: { ...defaultSettings.emailjs, ...(settings.emailjs || {}) },
  ai: { ...defaultSettings.ai, ...(settings.ai || {}) },
});

const loadSettings = async (env) => mergeSettings(await getStore(env, "settings", defaultSettings));
const saveSettings = async (env, settings) => putStore(env, "settings", mergeSettings(settings));
const publicSettings = (settings) => ({
  hero: settings.hero,
  announcement: settings.announcement,
  media: settings.media,
  advertisement: settings.advertisement,
  siteCopy: settings.siteCopy,
});

const loadProjects = async (env) => await getStore(env, "projects", []);
const saveProjects = async (env, projects) => putStore(env, "projects", projects);
const loadPages = async (env) => await getStore(env, "pages", []);
const savePages = async (env, pages) => putStore(env, "pages", pages);
const loadMessages = async (env) => await getStore(env, "messages", []);
const saveMessages = async (env, messages) => putStore(env, "messages", messages);

const bootstrapAdminUser = (env) => ({
  id: "bootstrap-super-admin",
  email: env.ADMIN_EMAIL || "admin@synteone.local",
  password: env.ADMIN_PASSWORD || "change-me-now",
  passwordHash: env.ADMIN_PASSWORD_HASH || "",
  role: env.ADMIN_ROLE || "super_admin",
  active: true,
  updatedAt: new Date().toISOString(),
});

const loadAdminUsers = async (env) => {
  const stored = await getStore(env, "admin_users", []);
  if (Array.isArray(stored) && stored.length > 0) return stored;
  return [bootstrapAdminUser(env)];
};

const saveAdminUsers = async (env, users) => {
  const normalized = [];
  for (const user of users) {
    const next = { ...user };
    if (!next.passwordHash && next.password) next.passwordHash = await createPasswordHash(next.password);
    delete next.password;
    next.role = roles[next.role] ? next.role : "viewer_admin";
    next.updatedAt = next.updatedAt || new Date().toISOString();
    normalized.push(next);
  }
  await putStore(env, "admin_users", normalized);
};

const publicUser = (user) => {
  const role = roles[user.role] ? user.role : "viewer_admin";
  return {
    id: user.id,
    email: user.email,
    role,
    roleLabel: roles[role].label,
    name: user.name || "",
    active: user.active !== false,
    invited: Boolean(user.invitationHash && !user.passwordHash),
    invitationExpiresAt: user.invitationExpiresAt || "",
    updatedAt: user.updatedAt,
  };
};

const cleanAdminUser = async (user, existing = {}) => {
  const role = roles[user.role] ? user.role : "viewer_admin";
  const next = {
    id: existing.id || user.id || crypto.randomUUID(),
    email: String(user.email || existing.email || "").trim(),
    name: String(user.name || existing.name || "").trim(),
    role,
    passwordHash: existing.passwordHash || "",
    active: user.active === undefined ? existing.active !== false : Boolean(user.active),
    invitationHash: existing.invitationHash || "",
    invitationExpiresAt: existing.invitationExpiresAt || "",
    resetHash: existing.resetHash || "",
    resetExpiresAt: existing.resetExpiresAt || "",
    updatedAt: new Date().toISOString(),
  };
  if (user.password) next.passwordHash = await createPasswordHash(String(user.password));
  return next;
};

const createSession = async (env, user) => {
  const id = randomToken(32);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await requireDb(env)
    .prepare("INSERT INTO admin_sessions (id, email, role, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, user.email, user.role || "viewer_admin", expiresAt, new Date().toISOString())
    .run();
  return id;
};

const getSession = async (env, request) => {
  const id = parseCookies(request).synteone_admin;
  if (!id) return null;
  const session = await requireDb(env)
    .prepare("SELECT id, email, role, expires_at FROM admin_sessions WHERE id = ?")
    .bind(id)
    .first();
  if (!session || Date.parse(session.expires_at || "") <= Date.now()) return null;
  return session;
};

const deleteSession = async (env, request) => {
  const id = parseCookies(request).synteone_admin;
  if (!id) return;
  await requireDb(env).prepare("DELETE FROM admin_sessions WHERE id = ?").bind(id).run();
};

const requireAuth = async (env, request) => {
  const session = await getSession(env, request);
  if (!session) return { response: json({ error: "Sign in required" }, 401) };
  const role = roles[session.role] ? session.role : "viewer_admin";
  return { session, role };
};

const requirePermission = async (env, request, permission) => {
  const auth = await requireAuth(env, request);
  if (auth.response) return auth;
  if (roles[auth.role].permissions.includes(permission)) return auth;
  return { response: json({ error: "Your admin role cannot make this change" }, 403) };
};

const can = (role, permission) => roles[role]?.permissions.includes(permission);

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const sanitizeHtml = (value) =>
  String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+="[^"]*"/gi, "")
    .replace(/\son[a-z]+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");

const cleanList = (items, mapper) =>
  Array.isArray(items) ? items.map((item, index) => mapper(item || {}, index)).filter(Boolean) : [];

const cleanPage = (page) => {
  const pageType = allowedPageTypes.has(page.pageType) ? page.pageType : "standard";
  const title = String(page.title || "").trim();
  return {
    id: page.id || crypto.randomUUID(),
    pageType,
    layout: ["standard", "wide", "landing"].includes(page.layout) ? page.layout : "standard",
    slug: slugify(page.slug || title),
    navLabel: String(page.navLabel || title || "").trim(),
    title,
    seoTitle: String(page.seoTitle || title || "").trim(),
    metaDescription: String(page.metaDescription || page.intro || "").trim().slice(0, 180),
    intro: String(page.intro || "").trim(),
    body: String(page.body || "").trim(),
    bodyHtml: sanitizeHtml(page.bodyHtml || ""),
    featuredImage: String(page.featuredImage || "").trim(),
    buttonText: String(page.buttonText || "").trim(),
    buttonLink: String(page.buttonLink || "").trim(),
    published: Boolean(page.published),
    contentBlocks: cleanList(page.contentBlocks, (block, index) => ({
      id: block.id || crypto.randomUUID(),
      type: ["text", "image", "button"].includes(block.type) ? block.type : "text",
      title: String(block.title || "").trim(),
      body: sanitizeHtml(block.body || ""),
      image: String(block.image || "").trim(),
      linkText: String(block.linkText || "").trim(),
      linkUrl: String(block.linkUrl || "").trim(),
      order: Number(block.order ?? index),
      active: block.active !== false,
    })),
    teamMembers: cleanList(page.teamMembers, (member, index) => ({
      id: member.id || crypto.randomUUID(),
      headshot: String(member.headshot || "").trim(),
      fullName: String(member.fullName || "").trim(),
      jobTitle: String(member.jobTitle || "").trim(),
      biography: String(member.biography || "").trim(),
      email: String(member.email || "").trim(),
      phone: String(member.phone || "").trim(),
      linkedin: String(member.linkedin || "").trim(),
      facebook: String(member.facebook || "").trim(),
      x: String(member.x || "").trim(),
      instagram: String(member.instagram || "").trim(),
      order: Number(member.order ?? index),
      active: member.active !== false,
    })).filter((member) => member.fullName),
    services: cleanList(page.services, (service, index) => ({
      id: service.id || crypto.randomUUID(),
      icon: String(service.icon || "").trim(),
      title: String(service.title || "").trim(),
      description: String(service.description || "").trim(),
      featuredImage: String(service.featuredImage || "").trim(),
      buttonText: String(service.buttonText || "").trim(),
      buttonLink: String(service.buttonLink || "").trim(),
      order: Number(service.order ?? index),
      active: service.active !== false,
    })).filter((service) => service.title),
    pageProjects: cleanList(page.pageProjects, (project, index) => ({
      id: project.id || crypto.randomUUID(),
      image: String(project.image || "").trim(),
      name: String(project.name || "").trim(),
      description: String(project.description || "").trim(),
      category: String(project.category || "").trim(),
      status: String(project.status || "").trim(),
      externalLink: String(project.externalLink || "").trim(),
      gallery: String(project.gallery || "")
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
      order: Number(project.order ?? index),
      active: project.active !== false,
    })).filter((project) => project.name),
    faqs: cleanList(page.faqs, (faq, index) => ({
      id: faq.id || crypto.randomUUID(),
      question: String(faq.question || "").trim(),
      answer: String(faq.answer || "").trim(),
      order: Number(faq.order ?? index),
      active: faq.active !== false,
    })).filter((faq) => faq.question),
    testimonials: cleanList(page.testimonials, (testimonial, index) => ({
      id: testimonial.id || crypto.randomUUID(),
      quote: String(testimonial.quote || "").trim(),
      name: String(testimonial.name || "").trim(),
      role: String(testimonial.role || "").trim(),
      image: String(testimonial.image || "").trim(),
      order: Number(testimonial.order ?? index),
      active: testimonial.active !== false,
    })).filter((testimonial) => testimonial.quote),
    gallery: cleanList(page.gallery, (item, index) => ({
      id: item.id || crypto.randomUUID(),
      image: String(item.image || "").trim(),
      caption: String(item.caption || "").trim(),
      order: Number(item.order ?? index),
      active: item.active !== false,
    })).filter((item) => item.image),
    updatedAt: new Date().toISOString(),
  };
};

const cleanProject = (project) => ({
  id: project.id || crypto.randomUUID(),
  name: String(project.name || "").trim(),
  status: project.status === "upcoming" ? "upcoming" : "current",
  shortDescription: String(project.shortDescription || "").trim(),
  longDescription: String(project.longDescription || "").trim(),
  image: String(project.image || "").trim(),
  link: String(project.link || "").trim(),
  updatedAt: new Date().toISOString(),
});

const cleanContactMessage = (body, request) => ({
  id: crypto.randomUUID(),
  name: String(body.name || "").trim(),
  email: String(body.email || "").trim(),
  phone: String(body.phone || "").trim(),
  subject: String(body.subject || "Website enquiry").trim(),
  message: String(body.message || "").trim(),
  ip: request.headers.get("CF-Connecting-IP") || "",
  userAgent: request.headers.get("User-Agent") || "",
  emailSent: false,
  emailStatus: "",
  createdAt: new Date().toISOString(),
});

const emailTemplateParams = (message) => {
  const fromName = message.from_name || message.name || "Website visitor";
  const fromEmail = message.from_email || message.email || "";
  const toEmail = message.to_email || "info@Synteone.com";
  const subject = message.subject || "Website enquiry";
  return {
    company_name: "Synteone",
    site_name: "Synteone",
    submitted_at: new Date().toISOString(),
    name: fromName,
    email: fromEmail,
    from_name: fromName,
    from_email: fromEmail,
    reply_to: fromEmail,
    to_name: message.to_name || "Synteone",
    to_email: toEmail,
    subject,
    title: message.headline || subject,
    ...message,
  };
};

const readJson = async (request) => {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
};

const contactIsRateLimited = async (env, request) => {
  const db = requireDb(env);
  const key = request.headers.get("CF-Connecting-IP") || "unknown";
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await db.prepare("DELETE FROM contact_rate_limits WHERE created_at < ?").bind(since).run();
  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM contact_rate_limits WHERE rate_key = ? AND created_at >= ?")
    .bind(key, since)
    .first();
  await db
    .prepare("INSERT INTO contact_rate_limits (id, rate_key, created_at) VALUES (?, ?, ?)")
    .bind(crypto.randomUUID(), key, new Date().toISOString())
    .run();
  return Number(row?.count || 0) >= 5;
};

const sendViaEmailJs = async (settings, message, templateIdOverride = "") => {
  const emailjs = settings.emailjs || {};
  const templateId = templateIdOverride || emailjs.templateId;
  if (!emailjs.enabled || !emailjs.serviceId || !templateId || !emailjs.publicKey) {
    return { sent: false, reason: "EmailJS is not configured" };
  }

  const payload = {
    service_id: String(emailjs.serviceId).trim(),
    template_id: String(templateId).trim(),
    user_id: String(emailjs.publicKey).trim(),
    template_params: emailTemplateParams(message),
  };
  if (emailjs.privateKey) payload.accessToken = String(emailjs.privateKey).trim();

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response.ok) return { sent: true, reason: "OK" };
  const reason = await response.text().catch(() => response.statusText);
  return { sent: false, reason: `EmailJS ${response.status}: ${reason || response.statusText}`.slice(0, 300) };
};

const fetchSourceText = async (sourceUrl) => {
  if (!sourceUrl) return "";
  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": "SynteoneAdmin/1.0" },
  });
  if (!response.ok) throw new Error("Source website could not be read");
  const html = await response.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
};

const fallbackDraft = ({ name, status, sourceText }) => {
  const projectName = name || "This project";
  const base = sourceText ? sourceText.split(/[.!?]/).find((line) => line.trim().length > 30)?.trim() : "";
  return {
    usedAi: false,
    shortDescription: `${projectName} is a ${status || "current"} Synteone software project built around a clear customer problem.`,
    longDescription:
      base ||
      `${projectName} is managed as one focused product inside Synteone. The product description should explain the problem it solves, the customer it serves, and why it is ready to appear publicly.`,
  };
};

const aiDraft = async (env, { name, status, sourceText }) => {
  const settings = await loadSettings(env);
  const ai = settings.ai || {};
  const key = ai.openAiKey || env.OPENAI_API_KEY || "";
  const model = ai.model || env.OPENAI_MODEL || "gpt-4.1-mini";
  if (!ai.enabled || !key) return fallbackDraft({ name, status, sourceText });

  const prompt = [
    "Write public website copy for a Synteone project card.",
    "Voice: direct, confident, plain. No hype. No competitor names.",
    "Synteone is an African technology company that builds innovative digital products for businesses and individuals.",
    "Return only JSON with shortDescription and longDescription.",
    `Project name: ${name || "Unnamed project"}`,
    `Project status: ${status || "current"}`,
    `Source material: ${sourceText || "No source material provided."}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: prompt }),
  });
  if (!response.ok) return fallbackDraft({ name, status, sourceText });
  const payload = await response.json();
  const text =
    payload.output_text ||
    payload.output?.flatMap((item) => item.content || [])?.find((item) => item.text)?.text ||
    "{}";
  try {
    const parsed = JSON.parse(text);
    return {
      usedAi: true,
      shortDescription: String(parsed.shortDescription || "").trim(),
      longDescription: String(parsed.longDescription || "").trim(),
    };
  } catch {
    return fallbackDraft({ name, status, sourceText });
  }
};

const fallbackPageEnhancement = ({ title, intro, body, sourceText }) => ({
  usedAi: false,
  title: title || "New Synteone page",
  intro: intro || "We use this page to share useful information clearly.",
  body:
    body ||
    sourceText ||
    "Write this page in a direct Synteone voice. Keep it practical, human, and easy to scan.",
});

const aiEnhancePage = async (env, { title, intro, body, sourceText }) => {
  const settings = await loadSettings(env);
  const ai = settings.ai || {};
  const key = ai.openAiKey || env.OPENAI_API_KEY || "";
  const model = ai.model || env.OPENAI_MODEL || "gpt-4.1-mini";
  if (!ai.enabled || !key) return fallbackPageEnhancement({ title, intro, body, sourceText });

  const prompt = [
    "Improve this Synteone website page copy.",
    "Voice: human, direct, confident, plain. Use we and our where natural.",
    "Do not mention founder credentials, TIN, competitors, or unrelated industries.",
    "Return only JSON with title, intro, and body.",
    `Current title: ${title || ""}`,
    `Current intro: ${intro || ""}`,
    `Current body or source: ${sourceText || body || ""}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: prompt }),
  });
  if (!response.ok) return fallbackPageEnhancement({ title, intro, body, sourceText });
  const payload = await response.json();
  const text =
    payload.output_text ||
    payload.output?.flatMap((item) => item.content || [])?.find((item) => item.text)?.text ||
    "{}";
  try {
    const parsed = JSON.parse(text);
    return {
      usedAi: true,
      title: String(parsed.title || title || "").trim(),
      intro: String(parsed.intro || intro || "").trim(),
      body: String(parsed.body || body || "").trim(),
    };
  } catch {
    return fallbackPageEnhancement({ title, intro, body, sourceText });
  }
};

const storeUpload = async (env, request) => {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") throw new Error("No file uploaded");
  const allowed = new Set(["image/svg+xml", "image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"]);
  if (!allowed.has(file.type)) throw new Error("Unsupported file type");
  if (file.size > 5_000_000) throw new Error("Upload is too large");
  const id = `${Date.now()}-${crypto.randomUUID()}`;
  const bodyBase64 = base64Encode(await file.arrayBuffer());
  await requireDb(env)
    .prepare(
      "INSERT INTO uploads (id, filename, content_type, body_base64, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id, file.name || "upload", file.type, bodyBase64, new Date().toISOString())
    .run();
  return { path: `/api/uploads/${id}` };
};

const getUpload = async (env, id) => {
  const row = await requireDb(env)
    .prepare("SELECT filename, content_type, body_base64 FROM uploads WHERE id = ?")
    .bind(id)
    .first();
  if (!row) return textResponse("Not found", 404);
  return new Response(base64Decode(row.body_base64), {
    headers: {
      "Content-Type": row.content_type || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

const buildActionLink = (request, mode, token) => {
  const url = new URL("/admin-activate.html", request.url);
  url.searchParams.set("mode", mode);
  url.searchParams.set("token", token);
  return url.toString();
};

const handleApi = async (env, request, url) => {
  if (request.method === "GET" && url.pathname === "/api/projects") {
    return json({ projects: await loadProjects(env) });
  }

  if (request.method === "GET" && url.pathname === "/api/site-settings") {
    return json(publicSettings(await loadSettings(env)));
  }

  if (request.method === "POST" && url.pathname === "/api/contact") {
    const body = await readJson(request);
    if (body.website) return json({ ok: true });
    if (await contactIsRateLimited(env, request)) return json({ error: "Please wait before sending another message." }, 429);
    const message = cleanContactMessage(body, request);
    if (!message.name || !message.email || !message.message) {
      return json({ error: "Name, email, and message are required." }, 400);
    }
    const settings = await loadSettings(env);
    const emailResult = await sendViaEmailJs(settings, {
      name: message.name,
      email: message.email,
      from_name: message.name,
      from_email: message.email,
      phone: message.phone,
      subject: message.subject,
      message: message.message,
      to_email: "info@Synteone.com",
    }).catch((error) => ({ sent: false, reason: error.message }));
    message.emailSent = emailResult.sent;
    message.emailStatus = emailResult.reason;
    const messages = await loadMessages(env);
    messages.unshift(message);
    await saveMessages(env, messages.slice(0, 1000));
    return json({ ok: true, emailSent: message.emailSent }, 201);
  }

  if (request.method === "GET" && url.pathname === "/api/pages") {
    return json({ pages: (await loadPages(env)).filter((page) => page.published) });
  }

  const publicPageMatch = url.pathname.match(/^\/api\/pages\/([^/]+)$/);
  if (request.method === "GET" && publicPageMatch) {
    const slug = decodeURIComponent(publicPageMatch[1]);
    const page = (await loadPages(env)).find((item) => item.slug === slug && item.published);
    if (!page) return json({ error: "Page not found" }, 404);
    return json(page);
  }

  const uploadMatch = url.pathname.match(/^\/api\/uploads\/([^/]+)$/);
  if (request.method === "GET" && uploadMatch) {
    return getUpload(env, uploadMatch[1]);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/session") {
    const auth = await requireAuth(env, request);
    if (auth.response) return auth.response;
    return json({
      email: auth.session.email,
      role: auth.role,
      roleLabel: roles[auth.role].label,
      permissions: roles[auth.role].permissions,
      roles,
    });
  }

  if (request.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readJson(request);
    const adminUsers = await loadAdminUsers(env);
    const user = adminUsers.find((item) => item.email === body.email);
    if (!user || !(await verifyPassword(body.password || "", user))) {
      return json({ error: "Invalid email or password" }, 401);
    }
    if (user.active === false) return json({ error: "This admin account is inactive" }, 403);
    const token = await createSession(env, user);
    return json(
      { ok: true },
      200,
      {
        "Set-Cookie": `synteone_admin=${token}; ${cookieOptions(request, 86400)}`,
      },
    );
  }

  if (request.method === "POST" && url.pathname === "/api/admin/logout") {
    await deleteSession(env, request);
    return json(
      { ok: true },
      200,
      {
        "Set-Cookie": `synteone_admin=; ${cookieOptions(request, 0)}`,
      },
    );
  }

  if (request.method === "POST" && url.pathname === "/api/admin/password-reset") {
    const body = await readJson(request);
    const users = await loadAdminUsers(env);
    const index = users.findIndex((user) => user.email === String(body.email || "").trim());
    let resetLink = "";
    let emailResult = { sent: false, reason: "Admin email was not found" };
    if (index !== -1) {
      const token = randomToken(32);
      users[index].resetHash = await sha256(token);
      users[index].resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      users[index].updatedAt = new Date().toISOString();
      await saveAdminUsers(env, users);
      resetLink = buildActionLink(request, "reset", token);
      const settings = await loadSettings(env);
      emailResult = await sendViaEmailJs(settings, {
        to_email: users[index].email,
        to_name: users[index].name || users[index].email,
        reset_link: resetLink,
        action_link: resetLink,
        action_label: "Reset password",
        headline: "Reset your Synteone admin password",
        subject: "Reset your Synteone admin password",
        message: `Use this secure link to reset your Synteone admin password: ${resetLink}`,
      }, settings.emailjs.adminTemplateId).catch(() => ({ sent: false }));
    }
    return json({
      ok: true,
      emailSent: index === -1 ? true : emailResult.sent,
      emailStatus: emailResult.reason,
      resetLink: emailResult.sent ? "" : resetLink,
    });
  }

  if (request.method === "POST" && url.pathname === "/api/admin/password-reset/complete") {
    const body = await readJson(request);
    const hash = await sha256(String(body.token || ""));
    const users = await loadAdminUsers(env);
    const index = users.findIndex((user) => user.resetHash === hash && Date.parse(user.resetExpiresAt || "") > Date.now());
    if (index === -1) return json({ error: "Reset link is invalid or expired" }, 400);
    if (!body.password || String(body.password).length < 10) return json({ error: "Use a password with at least 10 characters" }, 400);
    users[index].passwordHash = await createPasswordHash(String(body.password));
    users[index].resetHash = "";
    users[index].resetExpiresAt = "";
    users[index].active = true;
    users[index].updatedAt = new Date().toISOString();
    await saveAdminUsers(env, users);
    return json({ ok: true });
  }

  if (request.method === "POST" && url.pathname === "/api/admin/invitations/accept") {
    const body = await readJson(request);
    const hash = await sha256(String(body.token || ""));
    const users = await loadAdminUsers(env);
    const index = users.findIndex((user) => user.invitationHash === hash && Date.parse(user.invitationExpiresAt || "") > Date.now());
    if (index === -1) return json({ error: "Invitation link is invalid or expired" }, 400);
    if (!body.password || String(body.password).length < 10) return json({ error: "Use a password with at least 10 characters" }, 400);
    users[index].passwordHash = await createPasswordHash(String(body.password));
    users[index].invitationHash = "";
    users[index].invitationExpiresAt = "";
    users[index].active = true;
    users[index].updatedAt = new Date().toISOString();
    await saveAdminUsers(env, users);
    return json({ ok: true });
  }

  const auth = await requireAuth(env, request);
  if (auth.response) return auth.response;

  if (request.method === "GET" && url.pathname === "/api/admin/projects") {
    return json({ projects: await loadProjects(env) });
  }

  if (request.method === "GET" && url.pathname === "/api/admin/settings") {
    return json(await loadSettings(env));
  }

  if (request.method === "GET" && url.pathname === "/api/admin/pages") {
    return json({ pages: await loadPages(env) });
  }

  if (request.method === "GET" && url.pathname === "/api/admin/messages") {
    const check = await requirePermission(env, request, "messages");
    if (check.response) return check.response;
    return json({ messages: await loadMessages(env) });
  }

  const adminMessageMatch = url.pathname.match(/^\/api\/admin\/messages\/([^/]+)$/);
  if (adminMessageMatch) {
    const check = await requirePermission(env, request, "messages");
    if (check.response) return check.response;
    const messages = await loadMessages(env);
    const index = messages.findIndex((message) => message.id === adminMessageMatch[1]);
    if (index === -1) return json({ error: "Message not found" }, 404);
    if (request.method === "DELETE") {
      messages.splice(index, 1);
      await saveMessages(env, messages);
      return json({ ok: true });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/admin/pages") {
    const check = await requirePermission(env, request, "pages");
    if (check.response) return check.response;
    const pages = await loadPages(env);
    const page = cleanPage(await readJson(request));
    if (!page.slug || !page.title) return json({ error: "Page title and slug are required" }, 400);
    if (pages.some((item) => item.slug === page.slug)) return json({ error: "A page with this slug already exists" }, 409);
    pages.push(page);
    await savePages(env, pages);
    return json(page, 201);
  }

  const adminPageMatch = url.pathname.match(/^\/api\/admin\/pages\/([^/]+)$/);
  if (adminPageMatch) {
    const check = await requirePermission(env, request, "pages");
    if (check.response) return check.response;
    const id = adminPageMatch[1];
    const pages = await loadPages(env);
    const index = pages.findIndex((page) => page.id === id);
    if (index === -1) return json({ error: "Page not found" }, 404);

    if (request.method === "PUT") {
      const next = cleanPage({ ...(await readJson(request)), id });
      if (!next.slug || !next.title) return json({ error: "Page title and slug are required" }, 400);
      if (pages.some((page) => page.slug === next.slug && page.id !== id)) {
        return json({ error: "A page with this slug already exists" }, 409);
      }
      pages[index] = next;
      await savePages(env, pages);
      return json(next);
    }

    if (request.method === "DELETE") {
      pages.splice(index, 1);
      await savePages(env, pages);
      return json({ ok: true });
    }
  }

  if (request.method === "GET" && url.pathname === "/api/admin/users") {
    const check = await requirePermission(env, request, "users");
    if (check.response) return check.response;
    return json({ users: (await loadAdminUsers(env)).map(publicUser) });
  }

  if (request.method === "POST" && url.pathname === "/api/admin/users") {
    const check = await requirePermission(env, request, "users");
    if (check.response) return check.response;
    const users = await loadAdminUsers(env);
    const user = await cleanAdminUser(await readJson(request));
    if (!user.email || !user.passwordHash) return json({ error: "Email and password are required" }, 400);
    if (users.some((item) => item.email === user.email)) return json({ error: "Admin email already exists" }, 409);
    users.push(user);
    await saveAdminUsers(env, users);
    return json(publicUser(user), 201);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/invitations") {
    const check = await requirePermission(env, request, "users");
    if (check.response) return check.response;
    const body = await readJson(request);
    const users = await loadAdminUsers(env);
    const email = String(body.email || "").trim();
    if (!email) return json({ error: "Admin email is required" }, 400);
    if (users.some((item) => item.email === email)) return json({ error: "Admin email already exists" }, 409);
    const token = randomToken(32);
    const user = await cleanAdminUser({
      email,
      name: body.name,
      role: body.role,
      active: false,
    });
    user.passwordHash = "";
    user.invitationHash = await sha256(token);
    user.invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    users.push(user);
    await saveAdminUsers(env, users);
    const inviteLink = buildActionLink(request, "invite", token);
    const settings = await loadSettings(env);
    const emailResult = await sendViaEmailJs(settings, {
      to_email: user.email,
      to_name: user.name || user.email,
      invite_link: inviteLink,
      action_link: inviteLink,
      action_label: "Activate account",
      headline: "You have been invited to Synteone Admin",
      subject: "You have been invited to Synteone Admin",
      message: `Use this secure link to activate your Synteone admin account: ${inviteLink}`,
    }, settings.emailjs.adminTemplateId).catch(() => ({ sent: false }));
    return json({ user: publicUser(user), inviteLink, emailSent: emailResult.sent, emailStatus: emailResult.reason }, 201);
  }

  const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (adminUserMatch) {
    const check = await requirePermission(env, request, "users");
    if (check.response) return check.response;
    const id = adminUserMatch[1];
    const users = await loadAdminUsers(env);
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return json({ error: "Admin user not found" }, 404);

    if (request.method === "PUT") {
      users[index] = await cleanAdminUser(await readJson(request), users[index]);
      await saveAdminUsers(env, users);
      return json(publicUser(users[index]));
    }

    if (request.method === "DELETE") {
      users.splice(index, 1);
      await saveAdminUsers(env, users);
      return json({ ok: true });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/admin/upload") {
    if (!can(auth.role, "media") && !can(auth.role, "pages")) {
      return json({ error: "Your admin role cannot upload files" }, 403);
    }
    return json(await storeUpload(env, request), 201);
  }

  if (request.method === "PUT" && url.pathname === "/api/admin/settings") {
    const body = await readJson(request);
    const existing = await loadSettings(env);
    const next = mergeSettings(existing);
    if (body.hero !== undefined) {
      if (!can(auth.role, "site")) return json({ error: "Your admin role cannot edit site copy" }, 403);
      next.hero = { ...next.hero, ...body.hero };
    }
    if (body.siteCopy !== undefined) {
      if (!can(auth.role, "site")) return json({ error: "Your admin role cannot edit site copy" }, 403);
      next.siteCopy = { ...next.siteCopy, ...body.siteCopy };
    }
    if (body.media !== undefined) {
      if (!can(auth.role, "media")) return json({ error: "Your admin role cannot edit media" }, 403);
      next.media = { ...next.media, ...body.media };
    }
    if (body.announcement !== undefined || body.advertisement !== undefined) {
      if (!can(auth.role, "ads")) return json({ error: "Your admin role cannot edit advertisements" }, 403);
      if (body.announcement !== undefined) next.announcement = { ...next.announcement, ...body.announcement };
      if (body.advertisement !== undefined) next.advertisement = { ...next.advertisement, ...body.advertisement };
    }
    if (body.emailjs !== undefined) {
      if (!can(auth.role, "users")) return json({ error: "Your admin role cannot edit EmailJS settings" }, 403);
      next.emailjs = { ...next.emailjs, ...body.emailjs };
    }
    if (body.ai !== undefined) {
      if (!can(auth.role, "users")) return json({ error: "Your admin role cannot edit AI settings" }, 403);
      next.ai = { ...next.ai, ...body.ai };
    }
    await saveSettings(env, next);
    return json(next);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/projects") {
    const check = await requirePermission(env, request, "projects");
    if (check.response) return check.response;
    const projects = await loadProjects(env);
    const project = cleanProject(await readJson(request));
    if (!project.name || !project.shortDescription) {
      return json({ error: "Project name and short description are required" }, 400);
    }
    projects.push(project);
    await saveProjects(env, projects);
    return json(project, 201);
  }

  const projectMatch = url.pathname.match(/^\/api\/admin\/projects\/([^/]+)(?:\/move)?$/);
  if (projectMatch) {
    const id = projectMatch[1];
    const projects = await loadProjects(env);
    const index = projects.findIndex((project) => project.id === id);
    if (index === -1) return json({ error: "Project not found" }, 404);

    if (request.method === "PUT") {
      const check = await requirePermission(env, request, "projects");
      if (check.response) return check.response;
      projects[index] = { ...cleanProject({ ...(await readJson(request)), id }) };
      await saveProjects(env, projects);
      return json(projects[index]);
    }

    if (request.method === "DELETE") {
      const check = await requirePermission(env, request, "projects");
      if (check.response) return check.response;
      projects.splice(index, 1);
      await saveProjects(env, projects);
      return json({ ok: true });
    }

    if (request.method === "POST" && url.pathname.endsWith("/move")) {
      const check = await requirePermission(env, request, "projects");
      if (check.response) return check.response;
      const { direction } = await readJson(request);
      const target = direction === "up" ? index - 1 : index + 1;
      if (target >= 0 && target < projects.length) {
        [projects[index], projects[target]] = [projects[target], projects[index]];
        await saveProjects(env, projects);
      }
      return json({ projects });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/admin/ai-draft") {
    const check = await requirePermission(env, request, "projects");
    if (check.response) return check.response;
    const body = await readJson(request);
    const sourceText = [body.sourceText || "", await fetchSourceText(body.sourceUrl || "")].join("\n").trim();
    return json(await aiDraft(env, { ...body, sourceText }));
  }

  if (request.method === "POST" && url.pathname === "/api/admin/ai-enhance-page") {
    const check = await requirePermission(env, request, "pages");
    if (check.response) return check.response;
    const body = await readJson(request);
    const sourceText = [body.body || "", body.intro || "", await fetchSourceText(body.sourceUrl || "")].join("\n").trim();
    return json(await aiEnhancePage(env, { ...body, sourceText }));
  }

  return json({ error: "Not found" }, 404);
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  try {
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(env, request, url);
    }

    if (url.hostname.toLowerCase().startsWith("admin.") && url.pathname === "/") {
      return Response.redirect(new URL("/admin", request.url), 302);
    }

    return context.next();
  } catch (error) {
    return json({ error: error.message || "Server error" }, 500);
  }
}
