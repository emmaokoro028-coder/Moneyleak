/* ============================================================
   MONEYLEAK — PERSONAL FINANCE OS
   CORE ENGINE v8.0
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     STORAGE
     ============================================================ */

  const STORAGE = {
    transactions: "moneyLeakTransactions",
    savingsGoals: "moneyLeakSavingsGoals",
    legacySavingsGoal: "moneyLeakSavingsGoal",
    monthlyBudget: "moneyLeakMonthlyBudget",
    categoryBudgets: "moneyLeakCategoryBudgets",
    recurring: "moneyLeakRecurringTransactions",
    settings: "moneyLeakSettings",
    alerts: "moneyLeakAlerts",
    notifications: "moneyLeakNotificationHistory",
    initialized: "moneyLeakInitialized"
  };

  /* ============================================================
     DEFAULTS
     ============================================================ */

  const DEFAULT_SETTINGS = {
    currency: "NGN",
    name: "My Money",
    theme: "light",
    notifications: true,
    compactNumbers: false
  };

  const CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
    "Education",
    "Housing",
    "Travel",
    "Subscriptions",
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
    "Other"
  ];

  /* ============================================================
     HELPERS
     ============================================================ */

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      if (!value) return fallback;
      return JSON.parse(value);
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
      console.error("MoneyLeak storage write error:", key, error);
      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(error);
    }
  }

  function uid(prefix = "id") {
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 9)
    );
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function monthKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function startOfMonth(date = new Date()) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function endOfMonth(date = new Date()) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  function daysInCurrentMonth() {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(date) {
    if (!date) return "No date";

    const d = new Date(date + "T00:00:00");

    if (Number.isNaN(d.getTime())) return "No date";

    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function relativeTime(date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";

    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return formatDate(d.toISOString().slice(0, 10));
  }

  /* ============================================================
     SETTINGS
     ============================================================ */

  function getSettings() {
    const saved = readJSON(STORAGE.settings, {});
    return {
      ...DEFAULT_SETTINGS,
      ...(saved || {})
    };
  }

  function saveSettings(settings) {
    const current = getSettings();

    const next = {
      ...current,
      ...(settings || {})
    };

    writeJSON(STORAGE.settings, next);
    applySettings();

    window.dispatchEvent(
      new CustomEvent("moneyLeakUpdated", {
        detail: {
          type: "settings",
          settings: next
        }
      })
    );

    return next;
  }

  function applySettings() {
    const settings = getSettings();

    let theme = settings.theme;

    if (theme === "system") {
      theme = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    if (theme !== "dark") {
      theme = "light";
    }

    document.documentElement.setAttribute("data-theme", theme);
    document.body?.setAttribute("data-theme", theme);

    updateBrandLogo();
  }

  /* ============================================================
     CURRENCY
     ============================================================ */

  const CURRENCY_CONFIG = {
    NGN: {
      locale: "en-NG",
      currency: "NGN"
    },
    USD: {
      locale: "en-US",
      currency: "USD"
    },
    GBP: {
      locale: "en-GB",
      currency: "GBP"
    },
    EUR: {
      locale: "de-DE",
      currency: "EUR"
    },
    CAD: {
      locale: "en-CA",
      currency: "CAD"
    },
    AUD: {
      locale: "en-AU",
      currency: "AUD"
    },
    GHS: {
      locale: "en-GH",
      currency: "GHS"
    },
    KES: {
      locale: "en-KE",
      currency: "KES"
    },
    ZAR: {
      locale: "en-ZA",
      currency: "ZAR"
    }
  };

  function displayCurrency(amount, options = {}) {
    const settings = getSettings();

    const currency = settings.currency || "NGN";
    const config =
      CURRENCY_CONFIG[currency] ||
      CURRENCY_CONFIG.NGN;

    const value = Number(amount) || 0;

    try {
      return new Intl.NumberFormat(
        config.locale,
        {
          style: "currency",
          currency: config.currency,
          maximumFractionDigits:
            options.maximumFractionDigits ?? 0,
          minimumFractionDigits:
            options.minimumFractionDigits ?? 0
        }
      ).format(value);
    } catch {
      return `${currency} ${value.toLocaleString()}`;
    }
  }

  function compactCurrency(amount) {
    const value = Number(amount) || 0;

    const currency = getSettings().currency || "NGN";

    if (Math.abs(value) < 1000) {
      return displayCurrency(value);
    }

    let short;

    if (Math.abs(value) >= 1000000) {
      short = `${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      short = `${(value / 1000).toFixed(1)}K`;
    }

    return `${currency} ${short}`;
  }

  function smartCurrency(amount) {
    return getSettings().compactNumbers
      ? compactCurrency(amount)
      : displayCurrency(amount);
  }

  /* ============================================================
     TRANSACTIONS
     ============================================================ */

  function normalizeTransaction(transaction) {
    const t = transaction || {};

    const type =
      t.type === "income" ? "income" : "expense";

    return {
      id: t.id || uid("txn"),
      type,
      amount: Math.abs(Number(t.amount) || 0),
      category:
        t.category ||
        (type === "income" ? "Other" : "Other"),
      source:
        t.source ||
        (type === "income" ? t.category || "Other" : ""),
      description:
        t.description ||
        t.name ||
        "",
      date:
        t.date ||
        todayISO(),
      createdAt:
        t.createdAt ||
        new Date().toISOString()
    };
  }

  function getTransactions() {
    const raw = readJSON(STORAGE.transactions, []);

    if (!Array.isArray(raw)) return [];

    return raw.map(normalizeTransaction);
  }

  function saveTransactions(transactions) {
    writeJSON(
      STORAGE.transactions,
      transactions.map(normalizeTransaction)
    );

    window.dispatchEvent(
      new CustomEvent("moneyLeakUpdated", {
        detail: {
          type: "transactions"
        }
      })
    );
  }

  function addTransaction(transaction) {
    const transactions = getTransactions();

    const newTransaction =
      normalizeTransaction(transaction);

    transactions.push(newTransaction);

    saveTransactions(transactions);

    return newTransaction;
  }

  function updateTransaction(id, updates) {
    const transactions = getTransactions();

    const index = transactions.findIndex(
      t => t.id === id
    );

    if (index === -1) return null;

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
    const transactions = getTransactions();

    const next = transactions.filter(
      t => t.id !== id
    );

    saveTransactions(next);

    return true;
  }

  function clearTransactions() {
    saveTransactions([]);
  }

  /* ============================================================
     PERIODS
     ============================================================ */

  function getPeriodRange(period = "month") {
    const now = new Date();

    let start;
    let end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );

    if (period === "month") {
      start = startOfMonth(now);
    }

    if (period === "quarter") {
      const quarter =
        Math.floor(now.getMonth() / 3);

      start = new Date(
        now.getFullYear(),
        quarter * 3,
        1
      );
    }

    if (period === "year") {
      start = new Date(
        now.getFullYear(),
        0,
        1
      );
    }

    if (period === "week") {
      start = new Date(now);
      start.setDate(
        now.getDate() - now.getDay()
      );
      start.setHours(0, 0, 0, 0);
    }

    if (!start) {
      start = startOfMonth(now);
    }

    return {
      start,
      end
    };
  }

  function getPeriodTransactions(period = "month") {
    const { start, end } =
      getPeriodRange(period);

    return getTransactions().filter(t => {
      const date =
        new Date(t.date + "T00:00:00");

      return date >= start && date <= end;
    });
  }

  function getMonthlyTotals(date = new Date()) {
    const key = monthKey(date);

    const transactions =
      getTransactions().filter(
        t => t.date.slice(0, 7) === key
      );

    const income = transactions
      .filter(t => t.type === "income")
      .reduce(
        (sum, t) => sum + t.amount,
        0
      );

    const expenses = transactions
      .filter(t => t.type === "expense")
      .reduce(
        (sum, t) => sum + t.amount,
        0
      );

    return {
      income,
      expenses,
      cashFlow: income - expenses,
      savingsRate:
        income > 0
          ? ((income - expenses) / income) * 100
          : 0
    };
  }

  function getPreviousMonthTotals() {
    const now = new Date();

    const previous =
      new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

    return getMonthlyTotals(previous);
  }

  /* ============================================================
     CATEGORIES
     ============================================================ */

  function getCategoryTotals(
    transactions = getTransactions()
  ) {
    const totals = {};

    transactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        const category =
          t.category || "Other";

        totals[category] =
          (totals[category] || 0) +
          t.amount;
      });

    return totals;
  }

  function getTopSpendingCategories(
    transactions = getPeriodTransactions("month"),
    limit = 5
  ) {
    const totals =
      getCategoryTotals(transactions);

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([category, amount]) => ({
        category,
        amount
      }));
  }

  function getLargestExpense(
    transactions = getTransactions()
  ) {
    return (
      transactions
        .filter(t => t.type === "expense")
        .sort((a, b) => b.amount - a.amount)[0] ||
      null
    );
  }

  /* ============================================================
     SAVINGS GOALS
     ============================================================ */

  function getSavingsGoals() {
    let goals =
      readJSON(STORAGE.savingsGoals, null);

    if (!Array.isArray(goals)) {
      const legacy =
        readJSON(STORAGE.legacySavingsGoal, null);

      if (legacy) {
        goals = [legacy];
      } else {
        goals = [];
      }
    }

    return goals.map(goal => ({
      id: goal.id || uid("goal"),
      name: goal.name || "Savings Goal",
      target: Number(
        goal.target ??
        goal.targetAmount ??
        0
      ),
      current: Number(
        goal.current ??
        goal.saved ??
        0
      ),
      deadline:
        goal.deadline || "",
      color:
        goal.color || "#0b7a5b",
      description:
        goal.description || "",
      createdAt:
        goal.createdAt ||
        new Date().toISOString()
    }));
  }

  function saveSavingsGoals(goals) {
    writeJSON(
      STORAGE.savingsGoals,
      goals
    );

    window.dispatchEvent(
      new CustomEvent("moneyLeakUpdated", {
        detail: {
          type: "savings"
        }
      })
    );
  }

  function addSavingsGoal(goal) {
    const goals =
      getSavingsGoals();

    const newGoal = {
      id: uid("goal"),
      name:
        goal.name ||
        "Savings Goal",
      target:
        Number(goal.target) || 0,
      current:
        Number(goal.current) || 0,
      deadline:
        goal.deadline || "",
      color:
        goal.color || "#0b7a5b",
      description:
        goal.description || "",
      createdAt:
        new Date().toISOString()
    };

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
        g => g.id === id
      );

    if (index === -1) return null;

    goals[index] = {
      ...goals[index],
      ...updates
    };

    goals[index].target =
      Number(goals[index].target) || 0;

    goals[index].current =
      Number(goals[index].current) || 0;

    saveSavingsGoals(goals);

    return goals[index];
  }

  function deleteSavingsGoal(id) {
    const goals =
      getSavingsGoals().filter(
        g => g.id !== id
      );

    saveSavingsGoals(goals);

    return true;
  }

  function getGoalProgress(goal) {
    if (!goal || !goal.target) return 0;

    return clamp(
      (Number(goal.current) /
        Number(goal.target)) *
        100,
      0,
      100
    );
  }

  /* ============================================================
     BUDGETS
     ============================================================ */

  function getMonthlyBudget() {
    return (
      Number(
        readJSON(
          STORAGE.monthlyBudget,
          0
        )
      ) || 0
    );
  }

  function setMonthlyBudget(amount) {
    const value =
      Math.max(
        0,
        Number(amount) || 0
      );

    writeJSON(
      STORAGE.monthlyBudget,
      value
    );

    window.dispatchEvent(
      new CustomEvent("moneyLeakUpdated", {
        detail: {
          type: "budget"
        }
      })
    );

    return value;
  }

  function getCategoryBudgets() {
    return readJSON(
      STORAGE.categoryBudgets,
      {}
    );
  }

  function setCategoryBudget(
    category,
    amount
  ) {
    const budgets =
      getCategoryBudgets();

    const value =
      Number(amount) || 0;

    if (value <= 0) {
      delete budgets[category];
    } else {
      budgets[category] = value;
    }

    writeJSON(
      STORAGE.categoryBudgets,
      budgets
    );

    window.dispatchEvent(
      new CustomEvent("moneyLeakUpdated", {
        detail: {
          type: "categoryBudget"
        }
      })
    );

    return budgets;
  }

  function getBudgetStats() {
    const month =
      getMonthlyTotals();

    const monthlyBudget =
      getMonthlyBudget();

    const remaining =
      monthlyBudget > 0
        ? monthlyBudget - month.expenses
        : 0;

    const usage =
      monthlyBudget > 0
        ? (month.expenses /
            monthlyBudget) *
          100
        : 0;

    return {
      budget: monthlyBudget,
      spent: month.expenses,
      remaining,
      usage,
      overBudget:
        monthlyBudget > 0 &&
        month.expenses >
          monthlyBudget
    };
  }

  /* ============================================================
     RECURRING
     ============================================================ */

  function getRecurringTransactions() {
    const recurring =
      readJSON(
        STORAGE.recurring,
        []
      );

    return Array.isArray(recurring)
      ? recurring
      : [];
  }

  function saveRecurringTransactions(
    recurring
  ) {
    writeJSON(
      STORAGE.recurring,
      recurring
    );

    window.dispatchEvent(
      new CustomEvent("moneyLeakUpdated", {
        detail: {
          type: "recurring"
        }
      })
    );
  }

  function addRecurringTransaction(
    item
  ) {
    const recurring =
      getRecurringTransactions();

    const newItem = {
      id: uid("rec"),
      name:
        item.name ||
        "Recurring payment",
      amount:
        Math.abs(
          Number(item.amount) || 0
        ),
      type:
        item.type === "income"
          ? "income"
          : "expense",
      category:
        item.category || "Other",
      frequency:
        item.frequency || "monthly",
      nextDate:
        item.nextDate ||
        todayISO(),
      description:
        item.description || "",
      createdAt:
        new Date().toISOString()
    };

    recurring.push(newItem);

    saveRecurringTransactions(
      recurring
    );

    return newItem;
  }

  function updateRecurringTransaction(
    id,
    updates
  ) {
    const recurring =
      getRecurringTransactions();

    const index =
      recurring.findIndex(
        r => r.id === id
      );

    if (index === -1) return null;

    recurring[index] = {
      ...recurring[index],
      ...updates
    };

    saveRecurringTransactions(
      recurring
    );

    return recurring[index];
  }

  function deleteRecurringTransaction(
    id
  ) {
    const recurring =
      getRecurringTransactions()
        .filter(r => r.id !== id);

    saveRecurringTransactions(
      recurring
    );

    return true;
  }

  function recurringMonthlyEquivalent(item) {
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

      case "monthly":
      default:
        return amount;
    }
  }

  /* ============================================================
     FINANCIAL HEALTH
     ============================================================ */

  function calculateFinancialHealth() {
    const month =
      getMonthlyTotals();

    const budget =
      getBudgetStats();

    const goals =
      getSavingsGoals();

    let score = 50;

    if (month.income > 0) {
      if (
        month.cashFlow > 0
      ) {
        score += 15;
      } else {
        score -= 15;
      }

      if (
        month.savingsRate >= 30
      ) {
        score += 15;
      } else if (
        month.savingsRate >= 15
      ) {
        score += 8;
      } else if (
        month.savingsRate < 0
      ) {
        score -= 15;
      }
    }

    if (
      budget.budget > 0
    ) {
      if (
        budget.usage <= 70
      ) {
        score += 10;
      } else if (
        budget.usage <= 90
      ) {
        score += 3;
      } else if (
        budget.usage > 100
      ) {
        score -= 15;
      } else {
        score -= 5;
      }
    }

    if (goals.length > 0) {
      const progress =
        goals.reduce(
          (sum, goal) =>
            sum +
            getGoalProgress(goal),
          0
        ) / goals.length;

      if (progress >= 60) {
        score += 8;
      } else if (
        progress >= 25
      ) {
        score += 4;
      }
    }

    const recurring =
      getRecurringTransactions();

    if (
      recurring.length > 0 &&
      month.income > 0
    ) {
      const recurringExpense =
        recurring
          .filter(
            r => r.type === "expense"
          )
          .reduce(
            (sum, r) =>
              sum +
              recurringMonthlyEquivalent(
                r
              ),
            0
          );

      const recurringRatio =
        recurringExpense /
        month.income;

      if (recurringRatio > 0.6) {
        score -= 10;
      } else if (
        recurringRatio > 0.4
      ) {
        score -= 4;
      }
    }

    score =
      Math.round(
        clamp(score, 0, 100)
      );

    let status;
    let message;

    if (score >= 80) {
      status = "Excellent";
      message =
        "Your finances are in a strong position. Keep your spending controlled and continue building savings.";
    } else if (score >= 65) {
      status = "Good";
      message =
        "You're doing well. A few improvements in spending or saving could make your financial position even stronger.";
    } else if (score >= 45) {
      status = "Needs attention";
      message =
        "Your finances are manageable, but your spending and savings deserve closer attention.";
    } else {
      status = "At risk";
      message =
        "Your current financial pattern needs attention. Focus on controlling expenses and protecting your cash flow.";
    }

    return {
      score,
      status,
      message
    };
  }

  /* ============================================================
     SAFE TO SPEND
     ============================================================ */

  function getSafeToSpend() {
    const month =
      getMonthlyTotals();

    const budget =
      getMonthlyBudget();

    if (budget > 0) {
      return {
        amount:
          Math.max(
            0,
            budget -
              month.expenses
          ),
        source: "budget",
        message:
          "Based on your monthly budget and current spending."
      };
    }

    return {
      amount:
        Math.max(
          0,
          month.cashFlow
        ),
      source: "cashflow",
      message:
        "Based on your current income minus expenses."
    };
  }

  /* ============================================================
     SMART INSIGHT
     ============================================================ */

  function generateSmartInsight() {
    const month =
      getMonthlyTotals();

    const top =
      getTopSpendingCategories();

    if (
      month.income === 0 &&
      month.expenses === 0
    ) {
      return {
        title:
          "Your financial picture",
        text:
          "Add your first income or expense and MoneyLeak will start analyzing your finances."
      };
    }

    if (
      month.cashFlow < 0
    ) {
      return {
        title:
          "Your spending is ahead of your income",
        text:
          `You are currently spending ${smartCurrency(
            Math.abs(
              month.cashFlow
            )
          )} more than your income this month.`
      };
    }

    if (
      top.length > 0 &&
      month.income > 0
    ) {
      const category =
        top[0].category;

      const percentage =
        month.expenses > 0
          ? (
              top[0].amount /
              month.expenses
            ) *
            100
          : 0;

      return {
        title:
          "Your biggest spending area",
        text:
          `${category} represents about ${Math.round(
            percentage
          )}% of your spending this month.`
      };
    }

    return {
      title:
        "Your financial picture",
      text:
        `Your current monthly cash flow is positive by ${smartCurrency(
          month.cashFlow
        )}. Keep building consistent habits.`
    };
  }

  /* ============================================================
     NOTIFICATION SYSTEM
     ============================================================ */

  function getNotificationHistory() {
    const notifications =
      readJSON(
        STORAGE.notifications,
        []
      );

    if (!Array.isArray(notifications)) {
      return [];
    }

    return notifications;
  }

  function saveNotificationHistory(
    notifications
  ) {
    writeJSON(
      STORAGE.notifications,
      notifications.slice(0, 100)
    );
  }

  function createNotification({
    type = "info",
    title,
    message,
    url = "index.html",
    icon = "✦",
    id
  }) {
    return {
      id:
        id ||
        uid("notification"),
      type,
      title,
      message,
      url,
      icon,
      read: false,
      createdAt:
        new Date().toISOString()
    };
  }

  function addNotification(
    notification
  ) {
    const settings =
      getSettings();

    if (
      settings.notifications === false
    ) {
      return null;
    }

    const history =
      getNotificationHistory();

    const incoming =
      createNotification(
        notification
      );

    const duplicate =
      history.find(
        n =>
          n.title ===
            incoming.title &&
          n.message ===
            incoming.message
      );

    if (duplicate) {
      return duplicate;
    }

    history.unshift(
      incoming
    );

    saveNotificationHistory(
      history
    );

    return incoming;
  }

  function markNotificationRead(
    id
  ) {
    const history =
      getNotificationHistory();

    history.forEach(n => {
      if (n.id === id) {
        n.read = true;
      }
    });

    saveNotificationHistory(
      history
    );

    renderNotificationCenter();
  }

  function markAllNotificationsRead() {
    const history =
      getNotificationHistory();

    history.forEach(
      n => {
        n.read = true;
      }
    );

    saveNotificationHistory(
      history
    );

    renderNotificationCenter();
  }

  function clearNotificationHistory() {
    saveNotificationHistory([]);

    renderNotificationCenter();
  }

  function unreadNotificationCount() {
    return getNotificationHistory()
      .filter(n => !n.read)
      .length;
  }

  /* ============================================================
     SMART ALERT GENERATOR
     ============================================================ */

  function generateAlerts() {
    const alerts = [];

    const month =
      getMonthlyTotals();

    const budget =
      getBudgetStats();

    const health =
      calculateFinancialHealth();

    const top =
      getTopSpendingCategories();

    const goals =
      getSavingsGoals();

    /* --------------------------------
       HEALTH
       -------------------------------- */

    if (
      health.score < 45
    ) {
      alerts.push(
        createNotification({
          id: "health-attention",
          type: "danger",
          title:
            "Your financial health needs attention",
          message:
            `Your current MoneyLeak health score is ${health.score}/100. Review your spending and cash flow.`,
          url:
            "analytics.html",
          icon: "!"
        })
      );
    } else if (
      health.score >= 80
    ) {
      alerts.push(
        createNotification({
          id: "health-strong",
          type: "success",
          title:
            "Financial health is strong",
          message:
            `Your MoneyLeak health score is ${health.score}/100. Keep your current habits consistent.`,
          url:
            "analytics.html",
          icon: "✓"
        })
      );
    }

    /* --------------------------------
       NO INCOME
       -------------------------------- */

    if (
      month.income === 0 &&
      month.expenses > 0
    ) {
      alerts.push(
        createNotification({
          id: "no-income",
          type: "warning",
          title:
            "No income recorded this month",
          message:
            `You have ${smartCurrency(
              month.expenses
            )} in expenses but no income recorded.`,
          url:
            "income.html",
          icon: "!"
        })
      );
    }

    /* --------------------------------
       BUDGET
       -------------------------------- */

    if (
      budget.budget > 0
    ) {
      if (
        budget.usage >= 100
      ) {
        alerts.push(
          createNotification({
            id: "budget-over",
            type: "danger",
            title:
              "You've exceeded your budget",
            message:
              `You've spent ${smartCurrency(
                budget.spent
              )} against a ${smartCurrency(
                budget.budget
              )} monthly budget.`,
            url:
              "budgets.html",
            icon: "!"
          })
        );
      } else if (
        budget.usage >= 80
      ) {
        alerts.push(
          createNotification({
            id: "budget-warning",
            type: "warning",
            title:
              "You're approaching your budget",
            message:
              `You've used ${Math.round(
                budget.usage
              )}% of your monthly spending limit.`,
            url:
              "budgets.html",
            icon: "!"
          })
        );
      }
    }

    /* --------------------------------
       SAVINGS
       -------------------------------- */

    if (
      goals.length > 0
    ) {
      const averageProgress =
        goals.reduce(
          (sum, goal) =>
            sum +
            getGoalProgress(goal),
          0
        ) / goals.length;

      if (
        averageProgress >= 60
      ) {
        alerts.push(
          createNotification({
            id: "savings-progress",
            type: "success",
            title:
              "Great progress on your savings",
            message:
              `Your savings goals are ${Math.round(
                averageProgress
              )}% complete. Keep it going!`,
            url:
              "savings.html",
            icon: "◎"
          })
        );
      }
    }

    /* --------------------------------
       TOP SPENDING
       -------------------------------- */

    if (
      top.length > 0 &&
      month.expenses > 0
    ) {
      const percentage =
        (
          top[0].amount /
          month.expenses
        ) *
        100;

      if (
        percentage >= 30
      ) {
        alerts.push(
          createNotification({
            id:
              "top-category-" +
              top[0].category,
            type: "info",
            title:
              `${top[0].category} is your biggest spending area`,
            message:
              `${top[0].category} represents ${Math.round(
                percentage
              )}% of your spending this month.`,
            url:
              "expenses.html",
            icon: "•"
          })
        );
      }
    }

    /* --------------------------------
       POSITIVE CASH FLOW
       -------------------------------- */

    if (
      month.income > 0 &&
      month.cashFlow > 0 &&
      month.savingsRate >= 20
    ) {
      alerts.push(
        createNotification({
          id: "positive-cashflow",
          type: "success",
          title:
            "You're building positive momentum",
          message:
            `You've kept ${Math.round(
              month.savingsRate
            )}% of your income this month.`,
          url:
            "analytics.html",
          icon: "↗"
        })
      );
    }

    /* --------------------------------
       RECURRING
       -------------------------------- */

    const recurring =
      getRecurringTransactions();

    if (
      recurring.length > 0
    ) {
      const upcoming =
        recurring
          .filter(
            r =>
              r.type ===
              "expense"
          )
          .map(r => ({
            ...r,
            date:
              new Date(
                r.nextDate +
                  "T00:00:00"
              )
          }))
          .sort(
            (a, b) =>
              a.date - b.date
          )[0];

      if (upcoming) {
        const days =
          Math.ceil(
            (
              upcoming.date -
              new Date()
            ) /
              86400000
          );

        if (
          days >= 0 &&
          days <= 7
        ) {
          alerts.push(
            createNotification({
              id:
                "recurring-" +
                upcoming.id,
              type: "info",
              title:
                "Upcoming recurring payment",
              message:
                `${upcoming.name} of ${smartCurrency(
                  upcoming.amount
                )} is due ${
                  days === 0
                    ? "today"
                    : `in ${days} days`
                }.`,
              url:
                "recurring.html",
              icon: "↻"
            })
          );
        }
      }
    }

    return alerts;
  }

  function syncSmartNotifications() {
    const generated =
      generateAlerts();

    const history =
      getNotificationHistory();

    generated.forEach(alert => {
      const exists =
        history.some(
          item =>
            item.id === alert.id
        );

      if (!exists) {
        history.unshift({
          ...alert,
          createdAt:
            new Date().toISOString()
        });
      }
    });

    saveNotificationHistory(
      history
    );

    return generated;
  }

  function getAlerts() {
    return generateAlerts();
  }

  /* ============================================================
     NOTIFICATION CENTER
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

    if (!button || !panel) {
      return;
    }

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        syncSmartNotifications();

        panel.classList.toggle(
          "open"
        );

        panel.classList.toggle(
          "active"
        );

        renderNotificationCenter();
      }
    );

    close?.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        panel.classList.remove(
          "open",
          "active"
        );
      }
    );

    document.addEventListener(
      "click",
      event => {
        if (
          !panel.contains(
            event.target
          ) &&
          !button.contains(
            event.target
          )
        ) {
          panel.classList.remove(
            "open",
            "active"
          );
        }
      }
    );

    renderNotificationCenter();
  }

  function notificationTypeClass(
    type
  ) {
    switch (type) {
      case "danger":
        return "danger";

      case "warning":
        return "warning";

      case "success":
        return "success";

      default:
        return "info";
    }
  }

  function renderNotificationCenter() {
    const panel =
      document.getElementById(
        "notificationPanel"
      );

    if (!panel) return;

    const list =
      document.getElementById(
        "notificationList"
      );

    const count =
      unreadNotificationCount();

    updateNotificationBadge(
      count
    );

    const history =
      getNotificationHistory();

    const safeHistory =
      history.length
        ? history
        : [
            {
              id: "empty",
              type: "info",
              title:
                "You're all caught up",
              message:
                "MoneyLeak will place useful financial alerts here.",
              icon: "✓",
              read: true,
              createdAt:
                new Date().toISOString(),
              url: "index.html"
            }
          ];

    if (!list) return;

    list.innerHTML = safeHistory
      .slice(0, 30)
      .map(notification => {
        const unread =
          !notification.read;

        return `
          <button
            type="button"
            class="moneyLeakNotification ${
              unread
                ? "is-unread"
                : ""
            }"
            data-notification-id="${escapeHTML(
              notification.id
            )}"
            data-notification-url="${escapeHTML(
              notification.url ||
                "index.html"
            )}"
          >
            <span class="moneyLeakNotificationIcon ${notificationTypeClass(
              notification.type
            )}">
              ${escapeHTML(
                notification.icon ||
                  "✦"
              )}
            </span>

            <span class="moneyLeakNotificationContent">
              <strong>
                ${escapeHTML(
                  notification.title
                )}
              </strong>

              <span>
                ${escapeHTML(
                  notification.message
                )}
              </span>

              <small>
                ${relativeTime(
                  notification.createdAt
                )}
              </small>
            </span>

            <span class="moneyLeakNotificationArrow">
              →
            </span>
          </button>
        `;
      })
      .join("");

    list
      .querySelectorAll(
        "[data-notification-id]"
      )
      .forEach(item => {
        item.addEventListener(
          "click",
          () => {
            const id =
              item.dataset
                .notificationId;

            const url =
              item.dataset
                .notificationUrl ||
              "index.html";

            if (id !== "empty") {
              markNotificationRead(
                id
              );
            }

            window.location.href =
              url;
          }
        );
      });

    addNotificationControls(
      panel
    );
  }

  function updateNotificationBadge(
    count
  ) {
    const button =
      document.getElementById(
        "notificationButton"
      );

    if (!button) return;

    let badge =
      button.querySelector(
        ".notification-count"
      );

    if (!badge) {
      badge =
        document.createElement(
          "span"
        );

      badge.className =
        "notification-count";

      button.style.position =
        "relative";

      button.appendChild(badge);
    }

    if (count > 0) {
      badge.textContent =
        count > 99
          ? "99+"
          : String(count);

      badge.style.display =
        "flex";
    } else {
      badge.style.display =
        "none";
    }

    button.setAttribute(
      "aria-label",
      count
        ? `${count} unread notifications`
        : "Notifications"
    );
  }

  function addNotificationControls(
    panel
  ) {
    const header =
      panel.querySelector(
        ".notification-panel-header"
      ) ||
      panel.querySelector(
        ".notifications-header"
      );

    if (!header) return;

    if (
      header.querySelector(
        ".notification-actions"
      )
    ) {
      return;
    }

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "notification-actions";

    actions.innerHTML = `
      <button
        type="button"
        class="notification-action"
        data-mark-all
      >
        Mark all as read
      </button>

      <button
        type="button"
        class="notification-action notification-danger"
        data-clear-notifications
      >
        Clear
      </button>
    `;

    header.appendChild(
      actions
    );

    actions
      .querySelector(
        "[data-mark-all]"
      )
      .addEventListener(
        "click",
        event => {
          event.preventDefault();
          markAllNotificationsRead();
        }
      );

    actions
      .querySelector(
        "[data-clear-notifications]"
      )
      .addEventListener(
        "click",
        event => {
          event.preventDefault();

          if (
            confirm(
              "Clear your MoneyLeak notification history?"
            )
          ) {
            clearNotificationHistory();
          }
        }
      );
  }

  /* ============================================================
     SEARCH ENGINE
     ============================================================ */

  const SEARCH_PAGES = [
    {
      title: "Dashboard",
      description:
        "Your complete financial command center",
      icon: "⌂",
      keywords:
        "dashboard home overview balance money",
      url: "index.html"
    },
    {
      title: "Income",
      description:
        "Record and understand your income",
      icon: "↗",
      keywords:
        "income salary freelance business earnings money received",
      url: "income.html"
    },
    {
      title: "Expenses",
      description:
        "Track spending and find money leaks",
      icon: "↘",
      keywords:
        "expenses spending money leak costs purchases",
      url: "expenses.html"
    },
    {
      title: "Budgets",
      description:
        "Set spending limits and stay on track",
      icon: "▣",
      keywords:
        "budget spending limit monthly category",
      url: "budgets.html"
    },
    {
      title: "Savings Goals",
      description:
        "Build and track your financial goals",
      icon: "◎",
      keywords:
        "savings goals save target wealth",
      url: "savings.html"
    },
    {
      title: "Recurring",
      description:
        "Manage bills, subscriptions and recurring money",
      icon: "↻",
      keywords:
        "recurring subscriptions bills rent salary payments",
      url: "recurring.html"
    },
    {
      title: "Analytics",
      description:
        "Understand your financial performance",
      icon: "◉",
      keywords:
        "analytics charts financial health insights reports",
      url: "analytics.html"
    },
    {
      title: "Settings",
      description:
        "Control your MoneyLeak preferences",
      icon: "⚙",
      keywords:
        "settings currency profile theme notifications",
      url: "settings.html"
    }
  ];

  const SEARCH_ACTIONS = [
    {
      title: "Add income",
      description:
        "Record money you've received",
      icon: "↗",
      keywords:
        "income add salary earnings",
      url: "income.html"
    },
    {
      title: "Add expense",
      description:
        "Record something you spent money on",
      icon: "↘",
      keywords:
        "expense spending purchase",
      url: "expenses.html"
    },
    {
      title: "Create savings goal",
      description:
        "Start saving toward something important",
      icon: "◎",
      keywords:
        "savings goal target save",
      url: "savings.html"
    },
    {
      title: "Set a budget",
      description:
        "Give your money a spending limit",
      icon: "▣",
      keywords:
        "budget limit spending",
      url: "budgets.html"
    },
    {
      title: "View analytics",
      description:
        "Understand where your money is going",
      icon: "◉",
      keywords:
        "analytics reports charts",
      url: "analytics.html"
    },
    {
      title:
        "Manage recurring payments",
      description:
        "Track subscriptions, bills and regular income",
      icon: "↻",
      keywords:
        "recurring bills subscriptions payments",
      url: "recurring.html"
    }
  ];

  const SEARCH_QUESTIONS = [
    {
      title:
        "Where am I spending the most?",
      description:
        "Find your biggest spending categories",
      icon: "⌕",
      keywords:
        "spending biggest category expenses",
      action:
        "spending"
    },
    {
      title:
        "Show my largest expenses",
      description:
        "Find your most expensive transactions",
      icon: "↘",
      keywords:
        "largest biggest expenses transactions",
      action:
        "largest"
    },
    {
      title:
        "How much am I saving?",
      description:
        "Review your savings progress",
      icon: "◎",
      keywords:
        "saving savings rate progress",
      action:
        "savings"
    },
    {
      title:
        "Show my recent transactions",
      description:
        "Review your latest money activity",
      icon: "↻",
      keywords:
        "recent transactions activity income expense",
      action:
        "recent"
    },
    {
      title:
        "How is my financial health?",
      description:
        "Review your MoneyLeak financial health",
      icon: "✦",
      keywords:
        "financial health score money health",
      action:
        "health"
    }
  ];

  function searchScore(
    query,
    item
  ) {
    const q =
      query.toLowerCase().trim();

    if (!q) return 0;

    const title =
      item.title
        .toLowerCase();

    const description =
      item.description
        .toLowerCase();

    const keywords =
      item.keywords
        .toLowerCase();

    let score = 0;

    if (
      title === q
    ) {
      score += 100;
    }

    if (
      title.startsWith(q)
    ) {
      score += 50;
    }

    if (
      title.includes(q)
    ) {
      score += 30;
    }

    if (
      description.includes(q)
    ) {
      score += 15;
    }

    if (
      keywords.includes(q)
    ) {
      score += 20;
    }

    q.split(/\s+/).forEach(
      word => {
        if (
          word.length < 2
        ) return;

        if (
          title.includes(word)
        ) score += 10;

        if (
          description.includes(
            word
          )
        ) score += 5;

        if (
          keywords.includes(word)
        ) score += 7;
      }
    );

    return score;
  }

  function searchMoneyLeak(query) {
    const q =
      query
        .toLowerCase()
        .trim();

    if (!q) {
      return {
        pages: [],
        actions:
          SEARCH_ACTIONS.slice(
            0,
            6
          ),
        questions:
          SEARCH_QUESTIONS
      };
    }

    const pages =
      SEARCH_PAGES
        .map(item => ({
          ...item,
          score:
            searchScore(
              q,
              item
            )
        }))
        .filter(
          item =>
            item.score > 0
        )
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 5);

    const actions =
      SEARCH_ACTIONS
        .map(item => ({
          ...item,
          score:
            searchScore(
              q,
              item
            )
        }))
        .filter(
          item =>
            item.score > 0
        )
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 5);

    const questions =
      SEARCH_QUESTIONS
        .map(item => ({
          ...item,
          score:
            searchScore(
              q,
              item
            )
        }))
        .filter(
          item =>
            item.score > 0
        )
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 5);

    return {
      pages,
      actions,
      questions
    };
  }

  function searchTransactions(
    query
  ) {
    const q =
      query
        .toLowerCase()
        .trim();

    if (!q) return [];

    return getTransactions()
      .filter(t => {
        const text =
          [
            t.description,
            t.category,
            t.source,
            t.type,
            t.date
          ]
            .join(" ")
            .toLowerCase();

        return text.includes(q);
      })
      .sort(
        (a, b) =>
          new Date(
            b.date
          ) -
          new Date(
            a.date
          )
      )
      .slice(0, 8);
  }

  function searchGoals(
    query
  ) {
    const q =
      query
        .toLowerCase()
        .trim();

    if (!q) return [];

    return getSavingsGoals()
      .filter(goal => {
        const text =
          [
            goal.name,
            goal.description,
            goal.deadline
          ]
            .join(" ")
            .toLowerCase();

        return text.includes(q);
      })
      .slice(0, 5);
  }

  function renderSearchResults(
    query
  ) {
    const results =
      document.getElementById(
        "searchResults"
      );

    if (!results) return;

    const data =
      searchMoneyLeak(query);

    const transactions =
      searchTransactions(
        query
      );

    const goals =
      searchGoals(query);

    if (
      !query.trim()
    ) {
      results.innerHTML = `
        <div class="search-section">
          <div class="search-section-title">
            Quick actions
          </div>

          <div class="search-suggestion-grid">
            ${SEARCH_ACTIONS.map(
              renderSearchItem
            ).join("")}
          </div>
        </div>

        <div class="search-section">
          <div class="search-section-title">
            Money questions
          </div>

          <div class="search-suggestion-grid">
            ${SEARCH_QUESTIONS.map(
              renderQuestionItem
            ).join("")}
          </div>
        </div>
      `;

      bindSearchResultButtons();

      return;
    }

    let html = "";

    if (
      data.pages.length
    ) {
      html += `
        <div class="search-section">
          <div class="search-section-title">
            Pages
          </div>

          ${data.pages
            .map(
              renderSearchItem
            )
            .join("")}
        </div>
      `;
    }

    if (
      data.actions.length
    ) {
      html += `
        <div class="search-section">
          <div class="search-section-title">
            Quick actions
          </div>

          ${data.actions
            .map(
              renderSearchItem
            )
            .join("")}
        </div>
      `;
    }

    if (
      data.questions.length
    ) {
      html += `
        <div class="search-section">
          <div class="search-section-title">
            Money questions
          </div>

          ${data.questions
            .map(
              renderQuestionItem
            )
            .join("")}
        </div>
      `;
    }

    if (
      transactions.length
    ) {
      html += `
        <div class="search-section">
          <div class="search-section-title">
            Transactions
          </div>

          ${transactions
            .map(
              transaction =>
                `
                <button
                  type="button"
                  class="search-result-item"
                  data-search-url="expenses.html"
                >
                  <span class="search-result-icon">
                    ${
                      transaction.type ===
                      "income"
                        ? "↗"
                        : "↘"
                    }
                  </span>

                  <span class="search-result-main">
                    <strong>
                      ${escapeHTML(
                        transaction.description ||
                          transaction.category
                      )}
                    </strong>

                    <small>
                      ${escapeHTML(
                        transaction.category
                      )}
                      ·
                      ${formatDate(
                        transaction.date
                      )}
                    </small>
                  </span>

                  <span class="search-result-value">
                    ${
                      transaction.type ===
                      "income"
                        ? "+"
                        : "-"
                    }${smartCurrency(
                      transaction.amount
                    )}
                  </span>
                </button>
                `
            )
            .join("")}
        </div>
      `;
    }

    if (
      goals.length
    ) {
      html += `
        <div class="search-section">
          <div class="search-section-title">
            Savings goals
          </div>

          ${goals
            .map(
              goal =>
                `
                <button
                  type="button"
                  class="search-result-item"
                  data-search-url="savings.html"
                >
                  <span class="search-result-icon">
                    ◎
                  </span>

                  <span class="search-result-main">
                    <strong>
                      ${escapeHTML(
                        goal.name
                      )}
                    </strong>

                    <small>
                      ${Math.round(
                        getGoalProgress(
                          goal
                        )
                      )}% complete
                    </small>
                  </span>

                  <span class="search-result-value">
                    ${smartCurrency(
                      goal.current
                    )}
                  </span>
                </button>
                `
            )
            .join("")}
        </div>
      `;
    }

    if (!html) {
      html = `
        <div class="search-empty">
          <div class="search-empty-icon">
            ⌕
          </div>

          <strong>
            No results found
          </strong>

          <p>
            Try searching for income, expenses, savings, budgets, analytics or a transaction.
          </p>
        </div>
      `;
    }

    results.innerHTML =
      html;

    bindSearchResultButtons();
  }

  function renderSearchItem(
    item
  ) {
    return `
      <button
        type="button"
        class="search-result-item"
        data-search-url="${escapeHTML(
          item.url
        )}"
      >
        <span class="search-result-icon">
          ${escapeHTML(
            item.icon
          )}
        </span>

        <span class="search-result-main">
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

        <span class="search-result-arrow">
          →
        </span>
      </button>
    `;
  }

  function renderQuestionItem(
    item
  ) {
    return `
      <button
        type="button"
        class="search-result-item"
        data-question-action="${escapeHTML(
          item.action
        )}"
      >
        <span class="search-result-icon">
          ${escapeHTML(
            item.icon
          )}
        </span>

        <span class="search-result-main">
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

        <span class="search-result-arrow">
          →
        </span>
      </button>
    `;
  }

  function bindSearchResultButtons() {
    document
      .querySelectorAll(
        "[data-search-url]"
      )
      .forEach(button => {
        button.onclick =
          () => {
            window.location.href =
              button.dataset
                .searchUrl;
          };
      });

    document
      .querySelectorAll(
        "[data-question-action]"
      )
      .forEach(button => {
        button.onclick =
          () => {
            handleSearchQuestion(
              button.dataset
                .questionAction
            );
          };
      });
  }

  function handleSearchQuestion(
    action
  ) {
    const overlay =
      document.getElementById(
        "searchOverlay"
      );

    if (overlay) {
      overlay.classList.remove(
        "open",
        "active"
      );
    }

    switch (action) {
      case "spending":
        window.location.href =
          "analytics.html";
        break;

      case "largest":
        window.location.href =
          "expenses.html";
        break;

      case "savings":
        window.location.href =
          "savings.html";
        break;

      case "recent":
        window.location.href =
          "index.html";
        break;

      case "health":
        window.location.href =
          "analytics.html";
        break;

      default:
        window.location.href =
          "index.html";
    }
  }

  function setupSearch() {
    const overlay =
      document.getElementById(
        "searchOverlay"
      );

    const input =
      document.getElementById(
        "globalSearch"
      );

    const close =
      document.getElementById(
        "closeSearch"
      );

    const triggers =
      document.querySelectorAll(
        '[data-search-trigger], .search-trigger, #searchButton'
      );

    if (!overlay) return;

    function openSearch() {
      overlay.classList.add(
        "open",
        "active"
      );

      document.body.classList.add(
        "search-open"
      );

      setTimeout(() => {
        input?.focus();
        renderSearchResults("");
      }, 30);
    }

    function closeSearch() {
      overlay.classList.remove(
        "open",
        "active"
      );

      document.body.classList.remove(
        "search-open"
      );

      if (input) {
        input.value = "";
      }
    }

    triggers.forEach(
      trigger => {
        trigger.addEventListener(
          "click",
          event => {
            event.preventDefault();
            openSearch();
          }
        );
      }
    );

    input?.addEventListener(
      "input",
      event => {
        renderSearchResults(
          event.target.value
        );
      }
    );

    close?.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();
        closeSearch();
      }
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

    document.addEventListener(
      "keydown",
      event => {
        if (
          (event.metaKey ||
            event.ctrlKey) &&
          event.key
            .toLowerCase() ===
            "k"
        ) {
          event.preventDefault();
          openSearch();
        }

        if (
          event.key ===
            "Escape" &&
          overlay.classList.contains(
            "open"
          )
        ) {
          closeSearch();
        }
      }
    );

    renderSearchResults("");
  }

  /* ============================================================
     MOBILE NAVIGATION
     ============================================================ */

  function setupMobileNavigation() {
    const menuButton =
      document.querySelector(
        "[data-mobile-menu], #mobileMenuButton"
      );

    const sidebar =
      document.querySelector(
        ".sidebar"
      );

    const overlay =
      document.querySelector(
        ".mobile-overlay"
      );

    if (
      !menuButton ||
      !sidebar
    ) {
      return;
    }

    menuButton.addEventListener(
      "click",
      event => {
        event.preventDefault();

        sidebar.classList.toggle(
          "mobile-open"
        );

        overlay?.classList.toggle(
          "open"
        );
      }
    );

    overlay?.addEventListener(
      "click",
      () => {
        sidebar.classList.remove(
          "mobile-open"
        );

        overlay.classList.remove(
          "open"
        );
      }
    );

    sidebar
      .querySelectorAll("a")
      .forEach(link => {
        link.addEventListener(
          "click",
          () => {
            sidebar.classList.remove(
              "mobile-open"
            );

            overlay?.classList.remove(
              "open"
            );
          }
        );
      });
  }

  /* ============================================================
     ACTIVE NAV
     ============================================================ */

  function setActiveNavigation() {
    const current =
      window.location.pathname
        .split("/")
        .pop() ||
      "index.html";

    document
      .querySelectorAll(
        ".sidebar a"
      )
      .forEach(link => {
        const href =
          link.getAttribute(
            "href"
          );

        if (!href) return;

        const clean =
          href.split("#")[0];

        link.classList.toggle(
          "active",
          clean === current
        );
      });
  }

  /* ============================================================
     GREETING
     ============================================================ */

  function updateGreeting() {
    const greeting =
      document.getElementById(
        "dashboardGreeting"
      );

    if (!greeting) return;

    const hour =
      new Date().getHours();

    let timeGreeting =
      "Good evening";

    if (hour < 12) {
      timeGreeting =
        "Good morning";
    } else if (
      hour < 18
    ) {
      timeGreeting =
        "Good afternoon";
    }

    const settings =
      getSettings();

    const name =
      settings.name &&
      settings.name !==
        "My Money"
        ? settings.name
        : "there";

    greeting.textContent =
      `${timeGreeting}, ${name}`;
  }

  /* ============================================================
     LOGO
     ============================================================ */

  function updateBrandLogo() {
    const selectors = [
      ".brand-mark",
      ".logo-mark",
      ".brand-logo",
      "[data-brand-logo]"
    ];

    selectors.forEach(
      selector => {
        document
          .querySelectorAll(
            selector
          )
          .forEach(element => {
            element.textContent =
              "M";

            element.setAttribute(
              "aria-label",
              "MoneyLeak"
            );

            element.setAttribute(
              "title",
              "MoneyLeak"
            );
          });
      }
    );

    document
      .querySelectorAll(
        ".brand-name"
      )
      .forEach(element => {
        if (
          !element.textContent.trim()
        ) {
          element.textContent =
            "MoneyLeak";
        }
      });
  }

  /* ============================================================
     DASHBOARD
     ============================================================ */

  function setText(id, value) {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        value;
    }
  }

  function setWidth(id, percent) {
    const element =
      document.getElementById(id);

    if (!element) return;

    element.style.width =
      `${clamp(
        Number(percent) || 0,
        0,
        100
      )}%`;
  }

  function updateDashboard() {
    const month =
      getMonthlyTotals();

    const budget =
      getBudgetStats();

    const health =
      calculateFinancialHealth();

    const goals =
      getSavingsGoals();

    const safe =
      getSafeToSpend();

    const insight =
      generateSmartInsight();

    const totalBalance =
      getTransactions()
        .reduce(
          (sum, t) =>
            sum +
            (
              t.type ===
              "income"
                ? t.amount
                : -t.amount
            ),
          0
        );

    /* ------------------------------
       OVERVIEW
       ------------------------------ */

    setText(
      "overviewBalance",
      smartCurrency(
        totalBalance
      )
    );

    setText(
      "overviewIncome",
      smartCurrency(
        month.income
      )
    );

    setText(
      "overviewExpenses",
      smartCurrency(
        month.expenses
      )
    );

    setText(
      "overviewSavingsRate",
      `${Math.round(
        month.savingsRate
      )}%`
    );

    const totalGoalTarget =
      goals.reduce(
        (sum, goal) =>
          sum +
          Number(
            goal.target
          ),
        0
      );

    const totalGoalCurrent =
      goals.reduce(
        (sum, goal) =>
          sum +
          Number(
            goal.current
          ),
        0
      );

    const goalProgress =
      totalGoalTarget > 0
        ? (
            totalGoalCurrent /
            totalGoalTarget
          ) *
          100
        : 0;

    setText(
      "overviewGoalProgress",
      `${Math.round(
        goalProgress
      )}%`
    );

    setWidth(
      "overviewGoalFill",
      goalProgress
    );

    setText(
      "overviewHealthScore",
      `${health.score}/100`
    );

    setText(
      "overviewHealthStatus",
      health.status
    );

    /* ------------------------------
       PERIOD
       ------------------------------ */

    setText(
      "periodIncome",
      smartCurrency(
        month.income
      )
    );

    setText(
      "periodExpenses",
      smartCurrency(
        month.expenses
      )
    );

    setText(
      "periodCashFlow",
      smartCurrency(
        month.cashFlow
      )
    );

    setText(
      "cashFlowHealth",
      month.cashFlow >= 0
        ? "Positive"
        : "Needs attention"
    );

    /* ------------------------------
       INSIGHT
       ------------------------------ */

    setText(
      "overviewInsightText",
      insight.text
    );

    /* ------------------------------
       SAFE TO SPEND
       ------------------------------ */

    setText(
      "safeToSpendDashboard",
      smartCurrency(
        safe.amount
      )
    );

    setText(
      "safeToSpendMessage",
      safe.message
    );

    setText(
      "safeToSpendAdvice",
      safe.amount > 0
        ? "You have room to spend, but keep your goals and upcoming bills in mind."
        : "Consider reducing discretionary spending until your cash flow improves."
    );

    /* ------------------------------
       BUDGET
       ------------------------------ */

    setText(
      "dashboardBudgetPercent",
      budget.budget > 0
        ? `${Math.round(
            budget.usage
          )}%`
        : "No budget"
    );

    setWidth(
      "dashboardBudgetFill",
      budget.usage
    );

    setText(
      "dashboardBudgetSpent",
      smartCurrency(
        budget.spent
      )
    );

    setText(
      "dashboardBudgetRemaining",
      smartCurrency(
        Math.max(
          0,
          budget.remaining
        )
      )
    );

    setText(
      "dashboardBudgetLimit",
      smartCurrency(
        budget.budget
      )
    );

    /* ------------------------------
       HEALTH
       ------------------------------ */

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
      health.message
    );

    /* ------------------------------
       HEALTH FACTORS
       ------------------------------ */

    const incomeFactor =
      month.income > 0
        ? 100
        : 25;

    const budgetFactor =
      budget.budget > 0
        ? clamp(
            100 -
              Math.max(
                0,
                budget.usage -
                  70
              ),
            0,
            100
          )
        : 50;

    const savingsFactor =
      clamp(
        month.savingsRate *
          2.5,
        0,
        100
      );

    const recurring =
      getRecurringTransactions();

    const recurringExpenses =
      recurring
        .filter(
          r =>
            r.type ===
            "expense"
        )
        .reduce(
          (sum, r) =>
            sum +
            recurringMonthlyEquivalent(
              r
            ),
          0
        );

    const recurringFactor =
      month.income > 0
        ? clamp(
            100 -
              (
                recurringExpenses /
                month.income
              ) *
                100,
            0,
            100
          )
        : 50;

    setText(
      "healthIncomeFactor",
      `${Math.round(
        incomeFactor
      )}%`
    );

    setText(
      "healthBudgetFactor",
      `${Math.round(
        budgetFactor
      )}%`
    );

    setText(
      "healthSavingsFactor",
      `${Math.round(
        savingsFactor
      )}%`
    );

    setText(
      "healthRecurringFactor",
      `${Math.round(
        recurringFactor
      )}%`
    );

    setWidth(
      "healthIncomeBar",
      incomeFactor
    );

    setWidth(
      "healthBudgetBar",
      budgetFactor
    );

    setWidth(
      "healthSavingsBar",
      savingsFactor
    );

    setWidth(
      "healthRecurringBar",
      recurringFactor
    );

    setText(
      "healthInsight",
      health.message
    );

    renderDashboardTransactions();
    renderDashboardCategories();
    renderDashboardGoals();
    renderDashboardAlerts();
  }

  function renderDashboardTransactions() {
    const container =
      document.getElementById(
        "recentTransactions"
      );

    if (!container) return;

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
        .slice(0, 6);

    if (!transactions.length) {
      container.innerHTML = `
        <div class="empty-state">
          No transactions yet.
        </div>
      `;
      return;
    }

    container.innerHTML =
      transactions
        .map(
          transaction =>
            `
            <div class="transaction-row">
              <div class="transaction-icon">
                ${
                  transaction.type ===
                  "income"
                    ? "↗"
                    : "↘"
                }
              </div>

              <div class="transaction-main">
                <strong>
                  ${escapeHTML(
                    transaction.description ||
                      transaction.category
                  )}
                </strong>

                <small>
                  ${escapeHTML(
                    transaction.category
                  )}
                  ·
                  ${formatDate(
                    transaction.date
                  )}
                </small>
              </div>

              <div class="transaction-amount ${
                transaction.type ===
                "income"
                  ? "income"
                  : "expense"
              }">
                ${
                  transaction.type ===
                  "income"
                    ? "+"
                    : "-"
                }${smartCurrency(
                  transaction.amount
                )}
              </div>
            </div>
            `
        )
        .join("");
  }

  function renderDashboardCategories() {
    const container =
      document.getElementById(
        "topSpendingCategories"
      );

    if (!container) return;

    const categories =
      getTopSpendingCategories();

    if (!categories.length) {
      container.innerHTML = `
        <div class="empty-state">
          Add expenses to see your top spending categories.
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
                  ${escapeHTML(
                    item.category
                  )}
                </strong>

                <span>
                  ${smartCurrency(
                    item.amount
                  )}
                </span>
              </div>

              <div class="progress-track">
                <div
                  class="progress-fill"
                  style="width:${clamp(
                    percent,
                    0,
                    100
                  )}%"
                ></div>
              </div>
            </div>
          `;
        })
        .join("");
  }

  function renderDashboardGoals() {
    const container =
      document.getElementById(
        "dashboardGoals"
      );

    if (!container) return;

    const goals =
      getSavingsGoals();

    if (!goals.length) {
      container.innerHTML = `
        <div class="empty-state">
          Create your first savings goal.
        </div>
      `;
      return;
    }

    container.innerHTML =
      goals
        .slice(0, 4)
        .map(goal => {
          const progress =
            getGoalProgress(
              goal
            );

          return `
            <div class="goal-row">
              <div class="goal-row-top">
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

              <div class="progress-track">
                <div
                  class="progress-fill"
                  style="width:${progress}%"
                ></div>
              </div>

              <small>
                ${smartCurrency(
                  goal.current
                )}
                of
                ${smartCurrency(
                  goal.target
                )}
              </small>
            </div>
          `;
        })
        .join("");
  }

  function renderDashboardAlerts() {
    const container =
      document.getElementById(
        "financialAlerts"
      );

    if (!container) return;

    const alerts =
      generateAlerts();

    if (!alerts.length) {
      container.innerHTML = `
        <div class="empty-state">
          You're all caught up. MoneyLeak has no urgent alerts.
        </div>
      `;
      return;
    }

    container.innerHTML =
      alerts
        .slice(0, 5)
        .map(
          alert =>
            `
            <button
              type="button"
              class="dashboard-alert"
              data-alert-url="${escapeHTML(
                alert.url
              )}"
            >
              <span class="dashboard-alert-icon ${notificationTypeClass(
                alert.type
              )}">
                ${escapeHTML(
                  alert.icon
                )}
              </span>

              <span>
                <strong>
                  ${escapeHTML(
                    alert.title
                  )}
                </strong>

                <small>
                  ${escapeHTML(
                    alert.message
                  )}
                </small>
              </span>

              <span>→</span>
            </button>
            `
        )
        .join("");

    container
      .querySelectorAll(
        "[data-alert-url]"
      )
      .forEach(button => {
        button.onclick =
          () => {
            window.location.href =
              button.dataset
                .alertUrl;
          };
      });
  }

  /* ============================================================
     QUICK ACTIONS
     ============================================================ */

  function setupQuickActions() {
    document
      .querySelectorAll(
        "[data-quick-action]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            const action =
              button.dataset
                .quickAction;

            const routes = {
              income:
                "income.html",
              expense:
                "expenses.html",
              savings:
                "savings.html",
              budget:
                "budgets.html",
              analytics:
                "analytics.html",
              recurring:
                "recurring.html"
            };

            if (
              routes[action]
            ) {
              window.location.href =
                routes[action];
            }
          }
        );
      });
  }

  /* ============================================================
     GLOBAL UPDATE
     ============================================================ */

  function refreshEverything() {
    updateBrandLogo();
    updateGreeting();
    updateDashboard();

    syncSmartNotifications();
    renderNotificationCenter();
  }

  /* ============================================================
     DATA EXPORT
     ============================================================ */

  function exportData() {
    const data = {
      exportedAt:
        new Date().toISOString(),
      version:
        "MoneyLeak 8.0",
      transactions:
        getTransactions(),
      savingsGoals:
        getSavingsGoals(),
      monthlyBudget:
        getMonthlyBudget(),
      categoryBudgets:
        getCategoryBudgets(),
      recurring:
        getRecurringTransactions(),
      settings:
        getSettings(),
      notifications:
        getNotificationHistory()
    };

    const blob =
      new Blob(
        [
          JSON.stringify(
            data,
            null,
            2
          )
        ],
        {
          type:
            "application/json"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `moneyleak-backup-${todayISO()}.json`;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url
    );
  }

  /* ============================================================
     DATA IMPORT
     ============================================================ */

  function importDataObject(
    data
  ) {
    if (
      !data ||
      typeof data !==
        "object"
    ) {
      throw new Error(
        "Invalid MoneyLeak backup."
      );
    }

    if (
      Array.isArray(
        data.transactions
      )
    ) {
      saveTransactions(
        data.transactions
      );
    }

    if (
      Array.isArray(
        data.savingsGoals
      )
    ) {
      saveSavingsGoals(
        data.savingsGoals
      );
    }

    if (
      data.monthlyBudget !==
      undefined
    ) {
      setMonthlyBudget(
        data.monthlyBudget
      );
    }

    if (
      data.categoryBudgets
    ) {
      writeJSON(
        STORAGE.categoryBudgets,
        data.categoryBudgets
      );
    }

    if (
      Array.isArray(
        data.recurring
      )
    ) {
      saveRecurringTransactions(
        data.recurring
      );
    }

    if (
      data.settings
    ) {
      saveSettings(
        data.settings
      );
    }

    if (
      Array.isArray(
        data.notifications
      )
    ) {
      saveNotificationHistory(
        data.notifications
      );
    }

    window.dispatchEvent(
      new CustomEvent(
        "moneyLeakUpdated",
        {
          detail: {
            type: "import"
          }
        }
      )
    );
  }

  /* ============================================================
     RESET
     ============================================================ */

  function resetAllData() {
    Object.values(
      STORAGE
    ).forEach(
      key =>
        removeStorage(key)
    );

    window.location.reload();
  }

  /* ============================================================
     SETTINGS UI HELPERS
     ============================================================ */

  function setupGlobalSettings() {
    const settings =
      getSettings();

    const currency =
      document.getElementById(
        "settingsCurrency"
      );

    const name =
      document.getElementById(
        "settingsName"
      );

    const notifications =
      document.getElementById(
        "settingsNotifications"
      );

    const compact =
      document.getElementById(
        "settingsCompactNumbers"
      );

    const theme =
      document.getElementById(
        "settingsTheme"
      );

    if (currency) {
      currency.value =
        settings.currency;
    }

    if (name) {
      name.value =
        settings.name;
    }

    if (
      notifications
    ) {
      notifications.checked =
        settings.notifications !==
        false;
    }

    if (compact) {
      compact.checked =
        settings.compactNumbers ===
        true;
    }

    if (theme) {
      theme.value =
        settings.theme ===
        "dark"
          ? "dark"
          : "light";
    }

    const form =
      document.getElementById(
        "settingsForm"
      );

    form?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        saveSettings({
          currency:
            currency?.value ||
            "NGN",

          name:
            name?.value.trim() ||
            "My Money",

          notifications:
            notifications
              ? notifications.checked
              : true,

          compactNumbers:
            compact
              ? compact.checked
              : false,

          theme:
            theme?.value ||
            "light"
        });

        alert(
          "MoneyLeak settings saved."
        );

        window.location.reload();
      }
    );
  }

  /* ============================================================
     DATA BUTTONS
     ============================================================ */

  function setupDataControls() {
    const exportButton =
      document.getElementById(
        "exportData"
      );

    exportButton?.addEventListener(
      "click",
      exportData
    );

    const importButton =
      document.getElementById(
        "importData"
      );

    const importInput =
      document.getElementById(
        "importFile"
      );

    importButton?.addEventListener(
      "click",
      () => {
        importInput?.click();
      }
    );

    importInput?.addEventListener(
      "change",
      event => {
        const file =
          event.target.files?.[0];

        if (!file) return;

        const reader =
          new FileReader();

        reader.onload =
          () => {
            try {
              const data =
                JSON.parse(
                  reader.result
                );

              importDataObject(
                data
              );

              alert(
                "MoneyLeak data imported successfully."
              );

              window.location.reload();
            } catch (error) {
              alert(
                "This backup file could not be imported."
              );

              console.error(
                error
              );
            }
          };

        reader.readAsText(
          file
        );
      }
    );

    const resetButton =
      document.getElementById(
        "resetAllData"
      );

    resetButton?.addEventListener(
      "click",
      () => {
        const confirmed =
          confirm(
            "This will permanently delete your MoneyLeak transactions, goals, budgets, recurring items and settings. Continue?"
          );

        if (!confirmed)
          return;

        resetAllData();
      }
    );
  }

  /* ============================================================
     INITIALIZATION
     ============================================================ */

  function initialize() {
    applySettings();

    setActiveNavigation();

    setupSearch();

    setupNotifications();

    setupMobileNavigation();

    setupQuickActions();

    setupGlobalSettings();

    setupDataControls();

    updateBrandLogo();

    updateGreeting();

    updateDashboard();

    syncSmartNotifications();

    renderNotificationCenter();

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

    window.dispatchEvent(
      new CustomEvent(
        "moneyLeakReady"
      )
    );
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */

  window.MoneyLeak = {
    version: "8.0",

    storage: STORAGE,

    categories:
      CATEGORIES,

    incomeSources:
      INCOME_SOURCES,

    getSettings,
    saveSettings,
    applySettings,

    displayCurrency,
    compactCurrency,
    smartCurrency,

    getTransactions,
    saveTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearTransactions,

    getPeriodRange,
    getPeriodTransactions,
    getMonthlyTotals,
    getPreviousMonthTotals,

    getCategoryTotals,
    getTopSpendingCategories,
    getLargestExpense,

    getSavingsGoals,
    saveSavingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    getGoalProgress,

    getMonthlyBudget,
    setMonthlyBudget,
    getCategoryBudgets,
    setCategoryBudget,
    getBudgetStats,

    getRecurringTransactions,
    saveRecurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    recurringMonthlyEquivalent,

    calculateFinancialHealth,
    getSafeToSpend,
    generateSmartInsight,

    generateAlerts,
    getAlerts,

    getNotificationHistory,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotificationHistory,
    unreadNotificationCount,
    syncSmartNotifications,

    searchMoneyLeak,
    searchTransactions,
    searchGoals,

    exportData,
    importDataObject,
    resetAllData,

    refreshEverything
  };

  /* ============================================================
     START
     ============================================================ */

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
