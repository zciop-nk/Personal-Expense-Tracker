document.addEventListener("DOMContentLoaded", initExpenseDrawer);

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

    function bindDrawerForm(form) {
        isDirty = false;

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
         * 기존 main.js의 빈 날짜 기본 문구(연도-월-일)를
         * 생성 Drawer에서는 더 자연스러운 안내 문구로 교체합니다.
         * 수정 Drawer는 저장된 날짜를 그대로 보여줍니다.
         */
        const dateInput = liveForm.querySelector("#id_date");
        const dateText = liveForm.querySelector("#formDateText");

        if (dateInput && dateText) {
            if (dateInput.value) {
                dateText.classList.remove("is-placeholder");
            } else {
                dateText.textContent = "날짜를 선택해 주세요";
                dateText.classList.add("is-placeholder");
            }
        }
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

            resultsArea.innerHTML = data.results_html;

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
