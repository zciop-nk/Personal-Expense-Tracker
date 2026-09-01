document.addEventListener("DOMContentLoaded", () => {
    initListPage();
    initFormCalendar();
    bindDeleteConfirm();
});

const palette = [
    ["#FFF2F0","#D86558","#F4B8AF"],
    ["#F2F4FF","#5965C8","#BCC3FA"],
    ["#EFFAF5","#3C926D","#B6E3CF"],
    ["#FFF7E8","#B46F1F","#F2D3A5"],
    ["#F7F1FF","#7F52AB","#D8C1F1"],
    ["#EDF8FA","#397F8B","#B9DEE5"],
];

function hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function getPalette(text) {
    return palette[hashText(text) % palette.length];
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

        deleteForm.addEventListener("submit", (event) => {
            if (!window.confirm("이 지출을 삭제할까요?")) {
                event.preventDefault();
            }
        });
    });
}

function decorateResults() {
    document.querySelectorAll("[data-category-chip]").forEach((chip) => {
        const [bg, text] = getPalette(chip.dataset.categoryChip || chip.textContent.trim());
        chip.style.backgroundColor = bg;
        chip.style.color = text;
    });

    const barItems = [...document.querySelectorAll("[data-bar-amount]")];
    const maxAmount = barItems.reduce(
        (max, item) => Math.max(max, Number(item.dataset.barAmount) || 0),
        0
    );

    barItems.forEach((item) => {
        const amount = Number(item.dataset.barAmount) || 0;
        const fill = item.querySelector(".bar-fill");
        const category = item.dataset.barCategory || "";
        const [, text] = getPalette(category);

        if (fill) {
            fill.style.width = maxAmount ? `${(amount / maxAmount) * 100}%` : "0%";
            fill.style.backgroundColor = text;
        }
    });

    bindDeleteConfirm();
}

function initListPage() {
    const form = document.querySelector("#filterForm");
    if (!form) return;

    const resultsArea = document.querySelector("#resultsArea");
    const categoryPanel = document.querySelector("#categoryPanel");
    const toggleCategoryPanel = document.querySelector("#toggleCategoryPanel");
    const selectAllCategories = document.querySelector("#selectAllCategories");
    const resetFilters = document.querySelector("#resetFilters");
    const activeChips = document.querySelector("#activeChips");
    const activeFilterCount = document.querySelector("#activeFilterCount");
    const dateFrom = document.querySelector("#dateFrom");
    const dateTo = document.querySelector("#dateTo");
    const periodValue = document.querySelector("#periodValue");
    const dateRangeLabel = document.querySelector("#dateRangeLabel");
    const quickButtons = [...document.querySelectorAll("[data-period]")];
    const categoryInputs = [...document.querySelectorAll('input[name="category"]')];

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
    }

    function updateResetVisibility() {
        const hasCategory = categoryInputs.some((input) => input.checked);
        const hasDate = Boolean(dateFrom.value || dateTo.value);
        resetFilters.hidden = !(hasCategory || hasDate);
    }

    function renderActiveChips() {
        activeChips.innerHTML = "";
        const selected = categoryInputs.filter((input) => input.checked);
        let count = selected.length;

        selected.forEach((input) => {
            const [bg, text, border] = getPalette(input.value);
            const chip = document.createElement("span");
            chip.className = "filter-chip";
            chip.style.backgroundColor = bg;
            chip.style.color = text;
            chip.style.borderColor = border;
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

        if (count === 0) {
            const all = document.createElement("span");
            all.className = "filter-chip all-chip";
            all.textContent = "전체";
            activeChips.appendChild(all);
        }

        activeFilterCount.textContent = String(count);
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
    });

    selectAllCategories?.addEventListener("click", () => {
        categoryInputs.forEach((input) => { input.checked = false; });
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
