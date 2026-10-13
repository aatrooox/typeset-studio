import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 源码和安装包共用同一数据根目录，环境变量优先。
export function resolveDataDir(): string {
  if (process.env.TYPESET_DATA_DIR) return resolve(process.env.TYPESET_DATA_DIR);
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const packageData = resolve(moduleDir, "../../data");
  if (existsSync(packageData)) return packageData;
  const cwdData = resolve(process.cwd(), "data");
  return existsSync(cwdData) ? cwdData : packageData;
}
