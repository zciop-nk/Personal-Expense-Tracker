import pandas as pd

def build_statistics(expenses):
    records = list(
        expenses.values("id", "date", "category", "description", "amount")
    )

    if not records:
        return {
            "count": 0,
            "total": 0,
            "largest": None,
            "category_totals": {},
            "monthly_totals": {},
        }

    df = pd.DataFrame(records)
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0).astype(int)
    df["date"] = df["date"].astype(str)
    df["month"] = df["date"].str[:7]

    largest_row = df.loc[df["amount"].idxmax()]

    category_totals = (
        df.groupby("category")["amount"]
        .sum()
        .sort_values(ascending=False)
        .to_dict()
    )

    monthly_totals = (
        df.groupby("month")["amount"]
        .sum()
        .sort_index()
        .to_dict()
    )

    return {
        "count": int(len(df)),
        "total": int(df["amount"].sum()),
        "largest": {
            "id": int(largest_row["id"]),
            "date": str(largest_row["date"]),
            "category": str(largest_row["category"]),
            "description": str(largest_row["description"]),
            "amount": int(largest_row["amount"]),
        },
        "category_totals": {str(k): int(v) for k, v in category_totals.items()},
        "monthly_totals": {str(k): int(v) for k, v in monthly_totals.items()},
    }
