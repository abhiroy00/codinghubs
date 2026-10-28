from django.urls import path

from . import views_public as v

urlpatterns = [
    path('products/', v.ProductList.as_view()),
    path('products/<slug:slug>/', v.ProductDetail.as_view()),
    path('product-categories/', v.StoreCategories.as_view()),
    path('store/settings/', v.StorePublicSettings.as_view()),
    path('projects/', v.ProjectList.as_view()),
    path('projects/<slug:slug>/', v.ProjectDetail.as_view()),
    path('projects/<slug:slug>/questions/', v.ProjectQuestionCreate.as_view()),
    path('projects/<slug:slug>/files/<int:asset_id>/link/', type('ProjectLink', (v.ResourceDownloadLink,), {'kind': 'project'}).as_view()),
    path('project-guides/', v.GuideList.as_view()),
    path('project-guides/<slug:slug>/', v.GuideDetail.as_view()),
    path('project-guides/<slug:slug>/files/<int:asset_id>/link/', v.ResourceDownloadLink.as_view()),
    path('cart/', v.CartView.as_view()),
    path('cart/items/', v.CartItems.as_view()),
    path('cart/items/<int:product_id>/', v.CartItemDetail.as_view()),
    path('cart/coupon/', v.CartCoupon.as_view()),
    path('checkout/', v.Checkout.as_view()),
    path('store/payments/verify/', v.VerifyPayment.as_view()),
    path('store/payments/failed/', v.PaymentFailed.as_view()),
    path('store/payments/webhook/', v.Webhook.as_view()),
    path('store/orders/<str:number>/', v.OrderDetail.as_view()),
    path('store/orders/<str:number>/pay/', v.RetryPayment.as_view()),
    path('store/orders/<str:number>/request-refund/', v.RequestRefund.as_view()),
    path('store/downloads/<int:perm_id>/link/', v.DownloadLink.as_view()),
    path('store/download/<str:token>/', v.serve_download),
    path('my-account/orders/', v.MyOrders.as_view()),
    path('my-account/downloads/', v.MyDownloads.as_view()),
    path('my-account/claim-order/', v.ClaimOrder.as_view()),
]
