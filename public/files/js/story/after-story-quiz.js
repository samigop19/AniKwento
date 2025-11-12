// After Story Quiz JavaScript

let quizData = {
    storyId: null,
    storyTitle: '',
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    answers: [],
    userAnswers: [] // Track answers for each question
};

// Initialize quiz on page load
document.addEventListener('DOMContentLoaded', function() {
    loadQuizData();
});

// Load quiz data - prioritize currentStoryQuizData over generatedStoryData
async function loadQuizData() {
    try {
        console.log('🎯 Loading quiz data...');

        // First try to load from currentStoryQuizData (set by storyboard)
        let quizDataFromStorage = localStorage.getItem('currentStoryQuizData');

        // Fallback to generatedStoryData (for newly generated stories)
        if (!quizDataFromStorage) {
            console.log('📝 No currentStoryQuizData, trying generatedStoryData...');
            quizDataFromStorage = localStorage.getItem('generatedStoryData');
        }

        if (!quizDataFromStorage) {
            showError('No quiz data found. Please go back to the story.');
            return;
        }

        const storyData = JSON.parse(quizDataFromStorage);
        console.log('📦 Loaded story data:', storyData);

        // If we have a story ID, fetch fresh data from database to ensure accuracy
        if (storyData.storyId || storyData.id) {
            const storyId = storyData.storyId || storyData.id;
            console.log('🔄 Fetching fresh quiz data from database for story ID:', storyId);

            try {
                const response = await fetch(`/source/handlers/get_story_detail.php?story_id=${storyId}`);
                const result = await response.json();

                if (result.success && result.story.afterStoryQuestions) {
                    console.log('✅ Fresh quiz data loaded from database');
                    storyData.afterStoryQuestions = result.story.afterStoryQuestions;
                    storyData.title = result.story.title;
                } else {
                    console.warn('⚠️ Could not fetch fresh data, using localStorage data');
                }
            } catch (fetchError) {
                console.warn('⚠️ Error fetching fresh data, using localStorage data:', fetchError);
            }
        }

        if (!storyData.afterStoryQuestions || storyData.afterStoryQuestions.length === 0) {
            showError('No quiz questions found for this story.');
            return;
        }

        quizData.storyId = storyData.storyId || storyData.id || null;
        quizData.storyTitle = storyData.title || 'Educational Story';
        quizData.questions = storyData.afterStoryQuestions;
        quizData.currentQuestionIndex = 0;
        quizData.score = 0;
        quizData.answers = [];
        quizData.userAnswers = new Array(storyData.afterStoryQuestions.length).fill(null);

        console.log('✅ Quiz initialized:', {
            storyId: quizData.storyId,
            title: quizData.storyTitle,
            questionCount: quizData.questions.length
        });

        // Update UI
        document.getElementById('storyTitle').textContent = quizData.storyTitle;
        document.getElementById('totalQuestions').textContent = quizData.questions.length;

        // Load first question
        loadQuestion(0);

    } catch (error) {
        console.error('❌ Error loading quiz data:', error);
        showError('Failed to load quiz data. Please try again.');
    }
}

