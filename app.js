let transactions = JSON.parse(
    localStorage.getItem("moneyLeakTransactions")
) || [];

function formatMoney(amount) {
    return "₦" + Math.round(amount).toLocaleString("en-NG");
}

function saveTransactions() {
    localStorage.setItem(
        "moneyLeakTransactions",
        JSON.stringify(transactions)
    );
}

function addTransaction() {
    const amountInput = document.getElementById("amount");
    const typeInput = document.getElementById("type");
    const categoryInput = document.getElementById("category");

    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value.trim();

    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    if (!category) {
        alert("Please enter a category.");
        return;
    }

    const transaction = {
        id: Date.now(),
        amount: amount,
        type: type,
        category: category,
        date: new Date().toISOString()
    };

    transactions.push(transaction);

    saveTransactions();
displayTransactions();

try {
    updateDashboard();
} catch (error) {
    console.error("Dashboard error:", error);
}

try {
    detectMoneyLeak();
} catch (error) {
    console.error("MoneyLeak error:", error);
}

try {
    updateMoneyHealth();
} catch (error) {
    console.error("Money Health error:", error);
}

try {
    updateSpendingBreakdown();
} catch (error) {
    console.error("Spending Breakdown error:", error);
}
    
    amountInput.value = "";
    categoryInput.value = "";
}

function calculateTotals() {
    let income = 0;
    let expenses = 0;

    transactions.forEach(function(transaction) {
        if (transaction.type === "income") {
            income += transaction.amount;
        } else {
            expenses += transaction.amount;
        }
    });

    return {
        income: income,
        expenses: expenses,
        balance: income - expenses
    };
}

