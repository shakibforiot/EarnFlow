/* Clear catalog demo offers from SiteSettings */
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("NO_URI — skip DB clear");
    return;
  }
  const mongoose = require("mongoose");
  await mongoose.connect(uri);
  const r = await mongoose.connection.db.collection("sitesettings").updateOne(
    { _id: "main" },
    { $set: { offers: [], surveys: [], offerWalls: [] } },
  );
  console.log("cleared catalog", r.matchedCount, r.modifiedCount);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
