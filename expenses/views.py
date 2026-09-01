from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string

from .forms import ExpenseForm
from .models import Expense
from .services.statistics import build_statistics


def _build_list_context(request):
    categories = list(
        Expense.objects.order_by("category")
        .values_list("category", flat=True)
        .distinct()
    )

    selected_categories = request.GET.getlist("category")
    date_from = request.GET.get("date_from", "").strip()
    date_to = request.GET.get("date_to", "").strip()
    period = request.GET.get("period", "").strip()

    # 전부 선택은 필터 없음(전체)과 동일하게 정규화합니다.
    if categories and set(selected_categories) == set(categories):
        selected_categories = []

    expenses = Expense.objects.all()

    if selected_categories:
        expenses = expenses.filter(category__in=selected_categories)

    if date_from:
        expenses = expenses.filter(date__gte=date_from)

    if date_to:
        expenses = expenses.filter(date__lte=date_to)

    stats = build_statistics(expenses)

    return {
        "expenses": expenses,
        "categories": categories,
        "selected_categories": selected_categories,
        "date_from": date_from,
        "date_to": date_to,
        "period": period,
        "stats": stats,
    }


def expense_list(request):
    context = _build_list_context(request)

    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        results_html = render_to_string(
            "expenses/_results.html",
            context,
            request=request,
        )
        return JsonResponse(
            {
                "results_html": results_html,
                "selected_categories": context["selected_categories"],
                "date_from": context["date_from"],
                "date_to": context["date_to"],
                "period": context["period"],
            }
        )

    return render(request, "expenses/index.html", context)


def expense_create(request):
    if request.method == "POST":
        form = ExpenseForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "지출을 추가했습니다.")
            return redirect("expense_list")
    else:
        form = ExpenseForm()

    return render(
        request,
        "expenses/expense_form.html",
        {"form": form, "is_edit": False},
    )


def expense_update(request, pk):
    expense = get_object_or_404(Expense, pk=pk)

    if request.method == "POST":
        form = ExpenseForm(request.POST, instance=expense)
        if form.is_valid():
            form.save()
            messages.success(request, "지출을 수정했습니다.")
            return redirect("expense_list")
    else:
        form = ExpenseForm(instance=expense)

    return render(
        request,
        "expenses/expense_form.html",
        {"form": form, "is_edit": True, "expense": expense},
    )


def expense_delete(request, pk):
    if request.method == "POST":
        expense = get_object_or_404(Expense, pk=pk)
        expense.delete()
        messages.success(request, "지출을 삭제했습니다.")
    return redirect("expense_list")