function updateDashboard() {
    const totals = calculateTotals();

    document.getElementById("balance").textContent =
        formatMoney(totals.balance);

    document.getElementById("income").textContent =
        formatMoney(totals.income);

    document.getElementById("expenses").textContent =
        formatMoney(totals.expenses);
    
    updateMoneyHealth();
    updateMonthlyOverview();
    updateSpendingChart();
}
function updateMonthlyOverview() {
    const monthlyIncome = document.getElementById("monthlyIncome");
    const monthlyExpenses = document.getElementById("monthlyExpenses");
    const monthlySavings = document.getElementById("monthlySavings");
    const monthlyBalance = document.getElementById("monthlyBalance");

    if (
        !monthlyIncome ||
        !monthlyExpenses ||
        !monthlySavings ||
        !monthlyBalance
    ) {
        return;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let income = 0;
    let expenses = 0;

    transactions.forEach(function (transaction) {
        const date = new Date(transaction.date);

        if (
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
        ) {
            if (transaction.type === "income") {
                income += transaction.amount;
            } else {
                expenses += transaction.amount;
            }
        }
    });

    const savings = income - expenses;

    monthlyIncome.textContent = formatMoney(income);
    monthlyExpenses.textContent = formatMoney(expenses);
    monthlySavings.textContent = formatMoney(savings);
    monthlyBalance.textContent = formatMoney(savings);
}
function updateMoneyHealth() {
    const totals = calculateTotals();

    const healthScore = document.getElementById("healthScore");
    const healthFill = document.getElementById("healthFill");
    const healthMessage = document.getElementById("healthMessage");
    const healthIcon = document.getElementById("healthIcon");
    const healthExplanation = document.getElementById("healthExplanation");
    
    if (
        !healthScore ||
        !healthFill ||
        !healthMessage ||
        !healthIcon ||
        !healthExplanation
    ) {
        return;
    }
    if (totals.income <= 0) {        
        healthScore.textContent = "0 / 100";
        healthFill.style.width = "0%";
        healthMessage.textContent =
            "Add some income and transactions to calculate your Money Health.";
        healthIcon.textContent = "💚";
        return;
    }

    const spendingRatio = totals.expenses / totals.income;

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

    healthScore.textContent = `${score} / 100`;
    healthFill.style.width = `${score}%`;

    if (score >= 85) {
        healthMessage.textContent =
            "Excellent! Your spending is well under control.";
        healthIcon.textContent = "💚";
    } else if (score >= 70) {
        healthMessage.textContent =
            "Good job! Your finances are looking healthy.";
        healthIcon.textContent = "🟢";
    } else if (score >= 50) {
        healthMessage.textContent =
            "You're doing okay, but there is room to improve.";
        healthIcon.textContent = "🟡";
    } else if (score >= 30) {
        healthMessage.textContent =
            "Your spending is getting high. Watch your expenses.";
        healthIcon.textContent = "🟠";
    } else {
        healthMessage.textContent =
            "Your expenses are very high compared with your income.";
        healthIcon.textContent = "🔴";
    } 
   
    if (healthExplanation) {
        healthExplanation.textContent =
            `Your Money Health score is ${score}/100 because you spend ${Math.round(spendingRatio * 100)}% of your income.`; 
    } 
    } 
    function displayTransactions() { 
        const list = document.getElementById("transactionList");

    if (transactions.length === 0) {
        list.innerHTML = "<p>No transactions yet.</p>";
        return;
    }

    list.innerHTML = "";

    transactions
        .slice()
        .reverse()
        .forEach(function(transaction) {

            const item = document.createElement("div");

            item.className = "transaction";

            const sign =
                transaction.type === "income" ? "+" : "-";

            item.innerHTML = `
    <div class="transaction-info">
        <strong>${transaction.category}</strong>
        <small>
            ${sign}${formatMoney(transaction.amount)}
        </small>
    </div>

    <div class="transaction-actions">
        <button
            class="edit-transaction"
            onclick="editTransaction(${transaction.id})"
        >
            Edit
        </button>

        <button
            class="delete-transaction"
            onclick="deleteTransaction(${transaction.id})"
        >
            Delete
        </button>
    </div>
`;

            list.appendChild(item);
        });
}
function editTransaction(id) {
    const transaction = transactions.find(function (transaction) {
        return transaction.id === id;
    });

    if (!transaction) return;

    const newAmount = prompt(
        "Enter the new amount:",
        transaction.amount
    );

    if (newAmount === null) return;

    const amount = Number(newAmount);

    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    const newCategory = prompt(
        "Enter the new category:",
        transaction.category
    );

    if (newCategory === null) return;

    const category = newCategory.trim();

    if (!category) {
        alert("Please enter a category.");
        return;
    }

    transaction.amount = amount;
    transaction.category = category;

    saveTransactions();
    updateDashboard();
    displayTransactions();
    detectMoneyLeak();
    updateMoneyHealth();
    updateSpendingBreakdown();
}
function deleteTransaction(id) {
    const transaction = transactions.find(function (transaction) {
        return transaction.id === id;
    });

    if (!transaction) return;

    const confirmed = confirm(
        "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) return;

    transactions = transactions.filter(function (transaction) {
        return transaction.id !== id;
    });

    saveTransactions();
    updateDashboard();
    displayTransactions();
    detectMoneyLeak();
    updateMoneyHealth();
    updateSpendingBreakdown();
}
function detectMoneyLeak() {
    const leakMessage = document.getElementById("leakMessage");

    const expenses = transactions.filter(function(transaction) {
        return transaction.type === "expense";
    });

    if (expenses.length === 0) {
        leakMessage.innerHTML = `
            <p>
                Add some expenses and MoneyLeak will find
                where your money is going.
            </p>
        `;
        return;
    }

    const categoryTotals = {};

transactions
    .filter(function (transaction) {
        return transaction.type === "expense";
    })
    .forEach(function (transaction) {
        const category = transaction.category.trim();

        if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
        }

        categoryTotals[category] += transaction.amount;
    });

    let biggestCategory = "";
    let biggestAmount = 0;

    for (const category in categoryTotals) {

        if (categoryTotals[category] > biggestAmount) {
            biggestAmount = categoryTotals[category];
            biggestCategory = category;
        }
    }

    const displayCategory =
        biggestCategory.charAt(0).toUpperCase() +
        biggestCategory.slice(1);

    const potentialWeeklySaving = biggestAmount * 0.20;
    const potentialYearlySaving = potentialWeeklySaving * 52;

    leakMessage.innerHTML = `
        <p>
            🚨 Your biggest money leak is
            <strong>${displayCategory}</strong>.
        </p>

        <h3>${formatMoney(biggestAmount)}</h3>

        <p>
            That's the category where you've spent
            the most money so far.
        </p>

        <hr>

        <p>
            💡 If you reduce this spending by 20%:
        </p>

        <p>
            You could save
            <strong>${formatMoney(potentialWeeklySaving)}</strong>
            per week.
        </p>

        <p>
            That's approximately
            <strong>${formatMoney(potentialYearlySaving)}</strong>
            per year.
        </p>
    `;
}

updateDashboard();
displayTransactions();
detectMoneyLeak();
updateMoneyHealth();
updateSpendingBreakdown();

function calculateSavingsGoal() {
    const goal = Number(document.getElementById("savingsGoal").value);
    const current = Number(document.getElementById("currentSavings").value);
    const weeks = Number(document.getElementById("goalWeeks").value);

    const result = document.getElementById("savingsResult");

    if (goal <= 0 || current < 0 || weeks <= 0) {
        result.innerHTML = `
            <p>⚠️ Please enter a valid goal, savings amount, and number of weeks.</p>
        `;
        return;
    }

    const remaining = goal - current;

    if (remaining <= 0) {
        result.innerHTML = `
            <h3>🎉 Goal Reached!</h3>
            <p>You have already reached your savings goal.</p>
        `;
        return;
    }

    const weeklyAmount = remaining / weeks;
    const dailyAmount = weeklyAmount / 7;
    
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");
   
    let progress = (current / goal) * 100;
    progress = Math.max(0, Math.min(progress, 100));

    progressFill.style.width = progress + "%";
    progressText.textContent =
    `${progress.toFixed(0)}% saved — ${formatMoney(current)} of ${formatMoney(goal)}`;    
    
    result.innerHTML = `
        <hr>
        <h3>🎯 Your Savings Plan</h3>

        <p>
            You still need
            <strong>${formatMoney(remaining)}</strong>
            to reach your goal.
        </p>

        <p>
            Save approximately
            <strong>${formatMoney(weeklyAmount)}</strong>
            per week.
        </p>

        <p>
            That's about
            <strong>${formatMoney(dailyAmount)}</strong>
            per day.
        </p>
    `;
}
function updateSpendingBreakdown() {
    const breakdown = document.getElementById("spendingBreakdown");

    if (!breakdown) return;

    const categoryTotals = {};

    transactions
        .filter(function (transaction) {
            return transaction.type === "expense";
        })
        .forEach(function (transaction) {
            const category = transaction.category.trim();

            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }

            categoryTotals[category] += transaction.amount;
        });

    const categories = Object.keys(categoryTotals);

    if (categories.length === 0) {
        breakdown.innerHTML =
            "<p>Add some expenses to see your spending breakdown.</p>";
        return;
    }

    const totalExpenses = categories.reduce(function (total, category) {
        return total + categoryTotals[category];
    }, 0);

    categories.sort(function (a, b) {
        return categoryTotals[b] - categoryTotals[a];
    });

    breakdown.innerHTML = "";

    categories.forEach(function (category) {
        const amount = categoryTotals[category];
        const percentage = (amount / totalExpenses) * 100;

        const item = document.createElement("div");
        item.className = "breakdown-item";

        item.innerHTML = `
            <div class="breakdown-header">
                <strong>${category}</strong>
                <strong>${formatMoney(amount)}</strong>
            </div>

            <div class="breakdown-bar">
                <div
                    class="breakdown-fill"
                    style="width: ${percentage}%"
                ></div>
            </div>

            <div class="breakdown-percentage">
                ${percentage.toFixed(1)}% of expenses
            </div>
        `;

        breakdown.appendChild(item);
    });

    const total = document.createElement("div");
    total.className = "breakdown-total";

    total.innerHTML = `
        <strong>Total Expenses</strong>
        <strong>${formatMoney(totalExpenses)}</strong>
    `;

    breakdown.appendChild(total);
}    
function updateSpendingChart() {
    const chart = document.getElementById("spendingChart");

    if (!chart) return;

    const expenses = transactions.filter(function (transaction) {
        return transaction.type === "expense";
    });

    if (expenses.length === 0) {
        chart.innerHTML = "<p>No spending data yet.</p>";
        return;
    }

    const categoryTotals = {};

    expenses.forEach(function (transaction) {
        const category = transaction.category.trim();

        if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
        }

        categoryTotals[category] += transaction.amount;
    });

    const categories = Object.keys(categoryTotals);

    categories.sort(function (a, b) {
        return categoryTotals[b] - categoryTotals[a];
    });

    const totalExpenses = expenses.reduce(function (total, transaction) {
        return total + transaction.amount;
    }, 0);

    chart.innerHTML = "";

    categories.forEach(function (category) {
        const amount = categoryTotals[category];
        const percentage = (amount / totalExpenses) * 100;

        const item = document.createElement("div");
        item.className = "chart-item";

        item.innerHTML = `
            <div class="chart-header">
                <strong>${category}</strong>
                <strong>${formatMoney(amount)}</strong>
            </div>

            <div class="chart-bar">
                <div
                    class="chart-fill"
                    style="width: ${percentage}%"
                ></div>
            </div>

            <small>${percentage.toFixed(1)}% of spending</small>
        `;

        chart.appendChild(item);
    });
}
updateSpendingChart();
