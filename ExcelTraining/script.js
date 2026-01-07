// Quiz system without progress tracking

// Navigate to module
function goToModule(moduleNumber) {
    window.location.href = `module${moduleNumber}.html`;
}

// Start course
function startCourse() {
    goToModule(1);
}

// Quiz functionality
class Quiz {
    constructor(questions, moduleNumber) {
        this.questions = questions;
        this.moduleNumber = moduleNumber;
        this.currentQuestion = 0;
        this.score = 0;
        this.answers = [];
        this.isComplete = false;
    }
    
    init() {
        this.hideModuleContent();
        this.renderQuestion();
        this.updateProgressBar();
    }
    
    hideModuleContent() {
        const moduleContent = document.querySelector('.module-content');
        const quizContainer = document.getElementById('quiz-container');
        if (moduleContent) {
            moduleContent.style.display = 'none';
        }
        if (quizContainer) {
            quizContainer.classList.add('quiz-active');
        }
    }
    
    showModuleContent() {
        const moduleContent = document.querySelector('.module-content');
        const quizContainer = document.getElementById('quiz-container');
        if (moduleContent) {
            moduleContent.style.display = 'block';
        }
        if (quizContainer) {
            quizContainer.classList.remove('quiz-active');
        }
    }
    
    renderQuestion() {
        const container = document.getElementById('quiz-container');
        if (!container) return;
        
        if (this.currentQuestion >= this.questions.length) {
            this.showResults();
            return;
        }
        
        const question = this.questions[this.currentQuestion];
        
        container.innerHTML = `
            <div class="quiz-header">
                <h2>Module ${this.moduleNumber} Quiz</h2>
                <div class="quiz-progress">
                    <div class="quiz-progress-fill" style="width: ${((this.currentQuestion + 1) / this.questions.length) * 100}%">
                        Question ${this.currentQuestion + 1} of ${this.questions.length}
                    </div>
                </div>
            </div>
            
            <div class="question-container">
                <div class="question">${question.question}</div>
                <div class="answers">
                    ${question.options.map((option, index) => `
                        <div class="answer-option" onclick="quiz.selectAnswer(${index})">
                            ${option}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="quiz-buttons">
                <button class="btn btn-secondary" onclick="quiz.previousQuestion()" ${this.currentQuestion === 0 ? 'disabled' : ''}>
                    Previous
                </button>
                <button class="btn btn-success" onclick="quiz.nextQuestion()" id="next-btn" disabled>
                    ${this.currentQuestion === this.questions.length - 1 ? 'Finish' : 'Next'}
                </button>
            </div>
        `;
    }
    
    selectAnswer(index) {
        // Store answer
        this.answers[this.currentQuestion] = index;
        
        // Update UI
        const options = document.querySelectorAll('.answer-option');
        options.forEach((option, i) => {
            option.classList.remove('selected');
            if (i === index) {
                option.classList.add('selected');
            }
        });
        
        // Enable next button
        document.getElementById('next-btn').disabled = false;
    }
    
    nextQuestion() {
        if (this.answers[this.currentQuestion] === undefined) {
            alert('Please select an answer');
            return;
        }
        
        // Check if answer is correct
        const question = this.questions[this.currentQuestion];
        if (this.answers[this.currentQuestion] === question.correct) {
            this.score++;
        }
        
        this.currentQuestion++;
        this.renderQuestion();
    }
    
    previousQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            this.renderQuestion();
        }
    }
    
    updateProgressBar() {
        const progressFill = document.querySelector('.quiz-progress-fill');
        if (progressFill) {
            const progress = ((this.currentQuestion + 1) / this.questions.length) * 100;
            progressFill.style.width = progress + '%';
        }
    }
    
    showResults() {
        const container = document.getElementById('quiz-container');
        const percentage = Math.round((this.score / this.questions.length) * 100);
        
        // Quiz completed - no progress tracking
        
        let feedback, feedbackClass;
        if (percentage >= 80) {
            feedback = "Excellent work! You've mastered this module!";
            feedbackClass = 'success';
        } else if (percentage >= 60) {
            feedback = "Good job! Consider reviewing the areas you missed.";
            feedbackClass = 'warning';
        } else {
            feedback = "You might want to review this module before moving on.";
            feedbackClass = 'danger';
        }
        
        container.innerHTML = `
            <div class="quiz-results">
                <h2>Quiz Complete!</h2>
                <div class="score-display">${percentage}%</div>
                <p>You scored ${this.score} out of ${this.questions.length}</p>
                <div class="feedback ${feedbackClass}">${feedback}</div>
                
                <div class="quiz-buttons">
                    <button class="btn btn-secondary" onclick="retakeQuiz()">Retake Quiz</button>
                    <button class="btn btn-secondary" onclick="quiz.showModuleContent(); scrollToTop()">Review Module</button>
                    <button class="btn btn-primary" onclick="goToNextModule()">Next Module</button>
                </div>
                
                <div style="margin-top: 2rem;">
                    <h3>Review Your Answers:</h3>
                    ${this.questions.map((q, i) => {
                        const isCorrect = this.answers[i] === q.correct;
                        return `
                            <div style="margin: 1rem 0; padding: 1rem; background: ${isCorrect ? '#c8e6c9' : '#ffcdd2'}; border-radius: 8px;">
                                <p><strong>Q${i + 1}:</strong> ${q.question}</p>
                                <p>Your answer: ${q.options[this.answers[i]]}</p>
                                ${!isCorrect ? `<p>Correct answer: ${q.options[q.correct]}</p>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
}

// Global quiz variable
let quiz;

// Retake quiz
function retakeQuiz() {
    location.reload();
}

// Scroll to top of page
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Go to next module
function goToNextModule() {
    const currentModule = parseInt(window.location.pathname.match(/module(\d+)/)?.[1] || 1);
    if (currentModule < 10) {
        window.location.href = `module${currentModule + 1}.html`;
    } else {
        window.location.href = 'index.html';
    }
}

// Simplified navigation - no progress tracking needed