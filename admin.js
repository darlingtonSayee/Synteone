const state = {
  projects: [],
  pages: [],
  users: [],
  messages: [],
  pageItems: {
    teamMembers: [],
    services: [],
    pageProjects: [],
    faqs: [],
    testimonials: [],
    gallery: [],
    contentBlocks: [],
  },
  settings: null,
  session: null,
  editingId: null,
  editingPageId: null,
  editingUserId: null,
  step: 1,
  activeTab: "projects",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const loginPanel = $("[data-login-panel]");
const dashboard = $("[data-dashboard]");
const loginForm = $("[data-login-form]");
const loginMessage = $("[data-login-message]");
const adminProjects = $("[data-admin-projects]");
const adminEmpty = $("[data-admin-empty]");
const modal = $("[data-project-modal]");
const projectForm = $("[data-project-form]");
const pageForm = $("[data-page-form]");
const userForm = $("[data-user-form]");
const richEditor = $("[data-rich-editor]");
const structuredEditor = $("[data-structured-editor]");
const stepLabel = $("[data-step-label]");
const stepTitle = $("[data-step-title]");
const reviewBox = $("[data-review-box]");
const aiMessage = $("[data-ai-message]");
const previewPanel = $("[data-preview-panel]");
const previewFrame = $("[data-preview-frame]");
const previewTitle = $("[data-preview-title]");
let activePreviewUrl = "";

const itemGroupsByPageType = {
  team: ["teamMembers"],
  services: ["services"],
  projects: ["pageProjects"],
  faq: ["faqs"],
  testimonials: ["testimonials"],
  gallery: ["gallery"],
  custom: ["contentBlocks"],
  careers: ["contentBlocks"],
  contact: ["contentBlocks"],
  standard: ["contentBlocks"],
};

const groupLabels = {
  teamMembers: "Team members",
  services: "Services",
  pageProjects: "Projects",
  faqs: "FAQs",
  testimonials: "Testimonials",
  gallery: "Gallery",
  contentBlocks: "Content blocks",
};

const stepTitles = {
  1: "What is the project called?",
  2: "Is this current or upcoming?",
  3: "Add the details.",
  4: "Review and confirm.",
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
};

const requestUpload = async (file) => {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/admin/upload", {
    method: "POST",
    credentials: "same-origin",
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Upload failed");
  return payload.path;
};

const can = (permission) => state.session?.permissions?.includes(permission);

const setMessage = (element, message) => {
  if (element) element.textContent = message || "";
};

const emailjsStatusText = (emailjs = {}) => {
  const required = [
    ["Service ID", emailjs.serviceId],
    ["Contact template", emailjs.templateId],
    ["Admin invite/reset template", emailjs.adminTemplateId],
    ["Public key", emailjs.publicKey],
  ];
  const missing = required.filter(([, value]) => !String(value || "").trim()).map(([label]) => label);
  if (!emailjs.enabled) return "EmailJS is disabled. Contact messages will be saved in admin only.";
  if (missing.length) return `EmailJS needs: ${missing.join(", ")}.`;
  return "EmailJS is ready for contact, invitation, and password reset emails.";
};

const tableButton = (label, onClick, className = "") => {
  const button = document.createElement("button");
  button.className = `table-button ${className}`.trim();
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
};

const switchTab = (name) => {
  state.activeTab = name;
  $$("[data-tab-button]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabButton === name);
  });
  $$("[data-tab-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== name;
  });
};

const applyPermissions = () => {
  $("[data-add-project]").disabled = !can("projects");
  $("[data-new-page]").disabled = !can("pages");
  $("[data-new-user]").disabled = !can("users");
  $("[data-delete-user]").disabled = !can("users");

  $$("[data-settings-form='hero'] input, [data-settings-form='hero'] textarea, [data-settings-form='hero'] button").forEach((el) => {
    el.disabled = !can("site");
  });
  $$("[data-settings-form='media'] input, [data-settings-form='media'] textarea, [data-settings-form='media'] button").forEach((el) => {
    el.disabled = !can("media");
  });
  $$("[data-settings-form='ads'] input, [data-settings-form='ads'] textarea, [data-settings-form='ads'] button").forEach((el) => {
    el.disabled = !can("ads");
  });
  $$("[data-page-form] input, [data-page-form] select, [data-page-form] textarea, [data-page-form] button").forEach((el) => {
    el.disabled = !can("pages");
  });
  richEditor.contentEditable = can("pages") ? "true" : "false";
  $$("[data-user-form] input, [data-user-form] select, [data-user-form] button").forEach((el) => {
    el.disabled = !can("users");
  });
  $$("[data-settings-form='emailjs'] input, [data-settings-form='emailjs'] button").forEach((el) => {
    el.disabled = !can("users");
  });
  $$("[data-settings-form='ai'] input, [data-settings-form='ai'] button").forEach((el) => {
    el.disabled = !can("users");
  });
  $("[data-refresh-messages]").disabled = !can("messages");
};

