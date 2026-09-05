/* =========================================================
   MONEYLEAK
   PERSONAL FINANCE OS
   CORE APPLICATION ENGINE
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       STORAGE
       ===================================================== */

    const STORAGE = {
        transactions: "moneyLeakTransactions",
        goals: "moneyLeakSavingsGoals",
        legacyGoal: "moneyLeakSavingsGoal",
        monthlyBudget: "moneyLeakMonthlyBudget",
        categoryBudgets: "moneyLeakCategoryBudgets",
        recurring: "moneyLeakRecurringTransactions",
        settings: "moneyLeakSettings",
        alerts: "moneyLeakAlerts",
        notificationHistory: "moneyLeakNotificationHistory",
        initialized: "moneyLeakInitialized"
    };

    const DEFAULT_SETTINGS = {
        currency: "NGN",
        name: "My Money",
        theme: "light",
        notifications: true,
        compactNumbers: false
    };

    const CATEGORIES = [
        "Food",
        "Transport",
        "Shopping",
        "Bills",
        "Housing",
        "Health",
        "Education",
        "Entertainment",
        "Subscriptions",
        "Travel",
        "Family",
        "Personal",
        "Other"
    ];

    const INCOME_SOURCES = [
        "Salary",
        "Freelance",
        "Business",
        "Investment",
        "Gift",
        "Bonus",
        "Allowance",
        "Other"
    ];

    const CURRENCY_INFO = {
        NGN: {
            symbol: "₦",
            name: "Nigerian Naira",
            locale: "en-NG"
        },
        USD: {
            symbol: "$",
            name: "US Dollar",
            locale: "en-US"
        },
        GBP: {
            symbol: "£",
            name: "British Pound",
            locale: "en-GB"
        },
        EUR: {
            symbol: "€",
            name: "Euro",
            locale: "de-DE"
        },
        CAD: {
            symbol: "CA$",
            name: "Canadian Dollar",
            locale: "en-CA"
        },
        AUD: {
            symbol: "A$",
            name: "Australian Dollar",
            locale: "en-AU"
        },
        GHS: {
            symbol: "GH₵",
            name: "Ghanaian Cedi",
            locale: "en-GH"
        },
        KES: {
            symbol: "KSh",
            name: "Kenyan Shilling",
            locale: "en-KE"
        },
        ZAR: {
            symbol: "R",
            name: "South African Rand",
            locale: "en-ZA"
        }
    };

    /* =====================================================
       BASIC UTILITIES
       ===================================================== */

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);

            if (!raw) {
                return fallback;
            }

            return JSON.parse(raw);
        } catch (error) {
            console.warn(
                "MoneyLeak storage read error:",
                key,
                error
            );

            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(
                key,
                JSON.stringify(value)
            );

            return true;
        } catch (error) {
            console.error(
                "MoneyLeak storage write error:",
                key,
                error
            );

            return false;
        }
    }

    function removeStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(error);
        }
    }

    function uid(prefix = "ml") {
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 9)
        );
    }

    function number(value) {
        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }

    function clamp(value, min, max) {
        return Math.min(
            max,
            Math.max(min, value)
        );
    }

    function escapeHTML(value) {
        return String(
            value ?? ""
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function todayISO() {
        const date = new Date();

        const y = date.getFullYear();
        const m = String(
            date.getMonth() + 1
        ).padStart(2, "0");
        const d = String(
            date.getDate()
        ).padStart(2, "0");

        return `${y}-${m}-${d}`;
    }

    function parseDate(value) {
        if (!value) {
            return new Date();
        }

        const date = new Date(value);

        return Number.isNaN(
            date.getTime()
        )
            ? new Date()
            : date;
    }

    function formatDate(value) {
        const date = parseDate(value);

        return date.toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
    }

    function formatShortDate(value) {
        const date = parseDate(value);

        return date.toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short"
            }
        );
    }

    function dispatchUpdate() {
        window.dispatchEvent(
            new CustomEvent(
                "moneyLeakUpdated"
            )
        );
    }

    /* =====================================================
       SETTINGS
       ===================================================== */

    function getSettings() {
        const saved =
            readJSON(
                STORAGE.settings,
                {}
            );

        return {
            ...DEFAULT_SETTINGS,
            ...(saved || {})
        };
    }

    function saveSettings(next) {
        const current =
            getSettings();

        const settings = {
            ...current,
            ...(next || {})
        };

        writeJSON(
            STORAGE.settings,
            settings
        );

        applySettings();

        dispatchUpdate();

        return settings;
    }

    function applySettings() {
        const settings =
            getSettings();

        const theme =
            settings.theme === "dark"
                ? "dark"
                : "light";

        document.documentElement
            .setAttribute(
                "data-theme",
                theme
            );

        document.body?.setAttribute(
            "data-theme",
            theme
        );

        document.documentElement
            .style
            .setProperty(
                "--ml-currency-symbol",
                CURRENCY_INFO[
                    settings.currency
                ]?.symbol ||
                    "₦"
            );
    }

    /* =====================================================
       CURRENCY
       ===================================================== */

    function getCurrencyInfo() {
        const settings =
            getSettings();

        return (
            CURRENCY_INFO[
                settings.currency
            ] ||
            CURRENCY_INFO.NGN
        );
    }

    function displayCurrency(
        value,
        options = {}
    ) {
        const amount =
            number(value);

        const settings =
            getSettings();

        const info =
            getCurrencyInfo();

        const compact =
            options.compact ??
            settings.compactNumbers;

        if (compact) {
            try {
                return new Intl.NumberFormat(
                    info.locale,
                    {
                        style: "currency",
                        currency:
                            settings.currency,
                        notation: "compact",
                        maximumFractionDigits: 1
                    }
                ).format(amount);
            } catch {
                return (
                    info.symbol +
                    Math.round(
                        amount
                    ).toLocaleString()
                );
            }
        }

        try {
            return new Intl.NumberFormat(
                info.locale,
                {
                    style: "currency",
                    currency:
                        settings.currency,
                    maximumFractionDigits: 0
                }
            ).format(amount);
        } catch {
            return (
                info.symbol +
                Math.round(
                    amount
                ).toLocaleString()
            );
        }
    }

    /* =====================================================
       TRANSACTIONS
       ===================================================== */

    function normalizeTransaction(
        transaction
    ) {
        const item =
            transaction || {};

        const type =
            item.type === "income"
                ? "income"
                : "expense";

        return {
            id:
                item.id ||
                uid("tx"),
            type,
            amount: Math.abs(
                number(item.amount)
            ),
            category:
                item.category ||
                (type === "income"
                    ? "Other"
                    : "Other"),
            source:
                item.source ||
                (type === "income"
                    ? "Other"
                    : ""),
            description:
                item.description ||
                "",
            date:
                item.date ||
                todayISO(),
            createdAt:
                item.createdAt ||
                new Date().toISOString()
        };
    }

    function getTransactions() {
        const saved =
            readJSON(
                STORAGE.transactions,
                []
            );

        if (!Array.isArray(saved)) {
            return [];
        }

        return saved.map(
            normalizeTransaction
        );
    }

    function saveTransactions(
        transactions
    ) {
        writeJSON(
            STORAGE.transactions,
            transactions
                .map(
                    normalizeTransaction
                )
        );

        dispatchUpdate();
    }

    function addTransaction(
        transaction
    ) {
        const item =
            normalizeTransaction(
                transaction
            );

        const transactions =
            getTransactions();

        transactions.unshift(
            item
        );

        saveTransactions(
            transactions
        );

        generateAlerts();

        return item;
    }

    function updateTransaction(
        id,
        updates
    ) {
        const transactions =
            getTransactions();

        const index =
            transactions.findIndex(
                (item) =>
                    item.id === id
            );

        if (index === -1) {
            return null;
        }

        transactions[index] =
            normalizeTransaction({
                ...transactions[index],
                ...(updates || {}),
                id
            });

        saveTransactions(
            transactions
        );

        generateAlerts();

        return transactions[index];
    }

    function deleteTransaction(id) {
        const transactions =
            getTransactions();

        const next =
            transactions.filter(
                (item) =>
                    item.id !== id
            );

        saveTransactions(
            next
        );

        generateAlerts();

        return true;
    }

    function clearTransactions() {
        writeJSON(
            STORAGE.transactions,
            []
        );

        dispatchUpdate();
    }

    /* =====================================================
       DATE / PERIOD
       ===================================================== */

    function isSameMonth(
        value,
        date = new Date()
    ) {
        const d =
            parseDate(value);

        return (
            d.getFullYear() ===
                date.getFullYear() &&
            d.getMonth() ===
                date.getMonth()
        );
    }

    function getPeriodTransactions(
        period = "month",
        baseDate = new Date()
    ) {
        const transactions =
            getTransactions();

        const base =
            parseDate(baseDate);

        return transactions.filter(
            (transaction) => {
                const date =
                    parseDate(
                        transaction.date
                    );

                if (
                    period === "year"
                ) {
                    return (
                        date.getFullYear() ===
                        base.getFullYear()
                    );
                }

                if (
                    period === "quarter"
                ) {
                    const baseQuarter =
                        Math.floor(
                            base.getMonth() /
                                3
                        );

                    const dateQuarter =
                        Math.floor(
                            date.getMonth() /
                                3
                        );

                    return (
                        date.getFullYear() ===
                            base.getFullYear() &&
                        dateQuarter ===
                            baseQuarter
                    );
                }

                return isSameMonth(
                    date,
                    base
                );
            }
        );
    }

    function getPreviousMonthTransactions() {
        const now =
            new Date();

        const previous =
            new Date(
                now.getFullYear(),
                now.getMonth() - 1,
                1
            );

        return getPeriodTransactions(
            "month",
            previous
        );
    }

    function totalsFor(
        transactions
    ) {
        let income = 0;
        let expenses = 0;

        transactions.forEach(
            (transaction) => {
                if (
                    transaction.type ===
                    "income"
                ) {
                    income +=
                        number(
                            transaction.amount
                        );
                } else {
                    expenses +=
                        number(
                            transaction.amount
                        );
                }
            }
        );

        return {
            income,
            expenses,
            cashFlow:
                income - expenses
        };
    }

    function getMonthlyTotals() {
        return totalsFor(
            getPeriodTransactions(
                "month"
            )
        );
    }

    function getPreviousMonthlyTotals() {
        return totalsFor(
            getPreviousMonthTransactions()
        );
    }

    /* =====================================================
       CATEGORY ANALYSIS
       ===================================================== */

    function getCategoryTotals(
        transactions =
            getPeriodTransactions(
                "month"
            )
    ) {
        const totals = {};

        transactions.forEach(
            (transaction) => {
                if (
                    transaction.type !==
                    "expense"
                ) {
                    return;
                }

                const category =
                    transaction.category ||
                    "Other";

                totals[category] =
                    (totals[category] ||
                        0) +
                    number(
                        transaction.amount
                    );
            }
        );

        return totals;
    }

    function getTopCategories(
        transactions =
            getPeriodTransactions(
                "month"
            ),
        limit = 5
    ) {
        const totals =
            getCategoryTotals(
                transactions
            );

        return Object.entries(
            totals
        )
            .map(
                ([category, amount]) => ({
                    category,
                    amount
                })
            )
            .sort(
                (a, b) =>
                    b.amount -
                    a.amount
            )
            .slice(0, limit);
    }

    function getLargestExpense(
        transactions =
            getTransactions()
    ) {
        return (
            transactions
                .filter(
                    (item) =>
                        item.type ===
                        "expense"
                )
                .sort(
                    (a, b) =>
                        b.amount -
                        a.amount
                )[0] || null
        );
    }

    /* =====================================================
       SAVINGS GOALS
       ===================================================== */

    function normalizeGoal(goal) {
        const item =
            goal || {};

        return {
            id:
                item.id ||
                uid("goal"),
            name:
                item.name ||
                "Savings Goal",
            target: Math.max(
                0,
                number(
                    item.target
                )
            ),
            current: Math.max(
                0,
                number(
                    item.current
                )
            ),
            deadline:
                item.deadline ||
                "",
            color:
                item.color ||
                "#087a5a",
            description:
                item.description ||
                "",
            createdAt:
                item.createdAt ||
                new Date().toISOString()
        };
    }

    function getSavingsGoals() {
        let goals =
            readJSON(
                STORAGE.goals,
                []
            );

        if (
            !Array.isArray(goals)
        ) {
            goals = [];
        }

        /*
           Migrate the older single-goal
           MoneyLeak system.
        */

        if (
            goals.length === 0
        ) {
            const legacy =
                readJSON(
                    STORAGE.legacyGoal,
                    null
                );

            if (
                legacy &&
                typeof legacy ===
                    "object"
            ) {
                goals = [
                    normalizeGoal({
                        name:
                            legacy.name ||
                            "Main Savings Goal",
                        target:
                            legacy.target ||
                            legacy.goal ||
                            0,
                        current:
                            legacy.current ||
                            legacy.saved ||
                            0,
                        deadline:
                            legacy.deadline ||
                            ""
                    })
                ];

                writeJSON(
                    STORAGE.goals,
                    goals
                );
            }
        }

        return goals.map(
            normalizeGoal
        );
    }

    function saveSavingsGoals(
        goals
    ) {
        writeJSON(
            STORAGE.goals,
            goals.map(
                normalizeGoal
            )
        );

        dispatchUpdate();
    }

    function addSavingsGoal(
        goal
    ) {
        const goals =
            getSavingsGoals();

        const item =
            normalizeGoal(goal);

        goals.push(item);

        saveSavingsGoals(
            goals
        );

        return item;
    }

    function updateSavingsGoal(
        id,
        updates
    ) {
        const goals =
            getSavingsGoals();

        const index =
            goals.findIndex(
                (goal) =>
                    goal.id === id
            );

        if (index === -1) {
            return null;
        }

        goals[index] =
            normalizeGoal({
                ...goals[index],
                ...(updates || {}),
                id
            });

        saveSavingsGoals(
            goals
        );

        return goals[index];
    }

    function deleteSavingsGoal(id) {
        const goals =
            getSavingsGoals();

        saveSavingsGoals(
            goals.filter(
                (goal) =>
                    goal.id !== id
            )
        );

        return true;
    }

    function getSavingsProgress() {
        const goals =
            getSavingsGoals();

        const target =
            goals.reduce(
                (sum, goal) =>
                    sum +
                    number(
                        goal.target
                    ),
                0
            );

        const current =
            goals.reduce(
                (sum, goal) =>
                    sum +
                    number(
                        goal.current
                    ),
                0
            );

        const percentage =
            target > 0
                ? clamp(
                      (current /
                          target) *
                          100,
                      0,
                      100
                  )
                : 0;

        return {
            target,
            current,
            percentage,
            count:
                goals.length
        };
    }

    /* =====================================================
       BUDGETS
       ===================================================== */

    function getMonthlyBudget() {
        return Math.max(
            0,
            number(
                readJSON(
                    STORAGE.monthlyBudget,
                    0
                )
            )
        );
    }

    function setMonthlyBudget(
        amount
    ) {
        const value =
            Math.max(
                0,
                number(amount)
            );

        writeJSON(
            STORAGE.monthlyBudget,
            value
        );

        generateAlerts();
        dispatchUpdate();

        return value;
    }

    function getCategoryBudgets() {
        const budgets =
            readJSON(
                STORAGE.categoryBudgets,
                {}
            );

        return budgets &&
            typeof budgets ===
                "object"
            ? budgets
            : {};
    }

    function setCategoryBudget(
        category,
        amount
    ) {
        const budgets =
            getCategoryBudgets();

        const value =
            Math.max(
                0,
                number(amount)
            );

        if (
            value === 0
        ) {
            delete budgets[
                category
            ];
        } else {
            budgets[
                category
            ] = value;
        }

        writeJSON(
            STORAGE.categoryBudgets,
            budgets
        );

        generateAlerts();
        dispatchUpdate();

        return budgets;
    }

    function getBudgetStats() {
        const monthlyBudget =
            getMonthlyBudget();

        const spent =
            getMonthlyTotals()
                .expenses;

        const remaining =
            monthlyBudget > 0
                ? monthlyBudget -
                  spent
                : 0;

        const percentage =
            monthlyBudget > 0
                ? (spent /
                      monthlyBudget) *
                  100
                : 0;

        return {
            monthlyBudget,
            spent,
            remaining,
            percentage
        };
    }

    /* =====================================================
       RECURRING TRANSACTIONS
       ===================================================== */

    function normalizeRecurring(
        item
    ) {
        const value =
            item || {};

        return {
            id:
                value.id ||
                uid("rec"),
            name:
                value.name ||
                "Recurring payment",
            amount: Math.abs(
                number(
                    value.amount
                )
            ),
            type:
                value.type ===
                "income"
                    ? "income"
                    : "expense",
            category:
                value.category ||
                "Bills",
            frequency:
                value.frequency ||
                "monthly",
            nextDate:
                value.nextDate ||
                todayISO(),
            description:
                value.description ||
                "",
            createdAt:
                value.createdAt ||
                new Date().toISOString()
        };
    }

    function getRecurringTransactions() {
        const saved =
            readJSON(
                STORAGE.recurring,
                []
            );

        if (
            !Array.isArray(saved)
        ) {
            return [];
        }

        return saved.map(
            normalizeRecurring
        );
    }

    function saveRecurringTransactions(
        items
    ) {
        writeJSON(
            STORAGE.recurring,
            items.map(
                normalizeRecurring
            )
        );

        dispatchUpdate();
    }

    function addRecurringTransaction(
        item
    ) {
        const items =
            getRecurringTransactions();

        const normalized =
            normalizeRecurring(
                item
            );

        items.push(
            normalized
        );

        saveRecurringTransactions(
            items
        );

        return normalized;
    }

    function updateRecurringTransaction(
        id,
        updates
    ) {
        const items =
            getRecurringTransactions();

        const index =
            items.findIndex(
                (item) =>
                    item.id === id
            );

        if (index === -1) {
            return null;
        }

        items[index] =
            normalizeRecurring({
                ...items[index],
                ...(updates || {}),
                id
            });

        saveRecurringTransactions(
            items
        );

        return items[index];
    }

    function deleteRecurringTransaction(
        id
    ) {
        const items =
            getRecurringTransactions();

        saveRecurringTransactions(
            items.filter(
                (item) =>
                    item.id !== id
            )
        );

        return true;
    }

    function recurringMonthlyAmount(
        item
    ) {
        const amount =
            number(
                item.amount
            );

        switch (
            item.frequency
        ) {
            case "weekly":
                return (
                    amount *
                    52 /
                    12
                );

            case "yearly":
                return (
                    amount / 12
                );

            default:
                return amount;
        }
    }

    function getRecurringStats() {
        const items =
            getRecurringTransactions();

        let income = 0;
        let expenses = 0;

        items.forEach(
            (item) => {
                const monthly =
                    recurringMonthlyAmount(
                        item
                    );

                if (
                    item.type ===
                    "income"
                ) {
                    income +=
                        monthly;
                } else {
                    expenses +=
                        monthly;
                }
            }
        );

        return {
            income,
            expenses,
            net:
                income -
                expenses,
            count:
                items.length
        };
    }

    /* =====================================================
       FINANCIAL HEALTH
       ===================================================== */

    function calculateFinancialHealth() {
        const totals =
            getMonthlyTotals();

        const budget =
            getBudgetStats();

        const savings =
            getSavingsProgress();

        const recurring =
            getRecurringStats();

        let spendingFactor = 0;
        let budgetFactor = 0;
        let savingsFactor = 0;
        let recurringFactor = 0;

        if (
            totals.income > 0
        ) {
            const expenseRatio =
                totals.expenses /
                totals.income;

            spendingFactor =
                clamp(
                    100 -
                        expenseRatio *
                            100,
                    0,
                    100
                );
        } else {
            spendingFactor =
                totals.expenses === 0
                    ? 60
                    : 25;
        }

        if (
            budget.monthlyBudget >
            0
        ) {
            budgetFactor =
                clamp(
                    100 -
                        budget.percentage,
                    0,
                    100
                );
        } else {
            budgetFactor = 60;
        }

        if (
            savings.target > 0
        ) {
            savingsFactor =
                clamp(
                    savings.percentage,
                    0,
                    100
                );
        } else if (
            totals.cashFlow > 0
        ) {
            savingsFactor = 65;
        } else {
            savingsFactor = 35;
        }

        if (
            totals.income > 0
        ) {
            const recurringRatio =
                recurring.expenses /
                totals.income;

            recurringFactor =
                clamp(
                    100 -
                        recurringRatio *
                            100,
                    0,
                    100
                );
        } else {
            recurringFactor = 60;
        }

        const score = Math.round(
            spendingFactor *
                0.35 +
                budgetFactor *
                0.25 +
                savingsFactor *
                0.25 +
                recurringFactor *
                0.15
        );

        let status =
            "Needs attention";

        let message =
            "Your finances need a little more attention.";

        if (
            score >= 85
        ) {
            status =
                "Excellent";

            message =
                "You're building strong financial habits.";
        } else if (
            score >= 70
        ) {
            status =
                "Strong";

            message =
                "Your financial position is looking healthy.";
        } else if (
            score >= 50
        ) {
            status =
                "Fair";

            message =
                "You're doing okay, but there is room to improve.";
        }

        return {
            score: clamp(
                score,
                0,
                100
            ),
            status,
            message,
            spendingFactor:
                Math.round(
                    spendingFactor
                ),
            budgetFactor:
                Math.round(
                    budgetFactor
                ),
            savingsFactor:
                Math.round(
                    savingsFactor
                ),
            recurringFactor:
                Math.round(
                    recurringFactor
                )
        };
    }

    /* =====================================================
       SAFE TO SPEND
       ===================================================== */

    function getSafeToSpend() {
        const totals =
            getMonthlyTotals();

        const budget =
            getMonthlyBudget();

        if (
            budget > 0
        ) {
            return {
                amount: Math.max(
                    0,
                    budget -
                        totals.expenses
                ),
                source: "budget"
            };
        }

        if (
            totals.income > 0
        ) {
            return {
                amount: Math.max(
                    0,
                    totals.income -
                        totals.expenses
                ),
                source: "cashflow"
            };
        }

        return {
            amount: 0,
            source: "none"
        };
    }

    /* =====================================================
       SMART INSIGHT
       ===================================================== */

    function getSmartInsight() {
        const totals =
            getMonthlyTotals();

        const previous =
            getPreviousMonthlyTotals();

        const top =
            getTopCategories(
                getPeriodTransactions(
                    "month"
                ),
                1
            )[0];

        const savings =
            getSavingsProgress();

        const budget =
            getBudgetStats();

        if (
            totals.income === 0 &&
            totals.expenses === 0
        ) {
            return {
                title:
                    "Your financial picture",
                text:
                    "Add your first income or expense and MoneyLeak will start analyzing your finances."
            };
        }

        if (
            totals.cashFlow < 0
        ) {
            return {
                title:
                    "Your cash flow needs attention",
                text:
                    `You're spending ${displayCurrency(
                        Math.abs(
                            totals.cashFlow
                        )
                    )} more than you're earning this month.`
            };
        }

        if (
            budget.monthlyBudget >
                0 &&
            budget.percentage >=
                80
        ) {
            return {
                title:
                    "Your budget is getting tight",
                text:
                    `You've used ${Math.round(
                        budget.percentage
                    )}% of your monthly budget.`
            };
        }

        if (
            top &&
            totals.expenses > 0
        ) {
            const percentage =
                (top.amount /
                    totals.expenses) *
                100;

            if (
                percentage >=
                35
            ) {
                return {
                    title:
                        `${top.category} is your biggest leak`,
                    text:
                        `${top.category} accounts for about ${Math.round(
                            percentage
                        )}% of your spending this month.`
                };
            }
        }

        if (
            savings.target > 0 &&
            savings.percentage >=
                50
        ) {
            return {
                title:
                    "You're making real savings progress",
                text:
                    `Your savings goals are ${Math.round(
                        savings.percentage
                    )}% complete.`
            };
        }

        if (
            previous.income > 0 &&
            totals.income >
                previous.income
        ) {
            const growth =
                ((totals.income -
                    previous.income) /
                    previous.income) *
                100;

            return {
                title:
                    "Income is trending upward",
                text:
                    `Your income is up about ${Math.round(
                        growth
                    )}% compared with last month.`
            };
        }

        return {
            title:
                "Your money is moving in the right direction",
            text:
                `Your current monthly cash flow is positive by ${displayCurrency(
                    totals.cashFlow
                )}.`
        };
    }

    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    function notificationId(
        prefix = "notice"
    ) {
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 8)
        );
    }

    function getNotificationHistory() {
        const history =
            readJSON(
                STORAGE.notificationHistory,
                []
            );

        return Array.isArray(
            history
        )
            ? history
            : [];
    }

    function saveNotificationHistory(
        history
    ) {
        writeJSON(
            STORAGE.notificationHistory,
            history
                .slice(0, 100)
        );
    }

    function createNotification({
        id,
        type = "info",
        title,
        text,
        page = "",
        icon = "✦"
    }) {
        return {
            id:
                id ||
                notificationId(),
            type,
            title:
                title ||
                "MoneyLeak insight",
            text:
                text ||
                "",
            page,
            icon,
            read: false,
            createdAt:
                new Date().toISOString()
        };
    }

    function generateAlerts() {
        const totals =
            getMonthlyTotals();

        const budget =
            getBudgetStats();

        const health =
            calculateFinancialHealth();

        const savings =
            getSavingsProgress();

        const top =
            getTopCategories(
                getPeriodTransactions(
                    "month"
                ),
                1
            )[0];

        const current = [];

        /* Negative cash flow */

        if (
            totals.cashFlow < 0
        ) {
            current.push(
                createNotification({
                    id:
                        "negative-cashflow",
                    type:
                        "danger",
                    title:
                        "Your cash flow needs attention",
                    text:
                        `You're spending ${displayCurrency(
                            Math.abs(
                                totals.cashFlow
                            )
                        )} more than you're earning this month.`,
                    page:
                        "expenses.html",
                    icon: "!"
                })
            );
        }

        /* Budget */

        if (
            budget.monthlyBudget >
                0 &&
            budget.percentage >=
                100
        ) {
            current.push(
                createNotification({
                    id:
                        "budget-over",
                    type:
                        "danger",
                    title:
                        "Monthly budget exceeded",
                    text:
                        `You've used ${Math.round(
                            budget.percentage
                        )}% of your ${displayCurrency(
                            budget.monthlyBudget
                        )} monthly budget.`,
                    page:
                        "budgets.html",
                    icon: "⚠"
                })
            );
        } else if (
            budget.monthlyBudget >
                0 &&
            budget.percentage >=
                80
        ) {
            current.push(
                createNotification({
                    id:
                        "budget-warning",
                    type:
                        "warning",
                    title:
                        "You're approaching your budget",
                    text:
                        `You've used ${Math.round(
                            budget.percentage
                        )}% of your monthly spending limit.`,
                    page:
                        "budgets.html",
                    icon: "⚠"
                })
            );
        }

        /* Biggest category */

        if (
            top &&
            totals.expenses > 0
        ) {
            const percentage =
                (top.amount /
                    totals.expenses) *
                100;

            if (
                percentage >=
                35
            ) {
                current.push(
                    createNotification({
                        id:
                            "category-" +
                            top.category
                                .toLowerCase()
                                .replace(
                                    /\s+/g,
                                    "-"
                                ),
                        type:
                            "info",
                        title:
                            `${top.category} is your biggest spending area`,
                        text:
                            `${top.category} represents about ${Math.round(
                                percentage
                            )}% of your spending this month.`,
                        page:
                            "expenses.html",
                        icon: "↘"
                    })
                );
            }
        }

        /* Savings */

        if (
            savings.target >
                0 &&
            savings.percentage >=
                50
        ) {
            current.push(
                createNotification({
                    id:
                        "savings-milestone",
                    type:
                        "success",
                    title:
                        "You're halfway to your savings goals",
                    text:
                        `Your combined savings goals are ${Math.round(
                            savings.percentage
                        )}% complete.`,
                    page:
                        "savings.html",
                    icon: "✓"
                })
            );
        }

        /* Health */

        if (
            health.score >=
            85
        ) {
            current.push(
                createNotification({
                    id:
                        "health-excellent",
                    type:
                        "success",
                    title:
                        "Your financial health is excellent",
                    text:
                        `Your MoneyLeak health score is ${health.score}/100. Keep your current habits consistent.`,
                    page:
                        "analytics.html",
                    icon: "✓"
                })
            );
        } else if (
            health.score < 50
        ) {
            current.push(
                createNotification({
                    id:
                        "health-attention",
                    type:
                        "danger",
                    title:
                        "Your financial health needs attention",
                    text:
                        `Your current MoneyLeak health score is ${health.score}/100. Review your spending and cash flow.`,
                    page:
                        "analytics.html",
                    icon: "!"
                })
            );
        }

        /* Empty account */

        if (
            totals.income === 0 &&
            totals.expenses === 0
        ) {
            current.push(
                createNotification({
                    id:
                        "start-tracking",
                    type:
                        "info",
                    title:
                        "Start building your money picture",
                    text:
                        "Add your first income or expense so MoneyLeak can start analyzing your finances.",
                    page:
                        "income.html",
                    icon: "✦"
                })
            );
        }

        const history =
            getNotificationHistory();

        const existing =
            new Map();

        history.forEach(
            (item) => {
                existing.set(
                    item.id,
                    item
                );
            }
        );

        current.forEach(
            (alert) => {
                if (
                    !existing.has(
                        alert.id
                    )
                ) {
                    history.unshift(
                        alert
                    );
                }
            }
        );

        saveNotificationHistory(
            history
        );

        /*
           Keep the older alerts key compatible
           with the previous MoneyLeak engine.
        */

        writeJSON(
            STORAGE.alerts,
            current
        );

        return current;
    }

    function getAlerts() {
        generateAlerts();

        return getNotificationHistory()
            .sort(
                (a, b) =>
                    new Date(
                        b.createdAt
                    ) -
                    new Date(
                        a.createdAt
                    )
            )
            .slice(0, 50);
    }

    function getUnreadNotificationCount() {
        return getNotificationHistory()
            .filter(
                (item) =>
                    !item.read
            )
            .length;
    }

    function markNotificationRead(
        id
    ) {
        const history =
            getNotificationHistory();

        const item =
            history.find(
                (notification) =>
                    notification.id ===
                    id
            );

        if (item) {
            item.read = true;
        }

        saveNotificationHistory(
            history
        );

        dispatchUpdate();
    }

    function markAllNotificationsRead() {
        const history =
            getNotificationHistory();

        history.forEach(
            (item) => {
                item.read = true;
            }
        );

        saveNotificationHistory(
            history
        );

        dispatchUpdate();
    }

    function clearNotificationHistory() {
        saveNotificationHistory(
            []
        );

        removeStorage(
            STORAGE.alerts
        );

        dispatchUpdate();
    }

    /* =====================================================
       SEARCH ENGINE
       ===================================================== */

    const SEARCH_PAGES = [
        {
            title: "Dashboard",
            description:
                "Your complete financial command center",
            icon: "⌂",
            url: "index.html",
            keywords:
                "dashboard home overview balance money cash flow"
        },
        {
            title: "Income",
            description:
                "Track salary, freelance and other money coming in",
            icon: "↗",
            url: "income.html",
            keywords:
                "income salary earnings money received freelance business"
        },
        {
            title: "Expenses",
            description:
                "Track spending and find your biggest money leaks",
            icon: "↘",
            url: "expenses.html",
            keywords:
                "expense spending spend costs money leak food transport bills"
        },
        {
            title: "Savings Goals",
            description:
                "Build and track your savings targets",
            icon: "◎",
            url: "savings.html",
            keywords:
                "savings saving goal target wealth money future"
        },
        {
            title: "Budgets",
            description:
                "Set spending limits and stay on track",
            icon: "▣",
            url: "budgets.html",
            keywords:
                "budget spending limit monthly category"
        },
        {
            title: "Recurring",
            description:
                "Track subscriptions, bills and regular income",
            icon: "↻",
            url: "recurring.html",
            keywords:
                "recurring subscription rent bills regular payment salary"
        },
        {
            title: "Analytics",
            description:
                "Understand where your money is going",
            icon: "◉",
            url: "analytics.html",
            keywords:
                "analytics analysis charts trends financial health report"
        },
        {
            title: "Settings",
            description:
                "Control your MoneyLeak preferences and data",
            icon: "⚙",
            url: "settings.html",
            keywords:
                "settings currency profile theme notifications data"
        }
    ];

    const SEARCH_ACTIONS = [
        {
            title: "Add income",
            description:
                "Record money you've received",
            icon: "↗",
            url: "income.html",
            keywords:
                "add income salary earnings receive"
        },
        {
            title: "Add expense",
            description:
                "Record something you spent money on",
            icon: "↘",
            url: "expenses.html",
            keywords:
                "add expense spend spending purchase"
        },
        {
            title: "Create savings goal",
            description:
                "Start saving toward something important",
            icon: "◎",
            url: "savings.html",
            keywords:
                "create savings goal target"
        },
        {
            title: "Set a budget",
            description:
                "Give your money a spending limit",
            icon: "▣",
            url: "budgets.html",
            keywords:
                "set budget limit spending"
        },
        {
            title: "View analytics",
            description:
                "Understand where your money is going",
            icon: "◉",
            url: "analytics.html",
            keywords:
                "analytics report charts"
        },
        {
            title: "Manage recurring payments",
            description:
                "Track subscriptions, bills and regular income",
            icon: "↻",
            url: "recurring.html",
            keywords:
                "recurring subscriptions bills"
        }
    ];

    const SEARCH_QUESTIONS = [
        {
            title:
                "Where am I spending the most?",
            description:
                "Find your biggest spending categories",
            icon: "⌕",
            action:
                "top-spending",
            keywords:
                "where spending most biggest category"
        },
        {
            title:
                "Show my largest expenses",
            description:
                "Find your most expensive transactions",
            icon: "↘",
            action:
                "largest-expenses",
            keywords:
                "largest expenses expensive spending"
        },
        {
            title:
                "How much am I saving?",
            description:
                "Review your savings progress",
            icon: "◎",
            action:
                "savings",
            keywords:
                "saving savings progress saved"
        },
        {
            title:
                "Show my recent transactions",
            description:
                "Review your latest money activity",
            icon: "↻",
            action:
                "recent",
            keywords:
                "recent transactions latest activity"
        },
        {
            title:
                "How is my financial health?",
            description:
                "Review your MoneyLeak financial health",
            icon: "✦",
            action:
                "health",
            keywords:
                "financial health score money health"
        }
    ];

    function getSearchResults(
        query
    ) {
        const text =
            String(
                query || ""
            )
                .trim()
                .toLowerCase();

        if (!text) {
            return {
                pages:
                    SEARCH_PAGES.slice(
                        0,
                        5
                    ),
                actions:
                    SEARCH_ACTIONS.slice(
                        0,
                        6
                    ),
                questions:
                    SEARCH_QUESTIONS
            };
        }

        const words =
            text.split(
                /\s+/
            );

        function score(item) {
            const haystack =
                (
                    item.title +
                    " " +
                    item.description +
                    " " +
                    (
                        item.keywords ||
                        ""
                    )
                ).toLowerCase();

            let score = 0;

            if (
                haystack.includes(
                    text
                )
            ) {
                score += 20;
            }

            words.forEach(
                (word) => {
                    if (
                        haystack.includes(
                            word
                        )
                    ) {
                        score += 4;
                    }
                }
            );

            if (
                item.title
                    .toLowerCase()
                    .startsWith(text)
            ) {
                score += 15;
            }

            return score;
        }

        const rank =
            (items) =>
                items
                    .map(
                        (item) => ({
                            item,
                            score:
                                score(
                                    item
                                )
                        })
                    )
                    .filter(
                        (entry) =>
                            entry.score >
                            0
                    )
                    .sort(
                        (a, b) =>
                            b.score -
                            a.score
                    )
                    .map(
                        (entry) =>
                            entry.item
                    )
                    .slice(
                        0,
                        8
                    );

        /*
           Search actual transactions too.
        */

        const transactions =
            getTransactions()
                .filter(
                    (item) => {
                        const haystack =
                            (
                                item.description +
                                " " +
                                item.category +
                                " " +
                                item.source
                            ).toLowerCase();

                        return words.some(
                            (word) =>
                                haystack.includes(
                                    word
                                )
                        );
                    }
                )
                .slice(
                    0,
                    6
                );

        return {
            pages:
                rank(
                    SEARCH_PAGES
                ),
            actions:
                rank(
                    SEARCH_ACTIONS
                ),
            questions:
                rank(
                    SEARCH_QUESTIONS
                ),
            transactions
        };
    }

    function runSearchQuestion(
        action
    ) {
        switch (action) {
            case "top-spending":
                navigateTo(
                    "expenses.html"
                );
                break;

            case "largest-expenses":
                navigateTo(
                    "expenses.html"
                );
                break;

            case "savings":
                navigateTo(
                    "savings.html"
                );
                break;

            case "recent":
                navigateTo(
                    "index.html"
                );
                break;

            case "health":
                navigateTo(
                    "analytics.html"
                );
                break;

            default:
                break;
        }
    }

    /* =====================================================
       NAVIGATION
       ===================================================== */

    function navigateTo(url) {
        if (!url) {
            return;
        }

        window.location.href =
            url;
    }

    function setupNavigation() {
        document
            .querySelectorAll(
                "[data-nav], .sidebar-link, .mobile-nav-link"
            )
            .forEach(
                (link) => {
                    if (
                        link.dataset
                            .navUrl
                    ) {
                        link.addEventListener(
                            "click",
                            () =>
                                navigateTo(
                                    link.dataset
                                        .navUrl
                                )
                        );
                    }
                }
            );

        document
            .querySelectorAll(
                'a[href$=".html"]'
            )
            .forEach(
                (link) => {
                    link.addEventListener(
                        "click",
                        () => {
                            const href =
                                link.getAttribute(
                                    "href"
                                );

                            if (
                                href
                            ) {
                                sessionStorage.setItem(
                                    "moneyLeakLastPage",
                                    href
                                );
                            }
                        }
                    );
                }
            );
    }

    /* =====================================================
       SEARCH UI
       ===================================================== */

    function setupSearch() {
        const overlay =
            document.getElementById(
                "searchOverlay"
            );

        const openButton =
            document.querySelector(
                "[data-search-open]"
            ) ||
            document.querySelector(
                "#searchButton"
            ) ||
            document.querySelector(
                ".search-trigger"
            );

        const closeButton =
            document.getElementById(
                "closeSearch"
            );

        const input =
            document.getElementById(
                "globalSearch"
            );

        const results =
            document.getElementById(
                "searchResults"
            );

        if (!overlay) {
            return;
        }

        function openSearch() {
            overlay.classList.add(
                "open"
            );

            overlay.classList.add(
                "active"
            );

            overlay.setAttribute(
                "aria-hidden",
                "false"
            );

            setTimeout(
                () => {
                    input?.focus();
                },
                50
            );

            render(
                input?.value || ""
            );
        }

        function closeSearch() {
            overlay.classList.remove(
                "open"
            );

            overlay.classList.remove(
                "active"
            );

            overlay.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        function render(query) {
            if (!results) {
                return;
            }

            const data =
                getSearchResults(
                    query
                );

            const blocks = [];

            if (
                data.actions &&
                data.actions.length
            ) {
                blocks.push(`
                    <div class="search-section">
                        <div class="search-section-title">
                            QUICK ACTIONS
                        </div>

                        <div class="search-suggestions">
                            ${data.actions
                                .map(
                                    (
                                        item
                                    ) => `
                                    <button
                                        type="button"
                                        class="search-result-item"
                                        data-search-url="${escapeHTML(
                                            item.url
                                        )}"
                                    >
                                        <span class="search-result-icon">
                                            ${escapeHTML(
                                                item.icon
                                            )}
                                        </span>

                                        <span class="search-result-copy">
                                            <strong>
                                                ${escapeHTML(
                                                    item.title
                                                )}
                                            </strong>

                                            <small>
                                                ${escapeHTML(
                                                    item.description
                                                )}
                                            </small>
                                        </span>

                                        <span class="search-result-arrow">
                                            →
                                        </span>
                                    </button>
                                `
                                )
                                .join("")}
                        </div>
                    </div>
                `);
            }

            if (
                data.questions &&
                data.questions.length
            ) {
                blocks.push(`
                    <div class="search-section">
                        <div class="search-section-title">
                            MONEY QUESTIONS
                        </div>

                        <div class="search-suggestions">
                            ${data.questions
                                .map(
                                    (
                                        item
                                    ) => `
                                    <button
                                        type="button"
                                        class="search-result-item"
                                        data-search-action="${escapeHTML(
                                            item.action
                                        )}"
                                    >
                                        <span class="search-result-icon">
                                            ${escapeHTML(
                                                item.icon
                                            )}
                                        </span>

                                        <span class="search-result-copy">
                                            <strong>
                                                ${escapeHTML(
                                                    item.title
                                                )}
                                            </strong>

                                            <small>
                                                ${escapeHTML(
                                                    item.description
                                                )}
                                            </small>
                                        </span>

                                        <span class="search-result-arrow">
                                            →
                                        </span>
                                    </button>
                                `
                                )
                                .join("")}
                        </div>
                    </div>
                `);
            }

            if (
                data.pages &&
                data.pages.length
            ) {
                blocks.push(`
                    <div class="search-section">
                        <div class="search-section-title">
                            MONEY LEAK
                        </div>

                        <div class="search-suggestions">
                            ${data.pages
                                .map(
                                    (
                                        item
                                    ) => `
                                    <button
                                        type="button"
                                        class="search-result-item"
                                        data-search-url="${escapeHTML(
                                            item.url
                                        )}"
                                    >
                                        <span class="search-result-icon">
                                            ${escapeHTML(
                                                item.icon
                                            )}
                                        </span>

                                        <span class="search-result-copy">
                                            <strong>
                                                ${escapeHTML(
                                                    item.title
                                                )}
                                            </strong>

                                            <small>
                                                ${escapeHTML(
                                                    item.description
                                                )}
                                            </small>
                                        </span>

                                        <span class="search-result-arrow">
                                            →
                                        </span>
                                    </button>
                                `
                                )
                                .join("")}
                        </div>
                    </div>
                `);
            }

            if (
                data.transactions &&
                data.transactions.length
            ) {
                blocks.push(`
                    <div class="search-section">
                        <div class="search-section-title">
                            TRANSACTIONS
                        </div>

                        <div class="search-suggestions">
                            ${data.transactions
                                .map(
                                    (
                                        item
                                    ) => `
                                    <div
                                        class="search-result-item search-transaction"
                                    >
                                        <span class="search-result-icon">
                                            ${
                                                item.type ===
                                                "income"
                                                    ? "↗"
                                                    : "↘"
                                            }
                                        </span>

                                        <span class="search-result-copy">
                                            <strong>
                                                ${escapeHTML(
                                                    item.description ||
                                                        item.category ||
                                                        "Transaction"
                                                )}
                                            </strong>

                                            <small>
                                                ${escapeHTML(
                                                    item.category
                                                )}
                                                ·
                                                ${escapeHTML(
                                                    formatShortDate(
                                                        item.date
                                                    )
                                                )}
                                            </small>
                                        </span>

                                        <span class="search-transaction-amount">
                                            ${escapeHTML(
                                                displayCurrency(
                                                    item.amount
                                                )
                                            )}
                                        </span>
                                    </div>
                                `
                                )
                                .join("")}
                        </div>
                    </div>
                `);
            }

            if (
                !blocks.length
            ) {
                blocks.push(`
                    <div class="search-empty">
                        <div class="search-empty-icon">
                            ⌕
                        </div>

                        <strong>
                            Nothing found
                        </strong>

                        <p>
                            Try searching for
                            income, expenses,
                            savings, budgets,
                            food, transport or
                            financial health.
                        </p>
                    </div>
                `);
            }

            results.innerHTML =
                blocks.join("");

            results
                .querySelectorAll(
                    "[data-search-url]"
                )
                .forEach(
                    (item) => {
                        item.addEventListener(
                            "click",
                            () => {
                                navigateTo(
                                    item.dataset
                                        .searchUrl
                                );
                            }
                        );
                    }
                );

            results
                .querySelectorAll(
                    "[data-search-action]"
                )
                .forEach(
                    (item) => {
                        item.addEventListener(
                            "click",
                            () => {
                                runSearchQuestion(
                                    item.dataset
                                        .searchAction
                                );
                            }
                        );
                    }
                );
        }

        if (openButton) {
            openButton.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    openSearch();
                }
            );
        }

        if (input) {
            input.addEventListener(
                "input",
                () =>
                    render(
                        input.value
                    )
            );
        }

        if (closeButton) {
            closeButton.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeSearch();
                }
            );
        }

        overlay.addEventListener(
            "click",
            (event) => {
                if (
                    event.target ===
                    overlay
                ) {
                    closeSearch();
                }
            }
        );

        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    (event.metaKey ||
                        event.ctrlKey) &&
                    event.key
                        .toLowerCase() ===
                        "k"
                ) {
                    event.preventDefault();
                    openSearch();
                }

                if (
                    event.key ===
                        "Escape" &&
                    (
                        overlay.classList.contains(
                            "open"
                        ) ||
                        overlay.classList.contains(
                            "active"
                        )
                    )
                ) {
                    closeSearch();
                }
            }
        );

        render("");
    }

    /* =====================================================
       NOTIFICATION UI
       ===================================================== */

    function setupNotifications() {
        const button =
            document.getElementById(
                "notificationButton"
            );

        const panel =
            document.getElementById(
                "notificationPanel"
            );

        const close =
            document.getElementById(
                "closeNotifications"
            );

        const list =
            document.getElementById(
                "notificationList"
            );

        if (
            !button ||
            !panel
        ) {
            return;
        }

        let actions =
            panel.querySelector(
                ".notification-actions"
            );

        if (!actions) {
            const heading =
                panel.querySelector(
                    "h2, h3, strong"
                );

            if (
                heading &&
                heading.parentElement
            ) {
                actions =
                    document.createElement(
                        "div"
                    );

                actions.className =
                    "notification-actions";

                actions.innerHTML = `
                    <button
                        type="button"
                        data-notification-read
                    >
                        Mark all read
                    </button>

                    <button
                        type="button"
                        data-notification-clear
                    >
                        Clear
                    </button>
                `;

                heading.parentElement.appendChild(
                    actions
                );
            }
        }

        function updateBadge() {
            const unread =
                getUnreadNotificationCount();

            let badge =
                button.querySelector(
                    ".notification-badge"
                );

            if (
                unread > 0
            ) {
                if (!badge) {
                    badge =
                        document.createElement(
                            "span"
                        );

                    badge.className =
                        "notification-badge";

                    button.appendChild(
                        badge
                    );
                }

                badge.textContent =
                    unread > 99
                        ? "99+"
                        : unread;
            } else if (
                badge
            ) {
                badge.remove();
            }
        }

        function relativeTime(
            date
        ) {
            const now =
                Date.now();

            const then =
                parseDate(
                    date
                ).getTime();

            const seconds =
                Math.max(
                    0,
                    Math.floor(
                        (now -
                            then) /
                            1000
                    )
                );

            if (
                seconds <
                60
            ) {
                return "Just now";
            }

            const minutes =
                Math.floor(
                    seconds / 60
                );

            if (
                minutes <
                60
            ) {
                return `${minutes}m ago`;
            }

            const hours =
                Math.floor(
                    minutes / 60
                );

            if (
                hours <
                24
            ) {
                return `${hours}h ago`;
            }

            const days =
                Math.floor(
                    hours / 24
                );

            if (
                days <
                7
            ) {
                return `${days}d ago`;
            }

            return formatDate(
                date
            );
        }

        function render() {
            if (!list) {
                return;
            }

            const settings =
                getSettings();

            if (
                settings.notifications ===
                false
            ) {
                list.innerHTML = `
                    <div class="notification-empty">
                        <div class="notification-empty-icon">
                            🔕
                        </div>

                        <strong>
                            Notifications are off
                        </strong>

                        <p>
                            Turn notifications back on
                            in Settings to receive
                            MoneyLeak intelligence.
                        </p>
                    </div>
                `;

                updateBadge();

                return;
            }

            const notifications =
                getAlerts();

            if (
                !notifications.length
            ) {
                list.innerHTML = `
                    <div class="notification-empty">
                        <div class="notification-empty-icon">
                            ✓
                        </div>

                        <strong>
                            You're all caught up
                        </strong>

                        <p>
                            MoneyLeak has nothing important
                            to tell you right now.
                        </p>
                    </div>
                `;

                updateBadge();

                return;
            }

            list.innerHTML =
                notifications
                    .map(
                        (
                            notification
                        ) => `
                        <button
                            type="button"
                            class="
                                notification-card
                                ${escapeHTML(
                                    notification.type
                                )}
                                ${
                                    notification.read
                                        ? "read"
                                        : "unread"
                                }
                            "
                            data-notification-id="${escapeHTML(
                                notification.id
                            )}"
                            data-notification-page="${escapeHTML(
                                notification.page
                            )}"
                        >
                            <span class="notification-card-icon">
                                ${escapeHTML(
                                    notification.icon ||
                                        "✦"
                                )}
                            </span>

                            <span class="notification-card-body">
                                <span class="notification-card-top">
                                    <strong>
                                        ${escapeHTML(
                                            notification.title
                                        )}
                                    </strong>

                                    ${
                                        notification.read
                                            ? ""
                                            : `<span class="notification-unread-dot"></span>`
                                    }
                                </span>

                                <span class="notification-card-text">
                                    ${escapeHTML(
                                        notification.text
                                    )}
                                </span>

                                <span class="notification-card-bottom">
                                    <span>
                                        ${relativeTime(
                                            notification.createdAt
                                        )}
                                    </span>

                                    ${
                                        notification.page
                                            ? `<span class="notification-view">
                                                View →
                                            </span>`
                                            : ""
                                    }
                                </span>
                            </span>
                        </button>
                    `
                    )
                    .join("");

            list
                .querySelectorAll(
                    "[data-notification-id]"
                )
                .forEach(
                    (item) => {
                        item.addEventListener(
                            "click",
                            () => {
                                markNotificationRead(
                                    item.dataset
                                        .notificationId
                                );

                                const page =
                                    item.dataset
                                        .notificationPage;

                                if (
                                    page
                                ) {
                                    navigateTo(
                                        page
                                    );
                                } else {
                                    render();
                                }
                            }
                        );
                    }
                );

            updateBadge();
        }

        button.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                panel.classList.toggle(
                    "open"
                );

                render();
            }
        );

        if (close) {
            close.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    panel.classList.remove(
                        "open"
                    );
                }
            );
        }

        panel.addEventListener(
            "click",
            (event) => {
                const markRead =
                    event.target.closest(
                        "[data-notification-read]"
                    );

                const clear =
                    event.target.closest(
                        "[data-notification-clear]"
                    );

                if (
                    markRead
                ) {
                    event.preventDefault();

                    markAllNotificationsRead();

                    render();
                }

                if (
                    clear
                ) {
                    event.preventDefault();

                    clearNotificationHistory();

                    render();
                }
            }
        );

        document.addEventListener(
            "click",
            (event) => {
                if (
                    panel.classList.contains(
                        "open"
                    ) &&
                    !panel.contains(
                        event.target
                    ) &&
                    event.target !==
                        button
                ) {
                    panel.classList.remove(
                        "open"
                    );
                }
            }
        );

        generateAlerts();
        updateBadge();

        window.addEventListener(
            "moneyLeakUpdated",
            () => {
                generateAlerts();
                updateBadge();

                if (
                    panel.classList.contains(
                        "open"
                    )
                ) {
                    render();
                }
            }
        );
    }

    /* =====================================================
       MOBILE NAVIGATION
       ===================================================== */

    function setupMobileNavigation() {
        const button =
            document.querySelector(
                "[data-mobile-menu]"
            ) ||
            document.getElementById(
                "mobileMenuButton"
            ) ||
            document.getElementById(
                "menuButton"
            );

        const overlay =
            document.getElementById(
                "mobileOverlay"
            );

        const close =
            document.getElementById(
                "closeMobileMenu"
            );

        if (
            !button ||
            !overlay
        ) {
            return;
        }

        function open() {
            overlay.classList.add(
                "open"
            );

            overlay.classList.add(
                "active"
            );

            document.body.classList.add(
                "mobile-menu-open"
            );
        }

        function closeMenu() {
            overlay.classList.remove(
                "open"
            );

            overlay.classList.remove(
                "active"
            );

            document.body.classList.remove(
                "mobile-menu-open"
            );
        }

        button.addEventListener(
            "click",
            (event) => {
                event.preventDefault();

                if (
                    overlay.classList.contains(
                        "open"
                    )
                ) {
                    closeMenu();
                } else {
                    open();
                }
            }
        );

        close?.addEventListener(
            "click",
            closeMenu
        );

        overlay.addEventListener(
            "click",
            (event) => {
                if (
                    event.target ===
                    overlay
                ) {
                    closeMenu();
                }
            }
        );
    }

    /* =====================================================
       ACTIVE NAVIGATION
       ===================================================== */

    function setupActiveNavigation() {
        const current =
            location.pathname
                .split("/")
                .pop() ||
            "index.html";

        document
            .querySelectorAll(
                "a[href]"
            )
            .forEach(
                (link) => {
                    const href =
                        link.getAttribute(
                            "href"
                        );

                    if (
                        !href ||
                        !href.endsWith(
                            ".html"
                        )
                    ) {
                        return;
                    }

                    const file =
                        href
                            .split(
                                "/"
                            )
                            .pop();

                    if (
                        file ===
                        current
                    ) {
                        link.classList.add(
                            "active"
                        );
                    }
                }
            );
    }

    /* =====================================================
       GREETING
       ===================================================== */

    function setupGreeting() {
        const element =
            document.getElementById(
                "dashboardGreeting"
            );

        if (!element) {
            return;
        }

        const hour =
            new Date().getHours();

        let greeting =
            "Good evening";

        if (
            hour < 12
        ) {
            greeting =
                "Good morning";
        } else if (
            hour < 18
        ) {
            greeting =
                "Good afternoon";
        }

        const name =
            getSettings()
                .name ||
            "there";

        element.textContent =
            `${greeting}, ${name}`;
    }

    /* =====================================================
       DOM HELPERS
       ===================================================== */

    function setText(
        id,
        value
    ) {
        const element =
            document.getElementById(
                id
            );

        if (element) {
            element.textContent =
                value;
        }
    }

    function setHTML(
        id,
        value
    ) {
        const element =
            document.getElementById(
                id
            );

        if (element) {
            element.innerHTML =
                value;
        }
    }

    function setWidth(
        id,
        percentage
    ) {
        const element =
            document.getElementById(
                id
            );

        if (element) {
            element.style.width =
                `${clamp(
                    number(
                        percentage
                    ),
                    0,
                    100
                )}%`;
        }
    }

    /* =====================================================
       DASHBOARD
       ===================================================== */

    function updateDashboard() {
        const totals =
            getMonthlyTotals();

        const previous =
            getPreviousMonthlyTotals();

        const savings =
            getSavingsProgress();

        const health =
            calculateFinancialHealth();

        const budget =
            getBudgetStats();

        const safe =
            getSafeToSpend();

        const insight =
            getSmartInsight();

        /* Overview */

        setText(
            "overviewBalance",
            displayCurrency(
                totals.cashFlow
            )
        );

        setText(
            "overviewIncome",
            displayCurrency(
                totals.income
            )
        );

        setText(
            "overviewExpenses",
            displayCurrency(
                totals.expenses
            )
        );

        const savingsRate =
            totals.income > 0
                ? (
                      ((totals.income -
                          totals.expenses) /
                          totals.income) *
                      100
                  )
                : 0;

        setText(
            "overviewSavingsRate",
            `${Math.round(
                savingsRate
            )}%`
        );

        setText(
            "overviewGoalProgress",
            `${Math.round(
                savings.percentage
            )}%`
        );

        setWidth(
            "overviewGoalFill",
            savings.percentage
        );

        setText(
            "overviewHealthScore",
            `${health.score}/100`
        );

        setText(
            "overviewHealthStatus",
            health.status
        );

        /* Period */

        setText(
            "periodIncome",
            displayCurrency(
                totals.income
            )
        );

        setText(
            "periodExpenses",
            displayCurrency(
                totals.expenses
            )
        );

        setText(
            "periodCashFlow",
            displayCurrency(
                totals.cashFlow
            )
        );

        setText(
            "cashFlowHealth",
            totals.cashFlow >= 0
                ? "Positive cash flow"
                : "Negative cash flow"
        );

        /* Insight */

        setText(
            "overviewInsightText",
            insight.text
        );

        /* Safe to spend */

        setText(
            "safeToSpendDashboard",
            displayCurrency(
                safe.amount
            )
        );

        setText(
            "safeToSpendMessage",
            safe.amount > 0
                ? "Available based on your current plan."
                : "No safe-to-spend amount available yet."
        );

        setText(
            "safeToSpendAdvice",
            safe.source ===
                "budget"
                ? "Stay within your remaining monthly budget."
                : "Create a budget to make this number more precise."
        );

        /* Budget */

        setText(
            "dashboardBudgetPercent",
            budget.monthlyBudget >
                0
                ? `${Math.round(
                      budget.percentage
                  )}%`
                : "No budget"
        );

        setWidth(
            "dashboardBudgetFill",
            budget.percentage
        );

        setText(
            "dashboardBudgetSpent",
            displayCurrency(
                budget.spent
            )
        );

        setText(
            "dashboardBudgetRemaining",
            budget.monthlyBudget >
                0
                ? displayCurrency(
                      Math.max(
                          0,
                          budget.remaining
                      )
                  )
                : "—"
        );

        setText(
            "dashboardBudgetLimit",
            budget.monthlyBudget >
                0
                ? displayCurrency(
                      budget.monthlyBudget
                  )
                : "No monthly budget"
        );

        /* Health */

        setText(
            "healthScore",
            `${health.score}/100`
        );

        setWidth(
            "healthFill",
            health.score
        );

        setText(
            "healthMessage",
            health.message
        );

        setText(
            "healthExplanation",
            `Your score is based on spending, budgeting, savings progress and recurring obligations.`
        );

        setText(
            "healthIncomeFactor",
            `${health.spendingFactor}%`
        );

        setWidth(
            "healthIncomeBar",
            health.spendingFactor
        );

        setText(
            "healthBudgetFactor",
            `${health.budgetFactor}%`
        );

        setWidth(
            "healthBudgetBar",
            health.budgetFactor
        );

        setText(
            "healthSavingsFactor",
            `${health.savingsFactor}%`
        );

        setWidth(
            "healthSavingsBar",
            health.savingsFactor
        );

        setText(
            "healthRecurringFactor",
            `${health.recurringFactor}%`
        );

        setWidth(
            "healthRecurringBar",
            health.recurringFactor
        );

        setText(
            "healthInsight",
            insight.text
        );

        renderRecentTransactions();
        renderDashboardGoals();
        renderTopSpending();
        renderDashboardAlerts();
    }

    function renderRecentTransactions() {
        const container =
            document.getElementById(
                "recentTransactions"
            );

        if (!container) {
            return;
        }

        const transactions =
            getTransactions()
                .slice(
                    0,
                    6
                );

        if (
            !transactions.length
        ) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>
                        No transactions yet
                    </strong>

                    <p>
                        Add income or expenses to see
                        your recent activity here.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            transactions
                .map(
                    (item) => `
                    <div class="transaction-row">
                        <div class="transaction-icon ${
                            item.type
                        }">
                            ${
                                item.type ===
                                "income"
                                    ? "↗"
                                    : "↘"
                            }
                        </div>

                        <div class="transaction-info">
                            <strong>
                                ${escapeHTML(
                                    item.description ||
                                        item.category ||
                                        "Transaction"
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    item.category ||
                                        item.source ||
                                        ""
                                )}
                                ·
                                ${escapeHTML(
                                    formatShortDate(
                                        item.date
                                    )
                                )}
                            </small>
                        </div>

                        <div class="transaction-amount ${
                            item.type
                        }">
                            ${
                                item.type ===
                                "income"
                                    ? "+"
                                    : "-"
                            }${escapeHTML(
                                displayCurrency(
                                    item.amount
                                )
                            )}
                        </div>
                    </div>
                `
                )
                .join("");
    }

    function renderDashboardGoals() {
        const container =
            document.getElementById(
                "dashboardGoals"
            );

        if (!container) {
            return;
        }

        const goals =
            getSavingsGoals()
                .slice(
                    0,
                    3
                );

        if (
            !goals.length
        ) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>
                        No savings goals yet
                    </strong>

                    <p>
                        Create a goal to start
                        building your future.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            goals
                .map(
                    (goal) => {
                        const percentage =
                            goal.target >
                            0
                                ? clamp(
                                      (goal.current /
                                          goal.target) *
                                          100,
                                      0,
                                      100
                                  )
                                : 0;

                        return `
                            <div class="goal-mini">
                                <div class="goal-mini-top">
                                    <strong>
                                        ${escapeHTML(
                                            goal.name
                                        )}
                                    </strong>

                                    <span>
                                        ${Math.round(
                                            percentage
                                        )}%
                                    </span>
                                </div>

                                <div class="progress-track">
                                    <div
                                        class="progress-fill"
                                        style="width:${percentage}%"
                                    ></div>
                                </div>

                                <small>
                                    ${escapeHTML(
                                        displayCurrency(
                                            goal.current
                                        )
                                    )}
                                    of
                                    ${escapeHTML(
                                        displayCurrency(
                                            goal.target
                                        )
                                    )}
                                </small>
                            </div>
                        `;
                    }
                )
                .join("");
    }

    function renderTopSpending() {
        const container =
            document.getElementById(
                "topSpendingCategories"
            );

        if (!container) {
            return;
        }

        const totals =
            getMonthlyTotals();

        const categories =
            getTopCategories(
                getPeriodTransactions(
                    "month"
                ),
                5
            );

        if (
            !categories.length
        ) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>
                        No spending data yet
                    </strong>

                    <p>
                        Your biggest spending areas
                        will appear here.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            categories
                .map(
                    (item) => {
                        const percentage =
                            totals.expenses >
                            0
                                ? (
                                      item.amount /
                                      totals.expenses
                                  ) *
                                  100
                                : 0;

                        return `
                            <div class="category-row">
                                <div class="category-row-top">
                                    <strong>
                                        ${escapeHTML(
                                            item.category
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            displayCurrency(
                                                item.amount
                                            )
                                        )}
                                    </span>
                                </div>

                                <div class="progress-track">
                                    <div
                                        class="progress-fill"
                                        style="width:${percentage}%"
                                    ></div>
                                </div>

                                <small>
                                    ${Math.round(
                                        percentage
                                    )}% of monthly spending
                                </small>
                            </div>
                        `;
                    }
                )
                .join("");
    }

    function renderDashboardAlerts() {
        const container =
            document.getElementById(
                "financialAlerts"
            );

        if (!container) {
            return;
        }

        const alerts =
            getAlerts().slice(
                0,
                4
            );

        if (
            !alerts.length
        ) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>
                        You're all caught up
                    </strong>

                    <p>
                        MoneyLeak has no important
                        alerts right now.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            alerts
                .map(
                    (item) => `
                    <div class="alert-row ${escapeHTML(
                        item.type
                    )}">
                        <span class="alert-row-icon">
                            ${escapeHTML(
                                item.icon ||
                                    "✦"
                            )}
                        </span>

                        <div>
                            <strong>
                                ${escapeHTML(
                                    item.title
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    item.text
                                )}
                            </p>
                        </div>
                    </div>
                `
                )
                .join("");
    }

    /* =====================================================
       QUICK ACTIONS
       ===================================================== */

    function setupQuickActions() {
        document
            .querySelectorAll(
                "[data-action]"
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        "click",
                        (event) => {
                            const action =
                                button.dataset
                                    .action;

                            if (
                                !action
                            ) {
                                return;
                            }

                            if (
                                action ===
                                "income"
                            ) {
                                navigateTo(
                                    "income.html"
                                );
                            }

                            if (
                                action ===
                                "expense"
                            ) {
                                navigateTo(
                                    "expenses.html"
                                );
                            }

                            if (
                                action ===
                                "savings"
                            ) {
                                navigateTo(
                                    "savings.html"
                                );
                            }

                            if (
                                action ===
                                "budget"
                            ) {
                                navigateTo(
                                    "budgets.html"
                                );
                            }

                            if (
                                action ===
                                "analytics"
                            ) {
                                navigateTo(
                                    "analytics.html"
                                );
                            }

                            if (
                                action ===
                                "recurring"
                            ) {
                                navigateTo(
                                    "recurring.html"
                                );
                            }
                        }
                    );
                }
            );
    }

    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function initializeStorage() {
        if (
            !localStorage.getItem(
                STORAGE.initialized
            )
        ) {
            if (
                !localStorage.getItem(
                    STORAGE.transactions
                )
            ) {
                writeJSON(
                    STORAGE.transactions,
                    []
                );
            }

            if (
                !localStorage.getItem(
                    STORAGE.goals
                )
            ) {
                writeJSON(
                    STORAGE.goals,
                    []
                );
            }

            if (
                !localStorage.getItem(
                    STORAGE.recurring
                )
            ) {
                writeJSON(
                    STORAGE.recurring,
                    []
                );
            }

            if (
                !localStorage.getItem(
                    STORAGE.settings
                )
            ) {
                writeJSON(
                    STORAGE.settings,
                    DEFAULT_SETTINGS
                );
            }

            localStorage.setItem(
                STORAGE.initialized,
                "true"
            );
        }
    }

    function init() {
        initializeStorage();

        applySettings();

        setupNavigation();
        setupActiveNavigation();
        setupGreeting();
        setupSearch();
        setupNotifications();
        setupMobileNavigation();
        setupQuickActions();

        updateDashboard();

        window.addEventListener(
            "moneyLeakUpdated",
            () => {
                applySettings();
                setupGreeting();
                updateDashboard();
            }
        );

        /*
           Generate intelligence once when
           the app starts.
        */

        generateAlerts();
    }

    /* =====================================================
       PUBLIC MONEY LEAK API
       ===================================================== */

    window.MoneyLeak = {
        version: "8.0",

        /* Storage */

        storage: STORAGE,

        /* Settings */

        getSettings,
        saveSettings,
        applySettings,

        /* Currency */

        currencyInfo:
            CURRENCY_INFO,
        displayCurrency,

        /* Categories */

        categories:
            CATEGORIES,
        incomeSources:
            INCOME_SOURCES,

        /* Transactions */

        getTransactions,
        saveTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        clearTransactions,

        /* Periods */

        getPeriodTransactions,
        getMonthlyTotals,
        getPreviousMonthlyTotals,
        totalsFor,

        /* Analysis */

        getCategoryTotals,
        getTopCategories,
        getLargestExpense,

        /* Savings */

        getSavingsGoals,
        saveSavingsGoals,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        getSavingsProgress,

        /* Budgets */

        getMonthlyBudget,
        setMonthlyBudget,
        getCategoryBudgets,
        setCategoryBudget,
        getBudgetStats,

        /* Recurring */

        getRecurringTransactions,
        saveRecurringTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        recurringMonthlyAmount,
        getRecurringStats,

        /* Intelligence */

        calculateFinancialHealth,
        getSafeToSpend,
        getSmartInsight,

        /* Notifications */

        generateAlerts,
        getAlerts,
        getNotificationHistory,
        getUnreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotificationHistory,

        /* Search */

        getSearchResults,
        runSearchQuestion,

        /* Navigation */

        navigateTo,

        /* Utilities */

        formatDate,
        formatShortDate,
        todayISO,
        escapeHTML,

        /* Refresh */

        refresh() {
            applySettings();
            updateDashboard();
            generateAlerts();
            dispatchUpdate();
        }
    };

    /* =====================================================
       START MONEY LEAK
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }
})();
