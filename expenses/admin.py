from django.contrib import admin
from .models import Expense

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("date", "category", "description", "amount")
    list_filter = ("category", )
    search_fields = ("category__name", "description")
    ordering = ("-date", "-id")
