import random

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string

from .forms import ExpenseForm
from .models import Category, CategoryKeyword, Expense
from .services.statistics import build_statistics
from datetime import datetime


def _build_list_context(request):
    categories = list(
        Category.objects.filter(
            expenses__isnull=False
        )
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

    expenses = Expense.objects.all()

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

    if selected_count == 1:
        selected_category = Category.objects.filter(
            name=selected_categories[0]
        ).first()

    stats = build_statistics(expenses)

    return {
        "expenses": expenses,
        "categories": categories,
        "selected_categories": selected_categories,
        "date_from": date_from,
        "date_to": date_to,
        "period": period,

        "dashboard_type": dashboard_type,
        "selected_category": selected_category,
        "is_short_period": is_short_period,
        "period_days": period_days,

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
    categories = Category.objects.all().order_by("-is_default", "id")
    category_keywords = CategoryKeyword.objects.select_related("category").all()
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
            "form_categories": categories,
            "category_keywords": category_keywords,
        },
    )


def expense_update(request, pk):
    expense = get_object_or_404(Expense, pk=pk)

    categories = Category.objects.all().order_by("-is_default", "id")
    category_keywords = CategoryKeyword.objects.select_related("category").all()

    if request.method == "POST":
        # 수정하기 전 기존 카테고리를 기억합니다.
        old_category = expense.category

        form = ExpenseForm(request.POST, instance=expense)

        if form.is_valid():
            updated_expense = form.save()

            # 카테고리가 변경되었고,
            # 기존 카테고리가 사용자 생성 카테고리이며,
            # 더 이상 사용하는 지출이 없다면 자동 삭제합니다.
            if (
                old_category
                and old_category != updated_expense.category
                and not old_category.is_default
                and not old_category.expenses.exists()
            ):
                old_category.delete()

            messages.success(request, "지출을 수정했습니다.")
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
            "form_categories": categories,
            "category_keywords": category_keywords,
        },
    )


def expense_delete(request, pk):
    if request.method == "POST":
        expense = get_object_or_404(Expense, pk=pk)

        # 지출을 삭제하기 전에 카테고리를 기억합니다.
        category = expense.category

        expense.delete()

        # 기본 카테고리는 절대 삭제하지 않습니다.
        # 사용자 생성 카테고리만 사용 중인 지출이 0건이면 자동 삭제합니다.
        if (
            category
            and not category.is_default
            and not category.expenses.exists()
        ):
            category.delete()

        messages.success(request, "지출을 삭제했습니다.")

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

    custom_palette = [
        "dusty_pink",
        "soft_olive",
        "muted_sky",
        "warm_taupe",
        "soft_plum",
        "dusty_cyan",
        "mellow_peach",
        "soft_lilac",
    ]

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
        for color in custom_palette
        if color not in used_colors
    ]

    if available_colors:
        color_key = random.choice(available_colors)
    else:
        color_key = random.choice(custom_palette)

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
