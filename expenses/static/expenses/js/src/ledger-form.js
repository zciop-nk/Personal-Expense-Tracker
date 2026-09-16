/* Source module: ledger-form.js. Built into ../ledger.js by tools/build_frontend.py. */
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

        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const viewMonthStart = new Date(year, month, 1);
        next.disabled = viewMonthStart >= currentMonthStart;
        next.setAttribute("aria-disabled", String(next.disabled));

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

            const isFuture = iso > toIso(today);
            if (isFuture) {
                button.disabled = true;
                button.classList.add("is-disabled");
                button.setAttribute("aria-label", `${iso} 미래 날짜는 선택할 수 없어요`);
            } else {
                button.addEventListener("click", () => {
                    selected = iso;
                    input.value = iso;
                    syncText();
                    render();
                });
            }

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
        const candidate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        if (candidate > currentMonthStart) return;
        viewDate = candidate;
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

    let activeOptionIndex = -1;

    function visibleOptions() {
        return options.filter((option) => !option.hidden);
    }

    function setActiveOption(index) {
        const visible = visibleOptions();
        options.forEach((option) => {
            option.classList.remove("is-keyboard-active");
            option.setAttribute("aria-selected", "false");
        });
        if (!visible.length) {
            activeOptionIndex = -1;
            return;
        }
        activeOptionIndex = (index + visible.length) % visible.length;
        const active = visible[activeOptionIndex];
        active.classList.add("is-keyboard-active");
        active.setAttribute("aria-selected", "true");
        active.scrollIntoView({ block: "nearest" });
    }

    searchInput.addEventListener("focus", openDropdown);
    searchInput.addEventListener("click", openDropdown);
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDropdown();
            return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openDropdown();
            const visible = visibleOptions();
            if (!visible.length) return;
            const current = visible.findIndex((option) => option.classList.contains("is-keyboard-active"));
            setActiveOption(event.key === "ArrowDown" ? current + 1 : (current < 0 ? visible.length - 1 : current - 1));
            return;
        }
        if (event.key === "Enter" && !dropdown.hidden) {
            const active = visibleOptions().find((option) => option.classList.contains("is-keyboard-active"));
            if (active) {
                event.preventDefault();
                active.click();
            }
        }
    });

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
    activeOptionIndex = -1;
    options.forEach((option) => option.classList.remove("is-keyboard-active"));
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


