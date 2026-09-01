from django.db import migrations

def seed_expenses(apps, schema_editor):
    Expense = apps.get_model("expenses", "Expense")
    if not Expense.objects.exists():
        Expense.objects.bulk_create(
            [
                Expense(date="2026-08-01", category="식비", description="점심", amount=12000),
                Expense(date="2026-08-01", category="교통", description="버스", amount=1500),
                Expense(date="2026-08-02", category="카페", description="커피", amount=4800),
            ]
        )

def unseed_expenses(apps, schema_editor):
    Expense = apps.get_model("expenses", "Expense")
    Expense.objects.filter(
        date__in=["2026-08-01", "2026-08-02"],
        description__in=["점심", "버스", "커피"],
    ).delete()

class Migration(migrations.Migration):
    dependencies = [("expenses", "0001_initial")]

    operations = [
        migrations.RunPython(seed_expenses, unseed_expenses),
    ]
