/* =========================================================
   MONEYLEAK — MAIN APPLICATION
   Complete application JavaScript
========================================================= */


/* =========================================================
   STORAGE KEYS
========================================================= */

const TRANSACTIONS_STORAGE_KEY =
    "moneyLeakTransactions";

const SAVINGS_STORAGE_KEY =
    "moneyLeakSavingsGoal";

const BUDGET_STORAGE_KEY =
    "moneyLeakMonthlyBudget";

const CATEGORY_BUDGET_STORAGE_KEY =
    "moneyLeakCategoryBudgets";

const RECURRING_STORAGE_KEY =
    "moneyLeakRecurringTransactions";


/* =========================================================
   GLOBAL DATA
========================================================= */

let transactions =
    loadTransactions();

let savingsGoal =
    loadSavingsGoal();

let monthlyBudget =
    loadMonthlyBudget();

let categoryBudgets =
    loadCategoryBudgets();

let recurringTransactions =
    loadRecurringTransactions();


/* =========================================================
   CATEGORY CONFIGURATION
========================================================= */

const categoryBudgetFields = {

    Food:
        "budgetFood",

    Transport:
        "budgetTransport",

    Bills:
        "budgetBills",

    Shopping:
        "budgetShopping",

    Entertainment:
        "budgetEntertainment",

    Health:
        "budgetHealth",

    Education:
        "budgetEducation",

    Other:
        "budgetOther"

};


/* =========================================================
   BASIC HELPERS
========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


function formatMoney(amount) {

    const value =
        Number(amount) || 0;

    return "₦" +
        value.toLocaleString(
            "en-NG",
            {
                maximumFractionDigits: 0
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


function getToday() {

    return new Date()
        .toISOString()
        .split("T")[0];

}


function getCurrentMonthKey() {

    const date =
        new Date();

    return (
        date.getFullYear() +
        "-" +
        String(
            date.getMonth() + 1
        ).padStart(2, "0")
    );

}


/* =========================================================
   TRANSACTIONS
========================================================= */

function loadTransactions() {

    const saved =
        localStorage.getItem(
            TRANSACTIONS_STORAGE_KEY
        );

    if (!saved) {
        return [];
    }

    try {

        const parsed =
            JSON.parse(saved);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "Could not load transactions:",
            error
        );

        return [];
    }

}


function saveTransactions() {

    localStorage.setItem(
        TRANSACTIONS_STORAGE_KEY,
        JSON.stringify(transactions)
    );

}


/* =========================================================
   ADD TRANSACTION
========================================================= */

function addTransaction() {

    const amountInput =
        getElement("amount");

    const typeInput =
        getElement("type");

    const categoryInput =
        getElement("category");

    if (
        !amountInput ||
        !typeInput ||
        !categoryInput
    ) {

        return;

    }


    const amount =
        Number(
            amountInput.value
        );

    const type =
        typeInput.value;

    const category =
        categoryInput.value;


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "Please enter a valid amount."
        );

        amountInput.focus();

        return;
    }


    if (
        type !== "income" &&
        type !== "expense"
    ) {

        alert(
            "Please select income or expense."
        );

        return;
    }


    const transaction = {

        id:
            Date.now().toString() +
            Math.random()
                .toString(36)
                .substring(2, 7),

        amount:
            amount,

        type:
            type,

        category:
            category || "Other",

        date:
            new Date().toISOString()

    };


    transactions.unshift(
        transaction
    );


    saveTransactions();

    amountInput.value = "";

    updateDashboard();

    updateBudgetDisplay();

    refreshCategoryBudgets();

    updateSpendingAnalytics();

    showTransactionSuccess();

}


function showTransactionSuccess() {

    const form =
        getElement(
            "transactionForm"
        );

    if (!form) {
        return;
    }


    let message =
        getElement(
            "transactionSuccess"
        );


    if (!message) {

        message =
            document.createElement(
                "div"
            );

        message.id =
            "transactionSuccess";

        message.style.marginTop =
            "12px";

        message.style.padding =
            "10px 14px";

        message.style.borderRadius =
            "10px";

        message.style.background =
            "#e9f8ef";

        message.style.color =
            "#11643d";

        message.style.fontWeight =
            "700";

        form.appendChild(
            message
        );
    }


    message.textContent =
        "✓ Transaction added successfully.";

    setTimeout(
        function () {

            if (message) {
                message.textContent = "";
            }

        },
        2500
    );

}


/* =========================================================
   TOTALS
========================================================= */

