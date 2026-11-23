"""Python twin of frontend/src/seo/robots.ts, the single indexing rule for public pages.

Only COMPLETE content is indexed; everything else is `noindex, follow`, and application screens are
`noindex, nofollow`. apps.content.test_robots_rule keeps these values identical to the TypeScript module.
"""

INDEX = 'index, follow, max-image-preview:large'
NOINDEX = 'noindex, follow'
PRIVATE = 'noindex, nofollow'

# A hub (a /learn/<course>/ path) is worth indexing once it has this many COMPLETE lessons.
HUB_MIN_COMPLETE_LESSONS = 1


def get_robots_directive(status, private=False):
    if private:
        return PRIVATE
    return INDEX if status == 'COMPLETE' else NOINDEX


def hub_status(complete_lessons):
    return 'COMPLETE' if complete_lessons >= HUB_MIN_COMPLETE_LESSONS else 'PLACEHOLDER'
