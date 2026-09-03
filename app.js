/* =========================================================
   MONEYLEAK
   Main Application JavaScript
========================================================= */


/* =========================================================
   STORAGE
========================================================= */

const TRANSACTIONS_KEY = "moneyLeakTransactions";
const SAVINGS_KEY = "moneyLeakSavingsGoal";


/* =========================================================
   GLOBAL DATA
========================================================= */

let transactions = loadTransactions();

let savingsGoal = loadSavingsGoal();


/* =========================================================
   BASIC HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function formatMoney(amount) {
    const value = Number(amount) || 0;

    return "₦" + value.toLocaleString("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}


function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getToday() {
    return new Date().toISOString();
}


/* =========================================================
   TRANSACTION STORAGE
========================================================= */

function loadTransactions() {

    try {

        const saved = localStorage.getItem(TRANSACTIONS_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed) ? parsed : [];

    } catch (error) {

        console.error("Could not load transactions:", error);

        return [];
    }
}


function saveTransactions() {

    localStorage.setItem(
        TRANSACTIONS_KEY,
        JSON.stringify(transactions)
    );
}


/* =========================================================
   SAVINGS STORAGE
========================================================= */

function loadSavingsGoal() {

    try {

        const saved = localStorage.getItem(SAVINGS_KEY);

        if (!saved) {
            return null;
        }

        const parsed = JSON.parse(saved);

        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        return parsed;

    } catch (error) {

        console.error("Could not load savings goal:", error);

        return null;
    }
}


function saveSavingsGoalToStorage(goal) {

    savingsGoal = goal;

    localStorage.setItem(
        SAVINGS_KEY,
        JSON.stringify(goal)
    );
}


/* =========================================================
   ADD TRANSACTION
========================================================= */