function calculateTotals() {

    let income = 0;

    let expenses = 0;


    transactions.forEach(
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

            } else if (
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


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {

    const totals =
        calculateTotals();


    const balanceElement =
        getElement("balance");

    const incomeElement =
        getElement("income");

    const expensesElement =
        getElement("expenses");


    if (balanceElement) {

        balanceElement.textContent =
            formatMoney(
                totals.balance
            );

    }


    if (incomeElement) {

        incomeElement.textContent =
            formatMoney(
                totals.income
            );

    }


    if (expensesElement) {

        expensesElement.textContent =
            formatMoney(
                totals.expenses
            );

    }


    updateMoneyHealth(
        totals.income,
        totals.expenses
    );


    displayTransactions();

    detectMoneyLeak();

    updateSpendingChart();

    updateSpendingBreakdown();

    updateSpendingAnalytics();

    updateSavingsProgress();

    updateSavingsDisplay();

    updateBudgetDisplay();

    refreshCategoryBudgets();

}


/* =========================================================
   FINANCIAL HEALTH SCORE 2.0
========================================================= */

function updateMoneyHealth(
    income,
    expenses
) {

    const scoreElement =
        getElement(
            "healthScore"
        );

    const fillElement =
        getElement(
            "healthFill"
        );

    const messageElement =
        getElement(
            "healthMessage"
        );

    const explanationElement =
        getElement(
            "healthExplanation"
        );

    const iconElement =
        getElement(
            "healthIcon"
        );

    const incomeFactorElement =
        getElement(
            "healthIncomeFactor"
        );

    const budgetFactorElement =
        getElement(
            "healthBudgetFactor"
        );

    const savingsFactorElement =
        getElement(
            "healthSavingsFactor"
        );

    const recurringFactorElement =
        getElement(
            "healthRecurringFactor"
        );

    const insightElement =
        getElement(
            "healthInsight"
        );


    if (
        !scoreElement ||
        !fillElement
    ) {

        return;

    }


    income =
        Number(income) || 0;

    expenses =
        Number(expenses) || 0;


    /* =========================
       INCOME VS SPENDING
    ========================= */

    let incomeScore = 0;

    let incomeText =
        "No income recorded";


    if (income > 0) {

        const ratio =
            expenses / income;


        if (ratio <= 0.50) {

            incomeScore = 100;
            incomeText =
                "Excellent";

        } else if (ratio <= 0.70) {

            incomeScore = 85;
            incomeText =
                "Healthy";

        } else if (ratio <= 0.85) {

            incomeScore = 70;
            incomeText =
                "Watch spending";

        } else if (ratio <= 1) {

            incomeScore = 50;
            incomeText =
                "Very tight";

        } else if (ratio <= 1.25) {

            incomeScore = 30;
            incomeText =
                "Overspending";

        } else {

            incomeScore = 10;
            incomeText =
                "Critical";

        }

    }


    /* =========================
       MONTHLY BUDGET
    ========================= */

    const currentMonthExpenses =
        getCurrentMonthExpenses();


    let budgetScore = 70;

    let budgetText =
        "No budget set";


    const budgetAmount =
        Number(
            monthlyBudget
        ) || 0;


    if (budgetAmount > 0) {

        const usage =
            currentMonthExpenses /
            budgetAmount;


        if (usage <= 0.50) {

            budgetScore = 100;
            budgetText =
                "Excellent";

        } else if (usage <= 0.80) {

            budgetScore = 85;
            budgetText =
                "On track";

        } else if (usage <= 1) {

            budgetScore = 65;
            budgetText =
                "Near limit";

        } else if (usage <= 1.20) {

            budgetScore = 35;
            budgetText =
                "Over budget";

        } else {

            budgetScore = 10;
            budgetText =
                "Far over budget";

        }

    }


    /* =========================
       SAVINGS
    ========================= */

    let savingsScore = 50;

    let savingsText =
        "No savings goal";


    if (
        savingsGoal &&
        typeof savingsGoal ===
        "object"
    ) {

        const target =
            Number(
                savingsGoal.targetAmount
            ) || 0;

        const saved =
            Number(
                savingsGoal.currentSavings
            ) || 0;


        if (target > 0) {

            const percentage =
                Math.min(
                    100,
                    Math.max(
                        0,
                        (
                            saved /
                            target
                        ) * 100
                    )
                );


            savingsScore =
                Math.round(
                    percentage
                );


            if (
                percentage >= 100
            ) {

                savingsText =
                    "Goal reached";

            } else if (
                percentage >= 75
            ) {

                savingsText =
                    "Excellent";

            } else if (
                percentage >= 50
            ) {

                savingsText =
                    "Good progress";

            } else if (
                percentage >= 25
            ) {

                savingsText =
                    "Getting started";

            } else {

                savingsText =
                    "Needs attention";

            }

        }

    }


    /* =========================
       RECURRING EXPENSES
    ========================= */

    let recurringScore = 70;

    let recurringText =
        "No recurring expenses";


    let monthlyRecurringExpenses =
        0;


    if (
        Array.isArray(
            recurringTransactions
        )
    ) {

        recurringTransactions.forEach(
            recurring => {

                if (
                    recurring.type !==
                    "expense"
                ) {

                    return;

                }


                const amount =
                    Number(
                        recurring.amount
                    ) || 0;


                if (
                    recurring.frequency ===
                    "weekly"
                ) {

                    monthlyRecurringExpenses +=
                        amount * 52 / 12;

                } else if (
                    recurring.frequency ===
                    "yearly"
                ) {

                    monthlyRecurringExpenses +=
                        amount / 12;

                } else {

                    monthlyRecurringExpenses +=
                        amount;

                }

            }
        );

    }


    if (
        monthlyRecurringExpenses > 0
    ) {

        if (income > 0) {

            const ratio =
                monthlyRecurringExpenses /
                income;


            if (ratio <= 0.10) {

                recurringScore = 100;
                recurringText =
                    "Excellent";

            } else if (ratio <= 0.20) {

                recurringScore = 85;
                recurringText =
                    "Healthy";

            } else if (ratio <= 0.30) {

                recurringScore = 65;
                recurringText =
                    "Moderate";

            } else if (ratio <= 0.40) {

                recurringScore = 40;
                recurringText =
                    "High";

            } else {

                recurringScore = 15;
                recurringText =
                    "Very high";

            }

        } else {

            recurringScore = 30;

            recurringText =
                "Income needed";

        }

    }


    /* =========================
       OVERALL SCORE
    ========================= */

    const score =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    (
                        incomeScore * 0.35 +
                        budgetScore * 0.25 +
                        savingsScore * 0.25 +
                        recurringScore * 0.15
                    )
                )
            )
        );


    scoreElement.textContent =
        `${score} / 100`;


    fillElement.style.width =
        `${score}%`;


    /* =========================
       FACTORS
    ========================= */

    if (
        incomeFactorElement
    ) {

        incomeFactorElement.textContent =
            incomeText;

    }


    if (
        budgetFactorElement
    ) {

        budgetFactorElement.textContent =
            budgetText;

    }


    if (
        savingsFactorElement
    ) {

        savingsFactorElement.textContent =
            savingsText;

    }


    if (
        recurringFactorElement
    ) {

        recurringFactorElement.textContent =
            recurringText;

    }


    /* =========================
       CARD STATE
    ========================= */

    const healthCard =
        document.querySelector(
            ".health-score-card"
        );


    if (healthCard) {

        healthCard.classList.remove(
            "health-good",
            "health-warning",
            "health-danger"
        );


        if (score >= 75) {

            healthCard.classList.add(
                "health-good"
            );

        } else if (score >= 50) {

            healthCard.classList.add(
                "health-warning"
            );

        } else {

            healthCard.classList.add(
                "health-danger"
            );

        }

    }


    /* =========================
       MESSAGE
    ========================= */

    if (
        score >= 85
    ) {

        if (messageElement) {

            messageElement.textContent =
                "Excellent financial health!";

        }


        if (explanationElement) {

            explanationElement.textContent =
                "Your money habits are strong. Keep controlling unnecessary spending and growing your savings.";

        }


        if (iconElement) {

            iconElement.textContent =
                "💚";

        }

    } else if (
        score >= 75
    ) {

        if (messageElement) {

            messageElement.textContent =
                "Your finances are looking healthy.";

        }


        if (explanationElement) {

            explanationElement.textContent =
                "You have a solid financial foundation. Keep building consistent habits.";

        }


        if (iconElement) {

            iconElement.textContent =
                "💚";

        }

    } else if (
        score >= 50
    ) {

        if (messageElement) {

            messageElement.textContent =
                "Your finances need some attention.";

        }


        if (explanationElement) {

            explanationElement.textContent =
                "You are making progress, but better budgeting, spending control, or saving could improve your score.";

        }


        if (iconElement) {

            iconElement.textContent =
                "🟡";

        }

    } else {

        if (messageElement) {

            messageElement.textContent =
                "Your finances need immediate attention.";

        }


        if (explanationElement) {

            explanationElement.textContent =
                "Your spending, budget, savings, or recurring commitments are putting pressure on your finances.";

        }


        if (iconElement) {

            iconElement.textContent =
                "🔴";

        }

    }


    /* =========================
       INSIGHT
    ========================= */

    if (insightElement) {

        let insight =
            "💡 Keep tracking your money consistently.";


        if (
            incomeScore < 50
        ) {

            insight =
                "💡 Your biggest opportunity is reducing spending compared with your income.";

        } else if (
            budgetScore < 50
        ) {

            insight =
                "💡 You are above your monthly budget. Review your biggest expense categories.";

        } else if (
            savingsScore < 40
        ) {

            insight =
                "💡 Your savings goal needs more attention. Try saving before spending.";

        } else if (
            recurringScore < 50
        ) {

            insight =
                "💡 Your recurring expenses are taking a large share of your income. Review regular payments and subscriptions.";

        } else if (
            score >= 80
        ) {

            insight =
                "💡 You're building strong financial habits. Keep your spending controlled and continue growing your savings.";

        }


        insightElement.textContent =
            insight;

    }

}


/* =========================================================
   DISPLAY TRANSACTIONS
========================================================= */

