from django import forms

from .models import Expense
from django.utils import timezone


class ExpenseForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["category"].required = True
        self.fields["amount"].max_value = 2_147_483_647
        if not self.is_bound and not self.instance.pk:
            self.initial.setdefault("date", timezone.localdate().isoformat())

    def clean_amount(self):
        value = self.cleaned_data["amount"]
        if value > 2_147_483_647:
            raise forms.ValidationError("금액은 2,147,483,647원 이하로 입력해 주세요.")
        return value

    def clean_date(self):
        value = self.cleaned_data["date"]
        if value > timezone.localdate():
            raise forms.ValidationError("실제로 쓴 지출은 오늘까지의 날짜로 기록해 주세요.")
        return value

    class Meta:
        model = Expense
        fields = ["date", "category", "description", "amount"]

        widgets = {
            # 브라우저 기본 date picker 대신 프로젝트 공통 커스텀 달력을 사용합니다.
            "date": forms.HiddenInput(),
            "category": forms.HiddenInput(),
            "description": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "예: 점심",
                    "maxlength": 80,
                }
            ),
            "amount": forms.NumberInput(
                attrs={
                    "class": "form-control amount-input",
                    "min": 1,
                    "step": 1,
                    "placeholder": "0",
                    "autocomplete": "off",
                }
            ),
        }

    def clean_description(self):
        description = self.cleaned_data["description"].strip()

        if not description:
            raise forms.ValidationError("내용을 입력해 주세요.")

        return description


class BudgetForm(forms.Form):
    month = forms.DateField(input_formats=["%Y-%m"], widget=forms.HiddenInput(), label="예산 월")
    amount = forms.IntegerField(min_value=1, max_value=2_147_483_647, label="월 예산 (원)", widget=forms.NumberInput(attrs={"class": "form-control", "placeholder": "예: 800000", "inputmode": "numeric"}))
