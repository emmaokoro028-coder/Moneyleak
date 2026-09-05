/* ============================================================
   MONEYLEAK — PERSONAL FINANCE OS
   Core Application Engine
   Version 3.0
   ============================================================ */

(() => {
    "use strict";

    /* ============================================================
       STORAGE
       ============================================================ */

    const STORAGE = {
        transactions: "moneyLeakTransactions",
        savingsGoals: "moneyLeakSavingsGoals",
        oldSavingsGoal: "moneyLeakSavingsGoal",
        monthlyBudget: "moneyLeakMonthlyBudget",
        categoryBudgets: "moneyLeakCategoryBudgets",
        recurring: "moneyLeakRecurringTransactions",
        settings: "moneyLeakSettings",
        alerts: "moneyLeakAlerts",
        initialized: "moneyLeakInitialized",
        assistantHistory: "moneyLeakAssistantHistory"
    };

    const DEFAULT_SETTINGS = {
        currency: "NGN",
        symbol: "₦",
        name: "My Money",
        theme: "light",
        notifications: true,
        compactNumbers: false,
        voiceAssistant: true,
        voiceRate: 1,
        voicePitch: 1
    };

    const CATEGORIES = [
        "Food",
        "Transport",
        "Shopping",
        "Bills",
        "Housing",
        "Health",
        "Education",
        "Entertainment",
        "Subscriptions",
        "Family",
        "Travel",
        "Utilities",
        "Business",
        "Savings",
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
        "Other"
    ];

    /* ============================================================
       UTILITIES
       ============================================================ */

    function readJSON(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch {
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }

    function uid(prefix = "ml") {
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).slice(2, 9)
        );
    }

    function number(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function todayString() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    function parseDate(date) {
        const d = new Date(date);
        return Number.isNaN(d.getTime()) ? new Date() : d;
    }

    function formatDate(date) {
        return parseDate(date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function formatShortDate(date) {
        return parseDate(date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric"
        });
    }

    function daysBetween(a, b) {
        const first = parseDate(a);
        const second = parseDate(b);
        return Math.ceil(
            Math.abs(second.getTime() - first.getTime()) /
            (1000 * 60 * 60 * 24)
        );
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /* ============================================================
       SETTINGS
       ============================================================ */

    function getSettings() {
        return {
            ...DEFAULT_SETTINGS,
            ...readJSON(STORAGE.settings, {})
        };
    }

    function saveSettings(changes = {}) {
        const settings = {
            ...getSettings(),
            ...changes
        };

        writeJSON(STORAGE.settings, settings);
        applySettings();

        return settings;
    }

    function applySettings() {
        const settings = getSettings();

        document.documentElement.dataset.theme =
            settings.theme === "dark" ? "dark" : "light";

        document.body?.classList.toggle(
            "dark-mode",
            settings.theme === "dark"
        );

        document.body?.classList.toggle(
            "compact-numbers",
            Boolean(settings.compactNumbers)
        );

        const nameElements = document.querySelectorAll(
            "[data-money-name], #profileName, #userName"
        );

        nameElements.forEach(el => {
            el.textContent = settings.name || "My Money";
        });
    }

    /* ============================================================
       CURRENCY
       ============================================================ */

    function currencySymbol() {
        return getSettings().symbol || "₦";
    }

    function formatCurrency(value) {
        const amount = number(value);

        try {
            return new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: getSettings().currency || "NGN",
                maximumFractionDigits: 2
            }).format(amount);
        } catch {
            return `${currencySymbol()}${amount.toLocaleString()}`;
        }
    }

    function formatCompactCurrency(value) {
        const amount = number(value);

        if (Math.abs(amount) >= 1000000000) {
            return `${currencySymbol()}${(amount / 1000000000).toFixed(1)}B`;
        }

        if (Math.abs(amount) >= 1000000) {
            return `${currencySymbol()}${(amount / 1000000).toFixed(1)}M`;
        }

        if (Math.abs(amount) >= 1000) {
            return `${currencySymbol()}${(amount / 1000).toFixed(1)}K`;
        }

        return formatCurrency(amount);
    }

    function displayCurrency(value) {
        return getSettings().compactNumbers
            ? formatCompactCurrency(value)
            : formatCurrency(value);
    }

    /* ============================================================
       TRANSACTIONS
       ============================================================ */

    function normalizeTransaction(item = {}) {
        const amount = Math.abs(
            number(item.amount ?? item.value ?? item.price)
        );

        const type =
            String(item.type || "").toLowerCase() === "income"
                ? "income"
                : "expense";

        return {
            id: item.id || uid("txn"),
            amount,
            type,
            category:
                item.category ||
                (type === "income" ? "Income" : "Other"),
            description:
                item.description ||
                item.name ||
                item.title ||
                (type === "income" ? "Income" : "Expense"),
            date: item.date || todayString(),
            note: item.note || "",
            account: item.account || "Main",
            createdAt: item.createdAt || new Date().toISOString()
        };
    }

    function getTransactions() {
        const raw = readJSON(STORAGE.transactions, []);

        if (!Array.isArray(raw)) {
            return [];
        }

        return raw
            .map(normalizeTransaction)
            .sort(
                (a, b) =>
                    parseDate(b.date).getTime() -
                    parseDate(a.date).getTime()
            );
    }

    function saveTransactions(transactions) {
        return writeJSON(
            STORAGE.transactions,
            transactions.map(normalizeTransaction)
        );
    }

    function addTransaction(transaction) {
        const transactions = getTransactions();

        const newTransaction = normalizeTransaction(transaction);

        transactions.unshift(newTransaction);

        saveTransactions(transactions);

        refreshEverything();

        return newTransaction;
    }

    function updateTransaction(id, changes) {
        const transactions = getTransactions();

        const index = transactions.findIndex(
            transaction => transaction.id === id
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
        refreshEverything();

        return transactions[index];
    }

    function deleteTransaction(id) {
        const transactions = getTransactions();

        const existing = transactions.find(
            transaction => transaction.id === id
        );

        if (!existing) {
            return false;
        }

        const remaining = transactions.filter(
            transaction => transaction.id !== id
        );

        saveTransactions(remaining);

        refreshEverything();

        return true;
    }

    function getIncomeTransactions() {
        return getTransactions().filter(
            transaction => transaction.type === "income"
        );
    }

    function getExpenseTransactions() {
        return getTransactions().filter(
            transaction => transaction.type === "expense"
        );
    }

    /* ============================================================
       TOTALS
       ============================================================ */

    function calculateTotals(transactions = getTransactions()) {
        let income = 0;
        let expenses = 0;

        transactions.forEach(transaction => {
            if (transaction.type === "income") {
                income += transaction.amount;
            } else {
                expenses += transaction.amount;
            }
        });

        return {
            income,
            expenses,
            balance: income - expenses,
            cashFlow: income - expenses
        };
    }

    function getPeriodTransactions(period = "month") {
        const now = new Date();

        return getTransactions().filter(transaction => {
            const date = parseDate(transaction.date);

            if (period === "today") {
                return (
                    date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth() &&
                    date.getDate() === now.getDate()
                );
            }

            if (period === "month") {
                return (
                    date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth()
                );
            }

            if (period === "3months") {
                const cutoff = new Date();
                cutoff.setMonth(cutoff.getMonth() - 3);
                return date >= cutoff;
            }

            if (period === "6months") {
                const cutoff = new Date();
                cutoff.setMonth(cutoff.getMonth() - 6);
                return date >= cutoff;
            }

            if (period === "year") {
                return date.getFullYear() === now.getFullYear();
            }

            return true;
        });
    }

    /* ============================================================
       SAVINGS GOALS
       ============================================================ */

    function getSavingsGoals() {
        let goals = readJSON(STORAGE.savingsGoals, null);

        if (!Array.isArray(goals)) {
            goals = [];

            const old = readJSON(STORAGE.oldSavingsGoal, null);

            if (old && typeof old === "object") {
                goals.push({
                    id: uid("goal"),
                    name: old.name || "Savings Goal",
                    target: number(old.target || old.amount),
                    current: number(old.current || old.saved),
                    deadline: old.deadline || "",
                    createdAt: new Date().toISOString()
                });
            }
        }

        return goals;
    }

    function saveSavingsGoals(goals) {
        return writeJSON(STORAGE.savingsGoals, goals);
    }

    function addSavingsGoal(goal) {
        const goals = getSavingsGoals();

        const newGoal = {
            id: goal.id || uid("goal"),
            name: goal.name || "Savings Goal",
            target: number(goal.target),
            current: number(goal.current),
            deadline: goal.deadline || "",
            createdAt:
                goal.createdAt || new Date().toISOString()
        };

        goals.push(newGoal);

        saveSavingsGoals(goals);
        refreshEverything();

        return newGoal;
    }

    function updateSavingsGoal(id, changes) {
        const goals = getSavingsGoals();

        const index = goals.findIndex(goal => goal.id === id);

        if (index === -1) {
            return null;
        }

        goals[index] = {
            ...goals[index],
            ...changes
        };

        goals[index].target = number(goals[index].target);
        goals[index].current = number(goals[index].current);

        saveSavingsGoals(goals);
        refreshEverything();

        return goals[index];
    }

    function deleteSavingsGoal(id) {
        const goals = getSavingsGoals().filter(
            goal => goal.id !== id
        );

        saveSavingsGoals(goals);
        refreshEverything();

        return true;
    }

    function goalProgress(goal) {
        if (!goal || number(goal.target) <= 0) {
            return 0;
        }

        return clamp(
            (number(goal.current) / number(goal.target)) * 100,
            0,
            100
        );
    }

    /* ============================================================
       BUDGETS
       ============================================================ */

    function getMonthlyBudget() {
        return number(
            readJSON(STORAGE.monthlyBudget, 0)
        );
    }

    function setMonthlyBudget(amount) {
        const value = Math.max(0, number(amount));

        writeJSON(STORAGE.monthlyBudget, value);

        refreshEverything();

        return value;
    }

    function getCategoryBudgets() {
        return readJSON(STORAGE.categoryBudgets, {});
    }

    function setCategoryBudget(category, amount) {
        const budgets = getCategoryBudgets();

        budgets[category] = Math.max(0, number(amount));

        writeJSON(STORAGE.categoryBudgets, budgets);

        refreshEverything();

        return budgets[category];
    }

    function deleteCategoryBudget(category) {
        const budgets = getCategoryBudgets();

        delete budgets[category];

        writeJSON(STORAGE.categoryBudgets, budgets);

        refreshEverything();
    }

    function currentMonthExpenses() {
        return calculateTotals(
            getPeriodTransactions("month")
                .filter(t => t.type === "expense")
        ).expenses;
    }

    function categorySpending(category, period = "month") {
        return getPeriodTransactions(period)
            .filter(
                transaction =>
                    transaction.type === "expense" &&
                    transaction.category === category
            )
            .reduce(
                (sum, transaction) =>
                    sum + transaction.amount,
                0
            );
    }

    /* ============================================================
       RECURRING TRANSACTIONS
       ============================================================ */

    function getRecurringTransactions() {
        const recurring = readJSON(STORAGE.recurring, []);

        return Array.isArray(recurring)
            ? recurring
            : [];
    }

    function saveRecurringTransactions(items) {
        return writeJSON(STORAGE.recurring, items);
    }

    function addRecurringTransaction(item) {
        const recurring = getRecurringTransactions();

        const newItem = {
            id: item.id || uid("rec"),
            type:
                item.type === "income"
                    ? "income"
                    : "expense",
            amount: Math.abs(number(item.amount)),
            name: item.name || "Recurring payment",
            category: item.category || "Bills",
            frequency: item.frequency || "monthly",
            nextDate: item.nextDate || todayString(),
            note: item.note || "",
            active: item.active !== false,
            createdAt:
                item.createdAt || new Date().toISOString()
        };

        recurring.push(newItem);

        saveRecurringTransactions(recurring);
        refreshEverything();

        return newItem;
    }

    function deleteRecurringTransaction(id) {
        const items = getRecurringTransactions().filter(
            item => item.id !== id
        );

        saveRecurringTransactions(items);
        refreshEverything();

        return true;
    }

    /* ============================================================
       FINANCIAL HEALTH
       ============================================================ */

    function calculateFinancialHealth() {
        const month = calculateTotals(
            getPeriodTransactions("month")
        );

        const income = month.income;
        const expenses = month.expenses;

        let incomeFactor = 0;

        if (income > 0) {
            incomeFactor = clamp(
                ((income - expenses) / income) * 100,
                0,
                100
            );
        }

        const monthlyBudget = getMonthlyBudget();

        let budgetFactor = 70;

        if (monthlyBudget > 0) {
            budgetFactor = clamp(
                ((monthlyBudget - expenses) /
                    monthlyBudget) *
                    100 +
                    30,
                0,
                100
            );
        }

        const goals = getSavingsGoals();

        let savingsFactor = 35;

        if (income > 0) {
            const savingsRate =
                ((income - expenses) / income) * 100;

            savingsFactor = clamp(
                savingsRate * 4,
                0,
                100
            );
        }

        const recurring = getRecurringTransactions()
            .filter(item => item.active);

        const recurringMonthly = recurring.reduce(
            (sum, item) => {
                const amount = number(item.amount);

                if (item.type === "income") {
                    return sum;
                }

                if (item.frequency === "weekly") {
                    return sum + amount * 4.33;
                }

                if (item.frequency === "yearly") {
                    return sum + amount / 12;
                }

                return sum + amount;
            },
            0
        );

        let recurringFactor = 100;

        if (income > 0) {
            recurringFactor = clamp(
                100 - (recurringMonthly / income) * 100,
                0,
                100
            );
        }

        const score = Math.round(
            incomeFactor * 0.35 +
            budgetFactor * 0.25 +
            savingsFactor * 0.25 +
            recurringFactor * 0.15
        );

        let status = "Needs attention";

        if (score >= 85) {
            status = "Excellent";
        } else if (score >= 70) {
            status = "Healthy";
        } else if (score >= 50) {
            status = "Fair";
        }

        let message =
            "Your finances have room for improvement.";

        if (score >= 85) {
            message =
                "You're managing your money exceptionally well.";
        } else if (score >= 70) {
            message =
                "Your financial foundation looks healthy.";
        } else if (score >= 50) {
            message =
                "You're on the right path, but a few improvements could make a big difference.";
        }

        return {
            score,
            status,
            message,
            factors: {
                income: Math.round(incomeFactor),
                budget: Math.round(budgetFactor),
                savings: Math.round(savingsFactor),
                recurring: Math.round(recurringFactor)
            }
        };
    }

    /* ============================================================
       SAFE TO SPEND
       ============================================================ */

    function getSafeToSpend() {
        const month = calculateTotals(
            getPeriodTransactions("month")
        );

        const income = month.income;
        const expenses = month.expenses;

        const recurring = getRecurringTransactions()
            .filter(item => item.active && item.type === "expense")
            .reduce((sum, item) => {
                if (item.frequency === "weekly") {
                    return sum + item.amount * 4.33;
                }

                if (item.frequency === "yearly") {
                    return sum + item.amount / 12;
                }

                return sum + item.amount;
            }, 0);

        const goals = getSavingsGoals();

        const goalMonthly = goals.reduce((sum, goal) => {
            if (!goal.deadline || goal.target <= goal.current) {
                return sum;
            }

            const months = Math.max(
                1,
                daysBetween(
                    todayString(),
                    goal.deadline
                ) / 30
            );

            return (
                sum +
                (goal.target - goal.current) / months
            );
        }, 0);

        const budget = getMonthlyBudget();

        const budgetRemaining =
            budget > 0
                ? Math.max(0, budget - expenses)
                : Infinity;

        const cashAvailable =
            income -
            expenses -
            recurring -
            goalMonthly;

        const safe = Math.max(
            0,
            Math.min(
                cashAvailable,
                budgetRemaining
            )
        );

        return {
            safeToSpend: Number.isFinite(safe)
                ? safe
                : Math.max(0, cashAvailable),
            income,
            expenses,
            recurring,
            goalMonthly,
            budgetRemaining:
                Number.isFinite(budgetRemaining)
                    ? budgetRemaining
                    : null
        };
    }

    /* ============================================================
       SMART INSIGHTS
       ============================================================ */

    function generateInsight() {
        const month = calculateTotals(
            getPeriodTransactions("month")
        );

        const income = month.income;
        const expenses = month.expenses;

        if (income === 0 && expenses === 0) {
            return "Start by adding your income and expenses. MoneyLeak will build your financial picture automatically.";
        }

        if (expenses > income && income > 0) {
            return `You're spending ${formatCurrency(
                expenses - income
            )} more than your recorded income this month. Reducing discretionary spending should be your priority.`;
        }

        const budget = getMonthlyBudget();

        if (budget > 0 && expenses >= budget) {
            return `You've reached your monthly budget of ${formatCurrency(
                budget
            )}. Consider pausing non-essential spending.`;
        }

        if (income > 0) {
            const rate =
                ((income - expenses) / income) * 100;

            if (rate >= 30) {
                return `Excellent month. You're currently keeping about ${rate.toFixed(
                    0
                )}% of your recorded income.`;
            }

            if (rate >= 20) {
                return `You're saving about ${rate.toFixed(
                    0
                )}% of your income. You're moving in a strong direction.`;
            }

            if (rate > 0) {
                return `You're currently keeping about ${rate.toFixed(
                    0
                )}% of your income. Try increasing that gradually.`;
            }
        }

        return "Your finances are stable. Keep tracking consistently so MoneyLeak can identify stronger patterns.";
    }

    /* ============================================================
       ALERT ENGINE
       ============================================================ */

    function generateAlerts() {
        const alerts = [];

        const month = calculateTotals(
            getPeriodTransactions("month")
        );

        if (
            month.income === 0 &&
            month.expenses === 0
        ) {
            alerts.push({
                id: "no-activity",
                type: "info",
                title: "Start tracking",
                message:
                    "Add your first income or expense to unlock MoneyLeak Intelligence."
            });
        }

        if (
            month.expenses > month.income &&
            month.income > 0
        ) {
            alerts.push({
                id: "spending-over-income",
                type: "critical",
                title: "Spending exceeds income",
                message:
                    "Your expenses are currently higher than your recorded income this month."
            });
        }

        const budget = getMonthlyBudget();

        if (budget > 0) {
            const percent =
                (month.expenses / budget) * 100;

            if (percent >= 100) {
                alerts.push({
                    id: "budget-over",
                    type: "critical",
                    title: "Budget exceeded",
                    message:
                        "You've exceeded your monthly budget."
                });
            } else if (percent >= 80) {
                alerts.push({
                    id: "budget-warning",
                    type: "warning",
                    title: "Budget warning",
                    message: `You've used ${percent.toFixed(
                        0
                    )}% of your monthly budget.`
                });
            }
        }

        const goals = getSavingsGoals();

        goals.forEach(goal => {
            const progress = goalProgress(goal);

            if (progress >= 100) {
                alerts.push({
                    id: `goal-${goal.id}-complete`,
                    type: "success",
                    title: "Goal completed 🎉",
                    message: `${goal.name} has reached its target.`
                });
            } else if (progress >= 75) {
                alerts.push({
                    id: `goal-${goal.id}-milestone`,
                    type: "success",
                    title: "Savings milestone",
                    message: `${goal.name} is ${progress.toFixed(
                        0
                    )}% complete.`
                });
            }
        });

        const health = calculateFinancialHealth();

        if (health.score >= 85) {
            alerts.push({
                id: "health-excellent",
                type: "success",
                title: "Financial health is excellent",
                message:
                    "You're building a strong financial foundation."
            });
        }

        return alerts;
    }

    function getAlerts() {
        return generateAlerts();
    }

    /* ============================================================
       SEARCH
       ============================================================ */

    function searchMoneyLeak(query) {
        const q = String(query || "")
            .trim()
            .toLowerCase();

        if (!q) {
            return [];
        }

        const pages = [
            {
                name: "Dashboard",
                url: "index.html",
                keywords: "dashboard home overview money"
            },
            {
                name: "Income",
                url: "income.html",
                keywords: "income salary earnings money received"
            },
            {
                name: "Expenses",
                url: "expenses.html",
                keywords: "expenses spending transactions"
            },
            {
                name: "Savings Goals",
                url: "savings.html",
                keywords: "savings goals target"
            },
            {
                name: "Budgets",
                url: "budgets.html",
                keywords: "budget limits spending"
            },
            {
                name: "Recurring",
                url: "recurring.html",
                keywords: "recurring bills subscriptions"
            },
            {
                name: "Analytics",
                url: "analytics.html",
                keywords: "analytics reports charts trends"
            },
            {
                name: "Settings",
                url: "settings.html",
                keywords: "settings preferences profile"
            }
        ];

        const pageResults = pages
            .filter(page =>
                `${page.name} ${page.keywords}`
                    .toLowerCase()
                    .includes(q)
            )
            .map(page => ({
                ...page,
                resultType: "page"
            }));

        const transactionResults = getTransactions()
            .filter(transaction => {
                const text = [
                    transaction.description,
                    transaction.category,
                    transaction.note,
                    transaction.type
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(q);
            })
            .slice(0, 20)
            .map(transaction => ({
                ...transaction,
                resultType: "transaction"
            }));

        return [
            ...pageResults,
            ...transactionResults
        ];
    }

    /* ============================================================
       VOICE ASSISTANT
       ============================================================ */

    let recognition = null;
    let assistantListening = false;
    let pendingVoiceAction = null;

    function supportsSpeechRecognition() {
        return Boolean(
            window.SpeechRecognition ||
            window.webkitSpeechRecognition
        );
    }

    function supportsSpeechSynthesis() {
        return "speechSynthesis" in window;
    }

    function speak(text) {
        if (!supportsSpeechSynthesis()) {
            return;
        }

        window.speechSynthesis.cancel();

        const utterance =
            new SpeechSynthesisUtterance(text);

        const settings = getSettings();

        utterance.rate =
            number(settings.voiceRate) || 1;

        utterance.pitch =
            number(settings.voicePitch) || 1;

        utterance.lang = "en-NG";

        window.speechSynthesis.speak(utterance);
    }

    function createAssistantUI() {
        if (!getSettings().voiceAssistant) {
            return;
        }

        if (document.getElementById("moneyLeakAssistant")) {
            return;
        }

        const wrapper =
            document.createElement("div");

        wrapper.id = "moneyLeakAssistant";

        wrapper.innerHTML = `
            <button
                id="moneyLeakVoiceButton"
                type="button"
                aria-label="Open MoneyLeak AI Assistant"
                title="MoneyLeak AI"
            >
                <span class="ml-voice-icon">🎙️</span>
                <span class="ml-voice-label">MoneyLeak AI</span>
            </button>

            <div
                id="moneyLeakVoicePanel"
                class="ml-voice-panel"
                hidden
                aria-hidden="true"
            >
                <div class="ml-voice-header">
                    <div>
                        <small>MoneyLeak Intelligence</small>
                        <strong>AI Assistant</strong>
                    </div>

                    <button
                        id="moneyLeakVoiceClose"
                        type="button"
                        aria-label="Close"
                    >×</button>
                </div>

                <div
                    id="moneyLeakVoiceStatus"
                    class="ml-voice-status"
                >
                    Tap the microphone and tell me what you need.
                </div>

                <div
                    id="moneyLeakVoiceTranscript"
                    class="ml-voice-transcript"
                >
                    <span>Try saying:</span>
                    <strong>
                        "How much did I spend this month?"
                    </strong>
                </div>

                <button
                    id="moneyLeakStartListening"
                    class="ml-voice-listen"
                    type="button"
                >
                    <span>🎙️</span>
                    Start listening
                </button>

                <div class="ml-voice-examples">
                    <button type="button" data-voice-example="Add ₦5,000 for food">
                        Add expense
                    </button>

                    <button type="button" data-voice-example="How much did I spend this month?">
                        Check spending
                    </button>

                    <button type="button" data-voice-example="How healthy are my finances?">
                        Financial health
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);

        const button =
            document.getElementById(
                "moneyLeakVoiceButton"
            );

        const panel =
            document.getElementById(
                "moneyLeakVoicePanel"
            );

        const close =
            document.getElementById(
                "moneyLeakVoiceClose"
            );

        const listen =
            document.getElementById(
                "moneyLeakStartListening"
            );

        button?.addEventListener("click", () => {
            panel.hidden = false;
            panel.setAttribute(
                "aria-hidden",
                "false"
            );
        });

        close?.addEventListener("click", () => {
            stopListening();

            panel.hidden = true;

            panel.setAttribute(
                "aria-hidden",
                "true"
            );
        });

        listen?.addEventListener(
            "click",
            startListening
        );

        document
            .querySelectorAll("[data-voice-example]")
            .forEach(example => {
                example.addEventListener("click", () => {
                    processAssistantCommand(
                        example.dataset.voiceExample
                    );
                });
            });
    }

    function updateAssistantStatus(text) {
        const status =
            document.getElementById(
                "moneyLeakVoiceStatus"
            );

        if (status) {
            status.textContent = text;
        }
    }

    function updateAssistantTranscript(text) {
        const transcript =
            document.getElementById(
                "moneyLeakVoiceTranscript"
            );

        if (transcript) {
            transcript.innerHTML =
                `<strong>${escapeHTML(text)}</strong>`;
        }
    }

    function startListening() {
        if (!supportsSpeechRecognition()) {
            updateAssistantStatus(
                "Voice recognition is not available in this browser. Try Chrome or another supported browser."
            );

            speak(
                "Voice recognition is not available in this browser."
            );

            return;
        }

        const Recognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!recognition) {
            recognition = new Recognition();

            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = "en-NG";

            recognition.onstart = () => {
                assistantListening = true;

                updateAssistantStatus(
                    "Listening… tell me what you want MoneyLeak to do."
                );

                const button =
                    document.getElementById(
                        "moneyLeakStartListening"
                    );

                if (button) {
                    button.classList.add("listening");
                    button.innerHTML =
                        "🔴 Listening…";
                }
            };

            recognition.onresult = event => {
                let transcript = "";

                for (
                    let i = event.resultIndex;
                    i < event.results.length;
                    i++
                ) {
                    transcript +=
                        event.results[i][0].transcript;
                }

                updateAssistantTranscript(
                    transcript
                );

                const result =
                    event.results[
                        event.results.length - 1
                    ];

                if (result.isFinal) {
                    processAssistantCommand(
                        transcript
                    );
                }
            };

            recognition.onerror = event => {
                assistantListening = false;

                updateAssistantStatus(
                    `Voice error: ${event.error}.`
                );

                resetListenButton();
            };

            recognition.onend = () => {
                assistantListening = false;
                resetListenButton();
            };
        }

        try {
            recognition.start();
        } catch {
            stopListening();

            setTimeout(() => {
                try {
                    recognition.start();
                } catch {}
            }, 300);
        }
    }

    function stopListening() {
        if (recognition) {
            try {
                recognition.stop();
            } catch {}
        }

        assistantListening = false;

        resetListenButton();
    }

    function resetListenButton() {
        const button =
            document.getElementById(
                "moneyLeakStartListening"
            );

        if (button) {
            button.classList.remove("listening");
            button.innerHTML =
                "<span>🎙️</span> Start listening";
        }
    }

    /* ============================================================
       VOICE COMMAND PARSER
       ============================================================ */

    function normalizeVoiceText(text) {
        return String(text || "")
            .toLowerCase()
            .replace(/[₦$,]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function extractAmount(text) {
        const normalized = normalizeVoiceText(text);

        const patterns = [
            /(\d+(?:\.\d+)?)\s*(billion|bn)/i,
            /(\d+(?:\.\d+)?)\s*(million|m)/i,
            /(\d+(?:\.\d+)?)\s*(thousand|k)/i,
            /(\d+(?:\.\d+)?)/i
        ];

        for (const pattern of patterns) {
            const match =
                normalized.match(pattern);

            if (!match) {
                continue;
            }

            let value = parseFloat(match[1]);

            if (
                /billion|bn/i.test(match[2] || "")
            ) {
                value *= 1000000000;
            } else if (
                /million|m/i.test(match[2] || "")
            ) {
                value *= 1000000;
            } else if (
                /thousand|k/i.test(match[2] || "")
            ) {
                value *= 1000;
            }

            return value;
        }

        return 0;
    }

    function detectCategory(text) {
        const value = normalizeVoiceText(text);

        const map = {
            food: "Food",
            grocery: "Food",
            groceries: "Food",
            restaurant: "Food",
            eating: "Food",

            transport: "Transport",
            transportation: "Transport",
            fuel: "Transport",
            petrol: "Transport",
            uber: "Transport",
            taxi: "Transport",

            shopping: "Shopping",
            clothes: "Shopping",
            clothing: "Shopping",

            rent: "Housing",
            housing: "Housing",

            electricity: "Utilities",
            water: "Utilities",
            utility: "Utilities",
            utilities: "Utilities",

            subscription: "Subscriptions",
            subscriptions: "Subscriptions",
            netflix: "Subscriptions",

            entertainment: "Entertainment",
            movie: "Entertainment",
            movies: "Entertainment",

            health: "Health",
            medicine: "Health",
            hospital: "Health",

            school: "Education",
            education: "Education",

            travel: "Travel",

            business: "Business",

            family: "Family"
        };

        for (const key of Object.keys(map)) {
            if (value.includes(key)) {
                return map[key];
            }
        }

        return "Other";
    }

    function extractDate(text) {
        const value = normalizeVoiceText(text);

        if (value.includes("yesterday")) {
            const date = new Date();
            date.setDate(date.getDate() - 1);

            return date.toISOString().slice(0, 10);
        }

        if (value.includes("tomorrow")) {
            const date = new Date();
            date.setDate(date.getDate() + 1);

            return date.toISOString().slice(0, 10);
        }

        return todayString();
    }

    function extractDescription(text, type) {
        let value = String(text || "").trim();

        value = value
            .replace(
                /^(add|record|log|save|create)\s+/i,
                ""
            )
            .replace(
                /^(an?|my)\s+/i,
                ""
            )
            .replace(
                /₦?\s*\d[\d,]*(?:\.\d+)?\s*(k|thousand|m|million|bn|billion)?/i,
                ""
            )
            .replace(
                /\b(today|yesterday|tomorrow)\b/gi,
                ""
            )
            .replace(
                /\b(for|on|as)\b\s*$/i,
                ""
            )
            .trim();

        if (!value) {
            return type === "income"
                ? "Income"
                : "Expense";
        }

        return value
            .replace(/\s+/g, " ")
            .slice(0, 80);
    }

    function parseVoiceCommand(text) {
        const original = String(text || "").trim();
        const value = normalizeVoiceText(original);

        if (!value) {
            return {
                action: "unknown"
            };
        }

        /* NAVIGATION */

        const navigation = [
            ["dashboard", "index.html"],
            ["home", "index.html"],
            ["income", "income.html"],
            ["expenses", "expenses.html"],
            ["spending", "expenses.html"],
            ["savings", "savings.html"],
            ["goals", "savings.html"],
            ["budget", "budgets.html"],
            ["budgets", "budgets.html"],
            ["recurring", "recurring.html"],
            ["analytics", "analytics.html"],
            ["reports", "analytics.html"],
            ["settings", "settings.html"]
        ];

        if (
            value.startsWith("open ") ||
            value.startsWith("show me my ")
        ) {
            for (const [keyword, url] of navigation) {
                if (value.includes(keyword)) {
                    return {
                        action: "navigate",
                        url,
                        name: keyword
                    };
                }
            }
        }

        /* FINANCIAL QUESTIONS */

        if (
            value.includes("financial health") ||
            value.includes("how healthy") ||
            value.includes("health score")
        ) {
            return {
                action: "financialHealth"
            };
        }

        if (
            value.includes("safe to spend") ||
            value.includes("can i afford")
        ) {
            return {
                action: "safeToSpend"
            };
        }

        if (
            value.includes("how much did i spend") ||
            value.includes("how much have i spent") ||
            value.includes("my spending this month")
        ) {
            return {
                action: "monthSpending"
            };
        }

        if (
            value.includes("how much did i earn") ||
            value.includes("how much income") ||
            value.includes("income this month")
        ) {
            return {
                action: "monthIncome"
            };
        }

        if (
            value.includes("biggest expense") ||
            value.includes("largest expense")
        ) {
            return {
                action: "largestExpense"
            };
        }

        if (
            value.includes("where am i spending") ||
            value.includes("where do i spend") ||
            value.includes("spending most")
        ) {
            return {
                action: "topCategory"
            };
        }

        if (
            value.includes("give me advice") ||
            value.includes("financial advice") ||
            value.includes("how can i save") ||
            value.includes("how do i save")
        ) {
            return {
                action: "advice"
            };
        }

        /* DELETE */

        if (
            value.includes("delete my last expense") ||
            value.includes("remove my last expense")
        ) {
            return {
                action: "deleteLastExpense"
            };
        }

        /* BUDGET */

        if (
            value.includes("set my monthly budget") ||
            value.includes("set monthly budget") ||
            value.includes("my monthly budget")
        ) {
            const amount =
                extractAmount(original);

            return {
                action: "setBudget",
                amount
            };
        }

        /* SAVINGS GOAL */

        if (
            value.includes("create a savings goal") ||
            value.includes("create savings goal") ||
            value.includes("new savings goal")
        ) {
            const amount =
                extractAmount(original);

            let name = original
                .replace(
                    /create\s+(a\s+)?savings\s+goal/i,
                    ""
                )
                .replace(
                    /of\s+₦?\s*[\d,]+/i,
                    ""
                )
                .replace(
                    /for\s+₦?\s*[\d,]+/i,
                    ""
                )
                .trim();

            if (!name) {
                name = "New Savings Goal";
            }

            return {
                action: "createGoal",
                amount,
                name
            };
        }

        /* INCOME */

        if (
            value.startsWith("add income") ||
            value.startsWith("record income") ||
            value.startsWith("log income") ||
            value.includes("received income") ||
            value.includes("received salary")
        ) {
            return {
                action: "addIncome",
                amount: extractAmount(original),
                description:
                    extractDescription(
                        original,
                        "income"
                    ),
                source: detectIncomeSource(original),
                date: extractDate(original)
            };
        }

        /* EXPENSE */

        if (
            value.startsWith("add ") ||
            value.startsWith("record ") ||
            value.startsWith("log ") ||
            value.includes("i spent ") ||
            value.includes("i paid ") ||
            value.includes("i bought ")
        ) {
            const amount =
                extractAmount(original);

            if (amount > 0) {
                return {
                    action: "addExpense",
                    amount,
                    category:
                        detectCategory(original),
                    description:
                        extractDescription(
                            original,
                            "expense"
                        ),
                    date: extractDate(original)
                };
            }
        }

        return {
            action: "unknown",
            original
        };
    }

    function detectIncomeSource(text) {
        const value = normalizeVoiceText(text);

        for (const source of INCOME_SOURCES) {
            if (
                value.includes(
                    source.toLowerCase()
                )
            ) {
                return source;
            }
        }

        if (value.includes("salary")) {
            return "Salary";
        }

        if (
            value.includes("freelance") ||
            value.includes("freelancing")
        ) {
            return "Freelance";
        }

        if (value.includes("business")) {
            return "Business";
        }

        return "Other";
    }

    /* ============================================================
       ASSISTANT ACTION EXECUTION
       ============================================================ */

    function processAssistantCommand(text) {
        updateAssistantTranscript(text);
        updateAssistantStatus("Thinking…");

        const command =
            parseVoiceCommand(text);

        executeAssistantCommand(command);
    }

    function executeAssistantCommand(command) {
        switch (command.action) {
            case "addExpense":
                executeAddExpense(command);
                break;

            case "addIncome":
                executeAddIncome(command);
                break;

            case "setBudget":
                executeSetBudget(command);
                break;

            case "createGoal":
                executeCreateGoal(command);
                break;

            case "financialHealth":
                executeHealthCommand();
                break;

            case "safeToSpend":
                executeSafeToSpend();
                break;

            case "monthSpending":
                executeMonthSpending();
                break;

            case "monthIncome":
                executeMonthIncome();
                break;

            case "largestExpense":
                executeLargestExpense();
                break;

            case "topCategory":
                executeTopCategory();
                break;

            case "advice":
                executeAdvice();
                break;

            case "deleteLastExpense":
                executeDeleteLastExpense();
                break;

            case "navigate":
                executeNavigation(command);
                break;

            default:
                executeUnknown(command);
        }
    }

    function assistantConfirm(message, action) {
        pendingVoiceAction = action;

        updateAssistantStatus(
            `${message} Say "yes" to confirm or "cancel" to stop.`
        );

        speak(
            `${message}. Say yes to confirm or cancel to stop.`
        );
    }

    function executeAddExpense(command) {
        if (!command.amount) {
            const message =
                "I couldn't find the amount. Try saying something like: add 5000 for food.";

            updateAssistantStatus(message);
            speak(message);
            return;
        }

        const description =
            command.description || "Expense";

        const message =
            `I found a ${formatCurrency(
                command.amount
            )} ${command.category.toLowerCase()} expense for ${description}.`;

        assistantConfirm(message, () => {
            const transaction =
                addTransaction({
                    amount: command.amount,
                    type: "expense",
                    category: command.category,
                    description,
                    date: command.date
                });

            const response =
                `Done. I added ${formatCurrency(
                    transaction.amount
                )} for ${transaction.description}.`;

            updateAssistantStatus(response);
            speak(response);
        });
    }

    function executeAddIncome(command) {
        if (!command.amount) {
            const message =
                "I couldn't find the income amount.";

            updateAssistantStatus(message);
            speak(message);
            return;
        }

        const message =
            `I found ${formatCurrency(
                command.amount
            )} of ${command.source} income.`;

        assistantConfirm(message, () => {
            const transaction =
                addTransaction({
                    amount: command.amount,
                    type: "income",
                    category: command.source,
                    description:
                        command.description ||
                        command.source,
                    date: command.date
                });

            const response =
                `Done. I added ${formatCurrency(
                    transaction.amount
                )} of income.`;

            updateAssistantStatus(response);
            speak(response);
        });
    }

    function executeSetBudget(command) {
        if (!command.amount) {
            const message =
                "Tell me the amount for your monthly budget.";

            updateAssistantStatus(message);
            speak(message);
            return;
        }

        const message =
            `Set your monthly budget to ${formatCurrency(
                command.amount
            )}?`;

        assistantConfirm(message, () => {
            setMonthlyBudget(command.amount);

            const response =
                `Done. Your monthly budget is now ${formatCurrency(
                    command.amount
                )}.`;

            updateAssistantStatus(response);
            speak(response);
        });
    }

    function executeCreateGoal(command) {
        if (!command.amount) {
            const message =
                "Tell me the target amount for the savings goal.";

            updateAssistantStatus(message);
            speak(message);
            return;
        }

        const message =
            `Create a savings goal called ${command.name} with a target of ${formatCurrency(
                command.amount
            )}?`;

        assistantConfirm(message, () => {
            const goal =
                addSavingsGoal({
                    name: command.name,
                    target: command.amount,
                    current: 0
                });

            const response =
                `Done. I created your ${goal.name} savings goal.`;

            updateAssistantStatus(response);
            speak(response);
        });
    }

    function executeHealthCommand() {
        const health =
            calculateFinancialHealth();

        const response =
            `Your MoneyLeak financial health score is ${health.score} out of 100. ${health.message}`;

        updateAssistantStatus(response);
        speak(response);
    }

    function executeSafeToSpend() {
        const safe =
            getSafeToSpend();

        const response =
            `Your estimated safe to spend amount this month is ${formatCurrency(
                safe.safeToSpend
            )}.`;

        updateAssistantStatus(response);
        speak(response);
    }

    function executeMonthSpending() {
        const totals =
            calculateTotals(
                getPeriodTransactions("month")
            );

        const response =
            `You've spent ${formatCurrency(
                totals.expenses
            )} this month.`;

        updateAssistantStatus(response);
        speak(response);
    }

    function executeMonthIncome() {
        const totals =
            calculateTotals(
                getPeriodTransactions("month")
            );

        const response =
            `You've recorded ${formatCurrency(
                totals.income
            )} of income this month.`;

        updateAssistantStatus(response);
        speak(response);
    }

    function executeLargestExpense() {
        const expenses =
            getExpenseTransactions();

        if (!expenses.length) {
            const response =
                "You don't have any expenses recorded yet.";

            updateAssistantStatus(response);
            speak(response);
            return;
        }

        const largest =
            expenses.reduce(
                (max, item) =>
                    item.amount > max.amount
                        ? item
                        : max
            );

        const response =
            `Your largest recorded expense is ${formatCurrency(
                largest.amount
            )} for ${largest.description}.`;

        updateAssistantStatus(response);
        speak(response);
    }

    function executeTopCategory() {
        const expenses =
            getPeriodTransactions("month")
                .filter(
                    transaction =>
                        transaction.type ===
                        "expense"
                );

        if (!expenses.length) {
            const response =
                "You don't have enough spending data yet.";

            updateAssistantStatus(response);
            speak(response);
            return;
        }

        const totals = {};

        expenses.forEach(transaction => {
            totals[transaction.category] =
                (totals[transaction.category] || 0) +
                transaction.amount;
        });

        const top =
            Object.entries(totals)
                .sort((a, b) => b[1] - a[1])[0];

        const response =
            `Your biggest spending category this month is ${top[0]}, at ${formatCurrency(
                top[1]
            )}.`;

        updateAssistantStatus(response);
        speak(response);
    }

    function executeAdvice() {
        const insight =
            generateInsight();

        updateAssistantStatus(insight);
        speak(insight);
    }

    function executeDeleteLastExpense() {
        const expense =
            getExpenseTransactions()[0];

        if (!expense) {
            const response =
                "You don't have any expenses to delete.";

            updateAssistantStatus(response);
            speak(response);
            return;
        }

        const message =
            `Delete your latest expense of ${formatCurrency(
                expense.amount
            )} for ${expense.description}?`;

        assistantConfirm(message, () => {
            deleteTransaction(expense.id);

            const response =
                "Done. The latest expense has been deleted.";

            updateAssistantStatus(response);
            speak(response);
        });
    }

    function executeNavigation(command) {
        const response =
            `Opening ${command.name}.`;

        updateAssistantStatus(response);
        speak(response);

        setTimeout(() => {
            window.location.href =
                command.url;
        }, 500);
    }

    function executeUnknown(command) {
        const response =
            `I didn't fully understand that. Try asking about your spending, income, budget, savings goals, financial health, or say something like "add 5000 for food".`;

        updateAssistantStatus(response);
        speak(response);
    }

    function handleVoiceConfirmation(text) {
        const value =
            normalizeVoiceText(text);

        if (!pendingVoiceAction) {
            return false;
        }

        if (
            value === "yes" ||
            value === "yeah" ||
            value === "yep" ||
            value === "confirm" ||
            value === "do it"
        ) {
            const action =
                pendingVoiceAction;

            pendingVoiceAction = null;

            action();

            return true;
        }

        if (
            value === "no" ||
            value === "cancel" ||
            value === "stop"
        ) {
            pendingVoiceAction = null;

            const response =
                "Okay. I cancelled that action.";

            updateAssistantStatus(response);
            speak(response);

            return true;
        }

        return false;
    }

    /* ============================================================
       DASHBOARD
       ============================================================ */

    function setText(id, value) {
        const el =
            document.getElementById(id);

        if (el) {
            el.textContent = value;
        }
    }

    function setWidth(id, percentage) {
        const el =
            document.getElementById(id);

        if (el) {
            el.style.width =
                `${clamp(number(percentage), 0, 100)}%`;
        }
    }

    function updateDashboard() {
        const month =
            calculateTotals(
                getPeriodTransactions("month")
            );

        const all =
            calculateTotals(
                getTransactions()
            );

        const savingsRate =
            month.income > 0
                ? ((month.income -
                    month.expenses) /
                    month.income) *
                  100
                : 0;

        const goals =
            getSavingsGoals();

        const target =
            goals.reduce(
                (sum, goal) =>
                    sum + number(goal.target),
                0
            );

        const saved =
            goals.reduce(
                (sum, goal) =>
                    sum + number(goal.current),
                0
            );

        const goalProgress =
            target > 0
                ? (saved / target) * 100
                : 0;

        const health =
            calculateFinancialHealth();

        setText(
            "overviewBalance",
            displayCurrency(all.balance)
        );

        setText(
            "overviewIncome",
            displayCurrency(month.income)
        );

        setText(
            "overviewExpenses",
            displayCurrency(month.expenses)
        );

        setText(
            "overviewSavingsRate",
            `${Math.max(
                0,
                savingsRate
            ).toFixed(0)}%`
        );

        setText(
            "overviewGoalProgress",
            `${goalProgress.toFixed(0)}%`
        );

        setWidth(
            "overviewGoalFill",
            goalProgress
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
            "healthScore",
            health.score
        );

        setWidth(
            "healthFill",
            health.score
        );

        setText(
            "healthMessage",
            health.message
        );

        setText(
            "healthIncomeFactor",
            `${health.factors.income}%`
        );

        setText(
            "healthBudgetFactor",
            `${health.factors.budget}%`
        );

        setText(
            "healthSavingsFactor",
            `${health.factors.savings}%`
        );

        setText(
            "healthRecurringFactor",
            `${health.factors.recurring}%`
        );

        setWidth(
            "healthIncomeBar",
            health.factors.income
        );

        setWidth(
            "healthBudgetBar",
            health.factors.budget
        );

        setWidth(
            "healthSavingsBar",
            health.factors.savings
        );

        setWidth(
            "healthRecurringBar",
            health.factors.recurring
        );

        setText(
            "overviewInsightText",
            generateInsight()
        );

        setText(
            "healthExplanation",
            health.message
        );

        setText(
            "healthInsight",
            generateInsight()
        );

        updateDashboardBudget();
        updateRecentTransactions();
        updateTopSpending();
        updateDashboardGoals();
        updateAlerts();
        updateCashFlowSummary();
    }

    function updateDashboardBudget() {
        const budget =
            getMonthlyBudget();

        const spent =
            currentMonthExpenses();

        const percent =
            budget > 0
                ? (spent / budget) * 100
                : 0;

        setText(
            "dashboardBudgetPercent",
            `${percent.toFixed(0)}%`
        );

        setWidth(
            "dashboardBudgetFill",
            percent
        );

        setText(
            "dashboardBudgetSpent",
            displayCurrency(spent)
        );

        setText(
            "dashboardBudgetRemaining",
            displayCurrency(
                Math.max(0, budget - spent)
            )
        );

        setText(
            "dashboardBudgetLimit",
            displayCurrency(budget)
        );

        setText(
            "budgetUsedDisplay",
            displayCurrency(spent)
        );

        setText(
            "monthlySpentDisplay",
            displayCurrency(spent)
        );

        setText(
            "monthlyBudgetDisplay",
            displayCurrency(budget)
        );
    }

    function updateRecentTransactions() {
        const container =
            document.getElementById(
                "recentTransactions"
            );

        if (!container) {
            return;
        }

        const transactions =
            getTransactions().slice(0, 8);

        if (!transactions.length) {
            container.innerHTML =
                `<div class="empty-state">
                    No transactions yet.
                </div>`;

            return;
        }

        container.innerHTML =
            transactions
                .map(transaction => `
                    <div class="transaction-row">
                        <div>
                            <strong>
                                ${escapeHTML(
                                    transaction.description
                                )}
                            </strong>
                            <small>
                                ${escapeHTML(
                                    transaction.category
                                )}
                                ·
                                ${formatShortDate(
                                    transaction.date
                                )}
                            </small>
                        </div>

                        <strong class="${
                            transaction.type === "income"
                                ? "income"
                                : "expense"
                        }">
                            ${
                                transaction.type === "income"
                                    ? "+"
                                    : "-"
                            }${displayCurrency(
                                transaction.amount
                            )}
                        </strong>
                    </div>
                `)
                .join("");
    }

    function updateTopSpending() {
        const container =
            document.getElementById(
                "topSpendingCategories"
            );

        if (!container) {
            return;
        }

        const totals = {};

        getPeriodTransactions("month")
            .filter(
                transaction =>
                    transaction.type ===
                    "expense"
            )
            .forEach(transaction => {
                totals[transaction.category] =
                    (totals[transaction.category] ||
                        0) +
                    transaction.amount;
            });

        const categories =
            Object.entries(totals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

        if (!categories.length) {
            container.innerHTML =
                `<div class="empty-state">
                    No spending data yet.
                </div>`;

            return;
        }

        const total =
            categories.reduce(
                (sum, item) => sum + item[1],
                0
            );

        container.innerHTML =
            categories
                .map(([category, amount]) => {
                    const percent =
                        total > 0
                            ? (amount / total) * 100
                            : 0;

                    return `
                        <div class="category-row">
                            <div>
                                <strong>
                                    ${escapeHTML(
                                        category
                                    )}
                                </strong>
                                <small>
                                    ${percent.toFixed(
                                        0
                                    )}% of top spending
                                </small>
                            </div>

                            <strong>
                                ${displayCurrency(
                                    amount
                                )}
                            </strong>
                        </div>
                    `;
                })
                .join("");
    }

    function updateDashboardGoals() {
        const container =
            document.getElementById(
                "dashboardGoals"
            );

        if (!container) {
            return;
        }

        const goals =
            getSavingsGoals()
                .slice(0, 4);

        if (!goals.length) {
            container.innerHTML =
                `<div class="empty-state">
                    Create your first savings goal.
                </div>`;

            return;
        }

        container.innerHTML =
            goals
                .map(goal => {
                    const progress =
                        goalProgress(goal);

                    return `
                        <div class="goal-row">
                            <div>
                                <strong>
                                    ${escapeHTML(
                                        goal.name
                                    )}
                                </strong>

                                <small>
                                    ${displayCurrency(
                                        goal.current
                                    )}
                                    /
                                    ${displayCurrency(
                                        goal.target
                                    )}
                                </small>
                            </div>

                            <strong>
                                ${progress.toFixed(0)}%
                            </strong>
                        </div>

                        <div class="progress-bar">
                            <span style="width:${progress}%"></span>
                        </div>
                    `;
                })
                .join("");
    }

    function updateAlerts() {
        const container =
            document.getElementById(
                "financialAlerts"
            );

        if (!container) {
            return;
        }

        const alerts =
            generateAlerts().slice(0, 6);

        if (!alerts.length) {
            container.innerHTML =
                `<div class="empty-state">
                    You're all caught up.
                </div>`;

            return;
        }

        container.innerHTML =
            alerts
                .map(alert => `
                    <div class="alert-item ${escapeHTML(
                        alert.type
                    )}">
                        <strong>
                            ${escapeHTML(
                                alert.title
                            )}
                        </strong>

                        <p>
                            ${escapeHTML(
                                alert.message
                            )}
                        </p>
                    </div>
                `)
                .join("");
    }

    function updateCashFlowSummary() {
        const totals =
            calculateTotals(
                getPeriodTransactions("month")
            );

        setText(
            "periodIncome",
            displayCurrency(totals.income)
        );

        setText(
            "periodExpenses",
            displayCurrency(totals.expenses)
        );

        setText(
            "periodCashFlow",
            displayCurrency(totals.cashFlow)
        );

        setText(
            "cashFlowHealth",
            totals.cashFlow >= 0
                ? "Positive"
                : "Needs attention"
        );
    }

    /* ============================================================
       PAGE HOOK
       ============================================================ */

    function callPageUpdate() {
        try {
            if (
                typeof window.moneyLeakPageUpdate ===
                "function"
            ) {
                window.moneyLeakPageUpdate();
            }
        } catch (error) {
            console.warn(
                "MoneyLeak page update error:",
                error
            );
        }
    }

    function refreshEverything() {
        updateDashboard();
        callPageUpdate();

        window.dispatchEvent(
            new CustomEvent(
                "moneyLeakUpdated"
            )
        );
    }

    /* ============================================================
       SEARCH UI
       ============================================================ */

    function setupSearch() {
        const button =
            document.getElementById(
                "searchButton"
            );

        const overlay =
            document.getElementById(
                "searchOverlay"
            );

        const close =
            document.getElementById(
                "closeSearch"
            ) ||
            document.getElementById(
                "searchClose"
            );

        const input =
            document.getElementById(
                "globalSearch"
            );

        const results =
            document.getElementById(
                "searchResults"
            );

        if (!overlay) {
            return;
        }

        const hide = () => {
            overlay.hidden = true;
            overlay.classList.remove(
                "open",
                "active"
            );
            overlay.style.display = "none";
            overlay.setAttribute(
                "aria-hidden",
                "true"
            );

            document.body.classList.remove(
                "search-open"
            );
        };

        const show = () => {
            overlay.hidden = false;
            overlay.classList.add(
                "open",
                "active"
            );
            overlay.style.display = "flex";
            overlay.setAttribute(
                "aria-hidden",
                "false"
            );

            setTimeout(() => {
                input?.focus();
            }, 50);
        };

        button?.addEventListener(
            "click",
            show
        );

        close?.addEventListener(
            "click",
            hide
        );

        overlay.addEventListener(
            "click",
            event => {
                if (
                    event.target === overlay
                ) {
                    hide();
                }
            }
        );

        input?.addEventListener(
            "input",
            () => {
                const matches =
                    searchMoneyLeak(
                        input.value
                    );

                if (!input.value.trim()) {
                    if (results) {
                        results.innerHTML =
                            "<p>Start typing to search.</p>";
                    }
                    return;
                }

                if (!matches.length) {
                    if (results) {
                        results.innerHTML =
                            "<p>No results found.</p>";
                    }
                    return;
                }

                if (results) {
                    results.innerHTML =
                        matches
                            .map(item => {
                                if (
                                    item.resultType ===
                                    "page"
                                ) {
                                    return `
                                        <button
                                            type="button"
                                            class="search-result"
                                            data-url="${escapeHTML(
                                                item.url
                                            )}"
                                        >
                                            <strong>
                                                ${escapeHTML(
                                                    item.name
                                                )}
                                            </strong>
                                            <small>
                                                Page
                                            </small>
                                        </button>
                                    `;
                                }

                                return `
                                    <button
                                        type="button"
                                        class="search-result"
                                    >
                                        <strong>
                                            ${escapeHTML(
                                                item.description
                                            )}
                                        </strong>
                                        <small>
                                            ${escapeHTML(
                                                item.category
                                            )}
                                            ·
                                            ${formatCurrency(
                                                item.amount
                                            )}
                                        </small>
                                    </button>
                                `;
                            })
                            .join("");

                    results
                        .querySelectorAll(
                            "[data-url]"
                        )
                        .forEach(item => {
                            item.addEventListener(
                                "click",
                                () => {
                                    window.location.href =
                                        item.dataset.url;
                                }
                            );
                        });
                }
            }
        );

        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "/" &&
                    document.activeElement?.tagName !==
                        "INPUT" &&
                    document.activeElement?.tagName !==
                        "TEXTAREA"
                ) {
                    event.preventDefault();
                    show();
                }

                if (
                    event.key === "Escape" &&
                    !overlay.hidden
                ) {
                    hide();
                }
            }
        );
    }

    /* ============================================================
       NOTIFICATIONS
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

        const list =
            document.getElementById(
                "notificationList"
            );

        if (!panel) {
            return;
        }

        const hide = () => {
            panel.hidden = true;
            panel.classList.remove(
                "open",
                "active"
            );
        };

        const show = () => {
            renderNotifications();

            panel.hidden = false;
            panel.classList.add(
                "open",
                "active"
            );
        };

        button?.addEventListener(
            "click",
            show
        );

        close?.addEventListener(
            "click",
            hide
        );

        panel.addEventListener(
            "click",
            event => {
                if (
                    event.target === panel
                ) {
                    hide();
                }
            }
        );

        function renderNotifications() {
            if (!list) {
                return;
            }

            const alerts =
                generateAlerts();

            if (!alerts.length) {
                list.innerHTML =
                    "<p>No new notifications.</p>";
                return;
            }

            list.innerHTML =
                alerts
                    .map(alert => `
                        <div class="notification-item">
                            <strong>
                                ${escapeHTML(
                                    alert.title
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    alert.message
                                )}
                            </p>
                        </div>
                    `)
                    .join("");
        }

        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Escape" &&
                    !panel.hidden
                ) {
                    hide();
                }
            }
        );
    }

    /* ============================================================
       PERIOD BUTTONS
       ============================================================ */

    function setupPeriodButtons() {
        document
            .querySelectorAll(
                "[data-period]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        document
                            .querySelectorAll(
                                "[data-period]"
                            )
                            .forEach(item =>
                                item.classList.remove(
                                    "active"
                                )
                            );

                        button.classList.add(
                            "active"
                        );

                        window.dispatchEvent(
                            new CustomEvent(
                                "moneyLeakPeriodChanged",
                                {
                                    detail: {
                                        period:
                                            button.dataset
                                                .period
                                    }
                                }
                            )
                        );
                    }
                );
            });
    }

    /* ============================================================
       MOBILE NAVIGATION
       ============================================================ */

    function setupMobileNavigation() {
        const open =
            document.getElementById(
                "mobileMenuButton"
            );

        const close =
            document.getElementById(
                "mobileMenuClose"
            );

        const overlay =
            document.getElementById(
                "mobileOverlay"
            );

        if (!overlay) {
            return;
        }

        open?.addEventListener(
            "click",
            () => {
                overlay.classList.add(
                    "open"
                );
            }
        );

        close?.addEventListener(
            "click",
            () => {
                overlay.classList.remove(
                    "open"
                );
            }
        );
    }

    /* ============================================================
       GREETING
       ============================================================ */

    function setupGreeting() {
        const greeting =
            document.getElementById(
                "dashboardGreeting"
            );

        if (!greeting) {
            return;
        }

        const hour =
            new Date().getHours();

        let text = "Good evening";

        if (hour < 12) {
            text = "Good morning";
        } else if (hour < 18) {
            text = "Good afternoon";
        }

        greeting.textContent =
            `${text}, ${getSettings().name || "there"}`;
    }

    /* ============================================================
       GLOBAL SHORTCUTS
       ============================================================ */

    function setupKeyboardShortcuts() {
        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.ctrlKey &&
                    event.shiftKey &&
                    event.key.toLowerCase() === "m"
                ) {
                    event.preventDefault();

                    const button =
                        document.getElementById(
                            "moneyLeakVoiceButton"
                        );

                    button?.click();
                }
            }
        );
    }

    /* ============================================================
       INITIALIZATION
       ============================================================ */

    function initialize() {
        if (
            !localStorage.getItem(
                STORAGE.initialized
            )
        ) {
            writeJSON(
                STORAGE.initialized,
                {
                    version: 3,
                    createdAt:
                        new Date().toISOString()
                }
            );
        }

        applySettings();

        createAssistantUI();

        setupSearch();
        setupNotifications();
        setupPeriodButtons();
        setupMobileNavigation();
        setupGreeting();
        setupKeyboardShortcuts();

        refreshEverything();

        console.log(
            "%cMoneyLeak 3.0 initialized",
            "font-weight:bold;font-size:14px;"
        );

        console.log(
            "MoneyLeak AI voice assistant:",
            supportsSpeechRecognition()
                ? "available"
                : "browser unsupported"
        );
    }

    /* ============================================================
       PUBLIC API
       ============================================================ */

    window.MoneyLeak = {
        version: "3.0",

        storage: STORAGE,

        categories: CATEGORIES,
        incomeSources: INCOME_SOURCES,

        getSettings,
        saveSettings,

        getTransactions,
        saveTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,

        getIncomeTransactions,
        getExpenseTransactions,

        calculateTotals,
        getPeriodTransactions,

        formatCurrency,
        formatCompactCurrency,
        displayCurrency,
        currencySymbol,

        formatDate,
        formatShortDate,

        getSavingsGoals,
        saveSavingsGoals,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        goalProgress,

        getMonthlyBudget,
        setMonthlyBudget,

        getCategoryBudgets,
        setCategoryBudget,
        deleteCategoryBudget,

        categorySpending,
        currentMonthExpenses,

        getRecurringTransactions,
        saveRecurringTransactions,
        addRecurringTransaction,
        deleteRecurringTransaction,

        calculateFinancialHealth,
        getSafeToSpend,

        generateInsight,
        generateAlerts,
        getAlerts,

        searchMoneyLeak,

        speak,
        startListening,
        stopListening,
        processAssistantCommand,

        refresh: refreshEverything,

        todayString
    };

    window.addEventListener(
        "moneyLeakUpdated",
        () => {
            updateDashboard();
        }
    );

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }
})();
