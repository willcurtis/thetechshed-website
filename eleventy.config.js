import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const versionedAssets = [
  "src/assets/site.css",
  "src/assets/site.js",
  "src/assets/tools.js",
  "node_modules/qrcode-generator/dist/qrcode.js"
];

function getAssetVersion() {
  const hash = createHash("sha256");
  for (const asset of versionedAssets) hash.update(readFileSync(new URL(asset, import.meta.url)));
  return hash.digest("hex").slice(0, 12);
}

export default function (eleventyConfig) {
  // Ignore accidental Finder/cloud-sync duplicates such as "index 2.njk".
  eleventyConfig.ignores.add("**/* 2.*");
  eleventyConfig.addPassthroughCopy({ "src/assets/site.css": "assets/site.css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/site.js": "assets/site.js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/tools.js": "assets/tools.js" });
  eleventyConfig.addPassthroughCopy({
    "node_modules/qrcode-generator/dist/qrcode.js": "assets/vendor/qrcode.js"
  });
  eleventyConfig.addPassthroughCopy({ "src/images/tts-round-outline.png": "images/tts-round-outline.png" });
  eleventyConfig.addPassthroughCopy({ "src/images/posts": "images/posts" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "src/.htaccess": ".htaccess" });
  eleventyConfig.addGlobalData("assetVersion", () => getAssetVersion());

  eleventyConfig.addFilter("readableDate", (date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/London"
    }).format(new Date(date))
  );

  eleventyConfig.addFilter("htmlDate", (date) =>
    new Date(date).toISOString().slice(0, 10)
  );

  eleventyConfig.addFilter("limit", (items, count) => items.slice(0, count));
  eleventyConfig.addFilter("getPostDate", (post) => post.date.toISOString());
  eleventyConfig.addFilter("relativeRoot", (url = "/") => {
    const parts = url.split("/").filter(Boolean);
    const depth = parts.at(-1)?.includes(".") ? parts.length - 1 : parts.length;
    return depth === 0 ? "./" : "../".repeat(depth);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
