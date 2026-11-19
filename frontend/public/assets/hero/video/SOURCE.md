# Hero background videos

Decorative backgrounds for page heroes (`src/components/HeroVideo.tsx`, styles in `src/components/hero-video.css`). The home page uses the clip in this folder. Inner pages now use static banner art (`src/components/PageBannerArt.tsx`); only the `pages/` poster stills remain, for the backend-rendered blog, newsletter and case study pages.

All clips are from Pexels under the Pexels License, https://www.pexels.com/license/ (free for commercial use, attribution not required, editing allowed). Each clip page below was checked on 2026-11-16 and is marked "Free".

## Home page

| Field | Value |
| --- | --- |
| Clip | "People Programming on a Computer" (Pexels video #8632602) |
| Creator | Kampus Production |
| Page | https://www.pexels.com/video/people-programming-on-a-computer-8632602/ |
| Downloaded | 2026-11-16 from the Pexels CDN (`videos.pexels.com/video-files/8632602/...`) |

- `team-coding-review-720p.mp4` (`8632602-hd_1280_720_25fps.mp4`, H.264, ~8 s, no audio track, fast-start): wide desktop screens
- `team-coding-review-540p.mp4` (`8632602-sd_960_540_25fps.mp4`, same clip): tablets and small laptops
- `team-coding-review-poster*.{webp,jpg}`: still frame from the clip's Pexels preview image (`images.pexels.com/videos/8632602/pexels-photo-8632602.jpeg`), resized. Used as the poster, the reduced-motion and data-saver fallback, and the phone background.

## Other pages (`pages/`)

Each `pages/<name>.mp4` is a ~10 s section (8-9 s for the shorter clips) of the Pexels 720p file, re-encoded to 1280x720 H.264 at about 1.4 Mbit/s with the audio removed and fast-start on. `pages/<name>-poster-1280.webp` and `-768.webp` are frames from the same clip, used as the poster and as the still on phones, with reduced motion and with data saver.

| File (`pages/`) | Used on | Pexels clip | Creator |
| --- | --- | --- | --- |
| `courses` | /courses | [College Students Studying in Class #8198517](https://www.pexels.com/video/college-students-studying-in-class-8198517/) | Yan Krukau |
| `course-detail` | /courses/:slug | [People Looking At A Computer #3248994](https://www.pexels.com/video/people-looking-at-a-computer-3248994/) | fauxels |
| `interview-prep` | /interview-prep | [Job Interview #7652008](https://www.pexels.com/video/job-interview-7652008/) | Kindel Media |
| `interview-prep-detail` | /interview-prep/:slug | [Young Man Studying Through Online Learning #5272272](https://www.pexels.com/video/young-man-studying-through-online-learning-5272272/) | Vlada Karpovich |
| `faq` | /faq | [Call Center Agents Wearing their Headphones #7682953](https://www.pexels.com/video/call-center-agents-wearing-their-headphones-7682953/) | Mikhail Nilov |
| `ai` | /ai | [Running Codes on a Computer #6804121](https://www.pexels.com/video/running-codes-on-a-computer-6804121/) | cottonbro studio |
| `ai-tools` | /ai-tools | [A Computer Code Running on Screen #6804117](https://www.pexels.com/video/a-computer-code-running-on-screen-6804117/) | cottonbro studio |
| `blog` | /blog | [Woman Writing on a Notebook #5173824](https://www.pexels.com/video/woman-writing-on-a-notebook-5173824/) | Bethany Ferr |
| `blog-article` | /blog/:slug | [A Man Reading an E-Book by the Window #15928111](https://www.pexels.com/video/a-man-reading-an-e-book-by-the-window-15928111/) | khanhhoangminh |
| `projects` | /projects | [Person Sticking Sticky Notes on a Whiteboard #7429487](https://www.pexels.com/video/person-sticking-sticky-notes-on-a-whiteboard-7429487/) | cottonbro studio |
| `project-guides` | /project-guides | [Close up on Coding on Laptop Screen #11274330](https://www.pexels.com/video/close-up-on-coding-on-laptop-screen-11274330/) | Raddy |
| `book-a-tutor` | /book-a-tutor | [Man Writing in His Notebook While Looking at the Laptop #4873104](https://www.pexels.com/video/man-writing-in-his-notebook-while-looking-at-the-laptop-4873104/) | Tima Miroshnichenko |
| `latest-jobs` | /latest-jobs | [Handshake #6193006](https://www.pexels.com/video/handshake-6193006/) | Diva Plavalaguna |
| `our-work` | /our-work | [People Coding on Computer #6804109](https://www.pexels.com/video/people-coding-on-computer-6804109/) | cottonbro studio |
| `learn` | /learn | [Studying At Home Using A Laptop #4017223](https://www.pexels.com/video/women-studying-studying-at-home-4017223/) | Pavel Danilyuk |
| `locations` | /locations | [Drone Footage of Delhi #4039439](https://www.pexels.com/video/drone-footage-of-delhi-4039439/) | Mike Sangma |
| `location-detail` | /locations/:slug | [Time Lapse Video Footage Of Vehicles In The Road At Night #5184101](https://www.pexels.com/video/time-lapse-video-footage-of-vehicles-in-the-road-at-night-5184101/) | Its Kiran |
| `policies` | /policies | [Man Signing the Paper #8061370](https://www.pexels.com/video/man-signing-the-paper-8061370/) | Pavel Danilyuk |

## License notes

The Pexels License does not allow implying that the people shown endorse Coding Hubs, so keep these clips as decorative backgrounds. Do not use them in testimonials or claim they show Coding Hubs students, trainers or offices.
