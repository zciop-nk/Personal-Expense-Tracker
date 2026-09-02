from django.db import migrations


def link_existing_categories(apps, schema_editor):
    Expense = apps.get_model("expenses", "Expense")
    Category = apps.get_model("expenses", "Category")
    CategoryKeyword = apps.get_model("expenses", "CategoryKeyword")

    for expense in Expense.objects.all():
        raw_category = (expense.category or "").strip()

        # 1. 기존 카테고리명이 기본 카테고리와 직접 일치하는 경우
        category = Category.objects.filter(name=raw_category).first()

        # 2. 직접 일치하지 않으면 추천 키워드에서 찾기
        if category is None:
            keyword = CategoryKeyword.objects.filter(
                keyword=raw_category
            ).select_related("category").first()

            if keyword:
                category = keyword.category

        # 3. 그래도 없으면 사용자 카테고리로 생성
        if category is None and raw_category:
            category = Category.objects.create(
                name=raw_category,
                color_key="auto",
                is_default=False,
            )

        # 4. 연결
        if category:
            expense.category_ref = category
            expense.save(update_fields=["category_ref"])


def unlink_existing_categories(apps, schema_editor):
    Expense = apps.get_model("expenses", "Expense")

    Expense.objects.update(category_ref=None)


class Migration(migrations.Migration):

    dependencies = [
        ("expenses", "0005_expense_category_ref"),
    ]

    operations = [
        migrations.RunPython(
            link_existing_categories,
            unlink_existing_categories,
        ),
    ]