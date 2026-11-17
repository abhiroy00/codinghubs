from django.contrib import admin
from .models import Subscriber, Issue, Campaign, Delivery

admin.site.register([Subscriber, Issue, Campaign, Delivery])
