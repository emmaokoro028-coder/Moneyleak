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
    updateSpendingChart();
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

    const potentialMonthlySaving = biggestAmount * 0.20;
    const potentialYearlySaving = potentialMonthlySaving * 12;

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
            <strong>${formatMoney(potentialMonthlySaving)}</strong>
            per month.
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

            if (!category) return;

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
        const percentage =
            totalExpenses > 0
                ? (amount / totalExpenses) * 100
                : 0;

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
        chart.innerHTML = `
            <div class="chart-empty">
                <span>📊</span>
                <p>No spending data yet.</p>
                <small>Add an expense to see where your money goes.</small>
            </div>
        `;
        return;
    }

    const categoryTotals = {};

    expenses.forEach(function (transaction) {
        const category = transaction.category.trim();

        if (!category) return;

        if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
        }

        categoryTotals[category] += transaction.amount;
    });

    const categories = Object.keys(categoryTotals);

    const totalExpenses = expenses.reduce(function (total, transaction) {
        return total + transaction.amount;
    }, 0);

    categories.sort(function (a, b) {
        return categoryTotals[b] - categoryTotals[a];
    });

    chart.innerHTML = "";

    const title = document.createElement("div");
    title.className = "chart-total";

    title.innerHTML = `
        <span>Total Spending</span>
        <strong>${formatMoney(totalExpenses)}</strong>
    `;

    chart.appendChild(title);

    categories.forEach(function (category) {
        const amount = categoryTotals[category];

        const percentage =
            totalExpenses > 0
                ? (amount / totalExpenses) * 100
                : 0;

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

            <div class="chart-footer">
                <span>${percentage.toFixed(1)}% of spending</span>
            </div>
        `;

        chart.appendChild(item);
    });

    const insight = document.createElement("div");
    insight.className = "chart-insight";

    const topCategory = categories[0];
    const topAmount = categoryTotals[topCategory];
    const topPercentage =
        totalExpenses > 0
            ? (topAmount / totalExpenses) * 100
            : 0;

    insight.innerHTML = `
        <strong>💡 Spending Insight</strong>
        <p>
            Your biggest expense category is
            <strong>${topCategory}</strong>,
            accounting for ${topPercentage.toFixed(1)}% of your spending.
        </p>
    `;

    chart.appendChild(insight);
}

updateSpendingChart();
function resetSavingsGoal() {
    localStorage.removeItem("moneyLeakSavingsGoal");
    localStorage.removeItem("moneyLeakCurrentSavings");
    localStorage.removeItem("moneyLeakGoalWeeks");

    document.getElementById("savingsGoal").value = "";
    document.getElementById("currentSavings").value = "";
    document.getElementById("goalWeeks").value = "";

    document.getElementById("savingsResult").innerHTML = "";
    document.getElementById("progressText").textContent = "0% saved";
    document.getElementById("progressFill").style.width = "0%";

    }    
    function updateSavingsGoal() {
    const goalInput = document.getElementById("savingsGoal");
    const currentInput = document.getElementById("currentSavings");
    const weeksInput = document.getElementById("goalWeeks");

    const goal = Number(goalInput.value);
    const saved = Number(currentInput.value);
    const weeks = Number(weeksInput.value);

    if (!goal || goal <= 0) {
        alert("Please enter a valid savings goal.");
        return;
    }

    if (saved < 0 || saved > goal) {
        alert("Your saved amount must be between ₦0 and your goal.");
        return;
    }

    if (!weeks || weeks <= 0) {
        alert("Please enter how many weeks you have.");
        return;
    }

    localStorage.setItem("moneyLeakSavingsGoal", goalInput.value);
    localStorage.setItem("moneyLeakCurrentSavings", currentInput.value);
    localStorage.setItem("moneyLeakGoalWeeks", weeksInput.value);

    calculateSavingsGoalPage();

    alert("Your savings goal has been updated!");
}
window.addEventListener("DOMContentLoaded", function () {
    const goal = localStorage.getItem("moneyLeakSavingsGoal");
    const saved = localStorage.getItem("moneyLeakCurrentSavings");
    const weeks = localStorage.getItem("moneyLeakGoalWeeks");

    if (goal) {
        document.getElementById("savingsGoal").value = goal;
    }

    if (saved) {
        document.getElementById("currentSavings").value = saved;
    }

    if (weeks) {
        document.getElementById("goalWeeks").value = weeks;
    }

    if (goal && weeks) {
    calculateSavingsGoalPage();;
}

});

function calculateSavingsGoalPage() {
    const target = Number(document.getElementById("savingsTarget").value);
    const saved = Number(document.getElementById("alreadySaved").value);
    const days = Number(document.getElementById("savingsDays").value);

    const result = document.getElementById("savingsResult");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");

    if (!target || target <= 0 || saved < 0 || !days || days <= 0) {
        alert("Please enter a valid savings target, saved amount, and number of days.");
        return;
    }

    if (saved >= target) {
        result.innerHTML = `
            <div class="goal-success">
                🎉 Congratulations! You've already reached your savings goal.
            </div>
        `;

        if (progressFill) {
            progressFill.style.width = "100%";
        }

        if (progressText) {
            progressText.textContent = "100% saved";
        }

        return;
    }

    const remaining = target - saved;
    const daily = remaining / days;
    const weekly = daily * 7;
    const progress = (saved / target) * 100;

    result.innerHTML = `
        <div class="goal-result">
            <h3>🎯 Your Savings Plan</h3>

            <p>
                You still need
                <strong>₦${remaining.toLocaleString("en-NG")}</strong>
                to reach your goal.
            </p>

            <p>
                Save approximately
                <strong>₦${Math.ceil(daily).toLocaleString("en-NG")}</strong>
                per day.
            </p>

            <p>
                That's about
                <strong>₦${Math.ceil(weekly).toLocaleString("en-NG")}</strong>
                per week.
            </p>

            <div class="goal-progress">
                <div style="width: ${Math.min(progress, 100)}%"></div>
            </div>

            <p class="progress-text">
                ${Math.round(progress)}% saved
            </p>
        </div>
    `;

    if (progressFill) {
        progressFill.style.width = `${Math.min(progress, 100)}%`;
    }

    if (progressText) {
        progressText.textContent = `${Math.round(progress)}% saved`;
    }

    localStorage.setItem("moneyLeakSavingsGoalPage", JSON.stringify({
        target,
        saved,
        days,
        remaining,
        daily,
        weekly,
        progress
    }));
}
function saveSavingsGoal() {
    const target = Number(document.getElementById("savingsTarget").value);
    const saved = Number(document.getElementById("savingsSaved").value);
    const days = Number(document.getElementById("savingsDays").value);

    localStorage.setItem("moneyLeakSavingsGoal", JSON.stringify({
        target,
        saved,
        days
    }));

    alert("Savings goal saved successfully! 🎯");
}
function loadSavedSavingsGoal() {
    const savedGoal = localStorage.getItem("moneyLeakSavingsGoal");

    if (!savedGoal) return;

    const goal = JSON.parse(savedGoal);

    const goalInput = document.getElementById("savingsGoal");
    const savingsInput = document.getElementById("currentSavings");
    const weeksInput = document.getElementById("goalWeeks");

    if (goalInput) goalInput.value = goal.target || "";
    if (savingsInput) savingsInput.value = goal.saved || "";

    if (weeksInput && goal.days) {
        weeksInput.value = Math.ceil(goal.days / 7);
    }

    if (typeof calculateSavingsGoal === "function") {
        calculateSavingsGoal();
    }
}

loadSavedSavingsGoal();
