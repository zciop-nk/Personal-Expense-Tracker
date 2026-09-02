from django.core.validators import MinValueValidator
from django.db import models

class Category(models.Model):
    name = models.CharField(
        "카테고리명",
        max_length=30,
        unique=True,
    )

    color_key = models.CharField(
        "색상 키",
        max_length=20,
    )

    is_default = models.BooleanField(
        "기본 카테고리 여부",
        default=False,
    )

    created_at = models.DateTimeField(
        "등록일",
        auto_now_add=True,
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class CategoryKeyword(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="keywords",
        verbose_name="카테고리",
    )

    keyword = models.CharField(
        "추천 키워드",
        max_length=30,
        unique=True,
    )

    def __str__(self):
        return f"{self.keyword} → {self.category.name}"

class Expense(models.Model):
    date = models.DateField("날짜")
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="expenses",
        verbose_name="카테고리 연결",
        null=True,
        blank=True,
    )
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
