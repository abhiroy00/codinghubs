# Course thumbnail provenance

These 960 × 540 WebP illustrations are original Coding Hubs artwork, drawn locally
with geometric diagrams and course titles from `src/learning/catalog.ts`.
No third-party photos, logos, Canva previews or template exports are included.

The supplied Canva template-search reference was inaccessible on 19 November 2026,
and no permitted export was available. Original artwork is the requested fallback.

`scripts/generate-course-thumbnails.py` renders all 43 course images, eight track
fallbacks, and the slug-to-image manifest `src/learning/course-thumbnails.json`.
Run with Python 3 and Pillow on macOS (system Arial font). This is an optional asset
maintenance script, not a frontend build dependency.

Unknown slugs use a track image. If both images fail, the course card displays its
existing topic icon without changing the image area or hiding the course links.
