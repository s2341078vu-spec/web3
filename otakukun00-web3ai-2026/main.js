// --- 状態管理 ---
let appState = {
    logs: [],
    journals: [],
    sealed: []
};

// 答えのない問いリスト
const ZEN_QUESTIONS = [
    // 外部評価・比較
    "誰も見ていなければ、今日どう生きていましたか？",
    "あなたが今一番恐れているのは、失敗ですか。それとも誰かに評価されないことですか？",
    "「すごいね」と言われたとき、本当に嬉しかったのはいつですか？",
    "誰かと比べてやめたこと、比べなければ続けていたことはありますか？",
    "あなたの「普通」は、誰が決めましたか？",

    // 効率・コスパ
    "「コスパが悪い」とわかっていても、やりたいことがありますか？",
    "最後に、結果を気にせず誰かのために何かをしたのはいつですか？",
    "あなたの時間の使い方を、10年後の自分が見たら何と言うでしょう？",
    "「無駄だった」と思っていたことが、実は必要だったと気づいた経験はありますか？",

    // 感情・人間性
    "今日、感情を「処理」しましたか。それとも「感じ」ましたか？",
    "最後に、理由もなく誰かのことを思い出したのはいつですか？",
    "あなたが泣いたり笑ったりしたとき、それを「非効率」だと感じたことはありますか？",
    "人に弱さを見せたとき、何が起きましたか？",

    // 人間関係・恋愛
    "相手のことを信じるのを、何かで代替しようとしたことはありますか？",
    "「返信が早い＝大切にされている」と感じたことはありますか。本当にそうでしょうか？",
    "あなたが誰かといるとき、スマートフォンをしまえていますか？",
    "相手の「不完全さ」を愛したことはありますか？",

    // 自己
    "あなたが「自分らしい」と感じる瞬間は、誰かの目がある時ですか、ない時ですか？",
    "子どもの頃の自分が大切にしていたもので、今は捨ててしまったものはありますか？",
    "もし明日、SNSのアカウントをすべて消したら、何を失いますか？"
];