function displayTransactions() {

    const list =
        getElement(
            "transactionList"
        );


    if (!list) {
        return;
    }


    if (
        !Array.isArray(
            transactions
        ) ||
        transactions.length === 0
    ) {

        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    💸
                </div>

                <h3>
                    No transactions yet
                </h3>

                <p>
                    Add your first income or expense above.
                </p>
            </div>
        `;

        return;

    }


    const recent =
        transactions.slice(
            0,
            20
        );


    list.innerHTML =
        recent.map(
            transaction => {

                const isIncome =
                    transaction.type ===
                    "income";


                const sign =
                    isIncome
                        ? "+"
                        : "-";


                const className =
                    isIncome
                        ? "income"
                        : "expense";


                const name =
                    transaction.name ||
                    transaction.category ||
                    (
                        isIncome
                            ? "Income"
                            : "Expense"
                    );


                return `
                    <div
                        class="transaction-item ${className}"
                    >

                        <div class="transaction-info">

                            <strong>
                                ${escapeHTML(name)}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    transaction.category ||
                                    "Other"
                                )}
                                ·
                                ${formatTransactionDate(
                                    transaction.date
                                )}
                            </span>

                        </div>


                        <div class="transaction-right">

                            <strong>
                                ${sign}${formatMoney(
                                    transaction.amount
                                )}
                            </strong>

                            <div class="transaction-actions">

                                <button
                                    type="button"
                                    onclick="editTransaction('${transaction.id}')"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    onclick="deleteTransaction('${transaction.id}')"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    </div>
                `;

            }
        ).join("");

}


function formatTransactionDate(date) {

    if (!date) {
        return "Unknown date";
    }


    const parsed =
        new Date(date);


    if (
        !Number.isFinite(
            parsed.getTime()
        )
    ) {

        return "Unknown date";

    }


    return parsed.toLocaleDateString(
        "en-NG",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


/* =========================================================
   EDIT TRANSACTION
========================================================= */

function editTransaction(id) {

    const transaction =
        transactions.find(
            item =>
                item.id === id
        );


    if (!transaction) {

        alert(
            "Transaction not found."
        );

        return;

    }


    const amountInput =
        prompt(
            "Enter the new amount:",
            transaction.amount
        );


    if (
        amountInput === null
    ) {

        return;

    }


    const amount =
        Number(amountInput);


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "Please enter a valid amount."
        );

        return;

    }


    const categoryInput =
        prompt(
            "Enter the category:",
            transaction.category ||
            "Other"
        );


    if (
        categoryInput === null
    ) {

        return;

    }


    transaction.amount =
        amount;

    transaction.category =
        categoryInput.trim() ||
        "Other";


    saveTransactions();

    updateDashboard();

}


/* =========================================================
   DELETE TRANSACTION
========================================================= */

function deleteTransaction(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this transaction?"
        );


    if (!confirmed) {

        return;

    }


    transactions =
        transactions.filter(
            transaction =>
                transaction.id !== id
        );


    saveTransactions();

    updateDashboard();

}


/* =========================================================
   MONEY LEAK DETECTION
========================================================= */

function detectMoneyLeak() {

    const leakMessage =
        getElement(
            "leakMessage"
        );


    if (!leakMessage) {

        return;

    }


    const expenses =
        transactions.filter(
            transaction =>
                transaction.type ===
                "expense"
        );


    if (
        expenses.length === 0
    ) {

        leakMessage.innerHTML =
            "💡 Add expenses to discover where your money may be leaking.";

        return;

    }


    const totals = {};


    expenses.forEach(
        transaction => {

            const category =
                transaction.category ||
                "Other";


            totals[category] =
                (
                    totals[category] ||
                    0
                ) +
                (
                    Number(
                        transaction.amount
                    ) || 0
                );

        }
    );


    const sorted =
        Object.entries(
            totals
        ).sort(
            (a, b) =>
                b[1] - a[1]
        );


    const biggest =
        sorted[0];


    if (!biggest) {

        return;

    }


    const possibleSaving =
        biggest[1] * 0.20;


    const yearlySaving =
        possibleSaving * 12;


    leakMessage.innerHTML = `
        💡 Your biggest spending category is
        <strong>${escapeHTML(biggest[0])}</strong>
        at
        <strong>${formatMoney(biggest[1])}</strong>.
        Reducing it by 20% could save approximately
        <strong>${formatMoney(possibleSaving)}</strong>
        per month,
        or
        <strong>${formatMoney(yearlySaving)}</strong>
        per year.
    `;

}


/* =========================================================
   SPENDING CHART
========================================================= */

function updateSpendingChart() {

    const chart =
        getElement(
            "spendingChart"
        );


    if (!chart) {

        return;

    }


    const totals = {};


    transactions
        .filter(
            transaction =>
                transaction.type ===
                "expense"
        )
        .forEach(
            transaction => {

                const category =
                    transaction.category ||
                    "Other";


                totals[category] =
                    (
                        totals[category] ||
                        0
                    ) +
                    (
                        Number(
                            transaction.amount
                        ) || 0
                    );

            }
        );


    const entries =
        Object.entries(
            totals
        ).sort(
            (a, b) =>
                b[1] - a[1]
        );


    if (
        entries.length === 0
    ) {

        chart.innerHTML =
            `<div class="analytics-empty">
                Add expenses to see your spending chart.
            </div>`;

        return;

    }


    const maximum =
        entries[0][1];


    chart.innerHTML =
        entries.map(
            ([category, amount]) => {

                const percentage =
                    maximum > 0
                        ? (
                            amount /
                            maximum
                        ) * 100
                        : 0;


                return `
                    <div class="spending-chart-row">

                        <div class="spending-chart-label">

                            <span>
                                ${escapeHTML(category)}
                            </span>

                            <strong>
                                ${formatMoney(amount)}
                            </strong>

                        </div>

                        <div class="spending-chart-track">

                            <div
                                class="spending-chart-fill"
                                style="width:${percentage}%"
                            ></div>

                        </div>

                    </div>
                `;

            }
        ).join("");

}


/* =========================================================
   SPENDING BREAKDOWN
========================================================= */

function updateSpendingBreakdown() {

    const breakdown =
        getElement(
            "spendingBreakdown"
        );


    if (!breakdown) {

        return;

    }


    const totals = {};


    let total = 0;


    transactions
        .filter(
            transaction =>
                transaction.type ===
                "expense"
        )
        .forEach(
            transaction => {

                const amount =
                    Number(
                        transaction.amount
                    ) || 0;


                const category =
                    transaction.category ||
                    "Other";


                totals[category] =
                    (
                        totals[category] ||
                        0
                    ) +
                    amount;


                total += amount;

            }
        );


    const entries =
        Object.entries(
            totals
        ).sort(
            (a, b) =>
                b[1] - a[1]
        );


    if (
        entries.length === 0
    ) {

        breakdown.innerHTML =
            "No spending breakdown available yet.";

        return;

    }


    breakdown.innerHTML =
        entries.map(
            ([category, amount]) => {

                const percentage =
                    total > 0
                        ? (
                            amount /
                            total
                        ) * 100
                        : 0;


                return `
                    <div class="breakdown-item">

                        <span>
                            ${escapeHTML(category)}
                        </span>

                        <strong>
                            ${formatMoney(amount)}
                            (${percentage.toFixed(0)}%)
                        </strong>

                    </div>
                `;

            }
        ).join("");

}


/* =========================================================
   SPENDING ANALYTICS
========================================================= */

function updateSpendingAnalytics() {

    const summary =
        document.querySelector(
            ".analytics-summary"
        );


    const totalSpentElement =
        getElement(
            "analyticsTotalSpent"
        );


    const topCategoryElement =
        getElement(
            "analyticsTopCategory"
        );


    const dailyAverageElement =
        getElement(
            "analyticsDailyAverage"
        );


    const bars =
        getElement(
            "analyticsBars"
        );


    const insight =
        getElement(
            "analyticsInsight"
        );


    if (
        !summary &&
        !totalSpentElement &&
        !topCategoryElement &&
        !dailyAverageElement &&
        !bars
    ) {

        return;

    }


    const now =
        new Date();


    const currentMonth =
        now.getMonth();


    const currentYear =
        now.getFullYear();


    const monthlyExpenses =
        transactions.filter(
            transaction => {

                if (
                    transaction.type !==
                    "expense"
                ) {

                    return false;

                }


                const date =
                    new Date(
                        transaction.date
                    );


                return (
                    date.getMonth() ===
                    currentMonth &&
                    date.getFullYear() ===
                    currentYear
                );

            }
        );


    let totalSpent = 0;


    const categoryTotals = {};


    monthlyExpenses.forEach(
        transaction => {

            const amount =
                Number(
                    transaction.amount
                ) || 0;


            const category =
                transaction.category ||
                "Other";


            totalSpent +=
                amount;


            categoryTotals[category] =
                (
                    categoryTotals[category] ||
                    0
                ) +
                amount;

        }
    );


    const dayOfMonth =
        now.getDate();


    const dailyAverage =
        dayOfMonth > 0
            ? totalSpent /
                dayOfMonth
            : 0;


    const sortedCategories =
        Object.entries(
            categoryTotals
        ).sort(
            (a, b) =>
                b[1] - a[1]
        );


    const topCategory =
        sortedCategories.length > 0
            ? sortedCategories[0]
            : null;


    if (totalSpentElement) {

        totalSpentElement.textContent =
            formatMoney(
                totalSpent
            );

    }


    if (topCategoryElement) {

        topCategoryElement.textContent =
            topCategory
                ? escapeHTML(
                    topCategory[0]
                )
                : "—";

    }


    if (dailyAverageElement) {

        dailyAverageElement.textContent =
            formatMoney(
                dailyAverage
            );

    }


    if (bars) {

        if (
            sortedCategories.length ===
            0
        ) {

            bars.innerHTML =
                `<div class="analytics-empty">
                    Add expenses to see your spending analytics.
                </div>`;

        } else {

            const maximum =
                sortedCategories[0][1];


            bars.innerHTML =
                sortedCategories.map(
                    ([category, amount]) => {

                        const percentage =
                            totalSpent > 0
                                ? (
                                    amount /
                                    totalSpent
                                ) * 100
                                : 0;


                        const width =
                            maximum > 0
                                ? (
                                    amount /
                                    maximum
                                ) * 100
                                : 0;


                        return `
                            <div class="analytics-bar-row">

                                <div class="analytics-bar-info">

                                    <span>
                                        ${escapeHTML(category)}
                                    </span>

                                    <strong>
                                        ${formatMoney(amount)}
                                        ·
                                        ${percentage.toFixed(0)}%
                                    </strong>

                                </div>

                                <div class="analytics-bar-track">

                                    <div
                                        class="analytics-bar-fill"
                                        style="width:${width}%"
                                    ></div>

                                </div>

                            </div>
                        `;

                    }
                ).join("");

        }

    }


    if (insight) {

        if (
            !topCategory
        ) {

            insight.textContent =
                "💡 Add expenses this month to receive personalized spending insights.";

        } else {

            const percentage =
                totalSpent > 0
                    ? (
                        topCategory[1] /
                        totalSpent
                    ) * 100
                    : 0;


            insight.textContent =
                `💡 ${topCategory[0]} is your biggest spending category this month at ${percentage.toFixed(0)}% of your total spending.`;

        }

    }

}


/* =========================================================
   MONTHLY BUDGET
========================================================= */

function loadMonthlyBudget() {

    const saved =
        localStorage.getItem(
            BUDGET_STORAGE_KEY
        );


    if (!saved) {

        return 0;

    }


    const value =
        Number(saved);


    return Number.isFinite(value)
        ? value
        : 0;

}


function saveMonthlyBudget() {

    localStorage.setItem(
        BUDGET_STORAGE_KEY,
        String(
            monthlyBudget
        )
    );

}


function getCurrentMonthExpenses() {

    const now =
        new Date();


    return transactions
        .filter(
            transaction => {

                if (
                    transaction.type !==
                    "expense"
                ) {

                    return false;

                }


                const date =
                    new Date(
                        transaction.date
                    );


                return (
                    date.getMonth() ===
                    now.getMonth() &&
                    date.getFullYear() ===
                    now.getFullYear()
                );

            }
        )
        .reduce(
            (total, transaction) =>
                total +
                (
                    Number(
                        transaction.amount
                    ) || 0
                ),
            0
        );

}


function updateBudgetDisplay() {

    const result =
        getElement(
            "budgetResult"
        );


    if (!result) {

        return;

    }


    const spent =
        getCurrentMonthExpenses();


    if (
        !monthlyBudget ||
        monthlyBudget <= 0
    ) {

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-state-icon">
                    💰
                </div>

                <h3>
                    No monthly budget set
                </h3>

                <p>
                    Set a budget to see how much of your monthly spending you have used.
                </p>

            </div>
        `;

        return;

    }


    const percentage =
        (
            spent /
            monthlyBudget
        ) * 100;


    const safePercentage =
        Math.min(
            100,
            Math.max(
                0,
                percentage
            )
        );


    const remaining =
        monthlyBudget -
        spent;


    let status =
        "safe";


    let message =
        "You're comfortably within your budget.";


    if (
        percentage >= 100
    ) {

        status =
            "danger";

        message =
            "You've gone over your monthly budget.";

    } else if (
        percentage >= 80
    ) {

        status =
            "warning";

        message =
            "You're getting close to your monthly budget.";

    }


    result.innerHTML = `
        <div class="budget-card">

            <div class="budget-card-header">

                <div>

                    <span class="analytics-label">
                        Monthly Budget
                    </span>

                    <h3>
                        ${formatMoney(spent)}
                        of
                        ${formatMoney(monthlyBudget)}
                    </h3>

                </div>

                <strong>
                    ${percentage.toFixed(0)}%
                </strong>

            </div>


            <div class="budget-progress">

                <div
                    class="budget-progress-fill ${status === "warning"
                        ? "warning"
                        : status === "danger"
                            ? "danger"
                            : ""
                    }"
                    style="width:${safePercentage}%"
                ></div>

            </div>


            <div class="budget-stats">

                <div class="budget-stat">

                    <span>
                        Spent
                    </span>

                    <strong>
                        ${formatMoney(spent)}
                    </strong>

                </div>


                <div class="budget-stat">

                    <span>
                        Budget
                    </span>

                    <strong>
                        ${formatMoney(monthlyBudget)}
                    </strong>

                </div>


                <div class="budget-stat">

                    <span>
                        ${remaining >= 0
                            ? "Remaining"
                            : "Over by"
                        }
                    </span>

                    <strong>
                        ${formatMoney(
                            Math.abs(
                                remaining
                            )
                        )}
                    </strong>

                </div>

            </div>


            <p class="budget-message ${status}">
                ${message}
            </p>

        </div>
    `;

}


