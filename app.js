/* =========================================================
   MONEYLEAK
   Personal Finance OS
   Central Application Engine
   Version 12.0
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       STORAGE
    ===================================================== */

    const STORAGE = {
        transactions: "moneyLeakTransactions",
        savingsGoals: "moneyLeakSavingsGoals",
        legacySavingsGoal: "moneyLeakSavingsGoal",
        monthlyBudget: "moneyLeakMonthlyBudget",
        categoryBudgets: "moneyLeakCategoryBudgets",
        recurring: "moneyLeakRecurringTransactions",
        settings: "moneyLeakSettings",
        alerts: "moneyLeakAlerts",
        notifications: "moneyLeakNotificationHistory",
        initialized: "moneyLeakInitialized"
    };

    const DEFAULT_SETTINGS = {
        name: "MoneyLeak User",
        currency: "NGN",
        theme: "light",
        compactNumbers: false,
        notifications: true,
        insights: true
    };

    const CATEGORIES = [
        "Food",
        "Transport",
        "Shopping",
        "Bills",
        "Housing",
        "Entertainment",
        "Health",
        "Education",
        "Family",
        "Travel",
        "Subscriptions",
        "Personal",
        "Business",
        "Other"
    ];

    const INCOME_SOURCES = [
        "Salary",
        "Freelance",
        "Business",
        "Investment",
        "Gift",
        "Bonus",
        "Side Hustle",
        "Other"
    ];

    const CURRENCY_MAP = {
        NGN: { symbol: "₦", code: "NGN", locale: "en-NG" },
        USD: { symbol: "$", code: "USD", locale: "en-US" },
        GBP: { symbol: "£", code: "GBP", locale: "en-GB" },
        EUR: { symbol: "€", code: "EUR", locale: "en-IE" },
        CAD: { symbol: "CA$", code: "CAD", locale: "en-CA" },
        AUD: { symbol: "A$", code: "AUD", locale: "en-AU" }
    };

    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));

    const num = value => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };

    const round = value =>
        Math.round((num(value) + Number.EPSILON) * 100) / 100;

    const clamp = (value, min, max) =>
        Math.min(Math.max(num(value), min), max);

    function uid(prefix = "ml") {
        return `${prefix}_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 9)}`;
    }

    function read(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function remove(key) {
        localStorage.removeItem(key);
    }

    function today() {
        const d = new Date();

        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0")
        ].join("-");
    }

    function monthKey(value) {
        const d = new Date(value);

        if (Number.isNaN(d.getTime())) {
            return today().slice(0, 7);
        }

        return `${d.getFullYear()}-${String(
            d.getMonth() + 1
        ).padStart(2, "0")}`;
    }

    function parseDate(value) {
        const d = new Date(value);

        return Number.isNaN(d.getTime())
            ? new Date()
            : d;
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function currentMonthTransactions() {
        return getTransactions().filter(
            t => monthKey(t.date) === today().slice(0, 7)
        );
    }

    /* =====================================================
       SETTINGS
    ===================================================== */

    function getSettings() {
        return {
            ...DEFAULT_SETTINGS,
            ...(read(STORAGE.settings, {}) || {})
        };
    }

    function saveSettings(changes = {}) {
        const settings = {
            ...getSettings(),
            ...changes
        };

        write(STORAGE.settings, settings);

        applySettings();
        emitUpdate();

        return settings;
    }

    function resolveTheme(theme) {
        if (theme !== "system") return theme;

        if (
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
        ) {
            return "dark";
        }

        return "light";
    }

    function applySettings() {
        const settings = getSettings();
        const theme = resolveTheme(settings.theme);

        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.themePreference =
            settings.theme;

        document.documentElement.dataset.compactNumbers =
            settings.compactNumbers ? "true" : "false";

        updateUserInterface();
    }

    function updateUserInterface() {
        const settings = getSettings();

        const name =
            settings.name ||
            "MoneyLeak User";

        const initial =
            name.trim().charAt(0).toUpperCase() || "M";

        $$(".brand-mark, .logo-mark, .brand-logo, [data-brand-logo]")
            .forEach(el => {
                el.textContent = "M";
            });

        $$("#topbarAvatar, #settingsAvatar")
            .forEach(el => {
                el.textContent = initial;
            });

        $$("#profilePreviewName")
            .forEach(el => {
                el.textContent = name;
            });
    }

    /* =====================================================
       CURRENCY
    ===================================================== */

    function getCurrency() {
        return (
            CURRENCY_MAP[getSettings().currency] ||
            CURRENCY_MAP.NGN
        );
    }

    function displayCurrency(value, options = {}) {
        const amount = num(value);
        const currency = getCurrency();

        if (
            options.compact ??
            getSettings().compactNumbers
        ) {
            return formatCompactCurrency(amount);
        }

        try {
            return new Intl.NumberFormat(
                currency.locale,
                {
                    style: "currency",
                    currency: currency.code,
                    maximumFractionDigits:
                        options.decimals ?? 0
                }
            ).format(amount);
        } catch {
            return `${currency.symbol}${amount.toLocaleString()}`;
        }
    }

    function formatCompactCurrency(value) {
        const amount = num(value);
        const currency = getCurrency();
        const abs = Math.abs(amount);

        if (abs >= 1000000000) {
            return `${currency.symbol}${(amount / 1000000000).toFixed(1)}B`;
        }

        if (abs >= 1000000) {
            return `${currency.symbol}${(amount / 1000000).toFixed(1)}M`;
        }

        if (abs >= 1000) {
            return `${currency.symbol}${(amount / 1000).toFixed(1)}K`;
        }

        return displayCurrency(amount, {
            compact: false
        });
    }

    /* =====================================================
       TRANSACTIONS
    ===================================================== */

    function normalizeTransaction(t = {}) {
        const type =
            t.type === "income"
                ? "income"
                : "expense";

        return {
            id: t.id || uid("txn"),
            type,
            amount: Math.abs(num(t.amount)),
            category:
                t.category ||
                (type === "income" ? "Other" : "Other"),
            source:
                t.source ||
                (type === "income"
                    ? t.category || "Other"
                    : ""),
            description: t.description || "",
            date: t.date || today(),
            createdAt:
                t.createdAt ||
                new Date().toISOString()
        };
    }

    function getTransactions() {
        const data = read(
            STORAGE.transactions,
            []
        );

        return Array.isArray(data)
            ? data.map(normalizeTransaction)
            : [];
    }

    function saveTransactions(transactions) {
        write(
            STORAGE.transactions,
            transactions.map(normalizeTransaction)
        );

        emitUpdate();
    }

    function addTransaction(transaction) {
        const transactions = getTransactions();

        const item =
            normalizeTransaction(transaction);

        transactions.push(item);

        saveTransactions(transactions);
        syncSmartNotifications();

        return item;
    }

    function updateTransaction(id, changes = {}) {
        const transactions = getTransactions();
        const index = transactions.findIndex(
            t => t.id === id
        );

        if (index === -1) return null;

        transactions[index] =
            normalizeTransaction({
                ...transactions[index],
                ...changes,
                id
            });

        saveTransactions(transactions);
        syncSmartNotifications();

        return transactions[index];
    }

    function deleteTransaction(id) {
        saveTransactions(
            getTransactions().filter(
                t => t.id !== id
            )
        );

        syncSmartNotifications();

        return true;
    }

    function getPeriodRange(period = "month") {
        const now = new Date();

        let start;

        if (period === "year") {
            start = new Date(
                now.getFullYear(),
                0,
                1
            );
        } else if (period === "quarter") {
            const q =
                Math.floor(now.getMonth() / 3) * 3;

            start = new Date(
                now.getFullYear(),
                q,
                1
            );
        } else {
            start = new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );
        }

        const end = new Date(now);

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    function getTransactionsForPeriod(period = "month") {
        const range = getPeriodRange(period);

        return getTransactions().filter(t => {
            const date = parseDate(t.date);

            return (
                date >= range.start &&
                date <= range.end
            );
        });
    }

    function getIncome(transactions = getTransactions()) {
        return round(
            transactions
                .filter(t => t.type === "income")
                .reduce(
                    (sum, t) => sum + t.amount,
                    0
                )
        );
    }

    function getExpenses(transactions = getTransactions()) {
        return round(
            transactions
                .filter(t => t.type === "expense")
                .reduce(
                    (sum, t) => sum + t.amount,
                    0
                )
        );
    }

    function getCashFlow(transactions = getTransactions()) {
        return round(
            getIncome(transactions) -
            getExpenses(transactions)
        );
    }

    function getSavingsRate(transactions = getTransactions()) {
        const income = getIncome(transactions);

        if (income <= 0) return 0;

        return clamp(
            round(
                getCashFlow(transactions) /
                income *
                100
            ),
            -100,
            100
        );
    }

    /* =====================================================
       SAVINGS GOALS
    ===================================================== */

    function normalizeGoal(goal = {}) {
        return {
            id: goal.id || uid("goal"),
            name:
                goal.name ||
                "Savings Goal",
            target: Math.max(
                0,
                num(goal.target)
            ),
            current: Math.max(
                0,
                num(goal.current)
            ),
            deadline:
                goal.deadline || "",
            color:
                goal.color || "#087856",
            description:
                goal.description || "",
            createdAt:
                goal.createdAt ||
                new Date().toISOString(),
            completed:
                Boolean(goal.completed)
        };
    }

    function getSavingsGoals() {
        const goals =
            read(STORAGE.savingsGoals, []);

        return Array.isArray(goals)
            ? goals.map(normalizeGoal)
            : [];
    }

    function saveSavingsGoals(goals) {
        write(
            STORAGE.savingsGoals,
            goals.map(normalizeGoal)
        );

        emitUpdate();
    }

    function addSavingsGoal(goal) {
        const goals = getSavingsGoals();

        const item =
            normalizeGoal(goal);

        goals.push(item);

        saveSavingsGoals(goals);
        syncSmartNotifications();

        return item;
    }

    function updateSavingsGoal(id, changes = {}) {
        const goals = getSavingsGoals();

        const index =
            goals.findIndex(
                g => g.id === id
            );

        if (index === -1) return null;

        goals[index] =
            normalizeGoal({
                ...goals[index],
                ...changes,
                id
            });

        if (
            goals[index].target > 0 &&
            goals[index].current >=
            goals[index].target
        ) {
            goals[index].completed = true;
        }

        saveSavingsGoals(goals);
        syncSmartNotifications();

        return goals[index];
    }

    function deleteSavingsGoal(id) {
        saveSavingsGoals(
            getSavingsGoals().filter(
                g => g.id !== id
            )
        );

        return true;
    }

    function getGoalProgress(goal) {
        if (!goal || goal.target <= 0) {
            return 0;
        }

        return clamp(
            round(
                goal.current /
                goal.target *
                100
            ),
            0,
            100
        );
    }

    function getGoalRemaining(goal) {
        if (!goal) return 0;

        return Math.max(
            0,
            round(
                goal.target -
                goal.current
            )
        );
    }

    function getGoalMonthlyRequired(goal) {
        if (!goal) return 0;

        const remaining =
            getGoalRemaining(goal);

        if (
            remaining <= 0 ||
            !goal.deadline
        ) {
            return remaining;
        }

        const deadline =
            parseDate(goal.deadline);

        const now = new Date();

        const months = Math.max(
            1,
            (
                deadline.getFullYear() -
                now.getFullYear()
            ) * 12 +
            (
                deadline.getMonth() -
                now.getMonth()
            )
        );

        return round(
            remaining / months
        );
    }

    /* =====================================================
       BUDGETS
    ===================================================== */

    function getMonthlyBudget() {
        return Math.max(
            0,
            num(
                read(
                    STORAGE.monthlyBudget,
                    0
                )
            )
        );
    }

    function setMonthlyBudget(amount) {
        const value =
            Math.max(0, num(amount));

        write(
            STORAGE.monthlyBudget,
            value
        );

        emitUpdate();
        syncSmartNotifications();

        return value;
    }

    function getCategoryBudgets() {
        const budgets =
            read(
                STORAGE.categoryBudgets,
                {}
            );

        return budgets &&
            typeof budgets === "object"
            ? budgets
            : {};
    }

    function setCategoryBudget(category, amount) {
        const budgets =
            getCategoryBudgets();

        const value =
            Math.max(0, num(amount));

        if (value === 0) {
            delete budgets[category];
        } else {
            budgets[category] = value;
        }

        write(
            STORAGE.categoryBudgets,
            budgets
        );

        emitUpdate();
        syncSmartNotifications();

        return budgets;
    }

    function getBudgetUsage(category = null) {
        return getExpenses(
            currentMonthTransactions()
                .filter(t =>
                    t.type === "expense" &&
                    (
                        !category ||
                        t.category === category
                    )
                )
        );
    }

    function getBudgetPercentage(spent, budget) {
        if (num(budget) <= 0) return 0;

        return round(
            num(spent) /
            num(budget) *
            100
        );
    }

    /* =====================================================
       RECURRING
    ===================================================== */

    function normalizeRecurring(item = {}) {
        return {
            id: item.id || uid("rec"),
            name:
                item.name ||
                "Recurring item",
            amount:
                Math.abs(num(item.amount)),
            type:
                item.type === "income"
                    ? "income"
                    : "expense",
            category:
                item.category ||
                "Other",
            frequency:
                item.frequency ||
                "monthly",
            nextDate:
                item.nextDate ||
                today(),
            description:
                item.description || "",
            active:
                item.active !== false,
            createdAt:
                item.createdAt ||
                new Date().toISOString()
        };
    }

    function getRecurringTransactions() {
        const items =
            read(
                STORAGE.recurring,
                []
            );

        return Array.isArray(items)
            ? items.map(normalizeRecurring)
            : [];
    }

    function saveRecurringTransactions(items) {
        write(
            STORAGE.recurring,
            items.map(normalizeRecurring)
        );

        emitUpdate();
        syncSmartNotifications();
    }

    function addRecurringTransaction(item) {
        const items =
            getRecurringTransactions();

        const normalized =
            normalizeRecurring(item);

        items.push(normalized);

        saveRecurringTransactions(items);

        return normalized;
    }

    function updateRecurringTransaction(id, changes = {}) {
        const items =
            getRecurringTransactions();

        const index =
            items.findIndex(
                item => item.id === id
            );

        if (index === -1) return null;

        items[index] =
            normalizeRecurring({
                ...items[index],
                ...changes,
                id
            });

        saveRecurringTransactions(items);

        return items[index];
    }

    function deleteRecurringTransaction(id) {
        saveRecurringTransactions(
            getRecurringTransactions()
                .filter(
                    item => item.id !== id
                )
        );

        return true;
    }

    function recurringMonthlyAmount(item) {
        if (!item) return 0;

        if (item.frequency === "weekly") {
            return item.amount * 52 / 12;
        }

        if (item.frequency === "yearly") {
            return item.amount / 12;
        }

        return item.amount;
    }

    function getRecurringMonthlyExpenses() {
        return round(
            getRecurringTransactions()
                .filter(
                    item =>
                        item.active &&
                        item.type === "expense"
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        recurringMonthlyAmount(item),
                    0
                )
        );
    }

    function getRecurringMonthlyIncome() {
        return round(
            getRecurringTransactions()
                .filter(
                    item =>
                        item.active &&
                        item.type === "income"
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        recurringMonthlyAmount(item),
                    0
                )
        );
    }

    /* =====================================================
       RECURRING FORECAST
    ===================================================== */

    function getUpcomingRecurringForMonth() {
        const now = new Date();

        const end = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59
        );

        const result = [];

        getRecurringTransactions()
            .filter(item => item.active)
            .forEach(item => {
                let date =
                    parseDate(item.nextDate);

                let safety = 0;

                while (
                    date <= end &&
                    safety < 100
                ) {
                    if (date >= now) {
                        result.push({
                            ...item,
                            occurrenceDate:
                                date.toISOString()
                        });
                    }

                    if (
                        item.frequency === "weekly"
                    ) {
                        date = new Date(
                            date.getTime() +
                            7 * 86400000
                        );
                    } else if (
                        item.frequency === "yearly"
                    ) {
                        date = new Date(
                            date.getFullYear() + 1,
                            date.getMonth(),
                            date.getDate()
                        );
                    } else {
                        date = new Date(
                            date.getFullYear(),
                            date.getMonth() + 1,
                            Math.min(
                                date.getDate(),
                                new Date(
                                    date.getFullYear(),
                                    date.getMonth() + 2,
                                    0
                                ).getDate()
                            )
                        );
                    }

                    safety++;
                }
            });

        return result.sort(
            (a, b) =>
                parseDate(a.occurrenceDate) -
                parseDate(b.occurrenceDate)
        );
    }

    /* =====================================================
       CATEGORY ANALYSIS
    ===================================================== */

    function getCategoryTotals(
    transactions = getTransactions()
) {
    const totals = {};

    transactions
        .filter(item => item.type === "expense")
        .forEach(item => {

            const rawCategory =
                String(item.category || "Other").trim();

            // Make categories case-insensitive
            const key =
                rawCategory.toLowerCase();

            if (!totals[key]) {
                totals[key] = {
                    category: rawCategory
                        .toLowerCase()
                        .replace(/\b\w/g, letter =>
                            letter.toUpperCase()
                        ),
                    amount: 0
                };
            }

            totals[key].amount +=
                Number(item.amount || 0);
        });

    return Object.values(totals)
        .map(item => ({
            category: item.category,
            amount: round(item.amount)
        }))
        .sort(
            (a, b) =>
                b.amount - a.amount
        );
}

    function getLargestExpense(
        transactions = getTransactions()
    ) {
        return transactions
            .filter(t => t.type === "expense")
            .sort(
                (a, b) =>
                    b.amount -
                    a.amount
            )[0] || null;
    }

    function getAverageExpense(
        transactions = getTransactions()
    ) {
        const expenses =
            transactions.filter(
                t => t.type === "expense"
            );

        if (!expenses.length) return 0;

        return round(
            getExpenses(expenses) /
            expenses.length
        );
    }

    /* =====================================================
       ADVANCED INTELLIGENCE
    ===================================================== */

    function getDaysInCurrentMonth() {
        const now = new Date();

        return new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
        ).getDate();
    }

    function getDaysRemainingInMonth() {
        const now = new Date();

        return Math.max(
            1,
            getDaysInCurrentMonth() -
            now.getDate() +
            1
        );
    }

    function getSpendingVelocity() {
        const month =
            currentMonthTransactions();

        const expenses =
            getExpenses(month);

        const days =
            Math.max(
                1,
                new Date().getDate()
            );

        const currentDaily =
            expenses / days;

        const previous =
            getTransactions()
                .filter(
                    t =>
                        monthKey(t.date) ===
                        getPreviousMonthKey()
                );

        const previousExpenses =
            getExpenses(previous);

        const previousDays =
            new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                0
            ).getDate();

        const previousDaily =
            previousExpenses /
            Math.max(1, previousDays);

        if (previousDaily <= 0) {
            return {
                currentDaily: round(currentDaily),
                previousDaily: round(previousDaily),
                change: 0,
                status: "unknown"
            };
        }

        const change =
            round(
                (
                    currentDaily -
                    previousDaily
                ) /
                previousDaily *
                100
            );

        return {
            currentDaily: round(currentDaily),
            previousDaily: round(previousDaily),
            change,
            status:
                change >= 15
                    ? "accelerating"
                    : change <= -15
                        ? "improving"
                        : "stable"
        };
    }

    function getPreviousMonthKey() {
        const now = new Date();

        return monthKey(
            new Date(
                now.getFullYear(),
                now.getMonth() - 1,
                1
            )
        );
    }

    function getIncomeStability() {
        const months = [];

        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(
                now.getFullYear(),
                now.getMonth() - i,
                1
            );

            const key =
                monthKey(d);

            const income =
                getIncome(
                    getTransactions()
                        .filter(
                            t =>
                                monthKey(t.date) ===
                                key &&
                                t.type === "income"
                        )
                );

            months.push(income);
        }

        const active =
            months.filter(v => v > 0);

        if (!active.length) return 0;

        const average =
            active.reduce(
                (a, b) => a + b,
                0
            ) / active.length;

        if (!average) return 0;

        const variance =
            active.reduce(
                (sum, value) =>
                    sum +
                    Math.pow(
                        value - average,
                        2
                    ),
                0
            ) / active.length;

        const deviation =
            Math.sqrt(variance);

        return clamp(
            Math.round(
                100 -
                (
                    deviation /
                    average *
                    100
                )
            ),
            0,
            100
        );
    }

    function getEmergencyFundTarget() {
        const month =
            currentMonthTransactions();

        const expenses =
            getExpenses(month);

        const recurring =
            getRecurringMonthlyExpenses();

        const baseline =
            Math.max(
                expenses,
                recurring,
                0
            );

        return round(
            baseline * 6
        );
    }

    function getProjectedMonthEnd() {
        const month =
            currentMonthTransactions();

        const income =
            getIncome(month);

        const expenses =
            getExpenses(month);

        const daysElapsed =
            Math.max(
                1,
                new Date().getDate()
            );

        const days =
            getDaysInCurrentMonth();

        const dailyExpense =
            expenses /
            daysElapsed;

        const projectedExpenses =
            dailyExpense * days;

        const recurring =
            getUpcomingRecurringForMonth();

        const futureExpense =
            recurring
                .filter(
                    item =>
                        item.type === "expense"
                )
                .reduce(
                    (sum, item) =>
                        sum + item.amount,
                    0
                );

        const futureIncome =
            recurring
                .filter(
                    item =>
                        item.type === "income"
                )
                .reduce(
                    (sum, item) =>
                        sum + item.amount,
                    0
                );

        return {
            income: round(
                income + futureIncome
            ),
            currentExpenses:
                round(expenses),
            projectedExpenses:
                round(
                    projectedExpenses +
                    futureExpense
                ),
            projectedCashFlow:
                round(
                    income +
                    futureIncome -
                    projectedExpenses -
                    futureExpense
                )
        };
    }

    /* =====================================================
       MONEY SCORE
    ===================================================== */

    function getMoneyLeakScore() {
        const month =
            currentMonthTransactions();

        const income =
            getIncome(month);

        const expenses =
            getExpenses(month);

        const savingsRate =
            getSavingsRate(month);

        const budget =
            getMonthlyBudget();

        const recurring =
            getRecurringMonthlyExpenses();

        let score = 50;

        if (income > 0) {
            if (savingsRate >= 30) {
                score += 25;
            } else if (savingsRate >= 20) {
                score += 20;
            } else if (savingsRate >= 10) {
                score += 12;
            } else if (savingsRate > 0) {
                score += 5;
            } else {
                score -= 10;
            }
        } else {
            score -= 5;
        }

        if (budget > 0) {
            const usage =
                expenses / budget;

            if (usage <= 0.7) {
                score += 15;
            } else if (usage <= 0.85) {
                score += 10;
            } else if (usage <= 1) {
                score += 2;
            } else {
                score -= 15;
            }
        } else {
            score -= 3;
        }

        if (income > 0) {
            const recurringRatio =
                recurring / income;

            if (recurringRatio <= 0.2) {
                score += 10;
            } else if (
                recurringRatio <= 0.35
            ) {
                score += 5;
            } else if (
                recurringRatio > 0.5
            ) {
                score -= 10;
            }
        }

        const velocity =
            getSpendingVelocity();

        if (velocity.status === "improving") {
            score += 5;
        }

        if (velocity.status === "accelerating") {
            score -= 8;
        }

        score = clamp(
            Math.round(score),
            0,
            100
        );

        let grade = "Needs work";

        if (score >= 90) {
            grade = "Elite";
        } else if (score >= 80) {
            grade = "Excellent";
        } else if (score >= 70) {
            grade = "Strong";
        } else if (score >= 55) {
            grade = "Fair";
        }

        return {
            score,
            grade
        };
    }

    /* =====================================================
       FINANCIAL HEALTH
    ===================================================== */

    function getFinancialHealth() {
        const month =
            currentMonthTransactions();

        const income =
            getIncome(month);

        const expenses =
            getExpenses(month);

        const savingsRate =
            getSavingsRate(month);

        const budget =
            getMonthlyBudget();

        const recurring =
            getRecurringMonthlyExpenses();

        let spendingFactor = 0;
        let savingsFactor = 0;
        let budgetFactor = 0;
        let recurringFactor = 0;

        if (income > 0) {
            if (expenses <= income * 0.5) {
                spendingFactor = 20;
            } else if (
                expenses <= income * 0.7
            ) {
                spendingFactor = 15;
            } else if (
                expenses <= income * 0.85
            ) {
                spendingFactor = 8;
            } else if (
                expenses <= income
            ) {
                spendingFactor = 3;
            }
        }

        if (savingsRate >= 30) {
            savingsFactor = 20;
        } else if (savingsRate >= 20) {
            savingsFactor = 16;
        } else if (savingsRate >= 10) {
            savingsFactor = 11;
        } else if (savingsRate > 0) {
            savingsFactor = 6;
        }

        if (budget > 0) {
            const usage =
                expenses / budget;

            if (usage <= 0.7) {
                budgetFactor = 20;
            } else if (usage <= 0.85) {
                budgetFactor = 15;
            } else if (usage <= 1) {
                budgetFactor = 8;
            }
        } else {
            budgetFactor = 8;
        }

        if (
            income > 0 &&
            recurring <= income * 0.25
        ) {
            recurringFactor = 10;
        } else if (
            income > 0 &&
            recurring <= income * 0.4
        ) {
            recurringFactor = 6;
        } else {
            recurringFactor = 2;
        }

        const score = clamp(
            Math.round(
                spendingFactor +
                savingsFactor +
                budgetFactor +
                recurringFactor
            ),
            0,
            100
        );

        let status = "Needs attention";

        if (score >= 85) {
            status = "Excellent";
        } else if (score >= 70) {
            status = "Strong";
        } else if (score >= 55) {
            status = "Fair";
        }

        let message =
            "Your financial picture needs attention.";

        if (score >= 85) {
            message =
                "You're building a very strong financial foundation.";
        } else if (score >= 70) {
            message =
                "Your finances are moving in a healthy direction.";
        } else if (score >= 55) {
            message =
                "You have a solid base, with a few areas to improve.";
        }

        return {
            score,
            status,
            message,
            factors: {
                spending: spendingFactor,
                savings: savingsFactor,
                budget: budgetFactor,
                recurring: recurringFactor
            }
        };
    }

    /* =====================================================
       DECISION ENGINE
    ===================================================== */

    function getDecisionEngine() {
        const month =
            currentMonthTransactions();

        const income =
            getIncome(month);

        const expenses =
            getExpenses(month);

        const cashFlow =
            getCashFlow(month);

        const savingsRate =
            getSavingsRate(month);

        const daysRemaining =
            getDaysRemainingInMonth();

        const daysElapsed =
            Math.max(
                1,
                new Date().getDate()
            );

        const dailyExpense =
            expenses /
            daysElapsed;

        const projected =
            getProjectedMonthEnd();

        const recurring =
            getUpcomingRecurringForMonth();

        const recurringExpense =
            recurring
                .filter(
                    item =>
                        item.type === "expense"
                )
                .reduce(
                    (sum, item) =>
                        sum + item.amount,
                    0
                );

        const recurringIncome =
            recurring
                .filter(
                    item =>
                        item.type === "income"
                )
                .reduce(
                    (sum, item) =>
                        sum + item.amount,
                    0
                );

        const goals =
            getSavingsGoals()
                .filter(
                    goal =>
                        !goal.completed
                );

        const monthlyGoalNeed =
            goals.reduce(
                (sum, goal) =>
                    sum +
                    getGoalMonthlyRequired(goal),
                0
            );

        const categories =
            getCategoryTotals(month);

        const biggestLeak =
            categories[0] || null;

        const budget =
            getMonthlyBudget();

        const budgetSpent =
            expenses;

        const budgetRemaining =
            budget > 0
                ? Math.max(
                    0,
                    budget - budgetSpent
                )
                : Math.max(
                    0,
                    income - expenses
                );

        let available =
            budgetRemaining;

        available =
            Math.max(
                0,
                available -
                recurringExpense +
                recurringIncome -
                monthlyGoalNeed
            );

        const safeDaily =
            available /
            daysRemaining;

        let risk = "low";

        if (
            projected.projectedCashFlow < 0 ||
            (
                income > 0 &&
                expenses > income
            )
        ) {
            risk = "high";
        } else if (
            (
                budget > 0 &&
                expenses >= budget * 0.85
            ) ||
            (
                income > 0 &&
                recurringExpense >
                income * 0.3
            )
        ) {
            risk = "medium";
        }

        let actionTitle =
            "Keep your financial pace";

        let action =
            "Continue recording your money consistently and protect your surplus.";

        let reason =
            "Consistency gives MoneyLeak better information and gives you better decisions.";

        if (risk === "high") {
            actionTitle =
                "Protect your cash flow";

            action =
                "Pause non-essential spending and review your largest spending category.";

            reason =
                `Your projected month-end cash flow is ${displayCurrency(
                    projected.projectedCashFlow
                )}.`;
        } else if (
            biggestLeak &&
            income > 0 &&
            biggestLeak.amount >
            income * 0.2
        ) {
            actionTitle =
                `Review ${biggestLeak.category}`;

            action =
                `Your biggest spending leak is ${biggestLeak.category}. Try reducing this category before adding new discretionary spending.`;

            reason =
                `${biggestLeak.category} represents a significant share of your recorded income.`;
        } else if (
            savingsRate >= 20
        ) {
            actionTitle =
                "Turn surplus into wealth";

            action =
                "Move part of your surplus toward an emergency fund or savings goal.";

            reason =
                `You're currently saving about ${savingsRate}% of recorded income.`;
        } else if (
            budget > 0 &&
            budgetRemaining <=
            budget * 0.15
        ) {
            actionTitle =
                "Protect your budget";

            action =
                "Your remaining budget is getting tight. Focus only on essential purchases.";

            reason =
                `Only ${displayCurrency(
                    budgetRemaining
                )} remains in your monthly budget.`;
        } else if (
            recurringExpense > 0
        ) {
            actionTitle =
                "Prepare for upcoming bills";

            action =
                `Keep at least ${displayCurrency(
                    recurringExpense
                )} available for upcoming recurring expenses.`;

            reason =
                "Recurring commitments can create sudden cash-flow pressure if they are not planned.";
        }

        return {
            income: round(income),
            expenses: round(expenses),
            cashFlow: round(cashFlow),
            savingsRate: round(savingsRate),
            daysElapsed,
            daysRemaining,
            dailyExpense: round(dailyExpense),
            projectedMonthEnd: projected,
            recurringExpense: round(recurringExpense),
            recurringIncome: round(recurringIncome),
            goals,
            monthlyGoalNeed: round(monthlyGoalNeed),
            biggestLeak,
            budget,
            budgetSpent: round(budgetSpent),
            budgetRemaining: round(budgetRemaining),
            safeDaily: round(
                Math.max(0, safeDaily)
            ),
            risk,
            actionTitle,
            action,
            reason
        };
    }

    /* =====================================================
       SAFE TO SPEND
    ===================================================== */

    function getSafeToSpend() {
        const decision =
            getDecisionEngine();

        let status = "comfortable";

        if (
            decision.safeDaily <= 0
        ) {
            status = "restricted";
        } else if (
            decision.risk === "high"
        ) {
            status = "restricted";
        } else if (
            decision.risk === "medium"
        ) {
            status = "cautious";
        }

        return {
            amount:
                decision.safeDaily,
            remaining:
                decision.budgetRemaining,
            daysRemaining:
                decision.daysRemaining,
            status,
            projectedCashFlow:
                decision
                    .projectedMonthEnd
                    .projectedCashFlow,
            recurringPressure:
                decision.recurringExpense
        };
    }

    /* =====================================================
       SMART INSIGHT
    ===================================================== */

    function getSmartInsight() {
        const decision =
            getDecisionEngine();

        if (
            !getTransactions().length
        ) {
            return {
                title: "Start your money story",
                text:
                    "Add your first income or expense and MoneyLeak will begin learning your financial patterns.",
                type: "neutral"
            };
        }

        return {
            title:
                decision.actionTitle,
            text:
                `${decision.action} ${decision.reason}`,
            type:
                decision.risk === "high"
                    ? "warning"
                    : decision.risk === "medium"
                        ? "warning"
                        : "positive"
        };
    }

    /* =====================================================
       ALERTS
    ===================================================== */

    function generateAlerts() {
        const alerts = [];
        const decision =
            getDecisionEngine();

        if (
            decision.income <= 0 &&
            decision.expenses > 0
        ) {
            alerts.push({
                type: "warning",
                title: "Income is missing",
                message:
                    "You've recorded expenses this month but no income. Add your income for a more accurate financial picture."
            });
        }

        if (
            decision.budget > 0 &&
            decision.budgetSpent >=
            decision.budget
        ) {
            alerts.push({
                type: "danger",
                title: "Monthly budget exceeded",
                message:
                    `You've spent ${displayCurrency(
                        decision.budgetSpent -
                        decision.budget
                    )} above your monthly budget.`
            });
        } else if (
            decision.budget > 0 &&
            decision.budgetSpent >=
            decision.budget * 0.8
        ) {
            alerts.push({
                type: "warning",
                title: "Budget warning",
                message:
                    `You've used ${Math.round(
                        decision.budgetSpent /
                        decision.budget *
                        100
                    )}% of your monthly budget.`
            });
        }

        if (
            decision
                .projectedMonthEnd
                .projectedCashFlow < 0
        ) {
            alerts.push({
                type: "danger",
                title: "Month-end risk",
                message:
                    `Your current spending pace projects a ${displayCurrency(
                        Math.abs(
                            decision
                                .projectedMonthEnd
                                .projectedCashFlow
                        )
                    )} negative month-end cash flow.`
            });
        }

        if (
            decision.recurringExpense > 0
        ) {
            alerts.push({
                type: "info",
                title: "Recurring payments ahead",
                message:
                    `${displayCurrency(
                        decision.recurringExpense
                    )} in recurring expenses is expected for the rest of this month.`
            });
        }

        if (
            decision.biggestLeak &&
            decision.income > 0 &&
            decision.biggestLeak.amount >
            decision.income * 0.2
        ) {
            alerts.push({
                type: "warning",
                title:
                    `${decision.biggestLeak.category} is your biggest leak`,
                message:
                    `${decision.biggestLeak.category} has reached ${displayCurrency(
                        decision.biggestLeak.amount
                    )} this month.`
            });
        }

        getSavingsGoals()
            .filter(
                goal =>
                    !goal.completed &&
                    goal.deadline
            )
            .forEach(goal => {
                const deadline =
                    parseDate(
                        goal.deadline
                    );

                const days =
                    Math.ceil(
                        (
                            deadline -
                            new Date()
                        ) / 86400000
                    );

                if (
                    days >= 0 &&
                    days <= 30 &&
                    getGoalRemaining(goal) > 0
                ) {
                    alerts.push({
                        type: "warning",
                        title:
                            `${goal.name} deadline approaching`,
                        message:
                            `${displayCurrency(
                                getGoalRemaining(goal)
                            )} remains with about ${days} days left.`
                    });
                }
            });

        if (
            decision.savingsRate >= 20
        ) {
            alerts.push({
                type: "success",
                title: "Strong savings rate",
                message:
                    `You're currently saving about ${decision.savingsRate}% of recorded income.`
            });
        }

        if (!alerts.length) {
            alerts.push({
                type: "success",
                title: "You're on track",
                message:
                    "No major financial warnings were detected right now."
            });
        }

        return alerts;
    }

    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    function getNotificationHistory() {
        const history =
            read(
                STORAGE.notifications,
                []
            );

        return Array.isArray(history)
            ? history
            : [];
    }

    function saveNotificationHistory(history) {
        write(
            STORAGE.notifications,
            history
        );
    }

    function createNotification({
        title,
        message,
        type = "info",
        icon = "✦",
        key = ""
    }) {
        return {
            id: uid("notification"),
            key,
            title,
            message,
            type,
            icon,
            read: false,
            createdAt:
                new Date().toISOString()
        };
    }

    function addNotification(notification) {
        const history =
            getNotificationHistory();

        if (
            notification.key &&
            history.some(
                item =>
                    item.key ===
                    notification.key
            )
        ) {
            return;
        }

        history.unshift(notification);

        saveNotificationHistory(
            history.slice(0, 50)
        );

        renderNotificationCenter();
        updateNotificationBadge();
    }

    function markNotificationRead(id) {
        const history =
            getNotificationHistory();

        const item =
            history.find(
                n => n.id === id
            );

        if (item) {
            item.read = true;
        }

        saveNotificationHistory(history);

        renderNotificationCenter();
        updateNotificationBadge();
    }

    function markAllNotificationsRead() {
        const history =
            getNotificationHistory();

        history.forEach(
            n => n.read = true
        );

        saveNotificationHistory(history);

        renderNotificationCenter();
        updateNotificationBadge();
    }

    function clearNotificationHistory() {
        saveNotificationHistory([]);

        renderNotificationCenter();
        updateNotificationBadge();
    }

    function unreadNotificationCount() {
        return getNotificationHistory()
            .filter(n => !n.read)
            .length;
    }

    function syncSmartNotifications() {
        const settings =
            getSettings();

        if (
            settings.notifications === false
        ) {
            return;
        }

        const alerts =
            generateAlerts();

        write(
            STORAGE.alerts,
            alerts
        );

        alerts.forEach(alert => {
            const key =
                `${today().slice(0, 7)}_${alert.title}`;

            addNotification(
                createNotification({
                    title: alert.title,
                    message: alert.message,
                    type: alert.type,
                    icon:
                        alert.type === "success"
                            ? "✓"
                            : alert.type === "danger"
                                ? "!"
                                : "◆",
                    key
                })
            );
        });
    }

    function getAlerts() {
        return read(
            STORAGE.alerts,
            []
        );
    }

    function formatRelativeTime(value) {
        const diff =
            Date.now() -
            parseDate(value).getTime();

        const minutes =
            Math.floor(diff / 60000);

        if (minutes < 1) return "Just now";

        if (minutes < 60) {
            return `${minutes}m ago`;
        }

        const hours =
            Math.floor(minutes / 60);

        if (hours < 24) {
            return `${hours}h ago`;
        }

        const days =
            Math.floor(hours / 24);

        if (days < 7) {
            return `${days}d ago`;
        }

        return parseDate(value)
            .toLocaleDateString(
                undefined,
                {
                    day: "numeric",
                    month: "short"
                }
            );
    }

    function renderNotificationCenter() {
        const container =
            $("#notificationList");

        if (!container) return;

        let history =
            getNotificationHistory();

        const activeTab =
            window.moneyLeakNotificationTab ||
            "all";

        if (activeTab === "unread") {
            history =
                history.filter(
                    n => !n.read
                );
        }

        if (!history.length) {
            container.innerHTML = `
                <div class="notification-empty">
                    <div class="notification-empty-icon">✓</div>
                    <strong>You're all caught up</strong>
                    <p>
                        New MoneyLeak insights and alerts
                        will appear here.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            history.map(n => `
                <article
                    class="moneyLeakNotification ${n.read ? "" : "unread"}"
                    data-notification-id="${escapeHTML(n.id)}"
                >
                    <div class="moneyLeakNotificationIcon ${escapeHTML(n.type || "info")}">
                        ${escapeHTML(n.icon || "✦")}
                    </div>

                    <div class="moneyLeakNotificationContent">
                        <div class="notification-content-top">
                            <strong>
                                ${escapeHTML(n.title)}
                            </strong>

                            ${
                                !n.read
                                    ? `<span class="moneyLeakNotificationDot"></span>`
                                    : ""
                            }
                        </div>

                        <p>
                            ${escapeHTML(n.message)}
                        </p>

                        <small>
                            ${formatRelativeTime(n.createdAt)}
                        </small>
                    </div>
                </article>
            `)
            .join("");

        $$(".moneyLeakNotification", container)
            .forEach(item => {
                item.addEventListener(
                    "click",
                    () => {
                        markNotificationRead(
                            item.dataset.notificationId
                        );
                    }
                );
            });
    }

    function updateNotificationBadge() {
        const count =
            unreadNotificationCount();

        $$("#notificationBadge, #notificationUnreadBadge")
            .forEach(badge => {
                if (count > 0) {
                    badge.hidden = false;
                    badge.textContent =
                        count > 99
                            ? "99+"
                            : count;
                } else {
                    badge.hidden = true;
                }
            });
    }

    function setupNotifications() {
        const button =
            $("#notificationButton");

        const panel =
            $("#notificationPanel");

        const close =
            $("#closeNotifications");

        if (!panel) return;

        renderNotificationCenter();
        updateNotificationBadge();

        button?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                panel.classList.toggle(
                    "open"
                );

                panel.setAttribute(
                    "aria-hidden",
                    panel.classList.contains("open")
                        ? "false"
                        : "true"
                );
            }
        );

        close?.addEventListener(
            "click",
            () => {
                panel.classList.remove(
                    "open"
                );

                panel.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        );

        $("#markAllNotificationsRead")
            ?.addEventListener(
                "click",
                markAllNotificationsRead
            );

        $("#clearNotifications")
            ?.addEventListener(
                "click",
                () => {
                    if (
                        confirm(
                            "Clear your notification history?"
                        )
                    ) {
                        clearNotificationHistory();
                    }
                }
            );

        $$("[data-notification-tab]")
            .forEach(tab => {
                tab.addEventListener(
                    "click",
                    () => {
                        window.moneyLeakNotificationTab =
                            tab.dataset.notificationTab;

                        $$("[data-notification-tab]")
                            .forEach(
                                button => {
                                    button.classList.toggle(
                                        "active",
                                        button === tab
                                    );
                                }
                            );

                        renderNotificationCenter();
                    }
                );
            });
    }

    /* =====================================================
       SEARCH
    ===================================================== */

    const SEARCH_PAGES = [
        {
            title: "Dashboard",
            description: "Your complete financial overview",
            url: "./index.html",
            icon: "⌂",
            keywords: "home balance money overview"
        },
        {
            title: "Income",
            description: "Manage income and sources",
            url: "./income.html",
            icon: "↗",
            keywords: "salary earnings received"
        },
        {
            title: "Expenses",
            description: "Track and understand spending",
            url: "./expenses.html",
            icon: "↘",
            keywords: "spending purchases leaks"
        },
        {
            title: "Budgets",
            description: "Control monthly and category budgets",
            url: "./budgets.html",
            icon: "▣",
            keywords: "limits control"
        },
        {
            title: "Goals",
            description: "Build savings goals",
            url: "./savings.html",
            icon: "◎",
            keywords: "savings targets wealth"
        },
        {
            title: "Recurring",
            description: "Manage recurring bills and income",
            url: "./recurring.html",
            icon: "↻",
            keywords: "bills subscriptions rent"
        },
        {
            title: "Analytics",
            description: "Explore your financial intelligence",
            url: "./analytics.html",
            icon: "◈",
            keywords: "charts trends data"
        },
        {
            title: "Settings",
            description: "Control your MoneyLeak experience",
            url: "./settings.html",
            icon: "⚙",
            keywords: "profile preferences theme"
        }
    ];

    const SEARCH_ACTIONS = [
        {
            title: "Add income",
            description: "Record a new income transaction",
            url: "./income.html",
            icon: "+"
        },
        {
            title: "Add expense",
            description: "Record a new expense transaction",
            url: "./expenses.html",
            icon: "+"
        },
        {
            title: "Create savings goal",
            description: "Start a financial goal",
            url: "./savings.html",
            icon: "+"
        },
        {
            title: "Set budget",
            description: "Create or update your budget",
            url: "./budgets.html",
            icon: "+"
        }
    ];

    function scoreSearch(text, query) {
        const haystack =
            text.toLowerCase();

        const needle =
            query.toLowerCase().trim();

        if (!needle) return 0;

        if (haystack === needle) {
            return 100;
        }

        if (
            haystack.startsWith(needle)
        ) {
            return 80;
        }

        if (
            haystack.includes(needle)
        ) {
            return 50;
        }

        return needle
            .split(/\s+/)
            .reduce(
                (score, word) =>
                    word &&
                    haystack.includes(word)
                        ? score + 15
                        : score,
                0
            );
    }

    function searchAll(query) {
        const results = [];

        SEARCH_PAGES.forEach(page => {
            const score =
                scoreSearch(
                    `${page.title} ${page.description} ${page.keywords}`,
                    query
                );

            if (score > 0) {
                results.push({
                    ...page,
                    type: "page",
                    score
                });
            }
        });

        SEARCH_ACTIONS.forEach(action => {
            const score =
                scoreSearch(
                    `${action.title} ${action.description}`,
                    query
                );

            if (score > 0) {
                results.push({
                    ...action,
                    type: "action",
                    score
                });
            }
        });

        getTransactions().forEach(t => {
            const score =
                scoreSearch(
                    `${t.description} ${t.category} ${t.source}`,
                    query
                );

            if (score > 0) {
                results.push({
                    title:
                        t.description ||
                        t.category,
                    description:
                        `${t.type === "income" ? "Income" : "Expense"} · ${displayCurrency(t.amount)}`,
                    url:
                        t.type === "income"
                            ? "./income.html"
                            : "./expenses.html",
                    icon:
                        t.type === "income"
                            ? "↗"
                            : "↘",
                    type: "transaction",
                    score: score + 5
                });
            }
        });

        getSavingsGoals().forEach(goal => {
            const score =
                scoreSearch(
                    `${goal.name} ${goal.description}`,
                    query
                );

            if (score > 0) {
                results.push({
                    title: goal.name,
                    description:
                        `${displayCurrency(goal.current)} of ${displayCurrency(goal.target)} saved`,
                    url: "./savings.html",
                    icon: "◎",
                    type: "goal",
                    score: score + 5
                });
            }
        });

        return results
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .slice(0, 12);
    }

    function renderSearchResults(query = "") {
        const container =
            $("#searchResults");

        if (!container) return;

        if (!query.trim()) {
            container.innerHTML = `
                <div class="search-section">
                    <div class="search-section-title">
                        Quick actions
                    </div>

                    <div class="search-suggestion-grid">
                        ${SEARCH_ACTIONS.map(action => `
                            <a
                                class="search-result-item"
                                href="${action.url}"
                            >
                                <span class="search-result-icon">
                                    ${action.icon}
                                </span>

                                <span class="search-result-main">
                                    <strong>
                                        ${escapeHTML(action.title)}
                                    </strong>

                                    <small>
                                        ${escapeHTML(action.description)}
                                    </small>
                                </span>

                                <span class="search-result-arrow">
                                    →
                                </span>
                            </a>
                        `).join("")}
                    </div>
                </div>

                <div class="search-section">
                    <div class="search-section-title">
                        Navigate
                    </div>

                    ${SEARCH_PAGES.slice(0, 4).map(page => `
                        <a
                            class="search-result-item"
                            href="${page.url}"
                        >
                            <span class="search-result-icon">
                                ${page.icon}
                            </span>

                            <span class="search-result-main">
                                <strong>
                                    ${escapeHTML(page.title)}
                                </strong>

                                <small>
                                    ${escapeHTML(page.description)}
                                </small>
                            </span>

                            <span class="search-result-arrow">
                                →
                            </span>
                        </a>
                    `).join("")}
                </div>
            `;

            return;
        }

        const results =
            searchAll(query);

        if (!results.length) {
            container.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">
                        ⌕
                    </div>

                    <strong>
                        Nothing found
                    </strong>

                    <p>
                        Try searching for a page,
                        transaction, goal, or action.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            results.map(result => `
                <a
                    class="search-result-item"
                    href="${result.url}"
                >
                    <span class="search-result-icon">
                        ${escapeHTML(result.icon || "⌕")}
                    </span>

                    <span class="search-result-main">
                        <strong>
                            ${escapeHTML(result.title)}
                        </strong>

                        <small>
                            ${escapeHTML(result.description)}
                        </small>
                    </span>

                    <span class="search-result-arrow">
                        →
                    </span>
                </a>
            `).join("");
    }

    function setupSearch() {
    /*
     * =====================================================
     * MONEYLEAK UNIVERSAL SEARCH
     * Independent search system
     * =====================================================
     */

    let overlay = document.getElementById("searchOverlay");

    /*
     * If the HTML doesn't contain a search overlay,
     * create one automatically.
     */
    if (!overlay) {
        overlay = document.createElement("div");

        overlay.id = "searchOverlay";
        overlay.className = "search-overlay";

        overlay.innerHTML = `
            <div class="search-modal" role="dialog" aria-modal="true">

                <div class="search-modal-header">
                    <div>
                        <div class="search-modal-eyebrow">
                            MONEYLEAK SEARCH
                        </div>

                        <h2>Search MoneyLeak</h2>
                    </div>

                    <button
                        type="button"
                        class="search-close"
                        id="closeSearch"
                        aria-label="Close search"
                    >
                        ×
                    </button>
                </div>

                <div class="search-input-wrapper">
                    <span>⌕</span>

                    <input
                        id="globalSearch"
                        type="search"
                        placeholder="Search transactions, pages, goals..."
                        autocomplete="off"
                    />

                    <kbd>ESC</kbd>
                </div>

                <div
                    id="searchResults"
                    class="search-results"
                ></div>

            </div>
        `;

        document.body.appendChild(overlay);
    }

    const modal =
        overlay.querySelector(".search-modal");

    const input =
        document.getElementById("globalSearch");

    const closeButton =
        document.getElementById("closeSearch");

    const results =
        document.getElementById("searchResults");


    /*
     * =====================================================
     * OPEN
     * =====================================================
     */

    function openSearch() {

        overlay.classList.add("open");
        overlay.classList.add("active");

        overlay.style.display = "flex";

        overlay.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow = "hidden";

        renderResults("");

        setTimeout(() => {
            input?.focus();
        }, 100);
    }


    /*
     * =====================================================
     * CLOSE
     * =====================================================
     */

    function closeSearch() {

        overlay.classList.remove("open");
        overlay.classList.remove("active");

        overlay.style.display = "none";

        overlay.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow = "";

        if (input) {
            input.value = "";
        }
    }


    /*
     * =====================================================
     * NAVIGATION DATA
     * =====================================================
     */

    const pages = [
        {
            name: "Dashboard",
            description: "Your financial overview",
            icon: "⌂",
            url: "index.html"
        },
        {
            name: "Income",
            description: "Manage your income",
            icon: "↗",
            url: "income.html"
        },
        {
            name: "Expenses",
            description: "Track your spending",
            icon: "↘",
            url: "expenses.html"
        },
        {
            name: "Savings Goals",
            description: "Manage your savings goals",
            icon: "◎",
            url: "savings.html"
        },
        {
            name: "Budgets",
            description: "Manage monthly budgets",
            icon: "▣",
            url: "budgets.html"
        },
        {
            name: "Recurring",
            description: "Bills and recurring transactions",
            icon: "↻",
            url: "recurring.html"
        },
        {
            name: "Analytics",
            description: "Analyze your finances",
            icon: "⌁",
            url: "analytics.html"
        },
        {
            name: "Settings",
            description: "App preferences",
            icon: "⚙",
            url: "settings.html"
        }
    ];


    /*
     * =====================================================
     * SEARCH DATA
     * =====================================================
     */

    function getTransactions() {

        try {

            const raw =
                localStorage.getItem(
                    "moneyLeakTransactions"
                );

            if (!raw) {
                return [];
            }

            const data =
                JSON.parse(raw);

            return Array.isArray(data)
                ? data
                : [];

        } catch (error) {

            console.error(
                "MoneyLeak search transaction error:",
                error
            );

            return [];
        }
    }


    function getGoals() {

        try {

            const raw =
                localStorage.getItem(
                    "moneyLeakSavingsGoals"
                );

            if (!raw) {
                return [];
            }

            const data =
                JSON.parse(raw);

            return Array.isArray(data)
                ? data
                : [];

        } catch (error) {

            return [];
        }
    }


    /*
     * =====================================================
     * RENDER RESULTS
     * =====================================================
     */

    function renderResults(query) {

        if (!results) {
            return;
        }

        const q =
            String(query || "")
                .trim()
                .toLowerCase();


        /*
         * Empty search
         */

        if (!q) {

            results.innerHTML = `
                <div class="search-section">

                    <div class="search-section-title">
                        QUICK ACCESS
                    </div>

                    <div class="search-suggestion-grid">

                        ${pages.map(page => `
                            <button
                                type="button"
                                class="search-result-item"
                                data-search-url="${page.url}"
                            >

                                <span class="search-result-icon">
                                    ${page.icon}
                                </span>

                                <span class="search-result-main">

                                    <span class="search-result-value">
                                        ${page.name}
                                    </span>

                                    <small>
                                        ${page.description}
                                    </small>

                                </span>

                                <span class="search-result-arrow">
                                    →
                                </span>

                            </button>
                        `).join("")}

                    </div>

                </div>
            `;

            bindResults();

            return;
        }


        const matches = [];


        /*
         * PAGE SEARCH
         */

        pages.forEach(page => {

            const text =
                (
                    page.name +
                    " " +
                    page.description
                ).toLowerCase();

            if (text.includes(q)) {

                matches.push({
                    type: "page",
                    title: page.name,
                    description: page.description,
                    icon: page.icon,
                    url: page.url
                });
            }
        });


        /*
         * TRANSACTION SEARCH
         */

        const transactions =
            getTransactions();

        transactions.forEach(transaction => {

            const text =
                JSON.stringify(
                    transaction
                ).toLowerCase();

            if (text.includes(q)) {

                const type =
                    transaction.type ||
                    (
                        transaction.amount < 0
                            ? "expense"
                            : "income"
                    );

                matches.push({
                    type: "transaction",
                    title:
                        transaction.description ||
                        transaction.note ||
                        transaction.category ||
                        "Transaction",

                    description:
                        `${type} • ${transaction.category || "General"}`,

                    icon:
                        type === "income"
                            ? "↗"
                            : "↘",

                    transaction
                });
            }
        });


        /*
         * SAVINGS GOALS
         */

        const goals =
            getGoals();

        goals.forEach(goal => {

            const text =
                JSON.stringify(
                    goal
                ).toLowerCase();

            if (text.includes(q)) {

                matches.push({
                    type: "goal",
                    title:
                        goal.name ||
                        goal.title ||
                        "Savings Goal",

                    description:
                        "Savings goal",

                    icon: "◎"
                });
            }
        });


        /*
         * NO RESULTS
         */

        if (!matches.length) {

            results.innerHTML = `
                <div class="search-empty">

                    <div style="
                        font-size:32px;
                        margin-bottom:10px;
                    ">
                        ⌕
                    </div>

                    <strong>
                        No results found
                    </strong>

                    <div style="
                        margin-top:6px;
                    ">
                        Try another search term.
                    </div>

                </div>
            `;

            return;
        }


        /*
         * RESULTS
         */

        results.innerHTML = `
            <div class="search-section">

                <div class="search-section-title">
                    SEARCH RESULTS
                </div>

                ${matches.slice(0, 25).map((item, index) => {

                    if (item.type === "page") {

                        return `
                            <button
                                type="button"
                                class="search-result-item"
                                data-search-url="${item.url}"
                            >

                                <span class="search-result-icon">
                                    ${item.icon}
                                </span>

                                <span class="search-result-main">

                                    <span class="search-result-value">
                                        ${escapeSearchHTML(item.title)}
                                    </span>

                                    <small>
                                        ${escapeSearchHTML(item.description)}
                                    </small>

                                </span>

                                <span class="search-result-arrow">
                                    →
                                </span>

                            </button>
                        `;
                    }


                    return `
                        <div
                            class="search-result-item"
                            data-result-index="${index}"
                        >

                            <span class="search-result-icon">
                                ${item.icon}
                            </span>

                            <span class="search-result-main">

                                <span class="search-result-value">
                                    ${escapeSearchHTML(item.title)}
                                </span>

                                <small>
                                    ${escapeSearchHTML(item.description)}
                                </small>

                            </span>

                        </div>
                    `;

                }).join("")}

            </div>
        `;

        bindResults();
    }


    /*
     * =====================================================
     * HTML SAFETY
     * =====================================================
     */

    function escapeSearchHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /*
     * =====================================================
     * RESULT CLICK
     * =====================================================
     */

    function bindResults() {

        const links =
            results.querySelectorAll(
                "[data-search-url]"
            );

        links.forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    const url =
                        this.getAttribute(
                            "data-search-url"
                        );

                    if (url) {
                        window.location.href =
                            url;
                    }
                }
            );

        });
    }


    /*
     * =====================================================
     * FIND THE SEARCH BUTTON
     * =====================================================
     */

    function findSearchButtons() {

        const selectors = [
            "#searchButton",
            ".search-trigger",
            "[data-search]",
            "[aria-label*='Search']",
            "[title*='Search']"
        ];

        const found = [];

        selectors.forEach(selector => {

            document
                .querySelectorAll(selector)
                .forEach(element => {

                    if (!found.includes(element)) {
                        found.push(element);
                    }

                });

        });

        /*
         * Also detect a button/link containing
         * the word "Search".
         */

        document
            .querySelectorAll(
                "button, a"
            )
            .forEach(element => {

                const text =
                    element.textContent
                        .trim()
                        .toLowerCase();

                if (
                    text === "search" ||
                    text.includes("search")
                ) {

                    if (!found.includes(element)) {
                        found.push(element);
                    }
                }

            });

        return found;
    }


    /*
     * =====================================================
     * CONNECT SEARCH BUTTONS
     * =====================================================
     */

    const searchButtons =
        findSearchButtons();

    searchButtons.forEach(button => {

        if (
            button.dataset.moneyLeakSearchBound
        ) {
            return;
        }

        button.dataset.moneyLeakSearchBound =
            "true";

        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                openSearch();
            }
        );

    });


    /*
     * =====================================================
     * CLOSE
     * =====================================================
     */

    closeButton?.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            closeSearch();
        }
    );


    /*
     * CLICK OUTSIDE
     */

    overlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target === overlay
            ) {
                closeSearch();
            }

        }
    );


    /*
     * PREVENT MODAL CLICK FROM CLOSING
     */

    modal?.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();
        }
    );


    /*
     * =====================================================
     * LIVE SEARCH
     * =====================================================
     */

    input?.addEventListener(
        "input",
        function () {

            renderResults(
                input.value
            );

        }
    );


    /*
     * =====================================================
     * KEYBOARD
     * =====================================================
     */

    document.addEventListener(
        "keydown",
        function (event) {

            /*
             * ESC
             */

            if (
                event.key === "Escape"
            ) {

                if (
                    overlay.classList.contains("open") ||
                    overlay.classList.contains("active")
                ) {
                    closeSearch();
                }

                return;
            }


            /*
             * CMD + K
             * CTRL + K
             */

            if (
                (event.metaKey ||
                    event.ctrlKey) &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();

                if (
                    overlay.classList.contains("open") ||
                    overlay.classList.contains("active")
                ) {
                    closeSearch();
                } else {
                    openSearch();
                }

                return;
            }


            /*
             * /
             */

            const active =
                document.activeElement;

            const typing =
                active &&
                (
                    active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    active.tagName === "SELECT" ||
                    active.isContentEditable
                );

            if (
                event.key === "/" &&
                !typing
            ) {

                event.preventDefault();

                openSearch();
            }

        }
    );


    /*
     * =====================================================
     * FINAL SAFETY BUTTON
     * =====================================================
     *
     * If the existing website has no detectable
     * search button at all, create a small floating
     * search button so the feature can ALWAYS open.
     */

    if (!searchButtons.length) {

        const floating =
            document.createElement("button");

        floating.type = "button";

        floating.innerHTML = "⌕";

        floating.title =
            "Search MoneyLeak";

        floating.setAttribute(
            "aria-label",
            "Search MoneyLeak"
        );

        floating.style.cssText = `
            position: fixed;
            right: 24px;
            bottom: 24px;
            width: 50px;
            height: 50px;
            border: 0;
            border-radius: 15px;
            background: #087856;
            color: white;
            font-size: 23px;
            font-weight: 800;
            cursor: pointer;
            z-index: 5000;
            box-shadow: 0 12px 30px rgba(8,120,86,.28);
        `;

        floating.addEventListener(
            "click",
            openSearch
        );

        document.body.appendChild(
            floating
        );

        console.log(
            "MoneyLeak: fallback search button created."
        );
    }


    console.log(
        "MoneyLeak Universal Search Ready."
    );
}

    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(message) {
        $(".moneyLeakToast")?.remove();

        const toast =
            document.createElement("div");

        toast.className =
            "moneyLeakToast";

        toast.textContent =
            message;

        Object.assign(
            toast.style,
            {
                position: "fixed",
                right: "22px",
                bottom: "22px",
                zIndex: "100000",
                padding: "13px 17px",
                borderRadius: "14px",
                background: "var(--text, #102b22)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                boxShadow:
                    "0 18px 45px rgba(0,0,0,.16)",
                transition: "all .2s ease"
            }
        );

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform =
                "translateY(8px)";

            setTimeout(
                () => toast.remove(),
                250
            );
        }, 2200);
    }

    /* =====================================================
       DASHBOARD
    ===================================================== */

    function updateDashboard() {
        const month =
            currentMonthTransactions();

        const income =
            getIncome(month);

        const expenses =
            getExpenses(month);

        const cashFlow =
            getCashFlow(month);

        const savingsRate =
            getSavingsRate(month);

        const goals =
            getSavingsGoals();

        const totalSaved =
            goals.reduce(
                (sum, g) =>
                    sum + g.current,
                0
            );

        const totalTarget =
            goals.reduce(
                (sum, g) =>
                    sum + g.target,
                0
            );

        const goalProgress =
            totalTarget > 0
                ? clamp(
                    totalSaved /
                    totalTarget *
                    100,
                    0,
                    100
                )
                : 0;

        const health =
            getFinancialHealth();

        const score =
            getMoneyLeakScore();

        const insight =
            getSmartInsight();

        const decision =
            getDecisionEngine();

        setText(
            "#overviewBalance",
            displayCurrency(
                getIncome() -
                getExpenses()
            )
        );

        setText(
            "#overviewIncome",
            displayCurrency(income)
        );

        setText(
            "#overviewExpenses",
            displayCurrency(expenses)
        );

        setText(
            "#overviewSavingsRate",
            `${savingsRate}%`
        );

        setText(
            "#overviewGoalProgress",
            `${Math.round(goalProgress)}%`
        );

        setWidth(
            "#overviewGoalFill",
            goalProgress
        );

        setText(
            "#overviewHealthScore",
            health.score
        );

        setText(
            "#overviewHealthStatus",
            health.status
        );

        setText(
            "#overviewInsightTitle",
            insight.title
        );

        setText(
            "#overviewInsightText",
            insight.text
        );

        setText(
            "#periodIncome",
            displayCurrency(income)
        );

        setText(
            "#periodExpenses",
            displayCurrency(expenses)
        );

        setText(
            "#periodCashFlow",
            displayCurrency(cashFlow)
        );

        setText(
            "#safeToSpendDashboard",
            displayCurrency(
                decision.safeDaily
            )
        );

        setText(
            "#safeToSpendMessage",
            decision.risk === "high"
                ? "Your spending limit is restricted."
                : `You have about ${decision.daysRemaining} days left in this month.`
        );

        setText(
            "#safeToSpendAdvice",
            decision.action
        );

        setText(
            "#healthScore",
            health.score
        );

        setWidth(
            "#healthFill",
            health.score
        );

        setText(
            "#healthMessage",
            health.message
        );

        setText(
            "#healthExplanation",
            `MoneyLeak Score: ${score.score}/100 — ${score.grade}.`
        );

        setText(
            "#healthIncomeFactor",
            health.factors.spending
        );

        setText(
            "#healthBudgetFactor",
            health.factors.budget
        );

        setText(
            "#healthSavingsFactor",
            health.factors.savings
        );

        setText(
            "#healthRecurringFactor",
            health.factors.recurring
        );

        setWidth(
            "#healthIncomeBar",
            health.factors.spending * 5
        );

        setWidth(
            "#healthBudgetBar",
            health.factors.budget * 5
        );

        setWidth(
            "#healthSavingsBar",
            health.factors.savings * 5
        );

        setWidth(
            "#healthRecurringBar",
            health.factors.recurring * 10
        );

        renderRecentTransactions();
        renderTopCategories();
        renderDashboardGoals();
        renderDashboardBudget();
        renderFinancialAlerts();
    }

    function renderRecentTransactions() {
    const container = $("#recentTransactions");

    if (!container) return;

    const transactions =
        getTransactions()
            .sort(
                (a, b) =>
                    parseDate(b.date) -
                    parseDate(a.date)
            )
            .slice(0, 8);

    if (!transactions.length) {
        container.innerHTML =
            emptyHTML(
                "No transactions yet",
                "Add your first income or expense."
            );
        return;
    }

    container.innerHTML =
        transactions.map(t => {

            const formattedDate =
                parseDate(t.date).toLocaleDateString(
                    "en-NG",
                    {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    }
                );

            const category =
                String(
                    t.category || "Other"
                )
                    .trim()
                    .toLowerCase()
                    .replace(
                        /\b\w/g,
                        letter => letter.toUpperCase()
                    );

            return `
                <div class="transaction-row">

                    <div>
                        <strong>
                            ${escapeHTML(
                                t.description ||
                                category ||
                                "Transaction"
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(category)}
                            ·
                            ${escapeHTML(formattedDate)}
                        </small>
                    </div>

                    <strong
                        class="${
                            t.type === "income"
                                ? "income"
                                : "expense"
                        }"
                    >
                        ${t.type === "income" ? "+" : "-"}
                        ${displayCurrency(t.amount)}
                    </strong>

                </div>
            `;

        }).join("");
}
    function renderTopCategories() {
        const container =
            $("#topSpendingCategories");

        if (!container) return;

        const categories =
            getCategoryTotals(
                currentMonthTransactions()
            ).slice(0, 5);

        if (!categories.length) {
            container.innerHTML =
                emptyHTML(
                    "No spending data",
                    "Your biggest categories will appear here."
                );

            return;
        }

        container.innerHTML =
            categories.map(item => `
                <div class="category-row">
                    <div>
                        <strong>
                            ${escapeHTML(item.category)}
                        </strong>
                    </div>

                    <strong>
                        ${displayCurrency(item.amount)}
                    </strong>
                </div>
            `).join("");
    }

    function renderDashboardGoals() {
        const container =
            $("#dashboardGoals");

        if (!container) return;

        const goals =
            getSavingsGoals()
                .filter(
                    g => !g.completed
                )
                .slice(0, 4);

        if (!goals.length) {
            container.innerHTML =
                emptyHTML(
                    "No active goals",
                    "Create a savings goal to start building wealth."
                );

            return;
        }

        container.innerHTML =
            goals.map(goal => {
                const progress =
                    getGoalProgress(goal);

                return `
                    <div class="goal-row">
                        <div>
                            <strong>
                                ${escapeHTML(goal.name)}
                            </strong>

                            <small>
                                ${displayCurrency(goal.current)}
                                of
                                ${displayCurrency(goal.target)}
                            </small>
                        </div>

                        <div class="progress-track">
                            <span
                                class="progress-fill"
                                style="width:${progress}%"
                            ></span>
                        </div>

                        <strong>
                            ${Math.round(progress)}%
                        </strong>
                    </div>
                `;
            }).join("");
    }

    function renderDashboardBudget() {
        const budget =
            getMonthlyBudget();

        const spent =
            getBudgetUsage();

        const remaining =
            Math.max(
                0,
                budget - spent
            );

        const percentage =
            budget > 0
                ? clamp(
                    spent /
                    budget *
                    100,
                    0,
                    100
                )
                : 0;

        setText(
            "#dashboardBudgetPercent",
            `${Math.round(percentage)}%`
        );

        setWidth(
            "#dashboardBudgetFill",
            percentage
        );

        setText(
            "#dashboardBudgetSpent",
            displayCurrency(spent)
        );

        setText(
            "#dashboardBudgetRemaining",
            displayCurrency(remaining)
        );

        setText(
            "#dashboardBudgetLimit",
            displayCurrency(budget)
        );
    }

    function renderFinancialAlerts() {
        const container =
            $("#financialAlerts");

        if (!container) return;

        const alerts =
            generateAlerts().slice(0, 5);

        container.innerHTML =
            alerts.map(alert => `
                <div class="alert-card ${escapeHTML(alert.type)}">
                    <strong>
                        ${escapeHTML(alert.title)}
                    </strong>

                    <p>
                        ${escapeHTML(alert.message)}
                    </p>
                </div>
            `).join("");
    }

    /* =====================================================
       INCOME PAGE
    ===================================================== */

    function updateIncomePage() {
        const month =
            currentMonthTransactions();

        const previous =
            getTransactions()
                .filter(
                    t =>
                        monthKey(t.date) ===
                        getPreviousMonthKey()
                );

        const income =
            getIncome(month);

        const previousIncome =
            getIncome(previous);

        setText(
            "#incomeThisMonth",
            displayCurrency(income)
        );

        setText(
            "#incomePreviousMonth",
            displayCurrency(previousIncome)
        );

        setText(
            "#incomeMonthComparison",
            formatChange(
                getPercentageChange(
                    previousIncome,
                    income
                )
            )
        );

        setText(
            "#incomeAverage",
            displayCurrency(
                getIncome(getTransactions()) /
                Math.max(
                    1,
                    new Set(
                        getTransactions()
                            .filter(
                                t =>
                                    t.type ===
                                    "income"
                            )
                            .map(
                                t =>
                                    monthKey(t.date)
                            )
                    ).size
                )
            )
        );

        setText(
            "#incomeSourceCount",
            new Set(
                getTransactions()
                    .filter(
                        t =>
                            t.type ===
                            "income"
                    )
                    .map(
                        t =>
                            t.source ||
                            t.category
                    )
            ).size
        );

        const sourceTotals = {};

        month
            .filter(
                t => t.type === "income"
            )
            .forEach(t => {
                const source =
                    t.source ||
                    t.category ||
                    "Other";

                sourceTotals[source] =
                    (
                        sourceTotals[source] ||
                        0
                    ) + t.amount;
            });

        const strongest =
            Object.entries(
                sourceTotals
            ).sort(
                (a, b) =>
                    b[1] - a[1]
            )[0];

        setText(
            "#strongestIncomeSource",
            strongest
                ? strongest[0]
                : "—"
        );

        setText(
            "#largestIncome",
            strongest
                ? displayCurrency(
                    strongest[1]
                )
                : displayCurrency(0)
        );

        setText(
            "#incomeStability",
            `${getIncomeStability()}%`
        );

        setText(
            "#incomeInsight",
            strongest
                ? `${strongest[0]} is currently your strongest income source at ${displayCurrency(strongest[1])}.`
                : "Add income records to unlock income intelligence."
        );

        renderIncomeSources();
        updateIncomeHistory();
    }

    function renderIncomeSources() {
        const container =
            $("#incomeSources");

        if (!container) return;

        const totals = {};

        currentMonthTransactions()
            .filter(
                t => t.type === "income"
            )
            .forEach(t => {
                const source =
                    t.source ||
                    t.category ||
                    "Other";

                totals[source] =
                    (
                        totals[source] ||
                        0
                    ) + t.amount;
            });

        const entries =
            Object.entries(totals)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );

        container.innerHTML =
            entries.length
                ? entries.map(
                    ([source, amount]) => `
                        <div class="category-row">
                            <strong>
                                ${escapeHTML(source)}
                            </strong>

                            <strong>
                                ${displayCurrency(amount)}
                            </strong>
                        </div>
                    `
                ).join("")
                : emptyHTML(
                    "No income yet",
                    "Your income sources will appear here."
                );
    }

    function updateIncomeHistory() {
        const container =
            $("#incomeHistory");

        if (!container) return;

        const filter =
            $("#incomeFilterSource")?.value ||
            "all";

        const search =
            (
                $("#incomeSearch")?.value ||
                ""
            ).toLowerCase();

        let transactions =
            getTransactions()
                .filter(
                    t =>
                        t.type ===
                        "income"
                );

        if (filter !== "all") {
            transactions =
                transactions.filter(
                    t =>
                        (
                            t.source ||
                            t.category
                        ) === filter
                );
        }

        if (search) {
            transactions =
                transactions.filter(
                    t =>
                        `${t.description} ${t.source} ${t.category}`
                            .toLowerCase()
                            .includes(search)
                );
        }

        transactions.sort(
            (a, b) =>
                parseDate(b.date) -
                parseDate(a.date)
        );

        container.innerHTML =
            transactions.length
                ? transactions.map(t => `
                    <div class="transaction-row">
                        <div>
                            <strong>
                                ${escapeHTML(
                                    t.description ||
                                    t.source ||
                                    "Income"
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    t.source ||
                                    t.category
                                )}
                                ·
                                ${escapeHTML(t.date)}
                            </small>
                        </div>

                        <div>
                            <strong>
                                +${displayCurrency(t.amount)}
                            </strong>

                            <button
                                type="button"
                                data-delete-income="${escapeHTML(t.id)}"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                `).join("")
                : emptyHTML(
                    "No income found",
                    "Try another filter or add income."
                );

        $$("[data-delete-income]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        deleteTransaction(
                            button.dataset.deleteIncome
                        );
                    }
                );
            });
    }

    /* =====================================================
       EXPENSE PAGE
    ===================================================== */

    function updateExpensePage() {
        const month =
            currentMonthTransactions();

        const previous =
            getTransactions()
                .filter(
                    t =>
                        monthKey(t.date) ===
                        getPreviousMonthKey()
                );

        const expenses =
            getExpenses(month);

        const previousExpenses =
            getExpenses(previous);

        setText(
            "#expenseThisMonth",
            displayCurrency(expenses)
        );

        setText(
            "#expensePreviousMonth",
            displayCurrency(previousExpenses)
        );

        setText(
            "#expenseMonthComparison",
            formatChange(
                getPercentageChange(
                    previousExpenses,
                    expenses
                )
            )
        );

        setText(
            "#expenseDailyAverage",
            displayCurrency(
                expenses /
                Math.max(
                    1,
                    new Date().getDate()
                )
            )
        );

        setText(
            "#expenseTransactionCount",
            month.filter(
                t => t.type === "expense"
            ).length
        );

        const categories =
            getCategoryTotals(month);

        const biggest =
            categories[0];

        const percentage =
            biggest &&
            getIncome(month) > 0
                ? round(
                    biggest.amount /
                    getIncome(month) *
                    100
                )
                : 0;

        setText(
            "#biggestLeakCategory",
            biggest
                ? biggest.category
                : "—"
        );

        setText(
            "#biggestLeakAmount",
            biggest
                ? displayCurrency(
                    biggest.amount
                )
                : displayCurrency(0)
        );

        setText(
            "#biggestLeakPercentage",
            `${percentage}%`
        );

        setText(
            "#biggestLeakAdvice",
            biggest
                ? `Review ${biggest.category} before making additional discretionary purchases.`
                : "Add expenses to identify your biggest leak."
        );

        setText(
            "#spendingStatus",
            getSpendingVelocity().status
        );

        const largest =
            getLargestExpense(month);

        setText(
            "#mostExpensiveDay",
            largest
                ? largest.date
                : "—"
        );

        setText(
            "#largestExpense",
            largest
                ? displayCurrency(
                    largest.amount
                )
                : displayCurrency(0)
        );

        setText(
            "#averageExpense",
            displayCurrency(
                getAverageExpense(month)
            )
        );

        renderExpenseCategories();
        updateExpenseHistory();
    }

    function renderExpenseCategories() {
        const container =
            $("#expenseCategories");

        if (!container) return;

        const categories =
            getCategoryTotals(
                currentMonthTransactions()
            );

        container.innerHTML =
            categories.length
                ? categories.map(item => `
                    <div class="category-row">
                        <strong>
                            ${escapeHTML(item.category)}
                        </strong>

                        <strong>
                            ${displayCurrency(item.amount)}
                        </strong>
                    </div>
                `).join("")
                : emptyHTML(
                    "No spending yet",
                    "Your expense categories will appear here."
                );
    }

    function updateExpenseHistory() {
        const container =
            $("#expenseHistory");

        if (!container) return;

        const filter =
            $("#expenseFilterCategory")?.value ||
            "all";

        const search =
            (
                $("#expenseSearch")?.value ||
                ""
            ).toLowerCase();

        let transactions =
            getTransactions()
                .filter(
                    t =>
                        t.type ===
                        "expense"
                );

        if (filter !== "all") {
            transactions =
                transactions.filter(
                    t =>
                        t.category ===
                        filter
                );
        }

        if (search) {
            transactions =
                transactions.filter(
                    t =>
                        `${t.description} ${t.category}`
                            .toLowerCase()
                            .includes(search)
                );
        }

        transactions.sort(
            (a, b) =>
                parseDate(b.date) -
                parseDate(a.date)
        );

        container.innerHTML =
            transactions.length
                ? transactions.map(t => `
                    <div class="transaction-row">
                        <div>
                            <strong>
                                ${escapeHTML(
                                    t.description ||
                                    t.category ||
                                    "Expense"
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(t.category)}
                                ·
                                ${escapeHTML(t.date)}
                            </small>
                        </div>

                        <div>
                            <strong>
                                -${displayCurrency(t.amount)}
                            </strong>

                            <button
                                type="button"
                                data-delete-expense="${escapeHTML(t.id)}"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                `).join("")
                : emptyHTML(
                    "No expenses found",
                    "Try another filter or add an expense."
                );

        $$("[data-delete-expense]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        deleteTransaction(
                            button.dataset.deleteExpense
                        );
                    }
                );
            });
    }

    /* =====================================================
       SAVINGS PAGE
    ===================================================== */

    function updateSavingsPage() {
        const goals =
            getSavingsGoals();

        const saved =
            goals.reduce(
                (sum, g) =>
                    sum + g.current,
                0
            );

        const target =
            goals.reduce(
                (sum, g) =>
                    sum + g.target,
                0
            );

        const progress =
            target > 0
                ? saved / target * 100
                : 0;

        const active =
            goals.filter(
                g => !g.completed
            );

        setText(
            "#totalSaved",
            displayCurrency(saved)
        );

        setText(
            "#totalTarget",
            displayCurrency(target)
        );

        setText(
            "#overallProgress",
            `${Math.round(progress)}%`
        );

        setText(
            "#activeGoalCount",
            active.length
        );

        const closest =
            active
                .slice()
                .sort(
                    (a, b) =>
                        getGoalRemaining(a) -
                        getGoalRemaining(b)
                )[0];

        const urgent =
            active
                .filter(
                    g => g.deadline
                )
                .sort(
                    (a, b) =>
                        parseDate(a.deadline) -
                        parseDate(b.deadline)
                )[0];

        const monthlyNeed =
            active.reduce(
                (sum, g) =>
                    sum +
                    getGoalMonthlyRequired(g),
                0
            );

        setText(
            "#closestGoal",
            closest
                ? closest.name
                : "—"
        );

        setText(
            "#urgentGoal",
            urgent
                ? urgent.name
                : "—"
        );

        setText(
            "#monthlySavingsNeeded",
            displayCurrency(monthlyNeed)
        );

        setText(
            "#goalInsight",
            active.length
                ? `You need about ${displayCurrency(monthlyNeed)} per month to stay on pace for your active goals.`
                : "Create a savings goal to begin building wealth."
        );

        renderGoals();
    }

    function renderGoals() {
        const container =
            $("#goalsContainer");

        if (!container) return;

        const goals =
            getSavingsGoals();

        if (!goals.length) {
            container.innerHTML =
                emptyHTML(
                    "No savings goals",
                    "Create your first goal above."
                );

            return;
        }

        container.innerHTML =
            goals.map(goal => {
                const progress =
                    getGoalProgress(goal);

                return `
                    <div class="goal-card">
                        <div class="goal-card-header">
                            <div>
                                <strong>
                                    ${escapeHTML(goal.name)}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        goal.description
                                    )}
                                </small>
                            </div>

                            <strong>
                                ${Math.round(progress)}%
                            </strong>
                        </div>

                        <div class="progress-track">
                            <span
                                class="progress-fill"
                                style="width:${progress}%"
                            ></span>
                        </div>

                        <div class="goal-card-meta">
                            <span>
                                ${displayCurrency(goal.current)}
                                /
                                ${displayCurrency(goal.target)}
                            </span>

                            <span>
                                ${
                                    goal.deadline
                                        ? `Due ${escapeHTML(goal.deadline)}`
                                        : "No deadline"
                                }
                            </span>
                        </div>

                        <div>
                            <button
                                type="button"
                                data-delete-goal="${escapeHTML(goal.id)}"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join("");

        $$("[data-delete-goal]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        if (
                            confirm(
                                "Delete this savings goal?"
                            )
                        ) {
                            deleteSavingsGoal(
                                button.dataset.deleteGoal
                            );
                        }
                    }
                );
            });
    }

    /* =====================================================
       BUDGET PAGE
    ===================================================== */

    function updateBudgetPage() {
        const budget =
            getMonthlyBudget();

        const spent =
            getBudgetUsage();

        const remaining =
            Math.max(
                0,
                budget - spent
            );

        const usage =
            budget > 0
                ? spent / budget * 100
                : 0;

        setText(
            "#budgetTotal",
            displayCurrency(budget)
        );

        setText(
            "#budgetSpent",
            displayCurrency(spent)
        );

        setText(
            "#budgetRemaining",
            displayCurrency(remaining)
        );

        setText(
            "#budgetUsage",
            `${Math.round(usage)}%`
        );

        setText(
            "#monthlyBudget",
            budget
        );

        setText(
            "#monthlyBudgetPercent",
            `${Math.round(usage)}%`
        );

        setWidth(
            "#monthlyBudgetFill",
            Math.min(100, usage)
        );

        setText(
            "#monthlyBudgetSpent",
            displayCurrency(spent)
        );

        setText(
            "#monthlyBudgetLeft",
            displayCurrency(remaining)
        );

        setText(
            "#monthlyBudget",
            budget
        );

        const categoryBudgets =
            getCategoryBudgets();

        const entries =
            Object.entries(
                categoryBudgets
            );

        const over =
            entries.filter(
                ([category, amount]) =>
                    getBudgetUsage(category) >
                    num(amount)
            );

        const highest =
            entries
                .map(
                    ([category, amount]) => ({
                        category,
                        usage:
                            getBudgetUsage(category) /
                            num(amount) *
                            100
                    })
                )
                .sort(
                    (a, b) =>
                        b.usage -
                        a.usage
                )[0];

        setText(
            "#overBudgetCount",
            over.length
        );

        setText(
            "#budgetCategoryCount",
            entries.length
        );

        setText(
            "#highestBudgetCategory",
            highest
                ? highest.category
                : "—"
        );

        setText(
            "#budgetInsight",
            budget <= 0
                ? "Set a monthly budget so MoneyLeak can actively protect your spending."
                : usage > 100
                    ? "You're over budget. Focus on essential spending until the month resets."
                    : usage > 85
                        ? "Your budget is getting tight. Slow down discretionary spending."
                        : "Your current budget usage is under control."
        );

        renderCategoryBudgets();
    }

    function renderCategoryBudgets() {
        const container =
            $("#categoryBudgetList");

        if (!container) return;

        const budgets =
            getCategoryBudgets();

        const entries =
            Object.entries(budgets);

        if (!entries.length) {
            container.innerHTML =
                emptyHTML(
                    "No category budgets",
                    "Create a category budget to control specific spending."
                );

            return;
        }

        container.innerHTML =
            entries.map(
                ([category, budget]) => {
                    const spent =
                        getBudgetUsage(category);

                    const usage =
                        budget > 0
                            ? spent / budget * 100
                            : 0;

                    return `
                        <div class="budget-row">
                            <div>
                                <strong>
                                    ${escapeHTML(category)}
                                </strong>

                                <small>
                                    ${displayCurrency(spent)}
                                    /
                                    ${displayCurrency(budget)}
                                </small>
                            </div>

                            <div class="progress-track">
                                <span
                                    class="progress-fill"
                                    style="width:${Math.min(100, usage)}%"
                                ></span>
                            </div>

                            <strong>
                                ${Math.round(usage)}%
                            </strong>

                            <button
                                type="button"
                                data-delete-budget="${escapeHTML(category)}"
                            >
                                Remove
                            </button>
                        </div>
                    `;
                }
            ).join("");

        $$("[data-delete-budget]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        setCategoryBudget(
                            button.dataset.deleteBudget,
                            0
                        );
                    }
                );
            });
    }

    /* =====================================================
       RECURRING PAGE
    ===================================================== */

    function updateRecurringPage() {
        const items =
            getRecurringTransactions()
                .filter(
                    item => item.active
                );

        const expenses =
            items
                .filter(
                    i => i.type === "expense"
                )
                .reduce(
                    (sum, i) =>
                        sum +
                        recurringMonthlyAmount(i),
                    0
                );

        const income =
            items
                .filter(
                    i => i.type === "income"
                )
                .reduce(
                    (sum, i) =>
                        sum +
                        recurringMonthlyAmount(i),
                    0
                );

        setText(
            "#recurringMonthly",
            displayCurrency(
                expenses
            )
        );

        setText(
            "#recurringExpenses",
            displayCurrency(
                expenses
            )
        );

        setText(
            "#recurringIncome",
            displayCurrency(
                income
            )
        );

        setText(
            "#recurringCount",
            items.length
        );

        const upcoming =
            getUpcomingRecurringForMonth();

        const next =
            upcoming[0];

        const largest =
            items
                .slice()
                .sort(
                    (a, b) =>
                        b.amount -
                        a.amount
                )[0];

        setText(
            "#nextRecurring",
            next
                ? next.name
                : "—"
        );

        setText(
            "#largestRecurring",
            largest
                ? displayCurrency(
                    largest.amount
                )
                : displayCurrency(0)
        );

        setText(
            "#netRecurring",
            displayCurrency(
                income - expenses
            )
        );

        setText(
            "#recurringInsight",
            expenses > income &&
            income > 0
                ? "Your recurring commitments currently consume more than your recurring income."
                : expenses > 0
                    ? `Keep about ${displayCurrency(expenses)} available each month for recurring expenses.`
                    : "Add your recurring bills and income to let MoneyLeak forecast future cash flow."
        );

        renderRecurringList();
        renderUpcomingRecurring();
    }

    function renderRecurringList() {
        const container =
            $("#recurringList");

        if (!container) return;

        const items =
            getRecurringTransactions();

        if (!items.length) {
            container.innerHTML =
                emptyHTML(
                    "No recurring items",
                    "Add rent, subscriptions, bills or recurring income."
                );

            return;
        }

        container.innerHTML =
            items.map(item => `
                <div class="transaction-row">
                    <div>
                        <strong>
                            ${escapeHTML(item.name)}
                        </strong>

                        <small>
                            ${escapeHTML(item.frequency)}
                            ·
                            ${escapeHTML(item.nextDate)}
                        </small>
                    </div>

                    <div>
                        <strong>
                            ${item.type === "income" ? "+" : "-"}
                            ${displayCurrency(item.amount)}
                        </strong>

                        <button
                            type="button"
                            data-delete-recurring="${escapeHTML(item.id)}"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            `).join("");

        $$("[data-delete-recurring]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        deleteRecurringTransaction(
                            button.dataset.deleteRecurring
                        );
                    }
                );
            });
    }

    function renderUpcomingRecurring() {
        const container =
            $("#upcomingRecurring");

        if (!container) return;

        const items =
            getUpcomingRecurringForMonth()
                .slice(0, 8);

        container.innerHTML =
            items.length
                ? items.map(item => `
                    <div class="transaction-row">
                        <div>
                            <strong>
                                ${escapeHTML(item.name)}
                            </strong>

                            <small>
                                ${parseDate(
                                    item.occurrenceDate
                                ).toLocaleDateString()}
                            </small>
                        </div>

                        <strong>
                            ${item.type === "income" ? "+" : "-"}
                            ${displayCurrency(item.amount)}
                        </strong>
                    </div>
                `).join("")
                : emptyHTML(
                    "Nothing upcoming",
                    "No recurring payments are scheduled for the rest of this month."
                );
    }

    /* =====================================================
       ANALYTICS
    ===================================================== */

    function updateAnalyticsPage() {
        const active =
            document.querySelector(
                "[data-period].active"
            );

        const period =
            active?.dataset.period ||
            "month";

        const transactions =
            getTransactionsForPeriod(
                period
            );

        const income =
            getIncome(transactions);

        const expenses =
            getExpenses(transactions);

        const cashFlow =
            getCashFlow(transactions);

        const savingsRate =
            getSavingsRate(transactions);

        const health =
            getFinancialHealth();

        setText(
            "#analyticsIncome",
            displayCurrency(income)
        );

        setText(
            "#analyticsExpenses",
            displayCurrency(expenses)
        );

        setText(
            "#analyticsCashFlow",
            displayCurrency(cashFlow)
        );

        setText(
            "#analyticsSavingsRate",
            `${savingsRate}%`
        );

        setText(
            "#analyticsHealthStatus",
            health.status
        );

        setText(
            "#analyticsHealthScore",
            health.score
        );

        setWidth(
            "#analyticsHealthFill",
            health.score
        );

        setText(
            "#analyticsHealthMessage",
            health.message
        );

        setText(
            "#averageExpense",
            displayCurrency(
                getAverageExpense(
                    transactions
                )
            )
        );

        const largest =
            getLargestExpense(
                transactions
            );

        setText(
            "#largestExpense",
            largest
                ? displayCurrency(
                    largest.amount
                )
                : displayCurrency(0)
        );

        setText(
            "#largestExpenseName",
            largest
                ? (
                    largest.description ||
                    largest.category
                )
                : "—"
        );

        setText(
            "#analyticsExpenseCount",
            transactions.filter(
                t => t.type === "expense"
            ).length
        );

        setText(
            "#analyticsIncomeSources",
            new Set(
                transactions
                    .filter(
                        t =>
                            t.type === "income"
                    )
                    .map(
                        t =>
                            t.source ||
                            t.category
                    )
            ).size
        );

        const insight =
            getSmartInsight();

        setText(
            "#analyticsInsight",
            insight.text
        );

        renderAnalyticsCategories(
            transactions
        );

        renderAnalyticsAlerts();
    }

    function renderAnalyticsCategories(
        transactions
    ) {
        const container =
            $("#analyticsCategories");

        if (!container) return;

        const categories =
            getCategoryTotals(
                transactions
            );

        container.innerHTML =
            categories.length
                ? categories.map(
                    item => `
                        <div class="category-row">
                            <strong>
                                ${escapeHTML(
                                    item.category
                                )}
                            </strong>

                            <strong>
                                ${displayCurrency(
                                    item.amount
                                )}
                            </strong>
                        </div>
                    `
                ).join("")
                : emptyHTML(
                    "No categories",
                    "Add expenses to generate analytics."
                );
    }

    function renderAnalyticsAlerts() {
        const container =
            $("#analyticsAlerts");

        if (!container) return;

        container.innerHTML =
            generateAlerts()
                .map(
                    alert => `
                        <div class="alert-card ${escapeHTML(alert.type)}">
                            <strong>
                                ${escapeHTML(
                                    alert.title
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    alert.message
                                )}
                            </p>
                        </div>
                    `
                )
                .join("");
    }

    /* =====================================================
       FORMS
    ===================================================== */

    function setupIncomeForm() {
        const form =
            $("#incomeForm");

        if (!form) return;

        const date =
            $("#incomeDate");

        if (date && !date.value) {
            date.value = today();
        }

        form.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                const amount =
                    num(
                        $("#incomeAmount")?.value
                    );

                if (amount <= 0) {
                    showToast(
                        "Enter a valid income amount."
                    );
                    return;
                }

                addTransaction({
                    type: "income",
                    amount,
                    source:
                        $("#incomeSource")?.value ||
                        "Other",
                    category:
                        $("#incomeSource")?.value ||
                        "Other",
                    description:
                        $("#incomeDescription")?.value ||
                        "",
                    date:
                        $("#incomeDate")?.value ||
                        today()
                });

                form.reset();

                if (date) {
                    date.value = today();
                }

                showToast(
                    "Income added successfully."
                );
            }
        );

        $("#incomeReset")
            ?.addEventListener(
                "click",
                () => form.reset()
            );
    }

    function setupExpenseForm() {
        const form =
            $("#expenseForm");

        if (!form) return;

        const date =
            $("#expenseDate");

        if (date && !date.value) {
            date.value = today();
        }

        form.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                const amount =
                    num(
                        $("#expenseAmount")?.value
                    );

                if (amount <= 0) {
                    showToast(
                        "Enter a valid expense amount."
                    );
                    return;
                }

                addTransaction({
                    type: "expense",
                    amount,
                    category:
                        $("#expenseCategory")?.value ||
                        "Other",
                    description:
                        $("#expenseDescription")?.value ||
                        "",
                    date:
                        $("#expenseDate")?.value ||
                        today()
                });

                form.reset();

                if (date) {
                    date.value = today();
                }

                showToast(
                    "Expense added successfully."
                );
            }
        );

        $("#expenseReset")
            ?.addEventListener(
                "click",
                () => form.reset()
            );
    }

    function setupSavingsGoalForm() {
        const form =
            $("#goalForm");

        if (!form) return;

        form.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                const name =
                    $("#goalName")?.value.trim();

                const target =
                    num(
                        $("#goalTarget")?.value
                    );

                if (!name || target <= 0) {
                    showToast(
                        "Enter a goal name and target."
                    );
                    return;
                }

                addSavingsGoal({
                    name,
                    target,
                    current:
                        num(
                            $("#goalCurrent")?.value
                        ),
                    deadline:
                        $("#goalDeadline")?.value ||
                        "",
                    color:
                        $("#goalColor")?.value ||
                        "#087856",
                    description:
                        $("#goalDescription")?.value ||
                        ""
                });

                form.reset();

                showToast(
                    "Savings goal created."
                );
            }
        );

        $("#goalReset")
            ?.addEventListener(
                "click",
                () => form.reset()
            );
    }

    function setupBudgetForms() {
        const monthlyForm =
            $("#monthlyBudgetForm");

        monthlyForm?.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                setMonthlyBudget(
                    num(
                        $("#monthlyBudget")?.value
                    )
                );

                showToast(
                    "Monthly budget saved."
                );
            }
        );

        const categoryForm =
            $("#categoryBudgetForm");

        categoryForm?.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                const category =
                    $("#budgetCategory")?.value;

                const amount =
                    num(
                        $("#budgetCategoryAmount")?.value
                    );

                if (!category || amount <= 0) {
                    showToast(
                        "Enter a category and amount."
                    );
                    return;
                }

                setCategoryBudget(
                    category,
                    amount
                );

                categoryForm.reset();

                showToast(
                    "Category budget saved."
                );
            }
        );

        $("#categoryBudgetReset")
            ?.addEventListener(
                "click",
                () => categoryForm?.reset()
            );
    }

    function setupRecurringForm() {
        const form =
            $("#recurringForm");

        if (!form) return;

        form.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                const name =
                    $("#recurringName")?.value.trim();

                const amount =
                    num(
                        $("#recurringAmount")?.value
                    );

                if (!name || amount <= 0) {
                    showToast(
                        "Enter a name and amount."
                    );
                    return;
                }

                addRecurringTransaction({
                    name,
                    amount,
                    type:
                        $("#recurringType")?.value ||
                        "expense",
                    category:
                        $("#recurringCategory")?.value ||
                        "Other",
                    frequency:
                        $("#recurringFrequency")?.value ||
                        "monthly",
                    nextDate:
                        $("#recurringNextDate")?.value ||
                        today(),
                    description:
                        $("#recurringDescription")?.value ||
                        ""
                });

                form.reset();

                showToast(
                    "Recurring item added."
                );
            }
        );

        $("#recurringReset")
            ?.addEventListener(
                "click",
                () => form.reset()
            );
    }

    /* =====================================================
       SETTINGS
    ===================================================== */

    function setupSettingsPage() {
        const form =
            $("#settingsProfileForm");

        if (!form) return;

        const settings =
            getSettings();

        const name =
            $("#settingsName");

        const currency =
            $("#settingsCurrency");

        const compact =
            $("#settingsCompactNumbers");

        const notifications =
            $("#settingsNotifications");

        const insights =
            $("#settingsInsights");

        if (name) {
            name.value =
                settings.name;
        }

        if (currency) {
            currency.value =
                settings.currency;
        }

        if (compact) {
            compact.checked =
                settings.compactNumbers;
        }

        if (notifications) {
            notifications.checked =
                settings.notifications;
        }

        if (insights) {
            insights.checked =
                settings.insights;
        }

        updateSettingsThemeButtons(
            settings.theme
        );

        form.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                saveSettings({
                    name:
                        name?.value.trim() ||
                        "MoneyLeak User",
                    currency:
                        currency?.value ||
                        "NGN",
                    compactNumbers:
                        compact?.checked ||
                        false,
                    notifications:
                        notifications?.checked !==
                        false,
                    insights:
                        insights?.checked !==
                        false
                });

                showToast(
                    "Settings saved."
                );
            }
        );

        [
            compact,
            notifications,
            insights
        ].forEach(input => {
            input?.addEventListener(
                "change",
                () => {
                    saveSettings({
                        compactNumbers:
                            compact?.checked ||
                            false,
                        notifications:
                            notifications?.checked !==
                            false,
                        insights:
                            insights?.checked !==
                            false
                    });
                }
            );
        });

        $$("[data-theme-option]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const theme =
                            button.dataset.themeOption;

                        saveSettings({
                            theme
                        });

                        updateSettingsThemeButtons(
                            theme
                        );
                    }
                );
            });

        $("#exportDataButton")
            ?.addEventListener(
                "click",
                exportData
            );

        $("#importDataButton")
            ?.addEventListener(
                "click",
                () =>
                    $("#importDataFile")?.click()
            );

        $("#importDataFile")
            ?.addEventListener(
                "change",
                event => {
                    const file =
                        event.target.files?.[0];

                    if (file) {
                        importData(file);
                    }
                }
            );

        $("#resetDataButton")
            ?.addEventListener(
                "click",
                resetData
            );
    }

    function updateSettingsThemeButtons(theme) {
        $$("[data-theme-option]")
            .forEach(button => {
                button.classList.toggle(
                    "selected",
                    button.dataset.themeOption ===
                    theme
                );
            });
    }

    /* =====================================================
       DATA BACKUP
    ===================================================== */

    function collectAllData() {
        return {
            version: "12.0",
            exportedAt:
                new Date().toISOString(),
            transactions:
                getTransactions(),
            savingsGoals:
                getSavingsGoals(),
            monthlyBudget:
                getMonthlyBudget(),
            categoryBudgets:
                getCategoryBudgets(),
            recurring:
                getRecurringTransactions(),
            settings:
                getSettings(),
            notifications:
                getNotificationHistory(),
            alerts:
                getAlerts()
        };
    }

    function exportData() {
        const blob =
            new Blob(
                [
                    JSON.stringify(
                        collectAllData(),
                        null,
                        2
                    )
                ],
                {
                    type:
                        "application/json"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `moneyleak-backup-${today()}.json`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

        showToast(
            "MoneyLeak backup exported."
        );
    }

    function importData(file) {
        const reader =
            new FileReader();

        reader.onload =
            event => {
                try {
                    const data =
                        JSON.parse(
                            event.target.result
                        );

                    if (
                        !data ||
                        typeof data !==
                            "object"
                    ) {
                        throw new Error(
                            "Invalid backup"
                        );
                    }

                    if (
                        Array.isArray(
                            data.transactions
                        )
                    ) {
                        write(
                            STORAGE.transactions,
                            data.transactions.map(
                                normalizeTransaction
                            )
                        );
                    }

                    if (
                        Array.isArray(
                            data.savingsGoals
                        )
                    ) {
                        write(
                            STORAGE.savingsGoals,
                            data.savingsGoals.map(
                                normalizeGoal
                            )
                        );
                    }

                    if (
                        data.monthlyBudget !==
                        undefined
                    ) {
                        write(
                            STORAGE.monthlyBudget,
                            num(
                                data.monthlyBudget
                            )
                        );
                    }

                    if (
                        data.categoryBudgets &&
                        typeof data.categoryBudgets ===
                            "object"
                    ) {
                        write(
                            STORAGE.categoryBudgets,
                            data.categoryBudgets
                        );
                    }

                    if (
                        Array.isArray(
                            data.recurring
                        )
                    ) {
                        write(
                            STORAGE.recurring,
                            data.recurring.map(
                                normalizeRecurring
                            )
                        );
                    }

                    if (
                        data.settings &&
                        typeof data.settings ===
                            "object"
                    ) {
                        write(
                            STORAGE.settings,
                            {
                                ...DEFAULT_SETTINGS,
                                ...data.settings
                            }
                        );
                    }

                    if (
                        Array.isArray(
                            data.notifications
                        )
                    ) {
                        write(
                            STORAGE.notifications,
                            data.notifications
                        );
                    }

                    if (
                        Array.isArray(
                            data.alerts
                        )
                    ) {
                        write(
                            STORAGE.alerts,
                            data.alerts
                        );
                    }

                    applySettings();

                    showToast(
                        "MoneyLeak data imported successfully."
                    );

                    setTimeout(
                        () => location.reload(),
                        700
                    );
                } catch {
                    alert(
                        "This backup could not be imported. Please choose a valid MoneyLeak JSON backup."
                    );
                }
            };

        reader.readAsText(file);
    }

    function resetData() {
        if (
            !confirm(
                "Reset MoneyLeak?\n\nThis permanently deletes your transactions, goals, budgets, recurring items, notifications and settings from this browser."
            )
        ) {
            return;
        }

        Object.values(STORAGE)
            .forEach(key =>
                localStorage.removeItem(key)
            );

        location.reload();
    }

    /* =====================================================
       SELECTS
    ===================================================== */

    function populateCategorySelects() {
        $$(
            "#expenseCategory, #budgetCategory, #recurringCategory, #expenseFilterCategory"
        ).forEach(select => {
            const current =
                select.value;

            const isFilter =
                select.id ===
                "expenseFilterCategory";

            const values =
                isFilter
                    ? ["all", ...CATEGORIES]
                    : CATEGORIES;

            select.innerHTML =
                values.map(
                    category => `
                        <option value="${escapeHTML(category)}">
                            ${
                                category === "all"
                                    ? "All categories"
                                    : escapeHTML(category)
                            }
                        </option>
                    `
                ).join("");

            if (
                values.includes(current)
            ) {
                select.value = current;
            }
        });

        const source =
            $("#incomeSource");

        if (source) {
            const current =
                source.value;

            source.innerHTML =
                INCOME_SOURCES.map(
                    item => `
                        <option value="${escapeHTML(item)}">
                            ${escapeHTML(item)}
                        </option>
                    `
                ).join("");

            if (
                INCOME_SOURCES.includes(
                    current
                )
            ) {
                source.value = current;
            }
        }

        const filter =
            $("#incomeFilterSource");

        if (filter) {
            const sources = [
                "all",
                ...new Set(
                    getTransactions()
                        .filter(
                            t =>
                                t.type ===
                                "income"
                        )
                        .map(
                            t =>
                                t.source ||
                                t.category
                        )
                )
            ];

            const current =
                filter.value;

            filter.innerHTML =
                sources.map(
                    source => `
                        <option value="${escapeHTML(source)}">
                            ${
                                source === "all"
                                    ? "All sources"
                                    : escapeHTML(source)
                            }
                        </option>
                    `
                ).join("");

            if (
                sources.includes(current)
            ) {
                filter.value =
                    current;
            }
        }
    }

    function setupFilters() {
        $("#incomeFilterSource")
            ?.addEventListener(
                "change",
                updateIncomeHistory
            );

        $("#incomeSearch")
            ?.addEventListener(
                "input",
                updateIncomeHistory
            );

        $("#expenseFilterCategory")
            ?.addEventListener(
                "change",
                updateExpenseHistory
            );

        $("#expenseSearch")
            ?.addEventListener(
                "input",
                updateExpenseHistory
            );
    }

    /* =====================================================
       NAVIGATION
    ===================================================== */

    function setupActiveNavigation() {
        const current =
            location.pathname
                .split("/")
                .pop() ||
            "index.html";

        $$(
            ".nav-link, [data-nav-link]"
        ).forEach(link => {
            const href =
                link.getAttribute("href");

            if (!href) return;

            const target =
                href.split("/")
                    .pop();

            link.classList.toggle(
                "active",
                target === current
            );
        });
    }

    function setupMobileNavigation() {
        const button =
            $("#mobileMenuButton");

        const sidebar =
            $(".sidebar");

        button?.addEventListener(
            "click",
            () => {
                sidebar?.classList.toggle(
                    "open"
                );
            }
        );

        $$(".nav-link").forEach(link => {
            link.addEventListener(
                "click",
                () => {
                    sidebar?.classList.remove(
                        "open"
                    );
                }
            );
        });
    }

    /* =====================================================
       PERIOD BUTTONS
    ===================================================== */

    function setupPeriodButtons() {
        $$("[data-period]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        $$("[data-period]")
                            .forEach(
                                b =>
                                    b.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );

                        updateAnalyticsPage();
                    }
                );
            });
    }

    /* =====================================================
       UTILITIES
    ===================================================== */

    function setText(selector, value) {
        $$(selector).forEach(
            el => {
                el.textContent =
                    value ?? "";
            }
        );
    }

    function setWidth(selector, value) {
        $$(selector).forEach(
            el => {
                el.style.width =
                    `${clamp(value, 0, 100)}%`;
            }
        );
    }

    function formatChange(percentage) {
        const value =
            num(percentage);

        if (value > 0) {
            return `↑ ${value}%`;
        }

        if (value < 0) {
            return `↓ ${Math.abs(value)}%`;
        }

        return "No change";
    }

    function emptyHTML(title, description) {
        return `
            <div class="empty-state">
                <strong>
                    ${escapeHTML(title)}
                </strong>

                <p>
                    ${escapeHTML(description)}
                </p>
            </div>
        `;
    }

    /* =====================================================
       GREETING
    ===================================================== */

    function updateGreeting() {
        const hour =
            new Date().getHours();

        const greeting =
            hour < 12
                ? "Good morning"
                : hour < 18
                    ? "Good afternoon"
                    : "Good evening";

        const name =
            getSettings().name ||
            "there";

        setText(
            "#dashboardGreeting",
            `${greeting}, ${name.split(" ")[0]}`
        );
    }

    /* =====================================================
       LEGACY MIGRATION
    ===================================================== */

    function migrateLegacyData() {
        if (
            !localStorage.getItem(
                STORAGE.savingsGoals
            )
        ) {
            const legacy =
                read(
                    STORAGE.legacySavingsGoal,
                    null
                );

            if (
                legacy &&
                typeof legacy ===
                    "object"
            ) {
                write(
                    STORAGE.savingsGoals,
                    [
                        normalizeGoal({
                            name:
                                legacy.name ||
                                "Savings Goal",
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
                    ]
                );
            }
        }

        if (
            !localStorage.getItem(
                STORAGE.settings
            )
        ) {
            write(
                STORAGE.settings,
                DEFAULT_SETTINGS
            );
        }

        if (
            !localStorage.getItem(
                STORAGE.notifications
            )
        ) {
            write(
                STORAGE.notifications,
                []
            );
        }

        localStorage.setItem(
            STORAGE.initialized,
            "true"
        );
    }

    /* =====================================================
       CROSS-TAB SYNC
    ===================================================== */

    window.addEventListener(
        "storage",
        event => {
            if (
                Object.values(STORAGE)
                    .includes(event.key)
            ) {
                refreshCurrentPage();
            }
        }
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            if (
                document.visibilityState ===
                "visible"
            ) {
                refreshCurrentPage();
            }
        }
    );

    /* =====================================================
       UPDATE EVENT
    ===================================================== */

    function emitUpdate() {
        document.dispatchEvent(
            new CustomEvent(
                "moneyLeakUpdated"
            )
        );
    }

    document.addEventListener(
        "moneyLeakUpdated",
        () => {
            updateDashboard();
            updateIncomePage();
            updateExpensePage();
            updateSavingsPage();
            updateBudgetPage();
            updateRecurringPage();
            updateAnalyticsPage();
            updateGreeting();
            renderNotificationCenter();
            updateNotificationBadge();
        }
    );

    /* =====================================================
       REFRESH
    ===================================================== */

    function refreshCurrentPage() {
        applySettings();
        populateCategorySelects();

        updateDashboard();
        updateIncomePage();
        updateExpensePage();
        updateSavingsPage();
        updateBudgetPage();
        updateRecurringPage();
        updateAnalyticsPage();
        updateGreeting();

        renderNotificationCenter();
        updateNotificationBadge();
    }

    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.MoneyLeak = {
        version: "12.0",

        storage: STORAGE,

        categories:
            CATEGORIES,

        incomeSources:
            INCOME_SOURCES,

        getSettings,
        saveSettings,
        applySettings,

        getCurrency,
        displayCurrency,

        getTransactions,
        saveTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,

        getPeriodRange,
        getTransactionsForPeriod,
        getIncome,
        getExpenses,
        getCashFlow,
        getSavingsRate,

        getSavingsGoals,
        saveSavingsGoals,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        getGoalProgress,
        getGoalRemaining,
        getGoalMonthlyRequired,

        getMonthlyBudget,
        setMonthlyBudget,
        getCategoryBudgets,
        setCategoryBudget,
        getBudgetUsage,
        getBudgetPercentage,

        getRecurringTransactions,
        saveRecurringTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        getRecurringMonthlyExpenses,
        getRecurringMonthlyIncome,
        getUpcomingRecurringForMonth,

        getCategoryTotals,
        getLargestExpense,
        getAverageExpense,

        getFinancialHealth,
        getMoneyLeakScore,
        getDecisionEngine,
        getSafeToSpend,
        getSpendingVelocity,
        getIncomeStability,
        getEmergencyFundTarget,
        getProjectedMonthEnd,

        getSmartInsight,

        getNotificationHistory,
        saveNotificationHistory,
        createNotification,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotificationHistory,
        unreadNotificationCount,

        generateAlerts,
        syncSmartNotifications,
        getAlerts,

        searchAll,

        exportData,
        importData,
        resetData,

        refreshCurrentPage,

        showToast
    };

    /* =====================================================
       INIT
    ===================================================== */

    function init() {
        migrateLegacyData();

        applySettings();

        populateCategorySelects();

        setupActiveNavigation();
        setupMobileNavigation();
        setupSearch();
        setupNotifications();
        setupFilters();

        setupIncomeForm();
        setupExpenseForm();
        setupSavingsGoalForm();
        setupBudgetForms();
        setupRecurringForm();

        setupPeriodButtons();
        setupSettingsPage();

        updateDashboard();
        updateIncomePage();
        updateExpensePage();
        updateSavingsPage();
        updateBudgetPage();
        updateRecurringPage();
        updateAnalyticsPage();
        updateGreeting();

        syncSmartNotifications();

        renderNotificationCenter();
        updateNotificationBadge();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );
    } else {
        init();
    }

})();

