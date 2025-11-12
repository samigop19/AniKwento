

let quizData = {
    storyId: null,
    storyTitle: '',
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    answers: [],
    userAnswers: [] 
};


document.addEventListener('DOMContentLoaded', function() {
    loadQuizData();
});


async function loadQuizData() {
    try {
        console.log('🎯 Loading quiz data...');

        
        let quizDataFromStorage = localStorage.getItem('currentStoryQuizData');

        
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

        
        document.getElementById('storyTitle').textContent = quizData.storyTitle;
        document.getElementById('totalQuestions').textContent = quizData.questions.length;

        
        loadQuestion(0);

    } catch (error) {
        console.error('❌ Error loading quiz data:', error);
        showError('Failed to load quiz data. Please try again.');
    }
}


function loadQuestion(index) {
    if (index < 0 || index >= quizData.questions.length) {
        return;
    }

    const question = quizData.questions[index];
    quizData.currentQuestionIndex = index;

    
    document.getElementById('currentQuestion').textContent = index + 1;
    updateScore();

    
    document.getElementById('questionText').textContent = question.question;

    
    const choicesContainer = document.getElementById('choicesContainer');
    choicesContainer.innerHTML = '';

    const previousAnswer = quizData.userAnswers[index];

    question.choices.forEach((choice, idx) => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice-btn';
        choiceDiv.setAttribute('data-letter', choice.letter);
        choiceDiv.setAttribute('data-text', choice.text);

        
        if (previousAnswer && previousAnswer.revealed) {
            if (choice.letter === question.correctAnswer.letter) {
                choiceDiv.classList.add('correct');
            }
        }

        choiceDiv.innerHTML = `
            <div class="choice-letter">${choice.letter}</div>
            <div class="choice-text">${choice.text}</div>
        `;

        
        if (!previousAnswer || !previousAnswer.revealed) {
            choiceDiv.onclick = () => selectAnswer(choice.letter);
        }

        choicesContainer.appendChild(choiceDiv);
    });

    
    const feedbackSection = document.getElementById('feedbackSection');
    const showAnswerSection = document.querySelector('.show-answer-section');
    const showAnswerBtn = document.getElementById('showAnswerBtn');
    const showAnswerText = document.getElementById('showAnswerText');

    if (previousAnswer && previousAnswer.revealed) {
        
        feedbackSection.style.display = 'block';
        feedbackSection.className = 'feedback-section correct';

        const feedbackTitle = feedbackSection.querySelector('h4');
        const feedbackText = feedbackSection.querySelector('p');
        feedbackTitle.innerHTML = '<i class="fas fa-lightbulb"></i> Answer Revealed';
        feedbackText.textContent = `The correct answer is: ${question.correctAnswer.text}`;

        showAnswerText.textContent = 'Hide Answer';
        showAnswerBtn.querySelector('i').className = 'fas fa-eye-slash';
    } else {
        
        feedbackSection.style.display = 'none';
        showAnswerText.textContent = 'Show Answer';
        showAnswerBtn.querySelector('i').className = 'fas fa-eye';
    }

    
    updateNavigationButtons();
}


function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    
    if (quizData.currentQuestionIndex === 0) {
        prevBtn.disabled = true;
    } else {
        prevBtn.disabled = false;
    }

    
    if (quizData.currentQuestionIndex === quizData.questions.length - 1) {
        nextBtn.disabled = true;
    } else {
        nextBtn.disabled = false;
    }
}


function updateScore() {
    const totalScore = quizData.userAnswers.filter(a => a !== null && a.isCorrect).length;
    quizData.score = totalScore;
}


