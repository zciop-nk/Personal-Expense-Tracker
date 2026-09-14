import random
from datetime import datetime, date, timedelta
import calendar
import csv
from django.db.models import Sum, Q
from django.core.paginator import Paginator
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.http import HttpResponse

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string

from .forms import ExpenseForm, BudgetForm
from .models import Category, CategoryKeyword, Expense, MonthlyBudget
from .services.statistics import build_statistics


CUSTOM_CATEGORY_COLORS = (
    "dusty_pink",
    "soft_olive",
    "muted_sky",
    "warm_taupe",
    "soft_plum",
    "dusty_cyan",
    "mellow_peach",
    "soft_lilac",
)


def _form_options():
    return {
        "form_categories": Category.objects.all().order_by("-is_default", "id"),
        "category_keywords": CategoryKeyword.objects.select_related("category").all(),
    }


def _build_list_context(request):
    categories = list(
        Category.objects.filter(expenses__isnull=False)
        .distinct()
        .order_by("name")
    )

    category_names = [
        category.name
        for category in categories
    ]

    selected_categories = request.GET.getlist("category")
    date_from = request.GET.get("date_from", "").strip()
    date_to = request.GET.get("date_to", "").strip()
    period = request.GET.get("period", "").strip()

    # 전부 선택은 필터 없음(전체)과 동일하게 정규화합니다.
    if category_names and set(selected_categories) == set(category_names):
        selected_categories = []

    filter_errors = []
    for field, value in (("date_from", date_from), ("date_to", date_to)):
        if value:
            try:
                parsed = date.fromisoformat(value)
                if parsed.isoformat() != value:
                    raise ValueError
            except ValueError:
                filter_errors.append("날짜는 YYYY-MM-DD 형식으로 입력해 주세요.")
                if field == "date_from": date_from = ""
                else: date_to = ""
    if date_from and date_to and date_from > date_to:
        filter_errors.append("시작일은 종료일보다 늦을 수 없어요.")
    query = request.GET.get("q", "").strip()[:80]
    selected_categories = list(dict.fromkeys(selected_categories))
    expenses = Expense.objects.select_related("category").all()
    if filter_errors:
        expenses = expenses.none()
    if query:
        expenses = expenses.filter(Q(description__icontains=query) | Q(category__name__icontains=query))

    if selected_categories:
        expenses = expenses.filter(category__name__in=selected_categories)

    if date_from:
        expenses = expenses.filter(date__gte=date_from)

    if date_to:
        expenses = expenses.filter(date__lte=date_to)

    dashboard_type = "A"

    selected_count = len(selected_categories)

    # 기간이 30일 이하인지 먼저 계산합니다.
    is_short_period = False
    period_days = None

    if date_from and date_to:
        try:
            start_date = datetime.strptime(
                date_from,
                "%Y-%m-%d",
            ).date()

            end_date = datetime.strptime(
                date_to,
                "%Y-%m-%d",
            ).date()

            period_days = (end_date - start_date).days + 1

            if 1 <= period_days <= 30:
                is_short_period = True

        except ValueError:
            is_short_period = False
            period_days = None


    # 대시보드 타입 결정
    if selected_count == 2:
        dashboard_type = "D"

    elif selected_count == 1:
        dashboard_type = "B"

    elif is_short_period:
        dashboard_type = "C"

    selected_category = None
    selected_category_objects = list(
        Category.objects.filter(name__in=selected_categories).order_by("name")
    )

    if selected_count == 1:
        selected_category = selected_category_objects[0] if selected_category_objects else None

    stats = build_statistics(expenses)

    # C 타입의 하루 평균은 "지출이 있었던 날"이 아니라 선택 기간 전체 날짜 수 기준입니다.
    period_daily_average = stats["daily_average"]
    if period_days and period_days > 0:
        period_daily_average = int(round(stats["total"] / period_days))

    comparison_map = {item["name"]: item for item in stats["category_comparison"]}
    comparison_rows = []
    for category in selected_category_objects:
        item = comparison_map.get(category.name)
        comparison_rows.append(
            item
            or {
                "name": category.name,
                "color_key": category.color_key,
                "total": 0,
                "count": 0,
                "average": 0,
            }
        )

    page = Paginator(expenses, 30).get_page(request.GET.get("page"))
    params = request.GET.copy()
    params.pop("page", None)
    return {
        "expenses": page.object_list,
        "filtered_expenses": expenses,
        "page_obj": page,
        "filter_query": params.urlencode(),
        "query": query,
        "filter_errors": filter_errors,
        "categories": categories,
        "selected_categories": selected_categories,
        "date_from": date_from,
        "date_to": date_to,
        "period": period,

        "dashboard_type": dashboard_type,
        "selected_category": selected_category,
        "selected_category_objects": selected_category_objects,
        "is_short_period": is_short_period,
        "period_days": period_days,
        "period_daily_average": period_daily_average,
        "comparison_rows": comparison_rows,

        "stats": stats,
    }


