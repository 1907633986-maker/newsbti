const data = window.NEWSBTI_DATA;

const views = {
  start: document.querySelector("#start-view"),
  quiz: document.querySelector("#quiz-view"),
  loading: document.querySelector("#loading-view"),
  result: document.querySelector("#result-view"),
};

const state = {
  index: 0,
  answers: [],
  scores: {},
};

function showView(name) {
  Object.entries(views).forEach(([key, node]) => {
    node.classList.toggle("hidden", key !== name);
  });
}

function resetScores() {
  state.scores = {};
  Object.keys(data.people).forEach((code) => {
    state.scores[code] = 0;
  });
}

function startQuiz() {
  state.index = 0;
  state.answers = [];
  resetScores();
  renderQuestion();
  showView("quiz");
}

function renderQuestion() {
  const question = data.questions[state.index];
  const total = data.questions.length;
  const progress = (state.index / total) * 100;

  document.querySelector("#question-count").textContent = `第 ${state.index + 1} / ${total} 题`;
  document.querySelector("#minute-label").textContent = `抽象测试第 ${(state.index + 1) * 3} 分钟`;
  document.querySelector("#question-text").textContent = question.text;
  document.querySelector("#progress-bar").style.width = `${progress}%`;

  const grid = document.querySelector("#option-grid");
  grid.innerHTML = "";

  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.type = "button";
    button.innerHTML = `
      <span class="option-key">${option.key}</span>
      <span class="option-text">${option.text}</span>
    `;
    button.addEventListener("click", () => chooseOption(option));
    grid.appendChild(button);
  });
}

function chooseOption(option) {
  state.answers.push({
    questionId: data.questions[state.index].id,
    key: option.key,
    scores: option.scores,
  });

  option.scores.forEach((code) => {
    state.scores[code] = (state.scores[code] || 0) + 1;
  });

  state.index += 1;

  if (state.index >= data.questions.length) {
    finishQuiz();
  } else {
    renderQuestion();
  }
}

function finishQuiz() {
  document.querySelector("#progress-bar").style.width = "100%";
  showView("loading");
  window.setTimeout(() => {
    renderResult(resolveWinner());
    showView("result");
  }, 850);
}

function resolveWinner() {
  const exposure = data.balance?.scoreExposure || {};
  const balancedScores = Object.fromEntries(
    Object.entries(state.scores).map(([code, score]) => {
      const divisor = Math.sqrt(Math.max(exposure[code] || 1, 1));
      return [code, score / divisor];
    })
  );

  const entries = Object.entries(balancedScores);
  const highScore = Math.max(...entries.map(([, score]) => score));
  let candidates = entries.filter(([, score]) => score === highScore).map(([code]) => code);

  if (candidates.length > 1) {
    const lateScores = {};
    candidates.forEach((code) => {
      lateScores[code] = 0;
    });

    state.answers.slice(-10).forEach((answer) => {
      answer.scores.forEach((code) => {
        if (code in lateScores) lateScores[code] += 1 / Math.sqrt(Math.max(exposure[code] || 1, 1));
      });
    });

    const lateHigh = Math.max(...Object.values(lateScores));
    candidates = candidates.filter((code) => lateScores[code] === lateHigh);
  }

  if (candidates.length > 1) {
    const finalHit = state.answers[state.answers.length - 1].scores.find((code) => candidates.includes(code));
    if (finalHit) return finalHit;
  }

  return candidates[0];
}

function renderResult(code) {
  const person = data.people[code];
  const sortedScores = Object.entries(state.scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  document.querySelector("#result-name").textContent = person.name;
  document.querySelector("#result-code").textContent = `${person.code} / ${person.grade}`;
  document.querySelector("#result-position").textContent = person.position;
  document.querySelector("#result-summary").textContent = person.result;
  document.querySelector("#result-core").textContent = person.core;
  document.querySelector("#result-function").textContent = person.function;
  document.querySelector("#result-highlight").textContent = person.highlight;
  document.querySelector("#result-risk").textContent = person.risk;

  const keywordRow = document.querySelector("#keyword-row");
  keywordRow.innerHTML = "";
  person.keywords.slice(0, 7).forEach((keyword) => {
    const chip = document.createElement("span");
    chip.textContent = keyword;
    keywordRow.appendChild(chip);
  });

  const strip = document.querySelector("#score-strip");
  strip.innerHTML = "";
  sortedScores.forEach(([scoreCode, score]) => {
    const item = document.createElement("span");
    item.textContent = `${data.people[scoreCode].name} ${score}`;
    strip.appendChild(item);
  });
}

document.querySelector("#start-btn").addEventListener("click", startQuiz);
document.querySelector("#restart-btn").addEventListener("click", startQuiz);
document.querySelector("#again-btn").addEventListener("click", startQuiz);

resetScores();
