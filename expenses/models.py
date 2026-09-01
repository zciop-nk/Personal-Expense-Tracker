from django.core.validators import MinValueValidator
from django.db import models

class Expense(models.Model):
    date = models.DateField("날짜")
    category = models.CharField("카테고리", max_length=30)
    description = models.CharField("내용", max_length=80)
    amount = models.PositiveIntegerField(
        "금액",
        validators=[MinValueValidator(1)],
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.date} / {self.category} / {self.description}"
