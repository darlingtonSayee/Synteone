const crypto = require("node:crypto");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const root = __dirname;
const loadLocalEnv = () => {
  [".env.local", ".env"].forEach((filename) => {
    const filePath = path.join(root, filename);
    if (!fsSync.existsSync(filePath)) return;
    const lines = fsSync.readFileSync(filePath, "utf8").split(/\r?\n/);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index === -1) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    });
  });
};
loadLocalEnv();

const dataPath = path.join(root, "data", "projects.json");
const settingsPath = path.join(root, "data", "settings.json");
const pagesPath = path.join(root, "data", "pages.json");
const adminUsersPath = path.join(root, "data", "admin-users.json");
const messagesPath = path.join(root, "data", "messages.json");
const uploadsDir = path.join(root, "uploads");
const port = Number(process.env.PORT || 4173);
const adminEmail = process.env.ADMIN_EMAIL || "admin@synteone.local";
const adminPassword = process.env.ADMIN_PASSWORD || "change-me-now";
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || "";
const adminRole = process.env.ADMIN_ROLE || "super_admin";
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const envOpenAiKey = process.env.OPENAI_API_KEY || "";
const envOpenAiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const sessions = new Map();
const contactRateLimits = new Map();

const parseEnvAdminUsers = () => {
  if (process.env.ADMIN_USERS) {
    try {
      const users = JSON.parse(process.env.ADMIN_USERS);
      if (Array.isArray(users) && users.length > 0) return users;
    } catch {
      console.warn("ADMIN_USERS is not valid JSON. Falling back to the default admin user.");
    }
  }
  return [
    {
      id: "bootstrap-super-admin",
      email: adminEmail,
      password: adminPassword,
      passwordHash: adminPasswordHash,
      role: adminRole,
      updatedAt: new Date().toISOString(),
    },
  ];
};

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
    model: envOpenAiModel,
  },
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const send = (res, status, body, headers = {}) => {
  const isObject = typeof body === "object" && !Buffer.isBuffer(body);
  const payload = isObject ? JSON.stringify(body) : body;
  res.writeHead(status, {
    "Content-Type": isObject ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    ...headers,
  });
  res.end(payload);
};

const readBody = async (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });

const readRawBody = async (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 12_000_000) {
        reject(new Error("Upload is too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const parseCookies = (req) =>
  Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key]) => key),
  );

const sign = (value) =>
  crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");

const passwordHashIterations = 100000;
const legacyPasswordHashIterations = 210000;

const hashPassword = (password, salt, iterations = passwordHashIterations) =>
  crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");

const createPasswordHash = (password) => {
  const salt = crypto.randomBytes(16).toString("base64url");
  return `${salt}:${passwordHashIterations}:${hashPassword(password, salt)}`;
};

const verifyPassword = (password, user) => {
  const passwordHash = user.passwordHash || "";
  if (!passwordHash) return password === (user.password || "");
  const [salt, storedIterations, storedHash] = passwordHash.split(":");
  const iterations = storedHash ? Number(storedIterations) : passwordHashIterations;
  const expected = storedHash || storedIterations;
  if (!salt || !expected) return false;
  const actual = Number.isFinite(iterations) && iterations > 0 ? hashPassword(password, salt, iterations) : "";
  if (actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) return true;
  if (storedHash) return false;
  const legacyActual = hashPassword(password, salt, legacyPasswordHashIterations);
  return legacyActual.length === expected.length && crypto.timingSafeEqual(Buffer.from(legacyActual), Buffer.from(expected));
};

const createSession = (user) => {
  const id = crypto.randomBytes(32).toString("base64url");
  sessions.set(id, { createdAt: Date.now(), email: user.email, role: user.role || "viewer" });
  return `${id}.${sign(id)}`;
};

const getSession = (req) => {
  const token = parseCookies(req).synteone_admin;
  if (!token) return null;
  const [id, signature] = token.split(".");
  if (!id || signature !== sign(id)) return null;
  return sessions.get(id) || null;
};

const requireAuth = (req, res) => {
  if (getSession(req)) return true;
  send(res, 401, { error: "Sign in required" });
  return false;
};

const currentRole = (req) => {
  const role = getSession(req)?.role || adminRole;
  return roles[role] ? role : "viewer_admin";
};

const can = (permission, req) => roles[currentRole(req)].permissions.includes(permission);

