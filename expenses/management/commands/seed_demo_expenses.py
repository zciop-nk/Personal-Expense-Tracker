from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from expenses.demo_data import build_demo_expenses
from expenses.models import Category, Expense


class Command(BaseCommand):
    help = "대시보드 확인용 가상 6개월 지출 데이터를 생성합니다."

    def add_arguments(self, parser):
        parser.add_argument(
            "--end-date",
            default=date.today().isoformat(),
            help="마지막 날짜 (YYYY-MM-DD, 기본값: 오늘)",
        )
        parser.add_argument(
            "--append",
            action="store_true",
            help="기존 지출을 지우지 않고 추가합니다.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            end_date = date.fromisoformat(options["end_date"])
        except ValueError as exc:
            raise CommandError("--end-date는 YYYY-MM-DD 형식이어야 합니다.") from exc

        categories = {category.name: category for category in Category.objects.all()}
        rows = build_demo_expenses(end_date)
        missing = sorted({row["category"] for row in rows} - set(categories))
        if missing:
            raise CommandError(f"기본 카테고리가 없습니다: {', '.join(missing)}")

        if not options["append"]:
            Expense.objects.all().delete()

        Expense.objects.bulk_create(
            [
                Expense(
                    date=row["date"],
                    category=categories[row["category"]],
                    description=row["description"],
                    amount=row["amount"],
                )
                for row in rows
            ]
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"가상 지출 {len(rows)}건 생성 완료: {rows[0]['date']} ~ {rows[-1]['date']}"
            )
        )
