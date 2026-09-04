(() => {
    "use strict";

    /* =========================================================
       MONEYLEAK — PERSONAL FINANCE OS
       CENTRAL APPLICATION ENGINE
       ========================================================= */

    const ML = {};
    const STORAGE = {
        transactions: "moneyLeakTransactions",
        savingsGoals: "moneyLeakSavingsGoals",
        oldSavingsGoal: "moneyLeakSavingsGoal",
        monthlyBudget: "moneyLeakMonthlyBudget",
        categoryBudgets: "moneyLeakCategoryBudgets",
        recurring: "moneyLeakRecurringTransactions",
        settings: "moneyLeakSettings",
        alerts: "moneyLeakAlerts"
    };

    const DEFAULT_SETTINGS = {
        name: "My Money",
        currency: "NGN",
        currencySymbol: "₦",
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
       STORAGE
       ========================================================= */

    function read(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return fallback;
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }

    function remove(key) {
        try {
            localStorage.removeItem(key);
        } catch {}
    }

    function id(prefix = "ml") {
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).slice(2, 9)
        );
    }

    function num(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function today() {
        const d = new Date();

        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0")
        ].join("-");
    }

    function date(value) {
        const d = new Date(value);

        return Number.isNaN(d.getTime())
            ? new Date()
            : d;
    }

    function escape(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* =========================================================
       SETTINGS
       ========================================================= */

    function getSettings() {
        return {
            ...DEFAULT_SETTINGS,
            ...(read(STORAGE.settings, {}) || {})
        };
    }

    function saveSettings(values = {}) {
        const settings = {
            ...getSettings(),
            ...values
        };

        write(STORAGE.settings, settings);
        applyTheme();

        return settings;
    }

    function applyTheme() {
        const settings = getSettings();

        document.documentElement.dataset.theme =
            settings.theme === "dark"
                ? "dark"
                : "light";

        if (document.body) {
            document.body.classList.toggle(
                "dark-mode",
                settings.theme === "dark"
            );
        }

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

    function getCurrencySymbol() {
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
            GHS: "GH₵",
            KES: "KSh",
            ZAR: "R"
        };

        return (
            symbols[settings.currency] ||
            settings.currency ||
            "₦"
        );
    }

    function formatCurrency(value) {
        const amount = num(value);
        const settings = getSettings();

        try {
            return new Intl.NumberFormat(
                undefined,
                {
                    style: "currency",
                    currency:
                        settings.currency || "NGN",
                    maximumFractionDigits: 0
                }
            ).format(amount);
        } catch {
            return (
                getCurrencySymbol() +
                Math.round(amount).toLocaleString()
            );
        }
    }

    function formatCompactCurrency(value) {
        const amount = num(value);
        const symbol = getCurrencySymbol();

        if (Math.abs(amount) >= 1000000000) {
            return (
                symbol +
                (amount / 1000000000).toFixed(1) +
                "B"
            );
        }

        if (Math.abs(amount) >= 1000000) {
            return (
                symbol +
                (amount / 1000000).toFixed(1) +
                "M"
            );
        }

        if (Math.abs(amount) >= 1000) {
            return (
                symbol +
                (amount / 1000).toFixed(1) +
                "K"
            );
        }

        return (
            symbol +
            Math.round(amount).toLocaleString()
        );
    }

    function money(value) {
        return getSettings().compactNumbers
            ? formatCompactCurrency(value)
            : formatCurrency(value);
    }

    /* =========================================================
       DATE HELPERS
       ========================================================= */

    function formatDate(value) {
        return date(value).toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
    }

    function formatShortDate(value) {
        return date(value).toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short"
            }
        );
    }

    function daysFromToday(value) {
        const start = new Date(today());
        const end = date(value);

        return Math.ceil(
            (end - start) /
                (1000 * 60 * 60 * 24)
        );
    }

    /* =========================================================
       TRANSACTIONS
       ========================================================= */

    function normalizeTransaction(item = {}) {
        let type =
            String(
                item.type ||
                item.transactionType ||
                "expense"
            ).toLowerCase();

        type =
            type === "income"
                ? "income"
                : "expense";

        return {
            id:
                item.id ||
                id("transaction"),

            amount: Math.abs(
                num(
                    item.amount ??
                    item.value
                )
            ),

            type,

            category:
                item.category ||
                (type === "income"
                    ? "Income"
                    : "Other"),

            description:
                item.description ||
                item.name ||
                item.title ||
                item.source ||
                "Transaction",

            source:
                item.source || "",

            date:
                item.date ||
                item.createdAt ||
                today(),

            note:
                item.note ||
                item.notes ||
                "",

            account:
                item.account ||
                "Cash",

            createdAt:
                item.createdAt ||
                new Date().toISOString()
        };
    }

    function getTransactions() {
        const data =
            read(
                STORAGE.transactions,
                []
            );

        if (!Array.isArray(data)) {
            return [];
        }

        return data
            .map(normalizeTransaction)
            .sort(
                (a, b) =>
                    date(b.date) -
                    date(a.date)
            );
    }

    function saveTransactions(items) {
        return write(
            STORAGE.transactions,
            items.map(normalizeTransaction)
        );
    }

    function addTransaction(item) {
        const transactions =
            getTransactions();

        const transaction =
            normalizeTransaction(item);

        transactions.unshift(transaction);

        saveTransactions(transactions);
        refresh();

        return transaction;
    }

    function updateTransaction(
        transactionId,
        changes = {}
    ) {
        const transactions =
            getTransactions();

        const index =
            transactions.findIndex(
                (item) =>
                    String(item.id) ===
                    String(transactionId)
            );

        if (index < 0) {
            return null;
        }

        transactions[index] =
            normalizeTransaction({
                ...transactions[index],
                ...changes,
                id:
                    transactions[index].id
            });

        saveTransactions(transactions);
        refresh();

        return transactions[index];
    }

    function deleteTransaction(
        transactionId
    ) {
        const transactions =
            getTransactions();

        const remaining =
            transactions.filter(
                (item) =>
                    String(item.id) !==
                    String(transactionId)
            );

        saveTransactions(remaining);
        refresh();

        return true;
    }

    /* =========================================================
       FINANCIAL TOTALS
       ========================================================= */

    function calculateTotals(
        transactions = getTransactions()
    ) {
        let income = 0;
        let expenses = 0;

        transactions.forEach((item) => {
            if (item.type === "income") {
                income += num(item.amount);
            }

            if (item.type === "expense") {
                expenses += num(item.amount);
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

        const year = now.getFullYear();
        const month = now.getMonth();

        return transactions.filter((item) => {
            const d = date(item.date);

            if (period === "all") {
                return true;
            }

            if (period === "year") {
                return (
                    d.getFullYear() ===
                    year
                );
            }

            if (period === "6months") {
                return (
                    d >=
                    new Date(
                        year,
                        month - 5,
                        1
                    )
                );
            }

            if (period === "3months") {
                return (
                    d >=
                    new Date(
                        year,
                        month - 2,
                        1
                    )
                );
            }

            return (
                d.getFullYear() === year &&
                d.getMonth() === month
            );
        });
    }

    /* =========================================================
       SAVINGS GOALS
       ========================================================= */

    function getSavingsGoals() {
        let goals =
            read(
                STORAGE.savingsGoals,
                []
            );

        if (!Array.isArray(goals)) {
            goals = [];
        }

        /* Migrate old MoneyLeak goal */
        if (goals.length === 0) {
            const oldGoal =
                read(
                    STORAGE.oldSavingsGoal,
                    null
                );

            if (
                oldGoal &&
                typeof oldGoal === "object"
            ) {
                goals.push({
                    id:
                        oldGoal.id ||
                        id("goal"),

                    name:
                        oldGoal.name ||
                        oldGoal.title ||
                        "Savings Goal",

                    target:
                        num(
                            oldGoal.target ||
                            oldGoal.goal ||
                            oldGoal.amount
                        ),

                    current:
                        num(
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

                write(
                    STORAGE.savingsGoals,
                    goals
                );
            }
        }

        return goals;
    }

    function saveSavingsGoals(goals) {
        return write(
            STORAGE.savingsGoals,
            goals
        );
    }

    function addSavingsGoal(goal = {}) {
        const goals =
            getSavingsGoals();

        const newGoal = {
            id: id("goal"),

            name:
                goal.name ||
                "New Goal",

            target:
                Math.max(
                    0,
                    num(goal.target)
                ),

            current:
                Math.max(
                    0,
                    num(goal.current)
                ),

            deadline:
                goal.deadline || "",

            createdAt:
                new Date().toISOString()
        };

        goals.push(newGoal);

        saveSavingsGoals(goals);
        refresh();

        return newGoal;
    }

    function updateSavingsGoal(
        goalId,
        changes = {}
    ) {
        const goals =
            getSavingsGoals();

        const index =
            goals.findIndex(
                (goal) =>
                    String(goal.id) ===
                    String(goalId)
            );

        if (index < 0) {
            return null;
        }

        goals[index] = {
            ...goals[index],
            ...changes,
            target:
                changes.target !== undefined
                    ? num(changes.target)
                    : num(
                          goals[index]
                              .target
                      ),
            current:
                changes.current !== undefined
                    ? num(changes.current)
                    : num(
                          goals[index]
                              .current
                      )
        };

        saveSavingsGoals(goals);
        refresh();

        return goals[index];
    }

    function deleteSavingsGoal(goalId) {
        const goals =
            getSavingsGoals().filter(
                (goal) =>
                    String(goal.id) !==
                    String(goalId)
            );

        saveSavingsGoals(goals);
        refresh();

        return true;
    }

    function goalProgress(goal) {
        if (
            !goal ||
            num(goal.target) <= 0
        ) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(
                0,
                (num(goal.current) /
                    num(goal.target)) *
                    100
            )
        );
    }

    /* =========================================================
       BUDGETS
       ========================================================= */

    function getMonthlyBudget() {
        const value =
            read(
                STORAGE.monthlyBudget,
                0
            );

        if (
            typeof value === "object" &&
            value !== null
        ) {
            return num(
                value.amount ||
                value.limit
            );
        }

        return num(value);
    }

    function setMonthlyBudget(amount) {
        const value =
            Math.max(
                0,
                num(amount)
            );

        write(
            STORAGE.monthlyBudget,
            value
        );

        refresh();

        return value;
    }

    function getCurrentMonthExpenses() {
        return calculateTotals(
            getPeriodTransactions(
                "month"
            )
        ).expenses;
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

        budgets[category] =
            Math.max(
                0,
                num(amount)
            );

        write(
            STORAGE.categoryBudgets,
            budgets
        );

        refresh();

        return budgets;
    }

    function deleteCategoryBudget(
        category
    ) {
        const budgets =
            getCategoryBudgets();

        delete budgets[category];

        write(
            STORAGE.categoryBudgets,
            budgets
        );

        refresh();
    }

    function getCategorySpending(
        category,
        transactions =
            getPeriodTransactions("month")
    ) {
        return transactions
            .filter(
                (item) =>
                    item.type === "expense" &&
                    String(
                        item.category
                    ).toLowerCase() ===
                        String(
                            category
                        ).toLowerCase()
            )
            .reduce(
                (sum, item) =>
                    sum +
                    num(item.amount),
                0
            );
    }

    /* =========================================================
       RECURRING MONEY
       ========================================================= */

    function getRecurringTransactions() {
        const data =
            read(
                STORAGE.recurring,
                []
            );

        return Array.isArray(data)
            ? data
            : [];
    }

    function saveRecurringTransactions(
        items
    ) {
        return write(
            STORAGE.recurring,
            items
        );
    }

    function addRecurringTransaction(
        item = {}
    ) {
        const recurring =
            getRecurringTransactions();

        const newItem = {
            id: id("recurring"),

            type:
                item.type === "income"
                    ? "income"
                    : "expense",

            amount:
                Math.abs(
                    num(item.amount)
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
                today(),

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

        refresh();

        return newItem;
    }

    function deleteRecurringTransaction(
        itemId
    ) {
        const recurring =
            getRecurringTransactions()
                .filter(
                    (item) =>
                        String(item.id) !==
                        String(itemId)
                );

        saveRecurringTransactions(
            recurring
        );

        refresh();
    }

    function monthlyRecurringAmount(
        item
    ) {
        const amount =
            num(item.amount);

        switch (
            String(
                item.frequency ||
                    "monthly"
            ).toLowerCase()
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
        const monthly =
            calculateTotals(
                getPeriodTransactions(
                    "month"
                )
            );

        const income =
            monthly.income;

        const expenses =
            monthly.expenses;

        /* 35 points — spending control */
        let incomeFactor = 0;

        if (income > 0) {
            const ratio =
                expenses / income;

            if (ratio <= 0.5)
                incomeFactor = 35;
            else if (ratio <= 0.7)
                incomeFactor = 30;
            else if (ratio <= 0.85)
                incomeFactor = 24;
            else if (ratio <= 1)
                incomeFactor = 15;
            else
                incomeFactor = 5;
        }

        /* 25 points — budget */
        let budgetFactor = 12;

        const budget =
            getMonthlyBudget();

        if (budget > 0) {
            const usage =
                expenses / budget;

            if (usage <= 0.6)
                budgetFactor = 25;
            else if (usage <= 0.8)
                budgetFactor = 21;
            else if (usage <= 1)
                budgetFactor = 15;
            else
                budgetFactor = 5;
        }

        /* 25 points — savings */
        const savingsRate =
            income > 0
                ? ((income - expenses) /
                      income) *
                  100
                : 0;

        let savingsFactor = 3;

        if (savingsRate >= 30)
            savingsFactor = 25;
        else if (savingsRate >= 20)
            savingsFactor = 22;
        else if (savingsRate >= 10)
            savingsFactor = 16;
        else if (savingsRate > 0)
            savingsFactor = 10;

        /* 15 points — recurring */
        let recurringFactor = 15;

        const recurring =
            getRecurringTransactions();

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
                        monthlyRecurringAmount(
                            item
                        ),
                    0
                );

        if (income > 0) {
            const ratio =
                recurringExpenses /
                income;

            if (ratio > 0.5)
                recurringFactor = 4;
            else if (ratio > 0.3)
                recurringFactor = 8;
            else if (ratio > 0.2)
                recurringFactor = 12;
        }

        const score = Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    incomeFactor +
                        budgetFactor +
                        savingsFactor +
                        recurringFactor
                )
            )
        );

        let status = "Needs attention";
        let message =
            "Your financial picture needs some attention.";

        if (score >= 85) {
            status = "Excellent";
            message =
                "Excellent work. Your financial habits are strong.";
        } else if (score >= 70) {
            status = "Healthy";
            message =
                "You're on a healthy financial path. Keep building consistency.";
        } else if (score >= 50) {
            status = "Fair";
            message =
                "You're making progress, but there are areas you can improve.";
        }

        return {
            score,
            status,
            message,
            savingsRate,
            incomeFactor,
            budgetFactor,
            savingsFactor,
            recurringFactor
        };
    }

    /* =========================================================
       SMART ALERTS
       ========================================================= */

    function generateAlerts() {
        const alerts = [];

        const transactions =
            getTransactions();

        const monthly =
            calculateTotals(
                getPeriodTransactions(
                    "month"
                )
            );

        const budget =
            getMonthlyBudget();

        if (!transactions.length) {
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
                title:
                    "Spending is above income",
                message:
                    "Your expenses are higher than your income this month."
            });
        }

        if (
            budget > 0 &&
            monthly.expenses > budget
        ) {
            alerts.push({
                type: "danger",
                title: "Budget exceeded",
                message:
                    `You're ${money(
                        monthly.expenses -
                            budget
                    )} over your monthly budget.`
            });
        } else if (
            budget > 0 &&
            monthly.expenses /
                budget >=
                0.8
        ) {
            alerts.push({
                type: "warning",
                title:
                    "Budget almost reached",
                message:
                    "You've used more than 80% of your monthly budget."
            });
        }

        const savingsRate =
            monthly.income > 0
                ? ((monthly.income -
                    monthly.expenses) /
                    monthly.income) *
                  100
                : 0;

        if (savingsRate >= 20) {
            alerts.push({
                type: "success",
                title:
                    "Healthy savings rate",
                message:
                    `You're saving approximately ${Math.round(
                        savingsRate
                    )}% of recorded income.`
            });
        }

        if (
            monthly.income > 0 &&
            savingsRate <= 0
        ) {
            alerts.push({
                type: "warning",
                title:
                    "Cash flow needs attention",
                message:
                    "Your expenses are currently consuming all or more than your recorded income."
            });
        }

        const categoryBudgets =
            getCategoryBudgets();

        const monthTransactions =
            getPeriodTransactions(
                "month"
            );

        Object.keys(
            categoryBudgets
        ).forEach((category) => {
            const limit =
                num(
                    categoryBudgets[
                        category
                    ]
                );

            const spent =
                getCategorySpending(
                    category,
                    monthTransactions
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
                        `${category} is ${money(
                            spent - limit
                        )} over its budget.`
                });
            }
        });

        const recurring =
            getRecurringTransactions();

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
                title:
                    "Recurring costs are high",
                message:
                    "Recurring commitments are using a large part of your income."
            });
        }

        const health =
            calculateFinancialHealth();

        if (health.score >= 85) {
            alerts.push({
                type: "success",
                title:
                    "Financial health is excellent",
                message:
                    "Your current money habits are looking strong."
            });
        }

        return alerts.slice(0, 10);
    }

    /* =========================================================
       DOM HELPERS
       ========================================================= */

    function text(idValue, value) {
        const element =
            document.getElementById(
                idValue
            );

        if (element) {
            element.textContent =
                value;
        }
    }

    function width(
        idValue,
        percentage
    ) {
        const element =
            document.getElementById(
                idValue
            );

        if (!element) return;

        element.style.width =
            Math.max(
                0,
                Math.min(
                    100,
                    percentage
                )
            ) + "%";
    }

    /* =========================================================
       DASHBOARD
       ========================================================= */

    function renderDashboard() {
        const all =
            calculateTotals();

        const monthly =
            calculateTotals(
                getPeriodTransactions(
                    "month"
                )
            );

        const goals =
            getSavingsGoals();

        const target =
            goals.reduce(
                (sum, goal) =>
                    sum +
                    num(goal.target),
                0
            );

        const saved =
            goals.reduce(
                (sum, goal) =>
                    sum +
                    num(goal.current),
                0
            );

        const goalProgress =
            target > 0
                ? (saved / target) * 100
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

        text(
            "overviewBalance",
            money(all.balance)
        );

        text(
            "overviewIncome",
            money(monthly.income)
        );

        text(
            "overviewExpenses",
            money(monthly.expenses)
        );

        text(
            "overviewSavingsRate",
            `${Math.max(
                0,
                Math.round(savingsRate)
            )}%`
        );

        text(
            "overviewGoalProgress",
            `${Math.round(
                goalProgress
            )}%`
        );

        width(
            "overviewGoalFill",
            goalProgress
        );

        text(
            "overviewGoalStatus",
            goals.length
                ? `${goals.length} active goal${
                      goals.length === 1
                          ? ""
                          : "s"
                  }`
                : "No goals yet"
        );

        text(
            "overviewHealthScore",
            health.score
        );

        text(
            "overviewHealthStatus",
            health.status
        );

        text(
            "periodIncome",
            money(monthly.income)
        );

        text(
            "periodExpenses",
            money(monthly.expenses)
        );

        text(
            "periodCashFlow",
            money(monthly.cashFlow)
        );

        text(
            "cashFlowHealth",
            monthly.cashFlow >= 0
                ? "Positive cash flow"
                : "Negative cash flow"
        );

        text(
            "healthScore",
            health.score
        );

        width(
            "healthFill",
            health.score
        );

        text(
            "healthMessage",
            health.message
        );

        text(
            "healthExplanation",
            "Your score combines spending control, budget management, savings behavior and recurring commitments."
        );

        text(
            "healthIncomeFactor",
            `${health.incomeFactor}/35`
        );

        text(
            "healthBudgetFactor",
            `${health.budgetFactor}/25`
        );

        text(
            "healthSavingsFactor",
            `${health.savingsFactor}/25`
        );

        text(
            "healthRecurringFactor",
            `${health.recurringFactor}/15`
        );

        width(
            "healthIncomeBar",
            (health.incomeFactor /
                35) *
                100
        );

        width(
            "healthBudgetBar",
            (health.budgetFactor /
                25) *
                100
        );

        width(
            "healthSavingsBar",
            (health.savingsFactor /
                25) *
                100
        );

        width(
            "healthRecurringBar",
            (health.recurringFactor /
                15) *
                100
        );

        const budget =
            getMonthlyBudget();

        const budgetPercent =
            budget > 0
                ? (monthly.expenses /
                      budget) *
                  100
                : 0;

        text(
            "dashboardBudgetPercent",
            `${Math.round(
                budgetPercent
            )}%`
        );

        width(
            "dashboardBudgetFill",
            budgetPercent
        );

        text(
            "dashboardBudgetSpent",
            money(monthly.expenses)
        );

        text(
            "dashboardBudgetLimit",
            money(budget)
        );

        text(
            "dashboardBudgetRemaining",
            money(
                Math.max(
                    0,
                    budget -
                        monthly.expenses
                )
            )
        );

        text(
            "dashboardBudgetMessage",
            !budget
                ? "Set a monthly budget to start tracking your spending."
                : budgetPercent > 100
                ? "You've exceeded your monthly budget."
                : budgetPercent >= 80
                ? "You're approaching your budget limit."
                : "You're within your monthly budget."
        );

        renderRecent();
        renderTopCategories();
        renderGoals();
        renderAlerts();
        renderInsight();
        renderCashFlow();
    }

    function renderRecent() {
        const container =
            document.getElementById(
                "recentTransactions"
            );

        if (!container) return;

        const items =
            getTransactions().slice(
                0,
                6
            );

        if (!items.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>No transactions yet</strong>
                    <span>Add income or expenses to see them here.</span>
                </div>
            `;
            return;
        }

        container.innerHTML =
            items
                .map(
                    (item) => `
                <div class="transaction-row">
                    <div class="transaction-icon ${item.type}">
                        ${
                            item.type ===
                            "income"
                                ? "↗"
                                : "↘"
                        }
                    </div>

                    <div class="transaction-main">
                        <strong>
                            ${escape(
                                item.description
                            )}
                        </strong>

                        <span>
                            ${escape(
                                item.category
                            )}
                            ·
                            ${formatShortDate(
                                item.date
                            )}
                        </span>
                    </div>

                    <strong class="transaction-amount ${item.type}">
                        ${
                            item.type ===
                            "income"
                                ? "+"
                                : "-"
                        }${money(
                            item.amount
                        )}
                    </strong>
                </div>
            `
                )
                .join("");
    }

    function renderTopCategories() {
        const container =
            document.getElementById(
                "topSpendingCategories"
            );

        if (!container) return;

        const map = {};

        getPeriodTransactions(
            "month"
        )
            .filter(
                (item) =>
                    item.type ===
                    "expense"
            )
            .forEach((item) => {
                const category =
                    item.category ||
                    "Other";

                map[category] =
                    (map[category] || 0) +
                    num(item.amount);
            });

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
                    <span>Your top spending categories will appear here.</span>
                </div>
            `;
            return;
        }

        const highest =
            entries[0][1];

        container.innerHTML =
            entries
                .map(
                    ([category, amount]) => `
                <div class="category-row">
                    <div class="category-row-top">
                        <strong>
                            ${escape(
                                category
                            )}
                        </strong>

                        <span>
                            ${money(
                                amount
                            )}
                        </span>
                    </div>

                    <div class="mini-bar">
                        <span style="width:${(
                            (amount /
                                highest) *
                            100
                        ).toFixed(1)}%"></span>
                    </div>
                </div>
            `
                )
                .join("");
    }

    function renderGoals() {
        const container =
            document.getElementById(
                "dashboardGoals"
            );

        if (!container) return;

        const goals =
            getSavingsGoals().slice(
                0,
                3
            );

        if (!goals.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>No savings goals yet</strong>
                    <span>Create a goal and start building toward it.</span>
                </div>
            `;
            return;
        }

        container.innerHTML =
            goals
                .map((goal) => {
                    const progress =
                        goalProgress(
                            goal
                        );

                    return `
                        <div class="goal-row">
                            <div class="goal-row-top">
                                <strong>
                                    ${escape(
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
                                ${money(
                                    goal.current
                                )}
                                of
                                ${money(
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
                <div class="alert-card ${escape(
                    alert.type
                )}">
                    <div class="alert-dot"></div>

                    <div>
                        <strong>
                            ${escape(
                                alert.title
                            )}
                        </strong>

                        <p>
                            ${escape(
                                alert.message
                            )}
                        </p>
                    </div>
                </div>
            `
                )
                .join("");
    }

    function renderInsight() {
        const element =
            document.getElementById(
                "overviewInsightText"
            );

        if (!element) return;

        const monthly =
            calculateTotals(
                getPeriodTransactions(
                    "month"
                )
            );

        if (
            monthly.income === 0 &&
            monthly.expenses === 0
        ) {
            element.textContent =
                "Add your income and expenses to unlock personalized financial intelligence.";
            return;
        }

        if (
            monthly.expenses >
            monthly.income
        ) {
            element.textContent =
                "Your spending is currently above your recorded income. Review your biggest spending category first.";
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
                `Excellent. You're currently keeping about ${Math.round(
                    rate
                )}% of your recorded income.`;
        } else {
            element.textContent =
                "Your cash flow is positive. Try increasing your savings rate by reducing one flexible expense.";
        }
    }

    /* =========================================================
       CASH FLOW CHART
       ========================================================= */

    function renderCashFlow() {
        const canvas =
            document.getElementById(
                "cashFlowChart"
            );

        if (!canvas) return;

        const ctx =
            canvas.getContext(
                "2d"
            );

        if (!ctx) return;

        const width =
            canvas.clientWidth ||
            600;

        const height =
            canvas.clientHeight ||
            260;

        const ratio =
            window.devicePixelRatio ||
            1;

        canvas.width =
            width * ratio;

        canvas.height =
            height * ratio;

        ctx.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
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

        const months = [];

        for (
            let i = 5;
            i >= 0;
            i--
        ) {
            const month =
                new Date(
                    now.getFullYear(),
                    now.getMonth() - i,
                    1
                );

            let income = 0;
            let expense = 0;

            transactions.forEach(
                (item) => {
                    const d =
                        date(
                            item.date
                        );

                    if (
                        d.getFullYear() ===
                            month.getFullYear() &&
                        d.getMonth() ===
                            month.getMonth()
                    ) {
                        if (
                            item.type ===
                            "income"
                        ) {
                            income +=
                                num(
                                    item.amount
                                );
                        } else {
                            expense +=
                                num(
                                    item.amount
                                );
                        }
                    }
                }
            );

            months.push({
                label:
                    month.toLocaleDateString(
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
            months.flatMap(
                (m) => [
                    m.income,
                    m.expense
                ]
            );

        const max =
            Math.max(
                1,
                ...values
            );

        const pad = 32;
        const chartWidth =
            width - pad * 2;
        const chartHeight =
            height - pad * 2;

        ctx.strokeStyle =
            "rgba(100,100,100,.15)";

        ctx.lineWidth = 1;

        for (
            let i = 0;
            i < 4;
            i++
        ) {
            const y =
                pad +
                (chartHeight /
                    3) *
                    i;

            ctx.beginPath();
            ctx.moveTo(
                pad,
                y
            );
            ctx.lineTo(
                width - pad,
                y
            );
            ctx.stroke();
        }

        function line(
            property,
            dashed
        ) {
            ctx.beginPath();

            months.forEach(
                (month, index) => {
                    const x =
                        pad +
                        (chartWidth /
                            Math.max(
                                1,
                                months.length -
                                    1
                            )) *
                            index;

                    const y =
                        height -
                        pad -
                        (month[
                            property
                        ] /
                            max) *
                            chartHeight;

                    if (
                        index === 0
                    ) {
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
                dashed
                    ? "rgba(100,100,100,.5)"
                    : "rgba(20,120,80,.95)";

            ctx.lineWidth = 3;

            ctx.setLineDash(
                dashed
                    ? [6, 5]
                    : []
            );

            ctx.stroke();
            ctx.setLineDash([]);
        }

        line(
            "income",
            false
        );

        line(
            "expense",
            true
        );

        ctx.fillStyle =
            "rgba(100,100,100,.8)";

        ctx.font =
            "12px system-ui";

        months.forEach(
            (month, index) => {
                const x =
                    pad +
                    (chartWidth /
                        Math.max(
                            1,
                            months.length -
                                1
                        )) *
                        index;

                ctx.fillText(
                    month.label,
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
            empty.hidden =
                !values.some(
                    (value) =>
                        value > 0
                );
        }
    }

    /* =========================================================
       NOTIFICATIONS
       ========================================================= */

    function setupNotifications() {
    const button =
        document.getElementById("notificationButton");

    const panel =
        document.getElementById("notificationPanel");

    const close =
        document.getElementById("closeNotifications");

    if (!panel) return;

    const hide = () => {
        panel.hidden = true;
        panel.classList.remove("open", "active");
        panel.style.display = "none";
        panel.setAttribute("aria-hidden", "true");
        document.body.classList.remove(
            "notifications-open"
        );
    };

    const show = () => {
        panel.hidden = false;
        panel.classList.add("open", "active");
        panel.style.display = "block";
        panel.setAttribute("aria-hidden", "false");
        document.body.classList.add(
            "notifications-open"
        );

        renderNotificationList();
    };

    /* Notifications always begin CLOSED */
    hide();

    if (button) {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (
                panel.hidden ||
                panel.style.display === "none"
            ) {
                show();
            } else {
                hide();
            }
        });
    }

    if (close) {
        close.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            hide();
        });
    }

    document.addEventListener("click", (event) => {
        if (
            !panel.hidden &&
            !panel.contains(event.target) &&
            event.target !== button
        ) {
            hide();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            hide();
        }
    });
}

   function renderNotificationList() {
    const container =
        document.getElementById("notificationContent") ||
        document.getElementById("notificationList");

    if (!container) return;

    const alerts = generateAlerts();

    const icons = {
        success: "✓",
        warning: "!",
        danger: "!",
        info: "i"
    };

    const labels = {
        success: "GOOD NEWS",
        warning: "ATTENTION",
        danger: "ACTION NEEDED",
        info: "INSIGHT"
    };

    if (!alerts.length) {
        container.innerHTML = `
            <div class="ml-notification-empty">
                <div class="ml-empty-icon">
                    ✓
                </div>

                <strong>
                    You're all caught up
                </strong>

                <span>
                    No new financial insights right now.
                </span>
            </div>
        `;

        return;
    }

    const notificationCards = alerts
        .map((alert, index) => {
            const type =
                alert.type || "info";

            return `
                <article
                    class="ml-notification-card ${escape(type)}"
                    style="--notification-delay:${index * 70}ms"
                >

                    <div class="ml-notification-icon">
                        <span>
                            ${icons[type] || "i"}
                        </span>
                    </div>

                    <div class="ml-notification-content">

                        <div class="ml-notification-top">

                            <span class="ml-notification-label">
                                ${labels[type] || "INSIGHT"}
                            </span>

                            <span class="ml-notification-time">
                                Now
                            </span>

                        </div>

                        <h4>
                            ${escape(
                                alert.title
                            )}
                        </h4>

                        <p>
                            ${escape(
                                alert.message
                            )}
                        </p>

                    </div>

                    <div class="ml-notification-status"></div>

                </article>
            `;
        })
        .join("");

    container.innerHTML = `
        <div class="ml-notification-wrapper">

            <div class="ml-notification-summary">
                <div>
                    <span class="ml-summary-dot"></span>

                    <span>
                        ${alerts.length}
                        ${alerts.length === 1
                            ? "insight"
                            : "insights"}
                        available
                    </span>
                </div>

                <span>
                    Updated just now
                </span>
            </div>

            <div class="ml-notification-cards">
                ${notificationCards}
            </div>

            <div class="ml-notification-footer">

                <div class="ml-footer-icon">
                    ✦
                </div>

                <div>
                    <strong>
                        MoneyLeak Intelligence
                    </strong>

                    <span>
                        Your financial activity is being analyzed automatically.
                    </span>
                </div>

            </div>

        </div>
    `;
}

    /* =========================================================
       SEARCH
       ========================================================= */

    function setupSearch() {
    const button = document.getElementById("searchButton");
    const overlay = document.getElementById("searchOverlay");
    const close =
        document.getElementById("closeSearch") ||
        document.getElementById("searchClose");
    const input = document.getElementById("globalSearch");

    if (!overlay) {
        return;
    }

    function hide() {
        overlay.hidden = true;
        overlay.classList.remove("open", "active");
        overlay.style.display = "none";
        overlay.setAttribute("aria-hidden", "true");

        if (input) {
            input.value = "";
        }

        document.body.classList.remove("search-open");
    }

    function show() {
        overlay.hidden = false;
        overlay.classList.add("open", "active");
        overlay.style.display = "flex";
        overlay.setAttribute("aria-hidden", "false");

        document.body.classList.add("search-open");

        if (input) {
            renderSearchResults(input.value || "");

            setTimeout(() => {
                input.focus();
                input.select();
            }, 60);
        }
    }

    /* Always start closed */
    hide();

    /* Search button */
    if (button) {
        button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (
                overlay.hidden ||
                overlay.style.display === "none"
            ) {
                show();
            } else {
                hide();
            }
        });
    }

    /* Close button */
    if (close) {
        close.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            hide();
        });
    }

    /* Clicking the dark background closes search */
    overlay.addEventListener("click", function (event) {
        if (event.target === overlay) {
            hide();
        }
    });

    /* Search input */
    if (input) {
        input.addEventListener("input", function (event) {
            renderSearchResults(
                event.target.value || ""
            );
        });

        input.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                event.preventDefault();
                hide();
                return;
            }

            if (event.key === "Enter") {
                const firstResult =
                    document.querySelector(
                        "#searchResults a"
                    );

                if (firstResult) {
                    firstResult.click();
                }
            }
        });
    }

    /* Keyboard shortcut */
    document.addEventListener("keydown", function (event) {
        const activeElement =
            document.activeElement;

        const isTyping =
            activeElement &&
            (
                activeElement.tagName === "INPUT" ||
                activeElement.tagName === "TEXTAREA" ||
                activeElement.isContentEditable
            );

        /* "/" opens MoneyLeak Search */
        if (
            event.key === "/" &&
            !isTyping &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
        ) {
            event.preventDefault();
            show();
            return;
        }

        /* ESC closes it */
        if (event.key === "Escape") {
            hide();
        }
    });
}
    function renderSearchResults(
        query
    ) {
        const container =
            document.getElementById(
                "searchResults"
            );

        if (!container) return;

        const q =
            String(
                query || ""
            )
                .trim()
                .toLowerCase();

        const pages = [
            [
                "Dashboard",
                "index.html",
                "Your financial command center"
            ],
            [
                "Income",
                "income.html",
                "Track money coming in"
            ],
            [
                "Expenses",
                "expenses.html",
                "Track money going out"
            ],
            [
                "Budgets",
                "budgets.html",
                "Control monthly spending"
            ],
            [
                "Savings Goals",
                "savings.html",
                "Build toward financial goals"
            ],
            [
                "Recurring",
                "recurring.html",
                "Manage recurring money"
            ],
            [
                "Analytics",
                "analytics.html",
                "Understand financial patterns"
            ],
            [
                "Settings",
                "settings.html",
                "Customize MoneyLeak"
            ]
        ];

        const pageResults =
            pages.filter(
                ([name, , description]) =>
                    !q ||
                    name
                        .toLowerCase()
                        .includes(q) ||
                    description
                        .toLowerCase()
                        .includes(q)
            );

        const transactionResults =
            getTransactions()
                .filter(
                    (item) =>
                        !q ||
                        item.description
                            .toLowerCase()
                            .includes(q) ||
                        item.category
                            .toLowerCase()
                            .includes(q) ||
                        item.type
                            .toLowerCase()
                            .includes(q)
                )
                .slice(0, 8);

        let html = "";

        if (pageResults.length) {
            html += `
                <div class="search-section">
                    <small>Pages</small>

                    ${pageResults
                        .map(
                            ([
                                name,
                                url,
                                description
                            ]) => `
                            <a
                                class="search-result"
                                href="${url}"
                            >
                                <strong>
                                    ${escape(
                                        name
                                    )}
                                </strong>

                                <span>
                                    ${escape(
                                        description
                                    )}
                                </span>
                            </a>
                        `
                        )
                        .join("")}
                </div>
            `;
        }

        if (
            transactionResults.length
        ) {
            html += `
                <div class="search-section">
                    <small>
                        Transactions
                    </small>

                    ${transactionResults
                        .map(
                            (item) => `
                            <div class="search-result">
                                <strong>
                                    ${escape(
                                        item.description
                                    )}
                                </strong>

                                <span>
                                    ${escape(
                                        item.category
                                    )}
                                    ·
                                    ${money(
                                        item.amount
                                    )}
                                </span>
                            </div>
                        `
                        )
                        .join("")}
                </div>
            `;
        }

        if (!html) {
            html = `
                <div class="empty-state">
                    <strong>No results found</strong>
                    <span>Try another search.</span>
                </div>
            `;
        }

        container.innerHTML =
            html;
    }

    /* =========================================================
       MOBILE MENU
       ========================================================= */

    function setupMobileMenu() {
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
                document.body.classList.contains(
                    "mobile-menu-open"
                )
                    ? close()
                    : open();
            }
        );

        overlay?.addEventListener(
            "click",
            close
        );

        sidebar
            ?.querySelectorAll("a")
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
                    event.key ===
                    "Escape"
                ) {
                    close();
                }
            }
        );
    }

    /* =========================================================
       ACTIVE NAVIGATION
       ========================================================= */

    function setupNavigation() {
        let current =
            location.pathname
                .split("/")
                .pop();

        if (!current) {
            current =
                "index.html";
        }

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

                link.classList.toggle(
                    "active",
                    clean === current
                );
            });
    }

    /* =========================================================
       PERIOD BUTTONS
       ========================================================= */

    function setupPeriodButtons() {
        document
            .querySelectorAll(
                "[data-period]"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        document
                            .querySelectorAll(
                                "[data-period]"
                            )
                            .forEach(
                                (
                                    item
                                ) =>
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

                        renderDashboard();
                    }
                );
            });
    }

    /* =========================================================
       EXPORT / IMPORT
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
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            `moneyleak-backup-${today()}.json`;

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
            saveRecurringTransactions(
                data.recurring
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

        refresh();
    }

    /* =========================================================
       RESET
       ========================================================= */

    function resetAllData() {
        Object.values(
            STORAGE
        ).forEach(remove);

        window.location.reload();
    }

    /* =========================================================
       PAGE REFRESH
       ========================================================= */

    function refresh() {
        applyTheme();

        renderDashboard();

        if (
            typeof window.moneyLeakPageUpdate ===
            "function"
        ) {
            try {
                window.moneyLeakPageUpdate();
            } catch (error) {
                console.warn(
                    "MoneyLeak page update failed:",
                    error
                );
            }
        }
    }

    /* =========================================================
       PUBLIC API
       ========================================================= */

    Object.assign(ML, {
        STORAGE,
        categories: CATEGORIES,

        getTransactions,
        saveTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,

        calculateTotals,
        getPeriodTransactions,

        formatCurrency,
        formatCompactCurrency,
        currencySymbol:
            getCurrencySymbol,
        displayCurrency: money,

        formatDate,
        formatShortDate,

        getSettings,
        saveSettings,
        applySettings: applyTheme,

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

        refresh
    });

    window.MoneyLeak = ML;

    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function initialize() {
        if (
            window.__MONEY_LEAK_STARTED__
        ) {
            return;
        }

        window.__MONEY_LEAK_STARTED__ =
            true;

        /*
         * Critical:
         * overlays are initialized first
         * and forced closed.
         */
        setupSearch();
        setupNotifications();
        setupMobileMenu();

        setupNavigation();
        setupPeriodButtons();

        applyTheme();
        renderDashboard();

        /*
         * Allow individual pages to
         * finish registering their
         * page renderer.
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
                        "MoneyLeak page renderer error:",
                        error
                    );
                }
            }
        }, 50);
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }

    window.addEventListener(
        "resize",
        () => {
            renderCashFlow();
        }
    );

    window.addEventListener(
        "storage",
        () => {
            refresh();
        }
    );

})();
