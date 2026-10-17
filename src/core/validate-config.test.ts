import { expect, test } from "bun:test";
import { BUILTIN_PRESETS } from "./presets";
import { validateTypesetTemplateConfig } from "./validate-config";

const asset = "asset:11111111-1111-4111-8111-111111111111";
const valid = () => { const config = structuredClone(BUILTIN_PRESETS[0]!); config.images = config.images?.map(image => ({ ...image, src: asset })); return config; };

test("native host validation retains full config and rejects unsafe resources", () => {
  const config = valid();
  expect(validateTypesetTemplateConfig(config)).toEqual(config);
  expect(validateTypesetTemplateConfig(config)).not.toBe(config);
  for (const src of ["/etc/passwd", "https://example.com/image.png", "data:image/png;base64,AAAA", "asset:../owner"]) {
    const changed = valid(); changed.images![0]!.src = src;
    expect(() => validateTypesetTemplateConfig(changed)).toThrow();
  }
  for (const changed of [
    { ...config, arbitrary: true },
    { ...config, slot: "newspic_cover" },
    { ...config, algorithm: { ...config.algorithm, baseFontSize: Infinity } },
    { ...config, images: [...config.images!, ...config.images!] },
    { ...config, algorithm: { ...config.algorithm, safeArea: { top: 500, bottom: 500, left: 0, right: 0 } } },
  ]) expect(() => validateTypesetTemplateConfig(changed)).toThrow();
});

test("every standalone builtin remains representable as a native host template", () => {
  expect(BUILTIN_PRESETS.length).toBeGreaterThan(9);
  for (const config of BUILTIN_PRESETS) {
    const host = structuredClone(config); host.slot ||= "newspic_content"; host.images = (host.images || []).map(image => ({ ...image, src: asset }));
    expect(validateTypesetTemplateConfig(host)).toEqual(host);
  }
});
