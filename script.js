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

const applyLogo = (logoUrl) => {
  const source = logoUrl || brandLogoUrl;
  document.querySelectorAll(".wordmark").forEach((wordmark) => {
    const image = document.createElement("img");
    image.src = source;
    image.alt = "Synteone";
    image.className = "wordmark-image";

    const name = document.createElement("span");
    name.className = "wordmark-name";
    name.textContent = "Synteone";

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
