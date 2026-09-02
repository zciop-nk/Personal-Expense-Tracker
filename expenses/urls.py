from django.urls import path
from . import views

urlpatterns = [
    path("", views.expense_list, name="expense_list"),

    path("expenses/new/", views.expense_create, name="expense_create"),
    path("expenses/<int:pk>/edit/", views.expense_update, name="expense_update"),
    path("expenses/<int:pk>/delete/", views.expense_delete, name="expense_delete"),

    path("categories/create/", views.category_create, name="category_create"),
]