/* =========================================================
   MONEY LEAK — PERSONAL FINANCE OS
   APP.JS — CORE ENGINE
   Version 7.0
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       STORAGE
       ===================================================== */

    const STORAGE = {
        transactions: "moneyLeakTransactions",
        savingsGoals: "moneyLeakSavingsGoals",
        oldSavingsGoal: "moneyLeakSavingsGoal",
        monthlyBudget: "moneyLeakMonthlyBudget",
        categoryBudgets: "moneyLeakCategoryBudgets",
        recurring: "moneyLeakRecurringTransactions",
        settings: "moneyLeakSettings",
        alerts: "moneyLeakAlerts",
        initialized: "moneyLeakInitialized"
    };

    /* =====================================================
       DEFAULT SETTINGS
       ===================================================== */

    const DEFAULT_SETTINGS = {
        name: "My Money",
        currency: "NGN",
        theme: "light",
        notifications: true,
        compactNumbers: false
    };

    /* =====================================================
       CATEGORIES
       ===================================================== */

    const CATEGORIES = [
        "Food",
        "Transport",
        "Shopping",
        "Bills",
        "Housing",
        "Health",
        "Entertainment",
        "Education",
        "Family",
        "Travel",
        "Subscriptions",
        "Business",
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
        "Side Hustle",
        "Other"
    ];

    /* =====================================================
       UTILITIES
       ===================================================== */

    function readJSON(key, fallback) {
        try {
            const value = localStorage.getItem(key);

            if (!value) {
                return fallback;
            }

            const parsed = JSON.parse(value);

            return parsed ?? fallback;
        } catch (error) {
            console.warn("MoneyLeak storage error:", key, error);
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("MoneyLeak could not save:", key, error);
            return false;
        }
    }

    function uid(prefix = "ml") {
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).slice(2, 9)
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

    function toNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function todayISO() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function parseDate(value) {
        if (!value) return new Date();

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return new Date();
        }

        return date;
    }

    function startOfMonth(date = new Date()) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function endOfMonth(date = new Date()) {
        return new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
        );
    }

    function monthKey(date = new Date()) {
        const d = parseDate(date);

        return `${d.getFullYear()}-${String(
            d.getMonth() + 1
        ).padStart(2, "0")}`;
    }

    function formatDate(date) {
        if (!date) return "No date";

        const d = parseDate(date);

        return d.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function formatShortDate(date) {
        if (!date) return "—";

        const d = parseDate(date);

        return d.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short"
        });
    }

    /* =====================================================
       SETTINGS
       ===================================================== */

    function getSettings() {
        return {
            ...DEFAULT_SETTINGS,
            ...readJSON(STORAGE.settings, {})
        };
    }

    function saveSettings(updates = {}) {
        const settings = {
            ...getSettings(),
            ...updates
        };

        writeJSON(STORAGE.settings, settings);

        applySettings();

        dispatchUpdate();

        return settings;
    }

    function applySettings() {
        const settings = getSettings();

        document.documentElement.setAttribute(
            "data-theme",
            settings.theme === "dark" ? "dark" : "light"
        );

        document.documentElement.dataset.currency =
            settings.currency || "NGN";

        document.documentElement.dataset.compact =
            settings.compactNumbers ? "true" : "false";

        const nameElements = document.querySelectorAll(
            "[data-money-name], #dashboardGreeting"
        );

        nameElements.forEach((element) => {
            if (element.dataset.moneyName !== undefined) {
                element.textContent = settings.name || "My Money";
            }
        });
    }

    /* =====================================================
       CURRENCY
       ===================================================== */

    const CURRENCY_MAP = {
        NGN: {
            symbol: "₦",
            locale: "en-NG"
        },
        USD: {
            symbol: "$",
            locale: "en-US"
        },
        GBP: {
            symbol: "£",
            locale: "en-GB"
        },
        EUR: {
            symbol: "€",
            locale: "de-DE"
        },
        CAD: {
            symbol: "CA$",
            locale: "en-CA"
        },
        AUD: {
            symbol: "A$",
            locale: "en-AU"
        },
        GHS: {
            symbol: "₵",
            locale: "en-GH"
        },
        KES: {
            symbol: "KSh",
            locale: "en-KE"
        },
        ZAR: {
            symbol: "R",
            locale: "en-ZA"
        }
    };

    function currencySymbol() {
        const settings = getSettings();

        return (
            CURRENCY_MAP[settings.currency]?.symbol ||
            settings.currency ||
            "₦"
        );
    }

    function displayCurrency(amount, options = {}) {
        const settings = getSettings();
        const currency = settings.currency || "NGN";
        const number = toNumber(amount);

        const config = CURRENCY_MAP[currency] || {
            symbol: currency,
            locale: "en-US"
        };

        const compact =
            options.compact ??
            settings.compactNumbers;

        if (compact) {
            const abs = Math.abs(number);

            if (abs >= 1000000000) {
                return `${config.symbol}${(number / 1000000000).toFixed(1)}B`;
            }

            if (abs >= 1000000) {
                return `${config.symbol}${(number / 1000000).toFixed(1)}M`;
            }

            if (abs >= 1000) {
                return `${config.symbol}${(number / 1000).toFixed(1)}K`;
            }
        }

        try {
            return new Intl.NumberFormat(config.locale, {
                style: "currency",
                currency,
                maximumFractionDigits: options.decimals ?? 0,
                minimumFractionDigits: options.decimals ?? 0
            }).format(number);
        } catch {
            return `${config.symbol}${number.toLocaleString()}`;
        }
    }

    /* =====================================================
       TRANSACTIONS
       ===================================================== */

    function normalizeTransaction(transaction) {
        const item = {
            id: transaction.id || uid("txn"),
            type:
                transaction.type === "income"
                    ? "income"
                    : "expense",
            amount: Math.abs(toNumber(transaction.amount)),
            category:
                transaction.category ||
                (transaction.type === "income"
                    ? transaction.source || "Other"
                    : "Other"),
            source:
                transaction.source ||
                (transaction.type === "income"
                    ? transaction.category || "Other"
                    : ""),
            description:
                transaction.description ||
                transaction.note ||
                "",
            date: transaction.date || todayISO(),
            createdAt:
                transaction.createdAt ||
                new Date().toISOString()
        };

        return item;
    }

    function getTransactions() {
        const raw = readJSON(STORAGE.transactions, []);

        if (!Array.isArray(raw)) {
            return [];
        }

        return raw.map(normalizeTransaction);
    }

    function saveTransactions(transactions) {
        writeJSON(
            STORAGE.transactions,
            transactions.map(normalizeTransaction)
        );

        dispatchUpdate();
    }

    function addTransaction(transaction) {
        const transactions = getTransactions();

        const item = normalizeTransaction(transaction);

        transactions.unshift(item);

        saveTransactions(transactions);

        return item;
    }

    function updateTransaction(id, updates = {}) {
        const transactions = getTransactions();

        const index = transactions.findIndex(
            (transaction) => transaction.id === id
        );

        if (index === -1) return null;

        transactions[index] = normalizeTransaction({
            ...transactions[index],
            ...updates,
            id
        });

        saveTransactions(transactions);

        return transactions[index];
    }

    function deleteTransaction(id) {
        const transactions = getTransactions();

        const filtered = transactions.filter(
            (transaction) => transaction.id !== id
        );

        saveTransactions(filtered);

        return true;
    }

    function clearTransactions() {
        writeJSON(STORAGE.transactions, []);
        dispatchUpdate();
    }

    /* =====================================================
       TRANSACTION CALCULATIONS
       ===================================================== */

    function totalIncome(transactions = getTransactions()) {
        return transactions
            .filter((transaction) => transaction.type === "income")
            .reduce(
                (sum, transaction) => sum + transaction.amount,
                0
            );
    }

    function totalExpenses(transactions = getTransactions()) {
        return transactions
            .filter((transaction) => transaction.type === "expense")
            .reduce(
                (sum, transaction) => sum + transaction.amount,
                0
            );
    }

    function getBalance() {
        return (
            totalIncome() -
            totalExpenses()
        );
    }

    function getPeriodTransactions(period = "month", reference = new Date()) {
        const date = parseDate(reference);

        let start;
        let end;

        if (period === "month") {
            start = startOfMonth(date);
            end = endOfMonth(date);
        }

        if (period === "quarter") {
            const quarterStartMonth =
                Math.floor(date.getMonth() / 3) * 3;

            start = new Date(
                date.getFullYear(),
                quarterStartMonth,
                1
            );

            end = new Date(
                date.getFullYear(),
                quarterStartMonth + 3,
                0,
                23,
                59,
                59,
                999
            );
        }

        if (period === "year") {
            start = new Date(
                date.getFullYear(),
                0,
                1
            );

            end = new Date(
                date.getFullYear(),
                11,
                31,
                23,
                59,
                59,
                999
            );
        }

        return getTransactions().filter((transaction) => {
            const transactionDate =
                parseDate(transaction.date);

            return (
                transactionDate >= start &&
                transactionDate <= end
            );
        });
    }

    function getMonthlyTotals(date = new Date()) {
        const transactions =
            getPeriodTransactions("month", date);

        return {
            income: totalIncome(transactions),
            expenses: totalExpenses(transactions),
            cashFlow:
                totalIncome(transactions) -
                totalExpenses(transactions)
        };
    }

    function getPreviousMonthTotals() {
        const date = new Date();

        date.setMonth(date.getMonth() - 1);

        return getMonthlyTotals(date);
    }

    function getCategoryTotals(
        transactions = getTransactions()
    ) {
        const totals = {};

        transactions
            .filter(
                (transaction) =>
                    transaction.type === "expense"
            )
            .forEach((transaction) => {
                const category =
                    transaction.category || "Other";

                totals[category] =
                    (totals[category] || 0) +
                    transaction.amount;
            });

        return totals;
    }

    function getTopCategories(
        transactions = getTransactions(),
        limit = 5
    ) {
        return Object.entries(
            getCategoryTotals(transactions)
        )
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([category, amount]) => ({
                category,
                amount
            }));
    }

    function getLargestExpense(
        transactions = getTransactions()
    ) {
        return (
            transactions
                .filter(
                    (transaction) =>
                        transaction.type === "expense"
                )
                .sort(
                    (a, b) =>
                        b.amount - a.amount
                )[0] || null
        );
    }

    /* =====================================================
       SAVINGS GOALS
       ===================================================== */

    function normalizeGoal(goal) {
        return {
            id: goal.id || uid("goal"),
            name:
                goal.name ||
                goal.title ||
                "Savings Goal",
            target: Math.max(
                0,
                toNumber(
                    goal.target ??
                    goal.targetAmount
                )
            ),
            current: Math.max(
                0,
                toNumber(
                    goal.current ??
                    goal.saved ??
                    goal.currentAmount
                )
            ),
            deadline:
                goal.deadline ||
                goal.date ||
                "",
            color:
                goal.color ||
                "#087a5a",
            description:
                goal.description || "",
            createdAt:
                goal.createdAt ||
                new Date().toISOString()
        };
    }

    function getSavingsGoals() {
        let goals = readJSON(
            STORAGE.savingsGoals,
            null
        );

        if (!Array.isArray(goals)) {
            goals = [];
        }

        if (goals.length === 0) {
            const oldGoal = readJSON(
                STORAGE.oldSavingsGoal,
                null
            );

            if (oldGoal) {
                goals = [
                    normalizeGoal(oldGoal)
                ];

                writeJSON(
                    STORAGE.savingsGoals,
                    goals
                );
            }
        }

        return goals.map(normalizeGoal);
    }

    function saveSavingsGoals(goals) {
        writeJSON(
            STORAGE.savingsGoals,
            goals.map(normalizeGoal)
        );

        dispatchUpdate();
    }

    function addSavingsGoal(goal) {
        const goals = getSavingsGoals();

        const newGoal =
            normalizeGoal(goal);

        goals.push(newGoal);

        saveSavingsGoals(goals);

        return newGoal;
    }

    function updateSavingsGoal(id, updates = {}) {
        const goals = getSavingsGoals();

        const index = goals.findIndex(
            (goal) => goal.id === id
        );

        if (index === -1) return null;

        goals[index] =
            normalizeGoal({
                ...goals[index],
                ...updates,
                id
            });

        saveSavingsGoals(goals);

        return goals[index];
    }

    function deleteSavingsGoal(id) {
        const goals =
            getSavingsGoals().filter(
                (goal) => goal.id !== id
            );

        saveSavingsGoals(goals);

        return true;
    }

    function getGoalProgress(goal) {
        if (!goal || goal.target <= 0) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(
                0,
                (goal.current / goal.target) *
                    100
            )
        );
    }

    function getSavingsProgress() {
        const goals =
            getSavingsGoals();

        const target =
            goals.reduce(
                (sum, goal) =>
                    sum + goal.target,
                0
            );

        const current =
            goals.reduce(
                (sum, goal) =>
                    sum + goal.current,
                0
            );

        return {
            target,
            current,
            percentage:
                target > 0
                    ? Math.min(
                          100,
                          (current / target) *
                              100
                      )
                    : 0
        };
    }

    /* =====================================================
       BUDGETS
       ===================================================== */

    function getMonthlyBudget() {
        return Math.max(
            0,
            toNumber(
                readJSON(
                    STORAGE.monthlyBudget,
                    0
                )
            )
        );
    }

    function setMonthlyBudget(amount) {
        const value = Math.max(
            0,
            toNumber(amount)
        );

        writeJSON(
            STORAGE.monthlyBudget,
            value
        );

        dispatchUpdate();

        return value;
    }

    function getCategoryBudgets() {
        const budgets = readJSON(
            STORAGE.categoryBudgets,
            {}
        );

        return budgets &&
            typeof budgets === "object"
            ? budgets
            : {};
    }

    function setCategoryBudget(
        category,
        amount
    ) {
        const budgets =
            getCategoryBudgets();

        const value = Math.max(
            0,
            toNumber(amount)
        );

        if (value === 0) {
            delete budgets[category];
        } else {
            budgets[category] = value;
        }

        writeJSON(
            STORAGE.categoryBudgets,
            budgets
        );

        dispatchUpdate();

        return budgets;
    }

    function getBudgetStats() {
        const monthlyBudget =
            getMonthlyBudget();

        const month =
            getMonthlyTotals();

        const categoryBudgets =
            getCategoryBudgets();

        const categorySpent =
            getCategoryTotals(
                getPeriodTransactions("month")
            );

        const categoryStats =
            Object.entries(categoryBudgets)
                .map(
                    ([category, budget]) => {
                        const spent =
                            categorySpent[
                                category
                            ] || 0;

                        return {
                            category,
                            budget,
                            spent,
                            remaining:
                                budget - spent,
                            percentage:
                                budget > 0
                                    ? (spent /
                                          budget) *
                                      100
                                    : 0
                        };
                    }
                );

        return {
            monthlyBudget,
            spent: month.expenses,
            remaining:
                monthlyBudget -
                month.expenses,
            percentage:
                monthlyBudget > 0
                    ? (month.expenses /
                          monthlyBudget) *
                      100
                    : 0,
            categoryStats
        };
    }

    /* =====================================================
       RECURRING
       ===================================================== */

    function normalizeRecurring(item) {
        return {
            id: item.id || uid("rec"),
            name:
                item.name ||
                item.description ||
                "Recurring payment",
            amount: Math.abs(
                toNumber(item.amount)
            ),
            type:
                item.type === "income"
                    ? "income"
                    : "expense",
            category:
                item.category ||
                "Bills",
            frequency:
                item.frequency ||
                "monthly",
            nextDate:
                item.nextDate ||
                item.date ||
                todayISO(),
            description:
                item.description || "",
            createdAt:
                item.createdAt ||
                new Date().toISOString()
        };
    }

    function getRecurringTransactions() {
        const items =
            readJSON(
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

        const newItem =
            normalizeRecurring(item);

        items.push(newItem);

        saveRecurringTransactions(items);

        return newItem;
    }

    function updateRecurringTransaction(
        id,
        updates = {}
    ) {
        const items =
            getRecurringTransactions();

        const index = items.findIndex(
            (item) => item.id === id
        );

        if (index === -1) return null;

        items[index] =
            normalizeRecurring({
                ...items[index],
                ...updates,
                id
            });

        saveRecurringTransactions(items);

        return items[index];
    }

    function deleteRecurringTransaction(
        id
    ) {
        const items =
            getRecurringTransactions().filter(
                (item) => item.id !== id
            );

        saveRecurringTransactions(items);

        return true;
    }

    function recurringMonthlyEquivalent(
        item
    ) {
        const amount =
            toNumber(item.amount);

        switch (item.frequency) {
            case "weekly":
                return amount * 52 / 12;

            case "yearly":
                return amount / 12;

            case "monthly":
            default:
                return amount;
        }
    }

    /* =====================================================
       FINANCIAL HEALTH
       ===================================================== */

    function calculateFinancialHealth() {
        const month =
            getMonthlyTotals();

        const budget =
            getBudgetStats();

        const savings =
            getSavingsProgress();

        const recurring =
            getRecurringTransactions();

        let score = 50;

        /* Spending */
        if (month.income > 0) {
            const expenseRatio =
                month.expenses /
                month.income;

            if (expenseRatio <= 0.5) {
                score += 15;
            } else if (
                expenseRatio <= 0.7
            ) {
                score += 8;
            } else if (
                expenseRatio > 0.9
            ) {
                score -= 15;
            } else {
                score -= 5;
            }
        } else if (
            month.expenses > 0
        ) {
            score -= 10;
        }

        /* Savings */
        if (
            month.income > 0 &&
            month.cashFlow > 0
        ) {
            const savingsRate =
                month.cashFlow /
                month.income;

            if (savingsRate >= 0.2) {
                score += 15;
            } else if (
                savingsRate >= 0.1
            ) {
                score += 8;
            } else {
                score += 3;
            }
        }

        /* Budget */
        if (
            budget.monthlyBudget > 0
        ) {
            if (
                budget.percentage <= 70
            ) {
                score += 10;
            } else if (
                budget.percentage <= 90
            ) {
                score += 4;
            } else {
                score -= 8;
            }
        }

        /* Goals */
        if (
            savings.target > 0 &&
            savings.percentage >= 50
        ) {
            score += 5;
        }

        /* Recurring */
        const recurringExpenses =
            recurring
                .filter(
                    (item) =>
                        item.type ===
                        "expense"
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        recurringMonthlyEquivalent(
                            item
                        ),
                    0
                );

        if (
            month.income > 0 &&
            recurringExpenses /
                month.income <
                0.3
        ) {
            score += 5;
        }

        score = Math.round(
            Math.max(
                0,
                Math.min(100, score)
            )
        );

        let status;
        let message;

        if (score >= 85) {
            status = "Excellent";
            message =
                "Your finances are in a strong position. Keep protecting your savings and spending discipline.";
        } else if (score >= 70) {
            status = "Healthy";
            message =
                "You're building a healthy financial foundation. A little more consistency could make it even stronger.";
        } else if (score >= 50) {
            status = "Fair";
            message =
                "Your finances have room to improve. Focus on controlling spending and building savings.";
        } else {
            status = "Needs attention";
            message =
                "Your current money pattern needs attention. Start by reviewing expenses and protecting your cash flow.";
        }

        return {
            score,
            status,
            message,
            income: month.income,
            expenses: month.expenses,
            savingsRate:
                month.income > 0
                    ? Math.max(
                          0,
                          (month.cashFlow /
                              month.income) *
                              100
                      )
                    : 0,
            budgetUsage:
                budget.percentage,
            recurringExpenses
        };
    }

    /* =====================================================
       SAFE TO SPEND
       ===================================================== */

    function getSafeToSpend() {
        const month =
            getMonthlyTotals();

        const budget =
            getMonthlyBudget();

        if (budget > 0) {
            const remaining =
                Math.max(
                    0,
                    budget -
                        month.expenses
                );

            const today =
                new Date();

            const lastDay =
                endOfMonth(today)
                    .getDate();

            const day =
                today.getDate();

            const daysLeft =
                Math.max(
                    1,
                    lastDay - day + 1
                );

            return {
                amount:
                    remaining /
                    daysLeft,
                remaining,
                daysLeft,
                source:
                    "monthly budget"
            };
        }

        if (month.income > 0) {
            const available =
                Math.max(
                    0,
                    month.income -
                        month.expenses
                );

            return {
                amount:
                    available * 0.1,
                remaining:
                    available,
                daysLeft: null,
                source:
                    "available cash flow"
            };
        }

        return {
            amount: 0,
            remaining: 0,
            daysLeft: null,
            source: "no income recorded"
        };
    }

    /* =====================================================
       SMART INSIGHTS
       ===================================================== */

    function getSmartInsight() {
        const month =
            getMonthlyTotals();

        const previous =
            getPreviousMonthTotals();

        const health =
            calculateFinancialHealth();

        const top =
            getTopCategories(
                getPeriodTransactions(
                    "month"
                ),
                1
            )[0];

        if (
            month.income === 0 &&
            month.expenses === 0
        ) {
            return {
                title:
                    "Your financial picture is ready",
                text:
                    "Add your first income or expense and MoneyLeak will start learning your money patterns."
            };
        }

        if (
            month.income > 0 &&
            month.expenses === 0
        ) {
            return {
                title:
                    "Excellent start",
                text:
                    "You have income recorded but no expenses yet. Keep tracking everything you spend so your true cash flow stays visible."
            };
        }

        if (
            month.income > 0 &&
            month.cashFlow < 0
        ) {
            return {
                title:
                    "Spending is ahead of income",
                text:
                    `Your expenses are currently ${displayCurrency(
                        Math.abs(
                            month.cashFlow
                        )
                    )} above your income this month. Review your largest spending areas first.`
            };
        }

        if (
            previous.expenses > 0 &&
            month.expenses >
                previous.expenses *
                    1.2
        ) {
            return {
                title:
                    "Spending increased",
                text:
                    `Your spending is up about ${Math.round(
                        ((month.expenses -
                            previous.expenses) /
                            previous.expenses) *
                            100
                    )}% compared with last month.`
            };
        }

        if (
            top &&
            month.income > 0
        ) {
            const percentage =
                (top.amount /
                    month.expenses) *
                100;

            if (percentage >= 35) {
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
            health.savingsRate >= 20
        ) {
            return {
                title:
                    "You're building wealth",
                text:
                    `You're currently keeping about ${Math.round(
                        health.savingsRate
                    )}% of this month's income. That's a strong savings rate.`
            };
        }

        return {
            title:
                "Keep building the picture",
            text:
                "The more consistently you track income and expenses, the smarter MoneyLeak's recommendations become."
        };
    }

    /* =====================================================
       SMART ALERTS
       ===================================================== */

    function generateAlerts() {
        const alerts = [];
        const month =
            getMonthlyTotals();

        const budget =
            getBudgetStats();

        const health =
            calculateFinancialHealth();

        const top =
            getTopCategories(
                getPeriodTransactions(
                    "month"
                ),
                1
            )[0];

        if (
            month.income === 0 &&
            month.expenses > 0
        ) {
            alerts.push({
                id: "no-income",
                type: "warning",
                title:
                    "No income recorded",
                text:
                    "You have expenses this month but no income recorded yet."
            });
        }

        if (
            month.cashFlow < 0
        ) {
            alerts.push({
                id: "negative-cashflow",
                type: "danger",
                title:
                    "Negative cash flow",
                text:
                    "Your expenses are higher than your income this month."
            });
        }

        if (
            budget.monthlyBudget > 0 &&
            budget.percentage >= 100
        ) {
            alerts.push({
                id: "budget-over",
                type: "danger",
                title:
                    "Budget exceeded",
                text:
                    `You've used ${Math.round(
                        budget.percentage
                    )}% of your monthly budget.`
            });
        } else if (
            budget.monthlyBudget > 0 &&
            budget.percentage >= 80
        ) {
            alerts.push({
                id: "budget-warning",
                type: "warning",
                title:
                    "Budget warning",
                text:
                    `You've used ${Math.round(
                        budget.percentage
                    )}% of your monthly budget.`
            });
        }

        if (
            top &&
            month.expenses > 0 &&
            top.amount /
                month.expenses >=
                0.4
        ) {
            alerts.push({
                id: "category-leak",
                type: "info",
                title:
                    `${top.category} is dominating spending`,
                text:
                    "Consider reviewing this category for possible savings."
            });
        }

        if (
            health.score >= 80
        ) {
            alerts.push({
                id: "healthy",
                type: "success",
                title:
                    "Financial health is strong",
                text:
                    "You're building good financial momentum. Keep it going."
            });
        }

        writeJSON(
            STORAGE.alerts,
            alerts
        );

        return alerts;
    }

    function getAlerts() {
        return generateAlerts();
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
            keywords:
                "dashboard home overview balance money"
            ,
            url: "index.html"
        },
        {
            title: "Income",
            description:
                "Track salary, freelance and other income",
            icon: "↗",
            keywords:
                "income salary freelance earnings money received"
            ,
            url: "income.html"
        },
        {
            title: "Expenses",
            description:
                "Track spending and find money leaks",
            icon: "↘",
            keywords:
                "expenses spending costs money leak purchases"
            ,
            url: "expenses.html"
        },
        {
            title: "Savings Goals",
            description:
                "Build and track your financial goals",
            icon: "◎",
            keywords:
                "savings goals save target wealth"
            ,
            url: "savings.html"
        },
        {
            title: "Budgets",
            description:
                "Set spending limits and control categories",
            icon: "▣",
            keywords:
                "budget budgets spending limit control"
            ,
            url: "budgets.html"
        },
        {
            title: "Recurring",
            description:
                "Manage subscriptions, bills and regular income",
            icon: "↻",
            keywords:
                "recurring subscriptions bills rent regular payments"
            ,
            url: "recurring.html"
        },
        {
            title: "Analytics",
            description:
                "Understand your financial performance",
            icon: "◉",
            keywords:
                "analytics reports charts trends analysis"
            ,
            url: "analytics.html"
        },
        {
            title: "Settings",
            description:
                "Control your MoneyLeak account",
            icon: "⚙",
            keywords:
                "settings currency profile theme preferences"
            ,
            url: "settings.html"
        }
    ];

    const QUICK_ACTIONS = [
        {
            title: "Add income",
            description:
                "Record money you've received",
            icon: "↗",
            url: "income.html"
        },
        {
            title: "Add expense",
            description:
                "Record something you spent money on",
            icon: "↘",
            url: "expenses.html"
        },
        {
            title: "Create savings goal",
            description:
                "Start saving toward something important",
            icon: "◎",
            url: "savings.html"
        },
        {
            title: "Set a budget",
            description:
                "Give your money a spending limit",
            icon: "▣",
            url: "budgets.html"
        },
        {
            title: "View analytics",
            description:
                "Understand where your money is going",
            icon: "◉",
            url: "analytics.html"
        },
        {
            title: "Manage recurring payments",
            description:
                "Track subscriptions, bills and regular income",
            icon: "↻",
            url: "recurring.html"
        }
    ];

    const MONEY_QUESTIONS = [
        {
            title:
                "Where am I spending the most?",
            description:
                "Find your biggest spending categories",
            icon: "⌕",
            keywords:
                "spending most biggest category"
            ,
            url: "analytics.html"
        },
        {
            title:
                "Show my largest expenses",
            description:
                "Find your most expensive transactions",
            icon: "↘",
            keywords:
                "largest biggest expensive expenses"
            ,
            url: "expenses.html"
        },
        {
            title:
                "How much am I saving?",
            description:
                "Review your savings progress",
            icon: "◎",
            keywords:
                "saving savings save saved"
            ,
            url: "savings.html"
        },
        {
            title:
                "Show my recent transactions",
            description:
                "Review your latest money activity",
            icon: "↻",
            keywords:
                "recent transactions activity history"
            ,
            url: "expenses.html"
        },
        {
            title:
                "How is my financial health?",
            description:
                "Review your MoneyLeak financial health",
            icon: "✦",
            keywords:
                "health score financial health"
            ,
            url: "analytics.html"
        }
    ];

    function getSearchData() {
        const transactions =
            getTransactions();

        const goals =
            getSavingsGoals();

        const transactionResults =
            transactions.map(
                (transaction) => ({
                    kind: "transaction",
                    title:
                        transaction.description ||
                        transaction.category ||
                        "Transaction",
                    description:
                        `${transaction.type === "income" ? "Income" : "Expense"} • ${transaction.category || ""}`,
                    amount:
                        transaction.amount,
                    date:
                        transaction.date,
                    icon:
                        transaction.type ===
                        "income"
                            ? "↗"
                            : "↘",
                    url:
                        transaction.type ===
                        "income"
                            ? "income.html"
                            : "expenses.html",
                    keywords:
                        `${transaction.description || ""} ${transaction.category || ""} ${transaction.source || ""}`
                })
            );

        const goalResults =
            goals.map((goal) => ({
                kind: "goal",
                title: goal.name,
                description:
                    `Savings goal • ${Math.round(
                        getGoalProgress(goal)
                    )}% complete`,
                amount:
                    goal.current,
                date:
                    goal.deadline,
                icon: "◎",
                url: "savings.html",
                keywords:
                    `${goal.name} savings goal ${goal.description || ""}`
            }));

        return {
            pages: SEARCH_PAGES,
            transactions:
                transactionResults,
            goals:
                goalResults
        };
    }

    function normalizeSearchText(value) {
        return String(value || "")
            .toLowerCase()
            .trim();
    }

    function searchItems(query) {
        const q =
            normalizeSearchText(query);

        const data =
            getSearchData();

        if (!q) {
            return {
                pages: [],
                transactions: [],
                goals: []
            };
        }

        const scoreItem = (item) => {
            const title =
                normalizeSearchText(
                    item.title
                );

            const description =
                normalizeSearchText(
                    item.description
                );

            const keywords =
                normalizeSearchText(
                    item.keywords
                );

            let score = 0;

            if (title === q) {
                score += 100;
            }

            if (title.startsWith(q)) {
                score += 60;
            }

            if (title.includes(q)) {
                score += 40;
            }

            if (
                description.includes(q)
            ) {
                score += 20;
            }

            if (
                keywords.includes(q)
            ) {
                score += 15;
            }

            q.split(/\s+/)
                .filter(Boolean)
                .forEach((word) => {
                    if (
                        title.includes(word)
                    ) {
                        score += 10;
                    }

                    if (
                        description.includes(
                            word
                        )
                    ) {
                        score += 5;
                    }

                    if (
                        keywords.includes(
                            word
                        )
                    ) {
                        score += 4;
                    }
                });

            return score;
        };

        const rank = (items) =>
            items
                .map((item) => ({
                    item,
                    score: scoreItem(item)
                }))
                .filter(
                    (entry) =>
                        entry.score > 0
                )
                .sort(
                    (a, b) =>
                        b.score - a.score
                )
                .slice(0, 8)
                .map(
                    (entry) =>
                        entry.item
                );

        return {
            pages: rank(data.pages),
            transactions: rank(
                data.transactions
            ),
            goals: rank(
                data.goals
            )
        };
    }

    function navigateTo(url) {
        if (!url) return;

        window.location.href = url;
    }

    function closeSearch() {
        const overlay =
            document.getElementById(
                "searchOverlay"
            );

        if (!overlay) return;

        overlay.classList.remove(
            "open",
            "active"
        );

        overlay.style.display = "none";

        document.body.classList.remove(
            "search-open"
        );
    }

    function openSearch() {
        const overlay =
            document.getElementById(
                "searchOverlay"
            );

        if (!overlay) return;

        overlay.classList.add(
            "open"
        );

        overlay.style.display = "flex";

        document.body.classList.add(
            "search-open"
        );

        const input =
            document.getElementById(
                "globalSearch"
            );

        if (input) {
            setTimeout(() => {
                input.focus();
            }, 50);
        }

        renderSearchSuggestions("");
    }

    function renderSearchSuggestions(
        query = ""
    ) {
        const container =
            document.getElementById(
                "searchResults"
            );

        if (!container) return;

        const clean =
            normalizeSearchText(
                query
            );

        if (!clean) {
            renderDefaultSearch(container);
            return;
        }

        const results =
            searchItems(clean);

        const hasResults =
            results.pages.length ||
            results.transactions.length ||
            results.goals.length;

        let html = "";

        if (!hasResults) {
            html = `
                <div class="search-no-results">
                    <div class="search-no-results-icon">⌕</div>
                    <strong>No MoneyLeak results</strong>
                    <p>
                        We couldn't find anything matching
                        <strong>${escapeHTML(query)}</strong>.
                        Try searching for income, expenses,
                        savings, budget, food, salary or health.
                    </p>

                    <div class="search-example">
                        <span>income</span>
                        <span>expenses</span>
                        <span>savings</span>
                        <span>budget</span>
                        <span>health</span>
                    </div>
                </div>
            `;

            container.innerHTML = html;
            return;
        }

        if (results.pages.length) {
            html += `
                <div class="search-section-label">
                    MONEY LEAK
                </div>

                <div class="search-result-list">
                    ${results.pages
                        .map(
                            (item) => `
                            <button
                                class="search-result-item"
                                type="button"
                                data-search-url="${escapeHTML(item.url)}"
                            >
                                <span class="search-result-icon">
                                    ${escapeHTML(item.icon)}
                                </span>

                                <span class="search-result-text">
                                    <strong>
                                        ${escapeHTML(item.title)}
                                    </strong>
                                    <small>
                                        ${escapeHTML(item.description)}
                                    </small>
                                </span>

                                <span class="search-arrow">→</span>
                            </button>
                        `
                        )
                        .join("")}
                </div>
            `;
        }

        if (results.transactions.length) {
            html += `
                <div class="search-section-label">
                    TRANSACTIONS
                </div>

                <div class="search-result-list">
                    ${results.transactions
                        .map(
                            (item) => `
                            <button
                                class="search-result-item"
                                type="button"
                                data-search-url="${escapeHTML(item.url)}"
                            >
                                <span class="search-result-icon">
                                    ${escapeHTML(item.icon)}
                                </span>

                                <span class="search-result-text">
                                    <strong>
                                        ${escapeHTML(item.title)}
                                    </strong>
                                    <small>
                                        ${escapeHTML(item.description)}
                                        •
                                        ${escapeHTML(
                                            formatShortDate(
                                                item.date
                                            )
                                        )}
                                    </small>
                                </span>

                                <strong class="${
                                    item.description
                                        .startsWith(
                                            "Income"
                                        )
                                        ? "search-income"
                                        : "search-expense"
                                }">
                                    ${
                                        item.description
                                            .startsWith(
                                                "Income"
                                            )
                                            ? "+"
                                            : "-"
                                    }${displayCurrency(
                                        item.amount
                                    )}
                                </strong>
                            </button>
                        `
                        )
                        .join("")}
                </div>
            `;
        }

        if (results.goals.length) {
            html += `
                <div class="search-section-label">
                    SAVINGS GOALS
                </div>

                <div class="search-result-list">
                    ${results.goals
                        .map(
                            (item) => `
                            <button
                                class="search-result-item"
                                type="button"
                                data-search-url="${escapeHTML(item.url)}"
                            >
                                <span class="search-result-icon">
                                    ◎
                                </span>

                                <span class="search-result-text">
                                    <strong>
                                        ${escapeHTML(item.title)}
                                    </strong>
                                    <small>
                                        ${escapeHTML(item.description)}
                                    </small>
                                </span>

                                <strong class="search-income">
                                    ${displayCurrency(
                                        item.amount
                                    )}
                                </strong>
                            </button>
                        `
                        )
                        .join("")}
                </div>
            `;
        }

        container.innerHTML = html;

        container
            .querySelectorAll(
                "[data-search-url]"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        navigateTo(
                            button.dataset
                                .searchUrl
                        );
                    }
                );
            });
    }

    function renderDefaultSearch(
        container
    ) {
        let html = `
            <div class="search-section-label">
                QUICK ACTIONS
            </div>

            <div class="search-suggestion-grid">
                ${QUICK_ACTIONS.map(
                    (item) => `
                    <button
                        type="button"
                        class="search-suggestion"
                        data-search-url="${item.url}"
                    >
                        <span class="search-suggestion-icon">
                            ${item.icon}
                        </span>

                        <span class="search-suggestion-text">
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

                        <span class="search-arrow">
                            →
                        </span>
                    </button>
                `
                ).join("")}
            </div>

            <div class="search-section-label">
                MONEY QUESTIONS
            </div>

            <div class="search-smart-list">
                ${MONEY_QUESTIONS.map(
                    (item) => `
                    <button
                        type="button"
                        class="search-smart-item"
                        data-search-url="${item.url}"
                    >
                        <span class="search-smart-icon">
                            ${item.icon}
                        </span>

                        <span>
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

                        <span class="search-arrow">
                            →
                        </span>
                    </button>
                `
                ).join("")}
            </div>
        `;

        container.innerHTML = html;

        container
            .querySelectorAll(
                "[data-search-url]"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        navigateTo(
                            button.dataset
                                .searchUrl
                        );
                    }
                );
            });
    }

    function setupSearch() {
        const overlay =
            document.getElementById(
                "searchOverlay"
            );

        const input =
            document.getElementById(
                "globalSearch"
            );

        const closeButton =
            document.getElementById(
                "closeSearch"
            );

        const searchButtons =
            document.querySelectorAll(
                "[data-open-search], #searchButton, #globalSearchButton"
            );

        if (!overlay) return;

        searchButtons.forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    openSearch
                );
            }
        );

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

        if (input) {
            input.addEventListener(
                "input",
                () => {
                    renderSearchSuggestions(
                        input.value
                    );
                }
            );

            input.addEventListener(
                "keydown",
                (event) => {
                    if (
                        event.key ===
                        "Escape"
                    ) {
                        closeSearch();
                    }

                    if (
                        event.key ===
                            "Enter" &&
                        input.value.trim()
                    ) {
                        const results =
                            searchItems(
                                input.value
                            );

                        const first =
                            results.pages[0] ||
                            results.transactions[0] ||
                            results.goals[0];

                        if (first?.url) {
                            navigateTo(
                                first.url
                            );
                        }
                    }
                }
            );
        }

        document.addEventListener(
            "keydown",
            (event) => {
                const target =
                    event.target;

                const typing =
                    target &&
                    (
                        target.tagName ===
                            "INPUT" ||
                        target.tagName ===
                            "TEXTAREA" ||
                        target.isContentEditable
                    );

                if (
                    event.key === "/" &&
                    !typing
                ) {
                    event.preventDefault();
                    openSearch();
                }

                if (
                    event.key.toLowerCase() ===
                        "k" &&
                    (event.metaKey ||
                        event.ctrlKey)
                ) {
                    event.preventDefault();
                    openSearch();
                }

                if (
                    event.key ===
                    "Escape"
                ) {
                    closeSearch();
                }
            }
        );
    }

    /* =====================================================
       NOTIFICATIONS
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

        if (!button || !panel) {
            return;
        }

        function render() {
            if (!list) return;

            const settings =
                getSettings();

            if (
                settings.notifications ===
                false
            ) {
                list.innerHTML = `
                    <div class="empty-state">
                        <strong>
                            Notifications are off
                        </strong>
                        <p>
                            Turn notifications back on
                            in Settings to see MoneyLeak alerts.
                        </p>
                    </div>
                `;

                return;
            }

            const alerts =
                getAlerts();

            if (!alerts.length) {
                list.innerHTML = `
                    <div class="empty-state">
                        <strong>
                            You're all caught up
                        </strong>
                        <p>
                            MoneyLeak doesn't have any
                            important alerts right now.
                        </p>
                    </div>
                `;

                return;
            }

            list.innerHTML =
                alerts
                    .map(
                        (alert) => `
                        <div class="notification-item ${escapeHTML(
                            alert.type
                        )}">
                            <div class="notification-icon">
                                ${
                                    alert.type ===
                                    "danger"
                                        ? "!"
                                        : alert.type ===
                                          "warning"
                                        ? "⚠"
                                        : alert.type ===
                                          "success"
                                        ? "✓"
                                        : "i"
                                }
                            </div>

                            <div>
                                <strong>
                                    ${escapeHTML(
                                        alert.title
                                    )}
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        alert.text
                                    )}
                                </p>
                            </div>
                        </div>
                    `
                    )
                    .join("");
        }

        button.addEventListener(
            "click",
            (event) => {
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
                () => {
                    panel.classList.remove(
                        "open"
                    );
                }
            );
        }

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
                    event.target !== button
                ) {
                    panel.classList.remove(
                        "open"
                    );
                }
            }
        );

        render();
    }

    /* =====================================================
       MOBILE NAVIGATION
       ===================================================== */

    function setupMobileNavigation() {
        const menuButtons =
            document.querySelectorAll(
                "[data-mobile-menu], #mobileMenuButton, #menuButton"
            );

        const overlay =
            document.getElementById(
                "mobileOverlay"
            );

        const sidebar =
            document.querySelector(
                ".sidebar"
            );

        menuButtons.forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    () => {
                        document.body.classList.toggle(
                            "mobile-menu-open"
                        );

                        if (sidebar) {
                            sidebar.classList.toggle(
                                "open"
                            );
                        }

                        if (overlay) {
                            overlay.classList.toggle(
                                "open"
                            );
                        }
                    }
                );
            }
        );

        if (overlay) {
            overlay.addEventListener(
                "click",
                () => {
                    document.body.classList.remove(
                        "mobile-menu-open"
                    );

                    if (sidebar) {
                        sidebar.classList.remove(
                            "open"
                        );
                    }

                    overlay.classList.remove(
                        "open"
                    );
                }
            );
        }
    }

    /* =====================================================
       ACTIVE NAVIGATION
       ===================================================== */

    function setupActiveNavigation() {
        const current =
            window.location.pathname
                .split("/")
                .pop() ||
            "index.html";

        document
            .querySelectorAll(
                ".sidebar a[href]"
            )
            .forEach((link) => {
                const href =
                    link.getAttribute(
                        "href"
                    );

                if (
                    href === current ||
                    (
                        current === "" &&
                        href === "index.html"
                    )
                ) {
                    link.classList.add(
                        "active"
                    );
                }
            });
    }

    /* =====================================================
       GREETING
       ===================================================== */

    function updateGreeting() {
        const element =
            document.getElementById(
                "dashboardGreeting"
            );

        if (!element) return;

        const settings =
            getSettings();

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

        element.textContent =
            `${greeting}, ${
                settings.name ||
                "there"
            }`;
    }

    /* =====================================================
       DASHBOARD
       ===================================================== */

    function updateDashboard() {
        const month =
            getMonthlyTotals();

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

        const transactions =
            getTransactions();

        setText(
            "overviewBalance",
            displayCurrency(
                getBalance()
            )
        );

        setText(
            "overviewIncome",
            displayCurrency(
                month.income
            )
        );

        setText(
            "overviewExpenses",
            displayCurrency(
                month.expenses
            )
        );

        setText(
            "overviewSavingsRate",
            `${Math.round(
                health.savingsRate
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
            health.score
        );

        setText(
            "overviewHealthStatus",
            health.status
        );

        setText(
            "periodIncome",
            displayCurrency(
                month.income
            )
        );

        setText(
            "periodExpenses",
            displayCurrency(
                month.expenses
            )
        );

        setText(
            "periodCashFlow",
            displayCurrency(
                month.cashFlow
            )
        );

        setText(
            "cashFlowHealth",
            month.cashFlow >= 0
                ? "Positive"
                : "Negative"
        );

        setText(
            "overviewInsightText",
            insight.text
        );

        setText(
            "dashboardBudgetPercent",
            budget.monthlyBudget > 0
                ? `${Math.round(
                      budget.percentage
                  )}%`
                : "No budget"
        );

        setWidth(
            "dashboardBudgetFill",
            Math.min(
                100,
                budget.percentage
            )
        );

        setText(
            "dashboardBudgetSpent",
            displayCurrency(
                budget.spent
            )
        );

        setText(
            "dashboardBudgetRemaining",
            displayCurrency(
                Math.max(
                    0,
                    budget.remaining
                )
            )
        );

        setText(
            "dashboardBudgetLimit",
            displayCurrency(
                budget.monthlyBudget
            )
        );

        setText(
            "healthScore",
            health.score
        );

        setWidth(
            "healthFill",
            health.score
        );

        setText(
            "healthMessage",
            health.status
        );

        setText(
            "healthExplanation",
            health.message
        );

        setText(
            "safeToSpendDashboard",
            displayCurrency(
                safe.amount
            )
        );

        setText(
            "safeToSpendMessage",
            safe.amount > 0
                ? "Suggested daily spending room"
                : "Track income or set a budget to calculate this"
        );

        setText(
            "safeToSpendAdvice",
            safe.remaining > 0
                ? `Based on your ${safe.source}.`
                : "MoneyLeak needs more financial data to estimate this."
        );

        renderRecentTransactions(
            transactions
        );

        renderTopSpending();

        renderDashboardGoals();

        renderDashboardAlerts();

        updateHealthFactors(
            health
        );

        updateGreeting();
    }

    function renderRecentTransactions(
        transactions
    ) {
        const container =
            document.getElementById(
                "recentTransactions"
            );

        if (!container) return;

        const recent =
            transactions.slice(0, 6);

        if (!recent.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>
                        No transactions yet
                    </strong>
                    <p>
                        Add income or an expense
                        to start building your financial picture.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            recent
                .map(
                    (transaction) => `
                    <div class="transaction-row">
                        <div class="transaction-icon">
                            ${
                                transaction.type ===
                                "income"
                                    ? "↗"
                                    : "↘"
                            }
                        </div>

                        <div class="transaction-main">
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
                                •
                                ${formatShortDate(
                                    transaction.date
                                )}
                            </small>
                        </div>

                        <strong class="${
                            transaction.type ===
                            "income"
                                ? "income-text"
                                : "expense-text"
                        }">
                            ${
                                transaction.type ===
                                "income"
                                    ? "+"
                                    : "-"
                            }${displayCurrency(
                                transaction.amount
                            )}
                        </strong>
                    </div>
                `
                )
                .join("");
    }

    function renderTopSpending() {
        const container =
            document.getElementById(
                "topSpendingCategories"
            );

        if (!container) return;

        const top =
            getTopCategories(
                getPeriodTransactions(
                    "month"
                ),
                5
            );

        if (!top.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>
                        No spending yet
                    </strong>
                    <p>
                        Your top spending categories
                        will appear here.
                    </p>
                </div>
            `;

            return;
        }

        const total =
            top.reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );

        container.innerHTML =
            top
                .map((item) => {
                    const percentage =
                        total > 0
                            ? (
                                  item.amount /
                                  total
                              ) * 100
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
                                    ${displayCurrency(
                                        item.amount
                                    )}
                                </span>
                            </div>

                            <div class="progress">
                                <span
                                    style="width:${Math.min(
                                        100,
                                        percentage
                                    )}%"
                                ></span>
                            </div>
                        </div>
                    `;
                })
                .join("");
    }

    function renderDashboardGoals() {
        const container =
            document.getElementById(
                "dashboardGoals"
            );

        if (!container) return;

        const goals =
            getSavingsGoals();

        if (!goals.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>
                        No savings goals yet
                    </strong>
                    <p>
                        Create your first goal
                        and start building wealth.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            goals
                .slice(0, 4)
                .map((goal) => {
                    const progress =
                        getGoalProgress(
                            goal
                        );

                    return `
                        <div class="goal-mini-row">
                            <div>
                                <strong>
                                    ${escapeHTML(
                                        goal.name
                                    )}
                                </strong>

                                <small>
                                    ${displayCurrency(
                                        goal.current
                                    )}
                                    /
                                    ${displayCurrency(
                                        goal.target
                                    )}
                                </small>
                            </div>

                            <strong>
                                ${Math.round(
                                    progress
                                )}%
                            </strong>

                            <div class="progress">
                                <span
                                    style="width:${progress}%"
                                ></span>
                            </div>
                        </div>
                    `;
                })
                .join("");
    }

    function renderDashboardAlerts() {
        const container =
            document.getElementById(
                "financialAlerts"
            );

        if (!container) return;

        const alerts =
            getAlerts();

        if (!alerts.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>
                        Everything looks good
                    </strong>
                    <p>
                        No important financial alerts right now.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            alerts
                .slice(0, 5)
                .map(
                    (alert) => `
                    <div class="alert-item ${escapeHTML(
                        alert.type
                    )}">
                        <div class="alert-icon">
                            ${
                                alert.type ===
                                "danger"
                                    ? "!"
                                    : alert.type ===
                                      "warning"
                                    ? "⚠"
                                    : alert.type ===
                                      "success"
                                    ? "✓"
                                    : "i"
                            }
                        </div>

                        <div>
                            <strong>
                                ${escapeHTML(
                                    alert.title
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    alert.text
                                )}
                            </p>
                        </div>
                    </div>
                `
                )
                .join("");
    }

    function updateHealthFactors(
        health
    ) {
        setText(
            "healthIncomeFactor",
            health.income > 0
                ? "Income recorded"
                : "No income yet"
        );

        setText(
            "healthBudgetFactor",
            health.budgetUsage > 0
                ? `${Math.round(
                      health.budgetUsage
                  )}% used`
                : "No budget"
        );

        setText(
            "healthSavingsFactor",
            `${Math.round(
                health.savingsRate
            )}% saved`
        );

        setText(
            "healthRecurringFactor",
            displayCurrency(
                health.recurringExpenses
            )
        );

        setWidth(
            "healthIncomeBar",
            health.income > 0
                ? 100
                : 10
        );

        setWidth(
            "healthBudgetBar",
            health.budgetUsage > 0
                ? Math.min(
                      100,
                      health.budgetUsage
                  )
                : 10
        );

        setWidth(
            "healthSavingsBar",
            Math.min(
                100,
                health.savingsRate * 4
            )
        );

        setWidth(
            "healthRecurringBar",
            health.income > 0
                ? Math.min(
                      100,
                      (
                          health.recurringExpenses /
                          health.income
                      ) * 100
                  )
                : 10
        );

        setText(
            "healthInsight",
            getSmartInsight().text
        );
    }

    /* =====================================================
       QUICK ACTION BUTTONS
       ===================================================== */

    function setupQuickActions() {
        document
            .querySelectorAll(
                "[data-action]"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        const action =
                            button.dataset
                                .action;

                        switch (action) {
                            case "income":
                                navigateTo(
                                    "income.html"
                                );
                                break;

                            case "expense":
                                navigateTo(
                                    "expenses.html"
                                );
                                break;

                            case "savings":
                                navigateTo(
                                    "savings.html"
                                );
                                break;

                            case "budget":
                                navigateTo(
                                    "budgets.html"
                                );
                                break;

                            case "analytics":
                                navigateTo(
                                    "analytics.html"
                                );
                                break;

                            case "recurring":
                                navigateTo(
                                    "recurring.html"
                                );
                                break;

                            case "search":
                                openSearch();
                                break;
                        }
                    }
                );
            });
    }

    /* =====================================================
       SETTINGS DATA EXPORT
       ===================================================== */

    function exportData() {
        const data = {
            version: 7,
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
                getSettings()
        };

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
            document.createElement(
                "a"
            );

        link.href = url;
        link.download =
            `moneyleak-backup-${todayISO()}.json`;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(url);
    }

    async function importData(
        file
    ) {
        if (!file) {
            throw new Error(
                "No file selected."
            );
        }

        const text =
            await file.text();

        const data =
            JSON.parse(text);

        if (
            !data ||
            typeof data !==
                "object"
        ) {
            throw new Error(
                "Invalid MoneyLeak backup."
            );
        }

        if (
            Array.isArray(
                data.transactions
            )
        ) {
            writeJSON(
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
            writeJSON(
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
            setMonthlyBudget(
                data.monthlyBudget
            );
        }

        if (
            data.categoryBudgets &&
            typeof data.categoryBudgets ===
                "object"
        ) {
            writeJSON(
                STORAGE.categoryBudgets,
                data.categoryBudgets
            );
        }

        if (
            Array.isArray(
                data.recurring
            )
        ) {
            writeJSON(
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
            saveSettings(
                data.settings
            );
        }

        dispatchUpdate();

        return true;
    }

    function resetAllData() {
        Object.values(
            STORAGE
        ).forEach((key) => {
            localStorage.removeItem(
                key
            );
        });

        dispatchUpdate();
    }

    /* =====================================================
       EVENTS
       ===================================================== */

    function dispatchUpdate() {
        window.dispatchEvent(
            new CustomEvent(
                "moneyLeakUpdated"
            )
        );
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

        if (!element) return;

        element.textContent =
            value ?? "";
    }

    function setWidth(
        id,
        percentage
    ) {
        const element =
            document.getElementById(
                id
            );

        if (!element) return;

        element.style.width =
            `${Math.max(
                0,
                Math.min(
                    100,
                    toNumber(
                        percentage
                    )
                )
            )}%`;
    }

    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function initialize() {
        if (
            !localStorage.getItem(
                STORAGE.initialized
            )
        ) {
            localStorage.setItem(
                STORAGE.initialized,
                "true"
            );
        }

        applySettings();

        setupSearch();

        setupNotifications();

        setupMobileNavigation();

        setupActiveNavigation();

        setupQuickActions();

        updateGreeting();

        updateDashboard();

        window.addEventListener(
            "moneyLeakUpdated",
            () => {
                updateDashboard();
            }
        );
    }

    /* =====================================================
       PUBLIC MONEY LEAK API
       ===================================================== */

    window.MoneyLeak = {
        /* Storage */
        STORAGE,

        /* Settings */
        getSettings,
        saveSettings,
        applySettings,

        /* Currency */
        currencySymbol,
        displayCurrency,

        /* Categories */
        categories: CATEGORIES,
        incomeSources:
            INCOME_SOURCES,

        /* Transactions */
        getTransactions,
        saveTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        clearTransactions,

        /* Calculations */
        totalIncome,
        totalExpenses,
        getBalance,
        getPeriodTransactions,
        getMonthlyTotals,
        getPreviousMonthTotals,
        getCategoryTotals,
        getTopCategories,
        getLargestExpense,

        /* Savings */
        getSavingsGoals,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        getGoalProgress,
        getSavingsProgress,

        /* Budgets */
        getMonthlyBudget,
        setMonthlyBudget,
        getCategoryBudgets,
        setCategoryBudget,
        getBudgetStats,

        /* Recurring */
        getRecurringTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        recurringMonthlyEquivalent,

        /* Intelligence */
        calculateFinancialHealth,
        getSafeToSpend,
        getSmartInsight,
        generateAlerts,
        getAlerts,

        /* Search */
        openSearch,
        closeSearch,
        searchItems,

        /* Data */
        exportData,
        importData,
        resetAllData,

        /* Navigation */
        navigateTo,

        /* Utilities */
        formatDate,
        formatShortDate,
        todayISO
    };

    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );
    } else {
        initialize();
    }
})();