// =====================================================
// MONEY LEAK - DASHBOARD TRANSACTION BRIDGE
// =====================================================

function refreshSimpleDashboard() {
    if (!window.MoneyLeak) return;

    const transactions = window.MoneyLeak.getTransactions();

    const income = window.MoneyLeak.getIncome(transactions);
    const expenses = window.MoneyLeak.getExpenses(transactions);
    const balance = income - expenses;

    const balanceElement = document.getElementById("balance");
    const incomeElement = document.getElementById("income");
    const expensesElement = document.getElementById("expenses");

    if (balanceElement) {
        balanceElement.textContent =
            `₦${balance.toLocaleString()}`;
    }

    if (incomeElement) {
        incomeElement.textContent =
            `₦${income.toLocaleString()}`;
    }

    if (expensesElement) {
        expensesElement.textContent =
            `₦${expenses.toLocaleString()}`;
    }

    renderSimpleTransactions();
}


// =====================================================
// ADD TRANSACTION
// =====================================================

function addTransaction() {

    const amountInput =
        document.getElementById("amount");

    const typeInput =
        document.getElementById("type");

    const categoryInput =
        document.getElementById("category");

    const amount =
        Number(amountInput?.value || 0);

    const type =
        typeInput?.value || "expense";

    const category =
        categoryInput?.value.trim() || "Other";

    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    if (!window.MoneyLeak) {
        alert("MoneyLeak is still loading. Please refresh the page.");
        return;
    }

    window.MoneyLeak.addTransaction({
        amount: amount,
        type: type,
        category: category,
        description: category,
        date: new Date().toISOString()
    });

    // Clear form
    if (amountInput) {
        amountInput.value = "";
    }

    if (categoryInput) {
        categoryInput.value = "";
    }

    refreshSimpleDashboard();

    window.MoneyLeak.showToast(
        type === "income"
            ? "Income added successfully."
            : "Expense added successfully."
    );
}