function setupBudgetSystem() {

    const saveButton =
        getElement(
            "saveBudgetButton"
        );


    const resetButton =
        getElement(
            "resetBudgetButton"
        );


    const input =
        getElement(
            "monthlyBudget"
        );


    if (input) {

        if (
            monthlyBudget > 0
        ) {

            input.value =
                monthlyBudget;

        }

    }


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            function () {

                const value =
                    Number(
                        input.value
                    );


                if (
                    !Number.isFinite(
                        value
                    ) ||
                    value <= 0
                ) {

                    alert(
                        "Please enter a valid monthly budget."
                    );

                    return;

                }


                monthlyBudget =
                    value;


                saveMonthlyBudget();

                updateBudgetDisplay();

                updateMoneyHealth(
                    calculateTotals().income,
                    calculateTotals().expenses
                );

            }
        );

    }


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            function () {

                monthlyBudget =
                    0;


                localStorage.removeItem(
                    BUDGET_STORAGE_KEY
                );


                if (input) {

                    input.value = "";

                }


                updateBudgetDisplay();

                updateMoneyHealth(
                    calculateTotals().income,
                    calculateTotals().expenses
                );

            }
        );

    }


    updateBudgetDisplay();

}


/* =========================================================
   CATEGORY BUDGETS
========================================================= */

function loadCategoryBudgets() {

    const saved =
        localStorage.getItem(
            CATEGORY_BUDGET_STORAGE_KEY
        );


    if (!saved) {

        return {};

    }


    try {

        const parsed =
            JSON.parse(saved);


        return (
            parsed &&
            typeof parsed ===
            "object"
        )
            ? parsed
            : {};

    } catch (error) {

        return {};

    }

}


function saveCategoryBudgets() {

    localStorage.setItem(
        CATEGORY_BUDGET_STORAGE_KEY,
        JSON.stringify(
            categoryBudgets
        )
    );

}


function normalizeCategory(
    category
) {

    const value =
        String(
            category ||
            "Other"
        ).trim().toLowerCase();


    const categories = [
        "Food",
        "Transport",
        "Bills",
        "Shopping",
        "Entertainment",
        "Health",
        "Education",
        "Other"
    ];


    const match =
        categories.find(
            item =>
                item.toLowerCase() ===
                value
        );


    return match ||
        "Other";

}


function getCategorySpending(
    category
) {

    const normalized =
        normalizeCategory(
            category
        );


    return transactions
        .filter(
            transaction =>
                transaction.type ===
                "expense" &&
                normalizeCategory(
                    transaction.category
                ) === normalized
        )
        .filter(
            transaction => {

                const date =
                    new Date(
                        transaction.date
                    );


                const now =
                    new Date();


                return (
                    date.getMonth() ===
                    now.getMonth() &&
                    date.getFullYear() ===
                    now.getFullYear()
                );

            }
        )
        .reduce(
            (total, transaction) =>
                total +
                (
                    Number(
                        transaction.amount
                    ) || 0
                ),
            0
        );

}


