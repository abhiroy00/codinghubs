from django.urls import path
from .authoring import Action, ConceptDetail, ConceptList, History, HistoryDetail, Metadata
from .assessments import ReviewDetailView, ReviewQueueView
from .documents import DocumentsView, DocumentDetailView
from .research import SourceViewSet, ClaimViewSet

urlpatterns = [
    path('learning/documents/', DocumentsView.as_view()),
    path('learning/documents/<int:pk>/', DocumentDetailView.as_view()),
    path('learning/research/sources/', SourceViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('learning/research/sources/<int:pk>/', SourceViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'})),
    path('learning/research/claims/', ClaimViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('learning/research/claims/<int:pk>/', ClaimViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'})),
    path('learning/submissions/', ReviewQueueView.as_view()),
    path('learning/submissions/<uuid:pk>/', ReviewDetailView.as_view()),
    path('learning/concepts/', ConceptList.as_view()),
    path('learning/metadata/', Metadata.as_view()),
    path('learning/concepts/<int:pk>/', ConceptDetail.as_view()),
    path('learning/concepts/<int:pk>/history/', History.as_view()),
    path('learning/concepts/<int:pk>/history/<int:revision_id>/', HistoryDetail.as_view()),
    path('learning/concepts/<int:pk>/<str:action>/', Action.as_view()),
]