// =====================================================
// RENDER TRANSACTIONS
// =====================================================

function renderSimpleTransactions() {

    const container =
        document.getElementById("transactionList");

    if (!container || !window.MoneyLeak) {
        return;
    }

    const transactions =
        window.MoneyLeak
            .getTransactions()
            .slice()
            .reverse();

    if (transactions.length === 0) {

        container.innerHTML = `
            <div class="empty-transactions">
                <p>No transactions yet.</p>
                <span>Add your first income or expense.</span>
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    transactions.slice(0, 10).forEach(transaction => {

        const item =
            document.createElement("div");

        item.className =
            `transaction-item ${transaction.type}`;

        const sign =
            transaction.type === "income"
                ? "+"
                : "-";

        item.innerHTML = `
            <div class="transaction-info">
                <strong>
                    ${escapeTransactionText(
                        transaction.description ||
                        transaction.category
                    )}
                </strong>

                <span>
                    ${escapeTransactionText(
                        transaction.category
                    )}
                </span>
            </div>

            <div class="transaction-right">

                <strong>
                    ${sign}₦${Number(
                        transaction.amount
                    ).toLocaleString()}
                </strong>

                <button
                    type="button"
                    class="delete-transaction"
                    onclick="removeMoneyLeakTransaction('${transaction.id}')"
                >
                    ×
                </button>

            </div>
        `;

        container.appendChild(item);
    });
}


// =====================================================
// DELETE TRANSACTION
// =====================================================

function removeMoneyLeakTransaction(id) {

    if (!window.MoneyLeak) return;

    window.MoneyLeak.deleteTransaction(id);

    refreshSimpleDashboard();

    window.MoneyLeak.showToast(
        "Transaction deleted."
    );
}


// =====================================================
// SAFE TEXT
// =====================================================

function escapeTransactionText(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =====================================================
// START
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        refreshSimpleDashboard();

        document.addEventListener(
            "moneyLeakUpdated",
            function () {
                refreshSimpleDashboard();
            }
        );

    }
);
