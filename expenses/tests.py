import csv
import io
from datetime import date
from unittest.mock import patch
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, Client
from .models import Category, Expense, MonthlyBudget
from .services.statistics import build_statistics


class LedgerTests(TestCase):
    def setUp(self):
        Expense.objects.all().delete()
        self.category = Category.objects.create(name="테스트 식비", color_key="sage")
        self.other = Category.objects.create(name="테스트 교통", color_key="soft_blue")
        self.clock = patch("expenses.views.timezone.localdate", return_value=date(2026, 9, 14))
        self.clock.start()
        self.addCleanup(self.clock.stop)

    def create(self, **changes):
        data = dict(date="2026-09-14", category=self.category, description="점심", amount=12000)
        data.update(changes)
        return Expense.objects.create(**data)

    def post_data(self, **changes):
        data = dict(date="2026-09-14", category=self.category.pk, description="저녁", amount=15000)
        data.update(changes)
        return data

    def test_create_edit_delete_preserves_custom_category(self):
        self.assertRedirects(self.client.post('/expenses/new/', self.post_data()), '/')
        expense = Expense.objects.get()
        self.assertRedirects(self.client.post(f'/expenses/{expense.pk}/edit/', self.post_data(amount=9000)), '/')
        expense.refresh_from_db()
        self.assertEqual(expense.amount, 9000)
        self.assertEqual(self.client.get(f'/expenses/{expense.pk}/delete/').status_code, 405)
        self.assertTrue(Expense.objects.filter(pk=expense.pk).exists())
        self.assertRedirects(self.client.post(f'/expenses/{expense.pk}/delete/'), '/')
        self.assertFalse(Expense.objects.exists())
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())

    def test_invalid_inputs_do_not_save(self):
        for changes in [dict(amount=0), dict(amount=-1), dict(amount='1.5'), dict(amount=2147483648), dict(date='bad'), dict(date='2026-02-30'), dict(date='2026-09-15'), dict(description='   '), dict(category='')]:
            with self.subTest(changes=changes):
                response = self.client.post('/expenses/new/', self.post_data(**changes))
                self.assertEqual(response.status_code, 200)
                self.assertTrue(response.context['form'].errors)
                self.assertFalse(Expense.objects.exists())

    def test_invalid_date_filters_never_500_or_leak_unfiltered_rows(self):
        self.create()
        for query in [dict(date_from='not-date'), dict(date_to='2026-02-30'), dict(date_from='2026-09-20', date_to='2026-09-01')]:
            response = self.client.get('/', query)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.context['filter_errors'])
            self.assertEqual(response.context['stats']['count'], 0)
            self.assertEqual(self.client.get('/expenses/export/', query).status_code, 400)

    def test_search_category_date_combination_and_export(self):
        self.create()
        self.create(description='점심 버스', category=self.other, amount=1500)
        self.create(date='2026-08-01')
        query = {'q': '점심', 'category': self.category.name, 'date_from': '2026-09-01', 'date_to': '2026-09-30'}
        response = self.client.get('/', query)
        self.assertEqual(response.context['stats']['total'], 12000)
        self.assertEqual(response.context['stats']['count'], 1)
        rows = list(csv.reader(io.StringIO(self.client.get('/expenses/export/', query).content.decode('utf-8-sig'))))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1][-1], '12000')

    def test_csv_formula_and_html_escape(self):
        self.create(description='=1+1')
        self.create(description='<img src=x onerror=alert(1)>')
        response = self.client.get('/')
        self.assertContains(response, '&lt;img src=x onerror=alert(1)&gt;')
        self.assertNotContains(response, '<img src=x onerror=alert(1)>')
        exported = self.client.get('/expenses/export/').content.decode('utf-8-sig')
        self.assertIn("'=1+1", exported)

    def test_pagination_keeps_full_aggregate_and_export(self):
        for _ in range(35): self.create(amount=100)
        response = self.client.get('/', {'page': 2})
        self.assertEqual(len(response.context['expenses']), 5)
        self.assertEqual(response.context['stats']['total'], 3500)
        self.assertEqual(len(self.client.get('/expenses/export/').content.decode('utf-8-sig').splitlines()), 36)

    def test_month_budget_upsert_and_home_independent_from_filters(self):
        self.create(amount=14000)
        self.create(date='2026-08-14', amount=10000)
        self.create(date='2026-08-15', amount=50000)
        self.client.post('/budget/', {'month': '2026-09', 'amount': 100000})
        self.client.post('/budget/', {'month': '2026-09', 'amount': 200000})
        self.assertEqual(MonthlyBudget.objects.count(), 1)
        response = self.client.get('/', {'q': '없는내용'})
        self.assertEqual(response.context['stats']['total'], 0)
        self.assertEqual(response.context['month_total'], 14000)
        self.assertEqual(response.context['remaining'], 186000)
        self.assertEqual(response.context['daily_available'], 186000 // 17)
        self.assertEqual(response.context['previous_total'], 10000)
        self.assertEqual(response.context['month_difference'], 4000)

    def test_budget_overspend_and_month_boundary(self):
        self.create(amount=12000)
        MonthlyBudget.objects.create(month='2026-09-01', amount=10000)
        r = self.client.get('/')
        self.assertEqual(r.context['over_budget'], 2000)
        self.assertEqual(r.context['daily_available'], 0)
        self.assertEqual(r.context['budget_percent'], 100)
        self.assertEqual(r.context['budget_used_percent'], 120)
        with patch('expenses.views.timezone.localdate', return_value=date(2026, 3, 31)):
            self.create(date='2026-02-28', amount=7000)
            r = self.client.get('/')
            self.assertEqual(r.context['previous_total'], 7000)
            self.assertEqual(r.context['days_left'], 1)

    def test_invalid_budget_and_months_are_isolated(self):
        for data in [{'month':'2026-09','amount':0}, {'month':'2026-13','amount':100}, {'month':'bad','amount':100}]:
            r = self.client.post('/budget/', data)
            self.assertEqual(r.status_code, 200)
            self.assertTrue(r.context['form'].errors)
        self.client.post('/budget/', {'month':'2026-08','amount':50000})
        self.assertIsNone(self.client.get('/').context['month_budget'])

    def test_ajax_refresh_includes_live_home(self):
        self.create()
        response = self.client.get('/', HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertIn('results_html', response.json())
        self.assertIn('12,000', response.json()['home_html'])


    def test_home_month_navigation_returns_selected_month_summary(self):
        self.create(date="2026-08-01", amount=31000)
        MonthlyBudget.objects.create(month="2026-08-01", amount=100000)

        response = self.client.get(
            "/home/month/",
            {"month": "2026-08"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["selected_month"], "2026-08")
        self.assertIn("2026년 8월", payload["home_html"])
        self.assertIn("31,000", payload["home_html"])
        self.assertIn("69,000", payload["home_html"])

        # 이번 달 이후로는 탐색하지 않도록 현재 월로 정규화합니다.
        future = self.client.get(
            "/home/month/",
            {"month": "2026-12"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(future.json()["selected_month"], "2026-09")

    def test_category_create_length_duplicate_and_persistence(self):
        self.assertEqual(self.client.post('/categories/create/', {'name':'a'*31}).status_code,400)
        self.assertEqual(self.client.post('/categories/create/', {'name':self.category.name}).status_code,400)
        self.assertEqual(self.client.post('/categories/create/', {'name':'  새   분류  '}).status_code,200)
        self.assertTrue(Category.objects.filter(name='새 분류').exists())
        self.assertNotContains(self.client.get('/'), 'value="새 분류"')
        self.create(category=Category.objects.get(name='새 분류'))
        self.assertContains(self.client.get('/'), 'value="새 분류"')

    def test_csrf_blocks_untrusted_mutation(self):
        c = Client(enforce_csrf_checks=True)
        self.assertEqual(c.post('/expenses/new/', self.post_data()).status_code,403)
        self.assertFalse(Expense.objects.exists())

    def test_statistics_empty_unclassified_and_two_categories(self):
        self.assertEqual(build_statistics(Expense.objects.all())['total'],0)
        self.create(category=None, amount=1000)
        stats = build_statistics(Expense.objects.all())
        self.assertEqual(stats['category_share'][0]['name'], '미분류')
        self.create()
        r = self.client.get('/', {'category': [self.category.name,self.other.name]})
        self.assertEqual(r.context['dashboard_type'], 'D')
        self.assertEqual(len(r.context['comparison_rows']),2)

    def test_demo_command_refuses_implicit_deletion(self):
        record = self.create()
        with self.assertRaises(CommandError): call_command('seed_demo_expenses')
        self.assertTrue(Expense.objects.filter(pk=record.pk).exists())

    def test_page_assets_have_content_hash_and_are_served(self):
        """Rendered template and bytes served by Django must be the same version."""
        import re
        import hashlib
        from django.test import RequestFactory, override_settings
        from django.contrib.staticfiles.views import serve
        with override_settings(DEBUG=True):
            for path in ['/', '/expenses/new/', '/budget/']:
                response = self.client.get(path)
                html = response.content.decode()
                assets = re.findall(r'(?:src|href)="(/static/expenses/[^\"]+\.(?:css|js))"', html)
                self.assertEqual(len(assets), 4)
                for url in assets:
                    match = re.search(r'\.([a-f0-9]{12})\.(css|js)$', url)
                    self.assertIsNotNone(match, url)
                    asset_response = serve(RequestFactory().get(url), url.removeprefix('/static/'))
                    self.assertEqual(asset_response.status_code, 200)
                    content = b''.join(asset_response.streaming_content)
                    self.assertEqual(hashlib.sha256(content).hexdigest()[:12], match.group(1))
                    if match.group(2) == 'css':
                        self.assertIn(b'.home-overview{display:grid', content)
                        self.assertIn(b'.site-header{', content)
                        self.assertIn(b'@media(max-width:760px)', content)
                        self.assertIn(b'.mobile-nav{position:fixed', content)

    def test_budget_modal_load_save_and_month_lookup(self):
        MonthlyBudget.objects.create(month="2026-08-01", amount=70000)
        headers = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}
        r = self.client.get('/budget/', {"month": "2026-08"}, **headers)
        self.assertIn('70000', r.json()['form_html'])
        self.assertIn('data-month-toggle', r.json()['form_html'])
        r = self.client.post('/budget/', {"month":"2026-09", "amount":200000}, **headers)
        self.assertTrue(r.json()['success'])
        self.assertIn('200,000', r.json()['home_html'])
        r = self.client.post('/budget/', {"month":"2026-09", "amount":0}, **headers)
        self.assertFalse(r.json()['success'])
        self.assertEqual(MonthlyBudget.objects.get(month='2026-09-01').amount,200000)

    def test_applied_search_feedback(self):
        self.create(description="커피")
        r = self.client.get('/', {'q':'커피'})
        self.assertContains(r, '“커피”')
        self.assertContains(r, '검색 결과 · 1건')
        self.assertContains(r, 'data-search-reset')
    def test_design_system_page_is_available(self):
        response = self.client.get('/design-system/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'SSEUM DESIGN SYSTEM')
        self.assertContains(response, 'CSS Governance')

