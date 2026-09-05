/* =========================================================
   MONEYLEAK — PERSONAL FINANCE OS
   Application Engine
   Version 7.0
   ========================================================= */

(() => {

  "use strict";


  /* =========================================================
     STORAGE
     ========================================================= */

  const STORAGE = {

    transactions:
      "moneyLeakTransactions",

    savingsGoals:
      "moneyLeakSavingsGoals",

    legacySavingsGoal:
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

    initialized:
      "moneyLeakInitialized"

  };


  /* =========================================================
     DEFAULT SETTINGS
     ========================================================= */

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
      false

  };


  /* =========================================================
     CATEGORIES
     ========================================================= */

  const categories = [

    "Food",

    "Transport",

    "Shopping",

    "Bills",

    "Rent",

    "Entertainment",

    "Health",

    "Education",

    "Family",

    "Travel",

    "Subscriptions",

    "Personal",

    "Business",

    "Other"

  ];


  /* =========================================================
     INCOME SOURCES
     ========================================================= */

  const incomeSources = [

    "Salary",

    "Freelance",

    "Business",

    "Investment",

    "Gift",

    "Bonus",

    "Allowance",

    "Other"

  ];


  /* =========================================================
     SAFE STORAGE HELPERS
     ========================================================= */

  function readStorage(
    key,
    fallback
  ) {

    try {

      const value =
        localStorage.getItem(key);


      if (
        value === null
      ) {

        return fallback;

      }


      return JSON.parse(
        value
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
        JSON.stringify(value)
      );

      return true;

    } catch (
      error
    ) {

      console.error(
        "MoneyLeak storage write error:",
        key,
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


  /* =========================================================
     SETTINGS
     ========================================================= */

  function getSettings() {

    const stored =
      readStorage(
        STORAGE.settings,
        {}
      );


    return {

      ...DEFAULT_SETTINGS,

      ...(stored || {})

    };

  }


  function saveSettings(
    updates
  ) {

    const current =
      getSettings();


    const next = {

      ...current,

      ...(updates || {})

    };


    if (
      ![
        "NGN",
        "USD",
        "GBP",
        "EUR",
        "CAD",
        "AUD",
        "GHS",
        "KES",
        "ZAR"
      ].includes(
        next.currency
      )
    ) {

      next.currency =
        "NGN";

    }


    if (
      ![
        "light",
        "dark",
        "system"
      ].includes(
        next.theme
      )
    ) {

      next.theme =
        "light";

    }


    writeStorage(
      STORAGE.settings,
      next
    );


    applySettings(
      next
    );


    dispatchUpdate();


    return next;

  }


  function getResolvedTheme(
    theme
  ) {

    if (
      theme ===
      "system"
    ) {

      return window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
        ? "dark"
        : "light";

    }


    return theme ===
      "dark"
      ? "dark"
      : "light";

  }


  function applySettings(
    settings = getSettings()
  ) {

    const theme =
      getResolvedTheme(
        settings.theme
      );


    document.documentElement
      .setAttribute(
        "data-theme",
        theme
      );


    document.documentElement
      .style
      .colorScheme =
      theme;


    document
      .querySelectorAll(
        "[data-user-name]"
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
        ".profile-avatar"
      )
      .forEach(
        element => {

          const name =
            settings.name ||
            "My Money";

          element.textContent =
            name
              .trim()
              .charAt(0)
              .toUpperCase() ||
            "M";

        }
      );

  }


  /* =========================================================
     CURRENCY
     ========================================================= */

  const currencySymbols = {

    NGN: "₦",

    USD: "$",

    GBP: "£",

    EUR: "€",

    CAD: "CA$",

    AUD: "A$",

    GHS: "GH₵",

    KES: "KSh",

    ZAR: "R"

  };


  function getCurrencySymbol() {

    const currency =
      getSettings()
        .currency;


    return (
      currencySymbols[
        currency
      ] ||
      currency
    );

  }


  function displayCurrency(
    amount
  ) {

    const numeric =
      Number(amount) || 0;


    const settings =
      getSettings();


    const currency =
      settings.currency ||
      "NGN";


    const compact =
      settings.compactNumbers;


    if (
      compact &&
      Math.abs(numeric) >=
      1000000
    ) {

      return (
        getCurrencySymbol() +
        (
          numeric /
          1000000
        ).toFixed(1) +
        "M"
      );

    }


    if (
      compact &&
      Math.abs(numeric) >=
      1000
    ) {

      return (
        getCurrencySymbol() +
        (
          numeric /
          1000
        ).toFixed(1) +
        "K"
      );

    }


    try {

      return new Intl.NumberFormat(
        undefined,
        {
          style:
            "currency",

          currency,

          maximumFractionDigits:
            0

        }
      ).format(
        numeric
      );

    } catch (
      error
    ) {

      return (
        getCurrencySymbol() +
        numeric.toLocaleString()
      );

    }

  }


  function formatNumber(
    value
  ) {

    return (
      Number(value) ||
      0
    ).toLocaleString();

  }


  /* =========================================================
     DATE HELPERS
     ========================================================= */

  function getToday() {

    return new Date()
      .toISOString()
      .split("T")[0];

  }


  function parseDate(
    value
  ) {

    if (
      !value
    ) {

      return new Date();

    }


    const date =
      new Date(value);


    return isNaN(
      date.getTime()
    )
      ? new Date()
      : date;

  }


  function startOfMonth(
    date = new Date()
  ) {

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    );

  }


  function endOfMonth(
    date = new Date()
  ) {

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


  function getMonthKey(
    date
  ) {

    const d =
      parseDate(date);


    return `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;

  }


  function isThisMonth(
    date
  ) {

    const d =
      parseDate(date);

    const now =
      new Date();


    return (
      d.getFullYear() ===
        now.getFullYear() &&
      d.getMonth() ===
        now.getMonth()
    );

  }


  function addDays(
    date,
    days
  ) {

    const result =
      parseDate(date);


    result.setDate(
      result.getDate() +
      Number(days)
    );


    return result;

  }


  function addMonths(
    date,
    months
  ) {

    const result =
      parseDate(date);


    result.setMonth(
      result.getMonth() +
      Number(months)
    );


    return result;

  }


  /* =========================================================
     TRANSACTIONS
     ========================================================= */

  function normalizeTransaction(
    transaction
  ) {

    const item =
      transaction || {};


    const amount =
      Math.abs(
        Number(
          item.amount
        ) || 0
      );


    return {

      id:
        item.id ||
        `tx_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`,

      type:
        item.type === "income"
          ? "income"
          : "expense",

      amount,

      category:
        item.category ||
        (
          item.type ===
          "income"
            ? item.source ||
              "Other"
            : "Other"
        ),

      source:
        item.source ||
        "",

      description:
        item.description ||
        "",

      date:
        item.date ||
        getToday(),

      createdAt:
        item.createdAt ||
        new Date().toISOString()

    };

  }


  function getTransactions() {

    const data =
      readStorage(
        STORAGE.transactions,
        []
      );


    if (
      !Array.isArray(data)
    ) {

      return [];

    }


    return data
      .map(
        normalizeTransaction
      )
      .sort(
        (a, b) =>
          parseDate(b.date) -
          parseDate(a.date)
      );

  }


  function saveTransactions(
    transactions
  ) {

    writeStorage(
      STORAGE.transactions,
      transactions.map(
        normalizeTransaction
      )
    );


    dispatchUpdate();

  }


  function addTransaction(
    transaction
  ) {

    const transactions =
      getTransactions();


    const newTransaction =
      normalizeTransaction(
        transaction
      );


    transactions.unshift(
      newTransaction
    );


    saveTransactions(
      transactions
    );


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
        transaction =>
          String(
            transaction.id
          ) === String(id)
      );


    if (
      index === -1
    ) {

      return null;

    }


    transactions[index] =
      normalizeTransaction({

        ...transactions[index],

        ...(updates || {}),

        id:
          transactions[index].id

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


    const next =
      transactions.filter(
        transaction =>
          String(
            transaction.id
          ) !== String(id)
      );


    saveTransactions(
      next
    );


    return true;

  }


  function clearTransactions() {

    writeStorage(
      STORAGE.transactions,
      []
    );


    dispatchUpdate();

  }


  /* =========================================================
     TRANSACTION CALCULATIONS
     ========================================================= */

  function getIncome(
    transactions =
      getTransactions()
  ) {

    return transactions
      .filter(
        transaction =>
          transaction.type ===
          "income"
      )
      .reduce(
        (sum, transaction) =>
          sum +
          Number(
            transaction.amount
          ),
        0
      );

  }


  function getExpenses(
    transactions =
      getTransactions()
  ) {

    return transactions
      .filter(
        transaction =>
          transaction.type ===
          "expense"
      )
      .reduce(
        (sum, transaction) =>
          sum +
          Number(
            transaction.amount
          ),
        0
      );

  }


  function getBalance() {

    return (
      getIncome() -
      getExpenses()
    );

  }


  function getPeriodTransactions(
    period = "month",
    referenceDate = new Date()
  ) {

    const reference =
      parseDate(
        referenceDate
      );


    let start;
    let end;


    if (
      period ===
      "year"
    ) {

      start =
        new Date(
          reference.getFullYear(),
          0,
          1
        );

      end =
        new Date(
          reference.getFullYear(),
          11,
          31,
          23,
          59,
          59
        );

    } else if (
      period ===
      "quarter"
    ) {

      const quarter =
        Math.floor(
          reference.getMonth() / 3
        );


      start =
        new Date(
          reference.getFullYear(),
          quarter * 3,
          1
        );


      end =
        new Date(
          reference.getFullYear(),
          quarter * 3 + 3,
          0,
          23,
          59,
          59
        );

    } else {

      start =
        startOfMonth(
          reference
        );

      end =
        endOfMonth(
          reference
        );

    }


    return getTransactions()
      .filter(
        transaction => {

          const date =
            parseDate(
              transaction.date
            );


          return (
            date >= start &&
            date <= end
          );

        }
      );

  }


  function getCurrentMonthIncome() {

    return getIncome(
      getPeriodTransactions(
        "month"
      )
    );

  }


  function getCurrentMonthExpenses() {

    return getExpenses(
      getPeriodTransactions(
        "month"
      )
    );

  }


  function getCategoryTotals(
    transactions =
      getTransactions()
  ) {

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
            Number(
              transaction.amount
            );

        }
      );


    return totals;

  }


  function getTopCategories(
    transactions =
      getTransactions(),
    limit = 5
  ) {

    const totals =
      getCategoryTotals(
        transactions
      );


    return Object.entries(
      totals
    )
      .map(
        ([category, amount]) => ({
          category,
          amount
        })
      )
      .sort(
        (a, b) =>
          b.amount -
          a.amount
      )
      .slice(
        0,
        limit
      );

  }


  function getLargestExpense(
    transactions =
      getTransactions()
  ) {

    return (
      transactions
        .filter(
          transaction =>
            transaction.type ===
            "expense"
        )
        .sort(
          (a, b) =>
            b.amount -
            a.amount
        )[0] ||
      null
    );

  }


  function getLargestIncome(
    transactions =
      getTransactions()
  ) {

    return (
      transactions
        .filter(
          transaction =>
            transaction.type ===
            "income"
        )
        .sort(
          (a, b) =>
            b.amount -
            a.amount
        )[0] ||
      null
    );

  }


  /* =========================================================
     SAVINGS GOALS
     ========================================================= */

  function normalizeGoal(
    goal
  ) {

    const item =
      goal || {};


    return {

      id:
        item.id ||
        `goal_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`,

      name:
        item.name ||
        "New Goal",

      target:
        Math.max(
          0,
          Number(
            item.target
          ) || 0
        ),

      current:
        Math.max(
          0,
          Number(
            item.current
          ) || 0
        ),

      deadline:
        item.deadline ||
        "",

      color:
        item.color ||
        "#087a5a",

      description:
        item.description ||
        "",

      createdAt:
        item.createdAt ||
        new Date().toISOString()

    };

  }


  function getSavingsGoals() {

    let goals =
      readStorage(
        STORAGE.savingsGoals,
        null
      );


    if (
      !Array.isArray(goals)
    ) {

      goals = [];

    }


    /* -------------------------------------------------------
       Legacy migration
       ------------------------------------------------------- */

    if (
      goals.length === 0
    ) {

      const legacy =
        readStorage(
          STORAGE.legacySavingsGoal,
          null
        );


      if (
        legacy &&
        typeof legacy ===
        "object"
      ) {

        goals = [
          normalizeGoal({
            name:
              legacy.name ||
              "Savings Goal",

            target:
              legacy.target ||
              legacy.amount ||
              0,

            current:
              legacy.current ||
              legacy.saved ||
              0,

            deadline:
              legacy.deadline ||
              ""

          })
        ];


        writeStorage(
          STORAGE.savingsGoals,
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
      STORAGE.savingsGoals,
      goals.map(
        normalizeGoal
      )
    );


    dispatchUpdate();

  }


  function addSavingsGoal(
    goal
  ) {

    const goals =
      getSavingsGoals();


    const newGoal =
      normalizeGoal(
        goal
      );


    goals.push(
      newGoal
    );


    saveSavingsGoals(
      goals
    );


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
        goal =>
          String(goal.id) ===
          String(id)
      );


    if (
      index === -1
    ) {

      return null;

    }


    goals[index] =
      normalizeGoal({

        ...goals[index],

        ...(updates || {}),

        id:
          goals[index].id

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
      getSavingsGoals();


    saveSavingsGoals(
      goals.filter(
        goal =>
          String(goal.id) !==
          String(id)
      )
    );

  }


  function getGoalProgress(
    goal
  ) {

    if (
      !goal ||
      Number(goal.target) <=
      0
    ) {

      return 0;

    }


    return Math.min(
      100,
      Math.max(
        0,
        (
          Number(goal.current) /
          Number(goal.target)
        ) * 100
      )
    );

  }


  /* =========================================================
     BUDGETS
     ========================================================= */

  function getMonthlyBudget() {

    return Math.max(
      0,
      Number(
        readStorage(
          STORAGE.monthlyBudget,
          0
        )
      ) || 0
    );

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


    dispatchUpdate();


    return value;

  }


  function getCategoryBudgets() {

    const data =
      readStorage(
        STORAGE.categoryBudgets,
        {}
      );


    return (
      data &&
      typeof data ===
        "object"
        ? data
        : {}
    );

  }


  function setCategoryBudget(
    category,
    amount
  ) {

    const budgets =
      getCategoryBudgets();


    const value =
      Math.max(
        0,
        Number(amount) || 0
      );


    if (
      !category
    ) {

      return budgets;

    }


    if (
      value <= 0
    ) {

      delete budgets[
        category
      ];

    } else {

      budgets[
        category
      ] =
        value;

    }


    writeStorage(
      STORAGE.categoryBudgets,
      budgets
    );


    dispatchUpdate();


    return budgets;

  }


  /* =========================================================
     RECURRING TRANSACTIONS
     ========================================================= */

  function normalizeRecurring(
    item
  ) {

    const recurring =
      item || {};


    return {

      id:
        recurring.id ||
        `rec_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`,

      name:
        recurring.name ||
        "Recurring payment",

      amount:
        Math.abs(
          Number(
            recurring.amount
          ) || 0
        ),

      type:
        recurring.type ===
        "income"
          ? "income"
          : "expense",

      category:
        recurring.category ||
        "Other",

      frequency:
        recurring.frequency ||
        "monthly",

      nextDate:
        recurring.nextDate ||
        getToday(),

      description:
        recurring.description ||
        "",

      active:
        recurring.active !==
        false,

      createdAt:
        recurring.createdAt ||
        new Date().toISOString()

    };

  }


  function getRecurringTransactions() {

    const data =
      readStorage(
        STORAGE.recurring,
        []
      );


    if (
      !Array.isArray(data)
    ) {

      return [];

    }


    return data.map(
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


    dispatchUpdate();

  }


  function addRecurringTransaction(
    item
  ) {

    const items =
      getRecurringTransactions();


    const newItem =
      normalizeRecurring(
        item
      );


    items.push(
      newItem
    );


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
        item =>
          String(item.id) ===
          String(id)
      );


    if (
      index === -1
    ) {

      return null;

    }


    items[index] =
      normalizeRecurring({

        ...items[index],

        ...(updates || {}),

        id:
          items[index].id

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
        item =>
          String(item.id) !==
          String(id)
      )
    );

  }


  function getRecurringMonthlyAmount(
    item
  ) {

    const amount =
      Number(
        item?.amount
      ) || 0;


    switch (
      item?.frequency
    ) {

      case "weekly":

        return (
          amount *
          52 /
          12
        );

      case "yearly":

        return (
          amount /
          12
        );

      case "daily":

        return (
          amount *
          365 /
          12
        );

      default:

        return amount;

    }

  }


  function getMonthlyRecurringTotals() {

    const items =
      getRecurringTransactions()
        .filter(
          item =>
            item.active !==
            false
        );


    let income = 0;

    let expenses = 0;


    items.forEach(
      item => {

        const monthly =
          getRecurringMonthlyAmount(
            item
          );


        if (
          item.type ===
          "income"
        ) {

          income +=
            monthly;

        } else {

          expenses +=
            monthly;

        }

      }
    );


    return {

      income,

      expenses,

      net:
        income -
        expenses

    };

  }


  /* =========================================================
     FINANCIAL HEALTH
     ========================================================= */

  function calculateFinancialHealth() {

    const income =
      getCurrentMonthIncome();


    const expenses =
      getCurrentMonthExpenses();


    const budget =
      getMonthlyBudget();


    const savings =
      Math.max(
        0,
        income -
        expenses
      );


    let score =
      50;


    /* -------------------------------------------------------
       Savings
       ------------------------------------------------------- */

    if (
      income > 0
    ) {

      const savingsRate =
        (
          savings /
          income
        ) * 100;


      if (
        savingsRate >=
        30
      ) {

        score +=
          20;

      } else if (
        savingsRate >=
        20
      ) {

        score +=
          15;

      } else if (
        savingsRate >=
        10
      ) {

        score +=
          8;

      } else if (
        savingsRate > 0
      ) {

        score +=
          3;

      } else {

        score -=
          12;

      }

    }


    /* -------------------------------------------------------
       Spending
       ------------------------------------------------------- */

    if (
      income > 0
    ) {

      const ratio =
        expenses /
        income;


      if (
        ratio <=
        0.5
      ) {

        score +=
          15;

      } else if (
        ratio <=
        0.7
      ) {

        score +=
          8;

      } else if (
        ratio <=
        0.9
      ) {

        score +=
          2;

      } else {

        score -=
          15;

      }

    }


    /* -------------------------------------------------------
       Budget
       ------------------------------------------------------- */

    if (
      budget > 0
    ) {

      const usage =
        expenses /
        budget;


      if (
        usage <=
        0.7
      ) {

        score +=
          10;

      } else if (
        usage <=
        0.9
      ) {

        score +=
          5;

      } else if (
        usage <=
        1
      ) {

        score -=
          3;

      } else {

        score -=
          15;

      }

    } else {

      score -=
        3;

    }


    /* -------------------------------------------------------
       Recurring obligations
       ------------------------------------------------------- */

    const recurring =
      getMonthlyRecurringTotals();


    if (
      income > 0
    ) {

      const recurringRatio =
        recurring.expenses /
        income;


      if (
        recurringRatio <=
        0.2
      ) {

        score +=
          5;

      } else if (
        recurringRatio >
        0.5
      ) {

        score -=
          8;

      }

    }


    score =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(score)
        )
      );


    let status =
      "Building";


    let message =
      "Your financial picture is developing. Keep building good habits.";


    if (
      score >=
      85
    ) {

      status =
        "Excellent";

      message =
        "Your finances are in a strong position. Keep protecting your progress.";

    } else if (
      score >=
      70
    ) {

      status =
        "Healthy";

      message =
        "You're building a healthy financial foundation. Stay consistent.";

    } else if (
      score >=
      50
    ) {

      status =
        "Fair";

      message =
        "Your finances have room to improve. Focus on spending control and savings.";

    } else if (
      score >=
      30
    ) {

      status =
        "Needs attention";

      message =
        "Your spending is putting pressure on your financial position.";

    } else {

      status =
        "Critical";

      message =
        "Your expenses are significantly pressuring your finances. Take action quickly.";

    }


    return {

      score,

      status,

      message,

      income,

      expenses,

      savings,

      budget,

      recurringExpenses:
        recurring.expenses

    };

  }


  /* =========================================================
     SAFE TO SPEND
     ========================================================= */

  function getSafeToSpend() {

    const budget =
      getMonthlyBudget();


    const expenses =
      getCurrentMonthExpenses();


    const income =
      getCurrentMonthIncome();


    let safe;


    if (
      budget > 0
    ) {

      safe =
        Math.max(
          0,
          budget -
          expenses
        );

    } else {

      safe =
        Math.max(
          0,
          income -
          expenses
        );

    }


    return {

      amount:
        safe,

      hasBudget:
        budget > 0,

      budget,

      spent:
        expenses,

      income

    };

  }


  /* =========================================================
     SMART INSIGHTS
     ========================================================= */

  function generateSmartInsight() {

    const income =
      getCurrentMonthIncome();


    const expenses =
      getCurrentMonthExpenses();


    const balance =
      income -
      expenses;


    const budget =
      getMonthlyBudget();


    const top =
      getTopCategories(
        getPeriodTransactions(
          "month"
        ),
        1
      )[0];


    const goals =
      getSavingsGoals();


    if (
      income === 0 &&
      expenses === 0
    ) {

      return {
        title:
          "Your financial picture",

        text:
          "Add your first income or expense and MoneyLeak will start analyzing your finances.",

        type:
          "neutral"

      };

    }


    if (
      income > 0 &&
      expenses === 0
    ) {

      return {

        title:
          "Strong start",

        text:
          `You've recorded ${displayCurrency(income)} of income this month with no recorded expenses yet. Keep tracking everything so your picture stays accurate.`,

        type:
          "positive"

      };

    }


    if (
      income > 0 &&
      balance < 0
    ) {

      return {

        title:
          "Spending is ahead of income",

        text:
          `You've spent ${displayCurrency(expenses)} against ${displayCurrency(income)} of income this month. Your first priority should be reducing unnecessary spending.`,

        type:
          "warning"

      };

    }


    if (
      budget > 0 &&
      expenses >
      budget
    ) {

      return {

        title:
          "Budget alert",

        text:
          `You've exceeded your monthly budget by ${displayCurrency(expenses - budget)}. Review your largest spending category before making more discretionary purchases.`,

        type:
          "warning"

      };

    }


    if (
      top &&
      top.amount > 0
    ) {

      const percentage =
        expenses > 0
          ? (
              top.amount /
              expenses
            ) * 100
          : 0;


      if (
        percentage >=
        35
      ) {

        return {

          title:
            "A major spending leak stands out",

          text:
            `${top.category} accounts for about ${Math.round(percentage)}% of your spending this month. This is the first category worth reviewing.`,

          type:
            "warning"

        };

      }

    }


    if (
      goals.length > 0 &&
      balance > 0
    ) {

      return {

        title:
          "You have room to build",

        text:
          `Your current monthly cash flow is positive by ${displayCurrency(balance)}. Consider directing part of that surplus toward your savings goals.`,

        type:
          "positive"

      };

    }


    if (
      balance > 0
    ) {

      return {

        title:
          "Positive cash flow",

        text:
          `You're currently ahead by ${displayCurrency(balance)} this month. Protect that surplus instead of letting it disappear into unnecessary spending.`,

        type:
          "positive"

      };

    }


    return {

      title:
        "Keep tracking",

      text:
        "The more consistently you record your money, the more useful MoneyLeak's financial intelligence becomes.",

      type:
        "neutral"

    };

  }


  /* =========================================================
     SMART ALERTS
     ========================================================= */

  function generateAlerts() {

    const alerts = [];


    const income =
      getCurrentMonthIncome();


    const expenses =
      getCurrentMonthExpenses();


    const budget =
      getMonthlyBudget();


    const goals =
      getSavingsGoals();


    const health =
      calculateFinancialHealth();


    const recurring =
      getMonthlyRecurringTotals();


    /* -------------------------------------------------------
       Budget
       ------------------------------------------------------- */

    if (
      budget > 0
    ) {

      const usage =
        (
          expenses /
          budget
        ) * 100;


      if (
        usage >=
        100
      ) {

        alerts.push({

          type:
            "danger",

          title:
            "Budget exceeded",

          message:
            `You've exceeded your monthly budget by ${displayCurrency(expenses - budget)}.`

        });

      } else if (
        usage >=
        85
      ) {

        alerts.push({

          type:
            "warning",

          title:
            "Budget almost reached",

          message:
            `${Math.round(usage)}% of your monthly budget has already been used.`

        });

      }

    }


    /* -------------------------------------------------------
       Negative cash flow
       ------------------------------------------------------- */

    if (
      income > 0 &&
      expenses > income
    ) {

      alerts.push({

        type:
          "danger",

        title:
          "Negative cash flow",

        message:
          `Expenses are ${displayCurrency(expenses - income)} higher than income this month.`

      });

    }


    /* -------------------------------------------------------
       Large expense
       ------------------------------------------------------- */

    const largest =
      getLargestExpense(
        getPeriodTransactions(
          "month"
        )
      );


    if (
      largest &&
      income > 0 &&
      largest.amount >=
      income * 0.25
    ) {

      alerts.push({

        type:
          "warning",

        title:
          "Large expense detected",

        message:
          `${largest.description || largest.category || "An expense"} represents a significant portion of this month's income.`

      });

    }


    /* -------------------------------------------------------
       Savings goals
       ------------------------------------------------------- */

    goals.forEach(
      goal => {

        const progress =
          getGoalProgress(
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
              "Savings goal reached",

            message:
              `${goal.name} has reached its target.`

          });

        }

      }
    );


    /* -------------------------------------------------------
       Recurring pressure
       ------------------------------------------------------- */

    if (
      income > 0 &&
      recurring.expenses >
      income * 0.4
    ) {

      alerts.push({

        type:
          "warning",

        title:
          "Recurring costs are high",

        message:
          `Recurring expenses represent more than 40% of your current monthly income.`

      });

    }


    /* -------------------------------------------------------
       Positive health
       ------------------------------------------------------- */

    if (
      health.score >=
      80 &&
      income > 0
    ) {

      alerts.push({

        type:
          "success",

        title:
          "Financial health is strong",

        message:
          `Your MoneyLeak health score is ${health.score}/100. Keep your current habits consistent.`

      });

    }


    writeStorage(
      STORAGE.alerts,
      alerts
    );


    return alerts;

  }


  /* =========================================================
     DASHBOARD HELPERS
     ========================================================= */

  function setText(
    id,
    value
  ) {

    const element =
      document.getElementById(
        id
      );


    if (
      element
    ) {

      element.textContent =
        value;

    }

  }


  function setWidth(
    id,
    percentage
  ) {

    const element =
      document.getElementById(
        id
      );


    if (
      element
    ) {

      element.style.width =
        `${Math.max(
          0,
          Math.min(
            100,
            Number(
              percentage
            ) || 0
          )
        )}%`;

    }

  }


  function renderDashboard() {

    const transactions =
      getTransactions();


    const monthTransactions =
      getPeriodTransactions(
        "month"
      );


    const income =
      getIncome(
        monthTransactions
      );


    const expenses =
      getExpenses(
        monthTransactions
      );


    const cashFlow =
      income -
      expenses;


    const balance =
      getBalance();


    const savingsRate =
      income > 0
        ? Math.max(
            0,
            Math.round(
              (
                cashFlow /
                income
              ) * 100
            )
          )
        : 0;


    const goals =
      getSavingsGoals();


    const totalTarget =
      goals.reduce(
        (sum, goal) =>
          sum +
          Number(
            goal.target
          ),
        0
      );


    const totalSaved =
      goals.reduce(
        (sum, goal) =>
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
          ) * 100
        : 0;


    /* -------------------------------------------------------
       Greeting
       ------------------------------------------------------- */

    renderGreeting();


    /* -------------------------------------------------------
       Overview
       ------------------------------------------------------- */

    setText(
      "overviewBalance",
      displayCurrency(
        balance
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
      `${savingsRate}%`
    );


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


    const health =
      calculateFinancialHealth();


    setText(
      "overviewHealthScore",
      `${health.score}/100`
    );


    setText(
      "overviewHealthStatus",
      health.status
    );


    /* -------------------------------------------------------
       Cash flow
       ------------------------------------------------------- */

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


    /* -------------------------------------------------------
       Smart insight
       ------------------------------------------------------- */

    const insight =
      generateSmartInsight();


    setText(
      "overviewInsightText",
      insight.text
    );


    /* -------------------------------------------------------
       Budget
       ------------------------------------------------------- */

    const budget =
      getMonthlyBudget();


    const budgetUsage =
      budget > 0
        ? (
            expenses /
            budget
          ) * 100
        : 0;


    const budgetRemaining =
      budget -
      expenses;


    setText(
      "dashboardBudgetPercent",
      budget > 0
        ? `${Math.round(
            budgetUsage
          )}%`
        : "Not set"
    );


    setWidth(
      "dashboardBudgetFill",
      budgetUsage
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
        Math.max(
          0,
          budgetRemaining
        )
      )
    );


    setText(
      "dashboardBudgetLimit",
      displayCurrency(
        budget
      )
    );


    /* -------------------------------------------------------
       Safe to spend
       ------------------------------------------------------- */

    const safe =
      getSafeToSpend();


    setText(
      "safeToSpendDashboard",
      displayCurrency(
        safe.amount
      )
    );


    setText(
      "safeToSpendMessage",
      safe.hasBudget
        ? "Remaining from your monthly budget"
        : "Based on this month's recorded cash flow"
    );


    setText(
      "safeToSpendAdvice",
      safe.amount > 0
        ? "You have room to spend, but keep your savings goals in mind."
        : "Pause discretionary spending until your cash flow improves."
    );


    /* -------------------------------------------------------
       Recent transactions
       ------------------------------------------------------- */

    renderRecentTransactions(
      transactions
    );


    /* -------------------------------------------------------
       Top categories
       ------------------------------------------------------- */

    renderTopSpendingCategories(
      monthTransactions
    );


    /* -------------------------------------------------------
       Goals
       ------------------------------------------------------- */

    renderDashboardGoals(
      goals
    );


    /* -------------------------------------------------------
       Health
       ------------------------------------------------------- */

    renderHealth(
      health
    );


    /* -------------------------------------------------------
       Alerts
       ------------------------------------------------------- */

    renderDashboardAlerts();

  }


  function renderGreeting() {

    const element =
      document.getElementById(
        "dashboardGreeting"
      );


    if (
      !element
    ) {

      return;

    }


    const hour =
      new Date().getHours();


    let greeting =
      "Good evening";


    if (
      hour < 12
    ) {

      greeting =
        "Good morning";

    } else if (
      hour < 17
    ) {

      greeting =
        "Good afternoon";

    }


    const name =
      getSettings().name ||
      "there";


    element.textContent =
      `${greeting}, ${name}`;

  }


  function renderRecentTransactions(
    transactions
  ) {

    const container =
      document.getElementById(
        "recentTransactions"
      );


    if (
      !container
    ) {

      return;

    }


    const recent =
      transactions.slice(
        0,
        6
      );


    if (
      recent.length ===
      0
    ) {

      container.innerHTML = `

        <div class="empty-state">

          <strong>
            No transactions yet
          </strong>

          <span>
            Add income or expenses to start building your financial picture.
          </span>

        </div>

      `;

      return;

    }


    container.innerHTML =
      recent.map(
        transaction => {

          const income =
            transaction.type ===
            "income";


          return `

            <div class="transaction-row">

              <div class="transaction-icon ${
                income
                  ? "income"
                  : "expense"
              }">

                ${
                  income
                    ? "↗"
                    : "↘"
                }

              </div>

              <div class="transaction-info">

                <strong>
                  ${
                    escapeHTML(
                      transaction.description ||
                      transaction.category ||
                      "Transaction"
                    )
                  }
                </strong>

                <span>
                  ${
                    escapeHTML(
                      transaction.category ||
                      transaction.source ||
                      ""
                    )
                  }
                  ·
                  ${
                    formatDate(
                      transaction.date
                    )
                  }
                </span>

              </div>

              <div class="transaction-amount ${
                income
                  ? "income"
                  : "expense"
              }">

                ${
                  income
                    ? "+"
                    : "-"
                }${displayCurrency(
                  transaction.amount
                )}

              </div>

            </div>

          `;

        }
      )
      .join("");

  }


  function renderTopSpendingCategories(
    transactions
  ) {

    const container =
      document.getElementById(
        "topSpendingCategories"
      );


    if (
      !container
    ) {

      return;

    }


    const top =
      getTopCategories(
        transactions,
        5
      );


    if (
      top.length ===
      0
    ) {

      container.innerHTML = `

        <div class="empty-state">

          <strong>
            No spending data yet
          </strong>

          <span>
            Your biggest spending categories will appear here.
          </span>

        </div>

      `;

      return;

    }


    const total =
      top.reduce(
        (sum, item) =>
          sum +
          item.amount,
        0
      );


    container.innerHTML =
      top.map(
        item => {

          const percentage =
            total > 0
              ? (
                  item.amount /
                  total
                ) * 100
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

              <div class="category-bar">

                <div
                  class="category-bar-fill"
                  style="width:${Math.min(
                    100,
                    percentage
                  )}%"
                ></div>

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


    if (
      !container
    ) {

      return;

    }


    if (
      goals.length ===
      0
    ) {

      container.innerHTML = `

        <div class="empty-state">

          <strong>
            No savings goals yet
          </strong>

          <span>
            Create a goal and MoneyLeak will track your progress.
          </span>

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

                <div class="progress-bar">

                  <div
                    class="progress-fill"
                    style="width:${progress}%"
                  ></div>

                </div>

                <div class="goal-row-bottom">

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

          }
        )
        .join("");

  }


  function renderHealth(
    health
  ) {

    setText(
      "healthScore",
      `${health.score}/100`
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


    const incomeFactor =
      health.income > 0
        ? Math.min(
            100,
            (
              health.savings /
              health.income
            ) * 100 * 2
          )
        : 0;


    const budgetFactor =
      health.budget > 0
        ? Math.max(
            0,
            100 -
              (
                health.expenses /
                health.budget
              ) * 100
          )
        : 50;


    const savingsFactor =
      health.income > 0
        ? Math.min(
            100,
            (
              health.savings /
              health.income
            ) * 100 * 2
          )
        : 0;


    const recurringFactor =
      health.income > 0
        ? Math.max(
            0,
            100 -
              (
                health.recurringExpenses /
                health.income
              ) * 100
          )
        : 50;


    setText(
      "healthIncomeFactor",
      `${Math.round(
        incomeFactor
      )}%`
    );


    setWidth(
      "healthIncomeBar",
      incomeFactor
    );


    setText(
      "healthBudgetFactor",
      `${Math.round(
        budgetFactor
      )}%`
    );


    setWidth(
      "healthBudgetBar",
      budgetFactor
    );


    setText(
      "healthSavingsFactor",
      `${Math.round(
        savingsFactor
      )}%`
    );


    setWidth(
      "healthSavingsBar",
      savingsFactor
    );


    setText(
      "healthRecurringFactor",
      `${Math.round(
        recurringFactor
      )}%`
    );


    setWidth(
      "healthRecurringBar",
      recurringFactor
    );


    setText(
      "healthInsight",
      health.score >= 70
        ? "Your current financial habits are moving in the right direction."
        : "Focus on lowering unnecessary spending and increasing the amount you keep each month."
    );

  }


  function renderDashboardAlerts() {

    const container =
      document.getElementById(
        "financialAlerts"
      );


    if (
      !container
    ) {

      return;

    }


    const alerts =
      generateAlerts();


    if (
      alerts.length ===
      0
    ) {

      container.innerHTML = `

        <div class="empty-state">

          <strong>
            No major alerts
          </strong>

          <span>
            MoneyLeak will surface important changes here.
          </span>

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

            <div class="alert-item ${alert.type}">

              <div class="alert-icon">
                ${
                  alert.type ===
                  "danger"
                    ? "!"
                    : alert.type ===
                      "warning"
                      ? "⚠"
                      : "✓"
                }
              </div>

              <div class="alert-content">

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

          `
        )
        .join("");

  }


  /* =========================================================
     SEARCH — SMART SEARCH SYSTEM
     ========================================================= */

  function setupSearch() {

    const overlay =
      document.getElementById(
        "searchOverlay"
      );


    const closeButton =
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
      !overlay ||
      !input ||
      !results
    ) {

      return;

    }


    /* =======================================================
       PAGES
       ======================================================= */

    const pages = [

      {
        title:
          "Dashboard",

        description:
          "See your complete financial picture",

        icon:
          "⌂",

        keywords:
          "dashboard home overview balance money",

        url:
          "index.html"

      },

      {
        title:
          "Income",

        description:
          "Add and manage your income",

        icon:
          "↗",

        keywords:
          "income salary freelance money earnings",

        url:
          "income.html"

      },

      {
        title:
          "Expenses",

        description:
          "Track spending and find money leaks",

        icon:
          "↘",

        keywords:
          "expenses spending costs purchases leaks",

        url:
          "expenses.html"

      },

      {
        title:
          "Savings Goals",

        description:
          "Create and track your financial goals",

        icon:
          "◎",

        keywords:
          "savings goals target save saving wealth",

        url:
          "savings.html"

      },

      {
        title:
          "Budgets",

        description:
          "Control your monthly and category budgets",

        icon:
          "▣",

        keywords:
          "budget budgets spending limit limits",

        url:
          "budgets.html"

      },

      {
        title:
          "Recurring",

        description:
          "Manage bills, subscriptions and recurring money",

        icon:
          "↻",

        keywords:
          "recurring bills subscriptions rent payments",

        url:
          "recurring.html"

      },

      {
        title:
          "Analytics",

        description:
          "Understand your financial performance",

        icon:
          "◉",

        keywords:
          "analytics reports charts trends performance",

        url:
          "analytics.html"

      },

      {
        title:
          "Settings",

        description:
          "Manage your MoneyLeak preferences",

        icon:
          "⚙",

        keywords:
          "settings preferences currency theme profile",

        url:
          "settings.html"

      }

    ];


    /* =======================================================
       QUICK ACTIONS
       ======================================================= */

    const suggestions = [

      {
        title:
          "Add income",

        description:
          "Record money you've received",

        icon:
          "↗",

        action:
          "income.html"

      },

      {
        title:
          "Add expense",

        description:
          "Record something you spent money on",

        icon:
          "↘",

        action:
          "expenses.html"

      },

      {
        title:
          "Create savings goal",

        description:
          "Start saving toward something important",

        icon:
          "◎",

        action:
          "savings.html"

      },

      {
        title:
          "Set a budget",

        description:
          "Give your money a spending limit",

        icon:
          "▣",

        action:
          "budgets.html"

      },

      {
        title:
          "View analytics",

        description:
          "Understand where your money is going",

        icon:
          "◉",

        action:
          "analytics.html"

      },

      {
        title:
          "Manage recurring payments",

        description:
          "Track subscriptions, bills and regular income",

        icon:
          "↻",

        action:
          "recurring.html"

      }

    ];


    /* =======================================================
       MONEY QUESTIONS
       ======================================================= */

    const smartQuestions = [

      {
        title:
          "Where am I spending the most?",

        description:
          "Find your biggest spending categories",

        icon:
          "⌕",

        keywords:
          "spending most biggest category expenses"

      },

      {
        title:
          "Show my largest expenses",

        description:
          "Find your most expensive transactions",

        icon:
          "↘",

        keywords:
          "largest expense expensive spending"

      },

      {
        title:
          "How much am I saving?",

        description:
          "Review your savings progress",

        icon:
          "◎",

        keywords:
          "saving savings saved progress"

      },

      {
        title:
          "Show my recent transactions",

        description:
          "Review your latest money activity",

        icon:
          "↻",

        keywords:
          "recent transactions latest activity"

      },

      {
        title:
          "How is my financial health?",

        description:
          "Review your MoneyLeak financial health",

        icon:
          "✦",

        keywords:
          "health score financial health"

      }

    ];


    /* =======================================================
       OPEN
       ======================================================= */

    function openSearch() {

      overlay.hidden =
        false;


      overlay.classList.add(
        "open"
      );


      overlay.classList.add(
        "active"
      );


      document.body.classList.add(
        "search-open"
      );


      input.value =
        "";


      renderSuggestions();


      setTimeout(
        () => {

          input.focus();

        },
        50
      );

    }


    /* =======================================================
       CLOSE
       ======================================================= */

    function closeSearch() {

      overlay.classList.remove(
        "open"
      );


      overlay.classList.remove(
        "active"
      );


      overlay.hidden =
        true;


      document.body.classList.remove(
        "search-open"
      );


      input.value =
        "";

    }


    /* =======================================================
       DEFAULT SUGGESTIONS
       ======================================================= */

    function renderSuggestions() {

      results.innerHTML = `

        <div class="search-section-label">
          QUICK ACTIONS
        </div>

        <div class="search-suggestion-grid">

          ${suggestions
            .map(
              item => `

                <button
                  type="button"
                  class="search-suggestion"
                  data-search-action="${item.action}"
                >

                  <span class="search-suggestion-icon">
                    ${item.icon}
                  </span>

                  <span class="search-suggestion-text">

                    <strong>
                      ${item.title}
                    </strong>

                    <small>
                      ${item.description}
                    </small>

                  </span>

                  <span class="search-arrow">
                    →
                  </span>

                </button>

              `
            )
            .join("")}

        </div>


        <div class="search-section-label">
          MONEY QUESTIONS
        </div>

        <div class="search-smart-list">

          ${smartQuestions
            .map(
              item => `

                <button
                  type="button"
                  class="search-smart-item"
                  data-smart-search="${item.title}"
                >

                  <span class="search-smart-icon">
                    ${item.icon}
                  </span>

                  <span>

                    <strong>
                      ${item.title}
                    </strong>

                    <small>
                      ${item.description}
                    </small>

                  </span>

                  <span class="search-arrow">
                    →
                  </span>

                </button>

              `
            )
            .join("")}

        </div>

      `;


      bindSuggestionButtons();

    }


    /* =======================================================
       SEARCH
       ======================================================= */

    function performSearch(
      query
    ) {

      const clean =
        String(query || "")
          .trim()
          .toLowerCase();


      if (
        !clean
      ) {

        renderSuggestions();

        return;

      }


      const pageResults =
        pages.filter(
          page =>
            (
              page.title +
              " " +
              page.description +
              " " +
              page.keywords
            )
              .toLowerCase()
              .includes(
                clean
              )
        );


      const questionResults =
        smartQuestions.filter(
          item =>
            (
              item.title +
              " " +
              item.description +
              " " +
              item.keywords
            )
              .toLowerCase()
              .includes(
                clean
              )
        );


      const transactionResults =
        searchTransactions(
          clean
        );


      let html =
        "";


      /* -------------------------------------------------------
         PAGES
         ------------------------------------------------------- */

      if (
        pageResults.length
      ) {

        html += `

          <div class="search-section-label">
            MONEY LEAK PAGES
          </div>

          <div class="search-result-list">

            ${pageResults
              .map(
                page => `

                  <button
                    type="button"
                    class="search-result-item"
                    data-search-action="${page.url}"
                  >

                    <span class="search-result-icon">
                      ${page.icon}
                    </span>

                    <span class="search-result-text">

                      <strong>
                        ${page.title}
                      </strong>

                      <small>
                        ${page.description}
                      </small>

                    </span>

                    <span class="search-arrow">
                      →
                    </span>

                  </button>

                `
              )
              .join("")}

          </div>

        `;

      }


      /* -------------------------------------------------------
         SMART QUESTIONS
         ------------------------------------------------------- */

      if (
        questionResults.length
      ) {

        html += `

          <div class="search-section-label">
            SMART SUGGESTIONS
          </div>

          <div class="search-smart-list">

            ${questionResults
              .map(
                item => `

                  <button
                    type="button"
                    class="search-smart-item"
                    data-smart-search="${item.title}"
                  >

                    <span class="search-smart-icon">
                      ${item.icon}
                    </span>

                    <span>

                      <strong>
                        ${item.title}
                      </strong>

                      <small>
                        ${item.description}
                      </small>

                    </span>

                    <span class="search-arrow">
                      →
                    </span>

                  </button>

                `
              )
              .join("")}

          </div>

        `;

      }


      /* -------------------------------------------------------
         TRANSACTIONS
         ------------------------------------------------------- */

      if (
        transactionResults.length
      ) {

        html += `

          <div class="search-section-label">
            TRANSACTIONS
          </div>

          <div class="search-result-list">

            ${transactionResults
              .slice(
                0,
                8
              )
              .map(
                transaction => {

                  const income =
                    transaction.type ===
                    "income";


                  return `

                    <div class="search-transaction-result">

                      <span class="search-result-icon">

                        ${
                          income
                            ? "↗"
                            : "↘"
                        }

                      </span>

                      <span class="search-result-text">

                        <strong>
                          ${
                            escapeHTML(
                              transaction.description ||
                              transaction.category ||
                              (
                                income
                                  ? "Income"
                                  : "Expense"
                              )
                            )
                          }
                        </strong>

                        <small>
                          ${
                            escapeHTML(
                              transaction.category ||
                              transaction.source ||
                              ""
                            )
                          }
                          ·
                          ${
                            formatDate(
                              transaction.date
                            )
                          }
                        </small>

                      </span>

                      <strong class="${
                        income
                          ? "search-income"
                          : "search-expense"
                      }">

                        ${
                          income
                            ? "+"
                            : "-"
                        }${displayCurrency(
                          transaction.amount
                        )}

                      </strong>

                    </div>

                  `;

                }
              )
              .join("")}

          </div>

        `;

      }


      /* -------------------------------------------------------
         NO RESULTS
         ------------------------------------------------------- */

      if (
        !html
      ) {

        html = `

          <div class="search-no-results">

            <div class="search-no-results-icon">
              ⌕
            </div>

            <strong>
              Nothing found
            </strong>

            <p>
              Try searching for a page, transaction,
              category or financial question.
            </p>

            <div class="search-example">

              Try:
              <span>expenses</span>
              <span>savings</span>
              <span>income</span>
              <span>budget</span>

            </div>

          </div>

        `;

      }


      results.innerHTML =
        html;


      bindSuggestionButtons();

    }


    /* =======================================================
       TRANSACTION SEARCH
       ======================================================= */

    function searchTransactions(
      query
    ) {

      return getTransactions()
        .filter(
          transaction => {

            const searchable =
              [

                transaction.description,

                transaction.category,

                transaction.source,

                transaction.amount,

                transaction.date,

                transaction.type

              ]
                .filter(
                  Boolean
                )
                .join(" ")
                .toLowerCase();


            return searchable.includes(
              query
            );

          }
        );

    }


    /* =======================================================
       BUTTON BINDING
       ======================================================= */

    function bindSuggestionButtons() {

      results
        .querySelectorAll(
          "[data-search-action]"
        )
        .forEach(
          button => {

            button.addEventListener(
              "click",
              () => {

                const url =
                  button.dataset
                    .searchAction;


                if (
                  url
                ) {

                  window.location.href =
                    url;

                }

              }
            );

          }
        );


      results
        .querySelectorAll(
          "[data-smart-search]"
        )
        .forEach(
          button => {

            button.addEventListener(
              "click",
              () => {

                const query =
                  button.dataset
                    .smartSearch;


                input.value =
                  query;


                performSearch(
                  query
                );

              }
            );

          }
        );

    }


    /* =======================================================
       INPUT
       ======================================================= */

    input.addEventListener(
      "input",
      () => {

        performSearch(
          input.value
        );

      }
    );


    /* =======================================================
       CLOSE
       ======================================================= */

    closeButton?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        event.stopPropagation();

        closeSearch();

      }
    );


    /* =======================================================
       OUTSIDE CLICK
       ======================================================= */

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


    /* =======================================================
       KEYBOARD
       ======================================================= */

    document.addEventListener(
      "keydown",
      event => {

        if (
          (
            event.metaKey ||
            event.ctrlKey
          ) &&
          event.key.toLowerCase() ===
          "k"
        ) {

          event.preventDefault();

          openSearch();

        }


        if (
          event.key ===
          "Escape" &&
          !overlay.hidden
        ) {

          closeSearch();

        }

      }
    );


    /* =======================================================
       SEARCH BUTTONS
       ======================================================= */

    document
      .querySelectorAll(
        "[data-open-search]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            openSearch
          );

        }
      );


    window.MoneyLeak.openSearch =
      openSearch;


    window.MoneyLeak.closeSearch =
      closeSearch;


    overlay.hidden =
      true;

  }


  /* =========================================================
     NOTIFICATIONS
     ========================================================= */

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

        if (
          list
        ) {

          list.innerHTML = `

            <div class="notification-empty">

              <strong>
                Notifications are off
              </strong>

              <span>
                Turn them on in Settings to receive financial alerts.
              </span>

            </div>

          `;

        }

        return;

      }


      const alerts =
        generateAlerts();


      if (
        !list
      ) {

        return;

      }


      if (
        alerts.length ===
        0
      ) {

        list.innerHTML = `

          <div class="notification-empty">

            <strong>
              You're all caught up
            </strong>

            <span>
              No important alerts right now.
            </span>

          </div>

        `;

        return;

      }


      list.innerHTML =
        alerts
          .map(
            alert => `

              <div class="notification-item ${alert.type}">

                <div class="notification-item-icon">

                  ${
                    alert.type ===
                    "danger"
                      ? "!"
                      : alert.type ===
                        "warning"
                        ? "⚠"
                        : "✓"
                  }

                </div>

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

            `
          )
          .join("");

    }


    function open() {

      render();

      panel.classList.add(
        "open"
      );

    }


    function closePanel() {

      panel.classList.remove(
        "open"
      );

    }


    button?.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        if (
          panel.classList.contains(
            "open"
          )
        ) {

          closePanel();

        } else {

          open();

        }

      }
    );


    close?.addEventListener(
      "click",
      closePanel
    );


    document.addEventListener(
      "click",
      event => {

        if (
          panel.classList.contains(
            "open"
          ) &&
          !panel.contains(
            event.target
          ) &&
          event.target !==
          button
        ) {

          closePanel();

        }

      }
    );


    window.MoneyLeak.openNotifications =
      open;


    window.MoneyLeak.closeNotifications =
      closePanel;

  }


  /* =========================================================
     MOBILE NAVIGATION
     ========================================================= */

  function setupMobileNavigation() {

    const button =
      document.getElementById(
        "mobileMenuButton"
      );


    const overlay =
      document.getElementById(
        "mobileOverlay"
      );


    const sidebar =
      document.querySelector(
        ".sidebar"
      );


    if (
      !button ||
      !sidebar
    ) {

      return;

    }


    function open() {

      sidebar.classList.add(
        "open"
      );


      overlay?.classList.add(
        "open"
      );


      document.body.classList.add(
        "menu-open"
      );

    }


    function close() {

      sidebar.classList.remove(
        "open"
      );


      overlay?.classList.remove(
        "open"
      );


      document.body.classList.remove(
        "menu-open"
      );

    }


    button.addEventListener(
      "click",
      open
    );


    overlay?.addEventListener(
      "click",
      close
    );


    sidebar
      .querySelectorAll(
        "a"
      )
      .forEach(
        link => {

          link.addEventListener(
            "click",
            close
          );

        }
      );


    window.MoneyLeak.openMobileMenu =
      open;


    window.MoneyLeak.closeMobileMenu =
      close;

  }


  /* =========================================================
     ACTIVE NAVIGATION
     ========================================================= */

  function setupActiveNavigation() {

    const current =
      location.pathname
        .split("/")
        .pop() ||
      "index.html";


    document
      .querySelectorAll(
        ".sidebar a"
      )
      .forEach(
        link => {

          const href =
            link
              .getAttribute(
                "href"
              )
              ?.split("/")
              .pop();


          if (
            href ===
            current
          ) {

            link.classList.add(
              "active"
            );

          }

        }
      );

  }


  /* =========================================================
     QUICK ACTIONS
     ========================================================= */

  function setupQuickActions() {

    document
      .querySelectorAll(
        "[data-quick-action]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              const action =
                button.dataset
                  .quickAction;


              if (
                action ===
                "income"
              ) {

                window.location.href =
                  "income.html";

              }


              if (
                action ===
                "expense"
              ) {

                window.location.href =
                  "expenses.html";

              }


              if (
                action ===
                "goal"
              ) {

                window.location.href =
                  "savings.html";

              }


              if (
                action ===
                "budget"
              ) {

                window.location.href =
                  "budgets.html";

              }

            }
          );

        }
      );

  }


  /* =========================================================
     GREETING
     ========================================================= */

  function setupGreeting() {

    renderGreeting();

  }


  /* =========================================================
     UPDATE EVENT
     ========================================================= */

  function dispatchUpdate() {

    window.dispatchEvent(
      new CustomEvent(
        "moneyLeakUpdated"
      )
    );

  }


  /* =========================================================
     DATE DISPLAY
     ========================================================= */

  function formatDate(
    date
  ) {

    const d =
      parseDate(date);


    return d.toLocaleDateString(
      undefined,
      {
        day:
          "numeric",

        month:
          "short",

        year:
          "numeric"

      }
    );

  }


  /* =========================================================
     HTML SAFETY
     ========================================================= */

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


  /* =========================================================
     DATA EXPORT
     ========================================================= */

  function exportData() {

    const data = {

      version:
        "7.0",

      exportedAt:
        new Date().toISOString(),

      transactions:
        getTransactions(),

      savingsGoals:
        getSavingsGoals(),

      monthlyBudget:
        getMonthlyBudget(),

      categoryBudgets:
        getCategoryBudgets(),

      recurringTransactions:
        getRecurringTransactions(),

      settings:
        getSettings()

    };


    return data;

  }


  /* =========================================================
     DATA IMPORT
     ========================================================= */

  function importData(
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

      writeStorage(
        STORAGE.transactions,
        data.transactions.map(
          normalizeTransaction
        )
      );

    }


    if (
      Array.isArray(
        data.savingsGoals
      )
    ) {

      writeStorage(
        STORAGE.savingsGoals,
        data.savingsGoals.map(
          normalizeGoal
        )
      );

    }


    if (
      typeof data.monthlyBudget ===
      "number"
    ) {

      writeStorage(
        STORAGE.monthlyBudget,
        Math.max(
          0,
          data.monthlyBudget
        )
      );

    }


    if (
      data.categoryBudgets &&
      typeof data.categoryBudgets ===
      "object"
    ) {

      writeStorage(
        STORAGE.categoryBudgets,
        data.categoryBudgets
      );

    }


    if (
      Array.isArray(
        data.recurringTransactions
      )
    ) {

      writeStorage(
        STORAGE.recurring,
        data.recurringTransactions.map(
          normalizeRecurring
        )
      );

    }


    if (
      data.settings &&
      typeof data.settings ===
      "object"
    ) {

      saveSettings(
        data.settings
      );

    }


    localStorage.setItem(
      STORAGE.initialized,
      "true"
    );


    dispatchUpdate();


    return true;

  }


  /* =========================================================
     RESET ALL DATA
     ========================================================= */

  function resetAllData() {

    Object.values(
      STORAGE
    ).forEach(
      key => {

        removeStorage(
          key
        );

      }
    );


    dispatchUpdate();

  }


  /* =========================================================
     SEARCH DATA API
     ========================================================= */

  function search(
    query
  ) {

    const clean =
      String(query || "")
        .trim()
        .toLowerCase();


    if (
      !clean
    ) {

      return [];

    }


    return getTransactions()
      .filter(
        transaction => {

          const text =
            [

              transaction.description,

              transaction.category,

              transaction.source,

              transaction.type,

              transaction.amount,

              transaction.date

            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLowerCase();


          return text.includes(
            clean
          );

        }
      );

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
        STORAGE.transactions,
        getTransactions()
      );


      writeStorage(
        STORAGE.savingsGoals,
        getSavingsGoals()
      );


      writeStorage(
        STORAGE.categoryBudgets,
        getCategoryBudgets()
      );


      writeStorage(
        STORAGE.recurring,
        getRecurringTransactions()
      );


      writeStorage(
        STORAGE.settings,
        getSettings()
      );


      localStorage.setItem(
        STORAGE.initialized,
        "true"
      );

    }


    applySettings();

    setupSearch();

    setupNotifications();

    setupMobileNavigation();

    setupActiveNavigation();

    setupQuickActions();

    setupGreeting();

    renderDashboard();


    window.addEventListener(
      "moneyLeakUpdated",
      () => {

        applySettings();

        renderDashboard();

      }
    );


    window
      .matchMedia(
        "(prefers-color-scheme: dark)"
      )
      .addEventListener?.(
        "change",
        () => {

          if (
            getSettings().theme ===
            "system"
          ) {

            applySettings();

          }

        }
      );

  }


  /* =========================================================
     PUBLIC MONEY LEAK API
     ========================================================= */

  window.MoneyLeak = {

    version:
      "7.0",

    categories,

    incomeSources,

    STORAGE,


    /* Settings */

    getSettings,

    saveSettings,

    applySettings,


    /* Currency */

    displayCurrency,

    getCurrencySymbol,

    formatNumber,


    /* Transactions */

    getTransactions,

    saveTransactions,

    addTransaction,

    updateTransaction,

    deleteTransaction,

    clearTransactions,

    getIncome,

    getExpenses,

    getBalance,

    getPeriodTransactions,

    getCurrentMonthIncome,

    getCurrentMonthExpenses,

    getCategoryTotals,

    getTopCategories,

    getLargestExpense,

    getLargestIncome,


    /* Goals */

    getSavingsGoals,

    saveSavingsGoals,

    addSavingsGoal,

    updateSavingsGoal,

    deleteSavingsGoal,

    getGoalProgress,


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

    getRecurringMonthlyAmount,

    getMonthlyRecurringTotals,


    /* Intelligence */

    calculateFinancialHealth,

    getSafeToSpend,

    generateSmartInsight,

    generateAlerts,


    /* Search */

    search,


    /* Data */

    exportData,

    importData,

    resetAllData,


    /* UI */

    openSearch:
      () => {},

    closeSearch:
      () => {},

    openNotifications:
      () => {},

    closeNotifications:
      () => {},

    openMobileMenu:
      () => {},

    closeMobileMenu:
      () => {},


    /* Dashboard */

    renderDashboard

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
