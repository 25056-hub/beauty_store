import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default async function globalSetup() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const rootPath = path.resolve(currentDir, "..", "..");
  const backendPath = path.join(rootPath, "backend");
  const pythonPath = path.join(backendPath, "venv", "Scripts", "python.exe");
  const seedPath = path.join(backendPath, "data", "seed_demo_data.py");

  execFileSync(pythonPath, [seedPath], {
    cwd: backendPath,
    stdio: "inherit",
  });
}
