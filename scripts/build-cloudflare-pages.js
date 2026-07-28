const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");

const files = [
  "_headers",
  "_redirects",
  "about.html",
  "admin-activate.html",
  "admin-activate.js",
  "admin.html",
  "admin.js",
  "contact.html",
  "index.html",
  "page.html",
  "privacy.html",
  "products.html",
  "projects.html",
  "robots.txt",
  "script.js",
  "sitemap.xml",
  "styles.css",
  "terms.html",
];

const directories = ["assets"];

const copyIfExists = async (from, to) => {
  try {
    const stat = await fs.stat(from);
    await fs.mkdir(path.dirname(to), { recursive: true });
    if (stat.isDirectory()) {
      await fs.cp(from, to, { recursive: true });
    } else {
      await fs.copyFile(from, to);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const build = async () => {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  for (const file of files) {
    await copyIfExists(path.join(root, file), path.join(outDir, file));
  }

  for (const directory of directories) {
    await copyIfExists(path.join(root, directory), path.join(outDir, directory));
  }
};

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
