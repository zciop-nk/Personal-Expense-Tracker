document.addEventListener("DOMContentLoaded", () => {
    initListPage();
    initFormCalendar();
    initCategoryCombobox();
});

function openConfirmModal({
    title,
    message,
    confirmText = "확인",
    cancelText = "취소",
}) {
    return new Promise((resolve) => {
        const modal = document.querySelector("#appModal");
        const titleElement = document.querySelector("#appModalTitle");
        const messageElement = document.querySelector("#appModalMessage");
        const confirmButton = document.querySelector("#appModalConfirm");
        const cancelButton = document.querySelector("#appModalCancel");
        const closeButton = document.querySelector("#appModalClose");
        const backdrop = modal?.querySelector("[data-modal-close]");

        if (!modal) {
            resolve(false);
            return;
        }

        titleElement.textContent = title;
        messageElement.textContent = message;
        confirmButton.textContent = confirmText;
        cancelButton.textContent = cancelText;

        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");

        const close = (result) => {
            modal.hidden = true;
            modal.setAttribute("aria-hidden", "true");

            confirmButton.removeEventListener("click", onConfirm);
            cancelButton.removeEventListener("click", onCancel);
            closeButton.removeEventListener("click", onCancel);
            backdrop?.removeEventListener("click", onCancel);

            resolve(result);
        };

        const onConfirm = () => close(true);
        const onCancel = () => close(false);

        confirmButton.addEventListener("click", onConfirm);
        cancelButton.addEventListener("click", onCancel);
        closeButton.addEventListener("click", onCancel);
        backdrop?.addEventListener("click", onCancel);
    });
}

const categoryPalettes = {
    sage: ["#EFF7F2", "#4F8068", "#6F927F"],
    soft_blue: ["#EEF3FA", "#58759A", "#6F86A3"],
    warm_orange: ["#FFF4E8", "#A8753F", "#B38A5A"],
    dusty_teal: ["#EEF7F7", "#4F7F7C", "#668F8B"],
    soft_coral: ["#FFF0EE", "#B96860", "#BD786F"],
    muted_rose: ["#FBEFF1", "#A65F69", "#A96D77"],
    lavender: ["#F5F0FA", "#78658F", "#8A769E"],
    slate_indigo: ["#EFF1F7", "#596782", "#68758D"],
    mustard: ["#FFF7E5", "#937640", "#A28754"],
    mint: ["#EEF8F4", "#568472", "#6F9989"],

    dusty_pink: ["#FAF0F3", "#9B6F7C", "#AD818E"],
    soft_olive: ["#F4F5EC", "#777B57", "#8B8F68"],
    muted_sky: ["#EFF5F8", "#627F8D", "#7593A0"],
    warm_taupe: ["#F7F2EE", "#806D61", "#927E71"],
    soft_plum: ["#F5EFF5", "#806780", "#937993"],
    dusty_cyan: ["#EEF6F6", "#5E8182", "#719395"],
    mellow_peach: ["#FCF1E9", "#9D765D", "#AF876D"],
    soft_lilac: ["#F5F1F8", "#7B6E8D", "#8D7FA0"],
};

function getCategoryPalette(colorKey) {
    return categoryPalettes[colorKey] || ["#F3F3F3", "#666666", "#888888"];
}