function getCategoryBudgetAmount(
    category
) {

    return (
        Number(
            categoryBudgets[
                normalizeCategory(
                    category
                )
            ]
        ) || 0
    );

}


function updateCategoryBudgetDisplay() {

    const results =
        getElement(
            "categoryBudgetResults"
        );


    if (!results) {

        return;

    }


    const categories =
        Object.keys(
            categoryBudgetFields
        );


    const hasBudget =
        categories.some(
            category =>
                getCategoryBudgetAmount(
                    category
                ) > 0
        );


    if (!hasBudget) {

        results.innerHTML =
            `<div class="analytics-empty">
                Set category budgets to track each spending area.
            </div>`;

        return;

    }


    results.innerHTML =
        categories
            .filter(
                category =>
                    getCategoryBudgetAmount(
                        category
                    ) > 0
            )
            .map(
                category => {

                    const budget =
                        getCategoryBudgetAmount(
                            category
                        );


                    const spent =
                        getCategorySpending(
                            category
                        );


                    const percentage =
                        (
                            spent /
                            budget
                        ) * 100;


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


                    let status =
                        "safe";


                    if (
                        percentage >= 100
                    ) {

                        status =
                            "danger";

                    } else if (
                        percentage >= 80
                    ) {

                        status =
                            "warning";

                    }


                    return `
                        <div class="category-budget-card ${status}">

                            <div class="category-budget-header">

                                <strong>
                                    ${escapeHTML(category)}
                                </strong>

                                <span>
                                    ${percentage.toFixed(0)}%
                                </span>

                            </div>


                            <div class="category-budget-progress">

                                <div
                                    class="category-budget-progress-fill"
                                    style="width:${safePercentage}%"
                                ></div>

                            </div>


                            <div class="category-budget-stats">

                                <span>
                                    Spent:
                                    <strong>
                                        ${formatMoney(spent)}
                                    </strong>
                                </span>

                                <span>
                                    Limit:
                                    <strong>
                                        ${formatMoney(budget)}
                                    </strong>
                                </span>

                                <span>
                                    ${remaining >= 0
                                        ? "Remaining"
                                        : "Over by"
                                    }:
                                    <strong>
                                        ${formatMoney(
                                            Math.abs(
                                                remaining
                                            )
                                        )}
                                    </strong>
                                </span>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


function setupCategoryBudgetSystem() {

    Object.entries(
        categoryBudgetFields
    ).forEach(
        ([category, fieldId]) => {

            const input =
                getElement(
                    fieldId
                );


            if (!input) {
                return;
            }


            const saved =
                getCategoryBudgetAmount(
                    category
                );


            if (saved > 0) {

                input.value =
                    saved;

            }

        }
    );


    const saveButton =
        getElement(
            "saveCategoryBudgetsButton"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            function () {

                Object.entries(
                    categoryBudgetFields
                ).forEach(
                    ([category, fieldId]) => {

                        const input =
                            getElement(
                                fieldId
                            );


                        if (!input) {
                            return;
                        }


                        const value =
                            Number(
                                input.value
                            );


                        if (
                            Number.isFinite(
                                value
                            ) &&
                            value >= 0
                        ) {

                            categoryBudgets[
                                category
                            ] = value;

                        }

                    }
                );


                saveCategoryBudgets();

                updateCategoryBudgetDisplay();

                updateMoneyHealth(
                    calculateTotals().income,
                    calculateTotals().expenses
                );

            }
        );

    }


    updateCategoryBudgetDisplay();

}


function refreshCategoryBudgets() {

    updateCategoryBudgetDisplay();

}


/* =========================================================
   SAVINGS GOALS
========================================================= */

function loadSavingsGoal() {

    const saved =
        localStorage.getItem(
            SAVINGS_STORAGE_KEY
        );


    if (!saved) {

        return {

            targetAmount: 0,

            currentSavings: 0,

            goalWeeks: 0

        };

    }


    try {

        const parsed =
            JSON.parse(saved);


        return {

            targetAmount:
                Number(
                    parsed.targetAmount
                ) || 0,

            currentSavings:
                Number(
                    parsed.currentSavings
                ) || 0,

            goalWeeks:
                Number(
                    parsed.goalWeeks
                ) || 0

        };

    } catch (error) {

        return {

            targetAmount: 0,

            currentSavings: 0,

            goalWeeks: 0

        };

    }

}


function saveSavingsGoalToStorage() {

    localStorage.setItem(
        SAVINGS_STORAGE_KEY,
        JSON.stringify(
            savingsGoal
        )
    );

}


function calculateSavingsGoal() {

    const targetInput =
        getElement(
            "savingsGoal"
        );


    const currentInput =
        getElement(
            "currentSavings"
        );


    const weeksInput =
        getElement(
            "goalWeeks"
        );


    if (
        !targetInput ||
        !currentInput ||
        !weeksInput
    ) {

        return;

    }


    const target =
        Number(
            targetInput.value
        );


    const current =
        Number(
            currentInput.value
        );


    const weeks =
        Number(
            weeksInput.value
        );


    if (
        !Number.isFinite(target) ||
        target <= 0
    ) {

        alert(
            "Please enter a valid savings target."
        );

        return;

    }


    if (
        !Number.isFinite(current) ||
        current < 0
    ) {

        alert(
            "Please enter a valid current savings amount."
        );

        return;

    }


    if (
        !Number.isFinite(weeks) ||
        weeks <= 0
    ) {

        alert(
            "Please enter a valid number of weeks."
        );

        return;

    }


    savingsGoal = {

        targetAmount:
            target,

        currentSavings:
            Math.min(
                current,
                target
            ),

        goalWeeks:
            weeks

    };


    saveSavingsGoalToStorage();

    renderSavingsPlan();

    updateSavingsProgress();

    updateSavingsDisplay();

    updateMoneyHealth(
        calculateTotals().income,
        calculateTotals().expenses
    );

}


function renderSavingsPlan() {

    const result =
        getElement(
            "savingsResult"
        );


    if (!result) {

        return;

    }


    const target =
        Number(
            savingsGoal.targetAmount
        ) || 0;


    const current =
        Number(
            savingsGoal.currentSavings
        ) || 0;


    const weeks =
        Number(
            savingsGoal.goalWeeks
        ) || 0;


    if (
        target <= 0
    ) {

        result.innerHTML =
            "Enter your savings goal to create a plan.";

        return;

    }


    const remaining =
        Math.max(
            0,
            target - current
        );


    const weekly =
        weeks > 0
            ? remaining / weeks
            : 0;


    const daily =
        weekly / 7;


    result.innerHTML = `
        <div class="savings-plan">

            <h3>
                🎯 Your Savings Plan
            </h3>

            <p>
                You still need
                <strong>
                    ${formatMoney(remaining)}
                </strong>
                to reach your goal.
            </p>

            <p>
                Save approximately
                <strong>
                    ${formatMoney(weekly)}
                </strong>
                per week.
            </p>

            <p>
                That's about
                <strong>
                    ${formatMoney(daily)}
                </strong>
                per day.
            </p>

        </div>
    `;

}


function updateSavingsGoal() {

    calculateSavingsGoal();

}


function saveSavingsGoal() {

    calculateSavingsGoal();

}


function resetSavingsGoal() {

    savingsGoal = {

        targetAmount: 0,

        currentSavings: 0,

        goalWeeks: 0

    };


    localStorage.removeItem(
        SAVINGS_STORAGE_KEY
    );


    resetSavingsDisplay();

    updateMoneyHealth(
        calculateTotals().income,
        calculateTotals().expenses
    );

}


function updateSavingsProgress() {

    const progressFill =
        getElement(
            "progressFill"
        );


    const progressText =
        getElement(
            "progressText"
        );


    const savedAmount =
        getElement(
            "savedAmount"
        );


    const targetAmount =
        getElement(
            "targetAmount"
        );


    const remainingAmount =
        getElement(
            "remainingAmount"
        );


    const target =
        Number(
            savingsGoal.targetAmount
        ) || 0;


    const saved =
        Number(
            savingsGoal.currentSavings
        ) || 0;


    const remaining =
        Math.max(
            0,
            target - saved
        );


    const percentage =
        target > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    (
                        saved /
                        target
                    ) * 100
                )
            )
            : 0;


    if (progressFill) {

        progressFill.style.width =
            `${percentage}%`;

    }


    if (progressText) {

        progressText.textContent =
            `${percentage.toFixed(0)}% saved`;

    }


    if (savedAmount) {

        savedAmount.textContent =
            formatMoney(saved);

    }


    if (targetAmount) {

        targetAmount.textContent =
            formatMoney(target);

    }


    if (remainingAmount) {

        remainingAmount.textContent =
            formatMoney(remaining);

    }

}


function updateSavingsDisplay() {

    const result =
        getElement(
            "savingsResult"
        );


    if (!result) {

        return;

    }


    if (
        savingsGoal.targetAmount >
        0
    ) {

        renderSavingsPlan();

    }

}


function resetSavingsDisplay() {

    const targetInput =
        getElement(
            "savingsGoal"
        );


    const currentInput =
        getElement(
            "currentSavings"
        );


    const weeksInput =
        getElement(
            "goalWeeks"
        );


    if (targetInput) {

        targetInput.value = "";

    }


    if (currentInput) {

        currentInput.value = "";

    }


    if (weeksInput) {

        weeksInput.value = "";

    }


    const result =
        getElement(
            "savingsResult"
        );


    if (result) {

        result.innerHTML =
            "Enter your savings goal to create a plan.";

    }


    updateSavingsProgress();

}


function loadSavedSavingsGoal() {

    const targetInput =
        getElement(
            "savingsGoal"
        );


    const currentInput =
        getElement(
            "currentSavings"
        );


    const weeksInput =
        getElement(
            "goalWeeks"
        );


    if (
        savingsGoal.targetAmount >
        0
    ) {

        if (targetInput) {

            targetInput.value =
                savingsGoal.targetAmount;

        }


        if (currentInput) {

            currentInput.value =
                savingsGoal.currentSavings;

        }


        if (weeksInput) {

            weeksInput.value =
                savingsGoal.goalWeeks;

        }


        renderSavingsPlan();

    }


    updateSavingsProgress();

}


/* =========================================================
   RECURRING TRANSACTIONS
========================================================= */

function loadRecurringTransactions() {

    const saved =
        localStorage.getItem(
            RECURRING_STORAGE_KEY
        );


    if (!saved) {

        return [];

    }


    try {

        const parsed =
            JSON.parse(saved);


        return Array.isArray(
            parsed
        )
            ? parsed
            : [];

    } catch (error) {

        return [];

    }

}


function saveRecurringTransactions() {

    localStorage.setItem(
        RECURRING_STORAGE_KEY,
        JSON.stringify(
            recurringTransactions
        )
    );

}


function formatRecurringFrequency(
    frequency
) {

    const labels = {

        weekly:
            "Every Week",

        monthly:
            "Every Month",

        yearly:
            "Every Year"

    };


    return (
        labels[frequency] ||
        "Every Month"
    );

}


function displayRecurringTransactions() {

    const results =
        getElement(
            "recurringResults"
        );


    if (!results) {

        return;

    }


    if (
        recurringTransactions.length ===
        0
    ) {

        results.innerHTML = `
            <div class="recurring-empty">

                🔄

                <h3>
                    No recurring transactions
                </h3>

                <p>
                    Add your regular income or expenses above.
                </p>

            </div>
        `;

        return;

    }


    results.innerHTML =
        recurringTransactions
            .map(
                transaction => {

                    const typeClass =
                        transaction.type ===
                        "income"
                            ? "income"
                            : "expense";


                    const typeText =
                        transaction.type ===
                        "income"
                            ? "Income"
                            : "Expense";


                    return `
                        <div class="recurring-card">

                            <div class="recurring-card-header">

                                <h3 class="recurring-card-title">
                                    ${escapeHTML(
                                        transaction.name
                                    )}
                                </h3>

                                <span
                                    class="recurring-card-type ${typeClass}"
                                >
                                    ${typeText}
                                </span>

                            </div>


                            <p class="recurring-card-amount">
                                ${formatMoney(
                                    transaction.amount
                                )}
                            </p>


                            <div class="recurring-card-details">

                                <span>
                                    Category:
                                    <strong>
                                        ${escapeHTML(
                                            transaction.category
                                        )}
                                    </strong>
                                </span>

                                <span>
                                    Frequency:
                                    <strong>
                                        ${formatRecurringFrequency(
                                            transaction.frequency
                                        )}
                                    </strong>
                                </span>

                            </div>


                            <div class="recurring-card-actions">

                                <button
                                    type="button"
                                    class="recurring-delete-button"
                                    onclick="deleteRecurringTransaction('${transaction.id}')"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


function addRecurringTransaction() {

    const nameInput =
        getElement(
            "recurringName"
        );


    const amountInput =
        getElement(
            "recurringAmount"
        );


    const typeInput =
        getElement(
            "recurringType"
        );


    const categoryInput =
        getElement(
            "recurringCategory"
        );


    const frequencyInput =
        getElement(
            "recurringFrequency"
        );


    if (
        !nameInput ||
        !amountInput ||
        !typeInput ||
        !categoryInput ||
        !frequencyInput
    ) {

        return;

    }


    const name =
        nameInput.value.trim();


    const amount =
        Number(
            amountInput.value
        );


    const type =
        typeInput.value;


    const category =
        categoryInput.value;


    const frequency =
        frequencyInput.value;


    if (!name) {

        alert(
            "Please enter a name."
        );

        nameInput.focus();

        return;

    }


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "Please enter a valid amount."
        );

        amountInput.focus();

        return;

    }


    const now =
        new Date();


    const recurringTransaction = {

        id:
            Date.now().toString() +
            Math.random()
                .toString(36)
                .substring(2, 7),

        name:
            name,

        amount:
            amount,

        type:
            type,

        category:
            category,

        frequency:
            frequency,

        createdAt:
            now.toISOString(),

        nextRun:
            now.toISOString()

    };


    recurringTransactions.push(
        recurringTransaction
    );


    saveRecurringTransactions();

    displayRecurringTransactions();


    nameInput.value = "";

    amountInput.value = "";

    typeInput.value =
        "expense";

    categoryInput.value =
        "Bills";

    frequencyInput.value =
        "monthly";


    alert(
        "Recurring transaction added successfully."
    );


    processRecurringTransactions();

}


function deleteRecurringTransaction(
    id
) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this recurring transaction?"
        );


    if (!confirmed) {

        return;

    }


    recurringTransactions =
        recurringTransactions.filter(
            transaction =>
                transaction.id !== id
        );


    saveRecurringTransactions();

    displayRecurringTransactions();

    updateMoneyHealth(
        calculateTotals().income,
        calculateTotals().expenses
    );

}


