from django.urls import path

from . import views_admin as a
from .models import DigitalAsset, Product, Project, ProjectGuide
from .serializers import GuideAdminSerializer, ProductAdminSerializer, ProjectAdminSerializer

urlpatterns = [
    path('shop/stats/', a.ShopStats.as_view()),
    path('shop/audit/', a.AuditList.as_view()),
    path('products/', a.ProductList.as_view()),
    path('products/<int:pk>/', a.ProductDetail.as_view()),
    path('product-categories/', a.CategoryList.as_view()),
    path('product-categories/<int:pk>/', a.CategoryDetail.as_view()),
    path('projects/', a.ProjectList.as_view()),
    path('projects/<int:pk>/', a.ProjectDetail.as_view()),
    path('project-guides/', a.GuideList.as_view()),
    path('project-guides/<int:pk>/', a.GuideDetail.as_view()),
    path('products/<int:pk>/assets/', a.asset_upload_view(Product, 'product').as_view()),
    path('projects/<int:pk>/assets/', a.asset_upload_view(Project, 'project').as_view()),
    path('project-guides/<int:pk>/assets/', a.asset_upload_view(ProjectGuide, 'guide').as_view()),
    path('assets/<int:pk>/', a.AssetDelete.as_view()),
    path('coupons/', a.CouponList.as_view()),
    path('coupons/<int:pk>/', a.CouponDetail.as_view()),
    path('store-settings/', a.SettingsView.as_view()),
    path('store-orders/', a.OrderList.as_view()),
    path('store-orders/<str:number>/', a.OrderDetail.as_view()),
    path('store-orders/<str:number>/status/', a.order_action_view('status').as_view()),
    path('store-orders/<str:number>/cancel/', a.order_action_view('cancel').as_view()),
    path('store-orders/<str:number>/refund/', a.order_action_view('refund').as_view()),
    path('inventory/', a.InventoryList.as_view()),
    path('inventory/<int:pk>/adjust/', a.InventoryAdjust.as_view()),
    path('inventory/<int:pk>/movements/', a.InventoryMovements.as_view()),
    path('customers/', a.CustomerList.as_view()),
]
for model, ser, prefix in ((Product, ProductAdminSerializer, 'products'), (Project, ProjectAdminSerializer, 'projects'), (ProjectGuide, GuideAdminSerializer, 'project-guides')):
    for act in ('publish', 'unpublish', 'archive', 'preview'):
        urlpatterns.append(path(f'{prefix}/<int:pk>/{act}/', a.action_view(model, ser, act).as_view()))