const updateAuthView = async () => {
  try {
    state.session = await requestJson("/api/admin/session");
    loginPanel.hidden = true;
    dashboard.hidden = false;
    $("[data-role-label]").textContent = state.session.roleLabel;
    await Promise.all([loadAdminProjects(), loadSettings(), loadPages()]);
    if (can("users")) await loadUsers();
    if (can("messages")) await loadMessages();
    renderRoles();
    applyPermissions();
    switchTab(state.activeTab);
  } catch {
    loginPanel.hidden = false;
    dashboard.hidden = true;
  }
};

const formValue = (form, name) => form.elements[name]?.value.trim() || "";

const projectValue = (name) => formValue(projectForm, name);

const getFormProject = () => ({
  id: state.editingId,
  name: projectValue("name"),
  status: projectValue("status"),
  shortDescription: projectValue("shortDescription"),
  longDescription: projectValue("longDescription"),
  image: projectValue("image"),
  link: projectValue("link"),
});

const loadAdminProjects = async () => {
  const { projects } = await requestJson("/api/admin/projects");
  state.projects = projects;
  renderProjectTable();
};

const renderProjectTable = () => {
  adminProjects.replaceChildren();
  adminEmpty.hidden = state.projects.length > 0;

  state.projects.forEach((project, index) => {
    const row = document.createElement("tr");
    [project.name, project.status, new Date(project.updatedAt).toLocaleString()].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });

    const orderCell = document.createElement("td");
    const up = tableButton("Up", () => moveProject(project.id, "up"));
    const down = tableButton("Down", () => moveProject(project.id, "down"));
    up.disabled = index === 0 || !can("projects");
    down.disabled = index === state.projects.length - 1 || !can("projects");
    orderCell.append(up, down);

    const actionCell = document.createElement("td");
    const edit = tableButton("Edit", () => openModal(project));
    const remove = tableButton("Remove", () => removeProject(project.id), "danger");
    edit.disabled = !can("projects");
    remove.disabled = !can("projects");
    actionCell.append(edit, remove);

    row.append(orderCell, actionCell);
    adminProjects.append(row);
  });
};

const openModal = (project = null) => {
  if (!can("projects")) return;
  state.editingId = project?.id || null;
  state.step = 1;
  projectForm.reset();
  setMessage(aiMessage, "");

  if (project) {
    projectForm.elements.name.value = project.name || "";
    projectForm.elements.status.value = project.status || "";
    projectForm.elements.shortDescription.value = project.shortDescription || "";
    projectForm.elements.longDescription.value = project.longDescription || "";
    projectForm.elements.image.value = project.image || "";
    projectForm.elements.link.value = project.link || "";
  }

  modal.hidden = false;
  updateStep();
  projectForm.elements.name.focus();
};

const closeModal = () => {
  modal.hidden = true;
};

const updateStep = () => {
  $$("[data-step]").forEach((step) => {
    step.hidden = Number(step.dataset.step) !== state.step;
  });
  stepLabel.textContent = `Step ${state.step} of 4`;
  stepTitle.textContent = stepTitles[state.step];
  $("[data-prev-step]").disabled = state.step === 1;
  $("[data-next-step]").hidden = state.step === 4;
  $("[data-save-project]").hidden = state.step !== 4;

  if (state.step === 4) {
    const project = getFormProject();
    reviewBox.innerHTML = "";
    const list = document.createElement("dl");
    [
      ["Name", project.name || "Not set"],
      ["Status", project.status || "Not set"],
      ["Short description", project.shortDescription || "Not set"],
      ["Longer description", project.longDescription || "Not set"],
      ["Image", project.image || "None"],
      ["Link", project.link || "None"],
    ].forEach(([label, value]) => {
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      list.append(term, detail);
    });
    reviewBox.append(list);
  }
};

const validateStep = () => {
  const fieldsByStep = { 1: ["name"], 2: ["status"], 3: ["shortDescription"] };
  return (fieldsByStep[state.step] || []).every((name) => {
    const field = projectForm.elements[name];
    const valid = field instanceof RadioNodeList ? Boolean(field.value) : field.reportValidity();
    if (!valid && field instanceof RadioNodeList) projectForm.querySelector("[name='status']").focus();
    return valid;
  });
};

const saveProject = async () => {
  const project = getFormProject();
  const url = state.editingId ? `/api/admin/projects/${state.editingId}` : "/api/admin/projects";
  await requestJson(url, {
    method: state.editingId ? "PUT" : "POST",
    body: JSON.stringify(project),
  });
  closeModal();
  await loadAdminProjects();
};

const removeProject = async (id) => {
  if (!confirm("Remove this project from the live Projects and Products pages?")) return;
  await requestJson(`/api/admin/projects/${id}`, { method: "DELETE" });
  await loadAdminProjects();
};

const moveProject = async (id, direction) => {
  await requestJson(`/api/admin/projects/${id}/move`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  });
  await loadAdminProjects();
};

