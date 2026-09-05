/* =========================================================
   MONEYLeak
   Personal Finance OS
   Core Application Engine
   Version 6.0
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     STORAGE
     ========================================================= */

  const STORAGE = {
    transactions: "moneyLeakTransactions",
    goals: "moneyLeakSavingsGoals",
    oldGoal: "moneyLeakSavingsGoal",
    monthlyBudget: "moneyLeakMonthlyBudget",
    categoryBudgets: "moneyLeakCategoryBudgets",
    recurring: "moneyLeakRecurringTransactions",
    settings: "moneyLeakSettings",
    alerts: "moneyLeakAlerts",
    initialized: "moneyLeakInitialized"
  };

  const DEFAULT_SETTINGS = {
    name: "My Money",
    currency: "NGN",
    theme: "light",
    notifications: true,
    compactNumbers: false
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
    "Travel",
    "Family",
    "Personal",
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
    "Other Income"
  ];

  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  const $ = (id) => document.getElementById(id);

  function safeJSONParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);

      if (value === null) {
        return fallback;
      }

      return safeJSONParse(value, fallback);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  function todayISO() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function currentMonthKey() {
    const date = new Date();

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
  }

  function daysInCurrentMonth() {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function capitalize(value) {
    if (!value) return "";

    return String(value)
      .charAt(0)
      .toUpperCase() + String(value).slice(1);
  }

  function notifyUpdate() {
    window.dispatchEvent(
      new CustomEvent("moneyLeakUpdated")
    );
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  function getSettings() {
    const saved = readStorage(
      STORAGE.settings,
      {}
    );

    return {
      ...DEFAULT_SETTINGS,
      ...saved
    };
  }

  function saveSettings(settings) {
    const merged = {
      ...getSettings(),
      ...settings
    };

    writeStorage(
      STORAGE.settings,
      merged
    );

    applySettings();

    notifyUpdate();

    return merged;
  }

  function applySettings() {
    const settings = getSettings();

    document.documentElement.dataset.theme =
      settings.theme || "light";

    document.documentElement.style.colorScheme =
      settings.theme === "dark"
        ? "dark"
        : "light";

    const nameElements = document.querySelectorAll(
      "[data-user-name]"
    );

    nameElements.forEach((element) => {
      element.textContent =
        settings.name || "My Money";
    });
  }

  /* =========================================================
     CURRENCY
     ========================================================= */

  function getCurrency() {
    return getSettings().currency || "NGN";
  }

  function currencySymbol(currency = getCurrency()) {
    const symbols = {
      NGN: "₦",
      USD: "$",
      GBP: "£",
      EUR: "€",
      CAD: "CA$",
      AUD: "A$"
    };

    return symbols[currency] || currency;
  }

  function displayCurrency(amount = 0) {
    const settings = getSettings();

    const numericAmount =
      Number(amount) || 0;

    const currency =
      settings.currency || "NGN";

    const compact =
      settings.compactNumbers;

    if (compact) {
      const absolute =
        Math.abs(numericAmount);

      let formatted;

      if (absolute >= 1_000_000_000) {
        formatted =
          (numericAmount / 1_000_000_000)
            .toFixed(1)
            .replace(".0", "") + "B";
      } else if (absolute >= 1_000_000) {
        formatted =
          (numericAmount / 1_000_000)
            .toFixed(1)
            .replace(".0", "") + "M";
      } else if (absolute >= 1_000) {
        formatted =
          (numericAmount / 1_000)
            .toFixed(1)
            .replace(".0", "") + "K";
      } else {
        formatted =
          Math.round(numericAmount).toLocaleString();
      }

      return `${currencySymbol(currency)}${formatted}`;
    }

    try {
      return new Intl.NumberFormat(
        "en-NG",
        {
          style: "currency",
          currency,
          maximumFractionDigits: 0
        }
      ).format(numericAmount);
    } catch {
      return `${currencySymbol(currency)}${numericAmount.toLocaleString()}`;
    }
  }

  /* =========================================================
     TRANSACTIONS
     ========================================================= */

  function normalizeTransaction(transaction) {
    const now = Date.now();

    return {
      id:
        transaction.id ||
        `tx_${now}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      type:
        transaction.type === "income"
          ? "income"
          : "expense",

      amount:
        Math.abs(Number(transaction.amount) || 0),

      category:
        transaction.category ||
        (transaction.type === "income"
          ? "Other Income"
          : "Other"),

      source:
        transaction.source ||
        "",

      description:
        transaction.description ||
        "",

      date:
        transaction.date ||
        todayISO(),

      createdAt:
        transaction.createdAt ||
        new Date().toISOString()
    };
  }

  function getTransactions() {
    const data = readStorage(
      STORAGE.transactions,
      []
    );

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(normalizeTransaction);
  }

  function saveTransactions(transactions) {
    writeStorage(
      STORAGE.transactions,
      transactions.map(normalizeTransaction)
    );

    notifyUpdate();

    return transactions;
  }

  function addTransaction(transaction) {
    const transactions =
      getTransactions();

    const newTransaction =
      normalizeTransaction(transaction);

    transactions.unshift(
      newTransaction
    );

    saveTransactions(transactions);

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
        (transaction) =>
          transaction.id === id
      );

    if (index === -1) {
      return null;
    }

    transactions[index] =
      normalizeTransaction({
        ...transactions[index],
        ...updates,
        id
      });

    saveTransactions(transactions);

    return transactions[index];
  }

  function deleteTransaction(id) {
    const transactions =
      getTransactions();

    const filtered =
      transactions.filter(
        (transaction) =>
          transaction.id !== id
      );

    saveTransactions(filtered);

    return true;
  }

  function clearTransactions() {
    writeStorage(
      STORAGE.transactions,
      []
    );

    notifyUpdate();
  }

  /* =========================================================
     TRANSACTION CALCULATIONS
     ========================================================= */

  function getIncome(transactions = getTransactions()) {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === "income"
      )
      .reduce(
        (total, transaction) =>
          total + transaction.amount,
        0
      );
  }

  function getExpenses(
    transactions = getTransactions()
  ) {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === "expense"
      )
      .reduce(
        (total, transaction) =>
          total + transaction.amount,
        0
      );
  }

  function getBalance(
    transactions = getTransactions()
  ) {
    return (
      getIncome(transactions) -
      getExpenses(transactions)
    );
  }

  function getPeriodTransactions(
    period = "month",
    referenceDate = new Date()
  ) {
    const transactions =
      getTransactions();

    const year =
      referenceDate.getFullYear();

    const month =
      referenceDate.getMonth();

    return transactions.filter(
      (transaction) => {
        const date =
          new Date(
            `${transaction.date}T12:00:00`
          );

        if (
          Number.isNaN(date.getTime())
        ) {
          return false;
        }

        if (period === "month") {
          return (
            date.getFullYear() === year &&
            date.getMonth() === month
          );
        }

        if (period === "lastMonth") {
          const previous =
            new Date(
              year,
              month - 1,
              1
            );

          return (
            date.getFullYear() ===
              previous.getFullYear() &&
            date.getMonth() ===
              previous.getMonth()
          );
        }

        if (period === "year") {
          return (
            date.getFullYear() === year
          );
        }

        return true;
      }
    );
  }

  /* =========================================================
     CATEGORY ANALYSIS
     ========================================================= */

  function getCategoryTotals(
    transactions = getTransactions()
  ) {
    const totals = {};

    transactions
      .filter(
        (transaction) =>
          transaction.type === "expense"
      )
      .forEach((transaction) => {
        const category =
          transaction.category ||
          "Other";

        totals[category] =
          (totals[category] || 0) +
          transaction.amount;
      });

    return totals;
  }

  function getTopSpendingCategories(
    limit = 5,
    transactions = getTransactions()
  ) {
    const totals =
      getCategoryTotals(
        transactions
      );

    return Object.entries(totals)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, limit)
      .map(
        ([category, amount]) => ({
          category,
          amount
        })
      );
  }

  function getLargestExpense(
    transactions = getTransactions()
  ) {
    const expenses =
      transactions.filter(
        (transaction) =>
          transaction.type === "expense"
      );

    return (
      expenses.sort(
        (a, b) =>
          b.amount - a.amount
      )[0] || null
    );
  }

  /* =========================================================
     SAVINGS GOALS
     ========================================================= */

  function normalizeGoal(goal) {
    return {
      id:
        goal.id ||
        `goal_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      name:
        goal.name ||
        "Savings Goal",

      target:
        Math.max(
          0,
          Number(goal.target) || 0
        ),

      current:
        Math.max(
          0,
          Number(goal.current) || 0
        ),

      deadline:
        goal.deadline || "",

      color:
        goal.color || "#22c55e",

      description:
        goal.description || "",

      createdAt:
        goal.createdAt ||
        new Date().toISOString()
    };
  }

  function getSavingsGoals() {
    let goals =
      readStorage(
        STORAGE.goals,
        []
      );

    if (!Array.isArray(goals)) {
      goals = [];
    }

    /*
      Migrate old single-goal storage
    */

    if (
      goals.length === 0
    ) {
      const oldGoal =
        readStorage(
          STORAGE.oldGoal,
          null
        );

      if (
        oldGoal &&
        typeof oldGoal === "object"
      ) {
        goals = [
          normalizeGoal(oldGoal)
        ];

        writeStorage(
          STORAGE.goals,
          goals
        );
      }
    }

    return goals.map(
      normalizeGoal
    );
  }

  function saveSavingsGoals(
    goals
  ) {
    writeStorage(
      STORAGE.goals,
      goals.map(normalizeGoal)
    );

    notifyUpdate();

    return goals;
  }

  function addSavingsGoal(goal) {
    const goals =
      getSavingsGoals();

    const newGoal =
      normalizeGoal(goal);

    goals.push(newGoal);

    saveSavingsGoals(goals);

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
        (goal) =>
          goal.id === id
      );

    if (index === -1) {
      return null;
    }

    goals[index] =
      normalizeGoal({
        ...goals[index],
        ...updates,
        id
      });

    saveSavingsGoals(goals);

    return goals[index];
  }

  function deleteSavingsGoal(id) {
    const goals =
      getSavingsGoals();

    saveSavingsGoals(
      goals.filter(
        (goal) =>
          goal.id !== id
      )
    );

    return true;
  }

  function getGoalProgress(goal) {
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
        (Number(goal.current) /
          Number(goal.target)) *
          100
      )
    );
  }

  /* =========================================================
     BUDGETS
     ========================================================= */

  function getMonthlyBudget() {
    const value =
      readStorage(
        STORAGE.monthlyBudget,
        0
      );

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

    notifyUpdate();

    return value;
  }

  function getCategoryBudgets() {
    const budgets =
      readStorage(
        STORAGE.categoryBudgets,
        {}
      );

    return budgets &&
      typeof budgets === "object"
      ? budgets
      : {};
  }

  function setCategoryBudget(
    category,
    amount
  ) {
    const budgets =
      getCategoryBudgets();

    const numericAmount =
      Math.max(
        0,
        Number(amount) || 0
      );

    if (numericAmount === 0) {
      delete budgets[category];
    } else {
      budgets[category] =
        numericAmount;
    }

    writeStorage(
      STORAGE.categoryBudgets,
      budgets
    );

    notifyUpdate();

    return budgets;
  }

  /* =========================================================
     RECURRING TRANSACTIONS
     ========================================================= */

  function normalizeRecurring(item) {
    return {
      id:
        item.id ||
        `rec_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      name:
        item.name ||
        "Recurring Item",

      amount:
        Math.abs(
          Number(item.amount) || 0
        ),

      type:
        item.type === "income"
          ? "income"
          : "expense",

      frequency:
        item.frequency ||
        "monthly",

      nextDate:
        item.nextDate ||
        todayISO(),

      category:
        item.category ||
        (item.type === "income"
          ? "Other Income"
          : "Bills"),

      description:
        item.description || "",

      createdAt:
        item.createdAt ||
        new Date().toISOString()
    };
  }

  function getRecurringTransactions() {
    const items =
      readStorage(
        STORAGE.recurring,
        []
      );

    if (!Array.isArray(items)) {
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
      STORAGE.recurring,
      items.map(
        normalizeRecurring
      )
    );

    notifyUpdate();

    return items;
  }

  function addRecurringTransaction(
    item
  ) {
    const items =
      getRecurringTransactions();

    const newItem =
      normalizeRecurring(item);

    items.push(newItem);

    saveRecurringTransactions(
      items
    );

    return newItem;
  }

  function updateRecurringTransaction(
    id,
    updates
  ) {
    const items =
      getRecurringTransactions();

    const index =
      items.findIndex(
        (item) =>
          item.id === id
      );

    if (index === -1) {
      return null;
    }

    items[index] =
      normalizeRecurring({
        ...items[index],
        ...updates,
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
      getRecurringTransactions();

    saveRecurringTransactions(
      items.filter(
        (item) =>
          item.id !== id
      )
    );

    return true;
  }

  function monthlyRecurringValue(
    item
  ) {
    const amount =
      Number(item.amount) || 0;

    switch (
      String(
        item.frequency
      ).toLowerCase()
    ) {
      case "daily":
        return amount * 30;

      case "weekly":
        return amount * 4.345;

      case "yearly":
      case "annual":
        return amount / 12;

      case "monthly":
      default:
        return amount;
    }
  }

  /* =========================================================
     FINANCIAL HEALTH
     ========================================================= */

  function getFinancialHealth() {
    const month =
      getPeriodTransactions(
        "month"
      );

    const income =
      getIncome(month);

    const expenses =
      getExpenses(month);

    const budget =
      getMonthlyBudget();

    const savings =
      Math.max(
        0,
        income - expenses
      );

    let score = 50;

    /*
      Savings
    */

    if (income > 0) {
      const savingsRate =
        savings / income;

      if (savingsRate >= 0.3) {
        score += 20;
      } else if (
        savingsRate >= 0.2
      ) {
        score += 15;
      } else if (
        savingsRate >= 0.1
      ) {
        score += 8;
      } else if (
        savingsRate <= 0
      ) {
        score -= 20;
      }
    }

    /*
      Budget
    */

    if (budget > 0) {
      const usage =
        expenses / budget;

      if (usage <= 0.7) {
        score += 15;
      } else if (
        usage <= 0.9
      ) {
        score += 8;
      } else if (
        usage <= 1
      ) {
        score += 2;
      } else {
        score -= 15;
      }
    } else {
      score -= 3;
    }

    /*
      Income stability
    */

    if (income > 0) {
      score += 5;
    }

    /*
      Recurring obligations
    */

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
          (total, item) =>
            total +
            monthlyRecurringValue(
              item
            ),
          0
        );

    if (
      income > 0 &&
      recurringExpenses <
        income * 0.4
    ) {
      score += 5;
    } else if (
      income > 0 &&
      recurringExpenses >
        income * 0.6
    ) {
      score -= 10;
    }

    score = Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );

    let status = "Needs Attention";

    if (score >= 85) {
      status = "Excellent";
    } else if (score >= 70) {
      status = "Healthy";
    } else if (score >= 55) {
      status = "Fair";
    }

    return {
      score,
      status,
      income,
      expenses,
      savings,
      budget,
      recurringExpenses
    };
  }

  /* =========================================================
     SAFE TO SPEND
     ========================================================= */

  function getSafeToSpend() {
    const income =
      getIncome(
        getPeriodTransactions(
          "month"
        )
      );

    const expenses =
      getExpenses(
        getPeriodTransactions(
          "month"
        )
      );

    const budget =
      getMonthlyBudget();

    const days =
      daysInCurrentMonth();

    const day =
      new Date().getDate();

    let available;

    if (budget > 0) {
      available =
        Math.max(
          0,
          budget - expenses
        );
    } else {
      available =
        Math.max(
          0,
          income - expenses
        );
    }

    const remainingDays =
      Math.max(
        1,
        days - day + 1
      );

    const daily =
      available /
      remainingDays;

    return {
      available,
      daily,
      remainingDays
    };
  }

  /* =========================================================
     SMART INSIGHTS
     ========================================================= */

  function getSmartInsight() {
    const current =
      getPeriodTransactions(
        "month"
      );

    const previous =
      getPeriodTransactions(
        "lastMonth"
      );

    const currentExpenses =
      getExpenses(current);

    const previousExpenses =
      getExpenses(previous);

    const currentIncome =
      getIncome(current);

    const previousIncome =
      getIncome(previous);

    if (
      currentExpenses === 0 &&
      currentIncome === 0
    ) {
      return {
        title: "Let's build your money picture",
        message:
          "Add your first income or expense and MoneyLeak will start analyzing your finances.",
        type: "neutral"
      };
    }

    if (
      currentIncome > 0 &&
      currentExpenses === 0
    ) {
      return {
        title: "Excellent start",
        message:
          "You have income recorded this month but no expenses yet. Keep building your financial picture.",
        type: "positive"
      };
    }

    if (
      previousExpenses > 0 &&
      currentExpenses >
        previousExpenses * 1.2
    ) {
      return {
        title: "Spending increased",
        message:
          `Your spending is up ${Math.round(
            ((currentExpenses -
              previousExpenses) /
              previousExpenses) *
              100
          )}% compared with last month.`,
        type: "warning"
      };
    }

    if (
      previousExpenses > 0 &&
      currentExpenses <
        previousExpenses * 0.8
    ) {
      return {
        title: "You're spending less",
        message:
          "Your spending is meaningfully lower than last month. That's a strong financial habit.",
        type: "positive"
      };
    }

    if (
      previousIncome > 0 &&
      currentIncome >
        previousIncome * 1.15
    ) {
      return {
        title: "Income is growing",
        message:
          "Your income is higher than last month. Consider directing some of the increase toward savings.",
        type: "positive"
      };
    }

    const top =
      getTopSpendingCategories(
        1,
        current
      )[0];

    if (top) {
      return {
        title: `${top.category} is your biggest category`,
        message:
          `${displayCurrency(
            top.amount
          )} has gone toward ${top.category.toLowerCase()} this month.`,
        type: "neutral"
      };
    }

    return {
      title: "Stay consistent",
      message:
        "Keep recording your money activity. Consistent tracking creates better financial decisions.",
      type: "neutral"
    };
  }

  /* =========================================================
     ALERTS
     ========================================================= */

  function generateAlerts() {
    const alerts = [];

    const month =
      getPeriodTransactions(
        "month"
      );

    const income =
      getIncome(month);

    const expenses =
      getExpenses(month);

    const budget =
      getMonthlyBudget();

    if (
      budget > 0 &&
      expenses > budget
    ) {
      alerts.push({
        id: "budget-over",
        type: "danger",
        title: "Budget exceeded",
        message:
          `You've exceeded your monthly budget by ${displayCurrency(
            expenses - budget
          )}.`
      });
    } else if (
      budget > 0 &&
      expenses >= budget * 0.8
    ) {
      alerts.push({
        id: "budget-warning",
        type: "warning",
        title: "Budget getting tight",
        message:
          `You've used ${Math.round(
            (expenses / budget) *
              100
          )}% of your monthly budget.`
      });
    }

    if (
      income > 0 &&
      expenses > income
    ) {
      alerts.push({
        id: "negative-cashflow",
        type: "danger",
        title: "Negative cash flow",
        message:
          "Your expenses are currently higher than your income this month."
      });
    }

    const health =
      getFinancialHealth();

    if (
      health.score >= 80
    ) {
      alerts.push({
        id: "health-good",
        type: "success",
        title: "Financial health looks strong",
        message:
          "Your current money pattern is moving in a healthy direction."
      });
    }

    const goals =
      getSavingsGoals();

    const unfinished =
      goals.filter(
        (goal) =>
          getGoalProgress(goal) <
          100
      );

    if (
      unfinished.length > 0
    ) {
      alerts.push({
        id: "goal-progress",
        type: "info",
        title: "Keep your goals moving",
        message:
          `You have ${unfinished.length} active savings goal${
            unfinished.length === 1
              ? ""
              : "s"
          }.`
      });
    }

    writeStorage(
      STORAGE.alerts,
      alerts
    );

    return alerts;
  }

  function getAlerts() {
    return readStorage(
      STORAGE.alerts,
      []
    );
  }

  /* =========================================================
     SEARCH
     ========================================================= */

  function searchMoneyLeak(query) {
    const term =
      String(query || "")
        .trim()
        .toLowerCase();

    if (!term) {
      return [];
    }

    const results = [];

    const transactions =
      getTransactions();

    transactions.forEach(
      (transaction) => {
        const haystack =
          [
            transaction.category,
            transaction.source,
            transaction.description,
            transaction.date,
            transaction.amount
          ]
            .join(" ")
            .toLowerCase();

        if (
          haystack.includes(term)
        ) {
          results.push({
            type: "transaction",
            title:
              transaction.description ||
              transaction.category ||
              "Transaction",
            description:
              `${displayCurrency(
                transaction.amount
              )} • ${transaction.date}`,
            data: transaction
          });
        }
      }
    );

    getSavingsGoals().forEach(
      (goal) => {
        if (
          goal.name
            .toLowerCase()
            .includes(term)
        ) {
          results.push({
            type: "goal",
            title: goal.name,
            description:
              `${displayCurrency(
                goal.current
              )} of ${displayCurrency(
                goal.target
              )}`,
            data: goal
          });
        }
      }
    );

    return results.slice(0, 20);
  }

  /* =========================================================
     SEARCH UI
     ========================================================= */

  function setupSearch() {
    const overlay =
      $("searchOverlay");

    const close =
      $("closeSearch");

    const input =
      $("globalSearch");

    const results =
      $("searchResults");

    const openButtons =
      document.querySelectorAll(
        "[data-open-search]"
      );

    if (!overlay || !input) {
      return;
    }

    function openSearch() {
      overlay.hidden = false;
      overlay.classList.add("open");

      setTimeout(() => {
        input.focus();
      }, 50);
    }

    function closeSearch() {
      overlay.classList.remove(
        "open"
      );

      overlay.hidden = true;

      input.value = "";

      if (results) {
        results.innerHTML = "";
      }
    }

    openButtons.forEach(
      (button) => {
        button.addEventListener(
          "click",
          openSearch
        );
      }
    );

    if (close) {
      close.addEventListener(
        "click",
        closeSearch
      );
    }

    overlay.addEventListener(
      "click",
      (event) => {
        if (
          event.target === overlay
        ) {
          closeSearch();
        }
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        const modifier =
          event.metaKey ||
          event.ctrlKey;

        if (
          modifier &&
          event.shiftKey &&
          event.key.toLowerCase() ===
            "k"
        ) {
          event.preventDefault();
          openSearch();
        }

        if (
          event.key === "Escape" &&
          !overlay.hidden
        ) {
          closeSearch();
        }
      }
    );

    input.addEventListener(
      "input",
      () => {
        const found =
          searchMoneyLeak(
            input.value
          );

        if (!results) {
          return;
        }

        if (
          !input.value.trim()
        ) {
          results.innerHTML = `
            <div class="search-empty">
              <strong>Search MoneyLeak</strong>
              <span>Try a category, transaction, goal or amount.</span>
            </div>
          `;

          return;
        }

        if (found.length === 0) {
          results.innerHTML = `
            <div class="search-empty">
              <strong>No results</strong>
              <span>Nothing matched your search.</span>
            </div>
          `;

          return;
        }

        results.innerHTML =
          found
            .map(
              (item) => `
                <button
                  class="search-result"
                  type="button"
                  data-search-type="${escapeHTML(
                    item.type
                  )}"
                >
                  <span>
                    <strong>
                      ${escapeHTML(
                        item.title
                      )}
                    </strong>
                    <small>
                      ${escapeHTML(
                        item.description
                      )}
                    </small>
                  </span>
                </button>
              `
            )
            .join("");
      }
    );
  }

  /* =========================================================
     NOTIFICATIONS
     ========================================================= */

  function setupNotifications() {
    const button =
      $("notificationButton");

    const panel =
      $("notificationPanel");

    const close =
      $("closeNotifications");

    const list =
      $("notificationList");

    if (!button || !panel) {
      return;
    }

    function render() {
      const alerts =
        generateAlerts();

      if (!list) {
        return;
      }

      if (
        alerts.length === 0
      ) {
        list.innerHTML = `
          <div class="notification-empty">
            <strong>You're all caught up</strong>
            <span>No important alerts right now.</span>
          </div>
        `;

        return;
      }

      list.innerHTML =
        alerts
          .map(
            (alert) => `
              <div class="notification-item notification-${escapeHTML(
                alert.type
              )}">
                <strong>
                  ${escapeHTML(
                    alert.title
                  )}
                </strong>
                <span>
                  ${escapeHTML(
                    alert.message
                  )}
                </span>
              </div>
            `
          )
          .join("");
    }

    button.addEventListener(
      "click",
      () => {
        render();

        panel.classList.toggle(
          "open"
        );
      }
    );

    if (close) {
      close.addEventListener(
        "click",
        () => {
          panel.classList.remove(
            "open"
          );
        }
      );
    }

    document.addEventListener(
      "click",
      (event) => {
        if (
          !panel.contains(
            event.target
          ) &&
          !button.contains(
            event.target
          )
        ) {
          panel.classList.remove(
            "open"
          );
        }
      }
    );

    window.addEventListener(
      "moneyLeakUpdated",
      render
    );
  }

  /* =========================================================
     MOBILE NAVIGATION
     ========================================================= */

  function setupMobileNavigation() {
    const open =
      $("mobileMenuButton");

    const close =
      $("closeMobileMenu");

    const overlay =
      $("mobileOverlay");

    const sidebar =
      document.querySelector(
        ".sidebar"
      );

    if (!open || !sidebar) {
      return;
    }

    function show() {
      sidebar.classList.add(
        "mobile-open"
      );

      if (overlay) {
        overlay.classList.add(
          "open"
        );
      }

      document.body.classList.add(
        "menu-open"
      );
    }

    function hide() {
      sidebar.classList.remove(
        "mobile-open"
      );

      if (overlay) {
        overlay.classList.remove(
          "open"
        );
      }

      document.body.classList.remove(
        "menu-open"
      );
    }

    open.addEventListener(
      "click",
      show
    );

    if (close) {
      close.addEventListener(
        "click",
        hide
      );
    }

    if (overlay) {
      overlay.addEventListener(
        "click",
        hide
      );
    }
  }

  /* =========================================================
     ACTIVE NAVIGATION
     ========================================================= */

  function setupActiveNavigation() {
    const page =
      location.pathname
        .split("/")
        .pop() || "index.html";

    document
      .querySelectorAll(
        ".sidebar a, .mobile-nav a"
      )
      .forEach((link) => {
        const href =
          link
            .getAttribute("href")
            ?.split("/")
            .pop();

        if (
          href === page ||
          (page === "" &&
            href === "index.html")
        ) {
          link.classList.add(
            "active"
          );
        }
      });
  }

  /* =========================================================
     GREETING
     ========================================================= */

  function setupGreeting() {
    const element =
      $("dashboardGreeting");

    if (!element) {
      return;
    }

    const hour =
      new Date().getHours();

    let greeting =
      "Good evening";

    if (hour < 12) {
      greeting = "Good morning";
    } else if (hour < 18) {
      greeting = "Good afternoon";
    }

    const name =
      getSettings().name ||
      "there";

    element.textContent =
      `${greeting}, ${name}`;
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */

  function updateDashboard() {
    const month =
      getPeriodTransactions(
        "month"
      );

    const income =
      getIncome(month);

    const expenses =
      getExpenses(month);

    const cashFlow =
      income - expenses;

    const savingsRate =
      income > 0
        ? Math.max(
            0,
            (cashFlow / income) *
              100
          )
        : 0;

    const goals =
      getSavingsGoals();

    const totalTarget =
      goals.reduce(
        (sum, goal) =>
          sum + Number(goal.target),
        0
      );

    const totalSaved =
      goals.reduce(
        (sum, goal) =>
          sum + Number(goal.current),
        0
      );

    const goalProgress =
      totalTarget > 0
        ? Math.min(
            100,
            (totalSaved /
              totalTarget) *
              100
          )
        : 0;

    const health =
      getFinancialHealth();

    const values = {
      overviewBalance:
        getBalance(),
      overviewIncome:
        income,
      overviewExpenses:
        expenses,
      overviewSavingsRate:
        `${Math.round(
          savingsRate
        )}%`,
      overviewGoalProgress:
        `${Math.round(
          goalProgress
        )}%`,
      overviewHealthScore:
        health.score
    };

    Object.entries(
      values
    ).forEach(
      ([id, value]) => {
        const element = $(id);

        if (!element) {
          return;
        }

        element.textContent =
          id ===
          "overviewSavingsRate" ||
          id ===
          "overviewGoalProgress" ||
          id ===
          "overviewHealthScore"
            ? value
            : displayCurrency(
                value
              );
      }
    );

    const goalFill =
      $("overviewGoalFill");

    if (goalFill) {
      goalFill.style.width =
        `${goalProgress}%`;
    }

    const healthFill =
      $("healthFill");

    if (healthFill) {
      healthFill.style.width =
        `${health.score}%`;
    }

    const healthScore =
      $("healthScore");

    if (healthScore) {
      healthScore.textContent =
        health.score;
    }

    const healthStatus =
      $("overviewHealthStatus");

    if (healthStatus) {
      healthStatus.textContent =
        health.status;
    }

    const healthMessage =
      $("healthMessage");

    if (healthMessage) {
      healthMessage.textContent =
        health.status;
    }

    const healthExplanation =
      $("healthExplanation");

    if (healthExplanation) {
      healthExplanation.textContent =
        getHealthExplanation(
          health.score
        );
    }

    const insight =
      getSmartInsight();

    const insightElement =
      $("overviewInsightText");

    if (insightElement) {
      insightElement.textContent =
        insight.message;
    }

    const safe =
      getSafeToSpend();

    const safeElement =
      $("safeToSpendDashboard");

    if (safeElement) {
      safeElement.textContent =
        displayCurrency(
          safe.available
        );
    }

    const safeMessage =
      $("safeToSpendMessage");

    if (safeMessage) {
      safeMessage.textContent =
        `${displayCurrency(
          safe.daily
        )} per day for the rest of the month`;
    }

    const recent =
      $("recentTransactions");

    if (recent) {
      renderRecentTransactions(
        recent
      );
    }

    const categories =
      $("topSpendingCategories");

    if (categories) {
      renderTopCategories(
        categories,
        month
      );
    }

    const dashboardGoals =
      $("dashboardGoals");

    if (dashboardGoals) {
      renderDashboardGoals(
        dashboardGoals
      );
    }

    updateDashboardBudget(
      expenses
    );

    updateDashboardCashFlow(
      income,
      expenses,
      cashFlow
    );

    setupGreeting();
  }

  function getHealthExplanation(
    score
  ) {
    if (score >= 85) {
      return "Your current money habits are giving you a strong financial foundation.";
    }

    if (score >= 70) {
      return "You're in a healthy position. Keep improving your savings and spending consistency.";
    }

    if (score >= 55) {
      return "Your finances are workable, but there are a few areas where better control could help.";
    }

    return "Your current spending pattern needs attention. Focus on controlling expenses and protecting cash flow.";
  }

  function renderRecentTransactions(
    container
  ) {
    const transactions =
      getTransactions()
        .slice(0, 6);

    if (
      transactions.length === 0
    ) {
      container.innerHTML = `
        <div class="empty-state">
          <strong>No transactions yet</strong>
          <span>Add your first income or expense.</span>
        </div>
      `;

      return;
    }

    container.innerHTML =
      transactions
        .map(
          (transaction) => `
            <div class="transaction-row">
              <div>
                <strong>
                  ${escapeHTML(
                    transaction.description ||
                      transaction.category
                  )}
                </strong>
                <small>
                  ${escapeHTML(
                    transaction.date
                  )}
                </small>
              </div>

              <strong class="${
                transaction.type ===
                "income"
                  ? "amount-positive"
                  : "amount-negative"
              }">
                ${
                  transaction.type ===
                  "income"
                    ? "+"
                    : "-"
                }${displayCurrency(
                  transaction.amount
                )}
              </strong>
            </div>
          `
        )
        .join("");
  }

  function renderTopCategories(
    container,
    transactions
  ) {
    const categories =
      getTopSpendingCategories(
        5,
        transactions
      );

    if (
      categories.length === 0
    ) {
      container.innerHTML = `
        <div class="empty-state">
          <strong>No spending data</strong>
          <span>Your biggest spending categories will appear here.</span>
        </div>
      `;

      return;
    }

    const total =
      getExpenses(
        transactions
      );

    container.innerHTML =
      categories
        .map(
          (item) => {
            const percent =
              total > 0
                ? (item.amount /
                    total) *
                  100
                : 0;

            return `
              <div class="category-row">
                <div class="category-row-top">
                  <strong>
                    ${escapeHTML(
                      item.category
                    )}
                  </strong>

                  <span>
                    ${displayCurrency(
                      item.amount
                    )}
                  </span>
                </div>

                <div class="mini-progress">
                  <span style="width:${Math.min(
                    100,
                    percent
                  )}%"></span>
                </div>
              </div>
            `;
          }
        )
        .join("");
  }

  function renderDashboardGoals(
    container
  ) {
    const goals =
      getSavingsGoals()
        .slice(0, 3);

    if (
      goals.length === 0
    ) {
      container.innerHTML = `
        <div class="empty-state">
          <strong>No savings goals</strong>
          <span>Create a goal and start building your future.</span>
        </div>
      `;

      return;
    }

    container.innerHTML =
      goals
        .map(
          (goal) => {
            const progress =
              getGoalProgress(
                goal
              );

            return `
              <div class="goal-mini">
                <div class="goal-mini-top">
                  <strong>
                    ${escapeHTML(
                      goal.name
                    )}
                  </strong>

                  <span>
                    ${Math.round(
                      progress
                    )}%
                  </span>
                </div>

                <div class="mini-progress">
                  <span style="width:${progress}%"></span>
                </div>

                <small>
                  ${displayCurrency(
                    goal.current
                  )} of ${displayCurrency(
                    goal.target
                  )}
                </small>
              </div>
            `;
          }
        )
        .join("");
  }

  function updateDashboardBudget(
    expenses
  ) {
    const budget =
      getMonthlyBudget();

    const percent =
      budget > 0
        ? Math.min(
            100,
            (expenses /
              budget) *
              100
          )
        : 0;

    const percentElement =
      $("dashboardBudgetPercent");

    if (percentElement) {
      percentElement.textContent =
        `${Math.round(
          percent
        )}%`;
    }

    const fill =
      $("dashboardBudgetFill");

    if (fill) {
      fill.style.width =
        `${percent}%`;
    }

    const spent =
      $("dashboardBudgetSpent");

    if (spent) {
      spent.textContent =
        displayCurrency(
          expenses
        );
    }

    const remaining =
      $("dashboardBudgetRemaining");

    if (remaining) {
      remaining.textContent =
        displayCurrency(
          Math.max(
            0,
            budget - expenses
          )
        );
    }

    const limit =
      $("dashboardBudgetLimit");

    if (limit) {
      limit.textContent =
        displayCurrency(
          budget
        );
    }
  }

  function updateDashboardCashFlow(
    income,
    expenses,
    cashFlow
  ) {
    const incomeElement =
      $("periodIncome");

    const expenseElement =
      $("periodExpenses");

    const cashFlowElement =
      $("periodCashFlow");

    if (incomeElement) {
      incomeElement.textContent =
        displayCurrency(
          income
        );
    }

    if (expenseElement) {
      expenseElement.textContent =
        displayCurrency(
          expenses
        );
    }

    if (cashFlowElement) {
      cashFlowElement.textContent =
        displayCurrency(
          cashFlow
        );
    }

    const health =
      $("cashFlowHealth");

    if (health) {
      health.textContent =
        cashFlow >= 0
          ? "Positive cash flow"
          : "Negative cash flow";
    }
  }

  /* =========================================================
     QUICK ACTIONS
     ========================================================= */

  function setupQuickActions() {
    document
      .querySelectorAll(
        "[data-action='add-expense']"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              location.href =
                "expenses.html";
            }
          );
        }
      );

    document
      .querySelectorAll(
        "[data-action='add-income']"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              location.href =
                "income.html";
            }
          );
        }
      );

    document
      .querySelectorAll(
        "[data-action='add-goal']"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              location.href =
                "savings.html";
            }
          );
        }
      );

    document
      .querySelectorAll(
        "[data-action='analytics']"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              location.href =
                "analytics.html";
            }
          );
        }
      );
  }

  /* =========================================================
     GLOBAL UPDATE
     ========================================================= */

  function refreshApplication() {
    applySettings();

    updateDashboard();

    generateAlerts();

    setupGreeting();
  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  function initialize() {
    if (
      !localStorage.getItem(
        STORAGE.initialized
      )
    ) {
      writeStorage(
        STORAGE.initialized,
        true
      );
    }

    applySettings();

    setupSearch();

    setupNotifications();

    setupMobileNavigation();

    setupActiveNavigation();

    setupQuickActions();

    setupGreeting();

    updateDashboard();

    window.addEventListener(
      "moneyLeakUpdated",
      () => {
        updateDashboard();
      }
    );
  }

  /* =========================================================
     PUBLIC MONEYLeak API
     ========================================================= */

  window.MoneyLeak = {
    version: "6.0",

    STORAGE,

    EXPENSE_CATEGORIES,

    INCOME_SOURCES,

    // Settings
    getSettings,
    saveSettings,
    applySettings,

    // Currency
    getCurrency,
    displayCurrency,

    // Transactions
    getTransactions,
    saveTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearTransactions,

    // Calculations
    getIncome,
    getExpenses,
    getBalance,
    getPeriodTransactions,
    getCategoryTotals,
    getTopSpendingCategories,
    getLargestExpense,

    // Goals
    getSavingsGoals,
    saveSavingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    getGoalProgress,

    // Budgets
    getMonthlyBudget,
    setMonthlyBudget,
    getCategoryBudgets,
    setCategoryBudget,

    // Recurring
    getRecurringTransactions,
    saveRecurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    monthlyRecurringValue,

    // Intelligence
    getFinancialHealth,
    getSafeToSpend,
    getSmartInsight,
    generateAlerts,
    getAlerts,

    // Search
    searchMoneyLeak,

    // Refresh
    refreshApplication
  };

  /* =========================================================
     START
     ========================================================= */

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