const requirePermission = (req, res, permission) => {
  if (!requireAuth(req, res)) return false;
  if (can(permission, req)) return true;
  send(res, 403, { error: "Your admin role cannot make this change" });
  return false;
};

const loadProjects = async () => {
  try {
    const data = JSON.parse(await fs.readFile(dataPath, "utf8"));
    return Array.isArray(data.projects) ? data.projects : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const saveProjects = async (projects) => {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify({ projects }, null, 2), "utf8");
};

const mergeSettings = (settings) => ({
  hero: { ...defaultSettings.hero, ...(settings.hero || {}) },
  announcement: { ...defaultSettings.announcement, ...(settings.announcement || {}) },
  media: { ...defaultSettings.media, ...(settings.media || {}) },
  advertisement: { ...defaultSettings.advertisement, ...(settings.advertisement || {}) },
  siteCopy: { ...defaultSettings.siteCopy, ...(settings.siteCopy || {}) },
  emailjs: { ...defaultSettings.emailjs, ...(settings.emailjs || {}) },
  ai: { ...defaultSettings.ai, ...(settings.ai || {}) },
});

const loadSettings = async () => {
  try {
    return mergeSettings(JSON.parse(await fs.readFile(settingsPath, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return defaultSettings;
    throw error;
  }
};

const saveSettings = async (settings) => {
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(mergeSettings(settings), null, 2), "utf8");
};

const publicSettings = (settings) => ({
  hero: settings.hero,
  announcement: settings.announcement,
  media: settings.media,
  advertisement: settings.advertisement,
  siteCopy: settings.siteCopy,
});

const loadPages = async () => {
  try {
    const data = JSON.parse(await fs.readFile(pagesPath, "utf8"));
    return Array.isArray(data.pages) ? data.pages : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const savePages = async (pages) => {
  await fs.mkdir(path.dirname(pagesPath), { recursive: true });
  await fs.writeFile(pagesPath, JSON.stringify({ pages }, null, 2), "utf8");
};

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

const cleanList = (items, mapper) =>
  Array.isArray(items)
    ? items.map((item, index) => mapper(item || {}, index)).filter(Boolean)
    : [];

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

const loadMessages = async () => {
  try {
    const data = JSON.parse(await fs.readFile(messagesPath, "utf8"));
    return Array.isArray(data.messages) ? data.messages : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const saveMessages = async (messages) => {
  await fs.mkdir(path.dirname(messagesPath), { recursive: true });
  await fs.writeFile(messagesPath, JSON.stringify({ messages }, null, 2), "utf8");
};

const loadAdminUsers = async () => {
  try {
    const data = JSON.parse(await fs.readFile(adminUsersPath, "utf8"));
    if (Array.isArray(data.users) && data.users.length > 0) return data.users;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return parseEnvAdminUsers();
};

const saveAdminUsers = async (users) => {
  const normalized = users.map((user) => {
    const next = { ...user };
    if (!next.passwordHash && next.password) next.passwordHash = createPasswordHash(next.password);
    delete next.password;
    next.role = roles[next.role] ? next.role : "viewer_admin";
    next.updatedAt = next.updatedAt || new Date().toISOString();
    return next;
  });
  await fs.mkdir(path.dirname(adminUsersPath), { recursive: true });
  await fs.writeFile(adminUsersPath, JSON.stringify({ users: normalized }, null, 2), "utf8");
};

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: roles[user.role] ? user.role : "viewer_admin",
  roleLabel: roles[roles[user.role] ? user.role : "viewer_admin"].label,
  name: user.name || "",
  active: user.active !== false,
  invited: Boolean(user.invitationHash && !user.passwordHash),
  invitationExpiresAt: user.invitationExpiresAt || "",
  updatedAt: user.updatedAt,
});

const cleanAdminUser = (user, existing = {}) => {
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
  if (user.password) next.passwordHash = createPasswordHash(String(user.password));
  return next;
};

const createTokenPair = () => {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    hash: crypto.createHash("sha256").update(token).digest("base64url"),
  };
};

const parseMultipartUpload = async (req) => {
  const contentType = req.headers["content-type"] || "";
  const boundary = contentType.match(/boundary=(.+)$/)?.[1];
  if (!boundary) throw new Error("Missing upload boundary");
  const raw = await readRawBody(req);
  const body = raw.toString("binary");
  const boundaryText = `--${boundary}`;
  const part = body.split(boundaryText).find((item) => item.includes("filename="));
  if (!part) throw new Error("No file uploaded");

  const headerEnd = part.indexOf("\r\n\r\n");
  const headers = part.slice(0, headerEnd);
  const fileStart = Buffer.byteLength(body.slice(0, body.indexOf(part) + headerEnd + 4), "binary");
  const fileLength = Buffer.byteLength(part.slice(headerEnd + 4).replace(/\r\n--$/, "").replace(/\r\n$/, ""), "binary");
  const filename = headers.match(/filename="([^"]+)"/)?.[1] || "upload.bin";
  const ext = path.extname(filename).toLowerCase();
  const allowed = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".mp4", ".webm"]);
  if (!allowed.has(ext)) throw new Error("Unsupported file type");
  const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  await fs.mkdir(uploadsDir, { recursive: true });
  const outputPath = path.join(uploadsDir, safeName);
  await fs.writeFile(outputPath, raw.subarray(fileStart, fileStart + fileLength));
  return { path: `uploads/${safeName}` };
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

const fetchSourceText = async (sourceUrl) => {
  if (!sourceUrl) return "";
  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": "SynteoneAdmin/1.0" },
    signal: AbortSignal.timeout(8000),
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
  const base = sourceText
    ? sourceText.split(/[.!?]/).find((line) => line.trim().length > 30)?.trim()
    : "";
  return {
    usedAi: false,
    shortDescription: `${projectName} is a ${status || "current"} Synteone software project built around a clear customer problem.`,
    longDescription:
      base ||
      `${projectName} is managed as one focused product inside Synteone. The product description should explain the problem it solves, the customer it serves, and why it is ready to appear publicly.`,
  };
};

const getAiConfig = async () => {
  const settings = await loadSettings();
  const ai = settings.ai || {};
  return {
    enabled: Boolean(ai.enabled),
    key: ai.openAiKey || envOpenAiKey,
    model: ai.model || envOpenAiModel,
  };
};

const aiDraft = async ({ name, status, sourceText }) => {
  const aiConfig = await getAiConfig();
  if (!aiConfig.enabled || !aiConfig.key) return fallbackDraft({ name, status, sourceText });

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
      Authorization: `Bearer ${aiConfig.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiConfig.model,
      input: prompt,
    }),
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

const aiEnhancePage = async ({ title, intro, body, sourceText }) => {
  const aiConfig = await getAiConfig();
  if (!aiConfig.enabled || !aiConfig.key) return fallbackPageEnhancement({ title, intro, body, sourceText });

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
      Authorization: `Bearer ${aiConfig.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiConfig.model,
      input: prompt,
    }),
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

const cleanContactMessage = (body, req) => ({
  id: crypto.randomUUID(),
  name: String(body.name || "").trim(),
  email: String(body.email || "").trim(),
  phone: String(body.phone || "").trim(),
  subject: String(body.subject || "Website enquiry").trim(),
  message: String(body.message || "").trim(),
  ip: req.socket.remoteAddress || "",
  userAgent: req.headers["user-agent"] || "",
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

const contactIsRateLimited = (req) => {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (contactRateLimits.get(key) || []).filter((time) => now - time < 10 * 60 * 1000);
  recent.push(now);
  contactRateLimits.set(key, recent);
  return recent.length > 5;
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

const routeApi = async (req, res, url) => {
  if (req.method === "GET" && url.pathname === "/api/projects") {
    return send(res, 200, { projects: await loadProjects() });
  }

  if (req.method === "GET" && url.pathname === "/api/site-settings") {
    return send(res, 200, publicSettings(await loadSettings()));
  }

  if (req.method === "POST" && url.pathname === "/api/contact") {
    const body = await readBody(req);
    if (body.website) return send(res, 200, { ok: true });
    if (contactIsRateLimited(req)) return send(res, 429, { error: "Please wait before sending another message." });
    const message = cleanContactMessage(body, req);
    if (!message.name || !message.email || !message.message) {
      return send(res, 400, { error: "Name, email, and message are required." });
    }
    const settings = await loadSettings();
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
    const messages = await loadMessages();
    messages.unshift(message);
    await saveMessages(messages.slice(0, 1000));
    return send(res, 201, { ok: true, emailSent: message.emailSent });
  }

  if (req.method === "GET" && url.pathname === "/api/pages") {
    const pages = (await loadPages()).filter((page) => page.published);
    return send(res, 200, { pages });
  }

  const publicPageMatch = url.pathname.match(/^\/api\/pages\/([^/]+)$/);
  if (req.method === "GET" && publicPageMatch) {
    const slug = decodeURIComponent(publicPageMatch[1]);
    const page = (await loadPages()).find((item) => item.slug === slug && item.published);
    if (!page) return send(res, 404, { error: "Page not found" });
    return send(res, 200, page);
  }

  if (req.method === "GET" && url.pathname === "/api/admin/session") {
    const session = getSession(req);
    if (!session) {
      send(res, 401, { error: "Sign in required" });
      return;
    }
    const role = currentRole(req);
    return send(res, 200, {
      email: session.email,
      role,
      roleLabel: roles[role].label,
      permissions: roles[role].permissions,
      roles,
    });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readBody(req);
    const adminUsers = await loadAdminUsers();
    const user = adminUsers.find((item) => item.email === body.email);
    if (!user || !verifyPassword(body.password || "", user)) {
      return send(res, 401, { error: "Invalid email or password" });
    }
    if (user.active === false) return send(res, 403, { error: "This admin account is inactive" });
    const token = createSession(user);
    return send(res, 200, { ok: true }, {
      "Set-Cookie": `synteone_admin=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`,
    });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    const token = parseCookies(req).synteone_admin;
    if (token) sessions.delete(token.split(".")[0]);
    return send(res, 200, { ok: true }, {
      "Set-Cookie": "synteone_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
    });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/password-reset") {
    const body = await readBody(req);
    const users = await loadAdminUsers();
    const index = users.findIndex((user) => user.email === String(body.email || "").trim());
    let resetLink = "";
    let emailResult = { sent: false, reason: "Admin email was not found" };
    if (index !== -1) {
      const pair = createTokenPair();
      users[index].resetHash = pair.hash;
      users[index].resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      users[index].updatedAt = new Date().toISOString();
      await saveAdminUsers(users);
      resetLink = `http://${req.headers.host}/admin-activate.html?mode=reset&token=${pair.token}`;
      const settings = await loadSettings();
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
    return send(res, 200, {
      ok: true,
      emailSent: index === -1 ? true : emailResult.sent,
      emailStatus: emailResult.reason,
      resetLink: emailResult.sent ? "" : resetLink,
    });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/password-reset/complete") {
    const body = await readBody(req);
    const hash = crypto.createHash("sha256").update(String(body.token || "")).digest("base64url");
    const users = await loadAdminUsers();
    const index = users.findIndex((user) => user.resetHash === hash && Date.parse(user.resetExpiresAt || "") > Date.now());
    if (index === -1) return send(res, 400, { error: "Reset link is invalid or expired" });
    if (!body.password || String(body.password).length < 10) return send(res, 400, { error: "Use a password with at least 10 characters" });
    users[index].passwordHash = createPasswordHash(String(body.password));
    users[index].resetHash = "";
    users[index].resetExpiresAt = "";
    users[index].active = true;
    users[index].updatedAt = new Date().toISOString();
    await saveAdminUsers(users);
    return send(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/invitations/accept") {
    const body = await readBody(req);
    const hash = crypto.createHash("sha256").update(String(body.token || "")).digest("base64url");
    const users = await loadAdminUsers();
    const index = users.findIndex((user) => user.invitationHash === hash && Date.parse(user.invitationExpiresAt || "") > Date.now());
    if (index === -1) return send(res, 400, { error: "Invitation link is invalid or expired" });
    if (!body.password || String(body.password).length < 10) return send(res, 400, { error: "Use a password with at least 10 characters" });
    users[index].passwordHash = createPasswordHash(String(body.password));
    users[index].invitationHash = "";
    users[index].invitationExpiresAt = "";
    users[index].active = true;
    users[index].updatedAt = new Date().toISOString();
    await saveAdminUsers(users);
    return send(res, 200, { ok: true });
  }

  if (!requireAuth(req, res)) return;

  if (req.method === "GET" && url.pathname === "/api/admin/projects") {
    return send(res, 200, { projects: await loadProjects() });
  }

  if (req.method === "GET" && url.pathname === "/api/admin/settings") {
    return send(res, 200, await loadSettings());
  }

  if (req.method === "GET" && url.pathname === "/api/admin/pages") {
    return send(res, 200, { pages: await loadPages() });
  }

  if (req.method === "GET" && url.pathname === "/api/admin/messages") {
    if (!requirePermission(req, res, "messages")) return;
    return send(res, 200, { messages: await loadMessages() });
  }

  const adminMessageMatch = url.pathname.match(/^\/api\/admin\/messages\/([^/]+)$/);
  if (adminMessageMatch) {
    if (!requirePermission(req, res, "messages")) return;
    const messages = await loadMessages();
    const index = messages.findIndex((message) => message.id === adminMessageMatch[1]);
    if (index === -1) return send(res, 404, { error: "Message not found" });
    if (req.method === "DELETE") {
      messages.splice(index, 1);
      await saveMessages(messages);
      return send(res, 200, { ok: true });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/admin/pages") {
    if (!requirePermission(req, res, "pages")) return;
    const pages = await loadPages();
    const page = cleanPage(await readBody(req));
    if (!page.slug || !page.title) return send(res, 400, { error: "Page title and slug are required" });
    if (pages.some((item) => item.slug === page.slug)) return send(res, 409, { error: "A page with this slug already exists" });
    pages.push(page);
    await savePages(pages);
    return send(res, 201, page);
  }

  const adminPageMatch = url.pathname.match(/^\/api\/admin\/pages\/([^/]+)$/);
  if (adminPageMatch) {
    if (!requirePermission(req, res, "pages")) return;
    const id = adminPageMatch[1];
    const pages = await loadPages();
    const index = pages.findIndex((page) => page.id === id);
    if (index === -1) return send(res, 404, { error: "Page not found" });

    if (req.method === "PUT") {
      const next = cleanPage({ ...(await readBody(req)), id });
      if (!next.slug || !next.title) return send(res, 400, { error: "Page title and slug are required" });
      if (pages.some((page) => page.slug === next.slug && page.id !== id)) {
        return send(res, 409, { error: "A page with this slug already exists" });
      }
      pages[index] = next;
      await savePages(pages);
      return send(res, 200, next);
    }

    if (req.method === "DELETE") {
      pages.splice(index, 1);
      await savePages(pages);
      return send(res, 200, { ok: true });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/admin/users") {
    if (!requirePermission(req, res, "users")) return;
    return send(res, 200, { users: (await loadAdminUsers()).map(publicUser) });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/users") {
    if (!requirePermission(req, res, "users")) return;
    const users = await loadAdminUsers();
    const user = cleanAdminUser(await readBody(req));
    if (!user.email || !user.passwordHash) return send(res, 400, { error: "Email and password are required" });
    if (users.some((item) => item.email === user.email)) return send(res, 409, { error: "Admin email already exists" });
    users.push(user);
    await saveAdminUsers(users);
    return send(res, 201, publicUser(user));
  }

  if (req.method === "POST" && url.pathname === "/api/admin/invitations") {
    if (!requirePermission(req, res, "users")) return;
    const body = await readBody(req);
    const users = await loadAdminUsers();
    const email = String(body.email || "").trim();
    if (!email) return send(res, 400, { error: "Admin email is required" });
    if (users.some((item) => item.email === email)) return send(res, 409, { error: "Admin email already exists" });
    const pair = createTokenPair();
    const user = cleanAdminUser({
      email,
      name: body.name,
      role: body.role,
      active: false,
    });
    user.passwordHash = "";
    user.invitationHash = pair.hash;
    user.invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    users.push(user);
    await saveAdminUsers(users);
    const inviteLink = `http://${req.headers.host}/admin-activate.html?mode=invite&token=${pair.token}`;
    const settings = await loadSettings();
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
    return send(res, 201, { user: publicUser(user), inviteLink, emailSent: emailResult.sent, emailStatus: emailResult.reason });
  }

  const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (adminUserMatch) {
    if (!requirePermission(req, res, "users")) return;
    const id = adminUserMatch[1];
    const users = await loadAdminUsers();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return send(res, 404, { error: "Admin user not found" });

    if (req.method === "PUT") {
      users[index] = cleanAdminUser(await readBody(req), users[index]);
      await saveAdminUsers(users);
      return send(res, 200, publicUser(users[index]));
    }

    if (req.method === "DELETE") {
      users.splice(index, 1);
      await saveAdminUsers(users);
      return send(res, 200, { ok: true });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/admin/upload") {
    if (!requireAuth(req, res)) return;
    if (!can("media", req) && !can("pages", req)) return send(res, 403, { error: "Your admin role cannot upload files" });
    return send(res, 201, await parseMultipartUpload(req));
  }

  if (req.method === "PUT" && url.pathname === "/api/admin/settings") {
    const body = await readBody(req);
    const existing = await loadSettings();
    const next = mergeSettings(existing);
    if (body.hero !== undefined) {
      if (!can("site", req)) return send(res, 403, { error: "Your admin role cannot edit site copy" });
      next.hero = { ...next.hero, ...body.hero };
    }
    if (body.siteCopy !== undefined) {
      if (!can("site", req)) return send(res, 403, { error: "Your admin role cannot edit site copy" });
      next.siteCopy = { ...next.siteCopy, ...body.siteCopy };
    }
    if (body.media !== undefined) {
      if (!can("media", req)) return send(res, 403, { error: "Your admin role cannot edit media" });
      next.media = { ...next.media, ...body.media };
    }
    if (body.announcement !== undefined || body.advertisement !== undefined) {
      if (!can("ads", req)) return send(res, 403, { error: "Your admin role cannot edit advertisements" });
      if (body.announcement !== undefined) next.announcement = { ...next.announcement, ...body.announcement };
      if (body.advertisement !== undefined) next.advertisement = { ...next.advertisement, ...body.advertisement };
    }
    if (body.emailjs !== undefined) {
      if (!can("users", req)) return send(res, 403, { error: "Your admin role cannot edit EmailJS settings" });
      next.emailjs = { ...next.emailjs, ...body.emailjs };
    }
    if (body.ai !== undefined) {
      if (!can("users", req)) return send(res, 403, { error: "Your admin role cannot edit AI settings" });
      next.ai = { ...next.ai, ...body.ai };
    }
    await saveSettings(next);
    return send(res, 200, next);
  }

  if (req.method === "POST" && url.pathname === "/api/admin/projects") {
    if (!requirePermission(req, res, "projects")) return;
    const projects = await loadProjects();
    const project = cleanProject(await readBody(req));
    if (!project.name || !project.shortDescription) {
      return send(res, 400, { error: "Project name and short description are required" });
    }
    projects.push(project);
    await saveProjects(projects);
    return send(res, 201, project);
  }

  const projectMatch = url.pathname.match(/^\/api\/admin\/projects\/([^/]+)(?:\/move)?$/);
  if (projectMatch) {
    const id = projectMatch[1];
    const projects = await loadProjects();
    const index = projects.findIndex((project) => project.id === id);
    if (index === -1) return send(res, 404, { error: "Project not found" });

    if (req.method === "PUT") {
      if (!requirePermission(req, res, "projects")) return;
      projects[index] = { ...cleanProject({ ...(await readBody(req)), id }) };
      await saveProjects(projects);
      return send(res, 200, projects[index]);
    }

    if (req.method === "DELETE") {
      if (!requirePermission(req, res, "projects")) return;
      projects.splice(index, 1);
      await saveProjects(projects);
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST" && url.pathname.endsWith("/move")) {
      if (!requirePermission(req, res, "projects")) return;
      const { direction } = await readBody(req);
      const target = direction === "up" ? index - 1 : index + 1;
      if (target >= 0 && target < projects.length) {
        [projects[index], projects[target]] = [projects[target], projects[index]];
        await saveProjects(projects);
      }
      return send(res, 200, { projects });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/admin/ai-draft") {
    if (!requirePermission(req, res, "projects")) return;
    const body = await readBody(req);
    const sourceText = [body.sourceText || "", await fetchSourceText(body.sourceUrl || "")].join("\n").trim();
    return send(res, 200, await aiDraft({ ...body, sourceText }));
  }

  if (req.method === "POST" && url.pathname === "/api/admin/ai-enhance-page") {
    if (!requirePermission(req, res, "pages")) return;
    const body = await readBody(req);
    const sourceText = [body.body || "", body.intro || "", await fetchSourceText(body.sourceUrl || "")].join("\n").trim();
    return send(res, 200, await aiEnhancePage({ ...body, sourceText }));
  }

  send(res, 404, { error: "Not found" });
};

const serveStatic = async (req, res, url) => {
  const requested =
    url.pathname === "/"
      ? "/index.html"
      : url.pathname === "/admin"
        ? "/admin.html"
        : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requested));
  if (!filePath.startsWith(root)) return send(res, 403, "Forbidden");

  try {
    const body = await fs.readFile(filePath);
    const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(body);
  } catch {
    send(res, 404, "Not found");
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await routeApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    send(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, () => {
  console.log(`Synteone site running at http://localhost:${port}`);
  console.log(`Admin route: http://localhost:${port}/admin.html`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log("Default admin password is change-me-now. Set ADMIN_PASSWORD before deployment.");
  }
});
