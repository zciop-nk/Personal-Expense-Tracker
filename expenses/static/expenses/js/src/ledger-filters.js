/* Source module: ledger-filters.js. Built into ../ledger.js by tools/build_frontend.py. */
function initListPage() {
    const form = document.querySelector("#filterForm");
    if (!form) return;

    const resultsArea = document.querySelector("#resultsArea");
    const categoryPanel = document.querySelector("#categoryPanel");
    const toggleCategoryPanel = document.querySelector("#toggleCategoryPanel");
    const filterChevron = document.querySelector("#filterChevron");
    const clearCategories = document.querySelector("#clearCategories");
    const collapseCategoryPanel = document.querySelector("#collapseCategoryPanel");
    const resetFilters = document.querySelector("#resetFilters");
    const activeChips = document.querySelector("#activeChips");
    const activeFilterCount = document.querySelector("#activeFilterCount");
    const dateFrom = document.querySelector("#dateFrom");
    const dateTo = document.querySelector("#dateTo");
    const periodValue = document.querySelector("#periodValue");
    const dateRangeLabel = document.querySelector("#dateRangeLabel");
    const quickButtons = [...document.querySelectorAll("[data-period]")];
    const categoryInputs = [...document.querySelectorAll('input[name="category"]')];
    const searchInput = document.querySelector("#expenseSearch");
    form.addEventListener("submit", event => { event.preventDefault(); applyFilters(); });
    const dateButton = document.querySelector("#openCalendar");

    const clearSearch = document.querySelector("#clearSearch");
    searchInput.addEventListener("input", () => { clearSearch.hidden = !searchInput.value; });
    function resetSearch() { searchInput.value = ""; clearSearch.hidden = true; applyFilters(); searchInput.focus(); }
    clearSearch.addEventListener("click", resetSearch);
    resultsArea.addEventListener("click", event => { if (event.target.closest("[data-search-reset]")) resetSearch(); });
    let activeRequest = null;

    function getParams() {
        const params = new URLSearchParams();
        const checked = categoryInputs.filter((input) => input.checked);

        if (checked.length && checked.length !== categoryInputs.length) {
            checked.forEach((input) => params.append("category", input.value));
        }

        if (dateFrom.value) params.set("date_from", dateFrom.value);
        if (dateTo.value) params.set("date_to", dateTo.value);
        if (periodValue.value) params.set("period", periodValue.value);
        if (searchInput.value.trim()) params.set("q", searchInput.value.trim());

        if (window.matchMedia("(max-width: 760px)").matches) {
            params.set("page_size", "15");
        }

        const homeMonthNav =
            document.querySelector("[data-home-month-nav]");

        if (
            homeMonthNav?.dataset.selectedMonth &&
            homeMonthNav.dataset.selectedMonth !==
                homeMonthNav.dataset.currentMonth
        ) {
            params.set(
                "home_month",
                homeMonthNav.dataset.selectedMonth
            );
        }

        return params;
    }

    function updateDateLabel() {
        if (dateFrom.value && dateTo.value) {
            dateRangeLabel.textContent = `${formatDate(dateFrom.value)} ~ ${formatDate(dateTo.value)}`;
        } else if (dateFrom.value) {
            dateRangeLabel.textContent = `${formatDate(dateFrom.value)} 이후`;
        } else if (dateTo.value) {
            dateRangeLabel.textContent = `${formatDate(dateTo.value)} 이전`;
        } else {
            dateRangeLabel.textContent = "전체 기간";
        }

        const hasCustomDate = Boolean(dateFrom.value || dateTo.value);

        dateButton.classList.toggle("is-active", hasCustomDate);
    }

    function updateResetVisibility() {
        const hasCategory = categoryInputs.some((input) => input.checked);
        const hasDate = Boolean(dateFrom.value || dateTo.value);
        resetFilters.hidden = !(hasCategory || hasDate || searchInput.value.trim());
    }

    function renderActiveChips() {
        activeChips.innerHTML = "";
        const selected = categoryInputs.filter((input) => input.checked);
        clearCategories.hidden = selected.length === 0;
        let count = selected.length;

        selected.forEach((input) => {
            const colorKey = input.dataset.colorKey;
            const [bg, text] = getCategoryPalette(colorKey);

            const chip = document.createElement("span");
            chip.className = "filter-chip";

            chip.style.backgroundColor = bg;
            chip.style.color = text;
            chip.style.borderColor = bg;
            chip.innerHTML = `<span>${escapeHtml(input.value)}</span><button type="button" aria-label="${escapeHtml(input.value)} 필터 제거">×</button>`;
            chip.querySelector("button").addEventListener("click", () => {
                input.checked = false;
                applyFilters();
            });
            activeChips.appendChild(chip);
        });

        if (dateFrom.value || dateTo.value) {
            count += 1;

            const chip = document.createElement("span");
            chip.className = "filter-chip";

            chip.style.backgroundColor = "#FFF9D8";
            chip.style.color = "#4A431E";
            chip.style.borderColor = "#FFE860";

            chip.innerHTML = `
                <span>${dateRangeLabel.textContent}</span>
                <button type="button" aria-label="기간 필터 제거">×</button>
            `;

            chip.querySelector("button").addEventListener("click", () => {
                dateFrom.value = "";
                dateTo.value = "";
                periodValue.value = "";
                applyFilters();
            });

            activeChips.appendChild(chip);
        }

        if (searchInput.value.trim()) count += 1;
        activeFilterCount.textContent = String(count);
        activeFilterCount.hidden = count === 0;
        updateResetVisibility();
    }

    async function applyFilters() {
        const params = getParams();
        const url = params.toString() ? `/?${params.toString()}` : "/";

        if (activeRequest) activeRequest.abort();
        activeRequest = new AbortController();

        updateDateLabel();
        renderActiveChips();

        resultsArea.classList.add("results-loading");
        const requestToken = activeRequest;
        resultsArea.setAttribute("aria-busy", "true");
        const filterStatus = document.querySelector("#filterStatus");
        filterStatus.textContent = "검색 중이에요…"; filterStatus.hidden = false;
        clearSearch.hidden = !searchInput.value;

        try {
            const response = await fetch(url, {
                headers: {"X-Requested-With": "XMLHttpRequest"},
                signal: activeRequest.signal,
            });

            if (!response.ok) throw new Error(`필터 요청 실패: ${response.status}`);

            const data = await response.json();
            resultsArea.innerHTML = data.results_html;

            document.querySelector("#exportLink").href = `/expenses/export/?${params.toString()}`;
            document.querySelector("#filterStatus").hidden = true;
            document.querySelector("#resultsArea").setAttribute("aria-busy", "false");
            history.replaceState(
                null,
                "",
                `${url}${window.location.hash || ""}`
            );
            decorateResults();
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error(error);
                const status = document.querySelector("#filterStatus");
                status.textContent = "조회하지 못했어요. 이전 결과를 표시 중입니다. 다시 검색해 주세요.";
                status.hidden = false;
            }
        } finally {
            if (activeRequest === requestToken) {
                resultsArea.classList.remove("results-loading");
                resultsArea.setAttribute("aria-busy", "false");
            }
        }
    }

    toggleCategoryPanel?.addEventListener("click", () => {
    categoryPanel.hidden = !categoryPanel.hidden;

    const isOpen = !categoryPanel.hidden;

    toggleCategoryPanel.classList.toggle("is-open", isOpen);
    filterChevron?.classList.toggle("is-open", isOpen);
    });

    collapseCategoryPanel?.addEventListener("click", () => {
        categoryPanel.hidden = true;

        toggleCategoryPanel.classList.remove("is-open");
        filterChevron?.classList.remove("is-open");
    });

    clearCategories?.addEventListener("click", () => {
        categoryInputs.forEach((input) => {
            input.checked = false;
        });

        applyFilters();
    });

    categoryInputs.forEach((input) => {
        input.addEventListener("change", () => {
            const checked = categoryInputs.filter((item) => item.checked);

            if (categoryInputs.length && checked.length === categoryInputs.length) {
                categoryInputs.forEach((item) => { item.checked = false; });
            }

            applyFilters();
        });
    });

    resetFilters?.addEventListener("click", () => {
        categoryInputs.forEach((input) => { input.checked = false; });
        searchInput.value = "";
        dateFrom.value = "";
        dateTo.value = "";
        periodValue.value = "";
        applyFilters();
    });

    const today = new Date();
    const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

    function setQuickPeriod(period) {
        let start = null;
        let end = null;

        if (period === "month") {
            start = startOfMonth(today);
            end = endOfMonth(today);
        } else if (period === "3m") {
            start = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 2, 1));
            end = endOfMonth(today);
        } else if (period === "6m") {
            start = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 5, 1));
            end = endOfMonth(today);
        }

        dateFrom.value = start ? toIso(start) : "";
        dateTo.value = end ? toIso(end) : "";
        periodValue.value = period === "all" ? "" : period;

        quickButtons.forEach((button) => {
            button.classList.toggle("is-active", button.dataset.period === period);
        });

        applyFilters();
    }

    quickButtons.forEach((button) => {
        if (
            button.dataset.period === periodValue.value ||
            (!periodValue.value && button.dataset.period === "all")
        ) {
            button.classList.add("is-active");
        }

        button.addEventListener("click", () => setQuickPeriod(button.dataset.period));
    });

    // Range calendar
    const popover = document.querySelector("#calendarPopover");
    const openCalendar = document.querySelector("#openCalendar");
    const calendarTitle = document.querySelector("#calendarTitle");
    const calendarGrid = document.querySelector("#calendarGrid");
    const prevMonth = document.querySelector("#prevMonth");
    const nextMonth = document.querySelector("#nextMonth");
    const startLabel = document.querySelector("#calendarStartLabel");
    const endLabel = document.querySelector("#calendarEndLabel");
    const clearCalendar = document.querySelector("#clearCalendar");
    const applyCalendar = document.querySelector("#applyCalendar");

    let viewDate = dateFrom.value ? new Date(`${dateFrom.value}T00:00:00`) : new Date();
    let tempStart = dateFrom.value || "";
    let tempEnd = dateTo.value || "";

    const compareIso = (a, b) => a.localeCompare(b);

    function renderCalendar() {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        calendarTitle.textContent = `${year}년 ${month + 1}월`;
        calendarGrid.innerHTML = "";

        const first = new Date(year, month, 1);
        const gridStart = new Date(year, month, 1 - first.getDay());

        for (let i = 0; i < 42; i += 1) {
            const date = new Date(gridStart);
            date.setDate(gridStart.getDate() + i);

            const iso = toIso(date);
            const button = document.createElement("button");
            button.type = "button";
            button.className = "calendar-day";
            button.textContent = String(date.getDate());

            if (date.getMonth() !== month) button.classList.add("is-other");
            if (iso === toIso(today)) button.classList.add("is-today");
            if (iso === tempStart) button.classList.add("is-start");
            if (iso === tempEnd) button.classList.add("is-end");

            if (
                tempStart &&
                tempEnd &&
                compareIso(iso, tempStart) > 0 &&
                compareIso(iso, tempEnd) < 0
            ) {
                button.classList.add("is-in-range");
            }

            button.addEventListener("click", () => {
                if (!tempStart || (tempStart && tempEnd)) {
                    tempStart = iso;
                    tempEnd = "";
                } else if (compareIso(iso, tempStart) < 0) {
                    tempEnd = tempStart;
                    tempStart = iso;
                } else {
                    tempEnd = iso;
                }

                startLabel.textContent = tempStart ? formatDate(tempStart) : "선택 안 함";
                endLabel.textContent = tempEnd ? formatDate(tempEnd) : "선택 안 함";
                renderCalendar();
            });

            calendarGrid.appendChild(button);
        }
    }

    openCalendar?.addEventListener("click", () => {
        tempStart = dateFrom.value || "";
        tempEnd = dateTo.value || "";
        viewDate = tempStart ? new Date(`${tempStart}T00:00:00`) : new Date();
        startLabel.textContent = tempStart ? formatDate(tempStart) : "선택 안 함";
        endLabel.textContent = tempEnd ? formatDate(tempEnd) : "선택 안 함";
        renderCalendar();
        popover.hidden = false;
    });

    prevMonth?.addEventListener("click", () => {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
        renderCalendar();
    });

    nextMonth?.addEventListener("click", () => {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
        renderCalendar();
    });

    clearCalendar?.addEventListener("click", () => {
        tempStart = "";
        tempEnd = "";
        startLabel.textContent = "선택 안 함";
        endLabel.textContent = "선택 안 함";
        renderCalendar();
    });

    applyCalendar?.addEventListener("click", () => {
        dateFrom.value = tempStart;
        dateTo.value = tempEnd;
        periodValue.value = "";
        quickButtons.forEach((button) => button.classList.remove("is-active"));
        popover.hidden = true;
        applyFilters();
    });

    popover?.addEventListener("click", (event) => {
        if (event.target === popover) popover.hidden = true;
    });

    updateDateLabel();
    renderActiveChips();
    decorateResults();
}

