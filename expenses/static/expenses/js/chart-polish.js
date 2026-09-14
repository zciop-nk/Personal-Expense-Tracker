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
    const originalRenderAdaptiveTrendCharts =
        window.renderAdaptiveTrendCharts;

    const originalRenderComparisonDashboard =
        window.renderComparisonDashboard;


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

    window.renderCategoryDonuts =
        function renderCategoryDonuts() {
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

    window.renderDescriptionDonut =
        function renderDescriptionDonut() {
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
                            ${item.name}
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

                legend.appendChild(
                    row
                );
            });
        };


    /* --------------------------------------------------
       Trend overflow
    -------------------------------------------------- */

    function applyTrendOverflow() {
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

                if (!bars) return;

                const isDaily =
                    chart.dataset
                        .granularity ===
                    "day";

                /*
                 * 8개까지는 현재 카드 안에서 충분히 읽을 수 있습니다.
                 * 9개부터만 스크롤을 켭니다.
                 */
                const shouldScroll =
                    isDaily &&
                    items.length > 8;

                chart.classList.toggle(
                    "is-trend-scrollable",
                    shouldScroll
                );

                if (!shouldScroll) {
                    bars.style.minWidth =
                        "100%";

                    if (scale) {
                        scale.style.width =
                            "";
                        scale.style.right =
                            "";
                    }

                    return;
                }

                const width =
                    Math.max(
                        520,
                        42 +
                            items.length *
                                42
                    );

                bars.style.minWidth =
                    `${width}px`;

                if (scale) {
                    scale.style.width =
                        `${width}px`;

                    scale.style.right =
                        "auto";
                }
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

                if (!bars) return;

                const isDaily =
                    chart.dataset
                        .granularity ===
                    "day";

                const shouldScroll =
                    isDaily &&
                    groups.length > 7;

                chart.classList.toggle(
                    "is-trend-scrollable",
                    shouldScroll
                );

                if (!shouldScroll) {
                    bars.style.minWidth =
                        "100%";

                    if (scale) {
                        scale.style.width =
                            "";
                        scale.style.right =
                            "";
                    }

                    return;
                }

                const width =
                    Math.max(
                        520,
                        42 +
                            groups.length *
                                46
                    );

                bars.style.minWidth =
                    `${width}px`;

                if (scale) {
                    scale.style.width =
                        `${width}px`;

                    scale.style.right =
                        "auto";
                }
            });
    }


    /* 기존 렌더 후 overflow만 후처리 */
    if (
        typeof originalRenderAdaptiveTrendCharts ===
        "function"
    ) {
        window.renderAdaptiveTrendCharts =
            function () {
                originalRenderAdaptiveTrendCharts();
                applyTrendOverflow();
            };
    }


    if (
        typeof originalRenderComparisonDashboard ===
        "function"
    ) {
        window.renderComparisonDashboard =
            function () {
                originalRenderComparisonDashboard();
                applyTrendOverflow();
            };
    }


    /*
     * main.js의 DOMContentLoaded 이후에도 한 번 더 보정.
     * AJAX 필터 변경 때는 decorateResults()가 위의 override 함수들을
     * 다시 호출하므로 별도 observer가 필요 없습니다.
     */
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            requestAnimationFrame(
                applyTrendOverflow
            );
        }
    );
})();
