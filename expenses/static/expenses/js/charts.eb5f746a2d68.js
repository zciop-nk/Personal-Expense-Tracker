/*
=========================================================
SSEUM Chart Polish
---------------------------------------------------------
main.js를 직접 덮어쓰지 않고,
기존 전역 렌더러를 안전하게 확장합니다.

- 카테고리 도넛 sweep animation
- 내용별 도넛 sweep animation
- 일별 추이의 불필요한 고정 520px 제거
- 데이터가 많을 때만 가로 스크롤 활성화
=========================================================
*/

(function () {
    /* --------------------------------------------------
       Donut animation
    -------------------------------------------------- */

    function animateSseumDonut(
        element,
        rawSegments,
        duration = 620
    ) {
        if (!element || !rawSegments.length) return;

        if (element.__sseumDonutFrame) {
            cancelAnimationFrame(
                element.__sseumDonutFrame
            );
        }

        const validSegments = rawSegments.filter(
            (segment) =>
                Number.isFinite(segment.percentage) &&
                segment.percentage > 0 &&
                segment.color
        );

        if (!validSegments.length) return;

        /*
         * category_share는 화면 표시를 위해 소수점 반올림되어
         * 합계가 99.9 / 100.1이 될 수 있습니다.
         * 애니메이션에서는 합계를 다시 100%로 정규화해서
         * 마지막에 얇은 회색 틈이 생기지 않게 합니다.
         */
        const percentageTotal = validSegments.reduce(
            (sum, segment) =>
                sum + segment.percentage,
            0
        );

        if (percentageTotal <= 0) return;

        const segments = validSegments.map(
            (segment) => ({
                ...segment,
                percentage:
                    (segment.percentage /
                        percentageTotal) *
                    100,
            })
        );

        const reduceMotion =
            window.matchMedia?.(
                "(prefers-reduced-motion: reduce)"
            )?.matches;

        const actualDuration =
            reduceMotion ? 0 : duration;

        const backgroundColor = "#F1F1F1";


        function paint(progress) {
            const eased =
                progress >= 1
                    ? 1
                    : 1 -
                      Math.pow(
                          1 - progress,
                          3
                      );

            let currentDegree = 0;

            /*
             * conic-gradient는 브라우저 anti-aliasing 때문에
             * 서로 다른 색 경계에 1px 정도의 밝은 seam이 보일 수 있습니다.
             * 각 segment를 아주 미세하게 겹쳐서 경계 틈을 없앱니다.
             */
            const seamOverlap = 0.28;

            const parts = segments.map(
                (segment, index) => {
                    const rawStart =
                        currentDegree;

                    const segmentDegree =
                        (segment.percentage /
                            100) *
                        360 *
                        eased;

                    const rawEnd =
                        rawStart +
                        segmentDegree;

                    const start =
                        index === 0
                            ? rawStart
                            : Math.max(
                                0,
                                rawStart -
                                    seamOverlap
                            );

                    const end =
                        rawEnd +
                        (
                            rawEnd < 360
                                ? seamOverlap
                                : 0
                        );

                    currentDegree = rawEnd;

                    return (
                        `${segment.color} ` +
                        `${start}deg ${end}deg`
                    );
                }
            );

            if (currentDegree < 360) {
                parts.push(
                    `${backgroundColor} ` +
                    `${currentDegree}deg 360deg`
                );
            }

            element.style.background =
                `conic-gradient(${parts.join(", ")})`;
        }


        if (actualDuration === 0) {
            paint(1);
            return;
        }


        const startTime =
            performance.now();


        function frame(now) {
            const progress =
                Math.min(
                    (now - startTime) /
                        actualDuration,
                    1
                );

            paint(progress);

            if (progress < 1) {
                element.__sseumDonutFrame =
                    requestAnimationFrame(
                        frame
                    );
            } else {
                element.__sseumDonutFrame =
                    null;
            }
        }


        paint(0);

        element.__sseumDonutFrame =
            requestAnimationFrame(frame);
    }


    /* --------------------------------------------------
       A / C category donut
    -------------------------------------------------- */

    function enhanceCategoryDonuts() {
            const donuts = [
                ...document.querySelectorAll(
                    "[data-category-donut], #categoryDonut"
                ),
            ];

            donuts.forEach((donut) => {
                const card =
                    donut.closest(
                        ".dashboard-card"
                    ) ||
                    donut.closest(".panel") ||
                    donut.parentElement;

                if (!card) return;

                const segmentElements = [
                    ...card.querySelectorAll(
                        "[data-donut-segment]"
                    ),
                ];

                if (
                    !segmentElements.length
                ) {
                    return;
                }

                const segments =
                    segmentElements
                        .map((segment) => {
                            const percentage =
                                Number(
                                    String(
                                        segment
                                            .dataset
                                            .percentage ||
                                            0
                                    ).replace(
                                        ",",
                                        "."
                                    )
                                );

                            const colorKey =
                                segment.dataset
                                    .colorKey;

                            const [
                                ,
                                ,
                                solid,
                            ] =
                                getCategoryPalette(
                                    colorKey
                                );

                            const dot =
                                segment.querySelector(
                                    ".donut-dot"
                                );

                            if (dot) {
                                dot.style.backgroundColor =
                                    solid;
                            }

                            if (
                                !Number.isFinite(
                                    percentage
                                ) ||
                                percentage <= 0
                            ) {
                                return null;
                            }

                            return {
                                percentage,
                                color: solid,
                            };
                        })
                        .filter(Boolean);

                animateSseumDonut(
                    donut,
                    segments
                );
            });
        };


    /* --------------------------------------------------
       B description donut
    -------------------------------------------------- */

    function enhanceDescriptionDonut() {
            const wrapper =
                document.querySelector(
                    "[data-description-donut]"
                );

            if (!wrapper) return;

            const donut =
                wrapper.querySelector(
                    ".description-donut"
                );

            const legend =
                wrapper.querySelector(
                    ".description-donut-legend"
                );

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
                ),
            ];

            if (
                !donut ||
                !legend ||
                !sourceItems.length
            ) {
                return;
            }

            let data = sourceItems
                .map((item) => ({
                    name:
                        item.dataset.name ||
                        "",
                    amount: Number(
                        item.dataset.amount ||
                            0
                    ),
                }))
                .filter(
                    (item) =>
                        item.amount > 0
                )
                .sort(
                    (a, b) =>
                        b.amount -
                        a.amount
                );

            if (!data.length) return;


            /* 상위 5개 + 그 외 */
            if (data.length > 5) {
                const topFive =
                    data.slice(0, 5);

                const otherAmount =
                    data
                        .slice(5)
                        .reduce(
                            (
                                sum,
                                item
                            ) =>
                                sum +
                                item.amount,
                            0
                        );

                data = [
                    ...topFive,
                    {
                        name: "그 외",
                        amount:
                            otherAmount,
                    },
                ];
            }


            const total =
                data.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        item.amount,
                    0
                );

            const colorKey =
                wrapper.dataset.colorKey;

            const palette =
                getCategoryPalette(
                    colorKey
                );

            const baseColor =
                palette[2];

            const colors =
                createToneColors(
                    baseColor,
                    data.length
                );


            data = data.map(
                (
                    item,
                    index
                ) => ({
                    ...item,

                    percentage:
                        total
                            ? (item.amount /
                                  total) *
                              100
                            : 0,

                    color:
                        colors[index],
                })
            );


            animateSseumDonut(
                donut,
                data.map((item) => ({
                    percentage:
                        item.percentage,
                    color:
                        item.color,
                }))
            );


            const largest =
                data[0];

            if (topName) {
                topName.textContent =
                    largest.name;
                topName.title = largest.name;
            }

            if (topPercent) {
                topPercent.textContent =
                    `${largest.percentage.toFixed(1)}%`;
            }


            legend.innerHTML = "";

            data.forEach((item) => {
                const row =
                    document.createElement(
                        "div"
                    );

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

                const nameElement =
                    row.querySelector(
                        ".description-donut-name"
                    );

                if (nameElement) {
                    nameElement.title =
                        item.name;
                }

                legend.appendChild(
                    row
                );
            });
        };


    /* --------------------------------------------------
       Trend overflow
    -------------------------------------------------- */

    function applyTrendOverflow() {
        const visibleCount = 5;

        function configureChart({
            chart,
            bars,
            scale,
            itemCount,
            itemSelector,
            leftInset,
            gap,
            minimumItemWidth,
        }) {
            if (!bars || !itemCount) return;

            const shouldScroll =
                itemCount > visibleCount;

            chart.classList.toggle(
                "is-trend-scrollable",
                shouldScroll
            );

            if (!shouldScroll) {
                bars.style.minWidth = "100%";
                bars.style.removeProperty(
                    "--trend-item-width"
                );

                chart
                    .querySelectorAll(itemSelector)
                    .forEach((item) => {
                        item.style.removeProperty(
                            "--trend-item-width"
                        );
                    });

                if (scale) {
                    scale.style.width = "";
                    scale.style.right = "";
                }

                return;
            }

            /*
             * 현재 카드에서 정확히 5개가 한 번에 보이는 폭을 기준으로
             * 각 item의 고정 폭을 계산합니다. 6번째부터 가로 스크롤입니다.
             */
            const viewportWidth =
                Math.max(
                    chart.clientWidth || 0,
                    280
                );

            const plotWidth =
                Math.max(
                    viewportWidth - leftInset,
                    220
                );

            const itemWidth =
                Math.max(
                    minimumItemWidth,
                    (
                        plotWidth -
                        gap *
                            (visibleCount - 1)
                    ) /
                        visibleCount
                );

            const fullWidth =
                Math.ceil(
                    leftInset +
                    itemWidth * itemCount +
                    gap * (itemCount - 1)
                );

            bars.style.minWidth =
                `${fullWidth}px`;

            bars.style.setProperty(
                "--trend-item-width",
                `${itemWidth}px`
            );

            if (scale) {
                scale.style.width =
                    `${fullWidth}px`;
                scale.style.right = "auto";
            }
        }

        document
            .querySelectorAll(
                "[data-adaptive-trend]"
            )
            .forEach((chart) => {
                const bars =
                    chart.querySelector(
                        ".adaptive-trend-bars"
                    );

                const scale =
                    chart.querySelector(
                        ".adaptive-trend-scale"
                    );

                const items = [
                    ...chart.querySelectorAll(
                        ".adaptive-trend-item"
                    ),
                ];

                configureChart({
                    chart,
                    bars,
                    scale,
                    itemCount: items.length,
                    itemSelector:
                        ".adaptive-trend-item",
                    leftInset: 42,
                    gap: 7,
                    minimumItemWidth: 44,
                });
            });

        document
            .querySelectorAll(
                "[data-comparison-trend]"
            )
            .forEach((chart) => {
                const bars =
                    chart.querySelector(
                        ".comparison-trend-bars"
                    );

                const scale =
                    chart.querySelector(
                        ".comparison-trend-scale"
                    );

                const groups = [
                    ...chart.querySelectorAll(
                        ".comparison-trend-group"
                    ),
                ];

                configureChart({
                    chart,
                    bars,
                    scale,
                    itemCount: groups.length,
                    itemSelector:
                        ".comparison-trend-group",
                    leftInset: 42,
                    gap: 8,
                    minimumItemWidth: 52,
                });
            });
    }


    function formatTooltipAmount(amount) {
        return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
    }


    function ensureTrendTooltip(chart) {
        let tooltip =
            chart.querySelector(
                ".trend-detail-tooltip"
            );

        if (tooltip) return tooltip;

        tooltip =
            document.createElement("div");

        tooltip.className =
            "trend-detail-tooltip";

        tooltip.hidden = true;
        tooltip.setAttribute("role", "status");
        tooltip.setAttribute(
            "aria-live",
            "polite"
        );

        chart.appendChild(tooltip);

        return tooltip;
    }


    function bindTrendTooltips() {
        document
            .querySelectorAll(
                "[data-adaptive-trend], [data-comparison-trend]"
            )
            .forEach((chart) => {
                const tooltip =
                    ensureTrendTooltip(chart);

                const bars = [
                    ...chart.querySelectorAll(
                        ".adaptive-trend-bar, .comparison-trend-bar"
                    ),
                ];

                function hideTooltip() {
                    tooltip.hidden = true;
                    chart.classList.remove(
                        "has-active-tooltip"
                    );
                    bars.forEach((bar) =>
                        bar.classList.remove(
                            "is-tooltip-active"
                        )
                    );
                }

                function showTooltip(bar) {
                    const period =
                        bar.dataset.periodLabel ||
                        "";

                    const category =
                        bar.dataset.categoryLabel ||
                        "";

                    const amount =
                        Number(
                            bar.dataset.exactAmount ||
                                0
                        );

                    const heading = category
                        ? `${period} · ${category}`
                        : period;

                    tooltip.innerHTML = `
                        <strong>${escapeHtml(heading)}</strong>
                        <span>${formatTooltipAmount(amount)}</span>
                    `;

                    tooltip.hidden = false;
                    chart.classList.add(
                        "has-active-tooltip"
                    );

                    bars.forEach((item) =>
                        item.classList.toggle(
                            "is-tooltip-active",
                            item === bar
                        )
                    );

                    const chartRect =
                        chart.getBoundingClientRect();
                    const barRect =
                        bar.getBoundingClientRect();

                    const left =
                        barRect.left -
                        chartRect.left +
                        chart.scrollLeft +
                        barRect.width / 2;

                    const top =
                        barRect.top -
                        chartRect.top +
                        chart.scrollTop -
                        8;

                    tooltip.style.left =
                        `${left}px`;
                    tooltip.style.top =
                        `${top}px`;
                }

                bars.forEach((bar) => {
                    if (
                        bar.dataset
                            .trendTooltipBound ===
                        "true"
                    ) {
                        return;
                    }

                    bar.dataset.trendTooltipBound =
                        "true";

                    bar.addEventListener(
                        "mouseenter",
                        () => showTooltip(bar)
                    );

                    bar.addEventListener(
                        "mouseleave",
                        () => hideTooltip()
                    );

                    bar.addEventListener(
                        "focus",
                        () => showTooltip(bar)
                    );

                    bar.addEventListener(
                        "blur",
                        () => hideTooltip()
                    );

                    bar.addEventListener(
                        "pointerup",
                        (event) => {
                            if (
                                event.pointerType ===
                                "mouse"
                            ) {
                                return;
                            }

                            if (
                                bar.classList.contains(
                                    "is-tooltip-active"
                                )
                            ) {
                                hideTooltip();
                            } else {
                                showTooltip(bar);
                            }
                        }
                    );
                });

                if (
                    chart.dataset
                        .trendOutsideBound !==
                    "true"
                ) {
                    chart.dataset
                        .trendOutsideBound =
                        "true";

                    chart.addEventListener(
                        "pointerdown",
                        (event) => {
                            if (
                                event.target.closest(
                                    ".adaptive-trend-bar, .comparison-trend-bar"
                                )
                            ) {
                                return;
                            }

                            hideTooltip();
                        }
                    );
                }
            });
    }


    /* Base renderers live in ledger.js. This file only applies chart presentation enhancements. */

    /* --------------------------------------------------
       Shared bar animation / comparison zero state
    -------------------------------------------------- */

    function animateRenderedBars(root, selector) {
        if (!root) return;

        const reduceMotion =
            window.matchMedia?.(
                "(prefers-reduced-motion: reduce)"
            )?.matches;

        root.querySelectorAll(selector).forEach((bar) => {
            /*
            * 처음 렌더링된 실제 높이를 data에 보존합니다.
            * 애니메이션이 다시 호출되어도 0%를 최종값으로
            * 잘못 읽지 않게 합니다.
            */
            const finalHeight =
                bar.dataset.targetHeight ||
                bar.style.height ||
                "0%";

            bar.dataset.targetHeight = finalHeight;

            if (
                reduceMotion ||
                finalHeight === "0%" ||
                finalHeight === "0px"
            ) {
                bar.style.height = finalHeight;
                return;
            }

            bar.style.height = "0%";

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    bar.style.height = finalHeight;
                });
            });
        });
    }

    function polishAdaptiveCharts() {
        document
            .querySelectorAll("[data-adaptive-trend]")
            .forEach((chart) => {
                animateRenderedBars(
                    chart,
                    ".adaptive-trend-bar"
                );
            });
    }


    function polishComparisonCharts() {
        document
            .querySelectorAll("[data-comparison-trend]")
            .forEach((chart) => {
                /*
                 * A/B/C 카드와 동일하게 unit badge에는
                 * "단위:" 접두사를 반복하지 않습니다.
                 */
                const card =
                    chart.closest(".dashboard-card");

                const unitBadge =
                    card?.querySelector(
                        "[data-comparison-unit]"
                    );

                if (unitBadge) {
                    unitBadge.textContent =
                        unitBadge.textContent
                            .replace(/^단위:\s*/, "")
                            .trim();
                }

                chart
                    .querySelectorAll(
                        ".comparison-trend-bar"
                    )
                    .forEach((bar) => {
                        const height =
                            parseFloat(
                                bar.style.height || "0"
                            );

                        const isZero =
                            !Number.isFinite(height) ||
                            height <= 0;

                        bar.classList.toggle(
                            "is-zero",
                            isZero
                        );

                        if (isZero) {
                            const categoryColor =
                                bar.style.backgroundColor;

                            /*
                             * 0원도 해당 카테고리 색을 유지하되
                             * 짧은 baseline marker로만 표시합니다.
                             */
                            if (categoryColor) {
                                bar.style.backgroundColor =
                                    categoryColor;
                            }

                            const originalTitle =
                                bar.title || "0원";

                            if (
                                !originalTitle.includes(
                                    "지출 없음"
                                )
                            ) {
                                bar.title =
                                    `${originalTitle} · 이 기간 지출 없음`;
                            }

                            bar.setAttribute(
                                "aria-label",
                                bar.title
                            );
                        }
                    });

                animateRenderedBars(
                    chart,
                    ".comparison-trend-bar"
                );
            });
    }


    window.SseumCharts = Object.freeze({
        enhanceCategoryDonuts,
        enhanceDescriptionDonut,
        enhanceAdaptiveTrends() {
            applyTrendOverflow();
            bindTrendTooltips();
            polishAdaptiveCharts();
        },
        enhanceComparisonTrends() {
            applyTrendOverflow();
            bindTrendTooltips();
            polishComparisonCharts();
        },
    });


    /*
     * main.js의 DOMContentLoaded 이후에도 한 번 더 보정.
     * AJAX 필터 변경 때는 decorateResults()가 위의 override 함수들을
     * 다시 호출하므로 별도 observer가 필요 없습니다.
     */
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            requestAnimationFrame(() => {
                applyTrendOverflow();
                bindTrendTooltips();
            });
        }
    );


    let trendResizeTimer = null;

    window.addEventListener("resize", () => {
        window.clearTimeout(trendResizeTimer);

        trendResizeTimer = window.setTimeout(
            () => {
                applyTrendOverflow();
            },
            120
        );
    });

})();
