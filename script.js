const revealItems = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 },
);

revealItems.forEach((item) => revealObserver.observe(item));

const projectList = document.querySelector("[data-project-list]");
const projectTemplate = document.querySelector("[data-project-template]");
const emptyProjects = document.querySelector("[data-empty-projects]");
const projectCount = document.querySelector("[data-project-count]");
const projectLabel = window.location.pathname.endsWith("products.html") ? "product" : "project";
const siteFields = document.querySelectorAll("[data-site-field]");
const siteLists = document.querySelectorAll("[data-site-list]");
const siteVideo = document.querySelector("[data-site-video]");
const companyAd = document.querySelector("[data-company-ad]");
const customPageRoot = document.querySelector("[data-custom-page]");
const contactForm = document.querySelector("[data-contact-form]");
const contactMessage = document.querySelector("[data-contact-message]");
const brandLogoUrl = "assets/logo-system/svg/icon-logo-mark_full-color.svg";
const brandIconUrl = "assets/logo-system/svg/icon-logo-mark_full-color.svg";
const previewSettings =
  new URLSearchParams(window.location.search).get("preview") === "settings"
    ? JSON.parse(localStorage.getItem("synteoneSettingsPreview") || "null")
    : null;
const previewPage =
  new URLSearchParams(window.location.search).get("preview") === "page"
    ? JSON.parse(localStorage.getItem("synteonePagePreview") || "null")
    : null;

const setText = (root, selector, value) => {
  const element = root.querySelector(selector);
  if (element) element.textContent = value || "";
};

const getSetting = (settings, path) =>
  path.split(".").reduce((current, key) => current?.[key], settings);

const socialProfiles = [
  {
    key: "facebook",
    label: "Facebook",
    path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.3l.7-4h-4V7a1 1 0 0 1 1-1h3V2z",
  },
  {
    key: "instagram",
    label: "Instagram",
    path: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 2a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4zm5.2-2.6a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    path: "M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4v14h-4V8zm7 0h3.8v1.9h.1c.5-1 1.8-2.2 3.8-2.2 4 0 4.8 2.6 4.8 6V22h-4v-7.4c0-1.8 0-4-2.4-4s-2.8 1.9-2.8 3.9V22h-4V8z",
  },
  {
    key: "x",
    label: "X",
    path: "M18.9 2h3.1l-6.8 7.8L23.2 22h-6.3l-4.9-7.4L6.3 22H3.2l7.3-8.4L2.8 2h6.5l4.4 6.7L18.9 2zm-1.1 17.8h1.7L8.4 4.1H6.6l11.2 15.7z",
  },
  {
    key: "youtube",
    label: "YouTube",
    path: "M23.5 7.1a3 3 0 0 0-2.1-2.1C19.5 4.5 12 4.5 12 4.5s-7.5 0-9.4.5A3 3 0 0 0 .5 7.1 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 4.9 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-4.9zM9.6 15.5v-7l6.2 3.5-6.2 3.5z",
  },
  {
    key: "tiktok",
    label: "TikTok",
    path: "M16.8 2c.4 3 2.1 4.8 5.2 5v3.4a9 9 0 0 1-5.1-1.6v6.5c0 4.2-2.5 6.7-6.4 6.7a6.2 6.2 0 0 1-6.5-6.1 6.2 6.2 0 0 1 7.8-6v3.6c-.5-.2-.9-.3-1.4-.3a2.6 2.6 0 0 0-2.7 2.7 2.5 2.5 0 0 0 2.7 2.6c1.6 0 2.7-.9 2.7-3V2h3.7z",
  },
];

const normalizeUrl = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
};

const applyLogo = (logoUrl) => {
  const source = logoUrl || brandLogoUrl;
  document.querySelectorAll(".wordmark").forEach((wordmark) => {
    const image = document.createElement("img");
    image.src = source;
    image.alt = "Synteone";
    image.className = "wordmark-image";

    const name = document.createElement("span");
    name.className = "wordmark-name";

    const lead = document.createElement("span");
    lead.textContent = "SYNTE";

    const one = document.createElement("strong");
    one.textContent = "ONE";

    name.replaceChildren(lead, one);

    wordmark.replaceChildren(image, name);
  });
};