function toIso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${y}.${m}.${d}`;
}

function bindDeleteConfirm() {
    document.querySelectorAll("[data-delete-form]").forEach((deleteForm) => {
        if (deleteForm.dataset.bound === "true") return;
        deleteForm.dataset.bound = "true";

        deleteForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const confirmed = await openConfirmModal({
                title: "지출을 삭제할까요?",
                message: "삭제한 지출은 다시 복구할 수 없어요.",
                confirmText: "삭제하기",
                cancelText: "취소",
            });

            if (!confirmed) return;

            deleteForm.submit();
        });
    });
}

function decorateResults() {
    document.querySelectorAll("[data-category-chip]").forEach((chip) => {
        const colorKey = chip.dataset.colorKey;
        const [bg, text] = getCategoryPalette(colorKey);

        chip.style.backgroundColor = bg;
        chip.style.color = text;
    });

    const barItems = [...document.querySelectorAll("[data-bar-amount]")];
    const maxAmount = barItems.reduce(
        (max, item) => Math.max(max, Number(item.dataset.barAmount) || 0),
        0
    );

    barItems.forEach((item) => {
        const amount = Number(item.dataset.barAmount || 0);
        const fill = item.querySelector(".bar-fill");

        const colorKey = item.dataset.colorKey;
        const [, , solid] = getCategoryPalette(colorKey);

        if (fill) {
            fill.style.width = `${maxAmount ? (amount / maxAmount) * 100 : 0}%`;
            fill.style.backgroundColor = solid;
        }
    });

    bindDeleteConfirm();

    renderCategoryDonut();
    renderTrendChart();
}

function renderCategoryDonut() {
    const donut = document.querySelector("#categoryDonut");

    const segments = [
        ...document.querySelectorAll("[data-donut-segment]")
    ];

    if (!donut || !segments.length) return;

    let currentDegree = 0;

    const gradients = segments.map((segment) => {
        const percentage = Number(
            segment.dataset.percentage || 0
        );

        const colorKey = segment.dataset.colorKey;

        const [, , solid] = getCategoryPalette(colorKey);

        const start = currentDegree;

        const end =
            currentDegree +
            (percentage / 100) * 360;

        currentDegree = end;

        const dot = segment.querySelector(".donut-dot");

        if (dot) {
            dot.style.backgroundColor = solid;
        }

        return `${solid} ${start}deg ${end}deg`;
    });

    donut.style.background =
        `conic-gradient(${gradients.join(", ")})`;
}

function renderTrendChart() {
    const chart = document.querySelector("#trendChart");
    const scale = document.querySelector("#trendScale");
    const yearLabel = document.querySelector("#trendYearLabel");

    if (!chart || !scale) return;

    const items = [...chart.querySelectorAll("[data-trend-month]")];
    if (!items.length) return;

    const data = items.map((item) => ({
        monthKey: item.dataset.trendMonth,
        amount: Number(item.dataset.trendAmount || 0),
        item,
    }));

    const amounts = data.map((d) => d.amount);
    const maxAmount = Math.max(...amounts, 0);

    // 눈금 단위 자동 계산
    let unit = 10000;
    if (maxAmount <= 10000) {
        unit = 1000;
    } else if (maxAmount <= 50000) {
        unit = 5000;
    } else if (maxAmount <= 100000) {
        unit = 10000;
    } else {
        unit = 50000;
    }

    const topValue = Math.max(unit, Math.ceil(maxAmount / unit) * unit);

    // 연도 표시
    const years = [...new Set(data.map((d) => d.monthKey.slice(0, 4)))];
    if (yearLabel) {
        if (years.length === 1) {
            yearLabel.textContent = `${years[0]}년`;
        } else {
            yearLabel.textContent = `${years[0]}–${years[years.length - 1]}년`;
        }
    }

    // 보조선 + 눈금
    scale.innerHTML = "";

    const ratios = [1, 0.75, 0.5, 0.25, 0];
    ratios.forEach((ratio) => {
        const value = Math.round(topValue * ratio);

        const row = document.createElement("div");
        row.className = "trend-scale-row";
        row.style.top = `${(1 - ratio) * 100}%`;

        row.innerHTML = `
            <span class="trend-scale-label">${(value / 10000).toFixed(1)}</span>
            <span class="trend-scale-line"></span>
        `;

        scale.appendChild(row);
    });

    // 월 표기 / 막대 높이
    data.forEach(({ monthKey, amount, item }) => {
        const monthEl = item.querySelector(".trend-month");
        const bar = item.querySelector(".trend-bar");
        const amountEl = item.querySelector(".trend-amount");

        const [, month] = monthKey.split("-");

        if (monthEl) {
            monthEl.textContent = `${Number(month)}월`;
        }

        if (amountEl) {
            amountEl.textContent = (amount / 10000).toFixed(1);
        }

        if (bar) {
            const heightRatio = topValue ? amount / topValue : 0;
            bar.style.height = `${heightRatio * 100}%`;
        }
    });
}

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
    const dateButton = document.querySelector("#openCalendar");

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
        resetFilters.hidden = !(hasCategory || hasDate);
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
            chip.innerHTML = `<span>${input.value}</span><button type="button" aria-label="${input.value} 필터 제거">×</button>`;
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
            chip.style.backgroundColor = "#FFF7E8";
            chip.style.color = "#9A611A";
            chip.style.borderColor = "#F0D2A6";
            chip.innerHTML = `<span>${dateRangeLabel.textContent}</span><button type="button" aria-label="기간 필터 제거">×</button>`;
            chip.querySelector("button").addEventListener("click", () => {
                dateFrom.value = "";
                dateTo.value = "";
                periodValue.value = "";
                applyFilters();
            });
            activeChips.appendChild(chip);
        }

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

        try {
            const response = await fetch(url, {
                headers: {"X-Requested-With": "XMLHttpRequest"},
                signal: activeRequest.signal,
            });

            if (!response.ok) throw new Error(`필터 요청 실패: ${response.status}`);

            const data = await response.json();
            resultsArea.innerHTML = data.results_html;

            history.replaceState(null, "", url);
            decorateResults();
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error(error);
            }
        } finally {
            resultsArea.classList.remove("results-loading");
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

function initFormCalendar() {
    const trigger = document.querySelector("[data-form-date-trigger]");
    const input = document.querySelector("#id_date");
    const popover = document.querySelector("#formCalendarPopover");

    if (!trigger || !input || !popover) return;

    const text = document.querySelector("#formDateText");
    const title = document.querySelector("#formCalendarTitle");
    const grid = document.querySelector("#formCalendarGrid");
    const prev = document.querySelector("#formPrevMonth");
    const next = document.querySelector("#formNextMonth");
    const todayButton = document.querySelector("#formCalendarToday");
    const closeButton = document.querySelector("#formCalendarClose");

    const today = new Date();
    let selected = input.value || "";
    let viewDate = selected ? new Date(`${selected}T00:00:00`) : new Date();

    function syncText() {
        text.textContent = selected || "연도-월-일";
        text.style.color = selected ? "" : "#8B8B8B";
    }

    function render() {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        title.textContent = `${year}년 ${month + 1}월`;
        grid.innerHTML = "";

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
            if (iso === selected) button.classList.add("is-selected");

            button.addEventListener("click", () => {
                selected = iso;
                input.value = iso;
                syncText();
                render();
            });

            grid.appendChild(button);
        }
    }

    trigger.addEventListener("click", () => {
        selected = input.value || selected;
        viewDate = selected ? new Date(`${selected}T00:00:00`) : new Date();
        render();
        popover.hidden = false;
    });

    prev.addEventListener("click", () => {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
        render();
    });

    next.addEventListener("click", () => {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
        render();
    });

    todayButton.addEventListener("click", () => {
        selected = toIso(today);
        input.value = selected;
        viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
        syncText();
        render();
    });

    closeButton.addEventListener("click", () => {
        popover.hidden = true;
    });

    popover.addEventListener("click", (event) => {
        if (event.target === popover) popover.hidden = true;
    });

    syncText();
}

function initCategoryCombobox() {
    const combobox = document.querySelector("#categoryCombobox");
    const searchInput = document.querySelector("#categorySearch");
    const dropdown = document.querySelector("#categoryDropdown");
    const hiddenInput = document.querySelector("#id_category");
    const options = [...document.querySelectorAll(".category-option")];
    const keywordItems = [...document.querySelectorAll("#categoryKeywordData [data-keyword]")];

    const addOption = document.querySelector("#categoryAddOption");
    const addText = document.querySelector("#categoryAddText");
    
    const addPanel = document.querySelector("#categoryAddPanel");
    const newCategoryName = document.querySelector("#newCategoryName");
    const cancelNewCategory = document.querySelector("#cancelNewCategory");
    const saveNewCategory = document.querySelector("#saveNewCategory");

    if (!combobox || !searchInput || !dropdown || !hiddenInput) return;

    function openDropdown() {
        dropdown.hidden = false;
        searchInput.setAttribute("aria-expanded", "true");
    }

    function closeDropdown() {
        dropdown.hidden = true;
        searchInput.setAttribute("aria-expanded", "false");
    }

    searchInput.addEventListener("focus", openDropdown);
    searchInput.addEventListener("click", openDropdown);

    options.forEach((option) => {
        option.addEventListener("click", () => {
            const categoryId = option.dataset.categoryId;
            const categoryName = option.dataset.categoryName;

            hiddenInput.value = categoryId;
            searchInput.value = categoryName;

            closeDropdown();
        });
    });

searchInput.addEventListener("input", () => {
    const value = searchInput.value.trim();

    if (addPanel) {
        addPanel.hidden = true;
    }

    if (newCategoryName) {
        newCategoryName.value = "";
    }

    hiddenInput.value = "";

    if (!value) {
        options.forEach((option) => {
            option.hidden = false;
        });

        if (addOption) {
            addOption.hidden = true;
        }

        openDropdown();
        return;
    }

    const exactCategory = options.find(
        (option) => option.dataset.categoryName === value
    );
    if (exactCategory) {
        hiddenInput.value = exactCategory.dataset.categoryId;

        options.forEach((option) => {
            option.hidden = option !== exactCategory;
        });

        if (addOption) {
            addOption.hidden = true;
        }

        openDropdown();
        return;
    }

    const keywordMatch = keywordItems.find(
        (item) => item.dataset.keyword === value
    );

    if (keywordMatch) {
        hiddenInput.value = keywordMatch.dataset.categoryId;

        options.forEach((option) => {
            option.hidden =
                option.dataset.categoryId !== keywordMatch.dataset.categoryId;
        });

        if (addOption) {
            addOption.hidden = true;
        }

        openDropdown();
        return;
    }

    options.forEach((option) => {
        option.hidden = true;
    });

    hiddenInput.value = "";

    if (addOption && addText) {
        addText.textContent = `"${value}" 새 카테고리 추가`;
        addOption.hidden = false;
    }

    openDropdown();
});

addOption?.addEventListener("click", () => {
    const value = searchInput.value.trim();

    if (!value || !addPanel || !newCategoryName) return;

    newCategoryName.value = value;
    addPanel.hidden = false;
    addOption.hidden = true;

    newCategoryName.focus();
});

cancelNewCategory?.addEventListener("click", () => {
    if (!addPanel || !newCategoryName) return;

    addPanel.hidden = true;
    newCategoryName.value = "";

    if (searchInput.value.trim()) {
        addOption.hidden = false;
    }
});

saveNewCategory?.addEventListener("click", async () => {
    const name = newCategoryName?.value.trim();

    if (!name) return;

    const csrfToken = document.querySelector(
        'input[name="csrfmiddlewaretoken"]'
    )?.value;

    saveNewCategory.disabled = true;

    try {
        const formData = new FormData();
        formData.append("name", name);

        const response = await fetch("/categories/create/", {
            method: "POST",
            headers: {
                "X-CSRFToken": csrfToken,
                "X-Requested-With": "XMLHttpRequest",
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error(data.message || "카테고리 생성에 실패했습니다.");
            return;
        }

        const category = data.category;

        hiddenInput.value = category.id;
        searchInput.value = category.name;

        addPanel.hidden = true;
        addOption.hidden = true;

        closeDropdown();
    } catch (error) {
        console.error(error);
    } finally {
        saveNewCategory.disabled = false;
    }
});

    document.addEventListener("click", (event) => {
        if (!combobox.contains(event.target)) {
            closeDropdown();
        }
    });
}