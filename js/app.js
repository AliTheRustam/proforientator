/* ============================================================
   Логика сайта: квиз + рендеринг каталога профессий
   ============================================================ */

const $ = (sel) => document.querySelector(sel);

const state = {
  step: 0,                 // текущий вопрос
  answers: new Array(QUIZ.length).fill(null), // выбранные варианты
  scores: {},              // баллы по профессиям
  locked: false            // защита от двойных кликов во время перехода
};

/* ---------- КАТАЛОГ ПРОФЕССИЙ ---------- */
function renderCatalog() {
  const grid = $("#profGrid");
  grid.innerHTML = PROFESSIONS.map((p) => `
    <article class="prof-card" id="prof-${p.id}">
      <div class="prof-head">
        <h3>${p.name}</h3>
        <p class="prof-tagline">${p.tagline}</p>
        <div class="prof-market">
          <div><b>${p.market.vacancies.toLocaleString("ru-RU")}</b><span>вакансий на hh.ru</span></div>
          <div><b>${p.market.salary.toLocaleString("ru-RU")} ₽</b><span>ср. оплата по выдаче</span></div>
        </div>
      </div>
      <div class="prof-body">
        <div class="prof-block">
          <h4>Чем занимаешься</h4>
          <ul>${p.tasks.map((t) => `<li>${t}</li>`).join("")}</ul>
        </div>
        <div class="prof-block">
          <h4>Что нужно уметь</h4>
          <ul>${p.skills.map((s) => `<li>${s}</li>`).join("")}</ul>
        </div>
        <div class="prof-block">
          <h4>Плюсы</h4>
          <ul>${p.pros.map((s) => `<li>${s}</li>`).join("")}</ul>
        </div>
        <div class="prof-block cons">
          <h4>Честные минусы</h4>
          <ul>${p.cons.map((s) => `<li>${s}</li>`).join("")}</ul>
        </div>
      </div>
      <details class="prof-details">
        <summary>Пути обучения и попробуй сейчас</summary>
        <div class="details-inner">
          <div class="prof-block">
            <h4>Как прийти в профессию</h4>
            <p class="edu-line"><b>Вуз:</b> ${p.education.vuz}</p>
            <p class="edu-line"><b>Колледж:</b> ${p.education.college}</p>
            <p class="edu-line"><b>Курсы:</b> ${p.education.courses}</p>
          </div>
          <div class="prof-block">
            <h4>Попробуй сейчас</h4>
            <ul>${p.now.map((n) => `<li>${n}</li>`).join("")}</ul>
          </div>
        </div>
      </details>
    </article>
  `).join("");
}

/* ---------- ТЕСТ ---------- */
function renderQuestion() {
  const q = QUIZ[state.step];
  $("#quizCounter").textContent = `Вопрос ${state.step + 1} из ${QUIZ.length}`;
  $("#quizBar").style.width = `${((state.step + 1) / QUIZ.length) * 100}%`;
  $("#quizQuestion").textContent = q.q;
  $("#quizBack").hidden = state.step === 0;

  $("#quizAnswers").innerHTML = q.answers.map((a, i) => `
    <button class="quiz-answer ${state.answers[state.step] === i ? "selected" : ""}" data-i="${i}">${a.t}</button>
  `).join("");

  document.querySelectorAll(".quiz-answer").forEach((btn) => {
    btn.addEventListener("click", () => onAnswer(+btn.dataset.i));
  });
}

function onAnswer(i) {
  if (state.locked) return;      // защита от двойных кликов
  state.locked = true;
  state.answers[state.step] = i;
  document.querySelectorAll(".quiz-answer").forEach((b) => b.classList.remove("selected"));
  const btn = document.querySelector(`.quiz-answer[data-i="${i}"]`);
  if (btn) btn.classList.add("selected");

  // переход к следующему вопросу с лёгкой задержкой для обратной связи
  setTimeout(() => {
    if (state.step < QUIZ.length - 1) {
      state.step += 1;
      renderQuestion();
    } else {
      showResult();
    }
    state.locked = false;
  }, 220);
}

function goBack() {
  if (state.step > 0 && !state.locked) {
    state.step -= 1;
    renderQuestion();
  }
}

/* ---------- РЕЗУЛЬТАТ ---------- */
function calcScores() {
  const scores = {};
  PROFESSIONS.forEach((p) => { scores[p.id] = 0; });
  const reasons = {}; // id -> массив причин

  state.answers.forEach((ansIdx, qIdx) => {
    if (ansIdx === null) return;
    const variant = QUIZ[qIdx].answers[ansIdx];
    Object.entries(variant.s).forEach(([profId, pts]) => {
      scores[profId] += pts;
      if (pts >= 2) {
        if (!reasons[profId]) reasons[profId] = [];
        const name = PROFESSIONS.find((p) => p.id === profId).name;
        reasons[profId].push(QUIZ[qIdx].reason.replace("{name}", name));
      }
    });
  });

  return { scores, reasons };
}

function showResult() {
  const { scores, reasons } = calcScores();
  const maxPossible = QUIZ.length * 3; // теоретический максимум

  const ranked = PROFESSIONS
    .map((p) => ({ ...p, score: scores[p.id] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const top = ranked[0];

  $("#resultLead").textContent =
    `Лучшее совпадение — «${top.name}» (${Math.round((top.score / maxPossible) * 100)}%). ` +
    `Это направление, а не приговор: проверь его блоком «Попробуй сейчас» в каталоге.`;

  $("#resultCards").innerHTML = ranked.map((p) => {
    const pct = Math.round((p.score / maxPossible) * 100);
    const why = (reasons[p.id] || []).slice(0, 2).join(". ");
    return `
      <div class="result-card">
        <div class="rc-top">
          <h4>${p.name}</h4>
          <span class="rc-pct">${pct}% совпадение</span>
        </div>
        <div class="rc-bar"><i style="width:${pct}%"></i></div>
        <p class="rc-why">${why || "Совпадение по нескольким вопросам теста."}</p>
        <a class="rc-link" href="#prof-${p.id}">Подробнее о профессии →</a>
      </div>`;
  }).join("");

  $("#quizBox").hidden = true;
  $("#quizResult").hidden = false;
}

function restartQuiz() {
  state.step = 0;
  state.answers = new Array(QUIZ.length).fill(null);
  $("#quizResult").hidden = true;
  $("#quizBox").hidden = false;
  renderQuestion();
  document.getElementById("quiz").scrollIntoView({ behavior: "smooth" });
}

/* ---------- СТАРТ ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderCatalog();
  renderQuestion();
  $("#quizBack").addEventListener("click", goBack);
  $("#quizRestart").addEventListener("click", restartQuiz);
});
