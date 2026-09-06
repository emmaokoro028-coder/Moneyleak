/* =========================================================
   MONEYLEAK
   Personal Finance OS
   Central Application Engine
   Version 10.0
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


    /* =====================================================
       BASIC HELPERS
    ===================================================== */

    const $ = (selector, root = document) =>
        root.querySelector(selector);


    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));


    function uid(prefix = "ml") {
        return `${prefix}_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 9)}`;
    }


    function safeParse(value, fallback) {
        try {
            return value === null || value === undefined
                ? fallback
                : JSON.parse(value);
        } catch {
            return fallback;
        }
    }


    function read(key, fallback) {
        return safeParse(
            localStorage.getItem(key),
            fallback
        );
    }


    function write(key, value) {
        localStorage.setItem(
            key,
            JSON.stringify(value)
        );
    }


    function remove(key) {
        localStorage.removeItem(key);
    }


    function number(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }


    function clamp(value, min, max) {
        return Math.min(
            Math.max(value, min),
            max
        );
    }


    function round(value) {
        return Math.round(
            (number(value) + Number.EPSILON) * 100
        ) / 100;
    }


    function today() {
        const date = new Date();

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }


    function currentMonthKey() {
        return today().slice(0, 7);
    }


    function parseDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return new Date();
        }

        return date;
    }


    function monthKey(value) {
        const date = parseDate(value);

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0")
        ].join("-");
    }


    function monthLabel(value) {
        const date = parseDate(`${value}-01`);

        return date.toLocaleDateString(
            undefined,
            {
                month: "short",
                year: "numeric"
            }
        );
    }


    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    function getSettings() {
        return {
            ...DEFAULT_SETTINGS,
            ...read(
                STORAGE.settings,
                {}
            )
        };
    }


    function saveSettings(settings = {}) {
        const merged = {
            ...getSettings(),
            ...settings
        };

        write(
            STORAGE.settings,
            merged
        );

        applySettings();

        emitUpdate();

        return merged;
    }


    function resolveTheme(theme) {
        if (theme !== "system") {
            return theme;
        }

        if (
            window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches
        ) {
            return "dark";
        }

        return "light";
    }


    function applySettings() {
        const settings = getSettings();

        const theme = resolveTheme(
            settings.theme
        );

        document.documentElement.setAttribute(
            "data-theme",
            theme
        );

        document.documentElement.dataset.themePreference =
            settings.theme;

        document.documentElement.dataset.compactNumbers =
            settings.compactNumbers
                ? "true"
                : "false";

        updateUserInterface();
    }


    function updateUserInterface() {
        const settings = getSettings();

        const name =
            settings.name ||
            "MoneyLeak User";

        const initial =
            name
                .trim()
                .charAt(0)
                .toUpperCase() || "M";

        $$(".brand-mark, [data-brand-logo]")
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


        document.title =
            document.title.includes("—")
                ? document.title
                : `${document.title} — MoneyLeak`;
    }


    /* =====================================================
       CURRENCY
    ===================================================== */

    const CURRENCY_MAP = {
        NGN: {
            symbol: "₦",
            code: "NGN",
            locale: "en-NG"
        },
        USD: {
            symbol: "$",
            code: "USD",
            locale: "en-US"
        },
        GBP: {
            symbol: "£",
            code: "GBP",
            locale: "en-GB"
        },
        EUR: {
            symbol: "€",
            code: "EUR",
            locale: "en-IE"
        },
        CAD: {
            symbol: "CA$",
            code: "CAD",
            locale: "en-CA"
        },
        AUD: {
            symbol: "A$",
            code: "AUD",
            locale: "en-AU"
        }
    };


    function getCurrency() {
        return (
            CURRENCY_MAP[
                getSettings().currency
            ] ||
            CURRENCY_MAP.NGN
        );
    }


    function displayCurrency(value, options = {}) {
        const amount = number(value);
        const currency = getCurrency();

        const compact =
            options.compact ??
            getSettings().compactNumbers;

        if (compact) {
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
        const amount = number(value);
        const currency = getCurrency();

        const absolute = Math.abs(amount);

        let suffix = "";
        let divisor = 1;

        if (absolute >= 1_000_000_000) {
            suffix = "B";
            divisor = 1_000_000_000;
        } else if (absolute >= 1_000_000) {
            suffix = "M";
            divisor = 1_000_000;
        } else if (absolute >= 1_000) {
            suffix = "K";
            divisor = 1_000;
        }

        if (!suffix) {
            return displayCurrency(
                amount,
                {
                    compact: false
                }
            );
        }

        const short =
            (amount / divisor)
                .toFixed(
                    amount / divisor >= 100
                        ? 0
                        : 1
                );

        return `${currency.symbol}${Number(short).toLocaleString()}${suffix}`;
    }


    /* =====================================================
       TRANSACTIONS
    ===================================================== */

    function normalizeTransaction(transaction = {}) {
        const type =
            transaction.type === "income"
                ? "income"
                : "expense";

        const amount =
            Math.abs(number(transaction.amount));

        return {
            id:
                transaction.id ||
                uid("txn"),

            type,

            amount,

            category:
                transaction.category ||
                (
                    type === "income"
                        ? "Other"
                        : "Other"
                ),

            source:
                transaction.source ||
                (
                    type === "income"
                        ? transaction.category || "Other"
                        : ""
                ),

            description:
                transaction.description ||
                "",

            date:
                transaction.date ||
                today(),

            createdAt:
                transaction.createdAt ||
                new Date().toISOString()
        };
    }


    function getTransactions() {
        const transactions =
            read(
                STORAGE.transactions,
                []
            );

        if (!Array.isArray(transactions)) {
            return [];
        }

        return transactions.map(
            normalizeTransaction
        );
    }


    function saveTransactions(transactions) {
        write(
            STORAGE.transactions,
            transactions
        );

        emitUpdate();
    }


    function addTransaction(transaction) {
        const transactions =
            getTransactions();

        const normalized =
            normalizeTransaction(
                transaction
            );

        transactions.push(
            normalized
        );

        saveTransactions(
            transactions
        );

        syncSmartNotifications();

        return normalized;
    }


    function updateTransaction(id, changes = {}) {
        const transactions =
            getTransactions();

        const index =
            transactions.findIndex(
                item => item.id === id
            );

        if (index === -1) {
            return null;
        }

        transactions[index] =
            normalizeTransaction({
                ...transactions[index],
                ...changes,
                id
            });

        saveTransactions(
            transactions
        );

        syncSmartNotifications();

        return transactions[index];
    }


    function deleteTransaction(id) {
        const transactions =
            getTransactions()
                .filter(
                    item => item.id !== id
                );

        saveTransactions(
            transactions
        );

        syncSmartNotifications();

        return true;
    }


    /* =====================================================
       PERIODS
    ===================================================== */

    function getPeriodRange(period = "month") {
        const now = new Date();

        let start;
        let end = new Date(now);

        if (period === "year") {

            start = new Date(
                now.getFullYear(),
                0,
                1
            );

        } else if (period === "quarter") {

            const quarterStart =
                Math.floor(
                    now.getMonth() / 3
                ) * 3;

            start = new Date(
                now.getFullYear(),
                quarterStart,
                1
            );

        } else {

            start = new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );

        }

        start.setHours(0, 0, 0, 0);
        end.setHours(
            23,
            59,
            59,
            999
        );

        return {
            start,
            end
        };
    }


    function getTransactionsForPeriod(
        period = "month"
    ) {
        const range =
            getPeriodRange(period);

        return getTransactions()
            .filter(item => {

                const date =
                    parseDate(item.date);

                return (
                    date >= range.start &&
                    date <= range.end
                );
            });
    }


    function getIncome(
        transactions = getTransactions()
    ) {
        return transactions
            .filter(
                item =>
                    item.type === "income"
            )
            .reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );
    }


    function getExpenses(
        transactions = getTransactions()
    ) {
        return transactions
            .filter(
                item =>
                    item.type === "expense"
            )
            .reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );
    }


    function getCashFlow(
        transactions = getTransactions()
    ) {
        return round(
            getIncome(transactions) -
            getExpenses(transactions)
        );
    }


    function getSavingsRate(
        transactions = getTransactions()
    ) {
        const income =
            getIncome(transactions);

        if (income <= 0) {
            return 0;
        }

        return clamp(
            round(
                (
                    getCashFlow(transactions) /
                    income
                ) * 100
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
            id:
                goal.id ||
                uid("goal"),

            name:
                goal.name ||
                "Savings Goal",

            target:
                Math.max(
                    0,
                    number(goal.target)
                ),

            current:
                Math.max(
                    0,
                    number(goal.current)
                ),

            deadline:
                goal.deadline ||
                "",

            color:
                goal.color ||
                "#087856",

            description:
                goal.description ||
                "",

            createdAt:
                goal.createdAt ||
                new Date().toISOString(),

            completed:
                Boolean(goal.completed)
        };
    }


    function getSavingsGoals() {
        let goals =
            read(
                STORAGE.savingsGoals,
                null
            );

        if (!Array.isArray(goals)) {
            goals = [];
        }

        return goals.map(
            normalizeGoal
        );
    }


    function saveSavingsGoals(goals) {
        write(
            STORAGE.savingsGoals,
            goals
        );

        emitUpdate();
    }


    function addSavingsGoal(goal) {
        const goals =
            getSavingsGoals();

        const newGoal =
            normalizeGoal(goal);

        goals.push(
            newGoal
        );

        saveSavingsGoals(
            goals
        );

        syncSmartNotifications();

        return newGoal;
    }


    function updateSavingsGoal(
        id,
        changes = {}
    ) {
        const goals =
            getSavingsGoals();

        const index =
            goals.findIndex(
                goal => goal.id === id
            );

        if (index === -1) {
            return null;
        }

        goals[index] =
            normalizeGoal({
                ...goals[index],
                ...changes,
                id
            });

        if (
            goals[index].current >=
            goals[index].target &&
            goals[index].target > 0
        ) {
            goals[index].completed = true;
        }

        saveSavingsGoals(
            goals
        );

        syncSmartNotifications();

        return goals[index];
    }


    function deleteSavingsGoal(id) {
        const goals =
            getSavingsGoals()
                .filter(
                    goal => goal.id !== id
                );

        saveSavingsGoals(
            goals
        );

        return true;
    }


    function getGoalProgress(goal) {
        if (!goal || goal.target <= 0) {
            return 0;
        }

        return clamp(
            round(
                (
                    goal.current /
                    goal.target
                ) * 100
            ),
            0,
            100
        );
    }


    function getGoalRemaining(goal) {
        return Math.max(
            0,
            round(
                goal.target -
                goal.current
            )
        );
    }


    function getGoalMonthlyRequired(goal) {
        if (!goal) {
            return 0;
        }

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

        const now =
            new Date();

        const months =
            Math.max(
                1,
                (
                    (deadline.getFullYear() -
                        now.getFullYear()) *
                        12
                ) +
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
            number(
                read(
                    STORAGE.monthlyBudget,
                    0
                )
            )
        );
    }


    function setMonthlyBudget(amount) {
        const value =
            Math.max(
                0,
                number(amount)
            );

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

        return (
            budgets &&
            typeof budgets === "object"
                ? budgets
                : {}
        );
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

        if (value === 0) {
            delete budgets[category];
        } else {
            budgets[category] =
                value;
        }

        write(
            STORAGE.categoryBudgets,
            budgets
        );

        emitUpdate();
        syncSmartNotifications();

        return budgets;
    }


    function getBudgetUsage(
        category = null
    ) {
        const expenses =
            getTransactionsForPeriod(
                "month"
            )
            .filter(
                item =>
                    item.type === "expense" &&
                    (
                        !category ||
                        item.category === category
                    )
            );

        return round(
            getExpenses(expenses)
        );
    }


    function getBudgetPercentage(
        spent,
        budget
    ) {
        if (budget <= 0) {
            return 0;
        }

        return round(
            (
                spent /
                budget
            ) * 100
        );
    }


    /* =====================================================
       RECURRING TRANSACTIONS
    ===================================================== */

    function normalizeRecurring(item = {}) {
        return {
            id:
                item.id ||
                uid("rec"),

            name:
                item.name ||
                "Recurring item",

            amount:
                Math.abs(
                    number(item.amount)
                ),

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
                item.description ||
                "",

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

        if (!Array.isArray(items)) {
            return [];
        }

        return items.map(
            normalizeRecurring
        );
    }


    function saveRecurringTransactions(items) {
        write(
            STORAGE.recurring,
            items
        );

        emitUpdate();
        syncSmartNotifications();
    }


    function addRecurringTransaction(item) {
        const items =
            getRecurringTransactions();

        const newItem =
            normalizeRecurring(item);

        items.push(
            newItem
        );

        saveRecurringTransactions(
            items
        );

        return newItem;
    }


    function updateRecurringTransaction(
        id,
        changes = {}
    ) {
        const items =
            getRecurringTransactions();

        const index =
            items.findIndex(
                item => item.id === id
            );

        if (index === -1) {
            return null;
        }

        items[index] =
            normalizeRecurring({
                ...items[index],
                ...changes,
                id
            });

        saveRecurringTransactions(
            items
        );

        return items[index];
    }


    function deleteRecurringTransaction(id) {
        const items =
            getRecurringTransactions()
                .filter(
                    item =>
                        item.id !== id
                );

        saveRecurringTransactions(
            items
        );

        return true;
    }


    function recurringMonthlyAmount(item) {
        if (!item) {
            return 0;
        }

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
       FINANCIAL HEALTH
    ===================================================== */

    function getFinancialHealth() {
        const monthTransactions =
            getTransactionsForPeriod(
                "month"
            );

        const income =
            getIncome(
                monthTransactions
            );

        const expenses =
            getExpenses(
                monthTransactions
            );

        const savingsRate =
            getSavingsRate(
                monthTransactions
            );

        const budget =
            getMonthlyBudget();

        let score = 50;

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
            } else {
                spendingFactor = 0;
            }


            if (savingsRate >= 30) {
                savingsFactor = 20;
            } else if (
                savingsRate >= 20
            ) {
                savingsFactor = 16;
            } else if (
                savingsRate >= 10
            ) {
                savingsFactor = 11;
            } else if (
                savingsRate > 0
            ) {
                savingsFactor = 6;
            }
        }


        if (budget > 0) {

            const usage =
                expenses / budget;

            if (usage <= 0.7) {
                budgetFactor = 20;
            } else if (
                usage <= 0.85
            ) {
                budgetFactor = 15;
            } else if (
                usage <= 1
            ) {
                budgetFactor = 8;
            } else {
                budgetFactor = 0;
            }

        } else {
            budgetFactor = 8;
        }


        const recurringExpenses =
            getRecurringMonthlyExpenses();

        if (
            income > 0 &&
            recurringExpenses <=
                income * 0.25
        ) {
            recurringFactor = 10;
        } else if (
            income > 0 &&
            recurringExpenses <=
                income * 0.4
        ) {
            recurringFactor = 6;
        } else {
            recurringFactor = 2;
        }


        score =
            spendingFactor +
            savingsFactor +
            budgetFactor +
            recurringFactor;

        score = clamp(
            Math.round(score),
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
                spending:
                    spendingFactor,

                savings:
                    savingsFactor,

                budget:
                    budgetFactor,

                recurring:
                    recurringFactor
            }
        };
    }


    /* =====================================================
       SAFE TO SPEND
    ===================================================== */

    function getSafeToSpend() {
        const budget =
            getMonthlyBudget();

        const monthExpenses =
            getExpenses(
                getTransactionsForPeriod(
                    "month"
                )
            );

        const monthIncome =
            getIncome(
                getTransactionsForPeriod(
                    "month"
                )
            );

        const remaining =
            budget > 0
                ? Math.max(
                    0,
                    budget - monthExpenses
                )
                : Math.max(
                    0,
                    monthIncome -
                    monthExpenses
                );

        const day =
            new Date().getDate();

        const daysInMonth =
            new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                0
            ).getDate();

        const daysRemaining =
            Math.max(
                1,
                daysInMonth - day + 1
            );

        const daily =
            remaining /
            daysRemaining;

        let status = "comfortable";

        if (daily <= 0) {
            status = "restricted";
        } else if (
            budget > 0 &&
            remaining < budget * 0.1
        ) {
            status = "cautious";
        }


        return {
            amount: round(daily),
            remaining: round(remaining),
            daysRemaining,
            status
        };
    }


    /* =====================================================
       SPENDING ANALYSIS
    ===================================================== */

    function getCategoryTotals(
        transactions = getTransactions()
    ) {
        const totals = {};

        transactions
            .filter(
                item =>
                    item.type === "expense"
            )
            .forEach(item => {

                const category =
                    item.category ||
                    "Other";

                totals[category] =
                    (
                        totals[category] ||
                        0
                    ) +
                    item.amount;
            });

        return Object.entries(totals)
            .map(
                ([category, amount]) => ({
                    category,
                    amount: round(amount)
                })
            )
            .sort(
                (a, b) =>
                    b.amount -
                    a.amount
            );
    }


    function getLargestExpense(
        transactions = getTransactions()
    ) {
        const expenses =
            transactions.filter(
                item =>
                    item.type === "expense"
            );

        return expenses.sort(
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
                item =>
                    item.type === "expense"
            );

        if (!expenses.length) {
            return 0;
        }

        return round(
            getExpenses(expenses) /
            expenses.length
        );
    }


    /* =====================================================
       DASHBOARD INTELLIGENCE
    ===================================================== */

    function getSmartInsight() {
        const transactions =
            getTransactionsForPeriod(
                "month"
            );

        const income =
            getIncome(transactions);

        const expenses =
            getExpenses(transactions);

        const cashFlow =
            getCashFlow(transactions);

        const savingsRate =
            getSavingsRate(transactions);

        const categories =
            getCategoryTotals(
                transactions
            );

        const largest =
            categories[0];

        const budget =
            getMonthlyBudget();

        if (!transactions.length) {
            return {
                title: "Start your money story",
                text:
                    "Add your first income or expense and MoneyLeak will begin learning your financial patterns.",
                type: "neutral"
            };
        }


        if (income <= 0 && expenses > 0) {
            return {
                title: "Expenses are ahead",
                text:
                    `You've recorded ${displayCurrency(expenses)} in expenses this month without recorded income. Add your income to get a more accurate financial picture.`,
                type: "warning"
            };
        }


        if (
            budget > 0 &&
            expenses > budget
        ) {
            return {
                title: "Budget crossed",
                text:
                    `You've spent ${displayCurrency(expenses - budget)} above your monthly budget. Your biggest focus should be controlling discretionary spending.`,
                type: "warning"
            };
        }


        if (largest && income > 0) {

            const percentage =
                round(
                    (
                        largest.amount /
                        income
                    ) * 100
                );

            if (percentage >= 20) {
                return {
                    title:
                        `${largest.category} is your biggest leak`,
                    text:
                        `${largest.category} accounts for ${percentage}% of your recorded monthly income. Review this category before making new purchases.`,
                    type: "warning"
                };
            }
        }


        if (savingsRate >= 30) {
            return {
                title: "Excellent saving pace",
                text:
                    `You're currently keeping about ${savingsRate}% of your recorded income. Consider directing part of that surplus toward a specific goal.`,
                type: "positive"
            };
        }


        if (cashFlow > 0) {
            return {
                title: "You're in the green",
                text:
                    `Your current monthly cash flow is ${displayCurrency(cashFlow)}. Protect that surplus instead of letting it disappear into unplanned spending.`,
                type: "positive"
            };
        }


        if (cashFlow < 0) {
            return {
                title: "Cash flow needs attention",
                text:
                    `You're spending ${displayCurrency(Math.abs(cashFlow))} more than your recorded income this month. Start by reviewing your top spending category.`,
                type: "warning"
            };
        }


        return {
            title: "Keep building your picture",
            text:
                "The more consistently you record your money, the more useful MoneyLeak's intelligence becomes.",
            type: "neutral"
        };
    }


    /* =====================================================
       NOTIFICATION SYSTEM
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


    function saveNotificationHistory(
        history
    ) {
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


    function addNotification(
        notification
    ) {
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

        history.unshift(
            notification
        );

        const trimmed =
            history.slice(0, 50);

        saveNotificationHistory(
            trimmed
        );

        renderNotificationCenter();
        updateNotificationBadge();
    }


    function markNotificationRead(id) {
        const history =
            getNotificationHistory();

        const item =
            history.find(
                notification =>
                    notification.id === id
            );

        if (item) {
            item.read = true;
        }

        saveNotificationHistory(
            history
        );

        renderNotificationCenter();
        updateNotificationBadge();
    }


    function markAllNotificationsRead() {
        const history =
            getNotificationHistory();

        history.forEach(
            item => {
                item.read = true;
            }
        );

        saveNotificationHistory(
            history
        );

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
            .filter(
                item =>
                    !item.read
            )
            .length;
    }


    function generateAlerts() {
        const alerts = [];

        const month =
            getTransactionsForPeriod(
                "month"
            );

        const income =
            getIncome(month);

        const expenses =
            getExpenses(month);

        const budget =
            getMonthlyBudget();

        if (
            budget > 0 &&
            expenses >= budget
        ) {
            alerts.push({
                type: "danger",
                title: "Monthly budget exceeded",
                message:
                    `You've spent ${displayCurrency(expenses - budget)} above your monthly budget.`
            });
        } else if (
            budget > 0 &&
            expenses >= budget * 0.8
        ) {
            alerts.push({
                type: "warning",
                title: "Budget warning",
                message:
                    `You've used ${Math.round((expenses / budget) * 100)}% of your monthly budget.`
            });
        }


        if (
            income > 0 &&
            expenses > income
        ) {
            alerts.push({
                type: "danger",
                title: "Negative cash flow",
                message:
                    "Your recorded expenses are currently higher than your recorded income."
            });
        }


        const goals =
            getSavingsGoals();

        goals
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
                        ) /
                        86400000
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
                            `${displayCurrency(getGoalRemaining(goal))} remains with about ${days} days left.`
                    });
                }

            });


        if (
            income > 0 &&
            getSavingsRate(month) >= 20
        ) {
            alerts.push({
                type: "success",
                title: "Strong savings rate",
                message:
                    `You're currently saving about ${getSavingsRate(month)}% of recorded income this month.`
            });
        }


        return alerts;
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
                `${monthKey(today())}_${alert.title}`;

            addNotification(
                createNotification({
                    title:
                        alert.title,

                    message:
                        alert.message,

                    type:
                        alert.type,

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


    /* =====================================================
       NOTIFICATION UI
    ===================================================== */

    let activeNotificationTab = "all";


    function renderNotificationCenter() {
        const container =
            $("#notificationList");

        if (!container) {
            return;
        }

        let history =
            getNotificationHistory();

        if (
            activeNotificationTab ===
            "unread"
        ) {
            history =
                history.filter(
                    item =>
                        !item.read
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
            history.map(
                notification => {

                    const type =
                        notification.type ||
                        "info";

                    return `
                        <article
                            class="moneyLeakNotification ${notification.read ? "" : "unread"}"
                            data-notification-id="${escapeHTML(notification.id)}"
                        >

                            <div
                                class="moneyLeakNotificationIcon ${escapeHTML(type)}"
                            >
                                ${escapeHTML(notification.icon || "✦")}
                            </div>

                            <div class="moneyLeakNotificationContent">

                                <div class="notification-content-top">
                                    <strong>
                                        ${escapeHTML(notification.title)}
                                    </strong>

                                    ${
                                        !notification.read
                                            ? `<span class="moneyLeakNotificationDot"></span>`
                                            : ""
                                    }
                                </div>

                                <p>
                                    ${escapeHTML(notification.message)}
                                </p>

                                <small>
                                    ${formatRelativeTime(notification.createdAt)}
                                </small>

                            </div>

                        </article>
                    `;
                }
            ).join("");


        $$(".moneyLeakNotification", container)
            .forEach(item => {

                item.addEventListener(
                    "click",
                    () => {

                        const id =
                            item.dataset.notificationId;

                        markNotificationRead(id);

                    }
                );

            });
    }


    function formatRelativeTime(dateValue) {
        const date =
            parseDate(dateValue);

        const diff =
            Date.now() -
            date.getTime();

        const minutes =
            Math.floor(
                diff / 60000
            );

        if (minutes < 1) {
            return "Just now";
        }

        if (minutes < 60) {
            return `${minutes}m ago`;
        }

        const hours =
            Math.floor(
                minutes / 60
            );

        if (hours < 24) {
            return `${hours}h ago`;
        }

        const days =
            Math.floor(
                hours / 24
            );

        if (days < 7) {
            return `${days}d ago`;
        }

        return date.toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short"
            }
        );
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

        if (!panel) {
            return;
        }


        renderNotificationCenter();
        updateNotificationBadge();


        if (button) {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    panel.classList.toggle(
                        "open"
                    );

                    panel.setAttribute(
                        "aria-hidden",
                        panel.classList.contains(
                            "open"
                        )
                            ? "false"
                            : "true"
                    );

                    renderNotificationCenter();

                }
            );

        }


        if (close) {

            close.addEventListener(
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

        }


        const markAll =
            $("#markAllNotificationsRead");

        if (markAll) {

            markAll.addEventListener(
                "click",
                markAllNotificationsRead
            );

        }


        const clear =
            $("#clearNotifications");

        if (clear) {

            clear.addEventListener(
                "click",
                () => {

                    if (
                        getNotificationHistory()
                            .length === 0
                    ) {
                        return;
                    }

                    if (
                        confirm(
                            "Clear your notification history?"
                        )
                    ) {
                        clearNotificationHistory();
                    }

                }
            );

        }


        $$("[data-notification-tab]")
            .forEach(tab => {

                tab.addEventListener(
                    "click",
                    () => {

                        activeNotificationTab =
                            tab.dataset
                                .notificationTab;

                        $$(
                            "[data-notification-tab]"
                        ).forEach(button => {

                            button.classList.toggle(
                                "active",
                                button === tab
                            );

                        });

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
            description:
                "Your complete financial overview",
            url: "./index.html",
            icon: "⌂",
            keywords:
                "dashboard home overview money balance"
        },
        {
            title: "Income",
            description:
                "Manage your income and sources",
            url: "./income.html",
            icon: "↗",
            keywords:
                "income salary earnings money received"
        },
        {
            title: "Expenses",
            description:
                "Track and understand spending",
            url: "./expenses.html",
            icon: "↘",
            keywords:
                "expenses spending purchases leaks"
        },
        {
            title: "Budgets",
            description:
                "Control monthly and category budgets",
            url: "./budgets.html",
            icon: "▣",
            keywords:
                "budget limits spending control"
        },
        {
            title: "Goals",
            description:
                "Build savings goals",
            url: "./savings.html",
            icon: "◎",
            keywords:
                "savings goals targets wealth"
        },
        {
            title: "Recurring",
            description:
                "Manage recurring income and bills",
            url: "./recurring.html",
            icon: "↻",
            keywords:
                "recurring bills subscriptions rent"
        },
        {
            title: "Analytics",
            description:
                "Explore your financial intelligence",
            url: "./analytics.html",
            icon: "◈",
            keywords:
                "analytics charts trends insights"
        },
        {
            title: "Settings",
            description:
                "Control your MoneyLeak experience",
            url: "./settings.html",
            icon: "⚙",
            keywords:
                "settings preferences theme profile"
        }
    ];


    const SEARCH_ACTIONS = [
        {
            title: "Add income",
            description:
                "Record a new income transaction",
            url: "./income.html",
            icon: "+"
        },
        {
            title: "Add expense",
            description:
                "Record a new expense",
            url: "./expenses.html",
            icon: "+"
        },
        {
            title: "Create savings goal",
            description:
                "Start a new financial goal",
            url: "./savings.html",
            icon: "+"
        },
        {
            title: "Set budget",
            description:
                "Create or update your budget",
            url: "./budgets.html",
            icon: "+"
        }
    ];


    function scoreSearch(
        text,
        query
    ) {
        const haystack =
            text.toLowerCase();

        const needle =
            query.toLowerCase()
                .trim();

        if (!needle) {
            return 0;
        }

        if (
            haystack === needle
        ) {
            return 100;
        }

        if (
            haystack.startsWith(
                needle
            )
        ) {
            return 80;
        }

        if (
            haystack.includes(
                needle
            )
        ) {
            return 50;
        }

        const words =
            needle.split(/\s+/);

        let score = 0;

        words.forEach(word => {

            if (
                word &&
                haystack.includes(word)
            ) {
                score += 15;
            }

        });

        return score;
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


        getTransactions()
            .forEach(transaction => {

                const score =
                    scoreSearch(
                        `${transaction.description} ${transaction.category} ${transaction.source}`,
                        query
                    );

                if (score > 0) {

                    results.push({
                        title:
                            transaction.description ||
                            transaction.category,

                        description:
                            `${transaction.type === "income" ? "Income" : "Expense"} · ${displayCurrency(transaction.amount)}`,

                        url:
                            transaction.type === "income"
                                ? "./income.html"
                                : "./expenses.html",

                        icon:
                            transaction.type === "income"
                                ? "↗"
                                : "↘",

                        type:
                            "transaction",

                        score:
                            score + 5
                    });

                }

            });


        getSavingsGoals()
            .forEach(goal => {

                const score =
                    scoreSearch(
                        `${goal.name} ${goal.description}`,
                        query
                    );

                if (score > 0) {

                    results.push({
                        title:
                            goal.name,

                        description:
                            `${displayCurrency(goal.current)} of ${displayCurrency(goal.target)} saved`,

                        url:
                            "./savings.html",

                        icon:
                            "◎",

                        type:
                            "goal",

                        score:
                            score + 5
                    });

                }

            });


        return results
            .sort(
                (a, b) =>
                    b.score -
                    a.score
            )
            .slice(0, 12);
    }


    function renderSearchResults(
        query = ""
    ) {
        const container =
            $("#searchResults");

        if (!container) {
            return;
        }


        if (!query.trim()) {

            container.innerHTML = `
                <div class="search-section">

                    <div class="search-section-title">
                        Quick actions
                    </div>

                    <div class="search-suggestion-grid">

                        ${SEARCH_ACTIONS.map(
                            action => `
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
                            `
                        ).join("")}

                    </div>

                </div>

                <div class="search-section">

                    <div class="search-section-title">
                        Navigate
                    </div>

                    ${SEARCH_PAGES.slice(0, 4).map(
                        page => `
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
                        `
                    ).join("")}

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
        const overlay =
            $("#searchOverlay");

        const input =
            $("#globalSearch");

        const close =
            $("#closeSearch");

        const button =
            $("#searchButton");

        if (!overlay) {
            return;
        }


        function openSearch() {

            overlay.classList.add(
                "open"
            );

            overlay.setAttribute(
                "aria-hidden",
                "false"
            );

            renderSearchResults("");

            setTimeout(
                () => {
                    input?.focus();
                },
                50
            );

        }


        function closeSearch() {

            overlay.classList.remove(
                "open"
            );

            overlay.setAttribute(
                "aria-hidden",
                "true"
            );

            if (input) {
                input.value = "";
            }

        }


        button?.addEventListener(
            "click",
            event => {

                event.preventDefault();
                openSearch();

            }
        );


        close?.addEventListener(
            "click",
            closeSearch
        );


        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    overlay
                ) {
                    closeSearch();
                }

            }
        );


        input?.addEventListener(
            "input",
            event => {

                renderSearchResults(
                    event.target.value
                );

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    if (
                        overlay.classList.contains(
                            "open"
                        )
                    ) {
                        closeSearch();
                    }

                }


                if (
                    (event.metaKey ||
                        event.ctrlKey) &&
                    event.key.toLowerCase() === "k"
                ) {

                    event.preventDefault();

                    openSearch();

                }

            }
        );

    }


    /* =====================================================
       MOBILE NAVIGATION
    ===================================================== */

    function setupMobileNavigation() {
        const button =
            $("#mobileMenuButton");

        const overlay =
            $("#mobileOverlay");

        const sidebar =
            $("#sidebar");

        if (!button || !sidebar) {
            return;
        }


        function close() {

            sidebar.classList.remove(
                "open"
            );

            overlay?.classList.remove(
                "open"
            );

        }


        button.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "open"
                );

                overlay?.classList.toggle(
                    "open"
                );

            }
        );


        overlay?.addEventListener(
            "click",
            close
        );


        $$(".sidebar a")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    close
                );

            });
    }


    /* =====================================================
       ACTIVE NAV
    ===================================================== */

    function setupActiveNavigation() {
        const current =
            location.pathname
                .split("/")
                .pop() ||
            "index.html";

        $$(".nav-link")
            .forEach(link => {

                const href =
                    link.getAttribute("href") ||
                    "";

                const file =
                    href
                        .split("/")
                        .pop();

                link.classList.toggle(
                    "active",
                    file === current
                );

            });
    }


    /* =====================================================
       GREETING
    ===================================================== */

    function updateGreeting() {
        const element =
            $("#dashboardGreeting");

        if (!element) {
            return;
        }

        const hour =
            new Date().getHours();

        let greeting =
            "Good evening";

        if (hour < 12) {
            greeting =
                "Good morning";
        } else if (hour < 18) {
            greeting =
                "Good afternoon";
        }

        const name =
            getSettings().name ||
            "there";

        element.textContent =
            `${greeting}, ${name.split(" ")[0]}`;
    }


    /* =====================================================
       DASHBOARD
    ===================================================== */

    function updateDashboard() {
        if (
            !$("#overviewBalance") &&
            !$("#overviewIncome")
        ) {
            return;
        }


        const month =
            getTransactionsForPeriod(
                "month"
            );

        const income =
            getIncome(month);

        const expenses =
            getExpenses(month);

        const cashFlow =
            getCashFlow(month);

        const savingsRate =
            getSavingsRate(month);

        const health =
            getFinancialHealth();

        const goals =
            getSavingsGoals();

        const totalTarget =
            goals.reduce(
                (sum, goal) =>
                    sum + goal.target,
                0
            );

        const totalSaved =
            goals.reduce(
                (sum, goal) =>
                    sum + goal.current,
                0
            );

        const goalProgress =
            totalTarget > 0
                ? clamp(
                    round(
                        totalSaved /
                        totalTarget *
                        100
                    ),
                    0,
                    100
                )
                : 0;


        setText(
            "overviewBalance",
            displayCurrency(
                cashFlow
            )
        );

        setText(
            "overviewIncome",
            displayCurrency(
                income
            )
        );

        setText(
            "overviewExpenses",
            displayCurrency(
                expenses
            )
        );

        setText(
            "overviewSavingsRate",
            `${savingsRate}%`
        );

        setText(
            "overviewGoalProgress",
            `${Math.round(goalProgress)}%`
        );

        setText(
            "overviewHealthScore",
            health.score
        );

        setText(
            "overviewHealthStatus",
            health.status
        );

        setText(
            "periodIncome",
            displayCurrency(
                income
            )
        );

        setText(
            "periodExpenses",
            displayCurrency(
                expenses
            )
        );

        setText(
            "periodCashFlow",
            displayCurrency(
                cashFlow
            )
        );


        const goalFill =
            $("#overviewGoalFill");

        if (goalFill) {
            goalFill.style.width =
                `${goalProgress}%`;
        }


        const healthFill =
            $("#healthFill");

        if (healthFill) {
            healthFill.style.width =
                `${health.score}%`;
        }


        setText(
            "healthScore",
            health.score
        );

        setText(
            "healthMessage",
            health.message
        );

        setText(
            "healthExplanation",
            getHealthExplanation(
                health
            )
        );


        updateHealthFactor(
            "healthIncomeFactor",
            "healthIncomeBar",
            health.factors.spending
        );

        updateHealthFactor(
            "healthBudgetFactor",
            "healthBudgetBar",
            health.factors.budget
        );

        updateHealthFactor(
            "healthSavingsFactor",
            "healthSavingsBar",
            health.factors.savings
        );

        updateHealthFactor(
            "healthRecurringFactor",
            "healthRecurringBar",
            health.factors.recurring
        );


        updateDashboardBudget();
        updateDashboardInsight();
        updateDashboardGoals();
        updateDashboardTransactions();
        updateTopCategories();
        updateSafeToSpend();
        updateDashboardAlerts();
        updateGreeting();

    }


    function setText(id, value) {
        const element =
            document.getElementById(id);

        if (element) {
            element.textContent =
                value;
        }
    }


    function updateHealthFactor(
        textId,
        barId,
        value
    ) {
        const text =
            $(`#${textId}`);

        const bar =
            $(`#${barId}`);

        if (text) {
            text.textContent =
                `${Math.round(value)}`;
        }

        if (bar) {
            const max =
                textId ===
                "healthRecurringFactor"
                    ? 10
                    : 20;

            bar.style.width =
                `${clamp(
                    value / max * 100,
                    0,
                    100
                )}%`;
        }
    }


    function getHealthExplanation(
        health
    ) {
        const factors =
            health.factors;

        if (
            factors.spending < 8
        ) {
            return "Your spending level is the biggest area to improve.";
        }

        if (
            factors.savings < 8
        ) {
            return "Increasing the amount you keep from each income cycle would strengthen your score.";
        }

        if (
            factors.budget < 8
        ) {
            return "Your budget usage is putting pressure on your financial health.";
        }

        return "Your income, spending, savings, and recurring obligations are currently balanced reasonably well.";
    }


    function updateDashboardBudget() {
        const budget =
            getMonthlyBudget();

        const spent =
            getExpenses(
                getTransactionsForPeriod(
                    "month"
                )
            );

        const remaining =
            Math.max(
                0,
                budget - spent
            );

        const percentage =
            budget > 0
                ? clamp(
                    round(
                        spent /
                        budget *
                        100
                    ),
                    0,
                    999
                )
                : 0;


        setText(
            "dashboardBudgetPercent",
            `${Math.round(percentage)}%`
        );

        setText(
            "dashboardBudgetSpent",
            displayCurrency(
                spent
            )
        );

        setText(
            "dashboardBudgetRemaining",
            displayCurrency(
                remaining
            )
        );

        setText(
            "dashboardBudgetLimit",
            displayCurrency(
                budget
            )
        );


        const fill =
            $("#dashboardBudgetFill");

        if (fill) {
            fill.style.width =
                `${Math.min(
                    100,
                    percentage
                )}%`;
        }
    }


    function updateDashboardInsight() {
        const insight =
            getSmartInsight();

        const element =
            $("#overviewInsightText");

        if (element) {
            element.textContent =
                insight.text;
        }


        const title =
            $("#overviewInsightTitle");

        if (title) {
            title.textContent =
                insight.title;
        }
    }


    function updateDashboardGoals() {
        const container =
            $("#dashboardGoals");

        if (!container) {
            return;
        }

        const goals =
            getSavingsGoals()
                .slice(0, 3);

        if (!goals.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>No savings goals yet</strong>
                    <p>
                        Create a goal to start building toward something meaningful.
                    </p>
                </div>
            `;

            return;
        }


        container.innerHTML =
            goals.map(goal => {

                const progress =
                    getGoalProgress(
                        goal
                    );

                return `
                    <a
                        href="./savings.html"
                        class="goal-mini-card"
                    >

                        <div class="goal-mini-top">
                            <strong>
                                ${escapeHTML(goal.name)}
                            </strong>

                            <span>
                                ${Math.round(progress)}%
                            </span>
                        </div>

                        <div class="progress-track">
                            <div
                                class="progress-fill"
                                style="width:${progress}%"
                            ></div>
                        </div>

                        <div class="goal-mini-bottom">
                            <span>
                                ${displayCurrency(goal.current)}
                            </span>

                            <span>
                                ${displayCurrency(goal.target)}
                            </span>
                        </div>

                    </a>
                `;
            }).join("");
    }


    function updateDashboardTransactions() {
        const container =
            $("#recentTransactions");

        if (!container) {
            return;
        }

        const transactions =
            getTransactions()
                .sort(
                    (a, b) =>
                        parseDate(b.date) -
                        parseDate(a.date)
                )
                .slice(0, 6);


        if (!transactions.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>No transactions yet</strong>
                    <p>
                        Your latest income and expenses will appear here.
                    </p>
                </div>
            `;

            return;
        }


        container.innerHTML =
            transactions.map(
                transaction => `
                    <div class="transaction-row">

                        <div class="transaction-main">

                            <span
                                class="transaction-icon ${
                                    transaction.type === "income"
                                        ? "income"
                                        : "expense"
                                }"
                            >
                                ${
                                    transaction.type === "income"
                                        ? "↗"
                                        : "↘"
                                }
                            </span>

                            <div>
                                <strong>
                                    ${escapeHTML(
                                        transaction.description ||
                                        transaction.category
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        transaction.category
                                    )}
                                    ·
                                    ${escapeHTML(
                                        transaction.date
                                    )}
                                </small>
                            </div>

                        </div>

                        <strong
                            class="${
                                transaction.type === "income"
                                    ? "positive"
                                    : "negative"
                            }"
                        >
                            ${
                                transaction.type === "income"
                                    ? "+"
                                    : "-"
                            }${displayCurrency(
                                transaction.amount
                            )}
                        </strong>

                    </div>
                `
            ).join("");
    }


    function updateTopCategories() {
        const container =
            $("#topSpendingCategories");

        if (!container) {
            return;
        }

        const categories =
            getCategoryTotals(
                getTransactionsForPeriod(
                    "month"
                )
            )
            .slice(0, 5);


        if (!categories.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>No spending data yet</strong>
                    <p>
                        Add expenses to see your biggest categories.
                    </p>
                </div>
            `;

            return;
        }


        const total =
            categories.reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );


        container.innerHTML =
            categories.map(item => {

                const percentage =
                    total > 0
                        ? round(
                            item.amount /
                            total *
                            100
                        )
                        : 0;

                return `
                    <div class="category-row">

                        <div class="category-row-top">
                            <strong>
                                ${escapeHTML(item.category)}
                            </strong>

                            <span>
                                ${displayCurrency(item.amount)}
                            </span>
                        </div>

                        <div class="progress-track">
                            <div
                                class="progress-fill"
                                style="width:${percentage}%"
                            ></div>
                        </div>

                    </div>
                `;
            }).join("");
    }


    function updateSafeToSpend() {
        const safe =
            getSafeToSpend();

        setText(
            "safeToSpendDashboard",
            displayCurrency(
                safe.amount
            )
        );

        setText(
            "safeToSpendMessage",
            safe.status === "restricted"
                ? "Your current daily safe-to-spend amount is effectively zero."
                : `Based on your current pace, you have about ${displayCurrency(safe.amount)} per day available.`
        );

        setText(
            "safeToSpendAdvice",
            safe.status === "restricted"
                ? "Pause discretionary spending and review your budget."
                : "Use this as a guide rather than a permission to spend."
        );
    }


    function updateDashboardAlerts() {
        const container =
            $("#financialAlerts");

        if (!container) {
            return;
        }

        const alerts =
            generateAlerts();

        if (!alerts.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>Everything looks good</strong>
                    <p>
                        MoneyLeak hasn't detected a major issue right now.
                    </p>
                </div>
            `;

            return;
        }


        container.innerHTML =
            alerts.map(alert => `
                <div class="alert-card ${escapeHTML(alert.type)}">

                    <div class="alert-icon">
                        ${
                            alert.type === "success"
                                ? "✓"
                                : alert.type === "danger"
                                    ? "!"
                                    : "◆"
                        }
                    </div>

                    <div>
                        <strong>
                            ${escapeHTML(alert.title)}
                        </strong>

                        <p>
                            ${escapeHTML(alert.message)}
                        </p>
                    </div>

                </div>
            `).join("");
    }


    /* =====================================================
       GENERIC FORM HANDLERS
    ===================================================== */

    function setupIncomeForm() {
        const form =
            $("#incomeForm");

        if (!form) {
            return;
        }

        const date =
            $("#incomeDate");

        if (date && !date.value) {
            date.value =
                today();
        }


        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const amount =
                    number(
                        $("#incomeAmount")?.value
                    );

                if (amount <= 0) {
                    alert(
                        "Please enter a valid income amount."
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
                    date.value =
                        today();
                }


                refreshCurrentPage();

                showToast(
                    "Income added successfully."
                );

            }
        );


        $("#incomeReset")?.addEventListener(
            "click",
            () => {

                form.reset();

                if (date) {
                    date.value =
                        today();
                }

            }
        );
    }


    function setupExpenseForm() {
        const form =
            $("#expenseForm");

        if (!form) {
            return;
        }

        const date =
            $("#expenseDate");

        if (date && !date.value) {
            date.value =
                today();
        }


        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const amount =
                    number(
                        $("#expenseAmount")?.value
                    );

                if (amount <= 0) {
                    alert(
                        "Please enter a valid expense amount."
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
                    date.value =
                        today();
                }


                refreshCurrentPage();

                showToast(
                    "Expense added successfully."
                );

            }
        );


        $("#expenseReset")?.addEventListener(
            "click",
            () => {

                form.reset();

                if (date) {
                    date.value =
                        today();
                }

            }
        );
    }


    function setupSavingsGoalForm() {
        const form =
            $("#goalForm");

        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const name =
                    $("#goalName")?.value.trim();

                const target =
                    number(
                        $("#goalTarget")?.value
                    );

                if (!name || target <= 0) {
                    alert(
                        "Please enter a goal name and target."
                    );
                    return;
                }


                addSavingsGoal({
                    name,
                    target,
                    current:
                        number(
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

                refreshCurrentPage();

                showToast(
                    "Savings goal created."
                );

            }
        );


        $("#goalReset")?.addEventListener(
            "click",
            () => form.reset()
        );
    }


    function setupBudgetForms() {

        const monthlyForm =
            $("#monthlyBudgetForm");

        if (monthlyForm) {

            const input =
                $("#monthlyBudget");

            if (input) {
                input.value =
                    getMonthlyBudget() || "";
            }


            monthlyForm.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    const amount =
                        number(
                            input?.value
                        );

                    setMonthlyBudget(
                        amount
                    );

                    refreshCurrentPage();

                    showToast(
                        "Monthly budget updated."
                    );

                }
            );

        }


        const categoryForm =
            $("#categoryBudgetForm");

        if (categoryForm) {

            categoryForm.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    const category =
                        $("#budgetCategory")?.value;

                    const amount =
                        number(
                            $("#budgetCategoryAmount")?.value
                        );

                    if (!category) {
                        return;
                    }

                    setCategoryBudget(
                        category,
                        amount
                    );

                    categoryForm.reset();

                    refreshCurrentPage();

                    showToast(
                        "Category budget saved."
                    );

                }
            );

        }
    }


    function setupRecurringForm() {
        const form =
            $("#recurringForm");

        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const name =
                    $("#recurringName")?.value.trim();

                const amount =
                    number(
                        $("#recurringAmount")?.value
                    );

                if (!name || amount <= 0) {
                    alert(
                        "Please enter a name and valid amount."
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

                refreshCurrentPage();

                showToast(
                    "Recurring item added."
                );

            }
        );


        $("#recurringReset")?.addEventListener(
            "click",
            () => form.reset()
        );
    }


    /* =====================================================
       INCOME PAGE
    ===================================================== */

    function updateIncomePage() {
        if (!$("#incomeThisMonth")) {
            return;
        }

        const month =
            getTransactionsForPeriod(
                "month"
            );

        const previous =
            getPreviousMonthTransactions();

        const currentIncome =
            getIncome(month);

        const previousIncome =
            getIncome(previous);

        const incomeItems =
            month.filter(
                item =>
                    item.type === "income"
            );

        const sourceTotals = {};

        incomeItems.forEach(item => {

            const source =
                item.source ||
                item.category ||
                "Other";

            sourceTotals[source] =
                (
                    sourceTotals[source] ||
                    0
                ) +
                item.amount;

        });


        const sources =
            Object.entries(
                sourceTotals
            )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


        setText(
            "incomeThisMonth",
            displayCurrency(
                currentIncome
            )
        );

        setText(
            "incomePreviousMonth",
            displayCurrency(
                previousIncome
            )
        );

        setText(
            "incomeAverage",
            displayCurrency(
                incomeItems.length
                    ? currentIncome /
                        incomeItems.length
                    : 0
            )
        );

        setText(
            "incomeSourceCount",
            sources.length
        );


        const comparison =
            getPercentageChange(
                previousIncome,
                currentIncome
            );

        setText(
            "incomeMonthComparison",
            formatChange(
                comparison
            )
        );


        setText(
            "strongestIncomeSource",
            sources[0]
                ? sources[0][0]
                : "No data"
        );

        setText(
            "largestIncome",
            sources[0]
                ? displayCurrency(
                    sources[0][1]
                )
                : displayCurrency(0)
        );


        const stability =
            sources.length <= 1
                ? "Single source"
                : sources.length >= 3
                    ? "Diversified"
                    : "Moderate";

        setText(
            "incomeStability",
            stability
        );


        const insight =
            currentIncome <= 0
                ? "Record your income sources to understand how your money comes in."
                : comparison > 0
                    ? `Income is up ${comparison}% compared with the previous month.`
                    : comparison < 0
                        ? `Income is down ${Math.abs(comparison)}% compared with the previous month.`
                        : "Income is currently holding steady.";

        setText(
            "incomeInsight",
            insight
        );


        updateIncomeSources(
            sources
        );

        updateIncomeHistory();

    }


    function updateIncomeSources(
        sources
    ) {
        const container =
            $("#incomeSources");

        if (!container) {
            return;
        }

        if (!sources.length) {

            container.innerHTML =
                emptyHTML(
                    "No income sources yet",
                    "Your income breakdown will appear here."
                );

            return;
        }


        const total =
            sources.reduce(
                (sum, item) =>
                    sum + item[1],
                0
            );


        container.innerHTML =
            sources.map(
                ([source, amount]) => {

                    const percentage =
                        total > 0
                            ? amount /
                                total *
                                100
                            : 0;

                    return `
                        <div class="source-row">

                            <div class="source-row-top">
                                <strong>
                                    ${escapeHTML(source)}
                                </strong>

                                <span>
                                    ${displayCurrency(amount)}
                                </span>
                            </div>

                            <div class="progress-track">
                                <div
                                    class="progress-fill"
                                    style="width:${percentage}%"
                                ></div>
                            </div>

                        </div>
                    `;
                }
            ).join("");
    }


    function updateIncomeHistory() {
        const container =
            $("#incomeHistory");

        if (!container) {
            return;
        }

        let items =
            getTransactions()
                .filter(
                    item =>
                        item.type === "income"
                )
                .sort(
                    (a, b) =>
                        parseDate(b.date) -
                        parseDate(a.date)
                );


        const filter =
            $("#incomeFilterSource")?.value;

        const search =
            $("#incomeSearch")?.value
                .toLowerCase()
                .trim();


        if (
            filter &&
            filter !== "all"
        ) {
            items =
                items.filter(
                    item =>
                        (
                            item.source ||
                            item.category
                        ) === filter
                );
        }


        if (search) {
            items =
                items.filter(item =>
                    `${item.description} ${item.source} ${item.category}`
                        .toLowerCase()
                        .includes(search)
                );
        }


        if (!items.length) {

            container.innerHTML =
                emptyHTML(
                    "No matching income",
                    "Try changing your search or filters."
                );

            return;
        }


        container.innerHTML =
            items.map(item => `
                <div class="transaction-row">

                    <div class="transaction-main">

                        <span class="transaction-icon income">
                            ↗
                        </span>

                        <div>
                            <strong>
                                ${escapeHTML(
                                    item.description ||
                                    item.source ||
                                    "Income"
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    item.source ||
                                    item.category
                                )}
                                ·
                                ${escapeHTML(item.date)}
                            </small>
                        </div>

                    </div>

                    <div class="transaction-actions">

                        <strong class="positive">
                            +${displayCurrency(item.amount)}
                        </strong>

                        <button
                            type="button"
                            class="delete-button"
                            data-delete-income="${escapeHTML(item.id)}"
                        >
                            Delete
                        </button>

                    </div>

                </div>
            `).join("");


        $$("[data-delete-income]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        if (
                            confirm(
                                "Delete this income transaction?"
                            )
                        ) {

                            deleteTransaction(
                                button.dataset.deleteIncome
                            );

                            refreshCurrentPage();

                        }

                    }
                );

            });
    }


    /* =====================================================
       EXPENSE PAGE
    ===================================================== */

    function updateExpensePage() {
        if (!$("#expenseThisMonth")) {
            return;
        }

        const month =
            getTransactionsForPeriod(
                "month"
            );

        const previous =
            getPreviousMonthTransactions();

        const expenses =
            month.filter(
                item =>
                    item.type === "expense"
            );

        const total =
            getExpenses(month);

        const previousTotal =
            getExpenses(previous);


        setText(
            "expenseThisMonth",
            displayCurrency(total)
        );

        setText(
            "expensePreviousMonth",
            displayCurrency(previousTotal)
        );

        setText(
            "expenseDailyAverage",
            displayCurrency(
                total /
                Math.max(
                    1,
                    new Date().getDate()
                )
            )
        );

        setText(
            "expenseTransactionCount",
            expenses.length
        );

        setText(
            "expenseMonthComparison",
            formatChange(
                getPercentageChange(
                    previousTotal,
                    total
                )
            )
        );


        const categories =
            getCategoryTotals(
                month
            );

        const biggest =
            categories[0];

        const biggestAmount =
            biggest?.amount || 0;

        const biggestPercentage =
            total > 0
                ? round(
                    biggestAmount /
                    total *
                    100
                )
                : 0;


        setText(
            "biggestLeakCategory",
            biggest?.category ||
            "No data"
        );

        setText(
            "biggestLeakAmount",
            displayCurrency(
                biggestAmount
            )
        );

        setText(
            "biggestLeakPercentage",
            `${biggestPercentage}%`
        );


        setText(
            "biggestLeakAdvice",
            biggest
                ? `${biggest.category} is currently your largest spending category.`
                : "Add expenses to discover your biggest spending leak."
        );


        const status =
            total === 0
                ? "No spending yet"
                : total < previousTotal
                    ? "Improving"
                    : total > previousTotal
                        ? "Increasing"
                        : "Stable";

        setText(
            "spendingStatus",
            status
        );


        const largest =
            getLargestExpense(
                month
            );

        setText(
            "largestExpense",
            largest
                ? displayCurrency(
                    largest.amount
                )
                : displayCurrency(0)
        );


        setText(
            "averageExpense",
            displayCurrency(
                getAverageExpense(
                    month
                )
            )
        );


        const mostExpensive =
            expenses
                .slice()
                .sort(
                    (a, b) =>
                        b.amount -
                        a.amount
                )[0];


        setText(
            "mostExpensiveDay",
            mostExpensive
                ? mostExpensive.date
                : "No data"
        );


        updateExpenseCategories(
            categories
        );

        updateExpenseHistory();

    }


    function updateExpenseCategories(
        categories
    ) {
        const container =
            $("#expenseCategories");

        if (!container) {
            return;
        }

        if (!categories.length) {

            container.innerHTML =
                emptyHTML(
                    "No spending categories",
                    "Your expense categories will appear here."
                );

            return;
        }


        const total =
            categories.reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );


        container.innerHTML =
            categories.map(
                item => {

                    const percentage =
                        total > 0
                            ? item.amount /
                                total *
                                100
                            : 0;

                    return `
                        <div class="category-row">

                            <div class="category-row-top">
                                <strong>
                                    ${escapeHTML(item.category)}
                                </strong>

                                <span>
                                    ${displayCurrency(item.amount)}
                                </span>
                            </div>

                            <div class="progress-track">
                                <div
                                    class="progress-fill"
                                    style="width:${percentage}%"
                                ></div>
                            </div>

                        </div>
                    `;
                }
            ).join("");
    }


    function updateExpenseHistory() {
        const container =
            $("#expenseHistory");

        if (!container) {
            return;
        }

        let items =
            getTransactions()
                .filter(
                    item =>
                        item.type === "expense"
                )
                .sort(
                    (a, b) =>
                        parseDate(b.date) -
                        parseDate(a.date)
                );


        const filter =
            $("#expenseFilterCategory")?.value;

        const search =
            $("#expenseSearch")?.value
                .toLowerCase()
                .trim();


        if (
            filter &&
            filter !== "all"
        ) {
            items =
                items.filter(
                    item =>
                        item.category === filter
                );
        }


        if (search) {
            items =
                items.filter(item =>
                    `${item.description} ${item.category}`
                        .toLowerCase()
                        .includes(search)
                );
        }


        if (!items.length) {

            container.innerHTML =
                emptyHTML(
                    "No matching expenses",
                    "Try changing your search or filters."
                );

            return;
        }


        container.innerHTML =
            items.map(item => `
                <div class="transaction-row">

                    <div class="transaction-main">

                        <span class="transaction-icon expense">
                            ↘
                        </span>

                        <div>
                            <strong>
                                ${escapeHTML(
                                    item.description ||
                                    item.category
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    item.category
                                )}
                                ·
                                ${escapeHTML(item.date)}
                            </small>
                        </div>

                    </div>

                    <div class="transaction-actions">

                        <strong class="negative">
                            -${displayCurrency(item.amount)}
                        </strong>

                        <button
                            type="button"
                            class="delete-button"
                            data-delete-expense="${escapeHTML(item.id)}"
                        >
                            Delete
                        </button>

                    </div>

                </div>
            `).join("");


        $$("[data-delete-expense]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        if (
                            confirm(
                                "Delete this expense?"
                            )
                        ) {

                            deleteTransaction(
                                button.dataset.deleteExpense
                            );

                            refreshCurrentPage();

                        }

                    }
                );

            });
    }


    /* =====================================================
       SAVINGS PAGE
    ===================================================== */

    function updateSavingsPage() {
        if (!$("#totalSaved")) {
            return;
        }

        const goals =
            getSavingsGoals();

        const totalSaved =
            goals.reduce(
                (sum, goal) =>
                    sum + goal.current,
                0
            );

        const totalTarget =
            goals.reduce(
                (sum, goal) =>
                    sum + goal.target,
                0
            );

        const progress =
            totalTarget > 0
                ? round(
                    totalSaved /
                    totalTarget *
                    100
                )
                : 0;


        setText(
            "totalSaved",
            displayCurrency(
                totalSaved
            )
        );

        setText(
            "totalTarget",
            displayCurrency(
                totalTarget
            )
        );

        setText(
            "overallProgress",
            `${Math.round(progress)}%`
        );

        setText(
            "activeGoalCount",
            goals.filter(
                goal =>
                    !goal.completed
            ).length
        );


        const active =
            goals.filter(
                goal =>
                    !goal.completed &&
                    getGoalRemaining(goal) > 0
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
                    goal =>
                        goal.deadline
                )
                .sort(
                    (a, b) =>
                        parseDate(a.deadline) -
                        parseDate(b.deadline)
                )[0];


        setText(
            "closestGoal",
            closest
                ? closest.name
                : "No active goals"
        );

        setText(
            "urgentGoal",
            urgent
                ? urgent.name
                : "No deadline soon"
        );


        const monthlyNeed =
            active.reduce(
                (sum, goal) =>
                    sum +
                    getGoalMonthlyRequired(goal),
                0
            );


        setText(
            "monthlySavingsNeeded",
            displayCurrency(
                monthlyNeed
            )
        );


        const insight =
            !goals.length
                ? "Create your first goal and give your savings a purpose."
                : progress >= 75
                    ? "You're close to turning your savings plans into real achievements."
                    : active.length
                        ? `Your active goals need about ${displayCurrency(monthlyNeed)} per month to stay on pace.`
                        : "You've completed your current goals. Consider creating the next one.";

        setText(
            "goalInsight",
            insight
        );


        updateGoalMilestones(
            goals
        );

        updateGoalsContainer(
            goals
        );

    }


    function updateGoalMilestones(
        goals
    ) {
        const container =
            $("#goalMilestones");

        if (!container) {
            return;
        }

        if (!goals.length) {

            container.innerHTML =
                emptyHTML(
                    "No milestones yet",
                    "Your goal milestones will appear here."
                );

            return;
        }


        const milestones =
            [
                {
                    label: "First 25%",
                    threshold: 25
                },
                {
                    label: "Halfway there",
                    threshold: 50
                },
                {
                    label: "75% complete",
                    threshold: 75
                },
                {
                    label: "Goal reached",
                    threshold: 100
                }
            ];


        container.innerHTML =
            milestones.map(
                milestone => {

                    const achieved =
                        goals.some(
                            goal =>
                                getGoalProgress(
                                    goal
                                ) >=
                                milestone.threshold
                        );

                    return `
                        <div class="milestone-row ${
                            achieved
                                ? "completed"
                                : ""
                        }">

                            <span class="milestone-check">
                                ${
                                    achieved
                                        ? "✓"
                                        : "○"
                                }
                            </span>

                            <span>
                                ${milestone.label}
                            </span>

                        </div>
                    `;
                }
            ).join("");
    }


    function updateGoalsContainer(
        goals
    ) {
        const container =
            $("#goalsContainer");

        if (!container) {
            return;
        }


        if (!goals.length) {

            container.innerHTML =
                emptyHTML(
                    "No savings goals yet",
                    "Create a goal above to start building your future."
                );

            return;
        }


        container.innerHTML =
            goals.map(goal => {

                const progress =
                    getGoalProgress(
                        goal
                    );

                const remaining =
                    getGoalRemaining(
                        goal
                    );

                return `
                    <article class="goal-card">

                        <div class="goal-card-top">

                            <div>

                                <span class="goal-label">
                                    ${
                                        goal.completed
                                            ? "Completed"
                                            : "Active goal"
                                    }
                                </span>

                                <h3>
                                    ${escapeHTML(goal.name)}
                                </h3>

                            </div>

                            <strong>
                                ${Math.round(progress)}%
                            </strong>

                        </div>


                        <div class="progress-track large">
                            <div
                                class="progress-fill"
                                style="width:${progress}%"
                            ></div>
                        </div>


                        <div class="goal-card-values">

                            <span>
                                Saved
                                <strong>
                                    ${displayCurrency(goal.current)}
                                </strong>
                            </span>

                            <span>
                                Target
                                <strong>
                                    ${displayCurrency(goal.target)}
                                </strong>
                            </span>

                            <span>
                                Remaining
                                <strong>
                                    ${displayCurrency(remaining)}
                                </strong>
                            </span>

                        </div>


                        ${
                            goal.deadline
                                ? `
                                    <div class="goal-deadline">
                                        Deadline:
                                        <strong>
                                            ${escapeHTML(goal.deadline)}
                                        </strong>
                                    </div>
                                `
                                : ""
                        }


                        <div class="goal-card-actions">

                            <button
                                type="button"
                                class="secondary-button"
                                data-goal-complete="${escapeHTML(goal.id)}"
                            >
                                ${
                                    goal.completed
                                        ? "Completed"
                                        : "Mark complete"
                                }
                            </button>

                            <button
                                type="button"
                                class="danger-button"
                                data-goal-delete="${escapeHTML(goal.id)}"
                            >
                                Delete
                            </button>

                        </div>

                    </article>
                `;

            }).join("");


        $$("[data-goal-complete]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.goalComplete;

                        const goal =
                            getSavingsGoals()
                                .find(
                                    item =>
                                        item.id === id
                                );

                        if (!goal) {
                            return;
                        }

                        updateSavingsGoal(
                            id,
                            {
                                current:
                                    goal.target,
                                completed:
                                    true
                            }
                        );

                        refreshCurrentPage();

                    }
                );

            });


        $$("[data-goal-delete]")
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
                                button.dataset.goalDelete
                            );

                            refreshCurrentPage();

                        }

                    }
                );

            });
    }


    /* =====================================================
       BUDGET PAGE
    ===================================================== */

    function updateBudgetPage() {
        if (!$("#budgetTotal")) {
            return;
        }

        const monthlyBudget =
            getMonthlyBudget();

        const spent =
            getExpenses(
                getTransactionsForPeriod(
                    "month"
                )
            );

        const remaining =
            Math.max(
                0,
                monthlyBudget -
                spent
            );

        const usage =
            monthlyBudget > 0
                ? round(
                    spent /
                    monthlyBudget *
                    100
                )
                : 0;


        setText(
            "budgetTotal",
            displayCurrency(
                monthlyBudget
            )
        );

        setText(
            "budgetSpent",
            displayCurrency(
                spent
            )
        );

        setText(
            "budgetRemaining",
            displayCurrency(
                remaining
            )
        );

        setText(
            "budgetUsage",
            `${Math.round(usage)}%`
        );


        setText(
            "monthlyBudgetPercent",
            `${Math.round(usage)}% used`
        );

        setText(
            "monthlyBudgetSpent",
            displayCurrency(
                spent
            )
        );

        setText(
            "monthlyBudgetLeft",
            displayCurrency(
                remaining
            )
        );


        const fill =
            $("#monthlyBudgetFill");

        if (fill) {
            fill.style.width =
                `${Math.min(
                    100,
                    usage
                )}%`;
        }


        const budgets =
            getCategoryBudgets();

        const categoryEntries =
            Object.entries(
                budgets
            );


        const categories =
            getCategoryTotals(
                getTransactionsForPeriod(
                    "month"
                )
            );


        const overBudget =
            categoryEntries.filter(
                ([category, budget]) => {

                    const spentAmount =
                        categories.find(
                            item =>
                                item.category ===
                                category
                        )?.amount || 0;

                    return (
                        spentAmount >
                        number(budget)
                    );
                }
            ).length;


        setText(
            "overBudgetCount",
            overBudget
        );

        setText(
            "budgetCategoryCount",
            categoryEntries.length
        );


        const highest =
            categoryEntries
                .map(
                    ([category, budget]) => ({
                        category,
                        budget:
                            number(budget),

                        spent:
                            categories.find(
                                item =>
                                    item.category ===
                                    category
                            )?.amount || 0
                    })
                )
                .sort(
                    (a, b) =>
                        b.spent -
                        a.spent
                )[0];


        setText(
            "highestBudgetCategory",
            highest
                ? highest.category
                : "No data"
        );


        const insight =
            monthlyBudget <= 0
                ? "Set a monthly budget to give your spending a clear limit."
                : usage >= 100
                    ? "You've crossed your monthly budget. Focus on essential spending until the next cycle."
                    : usage >= 80
                        ? "You're approaching your monthly budget. Slow discretionary spending now."
                        : "Your monthly budget currently has healthy room."


        setText(
            "budgetInsight",
            insight
        );


        updateCategoryBudgetList(
            categoryEntries,
            categories
        );

    }


    function updateCategoryBudgetList(
        entries,
        categories
    ) {
        const container =
            $("#categoryBudgetList");

        if (!container) {
            return;
        }


        if (!entries.length) {

            container.innerHTML =
                emptyHTML(
                    "No category budgets",
                    "Create category limits to control your biggest spending areas."
                );

            return;
        }


        container.innerHTML =
            entries.map(
                ([category, budget]) => {

                    const spent =
                        categories.find(
                            item =>
                                item.category ===
                                category
                        )?.amount || 0;

                    const percentage =
                        number(budget) > 0
                            ? round(
                                spent /
                                number(budget) *
                                100
                            )
                            : 0;

                    return `
                        <div class="budget-category-row">

                            <div class="budget-category-top">

                                <strong>
                                    ${escapeHTML(category)}
                                </strong>

                                <span>
                                    ${displayCurrency(spent)}
                                    /
                                    ${displayCurrency(budget)}
                                </span>

                            </div>

                            <div class="progress-track">

                                <div
                                    class="progress-fill"
                                    style="width:${Math.min(
                                        100,
                                        percentage
                                    )}%"
                                ></div>

                            </div>

                            <small>
                                ${Math.round(percentage)}% used
                            </small>

                        </div>
                    `;

                }
            ).join("");
    }


    /* =====================================================
       RECURRING PAGE
    ===================================================== */

    function updateRecurringPage() {
        if (!$("#recurringMonthly")) {
            return;
        }

        const items =
            getRecurringTransactions()
                .filter(
                    item =>
                        item.active
                );

        const monthlyExpenses =
            getRecurringMonthlyExpenses();

        const monthlyIncome =
            getRecurringMonthlyIncome();


        setText(
            "recurringMonthly",
            displayCurrency(
                monthlyExpenses
            )
        );

        setText(
            "recurringExpenses",
            displayCurrency(
                monthlyExpenses
            )
        );

        setText(
            "recurringIncome",
            displayCurrency(
                monthlyIncome
            )
        );

        setText(
            "recurringCount",
            items.length
        );


        const largest =
            items
                .slice()
                .sort(
                    (a, b) =>
                        b.amount -
                        a.amount
                )[0];


        const next =
            items
                .filter(
                    item =>
                        item.nextDate
                )
                .sort(
                    (a, b) =>
                        parseDate(a.nextDate) -
                        parseDate(b.nextDate)
                )[0];


        setText(
            "largestRecurring",
            largest
                ? `${largest.name} · ${displayCurrency(largest.amount)}`
                : "No recurring items"
        );


        setText(
            "nextRecurring",
            next
                ? `${next.name} · ${next.nextDate}`
                : "Nothing scheduled"
        );


        setText(
            "netRecurring",
            displayCurrency(
                monthlyIncome -
                monthlyExpenses
            )
        );


        setText(
            "recurringInsight",
            items.length
                ? `Your active recurring commitments total about ${displayCurrency(monthlyExpenses)} per month in expenses.`
                : "Add recurring bills, subscriptions, or income so MoneyLeak can anticipate your regular cash flow."
        );


        updateUpcomingRecurring(
            items
        );

        updateRecurringList(
            items
        );

    }


    function updateUpcomingRecurring(
        items
    ) {
        const container =
            $("#upcomingRecurring");

        if (!container) {
            return;
        }


        const upcoming =
            items
                .filter(
                    item =>
                        item.nextDate
                )
                .sort(
                    (a, b) =>
                        parseDate(a.nextDate) -
                        parseDate(b.nextDate)
                )
                .slice(0, 5);


        if (!upcoming.length) {

            container.innerHTML =
                emptyHTML(
                    "No upcoming items",
                    "Your next recurring payments will appear here."
                );

            return;
        }


        container.innerHTML =
            upcoming.map(item => `
                <div class="transaction-row">

                    <div class="transaction-main">

                        <span class="transaction-icon ${
                            item.type === "income"
                                ? "income"
                                : "expense"
                        }">
                            ${
                                item.type === "income"
                                    ? "↗"
                                    : "↘"
                            }
                        </span>

                        <div>
                            <strong>
                                ${escapeHTML(item.name)}
                            </strong>

                            <small>
                                ${escapeHTML(item.nextDate)}
                                ·
                                ${escapeHTML(item.frequency)}
                            </small>
                        </div>

                    </div>

                    <strong>
                        ${displayCurrency(item.amount)}
                    </strong>

                </div>
            `).join("");
    }


    function updateRecurringList(
        items
    ) {
        const container =
            $("#recurringList");

        if (!container) {
            return;
        }


        if (!items.length) {

            container.innerHTML =
                emptyHTML(
                    "No recurring transactions",
                    "Add your regular bills, subscriptions, or income."
                );

            return;
        }


        container.innerHTML =
            items.map(item => `
                <div class="transaction-row">

                    <div class="transaction-main">

                        <span class="transaction-icon ${
                            item.type === "income"
                                ? "income"
                                : "expense"
                        }">
                            ${
                                item.type === "income"
                                    ? "↗"
                                    : "↘"
                            }
                        </span>

                        <div>
                            <strong>
                                ${escapeHTML(item.name)}
                            </strong>

                            <small>
                                ${escapeHTML(item.category)}
                                ·
                                ${escapeHTML(item.frequency)}
                                ·
                                Next: ${escapeHTML(item.nextDate)}
                            </small>
                        </div>

                    </div>

                    <div class="transaction-actions">

                        <strong>
                            ${displayCurrency(item.amount)}
                        </strong>

                        <button
                            type="button"
                            class="delete-button"
                            data-delete-recurring="${escapeHTML(item.id)}"
                        >
                            Delete
                        </button>

                    </div>

                </div>
            `).join("");


        $$("[data-delete-recurring]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        if (
                            confirm(
                                "Delete this recurring item?"
                            )
                        ) {

                            deleteRecurringTransaction(
                                button.dataset.deleteRecurring
                            );

                            refreshCurrentPage();

                        }

                    }
                );

            });
    }


    /* =====================================================
       ANALYTICS
    ===================================================== */

    function updateAnalyticsPage() {
        if (!$("#analyticsIncome")) {
            return;
        }

        const activeButton =
            $(".period-button.active");

        const period =
            activeButton?.dataset.period ||
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
            getSavingsRate(
                transactions
            );


        setText(
            "analyticsIncome",
            displayCurrency(
                income
            )
        );

        setText(
            "analyticsExpenses",
            displayCurrency(
                expenses
            )
        );

        setText(
            "analyticsCashFlow",
            displayCurrency(
                cashFlow
            )
        );

        setText(
            "analyticsSavingsRate",
            `${savingsRate}%`
        );


        setText(
            "analyticsIncomeMeta",
            `${transactions.filter(item => item.type === "income").length} income entries`
        );

        setText(
            "analyticsExpensesMeta",
            `${transactions.filter(item => item.type === "expense").length} expense entries`
        );

        setText(
            "analyticsCashFlowMeta",
            cashFlow >= 0
                ? "Positive cash flow"
                : "Negative cash flow"
        );

        setText(
            "analyticsSavingsMeta",
            savingsRate >= 20
                ? "Healthy savings pace"
                : "Room to improve"
        );


        const health =
            getFinancialHealth();

        setText(
            "analyticsHealthStatus",
            health.status
        );

        setText(
            "analyticsHealthScore",
            health.score
        );

        setText(
            "analyticsHealthMessage",
            health.message
        );


        const fill =
            $("#analyticsHealthFill");

        if (fill) {
            fill.style.width =
                `${health.score}%`;
        }


        const insight =
            getSmartInsight();

        setText(
            "analyticsInsight",
            insight.text
        );


        const largest =
            getLargestExpense(
                transactions
            );

        setText(
            "largestExpense",
            largest
                ? displayCurrency(
                    largest.amount
                )
                : displayCurrency(0)
        );

        setText(
            "largestExpenseName",
            largest
                ? (
                    largest.description ||
                    largest.category
                )
                : "No data"
        );


        setText(
            "averageExpense",
            displayCurrency(
                getAverageExpense(
                    transactions
                )
            )
        );


        setText(
            "analyticsExpenseCount",
            transactions.filter(
                item =>
                    item.type === "expense"
            ).length
        );


        const sources =
            new Set(
                transactions
                    .filter(
                        item =>
                            item.type === "income"
                    )
                    .map(
                        item =>
                            item.source ||
                            item.category
                    )
            );

        setText(
            "analyticsIncomeSources",
            sources.size
        );


        updateAnalyticsCategories(
            transactions
        );

        updateAnalyticsTrend(
            period
        );

        updateAnalyticsAlerts();

    }


    function setupPeriodButtons() {
        $$(".period-button")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$(".period-button")
                            .forEach(item =>
                                item.classList.remove(
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


    function updateAnalyticsCategories(
        transactions
    ) {
        const container =
            $("#analyticsCategories");

        if (!container) {
            return;
        }

        const categories =
            getCategoryTotals(
                transactions
            );

        if (!categories.length) {

            container.innerHTML =
                emptyHTML(
                    "No category data",
                    "Add expenses to build your spending analysis."
                );

            return;
        }


        const total =
            categories.reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );


        container.innerHTML =
            categories
                .slice(0, 8)
                .map(item => {

                    const percentage =
                        total > 0
                            ? item.amount /
                                total *
                                100
                            : 0;

                    return `
                        <div class="category-row">

                            <div class="category-row-top">
                                <strong>
                                    ${escapeHTML(item.category)}
                                </strong>

                                <span>
                                    ${displayCurrency(item.amount)}
                                </span>
                            </div>

                            <div class="progress-track">
                                <div
                                    class="progress-fill"
                                    style="width:${percentage}%"
                                ></div>
                            </div>

                        </div>
                    `;

                }).join("");
    }


    function updateAnalyticsTrend(
        period
    ) {
        const container =
            $("#trendSummary");

        if (!container) {
            return;
        }


        const months =
            getMonthlyTrend(
                period
            );


        if (!months.length) {

            container.textContent =
                "Not enough data to show a trend yet.";

            return;
        }


        const latest =
            months[months.length - 1];

        const first =
            months[0];


        const incomeChange =
            getPercentageChange(
                first.income,
                latest.income
            );

        const expenseChange =
            getPercentageChange(
                first.expenses,
                latest.expenses
            );


        container.textContent =
            `Across the selected period, income changed ${formatChange(incomeChange)} while expenses changed ${formatChange(expenseChange)}.`;
    }


    function getMonthlyTrend(
        period = "year"
    ) {
        const now =
            new Date();

        let count = 12;

        if (period === "month") {
            count = 6;
        }

        if (period === "quarter") {
            count = 6;
        }


        const result = [];

        for (
            let i = count - 1;
            i >= 0;
            i--
        ) {

            const date =
                new Date(
                    now.getFullYear(),
                    now.getMonth() - i,
                    1
                );

            const key =
                `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}`;


            const transactions =
                getTransactions()
                    .filter(
                        item =>
                            monthKey(
                                item.date
                            ) === key
                    );


            result.push({
                key,
                label:
                    monthLabel(key),
                income:
                    getIncome(
                        transactions
                    ),
                expenses:
                    getExpenses(
                        transactions
                    )
            });

        }

        return result;
    }


    function updateAnalyticsAlerts() {
        const container =
            $("#analyticsAlerts");

        if (!container) {
            return;
        }

        const alerts =
            generateAlerts();

        if (!alerts.length) {

            container.innerHTML =
                emptyHTML(
                    "No major alerts",
                    "MoneyLeak hasn't detected anything that needs immediate attention."
                );

            return;
        }


        container.innerHTML =
            alerts.map(alert => `
                <div class="alert-card ${escapeHTML(alert.type)}">

                    <div class="alert-icon">
                        ${
                            alert.type === "success"
                                ? "✓"
                                : alert.type === "danger"
                                    ? "!"
                                    : "◆"
                        }
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(alert.title)}
                        </strong>

                        <p>
                            ${escapeHTML(alert.message)}
                        </p>

                    </div>

                </div>
            `).join("");
    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    function setupSettingsPage() {
        const form =
            $("#settingsProfileForm");

        if (!form) {
            return;
        }


        const settings =
            getSettings();


        const nameInput =
            $("#settingsName");

        const currencyInput =
            $("#settingsCurrency");

        const compactInput =
            $("#settingsCompactNumbers");

        const notificationsInput =
            $("#settingsNotifications");

        const insightsInput =
            $("#settingsInsights");


        if (nameInput) {
            nameInput.value =
                settings.name;
        }

        if (currencyInput) {
            currencyInput.value =
                settings.currency;
        }

        if (compactInput) {
            compactInput.checked =
                settings.compactNumbers;
        }

        if (notificationsInput) {
            notificationsInput.checked =
                settings.notifications;
        }

        if (insightsInput) {
            insightsInput.checked =
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
                        nameInput?.value.trim() ||
                        "MoneyLeak User",

                    currency:
                        currencyInput?.value ||
                        "NGN",

                    compactNumbers:
                        compactInput?.checked ||
                        false,

                    notifications:
                        notificationsInput?.checked !==
                        false,

                    insights:
                        insightsInput?.checked !==
                        false
                });


                showToast(
                    "Settings saved."
                );

            }
        );


        [
            compactInput,
            notificationsInput,
            insightsInput
        ].forEach(input => {

            input?.addEventListener(
                "change",
                () => {

                    saveSettings({
                        compactNumbers:
                            compactInput?.checked ||
                            false,

                        notifications:
                            notificationsInput?.checked !==
                            false,

                        insights:
                            insightsInput?.checked !==
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
                            button.dataset
                                .themeOption;

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
                () => {

                    $("#importDataFile")
                        ?.click();

                }
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


    function updateSettingsThemeButtons(
        theme
    ) {
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
       DATA EXPORT / IMPORT
    ===================================================== */

    function collectAllData() {
        return {
            version: "10.0",
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
        const data =
            collectAllData();

        const blob =
            new Blob(
                [
                    JSON.stringify(
                        data,
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
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement("a");

        const date =
            today();

        link.href =
            url;

        link.download =
            `moneyleak-backup-${date}.json`;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
            url
        );

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
                            data.transactions
                                .map(
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
                            data.savingsGoals
                                .map(
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
                            number(
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
                            data.recurring
                                .map(
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

                    emitUpdate();

                    alert(
                        "MoneyLeak data imported successfully."
                    );

                    location.reload();

                } catch {

                    alert(
                        "This backup file could not be imported. Please choose a valid MoneyLeak JSON backup."
                    );

                }

            };


        reader.readAsText(
            file
        );
    }


    function resetData() {

        const confirmed =
            confirm(
                "Reset MoneyLeak?\n\nThis will permanently delete your transactions, goals, budgets, recurring items, notifications, and settings from this browser."
            );

        if (!confirmed) {
            return;
        }


        Object.values(STORAGE)
            .forEach(key => {

                localStorage.removeItem(
                    key
                );

            });


        location.reload();
    }


    /* =====================================================
       PREVIOUS MONTH
    ===================================================== */

    function getPreviousMonthTransactions() {
        const now =
            new Date();

        const previous =
            new Date(
                now.getFullYear(),
                now.getMonth() - 1,
                1
            );

        const key =
            monthKey(previous);


        return getTransactions()
            .filter(
                item =>
                    monthKey(
                        item.date
                    ) === key
            );
    }


    function getPercentageChange(
        previous,
        current
    ) {
        previous =
            number(previous);

        current =
            number(current);

        if (previous === 0) {
            return current === 0
                ? 0
                : 100;
        }

        return Math.round(
            (
                (
                    current -
                    previous
                ) /
                Math.abs(previous)
            ) * 100
        );
    }


    function formatChange(
        percentage
    ) {
        const value =
            number(percentage);

        if (value > 0) {
            return `↑ ${value}%`;
        }

        if (value < 0) {
            return `↓ ${Math.abs(value)}%`;
        }

        return "No change";
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(message) {

        const existing =
            $(".moneyLeakToast");

        existing?.remove();


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
                background:
                    "var(--text, #102b22)",
                color:
                    "white",
                fontSize: "14px",
                fontWeight: "700",
                boxShadow:
                    "0 18px 45px rgba(0,0,0,.16)",
                animation:
                    "mlToastIn .25s ease"
            }
        );


        document.body.appendChild(
            toast
        );


        setTimeout(
            () => {

                toast.style.opacity =
                    "0";

                toast.style.transform =
                    "translateY(8px)";

                toast.style.transition =
                    "all .2s ease";

                setTimeout(
                    () => toast.remove(),
                    220
                );

            },
            2200
        );
    }


    /* =====================================================
       EMPTY STATE
    ===================================================== */

    function emptyHTML(
        title,
        description
    ) {
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
       UPDATE EVENT
    ===================================================== */

    function emitUpdate() {
        document.dispatchEvent(
            new CustomEvent(
                "moneyLeakUpdated"
            )
        );
    }


    /* =====================================================
       PAGE REFRESH
    ===================================================== */

    function refreshCurrentPage() {

        applySettings();

        updateDashboard();

        updateIncomePage();

        updateExpensePage();

        updateSavingsPage();

        updateBudgetPage();

        updateRecurringPage();

        updateAnalyticsPage();

        renderNotificationCenter();

        updateNotificationBadge();

    }


    /* =====================================================
       CATEGORY SELECT HELPERS
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
                    ? [
                        "all",
                        ...CATEGORIES
                    ]
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
                select.value =
                    current;
            }

        });


        const sourceSelect =
            $("#incomeSource");


        if (sourceSelect) {

            const current =
                sourceSelect.value;

            sourceSelect.innerHTML =
                INCOME_SOURCES.map(
                    source => `
                        <option value="${escapeHTML(source)}">
                            ${escapeHTML(source)}
                        </option>
                    `
                ).join("");


            if (
                INCOME_SOURCES.includes(
                    current
                )
            ) {
                sourceSelect.value =
                    current;
            }

        }


        const incomeFilter =
            $("#incomeFilterSource");


        if (incomeFilter) {

            const sources =
                [
                    "all",
                    ...new Set(
                        getTransactions()
                            .filter(
                                item =>
                                    item.type ===
                                    "income"
                            )
                            .map(
                                item =>
                                    item.source ||
                                    item.category
                            )
                    )
                ];


            const current =
                incomeFilter.value;

            incomeFilter.innerHTML =
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
                incomeFilter.value =
                    current;
            }

        }

    }


    /* =====================================================
       SEARCH / FILTER EVENTS
    ===================================================== */

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
       SYSTEM THEME CHANGES
    ===================================================== */

    function setupSystemThemeListener() {

        if (
            !window.matchMedia
        ) {
            return;
        }

        const media =
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            );


        const handler =
            () => {

                if (
                    getSettings().theme ===
                    "system"
                ) {
                    applySettings();
                }

            };


        if (
            typeof media.addEventListener ===
            "function"
        ) {
            media.addEventListener(
                "change",
                handler
            );
        } else if (
            typeof media.addListener ===
            "function"
        ) {
            media.addListener(
                handler
            );
        }

    }


    /* =====================================================
       INITIAL DATA MIGRATION
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
                typeof legacy === "object"
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
       GLOBAL UPDATE LISTENER
    ===================================================== */

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

            updateNotificationBadge();

        }
    );


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.MoneyLeak = {

        version: "10.0",

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

        getFinancialHealth,
        getSafeToSpend,

        getCategoryTotals,
        getLargestExpense,
        getAverageExpense,

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

        refreshCurrentPage
    };


    /* =====================================================
       START APPLICATION
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

        setupSystemThemeListener();

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

        emitUpdate();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();

    }

})();
