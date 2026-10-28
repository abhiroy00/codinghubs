from django.urls import path

from . import ssr

urlpatterns = [
    path('store', ssr.store_list),
    path('store/<slug:slug>', ssr.store_detail),
    path('projects', ssr.projects_list),
    path('projects/<slug:slug>', ssr.project_detail),
    path('project-guides', ssr.guides_list),
    path('project-guides/<slug:slug>', ssr.guide_detail),
    path('sitemap-shop.xml', ssr.shop_sitemap),
]