// Load a specific question
function loadQuestion(index) {
    if (index < 0 || index >= quizData.questions.length) {
        return;
    }

    const question = quizData.questions[index];
    quizData.currentQuestionIndex = index;

    // Update progress
    document.getElementById('currentQuestion').textContent = index + 1;
    updateScore();

    // Update question text
    document.getElementById('questionText').textContent = question.question;

    // Clear and populate choices
    const choicesContainer = document.getElementById('choicesContainer');
    choicesContainer.innerHTML = '';

    const previousAnswer = quizData.userAnswers[index];

    question.choices.forEach((choice, idx) => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice-btn';
        choiceDiv.setAttribute('data-letter', choice.letter);
        choiceDiv.setAttribute('data-text', choice.text);

        // Restore answer highlighting if previously revealed
        if (previousAnswer && previousAnswer.revealed) {
            if (choice.letter === question.correctAnswer.letter) {
                choiceDiv.classList.add('correct');
            }
        }

        choiceDiv.innerHTML = `
            <div class="choice-letter">${choice.letter}</div>
            <div class="choice-text">${choice.text}</div>
        `;

        // Add click handler if not previously answered
        if (!previousAnswer || !previousAnswer.revealed) {
            choiceDiv.onclick = () => selectAnswer(choice.letter);
        }

        choicesContainer.appendChild(choiceDiv);
    });

    // Show/hide feedback based on whether answer was revealed
    const feedbackSection = document.getElementById('feedbackSection');
    const showAnswerSection = document.querySelector('.show-answer-section');
    const showAnswerBtn = document.getElementById('showAnswerBtn');
    const showAnswerText = document.getElementById('showAnswerText');

    if (previousAnswer && previousAnswer.revealed) {
        // Answer was revealed, show it
        feedbackSection.style.display = 'block';
        feedbackSection.className = 'feedback-section correct';

        const feedbackTitle = feedbackSection.querySelector('h4');
        const feedbackText = feedbackSection.querySelector('p');
        feedbackTitle.innerHTML = '<i class="fas fa-lightbulb"></i> Answer Revealed';
        feedbackText.textContent = `The correct answer is: ${question.correctAnswer.text}`;

        showAnswerText.textContent = 'Hide Answer';
        showAnswerBtn.querySelector('i').className = 'fas fa-eye-slash';
    } else {
        // Answer not revealed yet
        feedbackSection.style.display = 'none';
        showAnswerText.textContent = 'Show Answer';
        showAnswerBtn.querySelector('i').className = 'fas fa-eye';
    }

    // Update navigation buttons
    updateNavigationButtons();
}

// Update navigation buttons state
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Previous button - disable if on first question
    if (quizData.currentQuestionIndex === 0) {
        prevBtn.disabled = true;
    } else {
        prevBtn.disabled = false;
    }

    // Next button is always available
    if (quizData.currentQuestionIndex === quizData.questions.length - 1) {
        nextBtn.disabled = true;
    } else {
        nextBtn.disabled = false;
    }
}

// Update score display
function updateScore() {
    const totalScore = quizData.userAnswers.filter(a => a !== null && a.isCorrect).length;
    quizData.score = totalScore;
}

