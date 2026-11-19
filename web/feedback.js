function animateFeedback(element, tone) {
  if (tone) element.dataset.tone = tone;
  element.getAnimations().forEach((animation) => animation.cancel());
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  element.animate(
    [
      { opacity: 0.52, transform: "translateY(3px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 230, easing: "ease-out" },
  );
}

function showQuizAnswer(button, correct) {
  button.classList.add(correct ? "answer-correct" : "answer-wrong");
  if (!correct) button.setAttribute("aria-invalid", "true");
}
