from django import forms
from .models import Expense


class ExpenseForm(forms.ModelForm):
    class Meta:
        model = Expense
        fields = ["date", "category", "description", "amount"]
        widgets = {
            # 브라우저 기본 date picker 대신 프로젝트 공통 커스텀 달력을 사용합니다.
            "date": forms.HiddenInput(),
            "category": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "예: 식비",
                    "maxlength": 30,
                }
            ),
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
                }
            ),
        }

    def clean_category(self):
        category = self.cleaned_data["category"].strip()
        if not category:
            raise forms.ValidationError("카테고리를 입력해 주세요.")
        return category

    def clean_description(self):
        description = self.cleaned_data["description"].strip()
        if not description:
            raise forms.ValidationError("내용을 입력해 주세요.")
        return description
