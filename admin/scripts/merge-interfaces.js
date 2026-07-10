const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const interfacesDir = path.join(root, "admin", "interfaces");

function outputBaseName(folderName) {
  return folderName
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function slugForHtml(fileName) {
  return path.basename(fileName, ".html").replace(/[^A-Za-z0-9]+/g, "").toLowerCase();
}

function titleForHtml(fileName) {
  return path.basename(fileName, ".html").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function extractMain(html) {
  const match = html.match(/<main\b([^>]*)>([\s\S]*?)<\/main>/i);
  if (!match) {
    return null;
  }

  const classMatch = match[1].match(/\bclass=(["'])(.*?)\1/i);
  return {
    className: classMatch ? classMatch[2] : "main-content",
    inner: match[2].trim()
  };
}

function stripScriptsFromHead(head) {
  return head.replace(/<script\b[\s\S]*?<\/script>/gi, "").trim();
}

function extractHead(html) {
  const match = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  return match ? match[1] : "";
}

function extractBody(html) {
  const match = html.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
  return match ? { attrs: match[1], inner: match[2] } : { attrs: "", inner: "" };
}

function scriptSources(html) {
  const sources = [];
  html.replace(/<script\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>\s*<\/script>/gi, (_, _quote, src) => {
    sources.push(src);
    return "";
  });
  return sources;
}

function escapeTemplate(value) {
  return value.replace(/<\/template/gi, "<\\/template");
}

function normalizeHref(href, currentFolder, htmlLookup) {
  if (!href || /^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) return href;

  let candidate;
  if (href.startsWith("./")) {
    candidate = path.join(currentFolder, href.slice(2));
  } else if (href.startsWith("../")) {
    candidate = path.normalize(path.join(currentFolder, href));
  } else {
    candidate = path.join(currentFolder, href);
  }

  const hashIndex = candidate.indexOf("#");
  const cleanCandidate = hashIndex >= 0 ? candidate.slice(0, hashIndex) : candidate;
  const record = htmlLookup.get(path.normalize(cleanCandidate));
  if (!record) return href;

  let relative = path.relative(currentFolder, path.join(record.folderPath, record.outputHtml));
  if (!relative.startsWith(".")) relative = "./" + relative;
  return relative.replace(/\\/g, "/") + "#" + record.slug;
}

function rewriteHrefs(html, currentFolder, htmlLookup) {
  return html.replace(/\bhref=(["'])(.*?)\1/gi, (full, quote, href) => {
    return `href=${quote}${normalizeHref(href, currentFolder, htmlLookup)}${quote}`;
  });
}

function buildHtmlLookup(folders) {
  const lookup = new Map();

  folders.forEach((folderPath) => {
    const folderName = path.basename(folderPath);
    const baseName = outputBaseName(folderName);
    const outputHtml = `${baseName}.html`;
    fs.readdirSync(folderPath)
      .filter((file) => file.endsWith(".html"))
      .filter((file) => file !== outputHtml)
      .forEach((file) => {
        lookup.set(path.normalize(path.join(folderPath, file)), {
          folderPath,
          outputHtml,
          slug: slugForHtml(file)
        });
      });
  });

  return lookup;
}

function buildMergedJs(folderPath, baseName, views, allJsFiles) {
  const scriptCodeBySrc = new Map();

  allJsFiles.forEach((file) => {
    const src = `./${file}`;
    scriptCodeBySrc.set(src, fs.readFileSync(path.join(folderPath, file), "utf8"));
  });

  const allSources = {};
  allJsFiles.forEach((file) => {
    allSources[file] = fs.readFileSync(path.join(folderPath, file), "utf8");
  });

  const viewScripts = {};
  views.forEach((view) => {
    viewScripts[view.slug] = view.scripts
      .filter((src) => scriptCodeBySrc.has(src))
      .map((src) => ({
        name: `${baseName}:${src.replace(/^\.\//, "")}`,
        code: scriptCodeBySrc.get(src)
      }));
  });

  return `"use strict";

(function() {
    var templates = ${JSON.stringify(Object.fromEntries(views.map((view) => [view.slug, view.template])), null, 4)};
    var labels = ${JSON.stringify(Object.fromEntries(views.map((view) => [view.slug, view.label])), null, 4)};
    var scripts = ${JSON.stringify(viewScripts, null, 4)};
    var allMergedSources = ${JSON.stringify(allSources, null, 4)};
    var defaultSlug = ${JSON.stringify(views[0].slug)};

    window.BAKEIT_MERGED_JS_SOURCES = allMergedSources;

    function selectedSlug() {
        var slug = (window.location.hash || "").replace(/^#/, "");
        return templates[slug] ? slug : defaultSlug;
    }

    function markActiveLinks(slug) {
        document.querySelectorAll("a[href]").forEach(function(link) {
            var href = link.getAttribute("href") || "";
            var isActive = href.slice(-slug.length - 1) === "#" + slug;
            if (link.closest(".product-tabs") || link.closest(".nav-menu")) {
                link.classList.toggle("active", isActive);
            }
        });
    }

    function samePageSlugFromHref(href) {
        var hash = (href || "").split("#")[1];
        return hash && templates[hash] ? hash : "";
    }

    function executeViewScripts(slug) {
        (scripts[slug] || []).forEach(function(script) {
            try {
                Function(script.code + "\\n//# sourceURL=" + script.name)();
            } catch (error) {
                console.error("Cannot execute merged script:", script.name, error);
            }
        });
    }

    function render() {
        var root = document.getElementById("mergedInterfaceRoot");
        var slug = selectedSlug();
        if (!root) return;

        root.innerHTML = templates[slug];
        document.title = labels[slug] || document.title;
        markActiveLinks(slug);
        executeViewScripts(slug);
    }

    document.addEventListener("click", function(event) {
        var link = event.target.closest("a[href]");
        if (!link) return;

        var slug = samePageSlugFromHref(link.getAttribute("href"));
        if (!slug) return;

        event.preventDefault();
        if (window.location.hash !== "#" + slug) {
            window.location.hash = slug;
        }
        window.location.reload();
    });

    render();
})();
`;
}

function mergeFolder(folderPath, htmlLookup) {
  const folderName = path.basename(folderPath);
  const baseName = outputBaseName(folderName);
  const outputHtml = `${baseName}.html`;
  const outputJs = `${baseName}.js`;
  const files = fs.readdirSync(folderPath).sort();
  const htmlFiles = files.filter((file) => file.endsWith(".html") && file !== outputHtml);
  const jsFiles = files.filter((file) => file.endsWith(".js") && file !== outputJs);

  if (!htmlFiles.length || !jsFiles.length) return null;

  const firstHtml = fs.readFileSync(path.join(folderPath, htmlFiles[0]), "utf8");
  const firstBody = extractBody(firstHtml);
  const firstMain = extractMain(firstHtml);
  const mainClass = firstMain ? firstMain.className : "main-content";
  const views = [];

  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(path.join(folderPath, file), "utf8");
    const main = extractMain(html);
    if (!main) return;

    views.push({
      file,
      slug: slugForHtml(file),
      label: titleForHtml(file),
      template: rewriteHrefs(main.inner, folderPath, htmlLookup),
      scripts: scriptSources(html)
    });
  });

  const shellInner = firstBody.inner.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, `<main class="${mainClass}" id="mergedInterfaceRoot"></main>`);
  const head = stripScriptsFromHead(extractHead(firstHtml))
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${folderName}</title>`);
  const rewrittenShell = rewriteHrefs(shellInner, folderPath, htmlLookup);
  const html = [
    "<!DOCTYPE html>",
    "<html lang=\"en\">",
    "<head>",
    head,
    `    <script src="./${outputJs}" defer></script>`,
    "</head>",
    `<body${firstBody.attrs}>`,
    rewrittenShell,
    "</body>",
    "</html>"
  ].join("\n");

  fs.writeFileSync(path.join(folderPath, outputHtml), html + "\n");
  fs.writeFileSync(path.join(folderPath, outputJs), buildMergedJs(folderPath, baseName, views, jsFiles));

  return {
    folderName,
    outputHtml,
    outputJs,
    views: views.length,
    scripts: jsFiles.length
  };
}

const folders = fs.readdirSync(interfacesDir)
  .map((name) => path.join(interfacesDir, name))
  .filter((entry) => fs.statSync(entry).isDirectory())
  .sort();
const htmlLookup = buildHtmlLookup(folders);
const results = folders.map((folder) => mergeFolder(folder, htmlLookup)).filter(Boolean);

results.forEach((result) => {
  console.log(`${result.folderName}: ${result.outputHtml}, ${result.outputJs} (${result.views} html, ${result.scripts} js)`);
});