function initHomeMonthNavigation() {
    const home = document.querySelector("#homeArea");
    if (!home) return;

    let activeRequest = null;

    function parseMonth(value) {
        const match = /^(\d{4})-(\d{2})$/.exec(value || "");
        if (!match) return null;

        return {
            year: Number(match[1]),
            month: Number(match[2]),
        };
    }

    function toMonthKey(year, month) {
        const index = year * 12 + (month - 1);
        const normalizedYear = Math.floor(index / 12);
        const normalizedMonth = ((index % 12) + 12) % 12 + 1;

        return `${String(normalizedYear).padStart(4, "0")}-${String(normalizedMonth).padStart(2, "0")}`;
    }

    function shiftMonth(value, amount) {
        const parsed = parseMonth(value);
        if (!parsed) return value;

        return toMonthKey(
            parsed.year,
            parsed.month + amount
        );
    }

    function updateUrl(month, currentMonth) {
        const url = new URL(window.location.href);

        if (month === currentMonth) {
            url.searchParams.delete("home_month");
        } else {
            url.searchParams.set("home_month", month);
        }

        history.replaceState(
            null,
            "",
            `${url.pathname}${url.search}${url.hash}`
        );
    }

    async function loadMonth(month) {
        const nav =
            document.querySelector("[data-home-month-nav]");

        if (!nav) return;

        const currentMonth =
            nav.dataset.currentMonth || "";

        const target =
            month > currentMonth
                ? currentMonth
                : month;

        if (!target) return;

        if (activeRequest) {
            activeRequest.abort();
        }

        activeRequest =
            new AbortController();

        home.classList.add("is-home-loading");

        try {
            const response = await fetch(
                `/home/month/?month=${encodeURIComponent(target)}`,
                {
                    credentials: "same-origin",
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    signal: activeRequest.signal,
                }
            );

            if (!response.ok) {
                throw new Error(
                    `home month ${response.status}`
                );
            }

            const data =
                await response.json();

            if (!data.home_html) {
                throw new Error(
                    "missing home_html"
                );
            }

            home.innerHTML =
                data.home_html;

            const nextNav =
                document.querySelector(
                    "[data-home-month-nav]"
                );

            updateUrl(
                data.selected_month || target,
                nextNav?.dataset.currentMonth ||
                    currentMonth
            );
        } catch (error) {
            if (
                error.name !==
                "AbortError"
            ) {
                console.error(error);
            }
        } finally {
            home.classList.remove(
                "is-home-loading"
            );

            activeRequest = null;
        }
    }

    function renderPicker(nav) {
        const grid =
            nav.querySelector(
                "[data-home-month-grid]"
            );

        const yearLabel =
            nav.querySelector(
                "[data-home-picker-year]"
            );

        if (!grid || !yearLabel) {
            return;
        }

        const selected =
            parseMonth(
                nav.dataset.selectedMonth
            );

        const current =
            parseMonth(
                nav.dataset.currentMonth
            );

        const year =
            Number(
                grid.dataset.pickerYear
            ) ||
            selected?.year ||
            current?.year ||
            new Date().getFullYear();

        grid.dataset.pickerYear =
            String(year);

        yearLabel.textContent =
            `${year}년`;

        grid.replaceChildren();

        for (
            let month = 1;
            month <= 12;
            month += 1
        ) {
            const value =
                toMonthKey(year, month);

            const button =
                document.createElement(
                    "button"
                );

            button.type = "button";
            button.className =
                "home-month-option";
            button.dataset.homeMonthValue =
                value;
            button.textContent =
                `${month}월`;

            if (
                value ===
                nav.dataset.selectedMonth
            ) {
                button.setAttribute(
                    "aria-pressed",
                    "true"
                );
            }

            if (
                current &&
                value >
                    nav.dataset.currentMonth
            ) {
                button.disabled = true;
            }

            grid.appendChild(button);
        }

        const nextYearButton =
            nav.querySelector(
                '[data-home-year-step="1"]'
            );

        if (
            nextYearButton &&
            current
        ) {
            nextYearButton.disabled =
                year >= current.year;
        }
    }

    document.addEventListener(
        "click",
        (event) => {
            const currentNav =
                document.querySelector(
                    "[data-home-month-nav]"
                );

            if (!currentNav) return;

            const picker =
                currentNav.querySelector(
                    "#homeMonthPicker"
                );

            const toggle =
                currentNav.querySelector(
                    "[data-home-month-toggle]"
                );

            const nav =
                event.target.closest(
                    "[data-home-month-nav]"
                );

            if (!nav) {
                if (
                    picker &&
                    !picker.hidden
                ) {
                    picker.hidden = true;
                    toggle?.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }
                return;
            }

            const stepButton =
                event.target.closest(
                    "[data-home-month-step]"
                );

            if (stepButton) {
                if (
                    stepButton.disabled
                ) {
                    return;
                }

                loadMonth(
                    shiftMonth(
                        nav.dataset.selectedMonth,
                        Number(
                            stepButton.dataset
                                .homeMonthStep
                        )
                    )
                );
                return;
            }

            const currentButton =
                event.target.closest(
                    "[data-home-current]"
                );

            if (currentButton) {
                if (
                    !currentButton.disabled
                ) {
                    loadMonth(
                        nav.dataset.currentMonth
                    );
                }
                return;
            }

            const monthToggle =
                event.target.closest(
                    "[data-home-month-toggle]"
                );

            if (monthToggle) {
                const monthPicker =
                    nav.querySelector(
                        "#homeMonthPicker"
                    );

                monthPicker.hidden =
                    !monthPicker.hidden;

                monthToggle.setAttribute(
                    "aria-expanded",
                    String(
                        !monthPicker.hidden
                    )
                );

                if (
                    !monthPicker.hidden
                ) {
                    const selected =
                        parseMonth(
                            nav.dataset
                                .selectedMonth
                        );

                    const grid =
                        nav.querySelector(
                            "[data-home-month-grid]"
                        );

                    if (
                        grid &&
                        selected
                    ) {
                        grid.dataset.pickerYear =
                            String(
                                selected.year
                            );
                    }

                    renderPicker(nav);
                }

                return;
            }

            const yearStep =
                event.target.closest(
                    "[data-home-year-step]"
                );

            if (yearStep) {
                if (
                    yearStep.disabled
                ) {
                    return;
                }

                const grid =
                    nav.querySelector(
                        "[data-home-month-grid]"
                    );

                grid.dataset.pickerYear =
                    String(
                        Number(
                            grid.dataset
                                .pickerYear
                        ) +
                        Number(
                            yearStep.dataset
                                .homeYearStep
                        )
                    );

                renderPicker(nav);
                return;
            }

            const monthOption =
                event.target.closest(
                    "[data-home-month-value]"
                );

            if (monthOption) {
                loadMonth(
                    monthOption.dataset
                        .homeMonthValue
                );
            }
        }
    );
}

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
    function closeBudget() {
        ++requestNumber;
        document.body.classList.remove("budget-sheet-open");
        dialog.close();
        trigger?.focus();
    }
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
                if(home){
                    home.innerHTML=data.home_html;

                    const nav=home.querySelector("[data-home-month-nav]");
                    if(nav&&data.selected_month){
                        const url=new URL(window.location.href);
                        if(data.selected_month===nav.dataset.currentMonth){
                            url.searchParams.delete("home_month");
                        }else{
                            url.searchParams.set("home_month",data.selected_month);
                        }
                        history.replaceState(null,"",`${url.pathname}${url.search}${url.hash}`);
                    }

                    closeBudget();
                    const notice=document.createElement("p");
                    notice.className="expense-drawer-toast";
                    notice.role="status";
                    notice.textContent="월 예산을 저장했어요.";
                    document.body.appendChild(notice);
                    setTimeout(()=>notice.remove(),3000);
                }
                else window.location.assign("/");
            }catch(e){error.textContent=e.message;error.hidden=false;}
            finally{submit.disabled=false;submit.textContent="예산 저장";}
        });
    }
    document.addEventListener("click",async event=>{
        const link=event.target.closest("[data-budget-open]");
        if(link){
            event.preventDefault();
            trigger=link;
            body.textContent="예산을 불러오는 중…";
            document.body.classList.add("budget-sheet-open");
            dialog.showModal();
            try{
                await loadBudget(link.dataset.budgetMonth || "");
            }catch(e){
                body.textContent=e.message;
            }
            return;
        }
        if(event.target.closest("[data-budget-close]")&&dialog.open){event.preventDefault();closeBudget();}
        const form=document.querySelector('[data-budget-form]');
        if(form&&!event.target.closest('.budget-month-field')){form.querySelector('#budgetMonthPicker').hidden=true;form.querySelector('[data-month-toggle]').setAttribute('aria-expanded','false');}
    });
    dialog.addEventListener("click",event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeBudget();}});
    dialog.addEventListener("cancel",()=>{++requestNumber;document.body.classList.remove("budget-sheet-open");});
    bindBudget(document.querySelector("[data-budget-form]"));
});