const draftWithAi = async () => {
  if (!can("projects")) return;
  setMessage(aiMessage, "Drafting...");
  try {
    const payload = await requestJson("/api/admin/ai-draft", {
      method: "POST",
      body: JSON.stringify({
        name: projectValue("name"),
        status: projectValue("status"),
        sourceUrl: projectValue("sourceUrl"),
        sourceText: projectValue("sourceText"),
      }),
    });
    projectForm.elements.shortDescription.value = payload.shortDescription || "";
    projectForm.elements.longDescription.value = payload.longDescription || "";
    setMessage(aiMessage, payload.usedAi ? "AI draft added." : "Draft added without external AI.");
  } catch (error) {
    setMessage(aiMessage, error.message);
  }
};

const loadSettings = async () => {
  state.settings = await requestJson("/api/admin/settings");
  populateSettingsForms();
};

const collectSettings = (section) => {
  const settings = structuredClone(state.settings);
  if (section === "hero") {
    const form = $("[data-settings-form='hero']");
    settings.hero = {
      kicker: formValue(form, "kicker"),
      headline: formValue(form, "headline"),
      copy: formValue(form, "copy"),
    };
    settings.siteCopy = {
      homeWhatKicker: formValue(form, "homeWhatKicker"),
      homeWhatTitle: formValue(form, "homeWhatTitle"),
      homeWhatBody: formValue(form, "homeWhatBody"),
      homeWhyKicker: formValue(form, "homeWhyKicker"),
      homeWhyTitle: formValue(form, "homeWhyTitle"),
      homeWhyBodyOne: formValue(form, "homeWhyBodyOne"),
      homeWhyBodyTwo: formValue(form, "homeWhyBodyTwo"),
      homePrinciplesKicker: formValue(form, "homePrinciplesKicker"),
      homePrinciplesTitle: formValue(form, "homePrinciplesTitle"),
      homeVision: formValue(form, "homeVision"),
      homeMission: formValue(form, "homeMission"),
      homeValues: formValue(form, "homeValues"),
      homeProjectsKicker: formValue(form, "homeProjectsKicker"),
      homeProjectsTitle: formValue(form, "homeProjectsTitle"),
      aboutHeroTitle: formValue(form, "aboutHeroTitle"),
      aboutHeroIntro: formValue(form, "aboutHeroIntro"),
      aboutRegisteredText: formValue(form, "aboutRegisteredText"),
      productsHeroTitle: formValue(form, "productsHeroTitle"),
      productsHeroIntro: formValue(form, "productsHeroIntro"),
      projectsHeroTitle: formValue(form, "projectsHeroTitle"),
      projectsHeroIntro: formValue(form, "projectsHeroIntro"),
      contactHeroTitle: formValue(form, "contactHeroTitle"),
      contactHeroIntro: formValue(form, "contactHeroIntro"),
      contactAddress: formValue(form, "contactAddress"),
      footerCompanyLine: formValue(form, "footerCompanyLine"),
    };
  }
  if (section === "media") {
    const form = $("[data-settings-form='media']");
    settings.media = {
      logoUrl: formValue(form, "logoUrl"),
      heroVideoUrl: formValue(form, "heroVideoUrl"),
      socialImageUrl: formValue(form, "socialImageUrl"),
      socialLinks: {
        facebook: formValue(form, "facebookUrl"),
        instagram: formValue(form, "instagramUrl"),
        linkedin: formValue(form, "linkedinUrl"),
        x: formValue(form, "xUrl"),
        youtube: formValue(form, "youtubeUrl"),
        tiktok: formValue(form, "tiktokUrl"),
      },
    };
  }
  if (section === "ads") {
    const form = $("[data-settings-form='ads']");
    settings.announcement = {
      enabled: form.elements.announcementEnabled.checked,
      label: formValue(form, "announcementLabel"),
      text: formValue(form, "announcementText"),
      linkText: formValue(form, "announcementLinkText"),
      linkUrl: formValue(form, "announcementLinkUrl"),
    };
    settings.advertisement = {
      enabled: form.elements.adEnabled.checked,
      title: formValue(form, "adTitle"),
      body: formValue(form, "adBody"),
      linkText: formValue(form, "adLinkText"),
      linkUrl: formValue(form, "adLinkUrl"),
    };
  }
  if (section === "emailjs") {
    const form = $("[data-settings-form='emailjs']");
    settings.emailjs = {
      enabled: form.elements.emailjsEnabled.checked,
      serviceId: formValue(form, "serviceId"),
      templateId: formValue(form, "templateId"),
      adminTemplateId: formValue(form, "adminTemplateId"),
      publicKey: formValue(form, "publicKey"),
      privateKey: formValue(form, "privateKey") || state.settings.emailjs?.privateKey || "",
    };
  }
  if (section === "ai") {
    const form = $("[data-settings-form='ai']");
    settings.ai = {
      enabled: form.elements.aiEnabled.checked,
      openAiKey: formValue(form, "openAiKey") || state.settings.ai?.openAiKey || "",
      model: formValue(form, "model") || "gpt-4.1-mini",
    };
  }
  return settings;
};

