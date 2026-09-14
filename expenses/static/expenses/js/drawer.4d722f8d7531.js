document.addEventListener("DOMContentLoaded", () => {
    initPeriodCalendarClose();
    initExpenseDrawer();
});


/*
 * 메인 기간 선택 달력 닫기 버튼
 * 기존에는 배경 클릭으로만 닫혔지만,
 * Drawer와 같은 원형 X 버튼을 달력 카드에 추가합니다.
 */
function initPeriodCalendarClose() {
    const popover =
        document.querySelector("#calendarPopover");

    const card =
        popover?.querySelector(".calendar-card");

    if (!popover || !card) return;

    if (card.querySelector("[data-period-calendar-close]")) {
        return;
    }

    card.classList.add("has-calendar-dialog-close");

    const button =
        document.createElement("button");

    button.type = "button";
    button.className = "calendar-dialog-close";
    button.dataset.periodCalendarClose = "true";
    button.setAttribute("aria-label", "기간 선택 닫기");
    button.textContent = "×";

    card.appendChild(button);

    button.addEventListener("click", () => {
        popover.hidden = true;
    });
}


function initExpenseDrawer() {
    const resultsArea = document.querySelector("#resultsArea");
    const layer = document.querySelector("#expenseDrawerLayer");
    const drawer = document.querySelector("#expenseDrawer");
    const body = document.querySelector("#expenseDrawerBody");
    const title = document.querySelector("#expenseDrawerTitle");
    const eyebrow = document.querySelector("#expenseDrawerEyebrow");
    const description = document.querySelector("#expenseDrawerDescription");

    /* Drawer는 메인 목록 화면에서만 사용합니다.
       직접 /expenses/new/ 또는 /edit/ URL을 열면 기존 페이지가 fallback으로 동작합니다. */
    if (!resultsArea || !layer || !drawer || !body) return;

    let activeUrl = "";
    let activeMode = "create";
    let isDirty = false;
    let closeTimer = null;
    let activeRow = null;
    let lastTrigger = null;
    let activeRequest = null;

    function isEditUrl(url) {
        return /\/expenses\/\d+\/edit\/?(?:\?|$)/.test(url);
    }

    function setMode(url) {
        activeMode = isEditUrl(url) ? "edit" : "create";

        eyebrow.textContent = activeMode === "edit" ? "UPDATE" : "CREATE";
        title.textContent = activeMode === "edit" ? "지출 수정" : "새 지출 기록";
        description.textContent = activeMode === "edit"
            ? "목록을 확인하면서 필요한 내용만 바로 수정해요."
            : "목록을 보면서 새로운 지출을 빠르게 기록해요.";
    }

    function setActiveRow(row) {
        document
            .querySelectorAll(".expense-row.is-drawer-active")
            .forEach((item) => item.classList.remove("is-drawer-active"));

        activeRow = row || null;
        activeRow?.classList.add("is-drawer-active");
    }

    function showDrawer() {
        if (closeTimer) window.clearTimeout(closeTimer);

        layer.hidden = false;
        document.querySelectorAll(".site-header, main, .app-footer, .mobile-nav").forEach(el => { el.inert = true; });
        drawer.querySelector("[data-drawer-close]")?.focus();
        document.body.classList.add("expense-drawer-open");

        requestAnimationFrame(() => {
            layer.classList.add("is-open");
            drawer.setAttribute("aria-hidden", "false");
        });
    }

    function closeDrawerImmediately({ restoreFocus = true } = {}) {
        if (activeRequest) {
            activeRequest.abort();
            activeRequest = null;
        }

        layer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        document.body.classList.remove("expense-drawer-open");
        document.querySelectorAll(".site-header, main, .app-footer, .mobile-nav").forEach(el => { el.inert = false; });
        setActiveRow(null);
        isDirty = false;

        const trigger = lastTrigger;

        closeTimer = window.setTimeout(() => {
            layer.hidden = true;
            body.innerHTML = '<div class="expense-drawer-loading">불러오는 중...</div>';
        }, 240);

        if (restoreFocus && trigger && document.contains(trigger)) {
            window.setTimeout(() => trigger.focus({ preventScroll: true }), 0);
        }
    }

    async function requestClose() {
        if (!isDirty) {
            closeDrawerImmediately();
            return;
        }

        let confirmed = false;

        if (typeof openConfirmModal === "function") {
            confirmed = await openConfirmModal({
                title: "작성 중인 내용을 닫을까요?",
                message: "저장하지 않은 변경 내용은 사라져요.",
                confirmText: "닫기",
                cancelText: "계속 작성",
            });
        } else {
            confirmed = window.confirm("작성 중인 내용이 있어요. 닫을까요?");
        }

        if (confirmed) closeDrawerImmediately();
    }

    function rebindFormFeatures() {
        if (typeof initFormCalendar === "function") initFormCalendar();
        if (typeof initCategoryCombobox === "function") initCategoryCombobox();
    }

    function syncSelectedCategory(form) {
        const hiddenInput = form.querySelector("#id_category");
        const searchInput = form.querySelector("#categorySearch");

        if (!hiddenInput || !searchInput || !hiddenInput.value) return;

        const selectedOption = [...form.querySelectorAll(".category-option")]
            .find((option) => String(option.dataset.categoryId) === String(hiddenInput.value));

        if (selectedOption) {
            searchInput.value = selectedOption.dataset.categoryName || selectedOption.textContent.trim();
        }
    }


    /*
     * Drawer 날짜 표시 전용
     * 실제 hidden input 값은 2026-09-09 형식을 유지하고,
     * 사용자에게만 "2026년 9월 9일"로 보여줍니다.
     */
    function formatDrawerDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");

        if (!match) return "";

        return `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일`;
    }

    function syncDrawerDateText(form) {
        const dateInput = form.querySelector("#id_date");
        const dateText = form.querySelector("#formDateText");

        if (!dateInput || !dateText) return;

        if (!dateInput.value) {
            dateText.textContent = "날짜를 선택해 주세요";
            dateText.classList.add("is-placeholder");
            return;
        }

        dateText.textContent = formatDrawerDate(dateInput.value);
        dateText.classList.remove("is-placeholder");
    }


    /*
     * 카테고리 선택 시 검색 필드 왼쪽에
     * 해당 카테고리의 실제 색상 dot을 표시합니다.
     */
    function initDrawerCategoryIndicator(form) {
        const wrap = form.querySelector(".category-input-wrap");
        const searchInput = form.querySelector("#categorySearch");
        const hiddenInput = form.querySelector("#id_category");
        const dropdown = form.querySelector("#categoryDropdown");

        if (!wrap || !searchInput || !hiddenInput) return;

        let dot = wrap.querySelector(".drawer-category-selected-dot");

        if (!dot) {
            dot = document.createElement("span");
            dot.className = "drawer-category-selected-dot";
            dot.hidden = true;
            wrap.insertBefore(dot, searchInput);
        }

        function syncDot() {
            const selectedOption = [...form.querySelectorAll(".category-option")]
                .find(
                    (option) =>
                        String(option.dataset.categoryId) ===
                        String(hiddenInput.value)
                );

            if (!selectedOption) {
                dot.hidden = true;
                dot.style.backgroundColor = "";
                wrap.classList.remove("has-selected-category");
                return;
            }

            const colorKey = selectedOption.dataset.categoryColor;

            if (colorKey && typeof getCategoryPalette === "function") {
                const [, , solid] = getCategoryPalette(colorKey);
                dot.style.backgroundColor = solid;
            } else {
                dot.style.backgroundColor = "#888888";
            }

            dot.hidden = false;
            wrap.classList.add("has-selected-category");
        }

        syncDot();

        /*
         * 기존 main.js의 category combobox listener가 먼저 실행된 뒤
         * 현재 indicator를 맞출 수 있도록 다음 tick에서 동기화합니다.
         */
        searchInput.addEventListener("input", () => {
            window.setTimeout(syncDot, 0);
        });

        dropdown?.addEventListener("click", (event) => {
            if (event.target.closest(".category-option")) {
                window.setTimeout(syncDot, 0);
            }

            /*
             * 새 카테고리 생성은 AJAX라서 값 반영까지 시간이 걸릴 수 있습니다.
             * 짧게 상태를 확인한 뒤 dot을 맞춥니다.
             */
            if (event.target.closest("#saveNewCategory")) {
                let checks = 0;

                const timer = window.setInterval(() => {
                    syncDot();
                    checks += 1;

                    if (hiddenInput.value || checks >= 20) {
                        window.clearInterval(timer);
                    }
                }, 100);
            }
        });
    }



    /*
     * Drawer 달력의 "2026년 9월" 제목을 누르면
     * 연도 / 월을 빠르게 선택할 수 있는 보조 picker를 엽니다.
     *
     * main.js 내부 viewDate를 직접 건드리지 않고,
     * 기존 이전/다음 달 버튼을 재사용해서 안전하게 이동합니다.
     */
    function initDrawerCalendarJump(calendar) {
        const card =
            calendar?.querySelector(".calendar-card");

        const title =
            calendar?.querySelector("#formCalendarTitle");

        const prevButton =
            calendar?.querySelector("#formPrevMonth");

        const nextButton =
            calendar?.querySelector("#formNextMonth");

        if (
            !calendar ||
            !card ||
            !title ||
            !prevButton ||
            !nextButton
        ) {
            return;
        }

        if (
            card.querySelector(
                ".drawer-calendar-jump"
            )
        ) {
            return;
        }

        title.classList.add(
            "drawer-calendar-title-button"
        );
        title.setAttribute("role", "button");
        title.setAttribute("tabindex", "0");
        title.setAttribute(
            "aria-label",
            "연도와 월 선택"
        );
        title.setAttribute(
            "aria-expanded",
            "false"
        );

        const panel =
            document.createElement("div");

        panel.className =
            "drawer-calendar-jump";
        panel.hidden = true;

        card.appendChild(panel);

        let pickerYear =
            new Date().getFullYear();

        let mode = "months";


        function readCurrentCalendar() {
            const match =
                title.textContent
                    .trim()
                    .match(
                        /^(\d{4})년\s+(\d{1,2})월$/
                    );

            if (!match) {
                return null;
            }

            return {
                year: Number(match[1]),
                month:
                    Number(match[2]) - 1,
            };
        }


        function moveCalendarTo(
            targetYear,
            targetMonth
        ) {
            const current =
                readCurrentCalendar();

            if (!current) return;

            const difference =
                (targetYear -
                    current.year) *
                    12 +
                (targetMonth -
                    current.month);

            if (difference === 0) {
                panel.hidden = true;
                title.setAttribute(
                    "aria-expanded",
                    "false"
                );
                return;
            }

            const button =
                difference > 0
                    ? nextButton
                    : prevButton;

            for (
                let index = 0;
                index <
                Math.abs(difference);
                index += 1
            ) {
                button.click();
            }

            panel.hidden = true;
            title.setAttribute(
                "aria-expanded",
                "false"
            );
        }


        function renderMonths() {
            mode = "months";

            const current =
                readCurrentCalendar();

            const activeMonth =
                current &&
                current.year === pickerYear
                    ? current.month
                    : -1;

            panel.innerHTML = `
                <div class="drawer-calendar-jump-head">
                    <button
                        type="button"
                        class="drawer-calendar-jump-nav"
                        data-jump-year="-1"
                        aria-label="이전 연도"
                    >‹</button>

                    <button
                        type="button"
                        class="drawer-calendar-jump-year"
                        data-jump-year-grid
                    >
                        ${pickerYear}년
                    </button>

                    <button
                        type="button"
                        class="drawer-calendar-jump-nav"
                        data-jump-year="1"
                        aria-label="다음 연도"
                    >›</button>
                </div>

                <div class="drawer-calendar-month-grid">
                    ${Array.from(
                        { length: 12 },
                        (_, month) => `
                            <button
                                type="button"
                                class="drawer-calendar-month${
                                    month === activeMonth
                                        ? " is-current"
                                        : ""
                                }"
                                data-jump-month="${month}"
                            >
                                ${month + 1}월
                            </button>
                        `
                    ).join("")}
                </div>
            `;
        }


        function renderYears() {
            mode = "years";

            const startYear =
                pickerYear - 5;

            panel.innerHTML = `
                <div class="drawer-calendar-jump-head">
                    <button
                        type="button"
                        class="drawer-calendar-jump-nav"
                        data-year-page="-12"
                        aria-label="이전 연도 보기"
                    >‹</button>

                    <strong class="drawer-calendar-jump-range">
                        ${startYear}–${startYear + 11}
                    </strong>

                    <button
                        type="button"
                        class="drawer-calendar-jump-nav"
                        data-year-page="12"
                        aria-label="다음 연도 보기"
                    >›</button>
                </div>

                <div class="drawer-calendar-year-grid">
                    ${Array.from(
                        { length: 12 },
                        (_, index) => {
                            const year =
                                startYear +
                                index;

                            return `
                                <button
                                    type="button"
                                    class="drawer-calendar-year${
                                        year === pickerYear
                                            ? " is-current"
                                            : ""
                                    }"
                                    data-jump-year-value="${year}"
                                >
                                    ${year}
                                </button>
                            `;
                        }
                    ).join("")}
                </div>
            `;
        }


        function openPanel() {
            const current =
                readCurrentCalendar();

            if (current) {
                pickerYear =
                    current.year;
            }

            panel.hidden = false;
            title.setAttribute(
                "aria-expanded",
                "true"
            );

            renderMonths();
        }


        function togglePanel() {
            if (panel.hidden) {
                openPanel();
                return;
            }

            panel.hidden = true;
            title.setAttribute(
                "aria-expanded",
                "false"
            );
        }


        title.addEventListener(
            "click",
            togglePanel
        );

        title.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    togglePanel();
                }
            }
        );


        panel.addEventListener(
            "click",
            (event) => {
                const yearStep =
                    event.target.closest(
                        "[data-jump-year]"
                    );

                if (yearStep) {
                    pickerYear +=
                        Number(
                            yearStep.dataset
                                .jumpYear
                        );

                    renderMonths();
                    return;
                }


                const yearGridButton =
                    event.target.closest(
                        "[data-jump-year-grid]"
                    );

                if (yearGridButton) {
                    renderYears();
                    return;
                }


                const pageButton =
                    event.target.closest(
                        "[data-year-page]"
                    );

                if (pageButton) {
                    pickerYear +=
                        Number(
                            pageButton.dataset
                                .yearPage
                        );

                    renderYears();
                    return;
                }


                const yearButton =
                    event.target.closest(
                        "[data-jump-year-value]"
                    );

                if (yearButton) {
                    pickerYear =
                        Number(
                            yearButton.dataset
                                .jumpYearValue
                        );

                    renderMonths();
                    return;
                }


                const monthButton =
                    event.target.closest(
                        "[data-jump-month]"
                    );

                if (monthButton) {
                    moveCalendarTo(
                        pickerYear,
                        Number(
                            monthButton.dataset
                                .jumpMonth
                        )
                    );
                }
            }
        );
    }


    function bindDrawerDatePresentation(form) {
        const dateTrigger =
            form.querySelector("[data-form-date-trigger]");

        const dateField =
            dateTrigger?.closest(".field-group");

        const calendar =
            dateField?.querySelector("#formCalendarPopover");

        const todayButton =
            calendar?.querySelector("#formCalendarToday");

        const calendarTitle =
            calendar?.querySelector("#formCalendarTitle");

        const prevButton =
            calendar?.querySelector("#formPrevMonth");

        const nextButton =
            calendar?.querySelector("#formNextMonth");

        syncDrawerDateText(form);
        initDrawerCalendarJump(calendar);

        /*
         * 날짜 숫자를 누르면 즉시 선택 + 달력 닫기.
         * 생성 / 수정 모두 동일합니다.
         */
        calendar?.addEventListener("click", (event) => {
            const pickedDay =
                event.target.closest(".calendar-day");

            if (!pickedDay) return;

            window.setTimeout(() => {
                syncDrawerDateText(form);
                calendar.hidden = true;
                isDirty = true;
            }, 0);
        });

        /*
         * "오늘"은 날짜를 선택하지 않습니다.
         * 다른 달을 보고 있다가 오늘이 속한 달로
         * 빠르게 돌아오는 탐색 버튼으로만 사용합니다.
         *
         * main.js의 기존 "오늘을 선택" 동작은 capture 단계에서
         * 막고, 이미 연결된 이전/다음 달 버튼을 재사용합니다.
         */
        todayButton?.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();

                if (
                    !calendarTitle ||
                    !prevButton ||
                    !nextButton
                ) {
                    return;
                }

                const match =
                    calendarTitle.textContent
                        .trim()
                        .match(
                            /^(\d{4})년\s+(\d{1,2})월$/
                        );

                if (!match) return;

                const shownYear =
                    Number(match[1]);

                const shownMonth =
                    Number(match[2]) - 1;

                const today =
                    new Date();

                const monthDifference =
                    (today.getFullYear() -
                        shownYear) *
                        12 +
                    (today.getMonth() -
                        shownMonth);

                const moveButton =
                    monthDifference > 0
                        ? nextButton
                        : prevButton;

                for (
                    let i = 0;
                    i <
                    Math.abs(
                        monthDifference
                    );
                    i += 1
                ) {
                    moveButton.click();
                }

                /*
                 * 선택값 / input 값은 건드리지 않습니다.
                 * 따라서 수정 중이던 기존 날짜도 그대로 유지됩니다.
                 */
                calendar
                    .querySelector(
                        ".drawer-calendar-jump"
                    )
                    ?.setAttribute(
                        "hidden",
                        ""
                    );

                calendarTitle.setAttribute(
                    "aria-expanded",
                    "false"
                );

                syncDrawerDateText(form);
            },
            true
        );

        dateTrigger?.addEventListener("click", () => {
            window.setTimeout(
                () => syncDrawerDateText(form),
                0
            );
        });
    }


    function bindDrawerForm(form) {
        isDirty = false;

        /*
         * 브라우저가 내용 입력 이력을 검은 추천 bubble로 계속 띄우는
         * 현상을 줄이기 위해 Drawer form의 자동완성을 끕니다.
         */
        form.setAttribute("autocomplete", "off");

        form.querySelectorAll(
            'input[type="text"], input[type="number"]'
        ).forEach((input) => {
            input.setAttribute(
                "autocomplete",
                "off"
            );
        });

        const descriptionDisplay =
            form.querySelector("#descriptionDisplay");

        const descriptionHidden =
            form.querySelector("#id_description");

        if (
            descriptionDisplay &&
            descriptionHidden
        ) {
            descriptionDisplay.addEventListener(
                "input",
                () => {
                    descriptionHidden.value =
                        descriptionDisplay.value;
                }
            );
        }

        form.addEventListener("input", () => { isDirty = true; });
        form.addEventListener("change", () => { isDirty = true; });

        const cancelLink = form.querySelector(".form-actions .secondary-button");
        cancelLink?.addEventListener("click", (event) => {
            event.preventDefault();
            requestClose();
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            /*
             * Drawer 안에서 방금 새 카테고리를 만든 경우에는
             * 메인 필터의 카테고리 목록도 갱신되어야 하므로
             * 저장 성공 뒤 한 번만 전체 reload 합니다.
             * 일반 생성/수정은 AJAX 갱신만 사용합니다.
             */
            const selectedCategoryId = form.querySelector("#id_category")?.value || "";
            const selectedCategoryOption = [...form.querySelectorAll(".category-option")].find(
                (option) => String(option.dataset.categoryId) === String(selectedCategoryId)
            );
            const createdNewCategory = Boolean(selectedCategoryId && !selectedCategoryOption);

            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton?.textContent || "";

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "저장 중...";
            }

            try {
                const response = await fetch(activeUrl, {
                    method: "POST",
                    body: new FormData(form),
                    credentials: "same-origin",
                    redirect: "follow",
                    headers: { "X-Requested-With": "XMLHttpRequest" },
                });

                const html = await response.text();

                /* 정상 저장이면 기존 Django view가 expense_list로 redirect 합니다. */
                if (response.redirected) {
                    const message = activeMode === "edit"
                        ? "지출을 수정했습니다."
                        : "지출을 추가했습니다.";

                    closeDrawerImmediately({ restoreFocus: false });

                    if (createdNewCategory) {
                        /* 새 카테고리까지 메인 filter에 반영 */
                        window.location.reload();
                        return;
                    }

                    await refreshExpenseResults();
                    showDrawerToast(message);
                    return;
                }

                if (!response.ok && response.status >= 500) {
                    throw new Error(`server ${response.status}`);
                }

                /* validation 오류면 서버가 다시 렌더링한 form을 Drawer 안에 표시합니다. */
                renderFormHtml(html);
            } catch (error) {
                console.error(error);
                body.insertAdjacentHTML(
                    "afterbegin",
                    '<div class="expense-drawer-error">저장 중 문제가 발생했어요. 입력 내용을 확인한 뒤 다시 시도해 주세요.</div>'
                );
            } finally {
                if (submitButton && document.contains(submitButton)) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }
            }
        });
    }

    function renderFormHtml(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const form = doc.querySelector("form.expense-form");
        const calendar = doc.querySelector("#formCalendarPopover");

        if (!form) {
            body.innerHTML = '<div class="expense-drawer-error">입력 화면을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.</div>';
            return;
        }

        body.replaceChildren(document.importNode(form, true));

        const liveForm = body.querySelector("form.expense-form");

        /*
         * 날짜 달력은 Drawer 전체를 덮지 않고
         * 날짜 입력 필드 바로 아래에 붙는 compact dropdown으로 배치합니다.
         * 생성 / 수정 모두 같은 구조를 사용합니다.
         */
        if (calendar) {
            const liveCalendar = document.importNode(calendar, true);
            liveCalendar.classList.add("drawer-field-calendar");

            const dateField = liveForm
                .querySelector("[data-form-date-trigger]")
                ?.closest(".field-group");

            if (dateField) {
                dateField.appendChild(liveCalendar);
            } else {
                body.appendChild(liveCalendar);
            }
        }

        /* 수정 Drawer에서 hidden category의 이름을 검색창에도 표시합니다. */
        syncSelectedCategory(liveForm);

        bindDrawerForm(liveForm);
        rebindFormFeatures();

        /*
         * Drawer에서만 날짜 표현과 카테고리 선택 dot을 보강합니다.
         * backend 값 / 기존 form 구조는 그대로 유지합니다.
         */
        bindDrawerDatePresentation(liveForm);
        initDrawerCategoryIndicator(liveForm);
    }

    async function openDrawer(url, { trigger = null, row = null } = {}) {
        activeUrl = url;
        lastTrigger = trigger;
        setMode(url);
        setActiveRow(row);

        body.innerHTML = '<div class="expense-drawer-loading">불러오는 중...</div>';
        showDrawer();

        if (activeRequest) activeRequest.abort();
        activeRequest = new AbortController();

        try {
            const response = await fetch(url, {
                credentials: "same-origin",
                headers: { "X-Requested-With": "XMLHttpRequest" },
                signal: activeRequest.signal,
            });

            if (!response.ok) throw new Error(`load ${response.status}`);

            renderFormHtml(await response.text());
        } catch (error) {
            if (error.name === "AbortError") return;

            console.error(error);
            body.innerHTML = '<div class="expense-drawer-error">입력 화면을 불러오지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.</div>';
        } finally {
            activeRequest = null;
        }
    }

    async function refreshExpenseResults() {
        const url = window.location.pathname + window.location.search;
        resultsArea.classList.add("results-loading");

        try {
            const response = await fetch(url, {
                credentials: "same-origin",
                headers: { "X-Requested-With": "XMLHttpRequest" },
            });

            if (!response.ok) throw new Error(`refresh ${response.status}`);

            const data = await response.json();
            if (!data.results_html) throw new Error("missing results_html");

            const knownCategories = [...document.querySelectorAll('#filterForm input[name="category"]')].map(input => input.value);
            if (data.category_names && JSON.stringify(knownCategories) !== JSON.stringify(data.category_names)) { window.location.reload(); return; }
            resultsArea.innerHTML = data.results_html;
            if (data.home_html) document.querySelector("#homeArea").innerHTML = data.home_html;

            if (typeof decorateResults === "function") {
                decorateResults();
            }
        } catch (error) {
            console.error(error);
            window.location.reload();
        } finally {
            resultsArea.classList.remove("results-loading");
        }
    }

    function showDrawerToast(message) {
        document.querySelectorAll(".expense-drawer-toast").forEach((toast) => toast.remove());

        const toast = document.createElement("div");
        toast.className = "expense-drawer-toast";
        toast.setAttribute("role", "status");
        toast.textContent = message;
        document.body.appendChild(toast);

        window.setTimeout(() => {
            toast.classList.add("is-hiding");
            window.setTimeout(() => toast.remove(), 220);
        }, 2600);
    }

    /* AJAX로 _results.html이 교체되어도 수정 버튼이 계속 동작하도록 event delegation을 사용합니다. */
    document.addEventListener("click", (event) => {
        if (
            event.defaultPrevented ||
            event.button > 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }

        const link = event.target.closest(
            'a[data-expense-drawer-link], a[href*="/expenses/"][href*="/edit/"]'
        );

        if (!link) return;

        event.preventDefault();

        const row = isEditUrl(link.href)
            ? link.closest(".expense-row")
            : null;

        openDrawer(link.href, {
            trigger: link,
            row,
        });
    });

    layer.querySelectorAll("[data-drawer-close]").forEach((button) => {
        button.addEventListener("click", requestClose);
    });

    /*
     * Drawer 안의 dropdown / date picker는
     * 다른 필드를 누르면 자연스럽게 닫히도록 합니다.
     * 브라우저 입력 추천 bubble이 남는 경우에도
     * 실제 active input의 focus를 정리합니다.
     */
    document.addEventListener(
        "pointerdown",
        (event) => {
            if (layer.hidden) return;

            const form =
                body.querySelector(
                    "form.expense-form"
                );

            if (!form) return;

            const target =
                event.target;

            const categoryCombobox =
                form.querySelector(
                    "#categoryCombobox"
                );

            const categoryDropdown =
                form.querySelector(
                    "#categoryDropdown"
                );

            if (
                categoryDropdown &&
                !categoryDropdown.hidden &&
                categoryCombobox &&
                !categoryCombobox.contains(
                    target
                )
            ) {
                categoryDropdown.hidden =
                    true;

                form.querySelector(
                    "#categorySearch"
                )?.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }


            const dateTrigger =
                form.querySelector(
                    "[data-form-date-trigger]"
                );

            const dateField =
                dateTrigger?.closest(
                    ".field-group"
                );

            const calendar =
                dateField?.querySelector(
                    "#formCalendarPopover"
                );

            if (
                calendar &&
                !calendar.hidden &&
                dateField &&
                !dateField.contains(target)
            ) {
                calendar.hidden = true;

                calendar
                    .querySelector(
                        ".drawer-calendar-jump"
                    )
                    ?.setAttribute(
                        "hidden",
                        ""
                    );
            }


            /*
             * input 밖의 일반 영역을 누른 경우
             * 현재 text / number input focus도 정리합니다.
             */
            const active =
                document.activeElement;

            if (
                active instanceof
                    HTMLInputElement &&
                form.contains(active) &&
                !target.closest(
                    "input, button, [role='button']"
                )
            ) {
                active.blur();
            }
        }
    );


    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || layer.hidden) return;

        const openCalendar = body.querySelector("#formCalendarPopover:not([hidden])");
        if (openCalendar) {
            openCalendar.hidden = true;
            return;
        }

        requestClose();
    });
}
