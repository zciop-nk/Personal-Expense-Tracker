from django.db import migrations


def seed_categories(apps, schema_editor):
    Category = apps.get_model("expenses", "Category")
    CategoryKeyword = apps.get_model("expenses", "CategoryKeyword")

    category_data = [
        {
            "name": "식비",
            "color_key": "green",
            "keywords": [
                "아침", "점심", "저녁", "외식",
                "배달", "야식", "카페", "커피",
                "간식", "편의점", "장보기",
            ],
        },
        {
            "name": "교통",
            "color_key": "blue",
            "keywords": [
                "버스", "지하철", "택시",
                "기차", "KTX", "주유",
                "주차", "톨비", "자전거",
            ],
        },
        {
            "name": "주거·공과금",
            "color_key": "orange",
            "keywords": [
                "월세", "관리비", "전기",
                "수도", "가스", "난방",
                "인터넷",
            ],
        },
        {
            "name": "생활",
            "color_key": "teal",
            "keywords": [
                "생필품", "세제", "휴지",
                "세탁", "미용실", "네일",
                "생활용품",
            ],
        },
        {
            "name": "쇼핑",
            "color_key": "coral",
            "keywords": [
                "옷", "의류", "신발",
                "화장품", "가방", "액세서리",
                "전자기기", "잡화",
            ],
        },
        {
            "name": "건강",
            "color_key": "red",
            "keywords": [
                "병원", "약국", "진료",
                "치과", "안과", "운동",
                "헬스", "필라테스",
            ],
        },
        {
            "name": "문화·여가",
            "color_key": "purple",
            "keywords": [
                "영화", "공연", "전시",
                "게임", "여행", "숙박",
                "취미", "노래방",
            ],
        },
        {
            "name": "교육·자기계발",
            "color_key": "indigo",
            "keywords": [
                "책", "강의", "학원",
                "자격증", "스터디", "교육비",
            ],
        },
        {
            "name": "금융·고정비",
            "color_key": "gold",
            "keywords": [
                "보험", "통신비", "구독",
                "카드수수료", "이자",
            ],
        },
        {
            "name": "반려동물",
            "color_key": "mint",
            "keywords": [
                "사료", "반려동물간식",
                "동물병원", "반려동물미용",
                "반려동물용품",
            ],
        },
    ]

    for item in category_data:
        category, _ = Category.objects.get_or_create(
            name=item["name"],
            defaults={
                "color_key": item["color_key"],
                "is_default": True,
            },
        )

        for keyword in item["keywords"]:
            CategoryKeyword.objects.get_or_create(
                keyword=keyword,
                defaults={
                    "category": category,
                },
            )


def remove_seed_categories(apps, schema_editor):
    Category = apps.get_model("expenses", "Category")

    default_names = [
        "식비",
        "교통",
        "주거·공과금",
        "생활",
        "쇼핑",
        "건강",
        "문화·여가",
        "교육·자기계발",
        "금융·고정비",
        "반려동물",
    ]

    Category.objects.filter(
        name__in=default_names,
        is_default=True,
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("expenses", "0003_category_categorykeyword"),
    ]

    operations = [
        migrations.RunPython(
            seed_categories,
            remove_seed_categories,
        ),
    ]