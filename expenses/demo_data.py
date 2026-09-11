"""Deterministic demo expense data used only for local dashboard testing."""

from __future__ import annotations

import calendar
import random
from datetime import date


DEFAULT_SEED = 20260902


def _shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    index = year * 12 + (month - 1) + delta
    return divmod(index, 12)[0], divmod(index, 12)[1] + 1


def _safe_date(year: int, month: int, day: int, end_date: date) -> date | None:
    last_day = calendar.monthrange(year, month)[1]
    candidate = date(year, month, min(day, last_day))
    return candidate if candidate <= end_date else None


def build_demo_expenses(end_date: date, seed: int = DEFAULT_SEED) -> list[dict]:
    """Return six calendar months of realistic, non-future demo expenses.

    The dataset is fictional. Repeated descriptions are intentional so category and
    description dashboards have meaningful distributions.
    """

    rng = random.Random(seed)
    rows: list[dict] = []

    recurring = [
        ("주거·공과금", "월세", 650_000, 1),
        ("금융·고정비", "통신비", 55_000, 5),
        ("금융·고정비", "보험", 82_000, 8),
        ("금융·고정비", "넷플릭스", 17_000, 12),
        ("교통", "교통카드 충전", 55_000, 3),
        ("건강", "필라테스", 120_000, 10),
    ]

    variable_pool = [
        ("식비", "점심", (8_500, 15_000)),
        ("식비", "카페", (4_500, 8_000)),
        ("식비", "저녁", (12_000, 28_000)),
        ("식비", "배달", (18_000, 36_000)),
        ("식비", "장보기", (28_000, 76_000)),
        ("교통", "택시", (8_000, 24_000)),
        ("생활", "생활용품", (6_000, 32_000)),
        ("생활", "미용실", (35_000, 75_000)),
        ("쇼핑", "화장품", (18_000, 68_000)),
        ("쇼핑", "의류", (29_000, 110_000)),
        ("건강", "약국", (5_000, 19_000)),
        ("문화·여가", "영화", (13_000, 28_000)),
        ("문화·여가", "친구 약속", (24_000, 65_000)),
        ("교육·자기계발", "책", (14_000, 32_000)),
        ("반려동물", "고양이 사료", (22_000, 48_000)),
        ("반려동물", "고양이 간식", (5_000, 16_000)),
    ]

    unique_pool = [
        ("문화·여가", "뮤지컬", (70_000, 130_000)),
        ("문화·여가", "주말 숙박", (120_000, 220_000)),
        ("쇼핑", "운동화", (65_000, 145_000)),
        ("쇼핑", "가방", (75_000, 180_000)),
        ("교육·자기계발", "온라인 강의", (49_000, 129_000)),
        ("건강", "건강검진", (55_000, 160_000)),
        ("생활", "네일", (35_000, 70_000)),
        ("주거·공과금", "전기요금", (25_000, 58_000)),
        ("주거·공과금", "가스요금", (18_000, 52_000)),
    ]

    months = [_shift_month(end_date.year, end_date.month, delta) for delta in range(-5, 1)]

    for month_index, (year, month) in enumerate(months):
        month_end = calendar.monthrange(year, month)[1]
        allowed_last_day = min(month_end, end_date.day) if (year, month) == (end_date.year, end_date.month) else month_end

        for category, description, amount, day in recurring:
            d = _safe_date(year, month, day, end_date)
            if d:
                varied_amount = amount
                if description == "월세":
                    varied_amount = amount
                elif description == "교통카드 충전":
                    varied_amount += rng.choice([-5_000, 0, 0, 5_000])
                rows.append({"date": d, "category": category, "description": description, "amount": varied_amount})

        if allowed_last_day < 3:
            # Current month may only have a couple of available days. Keep it realistic.
            count = 5
        else:
            count = 12 + rng.randint(0, 4)

        for _ in range(count):
            category, description, (low, high) = rng.choice(variable_pool)
            day = rng.randint(1, max(1, allowed_last_day))
            d = date(year, month, day)
            amount = int(round(rng.randint(low, high) / 500) * 500)
            rows.append({"date": d, "category": category, "description": description, "amount": max(500, amount)})

        # One or two less-frequent expenses per full month makes monthly totals less uniform.
        if allowed_last_day >= 7:
            for _ in range(1 + (month_index % 2)):
                category, description, (low, high) = rng.choice(unique_pool)
                day = rng.randint(2, allowed_last_day)
                amount = int(round(rng.randint(low, high) / 1_000) * 1_000)
                rows.append({"date": date(year, month, day), "category": category, "description": description, "amount": max(1_000, amount)})

        # Management/utilities vary by season and month rather than looking copy-pasted.
        if allowed_last_day >= 15:
            rows.append({
                "date": date(year, month, min(18, allowed_last_day)),
                "category": "주거·공과금",
                "description": "관리비",
                "amount": rng.randrange(78_000, 116_001, 1_000),
            })

    rows.sort(key=lambda row: (row["date"], row["category"], row["description"]))
    return rows
