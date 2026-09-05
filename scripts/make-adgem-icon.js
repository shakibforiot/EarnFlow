const fs = require("fs");
const path = require("path");

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    require("child_process").execSync("npm i sharp --no-save", {
      stdio: "inherit",
    });
    sharp = require("sharp");
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#070a10"/>
  <rect x="40" y="40" width="432" height="432" rx="80" fill="#0b1018" stroke="#22d3ee" stroke-width="10"/>
  <path d="M120 340c64-150 128-214 148-214s84 64 148 214" stroke="#22d3ee" stroke-width="24" stroke-linecap="round" fill="none"/>
  <circle cx="256" cy="170" r="36" fill="#34d399"/>
</svg>`;

  const out = path.join("public", "icons", "earnflow-adgem-icon-512.png");
  await sharp(Buffer.from(svg))
    .resize(512, 512, { fit: "fill" })
    .png({ compressionLevel: 9, palette: true, colors: 64 })
    .toFile(out);

  const size = fs.statSync(out).size;
  console.log(`OK ${out}`);
  console.log(`Size: ${size} bytes (${(size / 1024).toFixed(1)} KB)`);
  console.log(`Aspect: 1:1 (512x512)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