const applyAnnouncement = (announcement) => {
  if (!announcement?.enabled || document.querySelector("[data-announcement]")) return;
  const banner = document.createElement("aside");
  banner.className = "announcement";
  banner.dataset.announcement = "";

  const label = document.createElement("strong");
  label.textContent = announcement.label || "Update";
  const text = document.createElement("span");
  text.textContent = announcement.text || "";
  banner.append(label, text);

  if (announcement.linkUrl && announcement.linkText) {
    const link = document.createElement("a");
    link.href = announcement.linkUrl;
    link.textContent = announcement.linkText;
    banner.append(link);
  }

  document.body.insertBefore(banner, document.body.firstElementChild?.nextSibling || document.body.firstChild);
};

const applyAdvertisement = (advertisement) => {
  if (!companyAd || !advertisement?.enabled) return;
  companyAd.hidden = false;
  setText(companyAd, "[data-ad-title]", advertisement.title);
  setText(companyAd, "[data-ad-body]", advertisement.body);
  const link = companyAd.querySelector("[data-ad-link]");
  if (link) {
    link.textContent = advertisement.linkText || "Learn more";
    link.href = advertisement.linkUrl || "contact.html";
  }
};

const applyCompanySocialLinks = (socialLinks = {}) => {
  const links = socialProfiles
    .map((profile) => ({ ...profile, url: normalizeUrl(socialLinks[profile.key]) }))
    .filter((profile) => profile.url);
  const containers = [...document.querySelectorAll("[data-company-social]")];

  if (!containers.length) {
    document.querySelectorAll(".site-footer > div").forEach((footerContent) => {
      const container = document.createElement("div");
      container.className = "company-social-links";
      container.dataset.companySocial = "";
      footerContent.append(container);
      containers.push(container);
    });
  }

  containers.forEach((container) => {
    container.classList.add("company-social-links");
    container.replaceChildren();
    container.hidden = links.length === 0;
    links.forEach((profile) => {
      const anchor = document.createElement("a");
      anchor.className = "company-social-link";
      anchor.href = profile.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.setAttribute("aria-label", `Synteone on ${profile.label}`);
      anchor.title = profile.label;

      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("focusable", "false");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", profile.path);
      icon.append(path);
      anchor.append(icon);
      container.append(anchor);
    });
  });
};

const loadSiteSettings = async () => {
  try {
    let settings = previewSettings;
    if (!settings) {
      const response = await fetch("/api/site-settings");
      if (!response.ok) throw new Error("Settings unavailable");
      settings = await response.json();
    }

    siteFields.forEach((field) => {
      const value = getSetting(settings, field.dataset.siteField);
      if (value !== undefined && value !== null) field.textContent = value;
    });

    siteLists.forEach((list) => {
      const value = getSetting(settings, list.dataset.siteList);
      if (value === undefined || value === null) return;
      list.replaceChildren();
      String(value)
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          list.append(li);
        });
    });

    applyLogo(settings.media?.logoUrl);
    applyAnnouncement(settings.announcement);
    applyAdvertisement(settings.advertisement);
    applyCompanySocialLinks(settings.media?.socialLinks);

    if (siteVideo && settings.media?.heroVideoUrl) {
      siteVideo.src = settings.media.heroVideoUrl;
      siteVideo.hidden = false;
      siteVideo.play().catch(() => {});
    }
  } catch {
    // Public pages keep their static copy when settings are unavailable.
  }
};

const addPublishedPagesToNav = async () => {
  try {
    const response = await fetch("/api/pages");
    if (!response.ok) return;
    const { pages } = await response.json();
    document.querySelectorAll(".main-nav").forEach((nav) => {
      pages.forEach((page) => {
        if (nav.querySelector(`[href="page.html?slug=${page.slug}"]`)) return;
        const link = document.createElement("a");
        link.href = `page.html?slug=${page.slug}`;
        link.textContent = page.navLabel || page.title;
        nav.append(link);
      });
    });
  } catch {
    // Navigation stays with core pages if custom pages are unavailable.
  }
};

const appendImage = (root, src, alt = "", fallbackSrc = "") => {
  const source = src || fallbackSrc;
  if (!source) return;
  const image = document.createElement("img");
  image.src = source;
  image.alt = alt;
  if (!src && fallbackSrc) image.className = "brand-icon-fallback";
  root.append(image);
};

