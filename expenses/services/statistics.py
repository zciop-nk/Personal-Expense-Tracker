from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncMonth


EMPTY_STATISTICS = {
    "count": 0,
    "total": 0,
    "largest": None,
    "category_share": [],
    "monthly_totals": {},
    "daily_totals": {},
    "monthly_by_category": [],
    "daily_by_category": [],
    "description_totals": [],
    "daily_average": 0,
    "category_comparison": [],
}


def _date_key(value):
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _month_key(value):
    return _date_key(value)[:7]


def build_statistics(expenses):
    """Build dashboard statistics in the database where possible.

    The public return shape intentionally stays unchanged so templates and
    chart JavaScript do not need to know whether SQLite or PostgreSQL is used.
    """
    summary = expenses.aggregate(count=Count("id"), total=Sum("amount"))
    count = int(summary["count"] or 0)
    total_amount = int(summary["total"] or 0)

    if count == 0:
        return EMPTY_STATISTICS.copy()

    largest_row = (
        expenses.values(
            "id",
            "date",
            "category__name",
            "category__color_key",
            "description",
            "amount",
        )
        .order_by("-amount", "-date", "-id")
        .first()
    )

    category_rows = list(
        expenses.values("category__name", "category__color_key")
        .annotate(total=Sum("amount"), count=Count("id"), average=Avg("amount"))
        .order_by("-total", "category__name")
    )
    category_totals = [
        {
            "name": row["category__name"] or "미분류",
            "color_key": row["category__color_key"] or "",
            "amount": int(row["total"] or 0),
        }
        for row in category_rows
    ]
    category_share = [
        {
            **item,
            "percentage": round(item["amount"] / total_amount * 100, 1) if total_amount else 0,
        }
        for item in category_totals
    ]

    description_totals = [
        {"name": row["description"], "amount": int(row["total"] or 0)}
        for row in expenses.values("description")
        .annotate(total=Sum("amount"))
        .order_by("-total", "description")
    ]

    monthly_rows = (
        expenses.annotate(period=TruncMonth("date"))
        .values("period")
        .annotate(total=Sum("amount"))
        .order_by("period")
    )
    monthly_totals = {
        _month_key(row["period"]): int(row["total"] or 0)
        for row in monthly_rows
    }

    daily_rows = (
        expenses.values("date")
        .annotate(total=Sum("amount"))
        .order_by("date")
    )
    daily_totals = {
        _date_key(row["date"]): int(row["total"] or 0)
        for row in daily_rows
    }

    monthly_category_rows = (
        expenses.annotate(period=TruncMonth("date"))
        .values("period", "category__name", "category__color_key")
        .annotate(total=Sum("amount"))
        .order_by("period", "category__name", "category__color_key")
    )
    monthly_by_category = [
        {
            "period": _month_key(row["period"]),
            "name": row["category__name"] or "미분류",
            "color_key": row["category__color_key"] or "",
            "amount": int(row["total"] or 0),
        }
        for row in monthly_category_rows
    ]

    daily_category_rows = (
        expenses.values("date", "category__name", "category__color_key")
        .annotate(total=Sum("amount"))
        .order_by("date", "category__name", "category__color_key")
    )
    daily_by_category = [
        {
            "period": _date_key(row["date"]),
            "name": row["category__name"] or "미분류",
            "color_key": row["category__color_key"] or "",
            "amount": int(row["total"] or 0),
        }
        for row in daily_category_rows
    ]

    category_comparison = [
        {
            "name": row["category__name"] or "미분류",
            "color_key": row["category__color_key"] or "",
            "total": int(row["total"] or 0),
            "count": int(row["count"] or 0),
            "average": int(round(float(row["average"] or 0))),
        }
        for row in category_rows
    ]

    return {
        "count": count,
        "total": total_amount,
        "largest": {
            "id": int(largest_row["id"]),
            "date": _date_key(largest_row["date"]),
            "category": largest_row["category__name"] or "미분류",
            "category_color_key": largest_row["category__color_key"] or "",
            "description": str(largest_row["description"]),
            "amount": int(largest_row["amount"]),
        },
        "category_share": category_share,
        "monthly_totals": monthly_totals,
        "daily_totals": daily_totals,
        "monthly_by_category": monthly_by_category,
        "daily_by_category": daily_by_category,
        "description_totals": description_totals,
        "daily_average": int(round(total_amount / len(daily_totals))) if daily_totals else 0,
        "category_comparison": category_comparison,
    }
