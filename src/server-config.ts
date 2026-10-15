export { resolveTypesetConfig, type TypesetConfigRequest, type ResolvedTypesetConfig } from "./server/config-resolver";
export { buildArticleCoverRequest, type ImageRenderInput } from "./adapter";
export type { RenderRequestBody } from "./server/routes/render";

import type { ImageRenderInput } from "./adapter";
import { buildArticleCoverRequest } from "./adapter";
import { resolveTypesetConfig } from "./server/config-resolver";

/** 冻结文章默认封面时，与 adapter 共用请求构造和配置优先级。 */
export function resolveArticleCoverConfig(input: ImageRenderInput) {
  return resolveTypesetConfig(buildArticleCoverRequest(input));
}
