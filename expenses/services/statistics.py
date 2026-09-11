import pandas as pd


def build_statistics(expenses):
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
        "largest_day": None,
        "category_totals": [],
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

    df = pd.DataFrame(records).rename(columns={"category__name": "category"})
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0).astype(int)
    df["date"] = df["date"].astype(str)
    df["month"] = df["date"].str[:7]

    total_amount = int(df["amount"].sum())
    largest_row = df.loc[df["amount"].idxmax()]

    category_totals_df = (
        df.groupby(["category", "category__color_key"], as_index=False)["amount"]
        .sum()
        .sort_values("amount", ascending=False)
    )
    category_totals = [
        {
            "name": row["category"],
            "color_key": row["category__color_key"],
            "amount": int(row["amount"]),
        }
        for _, row in category_totals_df.iterrows()
    ]

    category_share = [
        {
            **item,
            "percentage": round((item["amount"] / total_amount) * 100, 1) if total_amount else 0,
        }
        for item in category_totals
    ]

    monthly_totals = df.groupby("month")["amount"].sum().sort_index().to_dict()
    daily_totals = df.groupby("date")["amount"].sum().sort_index().to_dict()

    largest_day_key = max(daily_totals, key=daily_totals.get)
    largest_day = {"date": str(largest_day_key), "amount": int(daily_totals[largest_day_key])}

    description_totals_df = (
        df.groupby("description", as_index=False)["amount"]
        .sum()
        .sort_values("amount", ascending=False)
    )
    description_totals = [
        {"name": row["description"], "amount": int(row["amount"])}
        for _, row in description_totals_df.iterrows()
    ]

    category_comparison_df = (
        df.groupby(["category", "category__color_key"], as_index=False)
        .agg(total=("amount", "sum"), count=("amount", "size"), average=("amount", "mean"))
        .sort_values("total", ascending=False)
    )
    category_comparison = [
        {
            "name": row["category"],
            "color_key": row["category__color_key"],
            "total": int(row["total"]),
            "count": int(row["count"]),
            "average": int(round(row["average"])),
        }
        for _, row in category_comparison_df.iterrows()
    ]

    monthly_by_category_df = (
        df.groupby(["month", "category", "category__color_key"], as_index=False)["amount"]
        .sum()
        .sort_values(["month", "category"])
    )
    monthly_by_category = [
        {
            "period": row["month"],
            "name": row["category"],
            "color_key": row["category__color_key"],
            "amount": int(row["amount"]),
        }
        for _, row in monthly_by_category_df.iterrows()
    ]

    daily_by_category_df = (
        df.groupby(["date", "category", "category__color_key"], as_index=False)["amount"]
        .sum()
        .sort_values(["date", "category"])
    )
    daily_by_category = [
        {
            "period": row["date"],
            "name": row["category"],
            "color_key": row["category__color_key"],
            "amount": int(row["amount"]),
        }
        for _, row in daily_by_category_df.iterrows()
    ]

    unique_days = df["date"].nunique()
    daily_average = int(round(total_amount / unique_days)) if unique_days else 0

    return {
        "count": int(len(df)),
        "total": total_amount,
        "largest": {
            "id": int(largest_row["id"]),
            "date": str(largest_row["date"]),
            "category": str(largest_row["category"]),
            "category_color_key": str(largest_row["category__color_key"]),
            "description": str(largest_row["description"]),
            "amount": int(largest_row["amount"]),
        },
        "largest_day": largest_day,
        "category_totals": category_totals,
        "category_share": category_share,
        "monthly_totals": {str(k): int(v) for k, v in monthly_totals.items()},
        "daily_totals": {str(k): int(v) for k, v in daily_totals.items()},
        "monthly_by_category": monthly_by_category,
        "daily_by_category": daily_by_category,
        "description_totals": description_totals,
        "daily_average": daily_average,
        "category_comparison": category_comparison,
    }
