<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - AniKwento</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link id="theme-style" rel="stylesheet" href="../../../public/files/css/Register.css">
    <style>
        .step-indicator {
            display: flex;
            justify-content: center;
            margin-bottom: 2rem;
            gap: 1rem;
        }
        
        .step {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e0e0e0;
            color: #9e9e9e;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .step.active {
            background: linear-gradient(135deg, #FFC553, #FFD700);
            color: #801B32;
            transform: scale(1.1);
            box-shadow: 0 4px 15px rgba(255, 197, 83, 0.3);
        }
        
        .step.completed {
            background: linear-gradient(135deg, #801B32, #972542);
            color: #FFC553;
        }
        
        .step::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 100%;
            width: 20px;
            height: 2px;
            background: #e0e0e0;
            transform: translateY(-50%);
            z-index: -1;
        }
        
        .step:last-child::after {
            display: none;
        }
        
        .step.completed::after,
        .step.active::after {
            background: #801B32;
        }
        
        .form-step {
            display: none;
        }
        
        .form-step.active {
            display: block;
            animation: slideInRight 0.5s ease-out;
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .back-link {
            color: #801B32;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .back-link:hover {
            color: #FFC553;
            transform: translateX(-5px);
        }
        
        .verification-input {
            text-align: center;
            font-size: 1.5rem;
            font-weight: bold;
            letter-spacing: 0.5rem;
            max-width: 200px;
            margin: 0 auto;
        }
        
        .resend-code {
            color: #801B32;
            text-decoration: none;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        
        .resend-code:hover {
            color: #FFC553;
            text-decoration: underline;
        }
        
        
    </style>
</head>
<body>
    <header>
        <nav class="navbar navbar-expand-md">
            <div class="container">
                <a href="../home.html">
                    <img src="../../../public/files/images/AKlogo.png" alt="AniKwento Logo" class="AK-logo-Header">
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
                    <ul class="navbar-nav">
                        <li class="nav-item"><a class="nav-link" href="Login.php">Log In</a></li>
                        <li class="nav-item"><a class="nav-link" href="Register.php">Register</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>

    <main class="my-5">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-md-8">
                    <div class="login-container">
                        <div class="row g-0">
                            <div class="col-md-6">
                                <div class="welcome-section text-center p-4">
                                    <h1>RESET PASSWORD</h1>
                                    <img src="../../../public/files/images/AKlogo.png" alt="AniKwento Logo" class="AK-logo img-fluid my-3"> 
                                    <p>Secure your account with a new password!</p>
                                    
                                    <!-- Step Indicator -->
                                    <div class="step-indicator mt-4">
                                        <div class="step active" id="step-1">1</div>
                                        <div class="step" id="step-2">2</div>
                                        <div class="step" id="step-3">3</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-section p-4">
                                    <!-- Step 1: Enter UB Mail -->
                                    <div class="form-step active" id="form-step-1">
                                        <a href="Login.php" class="back-link">
                                            <i class="fas fa-arrow-left"></i> Back to Login
                                        </a>
                                        <h4 class="mb-3 text-center" style="color: #801B32; font-weight: 600;">Enter Your UB Mail</h4>
                                        <form id="requestResetForm">
                                            <div class="mb-3">
                                                <input type="text" name="email" id="emailInput" class="form-control"
                                                    placeholder="UB Mail"
                                                    style="padding-left: 0.75rem; border: none; border-bottom: 2px solid #801B32; border-radius: 0;"
                                                    required />
                                            </div>
                                            <button type="submit" class="btn" style="max-width: 200px; margin: 1rem auto; font-size: 0.95rem;">Send Reset Code</button>
                                            <div id="step1Message" class="mt-3 text-center"></div>
                                        </form>
                                    </div>

                                    <!-- Step 2: Verify Code -->
                                    <div class="form-step" id="form-step-2">
                                        <a href="#" class="back-link" onclick="goToStep(1)">
                                            <i class="fas fa-arrow-left"></i> Back
                                        </a>
                                        <h4 class="mb-3 text-center" style="color: #801B32; font-weight: 600;">Verify Code</h4>
                                        <form id="verifyCodeForm">
                                            <div class="mb-3 text-center">
                                                <p class="text-muted mb-3">Enter the 6-digit code sent to <strong id="userEmail"></strong></p>
                                                <input type="text" name="verification_code" id="verificationCode" 
                                                    class="form-control verification-input" 
                                                    placeholder="000000" maxlength="6" required />
                                            </div>
                                            <div class="mb-3 text-center">
                                                <small class="text-muted">Didn't receive the code? </small>
                                                <a href="#" class="resend-code" onclick="resendCode()">Resend Code</a>
                                            </div>
                                            <button type="submit" class="btn" style="max-width: 180px; margin: 1rem auto; font-size: 0.95rem;">Verify Code</button>
                                            <div id="step2Message" class="mt-3 text-center"></div>
                                        </form>
                                    </div>

                                    <!-- Step 3: New Password -->
                                    <div class="form-step" id="form-step-3">
                                        <!-- No back button on step 3 for security -->
                                        <h4 class="mb-3 text-center" style="color: #801B32; font-weight: 600;">Create New Password</h4>
                                        <form id="resetPasswordForm">
                                            <div class="mb-3">
                                                <input type="password" name="new_password" id="newPassword" 
                                                    class="form-control" placeholder="New Password" required />
                                            </div>
                                            <div class="mb-3">
                                                <input type="password" name="confirm_password" id="confirmPassword" 
                                                    class="form-control" placeholder="Confirm New Password" required />
                                                <div id="passwordMatch" class="form-text"></div>
                                            </div>
                                            
                                            
                                            <button type="submit" class="btn" style="max-width: 200px; margin: 1rem auto; font-size: 0.95rem;">Reset Password</button>
                                            <div id="step3Message" class="mt-3 text-center"></div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="py-3">
        <p class="mb-0">© 2025 AniKwento. All rights reserved.</p>
    </footer>

    <script>
        let currentStep = 1;
        let userUbId = '';
        let verificationToken = '';
        let allowBackNavigation = true;

        // Step navigation
        function goToStep(step) {
            // Prevent backward navigation after code is sent
            if (!allowBackNavigation && step < currentStep) {
                return;
            }
            
            // Never allow going back from step 3 (password reset)
            if (currentStep === 3 && step < 3) {
                return;
            }
            
            // Hide all form steps
            document.querySelectorAll('.form-step').forEach(fs => {
                fs.classList.remove('active');
            });
            
            // Show target step
            document.getElementById(`form-step-${step}`).classList.add('active');
            
            // Update step indicators
            document.querySelectorAll('.step').forEach((s, index) => {
                s.classList.remove('active', 'completed');
                if (index + 1 < step) {
                    s.classList.add('completed');
                } else if (index + 1 === step) {
                    s.classList.add('active');
                }
            });
            
            currentStep = step;
            
            // Clear messages when changing steps
            document.getElementById(`step${step}Message`).innerHTML = '';
        }

        // Email validation function (matches login/register)
        function validateEmailFormat(email) {
            // Pattern 1: 7-digit student ID (will be converted to email)
            const studentIdPattern = /^\d{7}$/;
            // Pattern 2: 7-digit student ID with @ub.edu.ph
            const digitEmailPattern = /^\d{7}@ub\.edu\.ph$/;
            // Pattern 3: firstname.lastname@ub.edu.ph
            const nameEmailPattern = /^[a-zA-Z]+\.[a-zA-Z]+@ub\.edu\.ph$/;
            // Pattern 4: A-#### format (A-1234@ub.edu.ph)
            const aIdPattern = /^A-\d{4}@ub\.edu\.ph$/;

            return studentIdPattern.test(email) || digitEmailPattern.test(email) || nameEmailPattern.test(email) || aIdPattern.test(email);
        }

        // Function to convert input to full email if needed
        function convertToEmail(input) {
            // If it's just 7 digits, append @ub.edu.ph
            if (/^\d{7}$/.test(input)) {
                return input + '@ub.edu.ph';
            }
            // Otherwise, return as-is (already a full email)
            return input;
        }

        // Verification code input validation
        document.getElementById('verificationCode').addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value.length > 6) value = value.substring(0, 6);
            e.target.value = value;
        });

        // Password input event listeners for real-time validation
        document.getElementById('newPassword').addEventListener('input', function(e) {
            checkPasswordMatch();
        });

        document.getElementById('confirmPassword').addEventListener('input', function(e) {
            checkPasswordMatch();
        });

        // Simple password validation
        function validatePassword(password) {
            return password.length >= 6;
        }

        // Password match validation function
        function checkPasswordMatch() {
            const password = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const matchDiv = document.getElementById('passwordMatch');
            
            if (confirmPassword.length > 0) {
                if (password === confirmPassword) {
                    matchDiv.innerHTML = '<span style="color: green;">✓ Passwords match</span>';
                    return true;
                } else {
                    matchDiv.innerHTML = '<span style="color: red;">✗ Passwords do not match</span>';
                    return false;
                }
            } else {
                matchDiv.innerHTML = '';
                return false;
            }
        }

        // Notification function
        function showMessage(message, type = 'danger', duration = 5000, stepNumber = currentStep) {
            const messageDiv = document.getElementById(`step${stepNumber}Message`);
            messageDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
            
            if (duration > 0) {
                setTimeout(() => {
                    const alert = messageDiv.querySelector('.alert');
                    if (alert) {
                        alert.style.animation = 'fadeOut 0.3s ease-out';
                        setTimeout(() => {
                            messageDiv.innerHTML = '';
                        }, 300);
                    }
                }, duration);
            }
        }

        function setButtonLoading(button, loading = true) {
            if (loading) {
                button.classList.add('loading');
                button.disabled = true;
            } else {
                button.classList.remove('loading');
                button.disabled = false;
            }
        }

        // Step 1: Request reset code
        document.getElementById('requestResetForm').addEventListener('submit', function(e) {
            e.preventDefault();

            const emailInput = document.getElementById('emailInput');
            const inputValue = emailInput.value.trim();
            const submitButton = this.querySelector('button[type="submit"]');

            // Clear any existing messages
            document.getElementById('step1Message').innerHTML = '';

            // Client-side validation
            if (!validateEmailFormat(inputValue)) {
                showMessage('Please enter a valid format: 7-digit ID, firstname.lastname@ub.edu.ph, or A-1234@ub.edu.ph', 'danger', 5000, 1);
                emailInput.focus();
                return;
            }

            // Start loading state
            setButtonLoading(submitButton, true);
            showMessage('<span class="loading-spinner"></span>Sending reset code...', 'info', 0, 1);

            // Convert to full email if needed
            const email = convertToEmail(inputValue);

            // Extract the ID part (before @ub.edu.ph) for storage
            userUbId = email.replace('@ub.edu.ph', '');
            
            const formData = new FormData();
            formData.append('action', 'send_reset_code');
            formData.append('email', email);
            
            fetch('/source/handlers/forgot_password_process.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                setButtonLoading(submitButton, false);
                
                if (data.success) {
                    document.getElementById('step1Message').innerHTML = '';
                    showMessage('Reset code sent successfully!', 'success', 3000, 1);
                    document.getElementById('userEmail').textContent = email;
                    
                    // Disable back navigation after successful code send
                    allowBackNavigation = false;
                    
                    // Hide back link on step 2
                    setTimeout(() => {
                        goToStep(2);
                        document.querySelector('#form-step-2 .back-link').style.display = 'none';
                    }, 2000);
                } else {
                    document.getElementById('step1Message').innerHTML = '';
                    showMessage(data.message, 'danger', 8000, 1);
                }
            })
            .catch(error => {
                console.error('Reset request error:', error);
                setButtonLoading(submitButton, false);
                document.getElementById('step1Message').innerHTML = '';
                showMessage('Network error occurred. Please try again.', 'danger', 5000, 1);
            });
        });

        // Step 2: Verify code
        document.getElementById('verifyCodeForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const codeInput = document.getElementById('verificationCode');
            const code = codeInput.value.trim();
            const submitButton = this.querySelector('button[type="submit"]');
            
            // Clear any existing messages
            document.getElementById('step2Message').innerHTML = '';
            
            // Client-side validation
            if (!code.match(/^\d{6}$/)) {
                showMessage('Please enter a valid 6-digit code', 'danger', 5000, 2);
                codeInput.focus();
                return;
            }
            
            // Start loading state
            setButtonLoading(submitButton, true);
            showMessage('<span class="loading-spinner"></span>Verifying code...', 'info', 0, 2);
            
            const email = userUbId + '@ub.edu.ph';
            
            const formData = new FormData();
            formData.append('action', 'verify_reset_code');
            formData.append('email', email);
            formData.append('verification_code', code);
            
            fetch('/source/handlers/forgot_password_process.php', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                setButtonLoading(submitButton, false);
                console.log('Verification response:', data); // Debug log
                
                if (data.success) {
                    document.getElementById('step2Message').innerHTML = '';
                    showMessage('Code verified successfully!', 'success', 3000, 2);
                    verificationToken = code; // Store for final step
                    
                    // Disable back navigation permanently after code verification
                    allowBackNavigation = false;
                    
                    setTimeout(() => {
                        goToStep(3);
                        // Hide back button on step 3 for extra security
                        const backButtons = document.querySelectorAll('.back-link');
                        backButtons.forEach(btn => btn.style.display = 'none');
                        
                        // Add beforeunload warning on step 3 to prevent accidental navigation
                        window.addEventListener('beforeunload', function(e) {
                            if (currentStep === 3) {
                                e.preventDefault();
                                e.returnValue = 'Are you sure you want to leave? Your progress will be lost.';
                                return e.returnValue;
                            }
                        });
                    }, 2000);
                } else {
                    document.getElementById('step2Message').innerHTML = '';
                    showMessage(data.message || 'Verification failed. Please try again.', 'danger', 8000, 2);
                    codeInput.value = ''; // Clear the input
                    codeInput.focus(); // Refocus for retry
                }
            })
            .catch(error => {
                console.error('Verification error:', error);
                setButtonLoading(submitButton, false);
                document.getElementById('step2Message').innerHTML = '';
                showMessage('Network error occurred. Please try again.', 'danger', 5000, 2);
                codeInput.focus();
            });
        });

        // Step 3: Reset password
        document.getElementById('resetPasswordForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newPasswordInput = document.getElementById('newPassword');
            const confirmPasswordInput = document.getElementById('confirmPassword');
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const submitButton = this.querySelector('button[type="submit"]');
            
            // Clear any existing messages
            document.getElementById('step3Message').innerHTML = '';
            
            // Client-side validation
            if (!validatePassword(newPassword)) {
                showMessage('Password must be at least 6 characters long', 'danger', 5000, 3);
                newPasswordInput.focus();
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showMessage('Passwords do not match', 'danger', 5000, 3);
                confirmPasswordInput.focus();
                return;
            }
            
            // Start loading state
            setButtonLoading(submitButton, true);
            showMessage('<span class="loading-spinner"></span>Updating password...', 'info', 0, 3);
            
            const email = userUbId + '@ub.edu.ph';
            
            const formData = new FormData();
            formData.append('action', 'update_password');
            formData.append('email', email);
            formData.append('verification_code', verificationToken);
            formData.append('new_password', newPassword);
            formData.append('confirm_password', confirmPassword);
            
            fetch('/source/handlers/forgot_password_process.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                setButtonLoading(submitButton, false);
                
                if (data.success) {
                    document.getElementById('step3Message').innerHTML = '';
                    showMessage('Password updated successfully! Redirecting to login...', 'success', 5000, 3);
                    
                    // Remove beforeunload warning since we're done
                    window.removeEventListener('beforeunload', function() {});
                    
                    // Redirect to login page after success
                    setTimeout(() => {
                        window.location.href = 'Login.php';
                    }, 3000);
                } else {
                    document.getElementById('step3Message').innerHTML = '';
                    showMessage(data.message, 'danger', 8000, 3);
                }
            })
            .catch(error => {
                console.error('Password reset error:', error);
                setButtonLoading(submitButton, false);
                document.getElementById('step3Message').innerHTML = '';
                showMessage('Network error occurred. Please try again.', 'danger', 5000, 3);
            });
        });

        // Resend code function
        function resendCode() {
            const email = userUbId + '@ub.edu.ph';
            
            showMessage('<span class="loading-spinner"></span>Resending code...', 'info', 0, 2);
            
            const formData = new FormData();
            formData.append('action', 'resend_reset_code');
            formData.append('email', email);
            
            fetch('/source/handlers/forgot_password_process.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('step2Message').innerHTML = '';
                    showMessage('New code sent successfully!', 'success', 5000, 2);
                } else {
                    document.getElementById('step2Message').innerHTML = '';
                    showMessage(data.message, 'danger', 8000, 2);
                }
            })
            .catch(error => {
                console.error('Resend error:', error);
                document.getElementById('step2Message').innerHTML = '';
                showMessage('Network error occurred. Please try again.', 'danger', 5000, 2);
            });
        }
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>