function setupRecurringTransactions() {

    const saveButton =
        getElement(
            "saveRecurringButton"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            addRecurringTransaction
        );

    }


    displayRecurringTransactions();

}


/* =========================================================
   AUTOMATIC RECURRING PROCESSOR
========================================================= */

function getNextRecurringDate(
    currentDate,
    frequency
) {

    const nextDate =
        new Date(
            currentDate
        );


    if (
        frequency ===
        "weekly"
    ) {

        nextDate.setDate(
            nextDate.getDate() +
            7
        );

    } else if (
        frequency ===
        "monthly"
    ) {

        nextDate.setMonth(
            nextDate.getMonth() +
            1
        );

    } else if (
        frequency ===
        "yearly"
    ) {

        nextDate.setFullYear(
            nextDate.getFullYear() +
            1
        );

    } else {

        nextDate.setMonth(
            nextDate.getMonth() +
            1
        );

    }


    return nextDate;

}


function processRecurringTransactions() {

    if (
        !Array.isArray(
            recurringTransactions
        )
    ) {

        return;

    }


    const now =
        new Date();


    let transactionsChanged =
        false;


    recurringTransactions.forEach(
        recurring => {

            if (
                !recurring.nextRun
            ) {

                recurring.nextRun =
                    recurring.createdAt ||
                    now.toISOString();

                transactionsChanged =
                    true;

            }


            const nextRun =
                new Date(
                    recurring.nextRun
                );


            if (
                !Number.isFinite(
                    nextRun.getTime()
                )
            ) {

                return;

            }


            if (
                nextRun > now
            ) {

                return;

            }


            const newTransaction = {

                id:
                    Date.now().toString() +
                    Math.random()
                        .toString(36)
                        .substring(2, 9),

                amount:
                    Number(
                        recurring.amount
                    ) || 0,

                type:
                    recurring.type,

                category:
                    recurring.category,

                date:
                    now.toISOString(),

                recurring:
                    true,

                recurringId:
                    recurring.id,

                name:
                    recurring.name

            };


            transactions.unshift(
                newTransaction
            );


            transactionsChanged =
                true;


            let nextDate =
                getNextRecurringDate(
                    nextRun,
                    recurring.frequency
                );


            while (
                nextDate <= now
            ) {

                nextDate =
                    getNextRecurringDate(
                        nextDate,
                        recurring.frequency
                    );

            }


            recurring.nextRun =
                nextDate.toISOString();

        }
    );


    if (
        !transactionsChanged
    ) {

        return;

    }


    saveTransactions();

    saveRecurringTransactions();

    updateDashboard();

    displayRecurringTransactions();

}