const populateSettingsForms = () => {
  const settings = state.settings;
  const hero = $("[data-settings-form='hero']");
  hero.elements.kicker.value = settings.hero.kicker || "";
  hero.elements.headline.value = settings.hero.headline || "";
  hero.elements.copy.value = settings.hero.copy || "";
  hero.elements.homeWhatKicker.value = settings.siteCopy?.homeWhatKicker || "";
  hero.elements.homeWhatTitle.value = settings.siteCopy?.homeWhatTitle || "";
  hero.elements.homeWhatBody.value = settings.siteCopy?.homeWhatBody || "";
  hero.elements.homeWhyKicker.value = settings.siteCopy?.homeWhyKicker || "";
  hero.elements.homeWhyTitle.value = settings.siteCopy?.homeWhyTitle || "";
  hero.elements.homeWhyBodyOne.value = settings.siteCopy?.homeWhyBodyOne || "";
  hero.elements.homeWhyBodyTwo.value = settings.siteCopy?.homeWhyBodyTwo || "";
  hero.elements.homePrinciplesKicker.value = settings.siteCopy?.homePrinciplesKicker || "";
  hero.elements.homePrinciplesTitle.value = settings.siteCopy?.homePrinciplesTitle || "";
  hero.elements.homeVision.value = settings.siteCopy?.homeVision || "";
  hero.elements.homeMission.value = settings.siteCopy?.homeMission || "";
  hero.elements.homeValues.value = settings.siteCopy?.homeValues || "";
  hero.elements.homeProjectsKicker.value = settings.siteCopy?.homeProjectsKicker || "";
  hero.elements.homeProjectsTitle.value = settings.siteCopy?.homeProjectsTitle || "";
  hero.elements.aboutHeroTitle.value = settings.siteCopy?.aboutHeroTitle || "";
  hero.elements.aboutHeroIntro.value = settings.siteCopy?.aboutHeroIntro || "";
  hero.elements.aboutRegisteredText.value = settings.siteCopy?.aboutRegisteredText || "";
  hero.elements.productsHeroTitle.value = settings.siteCopy?.productsHeroTitle || "";
  hero.elements.productsHeroIntro.value = settings.siteCopy?.productsHeroIntro || "";
  hero.elements.projectsHeroTitle.value = settings.siteCopy?.projectsHeroTitle || "";
  hero.elements.projectsHeroIntro.value = settings.siteCopy?.projectsHeroIntro || "";
  hero.elements.contactHeroTitle.value = settings.siteCopy?.contactHeroTitle || "";
  hero.elements.contactHeroIntro.value = settings.siteCopy?.contactHeroIntro || "";
  hero.elements.contactAddress.value = settings.siteCopy?.contactAddress || "";
  hero.elements.footerCompanyLine.value = settings.siteCopy?.footerCompanyLine || "";

  const media = $("[data-settings-form='media']");
  media.elements.logoUrl.value = settings.media.logoUrl || "";
  media.elements.heroVideoUrl.value = settings.media.heroVideoUrl || "";
  media.elements.socialImageUrl.value = settings.media.socialImageUrl || "";
  media.elements.facebookUrl.value = settings.media.socialLinks?.facebook || "";
  media.elements.instagramUrl.value = settings.media.socialLinks?.instagram || "";
  media.elements.linkedinUrl.value = settings.media.socialLinks?.linkedin || "";
  media.elements.xUrl.value = settings.media.socialLinks?.x || "";
  media.elements.youtubeUrl.value = settings.media.socialLinks?.youtube || "";
  media.elements.tiktokUrl.value = settings.media.socialLinks?.tiktok || "";

  const ads = $("[data-settings-form='ads']");
  ads.elements.announcementEnabled.checked = Boolean(settings.announcement.enabled);
  ads.elements.announcementLabel.value = settings.announcement.label || "";
  ads.elements.announcementText.value = settings.announcement.text || "";
  ads.elements.announcementLinkText.value = settings.announcement.linkText || "";
  ads.elements.announcementLinkUrl.value = settings.announcement.linkUrl || "";
  ads.elements.adEnabled.checked = Boolean(settings.advertisement.enabled);
  ads.elements.adTitle.value = settings.advertisement.title || "";
  ads.elements.adBody.value = settings.advertisement.body || "";
  ads.elements.adLinkText.value = settings.advertisement.linkText || "";
  ads.elements.adLinkUrl.value = settings.advertisement.linkUrl || "";

  const emailjs = $("[data-settings-form='emailjs']");
  emailjs.elements.emailjsEnabled.checked = Boolean(settings.emailjs?.enabled);
  emailjs.elements.serviceId.value = settings.emailjs?.serviceId || "";
  emailjs.elements.templateId.value = settings.emailjs?.templateId || "";
  emailjs.elements.adminTemplateId.value = settings.emailjs?.adminTemplateId || "";
  emailjs.elements.publicKey.value = settings.emailjs?.publicKey || "";
  emailjs.elements.privateKey.value = settings.emailjs?.privateKey || "";
  setMessage($("[data-emailjs-status]"), emailjsStatusText(settings.emailjs));

  const ai = $("[data-settings-form='ai']");
  ai.elements.aiEnabled.checked = Boolean(settings.ai?.enabled);
  ai.elements.openAiKey.value = settings.ai?.openAiKey || "";
  ai.elements.model.value = settings.ai?.model || "gpt-4.1-mini";
};

