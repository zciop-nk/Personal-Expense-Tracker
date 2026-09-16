/* Source module: ledger-core.js. Built into ../ledger.js by tools/build_frontend.py. */
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
}

document.addEventListener("DOMContentLoaded", () => {
    if (ensureMobileListPageSize()) return;

    initMobileTabs();
    initListPage();
    initFormCalendar();
    initCategoryCombobox();
    initFlashMessages();
    initHomeMonthNavigation();
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

    // Presentation-only chart polish is explicit; charts.js no longer overwrites renderers.
    window.SseumCharts?.enhanceCategoryDonuts?.();
    window.SseumCharts?.enhanceDescriptionDonut?.();
    window.SseumCharts?.enhanceAdaptiveTrends?.();
    window.SseumCharts?.enhanceComparisonTrends?.();
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


/*
 * 차트 하단 숫자는 카드 폭을 밀지 않도록 최대 3개의 유효 숫자만 사용합니다.
 * - 100 이상: 정수로 반올림 (예: 204.8 → 205)
 * - 10~99: 소수 첫째 자리까지 (예: 23.44 → 23.4)
 * - 10 미만: 소수 첫째 자리까지 (예: 2.35 → 2.4)
 * - .0은 제거합니다.
 */
function formatCompactTrendValue(value) {
    if (!Number.isFinite(value)) return "0";

    let rounded;

    if (Math.abs(value) >= 100) {
        rounded = Math.round(value);
        return String(rounded);
    }

    rounded = Math.round(value * 10) / 10;

    return Number.isInteger(rounded)
        ? String(rounded)
        : rounded.toFixed(1);
}

function formatTrendDetailPeriod(period, granularity) {
    if (granularity === "day") {
        const [year, month, day] = period.split("-");
        return `${year}년 ${Number(month)}월 ${Number(day)}일`;
    }

    const [year, month] = period.split("-");
    return `${year}년 ${Number(month)}월`;
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

            const scaledAmount = amount / unit.divisor;

            if (value) {
                value.textContent = formatCompactTrendValue(scaledAmount);
                value.title = `${amount.toLocaleString("ko-KR")}원`;
            }

            if (bar) {
                bar.style.height = `${top ? (scaledAmount / top) * 100 : 0}%`;
                bar.dataset.periodLabel = formatTrendDetailPeriod(period, granularity);
                bar.dataset.exactAmount = String(amount);
                bar.setAttribute(
                    "aria-label",
                    `${formatTrendDetailPeriod(period, granularity)} ${amount.toLocaleString("ko-KR")}원`
                );
                bar.tabIndex = 0;

                if (!bar.classList.contains("adaptive-trend-bar-accent")) {
                    bar.style.backgroundColor = solid;
                }
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

                /*
                * 해당 월의 카테고리별 실제 금액을 먼저 계산
                */
                const periodData = categories.map((category) => {
                    const point = points.find(
                        (p) =>
                            p.period === period &&
                            p.name === category.name
                    );

                    return {
                        ...category,
                        amount: point?.amount || 0,
                    };
                });

                /*
                * 0원은 시각적 막대를 만들지 않습니다.
                */
                const activeData = periodData.filter(
                    (item) => item.amount > 0
                );

                activeData.forEach((item) => {
                    const [, , solid] =
                        getCategoryPalette(item.colorKey);

                    const bar =
                        document.createElement("span");

                    bar.className =
                        "comparison-trend-bar";

                    /*
                    * 한 카테고리만 값이 있을 때는
                    * 막대를 조금 더 두껍게 표시합니다.
                    */
                    if (activeData.length === 1) {
                        bar.classList.add("is-solo");
                    }

                    const rawPercent =
                        top
                            ? (
                                (item.amount / unit.divisor) /
                                top
                            ) * 100
                            : 0;

                    /*
                     * 실제 값이 있지만 최대값 대비 너무 작으면
                     * 선처럼 사라지지 않도록 최소 시각 높이만 보장합니다.
                     * 0원은 activeData에서 이미 제외되어 막대를 만들지 않습니다.
                     */
                    const visiblePercent =
                        item.amount > 0
                            ? Math.max(rawPercent, 2.8)
                            : 0;

                    bar.style.height =
                        `${visiblePercent}%`;

                    if (
                        item.amount > 0 &&
                        rawPercent < 2.8
                    ) {
                        bar.classList.add("is-tiny");
                    }

                    bar.style.backgroundColor = solid;

                    const detailPeriod =
                        formatTrendDetailPeriod(period, granularity);

                    bar.title =
                        `${detailPeriod} · ${item.name} ${item.amount.toLocaleString("ko-KR")}원`;

                    bar.dataset.periodLabel = detailPeriod;
                    bar.dataset.categoryLabel = item.name;
                    bar.dataset.exactAmount = String(item.amount);
                    bar.setAttribute("aria-label", bar.title);
                    bar.tabIndex = 0;

                    barGroup.appendChild(bar);
                });

                const label =
                    document.createElement("span");

                label.className =
                    "comparison-trend-label";

                label.textContent =
                    formatTrendXAxis(
                        period,
                        granularity
                    );

                group.append(
                    barGroup,
                    label
                );

                bars.appendChild(group);
            });
        }
    });
}

