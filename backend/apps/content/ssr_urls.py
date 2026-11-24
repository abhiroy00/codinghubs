from django.urls import path

from . import geo, ssr

urlpatterns = [
    path('blog', ssr.blog_list),
    path('blog/feed.xml', geo.BlogFeed()),
    path('llms.txt', geo.llms_txt),
    path('blog/<slug:slug>', ssr.blog_detail),
    path('case-studies', ssr.case_list),
    path('case-studies/<slug:slug>', ssr.case_detail),
    path('sitemap-content.xml', ssr.content_sitemap),
]
