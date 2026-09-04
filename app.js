(() => {
    "use strict";

    /* =========================================================
       MONEY LEAK — CENTRAL APPLICATION ENGINE
       ========================================================= */

    const STORAGE = {
        transactions: "moneyLeakTransactions",
        savingsGoal: "moneyLeakSavingsGoal",
        savingsGoals: "moneyLeakSavingsGoals",
        monthlyBudget: "moneyLeakMonthlyBudget",
        categoryBudgets: "moneyLeakCategoryBudgets",
        recurring: "moneyLeakRecurringTransactions",
        settings: "moneyLeakSettings",
        alerts: "moneyLeakAlerts",
        initialized: "moneyLeakInitialized"
    };

    const DEFAULT_SETTINGS = {
        currency: "NGN",
        currencySymbol: "₦",
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
        "Family",
        "Travel",
        "Utilities",
        "Business",
        "Savings",
        "Other"
    ];

    /* =========================================================
       BASIC HELPERS
       ========================================================= */

    function safeParse(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.warn("MoneyLeak storage parse error:", error);
            return fallback;
        }
    }

    function readStorage(key, fallback) {
        try {
            return safeParse(localStorage.getItem(key), fallback);
        } catch (error) {
            return fallback;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("MoneyLeak storage write error:", error);
            return false;
        }
    }

    function number(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
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

    function todayString() {
        const d = new Date();

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function parseDate(value) {
        if (!value) return new Date();

        const d = new Date(value);

        if (Number.isNaN(d.getTime())) {
            return new Date();
        }

        return d;
    }

    function formatDate(value) {
        const d = parseDate(value);

        return d.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function formatShortDate(value) {
        const d = parseDate(value);

        return d.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short"
        });
    }

    function daysBetween(start, end) {
        const a = parseDate(start);
        const b = parseDate(end);

        return Math.ceil(
            Math.abs(b.getTime() - a.getTime()) /
                (1000 * 60 * 60 * 24)
        );
    }

    function daysFromToday(date) {
        const today = new Date(todayString());
        const target = new Date(date);

        return Math.ceil(
            (target.getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24)
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

    function capitalize(value) {
        if (!value) return "";
        return String(value).charAt(0).toUpperCase() +
            String(value).slice(1);
    }

    /* =========================================================
       SETTINGS
       ========================================================= */

    function getSettings() {
        const stored = readStorage(
            STORAGE.settings,
            {}
        );

        return {
            ...DEFAULT_SETTINGS,
            ...(stored || {})
        };
    }

    function saveSettings(settings) {
        const current = getSettings();

        const updated = {
            ...current,
            ...(settings || {})
        };

        writeStorage(STORAGE.settings, updated);

        applySettings();

        return updated;
    }

    function applySettings() {
        const settings = getSettings();

        document.documentElement.dataset.theme =
            settings.theme === "dark" ? "dark" : "light";

        document.body?.classList.toggle(
            "dark-mode",
            settings.theme === "dark"
        );

        document.body?.classList.toggle(
            "compact-numbers",
            Boolean(settings.compactNumbers)
        );

        document.querySelectorAll(
            "[data-user-name]"
        ).forEach((element) => {
            element.textContent =
                settings.name || "My Money";
        });
    }

    /* =========================================================
       CURRENCY
       ========================================================= */

    function currencySymbol() {
        const settings = getSettings();

        if (settings.currencySymbol) {
            return settings.currencySymbol;
        }

        const symbols = {
            NGN: "₦",
            USD: "$",
            GBP: "£",
            EUR: "€",
            CAD: "CA$",
            AUD: "A$",
            ZAR: "R",
            GHS: "GH₵",
            KES: "KSh"
        };

        return symbols[settings.currency] || settings.currency;
    }

    function formatCurrency(value) {
        const amount = number(value);

        const settings = getSettings();

        try {
            return new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: settings.currency || "NGN",
                maximumFractionDigits: 0
            }).format(amount);
        } catch (error) {
            return `${currencySymbol()}${amount.toLocaleString()}`;
        }
    }

    function formatCompactCurrency(value) {
        const amount = number(value);
        const symbol = currencySymbol();

        if (Math.abs(amount) >= 1000000000) {
            return `${symbol}${(amount / 1000000000).toFixed(1)}B`;
        }

        if (Math.abs(amount) >= 1000000) {
            return `${symbol}${(amount / 1000000).toFixed(1)}M`;
        }

        if (Math.abs(amount) >= 1000) {
            return `${symbol}${(amount / 1000).toFixed(1)}K`;
        }

        return `${symbol}${Math.round(amount).toLocaleString()}`;
    }

    function displayCurrency(value) {
        const settings = getSettings();

        return settings.compactNumbers
            ? formatCompactCurrency(value)
            : formatCurrency(value);
    }

    /* =========================================================
       TRANSACTIONS
       ========================================================= */

    function normalizeTransaction(transaction) {
        const raw = transaction || {};

        let type = String(
            raw.type ||
            raw.transactionType ||
            ""
        ).toLowerCase();

        if (
            type !== "income" &&
            type !== "expense"
        ) {
            type = "expense";
        }

        return {
            id:
                raw.id ||
                raw._id ||
                uid("transaction"),

            amount: Math.abs(
                number(raw.amount || raw.value)
            ),

            type,

            category:
                raw.category ||
                (type === "income"
                    ? "Income"
                    : "Other"),

            description:
                raw.description ||
                raw.name ||
                raw.title ||
                raw.source ||
                "Transaction",

            source:
                raw.source ||
                "",

            date:
                raw.date ||
                raw.createdAt ||
                todayString(),

            note:
                raw.note ||
                raw.notes ||
                "",

            account:
                raw.account ||
                "Cash",

            createdAt:
                raw.createdAt ||
                new Date().toISOString()
        };
    }

    function getTransactions() {
        const raw = readStorage(
            STORAGE.transactions,
            []
        );

        if (!Array.isArray(raw)) {
            return [];
        }

        return raw
            .map(normalizeTransaction)
            .sort((a, b) => {
                return (
                    parseDate(b.date).getTime() -
                    parseDate(a.date).getTime()
                );
            });
    }

    function saveTransactions(transactions) {
        return writeStorage(
            STORAGE.transactions,
            transactions.map(normalizeTransaction)
        );
    }

    function addTransaction(transaction) {
        const transactions = getTransactions();

        const newTransaction =
            normalizeTransaction(transaction);

        transactions.unshift(newTransaction);

        saveTransactions(transactions);

        refreshEverything();

        return newTransaction;
    }

    function updateTransaction(id, updates) {
        const transactions = getTransactions();

        const index = transactions.findIndex(
            (transaction) =>
                String(transaction.id) === String(id)
        );

        if (index === -1) {
            return null;
        }

        transactions[index] =
            normalizeTransaction({
                ...transactions[index],
                ...(updates || {}),
                id: transactions[index].id
            });

        saveTransactions(transactions);

        refreshEverything();

        return transactions[index];
    }

    function deleteTransaction(id) {
        const transactions = getTransactions();

        const filtered = transactions.filter(
            (transaction) =>
                String(transaction.id) !== String(id)
        );

        saveTransactions(filtered);

        refreshEverything();

        return true;
    }

    /* =========================================================
       TOTALS
       ========================================================= */

    function calculateTotals(transactions = getTransactions()) {
        let income = 0;
        let expenses = 0;

        transactions.forEach((transaction) => {
            if (transaction.type === "income") {
                income += number(transaction.amount);
            }

            if (transaction.type === "expense") {
                expenses += number(transaction.amount);
            }
        });

        return {
            income,
            expenses,
            balance: income - expenses,
            cashFlow: income - expenses
        };
    }

    function getPeriodTransactions(
        period = "month",
        transactions = getTransactions()
    ) {
        const now = new Date();

        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        return transactions.filter((transaction) => {
            const d = parseDate(transaction.date);

            if (period === "all") {
                return true;
            }

            if (period === "year") {
                return d.getFullYear() === currentYear;
            }

            if (period === "6months") {
                const start = new Date(
                    currentYear,
                    currentMonth - 5,
                    1
                );

                return d >= start;
            }

            if (period === "3months") {
                const start = new Date(
                    currentYear,
                    currentMonth - 2,
                    1
                );

                return d >= start;
            }

            return (
                d.getFullYear() === currentYear &&
                d.getMonth() === currentMonth
            );
        });
    }

    /* =========================================================
       SAVINGS GOALS
       ========================================================= */

    function getSavingsGoals() {
        let goals = readStorage(
            STORAGE.savingsGoals,
            null
        );

        if (!Array.isArray(goals)) {
            goals = [];
        }

        /* Migrate old single goal */
        if (
            goals.length === 0
        ) {
            const oldGoal = readStorage(
                STORAGE.savingsGoal,
                null
            );

            if (oldGoal && typeof oldGoal === "object") {
                goals.push({
                    id: oldGoal.id || uid("goal"),
                    name:
                        oldGoal.name ||
                        oldGoal.title ||
                        "Savings Goal",
                    target: number(
                        oldGoal.target ||
                        oldGoal.amount ||
                        oldGoal.goal
                    ),
                    current: number(
                        oldGoal.current ||
                        oldGoal.saved ||
                        oldGoal.progress
                    ),
                    deadline:
                        oldGoal.deadline ||
                        oldGoal.date ||
                        "",
                    createdAt:
                        oldGoal.createdAt ||
                        new Date().toISOString()
                });

                writeStorage(
                    STORAGE.savingsGoals,
                    goals
                );
            }
        }

        return goals;
    }

    function saveSavingsGoals(goals) {
        return writeStorage(
            STORAGE.savingsGoals,
            goals
        );
    }

    function addSavingsGoal(goal) {
        const goals = getSavingsGoals();

        const newGoal = {
            id: uid("goal"),
            name:
                goal.name ||
                "New Goal",
            target: number(goal.target),
            current: number(goal.current),
            deadline:
                goal.deadline ||
                "",
            createdAt:
                new Date().toISOString()
        };

        goals.push(newGoal);

        saveSavingsGoals(goals);
        refreshEverything();

        return newGoal;
    }

    function updateSavingsGoal(id, updates) {
        const goals = getSavingsGoals();

        const index = goals.findIndex(
            (goal) =>
                String(goal.id) === String(id)
        );

        if (index === -1) {
            return null;
        }

        goals[index] = {
            ...goals[index],
            ...(updates || {}),
            target:
                updates?.target !== undefined
                    ? number(updates.target)
                    : goals[index].target,
            current:
                updates?.current !== undefined
                    ? number(updates.current)
                    : goals[index].current
        };

        saveSavingsGoals(goals);
        refreshEverything();

        return goals[index];
    }

    function deleteSavingsGoal(id) {
        const goals = getSavingsGoals().filter(
            (goal) =>
                String(goal.id) !== String(id)
        );

        saveSavingsGoals(goals);
        refreshEverything();

        return true;
    }

    function goalProgress(goal) {
        if (!goal || number(goal.target) <= 0) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(
                0,
                (number(goal.current) /
                    number(goal.target)) *
                    100
            )
        );
    }

    /* =========================================================
       MONTHLY BUDGET
       ========================================================= */

    function getMonthlyBudget() {
        const value = readStorage(
            STORAGE.monthlyBudget,
            0
        );

        if (
            typeof value === "object" &&
            value !== null
        ) {
            return number(
                value.amount ||
                value.limit ||
                0
            );
        }

        return number(value);
    }

    function setMonthlyBudget(amount) {
        const value = Math.max(
            0,
            number(amount)
        );

        writeStorage(
            STORAGE.monthlyBudget,
            value
        );

        refreshEverything();

        return value;
    }

    function getCurrentMonthExpenses() {
        return calculateTotals(
            getPeriodTransactions("month")
        ).expenses;
    }

    function getCategoryBudgets() {
        const budgets = readStorage(
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

        budgets[category] =
            Math.max(0, number(amount));

        writeStorage(
            STORAGE.categoryBudgets,
            budgets
        );

        refreshEverything();

        return budgets;
    }

    function deleteCategoryBudget(category) {
        const budgets =
            getCategoryBudgets();

        delete budgets[category];

        writeStorage(
            STORAGE.categoryBudgets,
            budgets
        );

        refreshEverything();
    }

    function getCategorySpending(
        category,
        transactions = getTransactions()
    ) {
        return transactions
            .filter(
                (transaction) =>
                    transaction.type === "expense" &&
                    String(
                        transaction.category
                    ).toLowerCase() ===
                        String(category).toLowerCase()
            )
            .reduce(
                (total, transaction) =>
                    total +
                    number(transaction.amount),
                0
            );
    }

    /* =========================================================
       RECURRING TRANSACTIONS
       ========================================================= */

    function getRecurringTransactions() {
        const recurring = readStorage(
            STORAGE.recurring,
            []
        );

        return Array.isArray(recurring)
            ? recurring
            : [];
    }

    function saveRecurringTransactions(
        recurring
    ) {
        return writeStorage(
            STORAGE.recurring,
            recurring
        );
    }

    function addRecurringTransaction(item) {
        const recurring =
            getRecurringTransactions();

        const newItem = {
            id: uid("recurring"),

            type:
                item.type === "income"
                    ? "income"
                    : "expense",

            amount: Math.abs(
                number(item.amount)
            ),

            name:
                item.name ||
                "Recurring item",

            category:
                item.category ||
                "Bills",

            frequency:
                item.frequency ||
                "monthly",

            nextDate:
                item.nextDate ||
                todayString(),

            note:
                item.note ||
                "",

            createdAt:
                new Date().toISOString()
        };

        recurring.push(newItem);

        saveRecurringTransactions(
            recurring
        );

        refreshEverything();

        return newItem;
    }

    function deleteRecurringTransaction(id) {
        const recurring =
            getRecurringTransactions()
                .filter(
                    (item) =>
                        String(item.id) !==
                        String(id)
                );

        saveRecurringTransactions(
            recurring
        );

        refreshEverything();
    }

    function monthlyRecurringAmount(item) {
        const amount =
            number(item.amount);

        switch (
            String(item.frequency).toLowerCase()
        ) {
            case "weekly":
                return amount * 4.345;

            case "yearly":
            case "annual":
                return amount / 12;

            case "daily":
                return amount * 30.4375;

            default:
                return amount;
        }
    }

    /* =========================================================
       FINANCIAL HEALTH
       ========================================================= */

    function calculateFinancialHealth() {
        const transactions =
            getTransactions();

        const totals =
            calculateTotals(transactions);

        const income = totals.income;
        const expenses = totals.expenses;

        /* Income factor — 35 points */
        let incomeFactor = 0;

        if (income > 0) {
            const ratio =
                expenses / income;

            if (ratio <= 0.5) {
                incomeFactor = 35;
            } else if (ratio <= 0.7) {
                incomeFactor = 30;
            } else if (ratio <= 0.85) {
                incomeFactor = 24;
            } else if (ratio <= 1) {
                incomeFactor = 15;
            } else {
                incomeFactor = 5;
            }
        }

        /* Budget factor — 25 points */
        let budgetFactor = 12;

        const monthlyBudget =
            getMonthlyBudget();

        const monthlyExpenses =
            getCurrentMonthExpenses();

        if (monthlyBudget > 0) {
            const usage =
                monthlyExpenses /
                monthlyBudget;

            if (usage <= 0.6) {
                budgetFactor = 25;
            } else if (usage <= 0.8) {
                budgetFactor = 21;
            } else if (usage <= 1) {
                budgetFactor = 15;
            } else {
                budgetFactor = 5;
            }
        }

        /* Savings factor — 25 points */
        let savingsFactor = 5;

        const savingsRate =
            income > 0
                ? ((income - expenses) /
                      income) *
                  100
                : 0;

        if (savingsRate >= 30) {
            savingsFactor = 25;
        } else if (savingsRate >= 20) {
            savingsFactor = 22;
        } else if (savingsRate >= 10) {
            savingsFactor = 16;
        } else if (savingsRate > 0) {
            savingsFactor = 10;
        } else {
            savingsFactor = 3;
        }

        /* Recurring factor — 15 points */
        let recurringFactor = 15;

        const recurring =
            getRecurringTransactions();

        const recurringExpenses =
            recurring
                .filter(
                    (item) =>
                        item.type === "expense"
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        monthlyRecurringAmount(
                            item
                        ),
                    0
                );

        if (income > 0) {
            const recurringRatio =
                recurringExpenses /
                income;

            if (recurringRatio > 0.5) {
                recurringFactor = 4;
            } else if (
                recurringRatio > 0.3
            ) {
                recurringFactor = 8;
            } else if (
                recurringRatio > 0.2
            ) {
                recurringFactor = 12;
            }
        }

        const score = Math.round(
            incomeFactor +
                budgetFactor +
                savingsFactor +
                recurringFactor
        );

        let status = "Needs attention";

        if (score >= 85) {
            status = "Excellent";
        } else if (score >= 70) {
            status = "Healthy";
        } else if (score >= 50) {
            status = "Fair";
        }

        let message =
            "Your financial picture needs some attention.";

        if (score >= 85) {
            message =
                "Excellent work. Your money habits are strong and sustainable.";
        } else if (score >= 70) {
            message =
                "You're on a healthy financial path. Keep building consistency.";
        } else if (score >= 50) {
            message =
                "You're making progress, but there are a few areas to improve.";
        }

        return {
            score,
            status,
            message,
            incomeFactor,
            budgetFactor,
            savingsFactor,
            recurringFactor,
            savingsRate
        };
    }

    /* =========================================================
       SMART ALERTS
       ========================================================= */

    function generateAlerts() {
        const alerts = [];

        const transactions =
            getTransactions();

        const totals =
            calculateTotals();

        const monthly =
            calculateTotals(
                getPeriodTransactions("month")
            );

        const budget =
            getMonthlyBudget();

        const monthlySpent =
            monthly.expenses;

        if (
            transactions.length === 0
        ) {
            alerts.push({
                type: "info",
                title: "Start tracking",
                message:
                    "Add your first income or expense to begin understanding your money."
            });
        }

        if (
            monthly.income > 0 &&
            monthly.expenses >
                monthly.income
        ) {
            alerts.push({
                type: "danger",
                title: "Spending is above income",
                message:
                    "Your expenses are higher than your income this month. Review your biggest spending areas."
            });
        }

        if (
            budget > 0 &&
            monthlySpent > budget
        ) {
            alerts.push({
                type: "danger",
                title: "Budget exceeded",
                message:
                    `You've exceeded your monthly budget by ${displayCurrency(
                        monthlySpent - budget
                    )}.`
            });
        } else if (
            budget > 0 &&
            monthlySpent /
                budget >=
                0.8
        ) {
            alerts.push({
                type: "warning",
                title: "Budget almost reached",
                message:
                    "You've used more than 80% of your monthly budget."
            });
        }

        const categoryBudgets =
            getCategoryBudgets();

        Object.keys(
            categoryBudgets
        ).forEach((category) => {
            const limit =
                number(
                    categoryBudgets[
                        category
                    ]
                );

            const spent =
                getCategorySpending(
                    category,
                    getPeriodTransactions(
                        "month"
                    )
                );

            if (
                limit > 0 &&
                spent > limit
            ) {
                alerts.push({
                    type: "danger",
                    title:
                        `${category} budget exceeded`,
                    message:
                        `You've spent ${displayCurrency(
                            spent - limit
                        )} above your ${category} budget.`
                });
            }
        });

        if (
            monthly.income > 0
        ) {
            const savingsRate =
                ((monthly.income -
                    monthly.expenses) /
                    monthly.income) *
                100;

            if (
                savingsRate >= 20
            ) {
                alerts.push({
                    type: "success",
                    title: "Strong savings rate",
                    message:
                        `You're keeping about ${Math.round(
                            savingsRate
                        )}% of this month's income.`
                });
            } else if (
                savingsRate <= 0
            ) {
                alerts.push({
                    type: "warning",
                    title: "No positive cash flow",
                    message:
                        "Try reducing one flexible spending category this month."
                });
            }
        }

        const recurring =
            getRecurringTransactions();

        const recurringExpenses =
            recurring
                .filter(
                    (item) =>
                        item.type === "expense"
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        monthlyRecurringAmount(
                            item
                        ),
                    0
                );

        if (
            monthly.income > 0 &&
            recurringExpenses /
                monthly.income >
                0.3
        ) {
            alerts.push({
                type: "warning",
                title: "Recurring costs are high",
                message:
                    "Your recurring commitments use a large part of your income."
            });
        }

        const health =
            calculateFinancialHealth();

        if (
            health.score >= 85
        ) {
            alerts.push({
                type: "success",
                title: "Financial health is excellent",
                message:
                    "You're maintaining strong financial habits."
            });
        }

        return alerts.slice(0, 8);
    }

    /* =========================================================
       DASHBOARD
       ========================================================= */

    function setText(id, value) {
        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    function setWidth(id, percentage) {
        const element =
            document.getElementById(id);

        if (element) {
            element.style.width =
                `${Math.max(
                    0,
                    Math.min(
                        100,
                        percentage
                    )
                )}%`;
        }
    }

    function updateDashboard() {
        const transactions =
            getTransactions();

        const totals =
            calculateTotals();

        const monthly =
            calculateTotals(
                getPeriodTransactions("month")
            );

        const goals =
            getSavingsGoals();

        const totalTarget =
            goals.reduce(
                (sum, goal) =>
                    sum +
                    number(goal.target),
                0
            );

        const totalSaved =
            goals.reduce(
                (sum, goal) =>
                    sum +
                    number(goal.current),
                0
            );

        const goalProgress =
            totalTarget > 0
                ? (totalSaved /
                      totalTarget) *
                  100
                : 0;

        const savingsRate =
            monthly.income > 0
                ? ((monthly.income -
                    monthly.expenses) /
                    monthly.income) *
                  100
                : 0;

        const health =
            calculateFinancialHealth();

        setText(
            "overviewBalance",
            displayCurrency(
                totals.balance
            )
        );

        setText(
            "overviewIncome",
            displayCurrency(
                monthly.income
            )
        );

        setText(
            "overviewExpenses",
            displayCurrency(
                monthly.expenses
            )
        );

        setText(
            "overviewSavingsRate",
            `${Math.round(
                Math.max(0, savingsRate)
            )}%`
        );

        setText(
            "overviewGoalProgress",
            `${Math.round(
                goalProgress
            )}%`
        );

        setWidth(
            "overviewGoalFill",
            goalProgress
        );

        setText(
            "overviewGoalStatus",
            goals.length
                ? `${goals.length} active goal${
                      goals.length === 1
                          ? ""
                          : "s"
                  }`
                : "No goals yet"
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
                monthly.income
            )
        );

        setText(
            "periodExpenses",
            displayCurrency(
                monthly.expenses
            )
        );

        setText(
            "periodCashFlow",
            displayCurrency(
                monthly.cashFlow
            )
        );

        setText(
            "cashFlowHealth",
            monthly.cashFlow >= 0
                ? "Positive cash flow"
                : "Negative cash flow"
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
            health.message
        );

        setText(
            "healthExplanation",
            `Your score combines income stability, budget control, savings behavior and recurring commitments.`
        );

        setText(
            "healthIncomeFactor",
            `${health.incomeFactor}/35`
        );

        setText(
            "healthBudgetFactor",
            `${health.budgetFactor}/25`
        );

        setText(
            "healthSavingsFactor",
            `${health.savingsFactor}/25`
        );

        setText(
            "healthRecurringFactor",
            `${health.recurringFactor}/15`
        );

        setWidth(
            "healthIncomeBar",
            (health.incomeFactor / 35) * 100
        );

        setWidth(
            "healthBudgetBar",
            (health.budgetFactor / 25) * 100
        );

        setWidth(
            "healthSavingsBar",
            (health.savingsFactor / 25) * 100
        );

        setWidth(
            "healthRecurringBar",
            (health.recurringFactor / 15) * 100
        );

        const budget =
            getMonthlyBudget();

        const budgetPercent =
            budget > 0
                ? (monthly.expenses /
                      budget) *
                  100
                : 0;

        setText(
            "dashboardBudgetPercent",
            `${Math.round(
                budgetPercent
            )}%`
        );

        setWidth(
            "dashboardBudgetFill",
            budgetPercent
        );

        setText(
            "dashboardBudgetSpent",
            displayCurrency(
                monthly.expenses
            )
        );

        setText(
            "dashboardBudgetLimit",
            displayCurrency(
                budget
            )
        );

        setText(
            "dashboardBudgetRemaining",
            displayCurrency(
                Math.max(
                    0,
                    budget -
                        monthly.expenses
                )
            )
        );

        setText(
            "dashboardBudgetMessage",
            budget <= 0
                ? "Set a monthly budget to start tracking it."
                : budgetPercent > 100
                ? "You've gone over your budget."
                : budgetPercent >= 80
                ? "You're approaching your budget limit."
                : "You're within your monthly budget."
        );

        renderRecentTransactions();
        renderTopSpending();
        renderDashboardGoals();
        renderAlerts();
        renderCashFlowChart();
        renderDashboardInsight();
        renderFinancialDirection();
    }

    function renderDashboardInsight() {
        const element =
            document.getElementById(
                "overviewInsightText"
            );

        if (!element) return;

        const monthly =
            calculateTotals(
                getPeriodTransactions("month")
            );

        if (
            monthly.income === 0 &&
            monthly.expenses === 0
        ) {
            element.textContent =
                "Add your income and expenses to unlock personalized financial insights.";
            return;
        }

        if (
            monthly.expenses >
            monthly.income
        ) {
            element.textContent =
                "Your spending is currently higher than your income. Start by reviewing your top spending category.";
            return;
        }

        const rate =
            monthly.income > 0
                ? ((monthly.income -
                    monthly.expenses) /
                    monthly.income) *
                  100
                : 0;

        if (rate >= 20) {
            element.textContent =
                `Great work. You're keeping approximately ${Math.round(
                    rate
                )}% of your income this month.`;
        } else {
            element.textContent =
                "Your cash flow is positive. Try increasing your savings rate by reducing one flexible expense.";
        }
    }

    function renderRecentTransactions() {
        const container =
            document.getElementById(
                "recentTransactions"
            );

        if (!container) return;

        const transactions =
            getTransactions().slice(0, 6);

        if (!transactions.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>No transactions yet</strong>
                    <span>Add income or expenses to see them here.</span>
                </div>
            `;
            return;
        }

        container.innerHTML =
            transactions
                .map(
                    (transaction) => `
                <div class="transaction-row">
                    <div class="transaction-icon ${
                        transaction.type
                    }">
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
                                transaction.description
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                transaction.category
                            )}
                            ·
                            ${formatShortDate(
                                transaction.date
                            )}
                        </span>
                    </div>

                    <strong class="transaction-amount ${
                        transaction.type
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

        const transactions =
            getPeriodTransactions("month")
                .filter(
                    (t) =>
                        t.type === "expense"
                );

        const map = {};

        transactions.forEach(
            (transaction) => {
                const category =
                    transaction.category ||
                    "Other";

                map[category] =
                    (map[category] || 0) +
                    number(
                        transaction.amount
                    );
            }
        );

        const entries =
            Object.entries(map)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .slice(0, 5);

        if (!entries.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>No spending data</strong>
                    <span>Your top categories will appear here.</span>
                </div>
            `;
            return;
        }

        const max =
            entries[0][1];

        container.innerHTML =
            entries
                .map(
                    ([category, amount]) => `
                <div class="category-row">
                    <div class="category-row-top">
                        <strong>
                            ${escapeHTML(
                                category
                            )}
                        </strong>

                        <span>
                            ${displayCurrency(
                                amount
                            )}
                        </span>
                    </div>

                    <div class="mini-bar">
                        <span style="width:${(
                            (amount / max) *
                            100
                        ).toFixed(1)}%"></span>
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

        if (!container) return;

        const goals =
            getSavingsGoals()
                .slice(0, 3);

        if (!goals.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>No savings goals yet</strong>
                    <span>Create a goal to start building toward something important.</span>
                </div>
            `;
            return;
        }

        container.innerHTML =
            goals
                .map((goal) => {
                    const progress =
                        goalProgress(goal);

                    return `
                        <div class="goal-row">
                            <div class="goal-row-top">
                                <strong>
                                    ${escapeHTML(
                                        goal.name
                                    )}
                                </strong>

                                <span>
                                    ${Math.round(
                                        progress
                                    )}%
                                </span>
                            </div>

                            <div class="mini-bar">
                                <span style="width:${progress}%"></span>
                            </div>

                            <small>
                                ${displayCurrency(
                                    goal.current
                                )}
                                of
                                ${displayCurrency(
                                    goal.target
                                )}
                            </small>
                        </div>
                    `;
                })
                .join("");
    }

    function renderAlerts() {
        const container =
            document.getElementById(
                "financialAlerts"
            );

        if (!container) return;

        const alerts =
            generateAlerts();

        if (!alerts.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>Everything looks good</strong>
                    <span>No major financial alerts right now.</span>
                </div>
            `;
            return;
        }

        container.innerHTML =
            alerts
                .map(
                    (alert) => `
                <div class="alert-card ${escapeHTML(
                    alert.type
                )}">
                    <div class="alert-dot"></div>

                    <div>
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
                </div>
            `
                )
                .join("");
    }

    function renderCashFlowChart() {
        const canvas =
            document.getElementById(
                "cashFlowChart"
            );

        if (!canvas) return;

        const ctx =
            canvas.getContext("2d");

        const width =
            canvas.clientWidth || 600;

        const height =
            canvas.clientHeight || 260;

        const ratio =
            window.devicePixelRatio || 1;

        canvas.width =
            width * ratio;

        canvas.height =
            height * ratio;

        ctx.scale(
            ratio,
            ratio
        );

        ctx.clearRect(
            0,
            0,
            width,
            height
        );

        const transactions =
            getTransactions();

        const now =
            new Date();

        const points = [];

        for (let i = 5; i >= 0; i--) {
            const d =
                new Date(
                    now.getFullYear(),
                    now.getMonth() - i,
                    1
                );

            let income = 0;
            let expense = 0;

            transactions.forEach(
                (transaction) => {
                    const td =
                        parseDate(
                            transaction.date
                        );

                    if (
                        td.getFullYear() ===
                            d.getFullYear() &&
                        td.getMonth() ===
                            d.getMonth()
                    ) {
                        if (
                            transaction.type ===
                            "income"
                        ) {
                            income +=
                                number(
                                    transaction.amount
                                );
                        } else {
                            expense +=
                                number(
                                    transaction.amount
                                );
                        }
                    }
                }
            );

            points.push({
                label:
                    d.toLocaleDateString(
                        undefined,
                        {
                            month: "short"
                        }
                    ),
                income,
                expense
            });
        }

        const values =
            points.flatMap((p) => [
                p.income,
                p.expense
            ]);

        const max =
            Math.max(
                1,
                ...values
            );

        const padding = 32;

        const chartWidth =
            width - padding * 2;

        const chartHeight =
            height - padding * 2;

        /* Grid */
        ctx.strokeStyle =
            "rgba(120,120,120,.15)";

        ctx.lineWidth = 1;

        for (let i = 0; i < 4; i++) {
            const y =
                padding +
                (chartHeight / 3) *
                    i;

            ctx.beginPath();
            ctx.moveTo(
                padding,
                y
            );
            ctx.lineTo(
                width - padding,
                y
            );
            ctx.stroke();
        }

        function drawLine(
            key,
            dash
        ) {
            ctx.beginPath();

            points.forEach(
                (point, index) => {
                    const x =
                        padding +
                        (chartWidth /
                            Math.max(
                                1,
                                points.length -
                                    1
                            )) *
                            index;

                    const y =
                        height -
                        padding -
                        (point[key] /
                            max) *
                            chartHeight;

                    if (index === 0) {
                        ctx.moveTo(
                            x,
                            y
                        );
                    } else {
                        ctx.lineTo(
                            x,
                            y
                        );
                    }
                }
            );

            ctx.strokeStyle =
                dash
                    ? "rgba(100,100,100,.55)"
                    : "rgba(40,40,40,.9)";

            ctx.lineWidth = 3;

            if (dash) {
                ctx.setLineDash([
                    6,
                    5
                ]);
            } else {
                ctx.setLineDash([]);
            }

            ctx.stroke();

            ctx.setLineDash([]);
        }

        drawLine(
            "income",
            false
        );

        drawLine(
            "expense",
            true
        );

        ctx.fillStyle =
            "rgba(100,100,100,.75)";

        ctx.font =
            "12px system-ui";

        points.forEach(
            (point, index) => {
                const x =
                    padding +
                    (chartWidth /
                        Math.max(
                            1,
                            points.length -
                                1
                        )) *
                        index;

                ctx.fillText(
                    point.label,
                    x - 10,
                    height - 8
                );
            }
        );

        const empty =
            document.getElementById(
                "cashFlowEmpty"
            );

        if (empty) {
            const hasData =
                values.some(
                    (value) =>
                        value > 0
                );

            empty.hidden =
                hasData;
        }
    }

    function renderFinancialDirection() {
        const element =
            document.getElementById(
                "healthInsight"
            );

        if (!element) return;

        const health =
            calculateFinancialHealth();

        if (health.score >= 85) {
            element.textContent =
                "You're moving in a strong financial direction.";
        } else if (
            health.score >= 70
        ) {
            element.textContent =
                "Your financial direction is positive. Keep strengthening your savings and budget habits.";
        } else if (
            health.score >= 50
        ) {
            element.textContent =
                "Your financial direction is improving, but consistency will make the biggest difference.";
        } else {
            element.textContent =
                "Focus on controlling expenses, maintaining positive cash flow and creating a simple savings habit.";
        }
    }

    /* =========================================================
       NOTIFICATIONS
       ========================================================= */

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

        if (!panel) return;

        function hide() {
            panel.hidden = true;
            panel.classList.remove(
                "open",
                "active"
            );

            panel.style.display = "none";

            panel.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        function show() {
            panel.hidden = false;

            panel.classList.add(
                "open",
                "active"
            );

            panel.style.display =
                "block";

            panel.setAttribute(
                "aria-hidden",
                "false"
            );

            renderNotificationPanel();
        }

        /* IMPORTANT:
           Notifications start CLOSED. */
        hide();

        if (button) {
            button.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (
                        panel.hidden ||
                        panel.style.display ===
                            "none"
                    ) {
                        show();
                    } else {
                        hide();
                    }
                }
            );
        }

        if (close) {
            close.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    hide();
                }
            );
        }

        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "Escape"
                ) {
                    hide();
                }
            }
        );
    }

    function renderNotificationPanel() {
        const container =
            document.getElementById(
                "notificationContent"
            ) ||
            document.getElementById(
                "notificationList"
            );

        if (!container) return;

        const alerts =
            generateAlerts();

        if (!alerts.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>No new notifications</strong>
                    <span>You're all caught up.</span>
                </div>
            `;

            return;
        }

        container.innerHTML =
            alerts
                .map(
                    (alert) => `
                <div class="notification-item ${escapeHTML(
                    alert.type
                )}">
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

    /* =========================================================
       GLOBAL SEARCH
       ========================================================= */

    function setupSearch() {
        const button =
            document.getElementById(
                "searchButton"
            );

        const overlay =
            document.getElementById(
                "searchOverlay"
            );

        const close =
            document.getElementById(
                "closeSearch"
            ) ||
            document.getElementById(
                "searchClose"
            );

        const input =
            document.getElementById(
                "globalSearch"
            );

        if (!overlay) return;

        function hideSearch() {
            overlay.hidden = true;

            overlay.classList.remove(
                "open",
                "active"
            );

            overlay.style.display =
                "none";

            overlay.setAttribute(
                "aria-hidden",
                "true"
            );

            if (input) {
                input.value = "";
            }
        }

        function showSearch() {
            overlay.hidden = false;

            overlay.classList.add(
                "open",
                "active"
            );

            overlay.style.display =
                "flex";

            overlay.setAttribute(
                "aria-hidden",
                "false"
            );

            setTimeout(() => {
                input?.focus();
            }, 50);

            renderSearchResults("");
        }

        /* IMPORTANT:
           Search starts CLOSED. */
        hideSearch();

        if (button) {
            button.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    showSearch();
                }
            );
        }

        if (close) {
            close.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    hideSearch();
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
                    hideSearch();
                }
            }
        );

        if (input) {
            input.addEventListener(
                "input",
                (event) => {
                    renderSearchResults(
                        event.target.value
                    );
                }
            );

            input.addEventListener(
                "keydown",
                (event) => {
                    if (
                        event.key === "Escape"
                    ) {
                        hideSearch();
                    }
                }
            );
        }

        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "/" &&
                    document.activeElement !==
                        input &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.altKey
                ) {
                    event.preventDefault();

                    showSearch();
                }

                if (
                    event.key === "Escape"
                ) {
                    hideSearch();
                }
            }
        );
    }

    function renderSearchResults(query) {
        const container =
            document.getElementById(
                "searchResults"
            );

        if (!container) return;

        const q =
            String(query || "")
                .trim()
                .toLowerCase();

        const pages = [
            {
                name: "Dashboard",
                url: "index.html",
                description:
                    "Your complete financial overview"
            },
            {
                name: "Income",
                url: "income.html",
                description:
                    "Track money coming in"
            },
            {
                name: "Expenses",
                url: "expenses.html",
                description:
                    "Track and understand spending"
            },
            {
                name: "Budgets",
                url: "budgets.html",
                description:
                    "Manage monthly and category budgets"
            },
            {
                name: "Savings Goals",
                url: "savings.html",
                description:
                    "Build and track savings goals"
            },
            {
                name: "Recurring",
                url: "recurring.html",
                description:
                    "Manage recurring money movements"
            },
            {
                name: "Analytics",
                url: "analytics.html",
                description:
                    "Explore financial trends"
            },
            {
                name: "Settings",
                url: "settings.html",
                description:
                    "Customize MoneyLeak"
            }
        ];

        const matchingPages =
            pages.filter(
                (page) =>
                    !q ||
                    page.name
                        .toLowerCase()
                        .includes(q) ||
                    page.description
                        .toLowerCase()
                        .includes(q)
            );

        const transactions =
            getTransactions()
                .filter(
                    (transaction) =>
                        !q ||
                        transaction.description
                            .toLowerCase()
                            .includes(q) ||
                        transaction.category
                            .toLowerCase()
                            .includes(q) ||
                        transaction.type
                            .toLowerCase()
                            .includes(q)
                )
                .slice(0, 8);

        container.innerHTML = `
            ${
                matchingPages.length
                    ? `
                    <div class="search-section">
                        <small>Pages</small>

                        ${matchingPages
                            .map(
                                (page) => `
                                <a
                                    class="search-result"
                                    href="${page.url}"
                                >
                                    <strong>
                                        ${escapeHTML(
                                            page.name
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            page.description
                                        )}
                                    </span>
                                </a>
                            `
                            )
                            .join("")}
                    </div>
                `
                    : ""
            }

            ${
                transactions.length
                    ? `
                    <div class="search-section">
                        <small>Transactions</small>

                        ${transactions
                            .map(
                                (
                                    transaction
                                ) => `
                                <div class="search-result">
                                    <strong>
                                        ${escapeHTML(
                                            transaction.description
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            transaction.category
                                        )}
                                        ·
                                        ${displayCurrency(
                                            transaction.amount
                                        )}
                                    </span>
                                </div>
                            `
                            )
                            .join("")}
                    </div>
                `
                    : ""
            }

            ${
                !matchingPages.length &&
                !transactions.length
                    ? `
                    <div class="empty-state">
                        <strong>No results found</strong>
                        <span>
                            Try another search.
                        </span>
                    </div>
                `
                    : ""
            }
        `;
    }

    /* =========================================================
       MOBILE NAVIGATION
       ========================================================= */

    function setupMobileNavigation() {
        const button =
            document.getElementById(
                "mobileMenuButton"
            );

        const overlay =
            document.getElementById(
                "mobileOverlay"
            );

        const sidebar =
            document.querySelector(
                ".sidebar"
            );

        if (!button) return;

        function close() {
            document.body.classList.remove(
                "mobile-menu-open"
            );

            overlay?.classList.remove(
                "open",
                "active"
            );

            if (overlay) {
                overlay.style.display =
                    "none";
            }

            sidebar?.classList.remove(
                "open",
                "active"
            );
        }

        function open() {
            document.body.classList.add(
                "mobile-menu-open"
            );

            overlay?.classList.add(
                "open",
                "active"
            );

            if (overlay) {
                overlay.style.display =
                    "block";
            }

            sidebar?.classList.add(
                "open",
                "active"
            );
        }

        button.addEventListener(
            "click",
            () => {
                if (
                    document.body.classList.contains(
                        "mobile-menu-open"
                    )
                ) {
                    close();
                } else {
                    open();
                }
            }
        );

        overlay?.addEventListener(
            "click",
            close
        );

        document
            .querySelectorAll(
                ".sidebar a"
            )
            .forEach((link) => {
                link.addEventListener(
                    "click",
                    close
                );
            });

        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "Escape"
                ) {
                    close();
                }
            }
        );
    }

    /* =========================================================
       PERIOD BUTTONS
       ========================================================= */

    function setupPeriodButtons() {
        const buttons =
            document.querySelectorAll(
                "[data-period]"
            );

        buttons.forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    buttons.forEach(
                        (item) =>
                            item.classList.remove(
                                "active"
                            )
                    );

                    button.classList.add(
                        "active"
                    );

                    window.moneyLeakAnalyticsPeriod =
                        button.dataset.period;

                    if (
                        typeof window.moneyLeakPageUpdate ===
                        "function"
                    ) {
                        window.moneyLeakPageUpdate();
                    }
                }
            );
        });
    }

    /* =========================================================
       ACTIVE NAV
       ========================================================= */

    function setupActiveNavigation() {
        const current =
            location.pathname
                .split("/")
                .pop() ||
            "index.html";

        document
            .querySelectorAll(
                ".sidebar a, .nav-link"
            )
            .forEach((link) => {
                const href =
                    link.getAttribute(
                        "href"
                    );

                if (!href) return;

                const clean =
                    href
                        .split("?")[0]
                        .split("#")[0];

                if (
                    clean === current ||
                    (
                        current === "" &&
                        clean ===
                            "index.html"
                    )
                ) {
                    link.classList.add(
                        "active"
                    );
                } else {
                    link.classList.remove(
                        "active"
                    );
                }
            });
    }

    /* =========================================================
       QUICK ACTIONS
       ========================================================= */

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
                            button.dataset.action;

                        if (
                            action ===
                            "income"
                        ) {
                            location.href =
                                "income.html";
                        }

                        if (
                            action ===
                            "expense"
                        ) {
                            location.href =
                                "expenses.html";
                        }

                        if (
                            action ===
                            "goal"
                        ) {
                            location.href =
                                "savings.html";
                        }

                        if (
                            action ===
                            "budget"
                        ) {
                            location.href =
                                "budgets.html";
                        }
                    }
                );
            });
    }

    /* =========================================================
       GLOBAL PAGE REFRESH
       ========================================================= */

    function refreshEverything() {
        applySettings();

        updateDashboard();

        if (
            typeof window.moneyLeakPageUpdate ===
            "function"
        ) {
            try {
                window.moneyLeakPageUpdate();
            } catch (error) {
                console.warn(
                    "MoneyLeak page update error:",
                    error
                );
            }
        }
    }

    /* =========================================================
       DATA EXPORT / IMPORT
       ========================================================= */

    function exportData() {
        const data = {
            version: 2,
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
            URL.createObjectURL(blob);

        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            `moneyleak-backup-${todayString()}.json`;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(url);
    }

    function importData(data) {
        if (
            !data ||
            typeof data !== "object"
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
            saveTransactions(
                data.transactions
            );
        }

        if (
            Array.isArray(
                data.savingsGoals
            )
        ) {
            saveSavingsGoals(
                data.savingsGoals
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
            data.categoryBudgets
        ) {
            writeStorage(
                STORAGE.categoryBudgets,
                data.categoryBudgets
            );
        }

        if (
            Array.isArray(
                data.recurring
            )
        ) {
            saveRecurringTransactions(
                data.recurring
            );
        }

        if (
            data.settings
        ) {
            saveSettings(
                data.settings
            );
        }

        refreshEverything();
    }

    /* =========================================================
       RESET DATA
       ========================================================= */

    function resetAllData() {
        Object.values(
            STORAGE
        ).forEach((key) => {
            try {
                localStorage.removeItem(
                    key
                );
            } catch (error) {}
        });

        location.reload();
    }

    /* =========================================================
       EXPOSE PUBLIC API
       ========================================================= */

    window.MoneyLeak = {
        STORAGE,

        categories:
            CATEGORIES,

        getTransactions,
        saveTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,

        calculateTotals,
        getPeriodTransactions,

        formatCurrency,
        formatCompactCurrency,
        displayCurrency,
        currencySymbol,

        formatDate,
        formatShortDate,

        getSettings,
        saveSettings,
        applySettings,

        getSavingsGoals,
        saveSavingsGoals,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        goalProgress,

        getMonthlyBudget,
        setMonthlyBudget,
        getCurrentMonthExpenses,

        getCategoryBudgets,
        setCategoryBudget,
        deleteCategoryBudget,
        getCategorySpending,

        getRecurringTransactions,
        saveRecurringTransactions,
        addRecurringTransaction,
        deleteRecurringTransaction,
        monthlyRecurringAmount,

        calculateFinancialHealth,
        generateAlerts,

        exportData,
        importData,
        resetAllData,

        refresh: refreshEverything
    };

    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function initialize() {
        if (
            window.__moneyLeakInitialized
        ) {
            return;
        }

        window.__moneyLeakInitialized =
            true;

        applySettings();

        setupSearch();
        setupNotifications();
        setupMobileNavigation();
        setupPeriodButtons();
        setupActiveNavigation();
        setupQuickActions();

        updateDashboard();

        /*
         * Give individual pages a chance
         * to render after the central API
         * has been initialized.
         */
        setTimeout(() => {
            if (
                typeof window.moneyLeakPageUpdate ===
                "function"
            ) {
                try {
                    window.moneyLeakPageUpdate();
                } catch (error) {
                    console.warn(
                        "MoneyLeak page initialization error:",
                        error
                    );
                }
            }
        }, 0);
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );
    } else {
        initialize();
    }

    window.addEventListener(
        "resize",
        () => {
            renderCashFlowChart();
        }
    );

    window.addEventListener(
        "storage",
        () => {
            refreshEverything();
        }
    );

})();