const saveSettings = async (section, payload) => {
  const message = $(`[data-settings-message='${section}']`);
  setMessage(message, "Saving...");
  try {
    state.settings = await requestJson("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    populateSettingsForms();
    setMessage(message, "Saved. The public site updates immediately.");
  } catch (error) {
    setMessage(message, error.message);
  }
};

const showPreview = (url, title) => {
  activePreviewUrl = url;
  previewTitle.textContent = title;
  previewPanel.hidden = false;
  previewFrame.src = url;
  previewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
};

const previewSettings = (section) => {
  localStorage.setItem("synteoneSettingsPreview", JSON.stringify(collectSettings(section)));
  showPreview("index.html?preview=settings", "Homepage preview");
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const fieldDefinitions = {
  teamMembers: [
    ["headshot", "Headshot", "input"],
    ["fullName", "Full name", "input"],
    ["jobTitle", "Job title", "input"],
    ["biography", "Short biography", "textarea"],
    ["email", "Email", "input"],
    ["phone", "Phone", "input"],
    ["linkedin", "LinkedIn", "input"],
    ["facebook", "Facebook", "input"],
    ["x", "X", "input"],
    ["instagram", "Instagram", "input"],
  ],
  services: [
    ["icon", "Icon", "input"],
    ["title", "Title", "input"],
    ["description", "Description", "textarea"],
    ["featuredImage", "Featured image", "input"],
    ["buttonText", "Button text", "input"],
    ["buttonLink", "Button link", "input"],
  ],
  pageProjects: [
    ["image", "Project image", "input"],
    ["name", "Project name", "input"],
    ["description", "Description", "textarea"],
    ["category", "Category", "input"],
    ["status", "Status", "input"],
    ["externalLink", "External link", "input"],
    ["gallery", "Gallery image paths", "textarea"],
  ],
  faqs: [
    ["question", "Question", "input"],
    ["answer", "Answer", "textarea"],
  ],
  testimonials: [
    ["quote", "Quote", "textarea"],
    ["name", "Name", "input"],
    ["role", "Role", "input"],
    ["image", "Image", "input"],
  ],
  gallery: [
    ["image", "Image", "input"],
    ["caption", "Caption", "input"],
  ],
  contentBlocks: [
    ["type", "Block type", "select"],
    ["title", "Title", "input"],
    ["body", "Body", "textarea"],
    ["image", "Image", "input"],
    ["linkText", "Button text", "input"],
    ["linkUrl", "Button link", "input"],
  ],
};

const activePageGroups = () => itemGroupsByPageType[pageForm.elements.pageType.value] || ["contentBlocks"];

const renderStructuredItem = (group, item = {}) => {
  const card = document.createElement("article");
  card.className = "structured-item";
  card.draggable = true;
  card.dataset.itemGroup = group;
  card.innerHTML = `
    <div class="structured-item-bar">
      <strong>${groupLabels[group]}</strong>
      <div class="admin-actions">
        <button class="table-button" type="button" data-item-up>Up</button>
        <button class="table-button" type="button" data-item-down>Down</button>
        <button class="table-button danger" type="button" data-item-delete>Delete</button>
      </div>
    </div>
    <label class="checkbox-row">
      <input type="checkbox" data-field="active" ${item.active === false ? "" : "checked"} />
      Active
    </label>
    ${fieldDefinitions[group]
      .map(([field, label, type]) => {
        const value = field === "gallery" && Array.isArray(item[field]) ? item[field].join("\n") : item[field] || "";
        if (type === "textarea") {
          return `<label>${label}<textarea data-field="${field}" rows="3">${escapeHtml(value)}</textarea></label>`;
        }
        if (type === "select") {
          return `<label>${label}<select data-field="${field}">
            <option value="text" ${value === "text" ? "selected" : ""}>Text</option>
            <option value="image" ${value === "image" ? "selected" : ""}>Image</option>
            <option value="button" ${value === "button" ? "selected" : ""}>Button</option>
          </select></label>`;
        }
        return `<label>${label}<input data-field="${field}" value="${escapeHtml(value)}" /></label>`;
      })
      .join("")}
  `;
  card.querySelector("[data-item-delete]").addEventListener("click", () => card.remove());
  card.querySelector("[data-item-up]").addEventListener("click", () => card.previousElementSibling?.before(card));
  card.querySelector("[data-item-down]").addEventListener("click", () => card.nextElementSibling?.after(card));
  card.addEventListener("dragstart", () => card.classList.add("is-dragging"));
  card.addEventListener("dragend", () => card.classList.remove("is-dragging"));
  return card;
};

const renderStructuredGroup = (group, items = []) => {
  const section = document.createElement("section");
  section.className = "structured-group";
  section.dataset.structuredGroup = group;
  const header = document.createElement("div");
  header.className = "structured-group-header";
  const title = document.createElement("h3");
  title.textContent = groupLabels[group];
  const add = document.createElement("button");
  add.className = "button button-secondary";
  add.type = "button";
  add.textContent = `Add ${groupLabels[group].toLowerCase()}`;
  const list = document.createElement("div");
  list.className = "structured-list";
  list.dataset.structuredList = group;
  add.addEventListener("click", () => list.append(renderStructuredItem(group)));
  list.addEventListener("dragover", (event) => {
    event.preventDefault();
    const dragging = list.querySelector(".is-dragging");
    const target = event.target.closest(".structured-item");
    if (dragging && target && dragging !== target) target.before(dragging);
  });
  header.append(title, add);
  section.append(header, list);
  (items.length ? items : [{}]).forEach((item) => list.append(renderStructuredItem(group, item)));
  return section;
};

const renderStructuredEditor = (page = {}) => {
  structuredEditor.replaceChildren();
  const groups = activePageGroups();
  groups.forEach((group) => structuredEditor.append(renderStructuredGroup(group, page[group] || [])));
};

const collectStructuredItems = (group) =>
  $$(`[data-structured-list='${group}'] .structured-item`).map((item, index) => {
    const values = { order: index, active: item.querySelector("[data-field='active']")?.checked !== false };
    $$("[data-field]", item).forEach((field) => {
      if (field.dataset.field === "active") return;
      values[field.dataset.field] = field.value.trim();
    });
    return values;
  });

const loadPages = async () => {
  const { pages } = await requestJson("/api/admin/pages");
  state.pages = pages;
  renderPageTable();
  if (!state.editingPageId) newPage();
};

const getPageFormData = () => ({
  id: state.editingPageId,
  pageType: formValue(pageForm, "pageType"),
  layout: formValue(pageForm, "layout"),
  title: formValue(pageForm, "title"),
  slug: formValue(pageForm, "slug"),
  navLabel: formValue(pageForm, "navLabel"),
  seoTitle: formValue(pageForm, "seoTitle"),
  metaDescription: formValue(pageForm, "metaDescription"),
  featuredImage: formValue(pageForm, "featuredImage"),
  intro: formValue(pageForm, "intro"),
  body: formValue(pageForm, "body"),
  bodyHtml: richEditor.innerHTML.trim(),
  published: pageForm.elements.published.checked,
  contentBlocks: collectStructuredItems("contentBlocks"),
  teamMembers: collectStructuredItems("teamMembers"),
  services: collectStructuredItems("services"),
  pageProjects: collectStructuredItems("pageProjects"),
  faqs: collectStructuredItems("faqs"),
  testimonials: collectStructuredItems("testimonials"),
  gallery: collectStructuredItems("gallery"),
});

const fillPageForm = (page = {}) => {
  state.editingPageId = page.id || null;
  pageForm.elements.pageType.value = page.pageType || "standard";
  pageForm.elements.layout.value = page.layout || "standard";
  pageForm.elements.title.value = page.title || "";
  pageForm.elements.slug.value = page.slug || "";
  pageForm.elements.navLabel.value = page.navLabel || "";
  pageForm.elements.seoTitle.value = page.seoTitle || "";
  pageForm.elements.metaDescription.value = page.metaDescription || "";
  pageForm.elements.featuredImage.value = page.featuredImage || "";
  pageForm.elements.intro.value = page.intro || "";
  pageForm.elements.body.value = page.body || "";
  richEditor.innerHTML = page.bodyHtml || "";
  pageForm.elements.sourceUrl.value = "";
  pageForm.elements.published.checked = Boolean(page.published);
  renderStructuredEditor(page);
  setMessage($("[data-page-message]"), page.id ? "Editing saved page." : "Drafting a new page.");
};

const newPage = () => fillPageForm();

const renderPageTable = () => {
  const tbody = $("[data-admin-pages]");
  tbody.replaceChildren();
  state.pages.forEach((page) => {
    const row = document.createElement("tr");
    [page.title, page.slug, page.pageType || "standard", page.published ? "Published" : "Draft", new Date(page.updatedAt).toLocaleString()].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    const actionCell = document.createElement("td");
    actionCell.append(tableButton("Edit", () => fillPageForm(page)), tableButton("Preview", () => previewPage(page)));
    row.append(actionCell);
    tbody.append(row);
  });
};

const savePage = async () => {
  if (pageForm.elements.featuredImageFile.files[0]) {
    pageForm.elements.featuredImage.value = await requestUpload(pageForm.elements.featuredImageFile.files[0]);
  }
  const page = getPageFormData();
  if (!page.title) {
    pageForm.elements.title.reportValidity();
    return;
  }
  const url = state.editingPageId ? `/api/admin/pages/${state.editingPageId}` : "/api/admin/pages";
  const saved = await requestJson(url, {
    method: state.editingPageId ? "PUT" : "POST",
    body: JSON.stringify(page),
  });
  state.editingPageId = saved.id;
  setMessage($("[data-page-message]"), "Page saved.");
  await loadPages();
};

const deletePage = async () => {
  if (!state.editingPageId) return newPage();
  if (!confirm("Delete this page?")) return;
  await requestJson(`/api/admin/pages/${state.editingPageId}`, { method: "DELETE" });
  setMessage($("[data-page-message]"), "Page deleted.");
  state.editingPageId = null;
  await loadPages();
};

const previewPage = (page = getPageFormData()) => {
  localStorage.setItem("synteonePagePreview", JSON.stringify(page));
  showPreview("page.html?preview=page", "Page preview");
};

const enhancePage = async () => {
  setMessage($("[data-page-message]"), "Enhancing...");
  try {
    const payload = await requestJson("/api/admin/ai-enhance-page", {
      method: "POST",
      body: JSON.stringify({ ...getPageFormData(), sourceUrl: formValue(pageForm, "sourceUrl") }),
    });
    pageForm.elements.title.value = payload.title || "";
    pageForm.elements.intro.value = payload.intro || "";
    pageForm.elements.body.value = payload.body || "";
    setMessage($("[data-page-message]"), payload.usedAi ? "AI-enhanced draft ready. Preview it before saving." : "Draft prepared. Preview it before saving.");
  } catch (error) {
    setMessage($("[data-page-message]"), error.message);
  }
};

const loadMessages = async () => {
  const { messages } = await requestJson("/api/admin/messages");
  state.messages = messages;
  renderMessages();
};

const renderMessages = () => {
  const tbody = $("[data-admin-messages]");
  tbody.replaceChildren();
  state.messages.forEach((message) => {
    const row = document.createElement("tr");
    [
      `${message.name} <${message.email}>`,
      message.subject || "Website enquiry",
      message.message,
      message.emailSent ? "Yes" : "Stored only",
      new Date(message.createdAt).toLocaleString(),
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    const actionCell = document.createElement("td");
    actionCell.append(tableButton("Delete", () => deleteMessage(message.id), "danger"));
    row.append(actionCell);
    tbody.append(row);
  });
};

const deleteMessage = async (id) => {
  if (!confirm("Delete this message from admin records?")) return;
  await requestJson(`/api/admin/messages/${id}`, { method: "DELETE" });
  await loadMessages();
};

const loadUsers = async () => {
  const { users } = await requestJson("/api/admin/users");
  state.users = users;
  renderUserTable();
};

const fillUserForm = (user = {}) => {
  state.editingUserId = user.id || null;
  userForm.elements.name.value = user.name || "";
  userForm.elements.email.value = user.email || "";
  userForm.elements.password.value = "";
  userForm.elements.role.value = user.role || "content_admin";
  userForm.elements.active.checked = user.active !== false;
};

const renderUserTable = () => {
  const tbody = $("[data-admin-users]");
  tbody.replaceChildren();
  state.users.forEach((user) => {
    const row = document.createElement("tr");
    [
      user.name || "",
      user.email,
      user.roleLabel,
      user.invited ? "Invited" : user.active ? "Active" : "Inactive",
      user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "",
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    const actionCell = document.createElement("td");
    actionCell.append(tableButton("Edit", () => fillUserForm(user)));
    row.append(actionCell);
    tbody.append(row);
  });
};

const saveUser = async () => {
  const payload = {
    name: formValue(userForm, "name"),
    email: formValue(userForm, "email"),
    password: formValue(userForm, "password"),
    role: formValue(userForm, "role"),
    active: userForm.elements.active.checked,
  };
  const url = state.editingUserId ? `/api/admin/users/${state.editingUserId}` : "/api/admin/users";
  const saved = await requestJson(url, {
    method: state.editingUserId ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
  state.editingUserId = saved.id;
  setMessage($("[data-user-message]"), "Admin user saved.");
  await loadUsers();
};

const inviteUser = async () => {
  const payload = {
    name: formValue(userForm, "name"),
    email: formValue(userForm, "email"),
    role: formValue(userForm, "role"),
  };
  const result = await requestJson("/api/admin/invitations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.editingUserId = result.user.id;
  setMessage(
    $("[data-user-message]"),
    result.emailSent
      ? "Invitation email sent."
      : `Invitation created, but email could not be delivered. Activation link: ${result.inviteLink}`,
  );
  await loadUsers();
};

const deleteUser = async () => {
  if (!state.editingUserId) return fillUserForm();
  if (!confirm("Delete this admin user?")) return;
  await requestJson(`/api/admin/users/${state.editingUserId}`, { method: "DELETE" });
  fillUserForm();
  setMessage($("[data-user-message]"), "Admin user deleted.");
  await loadUsers();
};

const renderRoles = () => {
  const grid = $("[data-role-grid]");
  grid.replaceChildren();
  Object.entries(state.session.roles || {}).forEach(([key, role]) => {
    const card = document.createElement("article");
    card.className = "role-card";
    const badge = document.createElement("span");
    badge.textContent = key === state.session.role ? "Current access" : key.replaceAll("_", " ");
    const title = document.createElement("h3");
    title.textContent = role.label;
    const body = document.createElement("p");
    body.textContent =
      role.permissions.length > 0
        ? `Can manage: ${role.permissions.join(", ")}.`
        : "Can view the admin portal but cannot publish changes.";
    card.append(badge, title, body);
    grid.append(card);
  });
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(loginMessage, "Signing in...");
  try {
    await requestJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(loginForm))),
    });
    setMessage(loginMessage, "");
    await updateAuthView();
  } catch (error) {
    setMessage(loginMessage, error.message);
  }
});

$("[data-reset-request]").addEventListener("click", async () => {
  try {
    const result = await requestJson("/api/admin/password-reset", {
      method: "POST",
      body: JSON.stringify({ email: loginForm.elements.email.value.trim() }),
    });
    if (result.emailSent) {
      setMessage(loginMessage, "Password reset email sent. Check your inbox.");
    } else if (result.resetLink) {
      setMessage(loginMessage, `Reset email could not be delivered, so use this secure reset link: ${result.resetLink}`);
    } else {
      setMessage(loginMessage, "If that admin email exists, a reset link will be sent.");
    }
  } catch (error) {
    setMessage(loginMessage, error.message);
  }
});

$("[data-logout]").addEventListener("click", async () => {
  await requestJson("/api/admin/logout", { method: "POST" });
  await updateAuthView();
});

$$("[data-tab-button]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tabButton));
});

$("[data-add-project]").addEventListener("click", () => openModal());
$("[data-close-modal]").addEventListener("click", closeModal);
$("[data-prev-step]").addEventListener("click", () => {
  state.step = Math.max(1, state.step - 1);
  updateStep();
});
$("[data-next-step]").addEventListener("click", () => {
  if (!validateStep()) return;
  state.step = Math.min(4, state.step + 1);
  updateStep();
});
$("[data-ai-draft]").addEventListener("click", draftWithAi);
projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveProject();
});