const appendCards = (root, items, className, render) => {
  const activeItems = (items || []).filter((item) => item.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!activeItems.length) return;
  const grid = document.createElement("div");
  grid.className = className;
  activeItems.forEach((item) => grid.append(render(item)));
  root.append(grid);
};

const linkList = (links) => {
  const list = document.createElement("div");
  list.className = "social-links";
  links
    .filter((link) => link.url)
    .forEach((link) => {
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.textContent = link.label;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      list.append(anchor);
    });
  return list;
};

const renderStructuredPageContent = (body, page) => {
  appendCards(body, page.teamMembers, "content-card-grid", (member) => {
    const card = document.createElement("article");
    card.className = "content-card";
    appendImage(card, member.headshot, member.fullName);
    const title = document.createElement("h2");
    title.textContent = member.fullName;
    const role = document.createElement("p");
    role.className = "kicker";
    role.textContent = member.jobTitle || "";
    const bio = document.createElement("p");
    bio.textContent = member.biography || "";
    card.append(title, role, bio, linkList([
      { label: "Email", url: member.email ? `mailto:${member.email}` : "" },
      { label: "LinkedIn", url: member.linkedin },
      { label: "Facebook", url: member.facebook },
      { label: "X", url: member.x },
      { label: "Instagram", url: member.instagram },
    ]));
    return card;
  });

  appendCards(body, page.services, "content-card-grid", (service) => {
    const card = document.createElement("article");
    card.className = "content-card";
    if (service.icon) {
      const icon = document.createElement("span");
      icon.className = "service-icon";
      icon.textContent = service.icon;
      card.append(icon);
    }
    appendImage(card, service.featuredImage, service.title);
    const title = document.createElement("h2");
    title.textContent = service.title;
    const text = document.createElement("p");
    text.textContent = service.description || "";
    card.append(title, text);
    if (service.buttonText && service.buttonLink) {
      const link = document.createElement("a");
      link.className = "button button-secondary";
      link.href = service.buttonLink;
      link.textContent = service.buttonText;
      card.append(link);
    }
    return card;
  });

  appendCards(body, page.pageProjects, "content-card-grid", (project) => {
    const card = document.createElement("article");
    card.className = "content-card";
    appendImage(card, project.image, project.name, brandIconUrl);
    const status = document.createElement("span");
    status.textContent = [project.category, project.status].filter(Boolean).join(" - ");
    const title = document.createElement("h2");
    title.textContent = project.name;
    const text = document.createElement("p");
    text.textContent = project.description || "";
    card.append(status, title, text);
    if (project.externalLink) {
      const link = document.createElement("a");
      link.className = "text-link";
      link.href = project.externalLink;
      link.textContent = "Open project";
      card.append(link);
    }
    return card;
  });

  appendCards(body, page.faqs, "faq-list", (faq) => {
    const item = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = faq.question;
    const answer = document.createElement("p");
    answer.textContent = faq.answer || "";
    item.append(summary, answer);
    return item;
  });

  appendCards(body, page.testimonials, "content-card-grid", (testimonial) => {
    const card = document.createElement("article");
    card.className = "content-card";
    appendImage(card, testimonial.image, testimonial.name);
    const quote = document.createElement("p");
    quote.textContent = testimonial.quote;
    const name = document.createElement("h2");
    name.textContent = testimonial.name || "";
    const role = document.createElement("span");
    role.textContent = testimonial.role || "";
    card.append(quote, name, role);
    return card;
  });

  appendCards(body, page.gallery, "gallery-grid", (item) => {
    const figure = document.createElement("figure");
    appendImage(figure, item.image, item.caption);
    const caption = document.createElement("figcaption");
    caption.textContent = item.caption || "";
    figure.append(caption);
    return figure;
  });

  appendCards(body, page.contentBlocks, "content-blocks", (block) => {
    const section = document.createElement("article");
    section.className = "content-block";
    if (block.title) {
      const title = document.createElement("h2");
      title.textContent = block.title;
      section.append(title);
    }
    if (block.type === "image") appendImage(section, block.image, block.title);
    if (block.body) {
      const content = document.createElement("div");
      content.innerHTML = block.body;
      section.append(content);
    }
    if (block.linkText && block.linkUrl) {
      const link = document.createElement("a");
      link.className = "button button-secondary";
      link.href = block.linkUrl;
      link.textContent = block.linkText;
      section.append(link);
    }
    return section;
  });
};

