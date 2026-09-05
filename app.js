/* ================================================================
   MONEYLEAK v4.0
   Personal Finance Operating System
   ================================================================ */

(() => {

    "use strict";


    /* ================================================================
       STORAGE
       ================================================================ */

    const KEYS = {

        transactions:
            "moneyLeakTransactions",

        goals:
            "moneyLeakSavingsGoals",

        oldGoal:
            "moneyLeakSavingsGoal",

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

        assistantHistory:
            "moneyLeakAssistantHistory",

        initialized:
            "moneyLeakInitialized"

    };


    /* ================================================================
       DEFAULT SETTINGS
       ================================================================ */

    const DEFAULT_SETTINGS = {

        name:
            "My Money",

        currency:
            "NGN",

        theme:
            "light",

        notifications:
            true,

        compactNumbers:
            false,

        voiceAssistant:
            true,

        voiceRate:
            1,

        voicePitch:
            1

    };


    const CURRENCY_SYMBOLS = {

        NGN: "₦",
        USD: "$",
        GBP: "£",
        EUR: "€",
        CAD: "C$",
        AUD: "A$",
        GHS: "GH₵"

    };


    const EXPENSE_CATEGORIES = [

        "Food",
        "Transport",
        "Housing",
        "Utilities",
        "Shopping",
        "Entertainment",
        "Health",
        "Education",
        "Bills",
        "Subscriptions",
        "Family",
        "Travel",
        "Debt",
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


    /* ================================================================
       BASIC STORAGE HELPERS
       ================================================================ */

    function readStorage(
        key,
        fallback
    ) {

        try {

            const raw =
                localStorage.getItem(
                    key
                );


            if (
                raw === null ||
                raw === ""
            ) {

                return fallback;

            }


            return JSON.parse(
                raw
            );

        } catch (
            error
        ) {

            console.warn(
                "MoneyLeak storage read error:",
                key,
                error
            );


            return fallback;

        }

    }



    function writeStorage(
        key,
        value
    ) {

        try {

            localStorage.setItem(
                key,
                JSON.stringify(
                    value
                )
            );


            return true;

        } catch (
            error
        ) {

            console.error(
                "MoneyLeak storage write error:",
                error
            );


            return false;

        }

    }



    function removeStorage(
        key
    ) {

        try {

            localStorage.removeItem(
                key
            );

        } catch (
            error
        ) {

            console.warn(
                error
            );

        }

    }



    /* ================================================================
       SETTINGS
       ================================================================ */

    function getSettings() {

        const stored =
            readStorage(
                KEYS.settings,
                {}
            );


        return {

            ...DEFAULT_SETTINGS,
            ...stored

        };

    }



    function saveSettings(
        settings
    ) {

        const merged = {

            ...getSettings(),
            ...(settings || {})

        };


        writeStorage(
            KEYS.settings,
            merged
        );


        applySettings();


        emitUpdate();


        return merged;

    }



    function applySettings() {

        const settings =
            getSettings();


        document.documentElement
            .setAttribute(
                "data-theme",
                settings.theme ||
                "light"
            );


        document.body
            ?.classList.toggle(
                "dark-mode",
                settings.theme ===
                "dark"
            );


        document
            .querySelectorAll(
                "[data-money-name]"
            )
            .forEach(
                element => {

                    element.textContent =
                        settings.name ||
                        "My Money";

                }
            );


        document
            .querySelectorAll(
                "[data-money-currency]"
            )
            .forEach(
                element => {

                    element.textContent =
                        getCurrencySymbol();

                }
            );

    }



    function getCurrencySymbol() {

        const settings =
            getSettings();


        return (
            CURRENCY_SYMBOLS[
                settings.currency
            ] ||
            settings.currency ||
            "₦"
        );

    }



    /* ================================================================
       CURRENCY
       ================================================================ */

    function displayCurrency(
        amount
    ) {

        const settings =
            getSettings();


        const numeric =
            Number(
                amount
            ) || 0;


        const symbol =
            CURRENCY_SYMBOLS[
                settings.currency
            ] ||
            "₦";


        let formatted;


        try {

            formatted =
                new Intl.NumberFormat(
                    undefined,
                    {
                        minimumFractionDigits:
                            0,

                        maximumFractionDigits:
                            2
                    }
                ).format(
                    Math.abs(
                        numeric
                    )
                );

        } catch (
            error
        ) {

            formatted =
                Math.abs(
                    numeric
                ).toLocaleString();

        }


        const sign =
            numeric < 0
                ? "-"
                : "";


        return (
            sign +
            symbol +
            formatted
        );

    }



    function compactCurrency(
        amount
    ) {

        const numeric =
            Number(
                amount
            ) || 0;


        const symbol =
            getCurrencySymbol();


        const abs =
            Math.abs(
                numeric
            );


        let value;


        if (
            abs >=
            1000000000
        ) {

            value =
                (
                    abs /
                    1000000000
                ).toFixed(1) +
                "B";

        } else if (
            abs >=
            1000000
        ) {

            value =
                (
                    abs /
                    1000000
                ).toFixed(1) +
                "M";

        } else if (
            abs >=
            1000
        ) {

            value =
                (
                    abs /
                    1000
                ).toFixed(1) +
                "K";

        } else {

            value =
                abs.toFixed(0);

        }


        return (
            numeric < 0
                ? "-"
                : ""
        ) +
        symbol +
        value;

    }



    /* ================================================================
       TRANSACTIONS
       ================================================================ */

    function normalizeTransaction(
        transaction
    ) {

        const item =
            transaction ||
            {};


        const type =
            item.type === "income"
                ? "income"
                : "expense";


        const amount =
            Math.abs(
                Number(
                    item.amount
                ) || 0
            );


        let date =
            item.date ||
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                );


        if (
            date instanceof Date
        ) {

            date =
                date.toISOString()
                    .slice(
                        0,
                        10
                    );

        }


        return {

            id:
                item.id ||
                (
                    "transaction_" +
                    Date.now() +
                    "_" +
                    Math.random()
                        .toString(
                            36
                        )
                        .slice(
                            2,
                            8
                        )
                ),

            type:
                type,

            amount:
                amount,

            category:
                item.category ||
                (
                    type ===
                    "income"
                        ? "Other"
                        : "Other"
                ),

            source:
                item.source ||
                (
                    type ===
                    "income"
                        ? item.category ||
                          "Other"
                        : ""
                ),

            description:
                item.description ||
                "",

            date:
                String(
                    date
                ).slice(
                    0,
                    10
                ),

            createdAt:
                item.createdAt ||
                new Date()
                    .toISOString()

        };

    }



    function getTransactions() {

        const raw =
            readStorage(
                KEYS.transactions,
                []
            );


        if (
            !Array.isArray(
                raw
            )
        ) {

            return [];

        }


        return raw.map(
            normalizeTransaction
        );

    }



    function saveTransactions(
        transactions
    ) {

        writeStorage(
            KEYS.transactions,
            transactions.map(
                normalizeTransaction
            )
        );


        emitUpdate();

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


        return item;

    }



    function updateTransaction(
        id,
        changes
    ) {

        const transactions =
            getTransactions();


        const index =
            transactions.findIndex(
                item =>
                    item.id ===
                    id
            );


        if (
            index ===
            -1
        ) {

            return null;

        }


        transactions[index] =
            normalizeTransaction({

                ...transactions[index],

                ...(changes || {}),

                id:
                    id

            });


        saveTransactions(
            transactions
        );


        return transactions[index];

    }



    function deleteTransaction(
        id
    ) {

        const transactions =
            getTransactions();


        const filtered =
            transactions.filter(
                item =>
                    item.id !==
                    id
            );


        saveTransactions(
            filtered
        );


        return true;

    }



    /* ================================================================
       DATE / PERIOD HELPERS
       ================================================================ */

    function dateOnly(
        value
    ) {

        const date =
            new Date(
                value
            );


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return null;

        }


        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );

    }



    function isSameMonth(
        date,
        year,
        month
    ) {

        const d =
            dateOnly(
                date
            );


        if (!d) {
            return false;
        }


        return (
            d.getFullYear() ===
            year &&
            d.getMonth() ===
            month
        );

    }



    function getPeriodTransactions(
        period
    ) {

        const transactions =
            getTransactions();


        const now =
            new Date();


        if (
            period ===
            "all"
        ) {

            return transactions;

        }


        if (
            period ===
            "year"
        ) {

            return transactions.filter(
                item => {

                    const date =
                        dateOnly(
                            item.date
                        );


                    return (
                        date &&
                        date.getFullYear() ===
                        now.getFullYear()
                    );

                }
            );

        }


        if (
            period ===
            "lastMonth"
        ) {

            const date =
                new Date(
                    now.getFullYear(),
                    now.getMonth() - 1,
                    1
                );


            return transactions.filter(
                item =>
                    isSameMonth(
                        item.date,
                        date.getFullYear(),
                        date.getMonth()
                    )
            );

        }


        return transactions.filter(
            item =>
                isSameMonth(
                    item.date,
                    now.getFullYear(),
                    now.getMonth()
                )
        );

    }



    /* ================================================================
       SAVINGS GOALS
       ================================================================ */

    function normalizeGoal(
        goal
    ) {

        const item =
            goal ||
            {};


        return {

            id:
                item.id ||
                (
                    "goal_" +
                    Date.now() +
                    "_" +
                    Math.random()
                        .toString(
                            36
                        )
                        .slice(
                            2,
                            7
                        )
                ),

            name:
                item.name ||
                "Savings Goal",

            target:
                Number(
                    item.target
                ) || 0,

            current:
                Number(
                    item.current ??
                    item.saved ??
                    0
                ) || 0,

            deadline:
                item.deadline ||
                "",

            color:
                item.color ||
                "",

            description:
                item.description ||
                "",

            createdAt:
                item.createdAt ||
                new Date()
                    .toISOString()

        };

    }



    function getSavingsGoals() {

        let goals =
            readStorage(
                KEYS.goals,
                null
            );


        if (
            !Array.isArray(
                goals
            )
        ) {

            const old =
                readStorage(
                    KEYS.oldGoal,
                    null
                );


            if (
                old &&
                typeof old ===
                "object"
            ) {

                goals = [
                    normalizeGoal(
                        old
                    )
                ];

            } else {

                goals = [];

            }

        }


        goals =
            goals.map(
                normalizeGoal
            );


        writeStorage(
            KEYS.goals,
            goals
        );


        return goals;

    }



    function saveSavingsGoals(
        goals
    ) {

        writeStorage(
            KEYS.goals,
            goals.map(
                normalizeGoal
            )
        );


        emitUpdate();

    }



    function addSavingsGoal(
        goal
    ) {

        const goals =
            getSavingsGoals();


        const item =
            normalizeGoal(
                goal
            );


        goals.push(
            item
        );


        saveSavingsGoals(
            goals
        );


        return item;

    }



    function updateSavingsGoal(
        id,
        changes
    ) {

        const goals =
            getSavingsGoals();


        const index =
            goals.findIndex(
                goal =>
                    goal.id ===
                    id
            );


        if (
            index ===
            -1
        ) {

            return null;

        }


        goals[index] =
            normalizeGoal({

                ...goals[index],

                ...(changes || {}),

                id:
                    id

            });


        saveSavingsGoals(
            goals
        );


        return goals[index];

    }



    function deleteSavingsGoal(
        id
    ) {

        const goals =
            getSavingsGoals()
                .filter(
                    goal =>
                        goal.id !==
                        id
                );


        saveSavingsGoals(
            goals
        );


        return true;

    }



    function goalProgress(
        goal
    ) {

        const target =
            Number(
                goal.target
            ) || 0;


        const current =
            Number(
                goal.current
            ) || 0;


        if (
            target <= 0
        ) {

            return 0;

        }


        return Math.max(
            0,
            Math.min(
                100,
                (
                    current /
                    target
                ) *
                100
            )
        );

    }



    /* ================================================================
       MONTHLY BUDGET
       ================================================================ */

    function getMonthlyBudget() {

        const value =
            readStorage(
                KEYS.monthlyBudget,
                0
            );


        if (
            typeof value ===
            "object"
        ) {

            return Number(
                value.amount ||
                0
            );

        }


        return Number(
            value
        ) || 0;

    }



    function setMonthlyBudget(
        amount
    ) {

        const numeric =
            Math.max(
                0,
                Number(
                    amount
                ) || 0
            );


        writeStorage(
            KEYS.monthlyBudget,
            numeric
        );


        emitUpdate();


        return numeric;

    }



    /* ================================================================
       CATEGORY BUDGETS
       ================================================================ */

    function getCategoryBudgets() {

        const budgets =
            readStorage(
                KEYS.categoryBudgets,
                {}
            );


        return (
            budgets &&
            typeof budgets ===
            "object" &&
            !Array.isArray(
                budgets
            )
        )
            ? budgets
            : {};

    }



    function setCategoryBudget(
        category,
        amount
    ) {

        if (
            !category
        ) {

            return false;

        }


        const budgets =
            getCategoryBudgets();


        const numeric =
            Math.max(
                0,
                Number(
                    amount
                ) || 0
            );


        if (
            numeric ===
            0
        ) {

            delete budgets[
                category
            ];

        } else {

            budgets[
                category
            ] =
                numeric;

        }


        writeStorage(
            KEYS.categoryBudgets,
            budgets
        );


        emitUpdate();


        return true;

    }



    /* ================================================================
       RECURRING
       ================================================================ */

    function normalizeRecurring(
        item
    ) {

        const data =
            item ||
            {};


        return {

            id:
                data.id ||
                (
                    "recurring_" +
                    Date.now() +
                    "_" +
                    Math.random()
                        .toString(
                            36
                        )
                        .slice(
                            2,
                            7
                        )
                ),

            name:
                data.name ||
                "Recurring Item",

            amount:
                Math.abs(
                    Number(
                        data.amount
                    ) || 0
                ),

            type:
                data.type ===
                "income"
                    ? "income"
                    : "expense",

            frequency:
                data.frequency ||
                "monthly",

            nextDate:
                data.nextDate ||
                new Date()
                    .toISOString()
                    .slice(
                        0,
                        10
                    ),

            category:
                data.category ||
                "Other",

            description:
                data.description ||
                "",

            active:
                data.active !==
                false,

            createdAt:
                data.createdAt ||
                new Date()
                    .toISOString()

        };

    }



    function getRecurringTransactions() {

        const items =
            readStorage(
                KEYS.recurring,
                []
            );


        if (
            !Array.isArray(
                items
            )
        ) {

            return [];

        }


        return items.map(
            normalizeRecurring
        );

    }



    function saveRecurringTransactions(
        items
    ) {

        writeStorage(
            KEYS.recurring,
            items.map(
                normalizeRecurring
            )
        );


        emitUpdate();

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
        changes
    ) {

        const items =
            getRecurringTransactions();


        const index =
            items.findIndex(
                item =>
                    item.id ===
                    id
            );


        if (
            index ===
            -1
        ) {

            return null;

        }


        items[index] =
            normalizeRecurring({

                ...items[index],

                ...(changes || {}),

                id:
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
            getRecurringTransactions()
                .filter(
                    item =>
                        item.id !==
                        id
                );


        saveRecurringTransactions(
            items
        );


        return true;

    }



    function recurringMonthlyAmount(
        item
    ) {

        const amount =
            Number(
                item.amount
            ) || 0;


        switch (
            String(
                item.frequency ||
                "monthly"
            ).toLowerCase()
        ) {

            case "daily":
                return (
                    amount *
                    30.4375
                );

            case "weekly":
                return (
                    amount *
                    4.345
                );

            case "yearly":
            case "annual":
                return (
                    amount /
                    12
                );

            default:
                return amount;

        }

    }



    /* ================================================================
       FINANCIAL HEALTH
       ================================================================ */

    function getFinancialHealth() {

        const transactions =
            getTransactions();


        const current =
            getPeriodTransactions(
                "month"
            );


        const income =
            sumType(
                current,
                "income"
            );


        const expenses =
            sumType(
                current,
                "expense"
            );


        const savingsRate =
            income > 0
                ? (
                    (
                        income -
                        expenses
                    ) /
                    income
                ) *
                100
                : 0;


        const budget =
            getMonthlyBudget();


        let score =
            50;


        let incomeFactor =
            0;


        let budgetFactor =
            0;


        let savingsFactor =
            0;


        let recurringFactor =
            0;


        /* Income */

        if (
            income > 0
        ) {

            incomeFactor =
                20;

        }


        /* Savings */

        if (
            savingsRate >=
            30
        ) {

            savingsFactor =
                25;

        } else if (
            savingsRate >=
            20
        ) {

            savingsFactor =
                20;

        } else if (
            savingsRate >=
            10
        ) {

            savingsFactor =
                12;

        } else if (
            savingsRate > 0
        ) {

            savingsFactor =
                6;

        }


        /* Budget */

        if (
            budget > 0
        ) {

            const usage =
                (
                    expenses /
                    budget
                ) *
                100;


            if (
                usage <=
                70
            ) {

                budgetFactor =
                    20;

            } else if (
                usage <=
                85
            ) {

                budgetFactor =
                    15;

            } else if (
                usage <=
                100
            ) {

                budgetFactor =
                    8;

            } else {

                budgetFactor =
                    0;

            }

        } else {

            budgetFactor =
                8;

        }


        /* Recurring */

        const recurring =
            getRecurringTransactions();


        const recurringExpense =
            recurring
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
                        recurringMonthlyAmount(
                            item
                        ),
                    0
                );


        const recurringIncome =
            recurring
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
                        recurringMonthlyAmount(
                            item
                        ),
                    0
                );


        if (
            recurringIncome > 0
        ) {

            const load =
                (
                    recurringExpense /
                    recurringIncome
                ) *
                100;


            if (
                load <
                50
            ) {

                recurringFactor =
                    15;

            } else if (
                load <
                70
            ) {

                recurringFactor =
                    10;

            } else if (
                load <
                85
            ) {

                recurringFactor =
                    5;

            }

        } else {

            recurringFactor =
                5;

        }


        score =
            Math.round(
                Math.max(
                    0,
                    Math.min(
                        100,
                        (
                            score +
                            incomeFactor +
                            budgetFactor +
                            savingsFactor +
                            recurringFactor -
                            20
                        )
                    )
                )
            );


        let status;


        if (
            score >=
            85
        ) {

            status =
                "Excellent";

        } else if (
            score >=
            70
        ) {

            status =
                "Healthy";

        } else if (
            score >=
            50
        ) {

            status =
                "Fair";

        } else {

            status =
                "Needs Attention";

        }


        let message;


        if (
            score >=
            85
        ) {

            message =
                "Your financial system is showing strong signs of stability.";

        } else if (
            score >=
            70
        ) {

            message =
                "Your finances are generally healthy. Consistency can make them stronger.";

        } else if (
            score >=
            50
        ) {

            message =
                "You have a workable foundation, but there are areas that deserve attention.";

        } else {

            message =
                "Your current numbers suggest you should prioritize cash-flow stability and spending control.";

        }


        return {

            score,
            status,
            message,

            income,
            expenses,
            savingsRate,

            factors: {

                income:
                    incomeFactor,

                budget:
                    budgetFactor,

                savings:
                    savingsFactor,

                recurring:
                    recurringFactor

            }

        };

    }



    /* ================================================================
       SAFE TO SPEND
       ================================================================ */

    function getSafeToSpend() {

        const budget =
            getMonthlyBudget();


        const expenses =
            sumType(
                getPeriodTransactions(
                    "month"
                ),
                "expense"
            );


        if (
            budget <=
            0
        ) {

            return {

                amount:
                    null,

                message:
                    "Set a monthly budget to calculate your safe-to-spend amount.",

                advice:
                    "A budget gives MoneyLeak a clear spending boundary."

            };

        }


        const now =
            new Date();


        const daysInMonth =
            new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0
            ).getDate();


        const daysRemaining =
            Math.max(
                1,
                daysInMonth -
                now.getDate() +
                1
            );


        const remaining =
            Math.max(
                0,
                budget -
                expenses
            );


        const daily =
            remaining /
            daysRemaining;


        return {

            amount:
                daily,

            remaining:
                remaining,

            daysRemaining:
                daysRemaining,

            message:
                "You can spend about " +
                displayCurrency(
                    daily
                ) +
                " per day for the rest of the month.",

            advice:
                remaining > 0
                    ? "Keep discretionary spending near or below this pace to stay within your budget."
                    : "Your budget has been fully used. Focus on essential spending until the next month."

        };

    }



    /* ================================================================
       SMART INSIGHT
       ================================================================ */

    function getSmartInsight() {

        const transactions =
            getPeriodTransactions(
                "month"
            );


        const income =
            sumType(
                transactions,
                "income"
            );


        const expenses =
            sumType(
                transactions,
                "expense"
            );


        const cashFlow =
            income -
            expenses;


        if (
            !transactions.length
        ) {

            return {

                title:
                    "Start your money story",

                text:
                    "Add income and expenses so MoneyLeak can discover your financial patterns."

            };

        }


        if (
            income ===
            0 &&
            expenses > 0
        ) {

            return {

                title:
                    "Income missing",

                text:
                    "You have expenses recorded but no income for this month. Add your income to see your real financial position."

            };

        }


        if (
            cashFlow <
            0
        ) {

            return {

                title:
                    "Cash flow needs attention",

                text:
                    "You're spending more than your recorded income this month. Review your largest spending categories."

            };

        }


        const rate =
            income > 0
                ? (
                    cashFlow /
                    income
                ) *
                100
                : 0;


        if (
            rate >=
            30
        ) {

            return {

                title:
                    "Excellent savings potential",

                text:
                    "You're keeping more than 30% of your recorded income after expenses. Protect that surplus by directing it toward your goals."

            };

        }


        if (
            rate >=
            20
        ) {

            return {

                title:
                    "Healthy financial momentum",

                text:
                    "You're maintaining a healthy surplus. Consistency now can make your future finances significantly stronger."

            };

        }


        if (
            rate > 0
        ) {

            return {

                title:
                    "You have room to improve",

                text:
                    "You're generating a surplus, but reducing one or two discretionary categories could increase your savings rate."

            };

        }


        return {

            title:
                "Your money is fully allocated",

            text:
                "Your recorded income is currently being absorbed by expenses. Look for one category you can reduce."

        };

    }



    /* ================================================================
       ALERTS
       ================================================================ */

    function generateAlerts() {

        const alerts =
            [];


        const current =
            getPeriodTransactions(
                "month"
            );


        const income =
            sumType(
                current,
                "income"
            );


        const expenses =
            sumType(
                current,
                "expense"
            );


        const budget =
            getMonthlyBudget();


        if (
            budget > 0
        ) {

            const usage =
                (
                    expenses /
                    budget
                ) *
                100;


            if (
                usage >
                100
            ) {

                alerts.push({

                    type:
                        "danger",

                    title:
                        "Budget exceeded",

                    message:
                        "You've exceeded your monthly budget by " +
                        displayCurrency(
                            expenses -
                            budget
                        )

                });

            } else if (
                usage >=
                90
            ) {

                alerts.push({

                    type:
                        "warning",

                    title:
                        "Budget almost reached",

                    message:
                        "You've used " +
                        usage.toFixed(
                            0
                        ) +
                        "% of your monthly budget."

                });

            }

        }


        if (
            income > 0 &&
            expenses >
            income
        ) {

            alerts.push({

                type:
                    "danger",

                title:
                    "Negative cash flow",

                message:
                    "Your recorded expenses are higher than your income this month."

            });

        }


        const goals =
            getSavingsGoals();


        goals.forEach(
            goal => {

                const progress =
                    goalProgress(
                        goal
                    );


                if (
                    progress >=
                    100
                ) {

                    alerts.push({

                        type:
                            "success",

                        title:
                            "Goal completed",

                        message:
                            goal.name +
                            " has reached its target."

                    });

                }

            }
        );


        const recurring =
            getRecurringTransactions();


        const today =
            new Date();


        recurring.forEach(
            item => {

                const date =
                    dateOnly(
                        item.nextDate
                    );


                if (!date) {
                    return;
                }


                const diff =
                    Math.ceil(
                        (
                            date -
                            dateOnly(
                                today
                            )
                        ) /
                        86400000
                    );


                if (
                    diff >= 0 &&
                    diff <= 3
                ) {

                    alerts.push({

                        type:
                            "info",

                        title:
                            "Upcoming " +
                            (
                                item.type ===
                                "income"
                                    ? "income"
                                    : "payment"
                            ),

                        message:
                            item.name +
                            " · " +
                            displayCurrency(
                                item.amount
                            ) +
                            (
                                diff ===
                                0
                                    ? " is due today."
                                    : " is due in " +
                                      diff +
                                      " day" +
                                      (
                                        diff ===
                                        1
                                            ? ""
                                            : "s"
                                      ) +
                                      "."
                            )

                    });

                }

            }
        );


        if (
            income > 0 &&
            expenses === 0
        ) {

            alerts.push({

                type:
                    "success",

                title:
                    "Great start",

                message:
                    "You've recorded income but no expenses this month yet."

            });

        }


        writeStorage(
            KEYS.alerts,
            alerts
        );


        return alerts;

    }



    function getAlerts() {

        return generateAlerts();

    }



    /* ================================================================
       SEARCH
       ================================================================ */

    function search(
        query
    ) {

        const text =
            String(
                query ||
                ""
            )
            .trim()
            .toLowerCase();


        if (!text) {

            return [];

        }


        const transactions =
            getTransactions();


        return transactions
            .filter(
                item => {

                    const haystack =
                        [
                            item.description,
                            item.category,
                            item.source,
                            item.type,
                            item.date,
                            item.amount
                        ]
                        .join(
                            " "
                        )
                        .toLowerCase();


                    return haystack.includes(
                        text
                    );

                }
            )
            .slice(
                0,
                30
            );

    }



    /* ================================================================
       VOICE ASSISTANT
       ================================================================ */

    let recognition =
        null;


    let listening =
        false;


    let pendingVoiceAction =
        null;



    function speak(
        text
    ) {

        if (
            typeof speechSynthesis ===
            "undefined"
        ) {

            return;

        }


        const settings =
            getSettings();


        speechSynthesis.cancel();


        const utterance =
            new SpeechSynthesisUtterance(
                String(
                    text
                )
            );


        utterance.rate =
            Number(
                settings.voiceRate ||
                1
            );


        utterance.pitch =
            Number(
                settings.voicePitch ||
                1
            );


        speechSynthesis.speak(
            utterance
        );

    }



    function setupVoiceAssistant() {

        if (
            document.getElementById(
                "moneyLeakAssistant"
            )
        ) {

            return;

        }


        const settings =
            getSettings();


        if (
            settings.voiceAssistant ===
            false
        ) {

            return;

        }


        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;


        const assistant =
            document.createElement(
                "div"
            );


        assistant.id =
            "moneyLeakAssistant";


        assistant.innerHTML =
            `
            <button
                id="moneyLeakVoiceButton"
                type="button"
                aria-label="Open MoneyLeak voice assistant"
            >
                🎙️
            </button>

            <div
                id="moneyLeakVoicePanel"
                class="ml-voice-panel"
                hidden
            >

                <div class="ml-voice-header">

                    <strong>
                        MoneyLeak Assistant
                    </strong>

                    <button
                        id="moneyLeakVoiceClose"
                        type="button"
                    >
                        ×
                    </button>

                </div>


                <div
                    id="moneyLeakVoiceStatus"
                    class="ml-voice-status"
                >
                    Ready
                </div>


                <div
                    id="moneyLeakVoiceTranscript"
                    class="ml-voice-transcript"
                >
                    Ask me about your money.
                </div>


                <button
                    id="moneyLeakStartListening"
                    class="ml-voice-listen"
                    type="button"
                >
                    🎙 Start Listening
                </button>


                <div class="ml-voice-examples">

                    <span>
                        Try:
                    </span>

                    <button
                        type="button"
                        data-voice-example="How much did I spend this month?"
                    >
                        Spending this month
                    </button>

                    <button
                        type="button"
                        data-voice-example="What is my financial health?"
                    >
                        Financial health
                    </button>

                    <button
                        type="button"
                        data-voice-example="How much can I safely spend?"
                    >
                        Safe to spend
                    </button>

                </div>

            </div>
            `;


        document.body.appendChild(
            assistant
        );


        const voiceButton =
            document.getElementById(
                "moneyLeakVoiceButton"
            );


        const panel =
            document.getElementById(
                "moneyLeakVoicePanel"
            );


        const closeButton =
            document.getElementById(
                "moneyLeakVoiceClose"
            );


        const listenButton =
            document.getElementById(
                "moneyLeakStartListening"
            );


        const status =
            document.getElementById(
                "moneyLeakVoiceStatus"
            );


        const transcript =
            document.getElementById(
                "moneyLeakVoiceTranscript"
            );


        voiceButton?.addEventListener(
            "click",
            () => {

                if (!panel) {
                    return;
                }


                panel.hidden =
                    !panel.hidden;

            }
        );


        closeButton?.addEventListener(
            "click",
            () => {

                if (panel) {

                    panel.hidden =
                        true;

                }

                stopListening();

            }
        );


        listenButton?.addEventListener(
            "click",
            () => {

                if (!SpeechRecognition) {

                    status.textContent =
                        "Voice recognition is not supported in this browser.";

                    transcript.textContent =
                        "You can still type commands by using the examples or use a supported browser such as Chrome.";

                    return;

                }


                if (listening) {

                    stopListening();

                } else {

                    startListening(
                        SpeechRecognition,
                        status,
                        transcript
                    );

                }

            }
        );


        document
            .querySelectorAll(
                "[data-voice-example]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const command =
                                button.dataset
                                    .voiceExample;


                            transcript.textContent =
                                command;


                            processAssistantCommand(
                                command
                            );

                        }
                    );

                }
            );


        if (
            SpeechRecognition
        ) {

            recognition =
                new SpeechRecognition();


            recognition.continuous =
                false;


            recognition.interimResults =
                false;


            recognition.lang =
                "en-US";


            recognition.onstart =
                () => {

                    listening =
                        true;


                    if (status) {

                        status.textContent =
                            "Listening...";

                    }


                    if (listenButton) {

                        listenButton.textContent =
                            "■ Stop Listening";

                    }

                };


            recognition.onresult =
                event => {

                    const result =
                        event
                            .results
                            ?.[
                                event
                                    .resultIndex
                            ];


                    const text =
                        result
                            ?.[
                                0
                            ]
                            ?.transcript ||
                        "";


                    if (transcript) {

                        transcript.textContent =
                            text;

                    }


                    processAssistantCommand(
                        text
                    );

                };


            recognition.onerror =
                event => {

                    listening =
                        false;


                    if (status) {

                        status.textContent =
                            "Voice error: " +
                            (
                                event.error ||
                                "unknown"
                            );

                    }


                    if (listenButton) {

                        listenButton.textContent =
                            "🎙 Start Listening";

                    }

                };


            recognition.onend =
                () => {

                    listening =
                        false;


                    if (status) {

                        status.textContent =
                            pendingVoiceAction
                                ? "Waiting for confirmation"
                                : "Ready";

                    }


                    if (listenButton) {

                        listenButton.textContent =
                            "🎙 Start Listening";

                    }

                };

        }

    }



    function startListening(
        SpeechRecognition,
        status,
        transcript
    ) {

        if (!recognition) {

            recognition =
                new SpeechRecognition();

        }


        try {

            recognition.start();

        } catch (
            error
        ) {

            console.warn(
                "Speech recognition could not start.",
                error
            );

        }

    }



    function stopListening() {

        if (
            recognition
        ) {

            try {

                recognition.stop();

            } catch (
                error
            ) {}

        }


        listening =
            false;

    }



    /* ================================================================
       VOICE COMMAND PROCESSOR
       ================================================================ */

    function processAssistantCommand(
        rawCommand
    ) {

        const command =
            String(
                rawCommand ||
                ""
            )
            .trim()
            .toLowerCase();


        if (!command) {

            return;

        }


        /* Confirmation */

        if (
            pendingVoiceAction &&
            isConfirmation(
                command
            )
        ) {

            handleVoiceConfirmation(
                true
            );

            return;

        }


        if (
            pendingVoiceAction &&
            isRejection(
                command
            )
        ) {

            handleVoiceConfirmation(
                false
            );

            return;

        }


        /* Navigation */

        const navigation =
            parseNavigation(
                command
            );


        if (
            navigation
        ) {

            speak(
                "Opening " +
                navigation.label
            );


            setTimeout(
                () => {

                    window.location.href =
                        navigation.url;

                },
                250
            );


            return;

        }


        /* Financial health */

        if (
            command.includes(
                "financial health"
            ) ||
            command.includes(
                "health score"
            ) ||
            command.includes(
                "how healthy"
            )
        ) {

            const health =
                getFinancialHealth();


            speak(
                "Your financial health score is " +
                health.score +
                " out of 100. " +
                health.status +
                ". " +
                health.message
            );


            updateVoiceTranscript(
                "Score: " +
                health.score +
                "/100 — " +
                health.status
            );


            return;

        }


        /* Safe to spend */

        if (
            command.includes(
                "safe to spend"
            ) ||
            command.includes(
                "safely spend"
            ) ||
            command.includes(
                "can i spend"
            )
        ) {

            const safe =
                getSafeToSpend();


            if (
                safe.amount ===
                null
            ) {

                speak(
                    safe.message
                );

            } else {

                speak(
                    "Your estimated safe daily spending amount is " +
                    displayCurrency(
                        safe.amount
                    ) +
                    ". " +
                    safe.advice
                );

            }


            updateVoiceTranscript(
                safe.message
            );


            return;

        }


        /* Monthly spending */

        if (
            command.includes(
                "spend this month"
            ) ||
            command.includes(
                "spent this month"
            ) ||
            command.includes(
                "monthly spending"
            )
        ) {

            const expenses =
                sumType(
                    getPeriodTransactions(
                        "month"
                    ),
                    "expense"
                );


            speak(
                "You've spent " +
                displayCurrency(
                    expenses
                ) +
                " this month."
            );


            updateVoiceTranscript(
                "This month's spending: " +
                displayCurrency(
                    expenses
                )
            );


            return;

        }


        /* Monthly income */

        if (
            command.includes(
                "income this month"
            ) ||
            command.includes(
                "made this month"
            ) ||
            command.includes(
                "earned this month"
            )
        ) {

            const income =
                sumType(
                    getPeriodTransactions(
                        "month"
                    ),
                    "income"
                );


            speak(
                "You've recorded " +
                displayCurrency(
                    income
                ) +
                " in income this month."
            );


            updateVoiceTranscript(
                "This month's income: " +
                displayCurrency(
                    income
                )
            );


            return;

        }


        /* Largest expense */

        if (
            command.includes(
                "largest expense"
            ) ||
            command.includes(
                "biggest expense"
            ) ||
            command.includes(
                "most expensive"
            )
        ) {

            const expenses =
                getPeriodTransactions(
                    "month"
                )
                .filter(
                    item =>
                        item.type ===
                        "expense"
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        Number(
                            b.amount
                        ) -
                        Number(
                            a.amount
                        )
                );


            if (
                !expenses.length
            ) {

                speak(
                    "You don't have any expenses recorded this month."
                );

            } else {

                const item =
                    expenses[0];


                speak(
                    "Your largest expense this month is " +
                    displayCurrency(
                        item.amount
                    ) +
                    " for " +
                    (
                        item.description ||
                        item.category ||
                        "an expense"
                    )
                );

            }


            return;

        }


        /* Top category */

        if (
            command.includes(
                "top spending category"
            ) ||
            command.includes(
                "biggest spending category"
            ) ||
            command.includes(
                "where am i spending"
            )
        ) {

            const map =
                {};


            getPeriodTransactions(
                "month"
            )
            .filter(
                item =>
                    item.type ===
                    "expense"
            )
            .forEach(
                item => {

                    const category =
                        item.category ||
                        "Other";


                    map[
                        category
                    ] =
                        (
                            map[
                                category
                            ] ||
                            0
                        ) +
                        Number(
                            item.amount
                        );

                }
            );


            const top =
                Object.entries(
                    map
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        b[1] -
                        a[1]
                )[0];


            if (!top) {

                speak(
                    "You don't have enough expense data yet."
                );

            } else {

                speak(
                    "Your biggest spending category is " +
                    top[0] +
                    " at " +
                    displayCurrency(
                        top[1]
                    )
                );

            }


            return;

        }


        /* Advice */

        if (
            command.includes(
                "give me advice"
            ) ||
            command.includes(
                "financial advice"
            ) ||
            command.includes(
                "what should i do"
            ) ||
            command.includes(
                "help me save"
            )
        ) {

            const insight =
                getSmartInsight();


            speak(
                insight.title +
                ". " +
                insight.text
            );


            updateVoiceTranscript(
                insight.text
            );


            return;

        }


        /* Add expense */

        if (
            command.startsWith(
                "add expense"
            ) ||
            command.startsWith(
                "record expense"
            ) ||
            command.startsWith(
                "log expense"
            )
        ) {

            const amount =
                extractAmount(
                    command
                );


            if (
                !amount
            ) {

                speak(
                    "Tell me the expense amount. For example, add expense 5000 for food."
                );

                return;

            }


            const category =
                detectCategory(
                    command
                );


            const description =
                extractDescription(
                    command,
                    [
                        "add expense",
                        "record expense",
                        "log expense"
                    ]
                );


            pendingVoiceAction = {

                type:
                    "addExpense",

                data: {

                    amount:
                        amount,

                    category:
                        category,

                    description:
                        description ||
                        category

                }

            };


            speak(
                "I can add a " +
                displayCurrency(
                    amount
                ) +
                " expense for " +
                category +
                ". Say yes to confirm."
            );


            updateVoiceTranscript(
                "Confirm: add " +
                displayCurrency(
                    amount
                ) +
                " expense for " +
                category
            );


            return;

        }


        /* Add income */

        if (
            command.startsWith(
                "add income"
            ) ||
            command.startsWith(
                "record income"
            ) ||
            command.startsWith(
                "log income"
            )
        ) {

            const amount =
                extractAmount(
                    command
                );


            if (
                !amount
            ) {

                speak(
                    "Tell me the income amount. For example, add income 200000 salary."
                );

                return;

            }


            const source =
                detectIncomeSource(
                    command
                );


            pendingVoiceAction = {

                type:
                    "addIncome",

                data: {

                    amount:
                        amount,

                    source:
                        source,

                    description:
                        extractDescription(
                            command,
                            [
                                "add income",
                                "record income",
                                "log income"
                            ]
                        ) ||
                        source

                }

            };


            speak(
                "I can add " +
                displayCurrency(
                    amount
                ) +
                " of " +
                source +
                " income. Say yes to confirm."
            );


            updateVoiceTranscript(
                "Confirm: add " +
                displayCurrency(
                    amount
                ) +
                " " +
                source +
                " income"
            );


            return;

        }


        /* Budget */

        if (
            command.includes(
                "set budget"
            ) ||
            command.includes(
                "monthly budget"
            )
        ) {

            const amount =
                extractAmount(
                    command
                );


            if (
                !amount
            ) {

                speak(
                    "Tell me the budget amount."
                );

                return;

            }


            pendingVoiceAction = {

                type:
                    "setBudget",

                data: {

                    amount:
                        amount

                }

            };


            speak(
                "I can set your monthly budget to " +
                displayCurrency(
                    amount
                ) +
                ". Say yes to confirm."
            );


            updateVoiceTranscript(
                "Confirm budget: " +
                displayCurrency(
                    amount
                )
            );


            return;

        }


        /* Savings goal */

        if (
            command.includes(
                "create savings goal"
            ) ||
            command.includes(
                "new savings goal"
            ) ||
            command.includes(
                "add savings goal"
            )
        ) {

            const amount =
                extractAmount(
                    command
                );


            if (
                !amount
            ) {

                speak(
                    "Tell me the target amount."
                );

                return;

            }


            const name =
                extractGoalName(
                    command
                );


            pendingVoiceAction = {

                type:
                    "addGoal",

                data: {

                    name:
                        name,

                    target:
                        amount

                }

            };


            speak(
                "I can create a savings goal called " +
                name +
                " with a target of " +
                displayCurrency(
                    amount
                ) +
                ". Say yes to confirm."
            );


            updateVoiceTranscript(
                "Confirm goal: " +
                name +
                " — " +
                displayCurrency(
                    amount
                )
            );


            return;

        }


        /* Delete last expense */

        if (
            command.includes(
                "delete last expense"
            ) ||
            command.includes(
                "remove last expense"
            )
        ) {

            const latest =
                getPeriodTransactions(
                    "month"
                )
                .filter(
                    item =>
                        item.type ===
                        "expense"
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        new Date(
                            b.createdAt ||
                            b.date
                        ) -
                        new Date(
                            a.createdAt ||
                            a.date
                        )
                )[0];


            if (!latest) {

                speak(
                    "I couldn't find an expense to remove."
                );

                return;

            }


            pendingVoiceAction = {

                type:
                    "deleteTransaction",

                data: {

                    id:
                        latest.id

                }

            };


            speak(
                "I found your latest expense of " +
                displayCurrency(
                    latest.amount
                ) +
                ". Say yes to delete it."
            );


            updateVoiceTranscript(
                "Confirm deletion of " +
                displayCurrency(
                    latest.amount
                )
            );


            return;

        }


        /* Unknown */

        speak(
            "I didn't understand that command. Try asking about your spending, income, financial health, safe-to-spend, or say add expense followed by an amount."
        );


        updateVoiceTranscript(
            "Command not recognized."
        );

    }



    /* ================================================================
       VOICE CONFIRMATION
       ================================================================ */

    function isConfirmation(
        command
    ) {

        return [

            "yes",
            "yeah",
            "yep",
            "confirm",
            "confirmed",
            "do it",
            "go ahead",
            "okay",
            "ok"

        ].includes(
            command
        );

    }



    function isRejection(
        command
    ) {

        return [

            "no",
            "nope",
            "cancel",
            "stop",
            "don't",
            "dont"

        ].includes(
            command
        );

    }



    function handleVoiceConfirmation(
        confirmed
    ) {

        const action =
            pendingVoiceAction;


        pendingVoiceAction =
            null;


        if (!confirmed) {

            speak(
                "Cancelled."
            );


            updateVoiceTranscript(
                "Action cancelled."
            );


            return;

        }


        if (!action) {

            speak(
                "There is nothing waiting for confirmation."
            );


            return;

        }


        switch (
            action.type
        ) {

            case "addExpense": {

                const item =
                    addTransaction({

                        type:
                            "expense",

                        amount:
                            action.data.amount,

                        category:
                            action.data.category,

                        description:
                            action.data.description,

                        date:
                            new Date()
                                .toISOString()
                                .slice(
                                    0,
                                    10
                                )

                    });


                speak(
                    "Done. I added " +
                    displayCurrency(
                        item.amount
                    ) +
                    " to your expenses."
                );


                break;

            }


            case "addIncome": {

                const item =
                    addTransaction({

                        type:
                            "income",

                        amount:
                            action.data.amount,

                        category:
                            action.data.source,

                        source:
                            action.data.source,

                        description:
                            action.data.description,

                        date:
                            new Date()
                                .toISOString()
                                .slice(
                                    0,
                                    10
                                )

                    });


                speak(
                    "Done. I added " +
                    displayCurrency(
                        item.amount
                    ) +
                    " of income."
                );


                break;

            }


            case "setBudget": {

                setMonthlyBudget(
                    action.data.amount
                );


                speak(
                    "Done. Your monthly budget is now " +
                    displayCurrency(
                        action.data.amount
                    ) +
                    "."
                );


                break;

            }


            case "addGoal": {

                addSavingsGoal({

                    name:
                        action.data.name,

                    target:
                        action.data.target,

                    current:
                        0

                });


                speak(
                    "Done. Your " +
                    action.data.name +
                    " savings goal has been created."
                );


                break;

            }


            case "deleteTransaction": {

                deleteTransaction(
                    action.data.id
                );


                speak(
                    "Done. The expense was removed."
                );


                break;

            }


            default:

                speak(
                    "I couldn't complete that action."
                );

        }


        updateVoiceTranscript(
            "Action completed."
        );

    }



    function updateVoiceTranscript(
        text
    ) {

        const element =
            document.getElementById(
                "moneyLeakVoiceTranscript"
            );


        if (element) {

            element.textContent =
                text;

        }

    }



    /* ================================================================
       VOICE PARSERS
       ================================================================ */

    function extractAmount(
        text
    ) {

        const normalized =
            String(
                text
            )
            .toLowerCase()
            .replace(
                /,/g,
                ""
            );


        const matches =
            normalized.match(
                /(?:₦|\$|£|€)?\s*(\d+(?:\.\d+)?)\s*(billion|million|thousand|bn|m|k)?/gi
            );


        if (!matches) {

            return 0;

        }


        for (
            const match of matches
        ) {

            const parsed =
                match.match(
                    /(\d+(?:\.\d+)?)\s*(billion|million|thousand|bn|m|k)?/i
                );


            if (!parsed) {
                continue;
            }


            let amount =
                Number(
                    parsed[1]
                );


            const suffix =
                (
                    parsed[2] ||
                    ""
                )
                .toLowerCase();


            if (
                suffix ===
                "billion" ||
                suffix ===
                "bn"
            ) {

                amount *=
                    1000000000;

            } else if (
                suffix ===
                "million" ||
                suffix ===
                "m"
            ) {

                amount *=
                    1000000;

            } else if (
                suffix ===
                "thousand" ||
                suffix ===
                "k"
            ) {

                amount *=
                    1000;

            }


            if (
                amount >
                0
            ) {

                return amount;

            }

        }


        return 0;

    }



    function detectCategory(
        text
    ) {

        const categories =
            EXPENSE_CATEGORIES;


        const normalized =
            String(
                text
            ).toLowerCase();


        const aliases = {

            food:
                "Food",

            eating:
                "Food",

            restaurant:
                "Food",

            transport:
                "Transport",

            transportation:
                "Transport",

            fuel:
                "Transport",

            petrol:
                "Transport",

            rent:
                "Housing",

            house:
                "Housing",

            housing:
                "Housing",

            utility:
                "Utilities",

            utilities:
                "Utilities",

            electricity:
                "Utilities",

            shopping:
                "Shopping",

            entertainment:
                "Entertainment",

            movie:
                "Entertainment",

            health:
                "Health",

            medical:
                "Health",

            hospital:
                "Health",

            education:
                "Education",

            school:
                "Education",

            subscription:
                "Subscriptions",

            subscriptions:
                "Subscriptions",

            netflix:
                "Subscriptions",

            bill:
                "Bills",

            bills:
                "Bills",

            family:
                "Family",

            travel:
                "Travel",

            debt:
                "Debt"

        };


        for (
            const [
                word,
                category
            ] of Object.entries(
                aliases
            )
        ) {

            if (
                normalized.includes(
                    word
                )
            ) {

                return category;

            }

        }


        return categories[
            categories.length - 1
        ];

    }



    function detectIncomeSource(
        text
    ) {

        const normalized =
            String(
                text
            ).toLowerCase();


        const aliases = {

            salary:
                "Salary",

            job:
                "Salary",

            freelance:
                "Freelance",

            freelancing:
                "Freelance",

            business:
                "Business",

            investment:
                "Investment",

            investments:
                "Investment",

            gift:
                "Gift",

            bonus:
                "Bonus",

            "side hustle":
                "Side Hustle"

        };


        for (
            const [
                word,
                source
            ] of Object.entries(
                aliases
            )
        ) {

            if (
                normalized.includes(
                    word
                )
            ) {

                return source;

            }

        }


        return "Other";

    }



    function extractDescription(
        text,
        prefixes
    ) {

        let result =
            String(
                text
            );


        prefixes.forEach(
            prefix => {

                result =
                    result.replace(
                        new RegExp(
                            "^" +
                            prefix +
                            "\\s*",
                            "i"
                        ),
                        ""
                    );

            }
        );


        result =
            result
                .replace(
                    /₦/g,
                    ""
                )
                .replace(
                    /\$/g,
                    ""
                )
                .replace(
                    /\b\d+(?:\.\d+)?\b/g,
                    ""
                )
                .replace(
                    /\b(thousand|million|billion|k|m|bn)\b/gi,
                    ""
                )
                .trim();


        return result;

    }



    function extractGoalName(
        text
    ) {

        const normalized =
            String(
                text
            );


        const patterns = [

            /goal\s+(?:called|named)\s+(.+?)(?:\s+(?:of|for)\s+\d|$)/i,

            /goal\s+(.+?)(?:\s+(?:of|for)\s+\d|$)/i,

            /savings\s+(?:for|toward)\s+(.+?)(?:\s+(?:of|for)\s+\d|$)/i

        ];


        for (
            const pattern of patterns
        ) {

            const match =
                normalized.match(
                    pattern
                );


            if (
                match &&
                match[1]
            ) {

                return match[1]
                    .trim()
                    .replace(
                        /\s+/g,
                        " "
                    );

            }

        }


        return "New Savings Goal";

    }



    function parseNavigation(
        command
    ) {

        const pages = [

            {
                words: [
                    "dashboard",
                    "home",
                    "overview"
                ],
                url:
                    "index.html",
                label:
                    "dashboard"
            },

            {
                words: [
                    "income",
                    "earnings"
                ],
                url:
                    "income.html",
                label:
                    "income"
            },

            {
                words: [
                    "expenses",
                    "expense",
                    "spending"
                ],
                url:
                    "expenses.html",
                label:
                    "expenses"
            },

            {
                words: [
                    "budget",
                    "budgets"
                ],
                url:
                    "budgets.html",
                label:
                    "budgets"
            },

            {
                words: [
                    "savings",
                    "goals",
                    "savings goals"
                ],
                url:
                    "savings.html",
                label:
                    "savings goals"
            },

            {
                words: [
                    "recurring",
                    "subscriptions",
                    "bills"
                ],
                url:
                    "recurring.html",
                label:
                    "recurring"
            },

            {
                words: [
                    "analytics",
                    "analysis",
                    "reports"
                ],
                url:
                    "analytics.html",
                label:
                    "analytics"
            },

            {
                words: [
                    "settings",
                    "preferences"
                ],
                url:
                    "settings.html",
                label:
                    "settings"
            }

        ];


        for (
            const page of pages
        ) {

            if (
                page.words.some(
                    word =>
                        command.includes(
                            word
                        )
                )
            ) {

                /* Don't hijack financial commands */

                if (
                    command.includes(
                        "add expense"
                    ) ||
                    command.includes(
                        "add income"
                    ) ||
                    command.includes(
                        "set budget"
                    ) ||
                    command.includes(
                        "savings goal"
                    ) ||
                    command.includes(
                        "spending category"
                    )
                ) {

                    continue;

                }


                return page;

            }

        }


        return null;

    }



    /* ================================================================
       SEARCH UI
       ================================================================ */

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


        const results =
            document.getElementById(
                "searchResults"
            );


        if (
            !button ||
            !overlay
        ) {

            return;

        }


        function openSearch() {

            overlay.hidden =
                false;


            overlay.classList.add(
                "open"
            );


            overlay.style.display =
                "flex";


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

        }


        function closeSearch() {

            overlay.classList.remove(
                "open"
            );


            overlay.style.display =
                "none";


            overlay.hidden =
                true;


            overlay.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        button.addEventListener(
            "click",
            openSearch
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
            function () {

                const query =
                    this.value.trim();


                if (
                    !query
                ) {

                    if (results) {

                        results.innerHTML =
                            "<p>Start typing to search.</p>";

                    }


                    return;

                }


                const matches =
                    search(
                        query
                    );


                if (
                    !matches.length
                ) {

                    if (results) {

                        results.innerHTML =
                            "<p>No matching transactions found.</p>";

                    }


                    return;

                }


                if (results) {

                    results.innerHTML =
                        matches
                            .map(
                                item => `
                                <button
                                    type="button"
                                    class="search-result"
                                    data-search-id="${escapeHTML(item.id)}"
                                    style="
                                        display:block;
                                        width:100%;
                                        text-align:left;
                                        padding:12px;
                                        border:0;
                                        border-bottom:1px solid var(--ml-border);
                                        background:transparent;
                                        cursor:pointer;
                                    "
                                >
                                    <strong>
                                        ${escapeHTML(
                                            item.description ||
                                            item.category ||
                                            item.type
                                        )}
                                    </strong>

                                    <small
                                        style="display:block;"
                                    >
                                        ${escapeHTML(
                                            item.category ||
                                            item.type
                                        )}
                                        ·
                                        ${displayCurrency(
                                            item.amount
                                        )}
                                    </small>
                                </button>
                                `
                            )
                            .join("");


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

                    closeSearch();

                }


                if (
                    (
                        event.metaKey ||
                        event.ctrlKey
                    ) &&
                    event.shiftKey &&
                    event.key.toLowerCase() ===
                    "m"
                ) {

                    event.preventDefault();


                    if (
                        overlay.hidden
                    ) {

                        openSearch();

                    } else {

                        closeSearch();

                    }

                }

            }
        );

    }



    /* ================================================================
       NOTIFICATIONS
       ================================================================ */

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


        function render() {

            const settings =
                getSettings();


            if (
                settings.notifications ===
                false
            ) {

                if (list) {

                    list.innerHTML =
                        "<p>Notifications are disabled in Settings.</p>";

                }


                return;

            }


            const alerts =
                getAlerts();


            if (
                !alerts.length
            ) {

                if (list) {

                    list.innerHTML =
                        `
                        <div class="empty-state">
                            You're all caught up.
                        </div>
                        `;

                }


                return;

            }


            if (list) {

                list.innerHTML =
                    alerts
                        .slice(
                            0,
                            10
                        )
                        .map(
                            alert => `
                            <div
                                style="
                                    padding:12px 0;
                                    border-bottom:1px solid var(--ml-border);
                                "
                            >

                                <strong>
                                    ${escapeHTML(
                                        alert.title
                                    )}
                                </strong>

                                <p
                                    style="
                                        margin:4px 0 0;
                                    "
                                >
                                    ${escapeHTML(
                                        alert.message
                                    )}
                                </p>

                            </div>
                            `
                        )
                        .join("");

            }

        }


        button.addEventListener(
            "click",
            () => {

                panel.hidden =
                    !panel.hidden;


                if (
                    !panel.hidden
                ) {

                    render();

                }

            }
        );


        close?.addEventListener(
            "click",
            () => {

                panel.hidden =
                    true;

            }
        );


        render();

    }



    /* ================================================================
       MOBILE NAV
       ================================================================ */

    function setupMobileNavigation() {

        const button =
            document.getElementById(
                "mobileMenuButton"
            );


        const close =
            document.getElementById(
                "mobileMenuClose"
            );


        const overlay =
            document.getElementById(
                "mobileOverlay"
            );


        if (
            !button ||
            !overlay
        ) {

            return;

        }


        button.addEventListener(
            "click",
            () => {

                overlay.classList.add(
                    "open"
                );


                overlay.style.display =
                    "block";

            }
        );


        close?.addEventListener(
            "click",
            () => {

                overlay.classList.remove(
                    "open"
                );


                overlay.style.display =
                    "none";

            }
        );


        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    overlay
                ) {

                    overlay.classList.remove(
                        "open"
                    );


                    overlay.style.display =
                        "none";

                }

            }
        );

    }



    /* ================================================================
       GREETING
       ================================================================ */

    function setupGreeting() {

        const element =
            document.getElementById(
                "dashboardGreeting"
            );


        if (!element) {
            return;
        }


        const name =
            getSettings()
                .name ||
            "there";


        const hour =
            new Date()
                .getHours();


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


        element.textContent =
            greeting +
            ", " +
            name +
            " 👋";

    }



    /* ================================================================
       DASHBOARD
       ================================================================ */

    function updateDashboard() {

        const current =
            getPeriodTransactions(
                "month"
            );


        const previous =
            getPeriodTransactions(
                "lastMonth"
            );


        const income =
            sumType(
                current,
                "income"
            );


        const expenses =
            sumType(
                current,
                "expense"
            );


        const previousIncome =
            sumType(
                previous,
                "income"
            );


        const previousExpenses =
            sumType(
                previous,
                "expense"
            );


        const cashFlow =
            income -
            expenses;


        const savingsRate =
            income > 0
                ? (
                    cashFlow /
                    income
                ) *
                100
                : 0;


        const goals =
            getSavingsGoals();


        const totalTarget =
            goals.reduce(
                (
                    sum,
                    goal
                ) =>
                    sum +
                    Number(
                        goal.target
                    ),
                0
            );


        const totalSaved =
            goals.reduce(
                (
                    sum,
                    goal
                ) =>
                    sum +
                    Number(
                        goal.current
                    ),
                0
            );


        const goalProgress =
            totalTarget > 0
                ? (
                    totalSaved /
                    totalTarget
                ) *
                100
                : 0;


        const health =
            getFinancialHealth();


        const budget =
            getMonthlyBudget();


        const budgetRemaining =
            Math.max(
                0,
                budget -
                expenses
            );


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
            Math.max(
                0,
                savingsRate
            ).toFixed(
                1
            ) +
            "%"
        );


        setText(
            "overviewGoalProgress",
            Math.min(
                100,
                goalProgress
            ).toFixed(
                0
            ) +
            "%"
        );


        setStyleWidth(
            "overviewGoalFill",
            goalProgress
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


        setText(
            "cashFlowHealth",
            cashFlow >= 0
                ? "Positive cash flow"
                : "Negative cash flow"
        );


        setText(
            "overviewInsightText",
            getSmartInsight().text
        );


        const budgetPercentage =
            budget > 0
                ? (
                    expenses /
                    budget
                ) *
                100
                : 0;


        setText(
            "dashboardBudgetPercent",
            budgetPercentage.toFixed(
                1
            ) +
            "%"
        );


        setStyleWidth(
            "dashboardBudgetFill",
            budgetPercentage
        );


        setText(
            "dashboardBudgetSpent",
            displayCurrency(
                expenses
            )
        );


        setText(
            "dashboardBudgetRemaining",
            displayCurrency(
                budgetRemaining
            )
        );


        setText(
            "dashboardBudgetLimit",
            displayCurrency(
                budget
            )
        );


        const safe =
            getSafeToSpend();


        setText(
            "safeToSpendDashboard",
            safe.amount ===
            null
                ? "—"
                : displayCurrency(
                    safe.amount
                )
        );


        setText(
            "safeToSpendMessage",
            safe.message
        );


        setText(
            "safeToSpendAdvice",
            safe.advice
        );


        renderRecentTransactions(
            current
        );


        renderTopSpending(
            current
        );


        renderDashboardGoals(
            goals
        );


        renderDashboardAlerts();


        renderHealthDetails(
            health
        );


        setText(
            "periodIncomeChange",
            comparisonText(
                income,
                previousIncome,
                "income"
            )
        );


        setText(
            "periodExpensesChange",
            comparisonText(
                expenses,
                previousExpenses,
                "expense"
            )
        );

    }



    function renderRecentTransactions(
        transactions
    ) {

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
                        new Date(
                            b.createdAt ||
                            b.date
                        ) -
                        new Date(
                            a.createdAt ||
                            a.date
                        )
                )
                .slice(
                    0,
                    6
                );


        if (!recent.length) {

            container.innerHTML =
                `
                <div class="empty-state">
                    No transactions yet.
                </div>
                `;

            return;

        }


        container.innerHTML =
            recent
                .map(
                    item => `
                    <div
                        class="transaction-row"
                        style="
                            display:flex;
                            justify-content:space-between;
                            gap:15px;
                            padding:13px 0;
                            border-bottom:1px solid var(--ml-border);
                        "
                    >

                        <div>

                            <strong>
                                ${escapeHTML(
                                    item.description ||
                                    item.category ||
                                    "Transaction"
                                )}
                            </strong>

                            <small
                                class="text-muted"
                                style="display:block;"
                            >
                                ${escapeHTML(
                                    item.category ||
                                    item.type
                                )}
                            </small>

                        </div>


                        <strong>
                            ${
                                item.type ===
                                "income"
                                    ? "+"
                                    : "-"
                            }${displayCurrency(
                                item.amount
                            )}
                        </strong>

                    </div>
                    `
                )
                .join("");

    }



    function renderTopSpending(
        transactions
    ) {

        const container =
            document.getElementById(
                "topSpendingCategories"
            );


        if (!container) {
            return;
        }


        const map =
            {};


        transactions
            .filter(
                item =>
                    item.type ===
                    "expense"
            )
            .forEach(
                item => {

                    const category =
                        item.category ||
                        "Other";


                    map[
                        category
                    ] =
                        (
                            map[
                                category
                            ] ||
                            0
                        ) +
                        Number(
                            item.amount
                        );

                }
            );


        const categories =
            Object.entries(
                map
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


        if (!categories.length) {

            container.innerHTML =
                `
                <div class="empty-state">
                    No spending data yet.
                </div>
                `;

            return;

        }


        const total =
            categories.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    item[1],
                0
            );


        container.innerHTML =
            categories
                .map(
                    item => {

                        const percentage =
                            total > 0
                                ? (
                                    item[1] /
                                    total
                                ) *
                                100
                                : 0;


                        return `
                        <div
                            style="
                                padding:10px 0;
                            "
                        >

                            <div
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    gap:10px;
                                "
                            >

                                <strong>
                                    ${escapeHTML(
                                        item[0]
                                    )}
                                </strong>

                                <span>
                                    ${displayCurrency(
                                        item[1]
                                    )}
                                </span>

                            </div>


                            <div
                                class="progress-bar"
                                style="margin-top:6px;"
                            >

                                <span
                                    style="
                                        width:${percentage}%;
                                    "
                                ></span>

                            </div>

                        </div>
                        `;

                    }
                )
                .join("");

    }



    function renderDashboardGoals(
        goals
    ) {

        const container =
            document.getElementById(
                "dashboardGoals"
            );


        if (!container) {
            return;
        }


        if (!goals.length) {

            container.innerHTML =
                `
                <div class="empty-state">
                    No savings goals yet.
                    <a href="savings.html">
                        Create your first goal.
                    </a>
                </div>
                `;

            return;

        }


        container.innerHTML =
            goals
                .slice(
                    0,
                    4
                )
                .map(
                    goal => {

                        const progress =
                            goalProgress(
                                goal
                            );


                        return `
                        <div
                            style="
                                padding:12px 0;
                                border-bottom:1px solid var(--ml-border);
                            "
                        >

                            <div
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    gap:10px;
                                "
                            >

                                <strong>
                                    ${escapeHTML(
                                        goal.name
                                    )}
                                </strong>

                                <strong>
                                    ${progress.toFixed(
                                        0
                                    )}%
                                </strong>

                            </div>


                            <div
                                class="progress-bar"
                                style="margin-top:7px;"
                            >

                                <span
                                    style="
                                        width:${progress}%;
                                    "
                                ></span>

                            </div>


                            <small
                                class="text-muted"
                            >
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
            getAlerts();


        if (!alerts.length) {

            container.innerHTML =
                `
                <div class="empty-state">
                    ✓ No urgent financial alerts.
                </div>
                `;

            return;

        }


        container.innerHTML =
            alerts
                .slice(
                    0,
                    5
                )
                .map(
                    alert => `
                    <div
                        style="
                            padding:12px 0;
                            border-bottom:1px solid var(--ml-border);
                        "
                    >

                        <strong>
                            ${escapeHTML(
                                alert.title
                            )}
                        </strong>

                        <p
                            style="
                                margin:4px 0 0;
                            "
                        >
                            ${escapeHTML(
                                alert.message
                            )}
                        </p>

                    </div>
                    `
                )
                .join("");

    }



    function renderHealthDetails(
        health
    ) {

        setText(
            "healthScore",
            health.score
        );


        setText(
            "healthFill",
            ""
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
            health.status
        );


        const factors =
            health.factors ||
            {};


        setText(
            "healthIncomeFactor",
            factors.income +
            "/20"
        );


        setText(
            "healthBudgetFactor",
            factors.budget +
            "/20"
        );


        setText(
            "healthSavingsFactor",
            factors.savings +
            "/25"
        );


        setText(
            "healthRecurringFactor",
            factors.recurring +
            "/15"
        );


        setStyleWidth(
            "healthIncomeBar",
            (
                factors.income /
                20
            ) *
            100
        );


        setStyleWidth(
            "healthBudgetBar",
            (
                factors.budget /
                20
            ) *
            100
        );


        setStyleWidth(
            "healthSavingsBar",
            (
                factors.savings /
                25
            ) *
            100
        );


        setStyleWidth(
            "healthRecurringBar",
            (
                factors.recurring /
                15
            ) *
            100
        );


        setText(
            "healthInsight",
            health.message
        );

    }



    /* ================================================================
       UTILITY
       ================================================================ */

    function sumType(
        transactions,
        type
    ) {

        return (
            transactions || []
        )
        .filter(
            item =>
                item.type ===
                type
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

    }



    function comparisonText(
        current,
        previous,
        type
    ) {

        if (
            previous ===
            0
        ) {

            return "No previous data";

        }


        const change =
            (
                (
                    current -
                    previous
                ) /
                previous
            ) *
            100;


        const arrow =
            type ===
            "expense"
                ? (
                    change <=
                    0
                        ? "↓ "
                        : "↑ "
                )
                : (
                    change >=
                    0
                        ? "↑ "
                        : "↓ "
                );


        return (
            arrow +
            Math.abs(
                change
            ).toFixed(
                1
            ) +
            "% vs previous"
        );

    }



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
        percentage
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.style.width =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            percentage
                        ) || 0
                    )
                ) +
                "%";

        }

    }



    function escapeHTML(
        value
    ) {

        return String(
            value ??
            ""
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



    /* ================================================================
       UPDATE EVENT
       ================================================================ */

    function emitUpdate() {

        window.dispatchEvent(
            new CustomEvent(
                "moneyLeakUpdated",
                {
                    detail: {
                        timestamp:
                            Date.now()
                    }
                }
            )
        );

    }



    /* ================================================================
       INITIALIZE
       ================================================================ */

    function initialize() {

        applySettings();


        setupSearch();


        setupNotifications();


        setupMobileNavigation();


        setupGreeting();


        setupVoiceAssistant();


        updateDashboard();


        generateAlerts();


        writeStorage(
            KEYS.initialized,
            true
        );

    }



    /* ================================================================
       PUBLIC MONEY LEAK API
       ================================================================ */

    window.MoneyLeak = {

        version:
            "4.0",

        /* Settings */

        getSettings,
        saveSettings,
        applySettings,
        getCurrencySymbol,

        /* Currency */

        displayCurrency,
        compactCurrency,

        /* Transactions */

        getTransactions,
        saveTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,

        /* Period */

        getPeriodTransactions,

        /* Goals */

        getSavingsGoals,
        saveSavingsGoals,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        goalProgress,

        /* Budgets */

        getMonthlyBudget,
        setMonthlyBudget,
        getCategoryBudgets,
        setCategoryBudget,

        /* Recurring */

        getRecurringTransactions,
        saveRecurringTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        recurringMonthlyAmount,

        /* Intelligence */

        getFinancialHealth,
        getSafeToSpend,
        getSmartInsight,

        /* Alerts */

        getAlerts,
        generateAlerts,

        /* Search */

        search,

        /* Voice */

        speak,
        processAssistantCommand,

        /* Dashboard */

        updateDashboard,

        /* Utilities */

        emitUpdate

    };



    /* ================================================================
       START
       ================================================================ */

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
