from django.db import migrations


CATEGORY_COLORS = {
    "식비": "sage",
    "교통": "soft_blue",
    "주거·공과금": "warm_orange",
    "생활": "dusty_teal",
    "쇼핑": "soft_coral",
    "건강": "muted_rose",
    "문화·여가": "lavender",
    "교육·자기계발": "slate_indigo",
    "금융·고정비": "mustard",
    "반려동물": "mint",
}


def update_category_colors(apps, schema_editor):
    Category = apps.get_model("expenses", "Category")

    for category_name, color_key in CATEGORY_COLORS.items():
        Category.objects.filter(
            name=category_name
        ).update(
            color_key=color_key
        )


def reverse_category_colors(apps, schema_editor):
    Category = apps.get_model("expenses", "Category")

    old_colors = {
        "식비": "green",
        "교통": "blue",
        "주거·공과금": "orange",
        "생활": "teal",
        "쇼핑": "coral",
        "건강": "red",
        "문화·여가": "purple",
        "교육·자기계발": "indigo",
        "금융·고정비": "gold",
        "반려동물": "mint",
    }

    for category_name, color_key in old_colors.items():
        Category.objects.filter(
            name=category_name
        ).update(
            color_key=color_key
        )


class Migration(migrations.Migration):

    dependencies = [
        ("expenses", "0008_rename_category_ref_expense_category"),
    ]

    operations = [
        migrations.RunPython(
            update_category_colors,
            reverse_category_colors,
        ),
    ]