$("[data-settings-form='hero']").addEventListener("submit", (event) => {
  event.preventDefault();
  const settings = collectSettings("hero");
  saveSettings("hero", { hero: settings.hero, siteCopy: settings.siteCopy });
});

$("[data-settings-form='media']").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  setMessage($("[data-settings-message='media']"), "Saving media...");
  if (form.elements.logoFile.files[0]) form.elements.logoUrl.value = await requestUpload(form.elements.logoFile.files[0]);
  if (form.elements.heroVideoFile.files[0]) form.elements.heroVideoUrl.value = await requestUpload(form.elements.heroVideoFile.files[0]);
  saveSettings("media", { media: collectSettings("media").media });
});

$("[data-settings-form='ads']").addEventListener("submit", (event) => {
  event.preventDefault();
  const settings = collectSettings("ads");
  saveSettings("ads", {
    announcement: settings.announcement,
    advertisement: settings.advertisement,
  });
});

$("[data-settings-form='emailjs']").addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings("emailjs", { emailjs: collectSettings("emailjs").emailjs });
});

$("[data-settings-form='ai']").addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings("ai", { ai: collectSettings("ai").ai });
});

$("[data-refresh-messages]").addEventListener("click", loadMessages);

$$("[data-preview-settings]").forEach((button) => {
  button.addEventListener("click", () => previewSettings(button.dataset.previewSettings));
});

