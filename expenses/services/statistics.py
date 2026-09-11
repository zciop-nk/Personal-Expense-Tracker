from collections import defaultdict
from statistics import mean


def build_statistics(expenses):
    """Build dashboard statistics without a pandas dependency.

    Keeping the result as plain Python data makes this service lightweight and
    easier to reuse when the database is later changed from SQLite to PostgreSQL.
    """
    records = list(
        expenses.values(
            "id",
            "date",
            "category__name",
            "category__color_key",
            "description",
            "amount",
        )
    )

    empty = {
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
    if not records:
        return empty

    total_amount = sum(int(row["amount"]) for row in records)
    largest_row = max(records, key=lambda row: int(row["amount"]))

    category_amounts = defaultdict(int)
    category_meta = {}
    description_amounts = defaultdict(int)
    monthly_totals = defaultdict(int)
    daily_totals = defaultdict(int)
    monthly_by_category_map = defaultdict(int)
    daily_by_category_map = defaultdict(int)
    category_amount_lists = defaultdict(list)

    for row in records:
        amount = int(row["amount"])
        category = row["category__name"] or "미분류"
        color_key = row["category__color_key"] or ""
        day = row["date"].isoformat() if hasattr(row["date"], "isoformat") else str(row["date"])
        month = day[:7]

        category_meta[category] = color_key
        category_amounts[category] += amount
        category_amount_lists[category].append(amount)
        description_amounts[row["description"]] += amount
        monthly_totals[month] += amount
        daily_totals[day] += amount
        monthly_by_category_map[(month, category, color_key)] += amount
        daily_by_category_map[(day, category, color_key)] += amount

    category_totals = [
        {"name": name, "color_key": category_meta[name], "amount": amount}
        for name, amount in sorted(category_amounts.items(), key=lambda item: item[1], reverse=True)
    ]
    category_share = [
        {
            **item,
            "percentage": round(item["amount"] / total_amount * 100, 1) if total_amount else 0,
        }
        for item in category_totals
    ]

    sorted_daily_totals = dict(sorted(daily_totals.items()))
    description_totals = [
        {"name": name, "amount": amount}
        for name, amount in sorted(description_amounts.items(), key=lambda item: item[1], reverse=True)
    ]

    category_comparison = [
        {
            "name": name,
            "color_key": category_meta[name],
            "total": sum(amounts),
            "count": len(amounts),
            "average": int(round(mean(amounts))),
        }
        for name, amounts in category_amount_lists.items()
    ]
    category_comparison.sort(key=lambda item: item["total"], reverse=True)

    monthly_by_category = [
        {"period": period, "name": name, "color_key": color_key, "amount": amount}
        for (period, name, color_key), amount in sorted(monthly_by_category_map.items())
    ]
    daily_by_category = [
        {"period": period, "name": name, "color_key": color_key, "amount": amount}
        for (period, name, color_key), amount in sorted(daily_by_category_map.items())
    ]

    return {
        "count": len(records),
        "total": total_amount,
        "largest": {
            "id": int(largest_row["id"]),
            "date": largest_row["date"].isoformat() if hasattr(largest_row["date"], "isoformat") else str(largest_row["date"]),
            "category": largest_row["category__name"] or "미분류",
            "category_color_key": largest_row["category__color_key"] or "",
            "description": str(largest_row["description"]),
            "amount": int(largest_row["amount"]),
        },
        "category_share": category_share,
        "monthly_totals": dict(sorted(monthly_totals.items())),
        "daily_totals": sorted_daily_totals,
        "monthly_by_category": monthly_by_category,
        "daily_by_category": daily_by_category,
        "description_totals": description_totals,
        "daily_average": int(round(total_amount / len(sorted_daily_totals))) if sorted_daily_totals else 0,
        "category_comparison": category_comparison,
    }
