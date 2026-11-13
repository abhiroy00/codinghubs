from django.urls import path

from . import ssr

urlpatterns = [
    path('store', lambda request: ssr.not_found('Store is no longer available')),
    path('store/<path:slug>', lambda request, slug: ssr.not_found('Store is no longer available')),
    path('projects', ssr.projects_list),
    path('projects/<slug:slug>', ssr.project_detail),
    path('project-guides', ssr.guides_list),
    path('project-guides/<slug:slug>', ssr.guide_detail),
    path('sitemap-shop.xml', ssr.shop_sitemap),
]