function addTransaction() {

    const amountInput = getElement("amount");
    const typeInput = getElement("type");
    const categoryInput = getElement("category");

    if (!amountInput || !typeInput || !categoryInput) {
        return;
    }

    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value.trim();


    if (!amount || amount <= 0) {

        alert("Please enter a valid amount.");

        amountInput.focus();

        return;
    }


    if (type !== "income" && type !== "expense") {

        alert("Please choose Income or Expense.");

        return;
    }


    if (!category) {

        alert("Please enter a category.");

        categoryInput.focus();

        return;
    }


    const transaction = {

        id: Date.now().toString(),

        amount: amount,

        type: type,

        category: category,

        date: getToday()

    };


    transactions.unshift(transaction);

    saveTransactions();

    amountInput.value = "";
    categoryInput.value = "";

    updateDashboard();
    updateBudgetDisplay();
    refreshCategoryBudgets();
    showTransactionSuccess();

    getElement("transactionList")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================================
   TRANSACTION SUCCESS
========================================================= */

function showTransactionSuccess() {

    const button = document.querySelector(
        "#transactionForm .primary-button"
    );

    if (!button) {
        return;
    }

    const originalText = button.textContent;

    button.textContent = "✓ Added Successfully";

    button.disabled = true;

    setTimeout(() => {

        button.textContent = originalText;

        button.disabled = false;

    }, 1200);
}


/* =========================================================
   CALCULATE TOTALS
========================================================= */

function calculateTotals() {

    let income = 0;
    let expenses = 0;


    transactions.forEach(transaction => {

        const amount = Number(transaction.amount) || 0;

        if (transaction.type === "income") {

            income += amount;

        } else if (transaction.type === "expense") {

            expenses += amount;
        }
    });


    return {
        income,
        expenses,
        balance: income - expenses
    };
}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard() {

    const totals = calculateTotals();


    const balanceElement = getElement("balance");
    const incomeElement = getElement("income");
    const expensesElement = getElement("expenses");


    if (balanceElement) {

        balanceElement.textContent =
            formatMoney(totals.balance);
    }


    if (incomeElement) {

        incomeElement.textContent =
            formatMoney(totals.income);
    }


    if (expensesElement) {

        expensesElement.textContent =
            formatMoney(totals.expenses);
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
}


/* =========================================================
   MONEY HEALTH
========================================================= */

function updateMoneyHealth(income, expenses) {

    const scoreElement = getElement("healthScore");
    const fillElement = getElement("healthFill");
    const messageElement = getElement("healthMessage");
    const explanationElement = getElement("healthExplanation");
    const iconElement = getElement("healthIcon");


    if (
        !scoreElement ||
        !fillElement ||
        !messageElement ||
        !explanationElement
    ) {
        return;
    }


    if (income <= 0) {

        scoreElement.textContent = "0 / 100";

        fillElement.style.width = "0%";

        messageElement.textContent =
            "Add some income and expenses to calculate your Money Health.";

        explanationElement.textContent =
            "Your score is based on how much of your income you spend.";

        if (iconElement) {
            iconElement.textContent = "💚";
        }

        return;
    }


    const spendingRatio = expenses / income;

    let score;


    if (spendingRatio <= 0.30) {

        score = 95;

    } else if (spendingRatio <= 0.50) {

        score = 85;

    } else if (spendingRatio <= 0.70) {

        score = 70;

    } else if (spendingRatio <= 0.85) {

        score = 50;

    } else if (spendingRatio <= 1) {

        score = 30;

    } else {

        score = 15;
    }


    scoreElement.textContent = `${score} / 100`;

    fillElement.style.width = `${score}%`;


    if (score >= 85) {

        messageElement.textContent =
            "Excellent! Your money habits look healthy.";

        if (iconElement) {
            iconElement.textContent = "💚";
        }

    } else if (score >= 70) {

        messageElement.textContent =
            "Good job. There is still room to improve.";

        if (iconElement) {
            iconElement.textContent = "🟢";
        }

    } else if (score >= 50) {

        messageElement.textContent =
            "Be careful. Your spending is getting high.";

        if (iconElement) {
            iconElement.textContent = "🟡";
        }

    } else {

        messageElement.textContent =
            "Warning: your spending is putting pressure on your income.";

        if (iconElement) {
            iconElement.textContent = "🔴";
        }
    }


    explanationElement.textContent =
        `You spend ${Math.round(spendingRatio * 100)}% of your recorded income.`;
}


/* =========================================================
   DISPLAY TRANSACTIONS
========================================================= */

function displayTransactions() {

    const list = getElement("transactionList");

    if (!list) {
        return;
    }


    if (transactions.length === 0) {

        list.innerHTML = `
            <div class="empty-state">

                <div class="empty-state-icon">
                    💳
                </div>

                <h3>
                    No transactions yet
                </h3>

                <p>
                    Add your first income or expense to start tracking your money.
                </p>

            </div>
        `;

        return;
    }


    const recentTransactions =
        transactions.slice(0, 20);


    list.innerHTML =
        recentTransactions.map(transaction => {

            const amount = Number(transaction.amount) || 0;

            const isIncome =
                transaction.type === "income";


            const date = formatTransactionDate(
                transaction.date
            );


            return `
                <div class="transaction-item">

                    <div class="transaction-info">

                        <div class="transaction-icon">
                            ${isIncome ? "↑" : "↓"}
                        </div>

                        <div class="transaction-details">

                            <div class="transaction-category">
                                ${escapeHTML(transaction.category)}
                            </div>

                            <div class="transaction-date">
                                ${date}
                            </div>

                            <div class="transaction-actions">

                                <button
                                    type="button"
                                    onclick="editTransaction('${transaction.id}')"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="delete-button"
                                    onclick="deleteTransaction('${transaction.id}')"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    </div>


                    <div
                        class="transaction-amount ${
                            isIncome
                                ? "transaction-income"
                                : "transaction-expense"
                        }"
                    >
                        ${isIncome ? "+" : "-"}${formatMoney(amount)}
                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   FORMAT TRANSACTION DATE
========================================================= */

function formatTransactionDate(dateValue) {

    if (!dateValue) {
        return "Unknown date";
    }


    const date = new Date(dateValue);


    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }


    return date.toLocaleDateString("en-NG", {

        day: "numeric",

        month: "short",

        year: "numeric"
    });
}


/* =========================================================
   EDIT TRANSACTION
========================================================= */

function editTransaction(id) {

    const transaction =
        transactions.find(item => item.id === id);


    if (!transaction) {
        return;
    }


    const newAmount =
        prompt(
            "Enter the new amount:",
            transaction.amount
        );


    if (newAmount === null) {
        return;
    }


    const amount = Number(newAmount);


    if (!amount || amount <= 0) {

        alert("Please enter a valid amount.");

        return;
    }


    const newCategory =
        prompt(
            "Enter the category:",
            transaction.category
        );


    if (newCategory === null) {
        return;
    }


    const category =
        newCategory.trim();


    if (!category) {

        alert("Category cannot be empty.");

        return;
    }


    transaction.amount = amount;

    transaction.category = category;


    saveTransactions();

    updateDashboard();

    updateBudgetDisplay();

    refreshCategoryBudgets();
}


/* =========================================================
   DELETE TRANSACTION
========================================================= */

function deleteTransaction(id) {

    const transaction =
        transactions.find(item => item.id === id);


    if (!transaction) {
        return;
    }


    const confirmed =
        confirm(
            `Delete ${transaction.category} (${formatMoney(transaction.amount)})?`
        );


    if (!confirmed) {
        return;
    }


    transactions =
        transactions.filter(
            item => item.id !== id
        );


    saveTransactions();

    updateDashboard();

    updateBudgetDisplay();

    refreshCategoryBudgets();
}


/* =========================================================
   MONEY LEAK DETECTOR
========================================================= */

function detectMoneyLeak() {

    const leakMessage =
        getElement("leakMessage");


    if (!leakMessage) {
        return;
    }


    const expenses =
        transactions.filter(
            transaction =>
                transaction.type === "expense"
        );


    if (expenses.length === 0) {

        leakMessage.innerHTML = `
            <div class="empty-insight">

                <span>
                    💡
                </span>

                <p>
                    Add some expenses and MoneyLeak will find where your money is going.
                </p>

            </div>
        `;

        return;
    }


    const categories = {};


    expenses.forEach(transaction => {

        const category =
            transaction.category.trim() || "Other";


        categories[category] =
            (categories[category] || 0)
            + Number(transaction.amount);
    });


    const sorted =
        Object.entries(categories)
            .sort((a, b) => b[1] - a[1]);


    const biggestCategory =
        sorted[0][0];

    const biggestAmount =
        sorted[0][1];


    const potentialMonthlySaving =
        biggestAmount * 0.20;


    const potentialYearlySaving =
        potentialMonthlySaving * 12;


    leakMessage.innerHTML = `
        <div class="leak-card">

            <h3>
                Your biggest money leak is ${escapeHTML(biggestCategory)}
            </h3>

            <p>
                You have recorded
                <strong>${formatMoney(biggestAmount)}</strong>
                in ${escapeHTML(biggestCategory)} expenses.
            </p>

            <p>
                Cutting this category by just 20% could potentially save:
            </p>

            <div class="leak-saving">

                <strong>
                    ${formatMoney(potentialMonthlySaving)}
                </strong>
                per month

                <br>

                <strong>
                    ${formatMoney(potentialYearlySaving)}
                </strong>
                per year

            </div>

        </div>
    `;
}


/* =========================================================
   SPENDING CHART
========================================================= */

function updateSpendingChart() {

    const chart =
        getElement("spendingChart");


    if (!chart) {
        return;
    }


    const expenses =
        transactions.filter(
            transaction =>
                transaction.type === "expense"
        );


    if (expenses.length === 0) {

        chart.innerHTML = `
            <div class="empty-state">

                <div class="empty-state-icon">
                    📊
                </div>

                <h3>
                    No spending data yet
                </h3>

                <p>
                    Add some expenses to see your spending activity.
                </p>

            </div>
        `;

        return;
    }


    const categories = {};


    expenses.forEach(transaction => {

        const category =
            transaction.category.trim() || "Other";


        categories[category] =
            (categories[category] || 0)
            + Number(transaction.amount);
    });


    const sorted =
        Object.entries(categories)
            .sort((a, b) => b[1] - a[1]);


    const maximum =
        sorted[0][1];


    chart.innerHTML =
        sorted.map(([category, amount]) => {

            const percentage =
                maximum > 0
                    ? (amount / maximum) * 100
                    : 0;


            return `
                <div class="chart-item">

                    <div class="chart-item-header">

                        <span>
                            ${escapeHTML(category)}
                        </span>

                        <span>
                            ${formatMoney(amount)}
                        </span>

                    </div>

                    <div class="chart-bar">

                        <div
                            class="chart-fill"
                            style="width: ${percentage}%"
                        ></div>

                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   SPENDING BREAKDOWN
========================================================= */

function updateSpendingBreakdown() {

    const breakdown =
        getElement("spendingBreakdown");


    if (!breakdown) {
        return;
    }


    const expenses =
        transactions.filter(
            transaction =>
                transaction.type === "expense"
        );


    if (expenses.length === 0) {

        breakdown.innerHTML = `
            <div class="empty-state">

                <div class="empty-state-icon">
                    🧾
                </div>

                <h3>
                    Nothing to break down yet
                </h3>

                <p>
                    Your spending categories will appear here after you add expenses.
                </p>

            </div>
        `;

        return;
    }


    const categories = {};


    expenses.forEach(transaction => {

        const category =
            transaction.category.trim() || "Other";


        categories[category] =
            (categories[category] || 0)
            + Number(transaction.amount);
    });


    const sorted =
        Object.entries(categories)
            .sort((a, b) => b[1] - a[1]);


    const total =
        sorted.reduce(
            (sum, [, amount]) => sum + amount,
            0
        );


    breakdown.innerHTML =
        sorted.map(([category, amount]) => {

            const percentage =
                total > 0
                    ? (amount / total) * 100
                    : 0;


            return `
                <div class="breakdown-item">

                    <div class="breakdown-header">

                        <span>
                            ${escapeHTML(category)}
                        </span>

                        <span>
                            ${formatMoney(amount)}
                            · ${Math.round(percentage)}%
                        </span>

                    </div>

                    <div class="breakdown-bar">

                        <div
                            class="breakdown-fill"
                            style="width: ${percentage}%"
                        ></div>

                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   SAVINGS GOAL — CALCULATE
========================================================= */

function calculateSavingsGoal() {

    const goalInput =
        getElement("savingsGoal");

    const savedInput =
        getElement("currentSavings");

    const weeksInput =
        getElement("goalWeeks");


    if (
        !goalInput ||
        !savedInput ||
        !weeksInput
    ) {
        return;
    }


    const goal =
        Number(goalInput.value);

    const saved =
        Number(savedInput.value);

    const weeks =
        Number(weeksInput.value);


    if (!goal || goal <= 0) {

        alert("Please enter a valid savings target.");

        goalInput.focus();

        return;
    }


    if (saved < 0) {

        alert("Already saved cannot be negative.");

        savedInput.focus();

        return;
    }


    if (saved > goal) {

        alert("Already saved cannot be greater than your target.");

        savedInput.focus();

        return;
    }


    if (!weeks || weeks <= 0) {

        alert("Please enter how many weeks you have.");

        weeksInput.focus();

        return;
    }


    renderSavingsPlan(
        goal,
        saved,
        weeks
    );
}


/* =========================================================
   RENDER SAVINGS PLAN
========================================================= */

function renderSavingsPlan(
    goal,
    saved,
    weeks
) {

    const result =
        getElement("savingsResult");


    if (!result) {
        return;
    }


    const remaining =
        Math.max(goal - saved, 0);


    const weekly =
        remaining / weeks;


    const daily =
        weekly / 7;


    const progress =
        Math.min(
            (saved / goal) * 100,
            100
        );


    const targetDate =
        new Date();


    targetDate.setDate(
        targetDate.getDate() + (weeks * 7)
    );


    result.innerHTML = `
        <div class="goal-result">

            <h3>
                🎯 Your Savings Plan
            </h3>

            <p>
                You still need
                <strong>${formatMoney(remaining)}</strong>
                to reach your goal.
            </p>

            <p>
                Save approximately
                <strong>${formatMoney(Math.ceil(weekly))}</strong>
                per week.
            </p>

            <p>
                That's about
                <strong>${formatMoney(Math.ceil(daily))}</strong>
                per day.
            </p>

            <div class="goal-progress-bar">

                <div
                    style="width: ${progress}%"
                ></div>

            </div>

            <p>
                <strong>${Math.round(progress)}% saved</strong>
            </p>

            <p>
                📅 Target date:
                <strong>
                    ${targetDate.toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    })}
                </strong>
            </p>

        </div>
    `;


    updateSavingsDisplay(
        goal,
        saved
    );
}


/* =========================================================
   UPDATE SAVINGS GOAL
========================================================= */

function updateSavingsGoal() {

    const goalInput =
        getElement("savingsGoal");

    const savedInput =
        getElement("currentSavings");

    const weeksInput =
        getElement("goalWeeks");


    if (
        !goalInput ||
        !savedInput ||
        !weeksInput
    ) {
        return;
    }


    const goal =
        Number(goalInput.value);

    const saved =
        Number(savedInput.value);

    const weeks =
        Number(weeksInput.value);


    if (!goal || goal <= 0) {

        alert("Please enter a valid savings target.");

        return;
    }


    if (saved < 0 || saved > goal) {

        alert("Please make sure your saved amount is between ₦0 and your target.");

        return;
    }


    if (!weeks || weeks <= 0) {

        alert("Please enter a valid number of weeks.");

        return;
    }


    const goalData = {

        target: goal,

        saved: saved,

        weeks: weeks,

        updatedAt: getToday()
    };


    saveSavingsGoalToStorage(
        goalData
    );


    renderSavingsPlan(
        goal,
        saved,
        weeks
    );


    updateSavingsProgress();


    alert("Savings goal updated successfully! 🎯");
}


/* =========================================================
   SAVE SAVINGS GOAL
   Kept as a public function for future savings.html
========================================================= */

function saveSavingsGoal() {

    updateSavingsGoal();
}


/* =========================================================
   RESET SAVINGS GOAL
========================================================= */

function resetSavingsGoal() {

    const hasGoal =
        localStorage.getItem(SAVINGS_KEY);


    if (!hasGoal) {

        resetSavingsDisplay();

        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to reset your savings goal?"
        );


    if (!confirmed) {
        return;
    }


    localStorage.removeItem(
        SAVINGS_KEY
    );


    savingsGoal = null;


    const goalInput =
        getElement("savingsGoal");

    const savedInput =
        getElement("currentSavings");

    const weeksInput =
        getElement("goalWeeks");

    const result =
        getElement("savingsResult");


    if (goalInput) {
        goalInput.value = "";
    }

    if (savedInput) {
        savedInput.value = "";
    }

    if (weeksInput) {
        weeksInput.value = "";
    }

    if (result) {
        result.innerHTML = "";
    }


    resetSavingsDisplay();

    alert("Savings goal reset.");
}


/* =========================================================
   UPDATE SAVINGS PROGRESS
========================================================= */

function updateSavingsProgress() {

    if (!savingsGoal) {

        resetSavingsDisplay();

        return;
    }


    const goal =
        Number(savingsGoal.target);

    const saved =
        Number(savingsGoal.saved);


    if (!goal || goal <= 0) {

        resetSavingsDisplay();

        return;
    }


    updateSavingsDisplay(
        goal,
        saved
    );
}


/* =========================================================
   UPDATE SAVINGS DISPLAY
========================================================= */

function updateSavingsDisplay(
    goal,
    saved
) {

    const progressFill =
        getElement("progressFill");

    const progressText =
        getElement("progressText");

    const savedAmount =
        getElement("savedAmount");

    const targetAmount =
        getElement("targetAmount");

    const remainingAmount =
        getElement("remainingAmount");


    const percentage =
        Math.min(
            Math.max((saved / goal) * 100, 0),
            100
        );


    const remaining =
        Math.max(goal - saved, 0);


    if (progressFill) {

        progressFill.style.width =
            `${percentage}%`;
    }


    if (progressText) {

        progressText.textContent =
            `${Math.round(percentage)}% saved`;
    }


    if (savedAmount) {

        savedAmount.textContent =
            formatMoney(saved);
    }


    if (targetAmount) {

        targetAmount.textContent =
            formatMoney(goal);
    }


    if (remainingAmount) {

        if (remaining === 0) {

            remainingAmount.textContent =
                "🎉 Congratulations! You reached your savings goal.";

        } else {

            remainingAmount.textContent =
                `You have ${formatMoney(remaining)} left to reach your goal.`;
        }
    }
}


/* =========================================================
   RESET SAVINGS DISPLAY
========================================================= */

function resetSavingsDisplay() {

    const progressFill =
        getElement("progressFill");

    const progressText =
        getElement("progressText");

    const savedAmount =
        getElement("savedAmount");

    const targetAmount =
        getElement("targetAmount");

    const remainingAmount =
        getElement("remainingAmount");


    if (progressFill) {
        progressFill.style.width = "0%";
    }


    if (progressText) {
        progressText.textContent = "0% saved";
    }


    if (savedAmount) {
        savedAmount.textContent = formatMoney(0);
    }


    if (targetAmount) {
        targetAmount.textContent = formatMoney(0);
    }


    if (remainingAmount) {
        remainingAmount.textContent =
            "Enter your goal to start tracking.";
    }
}


/* =========================================================
   LOAD SAVINGS GOAL INTO FORM
========================================================= */

function loadSavedSavingsGoal() {

    if (!savingsGoal) {
        return;
    }


    const goalInput =
        getElement("savingsGoal");

    const savedInput =
        getElement("currentSavings");

    const weeksInput =
        getElement("goalWeeks");


    if (goalInput) {
        goalInput.value =
            savingsGoal.target || "";
    }


    if (savedInput) {
        savedInput.value =
            savingsGoal.saved || 0;
    }


    if (weeksInput) {
        weeksInput.value =
            savingsGoal.weeks || "";
    }


    if (
        savingsGoal.target &&
        savingsGoal.weeks
    ) {

        renderSavingsPlan(
            Number(savingsGoal.target),
            Number(savingsGoal.saved || 0),
            Number(savingsGoal.weeks)
        );
    }
}


/* =========================================================
   QUICK ACTIONS
========================================================= */

function setupQuickActions() {

    const actions =
        document.querySelectorAll(
            ".quick-action[data-transaction-type]"
        );


    actions.forEach(action => {

        action.addEventListener(
            "click",
            function() {

                const type =
                    this.dataset.transactionType;


                const typeInput =
                    getElement("type");


                if (typeInput && type) {

                    typeInput.value = type;
                }
            }
        );
    });
}


/* =========================================================
   TRANSACTION FORM
========================================================= */

function setupTransactionForm() {

    const form =
        getElement("transactionForm");


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            addTransaction();
        }
    );
}


/* =========================================================
   SAVINGS BUTTONS
========================================================= */

function setupSavingsButtons() {

    const calculateButton =
        getElement("calculateSavingsButton");

    const updateButton =
        getElement("updateSavingsButton");

    const resetButton =
        getElement("resetSavingsButton");


    if (calculateButton) {

        calculateButton.addEventListener(
            "click",
            calculateSavingsGoal
        );
    }


    if (updateButton) {

        updateButton.addEventListener(
            "click",
            updateSavingsGoal
        );
    }


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetSavingsGoal
        );
    }
}


/* =========================================================
   ENTER KEY SUPPORT
========================================================= */

function setupEnterKeySupport() {

    const savingsInputs =
        document.querySelectorAll(
            "#savingsGoal, #currentSavings, #goalWeeks"
        );


    savingsInputs.forEach(input => {

        input.addEventListener(
            "keydown",
            function(event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    calculateSavingsGoal();
                }
            }
        );
    });
}


/* =========================================================
   INITIALIZE APP
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        setupTransactionForm();

        setupQuickActions();

        setupSavingsButtons();

        setupEnterKeySupport();

        loadSavedSavingsGoal();

        updateDashboard();

    }
);


/* =========================================================
   BACKWARD COMPATIBILITY
========================================================= */

/*
   These functions make the new system easier to use
   from other MoneyLeak pages.
*/

window.addTransaction =
    addTransaction;

window.editTransaction =
    editTransaction;

window.deleteTransaction =
    deleteTransaction;

window.calculateSavingsGoal =
    calculateSavingsGoal;

window.updateSavingsGoal =
    updateSavingsGoal;

window.saveSavingsGoal =
    saveSavingsGoal;

window.resetSavingsGoal =
    resetSavingsGoal;

window.loadSavedSavingsGoal =
    loadSavedSavingsGoal;
/* =========================
   MONTHLY BUDGET SYSTEM
========================= */

const BUDGET_STORAGE_KEY = "moneyLeakMonthlyBudget";

let monthlyBudget = loadMonthlyBudget();


function loadMonthlyBudget() {
    const savedBudget = localStorage.getItem(BUDGET_STORAGE_KEY);

    if (!savedBudget) {
        return 0;
    }

    const budget = Number(savedBudget);

    return Number.isFinite(budget) && budget > 0
        ? budget
        : 0;
}


function saveMonthlyBudget() {
    if (monthlyBudget > 0) {
        localStorage.setItem(
            BUDGET_STORAGE_KEY,
            String(monthlyBudget)
        );
    } else {
        localStorage.removeItem(BUDGET_STORAGE_KEY);
    }
}


function getCurrentMonthExpenses() {

    const now = new Date();

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions
        .filter(transaction => {

            if (transaction.type !== "expense") {
                return false;
            }

            const transactionDate =
                new Date(transaction.date);

            return (
                transactionDate.getMonth() === currentMonth &&
                transactionDate.getFullYear() === currentYear
            );
        })
        .reduce(
            (total, transaction) =>
                total + Number(transaction.amount || 0),
            0
        );
}


function updateBudgetDisplay() {

    const result =
        document.getElementById("budgetResult");

    if (!result) {
        return;
    }

    if (!monthlyBudget || monthlyBudget <= 0) {

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


    const spent = getCurrentMonthExpenses();

    const remaining =
        monthlyBudget - spent;

    const percentage =
        (spent / monthlyBudget) * 100;

    const displayPercentage =
        Math.max(0, Math.min(percentage, 100));


    let statusClass = "safe";
    let statusText = "On Track";
    let message = "";


    if (percentage >= 100) {

        statusClass = "danger";
        statusText = "Over Budget";

        message = `
            ⚠️ You've exceeded your monthly budget by
            <strong>${formatMoney(Math.abs(remaining))}</strong>.
            Consider reducing non-essential spending for the rest of the month.
        `;

    } else if (percentage >= 80) {

        statusClass = "warning";
        statusText = "Almost at Limit";

        message = `
            ⚠️ You've used more than 80% of your budget.
            You have
            <strong>${formatMoney(remaining)}</strong>
            remaining this month.
        `;

    } else {

        statusClass = "safe";
        statusText = "On Track";

        message = `
            ✅ You're currently on track.
            You have
            <strong>${formatMoney(remaining)}</strong>
            available for the rest of the month.
        `;
    }


    result.innerHTML = `

        <div class="budget-card">

            <div class="budget-card-header">

                <div>

                    <h3 class="budget-card-title">
                        This Month's Budget
                    </h3>

                    <p>
                        ${percentage.toFixed(1)}% used
                    </p>

                </div>

                <span class="budget-status ${statusClass}">
                    ${statusText}
                </span>

            </div>


            <div class="budget-progress">

                <div
                    class="budget-progress-fill ${statusClass}"
                    style="width: ${displayPercentage}%"
                ></div>

            </div>


            <div class="budget-stats">

                <div class="budget-stat">

                    <span class="budget-stat-label">
                        Monthly Budget
                    </span>

                    <span class="budget-stat-value">
                        ${formatMoney(monthlyBudget)}
                    </span>

                </div>


                <div class="budget-stat">

                    <span class="budget-stat-label">
                        Spent
                    </span>

                    <span class="budget-stat-value">
                        ${formatMoney(spent)}
                    </span>

                </div>


                <div class="budget-stat">

                    <span class="budget-stat-label">
                        Remaining
                    </span>

                    <span class="budget-stat-value">
                        ${formatMoney(Math.max(remaining, 0))}
                    </span>

                </div>

            </div>


            <p class="budget-message">
                ${message}
            </p>

        </div>
    `;
}


function setupBudgetSystem() {

    const budgetInput =
        document.getElementById("monthlyBudget");

    const saveButton =
        document.getElementById("saveBudgetButton");

    const resetButton =
        document.getElementById("resetBudgetButton");


    if (!budgetInput || !saveButton || !resetButton) {
        return;
    }


    if (monthlyBudget > 0) {

        budgetInput.value =
            monthlyBudget;
    }


    saveButton.addEventListener(
        "click",
        function () {

            const value =
                Number(budgetInput.value);


            if (!Number.isFinite(value) || value <= 0) {

                alert(
                    "Please enter a valid monthly budget."
                );

                budgetInput.focus();

                return;
            }


            monthlyBudget = value;

            saveMonthlyBudget();

            updateBudgetDisplay();

            alert(
                "Your monthly budget has been saved."
            );
        }
    );


    resetButton.addEventListener(
        "click",
        function () {

            if (!monthlyBudget) {
                return;
            }


            const confirmed =
                confirm(
                    "Are you sure you want to reset your monthly budget?"
                );


            if (!confirmed) {
                return;
            }


            monthlyBudget = 0;

            saveMonthlyBudget();

            budgetInput.value = "";

            updateBudgetDisplay();
        }
    );


    updateBudgetDisplay();
}


/* =========================
   UPDATE BUDGET AUTOMATICALLY
========================= */

function refreshBudgetAfterTransactionChange() {

    if (
        typeof updateBudgetDisplay === "function"
    ) {
        updateBudgetDisplay();
    }
}


/* =========================
   INITIALIZE BUDGET
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupBudgetSystem();

        updateBudgetDisplay();
    }
);


/* Make budget functions available */
window.updateBudgetDisplay =
    updateBudgetDisplay;

window.setupBudgetSystem =
    setupBudgetSystem;
/* =========================
   CATEGORY BUDGET SYSTEM
========================= */

const CATEGORY_BUDGET_STORAGE_KEY = "moneyLeakCategoryBudgets";

const categoryBudgetFields = {
    Food: "budgetFood",
    Transport: "budgetTransport",
    Bills: "budgetBills",
    Shopping: "budgetShopping",
    Entertainment: "budgetEntertainment",
    Health: "budgetHealth",
    Education: "budgetEducation",
    Other: "budgetOther"
};


function loadCategoryBudgets() {

    const saved =
        localStorage.getItem(CATEGORY_BUDGET_STORAGE_KEY);

    if (!saved) {
        return {};
    }

    try {

        const parsed = JSON.parse(saved);

        return parsed && typeof parsed === "object"
            ? parsed
            : {};

    } catch (error) {

        return {};
    }
}


let categoryBudgets = loadCategoryBudgets();


function saveCategoryBudgets() {

    localStorage.setItem(
        CATEGORY_BUDGET_STORAGE_KEY,
        JSON.stringify(categoryBudgets)
    );
}


function normalizeCategory(category) {

    return String(category || "")
        .trim()
        .toLowerCase();
}


function getCategorySpending(category) {

    const targetCategory =
        normalizeCategory(category);

    return transactions
        .filter(transaction => {

            if (transaction.type !== "expense") {
                return false;
            }

            const transactionDate =
                new Date(transaction.date);

            const now = new Date();

            const sameMonth =
                transactionDate.getMonth() === now.getMonth() &&
                transactionDate.getFullYear() === now.getFullYear();

            return (
                sameMonth &&
                normalizeCategory(transaction.category) === targetCategory
            );
        })
        .reduce(
            (total, transaction) =>
                total + Number(transaction.amount || 0),
            0
        );
}


function getCategoryBudgetAmount(category) {

    return Number(
        categoryBudgets[category] || 0
    );
}


function updateCategoryBudgetDisplay() {

    const results =
        document.getElementById(
            "categoryBudgetResults"
        );

    if (!results) {
        return;
    }


    const activeCategories =
        Object.keys(categoryBudgetFields)
            .filter(category =>
                getCategoryBudgetAmount(category) > 0
            );


    if (activeCategories.length === 0) {

        results.innerHTML = `
            <div class="category-budget-empty">

                Set a limit for one or more categories
                to start tracking your spending.

            </div>
        `;

        return;
    }


    results.innerHTML =
        activeCategories.map(category => {

            const budget =
                getCategoryBudgetAmount(category);

            const spent =
                getCategorySpending(category);

            const remaining =
                budget - spent;

            const percentage =
                (spent / budget) * 100;

            const progress =
                Math.max(
                    0,
                    Math.min(percentage, 100)
                );


            let statusClass = "safe";
            let statusText = "On Track";


            if (percentage >= 100) {

                statusClass = "danger";
                statusText = "Over Budget";

            } else if (percentage >= 80) {

                statusClass = "warning";
                statusText = "Almost at Limit";
            }


            return `

                <div class="category-budget-card">

                    <div class="category-budget-card-header">

                        <h3 class="category-budget-card-title">
                            ${category}
                        </h3>

                        <span class="category-budget-card-status ${statusClass}">
                            ${statusText}
                        </span>

                    </div>


                    <div class="category-budget-progress">

                        <div
                            class="category-budget-progress-fill ${statusClass}"
                            style="width: ${progress}%"
                        ></div>

                    </div>


                    <div class="category-budget-card-stats">

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
                            Remaining:
                            <strong>
                                ${formatMoney(Math.max(remaining, 0))}
                            </strong>
                        </span>

                    </div>

                </div>

            `;

        }).join("");
}


function setupCategoryBudgetSystem() {

    const saveButton =
        document.getElementById(
            "saveCategoryBudgetsButton"
        );

    if (!saveButton) {
        return;
    }


    Object.entries(categoryBudgetFields)
        .forEach(([category, inputId]) => {

            const input =
                document.getElementById(inputId);

            if (!input) {
                return;
            }

            const savedValue =
                getCategoryBudgetAmount(category);

            if (savedValue > 0) {
                input.value = savedValue;
            }

        });


    saveButton.addEventListener(
        "click",
        function () {

            const newBudgets = {};


            Object.entries(categoryBudgetFields)
                .forEach(([category, inputId]) => {

                    const input =
                        document.getElementById(inputId);

                    if (!input) {
                        return;
                    }

                    const value =
                        Number(input.value);


                    if (
                        Number.isFinite(value) &&
                        value > 0
                    ) {

                        newBudgets[category] = value;

                    }

                });


            categoryBudgets = newBudgets;

            saveCategoryBudgets();

            updateCategoryBudgetDisplay();

            alert(
                "Your category budgets have been saved."
            );
        }
    );


    updateCategoryBudgetDisplay();
}


/* =========================
   UPDATE CATEGORY BUDGETS
========================= */

function refreshCategoryBudgets() {

    updateCategoryBudgetDisplay();
}


/* =========================
   INITIALIZE CATEGORY BUDGETS
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupCategoryBudgetSystem();

        updateCategoryBudgetDisplay();

    }
);


/* Make category budget functions available */

window.updateCategoryBudgetDisplay =
    updateCategoryBudgetDisplay;

window.refreshCategoryBudgets =
    refreshCategoryBudgets;

/* =========================================================
   SPENDING ANALYTICS
========================================================= */

function updateSpendingAnalytics() {

    const summary =
        document.querySelector(".analytics-summary");

    const totalSpentElement =
        document.getElementById("analyticsTotalSpent");

    const topCategoryElement =
        document.getElementById("analyticsTopCategory");

    const dailyAverageElement =
        document.getElementById("analyticsDailyAverage");

    const bars =
        document.getElementById("analyticsBars");

    const insight =
        document.getElementById("analyticsInsight");


    if (!summary || !bars) {
        return;
    }


    const now = new Date();

    const currentMonth =
        now.getMonth();

    const currentYear =
        now.getFullYear();


    const expenses =
        transactions.filter(transaction => {

            if (transaction.type !== "expense") {
                return false;
            }

            const transactionDate =
                new Date(transaction.date);

            return (
                transactionDate.getMonth() === currentMonth &&
                transactionDate.getFullYear() === currentYear
            );
        });


    if (expenses.length === 0) {

        if (totalSpentElement) {
            totalSpentElement.textContent =
                formatMoney(0);
        }

        if (topCategoryElement) {
            topCategoryElement.textContent = "—";
        }

        if (dailyAverageElement) {
            dailyAverageElement.textContent =
                formatMoney(0);
        }

        bars.innerHTML = `
            <div class="analytics-empty">

                <strong>
                    No spending data yet
                </strong>

                <p>
                    Add some expenses this month
                    to see your spending analytics.
                </p>

            </div>
        `;

        if (insight) {
            insight.innerHTML =
                "💡 Your spending insights will appear here after you add expenses.";
        }

        return;
    }


    /* =========================
       TOTAL SPENDING
    ========================= */

    const totalSpent =
        expenses.reduce(
            (total, transaction) =>
                total +
                Number(transaction.amount || 0),
            0
        );


    /* =========================
       DAILY AVERAGE
    ========================= */

    const daysPassed =
        now.getDate();

    const dailyAverage =
        totalSpent / Math.max(daysPassed, 1);


    /* =========================
       CATEGORY TOTALS
    ========================= */

    const categories = {};


    expenses.forEach(transaction => {

        const category =
            transaction.category || "Other";

        if (!categories[category]) {
            categories[category] = 0;
        }

        categories[category] +=
            Number(transaction.amount || 0);
    });


    const sortedCategories =
        Object.entries(categories)
            .sort(
                (a, b) => b[1] - a[1]
            );


    const largestCategory =
        sortedCategories[0];


    /* =========================
       UPDATE SUMMARY
    ========================= */

    if (totalSpentElement) {

        totalSpentElement.textContent =
            formatMoney(totalSpent);
    }


    if (topCategoryElement) {

        topCategoryElement.textContent =
            largestCategory
                ? largestCategory[0]
                : "—";
    }


    if (dailyAverageElement) {

        dailyAverageElement.textContent =
            formatMoney(dailyAverage);
    }


    /* =========================
       CATEGORY BARS
    ========================= */

    bars.innerHTML =
        sortedCategories
            .map(
                ([category, amount]) => {

                    const percentage =
                        (amount / totalSpent) * 100;

                    return `
                        <div class="analytics-bar-row">

                            <div class="analytics-bar-info">

                                <span>
                                    ${escapeHTML(category)}
                                </span>

                                <span>
                                    ${formatMoney(amount)}
                                    ·
                                    ${percentage.toFixed(1)}%
                                </span>

                            </div>

                            <div class="analytics-bar-track">

                                <div
                                    class="analytics-bar-fill"
                                    style="width: ${percentage}%"
                                ></div>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");


    /* =========================
       SPENDING INSIGHT
    ========================= */

    if (insight && largestCategory) {

        const largestPercentage =
            (largestCategory[1] / totalSpent) * 100;


        insight.innerHTML = `
            💡 Your biggest spending category this month is
            <strong>
                ${escapeHTML(largestCategory[0])}
            </strong>,
            accounting for
            <strong>
                ${largestPercentage.toFixed(1)}%
            </strong>
            of your total spending.
        `;
    }
}
/* =========================================================
   RECURRING TRANSACTIONS
========================================================= */

const RECURRING_STORAGE_KEY =
    "moneyLeakRecurringTransactions";


let recurringTransactions =
    loadRecurringTransactions();


/* =========================
   LOAD RECURRING TRANSACTIONS
========================= */

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

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        return [];
    }
}


/* =========================
   SAVE RECURRING TRANSACTIONS
========================= */

function saveRecurringTransactions() {

    localStorage.setItem(
        RECURRING_STORAGE_KEY,
        JSON.stringify(
            recurringTransactions
        )
    );
}


/* =========================
   FORMAT FREQUENCY
========================= */

function formatRecurringFrequency(
    frequency
) {

    const labels = {
        weekly: "Every Week",
        monthly: "Every Month",
        yearly: "Every Year"
    };

    return (
        labels[frequency] ||
        "Every Month"
    );
}


/* =========================
   DISPLAY RECURRING
========================= */

function displayRecurringTransactions() {

    const results =
        document.getElementById(
            "recurringResults"
        );

    if (!results) {
        return;
    }


    if (
        recurringTransactions.length === 0
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
            .map(transaction => {

                const typeClass =
                    transaction.type === "income"
                        ? "income"
                        : "expense";

                const typeText =
                    transaction.type === "income"
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

            })
            .join("");
}


/* =========================
   ADD RECURRING TRANSACTION
========================= */

function addRecurringTransaction() {

    const nameInput =
        document.getElementById(
            "recurringName"
        );

    const amountInput =
        document.getElementById(
            "recurringAmount"
        );

    const typeInput =
        document.getElementById(
            "recurringType"
        );

    const categoryInput =
        document.getElementById(
            "recurringCategory"
        );

    const frequencyInput =
        document.getElementById(
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
        Number(amountInput.value);

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


    const recurringTransaction = {

        id:
            Date.now().toString(),

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
            new Date().toISOString()

    };


    recurringTransactions.push(
        recurringTransaction
    );


    saveRecurringTransactions();

    displayRecurringTransactions();


    nameInput.value = "";

    amountInput.value = "";

    typeInput.value = "expense";

    categoryInput.value = "Bills";

    frequencyInput.value = "monthly";


    alert(
        "Recurring transaction added successfully."
    );
}


/* =========================
   DELETE RECURRING
========================= */

function deleteRecurringTransaction(id) {

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
}


/* =========================
   SETUP RECURRING SYSTEM
========================= */

function setupRecurringTransactions() {

    const saveButton =
        document.getElementById(
            "saveRecurringButton"
        );


    if (!saveButton) {
        return;
    }


    saveButton.addEventListener(
        "click",
        addRecurringTransaction
    );


    displayRecurringTransactions();
}


/* =========================
   INITIALIZE
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupRecurringTransactions();

    }
);


/* =========================
   GLOBAL FUNCTIONS
========================= */

window.addRecurringTransaction =
    addRecurringTransaction;

window.deleteRecurringTransaction =
    deleteRecurringTransaction;

window.displayRecurringTransactions =
    displayRecurringTransactions;