const renderCustomPage = async () => {
  if (!customPageRoot) return;
  try {
    const params = new URLSearchParams(window.location.search);
    let page = previewPage;
    if (!page) {
      const slug = params.get("slug") || "";
      const response = await fetch(`/api/pages/${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error("Page not found");
      page = await response.json();
    }

    document.title = `${page.seoTitle || page.title} | Synteone`;
    document.querySelector("[data-dynamic-title]")?.setAttribute("content", `${page.seoTitle || page.title} | Synteone`);
    document.querySelector("[data-dynamic-description]")?.setAttribute("content", page.metaDescription || page.intro || page.title);
    document.querySelector("[data-page-label]").textContent = page.navLabel || "Synteone";
    document.querySelector("[data-page-title]").textContent = page.title;
    document.querySelector("[data-page-intro]").textContent = page.intro || "";

    const body = document.querySelector("[data-page-body]");
    body.replaceChildren();
    if (page.featuredImage) appendImage(body, page.featuredImage, page.title);
    if (page.bodyHtml) {
      const rich = document.createElement("div");
      rich.className = "rich-page-content";
      rich.innerHTML = page.bodyHtml;
      body.append(rich);
    } else {
      String(page.body || "")
        .split(/\n{2,}/)
        .map((text) => text.trim())
        .filter(Boolean)
        .forEach((text) => {
          const paragraph = document.createElement("p");
          paragraph.textContent = text;
          body.append(paragraph);
        });
    }
    renderStructuredPageContent(body, page);
  } catch {
    document.querySelector("[data-page-title]").textContent = "Page not found.";
    document.querySelector("[data-page-intro]").textContent = "This page is not published yet.";
  }
};

const loadProjects = async () => {
  if (!projectList || !projectTemplate) return;

  try {
    const response = await fetch("/api/projects");
    if (!response.ok) throw new Error("Projects could not be loaded");
    const { projects } = await response.json();
    const visibleProjects = Array.isArray(projects) ? projects : [];

    projectList.replaceChildren();
    if (projectCount) {
      projectCount.textContent =
        visibleProjects.length === 1
          ? `1 ${projectLabel}`
          : `${visibleProjects.length} ${projectLabel}s`;
    }

    if (!visibleProjects.length) {
      emptyProjects.hidden = false;
      return;
    }

    emptyProjects.hidden = true;
    visibleProjects.forEach((project) => {
      const card = projectTemplate.content.firstElementChild.cloneNode(true);
      setText(card, "[data-project-status]", project.status);
      setText(card, "[data-project-name]", project.name);
      setText(card, "[data-project-short]", project.shortDescription);
      setText(card, "[data-project-long]", project.longDescription);

      const link = card.querySelector("[data-project-link]");
      if (project.link) {
        link.href = project.link;
        link.target = "_blank";
        link.rel = "noreferrer";
      } else {
        link.remove();
      }

      const image = document.createElement("img");
      image.src = project.image || brandIconUrl;
      image.alt = `${project.name || "Synteone project"} logo`;
      if (!project.image) image.className = "brand-icon-fallback";
      card.insertBefore(image, card.querySelector("h2"));

      projectList.append(card);
      revealObserver.observe(card);
    });
  } catch (error) {
    if (projectCount) projectCount.textContent = "Projects unavailable";
    emptyProjects.hidden = false;
  }
};

const handleContactForm = () => {
  if (!contactForm) return;
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    contactMessage.textContent = "Sending...";
    const button = contactForm.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      const payload = Object.fromEntries(new FormData(contactForm));
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Message could not be sent.");
      contactForm.reset();
      contactMessage.textContent = result.emailSent
        ? "Thanks. Your message was sent."
        : "Thanks. Your message was received.";
    } catch (error) {
      contactMessage.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
};

applyLogo(brandLogoUrl);
loadSiteSettings();
addPublishedPagesToNav();
renderCustomPage();
loadProjects();
handleContactForm();
