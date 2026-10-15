# Changelog

## 0.3.1 (2026-10-16)

- Share idempotent cover-title normalization between host previews and trusted Pipeline cover snapshots while retaining the existing adapter title behavior for other callers.
- Reject snapshot titles that become empty after normalization instead of rendering the fallback example.

## 0.3.0 (2026-10-16)

- Add browser-safe article-cover controls and a canonical 3350 x 1000 template factory with a fixed left title area and right square image.
- Register a trusted Noto CJK font by byte hash before server-side cover measurement, without silently falling back to system fonts.
- Support centered cover-fit template images while retaining existing default image sizing, standalone Studio and adapter entry points.

## 0.2.8 (2026-10-16)

- Add a standalone Docker distribution with persistent templates, explicit administrator credentials and bundled system Chinese fonts.
- Keep build contexts free of local runtime data, secrets and private font files.
- Build browser resources on the build platform and install Canvas for the target runtime architecture.
- Align the adapter, HTTP health and Studio version labels with the package release.

## 0.2.7 (2026-10-15)

- Expand the default WeChat article cover to 3350 x 1000 (3.35:1), providing a left 2.35:1 cover and a right 1:1 thumbnail.
- Retain the existing canvas identifier so saved templates use the corrected dimensions.
- Update Studio ratio labels and built-in cover descriptions.
