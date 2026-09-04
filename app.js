/* =========================================================
   MONEYLEAK
   PERSONAL FINANCE OS
   APPLICATION ENGINE
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ====================================================== */

    const STORAGE = {

        transactions:
            "moneyLeakTransactions",

        savingsGoal:
            "moneyLeakSavingsGoal",

        savingsGoals:
            "moneyLeakSavingsGoals",

        monthlyBudget:
            "moneyLeakMonthlyBudget",

        categoryBudgets:
            "moneyLeakCategoryBudgets",

        recurring:
            "moneyLeakRecurringTransactions",

        settings:
            "moneyLeakSettings",

        alerts:
            "moneyLeakAlerts",

        initialized:
            "moneyLeakInitialized"

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


    /* =====================================================
       SAFE STORAGE
    ====================================================== */

    function readStorage(key, fallback) {

        try {

            const value =
                localStorage.getItem(key);

            if (
                value === null ||
                value === undefined
            ) {

                return fallback;

            }

            return JSON.parse(value);

        } catch (error) {

            console.warn(
                "MoneyLeak storage read error:",
                key,
                error
            );

            return fallback;

        }

    }


    function writeStorage(key, value) {

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


    /* =====================================================
       SETTINGS
    ====================================================== */

    function getSettings() {

        const stored =
            readStorage(
                STORAGE.settings,
                {}
            );

        return {
            ...DEFAULT_SETTINGS,
            ...(stored || {})
        };

    }


    let settings =
        getSettings();


    function saveSettings(newSettings) {

        settings = {
            ...settings,
            ...newSettings
        };

        writeStorage(
            STORAGE.settings,
            settings
        );

        applySettings();

    }


    function applySettings() {

        document.documentElement.dataset.theme =
            settings.theme || "light";

        document.body.classList.toggle(
            "dark-mode",
            settings.theme === "dark"
        );

        document.title =
            "MoneyLeak — Personal Finance OS";

    }


    /* =====================================================
       TRANSACTIONS
    ====================================================== */

    function normalizeTransaction(transaction) {

        if (!transaction) {
            return null;
        }

        const amount =
            Number(
                transaction.amount
            ) || 0;

        let type =
            String(
                transaction.type || ""
            ).toLowerCase().trim();

        if (
            type !== "income" &&
            type !== "expense"
        ) {

            return null;

        }

        return {

            id:
                String(
                    transaction.id ||
                    Date.now() +
                    Math.random()
                ),

            amount:
                Math.abs(amount),

            type,

            category:
                transaction.category ||
                "Other",

            description:
                transaction.description ||
                transaction.name ||
                transaction.title ||
                transaction.category ||
                "Transaction",

            date:
                transaction.date ||
                transaction.createdAt ||
                new Date().toISOString(),

            note:
                transaction.note ||
                "",

            account:
                transaction.account ||
                "Cash",

            createdAt:
                transaction.createdAt ||
                new Date().toISOString()

        };

    }


    function loadTransactions() {

        const stored =
            readStorage(
                STORAGE.transactions,
                []
            );

        if (!Array.isArray(stored)) {
            return [];
        }

        return stored
            .map(normalizeTransaction)
            .filter(Boolean);

    }


    let transactions =
        loadTransactions();


    function saveTransactions() {

        writeStorage(
            STORAGE.transactions,
            transactions
        );

    }


    function addTransaction(data) {

        const transaction =
            normalizeTransaction({

                ...data,

                id:
                    Date.now().toString() +
                    Math.random()
                        .toString(36)
                        .substring(2, 8),

                date:
                    data.date ||
                    new Date().toISOString(),

                createdAt:
                    new Date().toISOString()

            });


        if (!transaction) {

            return null;

        }


        transactions.unshift(
            transaction
        );

        saveTransactions();

        refreshEverything();

        return transaction;

    }


    function updateTransaction(
        id,
        changes
    ) {

        const index =
            transactions.findIndex(
                transaction =>
                    String(transaction.id) ===
                    String(id)
            );

        if (index === -1) {
            return false;
        }

        transactions[index] =
            normalizeTransaction({

                ...transactions[index],

                ...changes,

                id:
                    transactions[index].id

            });


        saveTransactions();

        refreshEverything();

        return true;

    }


    function deleteTransaction(id) {

        const before =
            transactions.length;

        transactions =
            transactions.filter(
                transaction =>
                    String(transaction.id) !==
                    String(id)
            );

        if (
            transactions.length !== before
        ) {

            saveTransactions();

            refreshEverything();

            return true;

        }

        return false;

    }


    /* =====================================================
       TOTALS
    ====================================================== */

    function calculateTotals(
        source = transactions
    ) {

        let income = 0;

        let expenses = 0;


        source.forEach(
            transaction => {

                const amount =
                    Number(
                        transaction.amount
                    ) || 0;


                if (
                    transaction.type ===
                    "income"
                ) {

                    income += amount;

                }


                if (
                    transaction.type ===
                    "expense"
                ) {

                    expenses += amount;

                }

            }
        );


        return {

            income,

            expenses,

            balance:
                income - expenses

        };

    }


    /* =====================================================
       CURRENCY
    ====================================================== */

    function getCurrencySymbol() {

        return (
            settings.currencySymbol ||
            "₦"
        );

    }


    function formatCurrency(
        amount
    ) {

        const value =
            Number(amount) || 0;


        try {

            return new Intl.NumberFormat(
                "en-NG",
                {

                    style: "currency",

                    currency:
                        settings.currency ||
                        "NGN",

                    maximumFractionDigits: 0

                }
            ).format(value);

        } catch {

            return (
                getCurrencySymbol() +
                value.toLocaleString()
            );

        }

    }


    function formatCompactCurrency(
        amount
    ) {

        const value =
            Number(amount) || 0;


        if (
            !settings.compactNumbers ||
            Math.abs(value) < 1000000
        ) {

            return formatCurrency(
                value
            );

        }


        const absolute =
            Math.abs(value);

        let formatted;


        if (absolute >= 1000000000) {

            formatted =
                (value / 1000000000)
                    .toFixed(1) +
                "B";

        } else {

            formatted =
                (value / 1000000)
                    .toFixed(1) +
                "M";

        }


        return (
            getCurrencySymbol() +
            formatted
        );

    }


    /* =====================================================
       DATE HELPERS
    ====================================================== */

    function parseDate(date) {

        const result =
            new Date(date);

        if (
            Number.isNaN(
                result.getTime()
            )
        ) {

            return new Date();

        }

        return result;

    }


    function formatDate(
        date
    ) {

        return parseDate(
            date
        ).toLocaleDateString(
            "en-NG",
            {

                day: "numeric",

                month: "short",

                year: "numeric"

            }
        );

    }


    function formatShortDate(
        date
    ) {

        return parseDate(
            date
        ).toLocaleDateString(
            "en-NG",
            {

                day: "numeric",

                month: "short"

            }
        );

    }


    function isSameMonth(
        date,
        reference = new Date()
    ) {

        const a =
            parseDate(date);

        const b =
            parseDate(reference);

        return (
            a.getFullYear() ===
                b.getFullYear() &&
            a.getMonth() ===
                b.getMonth()
        );

    }


    function isSameYear(
        date,
        reference = new Date()
    ) {

        const a =
            parseDate(date);

        const b =
            parseDate(reference);

        return (
            a.getFullYear() ===
                b.getFullYear()
        );

    }


    function daysBetween(
        dateA,
        dateB
    ) {

        const a =
            parseDate(dateA);

        const b =
            parseDate(dateB);

        return Math.ceil(
            Math.abs(
                b.getTime() -
                a.getTime()
            ) /
            86400000
        );

    }


    /* =====================================================
       PERIOD FILTERS
    ====================================================== */

    function getCurrentMonthTransactions() {

        return transactions.filter(
            transaction =>
                isSameMonth(
                    transaction.date
                )
        );

    }


    function getCurrentYearTransactions() {

        return transactions.filter(
            transaction =>
                isSameYear(
                    transaction.date
                )
        );

    }


    function getLast30DaysTransactions() {

        const now =
            new Date();

        const cutoff =
            new Date(
                now.getTime() -
                30 * 86400000
            );

        return transactions.filter(
            transaction =>
                parseDate(
                    transaction.date
                ) >= cutoff
        );

    }


    /* =====================================================
       SAVINGS GOALS
    ====================================================== */

    function loadSavingsGoals() {

        let goals =
            readStorage(
                STORAGE.savingsGoals,
                null
            );


        if (
            Array.isArray(goals)
        ) {

            return goals;

        }


        const oldGoal =
            readStorage(
                STORAGE.savingsGoal,
                null
            );


        if (
            oldGoal &&
            typeof oldGoal === "object"
        ) {

            const migrated = {

                id:
                    Date.now()
                    .toString(),

                name:
                    oldGoal.name ||
                    oldGoal.title ||
                    "Savings Goal",

                target:
                    Number(
                        oldGoal.target ||
                        oldGoal.amount ||
                        0
                    ),

                saved:
                    Number(
                        oldGoal.saved ||
                        oldGoal.current ||
                        oldGoal.progress ||
                        0
                    ),

                deadline:
                    oldGoal.deadline ||
                    oldGoal.date ||
                    "",

                createdAt:
                    oldGoal.createdAt ||
                    new Date().toISOString()

            };


            writeStorage(
                STORAGE.savingsGoals,
                [migrated]
            );


            return [migrated];

        }


        return [];

    }


    let savingsGoals =
        loadSavingsGoals();


    function saveSavingsGoals() {

        writeStorage(
            STORAGE.savingsGoals,
            savingsGoals
        );


        if (
            savingsGoals.length > 0
        ) {

            writeStorage(
                STORAGE.savingsGoal,
                savingsGoals[0]
            );

        }

    }


    function addSavingsGoal(
        data
    ) {

        const goal = {

            id:
                Date.now().toString() +
                Math.random()
                    .toString(36)
                    .substring(2, 7),

            name:
                data.name ||
                "Savings Goal",

            target:
                Math.max(
                    0,
                    Number(data.target) || 0
                ),

            saved:
                Math.max(
                    0,
                    Number(data.saved) || 0
                ),

            deadline:
                data.deadline || "",

            createdAt:
                new Date().toISOString()

        };


        savingsGoals.unshift(
            goal
        );

        saveSavingsGoals();

        refreshEverything();

        return goal;

    }


    function updateSavingsGoal(
        id,
        changes
    ) {

        const goal =
            savingsGoals.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!goal) {
            return false;
        }


        Object.assign(
            goal,
            changes
        );


        goal.target =
            Math.max(
                0,
                Number(goal.target) || 0
            );


        goal.saved =
            Math.max(
                0,
                Number(goal.saved) || 0
            );


        saveSavingsGoals();

        refreshEverything();

        return true;

    }


    function deleteSavingsGoal(
        id
    ) {

        savingsGoals =
            savingsGoals.filter(
                goal =>
                    String(goal.id) !==
                    String(id)
            );

        saveSavingsGoals();

        refreshEverything();

    }


    function getGoalProgress(
        goal
    ) {

        if (
            !goal ||
            Number(goal.target) <= 0
        ) {

            return 0;

        }

        return Math.min(
            100,
            Math.max(
                0,
                (
                    Number(goal.saved) /
                    Number(goal.target)
                ) * 100
            )
        );

    }


    /* =====================================================
       BUDGETS
    ====================================================== */

    function getMonthlyBudget() {

        const value =
            readStorage(
                STORAGE.monthlyBudget,
                0
            );

        if (
            typeof value === "object" &&
            value !== null
        ) {

            return Number(
                value.amount ||
                value.budget ||
                0
            );

        }

        return Number(value) || 0;

    }


    function setMonthlyBudget(
        amount
    ) {

        const value =
            Math.max(
                0,
                Number(amount) || 0
            );

        writeStorage(
            STORAGE.monthlyBudget,
            value
        );

        refreshEverything();

    }


    function getCategoryBudgets() {

        const value =
            readStorage(
                STORAGE.categoryBudgets,
                {}
            );

        return (
            value &&
            typeof value === "object"
                ? value
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
                Number(amount) || 0
            );

        writeStorage(
            STORAGE.categoryBudgets,
            budgets
        );

        refreshEverything();

    }


    function deleteCategoryBudget(
        category
    ) {

        const budgets =
            getCategoryBudgets();

        delete budgets[category];

        writeStorage(
            STORAGE.categoryBudgets,
            budgets
        );

        refreshEverything();

    }


    function getCurrentMonthExpenses() {

        return getCurrentMonthTransactions()
            .filter(
                transaction =>
                    transaction.type ===
                    "expense"
            );

    }


    function getCurrentMonthSpent() {

        return getCurrentMonthExpenses()
            .reduce(
                (
                    total,
                    transaction
                ) =>
                    total +
                    Number(
                        transaction.amount
                    ),

                0
            );

    }


    function getCategorySpent(
        category
    ) {

        return getCurrentMonthExpenses()
            .filter(
                transaction =>
                    transaction.category ===
                    category
            )
            .reduce(
                (
                    total,
                    transaction
                ) =>
                    total +
                    Number(
                        transaction.amount
                    ),

                0
            );

    }


    /* =====================================================
       RECURRING TRANSACTIONS
    ====================================================== */

    function getRecurringTransactions() {

        const value =
            readStorage(
                STORAGE.recurring,
                []
            );

        return Array.isArray(value)
            ? value
            : [];

    }


    function saveRecurringTransactions(
        recurring
    ) {

        writeStorage(
            STORAGE.recurring,
            recurring
        );

    }


    function addRecurringTransaction(
        data
    ) {

        const recurring =
            getRecurringTransactions();


        const item = {

            id:
                Date.now().toString() +
                Math.random()
                    .toString(36)
                    .substring(2, 7),

            name:
                data.name ||
                "Recurring payment",

            amount:
                Math.abs(
                    Number(
                        data.amount
                    ) || 0
                ),

            type:
                data.type === "income"
                    ? "income"
                    : "expense",

            category:
                data.category ||
                "Other",

            frequency:
                data.frequency ||
                "monthly",

            nextDate:
                data.nextDate ||
                new Date().toISOString(),

            active:
                data.active !== false,

            createdAt:
                new Date().toISOString()

        };


        recurring.unshift(
            item
        );

        saveRecurringTransactions(
            recurring
        );

        refreshEverything();

        return item;

    }


    function deleteRecurringTransaction(
        id
    ) {

        const recurring =
            getRecurringTransactions()
                .filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );

        saveRecurringTransactions(
            recurring
        );

        refreshEverything();

    }


    /* =====================================================
       FINANCIAL HEALTH
    ====================================================== */

    function calculateFinancialHealth() {

        const totals =
            calculateTotals();


        if (
            transactions.length === 0
        ) {

            return {

                score: 0,

                incomeFactor: 0,

                budgetFactor: 0,

                savingsFactor: 0,

                recurringFactor: 0,

                message:
                    "Add financial activity",

                explanation:
                    "Add income, expenses, savings goals, and budgets to let MoneyLeak calculate your financial health.",

                insight:
                    "Start by recording your income and everyday expenses."

            };

        }


        /* Income vs spending — 35% */

        let incomeScore = 0;


        if (
            totals.income <= 0
        ) {

            incomeScore = 10;

        } else {

            const ratio =
                totals.expenses /
                totals.income;


            if (ratio <= 0.5) {

                incomeScore = 100;

            } else if (ratio <= 0.7) {

                incomeScore = 85;

            } else if (ratio <= 0.85) {

                incomeScore = 70;

            } else if (ratio <= 1) {

                incomeScore = 55;

            } else if (ratio <= 1.2) {

                incomeScore = 30;

            } else {

                incomeScore = 10;

            }

        }


        /* Budget — 25% */

        const budget =
            getMonthlyBudget();

        const spent =
            getCurrentMonthSpent();

        let budgetScore = 55;


        if (budget > 0) {

            const usage =
                spent / budget;


            if (usage <= 0.5) {

                budgetScore = 100;

            } else if (usage <= 0.7) {

                budgetScore = 90;

            } else if (usage <= 0.85) {

                budgetScore = 75;

            } else if (usage <= 1) {

                budgetScore = 55;

            } else if (usage <= 1.15) {

                budgetScore = 30;

            } else {

                budgetScore = 10;

            }

        }


        /* Savings — 25% */

        const savingsRate =
            totals.income > 0
                ? Math.max(
                    0,
                    (
                        (
                            totals.income -
                            totals.expenses
                        ) /
                        totals.income
                    ) * 100
                )
                : 0;


        let savingsScore;


        if (
            savingsRate >= 30
        ) {

            savingsScore = 100;

        } else if (
            savingsRate >= 20
        ) {

            savingsScore = 85;

        } else if (
            savingsRate >= 10
        ) {

            savingsScore = 70;

        } else if (
            savingsRate > 0
        ) {

            savingsScore = 50;

        } else {

            savingsScore = 15;

        }


        /* Recurring — 15% */

        const recurring =
            getRecurringTransactions()
                .filter(
                    item =>
                        item.active !== false &&
                        item.type === "expense"
                );


        const recurringTotal =
            recurring.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(item.amount || 0),

                0
            );


        let recurringScore = 80;


        if (
            totals.income > 0
        ) {

            const recurringRatio =
                recurringTotal /
                totals.income;


            if (
                recurringRatio <= 0.1
            ) {

                recurringScore = 100;

            } else if (
                recurringRatio <= 0.2
            ) {

                recurringScore = 85;

            } else if (
                recurringRatio <= 0.3
            ) {

                recurringScore = 65;

            } else if (
                recurringRatio <= 0.4
            ) {

                recurringScore = 40;

            } else {

                recurringScore = 20;

            }

        }


        const score = Math.round(

            incomeScore * 0.35 +

            budgetScore * 0.25 +

            savingsScore * 0.25 +

            recurringScore * 0.15

        );


        let message =
            "Needs attention";

        let explanation =
            "There are areas of your finances that MoneyLeak recommends improving.";

        if (score >= 85) {

            message =
                "Excellent financial health";

            explanation =
                "You're showing strong control over spending, savings, and recurring commitments.";

        } else if (score >= 70) {

            message =
                "Good financial health";

            explanation =
                "Your finances are generally healthy, with a few areas that could become stronger.";

        } else if (score >= 50) {

            message =
                "Fair financial health";

            explanation =
                "You have a foundation to build on, but your spending and savings deserve attention.";

        } else {

            message =
                "Needs attention";

            explanation =
                "Your current spending pattern may be putting pressure on your finances.";

        }


        let insight =
            "Keep tracking your money consistently.";


        if (
            totals.income <= 0
        ) {

            insight =
                "Record your income so MoneyLeak can measure how much of your money you're keeping.";

        } else if (
            totals.expenses >
            totals.income
        ) {

            insight =
                "Your expenses are higher than your recorded income. Focus on reducing unnecessary spending first.";

        } else if (
            savingsRate < 10
        ) {

            insight =
                "Your savings rate is below 10%. Even a small automatic saving habit can make a difference.";

        } else if (
            budget <= 0
        ) {

            insight =
                "Set a monthly budget so you have a clear spending limit before money leaves your account.";

        } else if (
            recurringScore < 50
        ) {

            insight =
                "Your recurring commitments are taking a large share of income. Review subscriptions and fixed bills.";

        } else {

            insight =
                "You're building healthy money habits. Keep your spending below your income and protect your savings.";

        }


        return {

            score,

            incomeFactor:
                Math.round(
                    incomeScore
                ),

            budgetFactor:
                Math.round(
                    budgetScore
                ),

            savingsFactor:
                Math.round(
                    savingsScore
                ),

            recurringFactor:
                Math.round(
                    recurringScore
                ),

            message,

            explanation,

            insight

        };

    }


    /* =====================================================
       DASHBOARD OVERVIEW
    ====================================================== */

    function updateDashboardOverview() {

        const totals =
            calculateTotals();


        setText(
            "overviewBalance",
            formatCompactCurrency(
                totals.balance
            )
        );


        setText(
            "overviewIncome",
            formatCompactCurrency(
                totals.income
            )
        );


        setText(
            "overviewExpenses",
            formatCompactCurrency(
                totals.expenses
            )
        );


        const savingsRate =
            totals.income > 0
                ? Math.max(
                    0,
                    (
                        (
                            totals.income -
                            totals.expenses
                        ) /
                        totals.income
                    ) *
                    100
                )
                : 0;


        setText(
            "overviewSavingsRate",
            Math.round(
                savingsRate
            ) + "%"
        );


        setText(
            "overviewSavingsStatus",

            savingsRate >= 20
                ? "Strong savings habit"
                : savingsRate > 0
                    ? "Keep building"
                    : "Start saving"
        );


        setText(
            "overviewBalanceStatus",

            totals.balance > 0
                ? "You're in positive territory"
                : totals.balance < 0
                    ? "Spending is above income"
                    : "Starting balance"
        );


        /* Goal */

        const goal =
            savingsGoals[0];


        if (goal) {

            const progress =
                getGoalProgress(
                    goal
                );


            setText(
                "overviewGoalProgress",
                Math.round(
                    progress
                ) + "%"
            );


            const fill =
                document.getElementById(
                    "overviewGoalFill"
                );


            if (fill) {

                fill.style.width =
                    progress + "%";

            }


            setText(
                "overviewGoalStatus",
                goal.name
            );

        } else {

            setText(
                "overviewGoalProgress",
                "0%"
            );

            const fill =
                document.getElementById(
                    "overviewGoalFill"
                );

            if (fill) {
                fill.style.width = "0%";
            }

            setText(
                "overviewGoalStatus",
                "No goal set"
            );

        }


        /* Health */

        const health =
            calculateFinancialHealth();


        setText(
            "overviewHealthScore",
            health.score + "/100"
        );


        setText(
            "overviewHealthStatus",
            health.message
        );


        setText(
            "overviewInsightText",
            health.insight
        );

    }


    /* =====================================================
       HEALTH UI
    ====================================================== */

    function updateMoneyHealth() {

        const health =
            calculateFinancialHealth();


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
            health.explanation
        );


        setText(
            "healthIncomeFactor",
            health.incomeFactor + "/100"
        );


        setText(
            "healthBudgetFactor",
            health.budgetFactor + "/100"
        );


        setText(
            "healthSavingsFactor",
            health.savingsFactor + "/100"
        );


        setText(
            "healthRecurringFactor",
            health.recurringFactor + "/100"
        );


        updateHealthBar(
            "healthIncomeBar",
            health.incomeFactor
        );


        updateHealthBar(
            "healthBudgetBar",
            health.budgetFactor
        );


        updateHealthBar(
            "healthSavingsBar",
            health.savingsFactor
        );


        updateHealthBar(
            "healthRecurringBar",
            health.recurringFactor
        );


        const ring =
            document.getElementById(
                "healthFill"
            );


        if (ring) {

            const circumference =
                314;

            const offset =
                circumference -
                (
                    health.score /
                    100
                ) *
                circumference;


            ring.style.strokeDashoffset =
                offset;


            if (
                health.score < 40
            ) {

                ring.style.stroke =
                    "#d75b5b";

            } else if (
                health.score < 70
            ) {

                ring.style.stroke =
                    "#d19c31";

            } else {

                ring.style.stroke =
                    "#0b9861";

            }

        }


        const insight =
            document.querySelector(
                "#healthInsight p"
            );


        if (insight) {

            insight.textContent =
                health.insight;

        }

    }


    function updateHealthBar(
        id,
        value
    ) {

        const element =
            document.getElementById(id);

        if (!element) {
            return;
        }


        element.style.width =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(value) || 0
                )
            ) + "%";


        if (
            value < 40
        ) {

            element.style.background =
                "#d75b5b";

        } else if (
            value < 70
        ) {

            element.style.background =
                "#d19c31";

        } else {

            element.style.background =
                "#0b9861";

        }

    }


    /* =====================================================
       BUDGET DASHBOARD
    ====================================================== */

    function updateBudgetDashboard() {

        const budget =
            getMonthlyBudget();

        const spent =
            getCurrentMonthSpent();


        setText(
            "dashboardBudgetSpent",
            formatCompactCurrency(
                spent
            )
        );


        setText(
            "dashboardBudgetLimit",
            formatCompactCurrency(
                budget
            )
        );


        if (budget <= 0) {

            setText(
                "dashboardBudgetPercent",
                "0%"
            );


            setText(
                "dashboardBudgetRemaining",
                "—"
            );


            setText(
                "dashboardBudgetMessage",
                "Set a monthly budget to take control of your spending."
            );


            const fill =
                document.getElementById(
                    "dashboardBudgetFill"
                );


            if (fill) {

                fill.style.width =
                    "0%";

            }

            return;

        }


        const percentage =
            (
                spent /
                budget
            ) *
            100;


        const safePercentage =
            Math.min(
                100,
                Math.max(
                    0,
                    percentage
                )
            );


        const remaining =
            budget -
            spent;


        setText(
            "dashboardBudgetPercent",
            Math.round(
                percentage
            ) + "%"
        );


        setText(
            "dashboardBudgetRemaining",
            formatCompactCurrency(
                remaining
            )
        );


        const fill =
            document.getElementById(
                "dashboardBudgetFill"
            );


        if (fill) {

            fill.style.width =
                safePercentage + "%";


            if (
                percentage > 100
            ) {

                fill.style.background =
                    "#d75b5b";

            } else if (
                percentage > 80
            ) {

                fill.style.background =
                    "#d19c31";

            } else {

                fill.style.background =
                    "#0b9861";

            }

        }


        let message;


        if (
            percentage > 100
        ) {

            message =
                "You've exceeded your monthly budget. Review your biggest spending categories.";

        } else if (
            percentage > 80
        ) {

            message =
                "You're close to your monthly limit. Be selective with your remaining spending.";

        } else if (
            percentage > 50
        ) {

            message =
                "You're over halfway through your budget. Keep an eye on the rest of the month.";

        } else {

            message =
                "You're within your monthly spending plan. Keep it up.";

        }


        setText(
            "dashboardBudgetMessage",
            message
        );

    }


    /* =====================================================
       CASH FLOW
    ====================================================== */

    let currentChartPeriod =
        "month";


    function updateCashFlow() {

        const source =
            currentChartPeriod ===
            "year"
                ? getCurrentYearTransactions()
                : getCurrentMonthTransactions();


        const income =
            source
                .filter(
                    item =>
                        item.type ===
                        "income"
                )
                .reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Number(
                            item.amount
                        ),

                    0
                );


        const expenses =
            source
                .filter(
                    item =>
                        item.type ===
                        "expense"
                )
                .reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Number(
                            item.amount
                        ),

                    0
                );


        const cashFlow =
            income -
            expenses;


        setText(
            "periodIncome",
            formatCompactCurrency(
                income
            )
        );


        setText(
            "periodExpenses",
            formatCompactCurrency(
                expenses
            )
        );


        setText(
            "periodCashFlow",
            formatCompactCurrency(
                cashFlow
            )
        );


        setText(
            "cashFlowHealth",

            income === 0 &&
            expenses === 0

                ? "Waiting for data"

                : cashFlow >= 0
                    ? "Positive"
                    : "Needs attention"

        );


        drawCashFlowChart(
            source
        );

    }


    function drawCashFlowChart(
        source
    ) {

        const canvas =
            document.getElementById(
                "cashFlowChart"
            );


        const empty =
            document.getElementById(
                "cashFlowEmpty"
            );


        if (!canvas) {
            return;
        }


        const context =
            canvas.getContext("2d");


        const rect =
            canvas.getBoundingClientRect();


        const ratio =
            window.devicePixelRatio ||
            1;


        canvas.width =
            rect.width *
            ratio;

        canvas.height =
            rect.height *
            ratio;


        context.scale(
            ratio,
            ratio
        );


        const width =
            rect.width;

        const height =
            rect.height;


        context.clearRect(
            0,
            0,
            width,
            height
        );


        if (
            source.length === 0
        ) {

            if (empty) {
                empty.hidden = false;
            }

            return;

        }


        if (empty) {
            empty.hidden = true;
        }


        const buckets =
            buildChartBuckets(
                source,
                currentChartPeriod
            );


        if (
            buckets.length < 1
        ) {
            return;
        }


        const values = [];


        buckets.forEach(
            bucket => {

                values.push(
                    bucket.income
                );

                values.push(
                    bucket.expenses
                );

            }
        );


        const maximum =
            Math.max(
                ...values,
                1
            );


        const padding = {

            top: 20,

            right: 20,

            bottom: 35,

            left: 50

        };


        const chartWidth =
            width -
            padding.left -
            padding.right;

        const chartHeight =
            height -
            padding.top -
            padding.bottom;


        /* Grid */

        context.strokeStyle =
            "#edf2ef";

        context.lineWidth = 1;


        for (
            let i = 0;
            i <= 4;
            i++
        ) {

            const y =
                padding.top +
                (
                    chartHeight *
                    i /
                    4
                );


            context.beginPath();

            context.moveTo(
                padding.left,
                y
            );

            context.lineTo(
                width -
                padding.right,
                y
            );

            context.stroke();


            const value =
                maximum -
                (
                    maximum *
                    i /
                    4
                );


            context.fillStyle =
                "#9aa49f";

            context.font =
                "9px Arial";

            context.textAlign =
                "right";

            context.fillText(
                compactNumber(
                    value
                ),
                padding.left - 7,
                y + 3
            );

        }


        drawChartLine(
            context,
            buckets,
            "income",
            maximum,
            padding,
            chartWidth,
            chartHeight,
            width
        );


        drawChartLine(
            context,
            buckets,
            "expenses",
            maximum,
            padding,
            chartWidth,
            chartHeight,
            width
        );


        /* Labels */

        context.fillStyle =
            "#8f9b95";

        context.font =
            "9px Arial";

        context.textAlign =
            "center";


        buckets.forEach(
            (
                bucket,
                index
            ) => {

                const x =
                    padding.left +
                    (
                        index /
                        Math.max(
                            1,
                            buckets.length - 1
                        )
                    ) *
                    chartWidth;


                context.fillText(
                    bucket.label,
                    x,
                    height - 10
                );

            }
        );

    }


    function drawChartLine(
        context,
        buckets,
        key,
        maximum,
        padding,
        chartWidth,
        chartHeight,
        width
    ) {

        context.beginPath();


        buckets.forEach(
            (
                bucket,
                index
            ) => {

                const x =
                    padding.left +
                    (
                        index /
                        Math.max(
                            1,
                            buckets.length - 1
                        )
                    ) *
                    chartWidth;


                const value =
                    Number(
                        bucket[key]
                    ) || 0;


                const y =
                    padding.top +
                    chartHeight -
                    (
                        value /
                        maximum
                    ) *
                    chartHeight;


                if (
                    index === 0
                ) {

                    context.moveTo(
                        x,
                        y
                    );

                } else {

                    context.lineTo(
                        x,
                        y
                    );

                }

            }
        );


        context.strokeStyle =
            key === "income"
                ? "#0b9861"
                : "#d75b5b";

        context.lineWidth = 2.5;

        context.lineJoin =
            "round";

        context.lineCap =
            "round";

        context.stroke();


        buckets.forEach(
            (
                bucket,
                index
            ) => {

                const x =
                    padding.left +
                    (
                        index /
                        Math.max(
                            1,
                            buckets.length - 1
                        )
                    ) *
                    chartWidth;


                const value =
                    Number(
                        bucket[key]
                    ) || 0;


                const y =
                    padding.top +
                    chartHeight -
                    (
                        value /
                        maximum
                    ) *
                    chartHeight;


                context.beginPath();

                context.arc(
                    x,
                    y,
                    3,
                    0,
                    Math.PI * 2
                );


                context.fillStyle =
                    key === "income"
                        ? "#0b9861"
                        : "#d75b5b";

                context.fill();

            }
        );

    }


    function buildChartBuckets(
        source,
        period
    ) {

        const buckets = [];


        if (
            period === "year"
        ) {

            for (
                let month = 0;
                month < 12;
                month++
            ) {

                const date =
                    new Date(
                        new Date().getFullYear(),
                        month,
                        1
                    );


                const monthTransactions =
                    source.filter(
                        transaction => {

                            const d =
                                parseDate(
                                    transaction.date
                                );

                            return (
                                d.getMonth() ===
                                month
                            );

                        }
                    );


                buckets.push({

                    label:
                        date.toLocaleDateString(
                            "en-NG",
                            {
                                month: "short"
                            }
                        ),

                    income:
                        sumType(
                            monthTransactions,
                            "income"
                        ),

                    expenses:
                        sumType(
                            monthTransactions,
                            "expense"
                        )

                });

            }

        } else {

            for (
                let day = 0;
                day < 30;
                day++
            ) {

                const date =
                    new Date();

                date.setDate(
                    date.getDate() -
                    (
                        29 - day
                    )
                );


                const dayTransactions =
                    source.filter(
                        transaction => {

                            const d =
                                parseDate(
                                    transaction.date
                                );

                            return (
                                d.getFullYear() ===
                                    date.getFullYear() &&
                                d.getMonth() ===
                                    date.getMonth() &&
                                d.getDate() ===
                                    date.getDate()
                            );

                        }
                    );


                buckets.push({

                    label:
                        day % 5 === 0
                            ? date.getDate()
                            : "",

                    income:
                        sumType(
                            dayTransactions,
                            "income"
                        ),

                    expenses:
                        sumType(
                            dayTransactions,
                            "expense"
                        )

                });

            }

        }


        return buckets;

    }


    /* =====================================================
       RECENT TRANSACTIONS
    ====================================================== */

    function renderRecentTransactions() {

        const container =
            document.getElementById(
                "recentTransactions"
            );


        if (!container) {
            return;
        }


        const recent =
            transactions
                .slice()
                .sort(
                    (
                        a,
                        b
                    ) =>
                        parseDate(b.date) -
                        parseDate(a.date)
                )
                .slice(
                    0,
                    6
                );


        if (
            recent.length === 0
        ) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        ₦
                    </div>

                    <h4>
                        No transactions yet
                    </h4>

                    <p>
                        Start by adding your income or first expense.
                    </p>

                    <div class="empty-actions">

                        <a
                            href="income.html"
                            class="btn btn-small btn-primary"
                        >
                            Add Income
                        </a>

                        <a
                            href="expenses.html"
                            class="btn btn-small btn-secondary"
                        >
                            Add Expense
                        </a>

                    </div>

                </div>

            `;

            return;

        }


        container.innerHTML =
            recent.map(
                transaction => {

                    const icon =
                        transaction.type ===
                        "income"
                            ? "↗"
                            : getCategoryIcon(
                                transaction.category
                            );


                    const sign =
                        transaction.type ===
                        "income"
                            ? "+"
                            : "−";


                    return `

                        <div
                            class="transaction-item"
                        >

                            <div
                                class="transaction-icon"
                            >
                                ${icon}
                            </div>

                            <div
                                class="transaction-info"
                            >

                                <strong>
                                    ${escapeHTML(
                                        transaction.description
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        transaction.category
                                    )}
                                    •
                                    ${formatShortDate(
                                        transaction.date
                                    )}
                                </span>

                            </div>

                            <strong
                                class="transaction-amount ${transaction.type}"
                            >
                                ${sign}${formatCurrency(
                                    transaction.amount
                                )}
                            </strong>

                        </div>

                    `;

                }
            )
            .join("");

    }


    /* =====================================================
       TOP SPENDING
    ====================================================== */

    function renderTopSpending() {

        const container =
            document.getElementById(
                "topSpendingCategories"
            );


        if (!container) {
            return;
        }


        const expenses =
            getCurrentMonthExpenses();


        const grouped = {};


        expenses.forEach(
            transaction => {

                const category =
                    transaction.category ||
                    "Other";


                grouped[category] =
                    (
                        grouped[category] ||
                        0
                    ) +
                    Number(
                        transaction.amount
                    );

            }
        );


        const list =
            Object.entries(
                grouped
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b[1] -
                    a[1]
            )
            .slice(
                0,
                5
            );


        if (
            list.length === 0
        ) {

            container.innerHTML = `

                <div class="empty-state compact">

                    <div class="empty-icon">
                        ◉
                    </div>

                    <h4>
                        No spending data
                    </h4>

                    <p>
                        Your biggest spending categories will appear here.
                    </p>

                </div>

            `;

            return;

        }


        const maximum =
            list[0][1];


        container.innerHTML =
            list.map(
                (
                    [
                        category,
                        amount
                    ]
                ) => {

                    const width =
                        (
                            amount /
                            maximum
                        ) *
                        100;


                    return `

                        <div
                            class="category-item"
                        >

                            <div
                                class="category-heading"
                            >

                                <span
                                    class="category-name"
                                >
                                    ${getCategoryIcon(
                                        category
                                    )}
                                    ${escapeHTML(
                                        category
                                    )}
                                </span>

                                <strong
                                    class="category-amount"
                                >
                                    ${formatCurrency(
                                        amount
                                    )}
                                </strong>

                            </div>

                            <div
                                class="category-track"
                            >

                                <div
                                    class="category-fill"
                                    style="width:${width}%"
                                ></div>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

    }


    /* =====================================================
       DASHBOARD GOALS
    ====================================================== */

    function renderDashboardGoals() {

        const container =
            document.getElementById(
                "dashboardGoals"
            );


        if (!container) {
            return;
        }


        if (
            savingsGoals.length === 0
        ) {

            container.innerHTML = `

                <div class="empty-state compact">

                    <div class="empty-icon">
                        🎯
                    </div>

                    <h4>
                        No savings goals
                    </h4>

                    <p>
                        Create goals for the things that matter to you.
                    </p>

                    <a
                        href="savings.html"
                        class="btn btn-small btn-primary"
                    >
                        Create Goal
                    </a>

                </div>

            `;

            return;

        }


        container.innerHTML =
            savingsGoals
                .slice(
                    0,
                    4
                )
                .map(
                    goal => {

                        const progress =
                            getGoalProgress(
                                goal
                            );


                        return `

                            <div
                                class="goal-item"
                            >

                                <div
                                    class="goal-heading"
                                >

                                    <strong>
                                        ${escapeHTML(
                                            goal.name
                                        )}
                                    </strong>

                                    <span
                                        class="goal-percent"
                                    >
                                        ${Math.round(
                                            progress
                                        )}%
                                    </span>

                                </div>

                                <div
                                    class="goal-progress"
                                >

                                    <div
                                        class="goal-progress-fill"
                                        style="width:${progress}%"
                                    ></div>

                                </div>

                                <div
                                    class="goal-meta"
                                >

                                    <span>
                                        ${formatCurrency(
                                            goal.saved
                                        )}
                                        saved
                                    </span>

                                    <span>
                                        ${formatCurrency(
                                            goal.target
                                        )}
                                        target
                                    </span>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       SMART ALERTS
    ====================================================== */

    function generateFinancialAlerts() {

        const alerts = [];


        const totals =
            calculateTotals();


        /* No activity */

        if (
            transactions.length === 0
        ) {

            alerts.push({

                type: "info",

                icon: "💡",

                title:
                    "Start your MoneyLeak journey",

                message:
                    "Add your income and expenses so MoneyLeak can begin analyzing your finances.",

                priority: 1

            });


            return alerts;

        }


        /* Spending > income */

        if (
            totals.income > 0 &&
            totals.expenses >
            totals.income
        ) {

            const percentage =
                Math.round(
                    (
                        totals.expenses /
                        totals.income
                    ) *
                    100
                );


            alerts.push({

                type: "danger",

                icon: "🚨",

                title:
                    "You're spending more than you earn",

                message:
                    `Your recorded expenses are ${percentage}% of your income. Review unnecessary spending.`,

                priority: 100

            });

        }


        /* Budget */

        const budget =
            getMonthlyBudget();


        const spent =
            getCurrentMonthSpent();


        if (
            budget > 0
        ) {

            const usage =
                (
                    spent /
                    budget
                ) *
                100;


            if (
                usage > 100
            ) {

                alerts.push({

                    type: "danger",

                    icon: "🔴",

                    title:
                        "Monthly budget exceeded",

                    message:
                        `You've spent ${formatCurrency(spent)} against a ${formatCurrency(budget)} budget.`,

                    priority: 90

                });

            } else if (
                usage >= 80
            ) {

                alerts.push({

                    type: "warning",

                    icon: "⚠️",

                    title:
                        "You're close to your budget limit",

                    message:
                        `${Math.round(usage)}% of your monthly budget has been used.`,

                    priority: 70

                });

            }

        }


        /* Category budgets */

        const categoryBudgets =
            getCategoryBudgets();


        Object.entries(
            categoryBudgets
        ).forEach(
            (
                [
                    category,
                    limit
                ]
            ) => {

                const spentCategory =
                    getCategorySpent(
                        category
                    );


                const budgetValue =
                    Number(limit) || 0;


                if (
                    budgetValue <= 0
                ) {
                    return;
                }


                if (
                    spentCategory >
                    budgetValue
                ) {

                    alerts.push({

                        type: "danger",

                        icon: "🔴",

                        title:
                            `${category} budget exceeded`,

                        message:
                            `${formatCurrency(spentCategory)} spent against a ${formatCurrency(budgetValue)} limit.`,

                        priority: 85

                    });

                } else if (
                    spentCategory >=
                    budgetValue * 0.8
                ) {

                    alerts.push({

                        type: "warning",

                        icon: "🟡",

                        title:
                            `${category} budget is nearly full`,

                        message:
                            `${formatCurrency(spentCategory)} of ${formatCurrency(budgetValue)} has been used.`,

                        priority: 65

                    });

                }

            }
        );


        /* Savings */

        if (
            totals.income > 0
        ) {

            const rate =
                (
                    (
                        totals.income -
                        totals.expenses
                    ) /
                    totals.income
                ) *
                100;


            if (
                rate <= 0
            ) {

                alerts.push({

                    type: "warning",

                    icon: "💸",

                    title:
                        "Your savings rate is 0% or below",

                    message:
                        "Try creating a small gap between income and expenses this month.",

                    priority: 75

                });

            } else if (
                rate >= 20
            ) {

                alerts.push({

                    type: "success",

                    icon: "✅",

                    title:
                        "Great savings rate",

                    message:
                        `You're currently keeping about ${Math.round(rate)}% of recorded income.`,

                    priority: 30

                });

            }

        }


        /* Recurring */

        const recurring =
            getRecurringTransactions()
                .filter(
                    item =>
                        item.active !== false &&
                        item.type === "expense"
                );


        const recurringTotal =
            recurring.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.amount || 0
                    ),

                0
            );


        if (
            totals.income > 0 &&
            recurringTotal >
            totals.income * 0.3
        ) {

            alerts.push({

                type: "warning",

                icon: "🔄",

                title:
                    "Review your recurring expenses",

                message:
                    "Recurring commitments are using more than 30% of your recorded income.",

                priority: 60

            });

        }


        /* Positive budget */

        if (
            budget > 0 &&
            spent <= budget * 0.5
        ) {

            alerts.push({

                type: "success",

                icon: "🎯",

                title:
                    "You're on track with your budget",

                message:
                    `Only ${Math.round(
                        (
                            spent /
                            budget
                        ) *
                        100
                    )}% of your monthly budget has been used.`,

                priority: 20

            });

        }


        /* Health */

        const health =
            calculateFinancialHealth();


        if (
            health.score >= 85
        ) {

            alerts.push({

                type: "success",

                icon: "🧠",

                title:
                    "Excellent financial health",

                message:
                    "Your current financial habits are showing strong control.",

                priority: 10

            });

        }


        return alerts
            .sort(
                (
                    a,
                    b
                ) =>
                    b.priority -
                    a.priority
            )
            .slice(
                0,
                8
            );

    }


    function updateFinancialAlerts() {

        const container =
            document.getElementById(
                "financialAlerts"
            );


        if (!container) {
            return;
        }


        const alerts =
            generateFinancialAlerts();


        if (
            alerts.length === 0
        ) {

            container.innerHTML = `

                <div class="alert-empty">

                    <div class="alert-empty-icon">
                        🔔
                    </div>

                    <h3>
                        You're all caught up
                    </h3>

                    <p>
                        MoneyLeak doesn't currently see anything that needs your attention.
                    </p>

                </div>

            `;

            return;

        }


        container.innerHTML =
            alerts.map(
                alert => `

                    <article
                        class="financial-alert alert-${alert.type}"
                    >

                        <div
                            class="alert-icon"
                        >
                            ${alert.icon}
                        </div>

                        <div
                            class="alert-content"
                        >

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

                    </article>

                `
            )
            .join("");


        updateNotificationDot(
            alerts
        );

    }


    function updateNotificationDot(
        alerts
    ) {

        const dot =
            document.getElementById(
                "notificationDot"
            );


        if (!dot) {
            return;
        }


        const urgent =
            alerts.some(
                alert =>
                    alert.type ===
                    "danger"
            );


        dot.classList.toggle(
            "visible",
            urgent
        );

    }


    /* =====================================================
       NOTIFICATION PANEL
    ====================================================== */

    function updateNotificationPanel() {

        const container =
            document.getElementById(
                "notificationList"
            );


        if (!container) {
            return;
        }


        const alerts =
            generateFinancialAlerts();


        if (
            alerts.length === 0
        ) {

            container.innerHTML = `

                <div class="notification-empty">

                    <span>
                        🔔
                    </span>

                    <strong>
                        You're all caught up
                    </strong>

                    <p>
                        New financial alerts will appear here.
                    </p>

                </div>

            `;

            return;

        }


        container.innerHTML =
            alerts.map(
                alert => `

                    <div
                        class="notification-item"
                        style="
                            padding:14px 17px;
                            border-bottom:1px solid #edf1ef;
                            display:flex;
                            gap:10px;
                        "
                    >

                        <span
                            style="font-size:16px;"
                        >
                            ${alert.icon}
                        </span>

                        <div>

                            <strong
                                style="
                                    display:block;
                                    color:#44534c;
                                    font-size:10px;
                                "
                            >
                                ${escapeHTML(
                                    alert.title
                                )}
                            </strong>

                            <p
                                style="
                                    margin-top:3px;
                                    color:#929d98;
                                    font-size:9px;
                                "
                            >
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


    /* =====================================================
       SEARCH
    ====================================================== */

    const SEARCH_PAGES = [

        {
            title: "Dashboard",
            description:
                "Your financial command center",
            url: "index.html",
            icon: "⌂"
        },

        {
            title: "Income",
            description:
                "Track money coming in",
            url: "income.html",
            icon: "↗"
        },

        {
            title: "Expenses",
            description:
                "Track money going out",
            url: "expenses.html",
            icon: "↘"
        },

        {
            title: "Budgets",
            description:
                "Control your spending",
            url: "budgets.html",
            icon: "▣"
        },

        {
            title: "Savings Goals",
            description:
                "Plan and track your goals",
            url: "savings.html",
            icon: "◎"
        },

        {
            title: "Recurring",
            description:
                "Manage recurring payments",
            url: "recurring.html",
            icon: "↻"
        },

        {
            title: "Analytics",
            description:
                "Understand your financial data",
            url: "analytics.html",
            icon: "▥"
        },

        {
            title: "Settings",
            description:
                "Manage MoneyLeak preferences",
            url: "settings.html",
            icon: "⚙"
        }

    ];


    function searchMoneyLeak(
        query
    ) {

        const term =
            String(
                query || ""
            )
            .trim()
            .toLowerCase();


        if (!term) {

            return SEARCH_PAGES;

        }


        const pages =
            SEARCH_PAGES.filter(
                page =>
                    (
                        page.title +
                        " " +
                        page.description
                    )
                    .toLowerCase()
                    .includes(term)
            );


        const transactionResults =
            transactions
                .filter(
                    transaction =>
                        (
                            transaction.description +
                            " " +
                            transaction.category
                        )
                        .toLowerCase()
                        .includes(term)
                )
                .slice(
                    0,
                    8
                );


        return [

            ...pages,

            ...transactionResults.map(
                transaction => ({

                    title:
                        transaction.description,

                    description:
                        `${transaction.category} • ${formatCurrency(transaction.amount)}`,

                    url:
                        "expenses.html",

                    icon:
                        transaction.type ===
                        "income"
                            ? "↗"
                            : "↘"

                })
            )

        ];

    }


    function renderSearchResults(
        query
    ) {

        const container =
            document.getElementById(
                "searchResults"
            );


        if (!container) {
            return;
        }


        const results =
            searchMoneyLeak(
                query
            );


        if (
            results.length === 0
        ) {

            container.innerHTML = `

                <p>
                    No MoneyLeak results found.
                </p>

            `;

            return;

        }


        container.innerHTML =
            results.map(
                result => `

                    <a
                        class="search-result"
                        href="${result.url}"
                    >

                        <span
                            class="search-result-icon"
                        >
                            ${result.icon}
                        </span>

                        <span>

                            <strong>
                                ${escapeHTML(
                                    result.title
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    result.description
                                )}
                            </span>

                        </span>

                    </a>

                `
            )
            .join("");

    }


    /* =====================================================
       MOBILE SIDEBAR
    ====================================================== */

    function setupMobileNavigation() {

        const button =
            document.getElementById(
                "mobileMenu"
            );

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const overlay =
            document.getElementById(
                "mobileOverlay"
            );


        if (
            !button ||
            !sidebar
        ) {

            return;

        }


        function toggle() {

            const open =
                sidebar.classList.toggle(
                    "mobile-open"
                );


            if (overlay) {

                overlay.hidden =
                    !open;

            }

        }


        button.addEventListener(
            "click",
            toggle
        );


        if (overlay) {

            overlay.addEventListener(
                "click",
                () => {

                    sidebar.classList.remove(
                        "mobile-open"
                    );

                    overlay.hidden =
                        true;

                }
            );

        }


        sidebar
            .querySelectorAll(
                ".nav-link"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        () => {

                            sidebar.classList.remove(
                                "mobile-open"
                            );

                            if (overlay) {
                                overlay.hidden =
                                    true;
                            }

                        }
                    );

                }
            );

    }


    /* =====================================================
       SEARCH UI
    ====================================================== */

    function setupSearch() {
    const button = document.getElementById("searchButton");
    const overlay = document.getElementById("searchOverlay");
    const close = document.getElementById("closeSearch");
    const input = document.getElementById("globalSearch");

    if (!overlay) {
        return;
    }

    function hideSearch() {
        overlay.hidden = true;
        overlay.classList.remove("open");
        overlay.classList.remove("active");
        overlay.style.display = "none";
        overlay.setAttribute("aria-hidden", "true");

        if (input) {
            input.value = "";
        }
    }

    function showSearch() {
        overlay.hidden = false;
        overlay.classList.add("open");
        overlay.classList.add("active");
        overlay.style.display = "flex";
        overlay.setAttribute("aria-hidden", "false");

        setTimeout(() => {
            if (input) {
                input.focus();
            }
        }, 50);

        if (input) {
            renderSearchResults(input.value || "");
        }
    }

    hideSearch();

    if (button) {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            showSearch();
        });
    }

    if (close) {
        close.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            hideSearch();
        });
    }

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            hideSearch();
        }
    });

    if (input) {
        input.addEventListener("input", (event) => {
            renderSearchResults(event.target.value || "");
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                hideSearch();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "/" &&
            document.activeElement !== input &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
        ) {
            event.preventDefault();
            showSearch();
            return;
        }

        if (event.key === "Escape") {
            hideSearch();
        }
    });
}


    /* =====================================================
       NOTIFICATION UI
    ====================================================== */

    function setupNotifications() {
    const button = document.getElementById("notificationButton");
    const panel = document.getElementById("notificationPanel");
    const close = document.getElementById("closeNotifications");

    if (!panel) {
        return;
    }

    function hideNotifications() {
        panel.classList.remove("open");
        panel.classList.remove("active");

        panel.hidden = true;
        panel.style.display = "none";

        panel.setAttribute("aria-hidden", "true");

        document.body.classList.remove("notification-open");
    }

    function showNotifications() {
        panel.hidden = false;
        panel.classList.add("open");
        panel.classList.add("active");

        panel.style.display = "block";

        panel.setAttribute("aria-hidden", "false");

        document.body.classList.add("notification-open");

        if (typeof renderNotifications === "function") {
            renderNotifications();
        }
    }

    /*
     * Always start CLOSED.
     * This prevents Analytics, Settings and other pages
     * from loading with the notification panel already open.
     */
    hideNotifications();

    if (button) {
        button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            const isOpen =
                panel.classList.contains("open") ||
                panel.classList.contains("active") ||
                panel.getAttribute("aria-hidden") === "false";

            if (isOpen) {
                hideNotifications();
            } else {
                showNotifications();
            }
        });
    }

    if (close) {
        close.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            hideNotifications();
        });
    }

    panel.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    document.addEventListener("click", function (event) {
        if (
            panel.classList.contains("open") ||
            panel.classList.contains("active")
        ) {
            if (
                !panel.contains(event.target) &&
                (!button || !button.contains(event.target))
            ) {
                hideNotifications();
            }
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            hideNotifications();
        }
    });

    /*
     * Public controls for other MoneyLeak pages.
     */
    window.closeMoneyLeakNotifications = hideNotifications;
    window.openMoneyLeakNotifications = showNotifications;
}


    /* =====================================================
       PERIOD BUTTONS
    ====================================================== */

    function setupPeriodButtons() {

        document
            .querySelectorAll(
                ".period-button"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            document
                                .querySelectorAll(
                                    ".period-button"
                                )
                                .forEach(
                                    item =>
                                        item.classList.remove(
                                            "active"
                                        )
                                );


                            button.classList.add(
                                "active"
                            );


                            currentChartPeriod =
                                button.dataset.period ||
                                "month";


                            updateCashFlow();

                        }
                    );

                }
            );

    }


    /* =====================================================
       GREETING
    ====================================================== */

    function updateGreeting() {

        const element =
            document.getElementById(
                "dashboardGreeting"
            );


        if (!element) {
            return;
        }


        const hour =
            new Date().getHours();


        let greeting;


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

        } else {

            greeting =
                "Good evening";

        }


        const name =
            settings.name &&
            settings.name !==
            "My Money"

                ? `, ${settings.name}`

                : "";


        element.textContent =
            `${greeting}${name} 👋`;

    }


    function updateDate() {

        setText(
            "currentDate",

            new Date()
                .toLocaleDateString(
                    "en-NG",
                    {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    }
                )
        );


        setText(
            "footerYear",
            new Date().getFullYear()
        );

    }


    /* =====================================================
       GLOBAL REFRESH
    ====================================================== */

    function refreshEverything() {

        settings =
            getSettings();


        transactions =
            loadTransactions();


        savingsGoals =
            loadSavingsGoals();


        applySettings();


        updateGreeting();

        updateDate();

        updateDashboardOverview();

        updateMoneyHealth();

        updateBudgetDashboard();

        updateCashFlow();

        renderRecentTransactions();

        renderTopSpending();

        renderDashboardGoals();

        updateFinancialAlerts();

        updateNotificationPanel();

        updatePageModules();

    }


    /* =====================================================
       PAGE MODULE HOOK
    ====================================================== */

    function updatePageModules() {

        if (
            typeof window.moneyLeakPageUpdate ===
            "function"
        ) {

            try {

                window.moneyLeakPageUpdate();

            } catch (error) {

                console.error(
                    "MoneyLeak page module error:",
                    error
                );

            }

        }

    }


    /* =====================================================
       UTILITIES
    ====================================================== */

    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent =
                value;

        }

    }


    function sumType(
        source,
        type
    ) {

        return source
            .filter(
                transaction =>
                    transaction.type ===
                    type
            )
            .reduce(
                (
                    total,
                    transaction
                ) =>
                    total +
                    Number(
                        transaction.amount
                    ),

                0
            );

    }


    function compactNumber(
        value
    ) {

        const number =
            Number(value) || 0;


        if (
            Math.abs(number) >=
            1000000000
        ) {

            return (
                (
                    number /
                    1000000000
                )
                .toFixed(1) +
                "B"
            );

        }


        if (
            Math.abs(number) >=
            1000000
        ) {

            return (
                (
                    number /
                    1000000
                )
                .toFixed(1) +
                "M"
            );

        }


        if (
            Math.abs(number) >=
            1000
        ) {

            return (
                (
                    number /
                    1000
                )
                .toFixed(0) +
                "k"
            );

        }


        return Math.round(
            number
        ).toString();

    }


    function getCategoryIcon(
        category
    ) {

        const icons = {

            Food: "🍔",

            Transport: "🚗",

            Shopping: "🛍️",

            Bills: "🧾",

            Housing: "🏠",

            Health: "❤️",

            Education: "📚",

            Entertainment: "🎬",

            Subscriptions: "📱",

            Family: "👨‍👩‍👧",

            Travel: "✈️",

            Utilities: "💡",

            Business: "💼",

            Savings: "💰",

            Other: "◉"

        };


        return (
            icons[category] ||
            icons.Other
        );

    }


    function escapeHTML(
        value
    ) {

        return String(
            value ?? ""
        )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

    }


    /* =====================================================
       GLOBAL API
    ====================================================== */

    window.MoneyLeak = {

        get transactions() {

            return transactions;

        },

        get settings() {

            return settings;

        },

        get categories() {

            return CATEGORIES;

        },

        get savingsGoals() {

            return savingsGoals;

        },

        calculateTotals,

        formatCurrency,

        formatCompactCurrency,

        addTransaction,

        updateTransaction,

        deleteTransaction,

        getCurrentMonthTransactions,

        getCurrentYearTransactions,

        getLast30DaysTransactions,

        getMonthlyBudget,

        setMonthlyBudget,

        getCategoryBudgets,

        setCategoryBudget,

        deleteCategoryBudget,

        getCategorySpent,

        getRecurringTransactions,

        addRecurringTransaction,

        deleteRecurringTransaction,

        addSavingsGoal,

        updateSavingsGoal,

        deleteSavingsGoal,

        getGoalProgress,

        calculateFinancialHealth,

        generateFinancialAlerts,

        saveSettings,

        refresh:

            refreshEverything

    };


    /* =====================================================
       INITIALIZATION
    ====================================================== */

    function initializeMoneyLeak() {

        applySettings();

        setupMobileNavigation();

        setupSearch();

        setupNotifications();

        setupPeriodButtons();

        refreshEverything();

        console.log(
            "MoneyLeak Personal Finance OS initialized."
        );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeMoneyLeak
        );

    } else {

        initializeMoneyLeak();

    }


    /* =====================================================
       RESIZE
    ====================================================== */

    let resizeTimer;


    window.addEventListener(
        "resize",
        () => {

            clearTimeout(
                resizeTimer
            );


            resizeTimer =
                setTimeout(
                    () => {

                        updateCashFlow();

                    },
                    150
                );

        }
    );


})();
