from django.contrib import admin
from .models import Expense

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("date", "category", "description", "amount")
    list_filter = ("category", "date")
    search_fields = ("category", "description")
    ordering = ("-date", "-id")
