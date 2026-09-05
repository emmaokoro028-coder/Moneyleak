/* =========================================================
   MONEYLEAK — CENTRAL APPLICATION ENGINE
   Version 5.0 — AI VOICE EDITION
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */

  const APP_VERSION = "5.0.0";

  const VOICE_API =
    "https://moneyleak-eight.vercel.app/api/voice";

  const STORAGE = {
    transactions: "moneyLeakTransactions",
    savingsGoals: "moneyLeakSavingsGoals",
    oldSavingsGoal: "moneyLeakSavingsGoal",
    monthlyBudget: "moneyLeakMonthlyBudget",
    categoryBudgets: "moneyLeakCategoryBudgets",
    recurring: "moneyLeakRecurringTransactions",
    settings: "moneyLeakSettings",
    alerts: "moneyLeakAlerts",
    assistantHistory: "moneyLeakAssistantHistory",
    initialized: "moneyLeakInitialized"
  };

  const DEFAULT_SETTINGS = {
    name: "My Money",
    currency: "NGN",
    theme: "light",
    notifications: true,
    compactNumbers: false,
    voiceAssistant: true,
    voiceRate: 1,
    voicePitch: 1
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
    "Allowance",
    "Side Hustle",
    "Other income"
  ];

  const PAGE_MAP = {
    dashboard: "index.html",
    income: "income.html",
    expenses: "expenses.html",
    budgets: "budgets.html",
    savings: "savings.html",
    recurring: "recurring.html",
    analytics: "analytics.html",
    settings: "settings.html"
  };

  let settings = null;

  let voiceState = {
    recording: false,
    processing: false,
    mediaRecorder: null,
    chunks: [],
    stream: null,
    mimeType: "",
    pendingAction: null,
    mode: "command"
  };

  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  function $(id) {
    return document.getElementById(id);
  }

  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function currentMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
  }

  function monthStart(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function monthEnd(date = new Date()) {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
  }

  function formatDate(date) {
    if (!date) return "No date";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return String(date);
    }

    return parsed.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function formatShortDate(date) {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return String(date);
    }

    return parsed.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short"
    });
  }

  function uid(prefix = "ml") {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }

  /* =========================================================
     STORAGE
     ========================================================= */

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) return fallback;

      const parsed = JSON.parse(raw);

      return parsed ?? fallback;
    } catch (error) {
      console.warn("MoneyLeak storage read error:", key, error);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("MoneyLeak storage write error:", error);
      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  function getSettings() {
    const saved = readJSON(
      STORAGE.settings,
      {}
    );

    return {
      ...DEFAULT_SETTINGS,
      ...(saved || {})
    };
  }

  function saveSettings(nextSettings = {}) {
    settings = {
      ...getSettings(),
      ...nextSettings
    };

    writeJSON(STORAGE.settings, settings);

    applySettings();

    document.dispatchEvent(
      new CustomEvent("moneyLeakSettingsUpdated", {
        detail: settings
      })
    );

    return settings;
  }

  function applySettings() {
    settings = getSettings();

    let theme = settings.theme;

    if (theme === "system") {
      theme = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    document.documentElement.dataset.moneyLeakVersion =
      APP_VERSION;
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

  function displayCurrency(amount, options = {}) {
    const value = safeNumber(amount);
    const currency = options.currency || getCurrency();

    try {
      const formatted = new Intl.NumberFormat(
        undefined,
        {
          style: "currency",
          currency,
          maximumFractionDigits:
            options.decimals ?? 0
        }
      ).format(value);

      return formatted;
    } catch {
      return `${currencySymbol(currency)}${value.toLocaleString()}`;
    }
  }

  function compactCurrency(amount) {
    const value = safeNumber(amount);
    const symbol = currencySymbol();

    if (Math.abs(value) >= 1_000_000_000) {
      return `${symbol}${(value / 1_000_000_000).toFixed(1)}B`;
    }

    if (Math.abs(value) >= 1_000_000) {
      return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
    }

    if (Math.abs(value) >= 1_000) {
      return `${symbol}${(value / 1_000).toFixed(1)}K`;
    }

    return displayCurrency(value);
  }

  /* =========================================================
     TRANSACTIONS
     ========================================================= */

  function normalizeTransaction(transaction = {}) {
    const type =
      transaction.type === "income"
        ? "income"
        : "expense";

    return {
      id: transaction.id || uid("txn"),
      type,
      amount: Math.abs(safeNumber(transaction.amount)),
      category:
        transaction.category ||
        (type === "income"
          ? "Other income"
          : "Other"),
      description:
        transaction.description ||
        (type === "income"
          ? "Income"
          : "Expense"),
      source:
        transaction.source ||
        (type === "income"
          ? transaction.category || "Other income"
          : ""),
      date:
        transaction.date ||
        todayISO(),
      createdAt:
        transaction.createdAt ||
        new Date().toISOString()
    };
  }

  function getTransactions() {
    const transactions = readJSON(
      STORAGE.transactions,
      []
    );

    if (!Array.isArray(transactions)) {
      return [];
    }

    return transactions
      .map(normalizeTransaction)
      .sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      );
  }

  function saveTransactions(transactions) {
    writeJSON(
      STORAGE.transactions,
      transactions.map(normalizeTransaction)
    );

    notifyDataChanged();

    return getTransactions();
  }

  function addTransaction(transaction) {
    const transactions = getTransactions();

    const newTransaction =
      normalizeTransaction(transaction);

    transactions.unshift(newTransaction);

    saveTransactions(transactions);

    return newTransaction;
  }

  function updateTransaction(id, changes = {}) {
    const transactions = getTransactions();

    const index = transactions.findIndex(
      item => item.id === id
    );

    if (index === -1) {
      return null;
    }

    transactions[index] = normalizeTransaction({
      ...transactions[index],
      ...changes,
      id
    });

    saveTransactions(transactions);

    return transactions[index];
  }

  function deleteTransaction(id) {
    const transactions = getTransactions();

    const found = transactions.find(
      item => item.id === id
    );

    if (!found) return false;

    const remaining = transactions.filter(
      item => item.id !== id
    );

    saveTransactions(remaining);

    return true;
  }

  function getPeriodTransactions(
    period = "month",
    referenceDate = new Date()
  ) {
    const transactions = getTransactions();

    const current = new Date(referenceDate);

    let start;
    let end;

    if (period === "month") {
      start = monthStart(current);
      end = monthEnd(current);
    }

    if (period === "lastMonth") {
      start = new Date(
        current.getFullYear(),
        current.getMonth() - 1,
        1
      );

      end = new Date(
        current.getFullYear(),
        current.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
    }

    if (period === "year") {
      start = new Date(
        current.getFullYear(),
        0,
        1
      );

      end = new Date(
        current.getFullYear(),
        11,
        31,
        23,
        59,
        59,
        999
      );
    }

    if (period === "all") {
      return transactions;
    }

    return transactions.filter(transaction => {
      const date = new Date(transaction.date);

      return date >= start && date <= end;
    });
  }

  function getIncomeTotal(transactions) {
    return transactions
      .filter(item => item.type === "income")
      .reduce(
        (sum, item) =>
          sum + safeNumber(item.amount),
        0
      );
  }

  function getExpenseTotal(transactions) {
    return transactions
      .filter(item => item.type === "expense")
      .reduce(
        (sum, item) =>
          sum + safeNumber(item.amount),
        0
      );
  }

  function getBalance() {
    const transactions = getTransactions();

    return (
      getIncomeTotal(transactions) -
      getExpenseTotal(transactions)
    );
  }

  /* =========================================================
     SAVINGS GOALS
     ========================================================= */

  function normalizeGoal(goal = {}) {
    return {
      id: goal.id || uid("goal"),
      name: goal.name || "Savings Goal",
      target: Math.max(
        0,
        safeNumber(goal.target)
      ),
      current: Math.max(
        0,
        safeNumber(goal.current)
      ),
      deadline: goal.deadline || "",
      color: goal.color || "#18a66b",
      description: goal.description || "",
      createdAt:
        goal.createdAt ||
        new Date().toISOString()
    };
  }

  function getSavingsGoals() {
    let goals = readJSON(
      STORAGE.savingsGoals,
      null
    );

    if (!Array.isArray(goals)) {
      const oldGoal = readJSON(
        STORAGE.oldSavingsGoal,
        null
      );

      if (oldGoal && typeof oldGoal === "object") {
        goals = [
          normalizeGoal({
            name: oldGoal.name || "Savings Goal",
            target:
              oldGoal.target ||
              oldGoal.amount ||
              0,
            current:
              oldGoal.current ||
              oldGoal.saved ||
              0,
            deadline:
              oldGoal.deadline || ""
          })
        ];

        writeJSON(
          STORAGE.savingsGoals,
          goals
        );
      } else {
        goals = [];
      }
    }

    return goals.map(normalizeGoal);
  }

  function saveSavingsGoals(goals) {
    writeJSON(
      STORAGE.savingsGoals,
      goals.map(normalizeGoal)
    );

    notifyDataChanged();

    return getSavingsGoals();
  }

  function addSavingsGoal(goal) {
    const goals = getSavingsGoals();

    const newGoal = normalizeGoal(goal);

    goals.push(newGoal);

    saveSavingsGoals(goals);

    return newGoal;
  }

  function updateSavingsGoal(id, changes) {
    const goals = getSavingsGoals();

    const index = goals.findIndex(
      goal => goal.id === id
    );

    if (index === -1) return null;

    goals[index] = normalizeGoal({
      ...goals[index],
      ...changes,
      id
    });

    saveSavingsGoals(goals);

    return goals[index];
  }

  function deleteSavingsGoal(id) {
    const goals = getSavingsGoals();

    const remaining = goals.filter(
      goal => goal.id !== id
    );

    if (remaining.length === goals.length) {
      return false;
    }

    saveSavingsGoals(remaining);

    return true;
  }

  function goalProgress(goal) {
    if (!goal || safeNumber(goal.target) <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (safeNumber(goal.current) /
          safeNumber(goal.target)) *
          100
      )
    );
  }

  /* =========================================================
     BUDGETS
     ========================================================= */

  function getMonthlyBudget() {
    const data = readJSON(
      STORAGE.monthlyBudget,
      0
    );

    if (
      typeof data === "number" ||
      typeof data === "string"
    ) {
      return safeNumber(data);
    }

    return safeNumber(
      data?.amount || 0
    );
  }

  function setMonthlyBudget(amount) {
    const value = Math.max(
      0,
      safeNumber(amount)
    );

    writeJSON(
      STORAGE.monthlyBudget,
      value
    );

    notifyDataChanged();

    return value;
  }

  function getCategoryBudgets() {
    const budgets = readJSON(
      STORAGE.categoryBudgets,
      {}
    );

    return budgets &&
      typeof budgets === "object" &&
      !Array.isArray(budgets)
      ? budgets
      : {};
  }

  function setCategoryBudget(
    category,
    amount
  ) {
    const budgets =
      getCategoryBudgets();

    const value = Math.max(
      0,
      safeNumber(amount)
    );

    if (value <= 0) {
      delete budgets[category];
    } else {
      budgets[category] = value;
    }

    writeJSON(
      STORAGE.categoryBudgets,
      budgets
    );

    notifyDataChanged();

    return budgets;
  }

  /* =========================================================
     RECURRING TRANSACTIONS
     ========================================================= */

  function normalizeRecurring(item = {}) {
    return {
      id: item.id || uid("rec"),
      name:
        item.name ||
        item.description ||
        "Recurring payment",
      amount: Math.abs(
        safeNumber(item.amount)
      ),
      type:
        item.type === "income"
          ? "income"
          : "expense",
      frequency:
        item.frequency || "monthly",
      nextDate:
        item.nextDate ||
        todayISO(),
      category:
        item.category ||
        (item.type === "income"
          ? "Other income"
          : "Bills"),
      description:
        item.description || "",
      active:
        item.active !== false,
      createdAt:
        item.createdAt ||
        new Date().toISOString()
    };
  }

  function getRecurringTransactions() {
    const items = readJSON(
      STORAGE.recurring,
      []
    );

    if (!Array.isArray(items)) {
      return [];
    }

    return items.map(normalizeRecurring);
  }

  function saveRecurringTransactions(items) {
    writeJSON(
      STORAGE.recurring,
      items.map(normalizeRecurring)
    );

    notifyDataChanged();

    return getRecurringTransactions();
  }

  function addRecurringTransaction(item) {
    const items =
      getRecurringTransactions();

    const newItem =
      normalizeRecurring(item);

    items.push(newItem);

    saveRecurringTransactions(items);

    return newItem;
  }

  function updateRecurringTransaction(
    id,
    changes
  ) {
    const items =
      getRecurringTransactions();

    const index = items.findIndex(
      item => item.id === id
    );

    if (index === -1) return null;

    items[index] = normalizeRecurring({
      ...items[index],
      ...changes,
      id
    });

    saveRecurringTransactions(items);

    return items[index];
  }

  function deleteRecurringTransaction(id) {
    const items =
      getRecurringTransactions();

    const remaining = items.filter(
      item => item.id !== id
    );

    if (remaining.length === items.length) {
      return false;
    }

    saveRecurringTransactions(remaining);

    return true;
  }

  /* =========================================================
     FINANCIAL HEALTH
     ========================================================= */

  function getFinancialHealth() {
    const transactions =
      getPeriodTransactions("month");

    const income =
      getIncomeTotal(transactions);

    const expenses =
      getExpenseTotal(transactions);

    const goals =
      getSavingsGoals();

    let score = 50;

    if (income > 0) {
      const expenseRatio =
        expenses / income;

      if (expenseRatio <= 0.5) {
        score += 25;
      } else if (expenseRatio <= 0.7) {
        score += 15;
      } else if (expenseRatio <= 0.85) {
        score += 5;
      } else if (expenseRatio > 1) {
        score -= 20;
      }
    }

    const budget =
      getMonthlyBudget();

    if (budget > 0) {
      if (expenses <= budget * 0.5) {
        score += 10;
      } else if (expenses <= budget) {
        score += 5;
      } else {
        score -= 15;
      }
    }

    if (goals.length > 0) {
      const averageProgress =
        goals.reduce(
          (sum, goal) =>
            sum + goalProgress(goal),
          0
        ) / goals.length;

      if (averageProgress >= 75) {
        score += 10;
      } else if (averageProgress >= 40) {
        score += 5;
      }
    }

    const recurring =
      getRecurringTransactions();

    if (recurring.length <= 3) {
      score += 5;
    } else if (recurring.length >= 8) {
      score -= 5;
    }

    score = Math.max(
      0,
      Math.min(100, Math.round(score))
    );

    let status = "Needs attention";

    if (score >= 80) {
      status = "Excellent";
    } else if (score >= 65) {
      status = "Healthy";
    } else if (score >= 45) {
      status = "Fair";
    }

    return {
      score,
      status,
      income,
      expenses,
      savings:
        Math.max(0, income - expenses)
    };
  }

  function getSavingsRate(
    period = "month"
  ) {
    const transactions =
      getPeriodTransactions(period);

    const income =
      getIncomeTotal(transactions);

    const expenses =
      getExpenseTotal(transactions);

    if (income <= 0) return 0;

    return Math.round(
      ((income - expenses) / income) *
        100
    );
  }

  function getSafeToSpend() {
    const budget =
      getMonthlyBudget();

    const transactions =
      getPeriodTransactions("month");

    const expenses =
      getExpenseTotal(transactions);

    if (budget <= 0) {
      return {
        amount: Math.max(
          0,
          getBalance()
        ),
        hasBudget: false
      };
    }

    const now = new Date();

    const daysInMonth =
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();

    const remainingDays =
      Math.max(
        1,
        daysInMonth - now.getDate() + 1
      );

    const remaining =
      Math.max(
        0,
        budget - expenses
      );

    return {
      amount:
        remaining / remainingDays,
      totalRemaining: remaining,
      remainingDays,
      hasBudget: true
    };
  }

  /* =========================================================
     INSIGHTS
     ========================================================= */

  function getTopSpendingCategories() {
    const transactions =
      getPeriodTransactions("month")
        .filter(
          item => item.type === "expense"
        );

    const totals = {};

    transactions.forEach(item => {
      const category =
        item.category || "Other";

      totals[category] =
        (totals[category] || 0) +
        safeNumber(item.amount);
    });

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([category, amount]) => ({
          category,
          amount
        })
      );
  }

  function getSmartInsight() {
    const transactions =
      getPeriodTransactions("month");

    const income =
      getIncomeTotal(transactions);

    const expenses =
      getExpenseTotal(transactions);

    if (
      transactions.length === 0
    ) {
      return "Start by adding your first income or expense. MoneyLeak will turn your activity into useful financial insights.";
    }

    if (income <= 0) {
      return "You have expenses recorded but no income recorded this month. Add your income so MoneyLeak can calculate your cash flow and savings rate.";
    }

    const savingsRate =
      Math.round(
        ((income - expenses) /
          income) *
          100
      );

    const categories =
      getTopSpendingCategories();

    if (savingsRate >= 30) {
      return `You're saving about ${savingsRate}% of your income this month. That's a strong position. Keep protecting that gap.`;
    }

    if (savingsRate >= 10) {
      return `You're currently keeping about ${savingsRate}% of your income. A small reduction in your biggest spending category could improve that quickly.`;
    }

    if (expenses > income) {
      return "Your expenses are currently higher than your recorded income. Focus on your biggest leak first and avoid unnecessary new commitments.";
    }

    if (categories[0]) {
      return `${categories[0].category} is currently your biggest spending category this month at ${displayCurrency(categories[0].amount)}.`;
    }

    return "Keep tracking consistently. The more complete your data is, the smarter MoneyLeak becomes.";
  }

  /* =========================================================
     ALERTS
     ========================================================= */

  function generateAlerts() {
    const alerts = [];

    const transactions =
      getPeriodTransactions("month");

    const income =
      getIncomeTotal(transactions);

    const expenses =
      getExpenseTotal(transactions);

    const budget =
      getMonthlyBudget();

    if (
      income > 0 &&
      expenses > income
    ) {
      alerts.push({
        id: "income-over-expenses",
        type: "danger",
        title: "Expenses are above income",
        message:
          "Your recorded spending this month is higher than your recorded income."
      });
    }

    if (
      budget > 0 &&
      expenses > budget
    ) {
      alerts.push({
        id: "budget-exceeded",
        type: "danger",
        title: "Monthly budget exceeded",
        message:
          `You've spent ${displayCurrency(expenses)} against a ${displayCurrency(budget)} budget.`
      });
    }

    if (
      budget > 0 &&
      expenses >= budget * 0.8 &&
      expenses <= budget
    ) {
      alerts.push({
        id: "budget-warning",
        type: "warning",
        title: "Budget warning",
        message:
          "You've used at least 80% of your monthly budget."
      });
    }

    const savingsRate =
      getSavingsRate("month");

    if (
      income > 0 &&
      savingsRate >= 20
    ) {
      alerts.push({
        id: "strong-savings",
        type: "success",
        title: "Strong savings rate",
        message:
          `You're currently saving around ${savingsRate}% of your recorded income.`
      });
    }

    const recurring =
      getRecurringTransactions();

    if (recurring.length >= 6) {
      alerts.push({
        id: "recurring-load",
        type: "warning",
        title: "Many recurring commitments",
        message:
          "Review your recurring payments regularly and cancel services you no longer use."
      });
    }

    writeJSON(
      STORAGE.alerts,
      alerts
    );

    return alerts;
  }

  function getAlerts() {
    return generateAlerts();
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent =
        value ?? "";
    }
  }

  function setHTML(id, value) {
    const element = $(id);

    if (element) {
      element.innerHTML =
        value ?? "";
    }
  }

  function setWidth(id, percent) {
    const element = $(id);

    if (element) {
      element.style.width =
        `${Math.max(
          0,
          Math.min(100, percent)
        )}%`;
    }
  }

  function renderDashboard() {
    const page =
      document.body.dataset.page;

    if (
      page &&
      page !== "dashboard"
    ) {
      return;
    }

    const transactions =
      getTransactions();

    const monthTransactions =
      getPeriodTransactions("month");

    const income =
      getIncomeTotal(
        monthTransactions
      );

    const expenses =
      getExpenseTotal(
        monthTransactions
      );

    const cashFlow =
      income - expenses;

    const savingsRate =
      income > 0
        ? Math.round(
            (cashFlow / income) *
              100
          )
        : 0;

    const goals =
      getSavingsGoals();

    const totalTarget =
      goals.reduce(
        (sum, goal) =>
          sum + safeNumber(goal.target),
        0
      );

    const totalSaved =
      goals.reduce(
        (sum, goal) =>
          sum + safeNumber(goal.current),
        0
      );

    const goalProgressPercent =
      totalTarget > 0
        ? Math.round(
            (totalSaved / totalTarget) *
              100
          )
        : 0;

    const health =
      getFinancialHealth();

    const budget =
      getMonthlyBudget();

    const safe =
      getSafeToSpend();

    const categories =
      getTopSpendingCategories();

    const alerts =
      getAlerts();

    setText(
      "dashboardGreeting",
      getGreeting()
    );

    setText(
      "overviewBalance",
      displayCurrency(
        getBalance()
      )
    );

    setText(
      "overviewIncome",
      displayCurrency(income)
    );

    setText(
      "overviewExpenses",
      displayCurrency(expenses)
    );

    setText(
      "overviewSavingsRate",
      `${savingsRate}%`
    );

    setText(
      "overviewGoalProgress",
      `${goalProgressPercent}%`
    );

    setWidth(
      "overviewGoalFill",
      goalProgressPercent
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
      displayCurrency(income)
    );

    setText(
      "periodExpenses",
      displayCurrency(expenses)
    );

    setText(
      "periodCashFlow",
      displayCurrency(cashFlow)
    );

    setText(
      "cashFlowHealth",
      cashFlow >= 0
        ? "Positive cash flow"
        : "Negative cash flow"
    );

    setText(
      "overviewInsightText",
      getSmartInsight()
    );

    setText(
      "safeToSpendDashboard",
      safe.hasBudget
        ? displayCurrency(
            safe.amount
          )
        : displayCurrency(
            safe.amount
          )
    );

    setText(
      "safeToSpendMessage",
      safe.hasBudget
        ? `Based on your monthly budget, you have ${displayCurrency(safe.totalRemaining)} remaining for ${safe.remainingDays} day${safe.remainingDays === 1 ? "" : "s"}.`
        : "Set a monthly budget to unlock a more accurate daily safe-to-spend number."
    );

    setText(
      "safeToSpendAdvice",
      safe.hasBudget
        ? "Stay below this daily amount to protect your monthly budget."
        : "Create a budget from the Budgets page."
    );

    renderRecentTransactions(
      transactions.slice(0, 6)
    );

    renderTopSpending(
      categories.slice(0, 5)
    );

    renderDashboardGoals(
      goals.slice(0, 3)
    );

    renderDashboardBudget(
      budget,
      expenses
    );

    renderDashboardAlerts(
      alerts
    );

    renderHealth(
      health,
      income,
      expenses
    );

    setText(
      "directionValue",
      cashFlow >= 0
        ? "You're moving forward"
        : "Slow down and reset"
    );

    setText(
      "directionMessage",
      cashFlow >= 0
        ? "Your income currently covers your recorded spending."
        : "Your recorded spending is currently above your income."
    );

    setText(
      "nextActionText",
      getNextBestAction()
    );
  }

  function renderRecentTransactions(
    transactions
  ) {
    const container =
      $("recentTransactions");

    if (!container) return;

    if (!transactions.length) {
      container.innerHTML = `
        <div class="empty-state">
          <strong>No transactions yet</strong>
          <span>Add your first income or expense to start.</span>
        </div>
      `;
      return;
    }

    container.innerHTML =
      transactions
        .map(item => `
          <div class="transaction-row">
            <div class="transaction-icon ${
              item.type === "income"
                ? "income"
                : "expense"
            }">
              ${
                item.type === "income"
                  ? "+"
                  : "−"
              }
            </div>

            <div class="transaction-main">
              <strong>
                ${escapeHTML(
                  item.description
                )}
              </strong>
              <span>
                ${escapeHTML(
                  item.category
                )}
                ·
                ${formatShortDate(
                  item.date
                )}
              </span>
            </div>

            <strong class="${
              item.type === "income"
                ? "positive"
                : "negative"
            }">
              ${
                item.type === "income"
                  ? "+"
                  : "−"
              }${displayCurrency(
                item.amount
              )}
            </strong>
          </div>
        `)
        .join("");
  }

  function renderTopSpending(
    categories
  ) {
    const container =
      $("topSpendingCategories");

    if (!container) return;

    if (!categories.length) {
      container.innerHTML = `
        <div class="empty-state">
          No spending recorded this month.
        </div>
      `;
      return;
    }

    const total =
      categories.reduce(
        (sum, item) =>
          sum + item.amount,
        0
      );

    container.innerHTML =
      categories
        .map(item => {
          const percent =
            total > 0
              ? Math.round(
                  (item.amount /
                    total) *
                    100
                )
              : 0;

          return `
            <div class="category-row">
              <div>
                <strong>
                  ${escapeHTML(
                    item.category
                  )}
                </strong>
                <span>
                  ${percent}% of spending
                </span>
              </div>

              <strong>
                ${displayCurrency(
                  item.amount
                )}
              </strong>
            </div>

            <div class="progress-track small">
              <div
                class="progress-fill"
                style="width:${percent}%"
              ></div>
            </div>
          `;
        })
        .join("");
  }

  function renderDashboardGoals(
    goals
  ) {
    const container =
      $("dashboardGoals");

    if (!container) return;

    if (!goals.length) {
      container.innerHTML = `
        <div class="empty-state">
          <strong>No savings goals</strong>
          <span>Create your first goal.</span>
        </div>
      `;
      return;
    }

    container.innerHTML =
      goals
        .map(goal => {
          const progress =
            goalProgress(goal);

          return `
            <div class="goal-mini">
              <div class="goal-mini-head">
                <strong>
                  ${escapeHTML(
                    goal.name
                  )}
                </strong>
                <span>
                  ${progress}%
                </span>
              </div>

              <div class="progress-track">
                <div
                  class="progress-fill"
                  style="width:${progress}%"
                ></div>
              </div>

              <div class="goal-mini-foot">
                <span>
                  ${displayCurrency(
                    goal.current
                  )}
                </span>
                <span>
                  ${displayCurrency(
                    goal.target
                  )}
                </span>
              </div>
            </div>
          `;
        })
        .join("");
  }

  function renderDashboardBudget(
    budget,
    expenses
  ) {
    const percent =
      budget > 0
        ? Math.round(
            (expenses / budget) * 100
          )
        : 0;

    setText(
      "dashboardBudgetPercent",
      `${percent}%`
    );

    setWidth(
      "dashboardBudgetFill",
      percent
    );

    setText(
      "dashboardBudgetSpent",
      displayCurrency(expenses)
    );

    setText(
      "dashboardBudgetRemaining",
      displayCurrency(
        Math.max(
          0,
          budget - expenses
        )
      )
    );

    setText(
      "dashboardBudgetLimit",
      displayCurrency(budget)
    );
  }

  function renderDashboardAlerts(
    alerts
  ) {
    const container =
      $("financialAlerts");

    if (!container) return;

    if (!alerts.length) {
      container.innerHTML = `
        <div class="alert-item success">
          <div>
            <strong>Everything looks good</strong>
            <span>No major financial alerts right now.</span>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML =
      alerts
        .map(alert => `
          <div class="alert-item ${escapeHTML(
            alert.type
          )}">
            <div>
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
          </div>
        `)
        .join("");
  }

  function renderHealth(
    health,
    income,
    expenses
  ) {
    setText(
      "healthScore",
      health.score
    );

    setWidth(
      "healthFill",
      health.score
    );

    setText(
      "healthMessage",
      health.status
    );

    setText(
      "healthExplanation",
      getHealthExplanation(
        health,
        income,
        expenses
      )
    );

    setText(
      "healthIncomeFactor",
      income > 0
        ? "Strong"
        : "Missing"
    );

    setWidth(
      "healthIncomeBar",
      income > 0 ? 100 : 20
    );

    setText(
      "healthBudgetFactor",
      getMonthlyBudget() > 0
        ? "Tracked"
        : "Not set"
    );

    setWidth(
      "healthBudgetBar",
      getMonthlyBudget() > 0
        ? 80
        : 20
    );

    setText(
      "healthSavingsFactor",
      `${Math.max(
        0,
        getSavingsRate("month")
      )}%`
    );

    setWidth(
      "healthSavingsBar",
      Math.max(
        0,
        Math.min(
          100,
          getSavingsRate("month") *
            2
        )
      )
    );

    const recurring =
      getRecurringTransactions();

    setText(
      "healthRecurringFactor",
      `${recurring.length} active`
    );

    setWidth(
      "healthRecurringBar",
      Math.max(
        10,
        100 -
          recurring.length * 8
      )
    );

    setText(
      "healthInsight",
      getSmartInsight()
    );
  }

  function getHealthExplanation(
    health,
    income,
    expenses
  ) {
    if (health.score >= 80) {
      return "Your income, spending and savings behavior are currently working together well.";
    }

    if (expenses > income) {
      return "Your biggest improvement opportunity is bringing spending back below income.";
    }

    if (getMonthlyBudget() <= 0) {
      return "A monthly budget would give MoneyLeak more information to help protect your spending.";
    }

    return "You are making progress. Keep tracking consistently and improve one financial habit at a time.";
  }

  function getNextBestAction() {
    const budget =
      getMonthlyBudget();

    const goals =
      getSavingsGoals();

    const income =
      getIncomeTotal(
        getPeriodTransactions("month")
      );

    const expenses =
      getExpenseTotal(
        getPeriodTransactions("month")
      );

    if (income <= 0) {
      return "Add your income so MoneyLeak can calculate your real cash flow.";
    }

    if (budget <= 0) {
      return "Set a monthly budget to control spending and unlock Safe-to-Spend.";
    }

    if (expenses > budget) {
      return "Review your biggest spending category and reduce unnecessary expenses.";
    }

    if (!goals.length) {
      return "Create a savings goal and give your surplus a purpose.";
    }

    if (getSavingsRate("month") < 10) {
      return "Try reducing your largest spending category by 10% this month.";
    }

    return "Keep your spending below income and continue funding your savings goals.";
  }

  /* =========================================================
     GREETING
     ========================================================= */

  function getGreeting() {
    const hour =
      new Date().getHours();

    let greeting = "Good evening";

    if (hour < 12) {
      greeting = "Good morning";
    } else if (hour < 18) {
      greeting = "Good afternoon";
    }

    const name =
      getSettings().name || "there";

    return `${greeting}, ${name} 👋`;
  }

  /* =========================================================
     SEARCH
     ========================================================= */

  function getSearchItems() {
    return [
      {
        name: "Dashboard",
        keywords: "home dashboard money overview",
        page: "index.html"
      },
      {
        name: "Income",
        keywords: "salary earnings money coming in",
        page: "income.html"
      },
      {
        name: "Expenses",
        keywords: "spending costs leaks",
        page: "expenses.html"
      },
      {
        name: "Savings Goals",
        keywords: "goals save savings wealth",
        page: "savings.html"
      },
      {
        name: "Budgets",
        keywords: "budget limits spending control",
        page: "budgets.html"
      },
      {
        name: "Recurring",
        keywords: "subscriptions bills recurring payments",
        page: "recurring.html"
      },
      {
        name: "Analytics",
        keywords: "charts reports insights statistics",
        page: "analytics.html"
      },
      {
        name: "Settings",
        keywords: "preferences profile currency theme",
        page: "settings.html"
      }
    ];
  }

  function setupSearch() {
    const overlay =
      $("searchOverlay");

    const input =
      $("globalSearch");

    const close =
      $("closeSearch");

    const results =
      $("searchResults");

    const openButtons =
      qsa(
        '[data-open-search], #searchButton, #globalSearchButton'
      );

    function openSearch() {
      if (!overlay) return;

      overlay.hidden = false;
      overlay.classList.add("open");
      overlay.style.display = "flex";

      setTimeout(() => {
        input?.focus();
      }, 50);
    }

    function closeSearch() {
      if (!overlay) return;

      overlay.classList.remove("open");
      overlay.classList.remove("active");
      overlay.hidden = true;
      overlay.style.display = "none";

      if (input) {
        input.value = "";
      }

      if (results) {
        results.innerHTML = "";
      }
    }

    openButtons.forEach(button => {
      button.addEventListener(
        "click",
        openSearch
      );
    });

    close?.addEventListener(
      "click",
      closeSearch
    );

    overlay?.addEventListener(
      "click",
      event => {
        if (
          event.target === overlay
        ) {
          closeSearch();
        }
      }
    );

    document.addEventListener(
      "keydown",
      event => {
        if (
          (event.metaKey ||
            event.ctrlKey) &&
          event.key.toLowerCase() ===
            "k"
        ) {
          event.preventDefault();
          openSearch();
        }

        if (
          event.key === "Escape" &&
          overlay &&
          !overlay.hidden
        ) {
          closeSearch();
        }
      }
    );

    input?.addEventListener(
      "input",
      () => {
        const query =
          input.value
            .trim()
            .toLowerCase();

        if (!results) return;

        if (!query) {
          results.innerHTML = "";
          return;
        }

        const matches =
          getSearchItems().filter(
            item =>
              item.name
                .toLowerCase()
                .includes(query) ||
              item.keywords
                .toLowerCase()
                .includes(query)
          );

        results.innerHTML =
          matches.length
            ? matches
                .map(
                  item => `
                    <button
                      class="search-result"
                      data-search-page="${item.page}"
                    >
                      <strong>
                        ${escapeHTML(
                          item.name
                        )}
                      </strong>
                      <span>
                        Open ${escapeHTML(
                          item.name
                        )}
                      </span>
                    </button>
                  `
                )
                .join("")
            : `
              <div class="empty-state">
                No MoneyLeak pages matched "${escapeHTML(
                  query
                )}".
              </div>
            `;
      }
    );

    results?.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-search-page]"
          );

        if (!button) return;

        window.location.href =
          button.dataset.searchPage;
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

    if (!button || !panel) return;

    function render() {
      if (!list) return;

      const alerts =
        getAlerts();

      if (!alerts.length) {
        list.innerHTML = `
          <div class="empty-state">
            You're all caught up.
          </div>
        `;
        return;
      }

      list.innerHTML =
        alerts
          .map(
            alert => `
              <div class="notification-item ${escapeHTML(
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

    function open() {
      render();

      panel.hidden = false;
      panel.classList.add("open");
    }

    function hide() {
      panel.classList.remove("open");
      panel.hidden = true;
    }

    button.addEventListener(
      "click",
      () => {
        if (panel.hidden) {
          open();
        } else {
          hide();
        }
      }
    );

    close?.addEventListener(
      "click",
      hide
    );

    document.addEventListener(
      "click",
      event => {
        if (
          !panel.hidden &&
          !panel.contains(event.target) &&
          !button.contains(event.target)
        ) {
          hide();
        }
      }
    );
  }

  /* =========================================================
     MOBILE NAVIGATION
     ========================================================= */

  function setupMobileNavigation() {
    const overlay =
      $("mobileOverlay");

    const buttons =
      qsa(
        "[data-mobile-menu], #mobileMenuButton, #menuButton"
      );

    const closeButtons =
      qsa(
        "[data-close-mobile], #closeMobileMenu"
      );

    function open() {
      if (!overlay) return;

      overlay.hidden = false;
      overlay.classList.add("open");
    }

    function close() {
      if (!overlay) return;

      overlay.classList.remove("open");
      overlay.hidden = true;
    }

    buttons.forEach(button => {
      button.addEventListener(
        "click",
        open
      );
    });

    closeButtons.forEach(button => {
      button.addEventListener(
        "click",
        close
      );
    });

    overlay?.addEventListener(
      "click",
      event => {
        if (
          event.target === overlay
        ) {
          close();
        }
      }
    );
  }

  /* =========================================================
     VOICE ASSISTANT UI
     ========================================================= */

  function injectVoiceAssistant() {
    if (
      !$("moneyLeakAssistant")
    ) {
      const assistant =
        document.createElement("section");

      assistant.id =
        "moneyLeakAssistant";

      assistant.innerHTML = `
        <div class="ml-voice-panel">

          <div class="ml-voice-header">
            <div>
              <strong>MoneyLeak Assistant</strong>
              <span>AI financial voice control</span>
            </div>

            <button
              type="button"
              class="ml-voice-close"
              id="mlVoiceClose"
              aria-label="Close assistant"
            >
              ×
            </button>
          </div>

          <div
            class="ml-voice-status"
            id="mlVoiceStatus"
          >
            Ready
          </div>

          <div
            class="ml-voice-transcript"
            id="mlVoiceTranscript"
          >
            Tap Start Listening and speak naturally.
          </div>

          <button
            type="button"
            class="ml-voice-listen"
            id="mlVoiceButton"
          >
            🎙 Start Listening
          </button>

          <div
            class="ml-voice-confirm"
            id="mlVoiceConfirm"
            hidden
          >
            <button
              type="button"
              id="mlVoiceConfirmYes"
            >
              ✓ Confirm
            </button>

            <button
              type="button"
              id="mlVoiceConfirmNo"
            >
              Cancel
            </button>
          </div>

          <div class="ml-voice-examples">
            <span>Try saying:</span>
            <button type="button" data-voice-example="Add 5,000 naira for food">
              “Add ₦5,000 for food”
            </button>
            <button type="button" data-voice-example="How much did I spend this month">
              “How much did I spend?”
            </button>
            <button type="button" data-voice-example="Show my analytics">
              “Show my analytics”
            </button>
          </div>

        </div>
      `;

      document.body.appendChild(
        assistant
      );
    }

    setupVoiceAssistant();
  }

  function setupVoiceAssistant() {
    const button =
      $("mlVoiceButton");

    const close =
      $("mlVoiceClose");

    const confirmPanel =
      $("mlVoiceConfirm");

    const yesButton =
      $("mlVoiceConfirmYes");

    const noButton =
      $("mlVoiceConfirmNo");

    if (!button) return;

    close?.addEventListener(
      "click",
      () => {
        const assistant =
          $("moneyLeakAssistant");

        if (assistant) {
          assistant.classList.toggle(
            "collapsed"
          );
        }
      }
    );

    button.addEventListener(
      "click",
      async () => {
        if (
          voiceState.recording
        ) {
          stopVoiceRecording();
          return;
        }

        if (
          voiceState.processing
        ) {
          return;
        }

        await startVoiceRecording();
      }
    );

    yesButton?.addEventListener(
      "click",
      () => {
        confirmPendingVoiceAction();
      }
    );

    noButton?.addEventListener(
      "click",
      () => {
        cancelPendingVoiceAction();
      }
    );

    qsa(
      "[data-voice-example]"
    ).forEach(example => {
      example.addEventListener(
        "click",
        () => {
          const text =
            example.dataset
              .voiceExample;

          handleVoiceText(text);
        }
      );
    });

    updateVoiceUI();
  }

  function updateVoiceUI(
    status,
    transcript
  ) {
    const button =
      $("mlVoiceButton");

    const statusElement =
      $("mlVoiceStatus");

    const transcriptElement =
      $("mlVoiceTranscript");

    if (statusElement) {
      statusElement.textContent =
        status ||
        getVoiceStatusText();
    }

    if (
      transcript !== undefined &&
      transcriptElement
    ) {
      transcriptElement.textContent =
        transcript ||
        "";
    }

    if (!button) return;

    if (voiceState.recording) {
      button.textContent =
        "⏹ Stop Listening";
      button.classList.add(
        "recording"
      );
    } else if (
      voiceState.processing
    ) {
      button.textContent =
        "⏳ Processing...";
      button.disabled = true;
      button.classList.remove(
        "recording"
      );
    } else {
      button.textContent =
        "🎙 Start Listening";
      button.disabled = false;
      button.classList.remove(
        "recording"
      );
    }
  }

  function getVoiceStatusText() {
    if (voiceState.recording) {
      return "Listening…";
    }

    if (voiceState.processing) {
      return "Thinking…";
    }

    if (voiceState.pendingAction) {
      return "Waiting for confirmation";
    }

    return "Ready";
  }

  /* =========================================================
     MEDIA RECORDER
     ========================================================= */

  function getSupportedMimeType() {
    if (
      typeof MediaRecorder ===
      "undefined"
    ) {
      return "";
    }

    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg"
    ];

    for (const type of types) {
      try {
        if (
          MediaRecorder.isTypeSupported(
            type
          )
        ) {
          return type;
        }
      } catch {}
    }

    return "";
  }

  async function startVoiceRecording() {
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices
        .getUserMedia
    ) {
      setVoiceError(
        "Your browser does not support microphone recording. Please use a recent Chrome, Safari or Edge browser."
      );
      return;
    }

    if (
      typeof MediaRecorder ===
      "undefined"
    ) {
      setVoiceError(
        "This browser does not support MediaRecorder."
      );
      return;
    }

    if (
      getSettings().voiceAssistant ===
      false
    ) {
      setVoiceError(
        "Voice Assistant is disabled in Settings."
      );
      return;
    }

    try {
      updateVoiceUI(
        "Requesting microphone…"
      );

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          }
        );

      voiceState.stream =
        stream;

      voiceState.chunks = [];

      voiceState.mimeType =
        getSupportedMimeType();

      const options =
        voiceState.mimeType
          ? {
              mimeType:
                voiceState.mimeType
            }
          : undefined;

      const recorder =
        new MediaRecorder(
          stream,
          options
        );

      voiceState.mediaRecorder =
        recorder;

      voiceState.recording =
        true;

      voiceState.processing =
        false;

      recorder.addEventListener(
        "dataavailable",
        event => {
          if (
            event.data &&
            event.data.size > 0
          ) {
            voiceState.chunks.push(
              event.data
            );
          }
        }
      );

      recorder.addEventListener(
        "stop",
        async () => {
          await finishVoiceRecording();
        }
      );

      recorder.addEventListener(
        "error",
        event => {
          console.error(
            "MediaRecorder error:",
            event
          );

          cleanupVoiceStream();

          setVoiceError(
            "The microphone recording failed. Please try again."
          );
        }
      );

      recorder.start();

      updateVoiceUI(
        "Listening…",
        "I'm listening. Speak naturally, then tap Stop Listening."
      );
    } catch (error) {
      console.error(
        "Microphone error:",
        error
      );

      cleanupVoiceStream();

      if (
        error?.name ===
        "NotAllowedError"
      ) {
        setVoiceError(
          "Microphone access was blocked. Allow microphone access for this site in your browser settings."
        );
      } else if (
        error?.name ===
        "NotFoundError"
      ) {
        setVoiceError(
          "No microphone was found on this device."
        );
      } else {
        setVoiceError(
          "I couldn't start the microphone. Please try again."
        );
      }
    }
  }

  function stopVoiceRecording() {
    if (
      !voiceState.mediaRecorder
    ) {
      return;
    }

    if (
      voiceState.mediaRecorder
        .state === "recording"
    ) {
      updateVoiceUI(
        "Finishing recording…"
      );

      voiceState.mediaRecorder.stop();
    }
  }

  async function finishVoiceRecording() {
    voiceState.recording =
      false;

    voiceState.processing =
      true;

    updateVoiceUI(
      "Preparing audio…"
    );

    cleanupVoiceStream();

    const mimeType =
      voiceState.mimeType ||
      "audio/webm";

    const blob =
      new Blob(
        voiceState.chunks,
        {
          type: mimeType
        }
      );

    voiceState.chunks = [];

    if (blob.size < 1000) {
      voiceState.processing =
        false;

      setVoiceError(
        "The recording was too short. Please speak for a moment and try again."
      );

      return;
    }

    try {
      await sendAudioToAI(blob);
    } catch (error) {
      console.error(
        "Voice processing error:",
        error
      );

      voiceState.processing =
        false;

      setVoiceError(
        error?.message ||
          "Something went wrong while processing your voice."
      );
    } finally {
      voiceState.mediaRecorder =
        null;

      voiceState.processing =
        false;

      updateVoiceUI(
        voiceState.pendingAction
          ? "Waiting for confirmation"
          : "Ready"
      );
    }
  }

  function cleanupVoiceStream() {
    if (voiceState.stream) {
      voiceState.stream
        .getTracks()
        .forEach(track => {
          try {
            track.stop();
          } catch {}
        });
    }

    voiceState.stream = null;
  }

  /* =========================================================
     AI VOICE REQUEST
     ========================================================= */

  async function sendAudioToAI(blob) {
    updateVoiceUI(
      "Sending securely to MoneyLeak AI…"
    );

    const form =
      new FormData();

    const extension =
      blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("ogg")
        ? "ogg"
        : "webm";

    const file =
      new File(
        [blob],
        `moneyleak-voice.${extension}`,
        {
          type:
            blob.type ||
            "audio/webm"
        }
      );

    form.append(
      "audio",
      file
    );

    form.append(
      "context",
      JSON.stringify(
        buildVoiceContext()
      )
    );

    const response =
      await fetch(
        VOICE_API,
        {
          method: "POST",
          body: form,
          credentials: "omit"
        }
      );

    let data = null;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        "The MoneyLeak AI server returned an invalid response."
      );
    }

    if (!response.ok || !data?.ok) {
      console.error(
        "MoneyLeak AI error:",
        data
      );

      throw new Error(
        data?.error ||
          "MoneyLeak AI could not process your voice."
      );
    }

    const transcript =
      String(
        data.transcript || ""
      ).trim();

    updateVoiceUI(
      "Command understood",
      transcript ||
        "I couldn't hear a clear command."
    );

    if (!transcript) {
      speak(
        "I couldn't hear anything clearly. Please try again."
      );

      return;
    }

    if (
      voiceState.mode ===
      "confirmation"
    ) {
      handleConfirmationText(
        transcript
      );

      return;
    }

    const command =
      data.command || {
        intent: "unknown"
      };

    await handleAICommand(
      command,
      transcript
    );
  }

  function buildVoiceContext() {
    const transactions =
      getTransactions();

    const goals =
      getSavingsGoals();

    return {
      currency:
        getCurrency(),

      currentPage:
        getCurrentPage(),

      transactions:
        transactions
          .slice(0, 100)
          .map(item => ({
            id: item.id,
            type: item.type,
            amount: item.amount,
            category: item.category,
            description:
              item.description,
            date: item.date
          })),

      goals:
        goals
          .slice(0, 30)
          .map(goal => ({
            id: goal.id,
            name: goal.name,
            target: goal.target,
            current: goal.current,
            deadline:
              goal.deadline
          })),

      monthlyBudget:
        getMonthlyBudget(),

      categoryBudgets:
        getCategoryBudgets()
    };
  }

  function getCurrentPage() {
    const path =
      window.location.pathname
        .split("/")
        .pop() ||
      "index.html";

    const names = {
      "index.html": "dashboard",
      "income.html": "income",
      "expenses.html": "expenses",
      "budgets.html": "budgets",
      "savings.html": "savings",
      "recurring.html": "recurring",
      "analytics.html": "analytics",
      "settings.html": "settings"
    };

    return names[path] || "dashboard";
  }

  /* =========================================================
     AI COMMAND HANDLER
     ========================================================= */

  async function handleAICommand(
    command,
    transcript
  ) {
    if (!command) {
      speak(
        "I couldn't understand that request."
      );

      return;
    }

    if (
      command.intent ===
      "navigation"
    ) {
      handleVoiceNavigation(
        command.page
      );

      return;
    }

    if (
      command.intent ===
      "query"
    ) {
      handleVoiceQuery(
        command.query
      );

      return;
    }

    if (
      command.intent ===
      "action"
    ) {
      createPendingVoiceAction(
        command,
        transcript
      );

      return;
    }

    speak(
      command.message ||
        "I couldn't safely understand that request."
    );
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  function handleVoiceNavigation(
    page
  ) {
    const target =
      PAGE_MAP[page];

    if (!target) {
      speak(
        "I don't know that MoneyLeak page yet."
      );

      return;
    }

    speak(
      `Opening ${page}.`
    );

    setTimeout(() => {
      window.location.href =
        target;
    }, 450);
  }

  /* =========================================================
     VOICE QUERIES
     ========================================================= */

  function handleVoiceQuery(
    query
  ) {
    const normalized =
      String(query || "")
        .toLowerCase()
        .trim();

    let response = "";

    switch (normalized) {
      case "spending_this_month":
        response =
          `You've spent ${displayCurrency(
            getExpenseTotal(
              getPeriodTransactions(
                "month"
              )
            )
          )} this month.`;
        break;

      case "income_this_month":
        response =
          `You've recorded ${displayCurrency(
            getIncomeTotal(
              getPeriodTransactions(
                "month"
              )
            )
          )} of income this month.`;
        break;

      case "balance":
        response =
          `Your current recorded balance is ${displayCurrency(
            getBalance()
          )}.`;
        break;

      case "financial_health": {
        const health =
          getFinancialHealth();

        response =
          `Your Money Health score is ${health.score} out of 100. Your status is ${health.status}.`;

        break;
      }

      case "savings_rate":
        response =
          `Your savings rate this month is ${Math.max(
            0,
            getSavingsRate("month")
          )} percent.`;
        break;

      case "safe_to_spend": {
        const safe =
          getSafeToSpend();

        response =
          safe.hasBudget
            ? `Your suggested daily safe to spend amount is about ${displayCurrency(
                safe.amount
              )}.`
            : `You have about ${displayCurrency(
                safe.amount
              )} available, but you should set a monthly budget for a more accurate safe to spend number.`;

        break;
      }

      case "biggest_expense": {
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
              (a, b) =>
                b.amount - a.amount
            );

        if (!expenses.length) {
          response =
            "You don't have any expenses recorded this month.";
        } else {
          const biggest =
            expenses[0];

          response =
            `Your biggest expense this month is ${displayCurrency(
              biggest.amount
            )} for ${biggest.description}.`;
        }

        break;
      }

      case "top_spending_category": {
        const categories =
          getTopSpendingCategories();

        if (!categories.length) {
          response =
            "You don't have any spending recorded this month.";
        } else {
          response =
            `Your top spending category is ${categories[0].category} at ${displayCurrency(
              categories[0].amount
            )}.`;
        }

        break;
      }

      case "recent_transactions": {
        const recent =
          getTransactions()
            .slice(0, 3);

        if (!recent.length) {
          response =
            "You don't have any transactions yet.";
        } else {
          response =
            "Your latest transactions are " +
            recent
              .map(
                item =>
                  `${item.description}, ${displayCurrency(
                    item.amount
                  )}`
              )
              .join("; ");
        }

        break;
      }

      case "goal_progress": {
        const goals =
          getSavingsGoals();

        if (!goals.length) {
          response =
            "You don't have any savings goals yet.";
        } else {
          const first =
            goals[0];

          response =
            `${first.name} is ${goalProgress(
              first
            )} percent complete, with ${displayCurrency(
              first.current
            )} saved toward ${displayCurrency(
              first.target
            )}.`;
        }

        break;
      }

      case "monthly_budget": {
        const budget =
          getMonthlyBudget();

        const spent =
          getExpenseTotal(
            getPeriodTransactions(
              "month"
            )
          );

        if (!budget) {
          response =
            "You haven't set a monthly budget yet.";
        } else {
          response =
            `Your monthly budget is ${displayCurrency(
              budget
            )}. You've used ${displayCurrency(
              spent
            )}, leaving ${displayCurrency(
              Math.max(
                0,
                budget - spent
              )
            )}.`;
        }

        break;
      }

      default:
        response =
          getSmartInsight();
    }

    updateVoiceUI(
      "Answer",
      response
    );

    speak(response);
  }

  /* =========================================================
     VOICE ACTION CONFIRMATION
     ========================================================= */

  function createPendingVoiceAction(
    command,
    transcript
  ) {
    const action =
      normalizeVoiceAction(
        command
      );

    if (!action) {
      speak(
        command.message ||
          "I need a little more information before I can do that."
      );

      return;
    }

    voiceState.pendingAction =
      action;

    voiceState.mode =
      "confirmation";

    const message =
      action.confirmationMessage ||
      "I can do that. Would you like me to confirm the action?";

    showVoiceConfirmation();

    updateVoiceUI(
      "Waiting for confirmation",
      message
    );

    speak(
      `${message} Say yes to confirm or no to cancel.`
    );
  }

  function normalizeVoiceAction(
    command
  ) {
    const action =
      command.action;

    if (!action) {
      return null;
    }

    if (
      action ===
      "add_expense"
    ) {
      const amount =
        safeNumber(
          command.amount
        );

      if (amount <= 0) {
        return null;
      }

      const category =
        command.category ||
        "Other";

      const description =
        command.description ||
        category;

      return {
        action,
        amount,
        category,
        description,
        date:
          command.date ||
          todayISO(),

        confirmationMessage:
          `Add ${displayCurrency(
            amount
          )} as an expense for ${category}?`
      };
    }

    if (
      action ===
      "add_income"
    ) {
      const amount =
        safeNumber(
          command.amount
        );

      if (amount <= 0) {
        return null;
      }

      const source =
        command.source ||
        "Other income";

      const description =
        command.description ||
        source;

      return {
        action,
        amount,
        source,
        category: source,
        description,
        date:
          command.date ||
          todayISO(),

        confirmationMessage:
          `Add ${displayCurrency(
            amount
          )} of income from ${source}?`
      };
    }

    if (
      action ===
      "create_goal"
    ) {
      const target =
        safeNumber(
          command.target ||
            command.amount
        );

      if (target <= 0) {
        return null;
      }

      return {
        action,
        name:
          command.name ||
          "Savings Goal",
        target,
        current:
          safeNumber(
            command.current
          ),
        deadline:
          command.deadline ||
          "",
        description:
          command.description ||
          "",

        confirmationMessage:
          `Create the ${command.name || "Savings Goal"} goal with a target of ${displayCurrency(
            target
          )}?`
      };
    }

    if (
      action ===
      "set_monthly_budget"
    ) {
      const amount =
        safeNumber(
          command.amount
        );

      if (amount <= 0) {
        return null;
      }

      return {
        action,
        amount,

        confirmationMessage:
          `Set your monthly budget to ${displayCurrency(
            amount
          )}?`
      };
    }

    if (
      action ===
      "set_category_budget"
    ) {
      const amount =
        safeNumber(
          command.amount
        );

      const category =
        command.category ||
        "Other";

      if (amount <= 0) {
        return null;
      }

      return {
        action,
        amount,
        category,

        confirmationMessage:
          `Set your ${category} budget to ${displayCurrency(
            amount
          )}?`
      };
    }

    if (
      action ===
      "delete_transaction"
    ) {
      return {
        action,
        transactionId:
          command.transactionId ||
          null,
        amount:
          safeNumber(
            command.amount
          ),
        description:
          command.description ||
          "",

        confirmationMessage:
          "I found a transaction you may want to delete. Should I remove it?"
      };
    }

    return null;
  }

  function showVoiceConfirmation() {
    const panel =
      $("mlVoiceConfirm");

    if (panel) {
      panel.hidden = false;
    }
  }

  function hideVoiceConfirmation() {
    const panel =
      $("mlVoiceConfirm");

    if (panel) {
      panel.hidden = true;
    }
  }

  function confirmPendingVoiceAction() {
    if (
      !voiceState.pendingAction
    ) {
      return;
    }

    const action =
      voiceState.pendingAction;

    executeVoiceAction(action);

    voiceState.pendingAction =
      null;

    voiceState.mode =
      "command";

    hideVoiceConfirmation();

    updateVoiceUI(
      "Action completed"
    );
  }

  function cancelPendingVoiceAction() {
    voiceState.pendingAction =
      null;

    voiceState.mode =
      "command";

    hideVoiceConfirmation();

    updateVoiceUI(
      "Cancelled",
      "Nothing was changed."
    );

    speak(
      "Cancelled. Nothing was changed."
    );
  }

  function handleConfirmationText(
    transcript
  ) {
    const text =
      String(transcript || "")
        .toLowerCase()
        .trim();

    const yes =
      /\b(yes|yeah|yep|confirm|confirmed|do it|go ahead|sure|okay|ok)\b/
        .test(text);

    const no =
      /\b(no|nope|cancel|stop|don't|do not)\b/
        .test(text);

    if (yes && !no) {
      confirmPendingVoiceAction();
      return;
    }

    if (no) {
      cancelPendingVoiceAction();
      return;
    }

    updateVoiceUI(
      "Confirmation needed",
      "Please say yes to confirm or no to cancel."
    );

    speak(
      "Please say yes to confirm or no to cancel."
    );
  }

  function executeVoiceAction(
    action
  ) {
    if (
      action.action ===
      "add_expense"
    ) {
      addTransaction({
        type: "expense",
        amount:
          action.amount,
        category:
          action.category,
        description:
          action.description,
        date:
          action.date
      });

      speak(
        `Done. I added ${displayCurrency(
          action.amount
        )} to your expenses.`
      );

      return;
    }

    if (
      action.action ===
      "add_income"
    ) {
      addTransaction({
        type: "income",
        amount:
          action.amount,
        category:
          action.category,
        source:
          action.source,
        description:
          action.description,
        date:
          action.date
      });

      speak(
        `Done. I added ${displayCurrency(
          action.amount
        )} of income.`
      );

      return;
    }

    if (
      action.action ===
      "create_goal"
    ) {
      const goal =
        addSavingsGoal({
          name:
            action.name,
          target:
            action.target,
          current:
            action.current,
          deadline:
            action.deadline,
          description:
            action.description
        });

      speak(
        `Done. I created your ${goal.name} savings goal.`
      );

      return;
    }

    if (
      action.action ===
      "set_monthly_budget"
    ) {
      setMonthlyBudget(
        action.amount
      );

      speak(
        `Done. Your monthly budget is now ${displayCurrency(
          action.amount
        )}.`
      );

      return;
    }

    if (
      action.action ===
      "set_category_budget"
    ) {
      setCategoryBudget(
        action.category,
        action.amount
      );

      speak(
        `Done. Your ${action.category} budget is now ${displayCurrency(
          action.amount
        )}.`
      );

      return;
    }

    if (
      action.action ===
      "delete_transaction"
    ) {
      let transaction =
        null;

      if (
        action.transactionId
      ) {
        transaction =
          getTransactions().find(
            item =>
              item.id ===
              action.transactionId
          );
      }

      if (
        !transaction &&
        action.amount > 0
      ) {
        transaction =
          getTransactions().find(
            item =>
              item.type ===
                "expense" &&
              Math.abs(
                item.amount -
                  action.amount
              ) < 0.01 &&
              (
                !action.description ||
                item.description
                  .toLowerCase()
                  .includes(
                    action.description
                      .toLowerCase()
                  )
              )
          );
      }

      if (!transaction) {
        speak(
          "I couldn't safely identify the transaction to delete."
        );

        return;
      }

      deleteTransaction(
        transaction.id
      );

      speak(
        `Done. I deleted the ${displayCurrency(
          transaction.amount
        )} transaction.`
      );
    }
  }

  /* =========================================================
     VOICE ERRORS
     ========================================================= */

  function setVoiceError(
    message
  ) {
    voiceState.recording =
      false;

    voiceState.processing =
      false;

    hideVoiceConfirmation();

    updateVoiceUI(
      "Voice error",
      message
    );

    speak(message);

    setTimeout(() => {
      if (
        !voiceState.pendingAction
      ) {
        updateVoiceUI(
          "Ready"
        );
      }
    }, 4000);
  }

  /* =========================================================
     SPEECH OUTPUT
     ========================================================= */

  function speak(text) {
    if (
      !text ||
      !("speechSynthesis" in
        window)
    ) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(
          String(text)
        );

      const current =
        getSettings();

      utterance.rate =
        safeNumber(
          current.voiceRate
        ) || 1;

      utterance.pitch =
        safeNumber(
          current.voicePitch
        ) || 1;

      utterance.volume = 1;

      window.speechSynthesis.speak(
        utterance
      );
    } catch (error) {
      console.warn(
        "Speech synthesis error:",
        error
      );
    }
  }

  /* =========================================================
     DATA CHANGE EVENT
     ========================================================= */

  function notifyDataChanged() {
    document.dispatchEvent(
      new CustomEvent(
        "moneyLeakUpdated"
      )
    );

    setTimeout(() => {
      renderDashboard();
    }, 0);
  }

  /* =========================================================
     KEYBOARD SHORTCUT
     ========================================================= */

  function setupShortcuts() {
    document.addEventListener(
      "keydown",
      event => {
        if (
          (event.metaKey ||
            event.ctrlKey) &&
          event.shiftKey &&
          event.key.toLowerCase() ===
            "m"
        ) {
          event.preventDefault();

          const assistant =
            $("moneyLeakAssistant");

          if (assistant) {
            assistant.classList.toggle(
              "collapsed"
            );
          }
        }
      }
    );
  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  function initialize() {
    settings =
      getSettings();

    applySettings();

    if (
      !localStorage.getItem(
        STORAGE.initialized
      )
    ) {
      localStorage.setItem(
        STORAGE.initialized,
        "true"
      );
    }

    setupSearch();

    setupNotifications();

    setupMobileNavigation();

    setupShortcuts();

    injectVoiceAssistant();

    renderDashboard();

    document.dispatchEvent(
      new CustomEvent(
        "moneyLeakReady"
      )
    );

    console.log(
      `MoneyLeak ${APP_VERSION} initialized.`
    );
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.MoneyLeak = {
    version: APP_VERSION,

    storage: STORAGE,

    getSettings,
    saveSettings,
    applySettings,

    getCurrency,
    displayCurrency,

    getTransactions,
    saveTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,

    getPeriodTransactions,

    getSavingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    goalProgress,

    getMonthlyBudget,
    setMonthlyBudget,

    getCategoryBudgets,
    setCategoryBudget,

    getRecurringTransactions,
    saveRecurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,

    getFinancialHealth,
    getSavingsRate,
    getSafeToSpend,

    getTopSpendingCategories,
    getSmartInsight,
    getAlerts,

    renderDashboard,

    speak,

    voice: {
      start: startVoiceRecording,
      stop: stopVoiceRecording,
      handleText: handleVoiceText
    }
  };

  /* =========================================================
     TEXT COMMAND HELPER
     ========================================================= */

  function handleVoiceText(text) {
    if (!text) return;

    const normalized =
      String(text)
        .toLowerCase()
        .trim();

    /*
      This is mainly useful for the example
      buttons and future typed assistant input.
    */

    if (
      /\b(cancel|stop|no)\b/.test(
        normalized
      ) &&
      voiceState.pendingAction
    ) {
      cancelPendingVoiceAction();
      return;
    }

    if (
      /\b(yes|confirm|confirmed|do it|go ahead)\b/.test(
        normalized
      ) &&
      voiceState.pendingAction
    ) {
      confirmPendingVoiceAction();
      return;
    }

    if (
      normalized.includes(
        "analytics"
      )
    ) {
      handleVoiceNavigation(
        "analytics"
      );
      return;
    }

    if (
      normalized.includes(
        "dashboard"
      ) ||
      normalized === "home"
    ) {
      handleVoiceNavigation(
        "dashboard"
      );
      return;
    }

    if (
      normalized.includes(
        "income"
      )
    ) {
      handleVoiceNavigation(
        "income"
      );
      return;
    }

    if (
      normalized.includes(
        "expense"
      ) ||
      normalized.includes(
        "spending"
      )
    ) {
      handleVoiceNavigation(
        "expenses"
      );
      return;
    }

    if (
      normalized.includes(
        "budget"
      )
    ) {
      handleVoiceNavigation(
        "budgets"
      );
      return;
    }

    if (
      normalized.includes(
        "saving"
      ) ||
      normalized.includes(
        "goal"
      )
    ) {
      handleVoiceNavigation(
        "savings"
      );
      return;
    }

    if (
      normalized.includes(
        "recurring"
      )
    ) {
      handleVoiceNavigation(
        "recurring"
      );
      return;
    }

    if (
      normalized.includes(
        "settings"
      )
    ) {
      handleVoiceNavigation(
        "settings"
      );
      return;
    }

    if (
      normalized.includes(
        "how much did i spend"
      ) ||
      normalized.includes(
        "spending this month"
      )
    ) {
      handleVoiceQuery(
        "spending_this_month"
      );
      return;
    }

    if (
      normalized.includes(
        "how much did i make"
      ) ||
      normalized.includes(
        "income this month"
      )
    ) {
      handleVoiceQuery(
        "income_this_month"
      );
      return;
    }

    if (
      normalized === "balance" ||
      normalized.includes(
        "my balance"
      )
    ) {
      handleVoiceQuery(
        "balance"
      );
      return;
    }

    if (
      normalized.includes(
        "financial health"
      ) ||
      normalized.includes(
        "money health"
      )
    ) {
      handleVoiceQuery(
        "financial_health"
      );
      return;
    }

    if (
      normalized.includes(
        "savings rate"
      )
    ) {
      handleVoiceQuery(
        "savings_rate"
      );
      return;
    }

    if (
      normalized.includes(
        "safe to spend"
      )
    ) {
      handleVoiceQuery(
        "safe_to_spend"
      );
      return;
    }

    speak(
      "Please use the microphone so MoneyLeak AI can understand your request."
    );
  }

  /* =========================================================
     DOM READY
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