/* =========================================================
   TRANSACTION FORM
========================================================= */

function setupTransactionForm() {

    const form =
        getElement(
            "transactionForm"
        );


    if (!form) {

        return;

    }


    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            addTransaction();

        }
    );

}


/* =========================================================
   QUICK ACTIONS
========================================================= */

function setupQuickActions() {

    const actions =
        document.querySelectorAll(
            "[data-transaction-type]"
        );


    actions.forEach(
        action => {

            action.addEventListener(
                "click",
                function () {

                    const type =
                        action.dataset
                            .transactionType;


                    const typeInput =
                        getElement(
                            "type"
                        );


                    const amountInput =
                        getElement(
                            "amount"
                        );


                    if (
                        typeInput
                    ) {

                        typeInput.value =
                            type;

                    }


                    if (
                        amountInput
                    ) {

                        amountInput.focus();

                    }

                }
            );

        }
    );

}


/* =========================================================
   SAVINGS BUTTONS
========================================================= */

function setupSavingsButtons() {

    const calculateButton =
        getElement(
            "calculateSavingsButton"
        );


    const updateButton =
        getElement(
            "updateSavingsButton"
        );


    const resetButton =
        getElement(
            "resetSavingsButton"
        );


    if (
        calculateButton
    ) {

        calculateButton.addEventListener(
            "click",
            calculateSavingsGoal
        );

    }


    if (
        updateButton
    ) {

        updateButton.addEventListener(
            "click",
            updateSavingsGoal
        );

    }


    if (
        resetButton
    ) {

        resetButton.addEventListener(
            "click",
            resetSavingsGoal
        );

    }


    loadSavedSavingsGoal();

}


/* =========================================================
   ENTER KEY SUPPORT
========================================================= */

function setupEnterKeySupport() {

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                "Enter"
            ) {

                return;

            }


            const active =
                document.activeElement;


            if (
                !active
            ) {

                return;

            }


            if (
                active.id ===
                "amount"
            ) {

                event.preventDefault();

                addTransaction();

            }


            if (
                active.id ===
                "recurringAmount"
            ) {

                event.preventDefault();

                addRecurringTransaction();

            }

        }
    );

}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        processRecurringTransactions();

        setupTransactionForm();

        setupQuickActions();

        setupSavingsButtons();

        setupBudgetSystem();

        setupCategoryBudgetSystem();

        setupRecurringTransactions();

        setupEnterKeySupport();

        updateDashboard();

    }
);


/* =========================================================
   GLOBAL COMPATIBILITY
========================================================= */

window.addTransaction =
    addTransaction;

window.updateDashboard =
    updateDashboard;

window.updateMoneyHealth =
    updateMoneyHealth;

window.displayTransactions =
    displayTransactions;

window.editTransaction =
    editTransaction;

window.deleteTransaction =
    deleteTransaction;

window.detectMoneyLeak =
    detectMoneyLeak;

window.updateSpendingChart =
    updateSpendingChart;

window.updateSpendingBreakdown =
    updateSpendingBreakdown;

window.updateSpendingAnalytics =
    updateSpendingAnalytics;

window.calculateSavingsGoal =
    calculateSavingsGoal;

window.updateSavingsGoal =
    updateSavingsGoal;

window.saveSavingsGoal =
    saveSavingsGoal;

window.resetSavingsGoal =
    resetSavingsGoal;

window.updateSavingsProgress =
    updateSavingsProgress;

window.updateSavingsDisplay =
    updateSavingsDisplay;

window.resetSavingsDisplay =
    resetSavingsDisplay;

window.loadSavedSavingsGoal =
    loadSavedSavingsGoal;

window.updateBudgetDisplay =
    updateBudgetDisplay;

window.refreshCategoryBudgets =
    refreshCategoryBudgets;

window.updateCategoryBudgetDisplay =
    updateCategoryBudgetDisplay;

window.addRecurringTransaction =
    addRecurringTransaction;

window.deleteRecurringTransaction =
    deleteRecurringTransaction;

window.displayRecurringTransactions =
    displayRecurringTransactions;

window.processRecurringTransactions =
    processRecurringTransactions;

window.getCurrentMonthExpenses =
    getCurrentMonthExpenses;


/* =========================================================
   END OF MONEYLEAK APP
========================================================= */
/* =========================================================
   SMART FINANCIAL ALERTS
========================================================= */