function selectAnswer(selectedLetter) {
    const question = quizData.questions[quizData.currentQuestionIndex];
    const isCorrect = selectedLetter === question.correctAnswer.letter;

    
    quizData.userAnswers[quizData.currentQuestionIndex] = {
        questionNumber: quizData.currentQuestionIndex + 1,
        selectedAnswer: selectedLetter,
        correctAnswer: question.correctAnswer.letter,
        isCorrect: isCorrect
    };

    
    updateScore();

    
    const choiceBtns = document.querySelectorAll('.choice-btn');
    choiceBtns.forEach(btn => {
        btn.classList.add('disabled');
        btn.onclick = null;

        const letter = btn.querySelector('.choice-letter').textContent;

        
        if (letter === question.correctAnswer.letter) {
            btn.classList.add('correct');
        }

        
        if (letter === selectedLetter && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });

    
    showFeedback(isCorrect, question.correctAnswer.text);

    
    document.querySelector('.show-answer-section').classList.add('hidden');

    
    updateNavigationButtons();
}


function toggleAnswer() {
    const question = quizData.questions[quizData.currentQuestionIndex];
    const previousAnswer = quizData.userAnswers[quizData.currentQuestionIndex];
    const choiceBtns = document.querySelectorAll('.choice-btn');
    const feedbackSection = document.getElementById('feedbackSection');
    const showAnswerBtn = document.getElementById('showAnswerBtn');
    const showAnswerText = document.getElementById('showAnswerText');

    console.log('🔍 Toggle Answer - Current question:', question);
    console.log('   Correct answer:', question.correctAnswer);

    
    const isAnswerShown = Array.from(choiceBtns).some(div =>
        div.classList.contains('correct')
    );

    if (isAnswerShown) {
        
        choiceBtns.forEach(div => {
            div.classList.remove('correct');
            
            const letter = div.getAttribute('data-letter');
            div.onclick = () => selectAnswer(letter);
        });

        
        feedbackSection.style.display = 'none';

        
        showAnswerText.textContent = 'Show Answer';
        showAnswerBtn.querySelector('i').className = 'fas fa-eye';

        
        quizData.userAnswers[quizData.currentQuestionIndex] = null;
        console.log('✅ Answer hidden');
    } else {
        
        console.log('📝 Showing correct answer:', question.correctAnswer.letter);

        
        quizData.userAnswers[quizData.currentQuestionIndex] = {
            questionNumber: quizData.currentQuestionIndex + 1,
            selectedAnswer: null,
            correctAnswer: question.correctAnswer.letter,
            isCorrect: false,
            revealed: true
        };

        
        choiceBtns.forEach(div => {
            const letter = div.getAttribute('data-letter');

            
            if (letter === question.correctAnswer.letter) {
                div.classList.add('correct');
                console.log('✅ Highlighted choice:', letter);
            }

            
            div.onclick = null;
        });

        
        const feedbackTitle = feedbackSection.querySelector('h4');
        const feedbackText = feedbackSection.querySelector('p');

        feedbackSection.style.display = 'block';
        feedbackSection.className = 'feedback-section correct';

        feedbackTitle.innerHTML = '<i class="fas fa-lightbulb"></i> Answer Revealed';
        feedbackText.textContent = `The correct answer is: ${question.correctAnswer.text}`;

        
        showAnswerText.textContent = 'Hide Answer';
        showAnswerBtn.querySelector('i').className = 'fas fa-eye-slash';

        console.log('✅ Answer shown');
    }
}


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


function previousQuestion() {
    const prevIndex = quizData.currentQuestionIndex - 1;
    if (prevIndex >= 0) {
        loadQuestion(prevIndex);
    }
}


function nextQuestion() {
    const nextIndex = quizData.currentQuestionIndex + 1;
    if (nextIndex < quizData.questions.length) {
        loadQuestion(nextIndex);
    }
}





function goToDashboard() {
    
    if (document.referrer.includes('StoryDashboard')) {
        window.location.href = '../../dashboard/StoryDashboard.php';
    } else {
        window.history.back();
    }
}


function showError(message) {
    document.getElementById('questionText').textContent = message;
    document.getElementById('choicesContainer').innerHTML = '';
}