function formatKoreanMoneyUnit(amount) {
    let value = Math.floor(Number(amount));

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return "";
    }

    const units = [
        [100000000, "억"],
        [10000, "만"],
        [1000, "천"],
        [100, "백"],
        [10, "십"],
    ];

    const parts = [];

    units.forEach(([unit, label]) => {
        const count =
            Math.floor(value / unit);

        if (count <= 0) return;

        /*
         * 1천 → 천
         * 1만 → 만
         */
        parts.push(
            `${count === 1 ? "" : count}${label}`
        );

        value %= unit;
    });

    if (value > 0) {
        parts.push(String(value));
    }

    return `${parts.join(" ")} 원`;
}


function updateMoneyGuide(input) {
    const field =
        input.closest(".field-group");

    const guide =
        field?.querySelector(
            "[data-money-guide]"
        );

    if (!guide) return;

    const amount =
        Number(input.value || 0);

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        guide.textContent = "";
        return;
    }

    guide.textContent =
        `${amount.toLocaleString("ko-KR")}원 · ` +
        formatKoreanMoneyUnit(amount);
}

document.addEventListener(
    "input",
    (event) => {
        const input =
            event.target.closest(
                ".amount-input-wrap input"
            );

        if (!input) return;

        updateMoneyGuide(input);
    }
);

document.addEventListener(
    "focusin",
    (event) => {
        const input =
            event.target.closest(
                ".amount-input-wrap input"
            );

        if (!input) return;

        updateMoneyGuide(input);
    }
);



/* =====================================================
   MOBILE IA · 가계부 / 분석
===================================================== */