$$("[data-rich-command]").forEach((button) => {
  button.addEventListener("click", () => {
    richEditor.focus();
    document.execCommand(button.dataset.richCommand, false, button.dataset.richValue || null);
  });
});

$("[data-rich-link]").addEventListener("click", () => {
  const url = prompt("Paste the link URL");
  if (!url) return;
  richEditor.focus();
  document.execCommand("createLink", false, url);
});

$("[data-page-type]").addEventListener("change", () => renderStructuredEditor(getPageFormData()));

$("[data-open-preview]").addEventListener("click", () => {
  if (activePreviewUrl) window.open(activePreviewUrl, "_blank", "noopener");
});

$("[data-close-preview]").addEventListener("click", () => {
  activePreviewUrl = "";
  previewPanel.hidden = true;
  previewFrame.removeAttribute("src");
});

$("[data-new-page]").addEventListener("click", newPage);
$("[data-preview-page]").addEventListener("click", () => previewPage());
$("[data-enhance-page]").addEventListener("click", enhancePage);
$("[data-delete-page]").addEventListener("click", deletePage);
pageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await savePage();
});

$("[data-new-user]").addEventListener("click", () => fillUserForm());
$("[data-invite-user]").addEventListener("click", inviteUser);
$("[data-delete-user]").addEventListener("click", deleteUser);
userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveUser();
});

updateAuthView();
