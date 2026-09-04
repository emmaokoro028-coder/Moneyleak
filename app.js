/* ============================================================
   MONEYLEAK
   PERSONAL FINANCE OS
   CENTRAL APPLICATION ENGINE
   ============================================================ */

(() => {
    "use strict";

    /* ============================================================
       STORAGE
       ============================================================ */

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


    /* ============================================================
       DEFAULT SETTINGS
       ============================================================ */

    const DEFAULT_SETTINGS = {
        currency: "NGN",
        symbol: "₦",
        name: "My Money",
        theme: "light",
        notifications: true,
        compactNumbers: false
    };


    /* ============================================================
       CATEGORIES
       ============================================================ */

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


    /* ============================================================
       CURRENCY
       ============================================================ */

    const CURRENCY_SYMBOLS = {
        NGN: "₦",
        USD: "$",
        GBP: "£",
        EUR: "€",
        CAD: "C$",
        AUD: "A$"
    };


    /* ============================================================
       SAFE STORAGE
       ============================================================ */

    function readStorage(key, fallback) {
        try {
            const value = localStorage.getItem(key);

            if (value === null) {
                return fallback;
            }

            return JSON.parse(value);

        } catch (error) {
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
            return false;
        }
    }


    function removeStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            // Ignore storage errors.
        }
    }


    /* ============================================================
       SETTINGS
       ============================================================ */

    function getSettings() {
        const saved = readStorage(
            STORAGE.settings,
            {}
        );

        return {
            ...DEFAULT_SETTINGS,
            ...(saved && typeof saved === "object"
                ? saved
                : {})
        };
    }


    function saveSettings(settings) {
        const current = getSettings();

        const merged = {
            ...current,
            ...(settings || {})
        };

        if (!merged.currency) {
            merged.currency = "NGN";
        }

        merged.symbol =
            CURRENCY_SYMBOLS[merged.currency] ||
            merged.symbol ||
            "₦";

        writeStorage(
            STORAGE.settings,
            merged
        );

        applySettings(merged);

        return merged;
    }


    function applySettings(settings = getSettings()) {

        const theme =
            settings.theme || "light";

        if (document.body) {

            document.body.classList.toggle(
                "dark-mode",
                theme === "dark"
            );

            document.body.dataset.theme =
                theme;
        }

        updateProfileUI(settings);
    }


    function updateProfileUI(settings = getSettings()) {

        const name =
            String(
                settings.name ||
                "My Money"
            ).trim() || "My Money";

        const initial =
            name.charAt(0).toUpperCase();


        const selectors = [
            "#topProfileName",
            "#profileNameDisplay",
            "#profilePreviewName"
        ];


        selectors.forEach(selector => {

            const element =
                document.querySelector(selector);

            if (element) {
                element.textContent = name;
            }

        });


        const avatars =
            document.querySelectorAll(
                ".profile-chip-avatar, #profileAvatar, .brand-user-avatar"
            );


        avatars.forEach(avatar => {
            avatar.textContent = initial;
        });


        document.title =
            document.title.includes("—")
                ? document.title
                : document.title;
    }


    /* ============================================================
       TRANSACTIONS
       ============================================================ */

    function normalizeTransaction(transaction) {

        const raw =
            transaction &&
            typeof transaction === "object"
                ? transaction
                : {};


        let type =
            String(
                raw.type ||
                raw.transactionType ||
                ""
            ).toLowerCase();


        if (
            type !== "income" &&
            type !== "expense"
        ) {

            if (
                raw.amount > 0 &&
                raw.category === "Income"
            ) {
                type = "income";
            } else {
                type = "expense";
            }
        }


        let amount =
            Number(
                String(
                    raw.amount ??
                    raw.value ??
                    0
                ).replace(/,/g, "")
            );


        if (!Number.isFinite(amount)) {
            amount = 0;
        }


        amount =
            Math.abs(amount);


        const description =
            String(
                raw.description ??
                raw.name ??
                raw.title ??
                raw.source ??
                "Transaction"
            ).trim();


        const category =
            String(
                raw.category ||
                (type === "income"
                    ? "Income"
                    : "Other")
            ).trim();


        const date =
            normalizeDate(
                raw.date ||
                raw.transactionDate ||
                raw.createdAt ||
                todayString()
            );


        return {
            id:
                String(
                    raw.id ||
                    raw.transactionId ||
                    createId("txn")
                ),

            amount,

            type,

            category,

            description:
                description ||
                "Transaction",

            date,

            note:
                String(
                    raw.note ||
                    ""
                ),

            account:
                String(
                    raw.account ||
                    ""
                ),

            source:
                String(
                    raw.source ||
                    ""
                ),

            createdAt:
                raw.createdAt ||
                new Date().toISOString()
        };
    }


    function getTransactions() {

        const data =
            readStorage(
                STORAGE.transactions,
                []
            );


        if (!Array.isArray(data)) {
            return [];
        }


        return data
            .map(normalizeTransaction)
            .filter(item =>
                Number.isFinite(item.amount)
            );
    }


    function saveTransactions(transactions) {

        const clean =
            Array.isArray(transactions)
                ? transactions.map(
                    normalizeTransaction
                )
                : [];


        writeStorage(
            STORAGE.transactions,
            clean
        );

        return clean;
    }


    function addTransaction(transaction) {

        const newTransaction =
            normalizeTransaction({
                ...transaction,
                id:
                    transaction?.id ||
                    createId("txn"),
                createdAt:
                    new Date().toISOString()
            });


        const transactions =
            getTransactions();


        transactions.unshift(
            newTransaction
        );


        saveTransactions(
            transactions
        );


        refreshEverything();


        return newTransaction;
    }


    function updateTransaction(
        id,
        updates
    ) {

        const transactions =
            getTransactions();


        const index =
            transactions.findIndex(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (index === -1) {
            return null;
        }


        transactions[index] =
            normalizeTransaction({
                ...transactions[index],
                ...(updates || {}),
                id:
                    transactions[index].id
            });


        saveTransactions(
            transactions
        );


        refreshEverything();


        return transactions[index];
    }


    function deleteTransaction(id) {

        const transactions =
            getTransactions();


        const remaining =
            transactions.filter(
                item =>
                    String(item.id) !==
                    String(id)
            );


        saveTransactions(
            remaining
        );


        refreshEverything();


        return true;
    }


    /* ============================================================
       TOTALS
       ============================================================ */

    function calculateTotals(
        transactions = getTransactions()
    ) {

        let income = 0;
        let expenses = 0;


        transactions.forEach(transaction => {

            const amount =
                Math.abs(
                    Number(
                        transaction.amount
                    ) || 0
                );


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

        });


        return {
            income,
            expenses,
            balance:
                income - expenses,
            savings:
                Math.max(
                    0,
                    income - expenses
                ),

            savingsRate:
                income > 0
                    ? ((income - expenses) /
                        income) * 100
                    : 0
        };
    }


    function getIncome(
        transactions = getTransactions()
    ) {

        return transactions.filter(
            item =>
                item.type === "income"
        );
    }


    function getExpenses(
        transactions = getTransactions()
    ) {

        return transactions.filter(
            item =>
                item.type === "expense"
        );
    }


    /* ============================================================
       DATES
       ============================================================ */

    function pad(number) {
        return String(number).padStart(
            2,
            "0"
        );
    }


    function todayString() {

        const date = new Date();

        return (
            date.getFullYear() +
            "-" +
            pad(date.getMonth() + 1) +
            "-" +
            pad(date.getDate())
        );
    }


    function normalizeDate(value) {

        if (!value) {
            return todayString();
        }


        const date =
            new Date(value);


        if (Number.isNaN(date.getTime())) {
            return todayString();
        }


        return (
            date.getFullYear() +
            "-" +
            pad(date.getMonth() + 1) +
            "-" +
            pad(date.getDate())
        );
    }


    function formatDate(value) {

        if (!value) {
            return "No date";
        }


        const date =
            new Date(value + "T00:00:00");


        if (Number.isNaN(date.getTime())) {
            return "No date";
        }


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

        if (!value) {
            return "";
        }


        const date =
            new Date(value + "T00:00:00");


        if (Number.isNaN(date.getTime())) {
            return "";
        }


        return date.toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short"
            }
        );
    }


    function getMonthKey(date) {

        const value =
            new Date(
                (date || todayString()) +
                "T00:00:00"
            );


        return (
            value.getFullYear() +
            "-" +
            pad(value.getMonth() + 1)
        );
    }


    function currentMonthKey() {
        return getMonthKey(
            todayString()
        );
    }


    function isCurrentMonth(date) {
        return (
            getMonthKey(date) ===
            currentMonthKey()
        );
    }


    function daysBetween(
        start,
        end
    ) {

        const first =
            new Date(
                start + "T00:00:00"
            );

        const second =
            new Date(
                end + "T00:00:00"
            );


        return Math.round(
            (
                second.getTime() -
                first.getTime()
            ) /
            86400000
        );
    }


    function daysFromToday(date) {
        return daysBetween(
            todayString(),
            normalizeDate(date)
        );
    }


    /* ============================================================
       PERIOD FILTERING
       ============================================================ */

    function filterByPeriod(
        transactions,
        period = "month"
    ) {

        const list =
            Array.isArray(transactions)
                ? transactions
                : [];


        const today =
            new Date(
                todayString() +
                "T00:00:00"
            );


        if (period === "all") {
            return list;
        }


        let start =
            new Date(today);


        if (period === "month") {

            start.setDate(1);

        } else if (period === "3months") {

            start.setMonth(
                start.getMonth() - 2
            );

            start.setDate(1);

        } else if (period === "6months") {

            start.setMonth(
                start.getMonth() - 5
            );

            start.setDate(1);

        } else if (period === "year") {

            start.setMonth(0);
            start.setDate(1);

        }


        const startString =
            normalizeDate(
                start.toISOString()
            );


        return list.filter(
            transaction =>
                transaction.date >=
                startString
        );
    }


    /* ============================================================
       CURRENCY
       ============================================================ */

    function formatCurrency(
        amount
    ) {

        const settings =
            getSettings();


        const value =
            Number(amount) || 0;


        const symbol =
            settings.symbol ||
            CURRENCY_SYMBOLS[
                settings.currency
            ] ||
            "₦";


        return (
            symbol +
            value.toLocaleString(
                undefined,
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            )
        );
    }


    function formatCompactCurrency(
        amount
    ) {

        const settings =
            getSettings();


        const value =
            Number(amount) || 0;


        const symbol =
            settings.symbol ||
            "₦";


        if (Math.abs(value) >= 1000000000) {
            return (
                symbol +
                (value / 1000000000)
                    .toFixed(1) +
                "B"
            );
        }


        if (Math.abs(value) >= 1000000) {
            return (
                symbol +
                (value / 1000000)
                    .toFixed(1) +
                "M"
            );
        }


        if (Math.abs(value) >= 1000) {
            return (
                symbol +
                (value / 1000)
                    .toFixed(1) +
                "K"
            );
        }


        return formatCurrency(value);
    }


    /* ============================================================
       SAVINGS GOALS
       ============================================================ */

    function getSavingsGoals() {

        let goals =
            readStorage(
                STORAGE.savingsGoals,
                null
            );


        if (!Array.isArray(goals)) {

            const oldGoal =
                readStorage(
                    STORAGE.savingsGoal,
                    null
                );


            if (
                oldGoal &&
                typeof oldGoal === "object"
            ) {

                goals = [
                    normalizeGoal(oldGoal)
                ];

                saveSavingsGoals(goals);

            } else {

                goals = [];
            }
        }


        return goals.map(
            normalizeGoal
        );
    }


    function normalizeGoal(goal) {

        const item =
            goal &&
            typeof goal === "object"
                ? goal
                : {};


        return {
            id:
                String(
                    item.id ||
                    createId("goal")
                ),

            name:
                String(
                    item.name ||
                    item.title ||
                    "Savings Goal"
                ),

            target:
                Math.max(
                    0,
                    Number(
                        item.target ??
                        item.targetAmount ??
                        0
                    ) || 0
                ),

            current:
                Math.max(
                    0,
                    Number(
                        item.current ??
                        item.saved ??
                        item.currentAmount ??
                        0
                    ) || 0
                ),

            deadline:
                item.deadline
                    ? normalizeDate(
                        item.deadline
                    )
                    : "",

            note:
                String(
                    item.note ||
                    ""
                ),

            createdAt:
                item.createdAt ||
                new Date().toISOString()
        };
    }


    function saveSavingsGoals(
        goals
    ) {

        const clean =
            Array.isArray(goals)
                ? goals.map(
                    normalizeGoal
                )
                : [];


        writeStorage(
            STORAGE.savingsGoals,
            clean
        );


        return clean;
    }


    function addSavingsGoal(goal) {

        const goals =
            getSavingsGoals();


        const newGoal =
            normalizeGoal({
                ...goal,
                id:
                    createId("goal")
            });


        goals.push(
            newGoal
        );


        saveSavingsGoals(
            goals
        );


        refreshEverything();


        return newGoal;
    }


    function updateSavingsGoal(
        id,
        updates
    ) {

        const goals =
            getSavingsGoals();


        const index =
            goals.findIndex(
                goal =>
                    String(goal.id) ===
                    String(id)
            );


        if (index === -1) {
            return null;
        }


        goals[index] =
            normalizeGoal({
                ...goals[index],
                ...(updates || {}),
                id:
                    goals[index].id
            });


        saveSavingsGoals(
            goals
        );


        refreshEverything();


        return goals[index];
    }


    function deleteSavingsGoal(id) {

        const goals =
            getSavingsGoals();


        saveSavingsGoals(
            goals.filter(
                goal =>
                    String(goal.id) !==
                    String(id)
            )
        );


        refreshEverything();

        return true;
    }


    function getGoalProgress(goal) {

        const target =
            Number(goal.target) || 0;


        const current =
            Number(goal.current) || 0;


        if (target <= 0) {
            return 0;
        }


        return Math.min(
            100,
            Math.max(
                0,
                (current / target) * 100
            )
        );
    }


    /* ============================================================
       MONTHLY BUDGET
       ============================================================ */

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
                value.amount || 0
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


        return value;
    }


    function getCategoryBudgets() {

        const data =
            readStorage(
                STORAGE.categoryBudgets,
                {}
            );


        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {
            return {};
        }


        return data;
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


        return budgets;
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

        return getExpenses(
            getTransactions().filter(
                transaction =>
                    isCurrentMonth(
                        transaction.date
                    )
            )
        );
    }


    function getCurrentMonthSpent() {

        return getCurrentMonthExpenses()
            .reduce(
                (sum, transaction) =>
                    sum +
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
                (sum, transaction) =>
                    sum +
                    Number(
                        transaction.amount
                    ),
                0
            );
    }


    /* ============================================================
       RECURRING
       ============================================================ */

    function normalizeRecurring(item) {

        const value =
            item &&
            typeof item === "object"
                ? item
                : {};


        return {
            id:
                String(
                    value.id ||
                    createId("rec")
                ),

            type:
                value.type === "income"
                    ? "income"
                    : "expense",

            amount:
                Math.abs(
                    Number(
                        value.amount || 0
                    ) || 0
                ),

            name:
                String(
                    value.name ||
                    value.description ||
                    "Recurring item"
                ),

            category:
                String(
                    value.category ||
                    "Bills"
                ),

            frequency:
                String(
                    value.frequency ||
                    "monthly"
                ).toLowerCase(),

            nextDate:
                normalizeDate(
                    value.nextDate ||
                    value.date ||
                    todayString()
                ),

            note:
                String(
                    value.note ||
                    ""
                ),

            active:
                value.active !== false,

            createdAt:
                value.createdAt ||
                new Date().toISOString()
        };
    }


    function getRecurringTransactions() {

        const data =
            readStorage(
                STORAGE.recurring,
                []
            );


        if (!Array.isArray(data)) {
            return [];
        }


        return data.map(
            normalizeRecurring
        );
    }


    function saveRecurringTransactions(
        items
    ) {

        const clean =
            Array.isArray(items)
                ? items.map(
                    normalizeRecurring
                )
                : [];


        writeStorage(
            STORAGE.recurring,
            clean
        );


        return clean;
    }


    function addRecurringTransaction(
        item
    ) {

        const items =
            getRecurringTransactions();


        const newItem =
            normalizeRecurring({
                ...item,
                id:
                    createId("rec")
            });


        items.push(
            newItem
        );


        saveRecurringTransactions(
            items
        );


        refreshEverything();


        return newItem;
    }


    function deleteRecurringTransaction(
        id
    ) {

        const items =
            getRecurringTransactions();


        saveRecurringTransactions(
            items.filter(
                item =>
                    String(item.id) !==
                    String(id)
            )
        );


        refreshEverything();

        return true;
    }


    function monthlyRecurringAmount(
        item
    ) {

        const amount =
            Number(item.amount) || 0;


        switch (
            String(
                item.frequency
            ).toLowerCase()
        ) {

            case "weekly":
                return amount * 52 / 12;

            case "yearly":
            case "annual":
                return amount / 12;

            default:
                return amount;
        }
    }


    /* ============================================================
       FINANCIAL HEALTH
       ============================================================ */

    function calculateFinancialHealth() {

        const totals =
            calculateTotals();


        const monthlyBudget =
            getMonthlyBudget();


        const monthlySpent =
            getCurrentMonthSpent();


        const goals =
            getSavingsGoals();


        const recurring =
            getRecurringTransactions()
                .filter(item =>
                    item.active !== false
                );


        let score = 50;


        /*
         * Income / spending factor
         */

        let incomeFactor = 0;


        if (totals.income <= 0) {

            incomeFactor = 8;

        } else {

            const ratio =
                totals.expenses /
                totals.income;


            if (ratio <= 0.5) {
                incomeFactor = 35;
            } else if (ratio <= 0.7) {
                incomeFactor = 30;
            } else if (ratio <= 0.85) {
                incomeFactor = 23;
            } else if (ratio <= 1) {
                incomeFactor = 15;
            } else {
                incomeFactor = 5;
            }
        }


        /*
         * Budget factor
         */

        let budgetFactor = 8;


        if (monthlyBudget > 0) {

            const usage =
                monthlySpent /
                monthlyBudget;


            if (usage <= 0.5) {
                budgetFactor = 25;
            } else if (usage <= 0.75) {
                budgetFactor = 21;
            } else if (usage <= 0.9) {
                budgetFactor = 16;
            } else if (usage <= 1) {
                budgetFactor = 10;
            } else {
                budgetFactor = 3;
            }
        }


        /*
         * Savings factor
         */

        let savingsFactor = 5;


        if (totals.income > 0) {

            const rate =
                totals.savingsRate;


            if (rate >= 30) {
                savingsFactor = 25;
            } else if (rate >= 20) {
                savingsFactor = 22;
            } else if (rate >= 10) {
                savingsFactor = 16;
            } else if (rate > 0) {
                savingsFactor = 10;
            } else {
                savingsFactor = 3;
            }
        }


        /*
         * Recurring factor
         */

        let recurringFactor = 10;


        if (totals.income > 0) {

            const monthlyRecurring =
                recurring.reduce(
                    (sum, item) =>
                        sum +
                        monthlyRecurringAmount(
                            item
                        ),
                    0
                );


            const ratio =
                monthlyRecurring /
                totals.income;


            if (ratio <= 0.15) {
                recurringFactor = 15;
            } else if (ratio <= 0.3) {
                recurringFactor = 12;
            } else if (ratio <= 0.5) {
                recurringFactor = 8;
            } else {
                recurringFactor = 3;
            }
        }


        score =
            incomeFactor +
            budgetFactor +
            savingsFactor +
            recurringFactor;


        score =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(score)
                )
            );


        let status =
            "Needs attention";


        if (score >= 85) {
            status = "Excellent";
        } else if (score >= 70) {
            status = "Strong";
        } else if (score >= 55) {
            status = "Fair";
        }


        let message =
            "Start tracking your money to build a stronger financial picture.";


        if (score >= 85) {

            message =
                "Excellent financial control. Keep protecting your savings and staying consistent.";

        } else if (score >= 70) {

            message =
                "You're building strong financial habits. Keep your spending intentional.";

        } else if (score >= 55) {

            message =
                "You're making progress. Focus on controlling expenses and increasing savings.";

        } else {

            message =
                "Your finances need attention. Start by tracking spending and creating a realistic budget.";

        }


        const insights = [];


        if (totals.income <= 0) {

            insights.push(
                "Add your income so MoneyLeak can measure your financial performance."
            );

        }


        if (
            totals.income > 0 &&
            totals.expenses > totals.income
        ) {

            insights.push(
                "Your spending is currently higher than your recorded income."
            );

        }


        if (
            totals.income > 0 &&
            totals.savingsRate >= 20
        ) {

            insights.push(
                "Your savings rate is strong. Keep protecting that surplus."
            );

        }


        if (
            monthlyBudget > 0 &&
            monthlySpent > monthlyBudget
        ) {

            insights.push(
                "You've exceeded your monthly budget. Review your largest spending categories."
            );

        }


        if (
            goals.length > 0 &&
            goals.some(
                goal =>
                    getGoalProgress(goal) >= 75
            )
        ) {

            insights.push(
                "At least one savings goal is close to completion."
            );

        }


        if (!insights.length) {

            insights.push(
                "Keep recording transactions to unlock deeper MoneyLeak intelligence."
            );

        }


        return {
            score,
            status,
            message,
            incomeFactor,
            budgetFactor,
            savingsFactor,
            recurringFactor,
            insights
        };
    }


    /* ============================================================
       SPENDING ANALYSIS
       ============================================================ */

    function getCategoryBreakdown(
        transactions = getExpenses()
    ) {

        const map = {};


        transactions.forEach(transaction => {

            const category =
                transaction.category ||
                "Other";


            map[category] =
                (
                    map[category] ||
                    0
                ) +
                Number(
                    transaction.amount
                );
        });


        return Object.entries(map)
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
            );
    }


    function getTopSpendingCategories(
        limit = 5
    ) {

        return getCategoryBreakdown()
            .slice(
                0,
                limit
            );
    }


    function getLargestExpense() {

        return getExpenses()
            .sort(
                (a, b) =>
                    b.amount -
                    a.amount
            )[0] || null;
    }


    /* ============================================================
       MONTHLY DATA
       ============================================================ */

    function getMonthlySummary(
        months = 12
    ) {

        const now =
            new Date(
                todayString() +
                "T00:00:00"
            );


        const result = [];


        for (
            let index = months - 1;
            index >= 0;
            index--
        ) {

            const date =
                new Date(now);


            date.setMonth(
                date.getMonth() -
                index
            );


            const key =
                date.getFullYear() +
                "-" +
                pad(
                    date.getMonth() + 1
                );


            let income = 0;
            let expenses = 0;


            getTransactions()
                .filter(
                    transaction =>
                        getMonthKey(
                            transaction.date
                        ) === key
                )
                .forEach(
                    transaction => {

                        if (
                            transaction.type ===
                            "income"
                        ) {
                            income +=
                                transaction.amount;
                        }

                        if (
                            transaction.type ===
                            "expense"
                        ) {
                            expenses +=
                                transaction.amount;
                        }

                    }
                );


            result.push({
                key,
                label:
                    date.toLocaleDateString(
                        undefined,
                        {
                            month: "short"
                        }
                    ),
                income,
                expenses,
                cashFlow:
                    income -
                    expenses
            });
        }


        return result;
    }


    /* ============================================================
       SMART INSIGHTS
       ============================================================ */

    function generateSmartInsights() {

        const totals =
            calculateTotals();


        const insights = [];


        if (
            totals.income === 0 &&
            totals.expenses === 0
        ) {

            insights.push({
                type: "info",
                title: "Start your money story",
                text:
                    "Add your first income or expense and MoneyLeak will begin identifying patterns."
            });

            return insights;
        }


        if (
            totals.expenses >
            totals.income &&
            totals.income > 0
        ) {

            insights.push({
                type: "warning",
                title: "Spending is ahead",
                text:
                    "Your recorded expenses are higher than your recorded income. Review your largest expenses."
            });
        }


        if (
            totals.income > 0 &&
            totals.savingsRate >= 20
        ) {

            insights.push({
                type: "success",
                title: "Strong savings rate",
                text:
                    "You're keeping at least 20% of recorded income after expenses."
            });

        } else if (
            totals.income > 0 &&
            totals.savingsRate > 0
        ) {

            insights.push({
                type: "info",
                title: "Room to save more",
                text:
                    "Your cash flow is positive. Try gradually increasing the amount you keep each month."
            });

        }


        const budget =
            getMonthlyBudget();


        if (budget > 0) {

            const spent =
                getCurrentMonthSpent();


            const percentage =
                (spent / budget) * 100;


            if (percentage >= 100) {

                insights.push({
                    type: "warning",
                    title: "Budget exceeded",
                    text:
                        `You've used ${Math.round(percentage)}% of your monthly budget.`
                });

            } else if (percentage >= 80) {

                insights.push({
                    type: "warning",
                    title: "Budget getting tight",
                    text:
                        `You've used ${Math.round(percentage)}% of your monthly budget.`
                });

            }

        }


        const categories =
            getTopSpendingCategories(1);


        if (categories.length) {

            insights.push({
                type: "info",
                title:
                    `${categories[0].category} is your top category`,
                text:
                    `${formatCurrency(categories[0].amount)} has been recorded in this category.`
            });

        }


        const largest =
            getLargestExpense();


        if (largest) {

            insights.push({
                type: "info",
                title: "Largest expense",
                text:
                    `${largest.description} was your largest recorded expense at ${formatCurrency(largest.amount)}.`
            });

        }


        return insights.slice(
            0,
            6
        );
    }


    /* ============================================================
       ALERTS
       ============================================================ */

    function generateAlerts() {

        const settings =
            getSettings();


        if (
            settings.notifications === false
        ) {
            return [];
        }


        const alerts = [];


        const totals =
            calculateTotals();


        const budget =
            getMonthlyBudget();


        const spent =
            getCurrentMonthSpent();


        if (
            totals.income > 0 &&
            totals.expenses >
            totals.income
        ) {

            alerts.push({
                type: "warning",
                title: "Spending exceeds income",
                text:
                    "Your recorded expenses are currently above your recorded income."
            });
        }


        if (
            budget > 0 &&
            spent > budget
        ) {

            alerts.push({
                type: "warning",
                title: "Monthly budget exceeded",
                text:
                    `${formatCurrency(spent - budget)} above your monthly budget.`
            });

        } else if (
            budget > 0 &&
            spent / budget >= 0.8
        ) {

            alerts.push({
                type: "warning",
                title: "Budget nearly used",
                text:
                    `${Math.round((spent / budget) * 100)}% of your monthly budget has been used.`
            });
        }


        const recurring =
            getRecurringTransactions();


        const upcoming =
            recurring
                .filter(
                    item =>
                        item.active !== false &&
                        daysFromToday(
                            item.nextDate
                        ) >= 0 &&
                        daysFromToday(
                            item.nextDate
                        ) <= 7
                );


        if (upcoming.length) {

            alerts.push({
                type: "info",
                title: "Upcoming recurring payment",
                text:
                    `${upcoming.length} recurring item${upcoming.length === 1 ? "" : "s"} due within 7 days.`
            });
        }


        const goals =
            getSavingsGoals();


        const completed =
            goals.filter(
                goal =>
                    getGoalProgress(goal) >= 100
            );


        if (completed.length) {

            alerts.push({
                type: "success",
                title: "Savings goal completed",
                text:
                    `${completed.length} savings goal${completed.length === 1 ? "" : "s"} reached the target.`
            });
        }


        if (
            totals.income > 0 &&
            totals.savingsRate >= 20
        ) {

            alerts.push({
                type: "success",
                title: "Healthy savings rate",
                text:
                    `You're saving approximately ${Math.round(totals.savingsRate)}% of recorded income.`
            });
        }


        return alerts.slice(
            0,
            8
        );
    }


    /* ============================================================
       NOTIFICATION UI
       ============================================================ */

    function renderNotifications() {

        const list =
            document.getElementById(
                "notificationList"
            );


        if (!list) {
            return;
        }


        const alerts =
            generateAlerts();


        if (!alerts.length) {

            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✓</div>
                    <strong>You're all caught up</strong>
                    <p>No important financial alerts right now.</p>
                </div>
            `;

            return;
        }


        list.innerHTML =
            alerts.map(
                alert => `
                    <div class="notification-item ${escapeHtml(alert.type)}">
                        <div class="notification-item-icon">
                            ${getAlertIcon(alert.type)}
                        </div>

                        <div class="notification-item-content">
                            <strong>
                                ${escapeHtml(alert.title)}
                            </strong>

                            <p>
                                ${escapeHtml(alert.text)}
                            </p>
                        </div>
                    </div>
                `
            ).join("");
    }


    function getAlertIcon(type) {

        if (type === "warning") {
            return "!";
        }

        if (type === "success") {
            return "✓";
        }

        return "i";
    }


    /* ============================================================
       NOTIFICATION CONTROLLER
       ============================================================ */

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


        if (!panel) {
            return;
        }


        function hideNotifications() {

            panel.classList.remove(
                "open",
                "active"
            );


            panel.hidden = true;


            panel.style.display =
                "none";


            panel.setAttribute(
                "aria-hidden",
                "true"
            );


            document.body.classList.remove(
                "notification-open"
            );
        }


        function showNotifications() {

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


            document.body.classList.add(
                "notification-open"
            );


            renderNotifications();
        }


        /*
         * CRITICAL:
         * Notifications ALWAYS begin closed.
         */

        hideNotifications();


        if (button) {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    const isOpen =
                        panel.classList.contains(
                            "open"
                        ) ||
                        panel.classList.contains(
                            "active"
                        );


                    if (isOpen) {
                        hideNotifications();
                    } else {
                        showNotifications();
                    }

                }
            );
        }


        if (close) {

            close.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    hideNotifications();

                }
            );
        }


        panel.addEventListener(
            "click",
            event => {
                event.stopPropagation();
            }
        );


        document.addEventListener(
            "click",
            event => {

                if (
                    !panel.classList.contains(
                        "open"
                    )
                ) {
                    return;
                }


                if (
                    !panel.contains(
                        event.target
                    ) &&
                    (
                        !button ||
                        !button.contains(
                            event.target
                        )
                    )
                ) {

                    hideNotifications();
                }

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {
                    hideNotifications();
                }

            }
        );


        window.closeMoneyLeakNotifications =
            hideNotifications;


        window.openMoneyLeakNotifications =
            showNotifications;
    }


    /* ============================================================
       SEARCH
       ============================================================ */

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
            );


        const input =
            document.getElementById(
                "globalSearch"
            );


        if (!overlay) {
            return;
        }


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


            if (input) {

                setTimeout(
                    () => input.focus(),
                    50
                );

                renderSearchResults(
                    input.value
                );
            }
        }


        hideSearch();


        if (button) {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    showSearch();

                }
            );
        }


        if (close) {

            close.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    hideSearch();

                }
            );
        }


        overlay.addEventListener(
            "click",
            event => {

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
                event => {

                    renderSearchResults(
                        event.target.value
                    );

                }
            );


            input.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Escape"
                    ) {

                        event.preventDefault();

                        hideSearch();
                    }

                }
            );
        }


        document.addEventListener(
            "keydown",
            event => {

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

                    return;
                }


                if (
                    event.key ===
                    "Escape"
                ) {

                    hideSearch();
                }

            }
        );


        window.closeMoneyLeakSearch =
            hideSearch;
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


        const search =
            String(
                query || ""
            )
            .trim()
            .toLowerCase();


        const pages = [
            {
                name: "Dashboard",
                url: "index.html",
                description:
                    "Your financial overview"
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
                    "Track money going out"
            },
            {
                name: "Budgets",
                url: "budgets.html",
                description:
                    "Control monthly spending"
            },
            {
                name: "Savings Goals",
                url: "savings.html",
                description:
                    "Build your financial goals"
            },
            {
                name: "Recurring",
                url: "recurring.html",
                description:
                    "Manage recurring money"
            },
            {
                name: "Analytics",
                url: "analytics.html",
                description:
                    "Understand your financial patterns"
            },
            {
                name: "Settings",
                url: "settings.html",
                description:
                    "Customize MoneyLeak"
            }
        ];


        const transactions =
            getTransactions();


        const pageResults =
            pages.filter(
                page =>
                    !search ||
                    page.name
                        .toLowerCase()
                        .includes(search) ||
                    page.description
                        .toLowerCase()
                        .includes(search)
            );


        const transactionResults =
            search
                ? transactions
                    .filter(
                        transaction =>
                            [
                                transaction.description,
                                transaction.category,
                                transaction.note,
                                transaction.type
                            ]
                            .join(" ")
                            .toLowerCase()
                            .includes(search)
                    )
                    .slice(0, 8)
                : [];


        let html = "";


        if (pageResults.length) {

            html += `
                <div class="search-results-group">
                    <div class="search-results-label">
                        Pages
                    </div>

                    ${pageResults.map(
                        page => `
                            <a
                                class="search-result"
                                href="${page.url}"
                            >
                                <span class="search-result-icon">
                                    →
                                </span>

                                <span>
                                    <strong>
                                        ${escapeHtml(page.name)}
                                    </strong>

                                    <small>
                                        ${escapeHtml(page.description)}
                                    </small>
                                </span>
                            </a>
                        `
                    ).join("")}
                </div>
            `;
        }


        if (transactionResults.length) {

            html += `
                <div class="search-results-group">
                    <div class="search-results-label">
                        Transactions
                    </div>

                    ${transactionResults.map(
                        transaction => `
                            <div class="search-result">
                                <span class="search-result-icon">
                                    ${transaction.type === "income" ? "+" : "−"}
                                </span>

                                <span>
                                    <strong>
                                        ${escapeHtml(transaction.description)}
                                    </strong>

                                    <small>
                                        ${escapeHtml(transaction.category)}
                                        ·
                                        ${formatCurrency(transaction.amount)}
                                        ·
                                        ${formatShortDate(transaction.date)}
                                    </small>
                                </span>
                            </div>
                        `
                    ).join("")}
                </div>
            `;
        }


        if (!html) {

            html = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        ⌕
                    </div>

                    <strong>
                        Nothing found
                    </strong>

                    <p>
                        Try another search.
                    </p>
                </div>
            `;
        }


        container.innerHTML =
            html;
    }


    /* ============================================================
       MOBILE NAVIGATION
       ============================================================ */

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


        if (!button || !sidebar) {
            return;
        }


        function closeMenu() {

            sidebar.classList.remove(
                "mobile-open"
            );


            if (overlay) {

                overlay.classList.remove(
                    "open"
                );

                overlay.style.display =
                    "none";
            }

        }


        function openMenu() {

            sidebar.classList.add(
                "mobile-open"
            );


            if (overlay) {

                overlay.classList.add(
                    "open"
                );

                overlay.style.display =
                    "block";
            }

        }


        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                if (
                    sidebar.classList.contains(
                        "mobile-open"
                    )
                ) {

                    closeMenu();

                } else {

                    openMenu();
                }

            }
        );


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeMenu
            );
        }


        sidebar
            .querySelectorAll("a")
            .forEach(
                link =>
                    link.addEventListener(
                        "click",
                        closeMenu
                    )
            );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {
                    closeMenu();
                }

            }
        );
    }


    /* ============================================================
       ACTIVE NAVIGATION
       ============================================================ */

    function setupActiveNavigation() {

        const current =
            location.pathname
                .split("/")
                .pop() ||
            "index.html";


        document
            .querySelectorAll(
                ".sidebar a"
            )
            .forEach(
                link => {

                    const href =
                        link.getAttribute(
                            "href"
                        );


                    if (
                        href === current
                    ) {

                        link.classList.add(
                            "active"
                        );

                    } else {

                        link.classList.remove(
                            "active"
                        );
                    }

                }
            );
    }


    /* ============================================================
       PERIOD BUTTONS
       ============================================================ */

    function setupPeriodButtons() {

        const buttons =
            document.querySelectorAll(
                "[data-period]"
            );


        if (!buttons.length) {
            return;
        }


        buttons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        buttons.forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                        button.classList.add(
                            "active"
                        );


                        const period =
                            button.dataset.period;


                        window.moneyLeakSelectedPeriod =
                            period;


                        if (
                            typeof window.moneyLeakPageUpdate ===
                            "function"
                        ) {

                            window.moneyLeakPageUpdate(
                                period
                            );
                        }

                    }
                );

            }
        );
    }


    /* ============================================================
       DASHBOARD
       ============================================================ */

    function updateDashboard() {

        const transactions =
            getTransactions();


        const totals =
            calculateTotals(
                transactions
            );


        const currentMonth =
            transactions.filter(
                transaction =>
                    isCurrentMonth(
                        transaction.date
                    )
            );


        const monthTotals =
            calculateTotals(
                currentMonth
            );


        setText(
            "overviewBalance",
            formatCurrency(
                totals.balance
            )
        );


        setText(
            "overviewIncome",
            formatCurrency(
                totals.income
            )
        );


        setText(
            "overviewExpenses",
            formatCurrency(
                totals.expenses
            )
        );


        setText(
            "overviewSavingsRate",
            Math.round(
                totals.savingsRate
            ) + "%"
        );


        updateDashboardGoal();


        updateDashboardBudget();


        updateDashboardHealth();


        updateDashboardCashFlow(
            monthTotals
        );


        renderRecentTransactions();


        renderTopSpending();


        renderDashboardGoals();


        renderDashboardAlerts();


        updateDashboardInsight(
            totals
        );
    }


    function updateDashboardGoal() {

        const goals =
            getSavingsGoals();


        const target =
            goals.reduce(
                (sum, goal) =>
                    sum +
                    goal.target,
                0
            );


        const saved =
            goals.reduce(
                (sum, goal) =>
                    sum +
                    goal.current,
                0
            );


        const progress =
            target > 0
                ? Math.min(
                    100,
                    (saved / target) *
                    100
                )
                : 0;


        setText(
            "overviewGoalProgress",
            Math.round(progress) +
            "%"
        );


        setStyleWidth(
            "overviewGoalFill",
            progress
        );


        setText(
            "overviewGoalStatus",
            goals.length
                ? `${goals.length} active goal${goals.length === 1 ? "" : "s"}`
                : "No goals yet"
        );
    }


    function updateDashboardBudget() {

        const budget =
            getMonthlyBudget();


        const spent =
            getCurrentMonthSpent();


        const percent =
            budget > 0
                ? Math.min(
                    100,
                    (spent / budget) *
                    100
                )
                : 0;


        setText(
            "dashboardBudgetPercent",
            budget > 0
                ? Math.round(percent) +
                  "%"
                : "—"
        );


        setStyleWidth(
            "dashboardBudgetFill",
            percent
        );


        setText(
            "dashboardBudgetSpent",
            formatCurrency(spent)
        );


        setText(
            "dashboardBudgetLimit",
            formatCurrency(budget)
        );


        const remaining =
            budget - spent;


        setText(
            "dashboardBudgetRemaining",
            formatCurrency(
                Math.max(
                    0,
                    remaining
                )
            )
        );


        setText(
            "dashboardBudgetMessage",
            budget <= 0
                ? "Set a monthly budget to start tracking."
                : remaining >= 0
                    ? "You're within your budget."
                    : "Your budget has been exceeded."
        );
    }


    function updateDashboardHealth() {

        const health =
            calculateFinancialHealth();


        setText(
            "overviewHealthScore",
            health.score
        );


        setText(
            "overviewHealthStatus",
            health.status
        );


        setText(
            "healthScore",
            health.score
        );


        setStyleWidth(
            "healthFill",
            health.score
        );


        setText(
            "healthMessage",
            health.message
        );


        setText(
            "healthExplanation",
            health.insights[0] ||
            "Keep tracking your money."
        );


        setText(
            "healthIncomeFactor",
            health.incomeFactor +
            "/35"
        );


        setText(
            "healthBudgetFactor",
            health.budgetFactor +
            "/25"
        );


        setText(
            "healthSavingsFactor",
            health.savingsFactor +
            "/25"
        );


        setText(
            "healthRecurringFactor",
            health.recurringFactor +
            "/15"
        );


        setStyleWidth(
            "healthIncomeBar",
            (health.incomeFactor / 35) *
            100
        );


        setStyleWidth(
            "healthBudgetBar",
            (health.budgetFactor / 25) *
            100
        );


        setStyleWidth(
            "healthSavingsBar",
            (health.savingsFactor / 25) *
            100
        );


        setStyleWidth(
            "healthRecurringBar",
            (health.recurringFactor / 15) *
            100
        );


        setText(
            "healthInsight",
            health.insights.join(" ")
        );
    }


    function updateDashboardCashFlow(
        totals
    ) {

        setText(
            "periodIncome",
            formatCurrency(
                totals.income
            )
        );


        setText(
            "periodExpenses",
            formatCurrency(
                totals.expenses
            )
        );


        setText(
            "periodCashFlow",
            formatCurrency(
                totals.balance
            )
        );


        setText(
            "cashFlowHealth",
            totals.balance >= 0
                ? "Positive cash flow"
                : "Negative cash flow"
        );


        drawCashFlowChart();
    }


    function updateDashboardInsight(
        totals
    ) {

        const element =
            document.getElementById(
                "overviewInsightText"
            );


        if (!element) {
            return;
        }


        let message =
            "Add your first transaction to unlock personalized MoneyLeak insights.";


        if (
            totals.income > 0 &&
            totals.expenses >
            totals.income
        ) {

            message =
                "Your expenses are currently above your recorded income. Review your biggest spending categories.";

        } else if (
            totals.savingsRate >= 20
        ) {

            message =
                "You're keeping a healthy portion of your recorded income. Keep building that financial cushion.";

        } else if (
            totals.income > 0
        ) {

            message =
                "Your cash flow is positive. A clear budget and consistent savings goal can help you keep more of it.";

        }


        element.textContent =
            message;
    }


    /* ============================================================
       RECENT TRANSACTIONS
       ============================================================ */

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
                .sort(
                    (a, b) =>
                        new Date(
                            b.date
                        ) -
                        new Date(
                            a.date
                        )
                )
                .slice(
                    0,
                    8
                );


        if (!transactions.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">₦</div>
                    <strong>No transactions yet</strong>
                    <p>
                        Add income or expenses to see your money activity here.
                    </p>
                </div>
            `;

            return;
        }


        container.innerHTML =
            transactions.map(
                transaction => {

                    const income =
                        transaction.type ===
                        "income";


                    return `
                        <div class="transaction-row">

                            <div class="transaction-icon ${income ? "income" : "expense"}">
                                ${income ? "↗" : "↘"}
                            </div>

                            <div class="transaction-main">

                                <strong>
                                    ${escapeHtml(
                                        transaction.description
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        transaction.category
                                    )}
                                    ·
                                    ${formatShortDate(
                                        transaction.date
                                    )}
                                </span>

                            </div>

                            <div class="transaction-amount ${income ? "income" : "expense"}">
                                ${income ? "+" : "−"}
                                ${formatCurrency(
                                    transaction.amount
                                )}
                            </div>

                        </div>
                    `;
                }
            ).join("");
    }


    /* ============================================================
       TOP SPENDING
       ============================================================ */

    function renderTopSpending() {

        const container =
            document.getElementById(
                "topSpendingCategories"
            );


        if (!container) {
            return;
        }


        const categories =
            getTopSpendingCategories(
                5
            );


        if (!categories.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>No spending data yet</strong>
                    <p>
                        Your top categories will appear here.
                    </p>
                </div>
            `;

            return;
        }


        const total =
            categories.reduce(
                (sum, item) =>
                    sum +
                    item.amount,
                0
            );


        container.innerHTML =
            categories.map(
                item => {

                    const percent =
                        total > 0
                            ? (
                                item.amount /
                                total
                            ) *
                            100
                            : 0;


                    return `
                        <div class="category-row">

                            <div class="category-row-top">

                                <strong>
                                    ${escapeHtml(
                                        item.category
                                    )}
                                </strong>

                                <span>
                                    ${formatCurrency(
                                        item.amount
                                    )}
                                </span>

                            </div>

                            <div class="category-progress">
                                <span
                                    style="width:${Math.min(
                                        100,
                                        percent
                                    )}%"
                                ></span>
                            </div>

                        </div>
                    `;
                }
            ).join("");
    }


    /* ============================================================
       DASHBOARD GOALS
       ============================================================ */

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
                    4
                );


        if (!goals.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>No savings goals yet</strong>
                    <p>
                        Create a goal and start building toward something important.
                    </p>
                </div>
            `;

            return;
        }


        container.innerHTML =
            goals.map(
                goal => {

                    const progress =
                        getGoalProgress(
                            goal
                        );


                    return `
                        <div class="goal-row">

                            <div class="goal-row-top">

                                <div>
                                    <strong>
                                        ${escapeHtml(
                                            goal.name
                                        )}
                                    </strong>

                                    <span>
                                        ${formatCurrency(
                                            goal.current
                                        )}
                                        of
                                        ${formatCurrency(
                                            goal.target
                                        )}
                                    </span>
                                </div>

                                <strong>
                                    ${Math.round(
                                        progress
                                    )}%
                                </strong>

                            </div>

                            <div class="goal-progress">
                                <span
                                    style="width:${progress}%"
                                ></span>
                            </div>

                        </div>
                    `;
                }
            ).join("");
    }


    /* ============================================================
       DASHBOARD ALERTS
       ============================================================ */

    function renderDashboardAlerts() {

        const container =
            document.getElementById(
                "financialAlerts"
            );


        if (!container) {
            return;
        }


        const alerts =
            generateAlerts();


        if (!alerts.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✓</div>
                    <strong>Everything looks clear</strong>
                    <p>
                        MoneyLeak has no urgent financial alerts.
                    </p>
                </div>
            `;

            return;
        }


        container.innerHTML =
            alerts.map(
                alert => `
                    <div class="financial-alert ${escapeHtml(alert.type)}">

                        <div class="financial-alert-icon">
                            ${getAlertIcon(
                                alert.type
                            )}
                        </div>

                        <div>
                            <strong>
                                ${escapeHtml(
                                    alert.title
                                )}
                            </strong>

                            <p>
                                ${escapeHtml(
                                    alert.text
                                )}
                            </p>
                        </div>

                    </div>
                `
            ).join("");
    }


    /* ============================================================
       CASH FLOW CHART
       ============================================================ */

    function drawCashFlowChart() {

        const canvas =
            document.getElementById(
                "cashFlowChart"
            );


        if (!canvas) {
            return;
        }


        const empty =
            document.getElementById(
                "cashFlowEmpty"
            );


        const context =
            canvas.getContext(
                "2d"
            );


        if (!context) {
            return;
        }


        const data =
            getMonthlySummary(
                6
            );


        const hasData =
            data.some(
                item =>
                    item.income > 0 ||
                    item.expenses > 0
            );


        if (
            empty
        ) {
            empty.hidden =
                hasData;
        }


        if (!hasData) {

            context.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            return;
        }


        const rect =
            canvas.getBoundingClientRect();


        const width =
            Math.max(
                320,
                Math.floor(
                    rect.width ||
                    700
                )
            );


        const height =
            280;


        const ratio =
            window.devicePixelRatio ||
            1;


        canvas.width =
            width * ratio;


        canvas.height =
            height * ratio;


        canvas.style.height =
            height + "px";


        context.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );


        context.clearRect(
            0,
            0,
            width,
            height
        );


        const padding = {
            top: 20,
            right: 20,
            bottom: 45,
            left: 55
        };


        const chartWidth =
            width -
            padding.left -
            padding.right;


        const chartHeight =
            height -
            padding.top -
            padding.bottom;


        const maximum =
            Math.max(
                1,
                ...data.map(
                    item =>
                        Math.max(
                            item.income,
                            item.expenses
                        )
                )
            );


        const step =
            chartWidth /
            Math.max(
                1,
                data.length - 1
            );


        /*
         * Grid
         */

        context.font =
            "11px Arial";


        for (
            let index = 0;
            index <= 4;
            index++
        ) {

            const y =
                padding.top +
                (
                    chartHeight /
                    4
                ) *
                index;


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

            context.strokeStyle =
                "#e8efec";

            context.stroke();


            const value =
                maximum -
                (
                    maximum /
                    4
                ) *
                index;


            context.fillStyle =
                "#8a9792";


            context.fillText(
                formatCompactCurrency(
                    value
                ),
                5,
                y + 4
            );
        }


        /*
         * Lines
         */

        drawChartLine(
            context,
            data,
            "income",
            step,
            padding,
            chartHeight,
            maximum,
            width
        );


        drawChartLine(
            context,
            data,
            "expenses",
            step,
            padding,
            chartHeight,
            maximum,
            width
        );


        /*
         * Labels
         */

        data.forEach(
            (item, index) => {

                const x =
                    padding.left +
                    step * index;


                context.fillStyle =
                    "#7f8e88";


                context.textAlign =
                    "center";


                context.fillText(
                    item.label,
                    x,
                    height - 15
                );
            }
        );


        context.textAlign =
            "left";
    }


    function drawChartLine(
        context,
        data,
        field,
        step,
        padding,
        chartHeight,
        maximum
    ) {

        context.beginPath();


        data.forEach(
            (item, index) => {

                const x =
                    padding.left +
                    step * index;


                const y =
                    padding.top +
                    chartHeight -
                    (
                        item[field] /
                        maximum
                    ) *
                    chartHeight;


                if (index === 0) {

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


        context.lineWidth =
            3;


        context.strokeStyle =
            field === "income"
                ? "#07865c"
                : "#e05b62";


        context.stroke();


        /*
         * Dots
         */

        data.forEach(
            (item, index) => {

                const x =
                    padding.left +
                    step * index;


                const y =
                    padding.top +
                    chartHeight -
                    (
                        item[field] /
                        maximum
                    ) *
                    chartHeight;


                context.beginPath();

                context.arc(
                    x,
                    y,
                    4,
                    0,
                    Math.PI * 2
                );


                context.fillStyle =
                    field === "income"
                        ? "#07865c"
                        : "#e05b62";


                context.fill();
            }
        );
    }


    /* ============================================================
       PAGE REFRESH
       ============================================================ */

    function refreshEverything() {

        try {
            applySettings();
        } catch (error) {
            // Continue.
        }


        try {
            updateDashboard();
        } catch (error) {
            // Continue.
        }


        try {

            if (
                typeof window.moneyLeakPageUpdate ===
                "function"
            ) {

                window.moneyLeakPageUpdate(
                    window.moneyLeakSelectedPeriod ||
                    "month"
                );
            }

        } catch (error) {
            // Continue.
        }


        try {
            renderNotifications();
        } catch (error) {
            // Continue.
        }
    }


    /* ============================================================
       GENERAL UI HELPERS
       ============================================================ */

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


    function setStyleWidth(
        id,
        percent
    ) {

        const element =
            document.getElementById(
                id
            );


        if (!element) {
            return;
        }


        const value =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(percent) ||
                    0
                )
            );


        element.style.width =
            value + "%";
    }


    function createId(
        prefix
    ) {

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


    function escapeHtml(value) {

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


    /* ============================================================
       INITIALIZE
       ============================================================ */

    function initialize() {

        /*
         * Initialize storage.
         */

        if (
            !localStorage.getItem(
                STORAGE.settings
            )
        ) {

            writeStorage(
                STORAGE.settings,
                DEFAULT_SETTINGS
            );
        }


        if (
            !localStorage.getItem(
                STORAGE.transactions
            )
        ) {

            writeStorage(
                STORAGE.transactions,
                []
            );
        }


        if (
            !localStorage.getItem(
                STORAGE.savingsGoals
            )
        ) {

            const oldGoal =
                readStorage(
                    STORAGE.savingsGoal,
                    null
                );


            if (oldGoal) {

                writeStorage(
                    STORAGE.savingsGoals,
                    [
                        normalizeGoal(
                            oldGoal
                        )
                    ]
                );

            } else {

                writeStorage(
                    STORAGE.savingsGoals,
                    []
                );
            }
        }


        if (
            !localStorage.getItem(
                STORAGE.recurring
            )
        ) {

            writeStorage(
                STORAGE.recurring,
                []
            );
        }


        /*
         * Apply settings.
         */

        applySettings();


        /*
         * Set active navigation.
         */

        setupActiveNavigation();


        /*
         * Search.
         */

        setupSearch();


        /*
         * Notifications.
         */

        setupNotifications();


        /*
         * Mobile menu.
         */

        setupMobileNavigation();


        /*
         * Period controls.
         */

        setupPeriodButtons();


        /*
         * Dashboard.
         */

        updateDashboard();


        /*
         * Mark initialized.
         */

        writeStorage(
            STORAGE.initialized,
            true
        );
    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    window.MoneyLeak = {

        /* Storage */
        STORAGE,

        /* Settings */
        getSettings,
        saveSettings,
        applySettings,

        /* Categories */
        categories:
            CATEGORIES,

        CATEGORIES,

        /* Transactions */
        getTransactions,
        saveTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,

        /* Totals */
        calculateTotals,
        getIncome,
        getExpenses,

        /* Currency */
        formatCurrency,
        formatCompactCurrency,

        /* Dates */
        todayString,
        normalizeDate,
        formatDate,
        formatShortDate,
        getMonthKey,
        currentMonthKey,
        isCurrentMonth,
        daysBetween,
        daysFromToday,

        /* Periods */
        filterByPeriod,

        /* Savings */
        getSavingsGoals,
        saveSavingsGoals,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        getGoalProgress,

        /* Budgets */
        getMonthlyBudget,
        setMonthlyBudget,
        getCategoryBudgets,
        setCategoryBudget,
        deleteCategoryBudget,
        getCurrentMonthExpenses,
        getCurrentMonthSpent,
        getCategorySpent,

        /* Recurring */
        getRecurringTransactions,
        saveRecurringTransactions,
        addRecurringTransaction,
        deleteRecurringTransaction,
        monthlyRecurringAmount,

        /* Analytics */
        getCategoryBreakdown,
        getTopSpendingCategories,
        getLargestExpense,
        getMonthlySummary,

        /* Intelligence */
        calculateFinancialHealth,
        generateSmartInsights,
        generateAlerts,

        /* UI */
        renderNotifications,
        refresh:
            refreshEverything,

        /* Utility */
        escapeHtml
    };


    /* ============================================================
       GLOBAL HOOKS
       ============================================================ */

    window.moneyLeakPageUpdate =
        window.moneyLeakPageUpdate ||
        null;


    /* ============================================================
       DOM READY
       ============================================================ */

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


    /* ============================================================
       RESIZE
       ============================================================ */

    let resizeTimer = null;


    window.addEventListener(
        "resize",
        () => {

            clearTimeout(
                resizeTimer
            );


            resizeTimer =
                setTimeout(
                    () => {

                        try {
                            drawCashFlowChart();
                        } catch (error) {
                            // Ignore.
                        }

                    },
                    150
                );
        }
    );


})();
