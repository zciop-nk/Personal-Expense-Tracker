function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
}

document.addEventListener("DOMContentLoaded", () => {
    initListPage();
    initFormCalendar();
    initCategoryCombobox();
    initFlashMessages();
    const display = document.querySelector("#descriptionDisplay");
    const hidden = document.querySelector("#id_description");
    if (display && hidden) {
        display.addEventListener("input", () => { hidden.value = display.value; });
        display.form.addEventListener("submit", () => { hidden.value = display.value; });
    }
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

function getCategoryPalette(colorKey) {
    const styles = getComputedStyle(document.documentElement);
    const prefix = `--category-${colorKey.replaceAll("_", "-")}`;
    const bg = styles.getPropertyValue(`${prefix}-bg`).trim() || "#F3F3F3";
    const text = styles.getPropertyValue(`${prefix}-text`).trim() || "#666666";
    const solid = styles.getPropertyValue(`${prefix}-solid`).trim() || "#888888";
    return [bg, text, solid];
}

function hexToRgb(hex) {
    const cleanHex = hex.replace("#", "");

    return {
        r: parseInt(cleanHex.substring(0, 2), 16),
        g: parseInt(cleanHex.substring(2, 4), 16),
        b: parseInt(cleanHex.substring(4, 6), 16),
    };
}


function mixColor(baseHex, mixHex, amount) {
    const base = hexToRgb(baseHex);
    const mix = hexToRgb(mixHex);

    const ratio = Math.max(0, Math.min(1, amount));

    const r = Math.round(
        base.r + (mix.r - base.r) * ratio
    );

    const g = Math.round(
        base.g + (mix.g - base.g) * ratio
    );

    const b = Math.round(
        base.b + (mix.b - base.b) * ratio
    );

    return `rgb(${r}, ${g}, ${b})`;
}

function createToneColors(baseColor, count) {
    if (count <= 0) return [];

    if (count === 1) {
        return [baseColor];
    }

    const colors = [];

    for (let i = 0; i < count; i++) {

        if (i === 0) {
            /*
             * 가장 큰 항목:
             * 대표색을 아주 조금 어둡게
             */
            colors.push(
                mixColor(baseColor, "#000000", 0.08)
            );

            continue;
        }

        /*
         * 나머지는 순서대로 흰색을 섞습니다.
         *
         * 약 10% → 65% 사이
         */
        const progress =
            i / Math.max(count - 1, 1);

        const whiteRatio =
            0.10 + (progress * 0.55);

        colors.push(
            mixColor(
                baseColor,
                "#FFFFFF",
                whiteRatio
            )
        );
    }

    return colors;
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

    bindDeleteConfirm();

    renderCategoryDonuts();
    renderDescriptionDonut();
    renderAdaptiveTrendCharts();
    renderComparisonDashboard();
}

function renderCategoryDonuts() {
    const donuts = [
        ...document.querySelectorAll(
            "[data-category-donut], #categoryDonut"
        ),
    ];

    donuts.forEach((donut) => {
        const card =
            donut.closest(".dashboard-card") ||
            donut.closest(".panel") ||
            donut.parentElement;

        if (!card) return;

        const segments = [
            ...card.querySelectorAll(
                "[data-donut-segment]"
            ),
        ];

        if (!segments.length) return;

        let currentDegree = 0;

        const gradients = segments
            .map((segment) => {
                const percentage = Number(
                    String(
                        segment.dataset.percentage || 0
                    ).replace(",", ".")
                );

                const colorKey =
                    segment.dataset.colorKey;

                const [, , solid] =
                    getCategoryPalette(colorKey);

                if (
                    !Number.isFinite(percentage) ||
                    percentage <= 0
                ) {
                    return null;
                }

                const start = currentDegree;

                const end =
                    currentDegree +
                    (percentage / 100) * 360;

                currentDegree = end;

                const dot =
                    segment.querySelector(".donut-dot");

                if (dot) {
                    dot.style.backgroundColor = solid;
                }

                return `${solid} ${start}deg ${end}deg`;
            })
            .filter(Boolean);

        if (!gradients.length) return;

        donut.style.background =
            `conic-gradient(${gradients.join(", ")})`;
    });
}

function renderDescriptionDonut() {
    const wrapper =
        document.querySelector("[data-description-donut]");

    if (!wrapper) return;

    const donut =
        wrapper.querySelector(".description-donut");

    const legend =
        wrapper.querySelector(".description-donut-legend");

    const topName =
        wrapper.querySelector(
            ".description-donut-top-name"
        );

    const topPercent =
        wrapper.querySelector(
            ".description-donut-top-percent"
        );

    const sourceItems = [
        ...wrapper.querySelectorAll(
            "[data-description-segment]"
        )
    ];

    if (
        !donut ||
        !legend ||
        !sourceItems.length
    ) {
        return;
    }


    /* -------------------------
       원본 데이터
    ------------------------- */

    let data = sourceItems
        .map((item) => ({
            name: item.dataset.name || "",
            amount: Number(
                item.dataset.amount || 0
            ),
        }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);


    if (!data.length) return;


    /* -------------------------
       상위 5개 + 그 외
    ------------------------- */

    if (data.length > 5) {

        const topFive = data.slice(0, 5);

        const otherAmount = data
            .slice(5)
            .reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );

        data = [
            ...topFive,
            {
                name: "그 외",
                amount: otherAmount,
            },
        ];
    }


    const total = data.reduce(
        (sum, item) => sum + item.amount,
        0
    );


    /* -------------------------
       대표 카테고리 색
    ------------------------- */

    const colorKey =
        wrapper.dataset.colorKey;

    const palette =
        getCategoryPalette(colorKey);

    const baseColor =
        palette[2];

    const colors =
        createToneColors(
            baseColor,
            data.length
        );


    /* -------------------------
       퍼센트 계산
    ------------------------- */

    data = data.map(
        (item, index) => ({
            ...item,

            percentage:
                total
                    ? (item.amount / total) * 100
                    : 0,

            color: colors[index],
        })
    );


    /* -------------------------
       conic-gradient 생성
    ------------------------- */

    let currentDegree = 0;

    const gradientParts =
        data.map((item) => {

            const segmentDegree =
                item.percentage * 3.6;

            const start =
                currentDegree;

            const end =
                currentDegree + segmentDegree;

            currentDegree = end;

            return (
                `${item.color} ` +
                `${start}deg ${end}deg`
            );
        });

    donut.style.background =
        `conic-gradient(${gradientParts.join(",")})`;


    /* -------------------------
       중앙 정보
    ------------------------- */

    const largest = data[0];

    if (topName) {
        topName.textContent =
            largest.name;
    }

    if (topPercent) {
        topPercent.textContent =
            `${largest.percentage.toFixed(1)}%`;
    }


    /* -------------------------
       범례
    ------------------------- */

    legend.innerHTML = "";

    data.forEach((item) => {

        const row =
            document.createElement("div");

        row.className =
            "description-donut-legend-item";

        row.innerHTML = `
            <div class="description-donut-legend-label">
                <span
                    class="description-donut-dot"
                    style="background:${item.color}"
                ></span>

                <span class="description-donut-name">
                    ${escapeHtml(item.name)}
                </span>
            </div>

            <div class="description-donut-value">
                <strong>
                    ${item.percentage.toFixed(1)}%
                </strong>

                <span>
                    ${item.amount.toLocaleString("ko-KR")}원
                </span>
            </div>
        `;

        legend.appendChild(row);
    });
}



function initFlashMessages() {
    const flashes = [...document.querySelectorAll("[data-flash-message]")];

    flashes.forEach((flash) => {
        const closeButton = flash.querySelector("[data-flash-close]");
        let timer = null;

        const dismiss = () => {
            if (flash.classList.contains("is-hiding")) return;
            flash.classList.add("is-hiding");
            window.setTimeout(() => flash.remove(), 220);
        };

        closeButton?.addEventListener("click", () => {
            if (timer) window.clearTimeout(timer);
            dismiss();
        });

        timer = window.setTimeout(dismiss, 4200);
    });
}

function getTrendDisplayUnit(maxAmount) {
    if (maxAmount >= 10000) {
        return { divisor: 10000, label: "만 원", decimals: 1 };
    }
    if (maxAmount >= 1000) {
        return { divisor: 1000, label: "천 원", decimals: 1 };
    }
    return { divisor: 1, label: "원", decimals: 0 };
}

function getNiceTrendTop(maxAmount, divisor) {
    const scaled = maxAmount / divisor;

    if (scaled <= 0) return 1;

    /*
     * 실제 최댓값보다 약 12%만 여유를 둡니다.
     * 예: 105.6 → 약 118.3
     */
    const padded = scaled * 1.12;

    const magnitude =
        10 ** Math.floor(Math.log10(padded));

    const normalized =
        padded / magnitude;

    /*
     * 기존 1 / 2 / 5 / 10보다
     * 단계를 촘촘하게 만들어 과도한 여백을 방지합니다.
     */
    const niceSteps = [
        1,
        1.2,
        1.5,
        2,
        2.5,
        3,
        4,
        5,
        6,
        8,
        10,
    ];

    const nice =
        niceSteps.find(
            (step) => normalized <= step
        ) ?? 10;

    return nice * magnitude;
}

function formatTrendPeriodLabel(periods, granularity) {
    if (!periods.length) return "";
    const years = [...new Set(periods.map((period) => period.slice(0, 4)))];
    if (granularity === "day") {
        const months = [...new Set(periods.map((period) => period.slice(0, 7)))];
        if (months.length === 1) {
            const [year, month] = months[0].split("-");
            return `${year}년 ${Number(month)}월`;
        }
    }
    return years.length === 1 ? `${years[0]}년` : `${years[0]}–${years[years.length - 1]}년`;
}

function formatTrendXAxis(period, granularity) {
    if (granularity === "day") {
        const [, month, day] = period.split("-");
        return `${Number(month)}/${Number(day)}`;
    }
    const [, month] = period.split("-");
    return `${Number(month)}월`;
}

function renderTrendScale(scale, top, unit, classPrefix) {
    if (!scale) return;
    scale.innerHTML = "";
    [1, 0.75, 0.5, 0.25, 0].forEach((ratio) => {
        const row = document.createElement("div");
        row.className = `${classPrefix}-scale-row`;
        row.style.top = `${(1 - ratio) * 100}%`;
        row.innerHTML = `
            <span class="${classPrefix}-scale-label">${(top * ratio).toFixed(unit.decimals)}</span>
            <span class="${classPrefix}-scale-line"></span>
        `;
        scale.appendChild(row);
    });
}

function renderAdaptiveTrendCharts() {
    document.querySelectorAll("[data-adaptive-trend]").forEach((chart) => {
        const items = [...chart.querySelectorAll(".adaptive-trend-item")];
        if (!items.length) return;

        const card = chart.closest(".dashboard-card");
        const periodLabel = card?.querySelector("[data-adaptive-period-label]");
        const unitBadge = card?.querySelector("[data-adaptive-unit]");
        const scale = chart.querySelector(".adaptive-trend-scale");
        const granularity = chart.dataset.granularity || "month";
        const colorKey = chart.dataset.colorKey;
        const data = items.map((item) => ({
            item,
            period: item.dataset.period || "",
            amount: Number(item.dataset.amount || 0),
        }));
        const maxAmount = Math.max(...data.map((row) => row.amount), 0);
        const unit = getTrendDisplayUnit(maxAmount);
        const top = getNiceTrendTop(maxAmount, unit.divisor);

        if (periodLabel) periodLabel.textContent = formatTrendPeriodLabel(data.map((row) => row.period), granularity);
        if (unitBadge) unitBadge.textContent = unit.label;

        renderTrendScale(scale, top, unit, "adaptive-trend");

        let solid = "#FFE860";
        if (colorKey && colorKey !== "accent") {
            [, , solid] = getCategoryPalette(colorKey);
        }

        data.forEach(({ item, period, amount }) => {
            const label = item.querySelector(".adaptive-trend-label");
            const value = item.querySelector(".adaptive-trend-value");
            const bar = item.querySelector(".adaptive-trend-bar");
            if (label) label.textContent = formatTrendXAxis(period, granularity);
            if (value) value.textContent = (amount / unit.divisor).toFixed(unit.decimals);
            if (bar) {
                bar.style.height = `${top ? ((amount / unit.divisor) / top) * 100 : 0}%`;
                if (!bar.classList.contains("adaptive-trend-bar-accent")) bar.style.backgroundColor = solid;
            }
        });
    });
}

function renderComparisonDashboard() {
    document.querySelectorAll(".comparison-category[data-color-key]").forEach((card) => {
        const [, , solid] = getCategoryPalette(card.dataset.colorKey);
        const dot = card.querySelector(".comparison-dot");
        if (dot) dot.style.backgroundColor = solid;
    });

    document.querySelectorAll("[data-comparison-trend]").forEach((chart) => {
        const source = [...chart.querySelectorAll("[data-compare-point]")];
        const categorySource = [...chart.querySelectorAll("[data-compare-category]")];
        if (!source.length && !categorySource.length) return;

        const granularity = chart.dataset.granularity || "month";
        const card = chart.closest(".dashboard-card");
        const periodLabel = card?.querySelector("[data-comparison-period-label]");
        const unitBadge = card?.querySelector("[data-comparison-unit]");
        const legend = chart.querySelector(".comparison-trend-legend");
        const scale = chart.querySelector(".comparison-trend-scale");
        const bars = chart.querySelector(".comparison-trend-bars");

        const points = source.map((node) => ({
            period: node.dataset.period || "",
            name: node.dataset.name || "",
            colorKey: node.dataset.colorKey || "",
            amount: Number(node.dataset.amount || 0),
        }));
        const periods = [...new Set(points.map((p) => p.period))].sort();
        const categorySeed = categorySource.length
            ? categorySource.map((node) => ({ name: node.dataset.name || "", colorKey: node.dataset.colorKey || "" }))
            : points.map((p) => ({ name: p.name, colorKey: p.colorKey }));
        const categories = [...new Map(categorySeed.map((p) => [p.name, p])).values()];
        const maxAmount = Math.max(...points.map((p) => p.amount), 0);
        const unit = getTrendDisplayUnit(maxAmount);
        const top = getNiceTrendTop(maxAmount, unit.divisor);

        if (periodLabel) periodLabel.textContent = formatTrendPeriodLabel(periods, granularity);
        if (unitBadge) unitBadge.textContent = `단위: ${unit.label}`;

        if (legend) {
            legend.innerHTML = categories.map((category) => {
                const [, , solid] = getCategoryPalette(category.colorKey);
                return `<span><i style="background:${solid}"></i>${escapeHtml(category.name)}</span>`;
            }).join("");
        }

        renderTrendScale(scale, top, unit, "comparison-trend");

        if (bars) {
            bars.innerHTML = "";
            periods.forEach((period) => {
                const group = document.createElement("div");
                group.className = "comparison-trend-group";
                const barGroup = document.createElement("div");
                barGroup.className = "comparison-trend-bar-group";

                categories.forEach((category) => {
                    const point = points.find((p) => p.period === period && p.name === category.name);
                    const amount = point?.amount || 0;
                    const [, , solid] = getCategoryPalette(category.colorKey);
                    const bar = document.createElement("span");
                    bar.className = "comparison-trend-bar";
                    bar.style.height = `${top ? ((amount / unit.divisor) / top) * 100 : 0}%`;
                    bar.style.backgroundColor = solid;
                    bar.title = `${category.name} ${amount.toLocaleString("ko-KR")}원`;
                    barGroup.appendChild(bar);
                });

                const label = document.createElement("span");
                label.className = "comparison-trend-label";
                label.textContent = formatTrendXAxis(period, granularity);
                group.append(barGroup, label);
                bars.appendChild(group);
            });
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
            history.replaceState(null, "", url);
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
        if (!selected) {
            text.textContent = "날짜를 선택해 주세요";
            text.style.color = "#8B8B8B";
            return;
        }

        const [year, month, day] = selected.split("-");

        text.textContent =
            `${year}년 ${Number(month)}월 ${Number(day)}일`;

        text.style.color = "";
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

    const selectedOption = options.find(option => option.dataset.categoryId === hiddenInput.value);
    if (selectedOption) searchInput.value = selectedOption.dataset.categoryName;
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
            let errorBox = combobox.querySelector(".category-api-error");
            if (!errorBox) {
                errorBox = document.createElement("p");
                errorBox.className = "field-error category-api-error";
                errorBox.setAttribute("role", "alert");
                combobox.appendChild(errorBox);
            }
            errorBox.textContent = data.message || "카테고리 생성에 실패했습니다.";
            return;
        }

        combobox.querySelector(".category-api-error")?.remove();
        const category = data.category;

        hiddenInput.value = category.id;
        searchInput.value = category.name;

        addPanel.hidden = true;
        addOption.hidden = true;

        closeDropdown();
    } catch (error) {
        console.error(error);
        const errorBox = document.createElement("p");
        errorBox.className = "field-error category-api-error";
        errorBox.setAttribute("role", "alert");
        errorBox.textContent = "연결에 실패했어요. 잠시 후 다시 추가해 주세요.";
        combobox.querySelector(".category-api-error")?.remove();
        combobox.appendChild(errorBox);
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
// Keep keyboard focus in the active dialog, including the mobile drawer.
document.addEventListener("keydown", event => {
    if (event.key !== "Tab") return;
    const modal = document.querySelector("#appModal:not([hidden]) .app-modal-dialog");
    const drawer = document.querySelector("#expenseDrawerLayer:not([hidden]) #expenseDrawer");
    const active = modal || drawer;
    if (!active) return;
    const controls = [...active.querySelectorAll('button:not([disabled]), a[href], input:not([type="hidden"]):not([disabled]), [tabindex="0"]')].filter(el => !el.closest("[hidden]") && el.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !active.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !active.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
    }
});

// The budget is a short task completed in place; /budget/ remains a direct-link fallback.
document.addEventListener("DOMContentLoaded", () => {
    const dialog = document.querySelector("#budgetDialog");
    const body = document.querySelector("#budgetDialogBody");
    let trigger = null;
    let requestNumber = 0;
    async function loadBudget(month = "", target = body) {
        const number = ++requestNumber;
        const response = await fetch(`/budget/${month ? `?month=${encodeURIComponent(month)}` : ""}`, {headers:{"X-Requested-With":"XMLHttpRequest"}});
        if (!response.ok) throw new Error("예산을 불러오지 못했어요. 다시 시도해 주세요.");
        const data = await response.json();
        if (number !== requestNumber) return;
        target.innerHTML = data.form_html;
        bindBudget(target.querySelector("[data-budget-form]"));
    }
    function closeBudget() { ++requestNumber; dialog.close(); trigger?.focus(); }
    function bindBudget(form) {
        if (!form) return;
        const field = form.querySelector('[name="month"]');
        const picker = form.querySelector("#budgetMonthPicker");
        const button = form.querySelector("[data-month-toggle]");
        const yearText = form.querySelector("[data-picker-year]");
        let year = Number(field.value.slice(0,4)) || new Date().getFullYear();
        form.querySelector("[data-month-label]").textContent = `${year}년 ${Number(field.value.slice(5)) || new Date().getMonth()+1}월`;
        const error = form.querySelector("[data-budget-error]");
        function renderMonths() {
            yearText.textContent = `${year}년`;
            const grid = form.querySelector("[data-month-grid]"); grid.replaceChildren();
            for (let month=1;month<=12;month++) {
                const item = document.createElement("button"); item.type="button"; item.textContent=`${month}월`;
                const value = `${String(year).padStart(4,"0")}-${String(month).padStart(2,"0")}`;
                item.setAttribute("aria-pressed", String(field.value === value));
                item.addEventListener("click", async () => {
                    picker.hidden=true;button.setAttribute("aria-expanded","false");
                    try { await loadBudget(value, form.parentElement); }
                    catch(e) { error.textContent=e.message;error.hidden=false; }
                });
                grid.appendChild(item);
            }
        }
        button.addEventListener("click",()=>{picker.hidden=!picker.hidden;button.setAttribute("aria-expanded",String(!picker.hidden));renderMonths();});
        form.querySelectorAll("[data-year-step]").forEach(item=>item.addEventListener("click",()=>{year=Math.min(9999,Math.max(1,year+Number(item.dataset.yearStep)));renderMonths();}));
        form.addEventListener("keydown",event=>{if(event.key==="Escape"&&!picker.hidden){event.preventDefault();event.stopPropagation();picker.hidden=true;button.setAttribute("aria-expanded","false");button.focus();}});
        form.addEventListener("submit",async event=>{
            event.preventDefault();
            const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent="저장 중…";error.hidden=true;
            try {
                const response=await fetch(form.action,{method:"POST",body:new FormData(form),headers:{"X-Requested-With":"XMLHttpRequest"}});
                if(!response.ok)throw new Error("저장하지 못했어요. 다시 시도해 주세요.");
                const data=await response.json();
                if(!data.success){form.parentElement.innerHTML=data.form_html;bindBudget((dialog.open ? body : document).querySelector('[data-budget-form]'));return;}
                const home=document.querySelector("#homeArea");
                if(home){home.innerHTML=data.home_html;closeBudget();const notice=document.createElement("p");notice.className="expense-drawer-toast";notice.role="status";notice.textContent="월 예산을 저장했어요.";document.body.appendChild(notice);setTimeout(()=>notice.remove(),3000);}
                else window.location.assign("/");
            }catch(e){error.textContent=e.message;error.hidden=false;}
            finally{submit.disabled=false;submit.textContent="예산 저장";}
        });
    }
    document.addEventListener("click",async event=>{
        const link=event.target.closest("[data-budget-open]");
        if(link){event.preventDefault();trigger=link;body.textContent="예산을 불러오는 중…";dialog.showModal();try{await loadBudget();}catch(e){body.textContent=e.message;}return;}
        if(event.target.closest("[data-budget-close]")&&dialog.open){event.preventDefault();closeBudget();}
        const form=document.querySelector('[data-budget-form]');
        if(form&&!event.target.closest('.budget-month-field')){form.querySelector('#budgetMonthPicker').hidden=true;form.querySelector('[data-month-toggle]').setAttribute('aria-expanded','false');}
    });
    dialog.addEventListener("click",event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeBudget();}});
    dialog.addEventListener("cancel",()=>{++requestNumber;});
    bindBudget(document.querySelector("[data-budget-form]"));
});
