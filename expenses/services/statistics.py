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

    if not records:
        return {
            "count": 0,
            "total": 0,
            "largest": None,
            "category_totals": [],
            "category_share": [],
            "monthly_totals": {},
            "daily_totals": {},
            "description_totals": [],
            "daily_average": 0,
            "category_comparison": [],
        }

    df = pd.DataFrame(records)

    # ForeignKey의 카테고리 이름을 기존 코드에서 쓰던
    # "category"라는 컬럼명으로 변경합니다.
    df = df.rename(
        columns={
            "category__name": "category",
        }
    )

    df["amount"] = (
        pd.to_numeric(df["amount"], errors="coerce")
        .fillna(0)
        .astype(int)
    )

    df["date"] = df["date"].astype(str)
    df["month"] = df["date"].str[:7]

    largest_row = df.loc[df["amount"].idxmax()]

    category_totals_df = (
        df.groupby(
            ["category", "category__color_key"],
            as_index=False,
        )["amount"]
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

    monthly_totals = (
        df.groupby("month")["amount"]
        .sum()
        .sort_index()
        .to_dict()
    )

    daily_totals = (
        df.groupby("date")["amount"]
        .sum()
        .sort_index()
        .to_dict()
    )

    description_totals_df = (
        df.groupby("description", as_index=False)["amount"]
        .sum()
        .sort_values("amount", ascending=False)
    )

    description_totals = [
        {
            "name": row["description"],
            "amount": int(row["amount"]),
        }
        for _, row in description_totals_df.iterrows()
    ]

    total_amount = int(df["amount"].sum())

    category_share = [
        {
            "name": item["name"],
            "color_key": item["color_key"],
            "amount": item["amount"],
            "percentage": (
                round((item["amount"] / total_amount) * 100, 1)
                if total_amount > 0
                else 0
            ),
        }
        for item in category_totals
    ]

    unique_days = df["date"].nunique()

    daily_average = (
        int(round(total_amount / unique_days))
        if unique_days > 0
        else 0
    )

    category_comparison_df = (
        df.groupby(
            ["category", "category__color_key"],
            as_index=False,
        )
        .agg(
            total=("amount", "sum"),
            count=("amount", "size"),
            average=("amount", "mean"),
        )
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

    return {
        "count": int(len(df)),
        "total": total_amount,

        "largest": {
            "id": int(largest_row["id"]),
            "date": str(largest_row["date"]),
            "category": str(largest_row["category"]),
            "category_color_key": str(
                largest_row["category__color_key"]
            ),
            "description": str(largest_row["description"]),
            "amount": int(largest_row["amount"]),
        },

        "category_totals": category_totals,
        "category_share": category_share,

        "monthly_totals": {
            str(k): int(v)
            for k, v in monthly_totals.items()
        },

        "daily_totals": {
            str(k): int(v)
            for k, v in daily_totals.items()
        },

        "description_totals": description_totals,

        "daily_average": daily_average,

        "category_comparison": category_comparison,
    }