let transactions = JSON.parse(
    localStorage.getItem("moneyLeakTransactions")
) || [];

function formatMoney(amount) {
    return "₦" + amount.toLocaleString("en-NG");
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
    updateDashboard();
    displayTransactions();
    detectMoneyLeak();

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
                <strong>${transaction.category}</strong>
                <small>
                    ${sign}${formatMoney(transaction.amount)}
                </small>
            `;

            list.appendChild(item);
        });
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

    expenses.forEach(function(transaction) {

        const category = transaction.category
            .trim()
            .toLowerCase();

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
    `;
}

updateDashboard();
displayTransactions();
detectMoneyLeak();