document.addEventListener("DOMContentLoaded", () => {

    // --- DOM ---
    const logForm = document.getElementById("log-form");
    const logContentInput = document.getElementById("log-content");
    const timelineList = document.getElementById("timeline-list");

    const catSpeech = document.getElementById("cat-speech");
    const catDisplay = document.getElementById("cat-display");

    const zenTitle = document.getElementById("zen-title");
    const zenQuestionText = document.getElementById("zen-question");
    const pastAnswerPanel = document.getElementById("past-answer-panel");
    const pastAnswerDate = document.getElementById("past-answer-date");
    const pastAnswerText = document.getElementById("past-answer-text");
    const journalAnswerInput = document.getElementById("journal-answer");
    const submitJournalBtn = document.getElementById("submit-journal");
    const refreshQuestionBtn = document.getElementById("refresh-question");
    const historyList = document.getElementById("history-list");

    const btnFuture = document.getElementById("btn-future");
    const btnSomeone = document.getElementById("btn-someone");
    const openDateGroup = document.getElementById("open-date-group");
    const sealOpenDate = document.getElementById("seal-open-date");
    const sealContent = document.getElementById("seal-content");
    const sealBtn = document.getElementById("seal-btn");
    const sealedCard = document.getElementById("sealed-card");
    const sealedList = document.getElementById("sealed-list");

    const breatheTriggerBtn = document.getElementById("breathe-trigger-btn");
    const breatheModal = document.getElementById("breathe-modal");
    const breatheCircle = document.getElementById("breathe-circle");
    const breatheInstruction = document.getElementById("breathe-instruction");
    const breatheTimer = document.getElementById("breathe-timer");
    const cancelBreathe = document.getElementById("cancel-breathe");

    let breatheInterval = null;
    let breatheCountdown = 60;
    let breathePhase = 0;
    let sealRecipient = "future"; // "future" | "someone"
    let reflectMode = null;

    // --- 初期化 ---
    loadStateFromLocalStorage();
    updateUI();
    setRandomZenQuestion();

    // 開封日の最小値を今日に
    const today = new Date().toISOString().split("T")[0];
    sealOpenDate.min = today;
    sealOpenDate.value = today;

    // --- 余白ログ ---
    logForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const content = logContentInput.value.trim();
        if (!content) return;

        appState.logs.unshift({
            id: Date.now(),
            content,
            timestamp: new Date().toLocaleString("ja-JP")
        });

        saveStateToLocalStorage();
        updateUI();
        logContentInput.value = "";
    });

    // --- 思索ジャーナル ---
    let isSubmittingJournal = false;
    submitJournalBtn.addEventListener("click", () => {
        if (isSubmittingJournal) return;
        const question = zenQuestionText.textContent;
        const answer = journalAnswerInput.value.trim();
        if (!answer) return;

        isSubmittingJournal = true;
        journalAnswerInput.classList.add("fade-out-disappear");
        zenQuestionText.classList.add("fade-out-disappear");
        if (reflectMode) pastAnswerPanel.classList.add("fade-out-disappear");

        appState.journals.unshift({
            id: Date.now(),
            question,
            answer,
            timestamp: new Date().toLocaleDateString("ja-JP"),
            previousId: reflectMode ? reflectMode.previousId : null
        });

        saveStateToLocalStorage();

        setTimeout(() => {
            reflectMode = null;
            pastAnswerPanel.style.display = "none";
            pastAnswerPanel.classList.remove("fade-out-disappear");
            zenTitle.textContent = "Zen Question";
            journalAnswerInput.placeholder = "答えは一つではありません。今のあなたの考えを自由に綴ってください...";
            refreshQuestionBtn.style.opacity = "";
            refreshQuestionBtn.style.pointerEvents = "";
            updateUI();
            journalAnswerInput.value = "";
            journalAnswerInput.classList.remove("fade-out-disappear");
            setRandomZenQuestion();
            zenQuestionText.classList.remove("fade-out-disappear");
            isSubmittingJournal = false;
        }, 1500);
    });

    refreshQuestionBtn.addEventListener("click", () => {
        if (isSubmittingJournal || reflectMode) return;
        setRandomZenQuestion();
    });

    // --- 封じる: 宛先切り替え ---
    btnFuture.addEventListener("click", () => {
        sealRecipient = "future";
        btnFuture.classList.add("active");
        btnSomeone.classList.remove("active");
        openDateGroup.style.display = "block";
        sealContent.placeholder = "今のあなたの気持ちや想いを。未来の自分へ…";
    });

    btnSomeone.addEventListener("click", () => {
        sealRecipient = "someone";
        btnSomeone.classList.add("active");
        btnFuture.classList.remove("active");
        openDateGroup.style.display = "none";
        sealContent.placeholder = "伝えたかった言葉を、ここに封じてください…";
    });

    // --- 封じる: 送信 ---
    sealBtn.addEventListener("click", () => {
        const content = sealContent.value.trim();
        if (!content) return;
        if (sealRecipient === "future" && !sealOpenDate.value) return;

        appState.sealed.unshift({
            id: Date.now(),
            recipient: sealRecipient,
            openDate: sealRecipient === "future" ? sealOpenDate.value : null,
            content,
            createdAt: new Date().toLocaleDateString("ja-JP"),
            opened: false
        });

        saveStateToLocalStorage();
        updateUI();
        sealContent.value = "";

        // 封じたアニメーション
        sealBtn.textContent = "封じました";
        sealBtn.disabled = true;
        setTimeout(() => {
            sealBtn.innerHTML = '<i data-lucide="lock"></i><span>封じる</span>';
            sealBtn.disabled = false;
            if (window.lucide) lucide.createIcons();
        }, 1500);
    });

    // --- 猫 ---
    catDisplay.addEventListener("click", () => {
        const options = [
            "「余白は足りてるかニャ？急がなくていいニャ。」",
            "「完璧じゃなくてもいいニャ。バグも人間らしさニャ。」",
            "「ちょっとスマホを置いて、遠くを見るニャ。」",
            "「息を吸って〜、吐いて〜、のんびりいくニャ。」",
            "「無駄な時間こそ、一番贅沢な時間だニャ。」"
        ];
        catSpeech.textContent = options[Math.floor(Math.random() * options.length)];
    });

    // --- 再思索モード ---
    function enterReflectMode(journal) {
        reflectMode = { previousId: journal.id };
        document.getElementById("section-reflect").scrollIntoView({ behavior: "smooth", block: "start" });
        zenTitle.textContent = "再思索";
        zenQuestionText.textContent = journal.question;
        pastAnswerDate.textContent = `（${journal.timestamp}）`;
        pastAnswerText.textContent = journal.answer;
        pastAnswerPanel.style.display = "block";
        journalAnswerInput.value = "";
        journalAnswerInput.placeholder = "あのときと比べて、今のあなたはどう感じますか？";
        refreshQuestionBtn.style.opacity = "0.3";
        refreshQuestionBtn.style.pointerEvents = "none";
    }

    // --- 呼吸ガイド ---
    breatheTriggerBtn.addEventListener("click", openBreatheSession);
    cancelBreathe.addEventListener("click", closeBreatheSession);

    function openBreatheSession() {
        breatheCountdown = 60;
        breathePhase = 0;
        breatheModal.classList.add("active");
        breatheTimer.textContent = `${breatheCountdown}s`;
        breatheCircle.className = "breathe-circle inhale";
        breatheInstruction.textContent = "吸って…";

        let phaseTimer = 4;
        breatheInterval = setInterval(() => {
            breatheCountdown--;
            breatheTimer.textContent = `${breatheCountdown}s`;
            phaseTimer--;
            if (phaseTimer <= 0) {
                breathePhase = (breathePhase + 1) % 3;
                phaseTimer = 4;
                if (breathePhase === 0) {
                    breatheCircle.className = "breathe-circle inhale";
                    breatheInstruction.textContent = "吸って…";
                } else if (breathePhase === 1) {
                    breatheCircle.className = "breathe-circle hold";
                    breatheInstruction.textContent = "止めて…";
                } else {
                    breatheCircle.className = "breathe-circle exhale";
                    breatheInstruction.textContent = "吐いて…";
                }
            }
            if (breatheCountdown <= 0) closeBreatheSession();
        }, 1000);
    }

    function closeBreatheSession() {
        clearInterval(breatheInterval);
        breatheModal.classList.remove("active");
    }

    // --- ストレージ ---
    function loadStateFromLocalStorage() {
        const saved = localStorage.getItem("yutori_journal_state_v2");
        const v1 = localStorage.getItem("yutori_journal_state");
        const base = saved || v1;
        if (base) {
            try {
                const parsed = JSON.parse(base);
                if (parsed && typeof parsed === "object") appState = parsed;
                if (!appState.logs) appState.logs = [];
                if (!appState.journals) appState.journals = [];
                if (!appState.sealed) appState.sealed = [];
            } catch (e) {
                console.error("読み込み失敗:", e);
            }
        }
    }

    function saveStateToLocalStorage() {
        localStorage.setItem("yutori_journal_state_v2", JSON.stringify(appState));
    }

    function setRandomZenQuestion() {
        zenQuestionText.textContent = ZEN_QUESTIONS[Math.floor(Math.random() * ZEN_QUESTIONS.length)];
    }

    // --- UI更新 ---
    function updateUI() {
        renderSealed();
        renderTimeline();
        renderHistory();
        if (window.lucide) lucide.createIcons();
    }

    function renderSealed() {
        if (appState.sealed.length === 0) {
            sealedCard.style.display = "none";
            return;
        }
        sealedCard.style.display = "block";
        sealedList.innerHTML = "";

        const todayStr = new Date().toISOString().split("T")[0];

        appState.sealed.forEach(item => {
            const el = document.createElement("div");
            el.className = "sealed-item";

            const canOpen = item.recipient === "future" && item.openDate <= todayStr && !item.opened;
            const isOpened = item.opened;

            if (isOpened) {
                // 開封済み
                el.classList.add("sealed-opened");
                el.innerHTML = `
                    <div class="sealed-header">
                        <span class="sealed-icon">📖</span>
                        <span class="sealed-label">未来の自分へ</span>
                        <span class="sealed-meta">${item.createdAt} → ${item.openDate} 開封</span>
                    </div>
                    <div class="sealed-content-text">${item.content}</div>
                `;
            } else if (item.recipient === "someone") {
                // 誰か（送らない）
                el.innerHTML = `
                    <div class="sealed-header">
                        <span class="sealed-icon">✉️</span>
                        <span class="sealed-label">ある人へ</span>
                        <span class="sealed-meta">${item.createdAt}</span>
                    </div>
                    <button class="btn-burn" data-id="${item.id}">燃やす</button>
                `;
            } else if (canOpen) {
                // 開封可能
                el.classList.add("sealed-ready");
                el.innerHTML = `
                    <div class="sealed-header">
                        <span class="sealed-icon">📬</span>
                        <span class="sealed-label">未来の自分へ</span>
                        <span class="sealed-meta">開封できます</span>
                    </div>
                    <button class="btn-open" data-id="${item.id}">開封する</button>
                `;
            } else {
                // 未来（まだ封じている）
                el.innerHTML = `
                    <div class="sealed-header">
                        <span class="sealed-icon">🔒</span>
                        <span class="sealed-label">未来の自分へ</span>
                        <span class="sealed-meta">${item.openDate} に開封</span>
                    </div>
                `;
            }

            sealedList.appendChild(el);
        });

        // イベント委譲
        sealedList.querySelectorAll(".btn-open").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = parseInt(btn.dataset.id);
                const item = appState.sealed.find(s => s.id === id);
                if (item) { item.opened = true; saveStateToLocalStorage(); updateUI(); }
            });
        });

        // 燃やすボタン（2段階確認）
        sealedList.querySelectorAll(".btn-burn").forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.dataset.confirm === "true") {
                    const id = parseInt(btn.dataset.id);
                    appState.sealed = appState.sealed.filter(s => s.id !== id);
                    saveStateToLocalStorage();
                    updateUI();
                } else {
                    btn.textContent = "本当に？";
                    btn.dataset.confirm = "true";
                    setTimeout(() => {
                        if (btn.dataset.confirm === "true") {
                            btn.textContent = "燃やす";
                            btn.dataset.confirm = "";
                        }
                    }, 3000);
                }
            });
        });
    }

    function renderTimeline() {
        if (appState.logs.length === 0) {
            timelineList.innerHTML = `<p class="empty-note">まだ記録がありません。</p>`;
            return;
        }
        timelineList.innerHTML = "";
        appState.logs.forEach(log => {
            const el = document.createElement("div");
            el.className = "timeline-item";
            el.innerHTML = `
                <div class="item-time">${log.timestamp}</div>
                <div class="item-original">${log.content}</div>
            `;
            timelineList.appendChild(el);
        });
    }

    function renderHistory() {
        if (appState.journals.length === 0) {
            historyList.innerHTML = `<p class="empty-note">まだ記録がありません。</p>`;
            return;
        }
        historyList.innerHTML = "";

        const replyIds = new Set(
            appState.journals.filter(j => j.previousId).map(j => j.previousId)
        );

        appState.journals.forEach(journal => {
            if (replyIds.has(journal.id)) return;

            const reply = appState.journals.find(j => j.previousId === journal.id);
            const el = document.createElement("div");

            if (reply) {
                el.className = "history-item history-pair";
                el.innerHTML = `
                    <div class="pair-then">
                        <div class="pair-label">過去の自分 <span class="pair-date">${journal.timestamp}</span></div>
                        <div class="history-q">${journal.question}</div>
                        <div class="history-a">${journal.answer}</div>
                    </div>
                    <div class="pair-arrow">↓</div>
                    <div class="pair-now">
                        <div class="pair-label">今の自分 <span class="pair-date">${reply.timestamp}</span></div>
                        <div class="history-a">${reply.answer}</div>
                    </div>
                `;
            } else {
                el.className = "history-item";
                el.innerHTML = `
                    <div class="history-header">
                        <span>${journal.timestamp}</span>
                        <button class="btn-reflect" data-id="${journal.id}">今の自分で答える</button>
                    </div>
                    <div class="history-q">${journal.question}</div>
                    <div class="history-a">${journal.answer}</div>
                `;
                el.querySelector(".btn-reflect").addEventListener("click", () => {
                    enterReflectMode(journal);
                });
            }

            historyList.appendChild(el);
        });
    }
});