def expense_list(request):
    context = _build_list_context(request)
    context.update(_build_home_context())

    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        results_html = render_to_string(
            "expenses/_results.html",
            context,
            request=request,
        )
        return JsonResponse(
            {
                "results_html": results_html,
                "category_names": [category.name for category in context["categories"]],
                "home_html": render_to_string("expenses/_home.html", context, request=request),
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
        {
            "form": form,
            "is_edit": False,
            **_form_options(),
        },
    )


def expense_update(request, pk):
    expense = get_object_or_404(Expense, pk=pk)

    if request.method == "POST":
        form = ExpenseForm(request.POST, instance=expense)

        if form.is_valid():
            form.save()

            messages.info(request, "지출을 수정했습니다.")
            return redirect("expense_list")
    else:
        form = ExpenseForm(instance=expense)

    return render(
        request,
        "expenses/expense_form.html",
        {
            "form": form,
            "is_edit": True,
            "expense": expense,
            **_form_options(),
        },
    )


@require_POST
def expense_delete(request, pk):
    expense = get_object_or_404(Expense, pk=pk)
    expense.delete()
    messages.warning(request, "지출을 삭제했습니다.")
    return redirect("expense_list")

def category_create(request):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "잘못된 요청입니다.",
            },
            status=405,
        )

    # 앞뒤 공백 제거 + 중간의 불필요한 연속 공백 정리
    raw_name = request.POST.get("name", "")
    name = " ".join(raw_name.split())

    if not name:
        return JsonResponse(
            {
                "success": False,
                "message": "카테고리명을 입력해 주세요.",
            },
            status=400,
        )

    if len(name) > 30:
        return JsonResponse({"success": False, "message": "카테고리는 30자까지 입력할 수 있어요."}, status=400)

    # 이미 존재하는 카테고리명은 새로 만들 수 없습니다.
    existing_category = Category.objects.filter(
        name__iexact=name
    ).first()

    if existing_category:
        return JsonResponse(
            {
                "success": False,
                "message": f'"{existing_category.name}" 카테고리는 이미 존재합니다.',
            },
            status=400,
        )

    # 기본 추천 키워드와 같은 이름도 새 카테고리로 만들지 않습니다.
    existing_keyword = (
        CategoryKeyword.objects
        .select_related("category")
        .filter(keyword__iexact=name)
        .first()
    )

    if existing_keyword:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    f'"{name}"은(는) '
                    f'"{existing_keyword.category.name}" 카테고리의 추천 키워드입니다.'
                ),
            },
            status=400,
        )

    used_colors = set(
        Category.objects.filter(
            is_default=False
        ).values_list(
            "color_key",
            flat=True,
        )
    )

    available_colors = [
        color
        for color in CUSTOM_CATEGORY_COLORS
        if color not in used_colors
    ]

    if available_colors:
        color_key = random.choice(available_colors)
    else:
        color_key = random.choice(CUSTOM_CATEGORY_COLORS)

    category = Category.objects.create(
        name=name,
        color_key=color_key,
        is_default=False,
    )

    return JsonResponse(
        {
            "success": True,
            "category": {
                "id": category.id,
                "name": category.name,
                "color_key": category.color_key,
            },
        }
    )


def _build_home_context():
    today = timezone.localdate()
    month = today.replace(day=1)
    end = today.replace(day=calendar.monthrange(today.year, today.month)[1])
    total = Expense.objects.filter(date__range=(month, today)).aggregate(value=Sum("amount"))["value"] or 0
    previous_end = month - timedelta(days=1)
    previous_start = previous_end.replace(day=1)
    previous_cutoff = previous_end.replace(day=min(today.day, previous_end.day))
    previous = Expense.objects.filter(date__range=(previous_start, previous_cutoff)).aggregate(value=Sum("amount"))["value"] or 0
    budget = MonthlyBudget.objects.filter(month=month).first()
    remaining = budget.amount - total if budget else None
    days_left = (end - today).days + 1
    return {
        "today": today, "month_total": total, "month_budget": budget,
        "remaining": remaining, "over_budget": abs(remaining) if remaining is not None and remaining < 0 else 0,
        "budget_percent": min(100, round(total / budget.amount * 100)) if budget else 0,
        "budget_used_percent": round(total / budget.amount * 100) if budget else 0,
        "daily_available": max(0, remaining) // days_left if budget else None,
        "days_left": days_left, "previous_total": previous,
        "month_difference": abs(total - previous), "spending_increased": total > previous,
        "today_total": Expense.objects.filter(date=today).aggregate(value=Sum("amount"))["value"] or 0,
    }


def budget_settings(request):
    month = timezone.localdate().replace(day=1)
    raw_month = request.GET.get("month", "")
    if raw_month:
        try:
            month = datetime.strptime(raw_month, "%Y-%m").date()
        except ValueError:
            return JsonResponse({"message": "올바른 월을 선택해 주세요."}, status=400)
    budget = MonthlyBudget.objects.filter(month=month).first()
    form = BudgetForm(request.POST if request.method == "POST" else None, initial={"month": month.strftime("%Y-%m"), "amount": budget.amount if budget else None})
    ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest"
    if request.method == "POST" and form.is_valid():
        MonthlyBudget.objects.update_or_create(month=form.cleaned_data["month"], defaults={"amount": form.cleaned_data["amount"]})
        if ajax:
            return JsonResponse({"success": True, "home_html": render_to_string("expenses/_home.html", _build_home_context(), request=request)})
        messages.success(request, "월 예산을 저장했습니다.")
        return redirect("expense_list")
    if ajax:
        return JsonResponse({"success": False, "form_html": render_to_string("expenses/_budget_form.html", {"form": form}, request=request)})
    return render(request, "expenses/budget_form.html", {"form": form})


def expense_export(request):
    context = _build_list_context(request)
    if context["filter_errors"]:
        return HttpResponse("날짜 필터를 확인해 주세요.", status=400, content_type="text/plain; charset=utf-8")
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="sseum-expenses.csv"'
    response.write("\ufeff")
    writer = csv.writer(response)
    writer.writerow(["ID", "날짜", "카테고리", "내용", "금액(원)"])
    def cell(value):
        value = str(value)
        return "'" + value if value.lstrip().startswith(("=", "+", "-", "@")) or value.startswith(("\t", "\r", "\n")) else value
    for expense in context["filtered_expenses"].iterator():
        writer.writerow([expense.pk, expense.date.isoformat(), cell(expense.category.name if expense.category else "미분류"), cell(expense.description), expense.amount])
    return response
