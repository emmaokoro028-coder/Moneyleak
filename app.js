let income = 0;
let expenses = 0;
let transactions = [];

function formatMoney(amount) {
    return "₦" + amount.toLocaleString("en-NG");
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
        amount: amount,
        type: type,
        category: category
    };

    transactions.push(transaction);

    if (type === "income") {
        income += amount;
    } else {
        expenses += amount;
    }

    updateDashboard();
    displayTransactions();

    amountInput.value = "";
    categoryInput.value = "";
}

function updateDashboard() {
    const balance = income - expenses;

    document.getElementById("balance").textContent =
        formatMoney(balance);

    document.getElementById("income").textContent =
        formatMoney(income);

    document.getElementById("expenses").textContent =
        formatMoney(expenses);
}

function displayTransactions() {
    const list = document.getElementById("transactionList");

    if (transactions.length === 0) {
        list.innerHTML = "<p>No transactions yet.</p>";
        return;
    }

    list.innerHTML = "";

    transactions.slice().reverse().forEach(function(transaction) {

        const item = document.createElement("div");
        item.className = "transaction";

        const sign = transaction.type === "income" ? "+" : "-";

        item.innerHTML = `
            <strong>
                ${transaction.category}
            </strong>

            <small>
                ${sign}${formatMoney(transaction.amount)}
            </small>
        `;

        list.appendChild(item);
    });
}

updateDashboard();
