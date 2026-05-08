import { createHash, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function hiddenQuestion(label) {
  const rl = createInterface({ input, output });
  const onData = () => {
    const mask = "*".repeat(rl.line.length);
    output.write(`\r${label}${mask}`);
  };
  input.on("data", onData);
  const answer = await rl.question(label);
  input.off("data", onData);
  rl.close();
  output.write("\n");
  return answer;
}

const pathKey = await hiddenQuestion("Super admin path key: ");
const password = await hiddenQuestion("Super admin password: ");
const ownerEmail = await hiddenQuestion("Owner email: ");

console.log("");
console.log(`SUPER_ADMIN_PATH_HASH=${sha256(pathKey.trim())}`);
console.log(`SUPER_ADMIN_PASSWORD_HASH=${sha256(password)}`);
console.log(`SUPER_ADMIN_OWNER_EMAIL_HASH=${sha256(ownerEmail.trim().toLowerCase())}`);
console.log(`SUPER_ADMIN_SESSION_SECRET=${randomBytes(32).toString("hex")}`);