// Handle answer selection
function selectAnswer(selectedLetter) {
    const question = quizData.questions[quizData.currentQuestionIndex];
    const isCorrect = selectedLetter === question.correctAnswer.letter;

    // Record answer for this specific question
    quizData.userAnswers[quizData.currentQuestionIndex] = {
        questionNumber: quizData.currentQuestionIndex + 1,
        selectedAnswer: selectedLetter,
        correctAnswer: question.correctAnswer.letter,
        isCorrect: isCorrect
    };

    // Update score
    updateScore();

    // Disable all choice buttons
    const choiceBtns = document.querySelectorAll('.choice-btn');
    choiceBtns.forEach(btn => {
        btn.classList.add('disabled');
        btn.onclick = null;

        const letter = btn.querySelector('.choice-letter').textContent;

        // Highlight correct answer
        if (letter === question.correctAnswer.letter) {
            btn.classList.add('correct');
        }

        // Highlight incorrect selection
        if (letter === selectedLetter && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });

    // Show feedback
    showFeedback(isCorrect, question.correctAnswer.text);

    // Hide show answer button
    document.querySelector('.show-answer-section').classList.add('hidden');

    // Update navigation buttons
    updateNavigationButtons();
}

// Toggle answer visibility
function toggleAnswer() {
    const question = quizData.questions[quizData.currentQuestionIndex];
    const previousAnswer = quizData.userAnswers[quizData.currentQuestionIndex];
    const choiceBtns = document.querySelectorAll('.choice-btn');
    const feedbackSection = document.getElementById('feedbackSection');
    const showAnswerBtn = document.getElementById('showAnswerBtn');
    const showAnswerText = document.getElementById('showAnswerText');

    console.log('🔍 Toggle Answer - Current question:', question);
    console.log('   Correct answer:', question.correctAnswer);

    // Check if answer is currently shown
    const isAnswerShown = Array.from(choiceBtns).some(div =>
        div.classList.contains('correct')
    );

    if (isAnswerShown) {
        // Hide answer - remove highlighting
        choiceBtns.forEach(div => {
            div.classList.remove('correct');
            // Re-enable clicking
            const letter = div.getAttribute('data-letter');
            div.onclick = () => selectAnswer(letter);
        });

        // Hide feedback
        feedbackSection.style.display = 'none';

        // Update button text
        showAnswerText.textContent = 'Show Answer';
        showAnswerBtn.querySelector('i').className = 'fas fa-eye';

        // Remove revealed flag
        quizData.userAnswers[quizData.currentQuestionIndex] = null;
        console.log('✅ Answer hidden');
    } else {
        // Show answer
        console.log('📝 Showing correct answer:', question.correctAnswer.letter);

        // Mark as revealed
        quizData.userAnswers[quizData.currentQuestionIndex] = {
            questionNumber: quizData.currentQuestionIndex + 1,
            selectedAnswer: null,
            correctAnswer: question.correctAnswer.letter,
            isCorrect: false,
            revealed: true
        };

        // Highlight only the correct answer in green
        choiceBtns.forEach(div => {
            const letter = div.getAttribute('data-letter');

            // Highlight only correct answer in green
            if (letter === question.correctAnswer.letter) {
                div.classList.add('correct');
                console.log('✅ Highlighted choice:', letter);
            }

            // Disable clicking on all choices
            div.onclick = null;
        });

        // Show feedback for revealed answer
        const feedbackTitle = feedbackSection.querySelector('h4');
        const feedbackText = feedbackSection.querySelector('p');

        feedbackSection.style.display = 'block';
        feedbackSection.className = 'feedback-section correct';

        feedbackTitle.innerHTML = '<i class="fas fa-lightbulb"></i> Answer Revealed';
        feedbackText.textContent = `The correct answer is: ${question.correctAnswer.text}`;

        // Update button text
        showAnswerText.textContent = 'Hide Answer';
        showAnswerBtn.querySelector('i').className = 'fas fa-eye-slash';

        console.log('✅ Answer shown');
    }
}

// Show feedback message
function showFeedback(isCorrect, correctAnswerText) {
    const feedbackSection = document.getElementById('feedbackSection');
    const feedbackTitle = feedbackSection.querySelector('h4');
    const feedbackText = feedbackSection.querySelector('p');

    feedbackSection.style.display = 'block';
    feedbackSection.className = 'feedback-section ' + (isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
        feedbackTitle.innerHTML = '<i class="fas fa-check-circle"></i> Correct!';
        feedbackText.textContent = 'Great job! You got it right!';
    } else {
        feedbackTitle.innerHTML = '<i class="fas fa-times-circle"></i> Not quite';
        feedbackText.textContent = `The correct answer is: ${correctAnswerText}`;
    }
}

// Go to previous question
function previousQuestion() {
    const prevIndex = quizData.currentQuestionIndex - 1;
    if (prevIndex >= 0) {
        loadQuestion(prevIndex);
    }
}

// Go to next question
function nextQuestion() {
    const nextIndex = quizData.currentQuestionIndex + 1;
    if (nextIndex < quizData.questions.length) {
        loadQuestion(nextIndex);
    }
}

// Finish quiz and show results - REMOVED
// No longer needed since finish button and results section were removed

// Go back to dashboard/storyboard
function goToDashboard() {
    // Check if we came from storyboard
    if (document.referrer.includes('StoryDashboard')) {
        window.location.href = '../../dashboard/StoryDashboard.php';
    } else {
        window.history.back();
    }
}

// Show error message
function showError(message) {
    document.getElementById('questionText').textContent = message;
    document.getElementById('choicesContainer').innerHTML = '';
}
