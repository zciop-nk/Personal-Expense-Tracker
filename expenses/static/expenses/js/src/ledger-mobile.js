/* Source module: ledger-mobile.js. Built into ../ledger.js by tools/build_frontend.py. */
function ensureMobileListPageSize() {
    const filterForm =
        document.querySelector("#filterForm");

    if (!filterForm) return false;

    const isMobile =
        window.matchMedia(
            "(max-width: 760px)"
        ).matches;

    if (!isMobile) return false;

    const url =
        new URL(window.location.href);

    if (
        url.searchParams.get("page_size") ===
        "15"
    ) {
        return false;
    }

    url.searchParams.set(
        "page_size",
        "15"
    );

    window.location.replace(
        url.toString()
    );

    return true;
}


function initMobileTabs() {
    const tabLinks = [
        ...document.querySelectorAll(
            "[data-mobile-tab]"
        ),
    ];

    if (!tabLinks.length) return;

    const title =
        document.querySelector(
            "#mobileSectionTitle"
        );

    const mobileQuery =
        window.matchMedia(
            "(max-width: 760px)"
        );


    function currentViewFromHash() {
        return (
            window.location.hash === "#analysis"
                ? "analysis"
                : "ledger"
        );
    }


    function updateTitle(view) {
        if (!title) return;

        if (!mobileQuery.matches) {
            title.textContent =
                title.dataset.defaultLabel ||
                "나의 지출 살펴보기";

            return;
        }

        title.textContent =
            view === "analysis"
                ? (
                    title.dataset.analysisLabel ||
                    "나의 지출 분석"
                )
                : (
                    title.dataset.ledgerLabel ||
                    "내 가계부"
                );
    }


    function applyView(
        view,
        {
            updateHistory = false,
            scroll = false,
        } = {}
    ) {
        if (!mobileQuery.matches) {
            document.body.classList.remove(
                "mobile-view-ledger",
                "mobile-view-analysis"
            );

            tabLinks.forEach((link) => {
                link.removeAttribute(
                    "aria-current"
                );
            });

            updateTitle(view);
            return;
        }

        const safeView =
            view === "analysis"
                ? "analysis"
                : "ledger";

        document.body.classList.toggle(
            "mobile-view-ledger",
            safeView === "ledger"
        );

        document.body.classList.toggle(
            "mobile-view-analysis",
            safeView === "analysis"
        );

        tabLinks.forEach((link) => {
            const isActive =
                link.dataset.mobileTab ===
                safeView;

            if (isActive) {
                link.setAttribute(
                    "aria-current",
                    "page"
                );
            } else {
                link.removeAttribute(
                    "aria-current"
                );
            }
        });

        updateTitle(safeView);

        if (updateHistory) {
            const url =
                new URL(
                    window.location.href
                );

            url.hash =
                safeView === "analysis"
                    ? "analysis"
                    : "ledger";

            history.replaceState(
                null,
                "",
                url
            );
        }

        if (scroll) {
            document
                .querySelector(
                    safeView === "analysis"
                        ? "#homeArea"
                        : "#ledger"
                )
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
        }
    }


    tabLinks.forEach((link) => {
        link.addEventListener(
            "click",
            (event) => {
                if (!mobileQuery.matches) {
                    return;
                }

                event.preventDefault();

                applyView(
                    link.dataset.mobileTab,
                    {
                        updateHistory: true,
                        scroll: true,
                    }
                );
            }
        );
    });


    window.addEventListener(
        "hashchange",
        () => {
            applyView(
                currentViewFromHash()
            );
        }
    );


    mobileQuery.addEventListener?.(
        "change",
        () => {
            applyView(
                currentViewFromHash()
            );
        }
    );


    applyView(
        currentViewFromHash()
    );
}



/* =====================================================
   MOBILE UX · compact filters + progressive analysis
===================================================== */

document.addEventListener("click", (event) => {
    const moreButton =
        event.target.closest("[data-mobile-filter-more]");

    if (moreButton) {
        const dock =
            moreButton.closest(".filter-dock");

        if (!dock) return;

        const isOpen =
            dock.classList.toggle(
                "is-mobile-tools-open"
            );

        moreButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        return;
    }

});


/*
 * viewport가 desktop으로 돌아가면
 * mobile 전용 접힘 상태가 layout에 영향을 주지 않도록 정리합니다.
 */
window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
        document
            .querySelectorAll(
                ".filter-dock.is-mobile-tools-open"
            )
            .forEach((dock) => {
                dock.classList.remove(
                    "is-mobile-tools-open"
                );

                dock
                    .querySelector(
                        "[data-mobile-filter-more]"
                    )
                    ?.setAttribute(
                        "aria-expanded",
                        "false"
                    );
            });
    }
});