function updateFinancialAlerts() {

    const alertsContainer =
        getElement("financialAlerts");


    if (!alertsContainer) {
        return;
    }


    const alerts = [];


    const totals =
        calculateTotals();


    const income =
        Number(totals.income) || 0;

    const expenses =
        Number(totals.expenses) || 0;


    /* =========================
       NO ACTIVITY
    ========================= */

    if (
        income === 0 &&
        expenses === 0
    ) {

        alerts.push({

            type: "info",

            icon: "💡",

            title:
                "Start tracking your money",

            message:
                "Add your income and expenses so MoneyLeak can give you personalized financial alerts.",

            badge:
                "Getting Started"

        });

    }


    /* =========================
       INCOME VS SPENDING
    ========================= */

    if (
        income > 0
    ) {

        const spendingRatio =
            expenses / income;


        if (
            spendingRatio > 1
        ) {

            alerts.push({

                type: "danger",

                icon: "🚨",

                title:
                    "You're spending more than you earn",

                message:
                    `Your recorded expenses are ${Math.round(
                        spendingRatio * 100
                    )}% of your recorded income. Review your largest expenses and look for areas to reduce spending.`,

                badge:
                    "Critical"

            });

        } else if (
            spendingRatio >= 0.80
        ) {

            alerts.push({

                type: "warning",

                icon: "⚠️",

                title:
                    "Your spending is getting high",

                message:
                    `You're using ${Math.round(
                        spendingRatio * 100
                    )}% of your recorded income. Try keeping more of your income available for savings and unexpected expenses.`,

                badge:
                    "Watch Spending"

            });

        } else if (
            spendingRatio <= 0.50
        ) {

            alerts.push({

                type: "success",

                icon: "💚",

                title:
                    "Your spending is well controlled",

                message:
                    `You're currently spending about ${Math.round(
                        spendingRatio * 100
                    )}% of your recorded income. Keep maintaining this healthy balance.`,

                badge:
                    "Healthy"

            });

        }

    }


    /* =========================
       MONTHLY BUDGET
    ========================= */

    const budget =
        Number(
            monthlyBudget
        ) || 0;


    const monthlyExpenses =
        getCurrentMonthExpenses();


    if (
        budget > 0
    ) {

        const usage =
            monthlyExpenses /
            budget;


        if (
            usage > 1
        ) {

            alerts.push({

                type: "danger",

                icon: "💰",

                title:
                    "You've exceeded your monthly budget",

                message:
                    `You've spent ${formatMoney(
                        monthlyExpenses
                    )} against a budget of ${formatMoney(
                        budget
                    )}. You're over budget by ${formatMoney(
                        monthlyExpenses - budget
                    )}.`,

                badge:
                    "Over Budget"

            });

        } else if (
            usage >= 0.80
        ) {

            alerts.push({

                type: "warning",

                icon: "🟡",

                title:
                    "You're close to your monthly budget",

                message:
                    `You've used ${Math.round(
                        usage * 100
                    )}% of your monthly budget. You have ${formatMoney(
                        Math.max(
                            0,
                            budget - monthlyExpenses
                        )
                    )} remaining.`,

                badge:
                    "Budget Warning"

            });

        } else {

            alerts.push({

                type: "success",

                icon: "✅",

                title:
                    "You're on track with your budget",

                message:
                    `You've used ${Math.round(
                        usage * 100
                    )}% of your monthly budget. Keep it up.`,

                badge:
                    "On Track"

            });

        }

    }


    /* =========================
       CATEGORY BUDGETS
    ========================= */

    Object.keys(
        categoryBudgetFields
    ).forEach(
        category => {

            const limit =
                getCategoryBudgetAmount(
                    category
                );


            if (
                limit <= 0
            ) {

                return;

            }


            const spent =
                getCategorySpending(
                    category
                );


            const usage =
                spent /
                limit;


            if (
                usage > 1
            ) {

                alerts.push({

                    type: "danger",

                    icon: "🔴",

                    title:
                        `${category} budget exceeded`,

                    message:
                        `You've spent ${formatMoney(
                            spent
                        )} on ${category}, which is ${formatMoney(
                            spent - limit
                        )} over your category limit.`,

                    badge:
                        "Category Alert"

                });

            } else if (
                usage >= 0.80
            ) {

                alerts.push({

                    type: "warning",

                    icon: "🟡",

                    title:
                        `${category} is near its limit`,

                    message:
                        `You've used ${Math.round(
                            usage * 100
                        )}% of your ${category} budget. Only ${formatMoney(
                            Math.max(
                                0,
                                limit - spent
                            )
                        )} remains.`,

                    badge:
                        "Category Warning"

                });

            }

        }
    );


    /* =========================
       SAVINGS GOAL
    ========================= */

    const target =
        Number(
            savingsGoal.targetAmount
        ) || 0;


    const saved =
        Number(
            savingsGoal.currentSavings
        ) || 0;


    if (
        target > 0
    ) {

        const savingsPercentage =
            (
                saved /
                target
            ) * 100;


        if (
            savingsPercentage >= 100
        ) {

            alerts.push({

                type: "success",

                icon: "🎯",

                title:
                    "Savings goal reached!",

                message:
                    `Congratulations! You've reached your ${formatMoney(
                        target
                    )} savings goal.`,

                badge:
                    "Goal Reached"

            });

        } else if (
            savingsPercentage >= 75
        ) {

            alerts.push({

                type: "success",

                icon: "🎯",

                title:
                    "You're close to your savings goal",

                message:
                    `You've saved ${Math.round(
                        savingsPercentage
                    )}% of your goal. Only ${formatMoney(
                        Math.max(
                            0,
                            target - saved
                        )
                    )} remains.`,

                badge:
                    "Almost There"

            });

        } else if (
            savingsPercentage < 25
        ) {

            alerts.push({

                type: "warning",

                icon: "🎯",

                title:
                    "Your savings goal needs attention",

                message:
                    `You've saved ${Math.round(
                        savingsPercentage
                    )}% of your goal. Consider setting aside money before spending.`,

                badge:
                    "Savings Reminder"

            });

        }

    }


    /* =========================
       RECURRING EXPENSES
    ========================= */

    let recurringMonthlyExpenses =
        0;


    if (
        Array.isArray(
            recurringTransactions
        )
    ) {

        recurringTransactions.forEach(
            recurring => {

                if (
                    recurring.type !==
                    "expense"
                ) {

                    return;

                }


                const amount =
                    Number(
                        recurring.amount
                    ) || 0;


                if (
                    recurring.frequency ===
                    "weekly"
                ) {

                    recurringMonthlyExpenses +=
                        amount *
                        52 /
                        12;

                } else if (
                    recurring.frequency ===
                    "yearly"
                ) {

                    recurringMonthlyExpenses +=
                        amount /
                        12;

                } else {

                    recurringMonthlyExpenses +=
                        amount;

                }

            }
        );

    }


    if (
        income > 0 &&
        recurringMonthlyExpenses > 0
    ) {

        const recurringRatio =
            recurringMonthlyExpenses /
            income;


        if (
            recurringRatio >= 0.30
        ) {

            alerts.push({

                type: "danger",

                icon: "🔄",

                title:
                    "Recurring expenses are high",

                message:
                    `Your recurring expenses are approximately ${formatMoney(
                        recurringMonthlyExpenses
                    )} per month, using about ${Math.round(
                        recurringRatio * 100
                    )}% of your recorded income.`,

                badge:
                    "Recurring Alert"

            });

        } else if (
            recurringRatio >= 0.20
        ) {

            alerts.push({

                type: "warning",

                icon: "🔄",

                title:
                    "Review your recurring expenses",

                message:
                    `Your recurring expenses use about ${Math.round(
                        recurringRatio * 100
                    )}% of your recorded income. Consider reviewing subscriptions and regular payments.`,

                badge:
                    "Review Needed"

            });

        }

    }


    /* =========================
       POSITIVE FINANCIAL HEALTH
    ========================= */

    if (
        income > 0 &&
        expenses < income &&
        budget > 0 &&
        monthlyExpenses <= budget &&
        target > 0 &&
        saved >= target * 0.50
    ) {

        alerts.push({

            type: "success",

            icon: "💚",

            title:
                "You're building strong money habits",

            message:
                "Your income is currently higher than your expenses, you're within budget, and you're making meaningful progress toward your savings goal.",

            badge:
                "Great Progress"

        });

    }


    /* =========================
       SORT ALERTS
    ========================= */

    const priority = {

        danger: 1,

        warning: 2,

        info: 3,

        success: 4

    };


    alerts.sort(
        (a, b) =>
            priority[a.type] -
            priority[b.type]
    );


    /* =========================
       LIMIT ALERTS
    ========================= */

    const visibleAlerts =
        alerts.slice(
            0,
            8
        );


    /* =========================
       EMPTY STATE
    ========================= */

    if (
        visibleAlerts.length ===
        0
    ) {

        alertsContainer.innerHTML = `
            <div class="alert-empty">

                <div class="alert-empty-icon">
                    💚
                </div>

                <h3>
                    No financial warnings
                </h3>

                <p>
                    Everything looks good right now. Keep tracking your money to stay ahead.
                </p>

            </div>
        `;

        return;

    }


    /* =========================
       RENDER ALERTS
    ========================= */

    alertsContainer.innerHTML =
        visibleAlerts.map(
            alert => {

                return `
                    <div
                        class="financial-alert ${alert.type}"
                    >

                        <div class="financial-alert-icon">
                            ${alert.icon}
                        </div>


                        <div class="financial-alert-content">

                            <h3>
                                ${escapeHTML(
                                    alert.title
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    alert.message
                                )}
                            </p>

                            <span class="financial-alert-badge">
                                ${escapeHTML(
                                    alert.badge
                                )}
                            </span>

                        </div>

                    </div>
                `;

            }
        ).join("");

}


/* =========================================================
   CONNECT SMART ALERTS TO DASHBOARD
========================================================= */

function refreshFinancialAlerts() {

    updateFinancialAlerts();

}


/* =========================================================
   INITIALIZE SMART ALERTS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateFinancialAlerts();

    }
);


/* =========================================================
   EXPOSE SMART ALERT FUNCTIONS
========================================================= */

window.updateFinancialAlerts =
    updateFinancialAlerts;

window.refreshFinancialAlerts =
    refreshFinancialAlerts;
