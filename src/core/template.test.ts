import { describe, expect, it } from "bun:test";
import { applyTemplateImages } from "./template";
import { FlowImage } from "./types";

describe("applyTemplateImages - Template Image Persistence & Intersection Logic", () => {
  it("applies template layout to intersecting image index 0 when template has 1 image and actual has 3 images", () => {
    const actualImages: FlowImage[] = [
      {
        id: "img_user_1",
        src: "https://user.com/pic1.jpg",
        alt: "User Pic 1",
        caption: "My caption 1",
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        isAbsolute: false,
        layoutPreset: "auto",
      },
      {
        id: "img_user_2",
        src: "https://user.com/pic2.jpg",
        alt: "User Pic 2",
        x: 50,
        y: 50,
        width: 200,
        height: 200,
        isAbsolute: false,
        layoutPreset: "mid-left",
      },
      {
        id: "img_user_3",
        src: "https://user.com/pic3.jpg",
        alt: "User Pic 3",
        x: 80,
        y: 80,
        width: 300,
        height: 300,
        isAbsolute: false,
        layoutPreset: "mid-right",
      },
    ];

    const templateImages: FlowImage[] = [
      {
        id: "tpl_slot_1",
        src: "https://sample.com/cover.jpg",
        alt: "Cover Sample",
        isAbsolute: true,
        x: 1200,
        y: 150,
        width: 900,
        height: 700,
        rotate: 5,
        opacity: 0.9,
        zIndex: 20,
        borderRadius: 24,
        layoutPreset: "custom",
      },
    ];

    const result = applyTemplateImages(actualImages, templateImages);

    // Length should remain 3
    expect(result.length).toBe(3);

    // Image 0 must have user content identity
    expect(result[0].id).toBe("img_user_1");
    expect(result[0].src).toBe("https://user.com/pic1.jpg");
    expect(result[0].alt).toBe("User Pic 1");
    expect(result[0].caption).toBe("My caption 1");

    // Image 0 must have template layout configuration
    expect(result[0].isAbsolute).toBe(true);
    expect(result[0].x).toBe(1200);
    expect(result[0].y).toBe(150);
    expect(result[0].width).toBe(900);
    expect(result[0].height).toBe(700);
    expect(result[0].rotate).toBe(5);
    expect(result[0].opacity).toBe(0.9);
    expect(result[0].zIndex).toBe(20);
    expect(result[0].borderRadius).toBe(24);
    expect(result[0].layoutPreset).toBe("custom");

    // Images 1 and 2 must remain completely untouched
    expect(result[1]).toEqual(actualImages[1]);
    expect(result[2]).toEqual(actualImages[2]);
  });

  it("applies template layout only to existing 1 image when template has 2 images and actual has 1 image", () => {
    const actualImages: FlowImage[] = [
      {
        id: "img_single",
        src: "https://user.com/single.jpg",
        alt: "Single",
        x: 0,
        y: 0,
        width: 400,
        height: 300,
      },
    ];

    const templateImages: FlowImage[] = [
      {
        id: "tpl_1",
        src: "https://tpl.com/1.jpg",
        alt: "Tpl 1",
        isAbsolute: true,
        x: 500,
        y: 200,
        width: 600,
        height: 400,
      },
      {
        id: "tpl_2",
        src: "https://tpl.com/2.jpg",
        alt: "Tpl 2",
        isAbsolute: false,
        layoutPreset: "corner-soft",
        width: 300,
        height: 200,
      },
    ];

    const result = applyTemplateImages(actualImages, templateImages);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe("img_single");
    expect(result[0].src).toBe("https://user.com/single.jpg");
    expect(result[0].isAbsolute).toBe(true);
    expect(result[0].x).toBe(500);
    expect(result[0].y).toBe(200);
    expect(result[0].width).toBe(600);
    expect(result[0].height).toBe(400);
  });

  it("adopts template images when actual has 0 images", () => {
    const actualImages: FlowImage[] = [];
    const templateImages: FlowImage[] = [
      {
        id: "tpl_1",
        src: "https://tpl.com/cover.jpg",
        alt: "Cover",
        isAbsolute: true,
        x: 800,
        y: 100,
        width: 700,
        height: 500,
      },
    ];

    const result = applyTemplateImages(actualImages, templateImages);

    expect(result.length).toBe(1);
    expect(result[0].src).toBe("https://tpl.com/cover.jpg");
    expect(result[0].isAbsolute).toBe(true);
    expect(result[0].x).toBe(800);
    expect(result[0].y).toBe(100);
    expect(result[0].width).toBe(700);
    expect(result[0].height).toBe(500);
  });

  it("returns unchanged images when template has no images", () => {
    const actualImages: FlowImage[] = [
      {
        id: "img_1",
        src: "https://user.com/1.jpg",
        alt: "1",
        x: 10,
        y: 20,
        width: 100,
        height: 100,
      },
    ];

    const result = applyTemplateImages(actualImages, undefined);
    expect(result).toEqual(actualImages);
  });
});
