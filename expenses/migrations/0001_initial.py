from django.core.validators import MinValueValidator
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Expense",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("date", models.DateField(verbose_name="날짜")),
                ("category", models.CharField(max_length=30, verbose_name="카테고리")),
                ("description", models.CharField(max_length=80, verbose_name="내용")),
                (
                    "amount",
                    models.PositiveIntegerField(
                        validators=[MinValueValidator(1)],
                        verbose_name="금액",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="등록일")),
            ],
            options={"ordering": ["-date", "-id"]},
        ),
    ]
